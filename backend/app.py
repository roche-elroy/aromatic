import cv2
import numpy as np
import asyncio
import base64
import os
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
from threading import Lock
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from translation import translate_text
from depth import get_depth
from pydantic import BaseModel
from typing import Dict, List

# Initialize thread pools and queues
detection_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="detection")
depth_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="depth")
translation_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="translation")

# Create result caches with locks
result_cache = {}
cache_lock = Lock()
CACHE_TIMEOUT = 0.5  # 500ms cache timeout

class ProcessingQueue:
    def __init__(self):
        self.detection_queue = Queue(maxsize=3)
        self.depth_queue = Queue(maxsize=3)
        self.translation_queue = Queue(maxsize=3)

processing_queues = {}

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationRequest(BaseModel):
    text: str
    target_lang: str

@app.post("/translate")
async def translate_text_endpoint(request: TranslationRequest):
    translated = translate_text(request.text, target_lang=request.target_lang)
    return {"translated_text": translated}

# Track active connections
active_connections: Dict[str, WebSocket] = {}

# Determine model path - default to YOLOv8n if custom model not found
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")
print(f"🔄 Loading YOLO model from {MODEL_PATH}")

# Load YOLO model
model = YOLO(MODEL_PATH)
print("✅ Model loaded successfully")

async def process_frame_detection(frame):
    try:
        results = model(frame)[0]
        detected_objects = [model.names[int(box.cls)] for box in results.boxes]
        detection_text = ", ".join(set(detected_objects)) if detected_objects else "No objects detected"
        return results, detection_text
    except Exception as e:
        print(f"❌ Detection error: {str(e)}")
        return None, None

async def process_frame_depth(frame):
    try:
        return await asyncio.get_event_loop().run_in_executor(
            depth_executor,
            get_depth,
            frame
        )
    except Exception as e:
        print(f"❌ Depth error: {str(e)}")
        return None

async def process_translation(text, target_lang):
    try:
        if target_lang == "en":
            return text
        return await asyncio.get_event_loop().run_in_executor(
            translation_executor,
            translate_text,
            text,
            target_lang
        )
    except Exception as e:
        print(f"❌ Translation error: {str(e)}")
        return text

@app.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    client_id = id(websocket)
    target_lang = websocket.query_params.get("target", "en")
    processing_queues[client_id] = ProcessingQueue()
    
    try:
        await websocket.accept()
        active_connections[client_id] = websocket
        print(f"✅ WebSocket connected: {client_id} (target: {target_lang})")
        
        while True:
            try:
                # Receive frame with shorter timeout
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=5.0
                )
                
                # Process image
                frame_data = base64.b64decode(data)
                np_frame = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                # Process tasks concurrently
                detection_task = asyncio.create_task(process_frame_detection(frame))
                depth_task = asyncio.create_task(process_frame_depth(frame))
                
                # Wait for detection and depth results
                results, detection_text = await detection_task
                depth_value = await depth_task

                if results is not None:
                    # Add depth information if available
                    if depth_value is not None:
                        detection_text += f" | Distance: {depth_value:.0f}cm"

                    # Process translation concurrently
                    translated_text = await process_translation(detection_text, target_lang)

                    # Create annotated image
                    _, buffer = cv2.imencode(".jpg", results.plot())
                    base64_frame = base64.b64encode(buffer).decode()

                    # Send response if connection is still active
                    if websocket.client_state.CONNECTED:
                        await websocket.send_json({
                            "text": detection_text,
                            "translated_text": translated_text,
                            "image": base64_frame,
                            "language": target_lang,
                            "depth": depth_value
                        })

            except asyncio.TimeoutError:
                # Use shorter timeout and continue silently
                continue
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"❌ Processing error: {str(e)}")
                if not websocket.client_state.CONNECTED:
                    break
                continue

    finally:
        # Cleanup
        if client_id in active_connections:
            del active_connections[client_id]
        if client_id in processing_queues:
            del processing_queues[client_id]
        print(f"🧹 Connection cleaned up: {client_id}")

# Add graceful shutdown
@app.on_event("shutdown")
async def shutdown_event():
    detection_executor.shutdown(wait=True)
    depth_executor.shutdown(wait=True)
    translation_executor.shutdown(wait=True)

@app.get("/depth")
async def get_depth_value():
    """API endpoint to return the estimated depth in cm."""
    distance = get_depth()
    if distance is None:
        return {"error": "Failed to capture depth"}
    return {"estimated_distance_cm": distance}

@app.get("/")
async def root():
    return {"status": "running", "connections": len(active_connections)}