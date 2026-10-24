// frontend/components/layout/SuperAdminNavbar.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../ThemeProvider';
import ThemeToggle from '../ThemeToggle';
import {
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Building2,
  Settings,
  Sparkles,
} from 'lucide-react';

export default function SuperAdminNavbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const profileMenuRef = useRef(null);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      };
      setCurrentTime(new Intl.DateTimeFormat('en-US', options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('superadmin_impersonate_tenant_id');
    localStorage.removeItem('superadmin_impersonate_org_id');
    localStorage.removeItem('superadmin_impersonate_name');
    await logout();
    router.push('/login');
  };

  return (
    <header
      className={`h-16 py-[2px] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
        isDark
          ? 'bg-[#090D18]/95 border-slate-800 text-white shadow-xs'
          : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
      }`}
    >
      {/* Left: Platform Master Context */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400">
          <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <span className="font-extrabold tracking-tight">Platform Master Console</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </div>
      </div>

      {/* Center Context / Slogan */}
      <div className="hidden xl:flex flex-1 items-center justify-center min-w-0 px-2 select-none">
        <span
          className={`text-xs font-serif italic whitespace-nowrap truncate tracking-wide ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          "Multi-Tenant Telemetry, Subscriptions &amp; Platform Controls"
        </span>
      </div>

      {/* Right Controls: Clock, ThemeToggle, Transporter View, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Live IST Clock */}
        <div
          className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="font-mono font-semibold">{currentTime || '01:45 PM'}</span>
          <span className="text-[10px] text-slate-400 font-bold">IST</span>
        </div>

        {/* Theme Toggle Button (Light/Dark mode) */}
        <ThemeToggle />

        {/* Vertical divider */}
        <div
          className={`hidden sm:block h-4 w-px shrink-0 mx-0.5 ${
            isDark ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        />

        {/* Transporter Workspace Switcher */}
        <Link
          href="/dashboard"
          className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
          }`}
          title="Open regular Transporter Dashboard"
        >
          <ExternalLink className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
          <span>Transporter View</span>
        </Link>

        {/* User Profile Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center space-x-2 p-1 pl-1.5 pr-2 rounded-2xl border transition-all cursor-pointer ${
              showProfileMenu
                ? isDark
                  ? 'bg-slate-800/90 border-amber-500/50 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-slate-100 border-amber-500/50 shadow-md ring-2 ring-amber-500/20'
                : isDark
                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
              SA
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <div className="font-extrabold truncate max-w-[120px]">
                {user?.fullName || 'Super Administrator'}
              </div>
              <div className="text-[10px] font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                <span>ROOT ADMIN</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div
              className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150 ${
                isDark
                  ? 'bg-[#0B1020] border-slate-800 text-slate-100 shadow-slate-950/60'
                  : 'bg-white border-slate-200 text-slate-900 shadow-xl'
              }`}
            >
              <div
                className={`p-3 rounded-xl mb-1 border ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'
                }`}
              >
                <p className="text-xs font-black truncate">
                  {user?.fullName || 'Super Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {user?.email || 'admin@transporter.io'}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                  Platform Root Access
                </span>
              </div>

              <Link
                href="/super-admin/dashboard"
                onClick={() => setShowProfileMenu(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isDark
                    ? 'hover:bg-slate-800/70 text-slate-200 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Control Tower</span>
              </Link>

              <Link
                href="/super-admin/tenants"
                onClick={() => setShowProfileMenu(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isDark
                    ? 'hover:bg-slate-800/70 text-slate-200 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>All Transporters</span>
              </Link>

              <Link
                href="/super-admin/support"
                onClick={() => setShowProfileMenu(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isDark
                    ? 'hover:bg-slate-800/70 text-slate-200 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Support &amp; Escalations</span>
              </Link>

              <Link
                href="/dashboard"
                onClick={() => setShowProfileMenu(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isDark
                    ? 'hover:bg-slate-800/70 text-slate-200 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Transporter Workspace</span>
              </Link>

              <div
                className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}
              />

              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 transition-all ${
                  isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
                } cursor-pointer`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out of Platform</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
