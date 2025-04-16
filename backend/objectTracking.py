from dataclasses import dataclass
from typing import List, Dict, Tuple
import numpy as np
from ultralytics import YOLO

@dataclass
class TrackedObject:
    track_id: int
    class_name: str
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    confidence: float

class ObjectTracker:
    def __init__(self, model_path="yolov8n.pt"):
        self.model = YOLO(model_path)
        
    def update(self, frame: np.ndarray, detections: List[Dict] = None) -> List[TrackedObject]:
        """Update using YOLOv8's native tracking"""
        try:
            # Run tracking
            results = self.model.track(
                source=frame,
                persist=True,
                verbose=False,
                conf=0.5,
                iou=0.5,
                imgsz=640
            )[0]
            
            tracked_objects = []
            
            if results.boxes.id is None:
                print("👁️ No tracked objects in current frame")
                return []
            
            # Process tracking results
            boxes = results.boxes.xywhn  # Normalized coordinates
            ids = results.boxes.id.int().cpu().tolist()
            confidences = results.boxes.conf.cpu().tolist()
            class_ids = results.boxes.cls.int().cpu().tolist()
            
            for box, track_id, conf, class_id in zip(boxes, ids, confidences, class_ids):
                x, y, w, h = box.cpu().tolist()
                # Convert to x1,y1,x2,y2 format
                bbox = (x, y, x + w, y + h)
                
                # Calculate position
                center_x = x + w/2
                position = "left" if center_x < 0.5 else "right"
                
                class_name = results.names[class_id]
                print(f"📍 Object {track_id} ({class_name}) position: {position}")
                
                tracked_objects.append(TrackedObject(
                    track_id=track_id,
                    class_name=f"{class_name} ({position})",
                    bbox=bbox,
                    confidence=conf
                ))
            
            print(f"📊 Frame summary: Tracking {len(tracked_objects)} objects")
            return tracked_objects
            
        except Exception as e:
            print(f"❌ Tracking error: {str(e)}")
            return []