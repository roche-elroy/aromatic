import cv2
import torch
import numpy as np
from collections import deque
from transformers import pipeline
from PIL import Image

# Load the Depth Anything V2 Small model
device = "cuda" if torch.cuda.is_available() else "cpu"
pipe = pipeline(
    task="depth-estimation", 
    model="depth-anything/Depth-Anything-V2-Small-hf", 
    device=0 if device == "cuda" else -1
)

# Calibration parameters
FOCAL_LENGTH = 900  # Approximate focal length in pixels
KNOWN_OBJECT_HEIGHT = 1.725  # Example: Assume an average human height (in meters)
PIXEL_HEIGHT = 1360  # Expected height of a known object in pixels at 1m

# Moving average buffer for stability
distance_buffer = deque(maxlen=10)

def get_depth(frame, detected_objects=None):
    """
    Estimate depth from frame using Depth Anything V2 Small model.
    Returns a dict with depth information compatible with existing frontend.
    """
    if frame is None:
        return {"depth": None, "error": "No frame provided"}

    try:
        # Convert frame to PIL image
        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

        # Perform depth estimation
        with torch.no_grad():
            depth_output = pipe(image)["depth"]

        # Convert depth map to NumPy array
        depth_np = np.array(depth_output)

        # Get depth value at center pixel
        h, w = depth_np.shape
        center_depth_value = depth_np[h // 2, w // 2]

        # Convert to estimated real-world distance (meters to cm)
        estimated_distance_cm = (FOCAL_LENGTH * KNOWN_OBJECT_HEIGHT) / (center_depth_value * PIXEL_HEIGHT + 1e-6) * 100

        # Add to buffer & compute smoothed distance
        distance_buffer.append(estimated_distance_cm)
        smoothed_distance = np.mean(distance_buffer)
        rounded_distance = round(smoothed_distance, 1)

        # Return in the same format as before for frontend compatibility
        response = {
            "depth": rounded_distance,
            "confidence": min(len(distance_buffer) / 10.0, 1.0),
            "unit": "cm",
            "method": "depth-anything-v2"
        }

        return response

    except Exception as e:
        print(f"Depth estimation error: {str(e)}")
        return {"depth": None, "error": str(e)}

    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()