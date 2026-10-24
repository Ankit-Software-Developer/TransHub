// frontend/app/(owner)/approvals/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useStore } from '../../../store/useStore';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import { isHeadOfficeBranch } from '../../../hooks/useOperationsType';
import approvalService from '../../../services/approvalService';
import api from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowRight,
  Filter,
  Search,
  Plus,
  RefreshCw,
  Building2,
  Wallet,
  FileText,
  Truck,
  AlertTriangle,
  Paperclip,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Lock,
  Send,
  Link2,
  RotateCcw,
  Inbox,
  Edit3,
} from 'lucide-react';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';

const REQUEST_TYPE_CATEGORIES = [
  {
    category: 'Consignments & Bilties',
    types: [
      {
        key: 'BOOKING_CANCELLATION',
        label: 'Consignment / Bilty Cancel',
        desc: 'Request to void/cancel an issued docket or bilty',
        refLabel: 'Bilty / Docket Number *',
        refPlaceholder: 'e.g. BLT-10492, LR-8821',
        icon: FileText,
        color: 'rose',
        badge: 'Bilty Operation',
      },
      {
        key: 'RATE_DISCOUNT',
        label: 'Freight Rate Discount',
        desc: 'Special client tariff reduction or freight rebate',
        refLabel: 'Target Bilty / Client Ref *',
        refPlaceholder: 'e.g. BLT-10901 or Customer Code',
        icon: ArrowUpRight,
        color: 'amber',
        badge: 'Rate Waiver',
      },
      {
        key: 'DAMAGE_CLAIM',
        label: 'Damage & Shortage Claim',
        desc: 'Cargo damage settlement or shortage write-off',
        refLabel: 'Claim / Consignment # *',
        refPlaceholder: 'e.g. CLM-402, BLT-9921',
        icon: AlertTriangle,
        color: 'red',
        badge: 'Claim',
      },
    ],
  },
  {
    category: 'Finance & Station Expenses',
    types: [
      {
        key: 'EXPENSE_CLAIM',
        label: 'Petty Cash / Station Expense',
        desc: 'Branch daily expenses, godown utility or local payments',
        refLabel: 'Bill / Voucher Reference Number',
        refPlaceholder: 'e.g. VCH-0042, EXP-882',
        icon: Wallet,
        color: 'emerald',
        badge: 'Expense',
      },
      {
        key: 'DRIVER_ADVANCE',
        label: 'Driver En-Route Advance',
        desc: 'Fuel cash, highway toll, or emergency en-route fund',
        refLabel: 'Trip / Vehicle Number *',
        refPlaceholder: 'e.g. TRP-1042, HR-55-A-1234',
        icon: Wallet,
        color: 'blue',
        badge: 'Advance',
      },
      {
        key: 'CREDIT_OVERRIDE',
        label: 'Customer Credit Override',
        desc: 'Temporary credit ceiling increase to book consignment',
        refLabel: 'Customer Name / GSTIN *',
        refPlaceholder: 'e.g. ABC Corp, 07AAAAA0000A1Z5',
        icon: Building2,
        color: 'purple',
        badge: 'Credit',
      },
    ],
  },
  {
    category: 'Fleet & Trip Operations',
    types: [
      {
        key: 'TRIP_SETTLEMENT',
        label: 'Trip Final Settlement',
        desc: 'Trip expense audit and final driver closure clearance',
        refLabel: 'Trip Sheet Number *',
        refPlaceholder: 'e.g. TRP-2026-081',
        icon: Truck,
        color: 'indigo',
        badge: 'Trip',
      },
      {
        key: 'VEHICLE_MAINTENANCE',
        label: 'Vehicle Repair & Service',
        desc: 'Tyre change, engine breakdown or workshop approval',
        refLabel: 'Vehicle / Job Card # *',
        refPlaceholder: 'e.g. DL-01-AB-1234, JC-881',
        icon: Truck,
        color: 'violet',
        badge: 'Maintenance',
      },
      {
        key: 'OTHER',
        label: 'General Station Operational',
        desc: 'Special station approvals, asset request or misc waiver',
        refLabel: 'Reference # (Optional)',
        refPlaceholder: 'e.g. REF-2026-01',
        icon: FileText,
        color: 'slate',
        badge: 'Operational',
      },
    ],
  },
];

const REQUEST_TYPE_META = {};
REQUEST_TYPE_CATEGORIES.forEach((cat) => {
  cat.types.forEach((t) => {
    REQUEST_TYPE_META[t.key] = {
      label: t.label,
      desc: t.desc,
      refLabel: t.refLabel,
      refPlaceholder: t.refPlaceholder,
      icon: t.icon,
      color: t.color,
      badge: `bg-${t.color}-500/10 text-${t.color}-600 dark:text-${t.color}-400 border-${t.color}-500/20`,
    };
  });
});

const STATUS_META = {
  PENDING: { label: 'Pending Review', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  RETURNED: { label: 'Returned for Revision', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  ESCALATED: { label: 'Escalated to Head Office', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
};

const PRIORITY_META = {
  LOW: { label: 'Low', badge: 'bg-slate-500/10 text-slate-500' },
  NORMAL: { label: 'Normal', badge: 'bg-blue-500/10 text-blue-500' },
  HIGH: { label: 'High Priority', badge: 'bg-orange-500/15 text-orange-600 font-semibold' },
  URGENT: { label: 'URGENT', badge: 'bg-rose-500/20 text-rose-600 font-bold animate-pulse' },
};

export default function ApprovalsPage() {
  const user = useStore((state) => state.user);
  const { theme } = useTheme();
  const { isAdmin, isSuperAdmin, isBranchManager, isBranchAssistant } = usePermissions();
  const isDark = theme === 'dark';

  // Resolved branch for logged in branch user
  const userBranchId = useMemo(() => {
    return user?.branchId || user?.branch_id || user?.branch?.id || user?.assigned_branch_id || null;
  }, [user]);

  // State
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'outbox', 'branch', 'history'
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [badgeCounts, setBadgeCounts] = useState({
    pendingAction: 0,
    approvedCount: 0,
    rejectedCount: 0,
    escalatedCount: 0,
    returnedCount: 0,
    myReturnedCount: 0,
    myPendingCount: 0,
    myTotalCount: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState(!isAdmin && userBranchId ? userBranchId : 'ALL');
  const [branches, setBranches] = useState([]);

  const userBranchName = useMemo(() => {
    if (!userBranchId) return 'Assigned Branch';
    const found = branches.find((b) => String(b.id) === String(userBranchId));
    return found?.branch_name || user?.branchName || user?.branch_name || user?.branch?.name || `Branch #${userBranchId}`;
  }, [userBranchId, branches, user]);

  const userBranchCode = useMemo(() => {
    if (!userBranchId) return 'HUB';
    const found = branches.find((b) => String(b.id) === String(userBranchId));
    return found?.branch_code || found?.code || user?.branchCode || user?.branch_code || user?.branch?.branch_code || user?.branch?.code || 'HUB';
  }, [userBranchId, branches, user]);

  // Modals & Drawers
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, action: null, reqId: null });
  const [actionComments, setActionComments] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Custom Request Type Dropdown State in Modal
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const typeDropdownRef = useRef(null);

  // Resubmit Modal State for Returned Requests
  const [resubmitModal, setResubmitModal] = useState({ open: false, request: null });
  const [resubmitForm, setResubmitForm] = useState({
    amount: '',
    priority: 'NORMAL',
    requester_notes: '',
    supporting_document_url: '',
  });
  const [resubmitSubmitting, setResubmitSubmitting] = useState(false);

  const openResubmitModal = (req) => {
    setResubmitModal({ open: true, request: req });
    setResubmitForm({
      amount: req.amount !== undefined && req.amount !== null ? String(req.amount) : '',
      priority: req.priority || 'NORMAL',
      requester_notes: req.requester_notes || '',
      supporting_document_url: req.supporting_document_url || '',
    });
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!resubmitModal.request) return;
    try {
      setResubmitSubmitting(true);
      await approvalService.resubmitApproval(resubmitModal.request.id, {
        amount: parseFloat(resubmitForm.amount) || 0,
        priority: resubmitForm.priority,
        requester_notes: resubmitForm.requester_notes,
        supporting_document_url: resubmitForm.supporting_document_url,
      });
      setResubmitModal({ open: false, request: null });
      setSelectedRequest(null);
      await fetchRequests();
      await fetchCounters();
    } catch (err) {
      console.error('Failed to resubmit request:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to resubmit request');
    } finally {
      setResubmitSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    if (isTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTypeDropdownOpen]);

  // New Request Form State
  const [formData, setFormData] = useState({
    request_type: 'EXPENSE_CLAIM',
    reference_code: '',
    amount: '',
    branch_id: !isAdmin && userBranchId ? userBranchId : '',
    priority: 'NORMAL',
    requester_notes: '',
    supporting_document_url: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Active Request Type metadata
  const activeTypeMeta = useMemo(() => {
    return REQUEST_TYPE_META[formData.request_type] || REQUEST_TYPE_META.EXPENSE_CLAIM;
  }, [formData.request_type]);

  // Filtered categories for custom type dropdown
  const filteredTypeCategories = useMemo(() => {
    if (!typeSearch.trim()) return REQUEST_TYPE_CATEGORIES;
    const q = typeSearch.toLowerCase();
    return REQUEST_TYPE_CATEGORIES.map((cat) => {
      const matched = cat.types.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.desc.toLowerCase().includes(q) ||
          t.badge.toLowerCase().includes(q)
      );
      return { ...cat, types: matched };
    }).filter((cat) => cat.types.length > 0);
  }, [typeSearch]);

  // Fetch branches for filter and creation
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        const list = res.data?.data?.branches || res.data?.data || [];
        setBranches(Array.isArray(list) ? list : []);
        if (!isAdmin && userBranchId) {
          setBranchFilter(userBranchId);
        }
      } catch (err) {
        // Silently ignore
      }
    };
    fetchBranches();
  }, [isAdmin, userBranchId]);

  // Synchronize branch filter whenever user/role updates
  useEffect(() => {
    if (!isAdmin && userBranchId) {
      setBranchFilter(userBranchId);
    } else if (isAdmin && (!branchFilter || branchFilter === '')) {
      setBranchFilter('ALL');
    }
  }, [isAdmin, userBranchId]);

  // Fetch counters
  const fetchCounters = useCallback(async () => {
    try {
      const counts = await approvalService.getBadgeCounts();
      if (counts) setBadgeCounts(counts);
    } catch (e) {
      console.error('Failed to load counters', e);
    }
  }, []);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        tab: activeTab,
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.request_type = typeFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (branchFilter !== 'ALL') params.branch_id = branchFilter;

      const res = await approvalService.listApprovals(params);
      setRequests(res?.data || []);
      if (res?.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total || 0,
          pages: res.pagination.pages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, pagination.limit, search, statusFilter, typeFilter, priorityFilter, branchFilter]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Tab change
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setStatusFilter('ALL');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Open Action Modal (Approve, Reject, Escalate)
  const openActionDialog = (reqId, action) => {
    setActionComments('');
    setActionModal({ open: true, action, reqId });
  };

  // Submit Action
  const submitAction = async () => {
    if (actionModal.action !== 'APPROVE' && !actionComments.trim()) {
      alert(
        actionModal.action === 'RETURN'
          ? 'Please specify what needs clarification or correction before returning to the requester (Mandatory).'
          : actionModal.action === 'ESCALATE'
            ? 'Please specify the reason for escalating to Head Office (Mandatory).'
            : 'Please enter a rejection reason or remark (Mandatory).'
      );
      return;
    }

    setActionSubmitting(true);
    try {
      await approvalService.handleAction(actionModal.reqId, actionModal.action, actionComments);
      setActionModal({ open: false, action: null, reqId: null });
      setSelectedRequest(null);
      fetchCounters();
      fetchRequests();
    } catch (err) {
      const errMsg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to process action';
      alert(errMsg);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Submit New Request
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const resolvedBranchId = (!isAdmin && userBranchId) ? userBranchId : (formData.branch_id || (branches[0]?.id || null));
    if (!resolvedBranchId) {
      alert('Please select a branch or station for this request.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await approvalService.createApproval({
        ...formData,
        branch_id: resolvedBranchId,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
      });
      setCreateModalOpen(false);
      setFormData({
        request_type: 'EXPENSE_CLAIM',
        reference_code: '',
        amount: '',
        branch_id: !isAdmin && userBranchId ? userBranchId : '',
        priority: 'NORMAL',
        requester_notes: '',
        supporting_document_url: '',
      });
      fetchCounters();
      setActiveTab('outbox');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setCreateSubmitting(false);
    }
  };

  if (isSuperAdmin) {
    return (
      <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
        } font-sans`}>
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
          <Navbar />
          <main className="flex-1 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black">Super Admin Notice</h2>
            <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
              The Operational Approvals Center is for logistics transport organizations and their branch networks. Platform Super Admin does not participate in transport branch-level approvals.
            </p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
      } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 w-full max-w-full">
          {/* 1. Header Bar */}
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black tracking-tight flex flex-wrap items-center gap-2">
                    Approvals & Requests Center
                    <span className="hidden xl:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                      Workflow Engine
                    </span>
                    {!isAdmin && userBranchId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{userBranchName}: {userBranchCode}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                      </span>
                    )}
                  </h1>
                  <p className={`text-xs sm:text-sm mt-0.5 truncate sm:whitespace-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Hierarchical operational authorizations for branches, hubs, and executive head office
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={() => { fetchCounters(); fetchRequests(); }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                title="Refresh requests"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Admin login: Branch selection dropdown right before New Request button */}
              {isAdmin && branches.length > 0 && (
                <div className="shrink-0">
                  <BranchFilterDropdown
                    selectedBranchId={branchFilter}
                    onChange={(newBranchId) => setBranchFilter(newBranchId)}
                    branches={branches}
                    allLabel="All Branches & Hubs"
                    allSubtitle="Network-wide Requests"
                    label="Branch:"
                    showLabel={true}
                    align="right"
                  />
                </div>
              )}

              {/* Only non-admin staff/branch managers submit new requests. Admin only reviews and authorizes. */}
              {!isAdmin && (
                <button
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      branch_id: userBranchId || (branchFilter !== 'ALL' ? branchFilter : (branches[0]?.id || '')),
                    }));
                    setCreateModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-transform active:scale-95 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Request</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Incoming Approvals Inbox */}
            <div className={`p-4 rounded-2xl border transition-all ${isDark
                ? 'bg-gradient-to-br from-blue-950/30 via-slate-900 to-blue-900/10 border-blue-500/30'
                : 'bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-blue-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-700'
                  }`}>
                  Incoming Inbox
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Inbox className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
                {badgeCounts.pendingAction}
              </p>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1 font-medium">
                Awaiting your authorization
              </p>
            </div>

            {/* Approved */}
            <div className={`p-4 rounded-2xl border transition-all ${isDark
                ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-emerald-900/10 border-emerald-500/30'
                : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-emerald-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                  Approved
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
                {badgeCounts.approvedCount}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
                Authorized requests
              </p>
            </div>

            {/* Returned / Needs Revision */}
            <div className={`p-4 rounded-2xl border transition-all ${isDark
                ? 'bg-gradient-to-br from-orange-950/30 via-slate-900 to-orange-900/10 border-orange-500/30'
                : 'bg-gradient-to-br from-orange-50 via-white to-orange-50/50 border-orange-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-orange-400' : 'text-orange-700'
                  }`}>
                  Returned / Revision
                </span>
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 tracking-tight text-orange-600 dark:text-orange-400">
                {badgeCounts.returnedCount || 0}
              </p>
              <p className="text-[10px] text-orange-600/80 dark:text-orange-400/80 mt-1 font-medium">
                Sent back for clarification
              </p>
            </div>

            {/* Rejected */}
            <div className={`p-4 rounded-2xl border transition-all ${isDark
                ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-rose-900/10 border-rose-500/30'
                : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/50 border-rose-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-rose-400' : 'text-rose-700'
                  }`}>
                  Rejected
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
                {badgeCounts.rejectedCount}
              </p>
              <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1 font-medium">
                Declined with notes
              </p>
            </div>

            {/* My Requests */}
            <div className={`p-4 rounded-2xl border col-span-2 lg:col-span-1 transition-all ${isDark
                ? 'bg-gradient-to-br from-cyan-950/30 via-slate-900 to-cyan-900/10 border-cyan-500/30'
                : 'bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50 border-cyan-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-700'
                  }`}>
                  My Requests
                </span>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 tracking-tight text-cyan-600 dark:text-cyan-400">
                {badgeCounts.myTotalCount || badgeCounts.myPendingCount}
              </p>
              <p className="text-[10px] text-cyan-600/80 dark:text-cyan-400/80 mt-1 font-medium">
                Raised by you
              </p>
            </div>
          </div>

          {/* 3. Tab Switcher */}
          <div className={`flex items-center border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} overflow-x-auto gap-2`}>
            <button
              onClick={() => handleTabChange('inbox')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'inbox'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Incoming Approvals (Inbox)</span>
              {badgeCounts.pendingAction > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500 text-white animate-pulse">
                  {badgeCounts.pendingAction}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('outbox')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'outbox'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>My Requests</span>
              {(badgeCounts.myReturnedCount || 0) > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-500 text-white animate-pulse">
                  {badgeCounts.myReturnedCount} Needs Fix
                </span>
              ) : badgeCounts.myPendingCount > 0 ? (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-500">
                  {badgeCounts.myPendingCount}
                </span>
              ) : null}
            </button>

            {isAdmin && (
              <button
                onClick={() => handleTabChange('branch')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'branch'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Branch Requests</span>
              </button>
            )}

            <button
              onClick={() => handleTabChange('history')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approval History & Decisions</span>
            </button>
          </div>


          {/* 4. Filter Toolbar */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Docket code, Voucher, or remarks..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border transition-colors ${isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                  } focus:outline-none`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Request Type Filter */}
              <div className="relative flex-1 sm:flex-none min-w-[140px]">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`w-full pl-3 pr-8 py-2 rounded-xl text-xs border font-semibold focus:outline-none appearance-none cursor-pointer transition-all ${typeFilter !== 'ALL'
                      ? isDark
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-blue-50 border-blue-300 text-blue-800'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                >
                  <option value="ALL">All Request Types</option>
                  {Object.keys(REQUEST_TYPE_META).map((key) => (
                    <option key={key} value={key}>{REQUEST_TYPE_META[key].label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative flex-1 sm:flex-none min-w-[120px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full pl-3 pr-8 py-2 rounded-xl text-xs border font-semibold focus:outline-none appearance-none cursor-pointer transition-all ${statusFilter !== 'ALL'
                      ? isDark
                        ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                        : 'bg-amber-50 border-amber-300 text-amber-800'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                >
                  <option value="ALL">{activeTab === 'history' ? 'All Decisions' : 'All Statuses'}</option>
                  {activeTab === 'history' ? (
                    <>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </>
                  ) : (
                    <>
                      <option value="PENDING">Pending Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="RETURNED">Returned for Revision</option>
                      <option value="ESCALATED">Escalated</option>
                    </>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Priority Filter */}
              <div className="relative flex-1 sm:flex-none min-w-[110px]">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={`w-full pl-3 pr-8 py-2 rounded-xl text-xs border font-semibold focus:outline-none appearance-none cursor-pointer transition-all ${priorityFilter !== 'ALL'
                      ? isDark
                        ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 5. Request Table & List */}
          <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Fetching approval records...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {activeTab === 'history' ? 'No decision history records yet' : 'No approval requests found'}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {activeTab === 'inbox'
                      ? 'Great job! Your approval queue is completely clear.'
                      : activeTab === 'history'
                        ? 'Finalized approvals and rejections will be archived here for audit trail.'
                        : 'No records matching the selected criteria.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[480px] sm:max-h-[540px] lg:max-h-[calc(100vh-290px)] min-h-[280px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className={`sticky top-0 z-20 shadow-xs border-b ${isDark ? 'border-slate-800 bg-[#0B1020] text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                    <tr>
                      <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[10px]">Reference / Type</th>
                      <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[10px]">Requester & Branch</th>
                      <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[10px]">Amount</th>
                      <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[10px]">Priority</th>
                      <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[10px]">Level / Status</th>
                      <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[10px]">Date</th>
                      <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {requests.map((req) => {
                      const meta = REQUEST_TYPE_META[req.request_type] || REQUEST_TYPE_META.OTHER;
                      const Icon = meta.icon;
                      const statusInfo = STATUS_META[req.status] || STATUS_META.PENDING;
                      const priorityInfo = PRIORITY_META[req.priority] || PRIORITY_META.NORMAL;
                      const isOwn = Boolean(
                        (req.requester_id && user?.id && String(req.requester_id) === String(user.id)) ||
                        (req.requester?.id && user?.id && String(req.requester.id) === String(user.id))
                      );
                      const canResubmit = activeTab === 'outbox' && (isOwn || isAdmin) && req.status === 'RETURNED';
                      const isTerminal = activeTab === 'history' || req.status === 'APPROVED' || req.status === 'REJECTED';
                      const isActionableForUser = (req.status === 'PENDING' || req.status === 'ESCALATED') && !isOwn && (
                        isAdmin || (
                          isBranchManager &&
                          (req.approval_level === 'BRANCH_MANAGER' || req.approval_level === 'HUB_MANAGER') &&
                          (!userBranchId || String(req.branch_id) === String(userBranchId))
                        ) || (
                          req.assigned_user_id && user?.id && String(req.assigned_user_id) === String(user.id)
                        )
                      );
                      const canAct = activeTab === 'inbox' && isActionableForUser;

                      return (
                        <tr
                          key={req.id}
                          className={`transition-colors group hover:${isDark ? 'bg-slate-900/40' : 'bg-slate-50/80'}`}
                        >
                          {/* Reference & Type */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.badge}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold flex items-center gap-1.5">
                                  <span>{req.reference_code || req.id.slice(0, 8)}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {meta.label}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Requester & Branch */}
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {req.requester ? `${req.requester.first_name} ${req.requester.last_name || ''}` : 'Operational Staff'}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{req.branch?.branch_name || 'Main Branch'}</span>
                              {isHeadOfficeBranch(req.branch) ? (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-purple-500/10 text-purple-500 font-bold">
                                  HQ
                                </span>
                              ) : req.branch?.is_hub ? (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-500 font-bold">
                                  HUB
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3.5 font-bold">
                            {req.amount && parseFloat(req.amount) > 0 ? (
                              <span className="text-slate-900 dark:text-white">
                                ₹{parseFloat(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-400">--</span>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${priorityInfo.badge}`}>
                              {priorityInfo.label}
                            </span>
                          </td>

                          {/* Level & Status */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                Assigned: <span className="font-semibold">{req.approval_level}</span>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                            {new Date(req.created_at || req.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedRequest(req)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${isDark
                                    ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                                    : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                  }`}
                                title="View Full Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Details</span>
                              </button>

                              {canAct && (
                                <>
                                  <button
                                    onClick={() => openActionDialog(req.id, 'APPROVE')}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                                    title="Approve Request"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>

                                  <button
                                    onClick={() => openActionDialog(req.id, 'RETURN')}
                                    className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                                    title="Return to Requester for Clarification / Revision"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Return</span>
                                  </button>

                                  <button
                                    onClick={() => openActionDialog(req.id, 'REJECT')}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                                    title="Reject Request"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>

                                  {isBranchManager && !isAdmin && (
                                    <button
                                      onClick={() => openActionDialog(req.id, 'ESCALATE')}
                                      className="px-2 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer"
                                      title="Escalate to Head Office"
                                    >
                                      <ArrowUpRight className="w-3 h-3" />
                                      <span className="hidden md:inline">Escalate</span>
                                    </button>
                                  )}
                                </>
                              )}

                              {canResubmit && (
                                <button
                                  onClick={() => openResubmitModal(req)}
                                  className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                                  title="Edit details and resubmit to reviewer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Edit &amp; Resend</span>
                                </button>
                              )}

                              {isTerminal && (
                                <span
                                  className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
                                  title="Decision finalized. This request cannot be edited or resubmitted."
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Locked</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Bar */}
            {pagination.pages > 1 && (
              <div className={`p-4 border-t flex items-center justify-between text-xs ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                }`}>
                <span>Showing {requests.length} of {pagination.total} records</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Review & Detail Modal Drawer */}
          <Modal isOpen={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)}>
            {selectedRequest && (
              <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 my-auto ${isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b pb-4 border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-500 border border-blue-500/30">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-black">
                        Request Details • {selectedRequest.reference_code || selectedRequest.id.slice(0, 8)}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {REQUEST_TYPE_META[selectedRequest.request_type]?.label || 'Operational Approval'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status & Priority Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_META[selectedRequest.status]?.color}`}>
                    Status: {STATUS_META[selectedRequest.status]?.label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_META[selectedRequest.priority]?.badge}`}>
                    Priority: {PRIORITY_META[selectedRequest.priority]?.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                    Routed to: {selectedRequest.approval_level}
                  </span>
                </div>

                {/* Information Grid */}
                <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Requester</p>
                    <p className="text-xs font-bold mt-0.5">
                      {selectedRequest.requester ? `${selectedRequest.requester.first_name} ${selectedRequest.requester.last_name || ''}` : 'Operational Staff'}
                    </p>
                    <p className="text-[11px] text-slate-400">{selectedRequest.requester?.email || selectedRequest.requester?.phone || ''}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Originating Branch</p>
                    <p className="text-xs font-bold mt-0.5">
                      {selectedRequest.branch?.branch_name || 'Main Branch'}
                      {isHeadOfficeBranch(selectedRequest.branch) ? ' (Head Office HQ)' : selectedRequest.branch?.is_hub ? ' (Transshipment Hub)' : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">{selectedRequest.branch?.city || ''}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Claim / Amount</p>
                    <p className="text-base font-black text-emerald-500 mt-0.5">
                      {selectedRequest.amount && parseFloat(selectedRequest.amount) > 0
                        ? `₹${parseFloat(selectedRequest.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : 'Non-Financial'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Submitted On</p>
                    <p className="text-xs font-semibold mt-0.5">
                      {new Date(selectedRequest.created_at || selectedRequest.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Requester Justification Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold flex items-center gap-1.5 text-slate-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Requester Remarks / Reason</span>
                  </label>
                  <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                    {selectedRequest.requester_notes || 'No remarks provided.'}
                  </div>
                </div>

                {/* Reviewer Comments (if already reviewed) */}
                {selectedRequest.reviewer_comments && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold flex items-center gap-1.5 text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Reviewer Remarks</span>
                    </label>
                    <div className={`p-3 rounded-xl border text-xs ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                      {selectedRequest.reviewer_comments}
                      {selectedRequest.reviewer && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Reviewed by {selectedRequest.reviewer.first_name} {selectedRequest.reviewer.last_name || ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Supporting Document / Voucher Attachment */}
                {selectedRequest.supporting_document_url && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold flex items-center gap-1.5 text-slate-400">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Supporting Document / Voucher Receipt</span>
                    </label>
                    <div className="p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2 bg-slate-900/60">
                      <span className="text-xs font-mono truncate min-w-0 flex-1">
                        {selectedRequest.supporting_document_url}
                      </span>
                      <a
                        href={selectedRequest.supporting_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <span>View Receipt</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Reviewer Returned for Revision Notice if applicable */}
                {selectedRequest.status === 'RETURNED' && (
                  <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <RotateCcw className="w-4 h-4" />
                      <span>Returned by Reviewer for Revision / Clarification</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      "{selectedRequest.reviewer_comments || 'Please correct the indicated details or attach missing bills and resubmit.'}"
                    </p>
                    {selectedRequest.reviewer && (
                      <p className="text-[10px] text-slate-400">
                        Sent back by {selectedRequest.reviewer.first_name} {selectedRequest.reviewer.last_name || ''}
                      </p>
                    )}

                    {/* Edit & Resubmit button inside the banner (only accessible in My Requests tab) */}
                    {activeTab === 'outbox' && (
                      ((selectedRequest.requester_id && user?.id && String(selectedRequest.requester_id) === String(user.id)) ||
                        (selectedRequest.requester?.id && user?.id && String(selectedRequest.requester.id) === String(user.id)) ||
                        isAdmin)
                    ) && (
                        <button
                          onClick={() => {
                            const reqToEdit = selectedRequest;
                            setSelectedRequest(null);
                            openResubmitModal(reqToEdit);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Edit &amp; Resubmit Request Now</span>
                        </button>
                      )}
                  </div>
                )}

                {/* If APPROVED or REJECTED, show immutable lock banner */}
                {(selectedRequest.status === 'APPROVED' || selectedRequest.status === 'REJECTED') && (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${selectedRequest.status === 'APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedRequest.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                      }`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold">
                        {selectedRequest.status === 'APPROVED' ? 'Decision Finalized — Approved' : 'Decision Finalized — Rejected'}
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                        This request has been completed and permanently locked by Head Office / Reviewer. It cannot be edited, revised, or resubmitted.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions Footer inside Modal */}
                {(() => {
                  const currentUserId = user?.id;
                  const isOwnRequest = Boolean(
                    (selectedRequest.requester_id && currentUserId && String(selectedRequest.requester_id) === String(currentUserId)) ||
                    (selectedRequest.requester?.id && currentUserId && String(selectedRequest.requester.id) === String(currentUserId))
                  );
                  const isPending = selectedRequest.status === 'PENDING' || selectedRequest.status === 'ESCALATED';

                  if (!isPending) return null;

                  if (isOwnRequest) {
                    return (
                      <div className={`border-t pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${isDark ? 'bg-blue-500/10 border-blue-500/25 text-blue-300' : 'bg-blue-50/80 border-blue-200 text-blue-900'
                        }`}>
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">This is your submitted request (Applicant)</p>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              {selectedRequest.approval_level === 'ADMIN'
                                ? 'Currently awaiting authorization from Head Office (Admin). As the requester, you cannot approve your own request.'
                                : 'Currently awaiting authorization from Branch Manager. As the requester, you cannot approve your own request.'}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold self-start sm:self-auto bg-amber-500/20 text-amber-500 border border-amber-500/30">
                          Pending Review
                        </span>
                      </div>
                    );
                  }

                  const canActOnSelected = isAdmin || (
                    isBranchManager &&
                    (selectedRequest.approval_level === 'BRANCH_MANAGER' || selectedRequest.approval_level === 'HUB_MANAGER') &&
                    (!userBranchId || String(selectedRequest.branch_id) === String(userBranchId))
                  ) || (
                      selectedRequest.assigned_user_id && currentUserId && String(selectedRequest.assigned_user_id) === String(currentUserId)
                    );

                  if (!canActOnSelected) {
                    return (
                      <div className={`border-t pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">Assigned Reviewer Level: {selectedRequest.approval_level}</p>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              {selectedRequest.approval_level === 'ADMIN'
                                ? 'Only Head Office (Admin) has authorization rights for this request.'
                                : `Only the authorized Branch Manager (${selectedRequest.branch?.branch_name || 'Branch'}) can act on this request.`}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          View Only
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="border-t pt-4 border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2">
                      <button
                        onClick={() => openActionDialog(selectedRequest.id, 'APPROVE')}
                        className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve Request</span>
                      </button>

                      <button
                        onClick={() => openActionDialog(selectedRequest.id, 'RETURN')}
                        className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Return for Revision</span>
                      </button>

                      <button
                        onClick={() => openActionDialog(selectedRequest.id, 'REJECT')}
                        className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      {isBranchManager && !isAdmin && (
                        <button
                          onClick={() => openActionDialog(selectedRequest.id, 'ESCALATE')}
                          className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          <span>Escalate to Admin</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </Modal>

          {/* 7. Action Confirmation Modal (Approve, Return, Reject, Escalate) */}
          <Modal isOpen={Boolean(actionModal.open)} onClose={() => setActionModal({ open: false, action: null, reqId: null })}>
            {actionModal.open && (
              <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-4 sm:p-6 space-y-4 my-auto ${isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${actionModal.action === 'APPROVE'
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : actionModal.action === 'RETURN'
                        ? 'bg-orange-500/20 text-orange-500'
                        : actionModal.action === 'REJECT'
                          ? 'bg-rose-500/20 text-rose-500'
                          : 'bg-purple-500/20 text-purple-500'
                    }`}>
                    {actionModal.action === 'APPROVE' ? (
                      <Check className="w-5 h-5" />
                    ) : actionModal.action === 'RETURN' ? (
                      <RotateCcw className="w-5 h-5" />
                    ) : actionModal.action === 'REJECT' ? (
                      <X className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black">
                      {actionModal.action === 'APPROVE'
                        ? 'Confirm Approval'
                        : actionModal.action === 'RETURN'
                          ? 'Return to Requester for Revision'
                          : actionModal.action === 'REJECT'
                            ? 'Reject Request'
                            : 'Escalate to Head Office'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {actionModal.action === 'APPROVE'
                        ? 'Authorize this request and execute updates'
                        : actionModal.action === 'RETURN'
                          ? 'Send back to requester specifying what needs clarification or correction'
                          : actionModal.action === 'REJECT'
                            ? 'Decline request with mandatory reason'
                            : 'Forward to Transporter Admin for higher limit approval'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold flex items-center justify-between">
                    <span>
                      {actionModal.action === 'APPROVE'
                        ? 'Reviewer Remarks'
                        : actionModal.action === 'RETURN'
                          ? 'Required Clarification / Revision Details'
                          : actionModal.action === 'ESCALATE'
                            ? 'Reason for Escalation to Head Office'
                            : 'Rejection Reason'}
                    </span>
                    <span className={actionModal.action === 'APPROVE' ? 'text-slate-400 font-normal text-[11px]' : 'text-rose-500 font-bold text-[11px]'}>
                      {actionModal.action === 'APPROVE' ? '(Optional)' : '(Mandatory)*'}
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={actionComments}
                    onChange={(e) => setActionComments(e.target.value)}
                    placeholder={
                      actionModal.action === 'APPROVE'
                        ? 'Enter optional approval notes, disbursal instruction, or remarks...'
                        : actionModal.action === 'RETURN'
                          ? 'Specify what is incorrect or what document/bill clarification is required (Mandatory)...'
                          : actionModal.action === 'ESCALATE'
                            ? 'Specify why this request is being escalated to Head Office (Mandatory)...'
                            : 'Specify the clear reason for declining this request (Mandatory)...'
                    }
                    className={`w-full p-3 rounded-xl text-xs border transition-colors ${isDark
                        ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      } focus:outline-none focus:border-blue-500`}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal({ open: false, action: null, reqId: null })}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={actionSubmitting || (actionModal.action !== 'APPROVE' && !actionComments.trim())}
                    onClick={submitAction}
                    className={`w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 cursor-pointer ${actionModal.action === 'APPROVE'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : actionModal.action === 'RETURN'
                          ? 'bg-orange-500 hover:bg-orange-600'
                          : actionModal.action === 'REJECT'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-purple-600 hover:bg-purple-700'
                      } disabled:opacity-50`}
                  >
                    {actionSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {actionModal.action === 'APPROVE'
                        ? 'Confirm & Approve'
                        : actionModal.action === 'RETURN'
                          ? 'Return for Revision'
                          : actionModal.action === 'REJECT'
                            ? 'Confirm Rejection'
                            : 'Confirm Escalation'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* 8. Submit New Request Modal */}
          <Modal isOpen={Boolean(createModalOpen)} onClose={() => setCreateModalOpen(false)}>
            {createModalOpen && (
              <div className={`w-full max-w-xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Pinned Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold tracking-tight truncate">New Operational Request</h3>
                      <p className="text-xs text-slate-400 truncate">Internal station authorization for expenses, credit, discounts & claims</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col overflow-hidden">
                  {/* Scrollable Form Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Dynamic Hierarchy Routing Pipeline based on role */}
                    <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                      }`}>
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between text-xs font-semibold gap-1.5 mb-2">
                        {isBranchAssistant ? (
                          <>
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                              <span className="text-[11px]">Branch Assistant (You)</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                              <span className="text-[11px]">Branch Manager</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                              <span className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">3</span>
                              <span className="text-[11px]">Head Office Admin</span>
                            </div>
                          </>
                        ) : isBranchManager ? (
                          <>
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                              <span className="text-[11px]">Branch Manager (You)</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                              <span className="text-[11px]">Head Office</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px]">✓</span>
                              <span className="text-[11px]">Ledger Override</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                              <span className="text-[11px]">Executive Head Office (You)</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">✓</span>
                              <span className="text-[11px]">Direct Authorization</span>
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {isBranchAssistant
                          ? 'Your request routes to your Branch Manager for approval. Cancellations or amounts over ₹20,000 escalate to Head Office.'
                          : isBranchManager
                            ? 'As Branch Manager, your bilty cancellation, discount, or branch expense requests route directly to Transporter Head Office.'
                            : 'Executive Head Office request. Approved changes take immediate effect across network branches and accounts.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Request Type Custom Categorized Dropdown */}
                    <div className="space-y-1.5 relative" ref={typeDropdownRef}>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Request Type *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTypeDropdownOpen((prev) => !prev);
                          setTypeSearch('');
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer ${isTypeDropdownOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : isDark
                              ? 'bg-slate-900 border-slate-800 text-white hover:border-slate-700'
                              : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${activeTypeMeta.color === 'rose'
                              ? 'bg-rose-500/20 text-rose-500'
                              : activeTypeMeta.color === 'emerald'
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : activeTypeMeta.color === 'blue'
                                  ? 'bg-blue-500/20 text-blue-500'
                                  : activeTypeMeta.color === 'amber'
                                    ? 'bg-amber-500/20 text-amber-500'
                                    : activeTypeMeta.color === 'indigo'
                                      ? 'bg-indigo-500/20 text-indigo-500'
                                      : activeTypeMeta.color === 'violet'
                                        ? 'bg-violet-500/20 text-violet-500'
                                        : activeTypeMeta.color === 'purple'
                                          ? 'bg-purple-500/20 text-purple-500'
                                          : 'bg-slate-500/20 text-slate-400'
                            }`}>
                            <activeTypeMeta.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col text-left truncate">
                            <span className="font-bold truncate text-slate-900 dark:text-white">
                              {activeTypeMeta.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${activeTypeMeta.color === 'rose'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : activeTypeMeta.color === 'emerald'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : activeTypeMeta.color === 'blue'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  : activeTypeMeta.color === 'amber'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : activeTypeMeta.color === 'indigo'
                                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                      : activeTypeMeta.color === 'violet'
                                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                                        : activeTypeMeta.color === 'purple'
                                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                          : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                            }`}>
                            {activeTypeMeta.badge || 'Operation'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                        </div>
                      </button>

                      {/* Dropdown Menu */}
                      {isTypeDropdownOpen && (
                        <div className={`absolute top-full left-0 right-0 mt-1.5 rounded-2xl border shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-[#0E1526] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-blue-500/10'
                          }`}>
                          {/* Search Filter */}
                          <div className={`p-2.5 border-b ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                autoFocus
                                value={typeSearch}
                                onChange={(e) => setTypeSearch(e.target.value)}
                                placeholder="Search request type (e.g. bilty, expense, discount)..."
                                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                                  } focus:outline-none focus:border-blue-500`}
                              />
                            </div>
                          </div>

                          {/* Categorized List */}
                          <div className="max-h-64 overflow-y-auto p-1.5 space-y-2">
                            {filteredTypeCategories.map((cat, cIdx) => (
                              <div key={cat.category || cIdx} className="space-y-1">
                                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  {cat.category}
                                </div>
                                {cat.types.map((t) => {
                                  const isSelected = formData.request_type === t.key;
                                  const Icon = t.icon || FileText;
                                  return (
                                    <button
                                      key={t.key}
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, request_type: t.key }));
                                        setIsTypeDropdownOpen(false);
                                      }}
                                      className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${isSelected
                                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                          : isDark
                                            ? 'hover:bg-slate-800/70 text-slate-200'
                                            : 'hover:bg-slate-100 text-slate-800'
                                        }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected
                                            ? 'bg-white/20 text-white'
                                            : isDark
                                              ? 'bg-slate-800 text-cyan-400'
                                              : 'bg-slate-100 text-blue-600'
                                          }`}>
                                          <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-xs truncate flex items-center gap-1.5">
                                            <span>{t.label}</span>
                                          </div>
                                          <p className={`text-[10px] leading-tight truncate ${isSelected ? 'text-blue-100' : isDark ? 'text-slate-400' : 'text-slate-500'
                                            }`}>
                                            {t.desc}
                                          </p>
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Branch / Hub */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Branch / Station *
                      </label>
                      {!isAdmin && userBranchId ? (
                        <div className={`w-full px-3 py-2 rounded-xl text-xs border flex items-center justify-between font-semibold transition-all ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}>
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="truncate">{userBranchName}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold shrink-0 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Station</span>
                          </span>
                        </div>
                      ) : (
                        <select
                          value={formData.branch_id}
                          onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                          className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          required
                        >
                          <option value="">Select Branch / Station</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.branch_name} {isHeadOfficeBranch(b) ? '(HQ)' : b.is_hub ? '(Hub)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Dynamic Reference Code Input */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {activeTypeMeta.refLabel || 'Reference Code / ID'}
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={formData.reference_code}
                          onChange={(e) => setFormData({ ...formData, reference_code: e.target.value })}
                          placeholder={activeTypeMeta.refPlaceholder || 'e.g. LR-10492, EXP-882, TRP-410'}
                          className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                            }`}
                        />
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Claim Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0.00"
                          className={`w-full pl-7 pr-3 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                            }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Priority Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Priority Level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'LOW', label: 'Low', dot: 'bg-slate-400', active: 'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300' },
                        { id: 'NORMAL', label: 'Normal', dot: 'bg-blue-500', active: 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400' },
                        { id: 'HIGH', label: 'High', dot: 'bg-amber-500', active: 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400' },
                        { id: 'URGENT', label: 'Urgent', dot: 'bg-rose-500 animate-pulse', active: 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400' },
                      ].map((pri) => {
                        const isSelected = formData.priority === pri.id;
                        return (
                          <button
                            key={pri.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: pri.id })}
                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isSelected
                                ? pri.active
                                : isDark
                                  ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`}></span>
                            <span>{pri.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Justification Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Justification Notes &amp; Reason *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.requester_notes}
                      onChange={(e) => setFormData({ ...formData, requester_notes: e.target.value })}
                      placeholder="Explain why this authorization, discount, or payment is required..."
                      className={`w-full p-3 rounded-xl text-xs font-semibold border transition-all leading-relaxed focus:outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                    />
                  </div>

                  {/* Supporting Document URL */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Supporting Bill / Voucher / Document Link
                    </label>
                    <div className="relative">
                      <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        value={formData.supporting_document_url}
                        onChange={(e) => setFormData({ ...formData, supporting_document_url: e.target.value })}
                        placeholder="https://... (Receipt, voucher, or bill attachment URL)"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                      />
                    </div>
                  </div>

                  </div>

                  {/* Pinned Action Buttons Footer */}
                  <div className={`flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-6 border-t shrink-0 ${isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-100 bg-slate-50/80'
                    }`}>
                    <span className="text-[11px] text-slate-400">
                      * Required for audit &amp; compliance
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setCreateModalOpen(false)}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={createSubmitting}
                        className="flex-1 sm:flex-none justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95 cursor-pointer text-center"
                      >
                        {createSubmitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>Submit Request</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* 8. Edit & Resubmit Modal for Returned Requests */}
          <Modal isOpen={Boolean(resubmitModal.open)} onClose={() => setResubmitModal({ open: false, request: null })}>
            {resubmitModal.open && resubmitModal.request && (
              <div className={`w-full max-w-lg max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Pinned Header */}
                <div className="flex items-center justify-between border-b p-4 sm:p-5 border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-2xl bg-orange-600/20 text-orange-500 border border-orange-500/30 shrink-0">
                      <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black truncate">
                        Edit &amp; Resubmit Request
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        Ref: <span className="font-bold text-orange-400">{resubmitModal.request.reference_code || resubmitModal.request.id.slice(0, 8)}</span> • {resubmitModal.request.request_type}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResubmitModal({ open: false, request: null })}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Resubmit Form */}
                <form onSubmit={handleResubmit} className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Reviewer's feedback banner */}
                    {resubmitModal.request.reviewer_comments && (
                      <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs space-y-1">
                        <span className="font-bold flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reviewer Reason for Return:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 pl-5 font-semibold leading-relaxed">
                          "{resubmitModal.request.reviewer_comments}"
                        </p>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Revised Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={resubmitForm.amount}
                          onChange={(e) => setResubmitForm({ ...resubmitForm, amount: e.target.value })}
                          placeholder="0.00"
                          className={`w-full pl-8 pr-3 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:border-orange-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                            }`}
                        />
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Urgency / Priority
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['LOW', 'NORMAL', 'URGENT'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setResubmitForm({ ...resubmitForm, priority: p })}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${resubmitForm.priority === p
                                ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-sm'
                                : isDark
                                  ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                              }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Revised Notes / Clarification */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Your Clarification &amp; Revision Notes *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={resubmitForm.requester_notes}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, requester_notes: e.target.value })}
                        placeholder="Explain what changes were made in response to the reviewer's comments..."
                        className={`w-full p-3 rounded-xl text-xs font-semibold border transition-all leading-relaxed focus:outline-none focus:border-orange-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                      />
                    </div>

                    {/* Supporting Document */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Supporting Document / Bill Link
                      </label>
                      <div className="relative">
                        <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={resubmitForm.supporting_document_url}
                          onChange={(e) => setResubmitForm({ ...resubmitForm, supporting_document_url: e.target.value })}
                          placeholder="https://... (Receipt or updated voucher link)"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:border-orange-500 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                            }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 p-3.5 sm:px-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setResubmitModal({ open: false, request: null })}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={resubmitSubmitting}
                      className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95 cursor-pointer text-center"
                    >
                      {resubmitSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Resubmit to Reviewer</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
}
