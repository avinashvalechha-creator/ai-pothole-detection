import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Cpu, 
  Sliders, 
  Check, 
  RefreshCw
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
    return <div className="p-8 text-center font-mono text-black">LOADING CALIBRATION PARAMETERS...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header - RawBlock 5px border */}
      <div className="bg-white border-heavy border-black p-6 space-y-2">
        <div className="flex items-center space-x-2 text-black text-xs font-mono font-bold uppercase mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span>SYSTEM CALIBRATION & THRESHOLDS</span>
        </div>
        <h1 className="font-headline text-2xl text-black uppercase tracking-tight">
          PLATFORM CONFIGURATION
        </h1>
        <p className="font-body text-xs text-black max-w-2xl leading-relaxed">
          Configure spatial clustering sensitivity, crowdsourced verification thresholds, and in-cabin ADAS warning parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spatial & Verification Thresholds */}
        <div className="bg-white border-heavy border-black p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b-thick border-black pb-3">
            <Sliders className="w-4 h-4 text-black" />
            <h2 className="font-headline text-sm uppercase text-black">SPATIAL CLUSTERING & VERIFICATION</h2>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="font-headline uppercase">CLUSTER RADIUS:</span>
                <strong className="text-base">{settings.cluster_radius_meters}M</strong>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={settings.cluster_radius_meters}
                onChange={(e) => setSettings({ ...settings, cluster_radius_meters: parseFloat(e.target.value) })}
                className="w-full accent-black cursor-pointer"
              />
              <span className="text-[10px] text-black block uppercase">MAXIMUM GEODESIC DISTANCE TO COALESCE OBSERVATIONS.</span>
            </div>

            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="font-headline uppercase">MIN OBSERVATIONS:</span>
                <strong className="text-base">{settings.verification_min_observations}</strong>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.verification_min_observations}
                onChange={(e) => setSettings({ ...settings, verification_min_observations: parseInt(e.target.value) })}
                className="w-full accent-black cursor-pointer"
              />
              <span className="text-[10px] text-black block uppercase">TOTAL OBSERVATION REPORTS REQUIRED TO VERIFY.</span>
            </div>

            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="font-headline uppercase">MIN VEHICLES:</span>
                <strong className="text-base">{settings.verification_min_devices}</strong>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={settings.verification_min_devices}
                onChange={(e) => setSettings({ ...settings, verification_min_devices: parseInt(e.target.value) })}
                className="w-full accent-black cursor-pointer"
              />
              <span className="text-[10px] text-black block uppercase">INDEPENDENT DEVICE CHECKS TO PREVENT REPEATED FRAMES.</span>
            </div>
          </div>
        </div>

        {/* ADAS Threat Cone & Computer Vision Sensitivity */}
        <div className="bg-white border-heavy border-black p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b-thick border-black pb-3">
            <Cpu className="w-4 h-4 text-black" />
            <h2 className="font-headline text-sm uppercase text-black">ADAS DRIVER WARNING & AI</h2>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="font-headline uppercase">WARNING DISTANCE:</span>
                <strong className="text-base">{settings.adas_warning_distance_meters}M</strong>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={settings.adas_warning_distance_meters}
                onChange={(e) => setSettings({ ...settings, adas_warning_distance_meters: parseFloat(e.target.value) })}
                className="w-full accent-black cursor-pointer"
              />
              <span className="text-[10px] text-black block uppercase">SENSOR PREVIEW HORIZON IN FRONT OF VEHICLE.</span>
            </div>

            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="font-headline uppercase">WARNING CONE ANGLE:</span>
                <strong className="text-base">±{settings.adas_warning_cone_degrees}°</strong>
              </div>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                value={settings.adas_warning_cone_degrees}
                onChange={(e) => setSettings({ ...settings, adas_warning_cone_degrees: parseFloat(e.target.value) })}
                className="w-full accent-black cursor-pointer"
              />
              <span className="text-[10px] text-black block uppercase">ANGULAR CORRIDOR MATCHING HEADING WITH HAZARD BEARING.</span>
            </div>

            <div className="p-3 bg-[#F0F0F0] border-thick border-black space-y-2">
              <div className="flex justify-between items-center text-black">
                <span className="font-headline uppercase">AI CONFIDENCE GATE:</span>
                <strong className="text-base">{Math.round(settings.confidence_threshold * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={settings.confidence_threshold}
                onChange={(e) => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) })}
                className="w-full accent-black cursor-pointer"
              />
              <span className="text-[10px] text-black block uppercase">MINIMUM DETECTION SCORE FOR CLOUD INGESTION.</span>
            </div>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="lg:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-6 bg-white border-heavy border-black gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-black hover:bg-white text-white hover:text-black border-thick border-black font-headline text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '[UPDATING...]' : '[SAVE PARAMETERS]'}</span>
            </button>
            {savedSuccess && (
              <span className="flex items-center space-x-1.5 text-xs text-[#008000] font-mono font-bold uppercase">
                <Check className="w-4 h-4" />
                <span>SAVED SUCCESSFULLY</span>
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
