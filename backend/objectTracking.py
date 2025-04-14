from dataclasses import dataclass
from typing import List, Dict, Tuple
import numpy as np
from scipy.optimize import linear_sum_assignment
from collections import defaultdict, deque
from queue import Queue

@dataclass
class TrackedObject:
    track_id: int
    class_name: str
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    confidence: float

class ObjectTracker:
    def __init__(self):
        self.tracks = {}
        self.next_id = 0
        self.max_age = 30
        self.min_iou = 0.3
        self.track_ages = defaultdict(int)
        self.frame_queue = Queue(maxsize=5)  # Limit queue size
        self.previous_tracks = deque(maxlen=5)  # Keep track of previous 5 frames
        
    def clear_frame_queue(self):
        """Clear all pending frames from the queue"""
        while not self.frame_queue.empty():
            try:
                self.frame_queue.get_nowait()
            except Queue.Empty:
                break
        print("🧹 Frame queue cleared")

    def calculate_iou(self, box1, box2):
        """Calculate intersection over union between two boxes"""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        
        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
        box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
        
        union = box1_area + box2_area - intersection
        return intersection / union if union > 0 else 0

    def update(self, frame: np.ndarray, detections: List[Dict]) -> List[TrackedObject]:
        # Clear previous frame data
        self.clear_frame_queue()
        
        if not detections:
            print("👁️ No detections in current frame")
            # Store empty frame in previous tracks
            self.previous_tracks.append([])
            return []

        # Store current tracks before update
        if self.tracks:
            self.previous_tracks.append([{
                'id': k,
                'bbox': v['bbox'],
                'class': v['class_name'],
                'position': v.get('position', 'unknown')
            } for k, v in self.tracks.items()])

        tracked_objects = []

        # Extract current detections
        current_boxes = []
        current_scores = []
        current_names = []
        
        for det in detections:
            bbox = det['bbox']
            current_boxes.append([float(x) for x in bbox])
            current_scores.append(float(det['confidence']))
            current_names.append(det['class_name'])

        # If no existing tracks, create new ones
        if not self.tracks:
            for i, bbox in enumerate(current_boxes):
                self.tracks[self.next_id] = {
                    'bbox': bbox,
                    'class_name': current_names[i],
                    'confidence': current_scores[i]
                }
                self.track_ages[self.next_id] = 0
                self.next_id += 1
        else:
            # Calculate IoU matrix
            iou_matrix = np.zeros((len(current_boxes), len(self.tracks)))
            for i, current_box in enumerate(current_boxes):
                for j, (track_id, track) in enumerate(self.tracks.items()):
                    iou = self.calculate_iou(current_box, track['bbox'])
                    iou_matrix[i, j] = iou

            # Hungarian algorithm for matching
            row_ind, col_ind = linear_sum_assignment(-iou_matrix)  # Negative for maximization

            # Update matched tracks and create new ones
            matched_track_ids = set()
            for i, j in zip(row_ind, col_ind):
                if iou_matrix[i, j] >= self.min_iou:
                    track_id = list(self.tracks.keys())[j]
                    self.tracks[track_id] = {
                        'bbox': current_boxes[i],
                        'class_name': current_names[i],
                        'confidence': current_scores[i]
                    }
                    self.track_ages[track_id] = 0
                    matched_track_ids.add(track_id)

            # Create new tracks for unmatched detections
            for i in range(len(current_boxes)):
                if i not in row_ind:
                    self.tracks[self.next_id] = {
                        'bbox': current_boxes[i],
                        'class_name': current_names[i],
                        'confidence': current_scores[i]
                    }
                    self.track_ages[self.next_id] = 0
                    self.next_id += 1

        # Remove old tracks
        self.tracks = {k: v for k, v in self.tracks.items() 
                      if self.track_ages[k] < self.max_age}

        # Add movement detection by comparing with previous frame
        if self.previous_tracks:
            prev_frame = self.previous_tracks[-1]
            for track_id, track in self.tracks.items():
                prev_track = next((t for t in prev_frame if t['id'] == track_id), None)
                if prev_track:
                    # Calculate movement
                    curr_center_x = (track['bbox'][0] + track['bbox'][2]) / 2
                    prev_center_x = (prev_track['bbox'][0] + prev_track['bbox'][2]) / 2
                    movement = "stationary"
                    if abs(curr_center_x - prev_center_x) > 0.01:
                        movement = "moving left" if curr_center_x < prev_center_x else "moving right"
                    print(f"🔄 Object {track_id} ({track['class_name']}) is {movement}")

        # Process current frame
        for track_id, track in self.tracks.items():
            bbox = track['bbox']
            # Normalize coordinates if needed
            if max(bbox) > 1.0:
                frame_width = frame.shape[1]
                frame_height = frame.shape[0]
                bbox = [
                    bbox[0] / frame_width,
                    bbox[1] / frame_height,
                    bbox[2] / frame_width,
                    bbox[3] / frame_height
                ]
                track['bbox'] = bbox

            center_x = (bbox[0] + bbox[2]) / 2
            
            # Position calculation with debug info
            print(f"🎯 Object {track_id} center_x: {center_x:.3f}")
            
            position = "center"
            if center_x < 0.33:
                position = "left"
            elif center_x > 0.66:
                position = "right"
            
            print(f"📍 Object {track_id} position: {position}")
            
            track['position'] = position
            
            tracked_objects.append(TrackedObject(
                track_id=track_id,
                class_name=f"{track['class_name']} ({position})",
                bbox=tuple(bbox),
                confidence=track['confidence']
            ))

        print(f"📊 Frame summary: Tracking {len(tracked_objects)} objects")
        return tracked_objects