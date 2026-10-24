// frontend/components/layout/SupportImpersonationBanner.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert, ArrowLeft, Building2, ExternalLink } from 'lucide-react';

export default function SupportImpersonationBanner() {
  const router = useRouter();
  const { user } = useAuth();
  const [impersonatingTenant, setImpersonatingTenant] = useState(null);

  const isSuperAdmin =
    user?.email?.toLowerCase() === 'admin@transporter.io' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.roles?.includes('SUPER_ADMIN') ||
    user?.accountType === 'SUPER_ADMIN' ||
    Boolean(user?.isSuperAdmin);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tenantId = localStorage.getItem('superadmin_impersonate_tenant_id');
      const tenantName = localStorage.getItem('superadmin_impersonate_name');
      if (tenantId) {
        setImpersonatingTenant({ id: tenantId, name: tenantName || 'Selected Transporter' });
      } else {
        setImpersonatingTenant(null);
      }
    }
  }, []);

  const handleExitSupportMode = () => {
    localStorage.removeItem('superadmin_impersonate_tenant_id');
    localStorage.removeItem('superadmin_impersonate_org_id');
    localStorage.removeItem('superadmin_impersonate_name');
    setImpersonatingTenant(null);
    router.push('/super-admin/tenants');
  };

  // Case 1: Active Impersonation Session
  if (impersonatingTenant) {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 font-bold px-4 py-2.5 flex flex-wrap items-center justify-between text-xs sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-950 animate-pulse shrink-0" />
          <span>
            <strong>SUPPORT IMPERSONATION ACTIVE:</strong> You are troubleshooting transporter{' '}
            <span className="underline font-black">{impersonatingTenant.name}</span> (Tenant ID: {impersonatingTenant.id.slice(0, 8)}...)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] opacity-80 hidden sm:inline">All changes apply directly to their live database.</span>
          <button
            type="button"
            onClick={handleExitSupportMode}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to SuperAdmin Console</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 2: SuperAdmin browsing normal tenant screens without active impersonation
  if (isSuperAdmin) {
    return (
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/40 text-slate-200 font-medium px-4 py-2 flex flex-wrap items-center justify-between text-xs sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-amber-400 font-black tracking-wide uppercase text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            Super Administrator Session Active
          </span>
          <span className="text-slate-400 hidden sm:inline">
            You have full platform master privileges. Currently viewing local workspace.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/super-admin/tenants')}
            className="text-[11px] font-bold text-slate-300 hover:text-white underline cursor-pointer hidden md:inline"
          >
            Manage Transporters
          </button>
          <button
            type="button"
            onClick={() => router.push('/super-admin/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer shadow-sm shadow-amber-500/20"
          >
            <span>Open SaaS Control Tower</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
