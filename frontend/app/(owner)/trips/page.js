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
  FileText,
  User,
  Layers,
  ArrowRight
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

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('trip_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTrips = async () => {
    setLoading(true);
    try {
      let url = `/trips?page=${page}&limit=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;

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

  useEffect(() => {
    fetchTrips();
  }, [page, pageSize, sortBy, sortOrder, statusFilter, search]);

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
      width: 160,
      minWidth: 130,
      sortable: false,
      render: (val, row) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
            {row.vehicle?.vehicle_number || 'Unassigned'}
          </span>
          {row.vehicle?.vehicle_type && (
            <p className="text-[11px] text-slate-400">{row.vehicle.vehicle_type}</p>
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
                Monitor long-distance line haul journeys, track driver cash advances, and finalize fuel settlement
              </p>
            </div>

            <Link
              href="/load-planning"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Truck className="w-4 h-4" />
              <span>New Trip & Dispatch</span>
            </Link>
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
        </main>
      </div>
    </div>
  );
}
