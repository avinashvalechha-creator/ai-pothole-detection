import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Download, 
  Search, 
  FileSpreadsheet,
  ArrowUp,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { RoadHazard, AnalyticsSummary } from '../services/types';
import { api } from '../services/api';

interface AnalyticsPageProps {
  hazards: RoadHazard[];
  onSelectHazard: (h: RoadHazard) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ hazards, onSelectHazard }) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(150);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary).catch(console.error);
  }, [hazards]);

  // Reset pagination when filtering
  useEffect(() => {
    setVisibleCount(150);
  }, [filterText, filterSeverity]);

  const filtered = hazards.filter((h) => {
    if (filterSeverity !== 'all') {
      if (filterSeverity === 'verified') {
        if (h.status !== 'verified') return false;
      } else if (h.severity !== filterSeverity) {
        return false;
      }
    }

    if (!filterText) return true;
    const txt = filterText.toLowerCase();
    return (
      h.severity.toLowerCase().includes(txt) ||
      h.status.toLowerCase().includes(txt) ||
      (h.address_label && h.address_label.toLowerCase().includes(txt)) ||
      (h.road_type && h.road_type.toLowerCase().includes(txt)) ||
      h.id.toLowerCase().includes(txt)
    );
  });

  const sevBreakdown = summary?.severity_breakdown || {
    critical: hazards.filter(h => h.severity === 'critical').length,
    high: hazards.filter(h => h.severity === 'high').length,
    medium: hazards.filter(h => h.severity === 'medium').length,
    low: hazards.filter(h => h.severity === 'low').length,
  };

  const total = hazards.length || 1;

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar - RawBlock 5px border */}
      <div className="bg-white border-heavy border-black p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-black text-xs font-mono font-bold uppercase mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>ROAD DEFECT METRICS & AUDIT LOGS</span>
          </div>
          <h1 className="font-headline text-2xl text-black uppercase tracking-tight">
            HAZARD ANALYTICS & FLEET REPORTING
          </h1>
          <p className="font-body text-xs text-black mt-1 max-w-2xl leading-relaxed">
            Statistical breakdown of crowdsourced pothole observations, multi-vehicle verification rates, and municipal road maintenance export datasets.
          </p>
        </div>

        <a
          href={api.getExportCsvUrl()}
          download="road_hazards_export.csv"
          className="px-4 py-2.5 bg-black hover:bg-white text-white hover:text-black border-thick border-black font-headline text-xs uppercase tracking-wider transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>[EXPORT CSV DATASET]</span>
        </a>
      </div>

      {/* Visual Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="bg-white border-heavy border-black p-6 space-y-4">
          <h2 className="font-headline text-xs uppercase tracking-wider text-black">
            SEVERITY DISTRIBUTION
          </h2>
          <div className="space-y-3 font-mono">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#FF0000] font-bold uppercase">CRITICAL (&gt;9.5% AREA)</span>
                <span className="text-black font-bold">{sevBreakdown.critical} ({Math.round(sevBreakdown.critical / total * 100)}%)</span>
              </div>
              <div className="w-full bg-[#F0F0F0] h-4 border-2 border-black">
                <div className="bg-[#FF0000] h-full" style={{ width: `${(sevBreakdown.critical / total) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#FFA500] font-bold uppercase">HIGH (4.8% - 9.5%)</span>
                <span className="text-black font-bold">{sevBreakdown.high} ({Math.round(sevBreakdown.high / total * 100)}%)</span>
              </div>
              <div className="w-full bg-[#F0F0F0] h-4 border-2 border-black">
                <div className="bg-[#FFA500] h-full" style={{ width: `${(sevBreakdown.high / total) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#FFA500] font-bold uppercase">MEDIUM (1.8% - 4.8%)</span>
                <span className="text-black font-bold">{sevBreakdown.medium} ({Math.round(sevBreakdown.medium / total * 100)}%)</span>
              </div>
              <div className="w-full bg-[#F0F0F0] h-4 border-2 border-black">
                <div className="bg-[#FFA500] h-full" style={{ width: `${(sevBreakdown.medium / total) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#008000] font-bold uppercase">LOW (&lt;1.8%)</span>
                <span className="text-black font-bold">{sevBreakdown.low} ({Math.round(sevBreakdown.low / total * 100)}%)</span>
              </div>
              <div className="w-full bg-[#F0F0F0] h-4 border-2 border-black">
                <div className="bg-[#008000] h-full" style={{ width: `${(sevBreakdown.low / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Verification & Lifecycle Health */}
        <div className="bg-white border-heavy border-black p-6 space-y-4">
          <h2 className="font-headline text-xs uppercase tracking-wider text-black">
            VERIFICATION & LIFECYCLE AUDIT
          </h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-[#F0F0F0] border-thick border-black">
              <span className="text-[11px] text-black uppercase font-mono block font-bold">VERIFICATION RATE</span>
              <span className="font-headline text-3xl font-bold text-[#008000] block my-1">
                {summary?.verification_rate_percent || 0}%
              </span>
              <span className="text-[10px] text-neutral-600 block uppercase font-mono">MULTI-CAR CONSENSUS</span>
            </div>
            <div className="p-4 bg-[#F0F0F0] border-thick border-black">
              <span className="text-[11px] text-black uppercase font-mono block font-bold">CONFIRMED REPAIRS</span>
              <span className="font-headline text-3xl font-bold text-black block my-1">
                {summary?.resolved_hazards || hazards.filter(h => h.status === 'resolved').length}
              </span>
              <span className="text-[10px] text-neutral-600 block uppercase font-mono">ROAD PATCHES RESOLVED</span>
            </div>
          </div>
          <div className="p-3 bg-black text-white font-mono text-xs leading-relaxed uppercase">
            [PROTOCOL]: DEFECTS ENTER AS PROVISIONAL. 2+ DISTINCT CAR CROSSINGS PROMOTE TO VERIFIED.
          </div>
        </div>
      </div>

      {/* ROAD HAZARD INVENTORY LEDGER - SCROLLABLE WINDOW (RawBlock Window Frame) */}
      <div className="bg-white border-heavy border-black shadow-none flex flex-col">
        {/* Terminal Window Titlebar */}
        <div className="bg-black text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-black">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-white inline-block" />
            <span className="w-2.5 h-2.5 bg-neutral-500 inline-block" />
            <span className="w-2.5 h-2.5 bg-neutral-700 inline-block" />
            <FileSpreadsheet className="w-4 h-4 ml-2 text-white" />
            <h2 className="font-headline text-sm uppercase text-white tracking-wider">
              ROAD HAZARD INVENTORY LEDGER
            </h2>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="px-2 py-0.5 bg-white text-black font-bold uppercase">
              WINDOW SCROLLABLE
            </span>
            <span className="px-2 py-0.5 bg-neutral-800 text-neutral-200 border border-neutral-700 font-bold uppercase">
              {filtered.length.toLocaleString()} RECORDS
            </span>
          </div>
        </div>

        {/* Filter and Search Sub-bar */}
        <div className="p-4 bg-[#F9F9F9] border-b-[3px] border-black flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="font-bold uppercase text-black mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> FILTER:
            </span>
            {[
              { id: 'all', label: 'ALL' },
              { id: 'critical', label: 'CRITICAL' },
              { id: 'high', label: 'HIGH' },
              { id: 'medium', label: 'MEDIUM' },
              { id: 'low', label: 'LOW' },
              { id: 'verified', label: 'VERIFIED ONLY' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterSeverity(f.id)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase border-2 border-black transition ${
                  filterSeverity === f.id
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="SEARCH ROAD, CITY, STATE, OR ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-white border-thick border-black px-3 py-1.5 text-xs text-black placeholder-neutral-500 font-mono focus:outline-none uppercase"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold bg-neutral-200 px-1 border border-black uppercase"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Scrollable Window Body with Sticky Table Header */}
        <div 
          ref={scrollContainerRef}
          className="h-[520px] max-h-[520px] overflow-y-auto overflow-x-auto bg-white border-b-[3px] border-black"
        >
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 z-10 bg-black text-white uppercase text-[11px] font-headline shadow-sm">
              <tr className="border-b-2 border-black">
                <th className="py-3 px-3 bg-black">HAZARD ID</th>
                <th className="py-3 px-3 bg-black">ROAD / LOCATION</th>
                <th className="py-3 px-3 bg-black">SEVERITY</th>
                <th className="py-3 px-3 bg-black">STATUS</th>
                <th className="py-3 px-3 bg-black">AREA RATIO</th>
                <th className="py-3 px-3 bg-black">OBS / CARS</th>
                <th className="py-3 px-3 bg-black">GPS COORDS</th>
                <th className="py-3 px-3 bg-black text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs font-bold uppercase text-neutral-600">
                    NO MATCHING ROAD HAZARDS FOUND FOR CURRENT QUERY.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, visibleCount).map((h) => (
                  <tr key={h.id} className="hover:bg-[#F0F0F0] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-black">{h.id.slice(0, 8)}...</td>
                    <td className="py-2.5 px-3 text-black font-sans font-semibold max-w-xs truncate">
                      {h.address_label || h.road_type || 'ROAD CORRIDOR'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 border-2 text-[10px] uppercase font-bold inline-block ${
                        h.severity === 'critical' ? 'border-[#FF0000] text-[#FF0000] bg-red-50' :
                        h.severity === 'high' ? 'border-[#FFA500] text-[#FFA500] bg-orange-50' :
                        h.severity === 'medium' ? 'border-[#FFA500] text-[#FFA500]' :
                        'border-[#008000] text-[#008000] bg-green-50'
                      }`}>
                        {h.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 border-2 text-[10px] uppercase font-bold inline-block ${
                        h.status === 'verified' ? 'border-[#008000] text-[#008000]' : 'border-black text-black'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-black font-bold">{(h.estimated_area_ratio * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-black">{h.observation_count} obs ({h.independent_device_count} cars)</td>
                    <td className="py-2.5 px-3 text-black">{h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectHazard(h)}
                        className="px-3 py-1 bg-black text-white hover:bg-white hover:text-black border-2 border-black text-[11px] font-headline uppercase transition"
                      >
                        [INSPECT]
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Window Footer Statusbar & Navigation */}
        <div className="p-3 bg-[#F0F0F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono font-bold uppercase">
          <div className="flex items-center space-x-2 text-black">
            <span>
              DISPLAYING {Math.min(visibleCount, filtered.length).toLocaleString()} OF {filtered.length.toLocaleString()} RECORDS
            </span>
            {filtered.length > visibleCount && (
              <span className="text-neutral-500 font-normal">
                ({filtered.length - visibleCount} REMAINING IN BUFFER)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {filtered.length > visibleCount && (
              <>
                <button
                  onClick={() => setVisibleCount(prev => prev + 150)}
                  className="px-3 py-1 bg-black text-white hover:bg-white hover:text-black border-2 border-black text-[11px] font-headline uppercase transition"
                >
                  [LOAD +150 MORE]
                </button>
                <button
                  onClick={() => setVisibleCount(filtered.length)}
                  className="px-3 py-1 bg-white text-black hover:bg-black hover:text-white border-2 border-black text-[11px] font-headline uppercase transition"
                >
                  [LOAD ALL]
                </button>
              </>
            )}
            <button
              onClick={scrollToTop}
              className="px-2.5 py-1 bg-white text-black hover:bg-black hover:text-white border-2 border-black text-[11px] font-headline uppercase transition flex items-center gap-1"
              title="Scroll to top of window"
            >
              <ArrowUp className="w-3.5 h-3.5" /> TOP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
