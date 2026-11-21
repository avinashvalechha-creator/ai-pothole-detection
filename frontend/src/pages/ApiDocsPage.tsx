import React, { useState } from 'react';
import { 
  Code2, 
  Terminal, 
  ExternalLink, 
  Play, 
  Copy, 
  Check
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
      {/* Header - RawBlock 5px border */}
      <div className="bg-white border-heavy border-black p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-black text-xs font-mono font-bold uppercase mb-1">
            <Code2 className="w-4 h-4" />
            <span>OPEN REST API SPECIFICATION (V1)</span>
          </div>
          <h1 className="font-headline text-2xl text-black uppercase tracking-tight">
            DEVELOPER API & PARTNER INTEGRATION
          </h1>
          <p className="font-body text-xs text-black mt-1 max-w-2xl leading-relaxed">
            Standardized interfaces for navigation platforms, automotive telematics, fleet operators, and smart city road maintenance authorities.
          </p>
        </div>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 bg-black hover:bg-white text-white hover:text-black border-thick border-black font-headline text-xs uppercase tracking-wider transition flex items-center gap-2"
        >
          <span>[SWAGGER OPENAPI DOCS]</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b-thick border-black pb-2">
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 font-headline text-xs uppercase tracking-wider border-thick border-black transition ${
            activeTab === 'endpoints' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F0F0F0]'
          }`}
        >
          [REST ENDPOINTS & CONSOLE]
        </button>
        <button
          onClick={() => setActiveTab('sdk')}
          className={`px-4 py-2 font-headline text-xs uppercase tracking-wider border-thick border-black transition ${
            activeTab === 'sdk' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F0F0F0]'
          }`}
        >
          [PYTHON CLIENT SDK]
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2 font-headline text-xs uppercase tracking-wider border-thick border-black transition ${
            activeTab === 'partners' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F0F0F0]'
          }`}
        >
          [NAVIGATION PARTNER ARCHITECTURE]
        </button>
      </div>

      {/* Tab 1: Endpoints */}
      {activeTab === 'endpoints' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div key={ep.id} className="p-5 bg-white border-heavy border-black space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className="px-2 py-0.5 border-2 border-black font-headline text-[10px] uppercase bg-black text-white">
                      {ep.method}
                    </span>
                    <span className="font-bold text-black">{ep.path}</span>
                  </div>

                  {ep.sampleUrl && (
                    <button
                      onClick={() => testEndpoint(ep.sampleUrl!, ep.id)}
                      disabled={testingEndpoint === ep.id}
                      className="px-3 py-1 bg-black hover:bg-white text-white hover:text-black border-2 border-black text-xs font-headline uppercase transition flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3" />
                      <span>{testingEndpoint === ep.id ? '[TESTING...]' : '[LIVE TEST]'}</span>
                    </button>
                  )}
                </div>

                <p className="font-body text-xs text-black leading-relaxed">{ep.desc}</p>

                {/* cURL Snippet */}
                <div className="relative group">
                  <pre className="p-3 bg-[#F0F0F0] border-2 border-black text-[11px] font-mono text-black overflow-x-auto">
                    {ep.curl}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(ep.curl, ep.id)}
                    className="absolute top-2 right-2 p-1 bg-black text-white hover:bg-white hover:text-black border border-black transition"
                    title="Copy cURL"
                  >
                    {copiedKey === ep.id ? <Check className="w-3.5 h-3.5 text-[#008000]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Response Console */}
          <div className="bg-white border-heavy border-black p-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b-thick border-black pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-black" />
                <h3 className="font-headline text-xs uppercase tracking-wider text-black">LIVE RESPONSE INSPECTOR</h3>
              </div>
              {apiResponse && (
                <button
                  onClick={() => setApiResponse(null)}
                  className="font-headline text-xs text-black hover:underline uppercase"
                >
                  [CLEAR]
                </button>
              )}
            </div>

            <pre className="flex-1 p-4 bg-[#F0F0F0] border-2 border-black text-xs font-mono text-black overflow-y-auto max-h-[500px]">
              {apiResponse || '// Click [LIVE TEST] on any GET endpoint to inspect output payload.'}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 2: Python SDK Example */}
      {activeTab === 'sdk' && (
        <div className="bg-white border-heavy border-black p-6 space-y-4">
          <h2 className="font-headline text-base text-black uppercase">CLIENT INTEGRATION PROTOCOL (PYTHON)</h2>
          <p className="font-body text-xs text-black">
            Automotive edge client or telemetry forwarder integrating with the Road Intelligence Network.
          </p>

          <pre className="p-4 bg-[#F0F0F0] border-thick border-black text-xs font-mono text-black overflow-x-auto leading-relaxed">
{`import requests

API_HOST = "http://localhost:8000/api/v1"
API_KEY = "road-hazard-api-key-2026"

# 1. Query upcoming road hazards within 1000m
def get_nearby_hazards(lat, lon):
    response = requests.get(f"{API_HOST}/hazards/nearby", params={
        "lat": lat,
        "lon": lon,
        "radius_m": 1000
    })
    return response.json()

# 2. Ingest detected defect event from dashcam AI
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
        <div className="bg-white border-heavy border-black p-6 space-y-4">
          <h2 className="font-headline text-base text-black uppercase">NAVIGATION ECOSYSTEM INTEGRATION ARCHITECTURE</h2>
          <p className="font-body text-xs text-black leading-relaxed">
            Standard blueprint for integrating verified hazard feeds into consumer navigation platforms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-white border-thick border-black space-y-2 text-xs">
              <span className="font-headline text-black block uppercase">1. GEOJSON FEEDS</span>
              <p className="font-body text-black leading-relaxed">
                Platform provides high-frequency bbox queries conforming to standardized road hazard GeoJSON formats used by traffic operating centers.
              </p>
            </div>
            <div className="p-4 bg-white border-thick border-black space-y-2 text-xs">
              <span className="font-headline text-black block uppercase">2. OEM CONNECTED FLEET</span>
              <p className="font-body text-black leading-relaxed">
                Participating vehicle telemetry providers stream observations via anonymized device identifiers to verify road defects without personal data leakage.
              </p>
            </div>
            <div className="p-4 bg-white border-thick border-black space-y-2 text-xs">
              <span className="font-headline text-black block uppercase">3. IN-CABIN ADAS WARNING</span>
              <p className="font-body text-black leading-relaxed">
                In-cabin instrument clusters consume verified hazard layers to issue predictive audio/visual decelerate alerts 100m prior to impact.
              </p>
            </div>
          </div>

          <div className="p-3 bg-black text-white font-mono text-xs uppercase">
            [RAWBLOCK ARCHITECTURE]: ALL CONTRACTS IMPLEMENT HIGH-EFFICIENCY STANDARD JSON/REST SPECIFICATIONS.
          </div>
        </div>
      )}
    </div>
  );
};
