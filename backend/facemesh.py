# facemesh.py

from fastapi import APIRouter, File, UploadFile
from typing import List
import cv2
import numpy as np
import mediapipe as mp
import base64
from concurrent.futures import ThreadPoolExecutor

router = APIRouter()
mp_drawing = mp.solutions.drawing_utils
mp_face_mesh = mp.solutions.face_mesh

def rotate_image(image, angle):
    if angle == 0: return image
    height, width = image.shape[:2]
    center = (width // 2, height // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, matrix, (width, height))

def process_variation(image, variation_name, person_name):
    try:
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            
            # Convert to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_image)
            landmarks = []

            print(f"\n{'='*50}")
            print(f"Processing {person_name}'s {variation_name} image")
            print(f"{'='*50}")

            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    print(f"\nFacial Landmarks for {variation_name}:")
                    print("-" * 30)
                    for idx, lm in enumerate(face_landmarks.landmark):
                        landmarks.append({
                            "id": idx,
                            "x": lm.x,
                            "y": lm.y,
                            "z": lm.z
                        })
                        print(f"Landmark {idx:03d}: x={lm.x:.3f}, y={lm.y:.3f}, z={lm.z:.3f}")
            else:
                print(f"No face detected in {variation_name}")

            # Convert processed image to base64
            _, buffer = cv2.imencode('.jpg', image)
            base64_image = base64.b64encode(buffer).decode('utf-8')

            return {
                "variation": variation_name,
                "landmarks": landmarks,
                "image_data": base64_image
            }
    except Exception as e:
        print(f"Error processing {variation_name}: {str(e)}")
        return None

@router.post("/process-images/")
async def process_images(images: List[UploadFile] = File(...)):
    results_data = []

    for image_file in images:
        try:
            # Extract person name from filename
            person_name = image_file.filename.split('_')[0]
            print(f"\nProcessing images for: {person_name}")

            # Read image
            image_bytes = await image_file.read()
            np_image = np.frombuffer(image_bytes, np.uint8)
            original = cv2.imdecode(np_image, cv2.IMREAD_COLOR)

            if original is None:
                print(f"Failed to decode image: {image_file.filename}")
                continue

            # Create variations
            variations = []
            
            # Original
            variations.append((original, "original"))
            
            # Grayscale
            gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
            gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            variations.append((gray_bgr, "grayscale"))
            
            # Rotations
            for angle in [90, 180, 270]:
                rotated = rotate_image(original, angle)
                variations.append((rotated, f"rotation_{angle}"))

            # Process each variation
            variation_results = []
            for img, variation_name in variations:
                result = process_variation(img, variation_name, person_name)
                if result:
                    variation_results.append(result)

            results_data.append({
                "filename": image_file.filename,
                "variations": variation_results
            })

        except Exception as e:
            print(f"Error processing image {image_file.filename}: {str(e)}")
            continue

    if not results_data:
        return {"error": "Failed to process any images"}

    return {"results": results_data}
