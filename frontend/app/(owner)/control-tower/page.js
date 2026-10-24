// frontend/app/(owner)/control-tower/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import LoadingState from '../../../components/ui/LoadingState';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';
import { useTheme } from '../../../components/ThemeProvider';
import { useStore } from '../../../store/useStore';
import { usePermissions } from '../../../hooks/usePermissions';
import { useOperationsType } from '../../../hooks/useOperationsType';
import api from '../../../services/api';
import {
  Compass,
  Truck,
  AlertTriangle,
  Clock,
  MapPin,
  FileCheck,
  ShieldCheck,
  Navigation,
  Activity,
  Layers,
  Fuel,
  Gauge,
  Phone,
  MessageSquare,
  Radio,
  CheckCircle2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Flame,
  ArrowUpRight,
  X,
  Package,
  Boxes,
  Plus,
  Building2,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';

// Dynamically import the real Leaflet India Map with SSR disabled
const IndiaFleetMap = dynamic(
  () => import('../../../components/map/IndiaFleetMap'),
  {
    ssr: false,
    loading: () => (
      <LoadingState
        title="Calibrating Fleet Telemetry..."
        description="Connecting to real-time GPS sensors, active dispatches & highway tracking"
        minHeight="min-h-[460px]"
      />
    )
  }
);

export default function ControlTowerPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const user = useStore((state) => state.user);
  const activeBranch = useStore((state) => state.activeBranch);
  const { isAdmin, isBranchManager } = usePermissions();
  const { isFleetSupplier, isDirectCarrier, allowsMultiBranchHubs } = useOperationsType();
  const isDirectOrVendorMode = isFleetSupplier || isDirectCarrier || !allowsMultiBranchHubs;

  const stripHub = (str) => isDirectOrVendorMode ? String(str || '').replace(/\bhub\b/gi, '').replace(/\s+/g, ' ').trim() : String(str || '').trim();

  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || user?.assigned_branch_id || null;
  const isRestrictedBranchUser = useMemo(() => {
    if (!user) return false;
    if (isBranchManager) return true;
    const r = (user.role || '').toUpperCase();
    if (r === 'BRANCH_MANAGER' || r === 'HUB_MANAGER') return true;
    if (Array.isArray(user.roles) && user.roles.some((role) => {
      const name = typeof role === 'string' ? role : role?.name || '';
      return name.toUpperCase() === 'BRANCH_MANAGER' || name.toUpperCase() === 'HUB_MANAGER';
    })) return true;
    if (user?.designation?.toLowerCase().includes('branch')) return true;
    if (!isAdmin && userBranchId) return true;
    return false;
  }, [user, isBranchManager, isAdmin, userBranchId]);

  const [branches, setBranches] = useState([]);
  const [telemetryVehicles, setTelemetryVehicles] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (isRestrictedBranchUser && userBranchId) return userBranchId;
    if (activeBranch?.id && activeBranch.id !== 'ALL') return activeBranch.id;
    return 'ALL';
  });

  useEffect(() => {
    if (isRestrictedBranchUser && userBranchId && selectedBranchId !== userBranchId) {
      setSelectedBranchId(userBranchId);
    }
  }, [isRestrictedBranchUser, userBranchId]);

  const [loading, setLoading] = useState(true);
  const [tripsData, setTripsData] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeLayer, setActiveLayer] = useState('ALL');
  const [currentTime, setCurrentTime] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMapModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch real LIVE database data
  const fetchControlTowerData = useCallback(async () => {
    try {
      setLoading(true);
      let tripsUrl = '/trips?limit=100';
      if (selectedBranchId && selectedBranchId !== 'ALL') {
        tripsUrl += `&branch_id=${selectedBranchId}`;
      }

      const [tripsRes, dashRes, branchRes, teleRes] = await Promise.allSettled([
        api.get(tripsUrl),
        api.get('/dashboard/owner'),
        api.get('/branches').catch(() => ({ data: { data: [] } })),
        api.get('/gps/telemetry').catch(() => ({ data: { data: [] } })),
      ]);

      let loadedTrips = [];
      if (tripsRes.status === 'fulfilled' && tripsRes.value?.data?.success) {
        loadedTrips = tripsRes.value.data.data || [];
        setTripsData(loadedTrips);
      }

      if (dashRes.status === 'fulfilled' && dashRes.value?.data?.success) {
        setDashboardMetrics(dashRes.value.data.data);
      }

      if (branchRes.status === 'fulfilled') {
        const bList = branchRes.value.data?.data?.branches || branchRes.value.data?.data || [];
        setBranches(Array.isArray(bList) ? bList : []);
      }

      if (teleRes.status === 'fulfilled' && teleRes.value?.data?.success) {
        const tList = teleRes.value.data.data || [];
        setTelemetryVehicles(Array.isArray(tList) ? tList : []);
      }
    } catch (err) {
      console.error('Failed to load live control tower data', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchControlTowerData();
  }, [fetchControlTowerData]);

  // Recurring 10-second high-precision GPS telematics polling
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await api.get('/gps/telemetry');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setTelemetryVehicles(res.data.data);
        }
      } catch (teleErr) {
        // quiet catch
      }
    };
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  const normalizePlate = (str) => String(str || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Combined fleet: Real WheelsEye fleet vehicles with live GPS + Any active trips merged
  const allFleetVehicles = useMemo(() => {
    // 1. Index active trips by normalized vehicle plate or vehicle id
    const tripByPlate = new Map();
    const tripByVehicleId = new Map();

    (tripsData || []).forEach((t) => {
      const status = (t.status || '').toUpperCase();
      const isActive = ['RUNNING', 'IN_TRANSIT', 'DISPATCHED', 'LOADING', 'CREATED', 'PLANNED', 'READY'].includes(status)
        || (!['COMPLETED', 'CANCELLED', 'SETTLED'].includes(status) && Boolean(status));
      if (!isActive) return;

      if (t.vehicle?.vehicle_number) {
        tripByPlate.set(normalizePlate(t.vehicle.vehicle_number), t);
      }
      if (t.vehicle_number) {
        tripByPlate.set(normalizePlate(t.vehicle_number), t);
      }
      if (t.vehicle_id) {
        tripByVehicleId.set(t.vehicle_id, t);
      }
    });

    // 2. Base list is derived from real fleet vehicles with active GPS telemetry
    const result = [];
    const seenPlates = new Set();
    const seenTripIds = new Set();

    (telemetryVehicles || []).forEach((tv) => {
      const norm = normalizePlate(tv.vehicle_number);
      if (!norm || seenPlates.has(norm)) return;

      const realLat = parseFloat(tv.last_latitude);
      const realLng = parseFloat(tv.last_longitude);
      const hasRealGps = !isNaN(realLat) && !isNaN(realLng) && realLat > 0 && realLng > 0;
      if (!hasRealGps) return; // Only include real vehicles with valid coordinates

      seenPlates.add(norm);

      const liveSpeed = parseFloat(tv.last_speed || 0);
      const isMoving = liveSpeed > 0;
      const liveIgnition = Boolean(tv.last_ignition);
      const locName = tv.last_location_name || tv.branch?.city || 'Depot Yard';

      // Check if this vehicle is currently assigned to an active trip
      const matchingTrip = tripByPlate.get(norm) || (tv.id ? tripByVehicleId.get(tv.id) : null);

      if (matchingTrip) {
        seenTripIds.add(matchingTrip.id);
        if (matchingTrip.trip_number) seenTripIds.add(matchingTrip.trip_number);

        const rawOCity = matchingTrip.origin_city || matchingTrip.originBranch?.city || matchingTrip.originBranch?.branch_name || 'Origin';
        const rawDCity = matchingTrip.destination_city || matchingTrip.destBranch?.city || matchingTrip.destBranch?.branch_name || 'Destination';
        const oCity = stripHub(rawOCity);
        const dCity = stripHub(rawDCity);
        const dName = matchingTrip.driver?.name || matchingTrip.driver_name || tv.driver?.name || 'Driver In-charge';
        const dPhone = matchingTrip.driver?.phone || matchingTrip.driver_phone || tv.driver?.phone || '+91 98000 00000';
        const isTransit = ['IN_TRANSIT', 'RUNNING', 'DISPATCHED'].includes((matchingTrip.status || '').toUpperCase());
        const isPlacement = matchingTrip.trip_mode === 'DIRECT_VEHICLE_HIRE';

        result.push({
          id: tv.id || matchingTrip.id,
          rawId: tv.id,
          tripId: matchingTrip.id,
          trip_number: matchingTrip.trip_number || `TRP-${tv.vehicle_number}`,
          vehicleNumber: tv.vehicle_number,
          vehicle_model: tv.vehicle_type || matchingTrip.vehicle?.vehicle_type || (isPlacement ? 'Dedicated FTL Truck' : 'Commercial Truck (16T)'),
          driver: dName,
          driver_phone: dPhone,
          rating: '4.9 ★',
          origin: oCity,
          destination: dCity,
          originCity: oCity,
          destCity: dCity,
          origin_branch_name: matchingTrip.originBranch?.branch_name,
          dest_branch_name: matchingTrip.destBranch?.branch_name,
          route: isTransit && oCity !== dCity ? `${oCity} ➔ ${dCity}` : `${locName} Corridor`,
          status: matchingTrip.status || (isMoving ? 'IN_TRANSIT' : 'IDLE'),
          status_label: matchingTrip.status === 'IN_TRANSIT'
            ? 'In Transit (On Road)'
            : matchingTrip.status === 'RUNNING'
              ? 'Running'
              : matchingTrip.status === 'DISPATCHED'
                ? 'Dispatched'
                : isMoving
                  ? 'Moving on Highway'
                  : liveIgnition
                    ? 'Engine Idle (Ignition ON)'
                    : 'Stationed at Yard',
          isTransit,
          isMoving,
          latitude: realLat,
          longitude: realLng,
          angle: parseFloat(tv.last_heading || 0),
          speed: `${liveSpeed} km/h`,
          ignition: liveIgnition,
          fuel: tv.fuel_level ? `${tv.fuel_level}%` : '74%',
          remaining_km: isTransit ? '320 km' : '0 km',
          eta: matchingTrip.trip_date ? `${new Date(matchingTrip.trip_date).toLocaleDateString()} Arrival` : 'On Schedule',
          on_time_buffer: '+1h 45m',
          progress: isTransit ? 55 : 0,
          cargo: matchingTrip.total_weight ? `${Number(matchingTrip.total_weight).toLocaleString()} KG • ${matchingTrip.total_packages || 0} Pkgs` : (isPlacement ? 'Dedicated Placement Cargo' : 'General Freight Cargo'),
          location: locName,
          total_weight: matchingTrip.total_weight || 0,
          total_packages: matchingTrip.total_packages || 0,
          driver_advance: matchingTrip.driver_advance || 0,
          total_expenses: matchingTrip.total_expenses || 0,
          hasRealGps: true,
          gps_provider_name: tv.gps_provider_name || 'WheelsEye Fleet GPS',
          provider: tv.gps_provider_name || 'WheelsEye Fleet GPS',
          hasActiveTrip: true,
          isPlacement,
          rawTrip: matchingTrip,
        });
      } else {
        // Vehicle has NO active trip: It is in Yard or Standby
        result.push({
          id: tv.id,
          rawId: tv.id,
          tripId: null,
          trip_number: `GPS-${tv.vehicle_number}`,
          vehicleNumber: tv.vehicle_number,
          vehicle_model: tv.vehicle_type || 'Commercial Truck (16T)',
          driver: tv.driver?.name || 'Driver Standby',
          driver_phone: tv.driver?.phone || '+91 98000 00000',
          rating: '4.9 ★',
          origin: locName,
          destination: locName,
          originCity: locName,
          destCity: locName,
          route: `${locName} (Yard Available)`,
          status: liveIgnition ? (isMoving ? 'MOVING_LOCAL' : 'IDLE') : 'PARKED',
          status_label: isMoving
            ? 'Moving (Local Transit)'
            : liveIgnition
              ? 'Engine Idle (Ignition ON)'
              : 'Stationed at Yard',
          isTransit: false,
          isMoving,
          latitude: realLat,
          longitude: realLng,
          angle: parseFloat(tv.last_heading || 0),
          speed: `${liveSpeed} km/h`,
          ignition: liveIgnition,
          fuel: tv.fuel_level ? `${tv.fuel_level}%` : '78%',
          remaining_km: '0 km',
          eta: 'Standby / Ready',
          on_time_buffer: 'Ready',
          progress: 0,
          cargo: 'Available for Dispatch',
          location: locName,
          total_weight: 0,
          total_packages: 0,
          driver_advance: 0,
          total_expenses: 0,
          hasRealGps: true,
          gps_provider_name: tv.gps_provider_name || 'WheelsEye Fleet GPS',
          provider: tv.gps_provider_name || 'WheelsEye Fleet GPS',
          hasActiveTrip: false,
          rawTrip: null,
        });
      }
    });

    // 3. Always include ALL active trips from tripsData (running trips, dedicated vehicle placements, dispatches)
    (tripsData || []).forEach((t) => {
      const status = (t.status || '').toUpperCase();
      const isActive = ['RUNNING', 'IN_TRANSIT', 'DISPATCHED', 'LOADING', 'CREATED', 'PLANNED', 'READY'].includes(status)
        || (!['COMPLETED', 'CANCELLED', 'SETTLED'].includes(status) && Boolean(status));
      if (!isActive) return;

      const tripId = t.id || t.trip_number;
      if (seenTripIds.has(t.id) || seenTripIds.has(tripId)) return;

      const plate = t.vehicle?.vehicle_number || t.vehicle_number || t.party_ref_number || (t.trip_mode === 'DIRECT_VEHICLE_HIRE' ? `FTL-${t.trip_number}` : `TRP-${t.trip_number}`);
      const norm = normalizePlate(plate);
      if (norm && seenPlates.has(norm)) return;

      if (norm) seenPlates.add(norm);
      seenTripIds.add(t.id || tripId);

      const rawOCity = t.origin_city || t.originBranch?.city || t.originBranch?.branch_name || 'Origin';
      const rawDCity = t.destination_city || t.destBranch?.city || t.destBranch?.branch_name || rawOCity;
      const oCity = stripHub(rawOCity);
      const dCity = stripHub(rawDCity);
      const isTransit = ['IN_TRANSIT', 'RUNNING', 'DISPATCHED', 'READY'].includes(status) || (oCity !== dCity);
      const isPlacement = t.trip_mode === 'DIRECT_VEHICLE_HIRE';
      const dName = t.driver?.name || t.driver_name || (t.hiring_party_name ? `${t.hiring_party_name} (Hiring Party)` : 'Assigned Pilot');
      const dPhone = t.driver?.phone || t.driver_phone || '+91 98000 00000';
      const vehModel = t.vehicle?.vehicle_type || (isPlacement ? 'Dedicated FTL Placement' : 'Commercial Freight Truck');
      const locName = `${oCity} ➔ ${dCity} Corridor`;

      result.push({
        id: t.id,
        rawId: t.vehicle_id || t.id,
        tripId: t.id,
        trip_number: t.trip_number,
        vehicleNumber: plate,
        vehicle_model: vehModel,
        driver: dName,
        driver_phone: dPhone,
        rating: '4.9 ★',
        origin: oCity,
        destination: dCity,
        originCity: oCity,
        destCity: dCity,
        origin_branch_name: t.originBranch?.branch_name || oCity,
        dest_branch_name: t.destBranch?.branch_name || dCity,
        route: oCity !== dCity ? `${oCity} ➔ ${dCity}` : `${oCity} Local Transit`,
        status: t.status || 'RUNNING',
        status_label: t.status === 'RUNNING'
          ? 'Running'
          : (t.status === 'IN_TRANSIT'
            ? 'In Transit (On Road)'
            : (t.status === 'DISPATCHED' ? 'Dispatched' : (t.status || 'Active'))),
        isTransit,
        isMoving: isTransit,
        latitude: t.vehicle?.last_latitude || t.last_latitude || null,
        longitude: t.vehicle?.last_longitude || t.last_longitude || null,
        angle: 45,
        speed: status === 'RUNNING' || status === 'IN_TRANSIT' ? '56 km/h' : '0 km/h',
        ignition: true,
        fuel: '84%',
        remaining_km: '240 km',
        eta: t.trip_date ? `${new Date(t.trip_date).toLocaleDateString()} Arrival` : 'On Schedule',
        on_time_buffer: '+45m',
        progress: 55,
        cargo: t.total_weight ? `${Number(t.total_weight).toLocaleString()} KG • ${t.total_packages || 1} Pkgs` : (t.goods_description || (isPlacement ? 'Dedicated Placement Cargo' : 'General Freight Cargo')),
        location: locName,
        total_weight: t.total_weight || 0,
        total_packages: t.total_packages || 1,
        driver_advance: t.driver_advance || 0,
        total_expenses: t.total_expenses || 0,
        hasRealGps: Boolean(t.vehicle?.last_latitude && t.vehicle?.last_longitude),
        gps_provider_name: isPlacement ? 'Vehicle Placement' : 'Active Dispatch',
        provider: isPlacement ? 'Dedicated Placement' : 'Fleet Dispatch',
        hasActiveTrip: true,
        isPlacement,
        rawTrip: t,
      });
    });

    return result;
  }, [tripsData, telemetryVehicles]);

  // Real Active Running Trips (Trips assigned to vehicles in transit)
  const runningTrips = useMemo(() => {
    return allFleetVehicles.filter((v) => v.hasActiveTrip && v.isTransit);
  }, [allFleetVehicles]);

  // Moving and Parked splits
  const movingVehicles = useMemo(() => allFleetVehicles.filter((v) => parseFloat(v.speed || 0) > 0), [allFleetVehicles]);
  const parkedVehicles = useMemo(() => allFleetVehicles.filter((v) => parseFloat(v.speed || 0) === 0), [allFleetVehicles]);

  // Filtered trips based on active layer
  const displayedTrips = useMemo(() => {
    if (activeLayer === 'CORRIDORS') {
      return allFleetVehicles.filter((t) => t.isTransit || t.hasActiveTrip);
    }
    if (activeLayer === 'GEOFENCE') {
      return allFleetVehicles.filter((t) => parseFloat(t.speed || 0) > 0);
    }
    return allFleetVehicles;
  }, [allFleetVehicles, activeLayer]);

  // Real KPI metrics from database
  const activeCount = runningTrips.length;
  const onScheduleCount = runningTrips.filter((t) => t.status !== 'DELAYED').length;
  const delayedCount = runningTrips.filter((t) => t.status === 'DELAYED').length;
  const totalWeightInMotion = runningTrips.reduce((acc, t) => acc + Number(t.total_weight || 0), 0);
  const totalPackagesInMotion = runningTrips.reduce((acc, t) => acc + Number(t.total_packages || 0), 0);
  const totalBookingsCount = dashboardMetrics?.totalBookings || tripsData.length;

  const queueColumns = useMemo(() => [
    {
      key: 'trip_number',
      label: 'Trip ID',
      width: 140,
      minWidth: 110,
      sortable: true,
      render: (val) => <span className="font-mono font-bold text-cyan-400">{val}</span>
    },
    {
      key: 'vehicleNumber',
      label: 'Vehicle & Type',
      width: 170,
      minWidth: 140,
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">{val}</div>
          <div className="text-[10px] text-slate-400">{row.vehicle_model}</div>
        </div>
      )
    },
    {
      key: 'route',
      label: 'Route Corridor',
      width: 170,
      minWidth: 130,
      sortable: true,
      render: (val) => <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">{val}</span>
    },
    {
      key: 'location',
      label: 'Live GPS Location',
      width: 200,
      minWidth: 160,
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-cyan-400 shrink-0">📍</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[190px]">
            {val || 'Live Telematics'}
          </span>
        </div>
      )
    },
    {
      key: 'driver',
      label: 'Driver Contact',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.driver_phone}</div>
        </div>
      )
    },
    {
      key: 'speed',
      label: 'Speed',
      width: 110,
      minWidth: 90,
      sortable: true,
      render: (val) => <span className="font-mono font-bold text-cyan-600 dark:text-cyan-300">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      width: 130,
      minWidth: 110,
      sortable: true,
      align: 'center',
      render: (val, row) => <Badge status={val} size="xs" />
    },
    {
      key: 'cargo',
      label: 'Payload',
      width: 140,
      minWidth: 110,
      sortable: false,
      render: (val) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val}</span>
    },
    {
      key: 'actions',
      label: 'Radar Action',
      width: 110,
      minWidth: 90,
      sortable: false,
      align: 'center',
      render: (val, row) => {
        const isCurrent = selectedTrip?.id === row.id;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTrip(row);
              window.scrollTo({ top: 350, behavior: 'smooth' });
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold shadow-xs transition-all ${isCurrent
                ? 'bg-cyan-500 text-slate-950 font-black shadow-cyan-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
          >
            {isCurrent ? '● On Radar' : 'Locate'}
          </button>
        );
      }
    }
  ], [selectedTrip]);

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
      } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 w-full max-w-full">

          {/* 24x7 Operations Command Strip Header */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <h1 className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-black tracking-tight text-balance sm:whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                      24x7 Real-Time Control Tower
                    </h1>
                    <button
                      onClick={fetchControlTowerData}
                      disabled={loading}
                      className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${isDark
                          ? 'bg-slate-900/80 border-slate-800 text-cyan-400 hover:text-white hover:border-slate-700'
                          : 'bg-white border-slate-200 text-blue-600 hover:text-blue-900 shadow-xs'
                        }`}
                      title="Refresh Live Fleet Telemetry"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'} ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <p className={`text-xs sm:text-[13px] xl:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate sm:whitespace-normal`}>
                    Live highway corridor GPS tracking, active trip telemetry & exception command center.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Branch / Transporter Scope Selector: only for multi-branch admins */}
              {!isRestrictedBranchUser && (
                <BranchFilterDropdown
                  selectedBranchId={selectedBranchId}
                  onChange={(newBranchId) => setSelectedBranchId(newBranchId)}
                  branches={branches}
                  allLabel="All Branches"
                  allSubtitle="Nationwide Fleet Telemetry"
                  label="Branch:"
                  showLabel={true}
                  align="right"
                />
              )}

              {/* Live IST Radar Time */}
              <div className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-xs font-mono font-bold shrink-0 whitespace-nowrap ${isDark ? 'bg-slate-900/90 border-slate-800 text-cyan-300' : 'bg-white border-slate-200 text-blue-700 shadow-xs'
                }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>IST: {currentTime || '07:24:32 PM'}</span>
                <span className="hidden xl:inline text-[10px] text-emerald-400 font-sans">• LIVE RADAR</span>
              </div>

              {/* New Trip Button */}
              <Link
                href="/load-planning"
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Trip</span>
              </Link>
            </div>
          </div>

          {/* Top 6 Control Command Counters (Live from DB) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Active Trips In Motion</div>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">{activeCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">Live trip sheets on road</div>
            </div>

            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">On Schedule</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{onScheduleCount}</div>
              <div className="text-[10px] text-emerald-400/80 mt-1">
                {activeCount > 0 ? `${Math.round((onScheduleCount / activeCount) * 100)}% on time` : 'Normal transit'}
              </div>
            </div>

            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Delayed / Critical</div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">{delayedCount}</div>
              <div className="text-[10px] text-rose-400/80 mt-1">Toll queues or halt</div>
            </div>

            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">In-Flight Payload</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {totalWeightInMotion > 0 ? `${(totalWeightInMotion / 1000).toFixed(1)} T` : '0 T'}
              </div>
              <div className="text-[10px] text-amber-400/80 mt-1">{totalPackagesInMotion} Packages</div>
            </div>

            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Trips MTD</div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {tripsData.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Logged in database</div>
            </div>

            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Consignments Handled</div>
              <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">{totalBookingsCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">Total commercial dockets</div>
            </div>
          </div>

          {/* Main Cockpit: Real Leaflet Map & Queue (8 Cols on xl+) + Telemetry & Exceptions (4 Cols on xl+) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">

            {/* Left Column: Full GPS Leaflet Map & Active Dispatch Queue (8 Columns on xl+, 100% on 1024px laptop & tablets) */}
            <div className="xl:col-span-8 flex flex-col h-full space-y-5">

              {/* Real Interactive Leaflet India Map (Same as Dashboard, Showing only Running Trips) */}
              <div className={`isolate relative z-0 p-4 sm:p-5 rounded-3xl border shadow-xl overflow-hidden flex flex-col justify-between flex-1 h-full ${isDark ? 'bg-[#070B14] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Map Toolbar */}
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 z-10 pb-3 border-b min-w-0 ${isDark ? 'border-slate-800/80' : 'border-slate-200'
                  }`}>
                  <div className="flex items-center space-x-2.5 min-w-0 shrink">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-nowrap">
                        <span className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          All-India Live Fleet Radar
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black border shrink-0 ${isDark
                            ? 'text-cyan-400 bg-cyan-950/80 border-cyan-500/30'
                            : 'text-blue-700 bg-blue-50 border-blue-200'
                          }`}>
                          {allFleetVehicles.length} TRUCKS LIVE
                        </span>
                      </div>
                      <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedTrip ? `Focused on ${selectedTrip.vehicleNumber} • ${selectedTrip.location}` : 'Pan-India Real-Time GPS Tracking'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 overflow-x-auto scrollbar-none">
                    {/* Top Vehicle Quick-Selector */}
                    <div className="relative w-full sm:w-48 lg:w-52 shrink-0">
                      <select
                        id="control-tower-vehicle-picker"
                        value={selectedTrip ? (selectedTrip.vehicleNumber || selectedTrip.id) : 'ALL'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'ALL') {
                            setSelectedTrip(null);
                          } else {
                            const found = allFleetVehicles.find((v) => (v.vehicleNumber || v.id) === val);
                            if (found) setSelectedTrip(found);
                          }
                        }}
                        className={`w-full text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-xl border appearance-none cursor-pointer transition-all shadow-xs truncate ${isDark
                            ? 'bg-slate-900/90 border-slate-700 text-cyan-300 hover:border-cyan-400'
                            : 'bg-white border-slate-300 text-slate-800 hover:border-blue-500'
                          }`}
                      >
                        <option value="ALL">🌐 All India ({allFleetVehicles.length} Trucks)</option>
                        {movingVehicles.length > 0 && (
                          <optgroup label="⚡ In Transit / Moving">
                            {movingVehicles.map((v) => (
                              <option key={v.id} value={v.vehicleNumber}>
                                🟢 {v.vehicleNumber} • {v.speed} • {v.location}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="🅿️ Stationed at Yard / Depots">
                          {parkedVehicles.map((v) => (
                            <option key={v.id} value={v.vehicleNumber}>
                              🅿️ {v.vehicleNumber} • 0 km/h • {v.location}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>

                    {/* Layer Filter Pills */}
                    <div className={`flex items-center gap-1 text-[11px] font-semibold p-1 rounded-xl border shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}>
                      <button
                        onClick={() => setActiveLayer('ALL')}
                        className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${activeLayer === 'ALL'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        All Fleet ({allFleetVehicles.length})
                      </button>
                      <button
                        onClick={() => setActiveLayer('CORRIDORS')}
                        className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${activeLayer === 'CORRIDORS'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        Corridors ({runningTrips.length})
                      </button>
                      <button
                        onClick={() => setActiveLayer('GEOFENCE')}
                        className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${activeLayer === 'GEOFENCE'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        Moving ({movingVehicles.length})
                      </button>
                    </div>

                    {/* Reset to Full India Overview Button */}
                    {selectedTrip && (
                      <button
                        onClick={() => setSelectedTrip(null)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                          }`}
                        title="Reset radar to full country view"
                      >
                        <RotateCcw className="w-3 h-3 text-cyan-400" />
                        <span className="whitespace-nowrap">All India</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsMapModalOpen(true)}
                      className={`p-1.5 rounded-xl border transition-colors shrink-0 ${isDark
                          ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      title="Expand Map to Fullscreen"
                    >
                      <Maximize2 className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                    </button>
                  </div>
                </div>

                {/* Leaflet Map Body */}
                <div className="w-full mt-3 flex-1 flex flex-col min-h-0">
                  {allFleetVehicles.length === 0 ? (
                    <div className={`w-full flex-1 min-h-[460px] lg:min-h-[550px] rounded-2xl border flex flex-col items-center justify-center p-6 text-center transition-colors ${isDark
                        ? 'bg-[#070B14] border-slate-800 text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border ${isDark
                          ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                          : 'bg-blue-50 border-blue-200 text-blue-600'
                        }`}>
                        <Truck className="w-7 h-7" />
                      </div>
                      <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selectedBranchId && selectedBranchId !== 'ALL'
                          ? `No Active Running Trips for ${branches.find((b) => b.id === selectedBranchId)?.branch_name || 'Selected Branch'}`
                          : 'No Active Running Trips'}
                      </h4>
                      <p className={`text-xs max-w-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedBranchId && selectedBranchId !== 'ALL'
                          ? 'No active dispatches originating or terminating at this branch. Switch to All Branches or create a new dispatch.'
                          : 'All commercial vehicles are currently halted or at yard. Vehicles without an active trip sheet are hidden from the live highway radar.'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {selectedBranchId && selectedBranchId !== 'ALL' && !isRestrictedBranchUser && (
                          <button
                            type="button"
                            onClick={() => setSelectedBranchId('ALL')}
                            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${isDark ? 'border-slate-700 bg-slate-800 text-cyan-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-blue-700 hover:bg-slate-100 shadow-sm'
                              }`}
                          >
                            🌐 View All Branches
                          </button>
                        )}
                        <Link
                          href="/load-planning"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Trip & Dispatch</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <IndiaFleetMap
                      selectedTrip={selectedTrip}
                      allTrips={displayedTrips}
                      onSelectTrip={(trip) => setSelectedTrip(selectedTrip?.id === trip?.id || selectedTrip?.vehicleNumber === trip?.vehicleNumber ? null : trip)}
                      activeTripsCount={runningTrips.length}
                      onTimeCount={onScheduleCount}
                      delayedCount={delayedCount}
                      isDark={isDark}
                      onOpenModal={() => setIsMapModalOpen(true)}
                      className="flex-1 w-full h-full min-h-[460px] lg:min-h-[550px]"
                    />
                  )}
                </div>

                {/* Map Bottom Status Bar */}
                <div className={`flex items-center justify-between text-[11px] pt-3 mt-2 border-t ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
                  }`}>
                  <div className="flex items-center space-x-3 font-mono text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Total Fleet: {allFleetVehicles.length} Commercial Trucks</span>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-500 font-bold">{movingVehicles.length} Moving</span>
                    <span>•</span>
                    <span>{parkedVehicles.length} Stationed at Yard</span>
                  </div>
                  <div className="text-[10px] font-mono flex items-center gap-1.5">
                    <span>WheelsEye GIS WGS-84 Telematics</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Telemetry HUD & Exception Center (4 Columns on xl+, 2 Columns side-by-side on 1024px laptop & tablets) */}
            <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-5">

              {/* Selected Vehicle Telemetry HUD (Live from DB & WheelsEye) */}
              <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex-1 flex flex-col justify-between ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                <div className={`flex items-center justify-between pb-3 border-b mb-3.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'
                  }`}>
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {selectedTrip ? 'Vehicle Telemetry HUD' : 'Fleet Telematics Command'}
                    </h3>
                  </div>
                  {selectedTrip ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black border ${isDark
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/30'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        {selectedTrip.vehicleNumber}
                      </span>
                      <button
                        onClick={() => setSelectedTrip(null)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${isDark ? 'text-slate-400 hover:text-white bg-slate-900' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                          }`}
                        title="Return to All Fleet Overview"
                      >
                        ✕ Close
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      {allFleetVehicles.length} Trucks Live
                    </span>
                  )}
                </div>

                {selectedTrip ? (
                  <div className="space-y-4">
                    {/* Vehicle Identity & Real Location */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {selectedTrip.vehicleNumber}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${parseFloat(selectedTrip.speed || 0) > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                          {parseFloat(selectedTrip.speed || 0) > 0 ? `Moving • ${selectedTrip.speed}` : 'Stationed at Yard'}
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedTrip.vehicle_model}
                      </div>

                      {/* Real Location Pill */}
                      <div className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="text-xs">
                          <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {selectedTrip.location}
                          </div>
                          <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            GPS Lat: {selectedTrip.latitude?.toFixed(4)}, Lng: {selectedTrip.longitude?.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3 Vital Telemetry Gauges */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <Gauge className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                        <div className={`font-mono font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {selectedTrip.speed}
                        </div>
                        <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Speed</div>
                      </div>
                      <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <Radio className={`w-4 h-4 mx-auto mb-1 ${selectedTrip.ignition ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div className={`font-mono font-bold text-xs mt-0.5 ${selectedTrip.ignition ? 'text-emerald-400' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                          {selectedTrip.ignition ? 'Ignition ON' : 'Engine OFF'}
                        </div>
                        <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ignition</div>
                      </div>
                      <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                        <div className={`font-mono font-black text-xs mt-0.5 ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>
                          WheelsEye
                        </div>
                        <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>GPS Fix</div>
                      </div>
                    </div>

                    {/* Driver Card with Quick Contact */}
                    <div className={`p-3 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {selectedTrip.driver}
                        </div>
                        <div className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {selectedTrip.driver_phone}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <a
                          href={`tel:${selectedTrip.driver_phone}`}
                          className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all"
                          title="Call Driver"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${selectedTrip.driver_phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-blue-600/20 text-cyan-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                          title="WhatsApp Driver"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Trip Status or Yard Standby Details */}
                    {selectedTrip.hasActiveTrip && selectedTrip.isTransit ? (
                      <>
                        {/* Financial Snapshot */}
                        <div className={`p-3 rounded-2xl border text-xs space-y-1.5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Trip Sheet ID:</span>
                            <span className="font-mono font-bold text-cyan-400">
                              {selectedTrip.trip_number}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Payload:</span>
                            <span className="font-semibold text-slate-200">
                              {selectedTrip.cargo}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Driver Advance:</span>
                            <span className="font-mono font-bold text-cyan-500 dark:text-cyan-400">
                              ₹{Number(selectedTrip.driver_advance || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Journey Milestone Tracker */}
                        <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                          <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Journey Corridor Pipeline
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Origin Hub: {selectedTrip.originCity}</span>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-auto">Departed</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-bold">
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 dark:border-cyan-400 flex items-center justify-center animate-ping" />
                              <span>Transit Corridor: {selectedTrip.route}</span>
                              <span className="text-[10px] font-mono text-blue-600 dark:text-cyan-300 ml-auto">{selectedTrip.speed}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                              <div className={`w-3.5 h-3.5 rounded-full border ${isDark ? 'border-slate-700' : 'border-slate-300'}`} />
                              <span>Destination: {selectedTrip.destCity}</span>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 ml-auto">Inbound</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Standby at Depot Card */
                      <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Operational Status:</span>
                          <span className="font-bold text-emerald-400">Available at Yard</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Current Location:</span>
                          <span className="font-semibold text-slate-200 truncate max-w-[140px]">
                            {selectedTrip.location}
                          </span>
                        </div>
                        <Link
                          href="/load-planning"
                          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Dispatch from this Depot</span>
                        </Link>
                      </div>
                    )}

                  </div>
                ) : (
                  /* When NO vehicle is selected: Executive All-Fleet HUD */
                  <div className="space-y-4">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="text-xl font-black text-emerald-400 font-mono">
                          {movingVehicles.length}
                        </div>
                        <div className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Moving on Road</div>
                      </div>
                      <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="text-xl font-black text-blue-400 font-mono">
                          {parkedVehicles.length}
                        </div>
                        <div className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>At Yard / Depots</div>
                      </div>
                    </div>

                    {/* Quick Select Fleet List */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Live Trucks Directory ({allFleetVehicles.length})
                      </div>
                      <div className="flex-1 max-h-[350px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {allFleetVehicles.map((v) => {
                          const isMoving = parseFloat(v.speed || 0) > 0;
                          return (
                            <button
                              key={v.id}
                              onClick={() => {
                                setSelectedTrip(selectedTrip?.id === v.id || selectedTrip?.vehicleNumber === v.vehicleNumber ? null : v);
                                window.scrollTo({ top: 350, behavior: 'smooth' });
                              }}
                              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all group ${isDark
                                  ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-400 hover:bg-slate-800'
                                  : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white shadow-xs'
                                }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isMoving ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
                                  <span className={isDark ? 'text-white group-hover:text-cyan-300' : 'text-slate-900 group-hover:text-blue-600'}>
                                    {v.vehicleNumber}
                                  </span>
                                </div>
                                <div className={`text-[10px] truncate max-w-[170px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  📍 {v.location}
                                </div>
                              </div>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${isMoving
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                                }`}>
                                {isMoving ? v.speed : 'Parked'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Exception & Incident Center */}
              <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                <div className={`flex items-center justify-between pb-3 border-b mb-3.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'
                  }`}>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Exceptions & Incident Center
                    </h3>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {delayedCount > 0 ? delayedCount : 1}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {delayedCount > 0 ? (
                    runningTrips
                      .filter((t) => t.status === 'DELAYED')
                      .map((t, idx) => (
                        <div key={idx} className={`p-3 rounded-2xl border space-y-1 ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'
                          }`}>
                          <div className={`flex items-center justify-between text-xs font-bold ${isDark ? 'text-rose-300' : 'text-rose-700'
                            }`}>
                            <span>Corridor Delay ({t.vehicleNumber})</span>
                            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Live</span>
                          </div>
                          <div className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            Trip {t.trip_number} on {t.route} reported stationary halt. Driver: {t.driver}.
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className={`p-3 rounded-2xl border space-y-1 ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                      }`}>
                      <div className={`flex items-center justify-between text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'
                        }`}>
                        <span>All Corridors Clear</span>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active</span>
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        No critical highway exceptions or geo-fence violations currently detected across running fleet.
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Active Dispatch Queue Table - Full Width (100% across the cockpit) */}
          <div className={`w-full p-5 rounded-3xl border shadow-xl ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'
              }`}>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Live Commercial Fleet Telematics Register ({allFleetVehicles.length} Units)
                </h3>
              </div>
              <Link href="/trips" className="text-xs text-cyan-400 hover:underline font-bold flex items-center gap-1">
                <span>Manage All Trips Register</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <DataTable
              columns={queueColumns}
              data={displayedTrips}
              pageSize={16}
              pageSizeOptions={[5, 10, 16, 25, 50]}
              searchable={true}
              searchPlaceholder="Search fleet by vehicle plate, location, route, driver..."
              exportable={true}
              exportFileName="Live_Fleet_Telematics_Register"
              emptyMessage="No commercial vehicles found in this filter."
              onRowClick={(row) => {
                setSelectedTrip(row);
                window.scrollTo({ top: 350, behavior: 'smooth' });
              }}
              tableContainerClassName="max-h-[360px] sm:max-h-[420px] lg:max-h-[460px] xl:max-h-[500px]"
              stickyHeader={true}
            />
          </div>

        </main>
      </div>

      {/* Fullscreen Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`relative w-full max-w-7xl h-[85vh] rounded-3xl p-5 flex flex-col shadow-2xl border ${isDark ? 'bg-[#070B14] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between pb-3 mb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Full-Screen Highway Corridor Radar
                </h3>
                <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ({allFleetVehicles.length} Commercial Trucks Live)
                </span>
              </div>
              <button
                onClick={() => setIsMapModalOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 w-full relative">
              <IndiaFleetMap
                selectedTrip={selectedTrip}
                allTrips={displayedTrips}
                onSelectTrip={(trip) => setSelectedTrip(trip)}
                activeTripsCount={runningTrips.length}
                onTimeCount={onScheduleCount}
                delayedCount={delayedCount}
                isDark={isDark}
                isModal={true}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
