from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from backend.app.database import get_db
from backend.app.models import RoadHazard, Observation
from backend.app.schemas import RoadHazardResponse, HazardFeedbackCreate
from backend.app.services.clustering import calculate_haversine_distance
from backend.app.services.verification import apply_driver_feedback

router = APIRouter(prefix="/hazards", tags=["Road Hazards"])

@router.get("", response_model=List[RoadHazardResponse])
def get_hazards(
    bbox: Optional[str] = Query(None, description="Bounding box formatted as 'min_lat,min_lon,max_lat,max_lon'"),
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high, critical"),
    status: Optional[str] = Query(None, description="Filter by verification status: provisional, verified, resolved, expired"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Public REST API: Retrieve filtered road hazards with optional spatial bounding box and pagination.
    Suitable for integration by navigation systems, fleet managers, and municipal dashboards.
    """
    query = db.query(RoadHazard)

    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(",")]
            if len(parts) == 4:
                min_lat, min_lon, max_lat, max_lon = parts
                query = query.filter(
                    RoadHazard.latitude.between(min_lat, max_lat),
                    RoadHazard.longitude.between(min_lon, max_lon)
                )
            else:
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid bbox format. Use 'min_lat,min_lon,max_lat,max_lon'")

    if severity:
        query = query.filter(RoadHazard.severity == severity.lower())

    if status:
        query = query.filter(RoadHazard.status == status.lower())

    hazards = query.order_by(RoadHazard.last_observed_at.desc()).offset(offset).limit(limit).all()
    return hazards

@router.get("/nearby")
def get_nearby_hazards(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    radius_m: float = Query(1500.0, ge=10.0, le=50000.0, description="Search radius in meters"),
    db: Session = Depends(get_db)
):
    """
    Public REST API: Query road hazards within a radius of the client's position.
    Calculates exact geodesic distance using Haversine formula.
    """
    lat_delta = radius_m / 111000.0
    lon_delta = radius_m / (111000.0 * max(0.1, math.cos(math.radians(lat))))

    candidates = db.query(RoadHazard).filter(
        RoadHazard.latitude.between(lat - lat_delta, lat + lat_delta),
        RoadHazard.longitude.between(lon - lon_delta, lon + lon_delta),
        RoadHazard.status != "resolved"
    ).all()

    results = []
    for h in candidates:
        dist = calculate_haversine_distance(lat, lon, h.latitude, h.longitude)
        if dist <= radius_m:
            data = h.to_dict()
            data["distance_meters"] = round(dist, 1)
            results.append(data)

    results.sort(key=lambda x: x["distance_meters"])
    return results

@router.get("/{hazard_id}")
def get_hazard_details(hazard_id: str, db: Session = Depends(get_db)):
    """
    Retrieve single road hazard record with detailed historical observations.
    """
    hazard = db.query(RoadHazard).filter(RoadHazard.id == hazard_id).first()
    if not hazard:
        raise HTTPException(status_code=404, detail="Hazard not found")

    observations = db.query(Observation).filter(Observation.hazard_id == hazard_id).order_by(Observation.timestamp.desc()).all()
    res = hazard.to_dict()
    res["observations"] = [o.to_dict() for o in observations]
    return res

@router.post("/{hazard_id}/feedback")
def submit_hazard_feedback(
    hazard_id: str,
    feedback: HazardFeedbackCreate,
    db: Session = Depends(get_db)
):
    """
    Driver feedback API: Confirm presence or report road hazard as cleared/repaired.
    """
    hazard = apply_driver_feedback(db, hazard_id, feedback.action)
    if not hazard:
        raise HTTPException(status_code=404, detail="Hazard not found")

    return {
        "status": "success",
        "message": f"Feedback '{feedback.action}' registered for hazard {hazard_id}",
        "hazard_status": hazard.status,
        "confirm_count": hazard.feedback_confirm_count,
        "clear_count": hazard.feedback_clear_count
    }
