import React from 'react';
import { ScrollReveal } from '../components/ScrollReveal';

interface HeroLandingSectionProps {
  onExploreMap: () => void;
  onLaunchDetector: () => void;
  onOpenAnalytics?: () => void;
  onLaunchSimulator?: () => void; // Preserved for compatibility
  totalHazards: number;
  verifiedHazards: number;
  userLocationLabel?: string;
}

export const HeroLandingSection: React.FC<HeroLandingSectionProps> = ({
  onExploreMap,
  onLaunchDetector,
  onOpenAnalytics,
  // onLaunchSimulator, // Simulator commented out for production
  totalHazards,
  verifiedHazards,
  userLocationLabel,
}) => {
  return (
    <section className="border-[5px] border-[#000000] bg-[#FFFFFF] p-4 sm:p-8 lg:p-12 mb-8">
      {/* Top Banner Chip */}
      <ScrollReveal direction="down" delay={30}>
        <div className="flex flex-wrap items-center justify-between border-b-[3px] border-[#000000] pb-4 mb-6 sm:mb-8 gap-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-3 h-3 bg-[#000000] inline-block shrink-0" />
            <span className="font-mono text-[10px] sm:text-xs uppercase font-bold tracking-[1px] sm:tracking-[2px] text-[#000000] break-words">
              SYSTEM // RAWBLOCK PERCEPTION ENGINE
            </span>
          </div>
          {userLocationLabel && (
            <div className="font-mono text-[10px] sm:text-xs uppercase font-bold tracking-wider px-2 py-0.5 border-[2px] border-[#000000] bg-[#F0F0F0] truncate max-w-full">
              LOC // {userLocationLabel}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Main Massive Headline */}
      <ScrollReveal direction="up" delay={80}>
        <h1 className="font-headline text-3xl sm:text-5xl lg:text-7xl uppercase tracking-tighter text-[#000000] leading-none mb-6">
          AI POTHOLE<br />
          DETECTION &amp; ROAD<br />
          INTELLIGENCE
        </h1>
      </ScrollReveal>

      {/* Body Text */}
      <ScrollReveal direction="up" delay={140}>
        <p className="font-body text-base sm:text-xl text-[#000000] max-w-3xl leading-relaxed mb-8">
          Autonomous computer vision hazard classification, multi-vehicle spatial consensus, and nationwide road defect mapping. Raw structural data without cosmetic embellishment.
        </p>
      </ScrollReveal>

      {/* Action Buttons - RawBlock Inversion (100% Productive) */}
      <ScrollReveal direction="up" delay={200}>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-10">
          <button
            onClick={onLaunchDetector}
            className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 bg-[#000000] text-[#FFFFFF] font-mono text-xs sm:text-sm font-bold uppercase tracking-[1px] sm:tracking-[2px] border-[3px] border-[#000000] hover:bg-[#FFFFFF] hover:text-[#000000] transition-colors text-center"
          >
            [1] LAUNCH LIVE DETECTOR
          </button>
          <button
            onClick={onExploreMap}
            className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 bg-[#FFFFFF] text-[#000000] font-mono text-xs sm:text-sm font-bold uppercase tracking-[1px] sm:tracking-[2px] border-[3px] border-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF] transition-colors text-center"
          >
            [2] EXPLORE HAZARD MAP
          </button>
          <button
            onClick={onOpenAnalytics || onExploreMap}
            className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 bg-[#FFFFFF] text-[#000000] font-mono text-xs sm:text-sm font-bold uppercase tracking-[1px] sm:tracking-[2px] border-[3px] border-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF] transition-colors text-center"
          >
            [3] AUDIT &amp; ANALYTICS
          </button>
        </div>
      </ScrollReveal>

      {/* Data Spec Grid (RawBlock Structural Blocks) */}
      <ScrollReveal direction="up" delay={260}>
        <div className="grid grid-cols-1 sm:grid-cols-3 border-t-[3px] border-l-[3px] border-[#000000]">
          <div className="p-3 sm:p-4 border-r-[3px] border-b-[3px] border-[#000000] bg-[#FFFFFF]">
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider block text-[#000000] mb-1">
              TOTAL HAZARDS
            </span>
            <span className="font-headline text-2xl sm:text-4xl text-[#000000]">
              {totalHazards}
            </span>
          </div>
          <div className="p-3 sm:p-4 border-r-[3px] border-b-[3px] border-[#000000] bg-[#FFFFFF]">
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider block text-[#000000] mb-1">
              VERIFIED BY FLEET
            </span>
            <span className="font-headline text-2xl sm:text-4xl text-[#008000]">
              {verifiedHazards}
            </span>
          </div>
          <div className="p-3 sm:p-4 border-r-[3px] border-b-[3px] border-[#000000] bg-[#FFFFFF]">
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider block text-[#000000] mb-1">
              COVERAGE
            </span>
            <span className="font-headline text-2xl sm:text-4xl text-[#000000]">
              INDIA
            </span>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
