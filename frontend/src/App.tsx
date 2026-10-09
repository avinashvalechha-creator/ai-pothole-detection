import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { LiveDetectionPage } from './pages/LiveDetectionPage';
import { MapPage } from './pages/MapPage';
import { ADASSimulatorPage } from './pages/ADASSimulatorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { SettingsPage } from './pages/SettingsPage';
import { RoadHazard, SystemHealth } from './services/types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [hazards, setHazards] = useState<RoadHazard[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<RoadHazard | null>(null);

  const loadData = async () => {
    try {
      const [hList, hHealth] = await Promise.all([
        api.getHazards({ limit: 200 }),
        api.getHealth(),
      ]);
      setHazards(hList);
      setHealth(hHealth);
    } catch (err) {
      console.warn('Initial data load error:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 15s in background
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectHazard = (h: RoadHazard) => {
    setSelectedHazard(h);
    setCurrentTab('map');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        health={health}
        onRefreshData={loadData}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigateTab={setCurrentTab}
            onSelectHazard={handleSelectHazard}
            hazards={hazards}
            health={health}
          />
        )}

        {currentTab === 'detect' && (
          <LiveDetectionPage
            onObservationAdded={loadData}
          />
        )}

        {currentTab === 'map' && (
          <MapPage
            hazards={hazards}
            selectedHazard={selectedHazard}
            setSelectedHazard={setSelectedHazard}
            onRefreshHazards={loadData}
          />
        )}

        {currentTab === 'simulator' && (
          <ADASSimulatorPage
            hazards={hazards}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsPage
            hazards={hazards}
            onSelectHazard={handleSelectHazard}
          />
        )}

        {currentTab === 'api-docs' && (
          <ApiDocsPage />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            health={health}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* Global Engineering Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-400">
            RoadSense AI - Automated Pothole Detection & Connected Vehicle Hazard Intelligence Platform
          </p>
          <p className="font-mono text-[11px] text-slate-600">
            College Minor Project | Computer Vision, Spatial Deduplication, Leaflet Map & ADAS Alert Simulation
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
