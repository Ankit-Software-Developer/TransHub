// frontend/app/(owner)/approvals/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useStore } from '../../../store/useStore';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import approvalService from '../../../services/approvalService';
import api from '../../../services/api';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
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
  Eye,
  SlidersHorizontal,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

const REQUEST_TYPE_META = {
  EXPENSE_CLAIM: {
    label: 'Petty Cash / Expense',
    icon: Wallet,
    color: 'emerald',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  BOOKING_CANCELLATION: {
    label: 'Consignment / Bilty Cancel',
    icon: FileText,
    color: 'rose',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  RATE_DISCOUNT: {
    label: 'Freight Rate Discount',
    icon: ArrowUpRight,
    color: 'amber',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  DRIVER_ADVANCE: {
    label: 'Driver En-Route Advance',
    icon: Wallet,
    color: 'blue',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  TRIP_SETTLEMENT: {
    label: 'Trip Final Settlement',
    icon: Truck,
    color: 'indigo',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  VEHICLE_MAINTENANCE: {
    label: 'Vehicle Repair & Service',
    icon: Truck,
    color: 'violet',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  CREDIT_OVERRIDE: {
    label: 'Customer Credit Override',
    icon: Building2,
    color: 'purple',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  DAMAGE_CLAIM: {
    label: 'Damage & Shortage Claim',
    icon: AlertTriangle,
    color: 'red',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
  OTHER: {
    label: 'General Operational',
    icon: FileText,
    color: 'slate',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
};

const STATUS_META = {
  PENDING: { label: 'Pending Review', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
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
  const { isAdmin, isBranchManager } = usePermissions();
  const isDark = theme === 'dark';

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
    myPendingCount: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [branches, setBranches] = useState([]);

  // Modals & Drawers
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, action: null, reqId: null });
  const [actionComments, setActionComments] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Request Form State
  const [formData, setFormData] = useState({
    request_type: 'EXPENSE_CLAIM',
    reference_code: '',
    amount: '',
    branch_id: '',
    priority: 'NORMAL',
    requester_notes: '',
    supporting_document_url: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Fetch branches for filter and creation
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        const list = res.data?.data?.branches || res.data?.data || [];
        setBranches(Array.isArray(list) ? list : []);
      } catch (err) {
        // Silently ignore
      }
    };
    fetchBranches();
  }, []);

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
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Open Action Modal (Approve, Reject, Escalate)
  const openActionDialog = (reqId, action) => {
    setActionComments('');
    setActionModal({ open: true, action, reqId });
  };

  // Submit Action
  const submitAction = async () => {
    if (!actionModal.reqId || !actionModal.action) return;
    if (actionModal.action === 'REJECT' && !actionComments.trim()) {
      alert('Please enter a rejection reason or remark.');
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
      alert(err.response?.data?.message || 'Failed to process action');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Submit New Request
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch_id && branches.length > 0) {
      formData.branch_id = branches[0].id;
    }

    setCreateSubmitting(true);
    try {
      await approvalService.createApproval({
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
      });
      setCreateModalOpen(false);
      setFormData({
        request_type: 'EXPENSE_CLAIM',
        reference_code: '',
        amount: '',
        branch_id: '',
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

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
          {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                Approvals & Requests Center
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Workflow Engine
                </span>
              </h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Hierarchical operational authorizations for branches, hubs, and executive head office
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchCounters(); fetchRequests(); }}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Request</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Action Required */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-amber-900/10 border-amber-500/30'
            : 'bg-gradient-to-br from-amber-50 via-white to-amber-50/50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}>
              Needs My Action
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight">
            {badgeCounts.pendingAction}
          </p>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1 font-medium">
            Pending in your inbox
          </p>
        </div>

        {/* Approved */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-emerald-900/10 border-emerald-500/30'
            : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'text-emerald-400' : 'text-emerald-700'
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

        {/* Rejected */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-rose-900/10 border-rose-500/30'
            : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/50 border-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'text-rose-400' : 'text-rose-700'
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
            Returned with notes
          </p>
        </div>

        {/* Escalated to Head Office */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-gradient-to-br from-purple-950/30 via-slate-900 to-purple-900/10 border-purple-500/30'
            : 'bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'text-purple-400' : 'text-purple-700'
            }`}>
              Escalated (Admin)
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-purple-600 dark:text-purple-400">
            {badgeCounts.escalatedCount}
          </p>
          <p className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-1 font-medium">
            Awaiting owner review
          </p>
        </div>

        {/* My Outbox Pending */}
        <div className={`p-4 rounded-2xl border col-span-2 lg:col-span-1 transition-all ${
          isDark
            ? 'bg-gradient-to-br from-blue-950/30 via-slate-900 to-cyan-900/10 border-blue-500/30'
            : 'bg-gradient-to-br from-blue-50 via-white to-cyan-50/50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'text-blue-400' : 'text-blue-700'
            }`}>
              My Pending
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
              <Paperclip className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
            {badgeCounts.myPendingCount}
          </p>
          <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1 font-medium">
            Submitted by you
          </p>
        </div>
      </div>

      {/* 3. Tab Switcher */}
      <div className={`flex items-center border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} overflow-x-auto gap-2`}>
        <button
          onClick={() => handleTabChange('inbox')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'inbox'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Needs My Action</span>
          {badgeCounts.pendingAction > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500 text-white animate-pulse">
              {badgeCounts.pendingAction}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('outbox')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'outbox'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>My Requests (Outbox)</span>
          {badgeCounts.myPendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-500">
              {badgeCounts.myPendingCount}
            </span>
          )}
        </button>

        {(isAdmin || isBranchManager) && (
          <button
            onClick={() => handleTabChange('branch')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'branch'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Branch / Hub Activity</span>
          </button>
        )}

        <button
          onClick={() => handleTabChange('history')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Audit Log & History</span>
        </button>
      </div>

      {/* 4. Filter Toolbar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Docket code, Voucher, or remarks..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600'
            } focus:outline-none`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Request Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border font-medium transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Request Types</option>
            {Object.keys(REQUEST_TYPE_META).map((key) => (
              <option key={key} value={key}>{REQUEST_TYPE_META[key].label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border font-medium transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          {/* Branch Filter (if Admin or has branches) */}
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border font-medium transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="ALL">All Branches & Hubs</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branch_name} {b.is_hub ? '(Hub)' : ''}
                </option>
              ))}
            </select>
          )}

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border font-medium transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* 5. Request Table & List */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${
        isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200'
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
              <p className="text-sm font-bold">No approval requests found</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {activeTab === 'inbox'
                  ? 'Great job! Your approval queue is completely clear.'
                  : 'No records matching the selected criteria.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b ${isDark ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-100 bg-slate-50/75 text-slate-500'}`}>
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
                  const canAct = activeTab === 'inbox' && (req.status === 'PENDING' || req.status === 'ESCALATED');

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
                          {req.branch?.is_hub && (
                            <span className="px-1 py-0.2 rounded text-[9px] bg-purple-500/10 text-purple-500 font-bold">
                              HUB
                            </span>
                          )}
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
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                              isDark
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
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition-transform active:scale-95"
                                title="Approve Request"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => openActionDialog(req.id, 'REJECT')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition-transform active:scale-95"
                                title="Reject Request"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>

                              {isBranchManager && !isAdmin && (
                                <button
                                  onClick={() => openActionDialog(req.id, 'ESCALATE')}
                                  className="px-2 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1"
                                  title="Escalate to Head Office"
                                >
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span className="hidden md:inline">Escalate</span>
                                </button>
                              )}
                            </>
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
          <div className={`p-4 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
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
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 space-y-6 ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
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
            <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
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
                  {selectedRequest.branch?.is_hub ? ' (Transshipment Hub)' : ''}
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
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                <div className={`p-3 rounded-xl border text-xs ${
                  isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
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
                <div className="p-3 rounded-xl border border-slate-800 flex items-center justify-between bg-slate-900/60">
                  <span className="text-xs font-mono truncate max-w-sm">
                    {selectedRequest.supporting_document_url}
                  </span>
                  <a
                    href={selectedRequest.supporting_document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <span>View Receipt</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Actions Footer inside Drawer */}
            {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'ESCALATED') && (
              <div className="border-t pt-4 border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => openActionDialog(selectedRequest.id, 'APPROVE')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve Request</span>
                </button>

                <button
                  onClick={() => openActionDialog(selectedRequest.id, 'REJECT')}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                {isBranchManager && !isAdmin && (
                  <button
                    onClick={() => openActionDialog(selectedRequest.id, 'ESCALATE')}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Escalate to Admin</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Action Confirmation Modal (Approve, Reject, Escalate) */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                actionModal.action === 'APPROVE'
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : actionModal.action === 'REJECT'
                  ? 'bg-rose-500/20 text-rose-500'
                  : 'bg-purple-500/20 text-purple-500'
              }`}>
                {actionModal.action === 'APPROVE' ? <Check className="w-5 h-5" /> : actionModal.action === 'REJECT' ? <X className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-black">
                  {actionModal.action === 'APPROVE' ? 'Confirm Approval' : actionModal.action === 'REJECT' ? 'Reject Request' : 'Escalate to Head Office'}
                </h3>
                <p className="text-xs text-slate-400">
                  {actionModal.action === 'APPROVE' ? 'Authorize this request and execute updates' : actionModal.action === 'REJECT' ? 'Return request to staff with mandatory reason' : 'Forward to Transporter Admin for higher limit approval'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">
                {actionModal.action === 'REJECT' ? 'Rejection Reason (Required)*' : 'Reviewer Remarks (Optional)'}
              </label>
              <textarea
                rows={3}
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                placeholder={actionModal.action === 'REJECT' ? 'Specify why this claim or cancellation was rejected...' : 'Enter approval notes or disbursal instruction...'}
                className={`w-full p-3 rounded-xl text-xs border transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                } focus:outline-none focus:border-blue-500`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal({ open: false, action: null, reqId: null })}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionSubmitting}
                onClick={submitAction}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 ${
                  actionModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionModal.action === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {actionSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {actionModal.action === 'APPROVE' ? 'Confirm & Approve' : actionModal.action === 'REJECT' ? 'Reject Request' : 'Escalate Now'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Submit New Request Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Submit Operational Request</h3>
                  <p className="text-xs text-slate-400">Routes automatically to your Branch Manager or Head Office</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Request Type */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Request Type*</label>
                  <select
                    value={formData.request_type}
                    onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {Object.keys(REQUEST_TYPE_META).map((key) => (
                      <option key={key} value={key}>{REQUEST_TYPE_META[key].label}</option>
                    ))}
                  </select>
                </div>

                {/* Branch / Hub */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Branch / Hub*</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} {b.is_hub ? '(Hub)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference Code */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reference Code / ID</label>
                  <input
                    type="text"
                    value={formData.reference_code}
                    onChange={(e) => setFormData({ ...formData, reference_code: e.target.value })}
                    placeholder="e.g. LR-10492, EXP-882, TRP-410"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: pri })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.priority === pri
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : isDark
                          ? 'border-slate-800 bg-slate-900 text-slate-400'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              {/* Justification Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Justification Notes / Reason*</label>
                <textarea
                  required
                  rows={3}
                  value={formData.requester_notes}
                  onChange={(e) => setFormData({ ...formData, requester_notes: e.target.value })}
                  placeholder="Explain why this authorization or expense is needed..."
                  className={`w-full p-3 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Supporting Document URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supporting Bill / Document URL</label>
                <input
                  type="url"
                  value={formData.supporting_document_url}
                  onChange={(e) => setFormData({ ...formData, supporting_document_url: e.target.value })}
                  placeholder="https://..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {createSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
