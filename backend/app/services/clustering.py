import math
from typing import Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models import RoadHazard, Observation
from backend.app.config import settings

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two GPS points in meters
    using the Haversine formula.
    """
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate initial compass bearing from point 1 to point 2 in degrees (0-360).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (math.cos(phi1) * math.sin(phi2) -
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360.0) % 360.0

def find_nearest_hazard(db: Session, lat: float, lon: float, max_radius_m: float) -> Optional[Tuple[RoadHazard, float]]:
    """
    Find the closest RoadHazard within max_radius_m.
    """
    # Rough bounding box filter first (1 degree lat ~= 111km -> 20m ~= 0.0002 deg)
    lat_delta = max_radius_m / 111000.0
    lon_delta = max_radius_m / (111000.0 * max(0.1, math.cos(math.radians(lat))))

    candidates = db.query(RoadHazard).filter(
        RoadHazard.latitude.between(lat - lat_delta, lat + lat_delta),
        RoadHazard.longitude.between(lon - lon_delta, lon + lon_delta),
        RoadHazard.status != "resolved"
    ).all()

    best_hazard = None
    min_dist = float('inf')

    for hazard in candidates:
        dist = calculate_haversine_distance(lat, lon, hazard.latitude, hazard.longitude)
        if dist <= max_radius_m and dist < min_dist:
            min_dist = dist
            best_hazard = hazard

    if best_hazard:
        return best_hazard, min_dist
    return None

def cluster_and_update_hazard(db: Session, obs: Observation) -> Optional[RoadHazard]:
    """
    Cluster new observation into an existing hazard if within CLUSTER_RADIUS_METERS,
    or instantiate a new provisional RoadHazard record.
    """
    if obs.latitude is None or obs.longitude is None:
        return None

    nearest = find_nearest_hazard(db, obs.latitude, obs.longitude, settings.CLUSTER_RADIUS_METERS)
    now = datetime.now(timezone.utc)

    if nearest:
        hazard, _ = nearest
        n = hazard.observation_count
        
        # Smooth spatial averaging (rolling average)
        hazard.latitude = (hazard.latitude * n + obs.latitude) / (n + 1)
        hazard.longitude = (hazard.longitude * n + obs.longitude) / (n + 1)
        hazard.estimated_area_ratio = (hazard.estimated_area_ratio * n + obs.area_ratio) / (n + 1)
        hazard.confidence = (hazard.confidence * n + obs.confidence) / (n + 1)
        hazard.observation_count += 1
        hazard.last_observed_at = now

        # Check for independent pseudonymous devices
        existing_devices = db.query(Observation.device_id).filter(
            Observation.hazard_id == hazard.id
        ).distinct().all()
        device_ids = {d[0] for d in existing_devices}
        if obs.device_id not in device_ids:
            hazard.independent_device_count += 1

        # Escalate severity if incoming observation is higher
        severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        if severity_rank.get(obs.severity, 1) > severity_rank.get(hazard.severity, 1):
            hazard.severity = obs.severity

        # Verification check
        if (hazard.status == "provisional" and 
            hazard.observation_count >= settings.VERIFICATION_MIN_OBSERVATIONS and 
            hazard.independent_device_count >= settings.VERIFICATION_MIN_DEVICES):
            hazard.status = "verified"
            hazard.verified_at = now

        obs.hazard_id = hazard.id
        db.commit()
        db.refresh(hazard)
        return hazard
    else:
        # Create new RoadHazard
        new_hazard = RoadHazard(
            latitude=obs.latitude,
            longitude=obs.longitude,
            severity=obs.severity,
            estimated_area_ratio=obs.area_ratio,
            confidence=obs.confidence,
            status="provisional",
            observation_count=1,
            independent_device_count=1,
            first_observed_at=now,
            last_observed_at=now,
            road_type="Urban Corridor"
        )
        db.add(new_hazard)
        db.flush() # assign new_hazard.id

        obs.hazard_id = new_hazard.id
        db.commit()
        db.refresh(new_hazard)
        return new_hazard
