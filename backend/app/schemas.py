from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class BoundingBox(BaseModel):
    x: float = Field(..., description="Normalized top-left X coordinate [0.0 - 1.0]")
    y: float = Field(..., description="Normalized top-left Y coordinate [0.0 - 1.0]")
    w: float = Field(..., description="Normalized width [0.0 - 1.0]")
    h: float = Field(..., description="Normalized height [0.0 - 1.0]")

class ObservationCreate(BaseModel):
    device_id: str = Field(..., description="Pseudonymous client or vehicle identifier")
    latitude: Optional[float] = Field(None, description="GPS latitude in decimal degrees")
    longitude: Optional[float] = Field(None, description="GPS longitude in decimal degrees")
    travel_direction: Optional[float] = Field(None, ge=0.0, le=360.0, description="Compass heading 0-360")
    speed_kmh: Optional[float] = Field(None, ge=0.0, description="Vehicle speed in km/h")
    timestamp: Optional[datetime] = None
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model detection confidence")
    severity: str = Field(..., description="Estimated severity: low, medium, high, critical")
    bbox: Optional[BoundingBox] = None
    area_ratio: float = Field(..., ge=0.0, le=1.0, description="Visual area ratio of pothole relative to frame")
    source_type: str = Field(default="dashcam", description="Source: dashcam, live_stream, upload, simulated")
    image_path: Optional[str] = None
    raw_metadata: Optional[str] = None

class ObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    hazard_id: Optional[str] = None
    device_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    travel_direction: Optional[float] = None
    speed_kmh: Optional[float] = None
    timestamp: Optional[datetime] = None
    confidence: float
    severity: str
    bbox_x: float = 0.0
    bbox_y: float = 0.0
    bbox_w: float = 0.0
    bbox_h: float = 0.0
    area_ratio: float
    source_type: str
    image_path: Optional[str] = None
    is_flagged_suspicious: bool = False

class RoadHazardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    latitude: float
    longitude: float
    severity: str
    estimated_area_ratio: float
    confidence: float
    status: str
    observation_count: int
    independent_device_count: int
    first_observed_at: Optional[datetime] = None
    last_observed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    address_label: Optional[str] = None
    road_type: Optional[str] = None
    feedback_clear_count: int = 0
    feedback_confirm_count: int = 0

class HazardFeedbackCreate(BaseModel):
    action: str = Field(..., description="'confirm' (hazard still exists) or 'clear' (road repaired)")
    device_id: Optional[str] = "driver-app-feedback"
    notes: Optional[str] = None

class VisionBox(BaseModel):
    x: float
    y: float
    w: float
    h: float
    confidence: float
    severity: str
    area_ratio: float
    label: str = "pothole"

class VisionInferenceResponse(BaseModel):
    detections: List[VisionBox]
    annotated_image_base64: Optional[str] = None
    inference_time_ms: float
    model_used: str
    is_demo_mode: bool
    total_potholes_found: int
    highest_severity: str

class TelemetryInput(BaseModel):
    device_id: str = "veh-adas-sim-01"
    latitude: float
    longitude: float
    heading: float = Field(..., ge=0.0, le=360.0, description="Vehicle heading in degrees 0-360")
    speed_kmh: float = Field(default=45.0, ge=0.0)

class ADASWarningResponse(BaseModel):
    has_warning: bool
    alert_level: str # NONE, CAUTION, WARNING, CRITICAL
    message: str
    hazard_id: Optional[str] = None
    distance_meters: Optional[float] = None
    bearing_degrees: Optional[float] = None
    relative_angle_degrees: Optional[float] = None
    hazard_severity: Optional[str] = None
    hazard_status: Optional[str] = None
    recommended_action: Optional[str] = None

class AnalyticsSummaryResponse(BaseModel):
    total_hazards: int
    verified_hazards: int
    provisional_hazards: int
    resolved_hazards: int
    high_and_critical_hazards: int
    total_observations: int
    observations_today: int
    severity_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]
    verification_rate_percent: float

class SettingsUpdate(BaseModel):
    cluster_radius_meters: Optional[float] = None
    verification_min_observations: Optional[int] = None
    verification_min_devices: Optional[int] = None
    adas_warning_distance_meters: Optional[float] = None
    adas_warning_cone_degrees: Optional[float] = None
    confidence_threshold: Optional[float] = None

class SettingsResponse(BaseModel):
    cluster_radius_meters: float
    verification_min_observations: int
    verification_min_devices: int
    adas_warning_distance_meters: float
    adas_warning_cone_degrees: float
    confidence_threshold: float
    model_weights_path: str
    use_demo_vision_fallback: bool
