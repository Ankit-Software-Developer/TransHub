// frontend/app/(owner)/customers/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTheme } from '../../../components/ThemeProvider';
import {
  Users,
  Plus,
  Phone,
  Building2,
  DollarSign,
  Search,
  CheckCircle2,
  CreditCard,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';

export default function CustomersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canDelete, canExport, isAdmin } = usePermissions();

  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    gstin: '',
    customer_type: 'BOTH',
    billing_address: '',
    credit_limit: 500000,
    credit_days: 30,
  });

  const fetchCustomers = async (overrides = {}) => {
    setLoading(true);
    const p = overrides.page !== undefined ? overrides.page : page;
    const ps = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;
    const sb = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const so = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const sq = overrides.search !== undefined ? overrides.search : search;
    const tf = overrides.type !== undefined ? overrides.type : typeFilter;

    try {
      let url = `/customers?page=${p}&limit=${ps}&sort_by=${sb}&sort_order=${so}`;
      if (sq) url += `&search=${encodeURIComponent(sq)}`;
      if (tf && tf !== 'ALL') url += `&type=${tf}`;
      const res = await api.get(url);
      if (res.data.success) {
        setCustomers(res.data.data || []);
        setTotalCount(res.data.pagination?.total ?? (res.data.data || []).length);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
      setCustomers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, pageSize, sortBy, sortOrder, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCustomers({ search, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', formData);
      if (res.data.success) {
        setShowAddModal(false);
        setFormData({
          name: '',
          phone: '',
          city: '',
          gstin: '',
          customer_type: 'BOTH',
          billing_address: '',
          credit_limit: 500000,
          credit_days: 30,
        });
        fetchCustomers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'customer_code',
        header: 'Code',
        sortable: true,
        width: 130,
        minWidth: 100,
        exportValue: (row) => row.customer_code,
        render: (val, row) => (
          <span className="font-mono font-bold text-blue-500 hover:underline">
            {row.customer_code}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Party / Company Name',
        sortable: true,
        width: 220,
        minWidth: 160,
        exportValue: (row) => row.name,
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.name}
            </div>
            {row.billing_address && (
              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                {row.billing_address}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'customer_type',
        header: 'Type',
        sortable: true,
        width: 120,
        minWidth: 90,
        exportValue: (row) => row.customer_type,
        render: (val, row) => (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            row.customer_type === 'CONSIGNOR'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
              : row.customer_type === 'CONSIGNEE'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
          }`}>
            {row.customer_type}
          </span>
        ),
      },
      {
        key: 'city',
        header: 'Station / City',
        sortable: true,
        width: 140,
        minWidth: 110,
        exportValue: (row) => row.city,
        render: (val, row) => (
          <span className="text-xs font-medium text-slate-300">
            {row.city || '—'}
          </span>
        ),
      },
      {
        key: 'phone',
        header: 'Contact Phone',
        sortable: true,
        width: 140,
        minWidth: 110,
        exportValue: (row) => row.phone,
        render: (val, row) => (
          <span className="text-xs font-mono text-slate-400">
            {row.phone || '—'}
          </span>
        ),
      },
      {
        key: 'gstin',
        header: 'GSTIN',
        sortable: false,
        width: 160,
        minWidth: 130,
        exportValue: (row) => row.gstin || 'UNREGISTERED',
        render: (val, row) => (
          <span className="text-xs font-mono text-slate-400">
            {row.gstin || 'UNREGISTERED'}
          </span>
        ),
      },
      {
        key: 'credit_limit',
        header: 'Credit Limit',
        sortable: true,
        align: 'right',
        width: 140,
        minWidth: 110,
        exportValue: (row) => parseFloat(row.credit_limit || 0),
        render: (val, row) => (
          <span className="text-xs font-mono font-bold text-slate-300">
            ₹{parseFloat(row.credit_limit || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        key: 'current_balance',
        header: 'Outstanding Balance',
        sortable: true,
        align: 'right',
        width: 160,
        minWidth: 120,
        exportValue: (row) => parseFloat(row.current_balance || 0),
        render: (val, row) => {
          const bal = parseFloat(row.current_balance || 0);
          return (
            <span className={`text-xs font-mono font-bold ${bal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ₹{bal.toLocaleString('en-IN')}
            </span>
          );
        },
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
                  Customer Master Directory
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Commercial clients, consignors, consignees, GSTIN records, and credit terms
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Commercial Client</span>
            </button>
          </div>

          {/* Master Customer Server-side DataTable */}
          <DataTable
            columns={columns}
            data={customers}
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
            searchPlaceholder="Search customer name, code, phone, city..."
            exportFilename="Customer_Directory"
            emptyTitle="No Customers Found"
            emptySubtitle="No commercial clients match your search or filter parameters."
            filtersSlot={
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setTypeFilter('ALL'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Clients ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('CONSIGNOR'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'CONSIGNOR'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Consignors (Shippers)
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('CONSIGNEE'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'CONSIGNEE'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Consignees (Receivers)
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('BOTH'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'BOTH'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Dual Role (Both)
                </button>
              </div>
            }
          />

          {/* Add Customer Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <form onSubmit={handleCreateCustomer} className={`rounded-2xl max-w-lg w-full p-6 shadow-2xl border ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <h3 className="text-base font-bold mb-4">Add Commercial Client</h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Company / Trade Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Havells India Ltd"
                      className={`w-full rounded-xl px-3 py-2 text-sm font-semibold border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Phone *</label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 9811122233"
                        className={`w-full rounded-xl px-3 py-2 text-sm border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Station / City *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Delhi"
                        className={`w-full rounded-xl px-3 py-2 text-sm border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">GSTIN</label>
                      <input
                        type="text"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                        placeholder="07AAACA1234A1Z5"
                        className={`w-full rounded-xl px-3 py-2 text-sm border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Type</label>
                      <select
                        value={formData.customer_type}
                        onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                        className={`w-full rounded-xl px-3 py-2 text-sm border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="BOTH">Both (Consignor & Consignee)</option>
                        <option value="CONSIGNOR">Consignor (Shipper)</option>
                        <option value="CONSIGNEE">Consignee (Receiver)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Billing Address</label>
                    <textarea
                      rows={2}
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      placeholder="Plot 10, Industrial Area..."
                      className={`w-full rounded-xl px-3 py-1.5 text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/30"
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
