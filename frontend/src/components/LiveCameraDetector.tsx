import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Play, 
  Square, 
  MapPin, 
  Compass, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { VisionInferenceResult } from '../services/types';

interface LiveCameraDetectorProps {
  onObservationAdded?: () => void;
}

export const LiveCameraDetector: React.FC<LiveCameraDetectorProps> = ({ onObservationAdded }) => {
  const [mode, setMode] = useState<'upload' | 'webcam'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VisionInferenceResult | null>(null);

  // GPS & Telemetry
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [lat, setLat] = useState<number>(28.5388);
  const [lon, setLon] = useState<number>(77.3944);
  const [heading, setHeading] = useState<number>(45.0);
  const [deviceId, setDeviceId] = useState<string>('veh-dashcam-01');

  // Webcam states
  const [cameraActive, setCameraActive] = useState(false);
  const [isLiveInferencing, setIsLiveInferencing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveIntervalRef = useRef<any>(null);

  // Acquire real browser location if permitted
  const handleGetBrowserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
            setHeading(pos.coords.heading);
          }
        },
        (err) => {
          console.warn('Geolocation denied or unavailable:', err.message);
        }
      );
    }
  };

  // Start Webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      alert(`Could not access webcam: ${err.message}. Please verify camera permissions or use Image/Video upload mode.`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    stopLiveInference();
  };

  // Capture webcam frame as Blob
  const captureFrameBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current) return resolve(null);
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  };

  const processFrame = async (blob: Blob, autoSave: boolean = true) => {
    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');
      if (gpsEnabled) {
        formData.append('latitude', lat.toString());
        formData.append('longitude', lon.toString());
        formData.append('heading', heading.toString());
      }
      formData.append('device_id', deviceId);
      formData.append('save_to_database', autoSave.toString());

      const res = await api.runVisionInference(formData);
      setResult(res);
      if (autoSave && res.detections.length > 0 && onObservationAdded) {
        onObservationAdded();
      }
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureSnapshot = async () => {
    const blob = await captureFrameBlob();
    if (blob) {
      await processFrame(blob, true);
    }
  };

  const startLiveInference = () => {
    setIsLiveInferencing(true);
    liveIntervalRef.current = setInterval(async () => {
      const blob = await captureFrameBlob();
      if (blob) {
        await processFrame(blob, true);
      }
    }, 1200); // Analyze frame every 1.2s
  };

  const stopLiveInference = () => {
    setIsLiveInferencing(false);
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    await processFrame(selectedFile, true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Viewport / Input Stream Panel */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        {/* Stream Mode Selection Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => { setMode('upload'); stopCamera(); }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'upload' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Image / Video Upload</span>
            </button>
            <button
              onClick={() => setMode('webcam')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'webcam' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Vehicle Camera</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className={`w-2 h-2 rounded-full ${cameraActive || result ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span>{isProcessing ? 'INFERENCING...' : isLiveInferencing ? 'LIVE DETECTING' : 'READY'}</span>
          </div>
        </div>

        {/* Media Frame Viewer */}
        <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {mode === 'webcam' ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="p-3 bg-slate-900 rounded-full w-fit mx-auto border border-slate-800 text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Forward Vehicle Dashcam Feed</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/30 transition"
                  >
                    Activate Camera Stream
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {result?.annotated_image_base64 ? (
                <img
                  src={result.annotated_image_base64}
                  alt="AI Annotated Frame"
                  className="w-full h-full object-contain"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded Frame"
                  className="w-full h-full object-contain"
                />
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-900/50 transition border-2 border-dashed border-slate-800 rounded-xl p-6">
                  <Upload className="w-10 h-10 text-cyan-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-300">Choose Road Image or Video Frame</span>
                  <span className="text-xs text-slate-500 mt-1">JPEG, PNG, WebP up to 15MB</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </>
          )}

          {/* Canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {mode === 'webcam' ? (
            <div className="flex items-center space-x-2">
              {cameraActive ? (
                <>
                  <button
                    onClick={handleCaptureSnapshot}
                    disabled={isProcessing}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Single Snapshot</span>
                  </button>
                  {isLiveInferencing ? (
                    <button
                      onClick={stopLiveInference}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop Live Detection</span>
                    </button>
                  ) : (
                    <button
                      onClick={startLiveInference}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Continuous AI Scan</span>
                    </button>
                  )}
                  <button
                    onClick={stopCamera}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                  >
                    Disable Camera
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer border border-slate-700 transition">
                <span>Select New File</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {selectedFile && (
                <button
                  onClick={handleUploadSubmit}
                  disabled={isProcessing}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-600/30 transition"
                >
                  <Zap className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>{isProcessing ? 'Analyzing Frame...' : 'Run Pothole Detection'}</span>
                </button>
              )}
            </div>
          )}

          {result && (
            <div className="text-xs font-mono text-slate-400">
              Latency: <span className="text-cyan-400 font-bold">{result.inference_time_ms} ms</span> | Engine: <span className="text-slate-300">{result.model_used}</span>
            </div>
          )}
        </div>
      </div>

      {/* Geotagging & Telemetry Metadata Panel */}
      <div className="space-y-6">
        {/* GPS Geotag Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Location Metadata</h3>
            </div>
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={gpsEnabled}
                onChange={(e) => setGpsEnabled(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Attach GPS</span>
            </label>
          </div>

          {gpsEnabled ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Vehicle Heading (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={heading}
                    onChange={(e) => setHeading(parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Device ID</label>
                  <input
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetBrowserLocation}
                className="w-full mt-2 py-1.5 px-3 bg-slate-850 hover:bg-slate-800 text-cyan-400 rounded-lg text-xs font-medium border border-slate-800 transition"
              >
                Sync Device Browser GPS
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500 italic">
              Images will be processed visually as unlocated reports without mapping coordinates.
            </div>
          )}
        </div>

        {/* Inference Inspection Output */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Detection Output</h3>
            {result && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                result.total_potholes_found > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {result.total_potholes_found} Hazard(s)
              </span>
            )}
          </div>

          {result ? (
            <div className="space-y-3">
              {result.detections.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="font-semibold text-slate-200">No Road Cavities Detected</p>
                  <p className="text-[11px] text-slate-500">Surface appears continuous without prominent potholes.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.detections.map((d, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 uppercase font-mono">Pothole #{idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          d.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                          d.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          d.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {d.severity}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                        <div>Confidence: <strong className="text-white font-mono">{(d.confidence * 100).toFixed(0)}%</strong></div>
                        <div>Visual Area: <strong className="text-white font-mono">{(d.area_ratio * 100).toFixed(1)}%</strong></div>
                      </div>
                    </div>
                  ))}
                  <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300">
                    <span className="font-semibold">Cloud Ingestion:</span> Detections clustered into central hazard database.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 italic">
              Awaiting camera snapshot or image upload to run inference...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
