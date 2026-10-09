import math
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.models import RoadHazard
from backend.app.schemas import TelemetryInput, ADASWarningResponse
from backend.app.services.clustering import calculate_haversine_distance, calculate_bearing
from backend.app.config import settings

def calculate_angular_difference(heading1: float, heading2: float) -> float:
    """
    Calculate minimal angular difference between two compass headings in degrees (0 to 180).
    """
    diff = abs(heading1 - heading2) % 360.0
    if diff > 180.0:
        diff = 360.0 - diff
    return diff

def compute_adas_warning(db: Session, telemetry: TelemetryInput) -> ADASWarningResponse:
    """
    Evaluate forward vehicle trajectory against verified & provisional road hazards.
    Triggers directional ADAS alert only if the hazard is within the warning cone
    of the vehicle's travel heading.
    """
    # 150 meters lat/lon delta bounding box query
    max_radius_m = settings.ADAS_WARNING_DISTANCE_METERS
    lat_delta = max_radius_m / 111000.0
    lon_delta = max_radius_m / (111000.0 * max(0.1, math.cos(math.radians(telemetry.latitude))))

    candidate_hazards = db.query(RoadHazard).filter(
        RoadHazard.latitude.between(telemetry.latitude - lat_delta, telemetry.latitude + lat_delta),
        RoadHazard.longitude.between(telemetry.longitude - lon_delta, telemetry.longitude + lon_delta),
        RoadHazard.status.in_(["verified", "provisional"])
    ).all()

    forward_threats = []

    for hazard in candidate_hazards:
        dist = calculate_haversine_distance(
            telemetry.latitude, telemetry.longitude,
            hazard.latitude, hazard.longitude
        )

        if dist <= max_radius_m:
            bearing = calculate_bearing(
                telemetry.latitude, telemetry.longitude,
                hazard.latitude, hazard.longitude
            )
            angle_diff = calculate_angular_difference(telemetry.heading, bearing)

            # Check if hazard falls inside forward detection cone
            if angle_diff <= settings.ADAS_WARNING_CONE_DEGREES:
                forward_threats.append({
                    "hazard": hazard,
                    "distance_m": dist,
                    "bearing": bearing,
                    "angle_diff": angle_diff,
                })

    if not forward_threats:
        return ADASWarningResponse(
            has_warning=False,
            alert_level="NONE",
            message="Road clear. No hazards detected ahead in vehicle travel path.",
            recommended_action="Maintain normal driving and speed limit."
        )

    # Sort primarily by distance, prioritizing critical severity if close
    forward_threats.sort(key=lambda t: t["distance_m"])
    target = forward_threats[0]
    hazard: RoadHazard = target["hazard"]
    dist = target["distance_m"]
    angle = target["angle_diff"]

    severity_upper = hazard.severity.upper()
    is_critical_hazard = hazard.severity in ["critical", "high"]

    if dist <= 40.0 or (dist <= 75.0 and is_critical_hazard):
        level = "CRITICAL"
        action = "EMERGENCY DECELERATION: Apply brakes smoothly, keep 2 hands on steering wheel."
        msg = f"CRITICAL HAZARD: {severity_upper} pothole {dist:.0f}m directly ahead! (Status: {hazard.status.upper()})"
    elif dist <= 90.0:
        level = "WARNING"
        action = "REDUCE SPEED: Prepare for road defect, check rear mirror before lane change."
        msg = f"WARNING: {severity_upper} pothole {dist:.0f}m ahead in forward corridor."
    else:
        level = "CAUTION"
        action = "MAINTAIN CAUTION: Surface degradation reported ahead."
        msg = f"CAUTION: Road hazard ahead at {dist:.0f}m."

    return ADASWarningResponse(
        has_warning=True,
        alert_level=level,
        message=msg,
        hazard_id=hazard.id,
        distance_meters=round(dist, 1),
        bearing_degrees=round(target["bearing"], 1),
        relative_angle_degrees=round(angle, 1),
        hazard_severity=hazard.severity,
        hazard_status=hazard.status,
        recommended_action=action
    )
