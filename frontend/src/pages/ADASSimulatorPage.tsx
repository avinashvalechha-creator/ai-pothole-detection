import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  Play, 
  Pause, 
  RotateCcw, 
  Gauge, 
  Compass, 
  Car, 
  Sliders, 
  MapPin, 
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { HazardMap } from '../components/HazardMap';
import { ADASWarningHUD } from '../components/ADASWarningHUD';
import { RoadHazard, ADASWarning, Telemetry } from '../services/types';
import { api } from '../services/api';

interface ADASSimulatorPageProps {
  hazards: RoadHazard[];
}

export const ADASSimulatorPage: React.FC<ADASSimulatorPageProps> = ({ hazards }) => {
  const [routeWaypoints, setRouteWaypoints] = useState<any[]>([]);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Telemetry state
  const [lat, setLat] = useState(28.5355);
  const [lon, setLon] = useState(77.3910);
  const [heading, setHeading] = useState(45.0);
  const [speedKmh, setSpeedKmh] = useState(50.0);
  const [deviceId, setDeviceId] = useState('veh-adas-demo-01');

  // Threat & Warning state
  const [warning, setWarning] = useState<ADASWarning | null>(null);
  const playIntervalRef = useRef<any>(null);

  // Fetch route on mount
  useEffect(() => {
    api.getSampleRoute()
      .then((res) => {
        if (res.waypoints && res.waypoints.length > 0) {
          setRouteWaypoints(res.waypoints);
          setLat(res.waypoints[0].lat);
          setLon(res.waypoints[0].lon);
          setHeading(res.waypoints[0].heading);
          setSpeedKmh(res.waypoints[0].speed_kmh);
        }
      })
      .catch(console.error);
  }, []);

  // Evaluate ADAS threat whenever vehicle telemetry changes
  const evaluateCurrentTelemetry = async (vLat: number, vLon: number, vHeading: number, vSpeed: number) => {
    try {
      const telemetry: Telemetry = {
        device_id: deviceId,
        latitude: vLat,
        longitude: vLon,
        heading: vHeading,
        speed_kmh: vSpeed,
      };
      const res = await api.evaluateTelemetry(telemetry);
      setWarning(res);
    } catch (err) {
      console.error('Threat evaluation error:', err);
    }
  };

  // Automated Route Playback
  useEffect(() => {
    if (isPlaying && routeWaypoints.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentWaypointIndex((prev) => {
          const next = (prev + 1) % routeWaypoints.length;
          const wp = routeWaypoints[next];
          setLat(wp.lat);
          setLon(wp.lon);
          setHeading(wp.heading);
          setSpeedKmh(wp.speed_kmh);
          evaluateCurrentTelemetry(wp.lat, wp.lon, wp.heading, wp.speed_kmh);
          return next;
        });
      }, 2500); // 2.5s per waypoint step
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, routeWaypoints]);

  // Initial threat evaluation
  useEffect(() => {
    evaluateCurrentTelemetry(lat, lon, heading, speedKmh);
  }, [lat, lon, heading]);

  const handleResetRoute = () => {
    setIsPlaying(false);
    setCurrentWaypointIndex(0);
    if (routeWaypoints.length > 0) {
      const wp = routeWaypoints[0];
      setLat(wp.lat);
      setLon(wp.lon);
      setHeading(wp.heading);
      setSpeedKmh(wp.speed_kmh);
      evaluateCurrentTelemetry(wp.lat, wp.lon, wp.heading, wp.speed_kmh);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Simulation Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold mb-1">
              <Navigation className="w-4 h-4" />
              <span>VEHICLE TELEMETRY & ADAS WARNING BENCH</span>
            </div>
            <h1 className="text-xl font-black text-white">Connected Vehicle In-Cabin Simulator</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Simulates a vehicle driving along an urban arterial road. The onboard ADAS calculation compares forward GPS heading against verified road hazards to compute distance and direction cones in real time.
            </p>
          </div>

          {/* Route Playback Toolbar */}
          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Drive' : 'Start Drive Track'}</span>
            </button>
            <button
              onClick={handleResetRoute}
              className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
              title="Reset Route to Start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live ADAS Warning HUD Display */}
        <ADASWarningHUD
          warning={warning}
          speedKmh={speedKmh}
          heading={heading}
        />
      </div>

      {/* Main Grid: Interactive Map with Radar Tracking & Manual Telemetry Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Map View */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <Car className="w-4 h-4 text-cyan-400" />
              <span>Forward Threat Tracking (150m Sensor Field)</span>
            </div>
            {routeWaypoints.length > 0 && (
              <span className="text-xs font-mono text-cyan-400">
                Waypoint {currentWaypointIndex + 1} of {routeWaypoints.length} ({routeWaypoints[currentWaypointIndex]?.label || 'Tracking'})
              </span>
            )}
          </div>
          <div className="h-[480px] w-full rounded-xl overflow-hidden">
            <HazardMap
              hazards={hazards}
              vehicleLocation={{ lat, lon, heading }}
              center={[lat, lon]}
              zoom={16}
            />
          </div>
        </div>

        {/* Manual Telemetry Tuning Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Telemetry Override Console</h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Directly test ADAS directional algorithms by adjusting position, heading cone angle, and speed.
          </p>

          <div className="space-y-4 text-xs font-mono">
            {/* Speed Slider */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Vehicle Speed:</span>
                </span>
                <span className="text-cyan-400 font-bold">{speedKmh} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                value={speedKmh}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeedKmh(val);
                  evaluateCurrentTelemetry(lat, lon, heading, val);
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Heading Compass Slider */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compass Heading:</span>
                </span>
                <span className="text-cyan-400 font-bold">{heading}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={heading}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setHeading(val);
                  evaluateCurrentTelemetry(lat, lon, val, speedKmh);
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0° (N)</span>
                <span>90° (E)</span>
                <span>180° (S)</span>
                <span>270° (W)</span>
              </div>
            </div>

            {/* Coordinates Input */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px] mb-1">GPS Vehicle Center</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLat(val);
                      evaluateCurrentTelemetry(val, lon, heading, speedKmh);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={lon}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLon(val);
                      evaluateCurrentTelemetry(lat, val, heading, speedKmh);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
