// frontend/app/(owner)/load-planning/page.js
'use client';

import React, { useState } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import {
  Boxes,
  Truck,
  Layers,
  ArrowRight,
  Package,
  Weight,
  Maximize2,
  CheckCircle2,
  Clock,
  Warehouse,
  Send,
  SlidersHorizontal,
  Plus,
  CheckSquare,
  Square,
  AlertCircle,
  Sparkles,
  Zap,
  RotateCw
} from 'lucide-react';

const STAGED_CONSIGNMENTS = [
  {
    id: 'CSN-879654',
    shipper: 'Reliance Retail',
    receiver: 'Apollo Supply Chain',
    destination: 'Bengaluru (BLR)',
    items: 'Electronics & Inverters',
    packages: 8,
    volume_m3: 3.2,
    weight_t: 1.8,
    priority: 'PRIORITY',
    color: '#00F0FF',
    loaded: true
  },
  {
    id: 'CSN-879655',
    shipper: 'Tata Auto Components',
    receiver: 'Mahindra Logistics Hub',
    destination: 'Bengaluru (BLR)',
    items: 'Engine Parts (Pallets)',
    packages: 6,
    volume_m3: 4.5,
    weight_t: 3.2,
    priority: 'STANDARD',
    color: '#38BDF8',
    loaded: true
  },
  {
    id: 'CSN-879656',
    shipper: 'FreshMart Organics',
    receiver: 'Metro Cash & Carry',
    destination: 'Bengaluru (BLR)',
    items: 'Cold Packaged Food',
    packages: 10,
    volume_m3: 6.5,
    weight_t: 3.6,
    priority: 'EXPRESS',
    color: '#34D399',
    loaded: true
  },
  {
    id: 'CSN-879657',
    shipper: 'Asian Paints Ltd',
    receiver: 'Shree Krishna Hardware',
    destination: 'Hyderabad (HYD)',
    items: 'Drum Chemicals',
    packages: 4,
    volume_m3: 2.1,
    weight_t: 1.5,
    priority: 'STANDARD',
    color: '#A78BFA',
    loaded: false
  },
  {
    id: 'CSN-879658',
    shipper: 'Havells India Wire',
    receiver: 'Universal Traders',
    destination: 'Chennai (MAA)',
    items: 'Copper Cable Rolls',
    packages: 5,
    volume_m3: 1.8,
    weight_t: 2.2,
    priority: 'STANDARD',
    color: '#FBBF24',
    loaded: false
  }
];

export default function LoadPlanningPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [stagedItems, setStagedItems] = useState(STAGED_CONSIGNMENTS);
  const [selectedVehicle, setSelectedVehicle] = useState('MH 12 AB 4587');
  const [activeDock, setActiveDock] = useState('DOCK_01');

  const loadedItems = stagedItems.filter((i) => i.loaded);
  const loadedVolume = loadedItems.reduce((acc, i) => acc + i.volume_m3, 0);
  const loadedWeight = loadedItems.reduce((acc, i) => acc + i.weight_t, 0);
  const loadedPackages = loadedItems.reduce((acc, i) => acc + i.packages, 0);

  const toggleLoad = (id) => {
    setStagedItems(
      stagedItems.map((item) =>
        item.id === id ? { ...item, loaded: !item.loaded } : item
      )
    );
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <Boxes className="w-6 h-6 text-cyan-400" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Load Planning & Warehouse Docks
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                3D Volumetric cargo packing, axle-weight balancing & warehouse dock dispatch allocation.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => alert('Generating AI optimal load distribution pattern...')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI Auto-Optimize</span>
              </button>

              <button
                onClick={() => alert(`Generated Master Loading Manifest & Gate Pass for ${selectedVehicle}!`)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Confirm & Dispatch Truck</span>
              </button>
            </div>
          </div>

          {/* Operational KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Orders</div>
              <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>248</div>
              <div className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-1 font-semibold">↑ 14% vs last week</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Loads to Plan</div>
              <div className="text-2xl font-black text-cyan-500 dark:text-cyan-400 font-mono">36</div>
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Awaiting vehicle assignment</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Fleet Utilization</div>
              <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400 font-mono">78%</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-1 font-semibold">Target 85% reached</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Warehouse Capacity</div>
              <div className="text-2xl font-black text-amber-500 dark:text-amber-400 font-mono">62%</div>
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Docks 1-4 active</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">On-Time Readiness</div>
              <div className="text-2xl font-black text-purple-500 dark:text-purple-400 font-mono">98.5%</div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400/80 mt-1 font-semibold">Dispatches on schedule</div>
            </div>
          </div>

          {/* Main Visualizer & Dock Layout: 8 Cols (3D Truck & Docks) + 4 Cols (Staging Queue) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left 8 Cols: 3D Cutaway Vehicle Loading Visualizer & Warehouse Docks */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* 3D Cutaway Box Truck Container Visualizer */}
              <div className={`p-5 rounded-3xl border shadow-xl ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Truck Header Bar */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b mb-4 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Truck className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Target Line-Haul: {selectedVehicle}
                        </h2>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          isDark 
                            ? 'bg-blue-500/20 text-cyan-300 border-blue-500/30' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          16T MULTI-AXLE
                        </span>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Route: Delhi (DEL) ➔ Bengaluru (BLR) via NH-48
                      </p>
                    </div>
                  </div>

                  {/* 2 Real-Time Capacity Badges */}
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className={`px-2.5 py-1 rounded-xl border ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-cyan-400' 
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      Vol: {loadedVolume.toFixed(1)} / 16.0 m³ ({(loadedVolume / 16 * 100).toFixed(0)}%)
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl border ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      Wt: {loadedWeight.toFixed(1)} / 10.0 T ({(loadedWeight / 10 * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {/* SVG 3D Cutaway Truck Isometric Representation */}
                <div className={`relative w-full h-64 rounded-2xl border p-4 flex items-center justify-center overflow-hidden transition-colors ${
                  isDark 
                    ? 'bg-[#070B14] border-slate-800' 
                    : 'bg-gradient-to-b from-slate-50 to-slate-100/70 border-slate-200 shadow-inner'
                }`}>
                  <svg className="w-full h-full max-h-56" viewBox="0 0 520 200" fill="none">
                    {/* Truck Cabin Silhouette */}
                    <path
                      d="M 50 140 L 50 80 L 100 50 L 140 50 L 140 140 Z"
                      fill={isDark ? '#1E293B' : '#E2E8F0'}
                      stroke={isDark ? '#334155' : '#94A3B8'}
                      strokeWidth="2"
                    />
                    <circle
                      cx="95"
                      cy="145"
                      r="16"
                      fill={isDark ? '#0F172A' : '#334155'}
                      stroke={isDark ? '#475569' : '#64748B'}
                      strokeWidth="3"
                    />
                    <rect
                      x="75"
                      y="65"
                      width="40"
                      height="30"
                      rx="4"
                      fill="#38BDF8"
                      fillOpacity={isDark ? '0.4' : '0.7'}
                    />

                    {/* Transparent Cutaway Cargo Container Body */}
                    <rect
                      x="140"
                      y="30"
                      width="340"
                      height="110"
                      rx="8"
                      fill={isDark ? '#0B1222' : '#FFFFFF'}
                      stroke={isDark ? '#00F0FF' : '#0284C7'}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      opacity={isDark ? 0.9 : 1}
                    />

                    {/* Loaded Cargo Pallets Packed Inside with Real Colors */}
                    {loadedItems.map((item, idx) => {
                      const posX = 150 + idx * 75;
                      return (
                        <g key={item.id} transform={`translate(${posX}, 50)`}>
                          <rect
                            x="0"
                            y="0"
                            width="65"
                            height="80"
                            rx="6"
                            fill={item.color}
                            fillOpacity={isDark ? '0.3' : '0.15'}
                            stroke={item.color}
                            strokeWidth="2"
                          />
                          <rect
                            x="5"
                            y="5"
                            width="55"
                            height="32"
                            rx="4"
                            fill={item.color}
                            fillOpacity={isDark ? '0.6' : '0.85'}
                          />
                          <rect
                            x="5"
                            y="42"
                            width="55"
                            height="32"
                            rx="4"
                            fill={item.color}
                            fillOpacity={isDark ? '0.6' : '0.85'}
                          />
                          <text 
                            x="32" 
                            y="24" 
                            fill={isDark ? '#FFFFFF' : '#0F172A'} 
                            fontSize="8" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {item.packages} Pkgs
                          </text>
                          <text 
                            x="32" 
                            y="62" 
                            fill={isDark ? '#FFFFFF' : '#0F172A'} 
                            fontSize="7" 
                            fontFamily="monospace" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {item.weight_t} T
                          </text>
                        </g>
                      );
                    })}

                    {/* Truck Wheels */}
                    <circle
                      cx="200"
                      cy="145"
                      r="16"
                      fill={isDark ? '#0F172A' : '#334155'}
                      stroke={isDark ? '#475569' : '#64748B'}
                      strokeWidth="3"
                    />
                    <circle
                      cx="410"
                      cy="145"
                      r="16"
                      fill={isDark ? '#0F172A' : '#334155'}
                      stroke={isDark ? '#475569' : '#64748B'}
                      strokeWidth="3"
                    />
                    <circle
                      cx="450"
                      cy="145"
                      r="16"
                      fill={isDark ? '#0F172A' : '#334155'}
                      stroke={isDark ? '#475569' : '#64748B'}
                      strokeWidth="3"
                    />
                  </svg>

                  {/* Overlaid Utilization Bars */}
                  <div className={`absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      {loadedPackages} Packages Staged
                    </span>
                    <span>Axle Load Balance: 52% Front / 48% Rear (Optimal)</span>
                  </div>
                </div>

                {/* Warehouse Docks Management */}
                <div className={`mt-5 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Warehouse className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Warehouse Loading Docks (Hub Floor)
                      </h3>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Delhi Central Warehouse
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div
                      onClick={() => setActiveDock('DOCK_01')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        activeDock === 'DOCK_01'
                          ? isDark 
                            ? 'bg-blue-950/40 border-cyan-400 shadow-md shadow-cyan-950/20' 
                            : 'bg-blue-50/80 border-blue-500 shadow-sm'
                          : isDark 
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>Dock 01</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          Loading
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                        MH12AB4587
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        ORD-78452 (89% Full)
                      </div>
                    </div>

                    <div
                      onClick={() => setActiveDock('DOCK_02')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        activeDock === 'DOCK_02'
                          ? isDark 
                            ? 'bg-blue-950/40 border-cyan-400' 
                            : 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                          : isDark 
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>Dock 02</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Ready
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        KA01CD8901
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Sealed & Dispatched
                      </div>
                    </div>

                    <div
                      onClick={() => setActiveDock('DOCK_03')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        activeDock === 'DOCK_03'
                          ? isDark 
                            ? 'bg-blue-950/40 border-cyan-400' 
                            : 'bg-amber-50/80 border-amber-500 shadow-sm'
                          : isDark 
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>Dock 03</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Unloading
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        GJ01EF2345
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Inbound Consignments
                      </div>
                    </div>

                    <div
                      onClick={() => setActiveDock('DOCK_04')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        activeDock === 'DOCK_04'
                          ? isDark 
                            ? 'bg-blue-950/40 border-cyan-400' 
                            : 'bg-slate-100 border-slate-400 shadow-sm'
                          : isDark 
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>Dock 04</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                        }`}>
                          Available
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Empty Bay
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Ready for Next Arrival
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Right 4 Cols: Staged Consignments Queue */}
            <div className="lg:col-span-4 space-y-5">
              
              <div className={`p-5 rounded-3xl border shadow-xl ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className={`flex items-center justify-between pb-3 border-b mb-3.5 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Package className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Staged Consignments ({stagedItems.length})
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    Toggle to Load/Unload
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                  {stagedItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleLoad(item.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        item.loaded
                          ? isDark 
                            ? 'bg-blue-950/30 border-cyan-400/80 shadow-md shadow-cyan-950/20' 
                            : 'bg-blue-50/70 border-blue-400 shadow-sm'
                          : isDark 
                            ? 'bg-slate-900/50 border-slate-800/80 opacity-60 hover:opacity-100' 
                            : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          {item.loaded ? (
                            <CheckSquare className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                          ) : (
                            <Square className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          )}
                          <span className={`font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {item.id}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          item.priority === 'EXPRESS'
                            ? isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.priority === 'PRIORITY'
                            ? isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                            : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      <div className={`text-xs font-bold mt-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.shipper}
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.items}
                      </div>

                      <div className={`flex items-center justify-between text-[10px] font-mono mt-2 pt-2 border-t ${
                        isDark ? 'border-slate-800/60 text-cyan-400' : 'border-slate-200 text-blue-600 font-semibold'
                      }`}>
                        <span>{item.packages} Pkgs</span>
                        <span>{item.volume_m3} m³</span>
                        <span>{item.weight_t} Tons</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`mt-4 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    onClick={() => alert(`Allocated ${loadedItems.length} consignments to ${selectedVehicle}`)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-md shadow-cyan-500/20 text-center block"
                  >
                    Lock Load Configuration ➔
                  </button>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
