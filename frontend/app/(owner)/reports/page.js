// frontend/app/(owner)/reports/page.js
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTerminology } from '../../../hooks/useTerminology';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTheme } from '../../../components/ThemeProvider';
import { useStore } from '../../../store/useStore';
import api from '../../../services/api';
import reportService from '../../../services/reportService';
import branchClosureService from '../../../services/branchClosureService';
import DateRangeFilter from '../../../components/ui/DateRangeFilter';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  DollarSign,
  Truck,
  TrendingUp,
  FileText,
  Search,
  RefreshCw,
  Printer,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Check,
  Receipt,
  Wallet,
  ArrowUpDown,
  Landmark,
  Eye,
  UploadCloud,
  X
} from 'lucide-react';

const REGISTERS = [
  { id: 'DOCKETS', label: 'Docket & Freight Register', icon: FileText, color: 'blue' },
  { id: 'POD', label: 'POD & Delivery Compliance', icon: FileSpreadsheet, color: 'emerald' },
  { id: 'COLLECTIONS', label: 'Branch Cash & Daybook', icon: Wallet, color: 'amber' },
  { id: 'AGEING', label: 'Customer Outstanding & Ageing', icon: TrendingUp, color: 'rose' },
  { id: 'TRIPS', label: 'Trip & Vehicle P&L Audit', icon: Truck, color: 'purple' },
  { id: 'GST', label: 'GST Register (SAC 9965)', icon: Receipt, color: 'indigo' },
];

export default function ReportsPage() {
  const { term, plural } = useTerminology();
  const { canExport, isAdmin, user } = usePermissions();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activeBranch = useStore((state) => state.activeBranch);

  const userBranchId = user?.branch_id || user?.branchId || activeBranch?.id;
  const [activeTab, setActiveTab] = useState('DOCKETS');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(
    !isAdmin && userBranchId ? userBranchId : 'ALL'
  );

  useEffect(() => {
    if (!isAdmin && userBranchId && selectedBranch !== userBranchId) {
      setSelectedBranch(userBranchId);
    }
  }, [isAdmin, userBranchId]);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('ALL');
  const [paymentClearanceFilter, setPaymentClearanceFilter] = useState('ALL');
  const [podStatusFilter, setPodStatusFilter] = useState('ALL');
  const [copied, setCopied] = useState(false);

  // Bank Remittance Modal & Receipt Slip Viewer State
  const [isRemitModalOpen, setIsRemitModalOpen] = useState(false);
  const [remitFormData, setRemitFormData] = useState({
    branchId: '',
    branchName: '',
    closureDate: '',
    remittedAmount: '',
    bankName: 'State Bank of India',
    bankAccountNo: '',
    depositMode: 'CASH_DEPOSIT',
    utrReferenceNo: '',
    receiptSlip: '',
    receiptPreview: '',
    remarks: '',
  });
  const [isSubmittingRemit, setIsSubmittingRemit] = useState(false);
  const [selectedReceiptModal, setSelectedReceiptModal] = useState(null);

  const openRemitModal = (row = null) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const bId = row?.branchId || (!isAdmin && userBranchId ? userBranchId : (selectedBranch !== 'ALL' ? selectedBranch : (branches[0]?.id || '')));
    const bObj = branches.find((b) => b.id === bId);
    const bName = row?.branchName || bObj?.name || bObj?.branch_name || 'My Branch';
    const defaultAmount = row?.totalCollected || summary?.totalUnclosedCash || '';

    setRemitFormData({
      branchId: bId,
      branchName: bName,
      closureDate: row?.date || todayStr,
      remittedAmount: defaultAmount,
      bankName: 'State Bank of India',
      bankAccountNo: '',
      depositMode: 'CASH_DEPOSIT',
      utrReferenceNo: '',
      receiptSlip: '',
      receiptPreview: '',
      remarks: '',
    });
    setIsRemitModalOpen(true);
  };

  const handleRemitFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRemitFormData((prev) => ({
        ...prev,
        receiptSlip: reader.result,
        receiptPreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemitSubmit = async (e) => {
    e.preventDefault();
    if (!remitFormData.remittedAmount || Number(remitFormData.remittedAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }
    if (!remitFormData.utrReferenceNo?.trim()) {
      alert('Please enter Bank UTR / Transaction Reference number');
      return;
    }
    setIsSubmittingRemit(true);
    try {
      const payload = {
        branch_id: remitFormData.branchId,
        remitted_amount: Number(remitFormData.remittedAmount),
        closure_date: remitFormData.closureDate,
        bank_name: remitFormData.bankName,
        bank_account_no: remitFormData.bankAccountNo,
        deposit_mode: remitFormData.depositMode,
        utr_reference_no: remitFormData.utrReferenceNo,
        receipt_slip: remitFormData.receiptSlip,
        remarks: remitFormData.remarks,
      };
      await branchClosureService.remitToBank(payload);
      setIsRemitModalOpen(false);
      await loadReportData();
      alert('Bank remittance recorded successfully! Daybook closed.');
    } catch (err) {
      console.error('Failed to submit remittance', err);
      alert(err.response?.data?.message || 'Failed to submit bank remittance.');
    } finally {
      setIsSubmittingRemit(false);
    }
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const startItem = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(totalRecords, page * limit);

  // Generate Page Numbers Array with Ellipsis
  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  }, [page, totalPages]);

  // Data state
  const [dataRows, setDataRows] = useState([]);
  const [summary, setSummary] = useState(null);

  // Load branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches?limit=100');
        if (res.data?.data) {
          setBranches(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    fetchBranches();
  }, []);

  // Fetch report data
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        branch_id: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: searchQuery.trim() || undefined,
      };

      let res;
      if (activeTab === 'DOCKETS') {
        if (paymentTypeFilter !== 'ALL') params.payment_type = paymentTypeFilter;
        if (paymentClearanceFilter !== 'ALL') params.payment_clearance = paymentClearanceFilter;
        res = await reportService.getDocketFreightReport(params);
      } else if (activeTab === 'AGEING') {
        res = await reportService.getCustomerAgeingReport(params);
      } else if (activeTab === 'TRIPS') {
        res = await reportService.getTripProfitabilityReport(params);
      } else if (activeTab === 'POD') {
        if (podStatusFilter !== 'ALL') params.pod_status = podStatusFilter;
        res = await reportService.getPodComplianceReport(params);
      } else if (activeTab === 'COLLECTIONS') {
        res = await reportService.getDailyCollectionReport(params);
      } else if (activeTab === 'GST') {
        res = await reportService.getGstTaxReport(params);
      }

      if (res?.success) {
        setDataRows(res.data || []);
        const meta = res.pagination || res.meta || {};
        setTotalPages(meta.pages || 1);
        setTotalRecords(meta.total !== undefined ? meta.total : (res.data || []).length);
        setSummary(meta.summary || null);
      }
    } catch (err) {
      console.error('Failed to load report data', err);
      setDataRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit, selectedBranch, dateFrom, dateTo, searchQuery, paymentTypeFilter, paymentClearanceFilter, podStatusFilter]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Tab switch reset
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    setSearchQuery('');
  };

  // Indian Rupee Formatter
  const formatINR = (val) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  // CSV Export Engine
  const handleExportCsv = () => {
    if (!dataRows || dataRows.length === 0) {
      alert('No data records available to export.');
      return;
    }

    let headers = [];
    let rowsFormatted = [];
    const timestamp = new Date().toISOString().split('T')[0];

    if (activeTab === 'DOCKETS') {
      headers = [
        'LR Number',
        'Docket Number',
        'Booking Date',
        'Origin Branch',
        'Destination',
        'Consignor',
        'Consignee',
        'Packages',
        'Actual Wt (kg)',
        'Charged Wt (kg)',
        'Base Freight (INR)',
        'Other Charges (INR)',
        'Tax (INR)',
        'Total Amount (INR)',
        'Payment Mode',
        'Payment Status',
        'Delivery Status',
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${r.lr_number || ''}"`,
        `"${r.docket_number || r.lr_number || ''}"`,
        `"${r.booking_date || ''}"`,
        `"${r.originBranch?.name || r.origin_city || ''}"`,
        `"${r.destBranch?.name || r.destination_city || ''}"`,
        `"${(r.consignor?.name || '').replace(/"/g, '""')}"`,
        `"${(r.consignee?.name || '').replace(/"/g, '""')}"`,
        r.packages_count || 1,
        r.actual_weight || 0,
        r.charged_weight || 0,
        r.freight_amount || 0,
        Number(r.loading_charges || 0) + Number(r.door_delivery_charges || 0) + Number(r.handling_charges || 0),
        r.tax_amount || 0,
        r.total_amount || 0,
        `"${r.payment_type || ''}"`,
        `"${r.payment_cleared || r.clearance_status === 'CLEARED' || r.payment_type === 'PAID' ? 'Cleared' : 'Pending'}"`,
        `"${r.status || ''}"`,
      ]);
    } else if (activeTab === 'AGEING') {
      headers = [
        'Customer Name',
        'Customer Code',
        'Phone',
        'GSTIN',
        'Branch',
        'Total Invoiced (INR)',
        'Total Paid (INR)',
        'Outstanding (INR)',
        '0-30 Days (INR)',
        '31-60 Days (INR)',
        '61-90 Days (INR)',
        '90+ Days Overdue (INR)',
        'Status',
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${(r.customerName || '').replace(/"/g, '""')}"`,
        `"${r.customerCode || ''}"`,
        `"${r.phone || ''}"`,
        `"${r.gstin || ''}"`,
        `"${r.branch || ''}"`,
        r.totalInvoiced || 0,
        r.totalPaid || 0,
        r.totalOutstanding || 0,
        r.bucket0_30 || 0,
        r.bucket31_60 || 0,
        r.bucket61_90 || 0,
        r.bucket90Plus || 0,
        r.isOverdue ? '"OVERDUE"' : '"CURRENT"',
      ]);
    } else if (activeTab === 'TRIPS') {
      headers = [
        'Trip Number',
        'Start Date',
        'Route',
        'Vehicle Reg #',
        'Driver',
        'Dockets',
        'Weight (Tonnes)',
        'Loaded Revenue (INR)',
        'Fuel & Misc Exp (INR)',
        'Driver Advance (INR)',
        'Total Cost (INR)',
        'Net Profit (INR)',
        'Margin %',
        'Settlement',
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${r.tripNumber || ''}"`,
        `"${r.startDate || ''}"`,
        `"${r.route || ''}"`,
        `"${r.vehicleNumber || ''}"`,
        `"${r.driverName || ''}"`,
        r.docketCount || 0,
        r.totalWeightTonnes || 0,
        r.totalRevenue || 0,
        r.fuelAndExpenses || 0,
        r.driverAdvances || 0,
        r.totalCost || 0,
        r.netProfit || 0,
        r.marginPct || 0,
        r.isSettled ? '"SETTLED"' : '"UNSETTLED"',
      ]);
    } else if (activeTab === 'POD') {
      headers = [
        'Docket Number',
        'LR Number',
        'Booking Date',
        'Delivery Date',
        'Transit Days',
        'Origin Branch',
        'Destination',
        'Consignee',
        'Status',
        'POD Status',
        'Physical Copy',
        'Receiver Name',
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${r.docketNumber || ''}"`,
        `"${r.lrNumber || ''}"`,
        `"${r.bookingDate || ''}"`,
        `"${r.deliveryDate || ''}"`,
        `"${r.transitDays || ''}"`,
        `"${r.originBranch || ''}"`,
        `"${r.destBranch || ''}"`,
        `"${(r.consigneeName || '').replace(/"/g, '""')}"`,
        `"${r.shipmentStatus || ''}"`,
        `"${r.podStatus || ''}"`,
        r.hasPhysicalPod ? '"YES"' : '"NO"',
        `"${(r.receiverName || '').replace(/"/g, '""')}"`,
      ]);
    } else if (activeTab === 'COLLECTIONS') {
      headers = [
        'Date',
        'Branch / Hub',
        'Paid Bookings Count',
        'Paid Cash Amount (INR)',
        'To-Pay Deliveries Count',
        'To-Pay Cash Amount (INR)',
        'Total Cash Collected (INR)',
        'Daybook Status',
        'Bank Name',
        'UTR / Reference',
        'Remitted to Bank (INR)',
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${r.date || ''}"`,
        `"${r.branchName || ''}"`,
        r.paidBookingsCount || 0,
        r.paidCashAmount || 0,
        r.toPayDeliveriesCount || 0,
        r.toPayCashAmount || 0,
        r.totalCollected || 0,
        `"${r.isClosed ? 'Remitted to Bank' : 'Unclosed Cash'}"`,
        `"${r.bankName || ''}"`,
        `"${r.utrNumber || ''}"`,
        r.remittedAmount || 0,
      ]);
    } else if (activeTab === 'GST') {
      headers = [
        'LR Number',
        'Booking Date',
        'Branch',
        'SAC Code',
        'Consignor Name',
        'Consignor GSTIN',
        'Consignee Name',
        'Consignee GSTIN',
        'Taxable Freight (INR)',
        'Tax Rate %',
        'Tax Type',
        'CGST (INR)',
        'SGST (INR)',
        'IGST (INR)',
        'Total GST (INR)',
        'Invoice Value (INR)',
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${r.lrNumber || ''}"`,
        `"${r.bookingDate || ''}"`,
        `"${r.branch || ''}"`,
        `"${r.sacCode || '9965'}"`,
        `"${(r.consignorName || '').replace(/"/g, '""')}"`,
        `"${r.consignorGst || ''}"`,
        `"${(r.consigneeName || '').replace(/"/g, '""')}"`,
        `"${r.consigneeGst || ''}"`,
        r.taxableValue || 0,
        r.taxRatePct || 5,
        `"${r.taxType || ''}"`,
        r.cgst || 0,
        r.sgst || 0,
        r.igst || 0,
        r.totalGst || 0,
        r.totalInvoiceValue || 0,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rowsFormatted.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TransHub_${activeTab}_Register_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy table TSV to clipboard
  const handleCopyClipboard = () => {
    if (!dataRows || dataRows.length === 0) return;
    const headerStr = Object.keys(dataRows[0]).join('\t');
    const rowStrs = dataRows.map((r) => Object.values(r).join('\t')).join('\n');
    navigator.clipboard.writeText(`${headerStr}\n${rowStrs}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Print Statement trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#090D18]' : 'bg-[#F6F8FB]'}`}>
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header & Main Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-200/50 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Reports &amp; Operational Analytics
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Audited commercial registers, receivables ageing, vehicle profitability, cash ledgers, and tax statements.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center space-x-2.5 print:hidden">
              <button
                onClick={handleCopyClipboard}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isDark
                    ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
                title="Copy rows to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handlePrint}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isDark
                    ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
                title="Print or export to PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print PDF</span>
              </button>

              {canExport ? (
                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              ) : (
                <span className="text-xs font-semibold text-slate-400 italic">View only</span>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="print:hidden flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80 dark:border-slate-800">
            {REGISTERS.map((reg) => {
              const Icon = reg.icon;
              const isActive = activeTab === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => handleTabChange(reg.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? isDark
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 shadow-sm'
                        : 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                      : isDark
                      ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span>{reg.label}</span>
                </button>
              );
            })}
          </div>



          {/* Summary Metric Ribbon */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {activeTab === 'DOCKETS' && (
                <>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Dockets</span>
                    <p className="text-xl font-black text-blue-500 mt-1">{summary.totalBookings || 0}</p>
                    <span className="text-[11px] text-slate-400">{summary.totalPackages || 0} Packages</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Charged Weight</span>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                      {((summary.totalChargedWeight || 0) / 1000).toFixed(2)} <span className="text-xs font-medium">Tonnes</span>
                    </p>
                    <span className="text-[11px] text-slate-400">{summary.totalActualWeight || 0} kg actual</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Base Freight</span>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                      {formatINR(summary.totalBaseFreight)}
                    </p>
                    <span className="text-[11px] text-slate-400">+{formatINR(summary.totalOtherCharges)} charges</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Revenue</span>
                    <p className="text-xl font-black text-emerald-500 mt-1">
                      {formatINR(summary.totalRevenue)}
                    </p>
                    <span className="text-[11px] text-slate-400">GST: {formatINR(summary.totalTaxAmount)}</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'} col-span-2 md:col-span-1`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Payment Breakdown</span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
                        {summary.breakdown?.cleared || 0} Cleared
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px]">
                        {summary.breakdown?.pending || 0} Pending
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {summary.breakdown?.paid || 0} Paid • {summary.breakdown?.toPay || 0} To-Pay • {summary.breakdown?.tbb || 0} TBB
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'AGEING' && (
                <>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Receivables</span>
                    <p className="text-xl font-black text-rose-500 mt-1">{formatINR(summary.totalReceivables)}</p>
                    <span className="text-[11px] text-slate-400">{summary.totalCustomers} Credit Parties</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">0 - 30 Days (Current)</span>
                    <p className="text-xl font-black text-emerald-500 mt-1">{formatINR(summary.bucket0_30)}</p>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Standard Terms</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">31 - 60 Days</span>
                    <p className="text-xl font-black text-amber-500 mt-1">{formatINR(summary.bucket31_60)}</p>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">Follow-up due</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">61 - 90 Days</span>
                    <p className="text-xl font-black text-orange-500 mt-1">{formatINR(summary.bucket61_90)}</p>
                    <span className="text-[11px] text-orange-600 dark:text-orange-400">Delayed</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'} col-span-2 md:col-span-1`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">90+ Days (Critical)</span>
                    <p className="text-xl font-black text-rose-600 mt-1">{formatINR(summary.bucket90Plus)}</p>
                    <span className="text-[11px] text-rose-500">Stop Credit Alert</span>
                  </div>
                </>
              )}

              {activeTab === 'TRIPS' && (
                <>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Trips Dispatched</span>
                    <p className="text-xl font-black text-purple-500 mt-1">{summary.totalTrips || 0}</p>
                    <span className="text-[11px] text-slate-400">Line-haul movements</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Loaded Revenue</span>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{formatINR(summary.totalRevenue)}</p>
                    <span className="text-[11px] text-slate-400">Total freight</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Operating Cost</span>
                    <p className="text-xl font-black text-rose-500 mt-1">{formatINR(summary.totalOperatingCost)}</p>
                    <span className="text-[11px] text-slate-400">Diesel, Tolls &amp; Advances</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Net Profit</span>
                    <p className="text-xl font-black text-emerald-500 mt-1">{formatINR(summary.netProfit)}</p>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Contribution margin</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'} col-span-2 md:col-span-1`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Profit Margin %</span>
                    <p className="text-xl font-black text-blue-500 mt-1">{summary.averageMarginPct || 0}%</p>
                    <span className="text-[11px] text-slate-400">Avg fleet yield</span>
                  </div>
                </>
              )}

              {activeTab === 'POD' && (
                <>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Delivered Units</span>
                    <p className="text-xl font-black text-blue-500 mt-1">{summary.totalDelivered || 0}</p>
                    <span className="text-[11px] text-slate-400">of {summary.totalConsignments || 0} Bookings</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">PODs Verified</span>
                    <p className="text-xl font-black text-emerald-500 mt-1">{summary.podVerifiedCount || 0}</p>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Audited &amp; Signed</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Uploaded (Audit Due)</span>
                    <p className="text-xl font-black text-amber-500 mt-1">{summary.podUploadedCount || 0}</p>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">Awaiting Approval</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Pending Upload</span>
                    <p className="text-xl font-black text-rose-500 mt-1">{summary.podPendingCount || 0}</p>
                    <span className="text-[11px] text-rose-600 dark:text-rose-400">POD Backlog</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'} col-span-2 md:col-span-1`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">SLA Compliance Rate</span>
                    <p className="text-xl font-black text-cyan-500 mt-1">{summary.complianceRatePct || 100}%</p>
                    <span className="text-[11px] text-slate-400">POD Turnaround</span>
                  </div>
                </>
              )}

              {activeTab === 'COLLECTIONS' && (
                <>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Gross Collected</span>
                    <p className="text-xl font-black text-amber-500 mt-1">{formatINR(summary.totalCashCollected || summary.totalCashInHand)}</p>
                    <span className="text-[11px] text-slate-400">Paid + To-Pay cash</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Paid Bookings Cash</span>
                    <p className="text-xl font-black text-emerald-500 mt-1">{formatINR(summary.totalPaidCollected)}</p>
                    <span className="text-[11px] text-slate-400">Origin counter</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">To-Pay Delivery Cash</span>
                    <p className="text-xl font-black text-blue-500 mt-1">{formatINR(summary.totalToPayCollected)}</p>
                    <span className="text-[11px] text-slate-400">Destination delivery</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Remitted to Bank</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(summary.totalRemittedToBank || 0)}</p>
                    <span className="text-[11px] text-slate-400">With Bank Slips</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${
                    (summary.totalUnclosedCash || 0) > 0
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : (isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200')
                  } col-span-2 md:col-span-1`}>
                    <span className="text-[10px] font-bold uppercase text-rose-500">Unclosed Cash In-Hand</span>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatINR(summary.totalUnclosedCash || 0)}</p>
                    <span className="text-[11px] text-rose-500 font-semibold">
                      {(summary.totalUnclosedCash || 0) > 0 ? 'Pending Bank Deposit' : 'All Dues Cleared'}
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'GST' && (
                <>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Taxable Freight</span>
                    <p className="text-xl font-black text-indigo-500 mt-1">{formatINR(summary.totalTaxableValue)}</p>
                    <span className="text-[11px] text-slate-400">SAC Code 9965</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Tax Liability</span>
                    <p className="text-xl font-black text-rose-500 mt-1">{formatINR(summary.totalTaxLiability)}</p>
                    <span className="text-[11px] text-slate-400">Output GST</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">RCM Turnover</span>
                    <p className="text-xl font-black text-blue-500 mt-1">{formatINR(summary.rcmTaxableTurnover)}</p>
                    <span className="text-[11px] text-slate-400">Reverse Charge</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'} col-span-2 md:col-span-2`}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Forward Charge Turnover</span>
                    <p className="text-xl font-black text-emerald-500 mt-1">{formatINR(summary.forwardChargeTurnover)}</p>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Direct GTA collection</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Interactive Report Data Table */}
          <div
            className={`rounded-2xl border overflow-hidden transition-all ${
              isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200/80 shadow-card'
            }`}
          >
            {/* Table Header Action Bar with Search, Filters, Dates, and Export */}
            <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
            }`}>
              {/* Left: Instant Search Box */}
              <div className="relative w-64 sm:w-72 md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={
                    activeTab === 'DOCKETS'
                      ? 'Search LR #, Party, Route...'
                      : activeTab === 'AGEING'
                      ? 'Search Customer, GSTIN...'
                      : activeTab === 'TRIPS'
                      ? 'Search Trip #, Vehicle...'
                      : activeTab === 'POD'
                      ? 'Search Docket #, Consignee...'
                      : 'Search records...'
                  }
                  className={`w-full text-xs font-semibold rounded-xl border pl-9 pr-8 py-2 outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900/90 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-cyan-400'
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 shadow-2xs'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Right: Contextual Filters + Branch (Admin) + Date Filter + Export */}
              <div className="flex flex-wrap items-center gap-2.5">

                {/* Contextual Filter: Payment Type & Clearance for Dockets */}
                {activeTab === 'DOCKETS' && (
                  <>
                    <select
                      value={paymentTypeFilter}
                      onChange={(e) => {
                        setPaymentTypeFilter(e.target.value);
                        setPage(1);
                      }}
                      className={`text-xs font-bold rounded-xl border px-3 py-2 outline-none transition-all cursor-pointer ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 text-slate-200 focus:border-cyan-400'
                          : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500 shadow-xs'
                      }`}
                    >
                      <option value="ALL">All Payment Modes</option>
                      <option value="PAID">PAID</option>
                      <option value="TO_PAY">TO-PAY</option>
                      <option value="TBB">TBB</option>
                    </select>

                    <select
                      value={paymentClearanceFilter}
                      onChange={(e) => {
                        setPaymentClearanceFilter(e.target.value);
                        setPage(1);
                      }}
                      className={`text-xs font-bold rounded-xl border px-3 py-2 outline-none transition-all cursor-pointer ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 text-slate-200 focus:border-cyan-400'
                          : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500 shadow-xs'
                      }`}
                    >
                      <option value="ALL">All Payment Status</option>
                      <option value="CLEARED">Payment Cleared</option>
                      <option value="PENDING">Payment Pending</option>
                    </select>
                  </>
                )}

                {/* Contextual Filter: POD Status for POD Tab */}
                {activeTab === 'POD' && (
                  <select
                    value={podStatusFilter}
                    onChange={(e) => {
                      setPodStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className={`text-xs font-bold rounded-xl border px-3 py-2 outline-none transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-800 text-slate-200 focus:border-cyan-400'
                        : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500 shadow-xs'
                    }`}
                  >
                    <option value="ALL">All POD Statuses</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="UPLOADED">UPLOADED</option>
                    <option value="PENDING">PENDING UPLOAD</option>
                  </select>
                )}

                {/* Branch Selector: only shown for Admin users */}
                {isAdmin && (
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setPage(1);
                    }}
                    className={`text-xs font-bold rounded-xl border px-3 py-2 outline-none transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-800 text-slate-200 focus:border-cyan-400'
                        : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500 shadow-xs'
                    }`}
                  >
                    <option value="ALL">All Network Hubs</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.branch_name} ({b.code || b.branch_code || 'HUB'})
                      </option>
                    ))}
                  </select>
                )}

                {/* Remit to Bank Action for Branch Cash & Daybook */}
                {activeTab === 'COLLECTIONS' && (
                  <button
                    onClick={() => openRemitModal()}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Deposit to Bank</span>
                  </button>
                )}

                {/* Date Range Filter */}
                <DateRangeFilter
                  fromDate={dateFrom}
                  toDate={dateTo}
                  align="right"
                  onChange={({ fromDate, toDate }) => {
                    setDateFrom(fromDate);
                    setDateTo(toDate);
                    setPage(1);
                  }}
                  onClear={() => {
                    setDateFrom('');
                    setDateTo('');
                    setPage(1);
                  }}
                />

                {/* Download CSV Action */}
                {canExport && (
                  <button
                    onClick={handleExportCsv}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDark
                        ? 'border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                    title="Download CSV"
                  >
                    <Download className="w-4 h-4 text-blue-500" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50/75 border-slate-200 text-slate-600'
                  }`}>
                    {activeTab === 'DOCKETS' && (
                      <>
                        <th className="py-3 px-4">LR #</th>
                        <th className="py-3 px-4">Booking Date</th>
                        <th className="py-3 px-4">Route</th>
                        <th className="py-3 px-4">Consignor</th>
                        <th className="py-3 px-4">Consignee</th>
                        <th className="py-3 px-4 text-center">Pkgs</th>
                        <th className="py-3 px-4 text-right">Charged Wt</th>
                        <th className="py-3 px-4 text-right">Base Freight</th>
                        <th className="py-3 px-4 text-right">Total (₹)</th>
                        <th className="py-3 px-4 text-center">Payment Mode</th>
                        <th className="py-3 px-4 text-center">Payment Status</th>
                        <th className="py-3 px-4 text-center">Delivery Status</th>
                      </>
                    )}

                    {activeTab === 'AGEING' && (
                      <>
                        <th className="py-3 px-4">Party Name</th>
                        <th className="py-3 px-4">GSTIN</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4 text-right">Total Billed</th>
                        <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                        <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">0-30 Days</th>
                        <th className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">31-60 Days</th>
                        <th className="py-3 px-4 text-right text-orange-600 dark:text-orange-400">61-90 Days</th>
                        <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">90+ Days</th>
                        <th className="py-3 px-4 text-center">Alert</th>
                      </>
                    )}

                    {activeTab === 'TRIPS' && (
                      <>
                        <th className="py-3 px-4">Trip #</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4">Route</th>
                        <th className="py-3 px-4">Vehicle</th>
                        <th className="py-3 px-4">Driver</th>
                        <th className="py-3 px-4 text-center">Dockets</th>
                        <th className="py-3 px-4 text-right">Revenue (₹)</th>
                        <th className="py-3 px-4 text-right">Expenses (₹)</th>
                        <th className="py-3 px-4 text-right">Net Profit (₹)</th>
                        <th className="py-3 px-4 text-center">Margin</th>
                        <th className="py-3 px-4 text-center">Settlement</th>
                      </>
                    )}

                    {activeTab === 'POD' && (
                      <>
                        <th className="py-3 px-4">Docket #</th>
                        <th className="py-3 px-4">Booking Date</th>
                        <th className="py-3 px-4">Delivery Date</th>
                        <th className="py-3 px-4 text-center">TAT (Days)</th>
                        <th className="py-3 px-4">Route</th>
                        <th className="py-3 px-4">Consignee</th>
                        <th className="py-3 px-4 text-center">Delivery Status</th>
                        <th className="py-3 px-4 text-center">POD Status</th>
                        <th className="py-3 px-4 text-center">Physical Copy</th>
                      </>
                    )}

                    {activeTab === 'COLLECTIONS' && (
                      <>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Branch / Hub</th>
                        <th className="py-3 px-4 text-center">Paid Dockets</th>
                        <th className="py-3 px-4 text-right">Paid Cash (₹)</th>
                        <th className="py-3 px-4 text-center">To-Pay Dockets</th>
                        <th className="py-3 px-4 text-right">To-Pay Cash (₹)</th>
                        <th className="py-3 px-4 text-right">Total Cash (₹)</th>
                        <th className="py-3 px-4 text-center">Daybook Status</th>
                        <th className="py-3 px-4 text-center">Bank Remittance</th>
                        <th className="py-3 px-4 text-center">Action / Receipt</th>
                      </>
                    )}

                    {activeTab === 'GST' && (
                      <>
                        <th className="py-3 px-4">LR #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Consignor</th>
                        <th className="py-3 px-4">Consignee</th>
                        <th className="py-3 px-4 text-right">Taxable (₹)</th>
                        <th className="py-3 px-4 text-center">Tax Type</th>
                        <th className="py-3 px-4 text-right">CGST</th>
                        <th className="py-3 px-4 text-right">SGST</th>
                        <th className="py-3 px-4 text-right">IGST</th>
                        <th className="py-3 px-4 text-right">Total Invoice (₹)</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/80 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                          <p className="text-xs font-semibold text-slate-400">Loading audited register records...</p>
                        </div>
                      </td>
                    </tr>
                  ) : dataRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <FileText className="w-8 h-8 opacity-30 mb-1" />
                          <p className="text-sm font-bold text-slate-500">No records found</p>
                          <p className="text-xs text-slate-400">Try adjusting your date range, branch filter, or search query.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dataRows.map((row, idx) => {
                      return (
                        <tr
                          key={row.id || idx}
                          className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors ${
                            idx % 2 === 1 ? (isDark ? 'bg-slate-900/30' : 'bg-slate-50/40') : ''
                          }`}
                        >
                          {/* 1. Dockets View */}
                          {activeTab === 'DOCKETS' && (
                            <>
                              <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                                {row.lr_number}
                              </td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                {row.booking_date}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold">{row.originBranch?.code || row.origin_city}</span>
                                <span className="text-slate-400 mx-1">→</span>
                                <span className="font-semibold">{row.destBranch?.code || row.destination_city}</span>
                              </td>
                              <td className="py-3 px-4 max-w-[140px] truncate" title={row.consignor?.name}>
                                {row.consignor?.name || 'Cash Booking'}
                              </td>
                              <td className="py-3 px-4 max-w-[140px] truncate" title={row.consignee?.name}>
                                {row.consignee?.name || 'Direct Delivery'}
                              </td>
                              <td className="py-3 px-4 text-center font-semibold">{row.packages_count || 1}</td>
                              <td className="py-3 px-4 text-right font-medium">{row.charged_weight || 0} kg</td>
                              <td className="py-3 px-4 text-right font-medium">{formatINR(row.freight_amount)}</td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                                {formatINR(row.total_amount)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    row.payment_type === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : row.payment_type === 'TO_PAY'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                  }`}
                                >
                                  {row.payment_type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    row.payment_cleared ||
                                    row.clearance_status === 'CLEARED' ||
                                    row.payment_type === 'PAID' ||
                                    (row.payment_type === 'TO_PAY' && ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_PENDING', 'POD_VERIFIED'].includes(row.status))
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      row.payment_cleared ||
                                      row.clearance_status === 'CLEARED' ||
                                      row.payment_type === 'PAID' ||
                                      (row.payment_type === 'TO_PAY' && ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_PENDING', 'POD_VERIFIED'].includes(row.status))
                                        ? 'bg-emerald-500'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                  {row.payment_cleared ||
                                  row.clearance_status === 'CLEARED' ||
                                  row.payment_type === 'PAID' ||
                                  (row.payment_type === 'TO_PAY' && ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_PENDING', 'POD_VERIFIED'].includes(row.status))
                                    ? 'Cleared'
                                    : 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {row.status}
                                </span>
                              </td>
                            </>
                          )}

                          {/* 2. Customer Ageing View */}
                          {activeTab === 'AGEING' && (
                            <>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                {row.customerName}
                                <span className="block text-[10px] text-slate-400 font-normal">{row.phone}</span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                                {row.gstin}
                              </td>
                              <td className="py-3 px-4">{row.branch}</td>
                              <td className="py-3 px-4 text-right font-medium">{formatINR(row.totalInvoiced)}</td>
                              <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                                {formatINR(row.totalOutstanding)}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatINR(row.bucket0_30)}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                                {formatINR(row.bucket31_60)}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-orange-600 dark:text-orange-400">
                                {formatINR(row.bucket61_90)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                                {formatINR(row.bucket90Plus)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {row.isOverdue ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Overdue</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>OK</span>
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* 3. Trip P&L View */}
                          {activeTab === 'TRIPS' && (
                            <>
                              <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                                {row.tripNumber}
                              </td>
                              <td className="py-3 px-4 text-slate-500">{row.startDate}</td>
                              <td className="py-3 px-4 font-semibold">{row.route}</td>
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{row.vehicleNumber}</td>
                              <td className="py-3 px-4">{row.driverName}</td>
                              <td className="py-3 px-4 text-center font-semibold">{row.docketCount}</td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                                {formatINR(row.totalRevenue)}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                                {formatINR(row.totalCost)}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                                {formatINR(row.netProfit)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.marginPct > 15
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                }`}>
                                  {row.marginPct}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.isSettled ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {row.isSettled ? 'SETTLED' : 'OPEN'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* 4. POD Compliance View */}
                          {activeTab === 'POD' && (
                            <>
                              <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">{row.docketNumber}</td>
                              <td className="py-3 px-4 text-slate-500">{row.bookingDate}</td>
                              <td className="py-3 px-4 text-slate-500">{row.deliveryDate}</td>
                              <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                                {row.transitDays}
                              </td>
                              <td className="py-3 px-4">
                                {row.originBranch} → {row.destBranch}
                              </td>
                              <td className="py-3 px-4 font-medium">{row.consigneeName}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {row.shipmentStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.podStatus === 'VERIFIED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.podStatus === 'UPLOADED'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {row.podStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {row.hasPhysicalPod ? (
                                  <span className="text-emerald-500 font-bold">YES</span>
                                ) : (
                                  <span className="text-slate-400">NO</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* 5. Collections View */}
                          {activeTab === 'COLLECTIONS' && (
                            <>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{row.date}</td>
                              <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">{row.branchName}</td>
                              <td className="py-3 px-4 text-center font-semibold">{row.paidBookingsCount}</td>
                              <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatINR(row.paidCashAmount)}</td>
                              <td className="py-3 px-4 text-center font-semibold">{row.toPayDeliveriesCount}</td>
                              <td className="py-3 px-4 text-right font-medium text-blue-600">{formatINR(row.toPayCashAmount)}</td>
                              <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                                {formatINR(row.totalCollected)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    row.isClosed
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${row.isClosed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {row.isClosed ? 'Remitted to Bank' : 'Unclosed Cash'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center text-xs">
                                {row.isClosed ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{row.bankName || 'Bank'}</span>
                                    <span className="font-mono text-[10px] text-slate-400">{row.utrNumber ? `UTR: ${row.utrNumber}` : 'Direct Deposit'}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-rose-500 font-semibold">Pending Bank Deposit</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {row.isClosed && row.receiptSlipUrl ? (
                                  <button
                                    onClick={() => setSelectedReceiptModal({
                                      slipUrl: row.receiptSlipUrl,
                                      bankName: row.bankName,
                                      utrNumber: row.utrNumber,
                                      amount: row.remittedAmount || row.totalCollected,
                                      date: row.date,
                                      branchName: row.branchName,
                                    })}
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Slip</span>
                                  </button>
                                ) : !row.isClosed ? (
                                  <button
                                    onClick={() => openRemitModal(row)}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-xs cursor-pointer"
                                  >
                                    <Landmark className="w-3.5 h-3.5" />
                                    <span>Deposit</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">No Slip</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* 6. GST View */}
                          {activeTab === 'GST' && (
                            <>
                              <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{row.lrNumber}</td>
                              <td className="py-3 px-4 text-slate-500">{row.bookingDate}</td>
                              <td className="py-3 px-4">{row.branch}</td>
                              <td className="py-3 px-4 truncate max-w-[120px]" title={row.consignorName}>
                                {row.consignorName}
                                <span className="block font-mono text-[10px] text-slate-400">{row.consignorGst}</span>
                              </td>
                              <td className="py-3 px-4 truncate max-w-[120px]" title={row.consigneeName}>
                                {row.consigneeName}
                                <span className="block font-mono text-[10px] text-slate-400">{row.consigneeGst}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                                {formatINR(row.taxableValue)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {row.taxType}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500">{formatINR(row.cgst)}</td>
                              <td className="py-3 px-4 text-right text-slate-500">{formatINR(row.sgst)}</td>
                              <td className="py-3 px-4 text-right text-slate-500">{formatINR(row.igst)}</td>
                              <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                {formatINR(row.totalInvoiceValue)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isDark ? 'border-slate-800 text-slate-400 bg-slate-950/20' : 'border-slate-200 text-slate-500 bg-slate-50/40'
            }`}>
              {/* Left: Summary text */}
              <div>
                Showing{' '}
                <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {startItem}-{endItem}
                </span>{' '}
                of{' '}
                <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {totalRecords.toLocaleString()}
                </span>{' '}
                records
              </div>

              {/* Right: Rows Per Page Selector + Divider + Pagination Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Rows Per Page Selector */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Rows:
                  </span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all focus:outline-none cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-blue-600 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {[10, 15, 25, 50, 100].map((opt) => (
                      <option key={opt} value={opt} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Divider Line */}
                <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

                {/* Pagination Controls */}
                <div className="flex items-center space-x-1.5">
                  {/* First Page */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1 || loading}
                    className={`p-1.5 rounded-lg border transition-all ${
                      page <= 1 || loading
                        ? 'border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                    }`}
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                      page <= 1 || loading
                        ? 'border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                    }`}
                  >
                    Prev
                  </button>

                  {/* Page Number Chips */}
                  <div className="flex items-center space-x-1">
                    {pageNumbers.map((p, pIdx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${pIdx}`} className="px-1 text-slate-500 font-mono">
                            ...
                          </span>
                        );
                      }
                      const isActive = p === page;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          disabled={loading}
                          className={`min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                              : isDark
                              ? 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                      page >= totalPages || loading
                        ? 'border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                    }`}
                  >
                    Next
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages || loading}
                    className={`p-1.5 rounded-lg border transition-all ${
                      page >= totalPages || loading
                        ? 'border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                    }`}
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal 1: Deposit Branch Cash to Bank & Close Daybook */}
      {isRemitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold">Deposit Branch Cash to Bank</h3>
              </div>
              <button
                onClick={() => setIsRemitModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRemitSubmit} className="p-5 space-y-4 text-xs">
              {/* Summary Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Branch Cash Daybook</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{remitFormData.branchName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Unclosed Collection</span>
                  <div className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                    {formatINR(remitFormData.remittedAmount || 0)}
                  </div>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Remitted Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={remitFormData.remittedAmount}
                    onChange={(e) => setRemitFormData({ ...remitFormData, remittedAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Deposit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={remitFormData.closureDate}
                    onChange={(e) => setRemitFormData({ ...remitFormData, closureDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={remitFormData.bankName}
                    placeholder="e.g. State Bank of India, HDFC"
                    onChange={(e) => setRemitFormData({ ...remitFormData, bankName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Deposit Mode
                  </label>
                  <select
                    value={remitFormData.depositMode}
                    onChange={(e) => setRemitFormData({ ...remitFormData, depositMode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="CASH_DEPOSIT">Cash Deposit at Counter</option>
                    <option value="CDM">Cash Deposit Machine (CDM)</option>
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="NEFT">NEFT / RTGS</option>
                    <option value="CHEQUE">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Bank UTR / Transaction / Challan Reference # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR3928109382 / Challan #10492"
                  value={remitFormData.utrReferenceNo}
                  onChange={(e) => setRemitFormData({ ...remitFormData, utrReferenceNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload Stamped Bank Slip / Receipt */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Upload Bank Slip / Stamped Challan Photo
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center hover:border-amber-500 transition-colors">
                  {remitFormData.receiptPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={remitFormData.receiptPreview}
                        alt="Receipt preview"
                        className="max-h-36 rounded-lg object-contain mx-auto shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setRemitFormData({ ...remitFormData, receiptSlip: '', receiptPreview: '' })}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-2">
                      <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-blue-500 font-bold hover:underline">Click to upload deposit slip</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP photo of receipt</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleRemitFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deposited morning counter cash"
                  value={remitFormData.remarks}
                  onChange={(e) => setRemitFormData({ ...remitFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRemitModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRemit}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  {isSubmittingRemit ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Confirm Deposit &amp; Close</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: View Bank Deposit Slip */}
      {selectedReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Bank Remittance Receipt</h3>
                <span className="text-[10px] text-slate-400">{selectedReceiptModal.branchName} • {selectedReceiptModal.date}</span>
              </div>
              <button
                onClick={() => setSelectedReceiptModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Bank Details</span>
                  <div className="font-bold">{selectedReceiptModal.bankName || 'Bank Deposit'}</div>
                  <div className="font-mono text-[10px] text-slate-400">UTR: {selectedReceiptModal.utrNumber || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Deposited Amount</span>
                  <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatINR(selectedReceiptModal.amount)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/50 flex items-center justify-center min-h-[220px]">
                <img
                  src={selectedReceiptModal.slipUrl}
                  alt="Bank deposit slip"
                  className="max-h-80 w-auto object-contain rounded-lg"
                />
              </div>

              <div className="text-center pt-1">
                <button
                  onClick={() => setSelectedReceiptModal(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
