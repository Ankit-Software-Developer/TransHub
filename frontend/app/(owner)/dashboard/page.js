// frontend/app/(owner)/dashboard/page.js
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import {
  TrendingUp,
  TrendingDown,
  Truck,
  PackageCheck,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  UserPlus,
  Send,
  FileBarChart,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Zap,
  Boxes,
  FileCheck,
  IndianRupee,
  Maximize2,
  X,
  Minimize2,
  MapPin,
  Navigation,
  Radio
} from 'lucide-react';
import Link from 'next/link';

// Dynamically import the real Leaflet India Map with SSR disabled
const IndiaFleetMap = dynamic(
  () => import('../../../components/map/IndiaFleetMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] rounded-2xl bg-[#070B14] border border-slate-800 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-2" />
        <span className="text-xs font-mono text-cyan-400">Connecting to India Highway Telemetry...</span>
      </div>
    )
  }
);

export default function OwnerDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [filterTab, setFilterTab] = useState('ALL');
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isRegisteringVehicle, setIsRegisteringVehicle] = useState(false);
  const [vehicleFormError, setVehicleFormError] = useState('');
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '',
    vehicle_type: 'TRUCK',
    capacity_ton: '16.0',
    gps_device_id: '',
    branch_id: '',
    status: 'AVAILABLE'
  });

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMapModalOpen(false);
        setIsAddVehicleModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDark = theme === 'dark';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, tripsRes, vehRes, branchRes] = await Promise.allSettled([
        api.get('/dashboard/owner'),
        api.get('/trips?limit=25'),
        api.get('/fleet/vehicles'),
        api.get('/organizations/branches')
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.data?.success) {
        setDashboardData(dashRes.value.data.data);
      }
      if (tripsRes.status === 'fulfilled' && tripsRes.value?.data?.success) {
        const fetchedTrips = Array.isArray(tripsRes.value.data.data) ? tripsRes.value.data.data : [];
        setTrips(fetchedTrips);
      }
      if (branchRes.status === 'fulfilled' && branchRes.value?.data?.success) {
        const bData = Array.isArray(branchRes.value.data.data) ? branchRes.value.data.data : [];
        if (bData.length > 0) setBranches(bData);
      }
      if (vehRes.status === 'fulfilled' && vehRes.value?.data?.success) {
        const fetchedVehicles = Array.isArray(vehRes.value.data.data) ? vehRes.value.data.data : [];
        setVehicles(fetchedVehicles);

        // Extract fallback branches if branch endpoint returned empty
        setBranches((prev) => {
          if (prev.length > 0) return prev;
          const branchList = [];
          fetchedVehicles.forEach((v) => {
            if (v.branch && !branchList.some((b) => b.id === v.branch.id)) {
              branchList.push(v.branch);
            }
          });
          return branchList;
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard live data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute time of day greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const ownerName = user?.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : (user?.name || 'Transporter');

  // Extract KPIs from live database response
  const kpisData = dashboardData?.kpis || {};
  const totalRevenue = parseFloat(kpisData.totalFreight || 0);
  const totalExpenses = parseFloat(kpisData.totalExpenses || 0);
  const activeTripsCount = kpisData.inTransit || 0;
  const deliveriesCompletedCount = kpisData.delivered || 0;
  const totalBookingsCount = kpisData.bookings || 0;
  const delayedCount = kpisData.delayed || 0;
  const totalVehiclesCount = kpisData.totalVehicles || 0;
  const vehiclesRunning = kpisData.vehiclesRunning || 0;
  const vehiclesAvailable = kpisData.vehiclesAvailable || 0;
  const vehiclesMaintenance = kpisData.vehiclesMaintenance || 0;
  const pendingPodCount = kpisData.pendingPod || 0;
  const outstandingAmount = parseFloat(kpisData.outstanding || 0);

  // Calculate on-time percentage based on DB
  const onTimePercentage = totalBookingsCount > 0
    ? Math.max(0, Math.min(100, Math.round(((deliveriesCompletedCount) / (deliveriesCompletedCount + delayedCount || 1)) * 100)))
    : 100;

  // Trend bars from DB or generate empty 7-day structure
  const bookingTrendBars = dashboardData?.bookingTrends && dashboardData.bookingTrends.length > 0
    ? dashboardData.bookingTrends
    : Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          value: 0,
          highlight: i === 6,
        };
      });

  const maxTrendVal = Math.max(...bookingTrendBars.map(b => b.value), 10);

  // 6 KPI cards
  const kpis = [
    {
      title: 'Total Revenue',
      value: `₹ ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: totalRevenue > 0 ? 'Live DB' : 'Fresh',
      subtext: totalRevenue > 0 ? 'Consignment freight' : 'Awaiting 1st booking',
      positive: true,
      icon: IndianRupee,
      color: 'cyan',
      sparkline: bookingTrendBars.map(b => Math.max(b.value, 1))
    },
    {
      title: 'Active Trips',
      value: String(activeTripsCount),
      change: activeTripsCount > 0 ? `${activeTripsCount} on road` : '0 Active',
      subtext: activeTripsCount > 0 ? 'In-transit fleet' : 'No trips running',
      positive: true,
      icon: Truck,
      color: 'blue',
      sparkline: [0, 0, 0, 0, 0, 0, activeTripsCount]
    },
    {
      title: 'Deliveries Completed',
      value: String(deliveriesCompletedCount),
      change: deliveriesCompletedCount > 0 ? 'Verified' : '0 Done',
      subtext: deliveriesCompletedCount > 0 ? 'POD confirmed' : 'Awaiting delivery',
      positive: true,
      icon: PackageCheck,
      color: 'emerald',
      sparkline: [0, 0, 0, 0, deliveriesCompletedCount, deliveriesCompletedCount, deliveriesCompletedCount]
    },
    {
      title: 'Total Bookings',
      value: String(totalBookingsCount),
      change: totalBookingsCount > 0 ? 'Total' : '0 Created',
      subtext: totalBookingsCount > 0 ? 'Registered bilties' : 'Ready for bookings',
      positive: true,
      icon: FileText,
      color: 'sky',
      sparkline: bookingTrendBars.map(b => Math.max(b.value, 0))
    },
    {
      title: 'Total Expenses',
      value: `₹ ${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: totalExpenses > 0 ? 'Recorded' : '₹ 0',
      subtext: totalExpenses > 0 ? 'Fuel & toll logged' : 'No expenses logged',
      positive: totalExpenses === 0,
      icon: TrendingDown,
      color: 'purple',
      sparkline: [0, 0, 0, 0, 0, totalExpenses > 0 ? 5 : 0, totalExpenses > 0 ? 10 : 0]
    },
    {
      title: 'On-Time Delivery',
      value: totalBookingsCount > 0 ? `${onTimePercentage}%` : '100%',
      change: delayedCount === 0 ? 'Optimal' : `${delayedCount} Delayed`,
      subtext: delayedCount === 0 ? 'Zero transit delays' : 'Requires intervention',
      positive: delayedCount === 0,
      icon: Clock,
      color: 'teal',
      sparkline: [100, 100, 100, 100, 100, 100, onTimePercentage]
    }
  ];

  // Registered Fleet Telemetry List (Merged Vehicles with Live GPS + Active Corridor Trips)
  const allFleetVehicles = React.useMemo(() => {
    if (vehicles && vehicles.length > 0) {
      return vehicles.map((v) => {
        // Find if this vehicle has an active running trip
        const activeTrip = (v.trips && v.trips.length > 0)
          ? v.trips[0]
          : (trips || []).find(t => (t.vehicle_id === v.id || t.vehicle?.vehicle_number === v.vehicle_number || t.vehicleNumber === v.vehicle_number) && ['RUNNING', 'READY', 'IN_TRANSIT', 'LOADED'].includes(t.status));

        const isTransit = v.status === 'ON_TRIP' || (activeTrip && ['RUNNING', 'READY', 'IN_TRANSIT', 'LOADED'].includes(activeTrip.status));
        const branchCity = v.branch?.city || 'Delhi';
        const originCity = isTransit ? (activeTrip?.origin_city || activeTrip?.originBranch?.city || branchCity) : branchCity;
        const destCity = isTransit ? (activeTrip?.destination_city || activeTrip?.destBranch?.city || 'Mumbai') : branchCity;
        const hasGps = Boolean(v.gps_device_id);

        const progress = isTransit ? (activeTrip?.status === 'READY' ? 15 : 54) : 0;
        const speed = isTransit ? (activeTrip?.status === 'DELAYED' ? 'Halt' : '68 km/h') : '0 km/h (Parked)';
        const currentLocation = isTransit
          ? (progress < 30 ? `NH Outskirts of ${originCity}` : progress < 65 ? `National Expressway Corridor` : `Approaching ${destCity} Hub`)
          : `${branchCity} Depot Yard`;

        return {
          id: v.id,
          vehicleNumber: v.vehicle_number,
          vehicleType: v.vehicle_type || 'TRUCK',
          capacityTon: v.capacity_ton || '16.0',
          gpsDeviceId: v.gps_device_id,
          hasGps,
          status: isTransit ? 'IN_TRANSIT' : v.status,
          isTransit,
          branchCity,
          originCity,
          destCity,
          currentLocation,
          route: isTransit ? `${originCity} ➔ ${destCity}` : `Stationed at ${branchCity} Hub`,
          progress,
          speed,
          eta: isTransit ? 'Today, 08:30 PM' : 'At Depot',
          statusLabel: isTransit ? 'In Transit' : v.status === 'MAINTENANCE' ? 'Workshop' : 'At Yard (Ready)',
          statusColor: isTransit
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            : v.status === 'MAINTENANCE'
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        };
      });
    }

    // If no vehicles are registered or present, return empty array so UI and map show empty state
    return [];
  }, [vehicles, trips]);

  // Set default selected truck once fleet is available
  useEffect(() => {
    if (allFleetVehicles.length > 0) {
      const exists = allFleetVehicles.some(v => v.vehicleNumber === selectedTruck || v.id === selectedTruck);
      if (!selectedTruck || !exists) {
        const transitVeh = allFleetVehicles.find(v => v.isTransit);
        setSelectedTruck(transitVeh ? transitVeh.vehicleNumber : allFleetVehicles[0].vehicleNumber);
      }
    } else {
      setSelectedTruck(null);
    }
  }, [allFleetVehicles, selectedTruck]);

  // Filtered fleet vehicles based on tabs
  const filteredFleet = allFleetVehicles.filter(veh => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'TRANSIT') return veh.isTransit;
    if (filterTab === 'YARD') return !veh.isTransit && veh.status !== 'MAINTENANCE';
    if (filterTab === 'MAINTENANCE') return veh.status === 'MAINTENANCE';
    return true;
  });

  // Selected vehicle object
  const selectedVehicleData = allFleetVehicles.length > 0 && selectedTruck
    ? (allFleetVehicles.find(v => v.vehicleNumber === selectedTruck || v.id === selectedTruck) || null)
    : null;

  // Handle vehicle registration submission
  const handleRegisterVehicle = async (e) => {
    e.preventDefault();
    setVehicleFormError('');
    if (!vehicleForm.vehicle_number.trim()) {
      setVehicleFormError('Please enter a vehicle registration number (e.g. RJ 14 GB 9921)');
      return;
    }

    try {
      setIsRegisteringVehicle(true);
      const res = await api.post('/fleet/vehicles', {
        vehicle_number: vehicleForm.vehicle_number.toUpperCase().trim(),
        vehicle_type: vehicleForm.vehicle_type,
        capacity_ton: parseFloat(vehicleForm.capacity_ton) || 16,
        gps_device_id: vehicleForm.gps_device_id.trim() || `GPS-${vehicleForm.vehicle_number.replace(/[^A-Za-z0-9]/g, '').slice(-4)}`,
        branch_id: vehicleForm.branch_id || (branches.length > 0 ? branches[0].id : null),
        status: vehicleForm.status || 'AVAILABLE',
      });

      if (res.data?.success) {
        setIsAddVehicleModalOpen(false);
        setVehicleForm({
          vehicle_number: '',
          vehicle_type: 'TRUCK',
          capacity_ton: '16.0',
          gps_device_id: '',
          branch_id: '',
          status: 'AVAILABLE'
        });
        await fetchDashboardData();
        setSelectedTruck(res.data.data?.vehicle_number || vehicleForm.vehicle_number.toUpperCase().trim());
      }
    } catch (err) {
      setVehicleFormError(err.response?.data?.message || 'Failed to register vehicle. Please try again.');
    } finally {
      setIsRegisteringVehicle(false);
    }
  };

  // Action center alerts from DB
  const actionCenterAlerts = dashboardData?.actionCenter || [];

  // Pending queues calculated
  const awaitingDispatchCount = Math.max(0, totalBookingsCount - activeTripsCount - deliveriesCompletedCount);
  const totalPendingActions = awaitingDispatchCount + pendingPodCount + (delayedCount > 0 ? delayedCount : 0) + (outstandingAmount > 0 ? 1 : 0);

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
          
          {/* Personalized Executive Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {greeting}, {ownerName}! 👋
              </h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Live telemetry workspace for <span className="font-semibold text-cyan-400">{user?.organizationName || 'your transport business'}</span>. Data isolated & synced from database.
              </p>
            </div>
          </div>

          {/* Top 6 KPI Cards with Real Data */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {kpis.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${
                    isDark
                      ? 'bg-[#0B1020]/90 border-slate-800/90 hover:border-cyan-500/40'
                      : 'bg-white border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold truncate ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {kpi.title}
                    </span>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isDark ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-blue-600'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className={`text-lg sm:text-xl font-black tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {kpi.value}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                    <span className={`font-bold flex items-center gap-0.5 ${
                      kpi.positive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {kpi.change}
                    </span>
                    <span className={`truncate ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {kpi.subtext}
                    </span>
                  </div>

                  {/* Sparkline Visual */}
                  <div className="mt-2 h-3.5 w-full flex items-end gap-1">
                    {kpi.sparkline.map((val, sIdx) => {
                      const max = Math.max(...kpi.sparkline, 1);
                      const heightPercent = Math.max(15, (val / max) * 100);
                      return (
                        <div
                          key={sIdx}
                          style={{ height: `${heightPercent}%` }}
                          className={`flex-1 rounded-xs transition-all ${
                            sIdx === kpi.sparkline.length - 1
                              ? 'bg-cyan-400'
                              : isDark ? 'bg-blue-600/30' : 'bg-blue-300/50'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Main Cockpit: Live Trips Radar (8 cols) & Action/Alerts (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left & Center: Live Trips Across India (8 Columns) */}
            <div className={`lg:col-span-8 p-5 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              
              {/* Header Bar: Clean single line with title on left and controls on right */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <div className="min-w-0">
                    <h2 className={`text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Fleet Telemetry & Highway Radar
                    </h2>
                    <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Live GPS tracking for registered vehicles • Select any vehicle to highlight route
                    </p>
                  </div>
                </div>

                {/* Right Controls: Filter Tabs + Register Vehicle Button in a single horizontal strip */}
                <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-semibold whitespace-nowrap">
                    <button
                      onClick={() => setFilterTab('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filterTab === 'ALL'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({allFleetVehicles.length})
                    </button>
                    <button
                      onClick={() => setFilterTab('TRANSIT')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filterTab === 'TRANSIT'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      In Transit ({allFleetVehicles.filter(v => v.isTransit).length})
                    </button>
                    <button
                      onClick={() => setFilterTab('YARD')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filterTab === 'YARD'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      At Yard ({allFleetVehicles.filter(v => !v.isTransit && v.status !== 'MAINTENANCE').length})
                    </button>
                  </div>

                  {/* Register Vehicle Button without duplicate + */}
                  <button
                    type="button"
                    onClick={() => setIsAddVehicleModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Register a new commercial vehicle with GPS"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Vehicle</span>
                  </button>
                </div>
              </div>

              {/* Split Body: Registered Fleet List (Left) + Interactive Real GIS Leaflet Map (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4">
                
                {/* Registered Vehicles List with Start -> Current -> Next Trace */}
                <div className="md:col-span-5 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {allFleetVehicles.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed min-h-[360px] ${
                      isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}>
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                        <Truck className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">No Registered Vehicles</h4>
                      <p className="text-xs text-slate-400 max-w-xs mb-4">
                        You have not registered any vehicles yet. Register your commercial fleet equipped with GPS to track their live location and corridor on the map.
                      </p>
                      <button
                        onClick={() => setIsAddVehicleModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register Vehicle</span>
                      </button>
                    </div>
                  ) : filteredFleet.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-dashed min-h-[220px] ${
                      isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}>
                      <p className="text-xs text-slate-400 mb-2">No vehicles found in &apos;{filterTab}&apos; category.</p>
                      <button
                        onClick={() => setFilterTab('ALL')}
                        className="text-xs text-cyan-400 hover:underline font-semibold cursor-pointer"
                      >
                        Show All ({allFleetVehicles.length}) Vehicles
                      </button>
                    </div>
                  ) : (
                    filteredFleet.map((veh) => {
                      const isSelected = selectedTruck === veh.vehicleNumber || selectedTruck === veh.id;

                      return (
                        <div
                          key={veh.id}
                          onClick={() => setSelectedTruck(veh.vehicleNumber)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-950/70 border-cyan-400 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-400/50'
                              : isDark
                              ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
                              : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {/* Row 1: Icon, Plate (no-wrap), GPS tag, Type, and Status */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                <Truck className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-xs text-white font-mono whitespace-nowrap">
                                {veh.vehicleNumber}
                              </span>
                              {veh.hasGps && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  GPS
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                • {veh.vehicleType}
                              </span>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${veh.statusColor}`}>
                              {veh.statusLabel}
                            </span>
                          </div>

                          {/* Row 2: Compact Inline Route (Start ➔ Current ➔ Next) or Yard Location */}
                          {veh.isTransit ? (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] gap-2">
                              {/* 3-Point Trace: Start ➔ Current ➔ Next in one clean horizontal strip */}
                              <div className="flex items-center gap-1 text-[10px] min-w-0 truncate">
                                <span className="text-emerald-400 font-bold shrink-0">{veh.originCity}</span>
                                <span className="text-slate-500 shrink-0">➔</span>
                                <span className="text-cyan-300 font-semibold truncate flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping shrink-0" />
                                  {veh.currentLocation}
                                </span>
                                <span className="text-slate-500 shrink-0">➔</span>
                                <span className="text-rose-400 font-bold shrink-0">{veh.destCity}</span>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] font-mono shrink-0 ml-auto">
                                <span className="text-cyan-400 font-bold">{veh.speed}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>
                                  {isSelected ? '● On Map' : 'Track ➔'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-300 truncate">
                                <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                                <span>Stationed at <span className="font-semibold text-white">{veh.branchCity} Hub</span></span>
                                <span className="text-slate-500 hidden sm:inline">• Ready</span>
                              </div>
                              <span className={`text-[10px] shrink-0 ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>
                                {isSelected ? '● On Map' : 'Locate ➔'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Real GIS India Map Powered by Leaflet */}
                <div className="md:col-span-7">
                  <IndiaFleetMap
                    selectedTrip={selectedVehicleData}
                    allTrips={allFleetVehicles}
                    onSelectTrip={(veh) => setSelectedTruck(veh.vehicleNumber || veh.id)}
                    activeTripsCount={allFleetVehicles.filter(v => v.isTransit).length}
                    onTimeCount={allFleetVehicles.filter(v => v.isTransit && v.status !== 'DELAYED').length}
                    delayedCount={allFleetVehicles.filter(v => v.status === 'DELAYED').length}
                    isDark={isDark}
                    onOpenModal={() => setIsMapModalOpen(true)}
                  />
                </div>

              </div>

            </div>

            {/* Right Column: Action Center (Top) & Alerts & Notifications (Bottom) */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Action Center */}
              <div className={`p-5 rounded-3xl border shadow-xl ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Action Center
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Quick Launch</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/bookings"
                    className={`p-3 rounded-2xl border transition-all text-left group ${
                      isDark
                        ? 'bg-blue-950/30 border-blue-500/20 hover:bg-blue-900/40 hover:border-cyan-400'
                        : 'bg-blue-50 border-blue-100 hover:bg-blue-100/70'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Create Booking</div>
                    <div className="text-[10px] text-slate-400">Issue Docket (LR / Bilty)</div>
                  </Link>

                  <Link
                    href="/dispatches"
                    className={`p-3 rounded-2xl border transition-all text-left group ${
                      isDark
                        ? 'bg-purple-950/30 border-purple-500/20 hover:bg-purple-900/40 hover:border-purple-400'
                        : 'bg-purple-50 border-purple-100 hover:bg-purple-100/70'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform">
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Assign Vehicle</div>
                    <div className="text-[10px] text-slate-400">Dispatch & trip sheet</div>
                  </Link>

                  <Link
                    href="/customers"
                    className={`p-3 rounded-2xl border transition-all text-left group ${
                      isDark
                        ? 'bg-emerald-950/30 border-emerald-500/20 hover:bg-emerald-900/40 hover:border-emerald-400'
                        : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/70'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Add Customer</div>
                    <div className="text-[10px] text-slate-400">Shippers & receivers</div>
                  </Link>

                  <Link
                    href="/reports"
                    className={`p-3 rounded-2xl border transition-all text-left group ${
                      isDark
                        ? 'bg-amber-950/30 border-amber-500/20 hover:bg-amber-900/40 hover:border-amber-400'
                        : 'bg-amber-50 border-amber-100 hover:bg-amber-100/70'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-2 shadow-md shadow-amber-600/30 group-hover:scale-105 transition-transform">
                      <FileBarChart className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Generate Report</div>
                    <div className="text-[10px] text-slate-400">P&L and trip audits</div>
                  </Link>
                </div>
              </div>

              {/* Alerts & Notifications (Live DB Scoped) */}
              <div className={`p-5 rounded-3xl border shadow-xl ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Alerts & Notifications
                    </h3>
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-black flex items-center justify-center">
                      {actionCenterAlerts.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Real-time</span>
                </div>

                <div className="space-y-2.5">
                  {actionCenterAlerts.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col items-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                      <div className="font-bold text-xs text-emerald-300">All Operations Clear</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Zero delays, zero pending POD flags, and zero payment disputes in your tenant workspace.
                      </div>
                    </div>
                  ) : (
                    actionCenterAlerts.map((alert, aIdx) => (
                      <div
                        key={aIdx}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                          alert.type === 'danger'
                            ? 'bg-rose-500/10 border-rose-500/20'
                            : 'bg-amber-500/10 border-amber-500/20'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          alert.type === 'danger' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-xs leading-tight">
                          <div className={`font-bold ${alert.type === 'danger' ? 'text-rose-300' : 'text-amber-300'}`}>
                            {alert.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{alert.description}</div>
                          {alert.actionUrl && (
                            <Link href={alert.actionUrl} className="text-[10px] text-cyan-400 hover:underline mt-1 inline-block">
                              Resolve Issue ➔
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Operational Grid: 4 Equal Analytical & Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Card 1: Booking Trends (Last 7 Days) */}
            <div className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Booking Trends
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Last 7 Days</span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl font-black text-white">{totalBookingsCount}</span>
                  <span className="text-xs text-slate-400">Total Bookings</span>
                  <span className="text-xs text-cyan-400 font-bold">Live DB</span>
                </div>

                {/* 7-Day Bar Chart Visual from Live DB */}
                <div className="h-32 w-full flex items-end justify-between gap-2 pt-2 border-b border-slate-800">
                  {bookingTrendBars.map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        style={{ height: `${Math.max(8, (bar.value / maxTrendVal) * 100)}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          bar.value > 0
                            ? 'bg-gradient-to-t from-blue-600 to-cyan-400 shadow-md shadow-cyan-500/30'
                            : isDark ? 'bg-slate-800/80 group-hover:bg-slate-700' : 'bg-slate-200 group-hover:bg-slate-300'
                        }`}
                        title={`${bar.day}: ${bar.value} bookings`}
                      />
                      <span className="text-[9px] text-slate-400 font-mono">{bar.day.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 text-[10px] text-cyan-400 flex items-center justify-between font-semibold">
                <span>{totalBookingsCount === 0 ? 'No bookings recorded in past 7 days' : `Latest active window`}</span>
                <Link href="/bookings" className="hover:underline">View Bilties ➔</Link>
              </div>
            </div>

            {/* Card 2: Fleet Status from DB */}
            <div className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Boxes className="w-4 h-4 text-cyan-400" />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Fleet Status
                    </h3>
                  </div>
                  <Link href="/fleet" className="text-[10px] text-cyan-400 hover:underline font-semibold">
                    View Fleet ➔
                  </Link>
                </div>

                {/* Donut Gauge */}
                <div className="flex items-center justify-center my-2">
                  <div className="w-24 h-24 rounded-full border-4 border-cyan-400 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/20">
                    <span className="text-xl font-black text-white">{totalVehiclesCount}</span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Vehicles</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs pt-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>On Road / Active</span>
                    </span>
                    <span className="font-bold text-white text-[11px]">{vehiclesRunning}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Available at Yard</span>
                    </span>
                    <span className="font-bold text-white text-[11px]">{vehiclesAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Under Maintenance</span>
                    </span>
                    <span className="font-bold text-white text-[11px]">{vehiclesMaintenance}</span>
                  </div>
                </div>
              </div>

              <Link
                href="/fleet"
                className="w-full mt-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-cyan-300 text-center block transition-colors"
              >
                {totalVehiclesCount === 0 ? 'Register Vehicles in Fleet' : 'Manage Fleet ➔'}
              </Link>
            </div>

            {/* Card 3: Pending Actions */}
            <div className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Pending Actions
                    </h3>
                  </div>
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    totalPendingActions > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {totalPendingActions}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 text-[11px]">Awaiting vehicle dispatch</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-[10px]">
                      {awaitingDispatchCount}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 text-[11px]">PODs pending upload</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-[10px]">
                      {pendingPodCount}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 text-[11px]">Delayed consignments</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                      {delayedCount}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 text-[11px]">Outstanding balance</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                      ₹ {outstandingAmount.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 text-[10px] text-cyan-400 text-center font-semibold">
                {totalPendingActions === 0 ? 'All operational queues synchronized' : `${totalPendingActions} operational item(s) pending`}
              </div>
            </div>

            {/* Card 4: Recent Consignments Activity */}
            <div className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Recent Activity
                    </h3>
                  </div>
                  <Link href="/bookings" className="text-[10px] text-cyan-400 hover:underline font-semibold">
                    View All ➔
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {(!dashboardData?.recentConsignments || dashboardData.recentConsignments.length === 0) ? (
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center">
                      <FileCheck className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
                      <div className="text-xs font-bold text-slate-300">No Recent Bilties</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Create your first booking to start logging transactions in your tenant ledger.
                      </div>
                    </div>
                  ) : (
                    dashboardData.recentConsignments.slice(0, 4).map((con, cIdx) => (
                      <div key={cIdx} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-[11px] leading-tight flex-1">
                          <div className="font-bold text-white flex items-center justify-between">
                            <span>#{con.consignment_number || `LR-${con.id.slice(0, 6)}`}</span>
                            <span className="text-[9px] text-cyan-400 font-mono">₹{parseFloat(con.total_amount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-slate-400 text-[10px] truncate">
                            {con.originBranch?.city || 'Origin'} ➔ {con.destBranch?.city || 'Dest'}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            Status: <span className="text-slate-400 font-medium">{con.status}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 text-[10px] text-slate-500 font-mono text-center">
                Multi-Tenant Audit Trail Active
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* Big Fullscreen Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-2xl flex flex-col p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
          <div className="relative w-full h-full max-w-[1850px] mx-auto bg-[#070B14] border border-cyan-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Top Modal Header */}
            <div className="px-5 py-3.5 bg-slate-950/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-cyan-400" />
                      <span>All-India Fleet Telemetry & Live GPS Radar</span>
                    </h3>
                    <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold">
                      ● LIVE TRACKING
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time location of all active fleet vehicles across national highway corridors with state GIS boundaries
                  </p>
                </div>
              </div>

              {/* Vehicle Selector Pills & Summary in Modal Header */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Quick Vehicle Switcher */}
                {allFleetVehicles.length > 0 && (
                  <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                    <button
                      onClick={() => setSelectedTruck('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedTruck === 'ALL'
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All Fleet ({allFleetVehicles.length})
                    </button>
                    {allFleetVehicles.map((t) => {
                      const isCur = selectedTruck === t.id || selectedTruck === t.vehicleNumber;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTruck(t.vehicleNumber || t.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isCur
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${t.isTransit ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
                          <span>{t.vehicleNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Close Modal Button */}
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-all shadow-md ml-2 cursor-pointer"
                  title="Close Fullscreen (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Big Map Canvas */}
            <div className="flex-1 relative w-full h-full min-h-0 flex flex-col">
              <IndiaFleetMap
                selectedTrip={selectedTruck === 'ALL' ? null : selectedVehicleData}
                allTrips={allFleetVehicles}
                onSelectTrip={(t) => setSelectedTruck(t.vehicleNumber || t.id)}
                activeTripsCount={allFleetVehicles.filter(v => v.isTransit).length}
                onTimeCount={allFleetVehicles.filter(v => v.isTransit && v.status !== 'DELAYED').length}
                delayedCount={allFleetVehicles.filter(v => v.status === 'DELAYED').length}
                isDark={true}
                isModal={true}
                className="w-full h-full flex-1"
              />

              {/* Bottom Interactive Fleet Telemetry Drawer in Modal */}
              {allFleetVehicles.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3 z-[400] p-2.5 rounded-2xl bg-slate-950/95 border border-slate-800/90 shadow-2xl backdrop-blur-md hidden sm:flex items-center justify-between gap-3 overflow-x-auto">
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Fleet Radar:
                    </span>
                    <span className="text-slate-400">
                      Hover on any truck pin for live metrics • Click to zoom & trace highway corridor
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {allFleetVehicles.map((t) => {
                      const isCur = selectedTruck === t.id || selectedTruck === t.vehicleNumber;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTruck(t.vehicleNumber || t.id)}
                          className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                            isCur
                              ? 'bg-blue-600/40 border-cyan-400 text-white font-bold shadow-lg shadow-cyan-900/30'
                              : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          <Truck className={`w-3.5 h-3.5 ${isCur ? 'text-cyan-300' : 'text-slate-400'}`} />
                          <span>{t.vehicleNumber}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({t.route})</span>
                          <span className={`text-[10px] font-mono font-semibold ${t.isTransit ? 'text-cyan-400' : 'text-emerald-400'}`}>
                            {t.speed}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Register Vehicle Asset Modal */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#0B1020] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register Fleet Vehicle</h3>
                  <p className="text-xs text-slate-400">Add vehicle and connect live GPS telemetry tracking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegisterVehicle} className="p-6 space-y-4">
              {vehicleFormError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{vehicleFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vehicle Registration Number <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RJ 14 GB 9921 or MH 12 AB 1234"
                  value={vehicleForm.vehicle_number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleForm.vehicle_type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="TRUCK">Heavy Truck (16T - 25T)</option>
                    <option value="CONTAINER">Container (28T - 40T)</option>
                    <option value="TRAILER">Multi-Axle Trailer (32T+)</option>
                    <option value="MINI_TRUCK">Mini Truck (Eicher / 7T)</option>
                    <option value="PICKUP">Pickup (Bolero / 2.5T)</option>
                    <option value="TEMPO">Tempo / City Carrier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Capacity (Tons)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={vehicleForm.capacity_ton}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_ton: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  GPS Device Tracker ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. GPS-TRK-9921 (auto-assigned if left blank)"
                    value={vehicleForm.gps_device_id}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, gps_device_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AIS-140 Ready
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Home Branch Hub
                  </label>
                  <select
                    value={vehicleForm.branch_id}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, branch_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {branches.length === 0 ? (
                      <option value="">Head Office Yard</option>
                    ) : (
                      branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name || b.city || b.branch_code} ({b.city})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Status
                  </label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="AVAILABLE">At Yard (Ready for Dispatch)</option>
                    <option value="ON_TRIP">In Transit (On Highway)</option>
                    <option value="MAINTENANCE">In Workshop (Maintenance)</option>
                  </select>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringVehicle}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRegisteringVehicle ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register & Track Live</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
