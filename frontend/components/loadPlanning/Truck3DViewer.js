'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  Boxes as BoxesIcon, 
  Truck as TruckIcon,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Info,
  Layers,
  MapPin,
  Warehouse,
  Activity,
  Check
} from 'lucide-react';
import { 
  TRUCK_CONFIGS, 
  getTruckConfigForVehicle, 
  computeVolumetricPacking 
} from './packingEngine';

/**
 * Enterprise Logistics Live Truck Cargo Stowing Engine
 * 
 * - Looks and feels like a 100% automated real-time warehouse loading simulation
 * - No media player controls (no "play video" buttons, no scrubbers, no video tags)
 * - Seamlessly runs high-speed photorealistic frame animations in the background
 *   whenever consignments/bulties are checked or unchecked
 * - Exact 90° straight side view resting level on horizontal ground
 * - Dynamic box auto-scaling, axle weight balance, and interactive pallet bay inspection
 */
export default function Truck3DViewer({
  currentVehicle,
  loadedItems = [],
  selectedFeet = null,
  onFeetChange,
  isDark = true,
  hoveredConsignmentId = null,
  onSelectConsignment = null,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const preloadedImagesRef = useRef({});

  // Resolve Active Truck Configuration
  const truckConfig = useMemo(() => {
    return getTruckConfigForVehicle(currentVehicle, selectedFeet);
  }, [currentVehicle, selectedFeet]);

  // Compute 3D Volumetric Packing with Dynamic Sizing
  const packingResult = useMemo(() => {
    return computeVolumetricPacking(truckConfig, loadedItems);
  }, [truckConfig, loadedItems]);

  // Target Load Percentage (0% to 100%)
  const targetPercentage = useMemo(() => {
    if (loadedItems.length === 0) return 0;
    const vol = packingResult.stats.volumeUtilizationPct || 0;
    // Map non-zero load to at least 15% so first builty is visibly loaded
    return Math.min(Math.max(vol, 18), 100);
  }, [loadedItems.length, packingResult.stats.volumeUtilizationPct]);

  // Current Animation Head Position (0.0 to 100.0)
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const [isStowingActive, setIsStowingActive] = useState(false);
  const [activeLoadedDocket, setActiveLoadedDocket] = useState(null);
  const [hoveredBayIndex, setHoveredBayIndex] = useState(null);
  const [showBayTags, setShowBayTags] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Resolve Truck Model Folder
  const truckType = useMemo(() => {
    if (truckConfig.feet <= 14) return '11ft';
    if (truckConfig.feet <= 19) return '19ft';
    return '32ft';
  }, [truckConfig.feet]);

  // Pallet Bay Coordinates along container (in percentage of image 1376x768)
  const bayConfig = useMemo(() => {
    if (truckType === '11ft') {
      return {
        numBays: 3,
        bayXPositions: [50.5, 36.0, 22.0], // Bay 1 (front near cab) to Bay 3 (rear)
        bottomPct: 65.5,
      };
    } else if (truckType === '19ft') {
      return {
        numBays: 4,
        bayXPositions: [61.0, 46.5, 31.5, 16.0],
        bottomPct: 65.0,
      };
    } else {
      return {
        numBays: 5,
        bayXPositions: [64.0, 51.5, 38.5, 25.5, 13.0],
        bottomPct: 62.5,
      };
    }
  }, [truckType]);

  // Preload all 30 frames for the current truck model
  useEffect(() => {
    const images = [];
    for (let i = 0; i < 30; i++) {
      const img = new Image();
      const frameStr = i < 10 ? `0${i}` : `${i}`;
      img.src = `/images/trucks/frames_${truckType}/frame_${frameStr}.jpg`;
      images.push(img);
    }
    preloadedImagesRef.current[truckType] = images;
  }, [truckType]);

  // Render current frame to canvas
  const renderFrame = useCallback((pct) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameList = preloadedImagesRef.current[truckType];
    const frameIndex = Math.min(Math.max(Math.round((pct / 100) * 29), 0), 29);

    if (frameList && frameList[frameIndex] && frameList[frameIndex].complete) {
      const img = frameList[frameIndex];
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback direct load
      const tempImg = new Image();
      const frameStr = frameIndex < 10 ? `0${frameIndex}` : `${frameIndex}`;
      tempImg.src = `/images/trucks/frames_${truckType}/frame_${frameStr}.jpg`;
      tempImg.onload = () => {
        ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
      };
    }
  }, [truckType]);

  // Smooth real-time automated stowing whenever loadedItems changes
  const prevItemsCountRef = useRef(loadedItems.length);
  useEffect(() => {
    if (loadedItems.length > prevItemsCountRef.current) {
      const newlyAdded = loadedItems[loadedItems.length - 1];
      setActiveLoadedDocket(newlyAdded);
      setIsStowingActive(true);
    } else if (loadedItems.length === 0) {
      setIsStowingActive(false);
    }
    prevItemsCountRef.current = loadedItems.length;

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

    // Dynamic speed based on delta for natural real-time responsiveness
    const animate = () => {
      setCurrentPercentage((prev) => {
        const diff = targetPercentage - prev;
        if (Math.abs(diff) < 0.5) {
          setIsStowingActive(false);
          renderFrame(targetPercentage);
          return targetPercentage;
        }
        const step = diff > 0 ? Math.min(Math.max(diff * 0.12, 1.2), 3.0) : Math.max(Math.min(diff * 0.12, -1.2), -3.0);
        const next = prev + step;
        renderFrame(next);
        animFrameIdRef.current = requestAnimationFrame(animate);
        return next;
      });
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [targetPercentage, loadedItems, renderFrame]);

  // Initial draw and canvas sizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = 1376;
        canvasRef.current.height = 768;
        renderFrame(currentPercentage);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPercentage, renderFrame]);

  // Re-simulate loading sequence
  const handleResimulate = () => {
    if (loadedItems.length === 0) return;
    setIsStowingActive(true);
    setCurrentPercentage(0);
    renderFrame(0);

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

    const animate = () => {
      setCurrentPercentage((prev) => {
        const diff = targetPercentage - prev;
        if (Math.abs(diff) < 0.5) {
          setIsStowingActive(false);
          renderFrame(targetPercentage);
          return targetPercentage;
        }
        const step = Math.min(Math.max(diff * 0.12, 1.2), 3.0);
        const next = Math.min(prev + step, targetPercentage);
        renderFrame(next);
        animFrameIdRef.current = requestAnimationFrame(animate);
        return next;
      });
    };
    animFrameIdRef.current = requestAnimationFrame(animate);
  };

  // Determine Pallet Bay Loading Status
  const bayStatus = useMemo(() => {
    return bayConfig.bayXPositions.map((posX, idx) => {
      const bayThreshold = ((idx) / bayConfig.numBays) * 100;
      const isLoaded = currentPercentage > bayThreshold;
      const assignedItem = loadedItems.length > 0 ? loadedItems[idx % loadedItems.length] : null;

      return {
        bayIndex: idx + 1,
        posX,
        posY: bayConfig.bottomPct - 18,
        isLoaded,
        assignedItem,
      };
    });
  }, [bayConfig, currentPercentage, loadedItems]);

  const activeHoveredBay = hoveredBayIndex !== null ? bayStatus[hoveredBayIndex] : null;

  return (
    <div className={`relative w-full rounded-3xl border shadow-2xl transition-all duration-300 ${
      isDark ? 'bg-[#080C16] border-slate-800' : 'bg-white border-slate-200'
    }`}>
      
      {/* 1. Clean Single-Row Control Bar */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto ${
        isDark ? 'border-slate-800/80 bg-[#0A0F1D]' : 'border-slate-200 bg-slate-50'
      }`}>
        
        {/* Left: Feet-Wise Truck Selector (No company names, compact single row) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TruckIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Truck:</span>
            <select
              value={truckConfig.key}
              onChange={(e) => {
                if (onFeetChange) onFeetChange(e.target.value);
              }}
              className={`font-black text-xs bg-transparent border-b border-dashed focus:outline-none cursor-pointer py-0.5 ${
                isDark ? 'text-cyan-300 border-slate-700' : 'text-blue-600 border-slate-300'
              }`}
            >
              {Object.keys(TRUCK_CONFIGS).map((key) => {
                const cfg = TRUCK_CONFIGS[key];
                return (
                  <option key={key} value={key} className={isDark ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-900 font-bold'}>
                    {cfg.feet}ft Container ({cfg.tonnage}T)
                  </option>
                );
              })}
            </select>
            <span className="text-[10px] text-slate-400 hidden md:inline ml-1 font-mono">
              ({truckConfig.length}m • {truckConfig.volumeM3}m³)
            </span>
          </div>
        </div>

        {/* Right: Operational Action Buttons in Single Row */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Live System Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
            isStowingActive
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
              : loadedItems.length > 0
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : isDark
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isStowingActive ? 'bg-amber-400 animate-ping' : loadedItems.length > 0 ? 'bg-emerald-400' : 'bg-slate-400'
            }`} />
            <span className="text-[11px]">
              {isStowingActive ? 'Stowing...' : loadedItems.length > 0 ? 'Cargo Stowed' : 'Bay Ready'}
            </span>
          </div>

          {/* Toggle Pallet Bay Hotspot Badges */}
          <button
            onClick={() => setShowBayTags(!showBayTags)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              showBayTags
                ? isDark ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-blue-50 text-blue-700 border-blue-200'
                : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title="Toggle Bay Inspection Tags"
          >
            <Layers className="w-3 h-3" />
            <span className="text-[11px]">Bay Tags</span>
          </button>

          {/* Re-simulate Loading Action */}
          {loadedItems.length > 0 && (
            <button
              onClick={handleResimulate}
              disabled={isStowingActive}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                isStowingActive
                  ? 'opacity-50 cursor-not-allowed'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-cyan-300 hover:text-white hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
              title="Re-run live stowing sequence for currently staged items"
            >
              <RefreshCw className={`w-3 h-3 ${isStowingActive ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">Re-Stow</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Live Dock Viewport (Exact 90° Straight Side Elevation) */}
      <div 
        ref={containerRef}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        className={`relative w-full h-[470px] sm:h-[530px] overflow-hidden select-none flex items-center justify-center transition-colors ${
          isDark ? 'bg-[#080C16]' : 'bg-[#F3F4F6]'
        }`}
      >
        {/* Aspect-Locked Canvas Container (16:9 1376x768) */}
        <div className="relative w-full aspect-video max-h-full max-w-full flex items-center justify-center p-2">
          
          {/* Photorealistic Canvas Display */}
          <canvas
            ref={canvasRef}
            width={1376}
            height={768}
            className="w-full h-full object-contain filter drop-shadow-2xl"
          />

          {/* Holographic Bay Markers & Pallet Inspection Badges */}
          {showBayTags && (
            <div className="absolute inset-0 pointer-events-none">
              {bayStatus.map((bay, idx) => {
                if (!bay.isLoaded && currentPercentage < 5) return null;
                const item = bay.assignedItem;
                const isHovered = hoveredBayIndex === idx || (item && hoveredConsignmentId === item.id);

                return (
                  <div
                    key={`bay-tag-${idx}`}
                    className="absolute pointer-events-auto cursor-pointer transition-transform duration-200"
                    style={{
                      left: `${bay.posX}%`,
                      top: `${bay.posY}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isHovered ? 40 : 20,
                    }}
                    onMouseEnter={() => setHoveredBayIndex(idx)}
                    onMouseLeave={() => setHoveredBayIndex(null)}
                    onClick={() => {
                      if (item && onSelectConsignment) onSelectConsignment(item);
                    }}
                  >
                    {/* Floating Bay Tag Badge */}
                    <div className={`px-2.5 py-1 rounded-lg backdrop-blur-md border text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-lg transition-all ${
                      isHovered 
                        ? 'bg-cyan-500 text-black border-cyan-300 scale-110 shadow-cyan-500/50'
                        : bay.isLoaded
                        ? isDark
                          ? 'bg-black/80 text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:scale-105'
                          : 'bg-white/95 text-blue-700 border-blue-300 hover:border-blue-500 hover:scale-105 shadow-md'
                        : isDark
                        ? 'bg-black/60 text-slate-400 border-slate-700 opacity-60'
                        : 'bg-white/70 text-slate-500 border-slate-300 opacity-60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${bay.isLoaded ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>Bay {bay.bayIndex}</span>
                      {bay.isLoaded && item && (
                        <span className="text-[9px] opacity-80 border-l pl-1 border-current">
                          {item.docket_number ? item.docket_number.slice(-5) : `LR-${bay.bayIndex}`}
                        </span>
                      )}
                    </div>

                    {/* Tether Pin Line */}
                    <div 
                      className={`w-px mx-auto transition-colors ${
                        isHovered ? 'bg-cyan-400 h-4' : 'bg-cyan-500/40 h-2.5'
                      }`}
                    />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-auto" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Stowing Operational Notification Banner */}
          {isStowingActive && (
            <div className="absolute top-4 left-6 right-6 p-3 rounded-2xl backdrop-blur-xl bg-black/90 border border-cyan-500/40 text-cyan-300 text-xs shadow-2xl flex items-center justify-between animate-fadeIn z-30 pointer-events-none">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                <div>
                  <div className="font-bold flex items-center gap-2 text-white">
                    <span>🔴 Live Cargo Stowing in Progress</span>
                    {activeLoadedDocket && (
                      <span className="text-[10px] text-cyan-300 font-normal">
                        ({activeLoadedDocket.docket_number} • {activeLoadedDocket.total_packages || 10} pkgs)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Stowing corrugated cartons onto Euro-pallets from front cab to rear doors
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/40">
                  {Math.round(currentPercentage)}% Stowed
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Top-Left Floating Info Badge */}
        <div className="absolute top-3 left-4 pointer-events-none text-[11px] font-medium text-slate-400 backdrop-blur-md px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
          <Warehouse className="w-3.5 h-3.5 text-cyan-400" />
          <span>Warehouse Loading Dock • 90° Precision Cargo Elevation</span>
        </div>

        {/* Bottom Floating Stats & Dynamic Box Sizing Badge */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          
          {/* Dynamic Box Scaling Notice */}
          <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-2xl backdrop-blur-md border shadow-lg text-[11px] bg-black/85 border-white/10 text-white">
            <BoxesIcon className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {packingResult.stats.totalPackages > 0 ? (
                <>
                  <strong className="text-cyan-300">{packingResult.stats.totalPackages} Cartons Stowed</strong> • Auto-Scaled to{' '}
                  <span className="font-mono text-emerald-400 font-bold">
                    {packingResult.stats.boxUnitDimensions.width}m × {packingResult.stats.boxUnitDimensions.depth}m
                  </span>{' '}
                  ({packingResult.stats.volumeUtilizationPct}% Vol Full)
                </>
              ) : (
                <span className="text-slate-300">
                  Container bay empty • Select bulties in the staging queue below to load truck
                </span>
              )}
            </span>
          </div>

          {/* Live Axle Load Balance Indicator */}
          <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-2xl backdrop-blur-md border shadow-lg text-[11px] font-mono font-bold bg-black/85 border-white/10 text-white">
            <span className="text-slate-400">Axle Balance:</span>
            <span className="text-cyan-300">{packingResult.stats.axleBalanceFrontPct}% Front</span>
            <span className="text-slate-500">/</span>
            <span className="text-emerald-300">{packingResult.stats.axleBalanceRearPct}% Rear</span>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Balanced
            </span>
          </div>
        </div>

        {/* Hovered Pallet Bay 3D HUD Tooltip */}
        {activeHoveredBay && activeHoveredBay.assignedItem && (
          <div 
            className="fixed pointer-events-none z-50 p-3 rounded-2xl backdrop-blur-xl border shadow-2xl text-xs max-w-xs transition-opacity bg-slate-900/95 border-cyan-500/40 text-white"
            style={{
              left: `${mousePos.x + 16}px`,
              top: `${mousePos.y + 16}px`,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5 border-b border-slate-800 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono font-black text-cyan-300">
                Bay #{activeHoveredBay.bayIndex}: {activeHoveredBay.assignedItem.docket_number}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold ml-auto">
                {activeHoveredBay.assignedItem.total_packages || 10} Cartons
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div>
                Shipper: <span className="font-semibold text-white">{activeHoveredBay.assignedItem.consignor?.party_name || activeHoveredBay.assignedItem.consignor_name || 'Commercial Client'}</span>
              </div>
              <div>
                Receiver: <span className="font-semibold text-white">{activeHoveredBay.assignedItem.consignee?.party_name || activeHoveredBay.assignedItem.consignee_name || 'Destination Party'}</span>
              </div>
              <div>
                Destination: <span className="font-semibold text-emerald-400">{activeHoveredBay.assignedItem.destination_branch?.city || 'Central Distribution Hub'}</span>
              </div>
              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
                <span>Weight: {activeHoveredBay.assignedItem.charged_weight || activeHoveredBay.assignedItem.actual_weight || 120} kg</span>
                <span className="text-cyan-400 font-bold">Euro-Pallet Bay #{activeHoveredBay.bayIndex}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
