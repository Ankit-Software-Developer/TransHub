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
  const { isOnlyFTL, isOnlyPTL, isBoth, transporterType, isFleetSupplier, isDirectCarrier, isCompleteFTL, modeBadgeText, modeLongLabel, modeBadgeColor, allowsMultiBranchHubs, allowsBookings } = useOperationsType();
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
  }, [user?.id]);

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
    ...(isSuperAdmin ? [{ label: 'SaaS Control Tower', href: '/super-admin/dashboard', icon: ShieldCheck, isSuperAdminItem: true }] : []),
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Control Tower', href: '/control-tower', icon: Compass },
    { label: 'Branches & Hubs', href: '/branches', icon: Warehouse },
    { label: 'Fleet Management', href: '/fleet', icon: Truck },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Staff & Team', href: '/staff', icon: UserCheck },
    { label: plural || 'Bilties', href: '/bookings', icon: FileText },
    { label: 'Load Planning', href: '/load-planning', icon: Boxes },
    { label: 'Trips', href: '/trips', icon: Route },
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

  const getNavLabel = (item) => {
    if (item.href === '/bookings') {
      if (isCompleteFTL) return 'Dockets';
      if (isOnlyPTL) return 'Parcel Bilties';
      return plural || 'Bilties';
    }
    if (item.href === '/load-planning') {
      if (isCompleteFTL) return 'Loading Planning';
      return 'Load Planning';
    }
    if (item.href === '/unload-planning') {
      if (isCompleteFTL) return 'Un Loading Planning';
      return 'Unload Planning';
    }
    if (item.href === '/customers') {
      return 'Customers';
    }
    if (item.href === '/trips') {
      if (isOnlyPTL) return 'Linehaul Trips';
      if (isOnlyFTL) return 'Trip';
      return 'Trips';
    }
    if (item.href === '/deliveries') {
      return 'Delivery & POD';
    }
    if (item.href === '/billing/invoices') {
      if (isFleetSupplier || isDirectCarrier) return 'Vendor Freight Bills';
      return 'Invoices';
    }
    return item.label;
  };

  const isNavItemVisible = (item) => {
    // Exact screen lists per FTL sub-mode
    if (isFleetSupplier || isDirectCarrier) {
      const allowedRoutes = [
        '/super-admin/dashboard',
        '/dashboard',
        '/control-tower',
        '/fleet',
        '/customers',
        '/staff',
        '/trips',
        '/billing/invoices',
        '/expenses',
        '/reports',
        '/support',
        '/settings',
      ];
      if (!allowedRoutes.includes(item.href)) return false;
    } else if (isCompleteFTL) {
      const allowedRoutes = [
        '/super-admin/dashboard',
        '/dashboard',
        '/control-tower',
        '/fleet',
        '/customers',
        '/staff',
        '/bookings',
        '/load-planning',
        '/trips',
        '/unload-planning',
        '/deliveries',
        '/billing/invoices',
        '/expenses',
        '/reports',
        '/approvals',
        '/audit-logs',
        '/support',
        '/settings',
      ];
      if (!allowedRoutes.includes(item.href)) return false;
    } else {
      // PTL or Hybrid (BOTH)
      if (item.href === '/branches' && !allowsMultiBranchHubs) {
        return false;
      }
      if (item.href === '/bookings' && !allowsBookings) {
        return false;
      }
    }
    return canAccessRoute(item.href);
  };

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
        collapsed ? 'justify-center px-2' : 'justify-between px-3 xl:px-4'
      } ${
        isDark ? 'border-slate-800/80 bg-[#0B1020]' : 'border-slate-200/80 bg-slate-50/50'
      }`}>
        {collapsed ? (
          <div className="relative flex items-center justify-center w-full">
            <Link
              href="/"
              className="group relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20 dark:ring-white/10 shrink-0 overflow-hidden hover:scale-105 transition-all"
              title={user?.businessName || user?.organizationName || 'TransHub'}
            >
              {user?.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-5 h-5 text-white drop-shadow-sm transition-transform group-hover:scale-110" />
              )}
              {/* Subtle status indicator dot in collapsed mode */}
              <span
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  isOnlyFTL ? 'bg-indigo-400' : isOnlyPTL ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
              />
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
            <Link href="/" className="flex items-center space-x-3 overflow-hidden group min-w-0">
              {/* Professional Logo Squircle with Gradient & Ring */}
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-black/5 dark:ring-white/15 shrink-0 overflow-hidden transition-transform group-hover:scale-102">
                {user?.logoUrl ? (
                  <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Truck className="w-5 h-5 text-white drop-shadow-sm" />
                )}
              </div>

              {/* Organization & Tier Info */}
              <div className="min-w-0 hidden lg:block">
                <div className="flex items-center">
                  <h2
                    className={`text-[15px] font-bold tracking-tight truncate capitalize leading-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                    title={user?.businessName || user?.organizationName || 'TransHub'}
                  >
                    {user?.businessName || user?.organizationName || (
                      <>Trans<span className="text-blue-600 dark:text-cyan-400">Hub</span></>
                    )}
                  </h2>
                </div>

                {/* Professional Operations Badge & Tagline */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border shadow-2xs transition-colors shrink-0 ${
                      modeBadgeColor
                    }`}
                    title={
                      isOnlyFTL
                        ? (isFleetSupplier
                            ? 'FTL Fleet Supplier / Transporter Vendor'
                            : isDirectCarrier
                            ? 'FTL Direct Shipper Carrier'
                            : 'FTL Full-Service Enterprise Carrier')
                        : isOnlyPTL
                        ? 'Part Truckload Operations (PTL)'
                        : 'Hybrid Operations (FTL + PTL)'
                    }
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                        isOnlyFTL ? 'bg-indigo-400' : isOnlyPTL ? 'bg-amber-400' : 'bg-cyan-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                        isOnlyFTL ? 'bg-indigo-600 dark:bg-indigo-400' : isOnlyPTL ? 'bg-amber-500 dark:bg-amber-400' : 'bg-cyan-600 dark:bg-cyan-400'
                      }`} />
                    </span>
                    <span>{modeBadgeText}</span>
                  </span>

                  <span className={`text-[10px] font-semibold tracking-wider uppercase truncate ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {user?.tagline || 'Logistics'}
                  </span>
                </div>
              </div>
            </Link>

            {/* Collapse toggle button on desktop/laptop */}
            <button
              onClick={() => setCollapsed(true)}
              className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg border transition-all cursor-pointer group shrink-0 ${
                isDark
                  ? 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                  : 'border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 shadow-2xs hover:border-slate-300'
              }`}
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 lg:px-2.5 xl:px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter(isNavItemVisible)
          .map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          const displayLabel = getNavLabel(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={displayLabel}
              className={`flex items-center relative rounded-xl text-xs font-semibold transition-all group ${
                collapsed
                  ? 'justify-center p-3'
                  : 'justify-center lg:justify-start p-2.5 lg:px-3 lg:py-2.5 space-x-0 lg:space-x-2.5 xl:space-x-3'
              } ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : item.isSuperAdminItem
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 hover:text-amber-300 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? 'text-white' : item.isSuperAdminItem ? 'text-amber-400 group-hover:text-amber-300' : isDark ? 'text-slate-400 group-hover:text-cyan-400' : 'text-slate-500 group-hover:text-blue-600'
              }`} />
              {!collapsed && <span className="truncate flex-1 hidden lg:inline text-xs">{displayLabel}</span>}
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
        <div className={`h-18 px-4 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'border-slate-800/80 bg-[#0B1020]' : 'border-slate-200 bg-slate-50/80'
        }`}>
          <Link
            href="/"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center space-x-3 overflow-hidden min-w-0"
          >
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-black/5 dark:ring-white/15 shrink-0 overflow-hidden">
              {user?.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-5 h-5 text-white drop-shadow-sm" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className={`text-sm font-bold tracking-tight truncate capitalize leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {user?.businessName || user?.organizationName || 'TransHub'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border shrink-0 ${
                    modeBadgeColor
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${
                    isOnlyFTL ? 'bg-indigo-500' : isOnlyPTL ? 'bg-amber-500' : 'bg-cyan-500'
                  }`} />
                  <span>{modeBadgeText}</span>
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.tagline || 'Logistics'}
                </span>
              </div>
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
            .filter(isNavItemVisible)
            .map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              const displayLabel = getNavLabel(item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center px-3.5 py-2.5 space-x-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : item.isSuperAdminItem
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : item.isSuperAdminItem ? 'text-amber-400' : isDark ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <span className="truncate flex-1">{displayLabel}</span>
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
