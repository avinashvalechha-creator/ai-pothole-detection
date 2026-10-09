import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  Cpu, 
  Database, 
  Sliders, 
  Check, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { SystemSettings, SystemHealth } from '../services/types';
import { api } from '../services/api';

interface SettingsPageProps {
  health: SystemHealth | null;
  onRefreshData?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, onRefreshData }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSeed = async () => {
    if (!confirm('This will reset all current hazards and re-seed the standard demo scenario. Proceed?')) return;
    try {
      setSeeding(true);
      await api.seedData(true);
      if (onRefreshData) onRefreshData();
      alert('Database reset and demo hazards populated successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-center text-slate-400">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span>SYSTEM CALIBRATION & THRESHOLDS</span>
        </div>
        <h1 className="text-xl font-black text-white">Platform Configuration</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Configure spatial clustering sensitivity, crowdsourced verification thresholds, and in-cabin ADAS warning parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spatial & Verification Thresholds */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Spatial Clustering & Verification Logic</h2>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span>Cluster Radius (Meters):</span>
                <strong className="text-cyan-400">{settings.cluster_radius_meters}m</strong>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={settings.cluster_radius_meters}
                onChange={(e) => setSettings({ ...settings, cluster_radius_meters: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Maximum geodesic distance to coalesce observations into one road defect.</span>
            </div>

            <div>
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span>Min Observations for Verification:</span>
                <strong className="text-cyan-400">{settings.verification_min_observations}</strong>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.verification_min_observations}
                onChange={(e) => setSettings({ ...settings, verification_min_observations: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Total observation reports required to promote from provisional to verified.</span>
            </div>

            <div>
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span>Min Independent Vehicle Devices:</span>
                <strong className="text-cyan-400">{settings.verification_min_devices}</strong>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={settings.verification_min_devices}
                onChange={(e) => setSettings({ ...settings, verification_min_devices: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Guarantees reports originate from separate vehicles to prevent duplicate video frames counting.</span>
            </div>
          </div>
        </div>

        {/* ADAS Threat Cone & Computer Vision Sensitivity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">ADAS Driver Warning & AI Sensitivity</h2>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span>ADAS Warning Distance:</span>
                <strong className="text-cyan-400">{settings.adas_warning_distance_meters}m</strong>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={settings.adas_warning_distance_meters}
                onChange={(e) => setSettings({ ...settings, adas_warning_distance_meters: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Sensor preview horizon in front of traveling vehicle.</span>
            </div>

            <div>
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span>Warning Cone Angle:</span>
                <strong className="text-cyan-400">±{settings.adas_warning_cone_degrees}°</strong>
              </div>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                value={settings.adas_warning_cone_degrees}
                onChange={(e) => setSettings({ ...settings, adas_warning_cone_degrees: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Angular corridor matching vehicle heading with hazard bearing.</span>
            </div>

            <div>
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span>AI Confidence Gate:</span>
                <strong className="text-cyan-400">{Math.round(settings.confidence_threshold * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={settings.confidence_threshold}
                onChange={(e) => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Minimum detection score required for cloud ingestion.</span>
            </div>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="lg:col-span-2 flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/25 transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Updating...' : 'Save Parameters'}</span>
            </button>
            {savedSuccess && (
              <span className="flex items-center space-x-1 text-xs text-emerald-400 font-mono">
                <Check className="w-4 h-4" />
                <span>Configuration saved successfully!</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetSeed}
            disabled={seeding}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-800 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>Reset Database to Demo State</span>
          </button>
        </div>
      </form>
    </div>
  );
};
