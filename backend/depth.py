from collections import deque
import numpy as np
import torch
from PIL import Image
import cv2
from transformers import pipeline

# Known object widths in centimeters
KNOWN_WIDTHS = {
    'person': 45,  # average shoulder width
    'bottle': 8,
    'cup': 8,
    'cell phone': 7,
    'book': 15,
    'laptop': 35,
    'chair': 45,
    'table': 120,
    'door': 90
}

# Camera parameters (adjust based on your device)
FOCAL_LENGTH = 800  # approximate focal length in pixels
SENSOR_WIDTH = 640  # image width in pixels

# Initialize model and buffers
pipe = pipeline(
    task="depth-estimation", 
    model="depth-anything/Depth-Anything-V2-Small-hf",
    device="cuda" if torch.cuda.is_available() else "cpu"
)
distance_buffer = deque(maxlen=8)

def calculate_depth_from_width(pixel_width, real_width):
    """Calculate depth using real-world object width."""
    if pixel_width == 0:
        return None
    return (real_width * FOCAL_LENGTH) / pixel_width

def get_depth(frame, detected_objects=None):
    if frame is None:
        return None

    try:
        # Resize frame for consistent results
        frame = cv2.resize(frame, (640, 480))
        
        # Get AI-based depth estimation
        pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        depth_result = pipe(pil_image)
        depth_map = depth_result['predicted_depth'].detach().cpu().numpy()
        
        # Apply refinements
        depth_map = cv2.GaussianBlur(depth_map, (5, 5), 0)
        depth_min = np.percentile(depth_map, 5)
        depth_max = np.percentile(depth_map, 95)
        normalized_depth = np.clip(
            ((depth_map - depth_min) * 255 / (depth_max - depth_min)),
            0, 255
        )
        
        # Region-based estimation
        h, w = normalized_depth.shape
        center_region = normalized_depth[h//3:2*h//3, w//3:2*w//3]
        lower_region = normalized_depth[2*h//3:, w//3:2*w//3]
        upper_region = normalized_depth[:h//3, w//3:2*w//3]
        
        # Calculate AI-based depth
        ai_depth = (
            0.5 * np.mean(center_region) +
            0.3 * np.mean(lower_region) +
            0.2 * np.mean(upper_region)
        )
        
        # Convert to real-world distance
        ai_distance = (
            30 + (ai_depth * 70 / 128) if ai_depth < 128
            else 100 + ((ai_depth - 128) * 400 / 127)
        )

        # Calculate object-based depth if objects detected
        object_distances = []
        if detected_objects and isinstance(detected_objects, list):
            for obj in detected_objects:
                if obj.get('class') in KNOWN_WIDTHS:
                    obj_width = obj.get('width', 0)  # pixel width
                    if obj_width > 0:
                        real_width = KNOWN_WIDTHS[obj['class']]
                        obj_distance = calculate_depth_from_width(obj_width, real_width)
                        if obj_distance:
                            object_distances.append(obj_distance)

        # Combine AI and object-based depths
        final_distance = ai_distance
        if object_distances:
            # Weight object-based distance more if available
            obj_distance_avg = np.mean(object_distances)
            final_distance = (0.4 * ai_distance + 0.6 * obj_distance_avg)

        # Temporal smoothing with outlier rejection
        if len(distance_buffer) > 0:
            mean_dist = sum(distance_buffer) / len(distance_buffer)
            if abs(final_distance - mean_dist) <= mean_dist * 0.4:
                distance_buffer.append(final_distance)
        else:
            distance_buffer.append(final_distance)

        # Calculate final smoothed distance
        smoothed_distance = sum(distance_buffer) / len(distance_buffer)
        rounded_distance = round(smoothed_distance, 1)

        # Prepare response with additional info
        response = {
            "depth": rounded_distance,
            "confidence": min(len(distance_buffer) / 8.0, 1.0),
            "unit": "cm",
            "method": "hybrid" if object_distances else "ai"
        }

        return response

    except Exception as e:
        print(f"Depth estimation error: {str(e)}")
        return {"depth": None, "error": str(e)}

    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()