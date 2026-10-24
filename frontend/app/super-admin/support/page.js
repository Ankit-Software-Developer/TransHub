// frontend/app/super-admin/support/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import { useTheme } from '../../../components/ThemeProvider';
import {
  Headphones,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  RefreshCw,
  X,
  MessageSquare,
  ShieldCheck,
  Send,
  User,
  Phone,
  Mail,
  Zap,
} from 'lucide-react';

export default function SuperAdminSupportPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    escalated: 0,
    resolved: 0,
  });
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState('ALL');

  // Modal resolution state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [savingResolution, setSavingResolution] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch Transporters list for the dropdown
  useEffect(() => {
    api
      .get('/super-admin/tenants?limit=100')
      .then((res) => {
        if (res.data?.success) {
          setTenants(res.data.data.tenants || []);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch Tickets
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/tickets', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          tenant_id: selectedTenantId !== 'ALL' ? selectedTenantId : undefined,
        },
      });

      if (res.data?.success) {
        setTickets(res.data.data.tickets || []);
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, selectedTenantId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  // 3. Support Impersonation for that Transporter
  const handleSupportImpersonate = (ticket) => {
    const tenantId = ticket.tenant_id;
    const orgId = ticket.organization_id;
    const name = ticket.organization?.business_name || ticket.tenant?.name || 'Selected Transporter';

    if (tenantId) {
      localStorage.setItem('superadmin_impersonate_tenant_id', tenantId);
    }
    if (orgId) {
      localStorage.setItem('superadmin_impersonate_org_id', orgId);
    }
    localStorage.setItem('superadmin_impersonate_name', name);

    router.push('/dashboard');
  };

  // 4. Open Resolution Modal
  const openModal = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status === 'RESOLVED' ? 'CLOSED' : 'RESOLVED');
    setResolutionNote(ticket.resolution_note || '');
    setSuccessMsg('');
    setResolutionModalOpen(true);
  };

  // 5. Save Ticket Resolution
  const handleSaveResolution = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSavingResolution(true);
    setSuccessMsg('');

    try {
      const res = await api.patch(`/super-admin/tickets/${selectedTicket.id}`, {
        status: newStatus,
        resolution_note: resolutionNote.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg('Ticket updated successfully!');
        setTimeout(() => {
          setResolutionModalOpen(false);
          fetchTickets();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
    } finally {
      setSavingResolution(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
              SaaS Central Grievance Desk
            </span>
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 flex items-center gap-2.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span>Support &amp; Transporter Escalations</span>
            <Headphones className="w-7 h-7 text-amber-500 dark:text-amber-400" />
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 max-w-2xl ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Review operational tickets, billing disputes, and system escalations submitted by all onboarded transporters across Bharat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTickets}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
              isDark
                ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Tickets</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Total Tickets
          </div>
          <div className={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across All Transporters</div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="text-xs font-semibold text-rose-500 dark:text-rose-400 flex items-center justify-between">
            <span>Open Escalations</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-rose-500 mt-1">
            {stats.open + stats.escalated}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">Requires SuperAdmin Attention</div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="text-xs font-semibold text-amber-500 dark:text-amber-400 flex items-center justify-between">
            <span>In Progress</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {stats.inProgress}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">Under Investigation</div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 flex items-center justify-between">
            <span>Resolved</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {stats.resolved}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Closed &amp; Satisfied</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs transition-colors ${
          isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, transporter name, subject, keyword..."
            className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs font-medium transition-colors focus:outline-none border ${
              isDark
                ? 'bg-[#070C18] border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
            }`}
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Transporter Filter Dropdown */}
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className={`h-10 px-3 rounded-xl text-xs font-bold border transition-colors focus:outline-none ${
              isDark
                ? 'bg-[#070C18] border-slate-800 text-slate-200 focus:border-amber-400'
                : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-amber-500'
            }`}
          >
            <option value="ALL">All Transporters</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.organization?.business_name || t.name}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : isDark
                  ? 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div
        className={`rounded-3xl border overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold">Loading support tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No Support Tickets Found
            </h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              All onboarded transporters are operating smoothly with no pending escalated support requests.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {tickets.map((tk) => {
              const orgName = tk.organization?.business_name || tk.tenant?.name || 'Transporter Organization';
              const priority = tk.priority || 'NORMAL';
              const isUrgent = priority === 'URGENT' || priority === 'HIGH';

              return (
                <div
                  key={tk.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-black text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/25">
                        {tk.ticket_number || `TKT-${tk.id.slice(0, 8)}`}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>{orgName}</span>
                      </div>

                      {/* Status */}
                      <span
                        className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                          tk.status === 'RESOLVED' || tk.status === 'CLOSED'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : tk.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : 'bg-cyan-500/15 text-cyan-500 border border-cyan-500/30'
                        }`}
                      >
                        {tk.status}
                      </span>

                      {/* Priority */}
                      <span
                        className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isUrgent
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {priority}
                      </span>

                      {/* Category */}
                      <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        • {tk.category?.replace(/_/g, ' ') || 'Operations'}
                      </span>
                    </div>

                    <h4 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {tk.subject}
                    </h4>

                    <p className={`text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {tk.description}
                    </p>

                    {tk.resolution_note && (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Resolution: {tk.resolution_note}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(tk.createdAt || tk.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {tk.organization?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{tk.organization.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleSupportImpersonate(tk)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-xs"
                      title="Open Transporter Workspace in Support View to troubleshoot directly"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Troubleshoot Workspace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openModal(tk)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Resolve / Reply</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {resolutionModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4 transition-colors ${
              isDark
                ? 'bg-[#0B1020] border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Resolve Ticket #{selectedTicket.ticket_number || selectedTicket.id.slice(0, 8)}
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Transporter: <strong>{selectedTicket.organization?.business_name || selectedTicket.tenant?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolutionModalOpen(false)}
                className={`p-1.5 rounded-xl transition ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveResolution} className="space-y-4 text-xs">
              <div>
                <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Update Ticket Status:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border font-bold focus:outline-none ${
                    isDark
                      ? 'bg-[#070C18] border-slate-700 text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                  }`}
                >
                  <option value="IN_PROGRESS">IN_PROGRESS (Under investigation)</option>
                  <option value="RESOLVED">RESOLVED (Issue addressed &amp; fixed)</option>
                  <option value="CLOSED">CLOSED (Completed &amp; archived)</option>
                </select>
              </div>

              <div>
                <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Official Resolution Note &amp; Feedback:
                </label>
                <textarea
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain what steps were taken to fix the issue or provide guidance to the transporter..."
                  className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none ${
                    isDark
                      ? 'bg-[#070C18] border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
                  }`}
                  required
                />
              </div>

              <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setResolutionModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold transition ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingResolution}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-sm cursor-pointer"
                >
                  {savingResolution ? 'Saving...' : 'Submit Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
