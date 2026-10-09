import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RoadHazard, SeverityLevel, HazardStatus } from '../services/types';
import { Filter, Layers, Navigation, AlertCircle, ShieldCheck } from 'lucide-react';

// Custom colored SVG pin markers for Leaflet
const createHazardIcon = (severity: SeverityLevel, isVerified: boolean) => {
  const colors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#10b981',
  };
  const color = colors[severity] || '#f59e0b';
  const pulseClass = severity === 'critical' ? 'animate-ping' : '';

  const svgHtml = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      ${severity === 'critical' ? `<div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: pulse 1.8s infinite;"></div>` : ''}
      <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
      </div>
      ${isVerified ? `<div style="position: absolute; bottom: 0; right: 0; background-color: #10b981; border: 1.5px solid #ffffff; width: 9px; height: 9px; border-radius: 50%;"></div>` : ''}
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-hazard-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createVehicleIcon = (heading: number) => {
  const svgHtml = `
    <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="background: linear-gradient(135deg, #06b6d4, #2563eb); width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 15px rgba(6,182,212,0.8); display: flex; align-items: center; justify-content: center;">
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 9px solid #ffffff; transform: translateY(-1px);"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-vehicle-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface HazardMapProps {
  hazards: RoadHazard[];
  onSelectHazard?: (hazard: RoadHazard) => void;
  vehicleLocation?: { lat: number; lon: number; heading: number } | null;
  center?: [number, number];
  zoom?: number;
}

// Helper to keep map centered if vehicle moves
const MapCenterFollower: React.FC<{ position: [number, number] | null }> = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
  }, [position, map]);
  return null;
};

export const HazardMap: React.FC<HazardMapProps> = ({
  hazards,
  onSelectHazard,
  vehicleLocation,
  center = [28.5385, 77.3940],
  zoom = 15,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter hazards
  const filteredHazards = hazards.filter((h) => {
    if (severityFilter !== 'all' && h.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap gap-2 pointer-events-auto">
        {/* Severity Filter */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1.5 shadow-lg flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-cyan-400 ml-1" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2"
          >
            <option value="all" className="bg-slate-900">All Severities</option>
            <option value="critical" className="bg-slate-900">Critical Only</option>
            <option value="high" className="bg-slate-900">High Only</option>
            <option value="medium" className="bg-slate-900">Medium Only</option>
            <option value="low" className="bg-slate-900">Low Only</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1.5 shadow-lg flex items-center space-x-2 text-xs">
          <Layers className="w-3.5 h-3.5 text-cyan-400 ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2"
          >
            <option value="all" className="bg-slate-900">All Statuses</option>
            <option value="verified" className="bg-slate-900">Verified Only</option>
            <option value="provisional" className="bg-slate-900">Provisional Only</option>
            <option value="resolved" className="bg-slate-900">Resolved</option>
          </select>
        </div>

        {/* Hazard Counter Pill */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 shadow-lg flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Showing:</span>
          <span className="text-cyan-400 font-bold">{filteredHazards.length}</span>
          <span className="text-slate-500">/ {hazards.length}</span>
        </div>
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-1.5 hidden sm:block">
        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Hazard Legend</span>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-slate-300">Critical (&gt;9.5% area)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-300">High (4.8% - 9.5%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-300">Medium (1.8% - 4.8%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-300">Low (&lt;1.8%)</span>
        </div>
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-800 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Green dot = Multi-Vehicle Verified</span>
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hazard Markers */}
        {filteredHazards.map((hazard) => (
          <Marker
            key={hazard.id}
            position={[hazard.latitude, hazard.longitude]}
            icon={createHazardIcon(hazard.severity, hazard.status === 'verified')}
            eventHandlers={{
              click: () => {
                if (onSelectHazard) onSelectHazard(hazard);
              },
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 space-y-2 text-slate-900 min-w-[200px]">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="font-bold text-sm uppercase">{hazard.severity} Pothole</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    hazard.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {hazard.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="font-medium text-slate-600">Reports:</span> {hazard.observation_count} ({hazard.independent_device_count} vehicles)</p>
                  <p><span className="font-medium text-slate-600">Visual Area:</span> {(hazard.estimated_area_ratio * 100).toFixed(1)}%</p>
                  <p><span className="font-medium text-slate-600">Road:</span> {hazard.address_label || hazard.road_type || 'Road Sector'}</p>
                </div>
                <button
                  onClick={() => onSelectHazard && onSelectHazard(hazard)}
                  className="w-full mt-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-semibold"
                >
                  Inspect Hazard Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Connected Vehicle Live Marker */}
        {vehicleLocation && (
          <>
            <Marker
              position={[vehicleLocation.lat, vehicleLocation.lon]}
              icon={createVehicleIcon(vehicleLocation.heading)}
            />
            {/* ADAS forward threat sensing circle (150m radius) */}
            <Circle
              center={[vehicleLocation.lat, vehicleLocation.lon]}
              radius={150}
              pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.08, weight: 1.5, dashArray: '4, 6' }}
            />
            <MapCenterFollower position={[vehicleLocation.lat, vehicleLocation.lon]} />
          </>
        )}
      </MapContainer>
    </div>
  );
};
