import React from 'react';
import { Eye, Info } from 'lucide-react';
import { LiveCameraDetector } from '../components/LiveCameraDetector';

interface LiveDetectionPageProps {
  onObservationAdded?: () => void;
}

export const LiveDetectionPage: React.FC<LiveDetectionPageProps> = ({ onObservationAdded }) => {
  return (
    <div className="space-y-6">
      {/* Page Title & Vision Explanation - RawBlock 5px border */}
      <div className="bg-white border-heavy border-black p-6 space-y-4">
        <div className="flex items-center space-x-2 text-black text-xs font-mono font-bold uppercase">
          <Eye className="w-4 h-4" />
          <span>EDGE COMPUTER VISION PIPELINE</span>
        </div>
        <h1 className="font-headline text-2xl text-black uppercase tracking-tight">
          LIVE AI ROAD DEFECT DETECTION STUDIO
        </h1>
        <p className="font-body text-xs text-black max-w-3xl leading-relaxed">
          Process vehicle dashcam footage, upload test road images, or stream live video from your device camera. The computer vision pipeline locates road cavities, isolates bounding boxes, and calculates explainable hazard metrics.
        </p>

        {/* Explainability Banner */}
        <div className="p-4 bg-[#F0F0F0] border-thick border-black flex items-start space-x-3 text-xs">
          <Info className="w-4 h-4 text-black mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-headline uppercase text-black">SPEC: MEASURED VS ESTIMATED</span>
            <p className="font-body text-black leading-relaxed">
              Standard monocular vehicle cameras lack physical depth stereoscopy. The system measures 
              <strong> 2D pixel coordinates, bounding box width/height, and relative road frame area ratio</strong>. 
              Severity is an explainable visual hazard estimate derived from road occupancy and texture contrast.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Live Camera Detector */}
      <LiveCameraDetector onObservationAdded={onObservationAdded} />
    </div>
  );
};
