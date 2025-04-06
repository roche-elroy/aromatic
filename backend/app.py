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
from dataclasses import dataclass
from datetime import datetime, timedelta

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
@dataclass
class ClientState:
    websocket: WebSocket
    is_active: bool
    last_active: datetime
    target_lang: str

# Replace the active_connections dict with a more detailed tracking
active_clients: Dict[int, ClientState] = {}

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

@app.websocket("/ws/state")
async def app_state(websocket: WebSocket):
    client_id = id(websocket)
    
    try:
        await websocket.accept()
        data = await websocket.receive_json()
        is_active = data.get('isActive', False)
        
        if client_id in active_clients:
            active_clients[client_id].is_active = is_active
            active_clients[client_id].last_active = datetime.now()
            print(f"📱 Client {client_id} state changed: {'active' if is_active else 'inactive'}")
    except Exception as e:
        print(f"❌ State update error: {str(e)}")
    finally:
        await websocket.close()

@app.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    client_id = id(websocket)
    target_lang = websocket.query_params.get("target", "en")
    processing_queues[client_id] = ProcessingQueue()
    
    try:
        await websocket.accept()
        active_clients[client_id] = ClientState(
            websocket=websocket,
            is_active=True,
            last_active=datetime.now(),
            target_lang=target_lang
        )
        print(f"✅ WebSocket connected: {client_id} (target: {target_lang})")
        
        while True:
            try:
                # Check if client is active before processing
                if not active_clients[client_id].is_active:
                    await asyncio.sleep(0.5)  # Reduced CPU usage when inactive
                    continue

                # Receive frame with shorter timeout
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=5.0
                )
                
                # Update last active timestamp
                active_clients[client_id].last_active = datetime.now()
                
                # Process image only if client is active
                frame_data = base64.b64decode(data)
                np_frame = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                # Replace the relevant section in the video_stream function
                # Process tasks concurrently
                detection_task = asyncio.create_task(process_frame_detection(frame))
                depth_task = asyncio.create_task(process_frame_depth(frame))
                
                # Wait for detection and depth results
                results, detection_text = await detection_task
                depth_result = await depth_task

                if results is not None and active_clients[client_id].is_active:
                    # Check if depth_result is valid
                    depth_info = ""
                    if isinstance(depth_result, dict) and depth_result.get("depth"):
                        depth_info = f" | Distance: {depth_result['depth']:.1f}cm"
                    
                    # Combine detection text with depth info
                    full_text = detection_text + depth_info if detection_text else "No objects detected"
                    
                    # Process translation concurrently
                    translated_text = await process_translation(full_text, target_lang)

                    # Send response with depth information
                    await websocket.send_json({
                        "depth": depth_result.get("depth") if isinstance(depth_result, dict) else None,
                        "confidence": depth_result.get("confidence", 0) if isinstance(depth_result, dict) else 0,
                        "method": depth_result.get("method", "none") if isinstance(depth_result, dict) else "none",
                        "translated_text": translated_text
                    })

            except asyncio.TimeoutError:
                continue
            except WebSocketDisconnect:
                print("Client disconnected")
                break
            except Exception as e:
                print(f"❌ Processing error: {str(e)}")
                if not websocket.client_state.CONNECTED:
                    break
                continue

    finally:
        # Cleanup
        if client_id in active_clients:
            del active_clients[client_id]
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
    return {"status": "running", "connections": len(active_clients)}

# Add cleanup task
async def cleanup_inactive_clients():
    while True:
        try:
            current_time = datetime.now()
            inactive_threshold = timedelta(seconds=30)
            
            for client_id, state in list(active_clients.items()):
                if (current_time - state.last_active) > inactive_threshold:
                    print(f"🧹 Removing inactive client: {client_id}")
                    del active_clients[client_id]
                    if client_id in processing_queues:
                        del processing_queues[client_id]
        except Exception as e:
            print(f"❌ Cleanup error: {str(e)}")
        
        await asyncio.sleep(10)  # Run cleanup every 10 seconds

# Add to your startup events
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_inactive_clients())