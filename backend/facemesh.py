from fastapi import APIRouter, File, UploadFile
from typing import List
import cv2
import numpy as np
import mediapipe as mp

router = APIRouter()
mp_drawing = mp.solutions.drawing_utils
mp_face_mesh = mp.solutions.face_mesh

def process_image_variations(image, person_name):
    print(f"\n{'='*50}")
    print(f"Processing image for: {person_name}")
    print(f"{'='*50}")

    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    ) as face_mesh:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(image_rgb)
        
        if not results.multi_face_landmarks:
            print("No face detected in the image.")
            return None

        variations = []
        h, w = image.shape[:2]
        
        for face_landmarks in results.multi_face_landmarks:
            landmarks = []
            print("\nFacial Landmarks:")
            print("-" * 30)
            for idx, lm in enumerate(face_landmarks.landmark):
                x, y, z = int(lm.x * w), int(lm.y * h), lm.z
                landmarks.append({"id": idx, "x": lm.x, "y": lm.y, "z": lm.z})
                print(f"Landmark {idx:03d}: x={x:4d}, y={y:4d}, z={z:.3f}")

            variants = [
                ("original", image),
                ("grayscale", cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)),
                ("rotation_90", cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)),
                ("rotation_180", cv2.rotate(image, cv2.ROTATE_180)),
                ("rotation_270", cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE))
            ]

            orb = cv2.ORB_create(nfeatures=1000)
            
            for variant_name, variant_image in variants:
                print(f"\n{'-'*30}")
                print(f"Processing {variant_name} variation")
                print(f"{'-'*30}")
                
                if len(variant_image.shape) == 3:
                    gray = cv2.cvtColor(variant_image, cv2.COLOR_BGR2GRAY)
                else:
                    gray = variant_image

                keypoints, descriptors = orb.detectAndCompute(gray, None)
                print(f"ORB Keypoints detected: {len(keypoints)}")
                
                for i, kp in enumerate(keypoints[:5]):
                    print(f"Keypoint {i}: x={int(kp.pt[0]):4d}, y={int(kp.pt[1]):4d}, size={kp.size:.1f}, angle={kp.angle:.1f}")
                
                variations.append({
                    "variation": variant_name,
                    "landmarks": landmarks,
                    "orb_results": {
                        "num_keypoints": len(keypoints),
                        "keypoints": [{"x": kp.pt[0], "y": kp.pt[1]} for kp in keypoints]
                    }
                })

        return variations

@router.post("/process-images/")
async def process_images(images: List[UploadFile] = File(...)):
    results_data = []
    
    for image_file in images:
        try:
            person_name = image_file.filename.split('_')[0]
            contents = await image_file.read()
            nparr = np.frombuffer(contents, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                print(f"Failed to decode image: {image_file.filename}")
                continue
                
            variations = process_image_variations(image, person_name)
            if variations:
                results_data.append({
                    "filename": image_file.filename,
                    "variations": variations
                })
            
        except Exception as e:
            print(f"Error processing image {image_file.filename}: {str(e)}")
            continue
            
    return {"results": results_data}
