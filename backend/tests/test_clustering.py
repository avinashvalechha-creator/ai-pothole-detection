import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models import RoadHazard, Observation
from backend.app.services.clustering import (
    calculate_haversine_distance,
    calculate_bearing,
    cluster_and_update_hazard
)

# In-memory SQLite for fast testing
@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    yield session
    session.close()

def test_haversine_distance_accuracy():
    # Distance between two known coordinates (approx 111.3 km per degree latitude)
    lat1, lon1 = 28.5355, 77.3910
    lat2, lon2 = 28.5355, 77.3910
    assert calculate_haversine_distance(lat1, lon1, lat2, lon2) == 0.0

    # 0.00018 degrees latitude difference ~= 20 meters
    lat3 = lat1 + 0.00018
    dist = calculate_haversine_distance(lat1, lon1, lat3, lon1)
    assert 18.0 <= dist <= 22.0

def test_bearing_calculation():
    # Point directly north
    bearing_north = calculate_bearing(10.0, 10.0, 11.0, 10.0)
    assert 359.0 <= bearing_north <= 360.0 or 0.0 <= bearing_north <= 1.0

    # Point directly east
    bearing_east = calculate_bearing(10.0, 10.0, 10.0, 11.0)
    assert 88.0 <= bearing_east <= 92.0

def test_spatial_clustering_and_verification(db):
    # Obs 1 from Device A
    obs1 = Observation(
        id="obs-1",
        device_id="veh-dev-A",
        latitude=28.53550,
        longitude=77.39100,
        confidence=0.85,
        severity="medium",
        area_ratio=0.035,
        source_type="dashcam"
    )
    db.add(obs1)
    db.commit()

    hazard1 = cluster_and_update_hazard(db, obs1)
    assert hazard1 is not None
    assert hazard1.observation_count == 1
    assert hazard1.independent_device_count == 1
    assert hazard1.status == "provisional"

    # Obs 2 from Device B within 8 meters (cluster match!)
    obs2 = Observation(
        id="obs-2",
        device_id="veh-dev-B",
        latitude=28.53555,
        longitude=77.39104,
        confidence=0.90,
        severity="high",
        area_ratio=0.055,
        source_type="dashcam"
    )
    db.add(obs2)
    db.commit()

    hazard2 = cluster_and_update_hazard(db, obs2)
    assert hazard2.id == hazard1.id
    assert hazard2.observation_count == 2
    assert hazard2.independent_device_count == 2
    assert hazard2.severity == "high" # escalated

    # Obs 3 from Device C within 10 meters (triggers verification!)
    obs3 = Observation(
        id="obs-3",
        device_id="veh-dev-C",
        latitude=28.53552,
        longitude=77.39102,
        confidence=0.92,
        severity="critical",
        area_ratio=0.10,
        source_type="dashcam"
    )
    db.add(obs3)
    db.commit()

    hazard3 = cluster_and_update_hazard(db, obs3)
    assert hazard3.id == hazard1.id
    assert hazard3.observation_count == 3
    assert hazard3.independent_device_count == 3
    assert hazard3.status == "verified" # verified by multi-vehicle agreement!
