// frontend/components/layout/Sidebar.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTerminology } from '../../hooks/useTerminology';
import { useStore } from '../../store/useStore';
import { useTheme } from '../ThemeProvider';
import approvalService from '../../services/approvalService';
import supportService from '../../services/supportService';
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
  History,
  PackageCheck,
  CheckCircle2,
  LifeBuoy,
  X,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useOperationsType } from '../../hooks/useOperationsType';

export default function Sidebar() {
  const pathname = usePathname();
  const { plural } = useTerminology();
  const user = useStore((state) => state.user);
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useStore();
  const { theme } = useTheme();
  const { isAdmin, isSuperAdmin, isBranchAssistant, isBA, isAuditor, canAccessRoute, canViewAudit, hasRole, hasPermission } = usePermissions();
  const { isOnlyFTL, isOnlyPTL, isBoth, transporterType } = useOperationsType();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);

  const isDark = theme === 'dark';

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  // Auto-close mobile drawer when window resizes to tablet/desktop breakpoint (>= 768px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileSidebarOpen]);

  useEffect(() => {
    let isSubscribed = true;
    const fetchCounters = async () => {
      try {
        const [approvalCounts, ticketCounts] = await Promise.allSettled([
          approvalService.getBadgeCounts(),
          supportService.getBadgeCounts(),
        ]);
        if (isSubscribed) {
          if (approvalCounts.status === 'fulfilled' && approvalCounts.value) {
            setPendingApprovals(approvalCounts.value.pendingAction || 0);
          }
          if (ticketCounts.status === 'fulfilled' && ticketCounts.value) {
            setPendingTickets(ticketCounts.value.pendingTickets || 0);
          }
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

  const navItems = isBA ? [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: plural || 'Bilties', href: '/bookings', icon: FileText },
    { label: 'Deliveries & POD', href: '/deliveries', icon: CheckCircle2 },
    { label: 'Support & Helpdesk', href: '/support', icon: LifeBuoy, badge: pendingTickets },
  ] : (isBranchAssistant && !isAdmin) ? [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: plural || 'Bilties', href: '/bookings', icon: FileText },
    { label: 'Load Planning', href: '/load-planning', icon: Boxes },
    { label: 'Unload Planning', href: '/unload-planning', icon: PackageCheck },
    { label: 'Dispatches', href: '/dispatches', icon: Route },
    { label: 'Deliveries & POD', href: '/deliveries', icon: CheckCircle2 },
    { label: 'Support & Helpdesk', href: '/support', icon: LifeBuoy, badge: pendingTickets },
  ] : (isAuditor && !isAdmin) ? [
    { label: 'Audit & Activity Logs', href: '/audit-logs', icon: History },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Support & Helpdesk', href: '/support', icon: LifeBuoy, badge: pendingTickets },
  ] : [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Control Tower', href: '/control-tower', icon: Compass },
    { label: 'Branches & Hubs', href: '/branches', icon: Warehouse },
    { label: 'Fleet Management', href: '/fleet', icon: Truck },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Staff & Team', href: '/staff', icon: UserCheck },
    { label: plural || 'Bilties', href: '/bookings', icon: FileText },
    { label: 'Trips', href: '/trips', icon: Route },
    { label: 'Load Planning', href: '/load-planning', icon: Boxes },
    { label: 'Unload Planning', href: '/unload-planning', icon: PackageCheck },
    { label: 'Deliveries & POD', href: '/deliveries', icon: CheckCircle2 },
    { label: 'Invoices', href: '/billing/invoices', icon: Receipt },
    { label: 'Expenses', href: '/expenses', icon: Wallet },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    ...(!isSuperAdmin ? [{ label: 'Approvals', href: '/approvals', icon: ShieldCheck, badge: pendingApprovals }] : []),
    ...((isAdmin || canViewAudit || hasRole('AUDITOR') || hasRole('AUDIT') || hasPermission('audit.view')) ? [{ label: 'Audit & Activity Logs', href: '/audit-logs', icon: History }] : []),
    { label: 'Support & Helpdesk', href: '/support', icon: LifeBuoy, badge: pendingTickets },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop/Tablet Sticky Sidebar:
          - < 768px (Mobile): hidden (uses mobile drawer overlay)
          - 768px - 1023px (Tablet): w-20 icon-only rail
          - 1024px - 1279px (1024px Laptop): w-56 compact width
          - >= 1280px (Desktop): w-64 full width
      */}
      <aside
        className={`hidden md:flex sticky top-0 h-screen flex-col shrink-0 transition-all duration-300 z-30 border-r relative ${
          collapsed ? 'w-20' : 'w-20 lg:w-56 xl:w-64'
        } ${
          isDark
            ? 'bg-[#090D18] border-slate-800/80 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700 shadow-sm'
        }`}
      >
      {/* Brand Header */}
      <div className={`h-20 flex items-center border-b transition-all ${
        collapsed ? 'justify-center px-2' : 'justify-center lg:justify-between px-2 lg:px-3.5 xl:px-5'
      } ${
        isDark ? 'border-slate-800/80 bg-[#0B1020]' : 'border-slate-200/80 bg-slate-50/50'
      }`}>
        {collapsed ? (
          <div className="relative flex items-center justify-center w-full">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black shadow-md shadow-cyan-500/25 shrink-0 overflow-hidden hover:scale-105 transition-transform"
              title={user?.businessName || 'TransHub'}
            >
              {user?.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-5 h-5 text-white" />
              )}
            </Link>

            {/* Floating Expand Toggle on Border */}
            <button
              onClick={() => setCollapsed(false)}
              className={`absolute -right-5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border shadow-md flex items-center justify-center transition-all z-50 cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-cyan-500/50'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
              title="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Link href="/" className="flex items-center space-x-2.5 xl:space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black shadow-md shadow-cyan-500/25 shrink-0 overflow-hidden">
                {user?.logoUrl ? (
                  <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Truck className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="min-w-0 hidden lg:block">
                <div className="flex items-center">
                  <span className={`text-sm xl:text-base font-black tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {user?.businessName || user?.organizationName || (
                      <>Trans<span className="text-cyan-400">Hub</span></>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 leading-tight ${
                      isOnlyFTL
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30'
                        : isOnlyPTL
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                        : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                    }`}
                    title={
                      isOnlyFTL
                        ? 'Full Truckload Operations (FTL)'
                        : isOnlyPTL
                        ? 'Part Truckload Operations (PTL)'
                        : 'Hybrid Operations (FTL + PTL)'
                    }
                  >
                    {isOnlyFTL ? '🚛 FTL' : isOnlyPTL ? '📦 PTL' : '🔄 FTL+PTL'}
                  </span>
                  <p className={`text-[9.5px] font-semibold tracking-wider uppercase truncate ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {user?.tagline || 'Logistics'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Collapse toggle button on desktop/laptop */}
            <button
              onClick={() => setCollapsed(true)}
              className={`hidden lg:flex p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors cursor-pointer ${
                isDark ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
              }`}
              title="Collapse sidebar to icons"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 lg:px-2.5 xl:px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => {
            if (isOnlyFTL && (item.href === '/load-planning' || item.href === '/unload-planning')) {
              return false;
            }
            return canAccessRoute(item.href);
          })
          .map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center relative rounded-xl text-xs font-semibold transition-all group ${
                collapsed
                  ? 'justify-center p-3'
                  : 'justify-center lg:justify-start p-2.5 lg:px-3 lg:py-2.5 space-x-0 lg:space-x-2.5 xl:space-x-3'
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
              {!collapsed && <span className="truncate flex-1 hidden lg:inline text-xs">{item.label}</span>}
              {item.badge > 0 && (
                <span className={`text-[10px] rounded-full flex items-center justify-center shrink-0 ${
                  collapsed
                    ? 'absolute top-1 right-1 w-4 h-4'
                    : 'absolute lg:static top-1 right-1 w-4 h-4 lg:w-auto lg:h-5 lg:px-1.5 lg:py-0.5 lg:min-w-[20px] lg:ml-auto shadow-sm'
                } ${
                  isActive
                    ? 'bg-white text-blue-700 font-extrabold'
                    : 'bg-amber-500 text-white font-bold shadow-amber-500/40'
                }`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Promo & Version Footer (Minimal on 1024px laptop, full promo on xl+ desktop) */}
      {!collapsed && (
        <div className="hidden lg:block p-2.5 xl:p-4 border-t border-slate-800/80 space-y-2 xl:space-y-3 shrink-0">
          <div className="hidden xl:block">
            {isBA ? (
              <div className={`p-3 rounded-2xl border ${
                isDark
                  ? 'bg-blue-950/40 border-blue-800/50 text-blue-300'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-blue-900'}`}>
                    Associate Agent Portal
                  </span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Streamlined docket booking and instant POD delivery upload.
                </p>
              </div>
            ) : (
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
                <p className={`text-[10px] leading-relaxed mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Unlock advanced telemetry, multi-branch control & live radar.
                </p>
                <button
                  type="button"
                  onClick={() => alert('Enterprise upgrade modal')}
                  className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-md shadow-blue-600/25 transition-all text-center block cursor-pointer"
                >
                  Learn More ➔
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
            <span>{isBA ? 'TransHub BA' : 'TransHub'}</span>
            <span>v2.4.0</span>
          </div>
        </div>
      )}
    </aside>

    {/* Mobile Overlap Drawer & Backdrop Overlay (md:hidden - for screens < 768px) */}
    <div
      className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
        isMobileSidebarOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
    >
      {/* Backdrop with smooth fade */}
      <div
        onClick={() => setMobileSidebarOpen(false)}
        className={`fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300 ${
          isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Slide-over Overlap Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] h-full flex flex-col z-50 border-r shadow-2xl transform transition-transform duration-300 ease-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-[#090D18] border-slate-800 text-slate-200 shadow-blue-950/40'
            : 'bg-white border-slate-200 text-slate-800 shadow-xl'
        }`}
      >
        {/* Header with Brand & Close Button */}
        <div className={`h-16 px-4 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'border-slate-800/80 bg-[#0B1020]' : 'border-slate-200 bg-slate-50/80'
        }`}>
          <Link
            href="/"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center space-x-2.5 overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black shadow-md shrink-0 overflow-hidden">
              {user?.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <span className={`text-base font-black truncate block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {user?.businessName || user?.organizationName || 'TransHub'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {user?.tagline || 'Logistics Platform'}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => {
              if (isOnlyFTL && (item.href === '/load-planning' || item.href === '/unload-planning')) {
                return false;
              }
              return canAccessRoute(item.href);
            })
            .map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center px-3.5 py-2.5 space-x-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs ml-auto">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* Mobile Footer */}
        <div className={`p-3 border-t shrink-0 ${
          isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {user?.firstName ? `Hi, ${user.firstName}` : (user?.businessName || 'TransHub')}
            </span>
            <span className="font-mono text-[10px] text-slate-400 shrink-0">v2.4.0</span>
          </div>
        </div>
      </aside>
    </div>
  </>
  );
}
