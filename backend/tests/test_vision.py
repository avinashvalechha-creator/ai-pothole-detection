import pytest
import cv2
import numpy as np
from backend.app.services.vision_detector import vision_engine
from backend.app.schemas import TelemetryInput
from backend.app.services.adas_warning import compute_adas_warning
from backend.app.models import RoadHazard
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base

def test_explainable_severity_estimation():
    # Low area
    assert vision_engine.estimate_severity(0.010) == "low"
    # Medium area
    assert vision_engine.estimate_severity(0.030) == "medium"
    # High area
    assert vision_engine.estimate_severity(0.065) == "high"
    # Critical area
    assert vision_engine.estimate_severity(0.120) == "critical"

def test_vision_pipeline_synthetic_frame():
    # Generate a synthetic road image with a dark elliptical pothole depression
    img = np.full((480, 640, 3), 140, dtype=np.uint8) # Asphalt gray
    # Draw dark cavity in lower half of image (road surface)
    cv2.ellipse(img, (320, 360), (70, 35), 0, 0, 360, (30, 30, 30), -1)

    _, encoded = cv2.imencode('.jpg', img)
    result = vision_engine.detect(encoded.tobytes(), "test_frame.jpg")

    assert result is not None
    assert result.inference_time_ms > 0.0
    assert result.annotated_image_base64.startswith("data:image/jpeg;base64,")
    # Verify detections found the dark cavity
    assert result.total_potholes_found >= 1
    assert result.detections[0].severity in ["medium", "high", "critical", "low"]

def test_adas_threat_cone_warning():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()

    # Hazard placed at (28.5360, 77.3915)
    hazard = RoadHazard(
        id="haz-corridor-1",
        latitude=28.5360,
        longitude=77.3915,
        severity="critical",
        status="verified"
    )
    session.add(hazard)
    session.commit()

    # Vehicle driving towards the hazard (heading 45 deg, approaching from south-west)
    # Distance approx 65m
    telemetry = TelemetryInput(
        device_id="veh-test",
        latitude=28.5356,
        longitude=77.3911,
        heading=45.0, # Directly pointed towards the hazard!
        speed_kmh=45.0
    )

    alert = compute_adas_warning(session, telemetry)
    assert alert.has_warning is True
    assert alert.alert_level in ["CRITICAL", "WARNING"]
    assert alert.distance_meters is not None
    assert alert.distance_meters <= 100.0

    # Vehicle driving AWAY from the hazard (heading 225 deg, reverse direction)
    telemetry_away = TelemetryInput(
        device_id="veh-test",
        latitude=28.5356,
        longitude=77.3911,
        heading=225.0, # Heading away from hazard
        speed_kmh=45.0
    )

    alert_away = compute_adas_warning(session, telemetry_away)
    assert alert_away.has_warning is False
    assert alert_away.alert_level == "NONE"

    session.close()
