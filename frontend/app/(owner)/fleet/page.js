// frontend/app/(owner)/fleet/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import api from '../../../services/api';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Fuel,
  Wrench,
  ShieldAlert,
  FileCheck2,
  Calendar,
  Phone,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
  Download,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Navigation,
  MapPin,
  X
} from 'lucide-react';
import Link from 'next/link';
import DataTable from '../../../components/ui/DataTable';
import { usePermissions } from '../../../hooks/usePermissions';

const FLEET_VEHICLES = [
  {
    id: 'veh-01',
    plate: 'HR 55 AB 1234',
    model: 'TATA Prima 5530.S',
    type: '40 FT Container',
    capacity: '28 Tons',
    year: '2023',
    status: 'ON_ROAD',
    status_label: 'On Road (72 km/h)',
    location: 'NH-48 near Vadodara, GJ',
    driver: 'Amit Kumar',
    driver_rating: '4.8 ★',
    fuel_level: 78,
    mileage_mtd: '14,240 km',
    avg_fuel_economy: '4.6 km/L',
    insurance_expiry: '12 Nov 2025',
    insurance_days: 38,
    fitness_expiry: '18 Jan 2026',
    fitness_days: 105,
    puc_expiry: '08 Dec 2025',
    puc_days: 64,
    maintenance_status: 'HEALTHY'
  },
  {
    id: 'veh-02',
    plate: 'MH 12 CD 5678',
    model: 'Ashok Leyland 4220',
    type: '32 FT Multi-Axle',
    capacity: '22 Tons',
    year: '2022',
    status: 'ON_ROAD',
    status_label: 'On Road (66 km/h)',
    location: 'Gwalior Highway, MP',
    driver: 'Suresh Patil',
    driver_rating: '4.9 ★',
    fuel_level: 64,
    mileage_mtd: '12,890 km',
    avg_fuel_economy: '4.8 km/L',
    insurance_expiry: '24 Oct 2025',
    insurance_days: 19,
    fitness_expiry: '14 May 2026',
    fitness_days: 220,
    puc_expiry: '15 Nov 2025',
    puc_days: 41,
    maintenance_status: 'HEALTHY'
  },
  {
    id: 'veh-03',
    plate: 'MH 31 GH 3456',
    model: 'BharatBenz 2823',
    type: '32 FT Closed Box',
    capacity: '24 Tons',
    year: '2021',
    status: 'MAINTENANCE',
    status_label: 'Under Service',
    location: 'Nagpur Central Workshop',
    driver: 'Manoj Verma (Assigned)',
    driver_rating: '4.6 ★',
    fuel_level: 52,
    mileage_mtd: '9,450 km',
    avg_fuel_economy: '4.2 km/L',
    insurance_expiry: '05 Nov 2025',
    insurance_days: 31,
    fitness_expiry: '10 Feb 2026',
    fitness_days: 128,
    puc_expiry: '02 Oct 2025',
    puc_days: -2,
    maintenance_status: 'SERVICE_DUE'
  },
  {
    id: 'veh-04',
    plate: 'GJ 01 EF 9012',
    model: 'Eicher Pro 6028',
    type: '24 FT Open Bed',
    capacity: '16 Tons',
    year: '2024',
    status: 'ON_ROAD',
    status_label: 'On Road (68 km/h)',
    location: 'Surat Ring Road, GJ',
    driver: 'Ramesh Dave',
    driver_rating: '4.7 ★',
    fuel_level: 82,
    mileage_mtd: '16,210 km',
    avg_fuel_economy: '5.1 km/L',
    insurance_expiry: '15 Mar 2026',
    insurance_days: 162,
    fitness_expiry: '20 Apr 2026',
    fitness_days: 198,
    puc_expiry: '12 Jan 2026',
    puc_days: 99,
    maintenance_status: 'HEALTHY'
  },
  {
    id: 'veh-05',
    plate: 'TS 09 IJ 7890',
    model: 'Tata Signa 2823 Reefer',
    type: '20 FT Cold Chain',
    capacity: '14 Tons',
    year: '2023',
    status: 'YARD',
    status_label: 'In Yard (Available)',
    location: 'Hyderabad Regional Hub',
    driver: 'Venkatesh Rao',
    driver_rating: '5.0 ★',
    fuel_level: 95,
    mileage_mtd: '11,400 km',
    avg_fuel_economy: '4.4 km/L',
    insurance_expiry: '08 Dec 2025',
    insurance_days: 64,
    fitness_expiry: '19 Jun 2026',
    fitness_days: 258,
    puc_expiry: '28 Nov 2025',
    puc_days: 54,
    maintenance_status: 'HEALTHY'
  }
];

export default function FleetManagementPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [vehicles, setVehicles] = useState(FLEET_VEHICLES);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '',
    vehicle_type: 'TRUCK',
    capacity_ton: '16.0',
    gps_device_id: '',
    branch_id: '',
    status: 'AVAILABLE'
  });

  const fetchFleet = async () => {
    try {
      setLoading(true);
      const [res, branchRes] = await Promise.allSettled([
        api.get('/fleet/vehicles'),
        api.get('/organizations/branches')
      ]);

      if (branchRes.status === 'fulfilled' && branchRes.value?.data?.success) {
        const bData = Array.isArray(branchRes.value.data.data) ? branchRes.value.data.data : [];
        if (bData.length > 0) setBranches(bData);
      }

      if (res.status === 'fulfilled' && res.value?.data?.success && Array.isArray(res.value.data.data) && res.value.data.data.length > 0) {
        const mapped = res.value.data.data.map((v) => {
          const isTransit = v.status === 'ON_TRIP' || (v.trips && v.trips.length > 0);
          const activeTrip = v.trips && v.trips.length > 0 ? v.trips[0] : null;
          const originCity = activeTrip?.origin_city || v.branch?.city || 'Delhi';
          const destCity = activeTrip?.destination_city || 'Mumbai';

          return {
            id: v.id,
            plate: v.vehicle_number,
            model: `${v.vehicle_type} Fleet Unit`,
            type: v.vehicle_type,
            capacity: `${v.capacity_ton} Tons`,
            year: '2024',
            status: isTransit ? 'ON_ROAD' : v.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'YARD',
            status_label: isTransit ? 'On Road (68 km/h)' : v.status === 'MAINTENANCE' ? 'Under Service' : 'In Yard (Available)',
            location: isTransit ? `${originCity} ➔ ${destCity}` : `Stationed at ${v.branch?.city || 'Delhi'} Hub`,
            driver: v.assignedDriver?.name || 'Assigned Driver',
            driver_rating: '4.9 ★',
            fuel_level: 82,
            mileage_mtd: '11,840 km',
            avg_fuel_economy: '4.8 km/L',
            insurance_expiry: '15 Nov 2026',
            insurance_days: 90,
            fitness_expiry: '18 Jan 2027',
            fitness_days: 120,
            puc_expiry: '08 Dec 2026',
            puc_days: 60,
            maintenance_status: 'HEALTHY',
            gps_device_id: v.gps_device_id
          };
        });
        setVehicles(mapped);

        // Fallback extract branches if endpoint didn't provide
        setBranches((prev) => {
          if (prev.length > 0) return prev;
          const bList = [];
          res.value.data.data.forEach((v) => {
            if (v.branch && !bList.some((b) => b.id === v.branch.id)) bList.push(v.branch);
          });
          return bList;
        });
      }
    } catch (err) {
      console.error('Failed to fetch fleet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!vehicleForm.vehicle_number.trim()) {
      setFormError('Please enter a vehicle registration number');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/fleet/vehicles', {
        vehicle_number: vehicleForm.vehicle_number.toUpperCase().trim(),
        vehicle_type: vehicleForm.vehicle_type,
        capacity_ton: parseFloat(vehicleForm.capacity_ton) || 16,
        gps_device_id: vehicleForm.gps_device_id.trim() || `GPS-${vehicleForm.vehicle_number.replace(/[^A-Za-z0-9]/g, '').slice(-4)}`,
        branch_id: vehicleForm.branch_id || (branches.length > 0 ? branches[0].id : null),
        status: vehicleForm.status || 'AVAILABLE',
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setVehicleForm({
          vehicle_number: '',
          vehicle_type: 'TRUCK',
          capacity_ton: '16.0',
          gps_device_id: '',
          branch_id: '',
          status: 'AVAILABLE'
        });
        await fetchFleet();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add vehicle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { canExport, isAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('plate');
  const [sortOrder, setSortOrder] = useState('ASC');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const match =
        v.plate.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase()) ||
        v.driver.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase());

      if (filterType === 'ALL') return match;
      if (filterType === 'ON_ROAD') return match && v.status === 'ON_ROAD';
      if (filterType === 'MAINTENANCE') return match && v.status === 'MAINTENANCE';
      if (filterType === 'YARD') return match && v.status === 'YARD';
      return match;
    });
  }, [vehicles, search, filterType]);

  const sortedVehicles = useMemo(() => {
    const list = [...filteredVehicles];
    if (!sortBy) return list;
    return list.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [filteredVehicles, sortBy, sortOrder]);

  const paginatedVehicles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedVehicles.slice(start, start + pageSize);
  }, [sortedVehicles, page, pageSize]);

  const fleetColumns = useMemo(
    () => [
      {
        key: 'plate',
        header: 'Vehicle Plate & Model',
        sortable: true,
        width: 190,
        minWidth: 150,
        exportValue: (row) => `${row.plate} (${row.model}, ${row.year})`,
        render: (val, row) => (
          <div>
            <div className="font-mono font-bold text-xs text-cyan-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{row.plate}</span>
            </div>
            <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
              {row.model} ({row.year})
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type & Capacity',
        sortable: true,
        width: 160,
        minWidth: 130,
        exportValue: (row) => `${row.type} - ${row.capacity}`,
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {row.type}
            </div>
            <div className="text-[10px] text-slate-400">{row.capacity}</div>
          </div>
        ),
      },
      {
        key: 'location',
        header: 'Live Location & Speed',
        sortable: true,
        width: 200,
        minWidth: 150,
        exportValue: (row) => `${row.location} - ${row.status_label}`,
        render: (val, row) => (
          <div>
            <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.location}
            </div>
            <span className={`text-[10px] font-mono font-bold ${
              row.status === 'ON_ROAD' ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {row.status_label}
            </span>
          </div>
        ),
      },
      {
        key: 'driver',
        header: 'Assigned Driver',
        sortable: true,
        width: 170,
        minWidth: 130,
        exportValue: (row) => `${row.driver} (${row.driver_rating})`,
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.driver}
            </div>
            <span className="text-[10px] text-amber-400 font-bold">{row.driver_rating}</span>
          </div>
        ),
      },
      {
        key: 'fuel_level',
        header: 'Diesel Tank',
        sortable: true,
        width: 130,
        minWidth: 100,
        exportValue: (row) => `${row.fuel_level}%`,
        render: (val, row) => (
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className={`font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {row.fuel_level}%
              </span>
            </div>
            <div className="w-16 h-1 rounded-full bg-slate-800 mt-1 overflow-hidden">
              <div
                style={{ width: `${row.fuel_level}%` }}
                className={`h-full ${row.fuel_level > 30 ? 'bg-cyan-400' : 'bg-rose-500'}`}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'avg_fuel_economy',
        header: 'Fuel Economy',
        sortable: true,
        width: 130,
        minWidth: 100,
        exportValue: (row) => `${row.avg_fuel_economy}, ${row.mileage_mtd}`,
        render: (val, row) => (
          <div className="whitespace-nowrap">
            <span className="font-mono font-bold text-xs text-slate-300">{row.avg_fuel_economy}</span>
            <div className="text-[10px] text-slate-400 font-mono">{row.mileage_mtd} MTD</div>
          </div>
        ),
      },
      {
        key: 'insurance_days',
        header: 'Compliance Expiry',
        sortable: true,
        width: 180,
        minWidth: 140,
        exportValue: (row) => `INS:${row.insurance_days}d, FIT:${row.fitness_days}d, PUC:${row.puc_days}d`,
        render: (val, row) => (
          <div className="flex items-center gap-1.5 text-[10px] font-mono whitespace-nowrap">
            <span className={`px-1.5 py-0.5 rounded border ${
              row.insurance_days < 30 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-slate-300 border-slate-800'
            }`}>
              INS: {row.insurance_days}d
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
              FIT: {row.fitness_days}d
            </span>
            <span className={`px-1.5 py-0.5 rounded border ${
              row.puc_days < 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-900 text-slate-300 border-slate-800'
            }`}>
              PUC: {row.puc_days < 0 ? 'EXP' : `${row.puc_days}d`}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        width: 130,
        minWidth: 100,
        exportValue: (row) => row.status,
        render: (val, row) => (
          <div className="text-center whitespace-nowrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              row.status === 'ON_ROAD'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : row.status === 'YARD'
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {row.status}
            </span>
          </div>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        align: 'center',
        width: 120,
        minWidth: 100,
        excludeFromExport: true,
        resizable: false,
        render: (val, row) => (
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => alert(`Opening Complete Asset Card for ${row.plate}...`)}
              className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-cyan-400 hover:text-white text-xs font-bold"
            >
              View Asset
            </button>
          </div>
        ),
      },
    ],
    [isDark]
  );

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
                <Truck className="w-6 h-6 text-cyan-400" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Fleet & Vehicle Asset Management
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {vehicles.length} heavy commercial vehicles registered with AIS-140 live GPS telematics.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle</span>
              </button>
            </div>
          </div>

          {/* Operational Fleet Health & Utilization Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Vehicles</div>
              <div className="text-2xl font-black text-white font-mono">248</div>
              <div className="text-[10px] text-cyan-400 mt-1">100% GPS Equipped</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Active On Road</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">192</div>
              <div className="text-[10px] text-emerald-400/80 mt-1">77.4% Utilization</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">In Yard (Available)</div>
              <div className="text-2xl font-black text-blue-400 font-mono">32</div>
              <div className="text-[10px] text-slate-500 mt-1">Ready for Line-haul</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Under Maintenance</div>
              <div className="text-2xl font-black text-amber-400 font-mono">16</div>
              <div className="text-[10px] text-amber-400/80 mt-1">Scheduled Workshop</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Compliance Alerts</div>
              <div className="text-2xl font-black text-rose-400 font-mono">3</div>
              <div className="text-[10px] text-rose-400/80 mt-1">Insurance / PUC Due</div>
            </div>
          </div>

          {/* High-Density Vehicle Directory Server-side DataTable */}
          <DataTable
            columns={fleetColumns}
            data={paginatedVehicles}
            totalCount={sortedVehicles.length}
            isLoading={loading}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={({ sortBy: newSortBy, sortOrder: newSortOrder }) => {
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            searchQuery={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder="Search by Registration Plate, Model, Driver, Current City..."
            exportFilename="Fleet_Asset_Register"
            emptyTitle="No Vehicles Found"
            emptySubtitle="No commercial vehicles match your filter criteria."
            filtersSlot={
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setFilterType('ALL'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    filterType === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Vehicles ({vehicles.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('ON_ROAD'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    filterType === 'ON_ROAD'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  On Road ({vehicles.filter((v) => v.status === 'ON_ROAD').length})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('YARD'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    filterType === 'YARD'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  In Yard ({vehicles.filter((v) => v.status === 'YARD').length})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('MAINTENANCE'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    filterType === 'MAINTENANCE'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Maintenance ({vehicles.filter((v) => v.status === 'MAINTENANCE').length})
                </button>
              </div>
            }
          />

        </main>
      </div>
    </div>
  );
}
