// frontend/app/super-admin/tenants/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import { useTheme } from '../../../components/ThemeProvider';
import {
  Building2,
  Search,
  Filter,
  Eye,
  Edit,
  ShieldCheck,
  RefreshCw,
  Plus,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Zap,
} from 'lucide-react';

export default function SuperAdminTenantsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit / Extend modal state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [trialDaysAdd, setTrialDaysAdd] = useState('30');
  const [selectedPlanCode, setSelectedPlanCode] = useState('PRO');
  const [selectedTransporterType, setSelectedTransporterType] = useState('BOTH');
  const [selectedTransporterSubType, setSelectedTransporterSubType] = useState('COMPLETE_FTL');
  const [modalLoading, setModalLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/tenants', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      if (res.data?.success) {
        setTenants(res.data.data.tenants || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTenants();
  };

  // Support Impersonation
  const handleSupportImpersonate = (tenant) => {
    localStorage.setItem('superadmin_impersonate_tenant_id', tenant.id);
    if (tenant.organization?.id) {
      localStorage.setItem('superadmin_impersonate_org_id', tenant.organization.id);
    }
    localStorage.setItem(
      'superadmin_impersonate_name',
      tenant.organization?.business_name || tenant.name
    );
    const tType = tenant.organization?.transporter_type || 'BOTH';
    const tSubType = tenant.organization?.transporter_subtype || 'COMPLETE_FTL';
    localStorage.setItem('superadmin_impersonate_transporter_type', tType);
    localStorage.setItem('superadmin_impersonate_transporter_subtype', tSubType);
    router.push('/dashboard');
  };

  // Open Edit Modal
  const openEditModal = (tenant) => {
    setSelectedTenant(tenant);
    setSelectedPlanCode(tenant.subscription?.plan_code || 'PRO');
    setSelectedTransporterType(tenant.organization?.transporter_type || 'BOTH');
    setSelectedTransporterSubType(tenant.organization?.transporter_subtype || 'COMPLETE_FTL');
    setTrialDaysAdd('30');
    setSuccessMsg('');
    setModalOpen(true);
  };

  // Save Plan / Extend Trial / Change Operation Mode
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setModalLoading(true);
    setSuccessMsg('');

    try {
      const res = await api.patch(`/super-admin/tenants/${selectedTenant.id}/plan`, {
        plan_code: selectedPlanCode,
        trial_days_add: trialDaysAdd ? parseInt(trialDaysAdd, 10) : 0,
        transporter_type: selectedTransporterType,
        transporter_subtype: selectedTransporterType === 'FTL' ? selectedTransporterSubType : null,
      });

      if (res.data?.success) {
        setSuccessMsg('Operations mode & plan updated successfully!');
        setTimeout(() => {
          setModalOpen(false);
          fetchTenants();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to update tenant operations mode or plan:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Suspend / Activate Toggle
  const handleToggleStatus = async (tenant) => {
    const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to mark "${tenant.name}" as ${newStatus}?`)) return;

    try {
      await api.patch(`/super-admin/tenants/${tenant.id}/status`, { status: newStatus });
      fetchTenants();
    } catch (err) {
      alert('Failed to update status.');
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
              SaaS Multi-Tenant Management
            </span>
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 flex items-center gap-2.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span>Transporters Directory</span>
            <Building2 className="w-7 h-7 text-amber-500 dark:text-amber-400" />
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 max-w-2xl ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            View all onboarded transporters, monitor their subscription plans, diagnose customer issues via Support Mode, and manage account statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTenants}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
              isDark
                ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs transition-colors ${
          isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, owner, city..."
            className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs font-medium transition-colors focus:outline-none border ${
              isDark
                ? 'bg-[#070C18] border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
            }`}
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : isDark
                  ? 'bg-slate-850 bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Transporters Table */}
      <div
        className={`rounded-3xl border overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className={`border-b uppercase text-[10px] font-extrabold tracking-wider transition-colors ${
                  isDark
                    ? 'border-slate-800 bg-[#070C18]/60 text-slate-400'
                    : 'border-slate-200 bg-slate-50/70 text-slate-500'
                }`}
              >
                <th className="py-3.5 px-4">Transporter Company</th>
                <th className="py-3.5 px-4">Owner &amp; Contact</th>
                <th className="py-3.5 px-4">Operations Mode</th>
                <th className="py-3.5 px-4">Subscription Plan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Support &amp; Controls</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y transition-colors ${
                isDark ? 'divide-slate-800/80' : 'divide-slate-100'
              }`}
            >
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500 dark:text-amber-400" />
                    <span>Loading registered transporters...</span>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={`py-12 text-center text-xs ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    No transporters found matching your search.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => {
                  const org = t.organization;
                  const owner = t.owner;
                  const sub = t.subscription;

                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Transporter */}
                      <td className="py-3.5 px-4">
                        <div
                          className={`font-bold text-sm ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {org?.business_name || t.name}
                        </div>
                        <div
                          className={`text-[11px] flex items-center gap-1 mt-0.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          <MapPin className="w-3 h-3 text-cyan-500 dark:text-cyan-400 shrink-0" />
                          <span>
                            {[org?.city, org?.state].filter(Boolean).join(', ') || 'Head Office'}
                          </span>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        <div
                          className={`font-bold ${
                            isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {owner?.name || 'Administrator'}
                        </div>
                        <div
                          className={`text-[10.5px] mt-0.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {owner?.phone || owner?.email || '—'}
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase w-fit ${
                              org?.transporter_type === 'FTL'
                                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                                : org?.transporter_type === 'PTL'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            <span>
                              {org?.transporter_type === 'FTL'
                                ? 'FTL Dedicated'
                                : org?.transporter_type === 'PTL'
                                ? 'PTL Sundry'
                                : 'Both (FTL + PTL)'}
                            </span>
                          </span>
                          {org?.transporter_type === 'FTL' && (
                            <span
                              className={`text-[10px] font-medium ml-1 ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              {org?.transporter_subtype === 'FLEET_SUPPLIER'
                                ? 'Fleet Supplier'
                                : org?.transporter_subtype === 'DIRECT_CARRIER'
                                ? 'Direct Carrier'
                                : 'Full-Service FTL'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-amber-600 dark:text-amber-400">
                          {sub?.plan_name || 'Pro Multimodal'}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {sub?.daysRemaining !== null ? (
                            <span className="text-emerald-500 dark:text-emerald-400 font-bold">
                              {sub.daysRemaining} days remaining
                            </span>
                          ) : (
                            sub?.billing_cycle || 'MONTHLY'
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            t.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                              : t.status === 'TRIAL'
                              ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                              : 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleSupportImpersonate(t)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-xs"
                            title="Inspect Transporter Workspace in Support Mode"
                          >
                            <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Support View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(t)}
                            className={`p-1.5 rounded-xl border transition cursor-pointer ${
                              isDark
                                ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            title="Manage Plan & Extend Trial"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                              t.status === 'ACTIVE'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            }`}
                          >
                            {t.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Operations Mode & Plan Modal */}
      {modalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4 my-8 transition-colors max-h-[92vh] overflow-y-auto ${
              isDark
                ? 'bg-[#0B1020] border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div>
                <h3
                  className={`text-base font-bold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Edit Transporter Operations &amp; Plan
                </h3>
                <p
                  className={`text-xs mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Transporter: <strong>{selectedTenant.organization?.business_name || selectedTenant.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              {/* Operations Movement Mode */}
              <div>
                <label
                  className={`font-bold block mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Operations Movement Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'FTL', label: 'FTL Only', sub: 'Full Truckload', icon: '🚛' },
                    { key: 'PTL', label: 'PTL Only', sub: 'Part-Load / Sundry', icon: '📦' },
                    { key: 'BOTH', label: 'Both (FTL + PTL)', sub: 'Hybrid Logistics', icon: '🔄' },
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setSelectedTransporterType(mode.key)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedTransporterType === mode.key
                          ? 'border-amber-500 bg-amber-500/15 text-amber-500 dark:text-amber-400 ring-1 ring-amber-500/50'
                          : isDark
                          ? 'border-slate-800 bg-[#070C18] text-slate-300 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-base">{mode.icon}</span>
                        {selectedTransporterType === mode.key && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                        )}
                      </div>
                      <div className="font-extrabold text-xs">{mode.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          selectedTransporterType === mode.key
                            ? 'text-amber-500/80 dark:text-amber-400/80'
                            : isDark
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {mode.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* FTL Sub-category Selection (only when FTL is selected) */}
              {selectedTransporterType === 'FTL' && (
                <div
                  className={`p-3 rounded-2xl border ${
                    isDark
                      ? 'bg-indigo-950/20 border-indigo-900/40'
                      : 'bg-indigo-50/50 border-indigo-200'
                  }`}
                >
                  <label
                    className="font-bold block mb-1.5 text-indigo-500 dark:text-indigo-400"
                  >
                    FTL Operating Category:
                  </label>
                  <div className="space-y-1.5">
                    {[
                      {
                        key: 'FLEET_SUPPLIER',
                        label: 'Fleet Supplier / Vendor Provider',
                        desc: 'Placing vehicles on trip contract with other transport companies & freight billing',
                      },
                      {
                        key: 'DIRECT_CARRIER',
                        label: 'Direct Shipper Carrier',
                        desc: 'Direct factory / corporate shipper contracts with consignor-to-consignee bilties',
                      },
                      {
                        key: 'COMPLETE_FTL',
                        label: 'Full-Service Enterprise FTL Carrier',
                        desc: 'Customer dockets with dual dispatch: own fleet + hired market trucks & lorry hire memo',
                      },
                    ].map((sub) => (
                      <div
                        key={sub.key}
                        onClick={() => setSelectedTransporterSubType(sub.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                          selectedTransporterSubType === sub.key
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-400'
                            : isDark
                            ? 'border-slate-800/80 bg-[#070C18] text-slate-300 hover:border-slate-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="transporter_subtype"
                          value={sub.key}
                          checked={selectedTransporterSubType === sub.key}
                          onChange={() => setSelectedTransporterSubType(sub.key)}
                          className="mt-0.5 accent-indigo-500"
                        />
                        <div className="min-w-0">
                          <div
                            className={`font-bold text-xs ${
                              selectedTransporterSubType === sub.key
                                ? isDark
                                  ? 'text-indigo-300'
                                  : 'text-indigo-900'
                                : isDark
                                ? 'text-slate-200'
                                : 'text-slate-800'
                            }`}
                          >
                            {sub.label}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {sub.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label
                  className={`font-bold block mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Subscription Tier:
                </label>
                <select
                  value={selectedPlanCode}
                  onChange={(e) => setSelectedPlanCode(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border font-medium focus:outline-none ${
                    isDark
                      ? 'bg-[#070C18] border-slate-700 text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                  }`}
                >
                  <option value="BASIC">Basic Fleet (₹500/mo · Up to 5 Trucks)</option>
                  <option value="PRO">Pro Multimodal (₹1,000/mo · Up to 25 Trucks)</option>
                  <option value="ENTERPRISE">Enterprise Cargo (₹2,000/mo · Unlimited)</option>
                  <option value="TRIAL">30-Day Free Trial</option>
                </select>
              </div>

              <div>
                <label
                  className={`font-bold block mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Extend Free Trial (Add Days):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['15', '30', '60'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTrialDaysAdd(d)}
                      className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                        trialDaysAdd === d
                          ? 'border-amber-500 bg-amber-500/15 text-amber-500 dark:text-amber-400 font-extrabold'
                          : isDark
                          ? 'border-slate-800 bg-[#070C18] text-slate-400 hover:text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-sm cursor-pointer"
                >
                  {modalLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
