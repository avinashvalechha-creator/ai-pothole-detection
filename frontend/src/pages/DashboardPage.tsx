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
  ArrowRight,
  MapPin,
  Compass,
  RefreshCw,
  Cpu,
  Eye,
  Navigation,
  Shield,
  Zap
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { HazardMap } from '../components/HazardMap';
import { HeroLandingSection } from '../components/HeroLandingSection';
import { ScrollReveal } from '../components/ScrollReveal';
import { RoadHazard, AnalyticsSummary, SystemHealth } from '../services/types';
import { api } from '../services/api';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
  onSelectHazard: (h: RoadHazard) => void;
  hazards: RoadHazard[];
  health: SystemHealth | null;
  userLocation?: { lat: number; lon: number; label?: string; isGps?: boolean } | null;
  onSyncLocation?: (lat: number, lon: number, isGps?: boolean) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onSelectHazard,
  hazards,
  health,
  userLocation,
  onSyncLocation,
}) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary).catch(console.error);
  }, [hazards]);

  const handleRequestExactGps = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationMessage('Requesting browser GPS permission...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setLocationMessage(`Locked GPS (±${accuracy ? accuracy.toFixed(1) : '?'}m). Updating hazards...`);
        if (onSyncLocation) {
          onSyncLocation(latitude, longitude, true);
        }
        setTimeout(() => setLocationMessage(null), 5000);
      },
      (err) => {
        setIsLocating(false);
        setLocationMessage(`GPS notice: ${err.message}. Using region coordinates.`);
        setTimeout(() => setLocationMessage(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-12">
      {/* Dynamic Animated Hero Landing Showcase */}
      <HeroLandingSection
        onLaunchDetector={() => onNavigateTab('detect')}
        onExploreMap={() => onNavigateTab('map')}
        onOpenAnalytics={() => onNavigateTab('analytics')}
        totalHazards={summary?.total_hazards || hazards.length}
        verifiedHazards={summary?.verified_hazards || hazards.filter(h => h.status === 'verified').length}
        userLocationLabel={userLocation?.label}
      />

      {/* KPI Metrics Grid with Scroll Animation */}
      <ScrollReveal direction="up" delay={80}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Live Network Metrics
            </h2>
            <span className="text-xs text-cyan-400 font-mono flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Real-time Telemetry</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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
              subtext={health?.status === 'online' ? 'Spatial Index & Vision Active' : 'Connecting...'}
              icon={Radio}
              badge="Backend Online"
              badgeColor="green"
            />
          </div>
        </div>
      </ScrollReveal>

      {/* Main Grid: Live Map Overview & Activity Stream (RawBlock Structural Containers) */}
      <ScrollReveal direction="up" delay={140}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Column */}
          <div className="lg:col-span-2 bg-[#FFFFFF] border-[5px] border-[#000000] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b-[3px] border-[#000000] pb-4 gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-[#000000] inline-block" />
                <h2 className="font-headline text-base uppercase text-[#000000]">
                  HAZARD RADAR MAP
                </h2>
                {userLocation?.label && (
                  <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 border-[2px] border-[#000000] bg-[#F0F0F0] font-bold uppercase truncate max-w-xs">
                    {userLocation.label}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRequestExactGps}
                  disabled={isLocating}
                  className="px-3 py-1.5 bg-[#000000] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#000000] text-xs font-mono font-bold uppercase tracking-[1px] border-[3px] border-[#000000] transition-colors"
                >
                  {isLocating ? 'LOCATING...' : 'SYNC EXACT GPS'}
                </button>
                <button
                  onClick={() => onNavigateTab('map')}
                  className="px-3 py-1.5 bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF] text-xs font-mono font-bold uppercase tracking-[1px] border-[3px] border-[#000000] transition-colors"
                >
                  FULL SCREEN [→]
                </button>
              </div>
            </div>

            {locationMessage && (
              <div className="p-3 bg-[#F0F0F0] border-[3px] border-[#000000] text-[12px] font-mono font-bold uppercase text-[#000000]">
                STATUS // {locationMessage}
              </div>
            )}

            <div className="h-[500px] w-full overflow-hidden">
              <HazardMap
                hazards={hazards}
                onSelectHazard={onSelectHazard}
                userLocation={userLocation}
                center={userLocation ? [userLocation.lat, userLocation.lon] : [19.1573, 73.2631]}
                zoom={15}
              />
            </div>
          </div>

          {/* Recent Activity & Verification Stream */}
          <div className="bg-[#FFFFFF] border-[5px] border-[#000000] p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b-[3px] border-[#000000] pb-4">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-[#000000] inline-block" />
                <h2 className="font-headline text-base uppercase text-[#000000]">
                  HAZARD FEED
                </h2>
              </div>
              <span className="text-[11px] font-mono font-bold uppercase text-[#000000] px-2 py-0.5 border-[2px] border-[#000000] bg-[#F0F0F0]">
                {hazards.length} LOGS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[460px]">
              {hazards.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono font-bold uppercase text-[#000000] border-[2px] border-dashed border-[#000000]">
                  NO ROAD HAZARDS RECORDED. SEED DEMO OR RUN LIVE DETECTION.
                </div>
              ) : (
                hazards.slice(0, 8).map((h) => (
                  <div
                    key={h.id}
                    onClick={() => onSelectHazard(h)}
                    className="p-3.5 bg-[#FFFFFF] border-[3px] border-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF] group cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border-[2px] ${
                        h.severity === 'critical' ? 'border-[#FF0000] text-[#FF0000] group-hover:bg-[#FF0000] group-hover:text-[#FFFFFF]' :
                        h.severity === 'high' ? 'border-[#FFA500] text-[#FFA500] group-hover:bg-[#FFA500] group-hover:text-[#FFFFFF]' :
                        h.severity === 'medium' ? 'border-[#FFA500] text-[#FFA500] group-hover:bg-[#FFA500] group-hover:text-[#FFFFFF]' :
                        'border-[#008000] text-[#008000] group-hover:bg-[#008000] group-hover:text-[#FFFFFF]'
                      }`}>
                        {h.severity} POTHOLE
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border-[2px] ${
                        h.status === 'verified' ? 'border-[#008000] text-[#008000] group-hover:text-[#008000]' : 'border-[#FFA500] text-[#FFA500] group-hover:text-[#FFA500]'
                      }`}>
                        {h.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs font-mono font-bold uppercase truncate">
                      {h.address_label || h.road_type || 'ROAD SECTOR'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono border-t-[1px] border-[#000000] group-hover:border-[#FFFFFF] pt-1">
                      <span>{h.observation_count} OBS ({h.independent_device_count} CARS)</span>
                      <span>{(h.estimated_area_ratio * 100).toFixed(1)}% AREA</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Feature Showcase Grid: RawBlock Heavy Structural Blocks */}
      <ScrollReveal direction="up" delay={180}>
        <div className="space-y-4 pt-4">
          <div className="border-b-[3px] border-[#000000] pb-3">
            <h2 className="font-headline text-2xl uppercase tracking-tight text-[#000000]">
              AUTONOMOUS PERCEPTION ARCHITECTURE
            </h2>
            <p className="font-mono text-xs text-[#000000] uppercase tracking-wide mt-1">
              EDGE INFERENCE // HAVERSINE CLUSTERING // FORWARD THREAT TELEMETRY
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-6 bg-[#FFFFFF] border-[5px] border-[#000000] space-y-3 hover:bg-[#F0F0F0] transition-colors">
              <span className="font-mono text-xs font-bold uppercase tracking-[2px] bg-[#000000] text-[#FFFFFF] px-2 py-1 inline-block">
                01 // EDGE VISION
              </span>
              <h3 className="font-headline text-lg uppercase text-[#000000]">YOLOv8 PERCEPTION</h3>
              <p className="font-body text-sm text-[#000000] leading-relaxed">
                Processes forward vehicle dashcam streams, isolating road cavity bounding boxes, normalized coordinates, and explainable visual severity ratings.
              </p>
            </div>

            <div className="p-6 bg-[#FFFFFF] border-[5px] border-[#000000] space-y-3 hover:bg-[#F0F0F0] transition-colors">
              <span className="font-mono text-xs font-bold uppercase tracking-[2px] bg-[#000000] text-[#FFFFFF] px-2 py-1 inline-block">
                02 // CONSENSUS
              </span>
              <h3 className="font-headline text-lg uppercase text-[#000000]">SPATIAL CLUSTERING</h3>
              <p className="font-body text-sm text-[#000000] leading-relaxed">
                Haversine distance deduplication groups sightings within 20m. Multi-vehicle consensus confirms persistent road craters across multiple independent cars.
              </p>
            </div>

            <div className="p-6 bg-[#FFFFFF] border-[5px] border-[#000000] space-y-3 hover:bg-[#F0F0F0] transition-colors">
              <span className="font-mono text-xs font-bold uppercase tracking-[2px] bg-[#000000] text-[#FFFFFF] px-2 py-1 inline-block">
                03 // FLEET AUDIT
              </span>
              <h3 className="font-headline text-lg uppercase text-[#000000]">MUNICIPAL LEDGER &amp; GIS</h3>
              <p className="font-body text-sm text-[#000000] leading-relaxed">
                Aggregates real-time hazard logs, spatial clustering consensus, and automated export datasets for civic road repair and infrastructure authorities.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};
