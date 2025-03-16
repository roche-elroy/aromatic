import cv2
import numpy as np
import asyncio
import base64
import os
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from depth import get_depth

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
    await websocket.accept()
    print("✅ WebSocket connection established")

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

            # ✅ **Pass Frame to Depth Estimation**
            depth_value = get_depth(frame)
            if depth_value is not None:
                detection_text += f" | Depth: {depth_value:.2f} cm"

            # Encode processed frame to JPEG
            _, buffer = cv2.imencode(".jpg", annotated_frame)
            base64_frame = base64.b64encode(buffer).decode()

            # Send processed frame and detection results to frontend
            response = {
                "text": detection_text,
                "image": base64_frame,
                "depth": depth_value  # Send depth info separately
            }
            await websocket.send_json(response)
            print(f"📤 Processed frame sent back ({detection_text})")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await websocket.close()
        print("🔒 WebSocket closed")


@app.get("/depth")
async def get_depth_value():
    """API endpoint to return the estimated depth in cm."""
    distance = get_depth()
    if distance is None:
        return {"error": "Failed to capture depth"}
    return {"estimated_distance_cm": distance}

@app.get("/")
async def root():
    return {"message": "Object Detection API is running. Connect to /ws/video for detection."}

