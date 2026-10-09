import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Search, 
  Layers,
  FileSpreadsheet
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

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary).catch(console.error);
  }, [hazards]);

  const filtered = hazards.filter((h) => {
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

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>ROAD DEFECT METRICS & AUDIT LOGS</span>
          </div>
          <h1 className="text-xl font-black text-white">Hazard Analytics & Fleet Reporting</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Statistical breakdown of crowdsourced pothole observations, multi-vehicle verification rates, and municipal road maintenance export datasets.
          </p>
        </div>

        <a
          href={api.getExportCsvUrl()}
          download="road_hazards_export.csv"
          className="flex items-center space-x-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/20 transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Hazards to CSV</span>
        </a>
      </div>

      {/* Visual Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Severity Distribution
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-rose-400 font-bold">Critical Severity (&gt;9.5% area)</span>
                <span className="text-slate-300">{sevBreakdown.critical} ({Math.round(sevBreakdown.critical / total * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${(sevBreakdown.critical / total) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-orange-400 font-bold">High Severity (4.8% - 9.5%)</span>
                <span className="text-slate-300">{sevBreakdown.high} ({Math.round(sevBreakdown.high / total * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${(sevBreakdown.high / total) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-amber-400 font-bold">Medium Severity (1.8% - 4.8%)</span>
                <span className="text-slate-300">{sevBreakdown.medium} ({Math.round(sevBreakdown.medium / total * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${(sevBreakdown.medium / total) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-emerald-400 font-bold">Low Severity (&lt;1.8%)</span>
                <span className="text-slate-300">{sevBreakdown.low} ({Math.round(sevBreakdown.low / total * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(sevBreakdown.low / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Verification & Lifecycle Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Verification & Lifecycle Health
          </h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-mono block">Verification Rate</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {summary?.verification_rate_percent || 0}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Independent multi-car consensus</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-mono block">Resolved Repairs</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {summary?.resolved_hazards || hazards.filter(h => h.status === 'resolved').length}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Confirmed road patches</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pt-2">
            Potholes enter as <strong className="text-amber-400">Provisional</strong> on initial sighting. When independent vehicles log matching coordinates across distinct trips, the hazard promotes to <strong className="text-emerald-400">Verified</strong> and publishes to connected ADAS fleets.
          </p>
        </div>
      </div>

      {/* Filterable Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Road Hazard Inventory Log</h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by severity, road, or ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Hazard ID</th>
                <th className="py-2.5 px-3">Road Location</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Visual Area</th>
                <th className="py-2.5 px-3">Reports / Cars</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((h) => (
                <tr key={h.id} className="hover:bg-slate-850/60 transition">
                  <td className="py-3 px-3 text-cyan-400 font-bold">{h.id.slice(0, 8)}...</td>
                  <td className="py-3 px-3 text-slate-200 font-sans">{h.address_label || h.road_type || 'Road Corridor'}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      h.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      h.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      h.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {h.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                      h.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
                      h.status === 'resolved' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{(h.estimated_area_ratio * 100).toFixed(1)}%</td>
                  <td className="py-3 px-3 text-slate-400">{h.observation_count} obs ({h.independent_device_count} cars)</td>
                  <td className="py-3 px-3 text-slate-400">{h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectHazard(h)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[11px] font-semibold transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
