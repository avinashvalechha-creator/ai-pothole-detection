import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Radio, 
  TrendingUp, 
  Car, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { HazardMap } from '../components/HazardMap';
import { RoadHazard, AnalyticsSummary, SystemHealth } from '../services/types';
import { api } from '../services/api';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
  onSelectHazard: (h: RoadHazard) => void;
  hazards: RoadHazard[];
  health: SystemHealth | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onSelectHazard,
  hazards,
  health,
}) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary).catch(console.error);
  }, [hazards]);

  return (
    <div className="space-y-6">
      {/* Welcome / Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>SHARED ROAD HAZARD INTELLIGENCE NETWORK</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">ADAS Pothole Mitigation Center</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time computer vision inference, spatial deduplication, crowdsourced vehicle verification, and forward threat alerting for next-generation vehicle safety systems.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('detect')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/25 transition"
          >
            <span>Launch Live Detector</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <span>Run ADAS Simulator</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Potholes"
          value={summary?.total_hazards || hazards.length}
          subtext="Unique road defect clusters"
          icon={Activity}
          badge="Network Total"
          badgeColor="blue"
        />
        <MetricCard
          title="Verified Hazards"
          value={summary?.verified_hazards || hazards.filter(h => h.status === 'verified').length}
          subtext="Confirmed by ≥2 vehicles"
          icon={CheckCircle2}
          badge={`${summary?.verification_rate_percent || 0}% rate`}
          badgeColor="green"
        />
        <MetricCard
          title="Severe Threats"
          value={summary?.high_and_critical_hazards || hazards.filter(h => h.severity === 'critical' || h.severity === 'high').length}
          subtext="Critical & High danger craters"
          icon={Flame}
          badge="Urgent Action"
          badgeColor="red"
        />
        <MetricCard
          title="Observations Today"
          value={summary?.observations_today || summary?.total_observations || 0}
          subtext="Vehicle dashcam sightings"
          icon={Car}
          badge="Live Feed"
          badgeColor="purple"
        />
        <MetricCard
          title="System Health"
          value={health?.status === 'online' ? '100% OK' : 'Degraded'}
          subtext={health ? `${health.vision_engine.model_type}` : 'Connecting...'}
          icon={Radio}
          badge="Backend Online"
          badgeColor="green"
        />
      </div>

      {/* Main Grid: Live Map Overview & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Active Road Hazard Map</h2>
            </div>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
            >
              <span>Full Screen Map</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-[420px] w-full rounded-xl overflow-hidden">
            <HazardMap
              hazards={hazards}
              onSelectHazard={onSelectHazard}
            />
          </div>
        </div>

        {/* Recent Activity & Verification Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Latest Hazard Feed</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{hazards.length} Registered</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
            {hazards.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">
                No road hazard observations recorded yet. Seed demo data or run live detection.
              </div>
            ) : (
              hazards.slice(0, 7).map((h) => (
                <div
                  key={h.id}
                  onClick={() => onSelectHazard(h)}
                  className="p-3 rounded-xl bg-slate-850 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      h.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      h.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      h.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {h.severity} POTHOLE
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      h.status === 'verified' ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'
                    }`}>
                      {h.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium truncate">
                    {h.address_label || h.road_type || 'Road Sector'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{h.observation_count} obs ({h.independent_device_count} cars)</span>
                    <span>{(h.estimated_area_ratio * 100).toFixed(1)}% area</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
