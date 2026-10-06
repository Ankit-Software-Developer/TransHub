// frontend/components/layout/Navbar.js
'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useTerminology } from '../../hooks/useTerminology';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../ThemeProvider';
import ThemeToggle from '../ThemeToggle';
import api from '../../services/api';
import {
  Search,
  Bell,
  MessageSquare,
  HelpCircle,
  Building2,
  Calendar,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Truck,
  Sun,
  CloudSun,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FleetCommsDrawer from './FleetCommsDrawer';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeBranch, setActiveBranch, dateFilter, setDateFilter, toggleSearchModal, isFleetCommsOpen, toggleFleetComms } = useStore();
  const { theme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);
  const sub = user?.subscription || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('transporter_subscription') || 'null') : null);
  const rawCode = (sub?.planCode || user?.planCode || 'PRO').toUpperCase();

  let planName = 'Pro Plan';
  let planBadge = 'Pro';
  let badgeColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';

  if (rawCode.includes('ENTERPRISE')) {
    planName = 'Enterprise Plan';
    planBadge = 'Enterprise';
    badgeColor = 'bg-purple-500/20 text-purple-400 border-purple-500/40';
  } else if (rawCode.includes('BASIC') || rawCode.includes('STARTER')) {
    planName = 'Basic Plan';
    planBadge = 'Basic';
    badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  } else if (rawCode.includes('TRIAL') || sub?.isTrial) {
    planName = sub?.planName ? `${sub.planName}` : 'Trial Plan';
    planBadge = 'Trial';
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  } else if (rawCode.includes('PRO')) {
    planName = 'Pro Plan';
    planBadge = 'Pro';
    badgeColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
  }

  // Calculate days remaining dynamically so each day automatically counts down
  let daysLeft = null;
  const endDateStr = sub?.trialEndDate || sub?.currentPeriodEnd || sub?.trial_end || sub?.current_period_end;
  if (endDateStr) {
    const end = new Date(endDateStr);
    const today = new Date();
    end.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);
    const diffMs = end.getTime() - today.getTime();
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } else if (typeof sub?.trialDaysRemaining === 'number') {
    daysLeft = sub.trialDaysRemaining;
  }

  return (
    <>
      <header className={`h-16 px-6 flex items-center justify-between sticky top-0 z-20 border-b backdrop-blur-xl transition-colors ${
      isDark
        ? 'bg-[#090D18]/90 border-slate-800/80 text-white'
        : 'bg-white/90 border-slate-200 text-slate-800 shadow-xs'
    }`}>
      {/* Left: Organization / Operational Context */}
      <div className="flex items-center space-x-3">
        <div className="text-xs font-semibold text-slate-400">
          Fleet Workspace:{' '}
          <span className="font-bold text-cyan-500 dark:text-cyan-400">
            {user?.organizationName || 'TransHub Fleet Management'}
          </span>
        </div>
      </div>

      {/* Center Subtle Slogan */}
      <div className="hidden xl:flex items-center space-x-2 text-xs text-slate-400 font-serif italic">
        <span>"Moving Businesses Across Bharat"</span>
      </div>

      {/* Right: Controls, Live Clock, Notifications & User Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Live IST Clock Widget */}
        <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs ${
          isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono font-semibold">{currentTime || '03:45 PM'}</span>
          <span className="text-[10px] text-slate-400">IST</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Bell */}
        <button
          onClick={() => alert('Operational Alerts: No critical exceptions flagged at this moment.')}
          className={`relative p-2 rounded-xl border transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Alerts & Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Messages / Fleet Communication Channel */}
        <button
          onClick={toggleFleetComms}
          className={`relative p-2 rounded-xl border transition-all ${
            isFleetCommsOpen
              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/40'
              : isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Fleet Driver Communications Channel & Dispatch Radio"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
        </button>

        {/* Help */}
        <button
          onClick={() => window.open('/docs/TRANSPORT_SAAS_ARCHITECTURE_MASTER.md', '_blank')}
          className={`p-2 rounded-xl border transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Documentation & SOPs"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center space-x-2.5 p-1.5 pr-3 rounded-xl border transition-all ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                : 'bg-slate-50 border-slate-200 hover:border-blue-400'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-xs font-black text-white flex items-center justify-center shadow-md shadow-cyan-500/20 uppercase">
              {user?.firstName ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}` : 'U'}
            </div>
            <div className="hidden sm:block text-left text-xs leading-tight">
              <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Transporter'}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${badgeColor}`}>
                  {planBadge}
                </span>
              </div>
              <div className="text-[10px] text-cyan-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="truncate max-w-[120px]">{user?.organizationName || 'Fleet Operations'}</span>
                {daysLeft !== null && daysLeft <= 10 && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 rounded font-mono">
                    {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl p-2 z-50 transition-all ${
              isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="px-3 py-2.5 border-b border-slate-800 text-xs">
                <p className="font-bold truncate text-white">{user?.email || 'transporter@transhub.in'}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {planName}
                  </span>
                  {daysLeft !== null && (
                    daysLeft <= 10 ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({daysLeft}d left)
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </Link>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 ${
                    isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Fleet Communication Channel Right Sidebar Drawer */}
    <FleetCommsDrawer />
    </>
  );
}
