from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.app.database import get_db
from backend.app.schemas import TelemetryInput, ADASWarningResponse
from backend.app.services.adas_warning import compute_adas_warning

router = APIRouter(prefix="/simulator", tags=["ADAS & Connected Vehicle Simulator"])

# Sample realistic ADAS drive corridor (Default demo coordinates around city roads)
DEFAULT_ROUTE_WAYPOINTS = [
    {"lat": 28.5355, "lon": 77.3910, "heading": 45.0, "speed_kmh": 50.0, "label": "Start - Outer Ring Corridor"},
    {"lat": 28.5362, "lon": 77.3918, "heading": 45.0, "speed_kmh": 52.0, "label": "Waypoint 2 - Approaching Junction"},
    {"lat": 28.5370, "lon": 77.3926, "heading": 50.0, "speed_kmh": 48.0, "label": "Waypoint 3 - Pre-hazard Zone (120m)"},
    {"lat": 28.5378, "lon": 77.3934, "heading": 50.0, "speed_kmh": 40.0, "label": "Waypoint 4 - Warning Range (60m)"},
    {"lat": 28.5385, "lon": 77.3941, "heading": 50.0, "speed_kmh": 32.0, "label": "Waypoint 5 - Critical Proximity (20m)"},
    {"lat": 28.5393, "lon": 77.3950, "heading": 55.0, "speed_kmh": 35.0, "label": "Waypoint 6 - Post-hazard Clearance"},
    {"lat": 28.5401, "lon": 77.3960, "heading": 60.0, "speed_kmh": 50.0, "label": "Waypoint 7 - Clean Road Sector"},
    {"lat": 28.5410, "lon": 77.3972, "heading": 65.0, "speed_kmh": 55.0, "label": "Waypoint 8 - Terminal Sector"}
]

@router.post("/evaluate-threat", response_model=ADASWarningResponse)
def evaluate_threat(telemetry: TelemetryInput, db: Session = Depends(get_db)):
    """
    Connected Vehicle ADAS Telemetry Ingestion:
    Receives instantaneous vehicle GPS, compass heading, and velocity.
    Calculates directional upcoming hazard distance, bearing cone, and issues HUD alerts.
    """
    return compute_adas_warning(db, telemetry)

@router.get("/route")
def get_sample_route():
    """
    Returns pre-configured demonstration vehicle telemetry trajectory
    for testing ADAS warnings without requiring live vehicle driving.
    """
    return {
        "route_id": "route-city-corridor-alpha",
        "description": "Urban Arterial road passing through verified road hazards",
        "waypoints": DEFAULT_ROUTE_WAYPOINTS
    }
