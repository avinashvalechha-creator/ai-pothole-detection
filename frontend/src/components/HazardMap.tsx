import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { AlertTriangle } from 'lucide-react';
import { RoadHazard, SeverityLevel, HazardStatus } from '../services/types';

// Tile providers supported
export type MapProvider = 'osm' | 'satellite' | 'google';

// RawBlock square pin markers: sharp 0px radius, 3px solid black border, pure color fills
const createHazardIcon = (severity: SeverityLevel, isVerified: boolean) => {
  const colors = {
    critical: '#FF0000', // Pure Red
    high: '#FFA500',     // Pure Orange
    medium: '#FFA500',   // Pure Orange
    low: '#008000',      // Pure Green
  };
  const color = colors[severity] || '#000000';

  const svgHtml = `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="background-color: ${color}; width: 18px; height: 18px; border: 3px solid #000000; display: flex; align-items: center; justify-content: center;">
        <div style="width: 4px; height: 4px; background-color: #000000;"></div>
      </div>
      ${isVerified ? `<div style="position: absolute; top: -3px; right: -3px; background-color: #000000; color: #FFFFFF; font-family: monospace; font-size: 8px; font-weight: bold; width: 10px; height: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid #FFFFFF;">V</div>` : ''}
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-hazard-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const createVehicleIcon = (heading: number) => {
  const svgHtml = `
    <div style="transform: rotate(${heading}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="background-color: #000000; width: 24px; height: 24px; border: 3px solid #FFFFFF; display: flex; align-items: center; justify-content: center;">
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid #FFFFFF; transform: translateY(-1px);"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-vehicle-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// RawBlock High-Precision User Location Marker (Pulse radar square)
const createUserLocationIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; border: 2px solid #0000FF; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>
      <div style="background-color: #0000FF; width: 14px; height: 14px; border: 3px solid #FFFFFF; box-shadow: 0 0 0 2px #000000;"></div>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-user-location-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface HazardMapProps {
  hazards: RoadHazard[];
  onSelectHazard?: (hazard: RoadHazard) => void;
  vehicleLocation?: { lat: number; lon: number; heading: number } | null;
  userLocation?: { lat: number; lon: number; label?: string; isGps?: boolean } | null;
  center?: [number, number];
  zoom?: number;
}

// Helper to keep map centered smoothly on moving user without resetting user's zoom or un-zooming
const MapCenterFollower: React.FC<{ 
  position: [number, number] | null; 
}> = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position && !isNaN(position[0]) && !isNaN(position[1])) {
      map.panTo(position, { animate: true, duration: 0.8 });
    }
  }, [position?.[0], position?.[1], map]);

  return null;
};

// High-Performance RawBlock Clustered Marker Layer
// Uses native Leaflet.markercluster with hardware-accelerated clustering (never hangs the map)
const ClusteredHazardLayer: React.FC<{
  hazards: RoadHazard[];
  onSelectHazard?: (h: RoadHazard) => void;
}> = ({ hazards, onSelectHazard }) => {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Create MarkerClusterGroup with RawBlock brutalist styling & ultra-fast settings
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 50,
      chunkDelay: 10,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let sizeClass = 'marker-cluster-small';
        if (count >= 100) sizeClass = 'marker-cluster-large';
        else if (count >= 20) sizeClass = 'marker-cluster-medium';

        return L.divIcon({
          html: `<span>${count}</span>`,
          className: `marker-cluster-raw ${sizeClass}`,
          iconSize: count >= 100 ? [48, 48] : count >= 20 ? [40, 40] : [34, 34],
        });
      },
    });

    // Populate markers in bulk
    const markers: any[] = [];
    for (const h of hazards) {
      const marker = L.marker([h.latitude, h.longitude], {
        icon: createHazardIcon(h.severity, h.status === 'verified'),
      });

      const popupContent = `
        <div style="padding: 8px; font-family: monospace; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-weight: 900; font-size: 13px; text-transform: uppercase;">${h.severity} POTHOLE</span>
            <span style="font-size: 10px; font-weight: bold; background: #000000; color: #FFFFFF; padding: 2px 4px;">${h.status.toUpperCase()}</span>
          </div>
          <div style="font-size: 11px; line-height: 1.4;">
            <div><strong>Road:</strong> ${h.address_label || h.road_type || 'Road Corridor'}</div>
            <div><strong>Visual Area:</strong> ${(h.estimated_area_ratio * 100).toFixed(1)}%</div>
            <div><strong>Verifications:</strong> ${h.observation_count} (${h.independent_device_count} devices)</div>
            <div><strong>GPS:</strong> ${h.latitude.toFixed(5)}, ${h.longitude.toFixed(5)}</div>
          </div>
          <button id="btn-inspect-${h.id}" style="margin-top: 8px; width: 100%; background: #000000; color: #FFFFFF; font-weight: bold; font-size: 11px; padding: 5px; border: 2px solid #000000; cursor: pointer; text-transform: uppercase;">
            INSPECT HAZARD DETAILS
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'custom-popup' });
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${h.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectHazard) onSelectHazard(h);
          };
        }
      });
      markers.push(marker);
    }

    clusterGroup.addLayers(markers);
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      if (clusterGroupRef.current && map) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map, hazards, onSelectHazard]);

  return null;
};

export const HazardMap: React.FC<HazardMapProps> = ({
  hazards,
  onSelectHazard,
  vehicleLocation,
  userLocation,
  center = [19.1620, 73.2350],
  zoom = 13,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mapProvider, setMapProvider] = useState<MapProvider>('osm');

  // Filter hazards
  const filteredHazards = hazards.filter((h) => {
    if (severityFilter !== 'all' && h.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    return true;
  });

  const getTileConfig = () => {
    switch (mapProvider) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 19,
        };
      case 'google':
        return {
          url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          attribution: '&copy; Google Maps Real-Time Road Layer',
          maxZoom: 21,
        };
      case 'osm':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        };
    }
  };

  const currentTile = getTileConfig();

  return (
    <div className="relative w-full h-full min-h-[460px] border-[4px] border-[#000000] bg-[#FFFFFF] flex flex-col overflow-hidden">
      {/* Map Interactive Viewport */}
      <div className="relative w-full flex-1 min-h-[320px]">
        {/* Top Controls Overlay - RawBlock Structure */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-[500] flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Severity Filter */}
        <div className="bg-[#FFFFFF] border-[3px] border-[#000000] p-1 flex items-center text-xs font-mono font-bold uppercase">
          <span className="px-1 text-[#000000]">SEV:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#FFFFFF] text-[#000000] text-xs font-mono font-bold uppercase focus:outline-none cursor-pointer pr-1"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="critical">CRITICAL ONLY</option>
            <option value="high">HIGH ONLY</option>
            <option value="medium">MEDIUM ONLY</option>
            <option value="low">LOW ONLY</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="bg-[#FFFFFF] border-[3px] border-[#000000] p-1 flex items-center text-xs font-mono font-bold uppercase">
          <span className="px-1 text-[#000000]">STAT:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FFFFFF] text-[#000000] text-xs font-mono font-bold uppercase focus:outline-none cursor-pointer pr-1"
          >
            <option value="all">ALL STATUSES</option>
            <option value="verified">VERIFIED ONLY</option>
            <option value="provisional">PROVISIONAL ONLY</option>
            <option value="resolved">RESOLVED</option>
          </select>
        </div>

        {/* Hazard Counter Pill */}
        <div className="bg-[#FFFFFF] border-[3px] border-[#000000] px-3 py-1.5 flex items-center space-x-1 text-xs font-mono font-bold uppercase">
          <span className="text-[#000000]">SHOWING:</span>
          <span className="text-[#0000FF] font-black">{filteredHazards.length}</span>
          <span className="text-[#000000]">/ {hazards.length}</span>
        </div>

        {/* Real Maps Layer Selector - RawBlock Inversion Chips */}
        <div className="bg-[#FFFFFF] border-[3px] border-[#000000] p-1 flex items-center space-x-1 text-xs font-mono font-bold uppercase">
          <button
            type="button"
            onClick={() => setMapProvider('osm')}
            className={`px-2 py-1 uppercase tracking-wider border-[2px] border-[#000000] transition-colors ${
              mapProvider === 'osm' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
            }`}
          >
            OSM
          </button>
          <button
            type="button"
            onClick={() => setMapProvider('google')}
            className={`px-2 py-1 uppercase tracking-wider border-[2px] border-[#000000] transition-colors ${
              mapProvider === 'google' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
            }`}
          >
            GOOGLE
          </button>
          <button
            type="button"
            onClick={() => setMapProvider('satellite')}
            className={`px-2 py-1 uppercase tracking-wider border-[2px] border-[#000000] transition-colors ${
              mapProvider === 'satellite' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
            }`}
          >
            SATELLITE
          </button>
        </div>
      </div>

      {/* Legend Overlay - RawBlock Inverted Box */}
      <div className="absolute bottom-4 left-4 z-[500] bg-[#FFFFFF] border-[3px] border-[#000000] p-3 text-xs font-mono font-bold space-y-1.5 hidden md:block">
        <span className="text-[11px] font-headline uppercase block mb-1 tracking-wider text-[#000000]">LEGEND // HAZARDS</span>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 bg-[#FF0000] border-[2px] border-[#000000]" />
          <span className="text-[#000000] uppercase">CRITICAL (&gt;9.5% AREA)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 bg-[#FFA500] border-[2px] border-[#000000]" />
          <span className="text-[#000000] uppercase">HIGH (4.8% - 9.5%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 bg-[#FFA500] border-[2px] border-[#000000]" />
          <span className="text-[#000000] uppercase">MEDIUM (1.8% - 4.8%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 bg-[#008000] border-[2px] border-[#000000]" />
          <span className="text-[#000000] uppercase">LOW (&lt;1.8%)</span>
        </div>
        <div className="pt-1 border-t-[2px] border-[#000000] text-[10px] text-[#000000] uppercase">
          [V] = MULTI-VEHICLE VERIFIED
        </div>
      </div>

      {/* Leaflet Map with Dynamic Provider */}
      <MapContainer
        key={mapProvider}
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <MapCenterFollower position={center} />
        <TileLayer
          key={currentTile.url}
          attribution={currentTile.attribution}
          url={currentTile.url}
          maxZoom={currentTile.maxZoom}
        />

        {/* High-Performance Clustered Hazards Layer */}
        <ClusteredHazardLayer hazards={filteredHazards} onSelectHazard={onSelectHazard} />

        {/* Current User Live Location Marker (Radar Pulse) - ONLY when GPS is allowed by user */}
        {userLocation && userLocation.isGps && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lon]}
              icon={createUserLocationIcon()}
            >
              <Popup className="custom-popup">
                <div className="p-2 space-y-1 text-black font-mono text-xs">
                  <div className="font-headline font-bold text-xs uppercase border-b-2 border-black pb-1">
                    YOUR EXACT GPS LOCATION
                  </div>
                  <p className="text-[11px] font-sans font-semibold pt-1">
                    {userLocation.label || 'Current Road Corridor'}
                  </p>
                  <p className="text-[10px] text-neutral-600">
                    LAT: {userLocation.lat.toFixed(6)}, LON: {userLocation.lon.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lon]}
              radius={200}
              pathOptions={{
                color: '#0000FF',
                fillColor: '#0000FF',
                fillOpacity: 0.10,
                weight: 2,
                dashArray: '4, 4'
              }}
            />
          </>
        )}

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

      {/* Bottom Border Alert Info Context Bar */}
      <div className="border-t-[3px] border-[#000000] bg-[#FFF8E7] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono text-[#000000] shrink-0 z-10 select-none">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 stroke-[2.5]" />
          <span className="font-bold uppercase tracking-wider text-[#000000] shrink-0">
            [DATA ADVISORY]:
          </span>
          <span className="uppercase text-[#222222] font-semibold leading-snug">
            Road defect coordinates are fetched dynamically from telemetry API feeds and may contain spatial inaccuracies.
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#000000] shrink-0">
          <span className="w-2 h-2 bg-[#008000] border border-[#000000] shrink-0" />
          <span>LIVE TELEMETRY API</span>
        </div>
      </div>
    </div>
  );
};
