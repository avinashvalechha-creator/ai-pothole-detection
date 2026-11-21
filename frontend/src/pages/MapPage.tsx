import React, { useState } from 'react';
import { MapPin, Search, Compass, AlertTriangle } from 'lucide-react';
import { HazardMap } from '../components/HazardMap';
import { HazardDetailDrawer } from '../components/HazardDetailDrawer';
import { RoadHazard } from '../services/types';
import { api } from '../services/api';

interface MapPageProps {
  hazards: RoadHazard[];
  selectedHazard: RoadHazard | null;
  setSelectedHazard: (h: RoadHazard | null) => void;
  onRefreshHazards: () => void;
  userLocation?: { lat: number; lon: number; label?: string; isGps?: boolean } | null;
  onSyncLocation?: (lat: number, lon: number, isGps?: boolean) => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  hazards,
  selectedHazard,
  setSelectedHazard,
  onRefreshHazards,
  userLocation,
  onSyncLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    if (userLocation) return [userLocation.lat, userLocation.lon];
    if (hazards.length > 0) return [hazards[0].latitude, hazards[0].longitude];
    return [19.0760, 72.8774]; // Dynamic Indian regional default if loading
  });

  // Keep mapCenter in sync whenever userLocation updates via IP or GPS
  React.useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lon]);
    } else if (hazards.length > 0 && mapCenter[0] === 28.5385) {
      setMapCenter([hazards[0].latitude, hazards[0].longitude]);
    }
  }, [userLocation]);

  // Handle simple coordinate or label jump
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if search query is lat, lon
    const parts = searchQuery.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setMapCenter([parts[0], parts[1]]);
      return;
    }

    // Otherwise find hazard matching label
    const found = hazards.find((h) => 
      (h.address_label && h.address_label.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (h.road_type && h.road_type.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (found) {
      setMapCenter([found.latitude, found.longitude]);
      setSelectedHazard(found);
    }
  };

  const [syncingRealHazards, setSyncingRealHazards] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Jump to user's real GPS position on the map & fetch real-time localized hazards
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setSyncingRealHazards(true);
    setSyncStatusMsg('ACQUIRING HIGH-ACCURACY GPS FIX...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const uLat = pos.coords.latitude;
        const uLon = pos.coords.longitude;
        setMapCenter([uLat, uLon]);
        setSyncStatusMsg('SYNCING REAL-TIME DEFECTS ACROSS 5000M SECTOR...');
        try {
          const res = await api.syncLocationHazards(uLat, uLon, 5000);
          setSyncStatusMsg(`LOCKED: ${res.road_label.toUpperCase()} (${res.total_active_in_area} ACTIVE DEFECTS)`);
          onRefreshHazards();
        } catch (err) {
          console.error(err);
          setSyncStatusMsg('GPS COORDINATES APPLIED.');
        } finally {
          setSyncingRealHazards(false);
          setTimeout(() => setSyncStatusMsg(null), 6000);
        }
      },
      (err) => {
        setSyncingRealHazards(false);
        setSyncStatusMsg(`GPS ERROR: ${err.message.toUpperCase()}`);
        setTimeout(() => setSyncStatusMsg(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Map Control Bar - RawBlock 5px border */}
      <div className="bg-white border-heavy border-black p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-mono font-bold text-lg shrink-0">
            #
          </div>
          <div>
            <h1 className="font-headline text-lg sm:text-xl text-black uppercase tracking-tight">
              GEOGRAPHIC HAZARD INTELLIGENCE
            </h1>
            <p className="font-mono text-xs text-black">
              MULTI-PROVIDER TILE LAYERS // REAL-TIME GEODETIC TELEMETRY
            </p>
          </div>
        </div>

        {/* Search / Jump Bar & User GPS Button */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="SEARCH ROAD OR 'LAT, LON'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F0F0F0] border-thick border-black px-3 py-2 text-xs font-mono text-black placeholder-neutral-500 focus:bg-[#E8E8E8] focus:border-heavy focus:outline-none uppercase"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white border-thick border-black font-headline text-xs tracking-wider uppercase hover:bg-white hover:text-black transition"
            >
              [LOCATE]
            </button>
          </form>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={syncingRealHazards}
            className={`px-4 py-2 border-thick border-black font-headline text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition ${
              syncingRealHazards
                ? 'bg-black text-white animate-pulse'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
            title="Pan map to exact GPS coordinates & fetch local defects"
          >
            <Compass className={`w-4 h-4 ${syncingRealHazards ? 'animate-spin' : ''}`} />
            <span>{syncingRealHazards ? 'SYNCING...' : '[SYNC GPS LOCATION]'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="p-3 bg-black text-white border-thick border-black font-mono text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-[#00FF00]" />
            <span>{syncStatusMsg}</span>
          </div>
          <span className="text-neutral-400 font-mono text-[10px]">[SYSTEM EVENT]</span>
        </div>
      )}

      {/* Main Map Canvas - 5px border */}
      <div className="h-[calc(100vh-230px)] min-h-[550px] w-full relative border-heavy border-black bg-white">
        <HazardMap
          hazards={hazards}
          onSelectHazard={(h) => setSelectedHazard(h)}
          center={mapCenter}
          userLocation={userLocation}
          zoom={15}
        />

        {/* Slide-over Inspection Drawer */}
        <HazardDetailDrawer
          hazard={selectedHazard}
          onClose={() => setSelectedHazard(null)}
          onFeedbackUpdated={onRefreshHazards}
        />
      </div>
    </div>
  );
};
