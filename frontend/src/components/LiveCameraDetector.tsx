import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  SwitchCamera,
  UserCheck
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

  // Webcam & Camera selection states
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isLiveInferencing, setIsLiveInferencing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveIntervalRef = useRef<any>(null);

  // Query connected camera devices
  const updateAvailableDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
    } catch (err) {
      console.warn('Could not enumerate media devices:', err);
    }
  }, []);

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

  // Initial location fetch check on mount
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

  // Stop camera tracks helper
  const stopCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start Webcam with target facing mode or device ID
  const startCamera = async (targetFacing?: 'environment' | 'user', targetDevId?: string) => {
    stopCameraTracks();

    const facing = targetFacing || facingMode;
    const devId = targetDevId !== undefined ? targetDevId : selectedDeviceId;

    const constraints: MediaStreamConstraints = {
      video: devId
        ? { deviceId: { exact: devId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Initial camera constraints failed, attempting fallback:', firstErr);
        // Fallback to basic constraints if exact constraints fail
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setFacingMode(facing);

      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings ? activeTrack.getSettings() : null;
        if (settings?.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
        if (settings?.facingMode && (settings.facingMode === 'environment' || settings.facingMode === 'user')) {
          setFacingMode(settings.facingMode as 'environment' | 'user');
        }
      }

      await updateAvailableDevices();
    } catch (err: any) {
      alert(`Could not access webcam (${facing} mode): ${err.message}. Please verify camera permissions or switch to File Upload mode.`);
      setCameraActive(false);
    }
  };

  // Flip camera between Environment (Rear/Road) and User (Front/Cabin)
  const flipCamera = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedDeviceId(''); // Reset device ID so facingMode ideal constraint is prioritized
    if (cameraActive) {
      await startCamera(nextFacing, '');
    }
  };

  // Switch to specific camera device from select dropdown
  const handleDeviceChange = async (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    if (cameraActive) {
      await startCamera(facingMode, newDeviceId);
    }
  };

  const stopCamera = () => {
    stopCameraTracks();
    setCameraActive(false);
    stopLiveInference();
    setResult(null);
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

  // Helper to determine HUD banner content and color
  const renderHudStatusBanner = () => {
    if (!result) {
      return (
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-3 py-1.5 bg-[#000000]/80 text-[#FFFFFF] font-mono text-[11px] font-bold uppercase tracking-[1px] border-[2px] border-[#000000]">
          <span className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF00] animate-pulse inline-block" />
            <span>OPTICAL ROAD SCANNER READY</span>
          </span>
          <span className="text-[#A0A0A0]">
            {facingMode === 'environment' ? '📷 REAR / ROAD LENS' : '🤳 CABIN / FRONT LENS'}
          </span>
        </div>
      );
    }

    if (result.scene_type === 'face_detected') {
      return (
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-3 py-2 bg-[#1E3A8A] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[2px] border-[#3B82F6] shadow-lg">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-[#60A5FA]" />
            <span>👤 HUMAN FACE DETECTED // DRIVER ATTENTIVENESS MONITORED // POTHOLES MUTED</span>
          </div>
          <span className="text-[10px] bg-[#3B82F6] px-1.5 py-0.5 text-[#FFFFFF]">CABIN MODE</span>
        </div>
      );
    }

    if (result.scene_type === 'non_road_scene') {
      return (
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-3 py-2 bg-[#78350F] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[2px] border-[#F59E0B] shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
            <span>⚠️ NO ROAD SURFACE DETECTED (INDOOR / OBSTRUCTED SCENE)</span>
          </div>
          <span className="text-[10px] bg-[#D97706] px-1.5 py-0.5 text-[#FFFFFF]">NON-ROAD</span>
        </div>
      );
    }

    if (result.scene_type === 'pothole_detected' || result.detections.length > 0) {
      return (
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-3 py-2 bg-[#7F1D1D] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[2px] border-[#EF4444] shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#F87171]" />
            <span>🚨 POTHOLE HAZARD DETECTED // {result.detections.length} DEFECT(S) GEOTAGGED</span>
          </div>
          <span className="text-[10px] bg-[#DC2626] px-1.5 py-0.5 text-[#FFFFFF]">ACTIVE HAZARD</span>
        </div>
      );
    }

    return (
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-3 py-2 bg-[#064E3B] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[2px] border-[#10B981] shadow-lg">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          <span>✓ ROAD SURFACE CONFIRMED // NO CAVITIES DETECTED</span>
        </div>
        <span className="text-[10px] bg-[#059669] px-1.5 py-0.5 text-[#FFFFFF]">CLEAR ROAD</span>
      </div>
    );
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
              onClick={() => {
                setMode('webcam');
                if (!cameraActive) {
                  startCamera('environment');
                }
              }}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-[1px] border-[3px] border-[#000000] transition-colors ${
                mode === 'webcam' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]'
              }`}
            >
              [LIVE CAMERA]
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono font-bold uppercase text-[#000000]">
            {mode === 'webcam' && (
              <span className={`px-2 py-0.5 border-[2px] border-[#000000] ${facingMode === 'environment' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#3B82F6] text-[#FFFFFF]'}`}>
                {facingMode === 'environment' ? 'ROAD (BACK)' : 'CABIN (FRONT)'}
              </span>
            )}
            <div className="flex items-center space-x-1.5">
              <span className={`w-3 h-3 border-[2px] border-[#000000] ${cameraActive || result ? 'bg-[#008000]' : 'bg-[#000000]'}`} />
              <span>{isProcessing ? 'INFERENCING...' : isLiveInferencing ? 'LIVE DETECTING' : 'READY'}</span>
            </div>
          </div>
        </div>

        {/* Media Frame Viewer */}
        <div className="relative aspect-video w-full bg-[#111111] border-[3px] border-[#000000] flex items-center justify-center overflow-hidden">
          {mode === 'webcam' ? (
            <>
              {/* HUD Status Banner */}
              {cameraActive && renderHudStatusBanner()}

              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {/* Real-time Bounding Box Overlays on Live Video */}
              {cameraActive && result && (result.scene_type === 'pothole_detected' || (result.scene_type !== 'face_detected' && result.scene_type !== 'non_road_scene' && result.detections.length > 0)) && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {result.detections.map((det, idx) => {
                    const vidW = videoRef.current?.videoWidth || 640;
                    const vidH = videoRef.current?.videoHeight || 480;

                    // Handle normalized coordinates (0..1) or pixel coordinates
                    const top = det.y <= 1 ? det.y * 100 : (det.y / vidH) * 100;
                    const left = det.x <= 1 ? det.x * 100 : (det.x / vidW) * 100;
                    const width = det.w <= 1 ? det.w * 100 : (det.w / vidW) * 100;
                    const height = det.h <= 1 ? det.h * 100 : (det.h / vidH) * 100;

                    const color = det.severity === 'critical' ? '#FF0000' :
                                  det.severity === 'high' ? '#FF5500' :
                                  det.severity === 'medium' ? '#FFA500' : '#008000';

                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'absolute',
                          top: `${Math.max(0, Math.min(95, top))}%`,
                          left: `${Math.max(0, Math.min(95, left))}%`,
                          width: `${Math.max(3, Math.min(100 - left, width))}%`,
                          height: `${Math.max(3, Math.min(100 - top, height))}%`,
                          border: `3px solid ${color}`,
                          boxShadow: `0 0 10px ${color}`,
                        }}
                        className="transition-all duration-200"
                      >
                        <div
                          style={{ backgroundColor: color }}
                          className="text-[#FFFFFF] text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase tracking-wider inline-block -mt-5"
                        >
                          POTHOLE #{idx + 1} [{(det.confidence * 100).toFixed(0)}%]
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  <p className="font-headline text-lg uppercase text-[#FFFFFF]">ROAD / DASHCAM OPTICAL FEED</p>
                  <p className="font-mono text-xs text-[#A0A0A0] max-w-md mx-auto uppercase">
                    Defaults to rear camera for road inspection. Includes in-cabin face mute protection and non-road filtering.
                  </p>
                  <button
                    onClick={() => startCamera('environment')}
                    className="px-6 py-3 bg-[#FFFFFF] text-[#000000] font-mono text-xs font-bold uppercase tracking-[2px] border-[3px] border-[#FFFFFF] hover:bg-[#000000] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-colors"
                  >
                    ACTIVATE REAR ROAD CAMERA
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
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-[#E8E8E8] transition-colors border-[3px] border-dashed border-[#000000] p-6 bg-[#FFFFFF]">
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
            <div className="flex flex-wrap items-center gap-2">
              {cameraActive ? (
                <>
                  <button
                    onClick={flipCamera}
                    title="Switch between Rear (Road) and Front (Cabin/Selfie) Camera"
                    className="flex items-center space-x-1 px-3 py-2 bg-[#000000] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[3px] border-[#000000] hover:bg-[#FFFFFF] hover:text-[#000000] transition-colors"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span>{facingMode === 'environment' ? 'FLIP TO CABIN 🤳' : 'FLIP TO ROAD 📷'}</span>
                  </button>

                  {availableDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleDeviceChange(e.target.value)}
                      className="px-2 py-2 bg-[#F0F0F0] text-[#000000] font-mono text-xs font-bold uppercase border-[3px] border-[#000000] focus:outline-none"
                    >
                      {availableDevices.map((dev, i) => (
                        <option key={dev.deviceId || i} value={dev.deviceId}>
                          {dev.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

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
              ) : (
                <button
                  onClick={() => startCamera('environment')}
                  className="px-4 py-2 bg-[#000000] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-[1px] border-[3px] border-[#000000] hover:bg-[#FFFFFF] hover:text-[#000000] transition-colors"
                >
                  START CAMERA
                </button>
              )}
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
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border-[2px] border-[#000000] ${
                result.scene_type === 'face_detected' ? 'bg-[#1E3A8A] text-[#FFFFFF]' :
                result.scene_type === 'non_road_scene' ? 'bg-[#78350F] text-[#FFFFFF]' :
                result.total_potholes_found > 0 ? 'bg-[#FF0000] text-[#FFFFFF]' :
                'bg-[#008000] text-[#FFFFFF]'
              }`}>
                {result.scene_type === 'face_detected' ? 'FACE MUTED' :
                 result.scene_type === 'non_road_scene' ? 'NON-ROAD' :
                 `${result.total_potholes_found} HAZARD(S)`}
              </span>
            )}
          </div>

          {result ? (
            <div className="space-y-3">
              {/* Case 1: Face Detected */}
              {result.scene_type === 'face_detected' && (
                <div className="p-3.5 bg-[#EFF6FF] border-[3px] border-[#3B82F6] space-y-2 font-mono">
                  <div className="flex items-center space-x-2 text-[#1E40AF] font-bold text-xs uppercase">
                    <UserCheck className="w-4 h-4 text-[#2563EB]" />
                    <span>IN-CABIN DRIVER ATTENTIVENESS</span>
                  </div>
                  <p className="text-[11px] text-[#1E3A8A] leading-relaxed uppercase">
                    Human face/skin geometry identified in camera frame. Pothole scanning automatically suppressed to prevent false detections. Driver monitoring active.
                  </p>
                  <div className="text-[10px] text-[#2563EB] font-bold pt-1 border-t border-[#BFDBFE]">
                    TIP: Use [FLIP TO ROAD 📷] to switch to your rear camera facing the road surface.
                  </div>
                </div>
              )}

              {/* Case 3: Other / Indoor / Non-Road */}
              {result.scene_type === 'non_road_scene' && (
                <div className="p-3.5 bg-[#FFFBEB] border-[3px] border-[#D97706] space-y-2 font-mono">
                  <div className="flex items-center space-x-2 text-[#92400E] font-bold text-xs uppercase">
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                    <span>NON-ROAD ENVIRONMENT DETECTED</span>
                  </div>
                  <p className="text-[11px] text-[#78350F] leading-relaxed uppercase">
                    The camera is viewing an indoor, vertical, or non-asphalt surface. Pothole detection requires genuine asphalt road surface to prevent false positives.
                  </p>
                  <div className="text-[10px] text-[#B45309] font-bold pt-1 border-t border-[#FDE68A]">
                    STATUS: Road surface confidence below verification threshold.
                  </div>
                </div>
              )}

              {/* Case 2: Road Surface Confirmed */}
              {(result.scene_type === 'road_clear' || result.scene_type === 'pothole_detected') && (
                <>
                  {result.detections.length === 0 ? (
                    <div className="p-4 bg-[#F0FDF4] border-[3px] border-[#10B981] space-y-1 text-center font-mono text-xs uppercase">
                      <div className="font-bold text-[#065F46] flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span>ROAD SURFACE VERIFIED</span>
                      </div>
                      <p className="text-[11px] text-[#047857]">
                        Pothole hazard scanning active. Road surface clear of detectable defects.
                      </p>
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
                </>
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
