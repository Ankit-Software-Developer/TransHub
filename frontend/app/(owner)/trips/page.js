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
  AlertTriangle,
  Wallet,
  Receipt,
  Fuel,
  CreditCard,
  Banknote
} from 'lucide-react';
import Link from 'next/link';

export default function TripsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport, isAdmin, canCreateTrip, canEditTrip, canSettleTrip } = usePermissions();

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
  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [tripToAssign, setTripToAssign] = useState(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [assignDriverId, setAssignDriverId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Advance & Expense Disbursal Modal State
  const [advExpModalOpen, setAdvExpModalOpen] = useState(false);
  const [advExpTrip, setAdvExpTrip] = useState(null);
  const [advExpType, setAdvExpType] = useState('ADVANCE'); // 'ADVANCE' | 'EXPENSE'
  const [advAmount, setAdvAmount] = useState('');
  const [advMode, setAdvMode] = useState('CASH');
  const [advRemarks, setAdvRemarks] = useState('');
  const [expCategory, setExpCategory] = useState('Fuel & Diesel');
  const [expAmount, setExpAmount] = useState('');
  const [expPaymentMethod, setExpPaymentMethod] = useState('CASH');
  const [expRemarks, setExpRemarks] = useState('');
  const [submittingAdvExp, setSubmittingAdvExp] = useState(false);
  const [advExpError, setAdvExpError] = useState('');

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
    if (!canSettleTrip) return;
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

  const handleOpenAddAdvanceOrExp = (trip, defaultType = 'ADVANCE') => {
    setAdvExpTrip(trip);
    setAdvExpType(defaultType);
    setAdvAmount('');
    setAdvMode('CASH');
    setAdvRemarks('');
    setExpCategory('Fuel & Diesel');
    setExpAmount('');
    setExpPaymentMethod('CASH');
    setExpRemarks('');
    setAdvExpError('');
    setAdvExpModalOpen(true);
  };

  const handleSubmitAdvExp = async (e) => {
    e.preventDefault();
    if (!advExpTrip) return;
    setAdvExpError('');
    setSubmittingAdvExp(true);
    try {
      if (advExpType === 'ADVANCE') {
        const val = parseFloat(advAmount);
        if (!val || val <= 0) {
          setAdvExpError('Please enter a valid advance amount');
          setSubmittingAdvExp(false);
          return;
        }
        await api.post('/expenses/advance', {
          trip_id: advExpTrip.id,
          driver_id: advExpTrip.driver?.id || advExpTrip.driver_id,
          amount: val,
          disbursed_mode: advMode,
          remarks: advRemarks || `Driver advance for Trip #${advExpTrip.trip_number}`,
        });
      } else {
        const val = parseFloat(expAmount);
        if (!val || val <= 0) {
          setAdvExpError('Please enter a valid expense amount');
          setSubmittingAdvExp(false);
          return;
        }
        await api.post('/expenses', {
          trip_id: advExpTrip.id,
          category_id: expCategory,
          amount: val,
          payment_method: expPaymentMethod,
          expense_date: new Date().toISOString().slice(0, 10),
          remarks: expRemarks || `Trip #${advExpTrip.trip_number} expense (${expCategory})`,
        });
      }
      setAdvExpModalOpen(false);
      setAdvExpTrip(null);
      await fetchTrips();
    } catch (err) {
      setAdvExpError(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setSubmittingAdvExp(false);
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
      width: 140,
      minWidth: 120,
      sortable: false,
      align: 'right',
      render: (val, row) => (
        <div className="text-xs text-right space-y-0.5">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            ₹{parseFloat(row.driver_advance || 0).toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-slate-400">
            Exp: ₹{parseFloat(row.total_expenses || 0).toLocaleString('en-IN')}
          </p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Trip Status',
      width: 130,
      minWidth: 110,
      sortable: true,
      align: 'center',
      render: (val) => <Badge status={val} size="xs" />
    },
    {
      key: 'settlement',
      label: 'Settlement',
      width: 110,
      minWidth: 90,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        row.settlement_status === 'SETTLED' ? (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
            SETTLED
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Pending</span>
        )
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 210,
      minWidth: 180,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {row.settlement_status !== 'SETTLED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddAdvanceOrExp(row);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Disburse Driver Advance or Log Trip Expense"
            >
              <Plus className="w-3 h-3" />
              Add Adv / Exp
            </button>
          )}

          {row.settlement_status !== 'SETTLED' && canEdit && (
            <button
              onClick={() => setSelectedTrip(row)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 whitespace-nowrap"
            >
              Settle Trip
            </button>
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
              <Link
                href="/load-planning"
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Load Planning Dock</span>
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
                  {canSettleTrip && (
                    <button
                      disabled={settling}
                      onClick={() => handleSettle(selectedTrip.id)}
                      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm"
                    >
                      {settling ? 'Settling...' : 'Confirm & Settle'}
                    </button>
                  )}
                </div>
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

          {/* Quick Disburse Driver Advance & Log Trip Expense Modal */}
          {advExpModalOpen && advExpTrip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Modal Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight">Driver Advance & Trip Expenses</h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Trip #{advExpTrip.trip_number} • {advExpTrip.origin_city || advExpTrip.originBranch?.city || 'Origin'} → {advExpTrip.destination_city || advExpTrip.destBranch?.city || 'Dest'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAdvExpModalOpen(false)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Trip Financial Snapshot Banner */}
                <div className={`px-6 py-3 border-b grid grid-cols-2 gap-3 text-xs ${
                  isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Driver:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {advExpTrip.driver?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-cyan-400 truncate">
                      {advExpTrip.vehicle?.vehicle_number || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Current Advance:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{parseFloat(advExpTrip.driver_advance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Total Expenses:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                      ₹{parseFloat(advExpTrip.total_expenses || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Action Mode Toggle Pills */}
                <div className="px-6 pt-4">
                  <div className={`flex rounded-xl p-1 border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setAdvExpType('ADVANCE')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        advExpType === 'ADVANCE'
                          ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm')
                          : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Disburse Driver Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvExpType('EXPENSE')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        advExpType === 'EXPENSE'
                          ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm')
                          : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Log Trip Expense (Fuel/Toll)
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmitAdvExp} className="p-6 space-y-4">
                  {advExpError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{advExpError}</span>
                    </div>
                  )}

                  {advExpType === 'ADVANCE' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Disbursed Amount (₹) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              required
                              min="1"
                              value={advAmount}
                              onChange={(e) => setAdvAmount(e.target.value)}
                              placeholder="e.g. 2000"
                              className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Disbursal Mode
                          </label>
                          <select
                            value={advMode}
                            onChange={(e) => setAdvMode(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="CASH">Cash in Hand</option>
                            <option value="UPI">UPI / Digital (GPay/PhonePe)</option>
                            <option value="FUEL_CARD">Fuel Card (Diesel)</option>
                            <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Advance Remarks / Voucher Note
                        </label>
                        <input
                          type="text"
                          value={advRemarks}
                          onChange={(e) => setAdvRemarks(e.target.value)}
                          placeholder="e.g. Handed over cash advance at hub before departure"
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Expense Category *
                          </label>
                          <select
                            value={expCategory}
                            onChange={(e) => setExpCategory(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="Fuel & Diesel">Fuel & Diesel</option>
                            <option value="Toll & Fastag">Toll & FASTag</option>
                            <option value="Driver Daily Allowance">Driver Daily Allowance / Bhatta</option>
                            <option value="Loading & Hamali">Loading & Hamali</option>
                            <option value="Unloading Charges">Unloading Charges</option>
                            <option value="Vehicle Maintenance & Spares">Vehicle Maintenance & Spares</option>
                            <option value="Police / RTO / Challan">Police / RTO / Challan</option>
                            <option value="Tyre & Punctures">Tyre & Punctures</option>
                            <option value="Miscellaneous">Miscellaneous</option>
                          </select>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Expense Amount (₹) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              required
                              min="1"
                              value={expAmount}
                              onChange={(e) => setExpAmount(e.target.value)}
                              placeholder="e.g. 1500"
                              className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Payment Method
                          </label>
                          <select
                            value={expPaymentMethod}
                            onChange={(e) => setExpPaymentMethod(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="CASH">Cash</option>
                            <option value="FUEL_CARD">Fuel Card</option>
                            <option value="FASTAG">FASTag / RFID</option>
                            <option value="UPI">UPI / Digital</option>
                            <option value="COMPANY_CARD">Company Card</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                          </select>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Expense Description
                          </label>
                          <input
                            type="text"
                            value={expRemarks}
                            onChange={(e) => setExpRemarks(e.target.value)}
                            placeholder="e.g. Toll plaza receipt #8291"
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className={`flex items-center justify-end space-x-2.5 pt-3 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setAdvExpModalOpen(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAdvExp}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-2"
                    >
                      {submittingAdvExp ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : advExpType === 'ADVANCE' ? (
                        <span>Disburse Advance</span>
                      ) : (
                        <span>Save Expense</span>
                      )}
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
