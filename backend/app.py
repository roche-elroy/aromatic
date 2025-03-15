import cv2
import numpy as np
import asyncio
import base64
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from translation import translate_text
from pydantic import BaseModel
from typing import Dict

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
    source_lang: str
    target_lang: str

@app.post("/translate")
async def translate_text_endpoint(request: TranslationRequest):
    translated = translate_text(
        request.text,
        source_lang=request.source_lang,
        target_lang=request.target_lang
    )
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
    source_lang = websocket.query_params.get("source", "en")
    target_lang = websocket.query_params.get("target", "en")
    
    if source_lang not in ['en', 'hi'] or target_lang not in ['en', 'hi']:
        await websocket.close(code=1008, reason="Unsupported language")
        return
        
    try:
        await websocket.accept()
        active_connections[client_id] = websocket
        print(f"✅ WebSocket connected: {client_id} (source: {source_lang}, target: {target_lang})")

        while True:
            try:
                data = await websocket.receive_text()
                frame_data = base64.b64decode(data)
                np_frame = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                results = model(frame)[0]
                detected_objects = [model.names[int(box.cls)] for box in results.boxes]
                detection_text = ", ".join(set(detected_objects)) if detected_objects else "No objects detected"

                # Translate if languages differ
                translated_text = detection_text
                if source_lang != target_lang:
                    translated_text = translate_text(
                        detection_text,
                        source_lang=source_lang,
                        target_lang=target_lang
                    )

                _, buffer = cv2.imencode(".jpg", results.plot())
                base64_frame = base64.b64encode(buffer).decode()

                if websocket.client_state.CONNECTED:
                    await websocket.send_json({
                        "text": detection_text,
                        "translated_text": translated_text,
                        "image": base64_frame
                    })

            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"❌ Error processing frame: {str(e)}")
                continue

    except Exception as e:
        print(f"❌ WebSocket error: {str(e)}")
    finally:
        if client_id in active_connections:
            del active_connections[client_id]

@app.get("/")
async def root():
    return {"status": "running", "connections": len(active_connections)}