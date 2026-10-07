// frontend/components/layout/Sidebar.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTerminology } from '../../hooks/useTerminology';
import { useStore } from '../../store/useStore';
import { useTheme } from '../ThemeProvider';
import approvalService from '../../services/approvalService';
import {
  LayoutDashboard,
  FileText,
  Truck,
  Boxes,
  Users,
  Receipt,
  Wallet,
  BarChart3,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Crown,
  Sparkles,
  Compass,
  Warehouse,
  ShieldCheck,
  Route,
  UserCheck,
  History
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

export default function Sidebar() {
  const pathname = usePathname();
  const { plural } = useTerminology();
  const user = useStore((state) => state.user);
  const { theme } = useTheme();
  const { isAdmin, canAccessRoute } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const isDark = theme === 'dark';

  useEffect(() => {
    let isSubscribed = true;
    const fetchCounters = async () => {
      try {
        const counts = await approvalService.getBadgeCounts();
        if (isSubscribed && counts) {
          setPendingApprovals(counts.pendingAction || 0);
        }
      } catch (e) {
        // Silently ignore if unauthenticated or error
      }
    };

    fetchCounters();
    const timer = setInterval(fetchCounters, 30000);
    return () => {
      isSubscribed = false;
      clearInterval(timer);
    };
  }, [user]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Control Tower', href: '/control-tower', icon: Compass },
    { label: 'Approvals', href: '/approvals', icon: ShieldCheck, badge: pendingApprovals },
    { label: plural || 'Bookings', href: '/bookings', icon: FileText },
    { label: 'Branches & Hubs', href: '/branches', icon: Warehouse },
    { label: 'Fleet Management', href: '/fleet', icon: Truck },
    { label: 'Users & Drivers', href: '/users', icon: UserCheck },
    { label: 'Load Planning', href: '/load-planning', icon: Boxes },
    { label: 'Trips', href: '/trips', icon: Route },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Invoices', href: '/billing/invoices', icon: Receipt },
    { label: 'Expenses', href: '/expenses', icon: Wallet },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ label: 'Audit & Activity Logs', href: '/audit-logs', icon: History }] : []),
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`sticky top-0 h-screen overflow-hidden flex flex-col shrink-0 transition-all duration-300 z-30 border-r ${
        collapsed ? 'w-20' : 'w-64'
      } ${
        isDark
          ? 'bg-[#090D18] border-slate-800/80 text-slate-300'
          : 'bg-white border-slate-200 text-slate-700 shadow-sm'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-20 flex items-center justify-between px-5 border-b ${
        isDark ? 'border-slate-800/80 bg-[#0B1020]' : 'border-slate-200/80 bg-slate-50/50'
      }`}>
        <Link href="/" className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black shadow-md shadow-cyan-500/25 shrink-0 overflow-hidden">
            {user?.logoUrl ? (
              <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Truck className="w-5 h-5 text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center">
                <span className={`text-lg font-black tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {user?.businessName || user?.organizationName || (
                    <>Trans<span className="text-cyan-400">Hub</span></>
                  )}
                </span>
              </div>
              <p className={`text-[10px] font-semibold tracking-wider uppercase truncate ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {user?.tagline || 'Logistics Without Limits'}
              </p>
            </div>
          )}
        </Link>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors ${
            isDark ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.filter((item) => canAccessRoute(item.href)).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center relative rounded-xl text-xs font-semibold transition-all group ${
                collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 space-x-3'
              } ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? 'text-white' : isDark ? 'text-slate-400 group-hover:text-cyan-400' : 'text-slate-500 group-hover:text-blue-600'
              }`} />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {item.badge > 0 && (
                <span className={`text-[10px] font-bold rounded-full flex items-center justify-center ${
                  collapsed
                    ? 'absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white'
                    : 'px-1.5 py-0.2 min-w-5 h-5 bg-amber-500 text-white ml-auto shadow-sm shadow-amber-500/40'
                } ${
                  isActive ? 'bg-white text-blue-700' : ''
                }`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Promo & Version Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className={`p-3 rounded-2xl border relative overflow-hidden ${
            isDark
              ? 'bg-gradient-to-br from-blue-950/60 via-slate-900 to-cyan-950/40 border-cyan-500/30'
              : 'bg-gradient-to-br from-blue-50 to-indigo-50/60 border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Upgrade to Enterprise
              </span>
            </div>
            <p className={`text-[10px] leading-relaxed mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Unlock advanced telemetry, multi-branch control & live radar.
            </p>
            <button
              onClick={() => alert('Enterprise upgrade modal')}
              className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-md shadow-blue-600/25 transition-all text-center block"
            >
              Learn More ➔
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
            <span>TransHub</span>
            <span>v2.4.0</span>
          </div>
        </div>
      )}
    </aside>
  );
}
