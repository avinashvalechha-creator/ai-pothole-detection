import React, { useEffect, useRef, useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Navigation2, 
  Gauge, 
  Compass,
  ShieldCheck,
  ShieldAlert
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
        // High urgency 2-tone alert
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1100, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (level === 'WARNING') {
        // Warning chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.setValueAtTime(780, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (level === 'CAUTION') {
        // Soft caution ping
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
    CRITICAL: 'border-rose-500/80 bg-rose-950/40 shadow-2xl shadow-rose-500/20 animate-pulse',
    WARNING: 'border-amber-500/80 bg-amber-950/40 shadow-2xl shadow-amber-500/20',
    CAUTION: 'border-yellow-500/80 bg-yellow-950/30 shadow-xl shadow-yellow-500/15',
    NONE: 'border-slate-800 bg-slate-900/80',
  }[level];

  return (
    <div className={`rounded-xl border p-5 transition-all backdrop-blur-md ${containerTheme}`}>
      {/* Top Banner & Sound Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
            SIMULATED ADAS HUD
          </div>
          <span className="text-xs text-slate-400">Forward Collision & Road Hazard Mitigation</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          title={soundEnabled ? 'Mute Alert Chimes' : 'Unmute Alert Chimes'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      {/* Main Alert Center */}
      <div className="py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Visual Badge & Message */}
        <div className="flex items-center space-x-4">
          {level === 'CRITICAL' ? (
            <div className="p-3.5 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/50 animate-bounce">
              <AlertOctagon className="w-8 h-8" />
            </div>
          ) : level === 'WARNING' ? (
            <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/50">
              <AlertTriangle className="w-8 h-8" />
            </div>
          ) : level === 'CAUTION' ? (
            <div className="p-3.5 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
              <AlertTriangle className="w-8 h-8" />
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-base font-extrabold font-mono tracking-wider ${
                level === 'CRITICAL' ? 'text-rose-400' :
                level === 'WARNING' ? 'text-amber-400' :
                level === 'CAUTION' ? 'text-yellow-400' : 'text-emerald-400'
              }`}>
                {level === 'NONE' ? 'FORWARD CORRIDOR CLEAR' : `ADAS ALERT: ${level}`}
              </span>
              {warning?.hazard_status && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                  warning.hazard_status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {warning.hazard_status}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-200 mt-1">
              {warning?.message || 'No hazardous road anomalies detected ahead.'}
            </p>
            {warning?.recommended_action && (
              <p className="text-xs font-mono text-cyan-400 mt-1.5 flex items-center space-x-1.5">
                <span className="font-semibold text-slate-400">Action:</span>
                <span>{warning.recommended_action}</span>
              </p>
            )}
          </div>
        </div>

        {/* Distance Countdown HUD Meter */}
        {warning?.distance_meters != null && level !== 'NONE' && (
          <div className="text-center bg-slate-950/70 border border-slate-800 rounded-xl p-3 px-6 min-w-[130px]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Threat Distance</span>
            <span className={`text-3xl font-black font-mono tracking-tight ${
              level === 'CRITICAL' ? 'text-rose-400' :
              level === 'WARNING' ? 'text-amber-400' : 'text-yellow-400'
            }`}>
              {warning.distance_meters.toFixed(0)}m
            </span>
            <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
              Cone angle: {warning.relative_angle_degrees?.toFixed(0)}°
            </span>
          </div>
        )}
      </div>

      {/* Telemetry Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>Speed: <strong className="text-white">{speedKmh.toFixed(0)} km/h</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Heading: <strong className="text-white">{heading.toFixed(0)}°</strong></span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 italic">
          *Informational driver alert prototype. Not certified for vehicle actuator/braking override.
        </div>
      </div>
    </div>
  );
};
