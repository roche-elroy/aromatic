import cv2
import numpy as np
import asyncio
import base64
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from translation import translate_text

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine model path - default to YOLOv8n if custom model not found
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")
print(f"🔄 Loading YOLO model from {MODEL_PATH}")

# Load YOLO model
model = YOLO(MODEL_PATH)
print("✅ Model loaded successfully")


@app.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    """Handles real-time video streaming and object detection."""
    await websocket.accept()
    print("✅ Video WebSocket connection established")

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

            # Translate text asynchronously
            translated_text = await asyncio.to_thread(translate_text, detection_text)
           
            # Encode processed frame to JPEG
            _, buffer = cv2.imencode(".jpg", annotated_frame)
            base64_frame = base64.b64encode(buffer).decode()

            # Send processed frame and detection results to frontend
            response = {
                "text": detection_text,
                "translated_text": translated_text,
                "image": base64_frame
            }
            print(f"📤 Sending Response: {translated_text}")  # Ensure response is actually being sent
            await websocket.send_json(translated_text)
            print("✅ JSON sent successfully")  # This should confirm it's sending

            print(f"📤 Processed frame sent back ({detection_text})")

    except WebSocketDisconnect:
        print("🔒 Client disconnected from video stream")
    except Exception as e:
        print(f"❌ Video WebSocket Error: {e}")
    finally:
        await websocket.close()
        print("🔒 Video WebSocket closed")


@app.websocket("/ws/translate")
async def translation_websocket(websocket: WebSocket):
    """Handles translation of detection results via WebSocket."""
    await websocket.accept()
    print("✅ Translation WebSocket connection established")

    try:
        while True:
            # Receive text data from frontend
            detection_text = await websocket.receive_text()

            # Translate text asynchronously
            translated_text = await asyncio.to_thread(translate_text, detection_text)

            # Send translated text back
            await websocket.send_text(translated_text)
            print(f"📤 Translated text sent: {translated_text}")

    except WebSocketDisconnect:
        print("🔒 Client disconnected from translation service")
    except Exception as e:
        print(f"❌ Translation WebSocket Error: {e}")
    finally:
        await websocket.close()
        print("🔒 Translation WebSocket closed")


@app.get("/")
async def root():
    """Simple health check endpoint."""
    return {"message": "Object Detection API is running. Connect to /ws/video for detection."}
