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
from twilio_calls import router as twilio_router
from fastapi.middleware.cors import CORSMiddleware
from facemesh import router as facemesh_router

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

# Include Twilio router
app.include_router(twilio_router)
#facemesh
app.include_router(facemesh_router, prefix="/facemesh")

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
    if frame is None:
        return None, "Invalid frame"
    try:
        results = model(frame)[0]
        detected_objects = []
        bounding_box = None
        
        for box in results.boxes:
            label = model.names[int(box.cls)]
            detected_objects.append(label)
            if bounding_box is None:  # Track the first detected object
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                bounding_box = {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                }
        
        detection_text = ", ".join(set(detected_objects)) if detected_objects else "No objects detected"
        return results, detection_text, bounding_box
    except Exception as e:
        print(f"❌ Detection error: {str(e)}")
        return None, "Detection error", None

async def process_frame_depth(frame):
    if frame is None:
        return None
    try:
        depth_result = await asyncio.get_event_loop().run_in_executor(
            depth_executor,
            get_depth,
            frame
        )
        if isinstance(depth_result, dict):
            return depth_result
        return {"depth": depth_result, "confidence": 1.0, "method": "default"}
    except Exception as e:
        print(f"❌ Depth error: {str(e)}")
        return None

async def process_translation(text, target_lang):
    if not text or not target_lang:
        return text
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
                if not websocket.client_state.CONNECTED:
                    print(f"🔌 Client disconnected: {client_id}")
                    break

                if not active_clients[client_id].is_active:
                    await asyncio.sleep(0.5)
                    continue

                try:
                    data = await asyncio.wait_for(
                        websocket.receive_json(),  # Changed to receive_json
                        timeout=5.0
                    )
                except asyncio.TimeoutError:
                    continue

                # Update activity timestamp
                active_clients[client_id].last_active = datetime.now()

                # Check if we should process this frame
                if not data.get('shouldProcess', False):
                    continue

                # Validate and decode frame
                try:
                    frame_data = base64.b64decode(data['frame'])
                    np_frame = np.frombuffer(frame_data, np.uint8)
                    frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)
                    if frame is None:
                        print(f"⚠️ Invalid frame received: {client_id}")
                        continue
                except Exception as e:
                    print(f"❌ Frame decode error: {str(e)}")
                    continue

                # Process frame only if shouldProcess is true
                try:
                    detection_task = asyncio.create_task(process_frame_detection(frame))
                    depth_task = asyncio.create_task(process_frame_depth(frame))
                    
                    results, detection_text, bounding_box = await detection_task
                    depth_result = await depth_task

                    if results is not None and active_clients[client_id].is_active:
                        depth_info = ""
                        if isinstance(depth_result, dict) and depth_result.get("depth"):
                            depth_info = f" | Distance: {depth_result['depth']:.1f}m"
                        
                        full_text = detection_text + depth_info if detection_text else "No objects detected"
                        translated_text = await process_translation(full_text, target_lang)

                        if websocket.client_state.CONNECTED:
                            await websocket.send_json({
                                "depth": depth_result.get("depth") if isinstance(depth_result, dict) else None,
                                "confidence": depth_result.get("confidence", 0),
                                "method": depth_result.get("method", "none"),
                                "translated_text": translated_text,
                                "bounding_box": bounding_box,
                                "status": "success"
                            })
                except Exception as e:
                    print(f"❌ Processing error: {str(e)}")
                    if websocket.client_state.CONNECTED:
                        await websocket.send_json({
                            "error": str(e),
                            "status": "error"
                        })
                    continue

            except WebSocketDisconnect:
                print(f"🔒 WebSocket disconnect: {client_id}")
                break
            except Exception as e:
                print(f"❌ Unexpected error: {str(e)}")
                break

    finally:
        # Cleanup
        try:
            if client_id in active_clients:
                del active_clients[client_id]
            if client_id in processing_queues:
                del processing_queues[client_id]
            print(f"🧹 Connection cleaned up: {client_id}")
        except Exception as e:
            print(f"❌ Cleanup error: {str(e)}")

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
                try:
                    if (current_time - state.last_active) > inactive_threshold:
                        print(f"🧹 Removing inactive client: {client_id}")
                        if client_id in active_clients:
                            del active_clients[client_id]
                        if client_id in processing_queues:
                            del processing_queues[client_id]
                except Exception as e:
                    print(f"❌ Client cleanup error: {client_id} - {str(e)}")
                    continue
            
            await asyncio.sleep(10)
        except Exception as e:
            print(f"❌ Main cleanup error: {str(e)}")
            await asyncio.sleep(10)

# Add to your startup events
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_inactive_clients())


