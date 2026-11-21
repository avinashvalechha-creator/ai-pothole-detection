import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  Play, 
  Pause, 
  RotateCcw, 
  Gauge, 
  Compass, 
  Car, 
  Sliders
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
  const [deviceId] = useState('veh-adas-demo-01');

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
      }, 2500);
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
      {/* Top Header & Simulation Controls - RawBlock 5px border */}
      <div className="bg-white border-heavy border-black p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-thick border-black pb-4">
          <div>
            <div className="font-mono text-xs uppercase font-bold text-black flex items-center gap-1.5 mb-1">
              <Navigation className="w-4 h-4" />
              <span>VEHICLE TELEMETRY & ADAS WARNING BENCH</span>
            </div>
            <h1 className="font-headline text-2xl text-black uppercase tracking-tight">
              CONNECTED VEHICLE IN-CABIN SIMULATOR
            </h1>
            <p className="font-body text-xs text-black mt-1 max-w-2xl">
              Simulates a vehicle driving along an urban corridor. The onboard ADAS calculation compares forward GPS heading against verified road hazards to compute distance and direction cones in real time.
            </p>
          </div>

          {/* Route Playback Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2.5 bg-black text-white hover:bg-white hover:text-black border-thick border-black font-headline text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? '[PAUSE DRIVE]' : '[START DRIVE TRACK]'}</span>
            </button>
            <button
              onClick={handleResetRoute}
              className="p-2.5 bg-white text-black hover:bg-black hover:text-white border-thick border-black transition"
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
        <div className="lg:col-span-2 bg-white border-heavy border-black p-5 space-y-4">
          <div className="flex items-center justify-between border-b-thick border-black pb-3">
            <div className="flex items-center space-x-2 font-headline text-xs text-black uppercase">
              <Car className="w-4 h-4" />
              <span>FORWARD THREAT TRACKING (150M CONE FIELD)</span>
            </div>
            {routeWaypoints.length > 0 && (
              <span className="font-mono text-xs font-bold text-black uppercase">
                WAYPOINT {currentWaypointIndex + 1}/{routeWaypoints.length} ({routeWaypoints[currentWaypointIndex]?.label || 'TRACKING'})
              </span>
            )}
          </div>
          <div className="h-[480px] w-full border-thick border-black overflow-hidden">
            <HazardMap
              hazards={hazards}
              vehicleLocation={{ lat, lon, heading }}
              center={[lat, lon]}
              zoom={16}
            />
          </div>
        </div>

        {/* Manual Telemetry Tuning Console */}
        <div className="bg-white border-heavy border-black p-5 space-y-5">
          <div className="flex items-center space-x-2 border-b-thick border-black pb-3">
            <Sliders className="w-4 h-4 text-black" />
            <h2 className="font-headline text-sm text-black uppercase">TELEMETRY OVERRIDE</h2>
          </div>

          <p className="font-body text-xs text-black leading-relaxed">
            Directly test ADAS directional algorithms by adjusting position, heading cone angle, and speed.
          </p>

          <div className="space-y-4 font-mono text-xs">
            {/* Speed Slider */}
            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="flex items-center space-x-1.5 font-headline uppercase">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>SPEED:</span>
                </span>
                <span className="font-bold text-base">{speedKmh} KM/H</span>
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
                className="w-full accent-black cursor-pointer"
              />
            </div>

            {/* Heading Compass Slider */}
            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="flex items-center space-x-1.5 font-headline uppercase">
                  <Compass className="w-3.5 h-3.5" />
                  <span>HEADING:</span>
                </span>
                <span className="font-bold text-base">{heading}°</span>
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
                className="w-full accent-black cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-black font-bold uppercase">
                <span>0° (N)</span>
                <span>90° (E)</span>
                <span>180° (S)</span>
                <span>270° (W)</span>
              </div>
            </div>

            {/* Coordinates Input */}
            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <span className="font-headline text-[11px] uppercase text-black block">GPS VEHICLE CENTER</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase text-black block mb-0.5">LATITUDE</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLat(val);
                      evaluateCurrentTelemetry(val, lon, heading, speedKmh);
                    }}
                    className="w-full bg-white border-2 border-black px-2 py-1 text-black font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-black block mb-0.5">LONGITUDE</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lon}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLon(val);
                      evaluateCurrentTelemetry(lat, val, heading, speedKmh);
                    }}
                    className="w-full bg-white border-2 border-black px-2 py-1 text-black font-mono text-xs focus:outline-none"
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
