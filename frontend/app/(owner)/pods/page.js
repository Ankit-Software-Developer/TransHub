// frontend/app/(owner)/pods/page.js
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
  FileCheck,
  CheckCircle,
  Eye,
  Check,
  Filter,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export default function PodManagementPage() {
  const { term, plural } = useTerminology();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport, isAdmin } = usePermissions();

  const [pods, setPods] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  const fetchPods = async () => {
    setLoading(true);
    try {
      let url = `/pods?page=${page}&limit=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      
      const res = await api.get(url);
      if (res.data?.success) {
        setPods(res.data.data || []);
        if (res.data.pagination) {
          setTotalRecords(res.data.pagination.total || 0);
        } else {
          setTotalRecords((res.data.data || []).length);
        }
      }
    } catch (err) {
      console.error('Failed to load PODs', err);
      setPods([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPods();
  }, [page, pageSize, sortBy, sortOrder, selectedStatus, search]);

  const handleVerify = async (podId) => {
    try {
      const res = await api.patch(`/pods/${podId}/verify`, {
        status: 'POD_VERIFIED',
      });
      if (res.data?.success) {
        fetchPods();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const columns = useMemo(() => [
    {
      key: 'consignment',
      label: `${term} Number`,
      width: 170,
      minWidth: 140,
      sortable: false,
      render: (val, row) => (
        <div>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {row.consignment?.lr_number || 'N/A'}
          </span>
          <p className="text-[11px] text-slate-400">
            {row.consignment?.origin_city || '-'} → {row.consignment?.destination_city || '-'}
          </p>
        </div>
      )
    },
    {
      key: 'consignor',
      label: 'Consignor (Sender)',
      width: 180,
      minWidth: 140,
      sortable: false,
      render: (val, row) => (
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
          {row.consignment?.consignor?.name || 'Walk-in Sender'}
        </span>
      )
    },
    {
      key: 'consignee',
      label: 'Consignee (Receiver)',
      width: 180,
      minWidth: 140,
      sortable: false,
      render: (val, row) => (
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
          {row.consignment?.consignee?.name || 'Walk-in Receiver'}
        </span>
      )
    },
    {
      key: 'receiver_name',
      label: 'Receiver Sign-off',
      width: 170,
      minWidth: 130,
      sortable: true,
      render: (val) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {val || 'Store In-charge'}
        </span>
      )
    },
    {
      key: 'uploaded_at',
      label: 'Uploaded Date',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {val ? new Date(val).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'POD Status',
      width: 140,
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (val) => <Badge status={val} size="xs" />
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 180,
      minWidth: 140,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center space-x-2">
          {row.status !== 'POD_VERIFIED' && canEdit && (
            <button
              onClick={() => handleVerify(row.id)}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-colors inline-flex items-center space-x-1"
              title="Verify Clean Delivery"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>
          )}
          {row.file_url ? (
            <a
              href={row.file_url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg transition-colors inline-flex items-center space-x-1"
              title="Preview POD Document"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </a>
          ) : (
            <span className="text-[11px] text-slate-400 italic">No File</span>
          )}
        </div>
      )
    }
  ], [term, canEdit]);

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending Verification', value: 'POD_UPLOADED' },
    { label: 'Verified Clean', value: 'POD_VERIFIED' },
    { label: 'Pending Upload', value: 'POD_PENDING' },
    { label: 'Rejected', value: 'POD_REJECTED' }
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
                <FileCheck className="w-6 h-6 text-blue-500" />
                Proof of Delivery (POD) Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage physical signed consignment receipts, digital customer signatures, and audit verifications
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={pods}
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
            searchPlaceholder="Search by receiver name..."
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
                      setSelectedStatus(opt.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedStatus === opt.value
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
            exportFileName="POD_Registers"
            emptyMessage="No Proof of Delivery records found."
          />
        </main>
      </div>
    </div>
  );
}
