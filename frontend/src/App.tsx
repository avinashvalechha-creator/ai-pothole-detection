import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { LiveDetectionPage } from './pages/LiveDetectionPage';
import { MapPage } from './pages/MapPage';
// import { ADASSimulatorPage } from './pages/ADASSimulatorPage'; // Simulator commented out for production
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

  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; label?: string; isGps?: boolean } | null>(null);

  const loadData = async () => {
    try {
      const [hList, hHealth] = await Promise.all([
        api.getHazards({ limit: 35000 }),
        api.getHealth(),
      ]);
      setHazards(hList);
      setHealth(hHealth);
    } catch (err) {
      console.warn('Initial data load error:', err);
    }
  };

  // Sync real-time hazards around location across full 5km radius
  const syncUserLocationData = async (lat: number, lon: number, isGps: boolean = false) => {
    try {
      setUserLocation({ lat, lon, isGps });
      const res = await api.syncLocationHazards(lat, lon, 5000);
      setUserLocation({ lat, lon, label: res.road_label, isGps });
      await loadData();
    } catch (e) {
      console.warn('Location sync notice:', e);
    }
  };

  // Prioritize GPS First & Watch Live Movement (Real-time Continuous GPS Tracking)
  // If user allows GPS: Continuous watchPosition moves the user marker live on the road.
  // If GPS is denied or unavailable: Falls back to IP location WITHOUT user marker.
  useEffect(() => {
    let gpsResolved = false;
    let watchId: number | null = null;
    let lastSyncedLat = 0;
    let lastSyncedLon = 0;

    // Helper to resolve geolocation via IP fallback
    const detectIpLocation = async () => {
      if (gpsResolved) return;
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const d = await res.json();
          if (d.latitude && d.longitude && !gpsResolved) {
            syncUserLocationData(d.latitude, d.longitude, false);
            return;
          }
        }
      } catch (_) {}

      try {
        const res2 = await fetch('https://ipwho.is/');
        if (res2.ok) {
          const d2 = await res2.json();
          if (d2.success && d2.latitude && d2.longitude && !gpsResolved) {
            syncUserLocationData(d2.latitude, d2.longitude, false);
            return;
          }
        }
      } catch (_) {}
    };

    // 1. Continuous Live Watch GPS Position
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          gpsResolved = true;
          const uLat = pos.coords.latitude;
          const uLon = pos.coords.longitude;

          // Always update marker in real time smoothly as user moves
          setUserLocation(prev => ({
            lat: uLat,
            lon: uLon,
            label: prev?.label || 'Live GPS Active',
            isGps: true
          }));

          // Re-sync 5km road defects if user has moved significantly (> 250 meters)
          const distMoved = Math.sqrt(
            Math.pow((uLat - lastSyncedLat) * 111000, 2) +
            Math.pow((uLon - lastSyncedLon) * 111000, 2)
          );

          if (lastSyncedLat === 0 || distMoved > 250) {
            lastSyncedLat = uLat;
            lastSyncedLon = uLon;
            api.syncLocationHazards(uLat, uLon, 5000)
              .then(res => {
                setUserLocation({ lat: uLat, lon: uLon, label: res.road_label, isGps: true });
                loadData();
              })
              .catch(() => {});
          }
        },
        (err) => {
          console.warn('GPS watch error/not granted, falling back to IP:', err.message);
          detectIpLocation();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
    } else {
      detectIpLocation();
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
    // Refresh every 60s in background
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectHazard = (h: RoadHazard) => {
    setSelectedHazard(h);
    setCurrentTab('map');
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#000000] flex flex-col font-sans selection:bg-[#000000] selection:text-[#FFFFFF] overflow-x-hidden w-full">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        health={health}
        onRefreshData={loadData}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigateTab={setCurrentTab}
            onSelectHazard={handleSelectHazard}
            hazards={hazards}
            health={health}
            userLocation={userLocation}
            onSyncLocation={syncUserLocationData}
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
            userLocation={userLocation}
            onSyncLocation={syncUserLocationData}
          />
        )}

        {/* ADAS Simulator commented out for production mode */}
        {/*
        {currentTab === 'simulator' && (
          <ADASSimulatorPage
            hazards={hazards}
          />
        )}
        */}

        {currentTab === 'analytics' && (
          <AnalyticsPage
            hazards={hazards}
            onSelectHazard={handleSelectHazard}
          />
        )}

        {/* API section commented out for production as requested (preserved intact) */}
        {/*
        {currentTab === 'api-docs' && (
          <ApiDocsPage />
        )}
        */}

        {currentTab === 'settings' && (
          <SettingsPage
            health={health}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* Global Engineering Footer - RawBlock Brutalism */}
      <footer className="border-t-[5px] border-[#000000] bg-[#FFFFFF] py-8 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-headline text-sm uppercase text-[#000000] tracking-wider">
            ROADSENSE RAW // ADAS POTHOLE INTELLIGENCE SYSTEM
          </p>
          <p className="font-mono text-[11px] text-[#000000] uppercase tracking-wide">
            RAWBLOCK BRUTALIST ARCHITECTURE | ZERO SHADOWS | SHARP EDGES | SYSTEM-LEVEL PERCEPTION
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
