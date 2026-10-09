import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  MapPin, 
  Navigation, 
  BarChart3, 
  Code2, 
  Settings as SettingsIcon, 
  Camera, 
  Database,
  RefreshCw
} from 'lucide-react';
import { SystemHealth } from '../services/types';
import { api } from '../services/api';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  health: SystemHealth | null;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  health,
  onRefreshData 
}) => {
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await api.seedData(false);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to seed:', err);
    } finally {
      setSeeding(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'detect', label: 'Live Detection', icon: Camera },
    { id: 'map', label: 'Hazard Map', icon: MapPin },
    { id: 'simulator', label: 'ADAS Simulator', icon: Navigation },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'api-docs', label: 'API & Partners', icon: Code2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/20 text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-wider text-white">ROADSENSE AI</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                  ADAS V1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">AI Pothole Detection & Road Intelligence</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Health & Quick Action Indicators */}
          <div className="flex items-center space-x-3">
            {/* Health pill */}
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-850 border border-slate-800 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'online' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-slate-300">
                {health ? health.vision_engine.model_type : 'Connecting...'}
              </span>
            </div>

            {/* Quick Demo Seed */}
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Seed realistic sample road hazard telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Seed Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav strip */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 space-x-2 border-t border-slate-800 bg-slate-900/95 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
