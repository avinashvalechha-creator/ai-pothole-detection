import os
from pydantic import BaseModel
from typing import Dict, Any

class Settings(BaseModel):
    PROJECT_NAME: str = "AI Pothole Detection & Road Intelligence System"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pothole_intelligence.db")
    
    # API Security
    API_KEY: str = os.getenv("ROAD_AI_API_KEY", "road-hazard-api-key-2026")
    
    # Computer Vision Configuration
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))
    MODEL_WEIGHTS_PATH: str = os.getenv("MODEL_WEIGHTS_PATH", "backend/app/weights/pothole_yolov8n.pt")
    USE_DEMO_VISION_FALLBACK: bool = True
    
    # Severity Thresholds (based on explainable relative bounding box area)
    # Area ratio = (box_width * box_height) / (frame_width * frame_height)
    SEVERITY_LOW_MAX_AREA: float = 0.018      # < 1.8% of road frame
    SEVERITY_MEDIUM_MAX_AREA: float = 0.048   # 1.8% - 4.8%
    SEVERITY_HIGH_MAX_AREA: float = 0.095     # 4.8% - 9.5%
    # >= 9.5% classified as 'critical'
    
    # Spatial Clustering & Hazard Aggregation
    CLUSTER_RADIUS_METERS: float = float(os.getenv("CLUSTER_RADIUS_METERS", "20.0"))
    VERIFICATION_MIN_OBSERVATIONS: int = int(os.getenv("VERIFICATION_MIN_OBSERVATIONS", "3"))
    VERIFICATION_MIN_DEVICES: int = int(os.getenv("VERIFICATION_MIN_DEVICES", "2"))
    HAZARD_EXPIRY_DAYS: int = int(os.getenv("HAZARD_EXPIRY_DAYS", "30"))
    
    # ADAS Warning System Parameters
    ADAS_WARNING_DISTANCE_METERS: float = float(os.getenv("ADAS_WARNING_DISTANCE_METERS", "150.0"))
    ADAS_WARNING_CONE_DEGREES: float = float(os.getenv("ADAS_WARNING_CONE_DEGREES", "45.0"))
    
    # Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "backend/uploads")

settings = Settings()
