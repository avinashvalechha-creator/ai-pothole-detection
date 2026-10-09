import React, { useState } from 'react';
import { MapPin, Search, Filter, RefreshCw, Compass } from 'lucide-react';
import { HazardMap } from '../components/HazardMap';
import { HazardDetailDrawer } from '../components/HazardDetailDrawer';
import { RoadHazard } from '../services/types';

interface MapPageProps {
  hazards: RoadHazard[];
  selectedHazard: RoadHazard | null;
  setSelectedHazard: (h: RoadHazard | null) => void;
  onRefreshHazards: () => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  hazards,
  selectedHazard,
  setSelectedHazard,
  onRefreshHazards,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.5385, 77.3940]);

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

  return (
    <div className="space-y-4">
      {/* Top Map Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Geographic Hazard Intelligence</h1>
            <p className="text-xs text-slate-400">OpenStreetMap Open Tile Service with Dynamic Severity Overlay</p>
          </div>
        </div>

        {/* Search / Jump Bar */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search road or enter 'lat, lon'..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Locate
          </button>
        </form>
      </div>

      {/* Main Map Canvas */}
      <div className="h-[calc(100vh-230px)] min-h-[550px] w-full relative">
        <HazardMap
          hazards={hazards}
          onSelectHazard={(h) => setSelectedHazard(h)}
          center={mapCenter}
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
