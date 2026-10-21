// frontend/app/(owner)/audit-logs/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import auditService from '../../../services/auditService';
import {
  History,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit3,
  PlusCircle,
  Truck,
  DollarSign,
  User,
  Calendar,
  Eye,
  X,
  ArrowRight,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Building2,
  Laptop,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  Code,
  Package,
  Phone,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRightLeft,
  Tag,
  MapPin,
  CreditCard,
  Scale,
  Boxes,
  HelpCircle,
  ExternalLink,
  Shield,
  RotateCcw
} from 'lucide-react';

const LOGISTICS_FIELD_LABELS = {
  // Consignment & Booking
  receiver_name: 'Consignee / Receiver Name',
  receiver_phone: 'Consignee Contact No.',
  consignor_name: 'Consignor / Sender Name',
  consignor_phone: 'Consignor Contact No.',
  delivered_packages: 'Delivered Packages (Pkgs)',
  packages: 'Total Packages (Articles)',
  pieces: 'Package Quantity',
  quantity: 'Total Quantity',
  has_pod: 'Proof of Delivery (POD)',
  booking_number: 'Docket / LR Number',
  booking_id: 'Docket Reference ID',
  docket_no: 'Docket / Bilty No.',
  docket_number: 'Docket / Bilty No.',
  lr_no: 'LR Number',
  origin_city: 'Origin City',
  destination_city: 'Destination City',
  origin_branch: 'Origin Branch / Hub',
  origin_branch_id: 'Origin Branch ID',
  destination_branch: 'Destination Branch / Hub',
  destination_branch_id: 'Destination Branch ID',
  from_branch: 'Origin Hub',
  to_branch: 'Destination Hub',
  delivery_type: 'Delivery Mode (Door / Godown)',
  payment_mode: 'Payment Type (To-Pay / Paid / TBB)',
  payment_type: 'Payment Type (To-Pay / Paid / TBB)',
  payment_status: 'Payment Status',
  freight_amount: 'Total Freight Amount',
  amount: 'Total Amount',
  total_amount: 'Total Bilty Amount',
  advance_amount: 'Advance Paid',
  balance_amount: 'Balance to Collect',
  weight: 'Actual Weight',
  actual_weight: 'Actual Weight',
  chargeable_weight: 'Chargeable Weight',
  charged_weight: 'Charged Weight',
  rate: 'Freight Rate',
  notes: 'Operational Remarks',
  remarks: 'Staff Remarks',
  status: 'Lifecycle Status',
  reviewer_comments: 'Reviewer Comments / Clarification',
  // Fleet & Trips
  vehicle_number: 'Vehicle / Truck Registration',
  truck_number: 'Truck Number',
  driver_name: 'Driver Name',
  driver_phone: 'Driver Mobile No.',
  odometer_start: 'Odometer Starting (km)',
  odometer_end: 'Odometer Ending (km)',
  fuel_liters: 'Fuel Filled (Liters)',
  toll_amount: 'Toll Charges',
  // Expenses & Accounts
  expense_category: 'Expense Category',
  vendor_name: 'Vendor / Fuel Station',
  bill_number: 'Bill / Receipt No.',
  tax_amount: 'GST / Tax Amount',
  // Users & Roles
  role: 'User Assigned Role',
  branch_id: 'Assigned Branch',
  phone: 'Contact Phone',
  name: 'Full Name',
  email: 'Email Address',
  is_active: 'Account Active Status',
};

const INTERNAL_SYSTEM_KEYS = new Set([
  '_changes',
  '_summary',
  '_performer',
  '_entity_name',
  'tenant_id',
  'organization_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'id',
]);

const humanizeFieldName = (key) => {
  if (LOGISTICS_FIELD_LABELS[key]) return LOGISTICS_FIELD_LABELS[key];
  return key
    .replace(/^_+/, '')
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

const formatFieldValue = (val, key = '', isDark = true) => {
  if (val === null || val === undefined || val === '') {
    return <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Not Provided / Blank</span>;
  }
  if (typeof val === 'boolean') {
    return val ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <Check className="w-3 h-3" /> Yes / Verified
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
        <X className="w-3 h-3" /> No / Unchecked
      </span>
    );
  }
  const lk = key.toLowerCase();
  if (
    typeof val === 'number' ||
    (!isNaN(val) && val !== '' && typeof val === 'string' && (lk.includes('amount') || lk.includes('freight') || lk.includes('rate') || lk.includes('cost') || lk.includes('toll')))
  ) {
    return (
      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
        ₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    );
  }
  if (lk.includes('weight') && (typeof val === 'number' || !isNaN(val))) {
    return <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs">{val} kg</span>;
  }
  if ((lk.includes('package') || lk.includes('article') || lk.includes('quantity') || lk.includes('pieces')) && (typeof val === 'number' || !isNaN(val))) {
    return <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">{val} Pkgs</span>;
  }
  if (typeof val === 'object') {
    return (
      <span className={`font-mono text-[11px] truncate max-w-xs block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {JSON.stringify(val)}
      </span>
    );
  }
  return <span className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{String(val)}</span>;
};

export default function AuditLogsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin, canViewAudit, canExportAudit, hasRole, hasPermission } = usePermissions();

  // State
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    deletions: 0,
    updates: 0,
    creates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 25 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Date Dropdown State (Image 3 implementation)
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const dateDropdownRef = useRef(null);

  // Interactive Card Filter Tab
  const [activeTabCard, setActiveTabCard] = useState('ALL');

  // Diff Inspector Modal States
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('friendly'); // 'friendly' | 'raw'
  const [copiedJson, setCopiedJson] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close Date Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
        setIsDateDropdownOpen(false);
      }
    };
    if (isDateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateDropdownOpen]);

  // Handle upper card tab clicks
  const handleCardClick = (cardType) => {
    setActiveTabCard(cardType);
    setPage(1);

    if (cardType === 'ALL') {
      setSelectedAction('ALL');
      setSelectedEntity('ALL');
      setFromDate('');
      setToDate('');
      setDatePreset('ALL');
    } else if (cardType === 'TODAY') {
      setSelectedAction('ALL');
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      setFromDate(todayStr);
      setToDate(todayStr);
      setDatePreset('TODAY');
    } else if (cardType === 'DELETE') {
      setSelectedAction('DELETE');
      setFromDate('');
      setToDate('');
      setDatePreset('ALL');
    } else if (cardType === 'UPDATE') {
      setSelectedAction('UPDATE');
      setFromDate('');
      setToDate('');
      setDatePreset('ALL');
    } else if (cardType === 'CREATE') {
      setSelectedAction('CREATE');
      setFromDate('');
      setToDate('');
      setDatePreset('ALL');
    }
  };

  // Date range presets helper
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();
    const formatDate = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
      setIsDateDropdownOpen(false);
    } else if (preset === 'TODAY') {
      const today = formatDate(now);
      setFromDate(today);
      setToDate(today);
      setIsDateDropdownOpen(false);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDate(yest);
      setFromDate(yestStr);
      setToDate(yestStr);
      setIsDateDropdownOpen(false);
    } else if (preset === 'WEEK') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setFromDate(formatDate(past));
      setToDate(formatDate(now));
      setIsDateDropdownOpen(false);
    } else if (preset === 'MONTH') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatDate(monthStart));
      setToDate(formatDate(now));
      setIsDateDropdownOpen(false);
    }
  };

  // Date label displayed in dropdown button (matches Image 3)
  const dateDisplayLabel = useMemo(() => {
    if (datePreset === 'TODAY') return 'Today';
    if (datePreset === 'YESTERDAY') return 'Yesterday';
    if (datePreset === 'WEEK') return 'Last 7 Days';
    if (datePreset === 'MONTH') return 'This Month';
    if (fromDate && toDate) {
      if (fromDate === toDate) return fromDate;
      return `${fromDate} - ${toDate}`;
    }
    if (fromDate) return `From ${fromDate}`;
    if (toDate) return `Up to ${toDate}`;
    return 'All Dates';
  }, [datePreset, fromDate, toDate]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedAction('ALL');
    setSelectedEntity('ALL');
    setFromDate('');
    setToDate('');
    setDatePreset('ALL');
    setActiveTabCard('ALL');
    setPage(1);
  };

  // Fetch stats & logs
  const fetchAuditData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [logsRes, statsRes] = await Promise.all([
        auditService.listLogs({
          page,
          limit: 25,
          search: debouncedSearch || undefined,
          action: selectedAction !== 'ALL' ? selectedAction : undefined,
          entity_type: selectedEntity !== 'ALL' ? selectedEntity : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }),
        auditService.getStats().catch(() => ({})),
      ]);

      if (logsRes && logsRes.data) {
        setLogs(logsRes.data || []);
        if (logsRes.pagination) {
          setPagination(logsRes.pagination);
        }
      }

      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, selectedAction, selectedEntity, fromDate, toDate]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Open Diff Modal
  const handleOpenDiff = (log) => {
    setSelectedLog(log);
    setIsDiffModalOpen(true);
    setActiveModalTab('friendly');
    setShowUnchanged(false);
    setCopiedJson(false);
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    if (!selectedLog) return;
    const payload = {
      action: selectedLog.action,
      entity: selectedLog.entity_name || selectedLog.entity_id,
      entity_type: selectedLog.entity_type,
      performer: selectedLog.performer,
      timestamp: selectedLog.created_at,
      previous_snapshot: selectedLog.old_values,
      current_payload: selectedLog.new_values,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('No audit logs available to export.');
      return;
    }

    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Performer Name', 'Performer Email', 'Role', 'Summary', 'IP Address'];
    const rows = logs.map((log) => [
      new Date(log.created_at).toLocaleString('en-IN'),
      log.action,
      log.entity_type,
      `"${log.entity_id}"`,
      `"${log.performer?.name || 'System'}"`,
      `"${log.performer?.email || ''}"`,
      `"${log.performer?.role || ''}"`,
      `"${(log.summary || '').replace(/"/g, '""')}"`,
      log.ip_address || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_trail_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for action badges
  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase();
    switch (act) {
      case 'DELETE':
        return {
          label: 'DELETED',
          icon: Trash2,
          className: isDark
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            : 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'UPDATE':
        return {
          label: 'MODIFIED',
          icon: Edit3,
          className: isDark
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'CREATE':
        return {
          label: 'CREATED',
          icon: PlusCircle,
          className: isDark
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'RETURN':
        return {
          label: 'RETURNED',
          icon: RotateCcw,
          className: isDark
            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            : 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'APPROVE':
        return {
          label: 'APPROVED',
          icon: CheckCircle2,
          className: isDark
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'REJECT':
        return {
          label: 'REJECTED',
          icon: X,
          className: isDark
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            : 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'DISPATCH':
        return {
          label: 'DISPATCHED',
          icon: Truck,
          className: isDark
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            : 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
      case 'SETTLE':
        return {
          label: 'SETTLED',
          icon: DollarSign,
          className: isDark
            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            : 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'LOGIN':
        return {
          label: 'LOGIN',
          icon: Shield,
          className: isDark
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : 'bg-blue-50 text-blue-700 border-blue-200',
        };
      default:
        return {
          label: act || 'ACTIVITY',
          icon: History,
          className: isDark
            ? 'bg-slate-800 text-slate-300 border-slate-700'
            : 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  // Format relative time helper
  const formatTimeAgo = (dateStr) => {
    const diffMs = new Date() - new Date(dateStr);
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Compute structured diff for selectedLog
  const diffAnalysis = useMemo(() => {
    if (!selectedLog) return null;
    const oldVals = selectedLog.old_values || {};
    const newVals = selectedLog.new_values || {};

    const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));
    const businessKeys = allKeys.filter((k) => !INTERNAL_SYSTEM_KEYS.has(k));

    const changed = [];
    const unchanged = [];

    businessKeys.forEach((key) => {
      const oldV = oldVals[key];
      const newV = newVals[key];
      const isDifferent = JSON.stringify(oldV) !== JSON.stringify(newV);

      if (isDifferent) {
        changed.push({ key, oldV, newV });
      } else {
        unchanged.push({ key, val: newV !== undefined ? newV : oldV });
      }
    });

    return { changed, unchanged, businessKeys, oldVals, newVals };
  }, [selectedLog]);

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedAction !== 'ALL' ||
    selectedEntity !== 'ALL' ||
    fromDate ||
    toDate ||
    datePreset !== 'ALL' ||
    activeTabCard !== 'ALL'
  );

  // Permission Gate View
  const canAccessAudit = isAdmin || canViewAudit || hasRole('AUDITOR') || hasRole('AUDIT') || hasPermission('audit.view');
  if (!canAccessAudit) {
    return (
      <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'} font-sans`}>
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-4 shadow-xl ${
              isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold">Confidential Audit Ledger Restricted</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                You do not hold administrative audit clearance to view immutable system mutation logs. Contact the Head Office System Administrator.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30"
              >
                Return to Dashboard
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'} font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-5 w-full max-w-full">
          
          {/* 1. Header Bar */}
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black tracking-tight flex items-center gap-2">
                    <span className="truncate">Activity &amp; Audit Governance</span>
                    <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                      Admin Confidential
                    </span>
                  </h1>
                  <p className={`text-xs mt-0.5 truncate sm:whitespace-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Real-time immutable audit trail: track who created, updated, or deleted records with exact timestamps.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 shrink-0">
              {canExportAudit && (
                <button
                  onClick={handleExportCSV}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                  title="Export currently filtered audit entries as CSV report"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Export CSV</span>
                </button>
              )}

              <button
                onClick={fetchAuditData}
                disabled={refreshing}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>
          </div>

          {/* 2. Interactive KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Card 1: All Events */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick('ALL')}
              className={`p-2.5 sm:p-3 xl:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer select-none transition-all duration-200 active:scale-95 ${
                activeTabCard === 'ALL'
                  ? isDark
                    ? 'bg-gradient-to-br from-cyan-950/40 via-slate-900 to-cyan-900/20 border-cyan-500/80 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50 border-cyan-400 ring-2 ring-cyan-400/40 shadow-md'
                  : isDark
                    ? 'bg-[#0B1020]/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] xl:text-[11px] font-bold uppercase tracking-wider truncate pr-1 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  Total Events
                </span>
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className={`text-lg sm:text-xl font-black font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stats.total?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">All captured logs</span>
              </div>
            </div>

            {/* Card 2: Today */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick('TODAY')}
              className={`p-2.5 sm:p-3 xl:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer select-none transition-all duration-200 active:scale-95 ${
                activeTabCard === 'TODAY'
                  ? isDark
                    ? 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-blue-900/20 border-blue-500/80 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                    : 'bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-blue-400 ring-2 ring-blue-400/40 shadow-md'
                  : isDark
                    ? 'bg-[#0B1020]/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] xl:text-[11px] font-bold uppercase tracking-wider truncate pr-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  Today's Ops
                </span>
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                {stats.today?.toLocaleString() || 0}
              </div>
              <div className={`text-[10px] mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
                Logged today
              </div>
            </div>

            {/* Card 3: Deletions */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick('DELETE')}
              className={`p-2.5 sm:p-3 xl:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer select-none transition-all duration-200 active:scale-95 ${
                activeTabCard === 'DELETE'
                  ? isDark
                    ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-rose-900/20 border-rose-500/80 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/10'
                    : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/50 border-rose-400 ring-2 ring-rose-400/40 shadow-md'
                  : isDark
                    ? 'bg-[#0B1020]/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] xl:text-[11px] font-bold uppercase tracking-wider truncate pr-1 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                  Deletions
                </span>
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                {stats.deletions?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="truncate">Record purges</span>
              </div>
            </div>

            {/* Card 4: Updates */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick('UPDATE')}
              className={`p-2.5 sm:p-3 xl:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer select-none transition-all duration-200 active:scale-95 ${
                activeTabCard === 'UPDATE'
                  ? isDark
                    ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-900/20 border-amber-500/80 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-gradient-to-br from-amber-50 via-white to-amber-50/50 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                  : isDark
                    ? 'bg-[#0B1020]/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] xl:text-[11px] font-bold uppercase tracking-wider truncate pr-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  Modifications
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Edit3 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {stats.updates?.toLocaleString() || 0}
              </div>
              <div className={`text-[10px] mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
                Field changes
              </div>
            </div>

            {/* Card 5: Creates */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick('CREATE')}
              className={`p-2.5 sm:p-3 xl:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer select-none transition-all duration-200 active:scale-95 col-span-2 sm:col-span-1 lg:col-span-1 ${
                activeTabCard === 'CREATE'
                  ? isDark
                    ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-emerald-900/20 border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-emerald-400 ring-2 ring-emerald-400/40 shadow-md'
                  : isDark
                    ? 'bg-[#0B1020]/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] xl:text-[11px] font-bold uppercase tracking-wider truncate pr-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  New Registrations
                </span>
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {stats.creates?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold truncate">
                New creations
              </div>
            </div>
          </div>

          {/* 3. Modern Filter Toolbar */}
          <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
              
              {/* Search Box with Clear Button */}
              <div className="relative flex-1 min-w-[200px] w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search docket, user, action, remarks, IP..."
                  className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30'
                  } focus:outline-none`}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Right Filter Controls: Action, Module, Date, Reset */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Action Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedAction}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAction(val);
                      if (['ALL', 'DELETE', 'UPDATE', 'CREATE'].includes(val)) {
                        setActiveTabCard(val);
                      } else {
                        setActiveTabCard('CUSTOM');
                      }
                      setPage(1);
                    }}
                    className={`pl-2.5 pr-7 py-1.5 rounded-xl text-xs border font-semibold appearance-none cursor-pointer transition-all max-w-[135px] sm:max-w-none ${
                      selectedAction !== 'ALL'
                        ? isDark
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                          : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                    } focus:outline-none`}
                  >
                    <option value="ALL">⚡ All Actions</option>
                    <option value="CREATE">➕ New Creates Only</option>
                    <option value="UPDATE">✏️ Modifications Only</option>
                    <option value="DELETE">🗑️ Deletions Only</option>
                    <option value="RETURN">↩️ Returned Only</option>
                    <option value="APPROVE">✅ Approved Only</option>
                    <option value="REJECT">❌ Rejected Only</option>
                    <option value="DISPATCH">🚛 Dispatches Only</option>
                    <option value="SETTLE">💰 Settlements Only</option>
                    <option value="LOGIN">🛡️ Logins &amp; Sessions</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Module Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedEntity}
                    onChange={(e) => {
                      setSelectedEntity(e.target.value);
                      setPage(1);
                    }}
                    className={`pl-2.5 pr-7 py-1.5 rounded-xl text-xs border font-semibold appearance-none cursor-pointer transition-all max-w-[135px] sm:max-w-none ${
                      selectedEntity !== 'ALL'
                        ? isDark
                          ? 'bg-blue-500/20 border-blue-500/60 text-blue-300'
                          : 'bg-blue-50 border-blue-300 text-blue-800'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                    } focus:outline-none`}
                  >
                    <option value="ALL">📦 All Modules</option>
                    <option value="CONSIGNMENT">📦 Bilties / Consignments</option>
                    <option value="APPROVAL_REQUEST">🛡️ Approvals &amp; Requests</option>
                    <option value="DISPATCH">🚛 Trips &amp; Loading</option>
                    <option value="DELIVERY">🏁 Delivery &amp; POD</option>
                    <option value="EXPENSE">💳 Expenses &amp; Claims</option>
                    <option value="BILLING">🧾 Billing &amp; Invoices</option>
                    <option value="SETTLEMENT">💰 Trip Settlements</option>
                    <option value="BRANCH">🏢 Branches &amp; Hubs</option>
                    <option value="USER">👥 Users &amp; Staff</option>
                    <option value="ROLE">🛡️ Roles &amp; Permissions</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Date Filter Dropdown */}
                <div className="relative" ref={dateDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                      datePreset !== 'ALL' || fromDate || toDate
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/50 shadow-xs'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate max-w-[120px]">{dateDisplayLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDateDropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-xl p-3 z-50 animate-fadeIn ${
                      isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <div className="space-y-1 text-xs font-semibold mb-3">
                        <button
                          onClick={() => applyDatePreset('ALL')}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                            datePreset === 'ALL' && !fromDate
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'hover:bg-slate-800/80 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>⚡ All Dates</span>
                          {datePreset === 'ALL' && !fromDate && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => applyDatePreset('TODAY')}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                            datePreset === 'TODAY'
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'hover:bg-slate-800/80 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>📅 Today</span>
                          {datePreset === 'TODAY' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => applyDatePreset('YESTERDAY')}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                            datePreset === 'YESTERDAY'
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'hover:bg-slate-800/80 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>⏱️ Yesterday</span>
                          {datePreset === 'YESTERDAY' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => applyDatePreset('WEEK')}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                            datePreset === 'WEEK'
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'hover:bg-slate-800/80 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>🗓️ Last 7 Days</span>
                          {datePreset === 'WEEK' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => applyDatePreset('MONTH')}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                            datePreset === 'MONTH'
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'hover:bg-slate-800/80 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>📆 This Month</span>
                          {datePreset === 'MONTH' && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Custom Date Range Inputs */}
                      <div className="pt-2.5 border-t border-slate-800/40 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Custom Date Range
                        </span>
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">From Date</label>
                            <input
                              type="date"
                              value={fromDate}
                              onChange={(e) => {
                                setFromDate(e.target.value);
                                setDatePreset('CUSTOM');
                                setActiveTabCard('CUSTOM');
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">To Date</label>
                            <input
                              type="date"
                              value={toDate}
                              onChange={(e) => {
                                setToDate(e.target.value);
                                setDatePreset('CUSTOM');
                                setActiveTabCard('CUSTOM');
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFromDate('');
                              setToDate('');
                              setDatePreset('ALL');
                              setIsDateDropdownOpen(false);
                              setPage(1);
                            }}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDateDropdownOpen(false);
                              setPage(1);
                            }}
                            className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 cursor-pointer"
                          >
                            Apply Range
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset Filters Icon Button if active */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}

              </div>
            </div>
          </div>

          {/* 4. Compact Activity Log Data Table */}
          {/* Order: ACTION | ENTITY & TARGET | RESPONSIBLE USER (WHO) | ACTIVITY SUMMARY (REMARKS) | TIMESTAMP (WHEN) | NETWORK / IP | INSPECT */}
          <div className={`rounded-2xl border shadow-md overflow-hidden ${
            isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto overflow-y-auto max-h-[520px] sm:max-h-[580px] lg:max-h-[calc(100vh-320px)] min-h-[300px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 relative [container-type:inline-size]">
              <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                <thead className="sticky top-0 z-20 shadow-xs">
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-[#0B1020] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <th className="py-2.5 px-3 whitespace-nowrap">Action</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Entity &amp; Target</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Responsible User (Who)</th>
                    <th className="py-2.5 px-3">Activity Summary / Remarks</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Timestamp (When)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Network / IP</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Inspect</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 p-0 text-center text-slate-400 border-none">
                        <div className="sticky left-0 m-0 flex flex-col items-center justify-center px-4 w-[100cqw] max-w-full">
                          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                          <span className="font-semibold text-xs">Querying audit logs ledger...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 p-0 text-center border-none">
                        <div className="sticky left-0 m-0 flex flex-col items-center justify-center px-4 w-[100cqw] max-w-full space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-slate-800/30 flex items-center justify-center mx-auto text-slate-400">
                            <History className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold">No Audit Activity Found</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            No matching logs found for the applied search criteria or date range.
                          </p>
                          {hasActiveFilters && (
                            <button
                              onClick={handleResetFilters}
                              className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-sm"
                            >
                              Clear Filters &amp; Reload
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const badge = getActionBadge(log.action);
                      const IconComp = badge.icon;

                      return (
                        <tr
                          key={log.id}
                          className={`transition-colors ${
                            isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* 1. Action Pill */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${badge.className}`}>
                              <IconComp className="w-2.5 h-2.5" />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* 2. Entity & ID */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs">
                              {log.entity_name || log.entity_id}
                            </div>
                            <div className="text-[9px] text-slate-500 font-semibold uppercase">
                              {log.entity_type}
                            </div>
                          </td>

                          {/* 3. Responsible User (Who) - Moved before Remarks! */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                {(log.performer?.name || 'U').slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {log.performer?.name || 'Staff User'}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>{log.performer?.role || 'Staff'}</span>
                                  {log.branch?.name && (
                                    <>
                                      <span>•</span>
                                      <span className="text-cyan-600 dark:text-cyan-400">{log.branch.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 4. Activity Summary / Remarks - Now placed AFTER Responsible User! */}
                          <td className="py-2.5 px-3 max-w-sm sm:max-w-md">
                            <p className={`font-medium text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={log.summary}>
                              {log.summary}
                            </p>
                          </td>

                          {/* 5. Timestamp */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className={`font-mono text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {new Date(log.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>({formatTimeAgo(log.created_at)})</span>
                            </div>
                          </td>

                          {/* 6. Network / IP */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {log.ip_address || '::1'}
                          </td>

                          {/* 7. Inspect Button */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleOpenDiff(log)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800'
                                  : 'bg-white border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 shadow-xs'
                              }`}
                              title="Inspect Details and Changes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination Bar */}
            <div className={`py-2.5 px-3.5 sm:px-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
              isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              <div className="text-[11px] sm:text-xs">
                Showing page <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{pagination.page || 1}</span> of <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{pagination.pages || 1}</span> <span className="text-slate-400">({pagination.total || 0} records)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    page <= 1
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isDark
                      ? 'hover:bg-slate-800 border-slate-700 text-slate-200'
                      : 'hover:bg-white border-slate-200 text-slate-700 shadow-2xs'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
                  disabled={page >= (pagination.pages || 1)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    page >= (pagination.pages || 1)
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isDark
                      ? 'hover:bg-slate-800 border-slate-700 text-slate-200'
                      : 'hover:bg-white border-slate-200 text-slate-700 shadow-2xs'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* ========================================================================= */}
      {/* 5. Deep Details & Diff Inspector Modal (100% Theme-Adaptive) */}
      {/* ========================================================================= */}
      {isDiffModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl p-5 sm:p-7 space-y-4 max-h-[92vh] flex flex-col ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  selectedLog.action === 'CREATE'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : selectedLog.action === 'UPDATE'
                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    : selectedLog.action === 'DELETE'
                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                    : 'bg-cyan-500/15 text-cyan-500 border border-cyan-500/30'
                }`}>
                  {selectedLog.action === 'CREATE' && <PlusCircle className="w-6 h-6" />}
                  {selectedLog.action === 'UPDATE' && <Edit3 className="w-6 h-6" />}
                  {selectedLog.action === 'DELETE' && <Trash2 className="w-6 h-6" />}
                  {!['CREATE', 'UPDATE', 'DELETE'].includes(selectedLog.action) && <ShieldCheck className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {selectedLog.entity_name || selectedLog.entity_id}
                    </h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold uppercase border ${
                      selectedLog.action === 'CREATE'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : selectedLog.action === 'UPDATE'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : selectedLog.action === 'DELETE'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                    }`}>
                      {selectedLog.action}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {selectedLog.entity_type}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedLog.summary}
                  </p>
                </div>
              </div>

              {/* View Mode Toggle & Close Button */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <div className={`p-1 rounded-xl border flex items-center gap-1 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    onClick={() => setActiveModalTab('friendly')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeModalTab === 'friendly'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Readable View
                  </button>
                  <button
                    onClick={() => setActiveModalTab('raw')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      activeModalTab === 'raw'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Raw JSON</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsDiffModalOpen(false)}
                  className={`p-1.5 rounded-xl transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Performer & Metadata Strip (100% Theme Adaptive) */}
            <div className={`p-3.5 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Responsible User</p>
                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 truncate">{selectedLog.performer?.name || 'Staff'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{selectedLog.performer?.role || 'User'} • {selectedLog.performer?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Target Resource</p>
                <p className={`text-xs font-bold font-mono mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedLog.entity_name || selectedLog.entity_id}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{selectedLog.entity_type}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Logged Time</p>
                <p className={`text-xs font-bold font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {new Date(selectedLog.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {new Date(selectedLog.created_at).toLocaleDateString('en-GB')} ({formatTimeAgo(selectedLog.created_at)})
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Network / IP</p>
                <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">{selectedLog.ip_address || '127.0.0.1'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={selectedLog.user_agent}>
                  {selectedLog.user_agent ? selectedLog.user_agent.split(' ')[0] : 'Web Client'}
                </p>
              </div>
            </div>

            {/* Modal Body: Switch between Friendly View & Raw JSON */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              
              {activeModalTab === 'friendly' ? (
                <div className="space-y-4">

                  {/* CASE 1: UPDATE (Side-by-side Field Diff Table) */}
                  {selectedLog.action === 'UPDATE' && diffAnalysis && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Modified Fields ({diffAnalysis.changed.length})</span>
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Showing exact before and after state changes
                          </span>
                        </div>
                      </div>

                      {diffAnalysis.changed.length === 0 ? (
                        <div className={`p-6 rounded-2xl border text-center text-xs ${
                          isDark ? 'border-slate-800 text-slate-400 bg-slate-900/40' : 'border-slate-200 text-slate-600 bg-slate-50'
                        }`}>
                          No direct scalar field differences detected (entire snapshot re-saved).
                        </div>
                      ) : (
                        <div className={`rounded-2xl border overflow-hidden ${
                          isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className={`border-b text-[11px] font-bold uppercase ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                <th className="p-3 w-1/3">Field / Attribute</th>
                                <th className="p-3 w-1/3 text-rose-500">Previous State (Before)</th>
                                <th className="p-3 w-1/3 text-emerald-600 dark:text-emerald-400">Updated State (After)</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#070B14]' : 'divide-slate-200 bg-white'}`}>
                              {diffAnalysis.changed.map(({ key, oldV, newV }) => (
                                <tr key={key} className={isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}>
                                  <td className="p-3 font-semibold">
                                    <div className={isDark ? 'text-slate-200' : 'text-slate-800'}>{humanizeFieldName(key)}</div>
                                    <div className="text-[10px] font-mono text-slate-500">{key}</div>
                                  </td>
                                  <td className="p-3 bg-rose-500/5">
                                    <div className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 line-through opacity-85 text-xs">
                                      {formatFieldValue(oldV, key, isDark)}
                                    </div>
                                  </td>
                                  <td className="p-3 bg-emerald-500/5">
                                    <div className="p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                                      {formatFieldValue(newV, key, isDark)}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Unchanged Fields Collapsible Accordion */}
                      {diffAnalysis.unchanged.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowUnchanged(!showUnchanged)}
                            className={`text-xs flex items-center gap-1.5 font-bold transition-colors ${
                              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {showUnchanged ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <span>{showUnchanged ? 'Hide' : 'View'} Unchanged Record Properties ({diffAnalysis.unchanged.length})</span>
                          </button>

                          {showUnchanged && (
                            <div className={`mt-2.5 p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${
                              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                            }`}>
                              {diffAnalysis.unchanged.map(({ key, val }) => (
                                <div key={key} className={`p-2.5 rounded-xl border ${
                                  isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-white'
                                }`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{humanizeFieldName(key)}</p>
                                  <div className="mt-1">{formatFieldValue(val, key, isDark)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASE 2: NON-UPDATE RECORD DETAILS (CREATE, RETURN, APPROVE, DELETE, ETC.) */}
                  {selectedLog.action !== 'UPDATE' && diffAnalysis && (
                    <div className="space-y-4">
                      {/* Banner */}
                      <div className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
                        selectedLog.action === 'CREATE'
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                          : selectedLog.action === 'DELETE'
                          ? 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400'
                          : selectedLog.action === 'RETURN'
                          ? 'bg-orange-500/10 border-orange-500/25 text-orange-700 dark:text-orange-400'
                          : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-700 dark:text-cyan-400'
                      }`}>
                        {selectedLog.action === 'DELETE' ? (
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                        ) : selectedLog.action === 'RETURN' ? (
                          <RotateCcw className="w-5 h-5 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold">
                            {selectedLog.action === 'CREATE'
                              ? 'New Record Successfully Initialized'
                              : selectedLog.action === 'DELETE'
                              ? 'Record Permanently Purged from System'
                              : selectedLog.action === 'RETURN'
                              ? 'Returned to Requester for Clarification / Revision'
                              : `${selectedLog.action} Action Captured`}
                          </p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            {selectedLog.action === 'DELETE'
                              ? `Removed by ${selectedLog.performer?.name || 'Staff'}. Review last captured state below.`
                              : selectedLog.summary}
                          </p>
                        </div>
                      </div>

                      {/* Structured Property Cards - 100% Theme Adaptive! */}
                      {diffAnalysis.businessKeys.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {diffAnalysis.businessKeys.map((key) => {
                            const val = diffAnalysis.newVals[key] !== undefined ? diffAnalysis.newVals[key] : diffAnalysis.oldVals[key];
                            return (
                              <div
                                key={key}
                                className={`p-3.5 rounded-2xl border space-y-1 transition-all ${
                                  isDark
                                    ? 'border-slate-800 bg-slate-900/60'
                                    : 'border-slate-200 bg-slate-50/80 shadow-xs'
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  {humanizeFieldName(key)}
                                </span>
                                <div className={`pt-0.5 font-bold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                  {formatFieldValue(val, key, isDark)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`p-8 text-center text-xs rounded-2xl border ${
                          isDark ? 'text-slate-500 bg-slate-900/40 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
                        }`}>
                          No additional structured properties attached to this ledger event.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                /* Raw JSON Side-by-Side Payload Mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Developer Technical Inspection</span>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 text-cyan-500 transition-colors ${
                        isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJson ? 'Copied JSON!' : 'Copy Entire Payload'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Old Values */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-rose-500 flex items-center justify-between">
                        <span>Previous State (Before)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          {selectedLog.old_values ? 'Captured Snapshot' : 'None / Null'}
                        </span>
                      </div>
                      <div className={`p-3 rounded-2xl border font-mono text-[11px] overflow-x-auto max-h-80 ${
                        isDark ? 'border-slate-800 bg-[#070B14] text-rose-300' : 'border-slate-200 bg-rose-50/40 text-rose-800'
                      }`}>
                        {selectedLog.old_values ? (
                          <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                        ) : (
                          <span className="text-slate-500 italic">No previous snapshot existed.</span>
                        )}
                      </div>
                    </div>

                    {/* New Values */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                        <span>New State (After Mutation)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {selectedLog.new_values ? 'Current Payload' : 'None / Deleted'}
                        </span>
                      </div>
                      <div className={`p-3 rounded-2xl border font-mono text-[11px] overflow-x-auto max-h-80 ${
                        isDark ? 'border-slate-800 bg-[#070B14] text-emerald-300' : 'border-slate-200 bg-emerald-50/40 text-emerald-800'
                      }`}>
                        {selectedLog.new_values ? (
                          <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                        ) : (
                          <span className="text-slate-500 italic">Record was deleted.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-between pt-3 border-t shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={handleCopyJson}
                className={`text-xs flex items-center gap-1.5 font-bold transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied to Clipboard!' : 'Copy Audit Summary'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDiffModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-transform active:scale-95 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
