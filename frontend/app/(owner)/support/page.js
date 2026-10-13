// frontend/app/(owner)/support/page.js
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTerminology } from '../../../hooks/useTerminology';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTheme } from '../../../components/ThemeProvider';
import { useStore } from '../../../store/useStore';
import supportService from '../../../services/supportService';
import api from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import {
  LifeBuoy,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Send,
  MessageSquare,
  X,
  RefreshCw,
  Building2,
  User,
  Paperclip,
  Check,
  AlertTriangle,
  ChevronRight,
  HelpCircle,
  Lock,
  ArrowRight
} from 'lucide-react';

const CATEGORIES = [
  { id: 'OPERATIONS', label: 'Operations & Loading' },
  { id: 'DOCKET_POD', label: 'Docket & POD Correction' },
  { id: 'BILLING_RATES', label: 'Customer Billing & Rate Dispute' },
  { id: 'HARDWARE_PRINTER', label: 'Hub Printer & Hardware' },
  { id: 'SOFTWARE_BUG', label: 'Software Bug / Feature Issue' },
  { id: 'FINANCE_PAYMENT', label: 'Cash & Payment Reconciliation' },
  { id: 'OTHER', label: 'General Inquiry' },
];

const PRIORITIES = [
  { id: 'LOW', label: 'Low', color: 'slate' },
  { id: 'NORMAL', label: 'Normal', color: 'blue' },
  { id: 'HIGH', label: 'High', color: 'amber' },
  { id: 'URGENT', label: 'Urgent (Critical)', color: 'rose' },
];

export default function SupportPage() {
  const { term, plural } = useTerminology();
  const { isAdmin } = usePermissions();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const user = useStore((state) => state.user);
  const activeBranch = useStore((state) => state.activeBranch);

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [branches, setBranches] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  // Modals & Drawer
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // New Ticket Form State
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('OPERATIONS');
  const [newPriority, setNewPriority] = useState('NORMAL');
  const [newRefCode, setNewRefCode] = useState('');
  const [newBranchId, setNewBranchId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachment, setNewAttachment] = useState('');

  // Check roles
  const userRoles = (user?.roles || []).map((r) => (typeof r === 'string' ? r : r.name || ''));
  const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || user?.role === 'SUPER_ADMIN';
  const isTransporterAdmin =
    isSuperAdmin ||
    isAdmin ||
    userRoles.includes('ADMIN') ||
    userRoles.includes('OWNER') ||
    userRoles.includes('TRANSPORT_OWNER') ||
    user?.role === 'ADMIN' ||
    user?.role === 'OWNER';

  // Load branches
  useEffect(() => {
    api.get('/branches?limit=100').then((res) => {
      if (res.data?.data) setBranches(res.data.data);
    }).catch(() => {});
  }, []);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        branch_id: branchFilter !== 'ALL' ? branchFilter : undefined,
        is_escalated: escalatedOnly ? 'true' : undefined,
        search: searchQuery.trim() || undefined,
      };

      const res = await supportService.getTickets(params);
      if (res?.success) {
        setTickets(res.data || []);
        const meta = res.pagination || res.meta || {};
        setTotalPages(meta.pages || 1);
        setTotalTickets(meta.total !== undefined ? meta.total : (res.data || []).length);
        setSummary(meta.summary || null);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, branchFilter, escalatedOnly, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Load full ticket thread details
  const openTicketDrawer = async (ticket) => {
    try {
      const res = await supportService.getTicketById(ticket.id);
      if (res?.success) {
        setSelectedTicket(res.data);
      } else {
        setSelectedTicket(ticket);
      }
    } catch (e) {
      setSelectedTicket(ticket);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      alert('Please provide subject and description.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const payload = {
        subject: newSubject.trim(),
        description: newDescription.trim(),
        category: newCategory,
        priority: newPriority,
        reference_code: newRefCode.trim() || null,
        branch_id: newBranchId || user?.branch_id || (activeBranch?.id !== 'ALL' ? activeBranch?.id : null),
        attachment_url: newAttachment.trim() || null,
      };

      const res = await supportService.createTicket(payload);
      if (res?.success) {
        setIsNewTicketOpen(false);
        // Reset form
        setNewSubject('');
        setNewDescription('');
        setNewRefCode('');
        setNewAttachment('');
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Send message in thread
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSubmittingReply(true);
    try {
      const res = await supportService.addMessage(selectedTicket.id, {
        message: replyText.trim(),
      });
      if (res?.success) {
        setReplyText('');
        // Refresh ticket details
        const updated = await supportService.getTicketById(selectedTicket.id);
        if (updated?.success) {
          setSelectedTicket(updated.data);
        }
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Escalate to Super Admin
  const handleEscalateToSuperAdmin = async () => {
    if (!escalationReason.trim() || !selectedTicket) {
      alert('Please provide reason for escalating to Super Admin.');
      return;
    }

    try {
      const res = await supportService.escalateToSuperAdmin(selectedTicket.id, escalationReason.trim());
      if (res?.success) {
        setIsEscalateModalOpen(false);
        setEscalationReason('');
        const updated = await supportService.getTicketById(selectedTicket.id);
        if (updated?.success) {
          setSelectedTicket(updated.data);
        }
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to escalate ticket');
    }
  };

  // Status Change (Resolve, Close, In Progress)
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await supportService.updateStatus(selectedTicket.id, newStatus);
      if (res?.success) {
        const updated = await supportService.getTicketById(selectedTicket.id);
        if (updated?.success) {
          setSelectedTicket(updated.data);
        }
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#090D18]' : 'bg-[#F6F8FB]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-200/50 flex items-center justify-center font-bold">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Support &amp; Operations Helpdesk
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Multi-tier hierarchical ticket flow: Branch Staff → Transporter Admin → Platform Super Admin
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsNewTicketOpen(true)}
                className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Support Ticket</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Ribbon */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Tickets</span>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{summary.total || 0}</p>
                <span className="text-[11px] text-slate-400">Raised in organization</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] font-bold uppercase text-slate-400">Open &amp; Pending</span>
                <p className="text-xl font-black text-blue-500 mt-1">{summary.openCount || 0}</p>
                <span className="text-[11px] text-blue-600 dark:text-blue-400">Awaiting Admin Response</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] font-bold uppercase text-slate-400">In Progress</span>
                <p className="text-xl font-black text-amber-500 mt-1">{summary.inProgressCount || 0}</p>
                <span className="text-[11px] text-amber-600 dark:text-amber-400">Under Investigation</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="text-[10px] font-bold uppercase text-slate-400">Escalated to Super Admin</span>
                <p className="text-xl font-black text-purple-500 mt-1">{summary.escalatedCount || 0}</p>
                <span className="text-[11px] text-purple-600 dark:text-purple-400">Platform Level Action</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xs'} col-span-2 md:col-span-1`}>
                <span className="text-[10px] font-bold uppercase text-slate-400">Resolved</span>
                <p className="text-xl font-black text-emerald-500 mt-1">{summary.resolvedCount || 0}</p>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Successfully closed</span>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200/80 shadow-xs'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Branch
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Search Filter
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Ticket #, Subject, Docket / Reference..."
                    className={`w-full text-xs font-semibold rounded-xl border pl-8 pr-10 py-2 outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tickets List Table */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200/80 shadow-card'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50/75 border-slate-200 text-slate-600'
                  }`}>
                    <th className="py-3 px-4">Ticket #</th>
                    <th className="py-3 px-4">Subject &amp; Category</th>
                    <th className="py-3 px-4">Origin Branch</th>
                    <th className="py-3 px-4 text-center">Priority</th>
                    <th className="py-3 px-4 text-center">Hierarchy Level</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/80 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                          <p className="text-xs font-semibold text-slate-400">Loading support tickets...</p>
                        </div>
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <LifeBuoy className="w-8 h-8 opacity-30 mb-1" />
                          <p className="text-sm font-bold text-slate-500">No support tickets found</p>
                          <p className="text-xs text-slate-400">All operating hubs and issues are clear.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t) => {
                      const isEscalated = t.is_escalated || t.assigned_role === 'SUPER_ADMIN';
                      return (
                        <tr
                          key={t.id}
                          onClick={() => openTicketDrawer(t)}
                          className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            isEscalated ? (isDark ? 'bg-purple-950/10' : 'bg-purple-50/20') : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                            {t.ticket_number}
                            {t.reference_code && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                Ref: {t.reference_code}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white block max-w-xs truncate">
                              {t.subject}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {CATEGORIES.find((c) => c.id === t.category)?.label || t.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {t.branch?.name || 'Head Office'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                  : t.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isEscalated ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Super Admin Level</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                <span>Branch → Transporter Admin</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : t.status === 'ESCALATED'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {new Date(t.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTicketDrawer(t);
                              }}
                              className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span>View Thread</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Ticket Detail Drawer */}
          <Modal
            isOpen={Boolean(selectedTicket)}
            onClose={() => setSelectedTicket(null)}
            containerClassName="p-0 justify-end"
            className="h-full justify-end"
          >
            {selectedTicket && (
              <div className="w-full max-w-2xl bg-white dark:bg-[#0B1020] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {selectedTicket.ticket_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedTicket.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedTicket.status === 'ESCALATED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {selectedTicket.status}
                      </span>
                      {selectedTicket.is_escalated && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 flex items-center space-x-1">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Escalated to Super Admin</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedTicket.subject}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Branch: {selectedTicket.branch?.name || 'Head Office'} • Raised by {selectedTicket.creator?.first_name || 'Staff'}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Escalation Hierarchy Indicator */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">1</span>
                      <span>Branch Origin</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">2</span>
                      <span>Transporter Admin</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <div className={`flex items-center space-x-1.5 font-bold ${
                      selectedTicket.is_escalated ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'
                    }`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        selectedTicket.is_escalated ? 'bg-purple-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600'
                      }`}>3</span>
                      <span>Platform Super Admin</span>
                    </div>
                  </div>

                  {/* Escalate button for Transporter Admin */}
                  {isTransporterAdmin && !selectedTicket.is_escalated && selectedTicket.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setIsEscalateModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs flex items-center space-x-1 transition-all"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Escalate to Super Admin</span>
                    </button>
                  )}
                </div>

                {/* Conversation Message Timeline */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {/* Reference Tag if available */}
                  {selectedTicket.reference_code && (
                    <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-bold">Referenced Docket / Document:</span> {selectedTicket.reference_code}
                    </div>
                  )}

                  {(selectedTicket.messages || []).map((msg, idx) => {
                    const isSystem = msg.message.startsWith('[STATUS') || msg.message.startsWith('[ESCALATED');
                    const isSenderAdmin = msg.sender_role === 'TRANSPORTER_ADMIN' || msg.sender_role === 'ADMIN' || msg.sender_role === 'OWNER';
                    const isSenderSuper = msg.sender_role === 'SUPER_ADMIN';

                    if (isSystem) {
                      return (
                        <div key={msg.id || idx} className="text-center my-3">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id || idx}
                        className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                          isSenderSuper
                            ? 'bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
                            : isSenderAdmin
                            ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 ml-4'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {msg.sender_name || 'Staff'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                isSenderSuper
                                  ? 'bg-purple-600 text-white'
                                  : isSenderAdmin
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {msg.sender_role}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Bar & Action Controls */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070B14] space-y-3">
                  {/* Status Toggle Buttons */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Quick Actions:</span>
                    <div className="flex items-center space-x-1.5">
                      {selectedTicket.status !== 'IN_PROGRESS' && selectedTicket.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus('IN_PROGRESS')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {selectedTicket.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus('RESOLVED')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {selectedTicket.status === 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus('CLOSED')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold"
                        >
                          Close Ticket
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Input Box */}
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type reply or response to ticket..."
                      className={`flex-1 text-xs font-semibold rounded-xl border px-3.5 py-2.5 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-1 shadow-md shadow-blue-500/20"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </Modal>

          {/* Escalate to Super Admin Confirmation Modal */}
          <Modal isOpen={Boolean(isEscalateModalOpen)} onClose={() => setIsEscalateModalOpen(false)}>
            {isEscalateModalOpen && (
              <div className="w-full max-w-md bg-white dark:bg-[#0B1020] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
                <div className="flex items-center space-x-2.5 text-purple-600 dark:text-purple-400">
                  <ArrowUpRight className="w-6 h-6" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Escalate to Platform Super Admin
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  When escalated, this issue will be forwarded to TransHub technical and platform super-admins for platform-level resolution.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Escalation Reason &amp; Findings *
                  </label>
                  <textarea
                    rows={4}
                    value={escalationReason}
                    onChange={(e) => setEscalationReason(e.target.value)}
                    placeholder="Describe why this cannot be resolved at the transporter level (e.g. system defect, payment gateway anomaly, database locking)..."
                    className={`w-full text-xs font-semibold rounded-xl border p-3 outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setIsEscalateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEscalateToSuperAdmin}
                    disabled={!escalationReason.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white shadow-md shadow-purple-500/20"
                  >
                    Confirm Escalation
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* Create New Support Ticket Modal */}
          <Modal isOpen={Boolean(isNewTicketOpen)} onClose={() => setIsNewTicketOpen(false)}>
            {isNewTicketOpen && (
              <div className="w-full max-w-lg bg-white dark:bg-[#0B1020] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <LifeBuoy className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Generate Support Request
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsNewTicketOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subject / Issue Summary *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Weight entry locked on Docket DEL-1049"
                      className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Referenced Docket / Trip / Bill #
                      </label>
                      <input
                        type="text"
                        value={newRefCode}
                        onChange={(e) => setNewRefCode(e.target.value)}
                        placeholder="e.g. BK-2026-0042"
                        className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Branch
                      </label>
                      <select
                        value={newBranchId}
                        onChange={(e) => setNewBranchId(e.target.value)}
                        className={`w-full text-xs font-semibold rounded-xl border px-3 py-2 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <option value="">Current Assigned Hub</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name || b.branch_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Detailed Explanation *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Explain the problem or requirement clearly so the transporter admin can action it..."
                      className={`w-full text-xs font-semibold rounded-xl border p-3 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsNewTicketOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingTicket}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-md shadow-blue-500/20"
                    >
                      {submittingTicket ? 'Generating...' : 'Submit Ticket'}
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
