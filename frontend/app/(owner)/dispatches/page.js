// frontend/app/(owner)/dispatches/page.js
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
  Layers,
  Truck,
  FileText,
  Printer,
  Calendar,
  Building2,
  Lock,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function DispatchesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canExport, isAdmin } = usePermissions();

  const [trips, setTrips] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchTrips = async (overrides = {}) => {
    setLoading(true);
    const p = overrides.page !== undefined ? overrides.page : page;
    const ps = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;
    const sb = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const so = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const sq = overrides.search !== undefined ? overrides.search : search;
    const sf = overrides.status !== undefined ? overrides.status : statusFilter;
    const fd = overrides.fromDate !== undefined ? overrides.fromDate : fromDate;
    const td = overrides.toDate !== undefined ? overrides.toDate : toDate;

    try {
      let url = `/trips?page=${p}&limit=${ps}&sort_by=${sb}&sort_order=${so}`;
      if (sq) url += `&search=${encodeURIComponent(sq)}`;
      if (sf && sf !== 'ALL') url += `&status=${sf}`;
      if (fd) url += `&from_date=${fd}`;
      if (td) url += `&to_date=${td}`;
      const res = await api.get(url);
      if (res.data?.success) {
        setTrips(res.data.data || []);
        setTotalCount(res.data.pagination?.total ?? (res.data.data || []).length);
      }
    } catch (err) {
      console.error('Failed to load dispatches', err);
      setTrips([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [page, pageSize, sortBy, sortOrder, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTrips({ search, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const columns = useMemo(
    () => [
      {
        key: 'trip_number',
        header: 'Trip / Dispatch #',
        sortable: true,
        width: 170,
        minWidth: 130,
        exportValue: (row) => row.trip_number,
        render: (val, row) => (
          <span className="font-mono font-bold text-blue-500 hover:underline">
            {row.trip_number}
          </span>
        ),
      },
      {
        key: 'trip_date',
        header: 'Dispatch Date',
        sortable: true,
        width: 120,
        minWidth: 95,
        exportValue: (row) => row.trip_date,
        render: (val, row) => (
          <span className="text-slate-400 text-xs">
            {row.trip_date || 'Today'}
          </span>
        ),
      },
      {
        key: 'originBranch',
        header: 'Origin Branch',
        sortable: false,
        width: 150,
        minWidth: 120,
        exportValue: (row) => row.originBranch?.city || row.originBranch?.branch_name || '—',
        render: (val, row) => (
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {row.originBranch?.city || row.originBranch?.branch_name || '—'}
          </span>
        ),
      },
      {
        key: 'destBranch',
        header: 'Destination Hub',
        sortable: false,
        width: 150,
        minWidth: 120,
        exportValue: (row) => row.destBranch?.city || row.destBranch?.branch_name || '—',
        render: (val, row) => (
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {row.destBranch?.city || row.destBranch?.branch_name || '—'}
          </span>
        ),
      },
      {
        key: 'vehicle',
        header: 'Assigned Vehicle',
        sortable: false,
        width: 160,
        minWidth: 130,
        exportValue: (row) => row.vehicle?.vehicle_number || 'Unassigned',
        render: (val, row) => (
          <div className={`font-mono font-bold text-xs ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
            {row.vehicle?.vehicle_number || 'Unassigned'}
          </div>
        ),
      },
      {
        key: 'driver',
        header: 'Assigned Driver',
        sortable: false,
        width: 150,
        minWidth: 120,
        exportValue: (row) => row.driver?.name || 'Pending',
        render: (val, row) => (
          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {row.driver?.name || 'Pending'}
          </span>
        ),
      },
      {
        key: 'total_packages',
        header: 'Cargo Load',
        sortable: true,
        align: 'right',
        width: 150,
        minWidth: 120,
        exportValue: (row) => `${row.total_packages || 0} Pkgs (${row.total_weight || 0} KG)`,
        render: (val, row) => (
          <div className="text-right whitespace-nowrap">
            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.total_packages || 0} Pkgs
            </span>
            <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {row.total_weight || 0} KG
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        width: 120,
        minWidth: 100,
        exportValue: (row) => row.status,
        render: (val, row) => (
          <div className="text-center">
            <Badge status={row.status} size="xs" />
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1720px] mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Dispatch Challans & Gate Out
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Branch outbound line-haul dispatches and stamped challan manifests
              </p>
            </div>

            <Link
              href="/load-planning"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Dispatch</span>
            </Link>
          </div>

          {/* Master Dispatch Server-side DataTable */}
          <DataTable
            columns={columns}
            data={trips}
            totalCount={totalCount}
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
            onSearchChange={(val) => setSearch(val)}
            searchPlaceholder="Search dispatch #, vehicle, driver..."
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={({ fromDate: newFrom, toDate: newTo }) => {
              setFromDate(newFrom);
              setToDate(newTo);
              setPage(1);
              fetchTrips({ page: 1, fromDate: newFrom, toDate: newTo });
            }}
            exportFilename="Dispatch_Manifest_Register"
            emptyTitle="No Dispatches Found"
            emptySubtitle="No outbound line-haul trips match your current filter parameters."
            filtersSlot={
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ALL'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('PLANNED'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'PLANNED'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Staged / Planned
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('IN_TRANSIT'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'IN_TRANSIT'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  In Transit
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('COMPLETED'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Completed / Unloaded
                </button>
              </div>
            }
          />
        </main>
      </div>
    </div>
  );
}
