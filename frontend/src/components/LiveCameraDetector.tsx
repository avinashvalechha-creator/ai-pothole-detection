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
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('idle');
  const [isLiveGpsTracking, setIsLiveGpsTracking] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);

  // Webcam states
  const [cameraActive, setCameraActive] = useState(false);
  const [isLiveInferencing, setIsLiveInferencing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveIntervalRef = useRef<any>(null);

  // Acquire real browser location with high-accuracy GPS options
  const requestPreciseLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by this browser.');
      return;
    }

    setGpsLoading(true);
    setGpsStatus('Requesting high-precision GPS lock...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading: hdg } = pos.coords;
        setLat(Number(latitude.toFixed(6)));
        setLon(Number(longitude.toFixed(6)));
        setGpsAccuracy(accuracy ? Number(accuracy.toFixed(1)) : null);
        if (hdg !== null && !isNaN(hdg)) {
          setHeading(Number(hdg.toFixed(1)));
        }
        setGpsLoading(false);
        setGpsStatus(`GPS Locked (±${accuracy ? accuracy.toFixed(1) : '?'}m)`);
      },
      (err) => {
        setGpsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsStatus('Permission denied. Please allow location in your browser bar.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsStatus('Position unavailable. Check GPS/Network.');
            break;
          case err.TIMEOUT:
            setGpsStatus('GPS acquisition timed out. Retrying with fallback...');
            navigator.geolocation.getCurrentPosition(
              (fallbackPos) => {
                setLat(Number(fallbackPos.coords.latitude.toFixed(6)));
                setLon(Number(fallbackPos.coords.longitude.toFixed(6)));
                setGpsStatus('Approximate location locked');
              },
              () => setGpsStatus('Could not determine location.')
            );
            break;
          default:
            setGpsStatus(`Error: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Toggle Continuous Real-time Road GPS Tracking (e.g. while driving)
  const toggleLiveGpsTracking = () => {
    if (isLiveGpsTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveGpsTracking(false);
      setGpsStatus('Continuous tracking stopped');
    } else {
      if (!navigator.geolocation) {
        setGpsStatus('Geolocation not supported.');
        return;
      }
      setIsLiveGpsTracking(true);
      setGpsStatus('Continuous road GPS active...');
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading: hdg } = pos.coords;
          setLat(Number(latitude.toFixed(6)));
          setLon(Number(longitude.toFixed(6)));
          setGpsAccuracy(accuracy ? Number(accuracy.toFixed(1)) : null);
          if (hdg !== null && !isNaN(hdg)) {
            setHeading(Number(hdg.toFixed(1)));
          }
          setGpsStatus(`Tracking live: ±${accuracy ? accuracy.toFixed(1) : '?'}m`);
        },
        (err) => {
          setGpsStatus(`Tracking error: ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        }
      );
    }
  };

  // Attempt initial location fetch once on component mount if user has already granted permission
  useEffect(() => {
    if (navigator.geolocation && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        if (res.state === 'granted') {
          requestPreciseLocation();
        }
      }).catch(() => {});
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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
      {/* Viewport / Input Stream Panel - RawBlock */}
      <div className="lg:col-span-2 bg-[#FFFFFF] border-[5px] border-[#000000] p-6 space-y-4">
        {/* Stream Mode Selection Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b-[3px] border-[#000000] pb-4 gap-2">
          <div className="flex space-x-2">
            <button
              onClick={() => { setMode('upload'); stopCamera(); }}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-[1px] border-[3px] border-[#000000] transition-colors ${
                mode === 'upload' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
              }`}
            >
              [FILE UPLOAD]
            </button>
            <button
              onClick={() => setMode('webcam')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-[1px] border-[3px] border-[#000000] transition-colors ${
                mode === 'webcam' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
              }`}
            >
              [LIVE CAMERA]
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-[#000000]">
            <span className={`w-3 h-3 border-[2px] border-[#000000] ${cameraActive || result ? 'bg-[#008000]' : 'bg-[#000000]'}`} />
            <span>{isProcessing ? 'INFERENCING...' : isLiveInferencing ? 'LIVE DETECTING' : 'READY'}</span>
          </div>
        </div>

        {/* Media Frame Viewer */}
        <div className="relative aspect-video w-full bg-[#F0F0F0] border-[3px] border-[#000000] flex items-center justify-center overflow-hidden">
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
                  <p className="font-headline text-lg uppercase text-[#000000]">FORWARD DASHCAM FEED</p>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-[#000000] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[2px] border-[3px] border-[#000000] hover:bg-[#FFFFFF] hover:text-[#000000] transition-colors"
                  >
                    ACTIVATE CAMERA STREAM
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
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-[#E8E8E8] transition-colors border-[3px] border-dashed border-[#000000] p-6">
                  <span className="font-headline text-lg uppercase text-[#000000] mb-2">[ CHOOSE ROAD IMAGE / VIDEO FRAME ]</span>
                  <span className="font-mono text-xs text-[#000000] uppercase">JPEG, PNG, WEBP (RAW RESOLUTION)</span>
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
                    className="px-4 py-2 bg-[#000000] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[3px] border-[#000000] hover:bg-[#FFFFFF] hover:text-[#000000] transition-colors"
                  >
                    SINGLE SNAPSHOT
                  </button>
                  {isLiveInferencing ? (
                    <button
                      onClick={stopLiveInference}
                      className="px-4 py-2 bg-[#FF0000] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[3px] border-[#000000] hover:bg-[#000000] hover:text-[#FF0000] transition-colors"
                    >
                      STOP SCAN
                    </button>
                  ) : (
                    <button
                      onClick={startLiveInference}
                      className="px-4 py-2 bg-[#008000] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[3px] border-[#000000] hover:bg-[#000000] hover:text-[#008000] transition-colors"
                    >
                      START CONTINUOUS AI SCAN
                    </button>
                  )}
                  <button
                    onClick={stopCamera}
                    className="px-3 py-2 bg-[#FFFFFF] text-[#000000] font-mono text-xs font-bold uppercase tracking-[1px] border-[3px] border-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF] transition-colors"
                  >
                    DISABLE CAMERA
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <label className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#000000] hover:text-[#FFFFFF] text-[#000000] text-xs font-mono font-bold uppercase tracking-[1px] border-[3px] border-[#000000] cursor-pointer transition-colors">
                <span>SELECT NEW FILE</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {selectedFile && (
                <button
                  onClick={handleUploadSubmit}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#000000] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#000000] text-xs font-mono font-bold uppercase tracking-[2px] border-[3px] border-[#000000] transition-colors"
                >
                  {isProcessing ? 'ANALYZING...' : 'RUN POTHOLE DETECTION'}
                </button>
              )}
            </div>
          )}

          {result && (
            <div className="text-xs font-mono font-bold uppercase text-[#000000]">
              LATENCY: <span className="text-[#0000FF]">{result.inference_time_ms} MS</span> | ENGINE: {result.model_used}
            </div>
          )}
        </div>
      </div>

      {/* Geotagging & Telemetry Metadata Panel - RawBlock */}
      <div className="space-y-6">
        <div className="bg-[#FFFFFF] border-[5px] border-[#000000] p-6 space-y-4">
          <div className="flex items-center justify-between border-b-[3px] border-[#000000] pb-3">
            <h3 className="font-headline text-sm uppercase text-[#000000]">LOCATION METADATA</h3>
            <label className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-[#000000] cursor-pointer">
              <input
                type="checkbox"
                checked={gpsEnabled}
                onChange={(e) => setGpsEnabled(e.target.checked)}
                className="w-5 h-5 border-[3px] border-[#000000] rounded-none accent-[#000000]"
              />
              <span>ATTACH GPS</span>
            </label>
          </div>

          {gpsEnabled ? (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="font-headline text-[12px] uppercase block mb-1 text-[#000000]">LATITUDE</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="w-full bg-[#F0F0F0] border-[3px] border-[#000000] focus:border-[5px] focus:outline-none p-2 font-mono text-sm text-[#000000] font-bold"
                />
              </div>
              <div>
                <label className="font-headline text-[12px] uppercase block mb-1 text-[#000000]">LONGITUDE</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}
                  className="w-full bg-[#F0F0F0] border-[3px] border-[#000000] focus:border-[5px] focus:outline-none p-2 font-mono text-sm text-[#000000] font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-headline text-[12px] uppercase block mb-1 text-[#000000]">HEADING (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={heading}
                    onChange={(e) => setHeading(parseFloat(e.target.value))}
                    className="w-full bg-[#F0F0F0] border-[3px] border-[#000000] focus:border-[5px] focus:outline-none p-2 font-mono text-sm text-[#000000] font-bold"
                  />
                </div>
                <div>
                  <label className="font-headline text-[12px] uppercase block mb-1 text-[#000000]">DEVICE ID</label>
                  <input
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full bg-[#F0F0F0] border-[3px] border-[#000000] focus:border-[5px] focus:outline-none p-2 font-mono text-sm text-[#000000] font-bold"
                  />
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-3 bg-[#F0F0F0] border-[3px] border-[#000000] space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                  <span>GPS LOCK:</span>
                  <span className={gpsAccuracy ? 'text-[#008000]' : 'text-[#000000]'}>{gpsStatus}</span>
                </div>
                {gpsAccuracy !== null && (
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                    <span>ACCURACY:</span>
                    <span>±{gpsAccuracy} METERS</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={requestPreciseLocation}
                  disabled={gpsLoading}
                  className="py-2 px-3 bg-[#000000] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#000000] border-[3px] border-[#000000] font-mono text-xs font-bold uppercase tracking-[1px] transition-colors"
                >
                  {gpsLoading ? 'ACQUIRING...' : 'FETCH GPS'}
                </button>
                <button
                  type="button"
                  onClick={toggleLiveGpsTracking}
                  className={`py-2 px-3 font-mono text-xs font-bold uppercase tracking-[1px] border-[3px] border-[#000000] transition-colors ${
                    isLiveGpsTracking ? 'bg-[#FF0000] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
                  }`}
                >
                  {isLiveGpsTracking ? 'STOP TRACK' : 'LIVE TRACK'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#F0F0F0] border-[3px] border-[#000000] font-mono text-xs text-[#000000] uppercase">
              IMAGES PROCESSED VISUALLY WITHOUT GEOTAGGING.
            </div>
          )}
        </div>

        {/* Inference Inspection Output */}
        <div className="bg-[#FFFFFF] border-[5px] border-[#000000] p-6 space-y-3">
          <div className="flex items-center justify-between border-b-[3px] border-[#000000] pb-3">
            <h3 className="font-headline text-sm uppercase text-[#000000]">DETECTION OUTPUT</h3>
            {result && (
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border-[2px] border-[#000000] bg-[#000000] text-[#FFFFFF]">
                {result.total_potholes_found} HAZARD(S)
              </span>
            )}
          </div>

          {result ? (
            <div className="space-y-3">
              {result.detections.length === 0 ? (
                <div className="p-4 bg-[#F0F0F0] border-[3px] border-[#000000] text-center font-mono text-xs uppercase text-[#000000]">
                  NO ROAD DEFECTS DETECTED.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#008000] text-[#FFFFFF] font-mono font-bold text-xs flex items-center justify-between uppercase">
                    <span>✓ {result.detections.length} DEFECT(S) GEOTAGGED</span>
                    <span className="text-[10px] underline">MAPPED TO GPS</span>
                  </div>
                  {result.detections.map((d, idx) => (
                    <div key={idx} className="p-3 bg-[#FFFFFF] border-[3px] border-[#000000] space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase">POTHOLE #{idx + 1}</span>
                        <span className={`px-2 py-0.5 border-[2px] font-bold uppercase ${
                          d.severity === 'critical' ? 'border-[#FF0000] text-[#FF0000]' :
                          d.severity === 'high' ? 'border-[#FFA500] text-[#FFA500]' :
                          d.severity === 'medium' ? 'border-[#FFA500] text-[#FFA500]' : 'border-[#008000] text-[#008000]'
                        }`}>
                          {d.severity}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t-[1px] border-[#000000]">
                        <div>CONF: {(d.confidence * 100).toFixed(0)}%</div>
                        <div>AREA: {(d.area_ratio * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-[#F0F0F0] border-[2px] border-dashed border-[#000000] text-center font-mono text-xs uppercase text-[#000000]">
              AWAITING SNAPSHOT OR FILE UPLOAD...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
