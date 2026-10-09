import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Radio, 
  Compass, 
  Car, 
  MapPin, 
  ThumbsUp, 
  Wrench,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { RoadHazard, SeverityLevel } from '../services/types';
import { api } from '../services/api';

interface HazardDetailDrawerProps {
  hazard: RoadHazard | null;
  onClose: () => void;
  onFeedbackUpdated?: () => void;
}

export const HazardDetailDrawer: React.FC<HazardDetailDrawerProps> = ({
  hazard,
  onClose,
  onFeedbackUpdated,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!hazard) return null;

  const handleFeedback = async (action: 'confirm' | 'clear') => {
    try {
      setLoadingAction(action);
      await api.submitFeedback(hazard.id, action);
      if (onFeedbackUpdated) onFeedbackUpdated();
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold uppercase tracking-wider font-mono">CRITICAL</span>;
      case 'high':
        return <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold uppercase tracking-wider font-mono">HIGH</span>;
      case 'medium':
        return <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold uppercase tracking-wider font-mono">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider font-mono">LOW</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Road Hazard Details</h2>
            <p className="text-xs text-slate-400 font-mono">ID: {hazard.id.slice(0, 8)}...{hazard.id.slice(-4)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Status & Severity Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-850 border border-slate-800">
          <div>
            <span className="text-[11px] text-slate-400 block uppercase font-mono mb-1">Estimated Severity</span>
            {getSeverityBadge(hazard.severity)}
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-mono mb-1">Network Status</span>
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium ${
              hazard.status === 'verified'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : hazard.status === 'resolved'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {hazard.status === 'verified' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span className="uppercase">{hazard.status}</span>
            </span>
          </div>
        </div>

        {/* Location & Street */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
          <div className="flex items-start space-x-3">
            <MapPin className="w-4 h-4 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-300">Location</p>
              <p className="text-sm text-white font-medium">{hazard.address_label || hazard.road_type || 'Road Corridor'}</p>
              <p className="text-xs font-mono text-slate-400 mt-1">
                {hazard.latitude.toFixed(6)}, {hazard.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Computer Vision Explainability Metrics */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Explainable Visual Features
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block">Relative Frame Area</span>
              <span className="text-white font-mono font-bold text-sm">{(hazard.estimated_area_ratio * 100).toFixed(1)}%</span>
              <span className="text-[10px] text-slate-500 block">Visual road footprint</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block">Mean AI Confidence</span>
              <span className="text-white font-mono font-bold text-sm">{(hazard.confidence * 100).toFixed(0)}%</span>
              <span className="text-[10px] text-slate-500 block">Weighted model score</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300">Engineering Note:</span> Monocular dashcam image feature estimation. Severity is classified based on apparent relative road area and edge contrast dips, not physical ultrasonic/LiDAR depth measurement.
          </div>
        </div>

        {/* Multi-Vehicle Verification Evidence */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Crowdsourced Verification Evidence
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Total Observations</span>
              <span className="text-cyan-400 font-bold text-base">{hazard.observation_count}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Independent Vehicles</span>
              <span className="text-emerald-400 font-bold text-base">{hazard.independent_device_count}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>First Reported:</span>
              </span>
              <span className="text-slate-300 font-mono">
                {hazard.first_observed_at ? new Date(hazard.first_observed_at).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Last Sighted:</span>
              </span>
              <span className="text-slate-300 font-mono">
                {hazard.last_observed_at ? new Date(hazard.last_observed_at).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Driver / Fleet Feedback Controls */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Road Hazard Feedback
          </h3>
          <p className="text-xs text-slate-400">
            Vehicle drivers and patrol units can confirm hazard presence or report completed road repairs.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleFeedback('confirm')}
              disabled={loadingAction !== null}
              className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Confirm Active ({hazard.feedback_confirm_count})</span>
            </button>
            <button
              onClick={() => handleFeedback('clear')}
              disabled={loadingAction !== null}
              className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium transition"
            >
              <Wrench className="w-4 h-4" />
              <span>Report Repaired ({hazard.feedback_clear_count})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
