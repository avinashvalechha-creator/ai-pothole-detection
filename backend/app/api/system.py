import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import RoadHazard, Observation
from backend.app.schemas import SettingsResponse, SettingsUpdate
from backend.app.services.vision_detector import vision_engine

router = APIRouter(prefix="/system", tags=["System & Settings"])

@router.get("/health")
def get_system_health(db: Session = Depends(get_db)):
    """
    System Health Monitoring endpoint.
    Verifies database connectivity, ML inference engine availability, and service timestamps.
    """
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "online" if db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": "connected" if db_ok else "disconnected",
            "type": "SQLite / Spatial Index"
        },
        "vision_engine": {
            "status": "ready",
            "model_type": "Ultralytics YOLOv8" if vision_engine.is_custom_yolo else "EdgeCV Hybrid Adaptive Engine",
            "weights_loaded": vision_engine.is_custom_yolo,
            "weights_path": settings.MODEL_WEIGHTS_PATH,
        },
        "version": "1.0.0",
        "environment": "development/college-prototype"
    }

@router.get("/settings", response_model=SettingsResponse)
def get_settings():
    return SettingsResponse(
        cluster_radius_meters=settings.CLUSTER_RADIUS_METERS,
        verification_min_observations=settings.VERIFICATION_MIN_OBSERVATIONS,
        verification_min_devices=settings.VERIFICATION_MIN_DEVICES,
        adas_warning_distance_meters=settings.ADAS_WARNING_DISTANCE_METERS,
        adas_warning_cone_degrees=settings.ADAS_WARNING_CONE_DEGREES,
        confidence_threshold=settings.CONFIDENCE_THRESHOLD,
        model_weights_path=settings.MODEL_WEIGHTS_PATH,
        use_demo_vision_fallback=settings.USE_DEMO_VISION_FALLBACK
    )

@router.put("/settings", response_model=SettingsResponse)
def update_settings(update: SettingsUpdate):
    if update.cluster_radius_meters is not None:
        settings.CLUSTER_RADIUS_METERS = update.cluster_radius_meters
    if update.verification_min_observations is not None:
        settings.VERIFICATION_MIN_OBSERVATIONS = update.verification_min_observations
    if update.verification_min_devices is not None:
        settings.VERIFICATION_MIN_DEVICES = update.verification_min_devices
    if update.adas_warning_distance_meters is not None:
        settings.ADAS_WARNING_DISTANCE_METERS = update.adas_warning_distance_meters
    if update.adas_warning_cone_degrees is not None:
        settings.ADAS_WARNING_CONE_DEGREES = update.adas_warning_cone_degrees
    if update.confidence_threshold is not None:
        settings.CONFIDENCE_THRESHOLD = update.confidence_threshold

    return get_settings()

@router.post("/seed")
def seed_sample_hazards(clear_existing: bool = False, db: Session = Depends(get_db)):
    """
    Demo Data Generator:
    Generates realistic road hazards and multiple independent vehicle observations
    spread across an urban corridor for instant map and ADAS demonstration.
    """
    if clear_existing:
        db.query(Observation).delete()
        db.query(RoadHazard).delete()
        db.commit()

    # Base coordinates (Urban Delhi NCR corridor near highway/arterial road)
    base_lat = 28.5385
    base_lon = 77.3940

    sample_hazards_data = [
        # Verified severe hazard right along the ADAS test track
        {
            "lat": 28.5388, "lon": 77.3944, "sev": "critical", "area": 0.112, "conf": 0.94,
            "status": "verified", "obs_count": 5, "dev_count": 4, "road": "Outer Ring Arterial (Lane 2)"
        },
        {
            "lat": 28.5372, "lon": 77.3928, "sev": "high", "area": 0.065, "conf": 0.88,
            "status": "verified", "obs_count": 3, "dev_count": 3, "road": "Sector 62 Expressway Entry"
        },
        {
            "lat": 28.5358, "lon": 77.3912, "sev": "medium", "area": 0.032, "conf": 0.79,
            "status": "provisional", "obs_count": 1, "dev_count": 1, "road": "Metro Service Lane"
        },
        {
            "lat": 28.5412, "lon": 77.3975, "sev": "low", "area": 0.014, "conf": 0.71,
            "status": "provisional", "obs_count": 2, "dev_count": 1, "road": "Institutional Boulevard"
        },
        {
            "lat": 28.5425, "lon": 77.3990, "sev": "high", "area": 0.078, "conf": 0.91,
            "status": "verified", "obs_count": 4, "dev_count": 3, "road": "Tech Park Underpass"
        },
        {
            "lat": 28.5340, "lon": 77.3890, "sev": "critical", "area": 0.125, "conf": 0.95,
            "status": "verified", "obs_count": 6, "dev_count": 5, "road": "Industrial Feeder Road"
        },
        {
            "lat": 28.5440, "lon": 77.4010, "sev": "medium", "area": 0.038, "conf": 0.82,
            "status": "resolved", "obs_count": 3, "dev_count": 2, "road": "Commercial Circle (Repaired)"
        },
        {
            "lat": 28.5365, "lon": 77.3955, "sev": "high", "area": 0.054, "conf": 0.85,
            "status": "provisional", "obs_count": 1, "dev_count": 1, "road": "Outer Cross Road"
        }
    ]

    now = datetime.now(timezone.utc)
    created_hazards = []

    for item in sample_hazards_data:
        h_id = str(uuid.uuid4())
        hazard = RoadHazard(
            id=h_id,
            latitude=item["lat"],
            longitude=item["lon"],
            severity=item["sev"],
            estimated_area_ratio=item["area"],
            confidence=item["conf"],
            status=item["status"],
            observation_count=item["obs_count"],
            independent_device_count=item["dev_count"],
            first_observed_at=now - timedelta(hours=random.randint(12, 72)),
            last_observed_at=now - timedelta(minutes=random.randint(5, 180)),
            verified_at=now - timedelta(hours=random.randint(2, 24)) if item["status"] == "verified" else None,
            resolved_at=now - timedelta(hours=2) if item["status"] == "resolved" else None,
            road_type=item["road"],
            address_label=item["road"],
            feedback_confirm_count=item["obs_count"] if item["status"] == "verified" else 1,
            feedback_clear_count=3 if item["status"] == "resolved" else 0
        )
        db.add(hazard)

        # Generate observations for this hazard
        for i in range(item["obs_count"]):
            dev_id = f"veh-fleet-{100 + i}" if i < item["dev_count"] else "veh-fleet-100"
            obs = Observation(
                id=str(uuid.uuid4()),
                hazard_id=h_id,
                device_id=dev_id,
                latitude=item["lat"] + random.uniform(-0.00008, 0.00008),
                longitude=item["lon"] + random.uniform(-0.00008, 0.00008),
                travel_direction=round(random.uniform(40.0, 60.0), 1),
                speed_kmh=round(random.uniform(35.0, 55.0), 1),
                timestamp=now - timedelta(minutes=random.randint(10, 500)),
                confidence=round(item["conf"] + random.uniform(-0.05, 0.03), 3),
                severity=item["sev"],
                bbox_x=0.35 + random.uniform(-0.05, 0.05),
                bbox_y=0.55 + random.uniform(-0.05, 0.05),
                bbox_w=0.25,
                bbox_h=0.18,
                area_ratio=item["area"],
                source_type="dashcam" if i % 2 == 0 else "mobile_app"
            )
            db.add(obs)

        created_hazards.append(h_id)

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully seeded {len(created_hazards)} sample road hazards with multi-vehicle observations.",
        "hazard_ids": created_hazards
    }
