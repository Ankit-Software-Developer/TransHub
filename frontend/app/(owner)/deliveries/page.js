// frontend/app/(owner)/deliveries/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { useTerminology } from '../../../hooks/useTerminology';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  PackageCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Phone,
  Send,
  AlertCircle
} from 'lucide-react';

export default function DeliveriesPage() {
  const { term, plural } = useTerminology();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport, canEditDelivery } = usePermissions();

  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('booking_date');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings?limit=100');
      if (res.data?.success) {
        // Filter those pending delivery or in transit or out for delivery
        const pending = (res.data.data || []).filter((c) =>
          ['REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'BOOKED'].includes(c.status)
        );
        setConsignments(pending);
      }
    } catch (err) {
      console.error('Failed to load pending deliveries', err);
      setConsignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleOutForDelivery = async (id) => {
    try {
      await api.post(`/deliveries/${id}/out-for-delivery`);
      fetchDeliveries();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDeliver = async () => {
    if (!receiverName) {
      alert('Receiver name is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/deliveries/${selectedConsignment.id}/delivered`, {
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
      });
      if (res.data?.success) {
        setSelectedConsignment(null);
        setReceiverName('');
        setReceiverPhone('');
        fetchDeliveries();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delivery confirmation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredConsignments = useMemo(() => {
    return consignments.filter((c) => {
      const lr = c.docket_number || c.lr_number || '';
      const consignee = c.consignee?.name || '';
      const origin = c.origin_city || '';
      const dest = c.destination_city || '';
      return (
        lr.toLowerCase().includes(search.toLowerCase()) ||
        consignee.toLowerCase().includes(search.toLowerCase()) ||
        origin.toLowerCase().includes(search.toLowerCase()) ||
        dest.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [consignments, search]);

  const sortedConsignments = useMemo(() => {
    const list = [...filteredConsignments];
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
  }, [filteredConsignments, sortBy, sortOrder]);

  const paginatedConsignments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedConsignments.slice(start, start + pageSize);
  }, [sortedConsignments, page, pageSize]);

  const columns = useMemo(
    () => [
      {
        key: 'lr_number',
        header: `${term} Number`,
        sortable: true,
        width: 170,
        minWidth: 130,
        exportValue: (row) => row.docket_number || row.lr_number,
        render: (val, row) => (
          <span className="font-mono font-bold text-blue-500 hover:underline">
            {row.docket_number || row.lr_number}
          </span>
        ),
      },
      {
        key: 'booking_date',
        header: 'Booking Date',
        sortable: true,
        width: 120,
        minWidth: 95,
        exportValue: (row) => row.booking_date,
        render: (val, row) => (
          <span className="text-slate-400 text-xs">
            {row.booking_date ? new Date(row.booking_date).toLocaleDateString('en-GB') : 'Today'}
          </span>
        ),
      },
      {
        key: 'origin_city',
        header: 'Corridor Route',
        sortable: true,
        width: 160,
        minWidth: 130,
        exportValue: (row) => `${row.origin_city} → ${row.destination_city}`,
        render: (val, row) => (
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {row.origin_city} → {row.destination_city}
          </span>
        ),
      },
      {
        key: 'consignee',
        header: 'Consignee (Recipient)',
        sortable: false,
        width: 180,
        minWidth: 140,
        exportValue: (row) => row.consignee?.name || '',
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.consignee?.name || 'Consignee'}
            </div>
            <div className="text-[10px] text-slate-400">
              {row.consignee?.city || row.destination_city}
            </div>
          </div>
        ),
      },
      {
        key: 'packages_count',
        header: 'Packages & Weight',
        sortable: true,
        align: 'right',
        width: 150,
        minWidth: 120,
        exportValue: (row) => `${row.packages_count} Pkgs (${row.charged_weight || row.actual_weight} KG)`,
        render: (val, row) => (
          <div className="text-right whitespace-nowrap">
            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.packages_count} Pkgs
            </span>
            <div className="text-[10px] text-slate-400">
              {row.charged_weight || row.actual_weight} KG
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        width: 130,
        minWidth: 110,
        exportValue: (row) => row.status,
        render: (val, row) => (
          <div className="text-center">
            <Badge status={row.status} size="xs" />
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Delivery Action',
        align: 'center',
        width: 200,
        minWidth: 160,
        excludeFromExport: true,
        resizable: false,
        render: (val, row) => (
          <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
            {(canEdit || canEditDelivery) ? (
              <>
                {row.status !== 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() => handleOutForDelivery(row.id)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Out for Delivery
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedConsignment(row);
                    setReceiverName(row.consignee?.name || '');
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors whitespace-nowrap"
                >
                  Mark Delivered
                </button>
              </>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400 italic">View only</span>
            )}
          </div>
        ),
      },
    ],
    [term, isDark, canEdit, canEditDelivery]
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
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Last-Mile Delivery Operations
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Record consignee cargo handover, verify recipient details, and update POD status
              </p>
            </div>
          </div>

          {/* Master Deliveries Server-side DataTable */}
          <DataTable
            columns={columns}
            data={paginatedConsignments}
            totalCount={sortedConsignments.length}
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
            searchPlaceholder={`Search by ${term} #, consignee, route...`}
            exportFilename="Deliveries_Registry"
            emptyTitle="No Deliveries Awaiting Handover"
            emptySubtitle="All inbound consignments are delivered or currently in line-haul transit."
          />

          {/* Delivery Handover Modal */}
          {selectedConsignment && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <h3 className="text-base font-bold mb-1">
                  Confirm Cargo Handover
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Record recipient identity and verification for {selectedConsignment.docket_number || selectedConsignment.lr_number}
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Receiver Name *
                    </label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="e.g. Ramesh Singh (Warehouse In-charge)"
                      className={`w-full rounded-xl px-3 py-2 text-sm font-semibold border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Receiver Mobile Phone
                    </label>
                    <input
                      type="text"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className={`w-full rounded-xl px-3 py-2 text-sm border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedConsignment(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleDeliver}
                    className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/30"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Delivery'}
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
