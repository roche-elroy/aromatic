# facemesh.py

from fastapi import APIRouter, File, UploadFile
from typing import List
import cv2
import numpy as np
import mediapipe as mp

router = APIRouter()

# MediaPipe setup
mp_drawing = mp.solutions.drawing_utils
mp_face_mesh = mp.solutions.face_mesh

@router.post("/process-images/")
async def process_images(images: List[UploadFile] = File(...)):
    results_data = []

    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    )

    for image_file in images:
        try:
            image_bytes = await image_file.read()
            np_image = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(np_image, cv2.IMREAD_COLOR)
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            results = face_mesh.process(rgb_image)
            image_landmarks = []

            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    print(f"\nProcessing image: {image_file.filename}")
                    print("Facial Landmarks detected:")
                    for id, lm in enumerate(face_landmarks.landmark):
                        landmark = {
                            "id": id,
                            "x": lm.x,
                            "y": lm.y,
                            "z": lm.z
                        }
                        image_landmarks.append(landmark)
                        print(f"Landmark {id}: x={lm.x:.3f}, y={lm.y:.3f}, z={lm.z:.3f}")
            else:
                print(f"\nNo face detected in image: {image_file.filename}")

            results_data.append({
                "filename": image_file.filename,
                "landmarks": image_landmarks
            })

        except Exception as e:
            print(f"Error processing image {image_file.filename}: {str(e)}")
            continue

    face_mesh.close()
    return {"results": results_data}
