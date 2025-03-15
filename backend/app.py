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
    translated = translate_text(request.text, source_lang='en', target_lang=request.target_lang)
    return {"translated_text": translated}

# Determine model path - default to YOLOv8n if custom model not found
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")
print(f"🔄 Loading YOLO model from {MODEL_PATH}")

# Load YOLO model
model = YOLO(MODEL_PATH)
print("✅ Model loaded successfully")

@app.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    await websocket.accept()
    target_lang = websocket.query_params.get("target", "en")
    print(f"✅ WebSocket connection established with target language: {target_lang}")

    try:
        while True:
            # Receive base64 image from frontend
            data = await websocket.receive_text()
            
            # Convert base64 string to image
            frame_data = base64.b64decode(data)
            np_frame = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)

            if frame is None:
                print("⚠️ Frame decoding failed")
                continue

            # Perform YOLO object detection
            results = model(frame)[0]
            annotated_frame = results.plot()

            # Extract object names
            detected_objects = [model.names[int(box.cls)] for box in results.boxes] if results.boxes else []
            detection_text = ", ".join(set(detected_objects)) if detected_objects else "No objects detected"

            # Update translation call with target language
            try:
                translated_text = await asyncio.to_thread(
                    translate_text, 
                    detection_text,
                    source_lang='en',
                    target_lang=target_lang
                )
                print(f"🔤 Original text: {detection_text}")
                print(f"🔤 Translated text ({target_lang}): {translated_text}")
            except Exception as e:
                print(f"⚠️ Translation error: {e}")
                translated_text = detection_text

            # Encode processed frame to JPEG
            _, buffer = cv2.imencode(".jpg", annotated_frame)
            base64_frame = base64.b64encode(buffer).decode()

            # Prepare response with both original and translated text
            response = {
                "text": detection_text,
                "translated_text": translated_text,
                "image": base64_frame
            }

            # Send the complete response
            await websocket.send_json(response)
            print(f"📤 Sent frame with detection: {detection_text}")
            print(f"📤 Translation sent: {translated_text}")

    except WebSocketDisconnect:
        print("🔒 Client disconnected")
    except Exception as e:
        print(f"❌ Error: {e}")
        raise  # Re-raise to see the full error trace
    finally:
        await websocket.close()
        print("🔒 WebSocket connection closed")

@app.get("/")
async def root():
    return {"message": "Object Detection API is running. Connect to /ws/video for detection."}