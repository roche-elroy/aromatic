from collections import deque
import numpy as np
import torch
from PIL import Image
import cv2
from transformers import pipeline

# Initialize depth estimation model
pipe = pipeline(
    task="depth-estimation", 
    model="depth-anything/Depth-Anything-V2-Small-hf",
    device="cuda" if torch.cuda.is_available() else "cpu"
)

# Moving average buffer for stability
distance_buffer = deque(maxlen=5)

def get_depth(frame):
    if frame is None:
        return None

    try:
        # Convert frame to PIL image
        pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # Get depth map
        depth_result = pipe(pil_image)
        depth_map = depth_result['predicted_depth']
        
        # Convert tensor to numpy array
        depth_map = depth_map.cpu().numpy()
        
        # Normalize depth values to 0-255 range
        depth_min = depth_map.min()
        depth_max = depth_map.max()
        normalized_depth = ((depth_map - depth_min) * 255 / (depth_max - depth_min))
        depth_map_uint8 = normalized_depth.astype(np.uint8)
        
        # Get average depth from central region
        h, w = depth_map_uint8.shape
        center_region = depth_map_uint8[h//3:2*h//3, w//3:2*w//3]
        avg_depth = np.mean(center_region)
        
        # Convert to real-world distance (in cm)
        # Map 0-255 to 30-500cm range
        real_distance = 30 + (avg_depth * (500 - 30) / 255)
        
        # Add to moving average buffer
        distance_buffer.append(real_distance)
        
        # Return smoothed distance
        return sum(distance_buffer) / len(distance_buffer)

    except Exception as e:
        print(f"Depth estimation error: {str(e)}")
        return None