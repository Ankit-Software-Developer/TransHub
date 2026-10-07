// frontend/app/(owner)/expenses/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  Wallet,
  Plus,
  DollarSign,
  Fuel,
  Receipt,
  Truck,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function ExpensesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canExport, isAdmin, canCreateExpense } = usePermissions();

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('expense_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [formData, setFormData] = useState({
    category_id: '',
    vehicle_id: '',
    amount: '',
    payment_method: 'CASH',
    remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let expUrl = '/expenses';
      const params = [];
      if (fromDate) params.push(`from_date=${fromDate}`);
      if (toDate) params.push(`to_date=${toDate}`);
      if (params.length > 0) expUrl += `?${params.join('&')}`;

      const [expRes, catRes, vehRes] = await Promise.all([
        api.get(expUrl),
        api.get('/expenses/categories'),
        api.get('/fleet/vehicles'),
      ]);

      if (expRes.data?.success) setExpenses(expRes.data.data || []);
      if (catRes.data?.success) {
        setCategories(catRes.data.data || []);
        if (catRes.data.data && catRes.data.data.length > 0) {
          setFormData((prev) => ({ ...prev, category_id: catRes.data.data[0].id }));
        }
      }
      if (vehRes.data?.success) setVehicles(vehRes.data.data || []);
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!canCreateExpense) return;
    try {
      const res = await api.post('/expenses', formData);
      if (res.data?.success) {
        setShowAddModal(false);
        setFormData((prev) => ({ ...prev, amount: '', remarks: '' }));
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Expense creation failed');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const cat = e.category?.name || '';
      const trip = e.trip?.trip_number || '';
      const veh = e.vehicle?.vehicle_number || '';
      const rem = e.remarks || '';
      const mode = e.payment_method || '';
      return (
        cat.toLowerCase().includes(search.toLowerCase()) ||
        trip.toLowerCase().includes(search.toLowerCase()) ||
        veh.toLowerCase().includes(search.toLowerCase()) ||
        rem.toLowerCase().includes(search.toLowerCase()) ||
        mode.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [expenses, search]);

  const sortedExpenses = useMemo(() => {
    const list = [...filteredExpenses];
    if (!sortBy) return list;
    return list.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (sortBy === 'amount') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [filteredExpenses, sortBy, sortOrder]);

  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedExpenses.slice(start, start + pageSize);
  }, [sortedExpenses, page, pageSize]);

  const columns = useMemo(
    () => [
      {
        key: 'expense_date',
        header: 'Date',
        sortable: true,
        width: 120,
        minWidth: 95,
        exportValue: (row) => row.expense_date,
        render: (val, row) => (
          <span className="text-slate-400 text-xs">
            {row.expense_date || 'Today'}
          </span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        sortable: false,
        width: 160,
        minWidth: 120,
        exportValue: (row) => row.category?.name || 'General',
        render: (val, row) => (
          <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {row.category?.name || 'General'}
          </span>
        ),
      },
      {
        key: 'trip',
        header: 'Trip #',
        sortable: false,
        width: 150,
        minWidth: 110,
        exportValue: (row) => row.trip?.trip_number || 'Direct',
        render: (val, row) => (
          <span className="font-mono text-xs font-semibold text-blue-500">
            {row.trip?.trip_number || 'Direct'}
          </span>
        ),
      },
      {
        key: 'vehicle',
        header: 'Vehicle',
        sortable: false,
        width: 140,
        minWidth: 110,
        exportValue: (row) => row.vehicle?.vehicle_number || 'N/A',
        render: (val, row) => (
          <span className="font-mono text-xs font-bold text-cyan-400">
            {row.vehicle?.vehicle_number || 'N/A'}
          </span>
        ),
      },
      {
        key: 'payment_method',
        header: 'Payment Mode',
        sortable: true,
        width: 130,
        minWidth: 100,
        exportValue: (row) => row.payment_method,
        render: (val, row) => (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            row.payment_method === 'CASH'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {row.payment_method}
          </span>
        ),
      },
      {
        key: 'remarks',
        header: 'Remarks',
        sortable: false,
        width: 220,
        minWidth: 150,
        exportValue: (row) => row.remarks || '',
        render: (val, row) => (
          <span className="text-xs text-slate-400 truncate block max-w-[200px]">
            {row.remarks || '—'}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: 130,
        minWidth: 100,
        exportValue: (row) => parseFloat(row.amount || 0),
        render: (val, row) => (
          <span className="font-mono font-black text-xs text-emerald-400">
            ₹{parseFloat(row.amount || 0).toLocaleString('en-IN')}
          </span>
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
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Operating Expenses & Fuel Logs
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Direct trip expenses, highway tolls, diesel fillings, and branch petty cash
              </p>
            </div>

            {canCreateExpense && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Expense</span>
              </button>
            )}
          </div>

          {/* Master Expenses Server-side DataTable */}
          <DataTable
            columns={columns}
            data={paginatedExpenses}
            totalCount={sortedExpenses.length}
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
            searchPlaceholder="Search by category, trip #, vehicle, remarks..."
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={({ fromDate: newFrom, toDate: newTo }) => {
              setFromDate(newFrom);
              setToDate(newTo);
              setPage(1);
            }}
            exportFilename="Operating_Expenses_Ledger"
            emptyTitle="No Expenses Logged"
            emptySubtitle="No operating or trip expenses match your search criteria."
          />

          {/* Add Expense Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <form onSubmit={handleAddExpense} className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <h3 className="text-base font-bold mb-4">
                  Log Operating Expense
                </h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Expense Category *</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className={`w-full rounded-xl px-3 py-2 text-sm font-semibold border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className={`w-full rounded-xl px-3 py-2 text-sm font-bold border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-200 text-blue-700'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle (Optional)</label>
                    <select
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                      className={`w-full rounded-xl px-3 py-2 text-sm border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="" className="bg-slate-900 text-white">No Vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-white">{v.vehicle_number}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className={`w-full rounded-xl px-3 py-2 text-sm border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="CASH" className="bg-slate-900 text-white">Cash</option>
                      <option value="FASTAG" className="bg-slate-900 text-white">FASTag</option>
                      <option value="FUEL_CARD" className="bg-slate-900 text-white">Fuel Card</option>
                      <option value="UPI" className="bg-slate-900 text-white">UPI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Remarks</label>
                    <input
                      type="text"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="e.g. Highway diesel 120L"
                      className={`w-full rounded-xl px-3 py-2 text-sm border ${
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
                    Save Expense
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
