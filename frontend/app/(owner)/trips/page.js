// frontend/app/(owner)/trips/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  CheckCircle2,
  FileText,
  User,
  Layers,
  ArrowRight,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function TripsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport } = usePermissions();

  const [trips, setTrips] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [settling, setSettling] = useState(false);
  const [driverAllowance, setDriverAllowance] = useState(1500);

  // Vehicle Assignment & Trip Creation State
  const [vehiclesList, setVehiclesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [tripToAssign, setTripToAssign] = useState(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [assignDriverId, setAssignDriverId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [tripForm, setTripForm] = useState({
    origin_branch_id: '',
    dest_branch_id: '',
    vehicle_id: '',
    driver_id: '',
    trip_date: new Date().toISOString().slice(0, 10),
    driver_advance: 1500,
    start_odometer: 0,
    status: 'RUNNING',
    remarks: ''
  });

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('trip_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchTrips = async () => {
    setLoading(true);
    try {
      let url = `/trips?page=${page}&limit=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setTrips(res.data.data || []);
        if (res.data.pagination) {
          setTotalRecords(res.data.pagination.total || 0);
        } else {
          setTotalRecords((res.data.data || []).length);
        }
      }
    } catch (err) {
      console.error('Failed to load trips', err);
      setTrips([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [vRes, bRes, dRes] = await Promise.allSettled([
        api.get('/fleet/vehicles'),
        api.get('/organizations/branches'),
        api.get('/fleet/drivers'),
      ]);
      if (vRes.status === 'fulfilled' && vRes.value?.data?.success) {
        setVehiclesList(vRes.value.data.data || []);
      }
      if (bRes.status === 'fulfilled' && bRes.value?.data?.success) {
        setBranchesList(bRes.value.data.data || []);
      }
      if (dRes.status === 'fulfilled' && dRes.value?.data?.success) {
        setDriversList(dRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load fleet master data for trips:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [page, pageSize, sortBy, sortOrder, statusFilter, search, fromDate, toDate]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!tripForm.vehicle_id) {
      setFormError('Please select a vehicle from the fleet register');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/trips', tripForm);
      if (res.data?.success) {
        setIsCreateTripOpen(false);
        fetchTrips();
        fetchMasterData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignVehicle = (trip) => {
    setTripToAssign(trip);
    setAssignVehicleId(trip.vehicle?.id || trip.vehicle_id || '');
    setAssignDriverId(trip.driver?.id || trip.driver_id || '');
    setIsAssignVehicleOpen(true);
  };

  const handleConfirmAssignVehicle = async (e) => {
    e.preventDefault();
    if (!tripToAssign) return;
    if (!assignVehicleId) {
      alert('Please select a vehicle');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.patch(`/trips/${tripToAssign.id}/assign-vehicle`, {
        vehicle_id: assignVehicleId,
        driver_id: assignDriverId || null,
      });
      if (res.data?.success) {
        setIsAssignVehicleOpen(false);
        setTripToAssign(null);
        fetchTrips();
        fetchMasterData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettle = async (tripId) => {
    setSettling(true);
    try {
      const res = await api.post('/expenses/settle', {
        trip_id: tripId,
        driver_allowance: driverAllowance,
        remarks: 'Trip advance & expense reconciliation closed',
      });
      if (res.data?.success) {
        setSelectedTrip(null);
        fetchTrips();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Settlement failed');
    } finally {
      setSettling(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'trip_number',
      label: 'Trip Number',
      width: 170,
      minWidth: 140,
      sortable: true,
      render: (val) => (
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {val}
        </span>
      )
    },
    {
      key: 'trip_date',
      label: 'Trip Date',
      width: 130,
      minWidth: 110,
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {val ? new Date(val).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      key: 'route',
      label: 'Route',
      width: 180,
      minWidth: 140,
      sortable: false,
      render: (val, row) => (
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {row.origin_city || row.originBranch?.city || 'Origin'} → {row.destination_city || row.destBranch?.city || 'Dest'}
        </div>
      )
    },
    {
      key: 'vehicle',
      label: 'Assigned Vehicle',
      width: 190,
      minWidth: 160,
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span className={`font-mono font-bold text-xs truncate block ${row.vehicle ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'}`}>
              {row.vehicle?.vehicle_number || 'Unassigned'}
            </span>
            {row.vehicle?.vehicle_type && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {row.vehicle.vehicle_type} ({row.vehicle.capacity_ton || '10'}T)
              </p>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => handleOpenAssignVehicle(row)}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 shrink-0"
              title="Assign or Change Vehicle"
            >
              Assign
            </button>
          )}
        </div>
      )
    },
    {
      key: 'driver',
      label: 'Assigned Driver',
      width: 160,
      minWidth: 130,
      sortable: false,
      render: (val, row) => (
        <div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {row.driver?.name || 'Unassigned'}
          </span>
          {row.driver?.phone && (
            <p className="text-[11px] text-slate-400">{row.driver.phone}</p>
          )}
        </div>
      )
    },
    {
      key: 'total_weight',
      label: 'Cargo Weight',
      width: 140,
      minWidth: 110,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {val ? `${Number(val).toLocaleString()} KG` : '0 KG'}
        </span>
      )
    },
    {
      key: 'financials',
      label: 'Advance / Exp',
      width: 160,
      minWidth: 130,
      sortable: false,
      align: 'right',
      render: (val, row) => (
        <div className="text-xs text-right">
          <p className="font-bold text-slate-900 dark:text-slate-100">
            ₹{parseFloat(row.driver_advance || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400">
            Exp: ₹{parseFloat(row.total_expenses || 0).toLocaleString('en-IN')}
          </p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Trip Status',
      width: 140,
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (val) => <Badge status={val} size="xs" />
    },
    {
      key: 'settlement',
      label: 'Settlement',
      width: 140,
      minWidth: 120,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div>
          {row.settlement_status === 'SETTLED' ? (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              SETTLED
            </span>
          ) : canEdit ? (
            <button
              onClick={() => setSelectedTrip(row)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800"
            >
              Settle Trip
            </button>
          ) : (
            <span className="text-xs text-slate-400">Pending</span>
          )}
        </div>
      )
    }
  ], [canEdit]);

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Created', value: 'CREATED' },
    { label: 'Loading', value: 'LOADING' },
    { label: 'Dispatched', value: 'DISPATCHED' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Settled', value: 'SETTLED' },
  ];

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0B1120]' : 'bg-[#F6F8FB]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-500" />
                Line-Haul Trips & Movement
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitor long-distance line haul journeys, assign commercial fleet vehicles, and reconcile settlements.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => {
                  setTripForm({
                    origin_branch_id: branchesList[0]?.id || '',
                    dest_branch_id: branchesList[1]?.id || branchesList[0]?.id || '',
                    vehicle_id: vehiclesList.find(v => v.status === 'AVAILABLE')?.id || vehiclesList[0]?.id || '',
                    driver_id: driversList[0]?.id || '',
                    trip_date: new Date().toISOString().slice(0, 10),
                    driver_advance: 1500,
                    start_odometer: 0,
                    status: 'RUNNING',
                    remarks: ''
                  });
                  setFormError('');
                  setIsCreateTripOpen(true);
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Line-Haul Trip</span>
              </button>

              <Link
                href="/load-planning"
                className="flex items-center space-x-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Load Planning</span>
              </Link>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={trips}
            loading={loading}
            totalItems={totalRecords}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(field, order) => {
              setSortBy(field);
              setSortOrder(order);
              setPage(1);
            }}
            searchable={true}
            searchPlaceholder="Search by trip number..."
            onSearchChange={(q) => {
              setSearch(q);
              setPage(1);
            }}
            filtersSlot={
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === opt.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                        ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={({ fromDate: newFrom, toDate: newTo }) => {
              setFromDate(newFrom);
              setToDate(newTo);
              setPage(1);
            }}
            exportable={true}
            exportFileName="Trips_Log"
            emptyMessage="No trips recorded yet."
          />

          {/* Settle Modal */}
          {selectedTrip && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Trip Expense Settlement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Reconcile driver cash advance with highway fuel & toll receipts for {selectedTrip.trip_number}
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Disbursed Driver Advance:</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{selectedTrip.driver_advance || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Reported Trip Expenses:</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{selectedTrip.total_expenses || 0}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Driver Allowance (Bhatta) ₹
                  </label>
                  <input
                    type="number"
                    value={driverAllowance}
                    onChange={(e) => setDriverAllowance(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedTrip(null)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={settling}
                    onClick={() => handleSettle(selectedTrip.id)}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm"
                  >
                    {settling ? 'Settling...' : 'Confirm & Settle'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Line-Haul Trip & Assign Vehicle Modal */}
          {isCreateTripOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight">Create Line-Haul Trip</h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Assign registered fleet vehicle and driver to a movement route
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateTripOpen(false)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateTrip} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Vehicle Dropdown */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Assigned Vehicle (from Fleet) *
                    </label>
                    <select
                      required
                      value={tripForm.vehicle_id}
                      onChange={(e) => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">-- Select Registered Vehicle --</option>
                      {vehiclesList.map((v) => {
                        const isAvail = v.status === 'AVAILABLE';
                        const isInactive = v.status === 'INACTIVE';
                        const specInfo = [
                          v.make_model || v.vehicle_type,
                          `${v.capacity_ton}T`,
                          v.length_ft ? `${v.length_ft}ft` : null,
                          v.ownership === 'ATTACHED' ? 'Attached' : v.ownership === 'MARKET' ? 'Market' : 'Own Fleet'
                        ].filter(Boolean).join(' • ');
                        return (
                          <option key={v.id} value={v.id} disabled={isInactive}>
                            {v.vehicle_number} — {specInfo} {isInactive ? '❌ [INACTIVE]' : isAvail ? '✅ [In Yard]' : `[${v.status}]`}
                          </option>
                        );
                      })}
                    </select>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Select an active vehicle registered in the Fleet Management register.
                    </p>
                  </div>

                  {/* Route Branches */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Origin Branch Hub
                      </label>
                      <select
                        value={tripForm.origin_branch_id}
                        onChange={(e) => setTripForm({ ...tripForm, origin_branch_id: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="">{branchesList.length === 0 ? 'No hubs added yet (Add Branch first)' : 'Select Origin Hub'}</option>
                        {branchesList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.branch_name || b.city} ({b.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Destination Branch Hub
                      </label>
                      <select
                        value={tripForm.dest_branch_id}
                        onChange={(e) => setTripForm({ ...tripForm, dest_branch_id: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="">{branchesList.length === 0 ? 'No hubs added yet (Add Branch first)' : 'Select Destination Hub'}</option>
                        {branchesList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.branch_name || b.city} ({b.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Driver & Trip Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Assigned Driver
                      </label>
                      <select
                        value={tripForm.driver_id}
                        onChange={(e) => setTripForm({ ...tripForm, driver_id: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="">Select Driver</option>
                        {driversList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.phone ? `(${d.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Trip Date
                      </label>
                      <input
                        type="date"
                        value={tripForm.trip_date}
                        onChange={(e) => setTripForm({ ...tripForm, trip_date: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Driver Advance & Start Odometer */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Driver Cash Advance (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={tripForm.driver_advance}
                        onChange={(e) => setTripForm({ ...tripForm, driver_advance: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Initial Status
                      </label>
                      <select
                        value={tripForm.status}
                        onChange={(e) => setTripForm({ ...tripForm, status: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="RUNNING">RUNNING (Dispatched on Road)</option>
                        <option value="PLANNED">PLANNED (Staged at Dock)</option>
                      </select>
                    </div>
                  </div>

                  <div className={`flex items-center justify-end gap-2.5 pt-4 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setIsCreateTripOpen(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Creating Trip...</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5" />
                          <span>Create & Assign Vehicle</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Quick Assign Vehicle Modal */}
          {isAssignVehicleOpen && tripToAssign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black">Assign Vehicle</h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Trip #{tripToAssign.trip_number}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAssignVehicleOpen(false)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleConfirmAssignVehicle} className="p-6 space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Select Vehicle *
                    </label>
                    <select
                      required
                      value={assignVehicleId}
                      onChange={(e) => setAssignVehicleId(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">-- Choose Vehicle --</option>
                      {vehiclesList.map((v) => {
                        const isInactive = v.status === 'INACTIVE';
                        const isAvail = v.status === 'AVAILABLE';
                        return (
                          <option key={v.id} value={v.id} disabled={isInactive}>
                            {v.vehicle_number} — {v.vehicle_type} ({v.capacity_ton}T) {isInactive ? '❌ [INACTIVE]' : isAvail ? '✅ [In Yard]' : `[${v.status}]`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Assign Driver (Optional)
                    </label>
                    <select
                      value={assignDriverId}
                      onChange={(e) => setAssignDriverId(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Keep current driver</option>
                      {driversList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.phone ? `(${d.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800/40">
                    <button
                      type="button"
                      onClick={() => setIsAssignVehicleOpen(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                    >
                      {isSubmitting ? 'Assigning...' : 'Assign Vehicle'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
