// frontend/app/(owner)/audit-logs/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ShieldCheck
} from 'lucide-react';

export default function AuditLogsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin } = usePermissions();

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
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Diff Inspector Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // Fetch stats & logs
  const fetchAuditData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [logsRes, statsRes] = await Promise.all([
        auditService.listLogs({
          page,
          limit: 25,
          search: searchQuery || undefined,
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
  }, [page, searchQuery, selectedAction, selectedEntity, fromDate, toDate]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Open Diff Modal
  const handleOpenDiff = (log) => {
    setSelectedLog(log);
    setIsDiffModalOpen(true);
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

  // Non-Admin Permission Gate View
  if (!isAdmin) {
    return (
      <div className={`flex min-h-screen ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-4 shadow-xl ${
              isDark ? 'bg-[#0E1526] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black">Restricted Administrator Area</h2>
              <p className="text-xs text-slate-400">
                Audit trails and system mutation records are strictly confidential and accessible only to Transport Owners and System Administrators.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg hover:bg-blue-500 transition-all"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
          
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    Activity & Audit Governance
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Admin Confidential
                    </span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Real-time immutable audit trail: track who created, updated, or deleted records with exact timestamps.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportCSV}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
                title="Export filtered audit trail to CSV"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={fetchAuditData}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>
          </div>

          {/* Audit Metrics KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total System Events</div>
              <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stats.total?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-cyan-500 dark:text-cyan-400 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Recorded in Ledger</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Today's Operations</div>
              <div className="text-2xl font-black text-cyan-500 dark:text-cyan-400 font-mono">
                {stats.today?.toLocaleString() || 0}
              </div>
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Active operations today
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>Critical Deletions</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-500">
                {stats.deletions?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-rose-400 mt-1 font-semibold">
                Removed records tracked
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Data Modifications</div>
              <div className="text-2xl font-black text-amber-500 font-mono">
                {stats.updates?.toLocaleString() || 0}
              </div>
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Edited rates, weights & specs
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">New Registrations</div>
              <div className="text-2xl font-black text-emerald-500 font-mono">
                {stats.creates?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                Bilties, vehicles & accounts
              </div>
            </div>
          </div>

          {/* Interactive Filter Toolbar */}
          <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
            isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by Docket #, User, Action, or IP..."
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Action Filter */}
              <div>
                <select
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    setPage(1);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Actions</option>
                  <option value="DELETE">🗑️ Deletions Only</option>
                  <option value="UPDATE">✏️ Modifications Only</option>
                  <option value="CREATE">➕ New Creates Only</option>
                  <option value="DISPATCH">🚛 Dispatches Only</option>
                  <option value="SETTLE">💰 Settlements Only</option>
                </select>
              </div>

              {/* Entity / Module Filter */}
              <div>
                <select
                  value={selectedEntity}
                  onChange={(e) => {
                    setSelectedEntity(e.target.value);
                    setPage(1);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Modules</option>
                  <option value="BOOKING">📦 Bilties & Dockets</option>
                  <option value="VEHICLE">🚚 Fleet Vehicles</option>
                  <option value="DRIVER">👤 Certified Drivers</option>
                  <option value="TRIP">🛣️ Trips & Dispatches</option>
                  <option value="EXPENSE">💳 Expenses & Cash</option>
                  <option value="USER">👥 Users & Staff</option>
                  <option value="ROLE">🛡️ Roles & Permissions</option>
                </select>
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className={`w-1/2 px-2 py-2 rounded-xl text-[11px] border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className={`w-1/2 px-2 py-2 rounded-xl text-[11px] border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Activity Log Data Table */}
          <div className={`rounded-3xl border shadow-xl overflow-hidden ${
            isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Entity & Target</th>
                    <th className="py-3.5 px-4">Activity Summary</th>
                    <th className="py-3.5 px-4">Responsible User (Who)</th>
                    <th className="py-3.5 px-4">Timestamp (When)</th>
                    <th className="py-3.5 px-4">Network / IP</th>
                    <th className="py-3.5 px-4 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                        <span>Loading audit ledger...</span>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center space-y-2">
                        <History className="w-10 h-10 text-slate-500 mx-auto" />
                        <p className="text-sm font-bold">No Audit Activity Found</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          No matching mutation logs found for the applied search criteria or date range.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const badge = getActionBadge(log.action);
                      const IconComp = badge.icon;
                      const hasDiff = Boolean(log.old_values || log.new_values);

                      return (
                        <tr
                          key={log.id}
                          className={`transition-colors ${
                            isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Action Pill */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${badge.className}`}>
                              <IconComp className="w-3 h-3" />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* Entity & ID */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-cyan-400">
                              {log.entity_name || log.entity_id}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                              {log.entity_type}
                            </div>
                          </td>

                          {/* Human Summary */}
                          <td className="py-3.5 px-4 max-w-sm">
                            <p className={`font-semibold line-clamp-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {log.summary}
                            </p>
                          </td>

                          {/* Performer Details */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {(log.performer?.name || 'U').slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {log.performer?.name || 'Staff User'}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>{log.performer?.role || 'Staff'}</span>
                                  {log.branch?.name && (
                                    <>
                                      <span>•</span>
                                      <span className="text-cyan-400">{log.branch.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className={`font-mono text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {new Date(log.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              <span>({formatTimeAgo(log.created_at)})</span>
                            </div>
                          </td>

                          {/* Network / IP */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                            {log.ip_address || 'Internal/Loopback'}
                          </td>

                          {/* Inspect Diff Button */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleOpenDiff(log)}
                              className={`p-1.5 rounded-xl border transition-all ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'
                              }`}
                              title="Inspect Before vs After Payload Diff"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              <div>
                Showing page <span className="font-bold">{pagination.page || 1}</span> of <span className="font-bold">{pagination.pages || 1}</span> ({pagination.total || 0} total records)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`p-1.5 rounded-lg border ${
                    page <= 1
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isDark
                      ? 'hover:bg-slate-800 border-slate-700'
                      : 'hover:bg-white border-slate-200'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
                  disabled={page >= (pagination.pages || 1)}
                  className={`p-1.5 rounded-lg border ${
                    page >= (pagination.pages || 1)
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isDark
                      ? 'hover:bg-slate-800 border-slate-700'
                      : 'hover:bg-white border-slate-200'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Diff Inspector Modal */}
      {isDiffModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <span>Audit Diff & Inspection</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                      {selectedLog.action}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{selectedLog.summary}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDiffModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Performer & Metadata Strip */}
            <div className={`p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Responsible User</p>
                <p className="text-xs font-bold text-cyan-400 mt-0.5">{selectedLog.performer?.name || 'Staff'}</p>
                <p className="text-[10px] text-slate-400">{selectedLog.performer?.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Target Resource</p>
                <p className="text-xs font-bold font-mono mt-0.5">{selectedLog.entity_name || selectedLog.entity_id}</p>
                <p className="text-[10px] text-slate-400">{selectedLog.entity_type}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Logged Time</p>
                <p className="text-xs font-bold font-mono mt-0.5">
                  {new Date(selectedLog.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-[10px] text-slate-400">{new Date(selectedLog.created_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Network / IP</p>
                <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">{selectedLog.ip_address || '127.0.0.1'}</p>
                <p className="text-[10px] text-slate-400 truncate" title={selectedLog.user_agent}>
                  {selectedLog.user_agent ? selectedLog.user_agent.split(' ')[0] : 'Web Client'}
                </p>
              </div>
            </div>

            {/* Side-by-Side Payload Diff View */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previous Values (Before Mutation) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                    <span>Previous State (Before)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      {selectedLog.old_values ? 'Captured Snapshot' : 'None / Newly Created'}
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-2xl border font-mono text-[11px] overflow-x-auto max-h-80 ${
                    isDark ? 'bg-[#070B14] border-slate-800 text-rose-300' : 'bg-rose-50/50 border-rose-200 text-rose-900'
                  }`}>
                    {selectedLog.old_values ? (
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-500 italic py-8 text-center">
                        No previous record existed (Clean creation).
                      </div>
                    )}
                  </div>
                </div>

                {/* New Values (After Mutation) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span>New State (After Mutation)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {selectedLog.new_values ? 'Current Payload' : 'None / Deleted'}
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-2xl border font-mono text-[11px] overflow-x-auto max-h-80 ${
                    isDark ? 'bg-[#070B14] border-slate-800 text-emerald-300' : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  }`}>
                    {selectedLog.new_values ? (
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-500 italic py-8 text-center">
                        Record was permanently purged from database.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsDiffModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-md"
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
