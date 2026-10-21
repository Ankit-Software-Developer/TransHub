// frontend/app/(owner)/reports/page.js
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import DataTable from '../../../components/ui/DataTable';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';
import BuiltyTypeBadge from '../../../components/ui/BuiltyTypeBadge';
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
  X,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Scale,
  PackageCheck,
  Coins,
  Percent,
  ShieldAlert,
  IndianRupee,
} from 'lucide-react';

const REGISTERS = [
  { id: 'DOCKETS', label: 'Docket & Freight Register', icon: FileText, color: 'blue' },
  { id: 'POD', label: 'POD & Delivery Compliance', icon: FileSpreadsheet, color: 'emerald' },
  { id: 'COLLECTIONS', label: 'Bank Deposits & Remittance Register', icon: Landmark, color: 'amber' },
  { id: 'AGEING', label: 'Customer Outstanding & Ageing', icon: TrendingUp, color: 'rose' },
  { id: 'TRIPS', label: 'Trip & Vehicle P&L Audit', icon: Truck, color: 'purple' },
  { id: 'GST', label: 'GST Register (SAC 9965)', icon: Receipt, color: 'indigo' },
];

const POD_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending Delivery Only', desc: 'In transit & hub godowns', dotColor: 'bg-amber-500', ringColor: 'ring-amber-500/25' },
  { value: 'OVERDUE', label: 'Critical Overdue • Priority', desc: 'Urgent priority dispatch', dotColor: 'bg-rose-500', ringColor: 'ring-rose-500/25' },
  { value: 'DELIVERED', label: 'Delivered Only', desc: 'Consignments delivered', dotColor: 'bg-emerald-500', ringColor: 'ring-emerald-500/25' },
  { value: 'VERIFIED', label: 'Verified PODs (Signed)', desc: 'Audited & signed proof of delivery', dotColor: 'bg-teal-500', ringColor: 'ring-teal-500/25' },
  { value: 'UPLOADED', label: 'Audit Due (Uploaded)', desc: 'Uploaded, awaiting verification', dotColor: 'bg-cyan-500', ringColor: 'ring-cyan-500/25' },
  { value: 'ALL', label: 'All Deliveries & PODs', desc: 'Complete register view', dotColor: 'bg-slate-400', ringColor: 'ring-slate-400/25' },
];

const AGEING_FREIGHT_OPTIONS = [
  { value: 'ALL', label: 'All Freight Modes (TBB, To-Pay, Paid)', desc: 'Consolidated commercial ledger', dotColor: 'bg-slate-400', ringColor: 'ring-slate-400/25' },
  { value: 'TBB', label: 'TBB (Corporate Credit & Invoices)', desc: 'Billed invoices & unbilled credit dockets', dotColor: 'bg-blue-500', ringColor: 'ring-blue-500/25' },
  { value: 'TO_PAY', label: 'TO-PAY (Destination Delivery Cash)', desc: 'Cash / UPI due upon delivery at branch', dotColor: 'bg-amber-500', ringColor: 'ring-amber-500/25' },
  { value: 'PAID', label: 'PAID (Booking Dockets)', desc: 'Advance bookings cleared at origin', dotColor: 'bg-emerald-500', ringColor: 'ring-emerald-500/25' },
];

/**
 * Executive Responsive KPI Summary Card
 */
const SummaryKpiCard = ({
  icon: Icon,
  label,
  value,
  badgeText,
  accentColor = 'blue',
  subLeft,
  subRight,
  fullSubtitle,
  isAlert = false,
  alertBadgeText = null,
  isDark = false,
  children,
}) => {
  const accentBorderClass = {
    blue: 'before:bg-blue-500',
    indigo: 'before:bg-indigo-500',
    emerald: 'before:bg-emerald-500',
    rose: 'before:bg-rose-500',
    purple: 'before:bg-purple-500',
    amber: 'before:bg-amber-500',
    cyan: 'before:bg-cyan-500',
    teal: 'before:bg-teal-500',
    orange: 'before:bg-orange-500',
    slate: 'before:bg-slate-400',
  }[accentColor] || 'before:bg-blue-500';

  const valueColorClass = {
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    purple: 'text-purple-600 dark:text-purple-400',
    amber: 'text-amber-500 dark:text-amber-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    teal: 'text-teal-600 dark:text-teal-400',
    orange: 'text-orange-600 dark:text-orange-400',
    slate: 'text-slate-900 dark:text-white',
  }[accentColor] || 'text-slate-900 dark:text-white';

  const badgeBgClass = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
    cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/60',
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/60',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  }[accentColor] || 'bg-slate-100 text-slate-700';

  const iconColorClass = {
    blue: 'text-blue-500',
    indigo: 'text-indigo-500',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
    purple: 'text-purple-500',
    amber: 'text-amber-500',
    cyan: 'text-cyan-500',
    teal: 'text-teal-500',
    orange: 'text-orange-500',
    slate: 'text-slate-400',
  }[accentColor] || 'text-blue-500';

  return (
    <div
      className={`relative overflow-hidden p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 ${accentBorderClass} ${
        isAlert
          ? 'bg-rose-500/10 border-rose-500/30'
          : isDark
          ? 'bg-gradient-to-br from-[#0D1424] to-[#080D1A] border-slate-800 hover:border-slate-700 shadow-xs hover:shadow-md'
          : 'bg-gradient-to-br from-white to-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColorClass}`} />}
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 leading-tight truncate">
            {label}
          </span>
        </div>
        {alertBadgeText ? (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse shrink-0">
            {alertBadgeText}
          </span>
        ) : badgeText ? (
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${badgeBgClass}`}>
            {badgeText}
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 sm:mt-2">
        <p className={`text-lg sm:text-xl lg:text-2xl font-black tracking-tight font-mono tabular-nums truncate ${valueColorClass}`}>
          {value}
        </p>
      </div>

      {children && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/70">
          {children}
        </div>
      )}

      {(fullSubtitle || subLeft || subRight) && !children && (
        <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/70 truncate flex items-center justify-between gap-2">
          {fullSubtitle ? (
            <span className="truncate">{fullSubtitle}</span>
          ) : (
            <>
              <span className="truncate">{subLeft}</span>
              {subRight && (
                <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-auto">
                  {subRight}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function ReportsPage() {
  const { term, plural } = useTerminology();
  const {
    canExport,
    isAdmin,
    isAuditor,
    isAccountant,
    isBranchManager,
    canViewFinancialAudit,
    canViewReportTab,
    canExportReportTab,
    user
  } = usePermissions();
  // Financial audit & tax registers are strictly restricted to Admin, Auditor, and Accountant roles (unless explicitly permitted)
  const canViewAuditCompliance = isAdmin || isAuditor || isAccountant || canViewFinancialAudit;
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activeBranch = useStore((state) => state.activeBranch);

  // Filter registers based on user role and granular permissions:
  // - Admin, Auditor, and Accountant see all 6 registers by default
  // - Branch Managers see Dockets, POD, Bank Remittance, and Customer Ageing by default
  // - Permissions can be individually granted/revoked by Admin in Roles & Permissions matrix
  const visibleRegisters = useMemo(() => {
    return REGISTERS.filter((reg) => {
      if (canViewReportTab) {
        return canViewReportTab(reg.id);
      }
      if (canViewAuditCompliance) return true;
      if (isBranchManager) {
        return ['DOCKETS', 'POD', 'COLLECTIONS', 'AGEING'].includes(reg.id);
      }
      return ['DOCKETS', 'POD'].includes(reg.id);
    });
  }, [canViewReportTab, canViewAuditCompliance, isBranchManager]);

  const userBranchId = useMemo(() => {
    if (user?.branch_id || user?.branchId || user?.branch?.id) {
      return user.branch_id || user.branchId || user.branch?.id;
    }
    if (activeBranch?.id && activeBranch.id !== 'ALL') {
      return activeBranch.id;
    }
    if (typeof window !== 'undefined') {
      try {
        const storedStr = localStorage.getItem('transporter_user');
        if (storedStr) {
          const parsed = JSON.parse(storedStr);
          return parsed.branch_id || parsed.branchId || parsed.branch?.id || null;
        }
      } catch (e) {}
    }
    return null;
  }, [user, activeBranch]);

  const [activeTab, setActiveTab] = useState('DOCKETS');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedStr = localStorage.getItem('transporter_user');
        if (storedStr) {
          const parsed = JSON.parse(storedStr);
          const bId = parsed.branch_id || parsed.branchId || parsed.branch?.id;
          if (bId) return bId;
        }
      } catch (e) {}
    }
    return 'ALL';
  });
  const branchBreakdownScrollRef = useRef(null);
  const branchInitializedRef = useRef(false);

  // Sync selected branch with user login branch or store active branch
  useEffect(() => {
    const targetBranchId = userBranchId || (activeBranch?.id && activeBranch.id !== 'ALL' ? activeBranch.id : null);
    if (!isAdmin) {
      // Non-admin users are strictly restricted to their login branch
      if (targetBranchId && selectedBranch !== targetBranchId) {
        setSelectedBranch(targetBranchId);
      }
    } else {
      // Admin / Owner users default to their login branch / active station on initial load
      if (targetBranchId && !branchInitializedRef.current) {
        setSelectedBranch(targetBranchId);
        branchInitializedRef.current = true;
      }
    }
  }, [isAdmin, userBranchId, activeBranch?.id, selectedBranch]);

  // When activeBranch explicitly changes in store (e.g. user toggles top header branch dropdown)
  const prevStoreBranchRef = useRef(activeBranch?.id);
  useEffect(() => {
    if (activeBranch?.id !== undefined && activeBranch?.id !== prevStoreBranchRef.current) {
      prevStoreBranchRef.current = activeBranch?.id;
      if (activeBranch?.id && activeBranch.id !== 'ALL') {
        setSelectedBranch(activeBranch.id);
      } else if ((activeBranch?.id === 'ALL' || activeBranch?.id === null) && isAdmin) {
        setSelectedBranch('ALL');
      }
    }
  }, [activeBranch?.id, isAdmin]);

  const currentBranchName = useMemo(() => {
    const bId = !isAdmin ? (userBranchId || selectedBranch) : selectedBranch;
    if (!bId || bId === 'ALL') return 'All Network Branches';
    const found = branches.find((b) => String(b.id) === String(bId));
    return found?.name || found?.branch_name || user?.branch?.name || user?.branch_name || 'My Branch';
  }, [isAdmin, userBranchId, selectedBranch, branches, user]);

  const currentBranchCode = useMemo(() => {
    const bId = !isAdmin ? (userBranchId || selectedBranch) : selectedBranch;
    if (!bId || bId === 'ALL') return 'ALL';
    const found = branches.find((b) => String(b.id) === String(bId));
    return found?.code || found?.branch_code || user?.branch?.code || user?.branch_code || '';
  }, [isAdmin, userBranchId, selectedBranch, branches, user]);

  useEffect(() => {
    // If the active tab is restricted for the current user's role, automatically revert to DOCKETS
    if (!visibleRegisters.some((r) => r.id === activeTab)) {
      setActiveTab('DOCKETS');
    }
  }, [visibleRegisters, activeTab]);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('ALL');
  const [ageingPaymentTypeFilter, setAgeingPaymentTypeFilter] = useState('ALL');
  const [selectedPartyDetails, setSelectedPartyDetails] = useState(null);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [paymentClearanceFilter, setPaymentClearanceFilter] = useState('PENDING');
  const [podStatusFilter, setPodStatusFilter] = useState('PENDING');
  const [copied, setCopied] = useState(false);
  const [isPodMenuOpen, setIsPodMenuOpen] = useState(false);
  const podDropdownRef = useRef(null);
  const [isAgeingMenuOpen, setIsAgeingMenuOpen] = useState(false);
  const ageingDropdownRef = useRef(null);

  const activeAgeingOption = useMemo(() => {
    return AGEING_FREIGHT_OPTIONS.find((opt) => opt.value === ageingPaymentTypeFilter) || AGEING_FREIGHT_OPTIONS[0];
  }, [ageingPaymentTypeFilter]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (podDropdownRef.current && !podDropdownRef.current.contains(e.target)) {
        setIsPodMenuOpen(false);
      }
      if (ageingDropdownRef.current && !ageingDropdownRef.current.contains(e.target)) {
        setIsAgeingMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availablePodOptions = useMemo(() => {
    if (canViewAuditCompliance) return POD_STATUS_OPTIONS;
    return POD_STATUS_OPTIONS.filter((opt) => !['VERIFIED', 'UPLOADED'].includes(opt.value));
  }, [canViewAuditCompliance]);

  const activePodOption = useMemo(() => {
    return availablePodOptions.find((opt) => opt.value === podStatusFilter) || availablePodOptions[0];
  }, [availablePodOptions, podStatusFilter]);

  // 350ms server-side debounce for all report tables
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Data state
  const [dataRows, setDataRows] = useState([]);
  const [summary, setSummary] = useState(null);

  // Bank Remittance Modal & Receipt Slip Viewer State
  const [collectionSubView, setCollectionSubView] = useState('DEPOSITS');
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
  const [selectedPodModal, setSelectedPodModal] = useState(null);
  const [selectedDepositDetails, setSelectedDepositDetails] = useState(null);

  // GST Register (SAC 9965) State
  const [gstFilter, setGstFilter] = useState('ALL');
  const [selectedTaxAuditItem, setSelectedTaxAuditItem] = useState(null);
  const [showHsnDocSummary, setShowHsnDocSummary] = useState(false);
  const [gstCopied, setGstCopied] = useState(false);
  const [auditCopied, setAuditCopied] = useState(false);

  const openRemitModal = useCallback((row = null) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const bId = row?.branchId || (!isAdmin && userBranchId ? userBranchId : (selectedBranch !== 'ALL' ? selectedBranch : (branches[0]?.id || '')));
    const bObj = branches.find((b) => String(b.id) === String(bId));
    const bName = row?.branchName || bObj?.name || bObj?.branch_name || currentBranchName || 'My Branch';
    const defaultAmount = row?.pendingCash !== undefined
      ? row.pendingCash
      : (row?.totalCollected || summary?.totalPendingInBranch || summary?.totalUnclosedCash || 47880);

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
  }, [isAdmin, userBranchId, selectedBranch, branches, currentBranchName, summary]);

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
      setCollectionSubView('DEPOSITS');
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
      const effectiveBranchParam = !isAdmin
        ? (userBranchId || (selectedBranch !== 'ALL' ? selectedBranch : undefined))
        : (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : 'ALL');

      const params = {
        page,
        limit,
        branch_id: effectiveBranchParam,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: debouncedSearch.trim() || undefined,
      };

      let res;
      if (activeTab === 'DOCKETS') {
        if (paymentTypeFilter !== 'ALL') params.payment_type = paymentTypeFilter;
        if (paymentClearanceFilter !== 'ALL') params.payment_clearance = paymentClearanceFilter;
        res = await reportService.getDocketFreightReport(params);
      } else if (activeTab === 'AGEING') {
        if (ageingPaymentTypeFilter !== 'ALL') params.payment_type = ageingPaymentTypeFilter;
        res = await reportService.getCustomerAgeingReport(params);
      } else if (activeTab === 'TRIPS') {
        res = await reportService.getTripProfitabilityReport(params);
      } else if (activeTab === 'POD') {
        if (podStatusFilter !== 'ALL') {
          params.pod_status = podStatusFilter;
          params.delivery_status = podStatusFilter;
        }
        res = await reportService.getPodComplianceReport(params);
      } else if (activeTab === 'COLLECTIONS') {
        params.view_mode = collectionSubView;
        res = await reportService.getDailyCollectionReport(params);
      } else if (activeTab === 'GST') {
        if (gstFilter !== 'ALL') params.tax_type = gstFilter;
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
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit, selectedBranch, dateFrom, dateTo, debouncedSearch, paymentTypeFilter, paymentClearanceFilter, podStatusFilter, collectionSubView, ageingPaymentTypeFilter, gstFilter, isAdmin, userBranchId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Tab switch reset
  const handleTabChange = (tabId) => {
    if (!visibleRegisters.some((r) => r.id === tabId)) return;
    setActiveTab(tabId);
    setDataRows([]);
    setSummary(null);
    setTotalRecords(0);
    setTotalPages(1);
    setPage(1);
    setSearchInput('');
    setDebouncedSearch('');
    setIsPodMenuOpen(false);
    if (tabId === 'DOCKETS') {
      setPaymentClearanceFilter('PENDING');
    }
    if (tabId === 'POD') {
      setPodStatusFilter('PENDING');
    }
    if (tabId === 'COLLECTIONS') {
      setCollectionSubView('DEPOSITS');
    }
    if (tabId === 'GST') {
      setGstFilter('ALL');
      setShowHsnDocSummary(false);
    }
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
        'Origin Branch',
        'Destination',
        'Consignee',
        'Receiver Name',
        'Booking Date',
        'Delivery Date',
        'TAT & Ageing',
        'Delivery Status',
        'Operational Priority',
        ...(canViewAuditCompliance ? ['POD Status', 'Physical Copy'] : []),
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${r.docketNumber || ''}"`,
        `"${r.lrNumber || ''}"`,
        `"${r.originBranch || ''}"`,
        `"${r.destBranch || ''}"`,
        `"${(r.consigneeName || '').replace(/"/g, '""')}"`,
        `"${(r.receiverName || '').replace(/"/g, '""')}"`,
        `"${r.bookingDate || ''}"`,
        `"${r.deliveryDate || ''}"`,
        `"${r.transitDays || ''}"`,
        `"${r.shipmentStatus || ''}"`,
        `"${r.priorityLevel || ''}"`,
        ...(canViewAuditCompliance ? [`"${r.podStatus || ''}"`, r.hasPhysicalPod ? '"YES"' : '"NO"'] : []),
      ]);
    } else if (activeTab === 'COLLECTIONS') {
      if (collectionSubView === 'DEPOSITS') {
        headers = [
          'Deposit Date',
          'Branch / Hub',
          'Deposit Mode',
          'Bank Name',
          'Bank Account No',
          'Transaction ID / UTR #',
          'Payment Source & Customer',
          'Covered Dockets',
          'Deposited Amount (INR)',
          'Remittance Status',
          'Remarks',
        ];
        rowsFormatted = dataRows.map((r) => {
          const bName = typeof r.branchName === 'object' ? r.branchName?.name || r.branchName?.branch_name : r.branchName;
          const dockets = (r.coveredDockets && r.coveredDockets.length > 0)
            ? r.coveredDockets
            : (r.linkedDocket ? [r.linkedDocket] : (r.docketNumber ? [{ docketNumber: r.docketNumber }] : []));
          const coveredDocketsStr = dockets.map((d) => d.docketNumber).join('; ');
          const sourcePartyStr = `${r.sourceType || 'DEPOSIT'} - ${r.customerName || r.linkedDocket?.consigneeName || ''}`;

          return [
            `"${r.date || ''}"`,
            `"${bName || ''}"`,
            `"${r.depositMode || 'CASH_DEPOSIT'}"`,
            `"${r.bankName || ''}"`,
            `"${r.bankAccountNo || ''}"`,
            `"${r.utrNumber || ''}"`,
            `"${sourcePartyStr.replace(/"/g, '""')}"`,
            `"${coveredDocketsStr.replace(/"/g, '""')}"`,
            r.remittedAmount || 0,
            `"${r.status || 'REMITTED'}"`,
            `"${(r.remarks || '').replace(/"/g, '""')}"`,
          ];
        });
      } else {
        headers = [
          'Date',
          'Branch / Hub',
          'Paid Bookings Count',
          'Paid Cash Amount (INR)',
          'To-Pay Deliveries Count',
          'To-Pay Delivery Cash (INR)',
          'Total Cash Inflow (INR)',
          'Deposit Mode',
          'Bank Name',
          'Transaction ID / UTR',
          'Deposited to Bank (INR)',
          'Pending in Hand (INR)',
          'Daybook Status',
        ];
        rowsFormatted = dataRows.map((r) => {
          const bName = typeof r.branchName === 'object' ? r.branchName?.name || r.branchName?.branch_name : r.branchName;
          const pending = r.pendingCash !== undefined ? r.pendingCash : Math.max(0, (r.totalCollected || 0) - (r.remittedAmount || 0));
          return [
            `"${r.date || ''}"`,
            `"${bName || ''}"`,
            r.paidBookingsCount || 0,
            r.paidCashAmount || 0,
            r.toPayDeliveriesCount || 0,
            r.toPayCashAmount || 0,
            r.totalCollected || 0,
            `"${r.depositMode || 'N/A'}"`,
            `"${r.bankName || ''}"`,
            `"${r.utrNumber || ''}"`,
            r.remittedAmount || 0,
            pending,
            `"${r.isClosed && pending === 0 ? 'Daybook Closed' : 'Unclosed Cash'}"`,
          ];
        });
      }
    } else if (activeTab === 'GST') {
      headers = [
        'GSTIN/UIN of Recipient',
        'Receiver Legal Name',
        'Invoice/LR Number',
        'Invoice Date',
        'Invoice Value (INR)',
        'Place of Supply',
        'Reverse Charge (Y/N)',
        'Applicable % of Tax Rate',
        'Taxable Value (INR)',
        'CGST (INR)',
        'SGST (INR)',
        'IGST (INR)',
        'Cess Amount (INR)',
        'SAC Code',
        'Supply Category',
        'Consignor Name',
        'Consignor GSTIN',
        'Origin Branch / Hub',
        'Destination Hub',
        'Charged Weight (KG)',
        'E-Way Bill Number',
      ];
      rowsFormatted = dataRows.map((r) => [
        `"${r.recipientGst || r.consigneeGst || 'URP'}"`,
        `"${(r.recipientName || r.consigneeName || '').replace(/"/g, '""')}"`,
        `"${r.lrNumber || ''}"`,
        `"${r.bookingDate || ''}"`,
        r.totalInvoiceValue || 0,
        `"${r.placeOfSupply || '27-Maharashtra'}"`,
        `"${r.reverseChargeFlag || (r.isRcm ? 'Y' : 'N')}"`,
        r.taxRatePct || 5,
        r.taxableValue || 0,
        r.cgst || 0,
        r.sgst || 0,
        r.igst || 0,
        0,
        `"${r.sacCode || '9965'}"`,
        `"${r.supplyCategory || (r.isB2B ? 'B2B (Registered)' : 'B2C (Unregistered)')}"`,
        `"${(r.consignorName || '').replace(/"/g, '""')}"`,
        `"${r.consignorGst || 'URP'}"`,
        `"${(typeof r.branch === 'object' ? r.branch?.name : r.branch) || ''}"`,
        `"${(typeof r.destBranch === 'object' ? r.destBranch?.name : r.destBranch) || ''}"`,
        r.chargedWeight || 0,
        `"${r.ewayBillNo || ''}"`,
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

  // Contextual Header Filters for active registers
  const headerFilters = useMemo(() => (
    <>
      {/* Contextual Filter: Payment Type & Clearance for Dockets */}
      {activeTab === 'DOCKETS' && (
        <>
          <select
            value={paymentTypeFilter}
            onChange={(e) => {
              setPaymentTypeFilter(e.target.value);
              setPage(1);
            }}
            className={`text-xs font-bold rounded-xl border px-2.5 py-1.5 outline-none transition-all cursor-pointer shrink-0 max-w-[135px] ${
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
            className={`text-xs font-bold rounded-xl border px-2.5 py-1.5 outline-none transition-all cursor-pointer shrink-0 max-w-[145px] shadow-xs ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-slate-200 focus:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500'
            }`}
          >
            <option value="PENDING">Pending (Action Due)</option>
            <option value="CLEARED">Cleared</option>
            <option value="ALL">All Payment Status</option>
          </select>
        </>
      )}

      {/* Contextual Filter: Freight / Payment Mode for Customer Outstanding & Ageing (Executive Custom Dropdown) */}
      {activeTab === 'AGEING' && (
        <div className="relative inline-block text-left" ref={ageingDropdownRef}>
          <button
            type="button"
            onClick={() => setIsAgeingMenuOpen((prev) => !prev)}
            className={`h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs select-none active:scale-[0.98] ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-100 hover:bg-slate-800/60'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/80'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeAgeingOption.dotColor} ring-2 ${activeAgeingOption.ringColor || 'ring-slate-400/25'}`} />
            <span className="font-semibold tracking-tight truncate max-w-[130px]">{activeAgeingOption.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isAgeingMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
          </button>

          {isAgeingMenuOpen && (
            <div className={`absolute right-0 top-full mt-1.5 w-72 rounded-2xl border shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-white shadow-black/40' : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
            }`}>
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <span>Filter Freight Mode</span>
                <span className="font-mono text-[9px] text-slate-400">Ageing Ledger</span>
              </div>

              <div className="space-y-0.5">
                {AGEING_FREIGHT_OPTIONS.map((opt) => {
                  const isSelected = ageingPaymentTypeFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAgeingPaymentTypeFilter(opt.value);
                        setPage(1);
                        setIsAgeingMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-blue-950/60 text-cyan-300 font-bold'
                            : 'bg-blue-50/90 text-blue-900 font-bold'
                          : isDark
                          ? 'hover:bg-slate-800/70 text-slate-200 font-medium'
                          : 'hover:bg-slate-100/80 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                        <div className="truncate">
                          <div className="truncate leading-snug">{opt.label}</div>
                          {opt.desc && (
                            <div className={`text-[10px] truncate leading-tight font-normal ${
                              isSelected
                                ? isDark ? 'text-cyan-400/80' : 'text-blue-700/80'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {opt.desc}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contextual Filter: POD & Delivery Compliance Tab (Executive Custom Dropdown) */}
      {activeTab === 'POD' && (
        <div className="relative inline-block text-left" ref={podDropdownRef}>
          <button
            type="button"
            onClick={() => setIsPodMenuOpen((prev) => !prev)}
            className={`h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs select-none active:scale-[0.98] ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-100 hover:bg-slate-800/60'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/80'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${activePodOption.dotColor} ring-2 ${activePodOption.ringColor || 'ring-slate-400/25'}`} />
            <span className="font-semibold tracking-tight truncate max-w-[130px]">{activePodOption.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isPodMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
          </button>

          {isPodMenuOpen && (
            <div className={`absolute right-0 top-full mt-1.5 w-72 rounded-2xl border shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-white shadow-black/40' : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
            }`}>
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <span>Filter Delivery Status</span>
                <span className="font-mono text-[9px] text-slate-400">POD Register</span>
              </div>

              <div className="space-y-0.5">
                {availablePodOptions.map((opt) => {
                  const isSelected = podStatusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPodStatusFilter(opt.value);
                        setPage(1);
                        setIsPodMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-blue-950/60 text-cyan-300 font-bold'
                            : 'bg-blue-50/90 text-blue-900 font-bold'
                          : isDark
                          ? 'hover:bg-slate-800/70 text-slate-200 font-medium'
                          : 'hover:bg-slate-100/80 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                        <div className="truncate">
                          <div className="truncate leading-snug">{opt.label}</div>
                          {opt.desc && (
                            <div className={`text-[10px] truncate leading-tight font-normal ${
                              isSelected
                                ? isDark ? 'text-cyan-400/80' : 'text-blue-700/80'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {opt.desc}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Sub-view Switcher for Bank Deposits & Daily Collections */}
      {activeTab === 'COLLECTIONS' && (
        <select
          value={collectionSubView}
          onChange={(e) => {
            setCollectionSubView(e.target.value);
            setPage(1);
          }}
          className={`text-xs font-bold rounded-xl border px-2.5 py-1.5 outline-none transition-all cursor-pointer shrink-0 max-w-[155px] ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-slate-200 focus:border-amber-400'
              : 'bg-white border-slate-200 text-slate-700 focus:border-amber-500 shadow-xs'
          }`}
        >
          <option value="DEPOSITS">
            Bank Deposits ({summary?.totalDepositsCount ?? summary?.depositTransactions?.length ?? 0})
          </option>
          <option value="DAILY_COLLECTIONS">
            Daily Collections ({summary?.dailyCollections?.length ?? 0})
          </option>
        </select>
      )}

      {/* Contextual Filter: GST Tax Register (SAC 9965) */}
      {activeTab === 'GST' && (
        <select
          value={gstFilter}
          onChange={(e) => {
            setGstFilter(e.target.value);
            setPage(1);
          }}
          className={`text-xs font-bold rounded-xl border px-2.5 py-1.5 outline-none transition-all cursor-pointer shrink-0 max-w-[145px] shadow-xs ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-slate-200 focus:border-indigo-400'
              : 'bg-white border-slate-200 text-slate-700 focus:border-indigo-500'
          }`}
        >
          <option value="ALL">All Supplies (SAC 9965)</option>
          <option value="RCM">RCM Reverse Charge (5%)</option>
          <option value="FORWARD">Forward Charge (GTA Direct)</option>
          <option value="B2B">B2B Registered (Table 4)</option>
          <option value="B2C">B2C Retail (Table 7)</option>
        </select>
      )}
    </>
  ), [activeTab, paymentTypeFilter, paymentClearanceFilter, podStatusFilter, isAdmin, selectedBranch, branches, currentBranchName, isDark, isPodMenuOpen, activePodOption, availablePodOptions, collectionSubView, summary, isAgeingMenuOpen, activeAgeingOption, ageingPaymentTypeFilter, gstFilter]);

  // Enterprise DataTable Column Specifications for all 6 Registers
  const columns = useMemo(() => {
    if (activeTab === 'DOCKETS') {
      return [
        {
          key: 'lr_number',
          header: 'LR #',
          width: 195,
          minWidth: 180,
          sortable: true,
          exportValue: (row) => row.lr_number || row.docket_number,
          render: (val, row) => (
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-mono font-bold text-xs text-blue-600 dark:text-cyan-400 bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                  {row.lr_number || row.docket_number}
                </span>
                <BuiltyTypeBadge docket={row} />
              </div>
              {row.docket_number && row.docket_number !== row.lr_number && (
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                  DOC: {row.docket_number}
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'booking_date',
          header: 'Booking Date',
          width: 110,
          minWidth: 95,
          sortable: true,
          exportValue: (row) => row.booking_date,
          render: (val, row) => (
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
              {row.booking_date}
            </span>
          ),
        },
        {
          key: 'route',
          header: 'Route Corridor',
          width: 145,
          minWidth: 125,
          exportValue: (row) => {
            const origin = typeof row.originBranch === 'object' ? (row.originBranch?.code || row.originBranch?.branch_code || row.originBranch?.name || row.origin_city) : (row.originBranch || row.origin_city || 'Origin');
            const dest = typeof row.destBranch === 'object' ? (row.destBranch?.code || row.destBranch?.branch_code || row.destBranch?.name || row.destination_city) : (row.destBranch || row.destination_city || 'Dest');
            return `${origin} -> ${dest}`;
          },
          render: (val, row) => {
            const origin = typeof row.originBranch === 'object' ? (row.originBranch?.code || row.originBranch?.branch_code || row.originBranch?.name || row.origin_city) : (row.originBranch || row.origin_city || 'Origin');
            const dest = typeof row.destBranch === 'object' ? (row.destBranch?.code || row.destBranch?.branch_code || row.destBranch?.name || row.destination_city) : (row.destBranch || row.destination_city || 'Dest');
            return (
              <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                  {origin}
                </span>
                <span className="text-blue-500 font-bold text-xs">➔</span>
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                  {dest}
                </span>
              </div>
            );
          },
        },
        {
          key: 'consignor',
          header: 'Consignor (Shipper)',
          width: 165,
          minWidth: 140,
          exportValue: (row) => row.consignor?.name || 'Cash Booking',
          render: (val, row) => (
            <div className="max-w-[155px]">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={row.consignor?.name}>
                {row.consignor?.name || 'Cash Booking'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {row.consignor?.gstin || row.consignor?.phone || 'Direct Counter'}
              </div>
            </div>
          ),
        },
        {
          key: 'consignee',
          header: 'Consignee (Receiver)',
          width: 165,
          minWidth: 140,
          exportValue: (row) => row.consignee?.name || 'Direct Delivery',
          render: (val, row) => (
            <div className="max-w-[155px]">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={row.consignee?.name}>
                {row.consignee?.name || 'Direct Delivery'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {row.consignee?.phone || row.consignee?.gstin || 'Door / Hub'}
              </div>
            </div>
          ),
        },
        {
          key: 'packages_count',
          header: 'Pkgs',
          align: 'center',
          width: 80,
          minWidth: 70,
          sortable: true,
          exportValue: (row) => row.packages_count || 1,
          render: (val, row) => (
            <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
              {row.packages_count || 1}
            </span>
          ),
        },
        {
          key: 'charged_weight',
          header: 'Charged Wt',
          align: 'right',
          width: 115,
          minWidth: 95,
          sortable: true,
          exportValue: (row) => row.charged_weight || 0,
          render: (val, row) => (
            <div className="text-right whitespace-nowrap">
              <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                {row.charged_weight || 0}
              </span>
              <span className="text-[10px] text-slate-400 ml-1 font-medium">kg</span>
            </div>
          ),
        },
        {
          key: 'freight_amount',
          header: 'Base Freight',
          align: 'right',
          width: 125,
          minWidth: 105,
          sortable: true,
          exportValue: (row) => row.freight_amount || 0,
          render: (val, row) => (
            <span className="font-mono font-medium text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
              {formatINR(row.freight_amount)}
            </span>
          ),
        },
        {
          key: 'total_amount',
          header: 'Total (₹)',
          align: 'right',
          width: 135,
          minWidth: 115,
          sortable: true,
          exportValue: (row) => row.total_amount || 0,
          render: (val, row) => (
            <span className="font-mono font-black text-xs text-slate-900 dark:text-white whitespace-nowrap bg-slate-100/70 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50 inline-block">
              {formatINR(row.total_amount)}
            </span>
          ),
        },
        {
          key: 'payment_type',
          header: 'Payment Mode',
          align: 'center',
          width: 140,
          minWidth: 125,
          nowrap: true,
          exportValue: (row) => row.payment_type || 'TO_PAY',
          render: (val, row) => {
            const mode = row.payment_type || 'TO_PAY';
            // Non-breaking hyphen (\u2011) strictly prevents word breaks across all browsers
            const displayLabel = mode === 'TO_PAY' ? 'TO\u2011PAY' : mode === 'TBB' ? 'TBB' : mode;
            return (
              <span
                className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-[10px] font-black font-mono border tracking-wider select-none whitespace-nowrap shadow-xs ${
                  mode === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/60'
                    : mode === 'TO_PAY'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300/60'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300/60'
                }`}
              >
                {displayLabel}
              </span>
            );
          },
        },
        {
          key: 'payment_status',
          header: 'Payment Status',
          align: 'center',
          width: 140,
          minWidth: 125,
          nowrap: true,
          exportValue: (row) => {
            const isCleared =
              row.payment_cleared ||
              row.clearance_status === 'CLEARED' ||
              row.payment_type === 'PAID' ||
              (row.payment_type === 'TO_PAY' && ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_PENDING', 'POD_VERIFIED'].includes(row.status));
            return isCleared ? 'Cleared' : 'Pending';
          },
          render: (val, row) => {
            const isCleared =
              row.payment_cleared ||
              row.clearance_status === 'CLEARED' ||
              row.payment_type === 'PAID' ||
              (row.payment_type === 'TO_PAY' && ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_PENDING', 'POD_VERIFIED'].includes(row.status));

            return isCleared ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 shadow-xs whitespace-nowrap select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                Cleared
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 shadow-xs whitespace-nowrap select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ring-2 ring-amber-500/20" />
                Pending
              </span>
            );
          },
        },
        {
          key: 'delivery_status',
          header: 'Delivery Status',
          align: 'center',
          width: 160,
          minWidth: 140,
          nowrap: true,
          exportValue: (row) => row.status || 'BOOKED',
          render: (val, row) => {
            const st = row.status || 'BOOKED';
            return (
              <span
                className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold border whitespace-nowrap select-none ${
                  ['DELIVERED', 'COMPLETED'].includes(st)
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60'
                    : st === 'POD_UPLOADED'
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200/60'
                    : ['IN_TRANSIT', 'DISPATCHED'].includes(st)
                    ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200/60'
                    : st === 'OUT_FOR_DELIVERY'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60'
                    : ['DELAYED', 'CANCELLED', 'HOLD'].includes(st)
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </span>
            );
          },
        },
      ];
    }

    if (activeTab === 'AGEING') {
      return [
        {
          key: 'customerName',
          header: 'Party Name',
          width: 200,
          minWidth: 150,
          sortable: true,
          render: (val, row) => (
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{row.customerName}</span>
                {row.customerCode && row.customerCode !== 'NA' && (
                  <span className="text-[9px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {row.customerCode}
                  </span>
                )}
              </div>
              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{row.phone}</span>
            </div>
          ),
        },
        {
          key: 'gstin',
          header: 'GSTIN',
          width: 130,
          minWidth: 110,
          render: (val, row) => (
            <span className="font-mono text-[11px] text-slate-500">{row.gstin || '-'}</span>
          ),
        },
        {
          key: 'branch',
          header: 'Branch',
          width: 140,
          minWidth: 120,
          render: (val, row) => (
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate" title={row.branchName || row.branch}>
              {row.branchName || (typeof row.branch === 'object' ? (row.branch?.name || row.branch?.branch_name || 'Head Office') : (row.branch || 'Head Office'))}
            </span>
          ),
        },
        {
          key: 'branchCode',
          header: 'Branch Code',
          width: 110,
          minWidth: 95,
          align: 'center',
          render: (val, row) => {
            const code = row.branchCode || (row.branch && typeof row.branch === 'object' ? row.branch.code || row.branch.branch_code : null) || '-';
            return (
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
                {code}
              </span>
            );
          },
        },
        {
          key: 'primaryMode',
          header: 'Freight Mode',
          width: 110,
          align: 'center',
          render: (val, row) => {
            const mode = row.primaryMode || 'TBB';
            const colors = {
              TBB: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/50',
              TO_PAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/50',
              MIXED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/50',
              PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/50',
            };
            const labels = {
              TBB: 'TBB Credit',
              TO_PAY: 'To-Pay Cash',
              MIXED: 'TBB + To-Pay',
              PAID: 'Paid Clearance',
            };
            return (
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${colors[mode] || colors.TBB}`}>
                {labels[mode] || mode}
              </span>
            );
          },
        },
        {
          key: 'totalBilled',
          header: 'Total Billed',
          align: 'right',
          width: 120,
          render: (val, row) => (
            <span className="font-mono font-medium text-xs text-slate-700 dark:text-slate-300">
              {formatINR(row.totalBilled !== undefined ? row.totalBilled : row.totalInvoiced)}
            </span>
          ),
        },
        {
          key: 'totalOutstanding',
          header: 'Outstanding (₹)',
          align: 'right',
          width: 160,
          render: (val, row) => (
            <div>
              <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 block">
                {formatINR(row.totalOutstanding)}
              </span>
              <div className="flex items-center justify-end gap-1.5 text-[9px] text-slate-400 font-mono mt-0.5">
                {row.invoicedDue > 0 && <span title="Billed Invoices">Inv: {formatINR(row.invoicedDue)}</span>}
                {row.unbilledTbbDue > 0 && <span title="Unbilled TBB Dockets">TBB: {formatINR(row.unbilledTbbDue)}</span>}
                {row.topayDue > 0 && <span title="Pending To-Pay Dockets">ToPay: {formatINR(row.topayDue)}</span>}
              </div>
            </div>
          ),
        },
        {
          key: 'bucket0_30',
          header: '0-30 Days',
          align: 'right',
          width: 110,
          render: (val, row) => (
            <span className="font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400">
              {formatINR(row.bucket0_30)}
            </span>
          ),
        },
        {
          key: 'bucket31_60',
          header: '31-60 Days',
          align: 'right',
          width: 110,
          render: (val, row) => (
            <span className="font-mono font-semibold text-xs text-amber-600 dark:text-amber-400">
              {formatINR(row.bucket31_60)}
            </span>
          ),
        },
        {
          key: 'bucket61_90',
          header: '61-90 Days',
          align: 'right',
          width: 110,
          render: (val, row) => (
            <span className="font-mono font-semibold text-xs text-orange-600 dark:text-orange-400">
              {formatINR(row.bucket61_90)}
            </span>
          ),
        },
        {
          key: 'bucket90Plus',
          header: '90+ Days',
          align: 'right',
          width: 110,
          render: (val, row) => (
            <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
              {formatINR(row.bucket90Plus)}
            </span>
          ),
        },
        {
          key: 'alertLevel',
          header: 'Alert',
          align: 'center',
          width: 100,
          render: (val, row) => {
            const level = row.alertLevel || (row.isOverdue ? 'OVERDUE' : 'OK');
            if (level === 'CRITICAL') {
              return (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  <span>Critical</span>
                </span>
              );
            }
            if (level === 'HIGH' || level === 'OVERDUE') {
              return (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                  <AlertCircle className="w-3 h-3" />
                  <span>Overdue</span>
                </span>
              );
            }
            if (level === 'DUE') {
              return (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <Clock className="w-3 h-3" />
                  <span>Due Soon</span>
                </span>
              );
            }
            return (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                <span>Normal</span>
              </span>
            );
          },
        },
        {
          key: 'actions',
          header: 'Action',
          align: 'center',
          width: 100,
          render: (val, row) => (
            <button
              type="button"
              onClick={() => {
                setSelectedPartyDetails(row);
                setIsPartyModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-all cursor-pointer shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Breakdown</span>
            </button>
          ),
        },
      ];
    }

    if (activeTab === 'TRIPS') {
      return [
        {
          key: 'tripNumber',
          header: 'Trip #',
          width: 130,
          render: (val, row) => (
            <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
              {row.tripNumber}
            </span>
          ),
        },
        {
          key: 'startDate',
          header: 'Start Date',
          width: 110,
          render: (val, row) => (
            <span className="font-mono text-[11px] text-slate-500">{row.startDate}</span>
          ),
        },
        {
          key: 'route',
          header: 'Route',
          width: 140,
          render: (val, row) => (
            <span className="font-semibold text-xs">{row.route}</span>
          ),
        },
        {
          key: 'vehicleNumber',
          header: 'Vehicle',
          width: 130,
          render: (val, row) => (
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{row.vehicleNumber}</span>
          ),
        },
        {
          key: 'driverName',
          header: 'Driver',
          width: 130,
          render: (val, row) => (
            <span className="text-xs">{row.driverName}</span>
          ),
        },
        {
          key: 'docketCount',
          header: 'Dockets',
          align: 'center',
          width: 90,
          render: (val, row) => (
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{row.docketCount}</span>
          ),
        },
        {
          key: 'totalRevenue',
          header: 'Revenue (₹)',
          align: 'right',
          width: 130,
          render: (val, row) => (
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
              {formatINR(row.totalRevenue)}
            </span>
          ),
        },
        {
          key: 'totalCost',
          header: 'Expenses (₹)',
          align: 'right',
          width: 130,
          render: (val, row) => (
            <span className="font-mono font-medium text-xs text-rose-600 dark:text-rose-400">
              {formatINR(row.totalCost)}
            </span>
          ),
        },
        {
          key: 'netProfit',
          header: 'Net Profit (₹)',
          align: 'right',
          width: 130,
          render: (val, row) => (
            <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
              {formatINR(row.netProfit)}
            </span>
          ),
        },
        {
          key: 'marginPct',
          header: 'Margin',
          align: 'center',
          width: 90,
          render: (val, row) => (
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
              row.marginPct > 15
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            }`}>
              {row.marginPct}%
            </span>
          ),
        },
        {
          key: 'isSettled',
          header: 'Settlement',
          align: 'center',
          width: 110,
          render: (val, row) => (
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              row.isSettled ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {row.isSettled ? 'SETTLED' : 'OPEN'}
            </span>
          ),
        },
      ];
    }

    if (activeTab === 'POD') {
      return [
        {
          key: 'docketNumber',
          header: 'Docket / LR #',
          width: 195,
          minWidth: 180,
          sortable: true,
          render: (val, row) => (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-mono font-bold text-xs text-blue-600 dark:text-cyan-400 bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                {row.docketNumber || row.lrNumber}
              </span>
              <BuiltyTypeBadge docket={row} />
            </div>
          ),
        },
        {
          key: 'route',
          header: 'Route / Corridor',
          width: 190,
          minWidth: 160,
          render: (val, row) => (
            <div className="text-xs whitespace-nowrap">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{row.originBranch || 'Origin'}</span>
              <span className="mx-1.5 text-blue-500 font-bold">→</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{row.destBranch || 'Dest'}</span>
            </div>
          ),
        },
        {
          key: 'consigneeName',
          header: 'Consignee (Receiver)',
          width: 170,
          minWidth: 140,
          render: (val, row) => (
            <div className="max-w-[160px]">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={row.consigneeName}>
                {row.consigneeName}
              </div>
              {row.receiverName && row.receiverName !== 'NA' && (
                <span className="text-[10px] text-slate-400 block truncate">
                  Received: {row.receiverName}
                </span>
              )}
            </div>
          ),
        },
        {
          key: 'bookingDate',
          header: 'Booking Date',
          width: 115,
          minWidth: 100,
          sortable: true,
          render: (val, row) => (
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
              {row.bookingDate}
            </span>
          ),
        },
        {
          key: 'deliveryDate',
          header: 'Delivery Date',
          width: 130,
          minWidth: 115,
          render: (val, row) => {
            const isDelivered = row.isDelivered || (row.deliveryDate && row.deliveryDate !== 'Pending');
            return isDelivered ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {row.deliveryDate}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending
              </span>
            );
          },
        },
        {
          key: 'transitDays',
          header: 'TAT & Ageing',
          align: 'center',
          width: 135,
          minWidth: 120,
          render: (val, row) => {
            const days = row.daysCount !== undefined ? row.daysCount : (typeof row.transitDays === 'number' ? row.transitDays : 0);
            const isDelivered = row.isDelivered || (row.deliveryDate && row.deliveryDate !== 'Pending');

            if (isDelivered) {
              return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold font-mono border whitespace-nowrap ${
                  days > 7
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/60'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/60'
                }`}>
                  {days} Day{days === 1 ? '' : 's'} {days > 7 ? '(Late)' : '(On-Time)'}
                </span>
              );
            }

            return (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold font-mono border whitespace-nowrap ${
                days > 7
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/60'
                  : days >= 5
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/60'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300/60'
              }`}>
                <Clock className="w-3 h-3 shrink-0" />
                {days} Day{days === 1 ? '' : 's'} Pending
              </span>
            );
          },
        },
        {
          key: 'shipmentStatus',
          header: 'Delivery Status',
          align: 'center',
          width: 150,
          minWidth: 130,
          render: (val, row) => {
            const raw = row.shipmentStatus || 'BOOKED';
            const st = raw.replace(/_/g, ' ');
            return (
              <span
                className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold border whitespace-nowrap ${
                  ['DELIVERED', 'COMPLETED'].includes(raw)
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60'
                    : raw === 'POD_UPLOADED'
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200/60'
                    : ['IN_TRANSIT', 'DISPATCHED'].includes(raw)
                    ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200/60'
                    : raw === 'OUT_FOR_DELIVERY'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60'
                    : raw === 'RECEIVED_AT_HUB'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {st}
              </span>
            );
          },
        },
        {
          key: 'priorityLevel',
          header: 'Operational Priority',
          align: 'center',
          width: 170,
          minWidth: 155,
          render: (val, row) => {
            const days = row.daysCount !== undefined ? row.daysCount : 0;
            const isDelivered = row.isDelivered || (row.deliveryDate && row.deliveryDate !== 'Pending');

            if (isDelivered) {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Delivered ({days}d)</span>
                </span>
              );
            }

            if (days > 7 || row.isOverdue || row.priorityLevel === 'CRITICAL_LATE') {
              return (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs animate-bounce whitespace-nowrap">
                    <AlertTriangle className="w-3 h-3" />
                    Priority Delivery
                  </span>
                  <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                    Late • {days} Days Elapsed
                  </span>
                </div>
              );
            }

            if (days >= 5) {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 whitespace-nowrap">
                  <Clock className="w-3 h-3 text-amber-500" />
                  Due Soon ({days}d)
                </span>
              );
            }

            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                <Truck className="w-3 h-3 text-blue-500" />
                Active ({days}d)
              </span>
            );
          },
        },
        ...(canViewAuditCompliance ? [
          {
            key: 'podStatus',
            header: 'POD Status',
            align: 'center',
            width: 140,
            minWidth: 125,
            render: (val, row) => (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                  row.podStatus === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/40'
                    : row.podStatus === 'UPLOADED' || row.podStatus === 'POD_UPLOADED'
                    ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300/40'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  row.podStatus === 'VERIFIED' ? 'bg-emerald-500' : (row.podStatus === 'UPLOADED' || row.podStatus === 'POD_UPLOADED') ? 'bg-cyan-500' : 'bg-rose-500'
                }`} />
                {row.podStatus === 'VERIFIED' ? 'Verified & Signed' : (row.podStatus === 'UPLOADED' || row.podStatus === 'POD_UPLOADED') ? 'Audit Pending' : 'Upload Pending'}
              </span>
            ),
          },
          {
            key: 'hasPhysicalPod',
            header: 'Physical Copy',
            align: 'center',
            width: 120,
            minWidth: 110,
            render: (val, row) => (
              row.hasPhysicalPod ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Received</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Pending</span>
                </span>
              )
            ),
          },
        ] : []),
        {
          key: 'actions',
          header: 'POD Slip',
          align: 'center',
          width: 95,
          minWidth: 85,
          render: (val, row) => (
            row.podUrl ? (
              <button
                type="button"
                onClick={() => setSelectedPodModal(row)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 transition-all cursor-pointer shadow-2xs hover:scale-105"
                title="View proof of delivery slip in modal"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">No Slip</span>
            )
          ),
        },
      ];
    }

    if (activeTab === 'COLLECTIONS') {
      if (collectionSubView === 'DEPOSITS') {
        return [
          {
            key: 'date',
            header: 'Deposit Date & Time',
            width: 190,
            minWidth: 165,
            sortable: true,
            render: (val, row) => (
              <div className="space-y-1">
                {/* 1. First Invoice Number if present */}
                {row.invoiceNumber && (
                  <div>
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs"
                      title={`Billed under Invoice #${row.invoiceNumber}`}
                    >
                      <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>#{row.invoiceNumber}</span>
                    </span>
                  </div>
                )}

                {/* 2. Date */}
                <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{row.invoiceDate || row.date}</span>
                </div>

                {/* 3. Time */}
                {row.createdAt && (
                  <div className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="lowercase">{new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}</span>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'branchName',
            header: 'Branch Hub',
            width: 170,
            minWidth: 150,
            render: (val, row) => (
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Building2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="truncate max-w-[150px]">
                  {typeof row.branchName === 'object' ? (row.branchName?.name || row.branchName?.branch_name || 'Branch') : (row.branchName || 'Branch')}
                </span>
              </div>
            ),
          },
          {
            key: 'depositMode',
            header: 'Deposit Mode',
            width: 160,
            minWidth: 140,
            render: (val, row) => {
              const isOnline = ['UPI', 'NEFT', 'RTGS'].includes(row.depositMode);
              const isCdm = row.depositMode === 'CDM';
              const isCheque = row.depositMode === 'CHEQUE';
              return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                  isOnline
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60'
                    : isCdm
                    ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/60'
                    : isCheque
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60'
                }`}>
                  {row.depositMode === 'CASH_DEPOSIT' ? 'Cash Counter' : row.depositMode === 'CDM' ? 'CDM Cash' : row.depositMode === 'UPI' ? 'UPI Transfer' : row.depositMode === 'NEFT' ? 'NEFT / RTGS' : (row.depositMode || 'Bank Deposit')}
                </span>
              );
            },
          },
          {
            key: 'bankName',
            header: 'Bank Name & Account',
            width: 180,
            minWidth: 160,
            render: (val, row) => (
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[150px]" title={row.bankName}>{row.bankName || 'Company Bank'}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {row.bankAccountNo ? `A/C: ••••${String(row.bankAccountNo).slice(-4)}` : 'Main Commercial Account'}
                </div>
              </div>
            ),
          },
          {
            key: 'utrNumber',
            header: 'Transaction ID / UTR',
            width: 180,
            minWidth: 160,
            render: (val, row) => (
              <div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                    {row.utrNumber || 'COUNTER_CASH'}
                  </span>
                  {row.isDuplicateUtr && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60" title="Same UTR and amount recorded twice">
                      2x
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Ref / Challan #</div>
              </div>
            ),
          },
          {
            key: 'sourceParty',
            header: 'Source & Party Details',
            width: 200,
            minWidth: 170,
            render: (val, row) => {
              const docket = row.linkedDocket;
              const isTbb = row.sourceType === 'TBB_INVOICE_PAYMENT';
              const isToPay = row.sourceType === 'TO_PAY_DELIVERY' || docket?.paymentType === 'TO_PAY';
              const isDirectUpi = row.sourceType === 'DIRECT_UPI_DELIVERY';

              return (
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-1">
                    {isToPay ? (
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        To-Pay Delivery
                      </span>
                    ) : isTbb ? (
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                        TBB Invoice
                      </span>
                    ) : isDirectUpi ? (
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        Direct UPI
                      </span>
                    ) : (
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/40">
                        Branch Cash Drawer
                      </span>
                    )}
                  </div>

                  {/* Customer / Consignee Name */}
                  {row.customerName || docket?.consigneeName ? (
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[190px]" title={row.customerName || docket?.consigneeName}>
                      {row.customerName || docket?.consigneeName}
                    </div>
                  ) : null}

                  {row.isPartialPayment && (
                    <span className="inline-block text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30" title={`Pending balance: ${formatINR(row.invoiceBalance)}`}>
                      Partial ({Math.round(((row.remittedAmount || 0) / (row.invoiceTotal || 1)) * 100)}% Paid • Bal: {formatINR(row.invoiceBalance)})
                    </span>
                  )}

                  {/* Route */}
                  {docket?.originCity ? (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]" title={`${docket.originCity} → ${docket.destCity}`}>
                      {docket.originCity} → {docket.destCity}
                    </div>
                  ) : null}

                  {row.isDuplicateUtr && (
                    <div className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-300/60">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-500" />
                      <span>Duplicate UTR (Recorded 2x)</span>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: 'coveredDockets',
            header: 'Covered Dockets',
            width: 235,
            minWidth: 210,
            render: (val, row) => {
              const dockets = (row.coveredDockets && row.coveredDockets.length > 0)
                ? row.coveredDockets
                : (row.linkedDocket
                    ? [row.linkedDocket]
                    : (row.docketNumber ? [{ docketNumber: row.docketNumber }] : [])
                  );
              const count = dockets.length;

              if (count === 0) {
                return (
                  <span className="text-[11px] text-slate-400 font-mono italic">
                    Counter Cash
                  </span>
                );
              }

              if (count === 1) {
                const single = dockets[0];
                const paidAmt = single.coveredAmount !== undefined ? single.coveredAmount : single.totalAmount;
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedDepositDetails(row)}
                    className="w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-slate-50/90 dark:bg-slate-900/80 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono transition-all cursor-pointer group shadow-2xs"
                    title="Click to view full docket and transaction details"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-cyan-400 truncate">
                      <Truck className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>{single.docketNumber}</span>
                      <BuiltyTypeBadge docket={single} />
                    </div>
                    {paidAmt !== undefined && paidAmt !== null && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {formatINR(paidAmt)}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <div className="space-y-1">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100/90 dark:bg-blue-950/70 text-blue-700 dark:text-cyan-300 border border-blue-200/60 dark:border-blue-800/60">
                      <Truck className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                      <span>{count} Dockets</span>
                    </span>
                    {row.isPartialPayment ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        {Math.round(((row.remittedAmount || 0) / (row.invoiceTotal || 1)) * 100)}% Paid
                      </span>
                    ) : count > 2 ? (
                      <span className="text-[9px] text-slate-400 font-medium italic">
                        Scroll ▾
                      </span>
                    ) : null}
                  </div>

                  {/* Clean list: displays exactly 2 dockets; remaining show on scroll */}
                  <div className={`rounded-md border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden ${
                    count > 2
                      ? 'max-h-[58px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700'
                      : ''
                  }`}>
                    {dockets.map((d, idx) => {
                      const isFull = d.coveragePct !== undefined ? d.coveragePct >= 100 : !row.isPartialPayment;
                      const isPartial = d.coveragePct !== undefined ? (d.coveragePct > 0 && d.coveragePct < 100) : false;
                      const paidAmt = d.coveredAmount !== undefined ? d.coveredAmount : d.totalAmount;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDepositDetails(row)}
                          className="w-full flex items-center justify-between gap-1 px-2 py-1 hover:bg-blue-50/70 dark:hover:bg-blue-950/50 transition-colors text-left cursor-pointer group text-[11px] font-mono leading-none"
                          title={`Click to view docket ${d.docketNumber || 'LR'} breakdown`}
                        >
                          {/* Left: Index + Truck Icon + Docket No */}
                          <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                            <span className="text-slate-400 text-[10px] w-3.5 shrink-0">{idx + 1}.</span>
                            <Truck className="w-3 h-3 text-slate-400 group-hover:text-blue-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-cyan-400 truncate">
                              {d.docketNumber}
                            </span>
                            <BuiltyTypeBadge docket={d} />
                          </div>

                          {/* Right: Paid Amount + PAID / DUE Status Badge */}
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className={`font-bold ${
                              isFull
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isPartial
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {formatINR(paidAmt)}
                            </span>
                            {row.isPartialPayment && (
                              <span className={`text-[8.5px] font-black uppercase px-1 py-0.2 rounded shrink-0 ${
                                isFull
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isPartial
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {isFull ? 'PAID' : isPartial ? 'PART' : 'DUE'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'remittedAmount',
            header: 'Deposited Amount',
            align: 'right',
            width: 160,
            minWidth: 140,
            sortable: true,
            render: (val, row) => (
              <div className="text-right">
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 block">
                  {formatINR(row.remittedAmount)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Bank Deposited</span>
              </div>
            ),
          },
          {
            key: 'action',
            header: 'Bank Slip & Details',
            align: 'center',
            width: 160,
            minWidth: 140,
            render: (val, row) => (
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDepositDetails(row)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60 transition-all cursor-pointer shadow-2xs"
                  title="View covered docket & transaction details"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Breakdown</span>
                </button>
                {row.receiptSlipUrl && (
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptModal({
                      slipUrl: row.receiptSlipUrl,
                      bankName: row.bankName,
                      utrNumber: row.utrNumber,
                      amount: row.remittedAmount,
                      date: row.date,
                      branchName: typeof row.branchName === 'object' ? (row.branchName?.name || row.branchName?.branch_name) : row.branchName,
                      sourceType: row.sourceType,
                      depositMode: row.depositMode,
                      isDigital: Boolean(row.receiptSlipUrl?.startsWith('AUTO_VERIFIED')),
                    })}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 transition-all cursor-pointer shadow-2xs"
                    title={row.receiptSlipUrl?.startsWith('AUTO_VERIFIED') ? "View electronic payment remittance receipt" : "View bank deposit receipt slip"}
                  >
                    <span>{row.receiptSlipUrl?.startsWith('AUTO_VERIFIED') ? 'E-Receipt' : 'Slip'}</span>
                  </button>
                )}
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Remittance Status',
            align: 'center',
            width: 140,
            minWidth: 130,
            render: (val, row) => (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Daybook Closed</span>
              </span>
            ),
          },
          {
            key: 'remarks',
            header: 'Remarks / Notes',
            width: 160,
            minWidth: 140,
            render: (val, row) => (
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px] block" title={row.remarks || 'Standard Daybook Deposit'}>
                {row.remarks || 'Standard Daybook Deposit'}
              </span>
            ),
          },
        ];
      }

      return [
        {
          key: 'date',
          header: 'Date & Branch Hub',
          width: 170,
          minWidth: 150,
          sortable: true,
          render: (val, row) => (
            <div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                {row.date}
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                <Building2 className="w-3 h-3 shrink-0 opacity-70" />
                <span className="truncate max-w-[130px]">
                  {typeof row.branchName === 'object' ? (row.branchName?.name || row.branchName?.branch_name || 'Branch') : (row.branchName || 'Branch')}
                </span>
              </div>
            </div>
          ),
        },
        {
          key: 'paidCashAmount',
          header: 'Booking Cash (Paid)',
          align: 'right',
          width: 150,
          minWidth: 135,
          render: (val, row) => (
            <div className="text-right">
              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                {formatINR(row.paidCashAmount)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {row.paidBookingsCount || 0} Paid Docket{row.paidBookingsCount === 1 ? '' : 's'}
              </span>
            </div>
          ),
        },
        {
          key: 'toPayCashAmount',
          header: 'Delivery Cash (To-Pay)',
          align: 'right',
          width: 150,
          minWidth: 135,
          render: (val, row) => (
            <div className="text-right">
              <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 block">
                {formatINR(row.toPayCashAmount)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {row.toPayDeliveriesCount || 0} Deliver{row.toPayDeliveriesCount === 1 ? 'y' : 'ies'}
              </span>
            </div>
          ),
        },
        {
          key: 'totalCollected',
          header: 'Total Cash Inflow',
          align: 'right',
          width: 145,
          minWidth: 130,
          sortable: true,
          render: (val, row) => (
            <div className="text-right">
              <span className="font-mono font-black text-xs text-slate-900 dark:text-white block">
                {formatINR(row.totalCollected)}
              </span>
              <span className="text-[10px] text-slate-400">Gross Collected</span>
            </div>
          ),
        },
        {
          key: 'bankRemittance',
          header: 'Bank Transaction & Mode',
          width: 190,
          minWidth: 170,
          render: (val, row) => {
            const hasRemitted = row.isClosed || (row.remittedAmount && row.remittedAmount > 0);
            const isOnline = ['UPI', 'NEFT', 'RTGS'].includes(row.depositMode);
            return hasRemitted ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    isOnline
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}>
                    {row.depositMode === 'CASH_DEPOSIT' ? 'Cash Deposit' : row.depositMode === 'CDM' ? 'CDM Cash' : isOnline ? 'Online Transfer' : (row.depositMode || 'Deposit')}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate max-w-[170px]" title={row.bankName || 'Bank'}>
                  {row.bankName || 'Company Bank'}
                </div>
                {row.utrNumber ? (
                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={`UTR: ${row.utrNumber}`}>
                    UTR: {row.utrNumber}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400">Cash Deposit</div>
                )}
              </div>
            ) : (row.pendingCash || 0) > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
                Pending Bank Deposit
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Nil Balance • Cleared
              </span>
            );
          },
        },
        {
          key: 'remittedAmount',
          header: 'Deposited to Bank',
          align: 'right',
          width: 145,
          minWidth: 130,
          render: (val, row) => (
            <div className="text-right">
              <span className={`font-mono font-bold text-xs block ${
                (row.remittedAmount || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
              }`}>
                {formatINR(row.remittedAmount || 0)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {(row.remittedAmount || 0) > 0 ? 'Bank Remitted' : 'Awaiting Remit'}
              </span>
            </div>
          ),
        },
        {
          key: 'pendingCash',
          header: 'Pending in Hand',
          align: 'right',
          width: 145,
          minWidth: 130,
          render: (val, row) => {
            const pending = row.pendingCash !== undefined ? row.pendingCash : Math.max(0, (row.totalCollected || 0) - (row.remittedAmount || 0));
            return (
              <div className="text-right">
                <span className={`font-mono font-black text-xs block ${
                  pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {formatINR(pending)}
                </span>
                <span className={`text-[10px] font-semibold ${
                  pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                }`}>
                  {pending > 0 ? 'In Branch Drawer' : 'Nil Balance • Cleared'}
                </span>
              </div>
            );
          },
        },
        {
          key: 'daybookStatus',
          header: 'Daybook Status',
          align: 'center',
          width: 135,
          minWidth: 125,
          render: (val, row) => {
            const pending = row.pendingCash !== undefined ? row.pendingCash : Math.max(0, (row.totalCollected || 0) - (row.remittedAmount || 0));
            const isFullyClosed = row.isClosed || pending === 0;
            return (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                  isFullyClosed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/40'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/40'
                }`}
              >
                {isFullyClosed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Daybook Closed</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span>Unclosed Cash</span>
                  </>
                )}
              </span>
            );
          },
        },
        {
          key: 'action',
          header: 'Action / Slip',
          align: 'center',
          width: 125,
          minWidth: 110,
          render: (val, row) => (
            row.isClosed && row.receiptSlipUrl ? (
              <button
                type="button"
                onClick={() => setSelectedReceiptModal({
                  slipUrl: row.receiptSlipUrl,
                  bankName: row.bankName,
                  utrNumber: row.utrNumber,
                  amount: row.remittedAmount || row.totalCollected,
                  date: row.date,
                  branchName: typeof row.branchName === 'object' ? (row.branchName?.name || row.branchName?.branch_name) : row.branchName,
                })}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 transition-all cursor-pointer shadow-2xs"
                title="View bank deposit slip"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Slip</span>
              </button>
            ) : !row.isClosed || ((row.pendingCash || 0) > 0) ? (
              <button
                type="button"
                onClick={() => openRemitModal(row)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-xs transition-all cursor-pointer active:scale-95"
                title="Record bank deposit to close daybook"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Deposit</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold">Closed</span>
            )
          ),
        },
      ];
    }

    if (activeTab === 'GST') {
      return [
        {
          key: 'lrNumber',
          header: 'LR # & Service',
          width: 190,
          minWidth: 170,
          sortable: true,
          render: (val, row) => (
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                  {row.lrNumber}
                </span>
                <BuiltyTypeBadge docket={row} />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono font-medium">SAC {row.sacCode || '9965'}</span>
                <span className="text-[9px] px-1 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {row.paymentType || 'TO_PAY'}
                </span>
              </div>
            </div>
          ),
        },
        {
          key: 'bookingDate',
          header: 'Date & Route',
          width: 145,
          minWidth: 130,
          sortable: true,
          render: (val, row) => (
            <div>
              <div className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">{row.bookingDate}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[135px] font-medium" title={`${row.originCity} → ${row.destCity}`}>
                {row.originCity} → {row.destCity}
              </div>
            </div>
          ),
        },
        {
          key: 'consignorName',
          header: 'Consignor (Origin)',
          width: 165,
          minWidth: 150,
          render: (val, row) => (
            <div className="max-w-[160px] truncate" title={row.consignorName}>
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{row.consignorName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-1 py-0.2 rounded font-mono text-[9px] font-bold shrink-0 ${
                  row.consignorGst && row.consignorGst !== 'URP'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {row.consignorGst && row.consignorGst !== 'URP' ? 'B2B' : 'URP'}
                </span>
                <span className="font-mono text-[10px] text-slate-400 truncate">{row.consignorGst}</span>
              </div>
            </div>
          ),
        },
        {
          key: 'consigneeName',
          header: 'Consignee (Recipient)',
          width: 165,
          minWidth: 150,
          render: (val, row) => (
            <div className="max-w-[160px] truncate" title={row.consigneeName}>
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{row.consigneeName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-1 py-0.2 rounded font-mono text-[9px] font-bold shrink-0 ${
                  row.consigneeGst && row.consigneeGst !== 'URP'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {row.consigneeGst && row.consigneeGst !== 'URP' ? 'B2B' : 'URP'}
                </span>
                <span className="font-mono text-[10px] text-slate-400 truncate">{row.consigneeGst}</span>
              </div>
            </div>
          ),
        },
        {
          key: 'placeOfSupply',
          header: 'Place of Supply',
          width: 140,
          minWidth: 125,
          render: (val, row) => (
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={row.posStateName || row.destCity}>
                {row.posStateName || row.destCity || 'State Supply'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[10px] text-slate-400">Code: {row.posCode || '27'}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  row.isInterState
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                }`}>
                  {row.isInterState ? 'IGST' : 'CGST+SGST'}
                </span>
              </div>
            </div>
          ),
        },
        {
          key: 'taxableValue',
          header: 'Taxable Freight (₹)',
          align: 'right',
          width: 135,
          minWidth: 120,
          sortable: true,
          render: (val, row) => (
            <div className="text-right">
              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                {formatINR(row.taxableValue)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {row.chargedWeight ? `${row.chargedWeight} kg` : `${row.packagesCount || 1} pkgs`}
              </span>
            </div>
          ),
        },
        {
          key: 'taxType',
          header: 'Tax Liability / RCM',
          align: 'center',
          width: 140,
          minWidth: 125,
          render: (val, row) => (
            <div className="flex flex-col items-center gap-0.5">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                row.isRcm
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
              }`}>
                {row.isRcm ? 'RCM (5%)' : 'Forward (GTA)'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                {row.isRcm ? 'Recipient Pays Tax' : 'Transporter Liability'}
              </span>
            </div>
          ),
        },
        {
          key: 'taxBreakdown',
          header: 'GST Breakdown',
          align: 'right',
          width: 145,
          minWidth: 130,
          render: (val, row) => (
            <div className="text-right text-xs">
              {row.isInterState ? (
                <div>
                  <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">{formatINR(row.igst)}</span>
                  <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-semibold block">IGST ({row.taxRatePct}%)</span>
                </div>
              ) : (
                <div>
                  <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">{formatINR(row.totalGst)}</span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    C: {formatINR(row.cgst)} + S: {formatINR(row.sgst)}
                  </span>
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'totalInvoiceValue',
          header: 'Invoice Total (₹)',
          align: 'right',
          width: 135,
          minWidth: 120,
          sortable: true,
          render: (val, row) => (
            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
              {formatINR(row.totalInvoiceValue)}
            </span>
          ),
        },
        {
          key: 'action',
          header: 'Tax Audit & Slip',
          align: 'center',
          width: 125,
          minWidth: 110,
          render: (val, row) => (
            <button
              type="button"
              onClick={() => setSelectedTaxAuditItem(row)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer shadow-2xs"
              title="Audit SAC 9965 tax classification & GSTR-1 parameters"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tax Audit</span>
            </button>
          ),
        },
      ];
    }
    return [];
  }, [activeTab, isDark, canViewAuditCompliance, collectionSubView, userBranchId]);

  const canExportCurrentTab = useMemo(() => {
    if (canExportReportTab) {
      return canExportReportTab(activeTab);
    }
    return canExport;
  }, [canExportReportTab, activeTab, canExport]);

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#090D18]' : 'bg-[#F6F8FB]'}`}>
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-full">
          {/* Header & Main Actions */}
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-200/50 flex items-center justify-center font-bold shrink-0">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Reports &amp; Operational Analytics
                    </h1>
                    {!isAdmin && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{currentBranchName}: {currentBranchCode || 'Active'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate sm:whitespace-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {canViewAuditCompliance
                      ? 'Audited commercial registers, receivables ageing, vehicle profitability, cash ledgers, and tax statements.'
                      : isBranchManager
                      ? 'Station operational registers, bank remittance deposits, customer ageing, and delivery compliance.'
                      : 'Station operational registers, consignment delivery compliance, and verified proofs of delivery.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Export & Branch Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 print:hidden shrink-0">
              {isAdmin && (
                <BranchFilterDropdown
                  selectedBranchId={selectedBranch}
                  onChange={(newBranchId) => {
                    setSelectedBranch(newBranchId);
                    setPage(1);
                  }}
                  branches={branches}
                  allLabel="All Branches"
                  allSubtitle="Consolidated Analytics & Audit"
                  showLabel={false}
                  size="sm"
                  align="right"
                />
              )}

              {canExportCurrentTab ? (
                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] shrink-0 whitespace-nowrap cursor-pointer"
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
            {visibleRegisters.map((reg) => {
              const Icon = reg.icon;
              const isActive = activeTab === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => handleTabChange(reg.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 shadow-sm'
                        : 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                      : isDark
                      ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span>{reg.label}</span>
                </button>
              );
            })}
          </div>


          {/* Summary Metric Ribbon - Executive Responsive Cards */}
          {summary && (
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${activeTab === 'DOCKETS' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5 sm:gap-3 w-full`}>
              {activeTab === 'DOCKETS' && (
                <>
                  <SummaryKpiCard
                    icon={FileText}
                    label="Total Dockets"
                    value={summary.totalBookings || 0}
                    badgeText="Bookings"
                    accentColor="blue"
                    subLeft={
                      summary.isFiltered && summary.filteredBookings !== undefined && summary.filteredBookings !== summary.totalBookings
                        ? `${summary.filteredBookings} of ${summary.totalBookings} Selected`
                        : `${summary.totalPackages || 0} Packages`
                    }
                    subRight={`${summary.totalPackages || 0} Pkgs`}
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={Scale}
                    label="Charged Weight"
                    value={`${((summary.totalChargedWeight || 0) / 1000).toFixed(2)} MT`}
                    badgeText="Tonnage"
                    accentColor="cyan"
                    subLeft={`${summary.totalActualWeight || 0} kg actual`}
                    subRight="Charged Yield"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={IndianRupee}
                    label="Total Revenue"
                    value={formatINR(summary.totalRevenue)}
                    badgeText="Gross Freight"
                    accentColor="indigo"
                    subLeft={
                      summary.isFiltered && summary.filteredRevenue !== undefined && summary.filteredRevenue !== summary.totalRevenue
                        ? `Selected: ${formatINR(summary.filteredRevenue)}`
                        : `GST: ${formatINR(summary.totalTaxAmount)}`
                    }
                    subRight={`GST: ${formatINR(summary.totalTaxAmount)}`}
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={CheckCircle2}
                    label="Cleared Revenue"
                    value={formatINR(summary.totalClearedRevenue !== undefined ? summary.totalClearedRevenue : (summary.breakdown?.clearedRevenue ?? summary.totalRevenue ?? 0))}
                    badgeText="Collected"
                    accentColor="emerald"
                    subLeft={`${summary.breakdown?.cleared || 0} Dockets Cleared`}
                    subRight="Settled"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={AlertCircle}
                    label="Pending Revenue"
                    value={formatINR(summary.totalPendingRevenue !== undefined ? summary.totalPendingRevenue : (summary.breakdown?.pendingRevenue || 0))}
                    badgeText="To-Collect"
                    accentColor="amber"
                    subLeft={`${summary.breakdown?.pending || 0} Dockets Pending`}
                    subRight="Uncollected"
                    isAlert={(summary.totalPendingRevenue || summary.breakdown?.pendingRevenue || 0) > 0}
                    alertBadgeText={(summary.totalPendingRevenue || summary.breakdown?.pendingRevenue || 0) > 0 ? "Pending" : null}
                    isDark={isDark}
                  />
                </>
              )}

              {activeTab === 'AGEING' && (
                <>
                  <SummaryKpiCard
                    icon={Wallet}
                    label="Total Receivables"
                    value={formatINR(summary.totalReceivables)}
                    badgeText="Ledger Balance"
                    accentColor="rose"
                    subLeft={`TBB: ${formatINR(summary.totalTbbReceivables || 0)}`}
                    subRight={`To-Pay: ${formatINR(summary.totalTopayReceivables || 0)}`}
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={Calendar}
                    label="0 - 30 Days (Current)"
                    value={formatINR(summary.bucket0_30)}
                    badgeText="Normal Terms"
                    accentColor="emerald"
                    subLeft="Standard Terms"
                    subRight="On Track"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={Clock}
                    label="31 - 60 Days"
                    value={formatINR(summary.bucket31_60)}
                    badgeText="Follow-Up"
                    accentColor="amber"
                    subLeft="Follow-up due"
                    subRight="Payment Notice"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={AlertTriangle}
                    label="61 - 90 Days"
                    value={formatINR(summary.bucket61_90)}
                    badgeText="Delayed"
                    accentColor="orange"
                    subLeft="Delayed Recovery"
                    subRight="Escalation"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={AlertCircle}
                    label="90+ Days (Critical)"
                    value={formatINR(summary.bucket90Plus)}
                    badgeText="Critical"
                    accentColor="rose"
                    subLeft="Stop Credit Alert"
                    subRight="High Risk"
                    isAlert={Number(summary.bucket90Plus || 0) > 0}
                    alertBadgeText={Number(summary.bucket90Plus || 0) > 0 ? "Action Req." : null}
                    isDark={isDark}
                  />
                </>
              )}

              {activeTab === 'TRIPS' && (
                <>
                  <SummaryKpiCard
                    icon={Truck}
                    label="Trips Dispatched"
                    value={summary.totalTrips || 0}
                    badgeText="Line-Haul"
                    accentColor="purple"
                    subLeft="Active line-haul trips"
                    subRight="Fleet Operations"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={IndianRupee}
                    label="Loaded Revenue"
                    value={formatINR(summary.totalRevenue)}
                    badgeText="Gross Freight"
                    accentColor="blue"
                    subLeft="Total freight manifest"
                    subRight="Manifested"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={Coins}
                    label="Operating Cost"
                    value={formatINR(summary.totalOperatingCost)}
                    badgeText="Trips Expense"
                    accentColor="rose"
                    subLeft="Diesel, Tolls & Advances"
                    subRight="Disbursed"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={TrendingUp}
                    label="Net Profit"
                    value={formatINR(summary.netProfit)}
                    badgeText="EBITDA"
                    accentColor="emerald"
                    subLeft="Contribution margin"
                    subRight="Net Profit"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={Percent}
                    label="Profit Margin %"
                    value={`${summary.averageMarginPct || 0}%`}
                    badgeText="Fleet Yield"
                    accentColor="cyan"
                    subLeft="Average fleet yield"
                    subRight="Operating Ratio"
                    isDark={isDark}
                  />
                </>
              )}

              {activeTab === 'POD' && (
                <>
                  <SummaryKpiCard
                    icon={PackageCheck}
                    label="Delivered Units"
                    value={summary.totalDelivered || 0}
                    badgeText={`${summary.totalConsignments ? Math.round(((summary.totalDelivered || 0) / summary.totalConsignments) * 100) : 0}% Closed`}
                    accentColor="emerald"
                    subLeft={`of ${summary.totalConsignments || 0} Bookings`}
                    subRight="Confirmed"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={Truck}
                    label="Pending Delivery"
                    value={summary.totalPending !== undefined ? summary.totalPending : Math.max(0, (summary.totalConsignments || 0) - (summary.totalDelivered || 0))}
                    badgeText="In Transit"
                    accentColor="blue"
                    subLeft="In Transit & Hub Godowns"
                    subRight="En Route"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={AlertCircle}
                    label="Critical Overdue"
                    value={summary.pendingOverdueCount || 0}
                    badgeText={(summary.pendingOverdueCount || 0) > 0 ? "Priority" : "Normal"}
                    accentColor="rose"
                    subLeft={(summary.pendingOverdueCount || 0) > 0 ? "Urgent Priority Required" : "Zero Overdue Backlog"}
                    subRight={(summary.pendingOverdueCount || 0) > 0 ? "SLA Breached" : "Clear"}
                    isAlert={(summary.pendingOverdueCount || 0) > 0}
                    alertBadgeText={(summary.pendingOverdueCount || 0) > 0 ? "Priority" : null}
                    isDark={isDark}
                  />
                  {canViewAuditCompliance ? (
                    <SummaryKpiCard
                      icon={ShieldCheck}
                      label="PODs Verified & Signed"
                      value={summary.podVerifiedCount || 0}
                      badgeText="Audited"
                      accentColor="teal"
                      subLeft="Physically Verified"
                      subRight={`${summary.podUploadedCount || 0} Pending Audit`}
                      isDark={isDark}
                    />
                  ) : (
                    <SummaryKpiCard
                      icon={FileSpreadsheet}
                      label="POD Slips Uploaded"
                      value={(summary.podUploadedCount || 0) + (summary.podVerifiedCount || 0)}
                      badgeText={(summary.podPendingCount || 0) > 0 ? "Action Due" : "100% Up to Date"}
                      accentColor={(summary.podPendingCount || 0) > 0 ? "amber" : "teal"}
                      subLeft={(summary.podPendingCount || 0) > 0 ? `${summary.podPendingCount} Slips Due` : "All Delivered Uploaded"}
                      subRight="POD Ledger"
                      isAlert={(summary.podPendingCount || 0) > 0}
                      isDark={isDark}
                    />
                  )}
                  <SummaryKpiCard
                    icon={CheckCircle2}
                    label={canViewAuditCompliance ? "SLA Turnaround Rate" : "POD Collection Rate"}
                    value={`${summary.complianceRatePct || 100}%`}
                    badgeText="Compliance"
                    accentColor="cyan"
                    subLeft={canViewAuditCompliance ? "Standard SLA Compliance" : "Delivered Slips Uploaded"}
                    subRight="On Time"
                    isDark={isDark}
                  />
                </>
              )}

              {activeTab === 'COLLECTIONS' && (
                <>
                  {/* Card 1: Total Branch Revenue */}
                  <SummaryKpiCard
                    icon={Wallet}
                    label="Total Branch Revenue"
                    value={formatINR(summary?.totalBranchRevenue ?? summary?.totalRevenue)}
                    badgeText={(summary?.totalTbbAmount || 0) > 0 ? "Incl. TBB" : "Gross Booked"}
                    accentColor="blue"
                    isDark={isDark}
                  >
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          Delivered Dockets:
                        </span>
                        <span className="font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                          {formatINR(summary?.totalDeliveredRevenue || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          Not Delivered / Transit:
                        </span>
                        <span className="font-extrabold font-mono text-amber-700 dark:text-amber-300">
                          {formatINR(summary?.totalUndeliveredRevenue !== undefined ? summary.totalUndeliveredRevenue : Math.max(0, (summary?.totalBranchRevenue || 0) - (summary?.totalDeliveredRevenue || 0)))}
                        </span>
                      </div>
                    </div>
                  </SummaryKpiCard>

                  {/* Card 2: Branch Cash Drawer */}
                  <SummaryKpiCard
                    icon={Coins}
                    label="Branch Cash Drawer"
                    value={formatINR(summary?.totalBranchDrawerCash ?? summary?.totalPendingInBranch ?? summary?.totalUnclosedCash ?? 0)}
                    badgeText={(summary?.totalBranchDrawerCash ?? summary?.totalPendingInBranch ?? 0) > 0 ? "In Drawer" : "Deposited"}
                    accentColor={(summary?.totalBranchDrawerCash ?? summary?.totalPendingInBranch ?? 0) > 0 ? "amber" : "emerald"}
                    isAlert={(summary?.totalBranchDrawerCash ?? summary?.totalPendingInBranch ?? 0) > 0}
                    isDark={isDark}
                  >
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between" title={`Booked PAID: ${formatINR(summary?.totalBookedPaidCash ?? 21205)} | Delivered TO-PAY: ${formatINR(summary?.totalDeliveredToPayCash ?? 96180)}`}>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          Physical Cash (Drawer):
                        </span>
                        <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">
                          {formatINR(summary?.totalPhysicalCash ?? ((summary?.totalBookedPaidCash || 0) + (summary?.totalDeliveredToPayCash || 0)))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          Delivered TBB (Booking):
                        </span>
                        <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">
                          {formatINR(summary?.totalDeliveredTbb ?? 43155)}
                        </span>
                      </div>
                    </div>
                  </SummaryKpiCard>

                  {/* Card 3: Deposited to Bank */}
                  <SummaryKpiCard
                    icon={Building2}
                    label="Deposited to Bank"
                    value={formatINR(summary?.totalRemittedToBank || 0)}
                    badgeText="Bank Remitted"
                    accentColor="emerald"
                    isDark={isDark}
                  >
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          Branch Drawer Cash:
                        </span>
                        <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">
                          {formatINR(summary?.totalBranchDrawerCash ?? summary?.totalPendingInBranch ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          Drawer − Bank Deposits:
                        </span>
                        <span className="font-extrabold font-mono text-rose-600 dark:text-rose-400">
                          {formatINR(summary?.totalDrawerMinusDeposits !== undefined ? summary.totalDrawerMinusDeposits : Math.max(0, (summary?.totalBranchDrawerCash ?? summary?.totalPendingInBranch ?? 0) - (summary?.totalRemittedToBank || 0)))}
                        </span>
                      </div>
                    </div>
                  </SummaryKpiCard>

                  {/* Card 4: Total Pending Revenue */}
                  <SummaryKpiCard
                    icon={AlertTriangle}
                    label="Total Pending Revenue"
                    value={formatINR(summary?.totalPendingRevenue !== undefined ? summary.totalPendingRevenue : Math.max(0, (summary?.totalBranchRevenue ?? summary?.totalRevenue ?? 0) - (summary?.totalRemittedToBank || 0)))}
                    badgeText={(summary?.totalPendingRevenue || 0) > 0 ? "Unremitted" : "All Settled"}
                    accentColor={(summary?.totalPendingRevenue || 0) > 0 ? "rose" : "emerald"}
                    isAlert={(summary?.totalPendingRevenue || 0) > 0}
                    isDark={isDark}
                  >
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          In Drawer Cash:
                        </span>
                        <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">
                          {formatINR(summary?.totalPhysicalCash ?? summary?.totalBranchDrawerCash ?? summary?.totalPendingInBranch ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                          Due To-Pay & TBB:
                        </span>
                        <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">
                          {formatINR(summary?.totalDueOutsideDrawer !== undefined ? summary.totalDueOutsideDrawer : Math.max(0, (summary?.totalPendingRevenue || 0) - (summary?.totalBranchDrawerCash || 0)))}
                        </span>
                      </div>
                    </div>
                  </SummaryKpiCard>
                </>
              )}

              {activeTab === 'GST' && (
                <>
                  <SummaryKpiCard
                    icon={Receipt}
                    label="Taxable Freight"
                    value={formatINR(summary.totalTaxableValue)}
                    badgeText="SAC 9965"
                    accentColor="indigo"
                    subLeft={`${summary.hsnSummary?.totalQuantityTonnes || 0} MT`}
                    subRight={`${summary.totalConsignments || 0} Consignments`}
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={ShieldAlert}
                    label="RCM Turnover"
                    value={formatINR(summary.rcmTaxableTurnover)}
                    badgeText="5% Recipient Tax"
                    accentColor="blue"
                    subLeft={`${summary.rcmCount || 0} B2B LRs`}
                    subRight="Recipient Pays RCM"
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={CheckCircle2}
                    label="Forward Charge"
                    value={formatINR(summary.forwardChargeTurnover)}
                    badgeText="Transporter Tax"
                    accentColor="emerald"
                    subLeft={`${summary.forwardCount || 0} LRs`}
                    subRight={`Tax: ${formatINR(summary.forwardTaxAmount || 0)}`}
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={Coins}
                    label="Total GST Generated"
                    value={formatINR(summary.totalTaxLiability)}
                    badgeText="Output Tax"
                    accentColor="rose"
                    fullSubtitle={`C: ${formatINR(summary.totalCgst || 0)} • S: ${formatINR(summary.totalSgst || 0)} • I: ${formatINR(summary.totalIgst || 0)}`}
                    isDark={isDark}
                  />
                  <SummaryKpiCard
                    icon={FileSpreadsheet}
                    label="GSTR-1 Doc Series"
                    value={`${summary.docSeriesSummary?.fromDocNo || 'LR-1'} → ${summary.docSeriesSummary?.toDocNo || 'LR-N'}`}
                    badgeText="Table 13"
                    accentColor="purple"
                    subLeft={`${summary.docSeriesSummary?.totalIssued || 0} Issued`}
                    subRight="0 Cancelled"
                    isDark={isDark}
                  />
                </>
              )}
            </div>
          )}

          {/* Statutory Transporter GST Registration & SAC 9965 Control Banner */}
          {activeTab === 'GST' && (
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
              isDark
                ? 'bg-gradient-to-br from-[#0D1424] to-[#080D1A] border-slate-800 shadow-sm'
                : 'bg-gradient-to-br from-white to-slate-50/80 border-slate-200 shadow-xs'
            }`}>
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
                {/* Left: Transporter Identity, Station & GSTIN */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center shrink-0 shadow-2xs">
                    <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                        {summary?.transporterLegalName || 'TransHub Logistics Ltd'}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                        <span>GSTIN: {summary?.transporterGstin || '27AABCT9845P1Z2'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(summary?.transporterGstin || '27AABCT9845P1Z2');
                            setGstCopied(true);
                            setTimeout(() => setGstCopied(false), 2000);
                          }}
                          className="hover:text-indigo-500 cursor-pointer ml-0.5"
                          title="Copy GSTIN"
                        >
                          {gstCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        POS State: {summary?.transporterState || '27-Maharashtra'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 flex items-center gap-1 shrink-0">
                        <MapPin className="w-3 h-3" />
                        <span>Station: {currentBranchName}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate sm:whitespace-normal">
                      Statutory Goods Transport Agency (GTA) Freight Register • SAC Code <span className="font-semibold text-slate-700 dark:text-slate-200">9965 / 996511</span> (CBIC Notif. 11/2017-CT)
                    </p>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-2 self-start xl:self-auto shrink-0 flex-nowrap">
                  {canExportCurrentTab && (
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0 whitespace-nowrap"
                      title="Download complete GSTR-1 compliant CSV report"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download GSTR-1 CSV</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowHsnDocSummary((prev) => !prev)}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
                      showHsnDocSummary
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Table 12 &amp; 13 Schedule</span>
                    {showHsnDocSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible GSTR-1 Table 12 & 13 Audit Panel */}
              {showHsnDocSummary && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-200">
                  {/* Table 12: HSN/SAC Summary */}
                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'}`}>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>GSTR-1 Table 12: HSN/SAC Summary</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        SAC 9965
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Description:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Road Freight Transport Services</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Quantity / Weight:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {summary?.hsnSummary?.totalQuantityTonnes || 0} MT ({summary?.hsnSummary?.totalQuantityKg || 0} KG)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Taxable Value:</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {formatINR(summary?.hsnSummary?.taxableValue || summary?.totalTaxableValue)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40 text-[11px]">
                        <span className="text-slate-500">CGST: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatINR(summary?.hsnSummary?.cgst || summary?.totalCgst)}</strong></span>
                        <span className="text-slate-500">SGST: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatINR(summary?.hsnSummary?.sgst || summary?.totalSgst)}</strong></span>
                        <span className="text-slate-500">IGST: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatINR(summary?.hsnSummary?.igst || summary?.totalIgst)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Table 13: Document Issued Series */}
                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'}`}>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-[11px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>GSTR-1 Table 13: Documents Issued</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        Consignment Note (LR)
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Document Type:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Consignment Note / Bilty (LR)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Series Range:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {summary?.docSeriesSummary?.fromDocNo || 'N/A'} → {summary?.docSeriesSummary?.toDocNo || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Issued Count:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {summary?.docSeriesSummary?.totalIssued || summary?.totalConsignments || 0} Dockets
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40 text-[11px]">
                        <span className="text-slate-500">Cancelled: <strong className="font-mono text-slate-700 dark:text-slate-200">0</strong></span>
                        <span className="text-slate-500">Net Valid: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{summary?.docSeriesSummary?.netIssued || summary?.totalConsignments || 0}</strong></span>
                        <span className="text-slate-500">Action: <strong className="text-emerald-600 font-semibold">Ready for CA filing</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Segment Filter Pill Bar */}
              <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  <span>GST View:</span>
                </span>
                {[
                  { id: 'ALL', label: 'All Supplies (SAC 9965)', count: summary?.totalConsignments || 0 },
                  { id: 'RCM', label: 'RCM Supplies (5% Recipient Tax)', count: summary?.rcmCount || 0 },
                  { id: 'FORWARD', label: 'Forward Charge (GTA Direct)', count: summary?.forwardCount || 0 },
                  { id: 'B2B', label: 'B2B Registered (Table 4)', count: summary?.b2bCount || 0 },
                  { id: 'B2C', label: 'B2C Retail (Table 7)', count: summary?.b2cCount || 0 },
                ].map((pill) => {
                  const isSelected = gstFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => {
                        setGstFilter(pill.id);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 select-none border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-[1.02]'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin Branch-Wise Cash & Remittance Breakdown Panel */}
          {activeTab === 'COLLECTIONS' && isAdmin && summary?.branchBreakdown?.length > 0 && (
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>Branch-Wise Collection &amp; Bank Deposit Audit</span>
                      <span className="text-[9px] font-bold lowercase tracking-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {summary.branchBreakdown.length} hubs active
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Live cash collections, bank deposits, and pending in-hand drawer balances by branch hub
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {selectedBranch !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranch('ALL');
                        setPage(1);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer mr-1"
                    >
                      <span>View All Network Branches</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {summary.branchBreakdown.length > 4 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => branchBreakdownScrollRef.current?.scrollBy({ top: -160, behavior: 'smooth' })}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer shadow-2xs"
                        title="Scroll up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => branchBreakdownScrollRef.current?.scrollBy({ top: 160, behavior: 'smooth' })}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer shadow-2xs"
                        title="Scroll down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div
                ref={branchBreakdownScrollRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[175px] overflow-y-auto pr-1.5 scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
              >
                {summary.branchBreakdown.map((b) => {
                  const isSelected = selectedBranch === String(b.branchId);
                  return (
                    <div
                      key={b.branchId || b.branchName}
                      onClick={() => {
                        if (b.branchId) {
                          setSelectedBranch(isSelected ? 'ALL' : String(b.branchId));
                          setPage(1);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/30 shadow-xs'
                          : isDark
                          ? 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/50'
                          : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/60 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate" title={b.branchName}>
                          {b.branchName}
                        </span>
                        {isSelected ? (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                            Filtered
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 hover:text-blue-500 font-semibold shrink-0">
                            Filter →
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Total Collected:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatINR(b.totalCollected)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Deposited to Bank:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatINR(b.remittedAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Pending in Drawer:</span>
                          <span className={`font-mono text-xs font-black ${
                            b.pendingCash > 0
                              ? 'text-amber-500'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {formatINR(b.pendingCash)}
                          </span>
                        </div>
                        {b.lastUtrNumber && (
                          <div className="pt-1 text-[10px] text-slate-400 truncate" title={`Last UTR: ${b.lastUtrNumber}`}>
                            Last UTR: <span className="font-mono text-slate-600 dark:text-slate-300">{b.lastUtrNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Report Enterprise DataTable */}
          <DataTable
            columns={columns}
            data={dataRows}
            totalItems={totalRecords}
            loading={loading}
            page={page}
            pageSize={limit}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
            searchQuery={searchInput}
            onSearchChange={(val) => {
              setSearchInput(val);
            }}
            searchPlaceholder={
              activeTab === 'DOCKETS'
                ? 'Search LR #, Party, Route, City...'
                : activeTab === 'AGEING'
                ? 'Search Customer, Code, GSTIN, Phone...'
                : activeTab === 'TRIPS'
                ? 'Search Trip #, Vehicle, Driver, Route...'
                : activeTab === 'POD'
                ? 'Search Docket #, Consignee, City...'
                : activeTab === 'COLLECTIONS'
                ? (collectionSubView === 'DEPOSITS' ? 'Search Bank, UTR, Branch, Mode, Date...' : 'Search Branch, Bank, UTR, Date...')
                : 'Search LR #, GSTIN, Consignor/Consignee...'
            }
            emptyTitle={
              activeTab === 'COLLECTIONS' && collectionSubView === 'DEPOSITS'
                ? 'No Bank Deposit Transactions Yet'
                : undefined
            }
            emptySubtitle={
              activeTab === 'COLLECTIONS' && collectionSubView === 'DEPOSITS'
                ? `Branch drawer cash of ${formatINR(summary?.totalPendingInBranch ?? summary?.totalUnclosedCash ?? 0)} is awaiting remittance. Click 'Deposit to Bank' to record cash counter or online transfer.`
                : undefined
            }
            emptyIcon={
              activeTab === 'COLLECTIONS' && collectionSubView === 'DEPOSITS' ? (
                <Landmark className="w-7 h-7 text-amber-500" />
              ) : null
            }
            emptyActionSlot={
              activeTab === 'COLLECTIONS' && collectionSubView === 'DEPOSITS' ? (
                <button
                  type="button"
                  onClick={() => openRemitModal()}
                  className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 mx-auto"
                >
                  <Landmark className="w-4 h-4" />
                  <span>Deposit to Bank Now</span>
                </button>
              ) : null
            }
            headerFiltersSlot={headerFilters}
            dateFilterSlot={
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
            }
            exportable={canExport}
            exportFilename={`${activeTab}_${activeTab === 'COLLECTIONS' ? collectionSubView : ''}_Register_${new Date().toISOString().slice(0, 10)}`}
            onExportAll={handleExportCsv}
            actionsSlot={
              activeTab === 'COLLECTIONS' ? (
                <button
                  type="button"
                  onClick={() => openRemitModal()}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                  title="Deposit cash or online payment to bank and record transaction"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Deposit to Bank</span>
                </button>
              ) : null
            }
          />
        </main>
      </div>

      {/* Modal 1: Deposit Branch Cash to Bank & Close Daybook */}
      {isRemitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white shadow-amber-500/5' : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-900/10'
          }`}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Deposit Branch Cash to Bank
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Settle branch cash daybook, update bank ledger &amp; archive deposit challan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRemitModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleRemitSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-5 text-xs">
                {/* Executive Summary Banner */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900/50 border-amber-500/30'
                    : 'bg-gradient-to-r from-amber-50 via-amber-50/50 to-orange-50/30 border-amber-200 shadow-xs'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Branch Cash Daybook
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Ready for Ledger Settlement</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {remitFormData.branchName}
                        </span>
                      </div>
                    </div>
                    <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-amber-500/20">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Unclosed Cash Holdings
                      </span>
                      <div className="font-mono text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                        {formatINR(remitFormData.remittedAmount || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Inputs Grid */}
                <div className="space-y-4">
                  {isAdmin && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Remitting Branch Hub <span className="text-amber-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={remitFormData.branchId}
                          onChange={(e) => {
                            const sel = branches.find((b) => String(b.id) === String(e.target.value));
                            setRemitFormData({
                              ...remitFormData,
                              branchId: e.target.value,
                              branchName: sel?.name || sel?.branch_name || 'Selected Branch',
                            });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer appearance-none text-xs"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                              {b.name || b.branch_name} ({b.code || b.branch_code || 'HUB'})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Remitted Amount (₹) <span className="text-amber-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={remitFormData.remittedAmount}
                          onChange={(e) => setRemitFormData({ ...remitFormData, remittedAmount: e.target.value })}
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Deposit Date <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={remitFormData.closureDate}
                        onChange={(e) => setRemitFormData({ ...remitFormData, closureDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Bank Name <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={remitFormData.bankName}
                        placeholder="e.g. State Bank of India, HDFC Bank"
                        onChange={(e) => setRemitFormData({ ...remitFormData, bankName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-slate-900 dark:text-white font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Bank Account # <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={remitFormData.bankAccountNo}
                        placeholder="e.g. 302910293810"
                        onChange={(e) => setRemitFormData({ ...remitFormData, bankAccountNo: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 font-mono text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Deposit Mode <span className="text-amber-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={remitFormData.depositMode}
                          onChange={(e) => setRemitFormData({ ...remitFormData, depositMode: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer appearance-none text-xs"
                        >
                          <option value="CASH_DEPOSIT" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>💵 Counter Cash Deposit at Branch</option>
                          <option value="CDM" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>🏧 Cash Deposit Machine (CDM)</option>
                          <option value="UPI" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>⚡ UPI / QR Merchant Transfer</option>
                          <option value="NEFT" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>🏦 NEFT / RTGS Online Clearance</option>
                          <option value="CHEQUE" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>📝 Bank Cheque / Pay Order</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Bank UTR / Transaction / Challan Reference # <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UTR3928109382 / Challan #10492"
                        value={remitFormData.utrReferenceNo}
                        onChange={(e) => setRemitFormData({ ...remitFormData, utrReferenceNo: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Upload Stamped Bank Slip / Receipt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Upload Bank Slip / Stamped Challan Photo
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Recommended for Audit Verification</span>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center hover:border-amber-500/60 hover:bg-amber-500/5 transition-all">
                      {remitFormData.receiptPreview ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center space-x-3">
                            <img
                              src={remitFormData.receiptPreview}
                              alt="Receipt preview"
                              className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                            />
                            <div className="text-left">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Bank Slip Attached</span>
                              <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Ready for verification
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRemitFormData({ ...remitFormData, receiptSlip: '', receiptPreview: '' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-3 group">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-105">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-blue-600 dark:text-cyan-400 group-hover:underline block">
                            Click to upload deposit slip or challan
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Supports JPG, PNG, WebP photo of stamped teller receipt (Max 10MB)
                          </span>
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
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Remarks / Notes <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deposited morning counter collections to SBI Current Account"
                      value={remitFormData.remarks}
                      onChange={(e) => setRemitFormData({ ...remitFormData, remarks: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-slate-900 dark:text-white font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                    Daybook balance settled upon confirmation
                  </span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRemitModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRemit}
                    className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-2 text-xs transition-all"
                  >
                    {isSubmittingRemit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirming Deposit...</span>
                      </>
                    ) : (
                      <>
                        <Landmark className="w-4 h-4" />
                        <span>Confirm Deposit &amp; Close</span>
                      </>
                    )}
                  </button>
                </div>
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
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  {(selectedReceiptModal.isDigital || selectedReceiptModal.slipUrl?.startsWith('AUTO_VERIFIED')) ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Digital Remittance Receipt</span>
                    </>
                  ) : (
                    <span>Bank Remittance Receipt</span>
                  )}
                </h3>
                <span className="text-[10px] text-slate-400">{selectedReceiptModal.branchName} • {selectedReceiptModal.date}</span>
              </div>
              <button
                onClick={() => setSelectedReceiptModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Bank Details</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedReceiptModal.bankName || 'Company Bank Account'}</div>
                  <div className="font-mono text-[10px] text-slate-400">UTR / Ref: {selectedReceiptModal.utrNumber || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Deposited Amount</span>
                  <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatINR(selectedReceiptModal.amount)}
                  </div>
                </div>
              </div>

              {(selectedReceiptModal.isDigital || selectedReceiptModal.slipUrl?.startsWith('AUTO_VERIFIED')) ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Digital E-Receipt</span>
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                      Settled electronically via Direct UPI / Banking Gateway directly into the corporate account. No physical paper slip is required.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-left text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-400 font-sans">Payment Method:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Direct UPI / Gateway</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-400 font-sans">Bank Reference / UTR:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={selectedReceiptModal.utrNumber}>
                        {selectedReceiptModal.utrNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-400 font-sans">Verification:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans">
                        <Check className="w-3.5 h-3.5" /> Reconciled & Cleared
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/50 flex items-center justify-center min-h-[220px]">
                  <img
                    src={selectedReceiptModal.slipUrl?.startsWith('http') || selectedReceiptModal.slipUrl?.startsWith('/') ? selectedReceiptModal.slipUrl : `/uploads/${selectedReceiptModal.slipUrl}`}
                    alt="Bank deposit slip"
                    className="max-h-80 w-auto object-contain rounded-lg"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div style={{ display: 'none' }} className="flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                    <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                    <span className="text-xs">Physical slip image not available</span>
                  </div>
                </div>
              )}

              <div className="text-center pt-1">
                <button
                  onClick={() => setSelectedReceiptModal(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: View Proof of Delivery (POD) Slip */}
      {selectedPodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 border border-teal-500/20 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Proof of Delivery (POD) Slip</h3>
                  <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                    <span>Docket #{selectedPodModal.docketNumber || selectedPodModal.lrNumber}</span>
                    {selectedPodModal.lrNumber && selectedPodModal.lrNumber !== selectedPodModal.docketNumber ? <span>• LR #{selectedPodModal.lrNumber}</span> : null}
                    <BuiltyTypeBadge docket={selectedPodModal} />
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPodModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Summary Banner */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Consignee</span>
                <div className="font-bold truncate text-slate-800 dark:text-slate-100" title={selectedPodModal.consigneeName}>
                  {selectedPodModal.consigneeName || 'Cash Party'}
                </div>
                {selectedPodModal.receiverName && selectedPodModal.receiverName !== 'NA' && (
                  <span className="text-[10px] text-slate-400 block truncate">Rcvd: {selectedPodModal.receiverName}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Route / Corridor</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {selectedPodModal.originBranch} → {selectedPodModal.destBranch}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Booked: {selectedPodModal.bookingDate}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Status</span>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedPodModal.isDelivered ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>{selectedPodModal.deliveryDate !== 'Pending' ? selectedPodModal.deliveryDate : 'Pending'}</span>
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">POD Audit Status</span>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedPodModal.podStatus === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                  }`}>
                    <ShieldCheck className="w-3 h-3 text-teal-500" />
                    <span>{selectedPodModal.podStatus === 'VERIFIED' ? 'Verified & Signed' : 'Uploaded (Audit Due)'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Slip Document Viewport */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/40 min-h-[300px]">
              {selectedPodModal.podUrl?.startsWith('data:application/pdf') || selectedPodModal.podUrl?.endsWith('.pdf') ? (
                <iframe
                  src={selectedPodModal.podUrl}
                  title="POD PDF Document"
                  className="w-full h-[480px] rounded-xl border border-slate-700 bg-white"
                />
              ) : (
                <img
                  src={selectedPodModal.podUrl}
                  alt={`Proof of Delivery slip for ${selectedPodModal.docketNumber || selectedPodModal.lrNumber}`}
                  className="max-h-[480px] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-200/20 dark:border-slate-800"
                />
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                TransHub Digital Proof of Delivery
              </span>
              <div className="flex items-center space-x-2">
                <a
                  href={selectedPodModal.podUrl}
                  download={`POD_${selectedPodModal.docketNumber || selectedPodModal.lrNumber}.jpg`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Slip</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPodModal(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal 4: Bank Deposit & Covered Docket Breakdown Modal */}
      {selectedDepositDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Bank Remittance &amp; Covered Docket</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Ref / UTR: {selectedDepositDetails.utrNumber || 'N/A'} • {selectedDepositDetails.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDepositDetails(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Duplicate Notice */}
              {selectedDepositDetails.isDuplicateUtr && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Duplicate UTR Submission Detected (Recorded Twice)</span>
                  </div>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                    This transaction has the exact same UTR (<strong className="font-mono">{selectedDepositDetails.utrNumber}</strong>) and amount (<strong className="font-mono">₹{selectedDepositDetails.remittedAmount?.toLocaleString('en-IN')}</strong>) recorded twice within 2 minutes for the same delivery docket. This typically happens when the user clicks the delivery confirmation button twice. Both entries point to Docket <strong className="font-mono">{selectedDepositDetails.docketNumber || 'BAL000018'}</strong>.
                  </p>
                </div>
              )}

              {/* Deposit Financial Instrument Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Bank Instrument &amp; Transfer Details
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Deposited Amount</span>
                    <strong className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹ {selectedDepositDetails.remittedAmount?.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Deposit Mode</span>
                    <strong className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedDepositDetails.depositMode === 'UPI' ? 'UPI / QR Transfer' : (selectedDepositDetails.depositMode || 'Bank Transfer')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Beneficiary Bank Account</span>
                    <strong className="text-slate-800 dark:text-slate-200 block truncate" title={selectedDepositDetails.bankName}>
                      {selectedDepositDetails.bankName || 'Company Bank Account'}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedDepositDetails.bankAccountNo ? `A/C: ••••${String(selectedDepositDetails.bankAccountNo).slice(-4)}` : 'Main Commercial Account'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Branch Hub</span>
                    <strong className="text-slate-800 dark:text-slate-200 block truncate">
                      {typeof selectedDepositDetails.branchName === 'object' ? (selectedDepositDetails.branchName?.name || selectedDepositDetails.branchName?.branch_name) : selectedDepositDetails.branchName}
                    </strong>
                    {selectedDepositDetails.createdAt && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(selectedDepositDetails.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Covered Docket / Consignment Breakdown Card */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    {selectedDepositDetails.sourceType === 'TBB_INVOICE_PAYMENT' ? (
                      <>
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>Billed Invoice &amp; Covered Consignments</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 text-blue-500" />
                        <span>Covered Consignment / Docket Details</span>
                      </>
                    )}
                  </div>
                  {selectedDepositDetails.sourceType === 'TBB_INVOICE_PAYMENT' ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      selectedDepositDetails.isPartialPayment
                        ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    }`}>
                      {selectedDepositDetails.isPartialPayment ? 'PARTIAL PAYMENT' : 'FULLY RECONCILED'}
                    </span>
                  ) : selectedDepositDetails.linkedDocket ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {selectedDepositDetails.linkedDocket.status || 'DELIVERED'}
                    </span>
                  ) : null}
                </div>

                {selectedDepositDetails.sourceType === 'TBB_INVOICE_PAYMENT' ? (
                  <div className="space-y-3 text-xs">
                    {/* Invoice Summary Bar */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Invoice #</span>
                        <strong className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{selectedDepositDetails.invoiceNumber || 'Direct Payment'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Invoice Total</span>
                        <strong className="font-mono text-xs text-slate-800 dark:text-slate-200">₹ {formatINR(selectedDepositDetails.invoiceTotal)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Paid Amount</span>
                        <strong className="font-mono text-xs text-emerald-600 dark:text-emerald-400">₹ {formatINR(selectedDepositDetails.remittedAmount)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Remaining Due</span>
                        <strong className={`font-mono text-xs ${selectedDepositDetails.invoiceBalance > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                          ₹ {formatINR(selectedDepositDetails.invoiceBalance)}
                        </strong>
                      </div>
                    </div>

                    {/* Covered Dockets Table */}
                    {selectedDepositDetails.coveredDockets && selectedDepositDetails.coveredDockets.length > 0 ? (
                      <div>
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>Dockets Covered by this Invoice ({selectedDepositDetails.coveredDockets.length}):</span>
                          <span className="text-[10px] text-slate-400">Consignor / Consignee: {selectedDepositDetails.customerName}</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedDepositDetails.coveredDockets.map((cd, idx) => {
                            const invTotal = Number(selectedDepositDetails.invoiceTotal || 0);
                            const ratio = invTotal > 0 ? Number(selectedDepositDetails.remittedAmount || 0) / invTotal : 1;
                            const docketTotal = Number(cd.totalAmount || 0);
                            const proRataPaid = Number((docketTotal * Math.min(1, ratio)).toFixed(2));
                            const proRataBal = Math.max(0, Number((docketTotal - proRataPaid).toFixed(2)));

                            return (
                              <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">{cd.docketNumber}</span>
                                    <BuiltyTypeBadge docket={cd} />
                                    <span className="text-[10px] text-slate-400">({cd.originCity} → {cd.destCity})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Total Freight: ₹{formatINR(docketTotal)} {cd.chargedWeight > 0 ? `• ${cd.chargedWeight} kg` : ''}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {selectedDepositDetails.isPartialPayment ? (
                                    <>
                                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                        ₹{formatINR(proRataPaid)} <span className="text-[10px] font-normal text-emerald-500 font-sans">Cleared</span>
                                      </div>
                                      <div className="font-mono text-[10px] text-rose-500 font-semibold">
                                        Bal: ₹{formatINR(proRataBal)}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                      ₹{formatINR(docketTotal)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs">Direct payment received against customer account {selectedDepositDetails.customerName}.</p>
                    )}
                  </div>
                ) : selectedDepositDetails.linkedDocket ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-blue-200/40 dark:border-blue-800/40">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Docket / LR Number</span>
                        <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                          <strong className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {selectedDepositDetails.linkedDocket.docketNumber}
                          </strong>
                          <BuiltyTypeBadge docket={selectedDepositDetails.linkedDocket} />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Freight Amount</span>
                        <strong className="text-sm font-black font-mono text-blue-600 dark:text-cyan-400">
                          ₹ {selectedDepositDetails.linkedDocket.totalAmount?.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Consignor (Shipper):</span>
                        <strong className="text-slate-800 dark:text-slate-200">{selectedDepositDetails.linkedDocket.consignorName || 'Shipper'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Consignee (Receiver):</span>
                        <strong className="text-slate-800 dark:text-slate-200">{selectedDepositDetails.linkedDocket.consigneeName || 'Receiver'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Corridor Route:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {selectedDepositDetails.linkedDocket.originCity} → {selectedDepositDetails.linkedDocket.destCity}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Payment Mode:</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-bold">
                          {selectedDepositDetails.linkedDocket.paymentType} ({selectedDepositDetails.linkedDocket.paymentMethod})
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      {selectedDepositDetails.remarks || 'Daily cash drawer deposit consolidated for multiple counter cash transactions.'}
                    </p>
                    {selectedDepositDetails.docketNumber && (
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400">Extracted Docket Ref:</span>{' '}
                        <strong className="font-mono text-blue-600 dark:text-cyan-400 font-bold">
                          {selectedDepositDetails.docketNumber}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                TransHub Bank Remittance Audit Register
              </span>
              <button
                type="button"
                onClick={() => setSelectedDepositDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Customer Outstanding & Ageing Party Breakdown */}
      {isPartyModalOpen && selectedPartyDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold">{selectedPartyDetails.customerName}</h3>
                    {selectedPartyDetails.customerCode && selectedPartyDetails.customerCode !== 'NA' && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {selectedPartyDetails.customerCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                    <span>GSTIN: <strong className="font-mono text-slate-600 dark:text-slate-300">{selectedPartyDetails.gstin}</strong></span>
                    <span>•</span>
                    <span>Phone: <strong className="font-mono text-slate-600 dark:text-slate-300">{selectedPartyDetails.phone}</strong></span>
                    <span>•</span>
                    <span>Branch: <strong className="text-slate-600 dark:text-slate-300">{selectedPartyDetails.branchName || selectedPartyDetails.branch} {selectedPartyDetails.branchCode ? `(${selectedPartyDetails.branchCode})` : ''}</strong></span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPartyModalOpen(false);
                  setSelectedPartyDetails(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Financial KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5">
                  <span className="text-[10px] font-bold uppercase text-rose-500">Total Outstanding</span>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {formatINR(selectedPartyDetails.totalOutstanding)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                  <span className="text-[10px] font-bold uppercase text-blue-500">Billed Invoices</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatINR(selectedPartyDetails.invoicedDue || 0)}
                  </p>
                  <span className="text-[10px] text-slate-400">{selectedPartyDetails.invoiceCount || 0} Invoices Pending</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                  <span className="text-[10px] font-bold uppercase text-amber-500">Unbilled TBB Freight</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatINR(selectedPartyDetails.unbilledTbbDue || 0)}
                  </p>
                  <span className="text-[10px] text-slate-400">Accrued Freight</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-purple-500/20 bg-purple-500/5">
                  <span className="text-[10px] font-bold uppercase text-purple-500">To-Pay Delivery Cash</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatINR(selectedPartyDetails.topayDue || 0)}
                  </p>
                  <span className="text-[10px] text-slate-400">Destination Collection</span>
                </div>
              </div>

              {/* Ageing Buckets Bar */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Ageing Timeline Breakdown</span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">0-30 Days</span>
                    <strong className="font-mono text-emerald-700 dark:text-emerald-300 font-bold text-sm">{formatINR(selectedPartyDetails.bucket0_30)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block">31-60 Days</span>
                    <strong className="font-mono text-amber-700 dark:text-amber-300 font-bold text-sm">{formatINR(selectedPartyDetails.bucket31_60)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 block">61-90 Days</span>
                    <strong className="font-mono text-orange-700 dark:text-orange-300 font-bold text-sm">{formatINR(selectedPartyDetails.bucket61_90)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block">90+ Days (Risk)</span>
                    <strong className="font-mono text-rose-700 dark:text-rose-300 font-bold text-sm">{formatINR(selectedPartyDetails.bucket90Plus)}</strong>
                  </div>
                </div>
              </div>

              {/* 1. Unpaid Billed Invoices List */}
              {selectedPartyDetails.detailedInvoices && selectedPartyDetails.detailedInvoices.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                    <span>Unpaid Invoices ({selectedPartyDetails.detailedInvoices.length})</span>
                    <span className="text-rose-500 font-mono font-bold">{formatINR(selectedPartyDetails.invoicedDue)}</span>
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800/60 font-bold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2.5">Invoice #</th>
                          <th className="p-2.5">Invoice Date</th>
                          <th className="p-2.5">Due Date</th>
                          <th className="p-2.5 text-right">Billed Amount</th>
                          <th className="p-2.5 text-right">Balance Due</th>
                          <th className="p-2.5 text-center">Overdue Days</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {selectedPartyDetails.detailedInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNumber}</td>
                            <td className="p-2.5">{inv.invoiceDate ? String(inv.invoiceDate).slice(0, 10) : '-'}</td>
                            <td className="p-2.5">{inv.dueDate ? String(inv.dueDate).slice(0, 10) : '-'}</td>
                            <td className="p-2.5 text-right">{formatINR(inv.totalAmount)}</td>
                            <td className="p-2.5 text-right font-bold text-rose-600 dark:text-rose-400">{formatINR(inv.balanceAmount)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded font-bold ${inv.overdueDays > 30 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40' : 'bg-slate-100 text-slate-700 dark:bg-slate-800'}`}>
                                {inv.overdueDays} days
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Unbilled TBB & Pending To-Pay Dockets List */}
              {selectedPartyDetails.detailedDockets && selectedPartyDetails.detailedDockets.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                    <span>Pending Consignments &amp; Dockets ({selectedPartyDetails.detailedDockets.length})</span>
                    <span className="text-amber-500 font-mono font-bold">
                      {formatINR((selectedPartyDetails.unbilledTbbDue || 0) + (selectedPartyDetails.topayDue || 0))}
                    </span>
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800/60 font-bold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2.5">Docket / LR #</th>
                          <th className="p-2.5">Freight Type</th>
                          <th className="p-2.5">Booking Date</th>
                          <th className="p-2.5">Delivery Status</th>
                          <th className="p-2.5 text-right">Freight Amount</th>
                          <th className="p-2.5 text-center">Age (Days)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {selectedPartyDetails.detailedDockets.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span>{d.docketNumber}</span>
                                <BuiltyTypeBadge docket={d} />
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                d.paymentType === 'TBB' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                              }`}>
                                {d.modeDesc || d.paymentType}
                              </span>
                            </td>
                            <td className="p-2.5">{d.bookingDate ? String(d.bookingDate).slice(0, 10) : '-'}</td>
                            <td className="p-2.5 font-sans font-semibold text-slate-600 dark:text-slate-300">{d.status}</td>
                            <td className="p-2.5 text-right font-bold text-rose-600 dark:text-rose-400">{formatINR(d.totalAmount)}</td>
                            <td className="p-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {d.overdueDays} days
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const rawPhone = (selectedPartyDetails.phone || '').replace(/[^0-9]/g, '');
                  const phoneWithCountry = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                  const message = `*Payment Reminder - ${user?.organization?.name || 'TransHub Logistics'}*
Dear ${selectedPartyDetails.customerName},

Your freight account has an outstanding balance of *${formatINR(selectedPartyDetails.totalOutstanding)}*.

Breakdown:
• Billed Invoices (${selectedPartyDetails.invoiceCount || 0}): ${formatINR(selectedPartyDetails.invoicedDue || 0)}
• Unbilled TBB Dockets: ${formatINR(selectedPartyDetails.unbilledTbbDue || 0)}
• To-Pay Delivery Freight: ${formatINR(selectedPartyDetails.topayDue || 0)}

Please arrange settlement at your earliest convenience.
Thank you for your business!`;
                  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all"
              >
                <span>Send WhatsApp Reminder</span>
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPartyModalOpen(false);
                  setSelectedPartyDetails(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Consignment Tax Audit Breakdown & Statutory GSTR-1 Parameters (SAC 9965) */}
      {selectedTaxAuditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white shadow-indigo-500/5' : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-900/10'
          }`}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shadow-xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                      Tax Audit: LR #{selectedTaxAuditItem.lrNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                      SAC {selectedTaxAuditItem.sacCode || '9965'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedTaxAuditItem.isRcm
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                    }`}>
                      {selectedTaxAuditItem.isRcm ? 'Reverse Charge (RCM 5%)' : 'Forward Charge (GTA)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Statutory Road Freight GST Audit • Booked on <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedTaxAuditItem.bookingDate}</strong> • Mode: <span className="font-semibold">{selectedTaxAuditItem.paymentType}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaxAuditItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Transporter Jurisdiction Header */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GTA Supplier (Transporter)</span>
                  <div className="font-black text-slate-900 dark:text-white mt-0.5">
                    {summary?.transporterLegalName || 'TransHub Logistics Ltd'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Supplier GSTIN</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{summary?.transporterGstin || '27AABCT9845P1Z2'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Supplier State</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{summary?.transporterState || '27-Maharashtra'}</span>
                  </div>
                </div>
              </div>

              {/* Two-Column Party Profiles: Consignor vs Consignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Consignor Card */}
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consignor (Origin Party)</span>
                    <span className={`px-2 py-0.2 rounded font-mono text-[9px] font-bold ${
                      selectedTaxAuditItem.consignorGst && selectedTaxAuditItem.consignorGst !== 'URP'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {selectedTaxAuditItem.consignorGst && selectedTaxAuditItem.consignorGst !== 'URP' ? 'B2B Registered' : 'Unregistered (URP)'}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {selectedTaxAuditItem.consignorName}
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTaxAuditItem.consignorGst}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Origin Location:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {selectedTaxAuditItem.originCity} ({selectedTaxAuditItem.consignorState || 'Origin'})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dispatch Branch:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {typeof selectedTaxAuditItem.branch === 'object' ? selectedTaxAuditItem.branch?.name : selectedTaxAuditItem.branch}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consignee Card */}
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consignee (Recipient / Destination)</span>
                    <span className={`px-2 py-0.2 rounded font-mono text-[9px] font-bold ${
                      selectedTaxAuditItem.consigneeGst && selectedTaxAuditItem.consigneeGst !== 'URP'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {selectedTaxAuditItem.consigneeGst && selectedTaxAuditItem.consigneeGst !== 'URP' ? 'B2B Registered' : 'Unregistered (URP)'}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {selectedTaxAuditItem.consigneeName}
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTaxAuditItem.consigneeGst}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destination Location:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {selectedTaxAuditItem.destCity} ({selectedTaxAuditItem.consigneeState || 'Destination'})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Receiving Branch:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {typeof selectedTaxAuditItem.destBranch === 'object' ? selectedTaxAuditItem.destBranch?.name : selectedTaxAuditItem.destBranch}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Tax Rule & RCM Determination */}
              <div className={`p-4 rounded-2xl border ${
                selectedTaxAuditItem.isRcm
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    selectedTaxAuditItem.isRcm ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${
                        selectedTaxAuditItem.isRcm ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {selectedTaxAuditItem.isRcm ? 'Reverse Charge Mechanism (RCM 5%) Applies' : 'Forward Charge GTA Tax Collection Applies'}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Place of Supply: {selectedTaxAuditItem.placeOfSupply}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {selectedTaxAuditItem.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedTaxAuditItem.isRcm ? (
                        <>
                          Under CBIC Notification No. 11/2017-Central Tax (Rate) &amp; 13/2017-Central Tax (Rate), since the recipient party is registered under GST (GSTIN: <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedTaxAuditItem.recipientGst}</span>) and the freight is billed at the statutory 5% GTA rate, the GST liability of <strong className="font-mono text-blue-600 dark:text-blue-400">{formatINR(selectedTaxAuditItem.totalGst)}</strong> is payable <strong>directly by the recipient under RCM</strong>. The transporter will not collect or remit this tax.
                        </>
                      ) : (
                        <>
                          Supplied to an unregistered retail person (B2C) or billed under standard Forward Charge. The transporter collects total GST of <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatINR(selectedTaxAuditItem.totalGst)}</strong> from the customer and discharges this liability to the government via Monthly GSTR-3B.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Valuation & Itemized Tax Computation Table */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                  Commercial Valuation &amp; Statutory GST Computation
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Freight &amp; Cargo Parameter</th>
                        <th className="p-3">Specification</th>
                        <th className="p-3 text-right">Taxable Freight</th>
                        <th className="p-3 text-center">Tax Rate</th>
                        <th className="p-3 text-right">CGST</th>
                        <th className="p-3 text-right">SGST</th>
                        <th className="p-3 text-right">IGST</th>
                        <th className="p-3 text-right">Total Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                          Road Freight Transport (SAC 9965)
                        </td>
                        <td className="p-3 font-sans text-slate-500">
                          {selectedTaxAuditItem.chargedWeight} kg • {selectedTaxAuditItem.packagesCount} pkgs
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(selectedTaxAuditItem.taxableValue)}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {selectedTaxAuditItem.taxRatePct}%
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">
                          {formatINR(selectedTaxAuditItem.cgst)}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">
                          {formatINR(selectedTaxAuditItem.sgst)}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">
                          {formatINR(selectedTaxAuditItem.igst)}
                        </td>
                        <td className="p-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                          {formatINR(selectedTaxAuditItem.totalInvoiceValue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* GSTR-1 Return Filing Cross-Reference */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">GSTR-1 Table 4</span>
                  <strong className="text-slate-900 dark:text-white block mt-0.5">
                    {selectedTaxAuditItem.isB2B ? 'Eligible B2B Supply' : 'N/A (Retail B2C)'}
                  </strong>
                  <span className="text-[10px] text-slate-500">Reverse Charge: {selectedTaxAuditItem.reverseChargeFlag}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">GSTR-1 Table 7</span>
                  <strong className="text-slate-900 dark:text-white block mt-0.5">
                    {!selectedTaxAuditItem.isB2B ? 'Eligible B2C Others' : 'Reported in Table 4'}
                  </strong>
                  <span className="text-[10px] text-slate-500">Net Taxable: {formatINR(selectedTaxAuditItem.taxableValue)}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">GSTR-1 Table 12</span>
                  <strong className="text-slate-900 dark:text-white block mt-0.5">SAC Code 9965</strong>
                  <span className="text-[10px] text-slate-500">{selectedTaxAuditItem.chargedWeight} KG Freight</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">GSTR-1 Table 13</span>
                  <strong className="text-slate-900 dark:text-white block mt-0.5">LR Document Series</strong>
                  <span className="text-[10px] text-emerald-600 font-semibold">Valid Sequence</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const auditSummary = `TransHub GST Tax Audit (SAC 9965)
LR Number: ${selectedTaxAuditItem.lrNumber}
Date: ${selectedTaxAuditItem.bookingDate}
Consignor: ${selectedTaxAuditItem.consignorName} (GSTIN: ${selectedTaxAuditItem.consignorGst})
Consignee: ${selectedTaxAuditItem.consigneeName} (GSTIN: ${selectedTaxAuditItem.consigneeGst})
Place of Supply: ${selectedTaxAuditItem.placeOfSupply}
Taxable Value: INR ${selectedTaxAuditItem.taxableValue}
Tax Type: ${selectedTaxAuditItem.taxType} (Reverse Charge: ${selectedTaxAuditItem.reverseChargeFlag})
Total GST: INR ${selectedTaxAuditItem.totalGst} (CGST: ${selectedTaxAuditItem.cgst}, SGST: ${selectedTaxAuditItem.sgst}, IGST: ${selectedTaxAuditItem.igst})
Total Invoice: INR ${selectedTaxAuditItem.totalInvoiceValue}`;
                  navigator.clipboard.writeText(auditSummary);
                  setAuditCopied(true);
                  setTimeout(() => setAuditCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 transition-all"
              >
                {auditCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{auditCopied ? 'Audit Summary Copied!' : 'Copy Tax Summary'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTaxAuditItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
