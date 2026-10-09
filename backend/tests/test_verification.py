import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models import RoadHazard, Observation
from backend.app.services.verification import (
    is_duplicate_observation,
    validate_observation_quality,
    apply_driver_feedback
)

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    yield session
    session.close()

def test_duplicate_rejection_from_same_device(db):
    obs1 = Observation(
        id="obs-dev1-first",
        device_id="veh-tesla-01",
        latitude=28.5355,
        longitude=77.3910,
        timestamp=datetime.now(timezone.utc),
        confidence=0.88,
        severity="medium",
        area_ratio=0.03
    )
    db.add(obs1)
    db.commit()

    # Second observation 2 seconds later at nearly identical location from SAME vehicle
    obs2 = Observation(
        id="obs-dev1-repeat",
        device_id="veh-tesla-01",
        latitude=28.53551,
        longitude=77.39101,
        timestamp=datetime.now(timezone.utc),
        confidence=0.87,
        severity="medium",
        area_ratio=0.03
    )
    assert is_duplicate_observation(db, obs2, time_window_seconds=30) is True

    # Observation from DIFFERENT vehicle at same location is NOT a duplicate (it is an independent confirmation!)
    obs3 = Observation(
        id="obs-dev2-independent",
        device_id="veh-honda-02",
        latitude=28.53551,
        longitude=77.39101,
        timestamp=datetime.now(timezone.utc),
        confidence=0.89,
        severity="medium",
        area_ratio=0.03
    )
    assert is_duplicate_observation(db, obs3, time_window_seconds=30) is False

def test_observation_quality_validation():
    # Valid observation
    valid_obs = Observation(
        confidence=0.75,
        latitude=28.5,
        longitude=77.4,
        area_ratio=0.05
    )
    ok, err = validate_observation_quality(valid_obs)
    assert ok is True
    assert err is None

    # Low confidence
    low_conf_obs = Observation(
        confidence=0.20,
        latitude=28.5,
        longitude=77.4,
        area_ratio=0.05
    )
    ok, err = validate_observation_quality(low_conf_obs)
    assert ok is False

    # Out of bounds lat
    bad_lat_obs = Observation(
        confidence=0.80,
        latitude=150.0,
        longitude=77.4,
        area_ratio=0.05
    )
    ok, err = validate_observation_quality(bad_lat_obs)
    assert ok is False

def test_driver_feedback_resolution(db):
    hazard = RoadHazard(
        id="haz-test-resolve",
        latitude=28.5,
        longitude=77.4,
        severity="medium",
        status="verified",
        feedback_clear_count=0
    )
    db.add(hazard)
    db.commit()

    # Driver 1 reports clear
    apply_driver_feedback(db, hazard.id, "clear")
    assert hazard.status == "verified"
    assert hazard.feedback_clear_count == 1

    # Driver 2 also reports clear -> resolves hazard!
    apply_driver_feedback(db, hazard.id, "clear")
    assert hazard.status == "resolved"
    assert hazard.feedback_clear_count == 2
