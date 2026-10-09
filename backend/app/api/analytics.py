import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import RoadHazard, Observation
from backend.app.schemas import AnalyticsSummaryResponse

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Analytics KPI summary endpoint for dashboard metrics.
    """
    total_hazards = db.query(RoadHazard).count()
    verified_hazards = db.query(RoadHazard).filter(RoadHazard.status == "verified").count()
    provisional_hazards = db.query(RoadHazard).filter(RoadHazard.status == "provisional").count()
    resolved_hazards = db.query(RoadHazard).filter(RoadHazard.status == "resolved").count()
    high_critical = db.query(RoadHazard).filter(RoadHazard.severity.in_(["high", "critical"])).count()

    total_observations = db.query(Observation).count()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    observations_today = db.query(Observation).filter(Observation.timestamp >= today_start).count()

    # Severity distribution
    sev_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for row in db.query(RoadHazard.severity, func.count(RoadHazard.id)).group_by(RoadHazard.severity).all():
        if row[0] in sev_counts:
            sev_counts[row[0]] = row[1]

    # Status distribution
    status_counts = {"provisional": 0, "verified": 0, "resolved": 0, "expired": 0}
    for row in db.query(RoadHazard.status, func.count(RoadHazard.id)).group_by(RoadHazard.status).all():
        if row[0] in status_counts:
            status_counts[row[0]] = row[1]

    denom = verified_hazards + provisional_hazards
    verification_rate = round((verified_hazards / denom * 100.0) if denom > 0 else 0.0, 1)

    return AnalyticsSummaryResponse(
        total_hazards=total_hazards,
        verified_hazards=verified_hazards,
        provisional_hazards=provisional_hazards,
        resolved_hazards=resolved_hazards,
        high_and_critical_hazards=high_critical,
        total_observations=total_observations,
        observations_today=observations_today,
        severity_breakdown=sev_counts,
        status_breakdown=status_counts,
        verification_rate_percent=verification_rate
    )

@router.get("/export")
def export_hazards_csv(db: Session = Depends(get_db)):
    """
    Export current road hazard database to CSV format.
    """
    hazards = db.query(RoadHazard).order_by(RoadHazard.last_observed_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Hazard ID", "Latitude", "Longitude", "Severity", "Status",
        "Confidence", "Area Ratio", "Observation Count", "Independent Devices",
        "First Observed", "Last Observed", "Road Type"
    ])

    for h in hazards:
        writer.writerow([
            h.id, h.latitude, h.longitude, h.severity, h.status,
            f"{h.confidence:.2f}", f"{h.estimated_area_ratio:.4f}",
            h.observation_count, h.independent_device_count,
            h.first_observed_at.isoformat() if h.first_observed_at else "",
            h.last_observed_at.isoformat() if h.last_observed_at else "",
            h.road_type or "City Road"
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=road_hazards_export.csv"}
    )
