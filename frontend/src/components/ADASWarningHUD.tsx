import React, { useEffect, useRef, useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Gauge, 
  Compass
} from 'lucide-react';
import { ADASWarning } from '../services/types';

interface ADASWarningHUDProps {
  warning: ADASWarning | null;
  speedKmh: number;
  heading: number;
}

export const ADASWarningHUD: React.FC<ADASWarningHUDProps> = ({
  warning,
  speedKmh,
  heading,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastAlertLevelRef = useRef<string>('NONE');

  // Synthesize ADAS audio tones using Web Audio API
  const playAdasChime = (level: string) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (level === 'CRITICAL') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1100, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (level === 'WARNING') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.setValueAtTime(780, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (level === 'CAUTION') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  };

  useEffect(() => {
    if (warning && warning.alert_level !== 'NONE' && warning.alert_level !== lastAlertLevelRef.current) {
      playAdasChime(warning.alert_level);
    }
    lastAlertLevelRef.current = warning?.alert_level || 'NONE';
  }, [warning?.alert_level, warning?.distance_meters]);

  const level = warning?.alert_level || 'NONE';

  const containerTheme = {
    CRITICAL: 'bg-white border-heavy border-[#FF0000]',
    WARNING: 'bg-white border-heavy border-[#FFA500]',
    CAUTION: 'bg-white border-heavy border-[#FFA500]',
    NONE: 'bg-white border-heavy border-black',
  }[level];

  return (
    <div className={`p-6 transition-all ${containerTheme}`}>
      {/* Top Banner & Sound Toggle */}
      <div className="flex items-center justify-between pb-3 border-b-thick border-black">
        <div className="flex items-center space-x-2">
          <span className="font-headline text-xs uppercase bg-black text-white px-2 py-0.5 tracking-wider">
            ADAS HUD TELEMETRY
          </span>
          <span className="font-mono text-xs text-black">FORWARD COLLISION & DEFECT MITIGATION</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="px-2 py-1 bg-white text-black border-2 border-black font-mono text-xs hover:bg-black hover:text-white transition flex items-center gap-1.5"
          title={soundEnabled ? 'Mute Alert Chimes' : 'Unmute Alert Chimes'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? '[AUDIO ON]' : '[MUTED]'}</span>
        </button>
      </div>

      {/* Main Alert Center */}
      <div className="py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Visual Badge & Message */}
        <div className="flex items-start space-x-4">
          <div className={`w-14 h-14 flex items-center justify-center font-headline text-2xl font-bold border-thick border-black shrink-0 ${
            level === 'CRITICAL' ? 'bg-[#FF0000] text-white' :
            level === 'WARNING' ? 'bg-[#FFA500] text-black' :
            level === 'CAUTION' ? 'bg-white text-black' : 'bg-black text-white'
          }`}>
            {level === 'CRITICAL' ? '!' : level === 'WARNING' ? '▲' : level === 'CAUTION' ? '?' : '✓'}
          </div>

          <div>
            <div className="flex items-center space-x-3">
              <span className={`font-headline text-xl tracking-tight uppercase ${
                level === 'CRITICAL' ? 'text-[#FF0000]' :
                level === 'WARNING' ? 'text-[#FFA500]' :
                level === 'CAUTION' ? 'text-[#FFA500]' : 'text-black'
              }`}>
                {level === 'NONE' ? 'CORRIDOR CLEAR' : `ADAS ALERT: ${level}`}
              </span>
              {warning?.hazard_status && (
                <span className="px-2 py-0.5 border-2 border-black font-mono text-[11px] font-bold uppercase">
                  {warning.hazard_status}
                </span>
              )}
            </div>
            <p className="font-body text-base font-medium text-black mt-1">
              {warning?.message || 'No road defects detected in active forward vector.'}
            </p>
            {warning?.recommended_action && (
              <p className="font-mono text-xs text-black mt-2 bg-[#F0F0F0] border-2 border-black p-2 uppercase">
                <strong>RECOMMENDED ACTION:</strong> {warning.recommended_action}
              </p>
            )}
          </div>
        </div>

        {/* Distance Countdown HUD Meter */}
        {warning?.distance_meters != null && level !== 'NONE' && (
          <div className="text-center bg-[#F0F0F0] border-thick border-black p-4 min-w-[150px]">
            <span className="font-headline text-[10px] uppercase text-black block tracking-wider">THREAT DISTANCE</span>
            <span className={`font-headline text-4xl font-bold tracking-tight block my-1 ${
              level === 'CRITICAL' ? 'text-[#FF0000]' :
              level === 'WARNING' ? 'text-[#FFA500]' : 'text-black'
            }`}>
              {warning.distance_meters.toFixed(0)}M
            </span>
            <span className="font-mono text-[11px] text-black block">
              ANGLE: {warning.relative_angle_degrees?.toFixed(0)}°
            </span>
          </div>
        )}
      </div>

      {/* Telemetry Footer */}
      <div className="pt-3 border-t-thick border-black flex flex-wrap items-center justify-between text-xs font-mono text-black gap-3">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5">
            <Gauge className="w-3.5 h-3.5" />
            <span>SPEED: <strong className="font-headline">{speedKmh.toFixed(0)} KM/H</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>HEADING: <strong className="font-headline">{heading.toFixed(0)}°</strong></span>
          </div>
        </div>
        <div className="text-[11px] uppercase">
          RAWBLOCK SYSTEM PROTOCOL // ADAS MITIGATION SUITE
        </div>
      </div>
    </div>
  );
};
