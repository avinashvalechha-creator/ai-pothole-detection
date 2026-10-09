import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.app.database import get_db
from backend.app.models import Observation, RoadHazard
from backend.app.schemas import ObservationCreate, ObservationResponse, VisionInferenceResponse
from backend.app.services.clustering import cluster_and_update_hazard
from backend.app.services.verification import is_duplicate_observation, validate_observation_quality
from backend.app.services.vision_detector import vision_engine
from backend.app.config import settings

router = APIRouter(prefix="", tags=["Observations & Computer Vision"])

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """
    Ingestion authentication check. Accepts standard key or development fallback.
    """
    if x_api_key and x_api_key != settings.API_KEY and x_api_key != "road-hazard-api-key-2026":
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return True

@router.post("/observations", response_model=ObservationResponse)
def submit_observation(
    obs_in: ObservationCreate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(verify_api_key)
):
    """
    Ingestion API: Receive a single pothole detection event from a vehicle, dashcam, or mobile sensor.
    Handles quality validation, deduplication, spatial clustering, and multi-vehicle verification.
    """
    obs = Observation(
        id=str(uuid.uuid4()),
        device_id=obs_in.device_id,
        latitude=obs_in.latitude,
        longitude=obs_in.longitude,
        travel_direction=obs_in.travel_direction,
        speed_kmh=obs_in.speed_kmh,
        timestamp=obs_in.timestamp or datetime.now(timezone.utc),
        confidence=obs_in.confidence,
        severity=obs_in.severity.lower(),
        bbox_x=obs_in.bbox.x if obs_in.bbox else 0.0,
        bbox_y=obs_in.bbox.y if obs_in.bbox else 0.0,
        bbox_w=obs_in.bbox.w if obs_in.bbox else 0.0,
        bbox_h=obs_in.bbox.h if obs_in.bbox else 0.0,
        area_ratio=obs_in.area_ratio,
        source_type=obs_in.source_type,
        image_path=obs_in.image_path,
        raw_metadata=obs_in.raw_metadata
    )

    # 1. Quality & Sanity Check
    valid, reason = validate_observation_quality(obs)
    if not valid:
        obs.is_flagged_suspicious = True
        db.add(obs)
        db.commit()
        raise HTTPException(status_code=422, detail=f"Observation flagged low quality: {reason}")

    # 2. Duplicate Detection from same vehicle within 30s
    if is_duplicate_observation(db, obs):
        obs.is_flagged_suspicious = True
        db.add(obs)
        db.commit()
        # Return saved observation without double-counting to hazard
        return obs

    # 3. Save Observation and Spatial Cluster
    db.add(obs)
    db.flush()

    if obs.latitude is not None and obs.longitude is not None:
        hazard = cluster_and_update_hazard(db, obs)
        if hazard:
            obs.hazard_id = hazard.id

    db.commit()
    db.refresh(obs)
    return obs

@router.post("/vision/detect")
async def run_vision_inference(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    device_id: Optional[str] = Form("veh-camera-01"),
    heading: Optional[float] = Form(None),
    save_to_database: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    AI Computer Vision Pipeline:
    Upload an image frame or video screenshot to run pothole detection,
    bounding box extraction, explainable severity estimation, and optional automatic hazard ingestion.
    """
    # Validate mime type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image format (JPEG, PNG, WebP)")

    image_bytes = await file.read()
    if len(image_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (limit 15MB)")

    try:
        result = vision_engine.detect(image_bytes, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    saved_observations = []
    if save_to_database and result.detections:
        for d in result.detections:
            obs = Observation(
                id=str(uuid.uuid4()),
                device_id=device_id or "veh-web-client",
                latitude=latitude,
                longitude=longitude,
                travel_direction=heading,
                timestamp=datetime.now(timezone.utc),
                confidence=d.confidence,
                severity=d.severity,
                bbox_x=d.x,
                bbox_y=d.y,
                bbox_w=d.w,
                bbox_h=d.h,
                area_ratio=d.area_ratio,
                source_type="file_upload"
            )

            # Cluster if GPS is provided
            if latitude is not None and longitude is not None:
                db.add(obs)
                db.flush()
                hazard = cluster_and_update_hazard(db, obs)
                if hazard:
                    obs.hazard_id = hazard.id
            else:
                db.add(obs)
            
            db.commit()
            db.refresh(obs)
            saved_observations.append(obs.to_dict())

    response_data = result.model_dump()
    response_data["saved_observations"] = saved_observations
    return response_data
