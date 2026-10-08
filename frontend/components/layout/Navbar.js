// frontend/components/layout/Navbar.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useTerminology } from '../../hooks/useTerminology';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../ThemeProvider';
import ThemeToggle from '../ThemeToggle';
import api from '../../services/api';
import {
  Search,
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
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
  Clock,
  Settings as SettingsIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FleetCommsDrawer from './FleetCommsDrawer';
import HelpModal from './HelpModal';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'All High-Transit Corridors Clear',
    description: 'No critical delays or route exceptions flagged across active line-haul trips.',
    time: '2m ago',
    type: 'success',
    category: 'Radar',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'NH-48 Monsoon Speed Advisory',
    description: 'Wet asphalt radar active. 60 km/h speed threshold enforced for heavy vehicle units.',
    time: '25m ago',
    type: 'warning',
    category: 'Safety',
    isRead: false,
  },
  {
    id: 'notif-3',
    title: 'Fastag & Toll Gateway Reconciled',
    description: 'Automated deduction reconciliations synchronized with active trip ledgers.',
    time: '1h ago',
    type: 'info',
    category: 'Billing',
    isRead: true,
  },
];

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isAdmin } = usePermissions();
  const { activeBranch, setActiveBranch, dateFilter, setDateFilter, toggleSearchModal, isFleetCommsOpen, toggleFleetComms } = useStore();
  const { theme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notificationTab, setNotificationTab] = useState('all'); // 'all' | 'unread'
  const [currentTime, setCurrentTime] = useState('');
  const profileMenuRef = useRef(null);
  const alertsDropdownRef = useRef(null);

  const isDark = theme === 'dark';

  // Auto-close profile & alerts dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (alertsDropdownRef.current && !alertsDropdownRef.current.contains(event.target)) {
        setShowAlertsDropdown(false);
      }
    };

    if (showProfileMenu || showAlertsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showProfileMenu, showAlertsDropdown]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notificationTab === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const removeNotification = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
      <header className={`h-16 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 border-b backdrop-blur-xl transition-colors ${
        isDark
          ? 'bg-[#090D18]/95 border-slate-800 text-white shadow-xs'
          : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
      }`}>
        {/* Left: Organization / Operational Context */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Workspace:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
              {user?.businessName || user?.organizationName || 'balajilogistic'}
            </span>
          </div>
        </div>

        {/* Center Slogan - Naturally Centered in Open Middle Space without Overlapping */}
        <div className="hidden xl:flex flex-1 items-center justify-center min-w-0 px-2 select-none">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-serif italic whitespace-nowrap truncate tracking-wide">
            "Moving Businesses Across Bharat"
          </span>
        </div>

        {/* Right: Controls, Live Clock, Notifications & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
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

        {/* Notifications Bell with Dropdown */}
        {/* Notifications Bell with Dropdown */}
        <div className="relative" ref={alertsDropdownRef}>
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
              showAlertsDropdown
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/40'
                : isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Operational Alerts & Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-[#070C18] shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className={`absolute right-0 mt-2 w-80 sm:w-[420px] rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
              isDark ? 'bg-[#0B1020] border-slate-800 text-slate-100 shadow-blue-950/40' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}>
              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isDark ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-100 bg-slate-50/70'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAlertsDropdown(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-Header Tabs */}
              <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                isDark ? 'border-slate-800/60 bg-slate-950/30' : 'border-slate-100 bg-slate-50/40'
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNotificationTab('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      notificationTab === 'all'
                        ? isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'
                        : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationTab('unread')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      notificationTab === 'unread'
                        ? isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'
                        : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllNotifications}
                    className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-1"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              {/* Notifications List or Empty State */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredNotifications.length === 0 ? (
                  /* EMPTY STATE */
                  <div className="py-12 px-6 text-center space-y-3">
                    <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <BellOff className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className={`text-xs sm:text-sm font-bold ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        No Notifications
                      </h4>
                      <p className={`text-xs mt-1 max-w-[280px] mx-auto leading-relaxed ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {notificationTab === 'unread'
                          ? 'You have caught up with all active operational alerts.'
                          : 'No operational alerts, trip milestones, or pending notifications at this moment.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* NOTIFICATIONS ITEMS */
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-3.5 transition-colors cursor-pointer group relative ${
                        !notif.isRead
                          ? isDark ? 'bg-blue-950/20 hover:bg-blue-950/30' : 'bg-blue-50/50 hover:bg-blue-50/70'
                          : isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'success' ? (
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : notif.type === 'warning' ? (
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                              <Info className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {notif.title}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase font-mono ${
                              isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'
                            }`}>
                              {notif.category}
                            </span>
                            {!notif.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {notif.description}
                          </p>

                          <span className="text-[10px] text-slate-400 mt-1.5 block font-mono">
                            {notif.time}
                          </span>
                        </div>

                        {/* Individual Dismiss Button */}
                        <button
                          type="button"
                          onClick={(e) => removeNotification(notif.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all absolute top-3.5 right-3"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className={`p-2.5 border-t text-center ${
                isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Control Tower Radar 100% Operational
                </span>
              </div>
            </div>
          )}
        </div>

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

        {/* Help & Support Desk */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isHelpOpen
              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
              : isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Help & Operations Desk (FAQs, Guides, 24/7 Helpline)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center space-x-2.5 p-1.5 pr-3 rounded-xl border transition-all ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                : 'bg-slate-50 border-slate-200 hover:border-blue-400'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-xs font-black text-white flex items-center justify-center shadow-md shadow-cyan-500/20 uppercase overflow-hidden shrink-0">
              {user?.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                user?.firstName ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}` : 'U'
              )}
            </div>
            <div className="hidden sm:block text-left text-xs leading-tight">
              <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Transporter'}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${badgeColor}`}>
                  {planBadge}
                </span>
              </div>
              <div className="text-[10px] text-cyan-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="truncate max-w-[120px]">{user?.organizationName || user?.businessName || 'Fleet Operations'}</span>
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
              <div className={`px-3 py-2.5 border-b text-xs ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.email || 'transporter@transhub.in'}</p>
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

              <div className="py-1 space-y-0.5">
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isDark ? 'hover:bg-slate-800/70 text-slate-200 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>My Profile</span>
                </Link>

                {isAdmin && (
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'hover:bg-slate-800/70 text-slate-200 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Account Settings</span>
                  </Link>
                )}

                <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 transition-all ${
                    isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
                  }`}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
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

    {/* Help & Operational Support Desk Modal */}
    <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
