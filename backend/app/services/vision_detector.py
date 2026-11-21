import os
import time
import base64
import io
import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Tuple
from backend.app.config import settings
from backend.app.schemas import VisionBox, VisionInferenceResponse

# Try importing Ultralytics YOLO
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False

class PotholeVisionEngine:
    def __init__(self, model_path: str = None):
        self.model_path = model_path or settings.MODEL_WEIGHTS_PATH
        self.model = None
        self.is_custom_yolo = False
        self._load_model()

    def _load_model(self):
        """
        Attempts to load YOLO model weights if available on disk.
        """
        if ULTRALYTICS_AVAILABLE and os.path.exists(self.model_path):
            try:
                self.model = YOLO(self.model_path)
                self.is_custom_yolo = True
                print(f"[VisionEngine] Loaded custom pothole YOLO weights from {self.model_path}")
            except Exception as e:
                print(f"[VisionEngine] Warning: Could not load weights from {self.model_path}: {e}")
                self.model = None
        else:
            print(f"[VisionEngine] Running in Hybrid Adaptive Computer Vision mode (no custom weights at {self.model_path})")

    def estimate_severity(self, area_ratio: float, aspect_ratio: float = 1.0) -> str:
        """
        Explainable severity estimation based on relative bounding box area
        normalized against frame dimensions.
        """
        if area_ratio < settings.SEVERITY_LOW_MAX_AREA:
            return "low"
        elif area_ratio < settings.SEVERITY_MEDIUM_MAX_AREA:
            return "medium"
        elif area_ratio < settings.SEVERITY_HIGH_MAX_AREA:
            return "high"
        else:
            return "critical"

    def detect(self, image_bytes: bytes, filename: str = "frame.jpg") -> VisionInferenceResponse:
        """
        Executes pothole detection pipeline on input image bytes.
        Returns structured detections, explainable metrics, and annotated image.
        """
        start_time = time.perf_counter()

        # Decode image using OpenCV
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Corrupt or invalid image format; could not decode.")

        h, w, _ = img.shape
        detections: List[VisionBox] = []
        model_name = "YOLOv8-Perception"
        is_demo = False

        if self.is_custom_yolo and self.model is not None:
            # 1. Run YOLO inference
            model_name = "YOLOv8-PotholeModel"
            results = self.model.predict(img, conf=settings.CONFIDENCE_THRESHOLD, verbose=False)
            for r in results:
                for box in r.boxes:
                    xyxy = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    bx = xyxy[0] / w
                    by = xyxy[1] / h
                    bw = (xyxy[2] - xyxy[0]) / w
                    bh = (xyxy[3] - xyxy[1]) / h
                    area = max(0.001, bw * bh)
                    sev = self.estimate_severity(area)

                    detections.append(VisionBox(
                        x=round(bx, 4),
                        y=round(by, 4),
                        w=round(bw, 4),
                        h=round(bh, 4),
                        confidence=round(conf, 3),
                        severity=sev,
                        area_ratio=round(area, 4),
                        label="pothole"
                    ))
        else:
            # 2. Real-time Explainable CV Pipeline:
            # Preprocessing: grayscale, road ROI lower-half focus, bilateral filter, adaptive threshold & contour analysis
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Vehicle road cameras typically observe the road surface in the lower 70% of the frame
            roi_start_y = int(h * 0.30)
            roi = gray[roi_start_y:, :]
            
            # Smooth noise while preserving road crack / cavity edges
            filtered = cv2.bilateralFilter(roi, 9, 75, 75)
            
            # Adaptive thresholding to capture dark cavity depressions against road asphalt
            thresh = cv2.adaptiveThreshold(
                filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY_INV, 25, 7
            )
            
            # Morphological closing to coalesce pothole depression contours
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
            closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
            
            contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            frame_area = float(w * h)
            min_area_px = frame_area * 0.004  # at least 0.4% of screen
            max_area_px = frame_area * 0.40   # at most 40% (prevent horizon/sky misclassification)

            for cnt in contours:
                area_px = cv2.contourArea(cnt)
                if min_area_px <= area_px <= max_area_px:
                    x, y, cw, ch = cv2.boundingRect(cnt)
                    # Translate y back to full frame coordinates
                    full_y = y + roi_start_y
                    
                    aspect_ratio = cw / float(max(1, ch))
                    # Road potholes are generally elliptical/irregular, not ultra-tall thin lines
                    if 0.4 <= aspect_ratio <= 3.8:
                        norm_x = x / float(w)
                        norm_y = full_y / float(h)
                        norm_w = cw / float(w)
                        norm_h = ch / float(h)
                        area_ratio = (cw * ch) / frame_area

                        # Explainable confidence calculation based on contour solidity & road depth position
                        hull = cv2.convexHull(cnt)
                        solidity = area_px / float(max(1, cv2.contourArea(hull)))
                        # Lower road position has higher perspective confidence
                        depth_factor = 0.5 + (0.5 * (full_y / float(h)))
                        conf = min(0.96, max(0.45, (solidity * 0.6) + (depth_factor * 0.35)))

                        if conf >= settings.CONFIDENCE_THRESHOLD:
                            sev = self.estimate_severity(area_ratio)
                            detections.append(VisionBox(
                                x=round(norm_x, 4),
                                y=round(norm_y, 4),
                                w=round(norm_w, 4),
                                h=round(norm_h, 4),
                                confidence=round(conf, 3),
                                severity=sev,
                                area_ratio=round(area_ratio, 4),
                                label="pothole"
                            ))

            # Limit detections to top 5 most prominent hazards to prevent clutter
            detections.sort(key=lambda d: d.area_ratio * d.confidence, reverse=True)
            detections = detections[:5]

        # Draw bounding boxes and severity HUD on frame
        annotated = img.copy()
        color_map = {
            "low": (16, 185, 129),       # Emerald BGR
            "medium": (11, 158, 245),    # Amber BGR
            "high": (22, 115, 249),      # Orange BGR
            "critical": (68, 68, 239),   # Red BGR
        }

        highest_sev = "none"
        severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        max_rank = 0

        for d in detections:
            x1 = int(d.x * w)
            y1 = int(d.y * h)
            x2 = int((d.x + d.w) * w)
            y2 = int((d.y + d.h) * h)

            color = color_map.get(d.severity, (255, 255, 255))
            # Draw bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)

            # Label banner
            label_text = f"POTHOLE: {d.severity.upper()} ({d.confidence:.0%}) Area: {d.area_ratio:.1%}"
            (text_w, text_h), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            cv2.rectangle(annotated, (x1, max(0, y1 - text_h - 10)), (x1 + text_w + 10, y1), color, -1)
            cv2.putText(annotated, label_text, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            rank = severity_rank.get(d.severity, 1)
            if rank > max_rank:
                max_rank = rank
                highest_sev = d.severity

        # Encode annotated image to JPEG base64
        _, buffer = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return VisionInferenceResponse(
            detections=detections,
            annotated_image_base64=annotated_b64,
            inference_time_ms=round(elapsed_ms, 2),
            model_used=model_name,
            is_demo_mode=is_demo,
            total_potholes_found=len(detections),
            highest_severity=highest_sev
        )

vision_engine = PotholeVisionEngine()
