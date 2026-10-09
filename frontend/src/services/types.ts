export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type HazardStatus = 'provisional' | 'verified' | 'resolved' | 'expired';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Observation {
  id: string;
  hazard_id?: string;
  device_id: string;
  latitude?: number;
  longitude?: number;
  travel_direction?: number;
  speed_kmh?: number;
  timestamp: string;
  confidence: number;
  severity: SeverityLevel;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  area_ratio: number;
  source_type: string;
  image_path?: string;
  is_flagged_suspicious: boolean;
}

export interface RoadHazard {
  id: string;
  latitude: number;
  longitude: number;
  severity: SeverityLevel;
  estimated_area_ratio: number;
  confidence: number;
  status: HazardStatus;
  observation_count: number;
  independent_device_count: number;
  first_observed_at?: string;
  last_observed_at?: string;
  verified_at?: string;
  resolved_at?: string;
  address_label?: string;
  road_type?: string;
  feedback_clear_count: number;
  feedback_confirm_count: number;
  distance_meters?: number;
  observations?: Observation[];
}

export interface VisionDetection {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  severity: SeverityLevel;
  area_ratio: number;
  label: string;
}

export interface VisionInferenceResult {
  detections: VisionDetection[];
  annotated_image_base64?: string;
  inference_time_ms: number;
  model_used: string;
  is_demo_mode: boolean;
  total_potholes_found: number;
  highest_severity: SeverityLevel | 'none';
  saved_observations?: Observation[];
}

export interface Telemetry {
  device_id: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed_kmh: number;
}

export interface ADASWarning {
  has_warning: boolean;
  alert_level: 'NONE' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  message: string;
  hazard_id?: string;
  distance_meters?: number;
  bearing_degrees?: number;
  relative_angle_degrees?: number;
  hazard_severity?: SeverityLevel;
  hazard_status?: HazardStatus;
  recommended_action?: string;
}

export interface AnalyticsSummary {
  total_hazards: number;
  verified_hazards: number;
  provisional_hazards: number;
  resolved_hazards: number;
  high_and_critical_hazards: number;
  total_observations: number;
  observations_today: number;
  severity_breakdown: Record<SeverityLevel, number>;
  status_breakdown: Record<HazardStatus, number>;
  verification_rate_percent: number;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  database: {
    status: string;
    type: string;
  };
  vision_engine: {
    status: string;
    model_type: string;
    weights_loaded: boolean;
    weights_path: string;
  };
  version: string;
  environment: string;
}

export interface SystemSettings {
  cluster_radius_meters: number;
  verification_min_observations: number;
  verification_min_devices: number;
  adas_warning_distance_meters: number;
  adas_warning_cone_degrees: number;
  confidence_threshold: number;
  model_weights_path: string;
  use_demo_vision_fallback: boolean;
}
