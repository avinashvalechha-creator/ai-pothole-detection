import React from 'react';
import { Camera, Info, ShieldCheck, Eye, Cpu } from 'lucide-react';
import { LiveCameraDetector } from '../components/LiveCameraDetector';

interface LiveDetectionPageProps {
  onObservationAdded?: () => void;
}

export const LiveDetectionPage: React.FC<LiveDetectionPageProps> = ({ onObservationAdded }) => {
  return (
    <div className="space-y-6">
      {/* Page Title & Vision Explanation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2.5 text-cyan-400 text-xs font-mono font-semibold mb-1">
          <Eye className="w-4 h-4" />
          <span>EDGE COMPUTER VISION PIPELINE</span>
        </div>
        <h1 className="text-xl font-black text-white">Live AI Pothole Detection Studio</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Process vehicle dashcam footage, upload test road images, or stream live video from your device camera. The computer vision pipeline locates road cavities, isolates bounding boxes, and calculates explainable hazard metrics.
        </p>

        {/* Explainability Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-300">Engineering Distinction: Measured vs. Estimated</span>
            <p className="leading-relaxed">
              Standard monocular vehicle cameras lack physical depth stereoscopy. The system measures 
              <strong className="text-slate-200"> 2D pixel coordinates, bounding box width/height, and relative road frame area ratio</strong>. 
              Pothole severity (Low, Medium, High, Critical) is an 
              <strong className="text-cyan-400"> explainable visual hazard estimate</strong> derived from road occupancy and texture contrast, not an uncalibrated millimeter depth measurement.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Live Camera Detector */}
      <LiveCameraDetector onObservationAdded={onObservationAdded} />
    </div>
  );
};
