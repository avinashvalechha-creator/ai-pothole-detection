import {
  RoadHazard,
  Observation,
  VisionInferenceResult,
  Telemetry,
  ADASWarning,
  AnalyticsSummary,
  SystemHealth,
  SystemSettings,
  SeverityLevel,
  HazardStatus
} from './types';

const API_BASE = '/api/v1';

export const api = {
  // System & Health
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/system/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/system/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/system/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async seedData(clearExisting: boolean = false): Promise<{ message: string; hazard_ids: string[] }> {
    const res = await fetch(`${API_BASE}/system/seed?clear_existing=${clearExisting}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to seed sample data');
    return res.json();
  },

  // Road Hazards
  async getHazards(params?: {
    bbox?: string;
    severity?: SeverityLevel;
    status?: HazardStatus;
    limit?: number;
    offset?: number;
  }): Promise<RoadHazard[]> {
    const query = new URLSearchParams();
    if (params?.bbox) query.append('bbox', params.bbox);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE}/hazards?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch hazards');
    return res.json();
  },

  async getNearbyHazards(lat: number, lon: number, radiusM: number = 1500): Promise<RoadHazard[]> {
    const res = await fetch(`${API_BASE}/hazards/nearby?lat=${lat}&lon=${lon}&radius_m=${radiusM}`);
    if (!res.ok) throw new Error('Failed to fetch nearby hazards');
    return res.json();
  },

  async getHazardDetails(id: string): Promise<RoadHazard> {
    const res = await fetch(`${API_BASE}/hazards/${id}`);
    if (!res.ok) throw new Error('Failed to fetch hazard details');
    return res.json();
  },

  async submitFeedback(id: string, action: 'confirm' | 'clear'): Promise<{ message: string; hazard_status: string }> {
    const res = await fetch(`${API_BASE}/hazards/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, device_id: 'driver-dashboard' }),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  },

  // Computer Vision & Ingestion
  async runVisionInference(formData: FormData): Promise<VisionInferenceResult> {
    const res = await fetch(`${API_BASE}/vision/detect`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Vision inference failed');
    return res.json();
  },

  async submitObservation(payload: any): Promise<Observation> {
    const res = await fetch(`${API_BASE}/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'road-hazard-api-key-2026',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit observation');
    return res.json();
  },

  // Connected Vehicle ADAS Simulation
  async evaluateTelemetry(telemetry: Telemetry): Promise<ADASWarning> {
    const res = await fetch(`${API_BASE}/simulator/evaluate-threat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry),
    });
    if (!res.ok) throw new Error('Failed to evaluate telemetry');
    return res.json();
  },

  async getSampleRoute(): Promise<{ route_id: string; description: string; waypoints: any[] }> {
    const res = await fetch(`${API_BASE}/simulator/route`);
    if (!res.ok) throw new Error('Failed to fetch sample route');
    return res.json();
  },

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const res = await fetch(`${API_BASE}/analytics/summary`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/analytics/export`;
  },
};
