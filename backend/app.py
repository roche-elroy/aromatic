import cv2
import numpy as np
import asyncio
import base64
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from translation import translate_text
from depth import get_depth
from pydantic import BaseModel
from typing import Dict, List
from twilio_calls import router as twilio_router

app = FastAPI()
app.include_router(twilio_router)

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

@app.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    client_id = id(websocket)
    target_lang = websocket.query_params.get("target", "en")
    
    try:
        await websocket.accept()
        active_connections[client_id] = websocket
        print(f"✅ WebSocket connected: {client_id} (target: {target_lang})")
        
        # Flag to track connection state
        is_connected = True

        while is_connected:
            try:
                # Check if connection is still active before receiving
                if not websocket.client_state.CONNECTED:
                    print(f"🔄 Client state indicates disconnection: {client_id}")
                    is_connected = False
                    break

                # Receive frame data with a timeout
                data = await asyncio.wait_for(
                    websocket.receive_text(), 
                    timeout=10
                )
                
                # Process image
                frame_data = base64.b64decode(data)
                np_frame = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                # Run object detection
                results = model(frame)[0]
                detected_objects = [model.names[int(box.cls)] for box in results.boxes]
                detection_text = ", ".join(set(detected_objects)) if detected_objects else "No objects detected"

                # Get depth estimation
                depth_value = get_depth(frame)
                depth_text = ""
                if depth_value is not None:
                    depth_text = f" | Distance: {depth_value:.0f}cm"
                    detection_text += depth_text

                # Translate if needed
                translated_text = detection_text
                if target_lang != "en":
                    translated_text = translate_text(detection_text, target_lang)

                # Check connection again before sending response
                if websocket.client_state.CONNECTED:
                    # Create annotated image
                    _, buffer = cv2.imencode(".jpg", results.plot())
                    base64_frame = base64.b64encode(buffer).decode()
                    
                    # Send response
                    await websocket.send_json({
                        "text": detection_text,
                        "translated_text": translated_text,
                        "image": base64_frame,
                        "language": target_lang,
                        "depth": depth_value
                    })
                else:
                    print(f"🔄 Client disconnected before sending response: {client_id}")
                    is_connected = False
                    break

            except asyncio.TimeoutError:
                # Handle timeout gracefully
                print(f"⏱️ Receive timeout: {client_id}")
                continue
                
            except WebSocketDisconnect:
                print(f"🔒 WebSocket disconnect: {client_id}")
                is_connected = False
                break
                
            except Exception as e:
                print(f"❌ Processing error: {str(e)}")
                # Only continue if connection is still active
                if not websocket.client_state.CONNECTED:
                    is_connected = False
                    break
                continue

    except Exception as e:
        print(f"❌ Connection error: {str(e)}")
        
    finally:
        # Clean up connection
        try:
            if client_id in active_connections:
                del active_connections[client_id]
            print(f"🧹 Connection cleaned up: {client_id}")
        except Exception as e:
            print(f"⚠️ Cleanup error: {str(e)}")

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