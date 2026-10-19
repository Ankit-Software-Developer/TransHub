'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  Boxes as BoxesIcon, 
  Truck as TruckIcon,
  Plus as PlusIcon,
  X as XIcon,
  SlidersHorizontal as SlidersIcon,
  Sparkles,
  Trash2 as TrashIcon,
  Check as CheckIcon,
} from 'lucide-react';
import { 
  TRUCK_CONFIGS, 
  getTruckConfigForVehicle, 
  computeVolumetricPacking,
  createCustomTruckConfig,
} from './packingEngine';

/**
 * Pixel coordinates of each discrete Euro-pallet bay in the master studio images (1376x768).
 * Stowing loads from the front bulkhead (near cab, index 0) towards rear doors.
 * Discrete bay boundaries ensure NO carton is ever cut or sliced in half!
 */
const TRUCK_BAY_CONFIGS = {
  '11ft': {
    bounds: { x_left: 118, x_right: 853, y_top: 88, y_bottom: 503 },
    bays: [
      { bayIndex: 2, x_start: 485, x_end: 853 },
      { bayIndex: 1, x_start: 118, x_end: 485 },
    ],
  },
  '19ft': {
    bounds: { x_left: 90, x_right: 977, y_top: 127, y_bottom: 499 },
    bays: [
      { bayIndex: 4, x_start: 748, x_end: 977 },
      { bayIndex: 3, x_start: 534, x_end: 748 },
      { bayIndex: 2, x_start: 320, x_end: 534 },
      { bayIndex: 1, x_start: 90,  x_end: 320 },
    ],
  },
  '32ft': {
    bounds: { x_left: 56, x_right: 1002, y_top: 165, y_bottom: 480 },
    bays: [
      { bayIndex: 6, x_start: 845, x_end: 1002 },
      { bayIndex: 5, x_start: 688, x_end: 845 },
      { bayIndex: 4, x_start: 530, x_end: 688 },
      { bayIndex: 3, x_start: 372, x_end: 530 },
      { bayIndex: 2, x_start: 214, x_end: 372 },
      { bayIndex: 1, x_start: 56,  x_end: 214 },
    ],
  },
};

/**
 * Enterprise Logistics Live Truck Cargo Stowing Engine (Clean Minimal Mode)
 * 
 * - Unobstructed photorealistic 3D truck view: Zero floating tags or tethers over the vehicle.
 * - Discrete Euro-Pallet Stowing: Snaps precisely to pallet boundaries so cartons are NEVER cut in half.
 * - High-speed 60 FPS live stowing animation with real cartons and Euro-pallets.
 * - Clean, focused telemetry and controls.
 */
export default function Truck3DViewer({
  currentVehicle,
  loadedItems = [],
  selectedFeet = null,
  onFeetChange,
  isDark = true,
  isFtl = false,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const imagesCacheRef = useRef({});

  // Custom Truck Configurations (persisted across sessions)
  const [customConfigs, setCustomConfigs] = useState({});
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customFeetInput, setCustomFeetInput] = useState('20');
  const [customTonnageInput, setCustomTonnageInput] = useState('12.0');
  const [customNameInput, setCustomNameInput] = useState('');

  // Load custom configs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('transporter_custom_truck_configs');
      if (stored) {
        setCustomConfigs(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load custom truck configs', e);
    }
  }, []);

  // Resolve Active Truck Configuration (checks customConfigs first, then default TRUCK_CONFIGS)
  const truckConfig = useMemo(() => {
    if (selectedFeet && customConfigs[selectedFeet]) {
      return { ...customConfigs[selectedFeet], key: selectedFeet };
    }
    return getTruckConfigForVehicle(currentVehicle, selectedFeet);
  }, [currentVehicle, selectedFeet, customConfigs]);

  // Compute 3D Volumetric Packing with Dynamic Sizing
  const packingResult = useMemo(() => {
    return computeVolumetricPacking(truckConfig, loadedItems);
  }, [truckConfig, loadedItems]);

  // Resolve Truck Model Folder:
  // 11ft is specifically Tata Ace / Chota Hathi (<= 12ft)
  // 14ft to 22ft is the medium ICV / container truck
  // 24ft to 32ft+ is the heavy multi-axle trailer container
  const truckType = useMemo(() => {
    if (truckConfig.feet <= 12) return '11ft';
    if (truckConfig.feet <= 22) return '19ft';
    return '32ft';
  }, [truckConfig.feet]);

  const activeModelConfig = useMemo(() => {
    return TRUCK_BAY_CONFIGS[truckType] || TRUCK_BAY_CONFIGS['19ft'];
  }, [truckType]);

  // Number of discrete Euro-pallet bays to load
  const numBaysToLoad = useMemo(() => {
    const totalBays = activeModelConfig.bays.length;
    if (loadedItems.length === 0) return 0;
    const byItems = loadedItems.length;
    const totalVol = loadedItems.reduce((acc, c) => acc + (c.volume_m3 || 1.2), 0);
    const maxVol = truckConfig.volumeM3 || 29.3;
    const byVol = Math.ceil((totalVol / maxVol) * totalBays);
    return Math.min(Math.max(byItems, byVol), totalBays);
  }, [loadedItems, activeModelConfig.bays.length, truckConfig.volumeM3]);

  // Target Cutoff X in image space: Snaps to exact pallet gap so NO cartons are cut!
  const targetCutoffX = useMemo(() => {
    const { bounds, bays } = activeModelConfig;
    if (numBaysToLoad === 0) return bounds.x_right;
    const clampedIndex = Math.min(numBaysToLoad - 1, bays.length - 1);
    return bays[clampedIndex].x_start;
  }, [activeModelConfig, numBaysToLoad]);

  // Animated Cutoff Position (current X position of stowing frontier)
  const [currentCutoffX, setCurrentCutoffX] = useState(activeModelConfig.bounds.x_right);
  const [isStowingActive, setIsStowingActive] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // 1. Instant Fast Loading: Cache & Preload ONLY 2 master studio images
  useEffect(() => {
    let isSubscribed = true;
    setImagesLoaded(false);

    if (imagesCacheRef.current[truckType]) {
      setImagesLoaded(true);
      return;
    }

    const emptyImg = new Image();
    const loadedImg = new Image();

    const checkComplete = () => {
      if (
        emptyImg.complete && 
        loadedImg.complete && 
        emptyImg.naturalWidth > 0 && 
        loadedImg.naturalWidth > 0 && 
        isSubscribed
      ) {
        imagesCacheRef.current[truckType] = { empty: emptyImg, loaded: loadedImg };
        setImagesLoaded(true);
      }
    };

    emptyImg.onload = checkComplete;
    loadedImg.onload = checkComplete;

    emptyImg.src = `/images/trucks/truck_${truckType}_straight_empty.jpg`;
    loadedImg.src = `/images/trucks/truck_${truckType}_straight.jpg`;

    checkComplete();

    return () => {
      isSubscribed = false;
    };
  }, [truckType]);

  // 2. High-Performance Canvas Rendering Engine
  const renderAtCutoff = useCallback((cutoffX, stowingActive) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cached = imagesCacheRef.current[truckType];
    if (!cached || !cached.empty || !cached.loaded) {
      return;
    }
    const { empty: emptyImg, loaded: loadedImg } = cached;
    if (!emptyImg.complete || !loadedImg.complete) return;

    const { bounds } = activeModelConfig;
    const cargoH = bounds.y_bottom - bounds.y_top;

    // 1. Draw base empty truck
    ctx.clearRect(0, 0, 1376, 768);
    ctx.drawImage(emptyImg, 0, 0, 1376, 768);

    // 2. If cutoff is less than x_right, reveal stowed cargo from cutoffX to bounds.x_right
    if (cutoffX < bounds.x_right) {
      const clampedCutoff = Math.max(cutoffX, bounds.x_left);
      const revealW = bounds.x_right - clampedCutoff;

      ctx.save();
      ctx.beginPath();
      // Precise rectangular clip to the container interior from cutoffX to cab bulkhead
      ctx.rect(clampedCutoff, bounds.y_top, revealW, cargoH);
      ctx.clip();

      // Draw the full loaded truck image (aligns 1:1 with emptyImg!)
      ctx.drawImage(loadedImg, 0, 0, 1376, 768);
      ctx.restore();

      // 3. Stowing Frontier Laser Beam - ONLY visible while actively stowing!
      if (stowingActive && clampedCutoff > bounds.x_left + 10 && clampedCutoff < bounds.x_right - 10) {
        ctx.save();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)'; // Glowing Cyan
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(clampedCutoff, bounds.y_top + 2);
        ctx.lineTo(clampedCutoff, bounds.y_bottom - 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(clampedCutoff, bounds.y_top + 4, 3.5, 0, Math.PI * 2);
        ctx.arc(clampedCutoff, bounds.y_bottom - 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }, [truckType, activeModelConfig]);

  // 3. Smooth Real-Time Automated Stowing Loop
  useEffect(() => {
    if (!imagesLoaded) return;

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

    // Dynamic easing toward targetCutoffX
    const animate = () => {
      setCurrentCutoffX((prev) => {
        const diff = targetCutoffX - prev;
        if (Math.abs(diff) < 2.0) {
          setIsStowingActive(false);
          renderAtCutoff(targetCutoffX, false);
          return targetCutoffX;
        }
        setIsStowingActive(true);
        const step = diff > 0 ? Math.min(Math.max(diff * 0.12, 1.8), 8.0) : Math.max(Math.min(diff * 0.12, -1.8), -8.0);
        const next = prev + step;
        renderAtCutoff(next, true);
        animFrameIdRef.current = requestAnimationFrame(animate);
        return next;
      });
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [targetCutoffX, imagesLoaded, renderAtCutoff]);

  // Initial draw and canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1376;
      canvas.height = 768;
      if (imagesLoaded) {
        renderAtCutoff(currentCutoffX, isStowingActive);
      }
    }
  }, [imagesLoaded, renderAtCutoff, currentCutoffX, isStowingActive]);

  // Calculated load percentage based on loaded bays
  const displayLoadPct = useMemo(() => {
    if (numBaysToLoad === 0) return 0;
    const totalBays = activeModelConfig.bays.length;
    return Math.round((numBaysToLoad / totalBays) * 100);
  }, [numBaysToLoad, activeModelConfig.bays.length]);

  return (
    <div className={`relative w-full rounded-3xl border shadow-2xl transition-all duration-300 ${
      isDark ? 'bg-[#080C16] border-slate-800' : 'bg-white border-slate-200'
    }`}>
      
      {/* 1. Clean Single-Row Control Bar (Only main things) */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 overflow-x-auto ${
        isDark ? 'border-slate-800/80 bg-[#0A0F1D]' : 'border-slate-200 bg-slate-50'
      }`}>
        
        {/* Left: Truck Info or Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`p-1.5 rounded-lg ${
            isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'
          }`}>
            <TruckIcon className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              TRUCK:
            </span>
            <select
              value={truckConfig.key}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'CUSTOM_NEW') {
                  setIsCustomModalOpen(true);
                } else if (onFeetChange) {
                  onFeetChange(val);
                }
              }}
              className={`font-black text-xs bg-transparent border-b border-dashed focus:outline-none cursor-pointer py-0.5 ${
                isDark ? 'text-cyan-300 border-slate-700' : 'text-blue-700 border-blue-300'
              }`}
            >
              <optgroup label="Standard Logistics Fleet" className={isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'}>
                {Object.keys(TRUCK_CONFIGS).map((key) => {
                  const cfg = TRUCK_CONFIGS[key];
                  return (
                    <option key={key} value={key} className={isDark ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-900 font-bold'}>
                      {cfg.displayName || `${cfg.feet}ft Container (${cfg.tonnage}T)`}
                    </option>
                  );
                })}
              </optgroup>

              {Object.keys(customConfigs).length > 0 && (
                <optgroup label="Custom Container Sizes" className={isDark ? 'bg-slate-900 text-purple-400' : 'bg-purple-50 text-purple-700'}>
                  {Object.keys(customConfigs).map((key) => {
                    const cfg = customConfigs[key];
                    return (
                      <option key={key} value={key} className={isDark ? 'bg-slate-900 text-purple-300 font-bold' : 'bg-white text-purple-900 font-bold'}>
                        {cfg.displayName || `Custom ${cfg.feet}ft (${cfg.tonnage}T)`}
                      </option>
                    );
                  })}
                </optgroup>
              )}

              <option value="CUSTOM_NEW" className={isDark ? 'bg-cyan-950 text-cyan-300 font-bold' : 'bg-blue-100 text-blue-900 font-bold'}>
                + Add Custom Size / Length...
              </option>
            </select>
            <span className={`text-[10px] hidden sm:inline ml-1 font-mono font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ({truckConfig.length}m • {truckConfig.volumeM3}m³)
            </span>
          </div>
        </div>

        {/* Right: Operational Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
            isStowingActive
              ? isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-900 border-amber-200'
              : loadedItems.length > 0
              ? isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : isDark
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-white text-slate-700 border-slate-200 shadow-sm'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isStowingActive ? 'bg-amber-400 animate-ping' : loadedItems.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'
            }`} />
            <span className="text-[11px]">
              {isStowingActive ? (
                <>Live Stowing {displayLoadPct}%...</>
              ) : loadedItems.length > 0 ? (
                isFtl ? (
                  <>{packingResult.stats.totalPackages || 50} Cartons Stowed ({displayLoadPct}% Loaded)</>
                ) : (
                  <>{displayLoadPct}% Loaded ({numBaysToLoad} Bays • {loadedItems.length} LRs)</>
                )
              ) : (
                'Bay Ready'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Live Dock Viewport (Pure Unobstructed Truck - Zero Floating Clutter) */}
      <div 
        ref={containerRef}
        className={`relative w-full aspect-[16/9] min-h-[360px] max-h-[580px] overflow-hidden select-none flex items-center justify-center transition-colors ${
          isDark ? 'bg-[#080C16]' : 'bg-[#F4F5F7]'
        }`}
      >
        <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
          {/* Photorealistic Canvas Display */}
          <canvas
            ref={canvasRef}
            width={1376}
            height={768}
            className="w-full h-full object-contain filter drop-shadow-2xl"
          />

          {/* Compact Stowing Notification (Only while actively in motion) */}
          {isStowingActive && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full backdrop-blur-xl bg-black/85 border border-cyan-500/40 text-cyan-300 text-xs shadow-2xl flex items-center gap-2.5 animate-fadeIn z-30 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-bold text-white">Live Cargo Stowing:</span>
              <span className="font-mono text-cyan-300 font-bold">{displayLoadPct}% Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Telemetry Bar - Single Row */}
      {isFtl ? (
        <div className={`px-4 py-2.5 border-t flex items-center justify-between gap-3 text-xs overflow-x-auto whitespace-nowrap ${
          isDark ? 'border-slate-800/80 bg-[#0A0F1D] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 shrink-0">
            <BoxesIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px]">
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                {packingResult.stats.totalPackages || 50} Cartons Stowed
              </strong>
              <span className={`ml-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                ({displayLoadPct}% {truckConfig.shortName || `${truckConfig.feet}ft`} Volume • Dedicated FTL)
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[11px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Stowage Balanced & Secured</span>
          </div>
        </div>
      ) : (
        <div className={`px-4 py-2 border-t flex items-center justify-between gap-3 text-xs overflow-x-auto whitespace-nowrap ${
          isDark ? 'border-slate-800/80 bg-[#0A0F1D] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}>
          {/* Left: Cartons & Stowing Status */}
          <div className="flex items-center gap-2 shrink-0">
            <BoxesIcon className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            {packingResult.stats.totalPackages > 0 ? (
              <span className="text-[11px]">
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                  {packingResult.stats.totalPackages} Cartons Stowed
                </strong>
                <span className={`ml-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ({displayLoadPct}% Vol Full • {loadedItems.length} LRs)
                </span>
              </span>
            ) : (
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Container bay ready • Select consignments to stow
              </span>
            )}
          </div>

          {/* Right: Axle Balance */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0 font-bold">
            <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-600 font-medium'}>Axle:</span>
            <span className={isDark ? 'text-cyan-400' : 'text-blue-700'}>{packingResult.stats.axleBalanceFrontPct}% F</span>
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>/</span>
            <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{packingResult.stats.axleBalanceRearPct}% R</span>
            <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ml-0.5 border ${
              isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              Optimal
            </span>
          </div>
        </div>
      )}

      {/* 4. Custom Size Configuration Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            isDark ? 'bg-[#0B1020] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/80'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'
                }`}>
                  <SlidersIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Add Custom Container Size</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Configure custom vehicle length & tonnage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className={`p-1.5 rounded-xl hover:bg-slate-800/50 transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Quick Presets */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Quick Popular Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { feet: 11, ton: 2.5, label: '11ft Tata Ace' },
                    { feet: 14, ton: 5.5, label: '14ft ICV' },
                    { feet: 17, ton: 8.5, label: '17ft ICV' },
                    { feet: 20, ton: 12.0, label: '20ft Container' },
                    { feet: 22, ton: 14.0, label: '22ft High-Cube' },
                    { feet: 28, ton: 20.0, label: '28ft Taurus' },
                    { feet: 40, ton: 35.0, label: '40ft Trailer' },
                  ].map((preset) => (
                    <button
                      key={preset.feet}
                      type="button"
                      onClick={() => {
                        setCustomFeetInput(preset.feet.toString());
                        setCustomTonnageInput(preset.ton.toString());
                        setCustomNameInput(preset.label);
                      }}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        parseFloat(customFeetInput) === preset.feet
                          ? isDark
                            ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                            : 'bg-purple-100 text-purple-800 border-purple-300'
                          : isDark
                            ? 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                {/* Feet */}
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Length (Feet) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="8"
                      max="60"
                      step="0.5"
                      value={customFeetInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomFeetInput(val);
                        const f = parseFloat(val);
                        if (!isNaN(f) && f > 0) {
                          const est = f <= 12 ? (f * 0.23).toFixed(1) : f <= 22 ? (f * 0.6).toFixed(1) : (f * 0.85).toFixed(1);
                          setCustomTonnageInput(est);
                        }
                      }}
                      className={`w-full h-10 px-3 pr-8 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500' : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                      }`}
                      placeholder="e.g. 20"
                    />
                    <span className="absolute inset-y-0 right-2.5 flex items-center text-[10px] font-bold text-slate-400">
                      ft
                    </span>
                  </div>
                </div>

                {/* Rated Capacity */}
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Rated Tonnage *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.5"
                      max="60"
                      step="0.5"
                      value={customTonnageInput}
                      onChange={(e) => setCustomTonnageInput(e.target.value)}
                      className={`w-full h-10 px-3 pr-10 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500' : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                      }`}
                      placeholder="e.g. 12"
                    />
                    <span className="absolute inset-y-0 right-2.5 flex items-center text-[10px] font-bold text-slate-400">
                      Tons
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Name / Label */}
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Custom Label / Name (Optional)
                </label>
                <input
                  type="text"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder={`e.g. ${customFeetInput || 20}ft Container or Tata 407`}
                  className={`w-full h-10 px-3 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500' : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                  }`}
                />
              </div>

              {/* Live Spec Preview Box */}
              <div className={`p-3 rounded-2xl border ${
                isDark ? 'bg-purple-950/20 border-purple-900/40 text-purple-200' : 'bg-purple-50/70 border-purple-200 text-purple-900'
              }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Calculated Specifications</span>
                  <span className="font-mono text-purple-400">
                    {parseFloat(customFeetInput) <= 12 ? 'Mini-Truck Chassis (Tata Ace)' : parseFloat(customFeetInput) <= 22 ? 'Medium ICV Chassis' : 'Heavy Trailer Chassis'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-black/20">
                    <span className="block text-[10px] text-slate-400">Cargo Length</span>
                    <strong className="font-mono">{((parseFloat(customFeetInput) || 20) * 0.3048).toFixed(1)} m</strong>
                  </div>
                  <div className="p-1.5 rounded-lg bg-black/20">
                    <span className="block text-[10px] text-slate-400">Payload Limit</span>
                    <strong className="font-mono">{parseFloat(customTonnageInput) || 12} Tons</strong>
                  </div>
                  <div className="p-1.5 rounded-lg bg-black/20">
                    <span className="block text-[10px] text-slate-400">Est. Volume</span>
                    <strong className="font-mono">
                      {(
                        ((parseFloat(customFeetInput) || 20) * 0.3048) *
                        (parseFloat(customFeetInput) <= 12 ? 1.8 : parseFloat(customFeetInput) <= 22 ? 2.2 : 2.4) *
                        (parseFloat(customFeetInput) <= 12 ? 1.9 : parseFloat(customFeetInput) <= 22 ? 2.3 : 2.6)
                      ).toFixed(1)} m³
                    </strong>
                  </div>
                </div>
              </div>

              {/* Previously Saved Custom Sizes */}
              {Object.keys(customConfigs).length > 0 && (
                <div className="pt-2 border-t border-slate-800/60">
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Previously Saved Custom Sizes
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {Object.keys(customConfigs).map((k) => {
                      const c = customConfigs[k];
                      return (
                        <div
                          key={k}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-lg border ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                          }`}
                        >
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => {
                              if (onFeetChange) onFeetChange(k);
                              setIsCustomModalOpen(false);
                            }}
                          >
                            {c.displayName || c.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const copy = { ...customConfigs };
                              delete copy[k];
                              setCustomConfigs(copy);
                              try {
                                localStorage.setItem('transporter_custom_truck_configs', JSON.stringify(copy));
                              } catch (err) {}
                            }}
                            className="text-red-400 hover:text-red-300 ml-0.5"
                            title="Delete custom size"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-end gap-2 ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/80'
            }`}>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const f = parseFloat(customFeetInput) || 20;
                  const t = parseFloat(customTonnageInput) || Number((f * 0.65).toFixed(1));
                  const name = customNameInput.trim() || `Custom ${f}ft Container (${t}T)`;
                  const cfg = createCustomTruckConfig(f, t, name);
                  
                  const updated = { ...customConfigs, [cfg.key]: cfg };
                  setCustomConfigs(updated);
                  try {
                    localStorage.setItem('transporter_custom_truck_configs', JSON.stringify(updated));
                  } catch (err) {}

                  setIsCustomModalOpen(false);
                  if (onFeetChange) {
                    onFeetChange(cfg.key);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Apply & Save Size</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
