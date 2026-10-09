import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_system_health():
    response = client.get("/api/v1/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"]["status"] == "connected"

def test_system_seed_and_hazards():
    # Seed sample road hazards
    seed_resp = client.post("/api/v1/system/seed?clear_existing=true")
    assert seed_resp.status_code == 200
    assert seed_resp.json()["status"] == "success"

    # Query all hazards
    hazards_resp = client.get("/api/v1/hazards")
    assert hazards_resp.status_code == 200
    hazards = hazards_resp.json()
    assert len(hazards) > 0

    # Query nearby
    nearby_resp = client.get("/api/v1/hazards/nearby?lat=28.5385&lon=77.3940&radius_m=1000")
    assert nearby_resp.status_code == 200
    nearby = nearby_resp.json()
    assert len(nearby) > 0
    assert "distance_meters" in nearby[0]

def test_observation_ingestion_api():
    payload = {
        "device_id": "veh-fleet-integration-test",
        "latitude": 28.5390,
        "longitude": 77.3945,
        "travel_direction": 48.0,
        "speed_kmh": 42.0,
        "confidence": 0.88,
        "severity": "high",
        "bbox": {"x": 0.3, "y": 0.6, "w": 0.2, "h": 0.15},
        "area_ratio": 0.05,
        "source_type": "dashcam"
    }
    resp = client.post("/api/v1/observations", json=payload, headers={"X-API-Key": "road-hazard-api-key-2026"})
    assert resp.status_code == 200
    obs = resp.json()
    assert obs["device_id"] == "veh-fleet-integration-test"
    assert obs["hazard_id"] is not None

def test_simulator_telemetry_evaluation():
    payload = {
        "device_id": "veh-adas-unit-tester",
        "latitude": 28.5380,
        "longitude": 77.3936,
        "heading": 50.0,
        "speed_kmh": 45.0
    }
    resp = client.post("/api/v1/simulator/evaluate-threat", json=payload)
    assert resp.status_code == 200
    res = resp.json()
    assert "has_warning" in res
    assert "alert_level" in res

def test_analytics_summary_and_export():
    summary_resp = client.get("/api/v1/analytics/summary")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert "total_hazards" in summary
    assert "verification_rate_percent" in summary

    export_resp = client.get("/api/v1/analytics/export")
    assert export_resp.status_code == 200
    assert "Hazard ID" in export_resp.text
