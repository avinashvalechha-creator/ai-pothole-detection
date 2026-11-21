import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  Activity, 
  MapPin, 
  Navigation, 
  BarChart3, 
  Code2, 
  Settings as SettingsIcon, 
  Camera,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { id: 'detect', label: 'Live Detect', icon: Camera },
    { id: 'map', label: 'Map', icon: MapPin },
    // { id: 'simulator', label: 'ADAS Sim', icon: Navigation }, // Simulator commented out for production
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    // { id: 'api-docs', label: 'API', icon: Code2 }, // Kept for production reference
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF] border-b-[5px] border-[#000000]">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none group shrink-0" 
            onClick={() => handleTabClick('dashboard')}
          >
            <div className="w-9 h-9 bg-[#000000] text-[#FFFFFF] border-[3px] border-[#000000] flex items-center justify-center font-headline text-base group-hover:bg-[#FFFFFF] group-hover:text-[#000000] transition-colors">
              P
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-headline text-base sm:text-lg tracking-wider text-[#000000]">ROADSENSE</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#000000] text-[#FFFFFF] font-bold uppercase tracking-wider">
                  RAW
                </span>
              </div>
              <p className="hidden sm:block text-[10px] font-mono uppercase text-[#000000] font-semibold tracking-wide">
                ROAD DEFECT PERCEPTION
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`px-2.5 xl:px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border-[3px] border-[#000000] transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#000000] text-[#FFFFFF]'
                      : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center space-x-2">
            {/* Status indicator */}
            <div className="flex items-center space-x-1.5 px-2 py-1.5 border-[2px] border-[#000000] bg-[#FFFFFF] text-[11px] font-mono font-bold uppercase shrink-0">
              <span className={`w-2.5 h-2.5 border border-[#000000] shrink-0 ${health?.status === 'online' ? 'bg-[#008000]' : 'bg-[#FFA500]'}`} />
              <span className="hidden sm:inline text-[#000000]">
                {health?.status === 'online' ? 'SYSTEM ACTIVE' : 'CONNECTING'}
              </span>
            </div>

            {/* Mobile / Tablet Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 border-[3px] border-[#000000] bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF] transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Dropdown Menu for Mobile & Tablet */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t-[5px] border-[#000000] bg-[#FFFFFF] p-4 shadow-none">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center justify-center space-x-1.5 p-2.5 text-xs font-mono font-bold uppercase tracking-wider border-[3px] border-[#000000] transition-colors ${
                    isActive
                      ? 'bg-[#000000] text-[#FFFFFF]'
                      : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t-[2px] border-[#000000] flex items-center justify-between text-xs font-mono">
            <span className="text-[#000000] font-bold uppercase">SYSTEM STATUS:</span>
            <span className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 ${health?.status === 'online' ? 'bg-[#008000]' : 'bg-[#FFA500]'}`} />
              <span className="font-bold">{health?.status === 'online' ? 'ACTIVE' : 'CONNECTING'}</span>
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
