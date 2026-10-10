// frontend/components/ui/CameraCaptureModal.js
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, FlipHorizontal } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackUpload,
  title = 'Capture POD Document',
  maxSizeBytes = 1 * 1024 * 1024, // 1 MB
}) {
  const { isDark } = useTheme();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedSizeKb, setCapturedSizeKb] = useState(0);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check if multiple camera devices exist
  useEffect(() => {
    if (!isOpen) return;
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Start video stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError('');
    setStartingCamera(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
      setCameraError('Camera API is not supported on this browser. Please use standard file upload.');
      setStartingCamera(false);
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        // Fallback without facingMode constraint if first attempt fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setHasCamera(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was blocked by browser permissions. Please allow camera access in your URL bar, or click below to upload a file.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this computer. Please connect a webcam or use file upload.');
      } else {
        setCameraError('Unable to access camera: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setStartingCamera(false);
    }
  }, [facingMode, stopStream]);

  // Manage camera lifecycle based on modal state
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, capturedImage, startCamera, stopStream]);

  // Snap photo from video frame
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    // Create canvas matching video frame
    const canvas = document.createElement('canvas');
    let targetWidth = width;
    let targetHeight = height;
    const maxDim = 1280;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    const base64Data = canvas.toDataURL('image/jpeg', 0.72);
    const approxSizeKb = Math.round((base64Data.length * 0.75) / 1024);

    setCapturedImage(base64Data);
    setCapturedSizeKb(approxSizeKb);
    stopStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedSizeKb(0);
    startCamera();
  };

  // Confirm photo
  const handleConfirm = () => {
    if (!capturedImage) return;
    onCapture(capturedImage, capturedSizeKb);
    handleClose();
  };

  // Flip between front/rear camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleClose = () => {
    stopStream();
    setCapturedImage(null);
    setCapturedSizeKb(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[9999] overflow-hidden animate-in fade-in duration-150"
      style={{ zIndex: 9999 }}
    >
      <div className={`rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border overflow-hidden transition-all ${
        isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-400">Position signed receipt in frame and capture</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[460px] overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 max-w-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-rose-300">{cameraError}</p>
              <div className="pt-2 flex flex-col gap-2">
                {onFallbackUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onFallbackUpload();
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Select File From Device Instead
                  </button>
                )}
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Try Camera Again
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            /* Snapshot Preview */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured POD"
                className="max-h-[460px] w-auto max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20">
                Photo Captured • {capturedSizeKb} KB
              </div>
            </div>
          ) : (
            /* Live Camera Feed */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover min-h-[320px]"
              />

              {/* Viewfinder Target Framing Box */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-indigo-400/60 rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-400" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-400" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-400" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-400" />

                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white px-2 py-0.5 rounded-full">
                  Align Document Here
                </div>
              </div>

              {/* Camera Switcher (Flip Front/Rear) */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-all cursor-pointer"
                  title="Switch Camera"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              )}

              {startingCamera && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2 text-white text-xs font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Starting camera...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Photo</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] text-slate-400">
                {hasCamera && !cameraError ? (
                  <span>Hold document flat & steady</span>
                ) : (
                  <span>Camera not active</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Cancel
                </button>

                {hasCamera && !cameraError && (
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    disabled={startingCamera}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    <span>Capture Photo</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
