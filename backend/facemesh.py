# facemesh.py

from fastapi import APIRouter, File, UploadFile
from typing import List
import cv2
import numpy as np
import mediapipe as mp
import base64

router = APIRouter()

# MediaPipe setup
mp_drawing = mp.solutions.drawing_utils
mp_face_mesh = mp.solutions.face_mesh

def rotate_image(image, angle):
    height, width = image.shape[:2]
    center = (width // 2, height // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, rotation_matrix, (width, height))

def process_single_image(image, face_mesh, person_name, variation_name):
    results = face_mesh.process(image)
    landmarks = []
    
    if results.multi_face_landmarks:
        print(f"\n{'='*50}")
        print(f"Processing landmarks for: {person_name}")
        print(f"Variation: {variation_name}")
        print(f"{'='*50}")
        
        for face_landmarks in results.multi_face_landmarks:
            print("\nFacial Landmarks:")
            print("-" * 30)
            for id, lm in enumerate(face_landmarks.landmark):
                landmarks.append({
                    "id": id,
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z
                })
                print(f"Landmark {id:03d}: x={lm.x:.3f}, y={lm.y:.3f}, z={lm.z:.3f}")
    else:
        print(f"\nNo face detected for {person_name} in {variation_name}")
    
    return landmarks

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
            # Extract person name from filename (format: personname_index.jpg)
            person_name = image_file.filename.split('_')[0]
            
            # Read and decode original image
            image_bytes = await image_file.read()
            np_image = np.frombuffer(image_bytes, np.uint8)
            original = cv2.imdecode(np_image, cv2.IMREAD_COLOR)
            
            print(f"\nProcessing image: {image_file.filename}")
            
            # Create variations
            variations = []
            
            # Original image
            rgb_original = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
            variations.append(("original", rgb_original))
            
            # Grayscale
            gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
            gray_rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
            variations.append(("grayscale", gray_rgb))
            
            # Rotations
            for angle in [90, 180, 270]:
                rotated = rotate_image(original, angle)
                rgb_rotated = cv2.cvtColor(rotated, cv2.COLOR_BGR2RGB)
                variations.append((f"rotation_{angle}", rgb_rotated))

            # Process each variation
            image_variations = []
            for variation_name, image in variations:
                # Process landmarks with person name and variation info
                landmarks = process_single_image(image, face_mesh, person_name, variation_name)
                
                # Convert image to base64 for frontend display
                _, buffer = cv2.imencode('.jpg', cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
                base64_image = base64.b64encode(buffer).decode('utf-8')
                
                image_variations.append({
                    "variation": variation_name,
                    "landmarks": landmarks,
                    "image_data": base64_image
                })

            results_data.append({
                "filename": image_file.filename,
                "variations": image_variations
            })

        except Exception as e:
            print(f"Error processing image {image_file.filename}: {str(e)}")
            continue

    face_mesh.close()
    return {"results": results_data}
