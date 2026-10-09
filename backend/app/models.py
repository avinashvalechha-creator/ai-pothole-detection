import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class RoadHazard(Base):
    __tablename__ = "road_hazards"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="medium", index=True) # low, medium, high, critical
    estimated_area_ratio = Column(Float, nullable=False, default=0.03) # explainable area / frame area
    confidence = Column(Float, nullable=False, default=0.75)
    status = Column(String(20), nullable=False, default="provisional", index=True) # provisional, verified, resolved, expired
    
    observation_count = Column(Integer, nullable=False, default=1)
    independent_device_count = Column(Integer, nullable=False, default=1)
    
    first_observed_at = Column(DateTime(timezone=True), default=utcnow)
    last_observed_at = Column(DateTime(timezone=True), default=utcnow, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    address_label = Column(String(255), nullable=True)
    road_type = Column(String(50), nullable=True, default="City Road")
    
    feedback_clear_count = Column(Integer, nullable=False, default=0)
    feedback_confirm_count = Column(Integer, nullable=False, default=0)

    observations = relationship("Observation", back_populates="hazard", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "severity": self.severity,
            "estimated_area_ratio": round(self.estimated_area_ratio, 4),
            "confidence": round(self.confidence, 3),
            "status": self.status,
            "observation_count": self.observation_count,
            "independent_device_count": self.independent_device_count,
            "first_observed_at": self.first_observed_at.isoformat() if self.first_observed_at else None,
            "last_observed_at": self.last_observed_at.isoformat() if self.last_observed_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "address_label": self.address_label,
            "road_type": self.road_type,
            "feedback_clear_count": self.feedback_clear_count,
            "feedback_confirm_count": self.feedback_confirm_count,
        }

class Observation(Base):
    __tablename__ = "observations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    hazard_id = Column(String(36), ForeignKey("road_hazards.id"), nullable=True, index=True)
    device_id = Column(String(64), nullable=False, index=True) # Pseudonymous ID
    
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    travel_direction = Column(Float, nullable=True) # Heading 0-360 deg
    speed_kmh = Column(Float, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), default=utcnow, index=True)
    confidence = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False) # low, medium, high, critical
    
    # Bounding Box normalized coordinates (0.0 to 1.0)
    bbox_x = Column(Float, nullable=False, default=0.0)
    bbox_y = Column(Float, nullable=False, default=0.0)
    bbox_w = Column(Float, nullable=False, default=0.0)
    bbox_h = Column(Float, nullable=False, default=0.0)
    area_ratio = Column(Float, nullable=False, default=0.0)
    
    source_type = Column(String(50), nullable=False, default="dashcam") # dashcam, live_stream, upload, simulated
    image_path = Column(String(255), nullable=True)
    is_flagged_suspicious = Column(Boolean, default=False)
    raw_metadata = Column(Text, nullable=True)

    hazard = relationship("RoadHazard", back_populates="observations")

    def to_dict(self):
        return {
            "id": self.id,
            "hazard_id": self.hazard_id,
            "device_id": self.device_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "travel_direction": self.travel_direction,
            "speed_kmh": self.speed_kmh,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "confidence": round(self.confidence, 3),
            "severity": self.severity,
            "bbox": {
                "x": self.bbox_x,
                "y": self.bbox_y,
                "w": self.bbox_w,
                "h": self.bbox_h,
            },
            "area_ratio": round(self.area_ratio, 4),
            "source_type": self.source_type,
            "image_path": self.image_path,
            "is_flagged_suspicious": self.is_flagged_suspicious,
        }

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
