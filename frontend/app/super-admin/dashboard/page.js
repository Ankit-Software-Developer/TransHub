// frontend/app/super-admin/dashboard/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import { useTheme } from '../../../components/ThemeProvider';
import {
  ShieldCheck,
  Building2,
  Users,
  TrendingUp,
  CreditCard,
  FileText,
  Activity,
  ArrowRight,
  Eye,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [metrics, setMetrics] = useState(null);
  const [recentTenants, setRecentTenants] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, tenantsRes, activityRes] = await Promise.all([
        api.get('/super-admin/metrics').catch(() => null),
        api.get('/super-admin/tenants?limit=5').catch(() => null),
        api.get('/super-admin/activity').catch(() => null),
      ]);

      if (metricsRes?.data?.success) {
        setMetrics(metricsRes.data.data.metrics);
      }
      if (tenantsRes?.data?.success) {
        setRecentTenants(tenantsRes.data.data.tenants || []);
      }
      if (activityRes?.data?.success) {
        setActivities(activityRes.data.data.activities || []);
      }
    } catch (err) {
      console.error('SuperAdmin dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSupportImpersonate = (tenant) => {
    localStorage.setItem('superadmin_impersonate_tenant_id', tenant.id);
    if (tenant.organization?.id) {
      localStorage.setItem('superadmin_impersonate_org_id', tenant.organization.id);
    }
    localStorage.setItem('superadmin_impersonate_name', tenant.organization?.business_name || tenant.name);
    router.push('/dashboard');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
              Platform Master Console
            </span>
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 flex items-center gap-2.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span>SaaS Control Tower</span>
            <ShieldCheck className="w-7 h-7 text-amber-500 dark:text-amber-400" />
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 max-w-2xl ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Multi-tenant transporter health, subscription metrics, live operational activities, and direct support diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
              isDark
                ? 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700 bg-slate-900/80'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/super-admin/tenants"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20 hover:scale-[1.02] transition cursor-pointer"
          >
            <span>View All Transporters</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 text-white shadow-xl'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>Transporters</span>
            <Building2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {metrics?.totalTenants ?? 0}
          </div>
          <div className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold mt-1">
            {metrics?.activeTenants ?? 0} Active · {metrics?.trialTenants ?? 0} Trial
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 text-white shadow-xl'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>Branches / Hubs</span>
            <Building2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {metrics?.totalBranches ?? 0}
          </div>
          <div
            className={`text-[10px] font-bold mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Nationwide Network
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 text-white shadow-xl'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>Total Bilties</span>
            <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {metrics?.totalConsignments ?? 0}
          </div>
          <div className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold mt-1">
            Dockets Generated
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 text-white shadow-xl'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>Platform Users</span>
            <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {metrics?.totalUsers ?? 0}
          </div>
          <div
            className={`text-[10px] font-bold mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Owners &amp; Staff
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 text-white shadow-xl'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>Monthly MRR</span>
            <CreditCard className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-2">
            ₹{((metrics?.mrr || 0) / 1000).toFixed(1)}k
          </div>
          <div
            className={`text-[10px] font-bold mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Recurring Subscriptions
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 text-white shadow-xl'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>Projected ARR</span>
            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-2">
            ₹{(((metrics?.arr || 0)) / 100000).toFixed(2)}L
          </div>
          <div
            className={`text-[10px] font-bold mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Annual Run-rate
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Transporters & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Transporters Directory */}
        <div
          className={`lg:col-span-2 rounded-3xl border p-5 sm:p-6 space-y-4 transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-base font-bold flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Registered Transporters</span>
              </h2>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Click <strong>"Support View"</strong> to troubleshoot or verify any transporter&apos;s workspace.
              </p>
            </div>
            <Link
              href="/super-admin/tenants"
              className="text-xs font-bold text-amber-500 dark:text-amber-400 hover:underline transition"
            >
              View All ({metrics?.totalTenants ?? 0}) →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentTenants.length === 0 ? (
              <div
                className={`p-8 text-center text-xs rounded-2xl border ${
                  isDark
                    ? 'border-slate-800/80 bg-slate-900/40 text-slate-500'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                No registered transporters found yet.
              </div>
            ) : (
              recentTenants.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark
                      ? 'border-slate-800 bg-[#070C18]/60 hover:border-slate-700'
                      : 'border-slate-200/80 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-sm ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {t.organization?.business_name || t.name}
                      </span>
                      <span
                        className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                            : t.status === 'TRIAL'
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                            : 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {t.subscription?.plan_name || 'Pro Plan'}
                      </span>
                    </div>

                    <p
                      className={`text-xs mt-1 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {t.owner?.name ? `${t.owner.name} • ` : ''}
                      {t.owner?.phone || t.owner?.email || 'Registered Tenant'}
                      {t.organization?.city ? ` • ${t.organization.city}, ${t.organization.state}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSupportImpersonate(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm shadow-amber-500/15"
                      title="Inspect this transporter's screens in Support Mode"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Support View</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Live Activity Stream */}
        <div
          className={`rounded-3xl border p-5 sm:p-6 space-y-4 transition-all ${
            isDark
              ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-base font-bold flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>Platform Activity</span>
            </h2>
            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Live Stream
            </span>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <div
                className={`p-6 text-center text-xs rounded-2xl border ${
                  isDark
                    ? 'border-slate-800/80 text-slate-500 bg-slate-900/40'
                    : 'border-slate-200 text-slate-400 bg-slate-50'
                }`}
              >
                Awaiting real-time platform events...
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark
                        ? 'bg-slate-800 text-amber-400'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-bold ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {act.title}
                    </p>
                    <p
                      className={`text-[10.5px] mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {act.subtitle}
                    </p>
                    <span
                      className={`text-[9px] flex items-center gap-1 mt-0.5 ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(act.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
