import cv2
import torch
import numpy as np
from collections import deque
from transformers import pipeline
from PIL import Image

# Load the Depth Anything V2 Small model
device = "cuda" if torch.cuda.is_available() else "cpu"
pipe = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=0 if device == "cuda" else -1)

# Calibration parameters
FOCAL_LENGTH = 900  # Approximate focal length in pixels
KNOWN_OBJECT_HEIGHT = 1.725  # Example: Assume an average human height (in meters)
PIXEL_HEIGHT = 1360  # Expected height of a known object in pixels at 1m

# Moving average buffer for stability
distance_buffer = deque(maxlen=10)

def get_depth(frame):

    if frame is None:
        return None

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
    smoothed_distance_cm = np.mean(distance_buffer)

    return round(smoothed_distance_cm, 2)  # Return rounded value