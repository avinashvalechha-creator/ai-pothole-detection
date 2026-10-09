from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models import RoadHazard, Observation
from backend.app.config import settings

def is_duplicate_observation(db: Session, obs: Observation, time_window_seconds: int = 30) -> bool:
    """
    Check if the same vehicle has already submitted an observation in the same vicinity
    within a short time window (e.g., 30s) to prevent double counting consecutive frames.
    """
    if not obs.latitude or not obs.longitude:
        return False

    recent_cutoff = datetime.now(timezone.utc) - timedelta(seconds=time_window_seconds)

    recent_from_same_device = db.query(Observation).filter(
        Observation.device_id == obs.device_id,
        Observation.timestamp >= recent_cutoff,
        Observation.id != obs.id
    ).all()

    for past_obs in recent_from_same_device:
        if past_obs.latitude and past_obs.longitude:
            # Lat/lon difference check (~0.0002 deg is ~20 meters)
            lat_diff = abs(past_obs.latitude - obs.latitude)
            lon_diff = abs(past_obs.longitude - obs.longitude)
            if lat_diff < 0.0003 and lon_diff < 0.0003:
                return True
    return False

def validate_observation_quality(obs: Observation) -> Tuple[bool, Optional[str]]:
    """
    Validate GPS sanity, confidence score, and bbox area.
    """
    if obs.confidence < settings.CONFIDENCE_THRESHOLD:
        return False, f"Confidence score ({obs.confidence:.2f}) below minimum threshold ({settings.CONFIDENCE_THRESHOLD:.2f})"

    if obs.latitude is not None:
        if obs.latitude < -90.0 or obs.latitude > 90.0:
            return False, f"Invalid latitude: {obs.latitude}"

    if obs.longitude is not None:
        if obs.longitude < -180.0 or obs.longitude > 180.0:
            return False, f"Invalid longitude: {obs.longitude}"

    if obs.area_ratio > 0.85:
        return False, f"Abnormal bounding box area ({obs.area_ratio:.2f}); likely visual occlusion or false positive"

    return True, None

def update_hazard_freshness_and_expiry(db: Session) -> int:
    """
    Check hazards older than HAZARD_EXPIRY_DAYS without fresh observations
    and transition them to 'expired'.
    """
    expiry_cutoff = datetime.now(timezone.utc) - timedelta(days=settings.HAZARD_EXPIRY_DAYS)
    expired_hazards = db.query(RoadHazard).filter(
        RoadHazard.last_observed_at < expiry_cutoff,
        RoadHazard.status.in_(["provisional", "verified"])
    ).all()

    count = 0
    for h in expired_hazards:
        h.status = "expired"
        count += 1
    
    if count > 0:
        db.commit()
    return count

def apply_driver_feedback(db: Session, hazard_id: str, action: str) -> Optional[RoadHazard]:
    """
    Process driver feedback (clear or confirm) to update hazard status.
    """
    hazard = db.query(RoadHazard).filter(RoadHazard.id == hazard_id).first()
    if not hazard:
        return None

    if action == "clear":
        hazard.feedback_clear_count += 1
        # If multiple drivers confirm the road was repaired/pothole is cleared
        if hazard.feedback_clear_count >= 2 and hazard.feedback_clear_count > hazard.feedback_confirm_count:
            hazard.status = "resolved"
            hazard.resolved_at = datetime.now(timezone.utc)
    elif action == "confirm":
        hazard.feedback_confirm_count += 1
        if hazard.status == "resolved":
            hazard.status = "verified" # Reopen if reported still broken

    db.commit()
    db.refresh(hazard)
    return hazard
