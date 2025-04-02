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

# Increased buffer size for better smoothing
distance_buffer = deque(maxlen=8)

def get_depth(frame):
    if frame is None:
        return None

    try:
        # Resize frame for consistent results
        frame = cv2.resize(frame, (640, 480))
        
        # Convert frame to PIL image
        pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # Get depth map
        depth_result = pipe(pil_image)
        depth_map = depth_result['predicted_depth']
        
        # Convert tensor to numpy array with proper detachment
        depth_map = depth_map.detach().cpu().numpy()
        
        # Apply Gaussian blur to reduce noise
        depth_map = cv2.GaussianBlur(depth_map, (5, 5), 0)
        
        # Normalize depth values with improved scaling
        depth_min = np.percentile(depth_map, 5)  # Remove outliers
        depth_max = np.percentile(depth_map, 95)  # Remove outliers
        normalized_depth = np.clip(
            ((depth_map - depth_min) * 255 / (depth_max - depth_min)),
            0, 255
        )
        
        # Convert to uint8 after clipping
        depth_map_uint8 = normalized_depth.astype(np.uint8)
        
        # Get weighted average depth from multiple regions
        h, w = depth_map_uint8.shape
        
        # Central region (50% weight)
        center_region = depth_map_uint8[h//3:2*h//3, w//3:2*w//3]
        center_depth = np.mean(center_region)
        
        # Lower region (30% weight) - usually closer to camera
        lower_region = depth_map_uint8[2*h//3:, w//3:2*w//3]
        lower_depth = np.mean(lower_region)
        
        # Upper region (20% weight) - usually further from camera
        upper_region = depth_map_uint8[:h//3, w//3:2*w//3]
        upper_depth = np.mean(upper_region)
        
        # Weighted average
        avg_depth = (0.5 * center_depth + 0.3 * lower_depth + 0.2 * upper_depth)
        
        # Improved distance mapping with non-linear scaling
        # Closer distances (0-100cm) have finer granularity
        if avg_depth < 128:
            real_distance = 30 + (avg_depth * 70 / 128)
        else:
            real_distance = 100 + ((avg_depth - 128) * 400 / 127)
            
        # Outlier rejection
        if len(distance_buffer) > 0:
            mean_dist = sum(distance_buffer) / len(distance_buffer)
            if abs(real_distance - mean_dist) > mean_dist * 0.4:  # 40% threshold
                return sum(distance_buffer) / len(distance_buffer)
        
        # Add to moving average buffer
        distance_buffer.append(real_distance)
        
        # Return smoothed distance with proper rounding
        smoothed_distance = sum(distance_buffer) / len(distance_buffer)
        return round(smoothed_distance, 1)

    except Exception as e:
        print(f"Depth estimation error: {str(e)}")
        return None

    finally:
        # Clean up CUDA memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()