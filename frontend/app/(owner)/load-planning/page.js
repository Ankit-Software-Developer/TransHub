// frontend/app/(owner)/load-planning/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import { useStore } from '../../../store/useStore';
import api from '../../../services/api';
import { TRUCK_CONFIGS, getTruckConfigForVehicle } from '../../../components/loadPlanning/packingEngine';

const Truck3DViewer = dynamic(() => import('../../../components/loadPlanning/Truck3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[440px] flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#070B14] text-cyan-400">
      <div className="w-9 h-9 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-bold tracking-wider uppercase">Loading 3D Truck Simulation Engine...</span>
    </div>
  ),
});
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
  AlertTriangle,
  Sparkles,
  Zap,
  RotateCw,
  Building2,
  UserCheck,
  ShieldCheck,
  Key,
  X,
  Check,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const PALETTE = [
  '#00F0FF',
  '#38BDF8',
  '#34D399',
  '#A78BFA',
  '#FBBF24',
  '#F472B6',
  '#4ADE80',
  '#818CF8',
  '#FB923C',
  '#2DD4BF',
];

export default function LoadPlanningPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const user = useStore((state) => state.user);
  const { isAdmin, isBranchManager, canCreateDispatch } = usePermissions();

  // Core Data State
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stagedConsignments, setStagedConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingConsignments, setLoadingConsignments] = useState(false);

  // Selected Truck & Configuration
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedFeet, setSelectedFeet] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [modalOriginBranchId, setModalOriginBranchId] = useState('');
  const [activeDock, setActiveDock] = useState('DOCK_01');

  // Staged Item Selection State: Set of consignment IDs currently loaded into the truck
  const [loadedIds, setLoadedIds] = useState(new Set());

  // Dispatch Confirmation Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [startOdometer, setStartOdometer] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [dispatchRemarks, setDispatchRemarks] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // AI Optimization Toast / Feedback
  const [aiFeedback, setAiFeedback] = useState(null);
  const [hoveredConsignmentId, setHoveredConsignmentId] = useState(null);

  // 1. Initial Load: Fetch Branches, Vehicles, Drivers
  useEffect(() => {
    let isMounted = true;
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [branchesRes, vehiclesRes, driversRes] = await Promise.all([
          api.get('/branches').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/drivers').catch(() => ({ data: { data: [] } })),
        ]);

        if (!isMounted) return;

        const branchList = branchesRes.data?.data?.branches || branchesRes.data?.data || [];
        const vehicleList = vehiclesRes.data?.data || [];
        const driverList = driversRes.data?.data || [];

        setBranches(Array.isArray(branchList) ? branchList : []);
        setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
        setDrivers(Array.isArray(driverList) ? driverList : []);

        // Default to 'ALL' (Company-Wide Docks) so no pending bookings are hidden
        setSelectedBranchId('ALL');

        // Pick initial vehicle
        if (vehicleList.length > 0) {
          const avail = vehicleList.find((v) => v.status === 'AVAILABLE') || vehicleList[0];
          setSelectedVehicleId(avail.id);
          if (avail.assignedDriver?.id) {
            setSelectedDriverId(avail.assignedDriver.id);
          } else if (avail.assigned_driver_id) {
            setSelectedDriverId(avail.assigned_driver_id);
          }
          if (avail.current_odometer) {
            setStartOdometer(avail.current_odometer.toString());
          }
        }

        // Pick destination branch
        if (branchList.length > 0) {
          const otherBranch = branchList.length > 1 ? branchList[1] : branchList[0];
          if (otherBranch) {
            setDestBranchId(otherBranch.id);
          }
        }
      } catch (err) {
        console.error('Failed to load load planning master data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMasterData();
    return () => { isMounted = false; };
  }, [user]);

  // 2. Fetch Staged Consignments whenever selectedBranchId changes
  const fetchStagedConsignments = useCallback(async () => {
    setLoadingConsignments(true);
    try {
      const params = {
        limit: 100,
      };
      if (selectedBranchId && selectedBranchId !== 'ALL') {
        params.branch_id = selectedBranchId;
      }

      // Query bookings ready for load planning
      const res = await api.get('/bookings', { params });

      const rawList = res.data?.data || [];
      const formatted = (Array.isArray(rawList) ? rawList : [])
        .filter((c) => {
          const s = (c.status || 'BOOKED').toUpperCase();
          return !['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'RETURNED'].includes(s);
        })
        .map((c, index) => {
          const weightKg = parseFloat(c.actual_weight || c.charged_weight || 0);
          const weightTons = weightKg > 0 ? parseFloat((weightKg / 1000).toFixed(2)) : 0.5;
          // Estimate volume from packages or weight: approx 1 Ton ~= 2.5 m3
          const volumeM3 = parseFloat((weightTons * 2.5).toFixed(1)) || 1.2;

          return {
            id: c.id,
            docket_number: c.docket_number || c.lr_number || `LR-${c.id.slice(0, 6)}`,
            shipper: c.consignor?.name || c.consignor_name || 'Consignor Shipper',
            receiver: c.consignee?.name || c.consignee_name || 'Consignee Receiver',
            origin: c.originBranch?.branch_name || c.origin_city || 'Origin Hub',
            origin_city: c.origin_city || c.originBranch?.city || '',
            origin_branch_id: c.origin_branch_id,
            destination: c.destBranch?.branch_name || c.destination_city || 'Destination Hub',
            destination_city: c.destination_city || c.destBranch?.city || '',
            destination_branch_id: c.dest_branch_id,
            items: c.material_description || 'General Merchandise',
            packages: parseInt(c.packages_count || 1, 10),
            weight_t: weightTons,
            weight_kg: weightKg,
            volume_m3: volumeM3,
            amount: parseFloat(c.total_amount || 0),
            priority: c.delivery_type === 'DOOR_DELIVERY' ? 'EXPRESS' : (index % 3 === 0 ? 'PRIORITY' : 'STANDARD'),
            color: PALETTE[index % PALETTE.length],
          };
        });

      setStagedConsignments(formatted);

      // Keep valid selected items or pre-select first 3
      setLoadedIds((prev) => {
        const next = new Set();
        prev.forEach((id) => {
          if (formatted.some((item) => item.id === id)) {
            next.add(id);
          }
        });
        if (next.size === 0 && formatted.length > 0) {
          formatted.slice(0, 3).forEach((item) => next.add(item.id));
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch staged consignments', err);
      setStagedConsignments([]);
    } finally {
      setLoadingConsignments(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchStagedConsignments();
  }, [fetchStagedConsignments]);

  // Active Vehicle & Calculations
  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  const currentBranch = useMemo(() => {
    if (selectedBranchId === 'ALL') {
      return { branch_name: 'All Docks & Branches (Company-Wide)', city: 'All Regions', is_hub: true };
    }
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const activeTruckConfig = useMemo(() => {
    return getTruckConfigForVehicle(currentVehicle, selectedFeet);
  }, [currentVehicle, selectedFeet]);

  const maxVehicleWeightTons = useMemo(() => {
    return activeTruckConfig.tonnage;
  }, [activeTruckConfig]);

  // Volume capacity aligned with 3D truck container dimensions
  const maxVehicleVolumeM3 = useMemo(() => {
    return activeTruckConfig.volumeM3;
  }, [activeTruckConfig]);

  // Loaded Items & Aggregate Stats
  const loadedItems = useMemo(() => {
    return stagedConsignments.filter((i) => loadedIds.has(i.id));
  }, [stagedConsignments, loadedIds]);

  const loadedVolume = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.volume_m3, 0);
  }, [loadedItems]);

  const loadedWeight = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.weight_t, 0);
  }, [loadedItems]);

  const loadedPackages = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.packages, 0);
  }, [loadedItems]);

  const loadedFreightRevenue = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.amount, 0);
  }, [loadedItems]);

  const weightUtilizationPct = useMemo(() => {
    if (maxVehicleWeightTons <= 0) return 0;
    return Math.min(100, Math.round((loadedWeight / maxVehicleWeightTons) * 100));
  }, [loadedWeight, maxVehicleWeightTons]);

  const volumeUtilizationPct = useMemo(() => {
    if (maxVehicleVolumeM3 <= 0) return 0;
    return Math.min(100, Math.round((loadedVolume / maxVehicleVolumeM3) * 100));
  }, [loadedVolume, maxVehicleVolumeM3]);

  const isOverweight = loadedWeight > maxVehicleWeightTons;
  const isOvervolume = loadedVolume > maxVehicleVolumeM3;

  // Toggle load selection
  const toggleLoad = (id) => {
    setLoadedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // AI Auto-Optimize Knapsack Staging
  const handleAiAutoOptimize = () => {
    if (stagedConsignments.length === 0) {
      alert('No staged consignments available in this branch to optimize.');
      return;
    }

    // Sort priority: EXPRESS first, then PRIORITY, then STANDARD, and higher volume/weight ratio
    const sorted = [...stagedConsignments].sort((a, b) => {
      const pScore = { EXPRESS: 3, PRIORITY: 2, STANDARD: 1 };
      if (pScore[b.priority] !== pScore[a.priority]) {
        return pScore[b.priority] - pScore[a.priority];
      }
      return b.weight_t - a.weight_t;
    });

    let currentW = 0;
    let currentV = 0;
    const optimalSelection = new Set();

    for (const item of sorted) {
      if (currentW + item.weight_t <= maxVehicleWeightTons && currentV + item.volume_m3 <= maxVehicleVolumeM3) {
        optimalSelection.add(item.id);
        currentW += item.weight_t;
        currentV += item.volume_m3;
      }
    }

    setLoadedIds(optimalSelection);
    const pct = Math.round((currentW / maxVehicleWeightTons) * 100);
    setAiFeedback(`AI Load Distribution Complete: Packed ${optimalSelection.size} consignments reaching ${pct}% payload capacity.`);
    setTimeout(() => setAiFeedback(null), 6000);
  };

  // Open Dispatch Modal
  const handleOpenDispatchModal = () => {
    if (loadedItems.length === 0) {
      alert('Please stage at least one consignment into the truck before dispatching.');
      return;
    }
    if (!selectedVehicleId) {
      alert('Please select a target line-haul vehicle.');
      return;
    }

    const initialOrigin = (selectedBranchId && selectedBranchId !== 'ALL')
      ? selectedBranchId
      : (loadedItems[0]?.origin_branch_id || branches[0]?.id || '');
    setModalOriginBranchId(initialOrigin);

    if (!destBranchId || destBranchId === initialOrigin) {
      const otherBranch = branches.find((b) => b.id !== initialOrigin) || branches[0];
      if (otherBranch) setDestBranchId(otherBranch.id);
    }
    setDispatchModalOpen(true);
  };

  // Confirm and Execute Real Dispatch
  const handleConfirmDispatch = async () => {
    if (!selectedDriverId) {
      alert('Please assign a certified driver for this trip.');
      return;
    }

    const effectiveOriginBranchId = modalOriginBranchId || (selectedBranchId && selectedBranchId !== 'ALL'
      ? selectedBranchId
      : (loadedItems[0]?.origin_branch_id || branches[0]?.id));

    if (!effectiveOriginBranchId) {
      alert('Please select a departure origin branch/hub.');
      return;
    }
    if (!destBranchId) {
      alert('Please select a destination delivery hub or branch.');
      return;
    }

    setDispatching(true);
    try {
      const payload = {
        origin_branch_id: effectiveOriginBranchId,
        dest_branch_id: destBranchId,
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        consignment_ids: Array.from(loadedIds),
        start_odometer: parseInt(startOdometer || 0, 10),
        seal_number: sealNumber || `SEAL-${Math.floor(10000 + Math.random() * 90000)}`,
        remarks: dispatchRemarks || 'Dispatched via 3D Load Planning Dock',
      };

      const res = await api.post('/trips/dispatch', payload);
      const tripData = res.data?.data || {};

      setDispatchModalOpen(false);
      setSuccessResult({
        tripNumber: tripData.trip_number || `TRP-${Date.now().toString().slice(-6)}`,
        dispatchNumber: tripData.dispatches?.[0]?.dispatch_number || `DISP-${Date.now().toString().slice(-5)}`,
        packagesCount: loadedPackages,
        totalWeight: loadedWeight.toFixed(2),
        vehicleNumber: currentVehicle?.vehicle_number || 'Vehicle',
        destination: branches.find((b) => b.id === destBranchId)?.branch_name || 'Destination',
      });

      // Clear loaded ids and refresh consignments
      setLoadedIds(new Set());
      fetchStagedConsignments();
    } catch (err) {
      console.error('Dispatch failed:', err);
      alert(err.response?.data?.message || 'Failed to generate trip and dispatch manifest.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
          
          {/* Header Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 shrink-0">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      Load Planning & Warehouse Docks
                    </h1>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      Live Operations
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    3D Volumetric cargo packing, axle-weight balancing & warehouse dock dispatch allocation.
                  </p>
                </div>
              </div>
            </div>

            {/* Branch Context & Operational Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Branch Selector */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 shrink-0">Origin Dock:</span>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className={`bg-transparent font-bold focus:outline-none cursor-pointer text-xs max-w-[200px] truncate ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <option value="ALL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                      🌐 All Docks & Branches (Company-Wide)
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        {b.branch_name} {b.is_hub ? '(Hub)' : ''} {b.city ? `• ${b.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AI Auto-Optimize Button */}
              <button
                onClick={handleAiAutoOptimize}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-cyan-300 hover:text-white hover:border-cyan-500/50'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
                title="Automatically calculate best fit load"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="whitespace-nowrap">AI Optimize</span>
              </button>

              {/* Confirm & Dispatch Truck Button */}
              <button
                onClick={handleOpenDispatchModal}
                disabled={loadedItems.length === 0}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>

          {/* AI Optimization Feedback Banner */}
          {aiFeedback && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{aiFeedback}</span>
              </div>
              <button onClick={() => setAiFeedback(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Operational KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Staged Dockets</div>
              <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stagedConsignments.length}
              </div>
              <div className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-1 font-semibold">
                Available at {currentBranch?.branch_name || 'Branch'}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Loaded Into Truck</div>
              <div className="text-2xl font-black text-cyan-500 dark:text-cyan-400 font-mono">
                {loadedItems.length}
              </div>
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {loadedPackages} packages selected
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Weight Utilization</div>
              <div className={`text-2xl font-black font-mono ${
                isOverweight ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'
              }`}>
                {weightUtilizationPct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                {loadedWeight.toFixed(1)} / {maxVehicleWeightTons.toFixed(1)} Tons
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Volume Capacity</div>
              <div className={`text-2xl font-black font-mono ${
                isOvervolume ? 'text-rose-500' : 'text-amber-500 dark:text-amber-400'
              }`}>
                {volumeUtilizationPct}%
              </div>
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {loadedVolume.toFixed(1)} / {maxVehicleVolumeM3.toFixed(1)} m³
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Expected Trip Revenue</div>
              <div className="text-2xl font-black text-purple-500 dark:text-purple-400 font-mono">
                ₹{Math.round(loadedFreightRevenue).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400/80 mt-1 font-semibold">
                Freight sum of loaded items
              </div>
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
                {/* Truck Header Bar with Real Vehicle Selector */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b mb-4 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Truck className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedVehicleId}
                          onChange={(e) => {
                            setSelectedVehicleId(e.target.value);
                            setSelectedFeet(null);
                            const v = vehicles.find((veh) => veh.id === e.target.value);
                            if (v?.assignedDriver?.id) setSelectedDriverId(v.assignedDriver.id);
                            if (v?.current_odometer) setStartOdometer(v.current_odometer.toString());
                          }}
                          className={`font-bold text-sm bg-transparent border-b border-dashed focus:outline-none cursor-pointer ${
                            isDark ? 'border-slate-700 text-white' : 'border-slate-300 text-slate-900'
                          }`}
                        >
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                              {v.vehicle_number} ({v.capacity_ton || 16}T {v.vehicle_type || 'Truck'})
                            </option>
                          ))}
                        </select>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          isDark 
                            ? 'bg-blue-500/20 text-cyan-300 border-blue-500/30' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {maxVehicleWeightTons}T RATED • {activeTruckConfig.feet}FT
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Origin: <span className="font-semibold text-cyan-400">{currentBranch?.branch_name || 'Origin'}</span> ➔ 
                        Destination: <span className="font-semibold">{branches.find((b) => b.id === destBranchId)?.branch_name || 'Delivery Hub'}</span>
                      </p>
                    </div>
                  </div>

                  {/* 2 Real-Time Capacity Badges */}
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className={`px-2.5 py-1 rounded-xl border ${
                      isOvervolume
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : isDark 
                        ? 'bg-slate-900 border-slate-800 text-cyan-400' 
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      Vol: {loadedVolume.toFixed(1)} / {maxVehicleVolumeM3.toFixed(1)} m³ ({volumeUtilizationPct}%)
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl border ${
                      isOverweight
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : isDark 
                        ? 'bg-slate-900 border-slate-800 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      Wt: {loadedWeight.toFixed(1)} / {maxVehicleWeightTons.toFixed(1)} T ({weightUtilizationPct}%)
                    </span>
                  </div>
                </div>

                {/* Real 3D Parametric Truck with 360 Turntable & Live Volumetric Box Stacking */}
                <div className="mt-1">
                  <Truck3DViewer
                    currentVehicle={currentVehicle}
                    loadedItems={loadedItems}
                    selectedFeet={selectedFeet}
                    onFeetChange={(newFeet) => setSelectedFeet(newFeet)}
                    isDark={isDark}
                    hoveredConsignmentId={hoveredConsignmentId}
                    onSelectConsignment={(c) => toggleLoad(c.id)}
                  />
                </div>

                {/* Warehouse Docks Management */}
                <div className={`mt-5 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Warehouse className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Warehouse Loading Docks ({currentBranch?.branch_name || 'Hub Floor'})
                      </h3>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {currentBranch?.is_hub ? 'Active Transshipment Hub' : 'Branch Cross-Dock Bay'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Dock 01 */}
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
                          Staging
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                        {currentVehicle?.vehicle_number || 'TRUCK-1'}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {weightUtilizationPct}% Full ({loadedItems.length} LRs)
                      </div>
                    </div>

                    {/* Dock 02 */}
                    <div
                      onClick={() => setActiveDock('DOCK_02')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        activeDock === 'DOCK_02'
                          ? isDark ? 'bg-blue-950/40 border-cyan-400' : 'bg-emerald-50/80 border-emerald-500'
                          : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>Dock 02</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400">
                          Ready
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Direct Haul
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Sealed & Cleared
                      </div>
                    </div>

                    {/* Dock 03 */}
                    <div
                      onClick={() => setActiveDock('DOCK_03')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        activeDock === 'DOCK_03'
                          ? isDark ? 'bg-blue-950/40 border-cyan-400' : 'bg-amber-50/80 border-amber-500'
                          : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>Dock 03</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400">
                          Inbound
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        Unloading Bay
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Transshipment Inflow
                      </div>
                    </div>

                    {/* Dock 04 */}
                    <div
                      onClick={() => setActiveDock('DOCK_04')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        activeDock === 'DOCK_04'
                          ? isDark ? 'bg-blue-950/40 border-cyan-400' : 'bg-blue-50/80 border-blue-400'
                          : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>Dock 04</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-400">
                          Empty
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Available Bay
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Ready for Next Fleet
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
                      Staged Consignments ({stagedConsignments.length})
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    Click to Toggle
                  </span>
                </div>

                {loadingConsignments ? (
                  <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RotateCw className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span>Loading dock dockets...</span>
                  </div>
                ) : stagedConsignments.length === 0 ? (
                  <div className="py-14 text-center space-y-2">
                    <Package className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-bold">No Dockets Staged in This Dock</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      {selectedBranchId === 'ALL'
                        ? 'All registered consignments across all hubs have been dispatched or completed.'
                        : 'No pending consignments found for this branch. Try switching to "All Docks" in the top bar.'}
                    </p>
                    <Link
                      href="/bookings"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Bilty</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                    {stagedConsignments.map((item) => {
                      const isLoaded = loadedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleLoad(item.id)}
                          onMouseEnter={() => setHoveredConsignmentId(item.id)}
                          onMouseLeave={() => setHoveredConsignmentId(null)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isLoaded
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
                              {isLoaded ? (
                                <CheckSquare className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                              ) : (
                                <Square className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                              )}
                              <span className={`font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {item.docket_number}
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
                          <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            To: {item.receiver}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mt-1">
                            <span className="truncate">{item.origin_city || item.origin}</span>
                            <span>➔</span>
                            <span className="truncate">{item.destination_city || item.destination}</span>
                          </div>
                          <div className={`text-[10px] truncate text-slate-500 mt-0.5`}>
                            {item.items} • {item.packages} Pkgs
                          </div>

                          <div className={`flex items-center justify-between text-[10px] font-mono mt-2 pt-2 border-t ${
                            isDark ? 'border-slate-800/60 text-cyan-400' : 'border-slate-200 text-blue-600 font-semibold'
                          }`}>
                            <span>{item.weight_kg ? `${item.weight_kg.toLocaleString()} KG` : `${item.weight_t} Tons`} ({item.volume_m3} m³)</span>
                            <span className="font-bold text-emerald-500">₹{Math.round(item.amount).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div className={`mt-4 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    onClick={handleOpenDispatchModal}
                    disabled={loadedItems.length === 0}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-md shadow-cyan-500/20 text-center block transition-all active:scale-95 disabled:opacity-50"
                  >
                    Lock & Confirm {loadedItems.length} Consignments ➔
                  </button>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* 4. Confirm Dispatch & Seal Truck Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl p-6 space-y-5 ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Generate Dispatch Manifest</h3>
                  <p className="text-xs text-slate-400">Lock truck seal, assign driver, and generate trip sheet</p>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Load Overview Summary Strip */}
            <div className={`p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-3 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Vehicle</p>
                <p className="text-xs font-bold text-cyan-400 mt-0.5">{currentVehicle?.vehicle_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Loaded Dockets</p>
                <p className="text-xs font-bold text-white mt-0.5">{loadedItems.length} LRs ({loadedPackages} Pkgs)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Weight</p>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">{loadedWeight.toFixed(2)} Tons</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Trip Revenue</p>
                <p className="text-xs font-bold text-purple-400 mt-0.5">₹{Math.round(loadedFreightRevenue).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Origin Departure Hub */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Origin Departure Hub*</label>
                  <select
                    value={modalOriginBranchId}
                    onChange={(e) => setModalOriginBranchId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} {b.is_hub ? '(Hub)' : ''} - {b.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Hub / Branch */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Destination Hub*</label>
                  <select
                    value={destBranchId}
                    onChange={(e) => setDestBranchId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {branches.filter((b) => b.id !== modalOriginBranchId).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} {b.is_hub ? '(Hub)' : ''} - {b.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Certified Driver */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Driver*</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">Select Certified Driver</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.phone || 'Driver'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Container Seal Number */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Container Seal #*</label>
                  <input
                    type="text"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value)}
                    placeholder="e.g. SEAL-88192"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Current / Starting Odometer */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Starting Odometer (KM)*</label>
                  <input
                    type="number"
                    value={startOdometer}
                    onChange={(e) => setStartOdometer(e.target.value)}
                    placeholder="e.g. 45210"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Dispatch Remarks */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gate Pass / Dispatch Remarks</label>
                <textarea
                  rows={2}
                  value={dispatchRemarks}
                  onChange={(e) => setDispatchRemarks(e.target.value)}
                  placeholder="e.g. Cleared dock inspection. Driver instructed via Expressway route."
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={dispatching}
                onClick={handleConfirmDispatch}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {dispatching && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Authorize & Dispatch Truck</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Dispatch Success Modal */}
      {successResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 text-center space-y-4 ${
            isDark ? 'bg-[#0E1526] border-emerald-500/40 text-white' : 'bg-white border-emerald-500/40 text-slate-900'
          }`}>
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-emerald-400">Truck Dispatched Successfully!</h3>
              <p className="text-xs text-slate-400 mt-1">Trip manifest & gate pass generated atomically in database</p>
            </div>

            <div className={`p-4 rounded-2xl border text-left space-y-2 text-xs font-mono ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-500">Trip Code:</span>
                <span className="font-bold text-cyan-400">{successResult.tripNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatch Challan:</span>
                <span className="font-bold text-white">{successResult.dispatchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle Assigned:</span>
                <span className="font-bold text-white">{successResult.vehicleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">En-Route Destination:</span>
                <span className="font-bold text-white">{successResult.destination}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-500">Cargo Handled:</span>
                <span className="font-bold text-emerald-400">{successResult.packagesCount} Pkgs ({successResult.totalWeight} T)</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setSuccessResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => router.push('/dispatches')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <span>View in Dispatches</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
