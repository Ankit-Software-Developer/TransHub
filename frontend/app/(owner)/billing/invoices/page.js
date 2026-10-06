// frontend/app/(owner)/billing/invoices/page.js
'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '../../../../components/layout/Sidebar';
import Navbar from '../../../../components/layout/Navbar';
import DataTable from '../../../../components/ui/DataTable';
import { useTheme } from '../../../../components/ThemeProvider';
import { usePermissions } from '../../../../hooks/usePermissions';
import {
  Receipt,
  Plus,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  Building2,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Printer,
  CreditCard,
  FileCheck2,
  PieChart,
  Eye,
  SlidersHorizontal,
  X
} from 'lucide-react';

const INVOICES_DATA = [
  {
    id: 'inv-01',
    invoice_number: 'INV-2025-0148',
    customer: 'Reliance Retail Ltd',
    gstin: '07AAACR4821P1Z8',
    invoice_date: '12 Jan 2025',
    due_date: '27 Jan 2025',
    taxable_amount: 118571,
    gst_amount: 5929,
    total_amount: 124500,
    paid_amount: 124500,
    balance_amount: 0,
    status: 'PAID',
    status_label: 'Paid (NEFT)',
    status_tone: 'emerald',
    lr_count: 3
  },
  {
    id: 'inv-02',
    invoice_number: 'INV-2025-0147',
    customer: 'Tata Motors Parts Division',
    gstin: '27AAACT2727Q1ZW',
    invoice_date: '10 Jan 2025',
    due_date: '25 Jan 2025',
    taxable_amount: 274285,
    gst_amount: 13715,
    total_amount: 288000,
    paid_amount: 150000,
    balance_amount: 138000,
    status: 'PARTIALLY_PAID',
    status_label: 'Partially Paid',
    status_tone: 'amber',
    lr_count: 5
  },
  {
    id: 'inv-03',
    invoice_number: 'INV-2025-0146',
    customer: 'Asian Paints Distribution',
    gstin: '24AAACA3892F1Z4',
    invoice_date: '04 Jan 2025',
    due_date: '11 Jan 2025',
    taxable_amount: 87619,
    gst_amount: 4381,
    total_amount: 92000,
    paid_amount: 0,
    balance_amount: 92000,
    status: 'OVERDUE',
    status_label: 'Overdue (3 Days)',
    status_tone: 'rose',
    lr_count: 2
  },
  {
    id: 'inv-04',
    invoice_number: 'INV-2025-0145',
    customer: 'ITC FMCG Supply Chain',
    gstin: '19AAACI1681G1Z1',
    invoice_date: '14 Jan 2025',
    due_date: '29 Jan 2025',
    taxable_amount: 342857,
    gst_amount: 17143,
    total_amount: 360000,
    paid_amount: 0,
    balance_amount: 360000,
    status: 'SENT',
    status_label: 'Sent (Awaiting)',
    status_tone: 'cyan',
    lr_count: 8
  },
  {
    id: 'inv-05',
    invoice_number: 'INV-2025-0144',
    customer: 'Dr. Reddy Laboratories',
    gstin: '36AAACD0123M1Z9',
    invoice_date: '08 Jan 2025',
    due_date: '23 Jan 2025',
    taxable_amount: 152381,
    gst_amount: 7619,
    total_amount: 160000,
    paid_amount: 160000,
    balance_amount: 0,
    status: 'PAID',
    status_label: 'Paid (RTGS)',
    status_tone: 'emerald',
    lr_count: 4
  }
];

export default function InvoicesMasterPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport } = usePermissions();

  const [invoices, setInvoices] = useState(INVOICES_DATA);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const match =
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.toLowerCase().includes(search.toLowerCase()) ||
        inv.gstin.toLowerCase().includes(search.toLowerCase());

      if (statusFilter === 'ALL') return match;
      if (statusFilter === 'PAID') return match && inv.status === 'PAID';
      if (statusFilter === 'OVERDUE') return match && inv.status === 'OVERDUE';
      if (statusFilter === 'PENDING') return match && (inv.status === 'PARTIALLY_PAID' || inv.status === 'SENT');
      return match;
    });
  }, [invoices, search, statusFilter]);

  const columns = useMemo(() => [
    {
      key: 'invoice_number',
      label: 'Invoice # & Date',
      width: 170,
      minWidth: 140,
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-mono font-bold text-xs text-cyan-500 dark:text-cyan-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span>{val}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.invoice_date}</div>
        </div>
      )
    },
    {
      key: 'customer',
      label: 'Customer & GSTIN',
      width: 220,
      minWidth: 170,
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.gstin} • {row.lr_count} LRs</div>
        </div>
      )
    },
    {
      key: 'due_date',
      label: 'Due Date',
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (val) => (
        <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
          {val}
        </span>
      )
    },
    {
      key: 'taxable_amount',
      label: 'Taxable',
      width: 120,
      minWidth: 100,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'gst_amount',
      label: 'GST (5%)',
      width: 110,
      minWidth: 90,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'total_amount',
      label: 'Total Invoiced',
      width: 130,
      minWidth: 110,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'paid_amount',
      label: 'Received',
      width: 120,
      minWidth: 100,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'balance_amount',
      label: 'Balance Due',
      width: 120,
      minWidth: 100,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={`font-mono font-bold text-xs ${val > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'}`}>
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 130,
      minWidth: 110,
      sortable: true,
      align: 'center',
      render: (val, row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
          val === 'PAID'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
            : val === 'OVERDUE'
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
        }`}>
          {row.status_label || val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 120,
      minWidth: 100,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => alert(`Printing official GST Tax Invoice for ${row.invoice_number}...`)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500"
            title="Print Tax Invoice"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          {row.balance_amount > 0 && canEdit && (
            <button
              onClick={() => setPaymentModalInvoice(row)}
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-xs"
            >
              Collect
            </button>
          )}
        </div>
      )
    }
  ], [canEdit]);

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
                <Receipt className="w-6 h-6 text-cyan-400" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  GST Freight Billing & Invoices
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Compliant GST invoicing, customer ageing ledgers, and remittances reconciliation.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => alert('Exporting GSTR-1 Sales Report (.json / .xlsx)...')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Export GSTR-1</span>
              </button>

              <button
                onClick={() => alert('Opening Create Freight Invoice Wizard...')}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Invoice</span>
              </button>
            </div>
          </div>

          {/* Top 5 Financial KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Invoiced</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">₹ 2.84 Cr</div>
              <div className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-1">↑ 12% vs last month</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Received</div>
              <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400 font-mono">₹ 2.18 Cr</div>
              <div className="text-[10px] text-emerald-500/80 mt-1">↑ 15% collection</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Outstanding Balance</div>
              <div className="text-2xl font-black text-cyan-500 dark:text-cyan-400 font-mono">₹ 66.11 L</div>
              <div className="text-[10px] text-slate-400 mt-1">Within credit term</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Overdue Receivables</div>
              <div className="text-2xl font-black text-rose-500 dark:text-rose-400 font-mono">₹ 23.48 L</div>
              <div className="text-[10px] text-rose-500/80 mt-1">Action required</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Collection Efficiency</div>
              <div className="text-2xl font-black text-purple-500 dark:text-purple-400 font-mono">76.8%</div>
              <div className="text-[10px] text-purple-500/80 mt-1">Target 80% DSO</div>
            </div>
          </div>

          {/* Quick Actions Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1">Customer Ledger Statement</span>
                <p className="text-[11px] text-slate-400">Generate signed ledger statements and send WhatsApp payment reminders.</p>
              </div>
              <button
                onClick={() => alert('Sending bulk statement reminder via WhatsApp/Email...')}
                className="w-full mt-3 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 text-cyan-600 dark:text-cyan-300 text-xs font-bold text-center transition-colors"
              >
                Send Reminders ➔
              </button>
            </div>
            <div className={`p-4 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1">TDS Certificate (26AS) Reconciliation</span>
                <p className="text-[11px] text-slate-400">Match Section 194C TDS credits deducted by corporate enterprise consignors.</p>
              </div>
              <button
                onClick={() => alert('Opening TDS reconciliation workbench...')}
                className="w-full mt-3 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-blue-600 dark:text-blue-300 text-xs font-bold text-center transition-colors"
              >
                Reconcile TDS ➔
              </button>
            </div>
          </div>

          {/* Invoices Master DataTable */}
          <DataTable
            columns={columns}
            data={filteredInvoices}
            loading={false}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            searchable={true}
            searchPlaceholder="Search by Invoice #, Customer, GSTIN..."
            onSearchChange={setSearch}
            filtersSlot={
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Invoices ({invoices.length})
                </button>
                <button
                  onClick={() => setStatusFilter('PAID')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'PAID'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Paid
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('OVERDUE')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'OVERDUE'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Overdue
                </button>
              </div>
            }
            exportable={true}
            exportFileName="GST_Invoices_Register"
            emptyMessage="No invoices found matching criteria."
          />

        </main>
      </div>

      {/* Record Payment Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPaymentModalInvoice(null)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold">Record Customer Remittance</h3>
              <button onClick={() => setPaymentModalInvoice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Invoice & Customer:</span>
                <span className="font-bold text-slate-900 dark:text-white">{paymentModalInvoice.invoice_number} • {paymentModalInvoice.customer}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Outstanding Balance:</span>
                <span className="font-mono font-bold text-rose-500 dark:text-rose-400 text-sm">₹ {paymentModalInvoice.balance_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Amount Received (₹) *</label>
                <input
                  type="number"
                  defaultValue={paymentModalInvoice.balance_amount}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Bank Reference / UTR Number *</label>
                <input
                  type="text"
                  placeholder="e.g. UTR879654210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`Payment of ₹${paymentModalInvoice.balance_amount.toLocaleString('en-IN')} recorded! Invoice reconciled.`);
                  setPaymentModalInvoice(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Confirm Payment ➔
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
