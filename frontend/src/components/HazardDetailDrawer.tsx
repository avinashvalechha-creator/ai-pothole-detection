import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Clock
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

  const getSeverityChip = (sev: SeverityLevel) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 bg-white text-[#FF0000] border-2 border-[#FF0000] text-xs font-mono font-bold uppercase tracking-wider">
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-1 bg-white text-[#FFA500] border-2 border-[#FFA500] text-xs font-mono font-bold uppercase tracking-wider">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-1 bg-white text-[#FFA500] border-2 border-[#FFA500] text-xs font-mono font-bold uppercase tracking-wider">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-white text-[#008000] border-2 border-[#008000] text-xs font-mono font-bold uppercase tracking-wider">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-white border-l-[5px] border-black z-[1000] flex flex-col">
      {/* Header */}
      <div className="p-5 border-b-thick border-black flex items-center justify-between bg-black text-white">
        <div>
          <h2 className="font-headline text-lg uppercase tracking-tight">ROAD DEFECT SPEC</h2>
          <p className="font-mono text-xs text-neutral-400">UUID: {hazard.id.slice(0, 8)}...{hazard.id.slice(-4)}</p>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-1 bg-white text-black font-headline text-xs hover:bg-black hover:text-white border-thick border-white transition"
        >
          [ESC]
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status & Severity Bar */}
        <div className="p-4 bg-white border-thick border-black flex items-center justify-between">
          <div>
            <span className="font-headline text-[11px] text-black block uppercase tracking-wider mb-1.5">
              SEVERITY
            </span>
            {getSeverityChip(hazard.severity)}
          </div>
          <div className="text-right">
            <span className="font-headline text-[11px] text-black block uppercase tracking-wider mb-1.5">
              STATE
            </span>
            <span className={`px-2.5 py-1 text-xs font-mono font-bold border-2 uppercase ${
              hazard.status === 'verified'
                ? 'border-[#008000] text-[#008000]'
                : hazard.status === 'resolved'
                ? 'border-black text-black'
                : 'border-[#FFA500] text-[#FFA500]'
            }`}>
              {hazard.status}
            </span>
          </div>
        </div>

        {/* Location & Street */}
        <div className="p-4 bg-white border-thick border-black space-y-2">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-black mt-0.5 shrink-0" />
            <div>
              <p className="font-headline text-xs uppercase text-black">LOCATION</p>
              <p className="font-body text-sm font-semibold text-black mt-0.5">
                {hazard.address_label || hazard.road_type || 'ROADWAY SECTOR'}
              </p>
              <p className="font-mono text-xs text-black mt-1">
                COORDINATES: {hazard.latitude.toFixed(6)}, {hazard.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Computer Vision Explainability Metrics */}
        <div className="p-4 bg-white border-thick border-black space-y-3">
          <h3 className="font-headline text-xs text-black uppercase tracking-wider">
            INFERENCE METRICS
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#F0F0F0] border-2 border-black">
              <span className="font-mono text-black block text-[11px] uppercase">FRAME AREA RATIO</span>
              <span className="font-mono font-bold text-lg text-black">{(hazard.estimated_area_ratio * 100).toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-[#F0F0F0] border-2 border-black">
              <span className="font-mono text-black block text-[11px] uppercase">CONFIDENCE</span>
              <span className="font-mono font-bold text-lg text-black">{(hazard.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="p-2.5 bg-black text-white font-mono text-[11px] leading-relaxed">
            [NOTE]: Monocular dashcam edge analysis and contrast footprint mapping.
          </div>
        </div>

        {/* Multi-Vehicle Verification Evidence */}
        <div className="p-4 bg-white border-thick border-black space-y-3">
          <h3 className="font-headline text-xs text-black uppercase tracking-wider">
            CROWD TELEMETRY EVIDENCE
          </h3>
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 bg-white border-2 border-black">
              <span className="text-black block text-[11px] uppercase">OBSERVATIONS</span>
              <span className="text-black font-headline text-xl font-bold">{hazard.observation_count}</span>
            </div>
            <div className="p-3 bg-white border-2 border-black">
              <span className="text-black block text-[11px] uppercase">VEHICLES</span>
              <span className="text-black font-headline text-xl font-bold">{hazard.independent_device_count}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-mono text-black border-t-2 border-black pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>FIRST REPORT:</span>
              </span>
              <span className="font-bold">
                {hazard.first_observed_at ? new Date(hazard.first_observed_at).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>LAST SIGHTED:</span>
              </span>
              <span className="font-bold">
                {hazard.last_observed_at ? new Date(hazard.last_observed_at).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Driver / Fleet Feedback Controls */}
        <div className="p-4 bg-white border-thick border-black space-y-3">
          <h3 className="font-headline text-xs text-black uppercase tracking-wider">
            DRIVER FEEDBACK
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleFeedback('confirm')}
              disabled={loadingAction !== null}
              className="px-3 py-3 bg-white hover:bg-black text-black hover:text-white border-thick border-black font-headline text-xs uppercase tracking-wider transition"
            >
              CONFIRM ({hazard.feedback_confirm_count})
            </button>
            <button
              onClick={() => handleFeedback('clear')}
              disabled={loadingAction !== null}
              className="px-3 py-3 bg-white hover:bg-black text-black hover:text-white border-thick border-black font-headline text-xs uppercase tracking-wider transition"
            >
              REPAIRED ({hazard.feedback_clear_count})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
