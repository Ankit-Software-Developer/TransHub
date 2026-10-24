// frontend/components/layout/SuperAdminSidebar.js
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../ThemeProvider';
import {
  ShieldCheck,
  Building2,
  Users,
  Activity,
  Headphones,
  Settings,
  LogOut,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const NAV_ITEMS = [
    {
      title: 'Control Tower',
      href: '/super-admin/dashboard',
      icon: TrendingUp,
      badge: 'LIVE',
    },
    {
      title: 'All Transporters',
      href: '/super-admin/tenants',
      icon: Building2,
    },
    {
      title: 'Live Activity Stream',
      href: '/super-admin/activity',
      icon: Activity,
    },
    {
      title: 'Support & Escalations',
      href: '/super-admin/support',
      icon: Headphones,
    },
    {
      title: 'Platform Plans & Rules',
      href: '/super-admin/settings',
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    localStorage.removeItem('superadmin_impersonate_tenant_id');
    localStorage.removeItem('superadmin_impersonate_org_id');
    localStorage.removeItem('superadmin_impersonate_name');
    await logout();
    router.push('/login');
  };

  return (
    <aside
      className={`w-64 border-r flex flex-col shrink-0 min-h-screen transition-colors ${
        isDark
          ? 'bg-[#090D18] border-slate-800 text-slate-300'
          : 'bg-white border-slate-200 text-slate-700 shadow-sm'
      }`}
    >
      {/* Platform Brand Header */}
      <div
        className={`p-5 border-b transition-colors ${
          isDark ? 'border-slate-800/80 bg-[#070C16]' : 'border-slate-100 bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span
              className={`text-sm font-black tracking-tight flex items-center gap-1.5 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              TransHub SaaS
            </span>
            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
              Super Admin Console
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          SaaS Management
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/super-admin/dashboard' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-slate-950'
                      : isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                />
                <span>{item.title}</span>
              </div>
              {item.badge ? (
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : isDark
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item.badge}
                </span>
              ) : (
                <ChevronRight
                  className={`w-3 h-3 transition-opacity ${
                    isActive
                      ? 'text-slate-950 opacity-80'
                      : isDark
                      ? 'text-slate-600 opacity-40'
                      : 'text-slate-400 opacity-60'
                  }`}
                />
              )}
            </Link>
          );
        })}

        <div
          className={`pt-5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          Operations Sandbox
        </div>

        <Link
          href="/dashboard"
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
            isDark
              ? 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/50 border-slate-800'
              : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>Open Transporter View</span>
          </div>
          <span
            className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Live App
          </span>
        </Link>
      </nav>

      {/* User Profile & Logout Footer */}
      <div
        className={`p-3 border-t transition-colors ${
          isDark ? 'border-slate-800/80 bg-[#070C16]' : 'border-slate-100 bg-slate-50/60'
        }`}
      >
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/70 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
              SA
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-black truncate ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {user?.fullName || 'Super Admin'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.email || 'admin@transporter.io'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of Super Admin"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
