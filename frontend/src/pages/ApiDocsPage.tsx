import React, { useState } from 'react';
import { 
  Code2, 
  Terminal, 
  ExternalLink, 
  Play, 
  Copy, 
  Check, 
  ShieldCheck, 
  Key, 
  Layers 
} from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'sdk' | 'partners'>('endpoints');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const testEndpoint = async (url: string, id: string) => {
    try {
      setTestingEndpoint(id);
      const res = await fetch(url);
      const json = await res.json();
      setApiResponse(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setTestingEndpoint(null);
    }
  };

  const endpoints = [
    {
      id: 'get-hazards',
      method: 'GET',
      path: '/api/v1/hazards',
      desc: 'Retrieve verified and provisional road hazards with optional spatial bounding box (min_lat,min_lon,max_lat,max_lon).',
      sampleUrl: '/api/v1/hazards?limit=5',
      curl: `curl -X GET "http://localhost:8000/api/v1/hazards?limit=10"`,
    },
    {
      id: 'get-nearby',
      method: 'GET',
      path: '/api/v1/hazards/nearby',
      desc: 'Query hazards within a radius (radius_m) of current GPS position. Returns calculated geodesic distance.',
      sampleUrl: '/api/v1/hazards/nearby?lat=28.5385&lon=77.3940&radius_m=1500',
      curl: `curl -X GET "http://localhost:8000/api/v1/hazards/nearby?lat=28.5385&lon=77.3940&radius_m=1500"`,
    },
    {
      id: 'post-obs',
      method: 'POST',
      path: '/api/v1/observations',
      desc: 'Ingest single road pothole observation from vehicle camera or mobile sensor client.',
      sampleUrl: null,
      curl: `curl -X POST "http://localhost:8000/api/v1/observations" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: road-hazard-api-key-2026" \\
  -d '{"device_id":"veh-sim-01","latitude":28.5388,"longitude":77.3944,"confidence":0.92,"severity":"critical","area_ratio":0.11,"source_type":"dashcam"}'`,
    },
    {
      id: 'post-eval',
      method: 'POST',
      path: '/api/v1/simulator/evaluate-threat',
      desc: 'Evaluate vehicle GPS and compass heading against forward hazard corridor to generate ADAS warnings.',
      sampleUrl: null,
      curl: `curl -X POST "http://localhost:8000/api/v1/simulator/evaluate-threat" \\
  -H "Content-Type: application/json" \\
  -d '{"device_id":"veh-adas-01","latitude":28.5378,"longitude":77.3934,"heading":50.0,"speed_kmh":45.0}'`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold mb-1">
            <Code2 className="w-4 h-4" />
            <span>OPEN REST API SPECIFICATION (V1)</span>
          </div>
          <h1 className="text-xl font-black text-white">Developer API & Partner Integration</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Standardized interfaces for navigation platforms, automotive telematics, fleet operators, and smart city road maintenance authorities.
          </p>
        </div>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl text-xs font-bold transition"
        >
          <span>Open Interactive Swagger Docs</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'endpoints' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          REST Endpoints & Live Console
        </button>
        <button
          onClick={() => setActiveTab('sdk')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'sdk' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Python Client Example
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'partners' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Navigation Integration Architecture
        </button>
      </div>

      {/* Tab 1: Endpoints */}
      {activeTab === 'endpoints' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div key={ep.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="text-white font-semibold">{ep.path}</span>
                  </div>

                  {ep.sampleUrl && (
                    <button
                      onClick={() => testEndpoint(ep.sampleUrl!, ep.id)}
                      disabled={testingEndpoint === ep.id}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-semibold transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>{testingEndpoint === ep.id ? 'Calling...' : 'Live Test'}</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{ep.desc}</p>

                {/* cURL Snippet */}
                <div className="relative group">
                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                    {ep.curl}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(ep.curl, ep.id)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 opacity-80 group-hover:opacity-100 transition"
                    title="Copy cURL"
                  >
                    {copiedKey === ep.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Response Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Live API Response Inspector</h3>
              </div>
              {apiResponse && (
                <button
                  onClick={() => setApiResponse(null)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>

            <pre className="flex-1 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-y-auto max-h-[500px]">
              {apiResponse || '// Click "Live Test" on any GET endpoint above to inspect JSON response.'}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 2: Python SDK Example */}
      {activeTab === 'sdk' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white">Client Integration Script (Python)</h2>
          <p className="text-xs text-slate-400">
            Automotive edge client or telemetry forwarder integrating with the Road Intelligence Network.
          </p>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
{`import requests

API_HOST = "http://localhost:8000/api/v1"
API_KEY = "road-hazard-api-key-2026"

# 1. Connected Vehicle query for upcoming hazards within 1000m
def get_nearby_hazards(lat, lon):
    response = requests.get(f"{API_HOST}/hazards/nearby", params={
        "lat": lat,
        "lon": lon,
        "radius_m": 1000
    })
    return response.json()

# 2. Ingest a detected pothole event from dashcam AI
def submit_observation(device_id, lat, lon, confidence, area_ratio, severity):
    payload = {
        "device_id": device_id,
        "latitude": lat,
        "longitude": lon,
        "confidence": confidence,
        "area_ratio": area_ratio,
        "severity": severity,
        "source_type": "dashcam"
    }
    headers = {"X-API-Key": API_KEY}
    response = requests.post(f"{API_HOST}/observations", json=payload, headers=headers)
    return response.json()

# 3. Evaluate real-time ADAS directional warning
def check_adas_warning(lat, lon, heading, speed_kmh):
    payload = {
        "device_id": "veh-fleet-alpha",
        "latitude": lat,
        "longitude": lon,
        "heading": heading,
        "speed_kmh": speed_kmh
    }
    response = requests.post(f"{API_HOST}/simulator/evaluate-threat", json=payload)
    return response.json()
`}
          </pre>
        </div>
      )}

      {/* Tab 3: Navigation Architecture Roadmap */}
      {activeTab === 'partners' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white">Map Application & Navigation Integration Design</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Design blueprint for integrating hazard feeds into consumer navigation platforms such as Google Maps, Apple Maps, Mappls, HERE, and TomTom.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-cyan-400 block font-mono">1. GeoJSON Feeds</span>
              <p className="text-slate-400 leading-relaxed">
                Platform provides high-frequency bbox queries conforming to standardized road hazard GeoJSON formats used by traffic operating centers.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-cyan-400 block font-mono">2. OEM Connected Fleet</span>
              <p className="text-slate-400 leading-relaxed">
                Participating vehicle telemetry providers stream observations via anonymized device identifiers to verify road defects without personal data leakage.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-cyan-400 block font-mono">3. Automotive ADAS Warn</span>
              <p className="text-slate-400 leading-relaxed">
                In-cabin instrument clusters consume verified hazard layers to issue predictive audio/visual decelerate alerts 100m prior to impact.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 italic">
            *Academic Disclosure: This prototype implements compatible open REST endpoints. It does not claim direct affiliation or active production data ingestion into proprietary proprietary third-party navigation apps.
          </div>
        </div>
      )}
    </div>
  );
};
