// frontend/app/(owner)/profile/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import { useStore } from '../../../store/useStore';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import {
  User,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  KeyRound,
  Sparkles,
  Settings as SettingsIcon,
  ArrowRight,
  Warehouse,
  Copy,
  Check,
  Crown,
  Shield,
  Palette,
  FileText,
  Layers
} from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin } = usePermissions();

  // Feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [copiedTenant, setCopiedTenant] = useState(false);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleName: 'Admin',
    branchName: 'All Branches (Enterprise Admin)',
  });

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Sync profile details when user is loaded
  useEffect(() => {
    if (user) {
      const rawRole = user.roles?.[0];
      const formattedRole = (!rawRole || rawRole === 'TRANSPORT_OWNER' || rawRole === 'Transport Owner' || rawRole === 'OWNER' || rawRole === 'SUPER_ADMIN')
        ? 'Admin'
        : rawRole.replace(/_/g, ' ');

      setProfileForm({
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        roleName: formattedRole,
        branchName: user.branchName || user.branch?.branch_name || 'All Branches (Enterprise Admin)',
      });
    }
  }, [user]);

  // Flash feedback helpers
  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5500);
  };

  // Copy Tenant / Account ID to clipboard
  const handleCopyTenant = () => {
    const idToCopy = user?.tenantId || user?.organizationId || user?.id || 'TENANT-DEFAULT';
    navigator.clipboard.writeText(idToCopy);
    setCopiedTenant(true);
    setTimeout(() => setCopiedTenant(false), 2500);
  };

  // 1. Save Personal Profile Changes
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.patch('/auth/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
      });

      if (res.data?.success) {
        const updatedUser = {
          ...user,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone,
        };
        setUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('transporter_user', JSON.stringify(updatedUser));
        }
        triggerSuccess('Your personal profile details have been successfully updated!');
      } else {
        triggerError(res.data?.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      triggerError(err.response?.data?.message || err.message || 'Failed to save profile changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Change Account Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      triggerError('New password and confirmation password do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      triggerError('New password must be at least 6 characters long.');
      return;
    }

    setIsSavingPassword(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.data?.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        triggerSuccess('Password changed successfully! Your account credentials are now secured.');
      } else {
        triggerError(res.data?.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Change password error:', err);
      triggerError(err.response?.data?.message || err.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Compute initials & plan details
  const initials = profileForm.firstName
    ? `${profileForm.firstName[0]}${profileForm.lastName ? profileForm.lastName[0] : ''}`.toUpperCase()
    : 'OP';

  const planName = user?.subscription?.planName || 'Pro Plan';
  const trialDaysRemaining = user?.subscription?.trialDaysRemaining ?? 30;

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#070B14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Notifications / Alerts */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-500/5 animate-in fade-in">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-400 text-xs">✕</button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between shadow-lg shadow-rose-500/5 animate-in fade-in">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-400 text-xs">✕</button>
            </div>
          )}

          {/* Hero Profile Banner */}
          <div className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-xl ${
            isDark
              ? 'bg-gradient-to-r from-slate-900/90 via-[#0B1020]/90 to-blue-950/40 border-slate-800'
              : 'bg-white border-slate-200'
          }`}>
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Left: Avatar & Identity Details */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-xl shadow-cyan-500/25 border-2 border-white/20 uppercase overflow-hidden shrink-0">
                    {user?.logoUrl ? (
                      <img src={user.logoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-md animate-pulse" title="Active Session" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                      {profileForm.firstName ? `${profileForm.firstName} ${profileForm.lastName || ''}`.trim() : 'Operator Profile'}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      {profileForm.roleName}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{user?.organizationName || user?.businessName || 'Transport Operations Enterprise'}</span>
                    <span className="text-slate-600 dark:text-slate-500">•</span>
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profileForm.email || 'transporter@transhub.in'}</span>
                  </p>

                  <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400">
                      <Crown className="w-3 h-3" />
                      <span>{planName}</span>
                      <span className="text-blue-300 font-mono text-[10px]">({trialDaysRemaining}d remaining)</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyTenant}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[10px] font-mono transition-all ${
                        copiedTenant
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : isDark
                          ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Click to copy Tenant ID"
                    >
                      {copiedTenant ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      <span>ID: {user?.tenantId ? user.tenantId.substring(0, 10) + '...' : 'TENANT-ACTIVE'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Shortcut to Company Settings (Admin only) */}
              {isAdmin && (
                <div className="flex items-center gap-3">
                  <Link
                    href="/settings"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-md ${
                      isDark
                        ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:text-white hover:border-cyan-500/40 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4 text-cyan-400" />
                    <span>Company Settings</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              )}

            </div>
          </div>

          {/* Main 2-Column Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: Personal Details (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400" />
                      <span>Personal Profile Information</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Your operator name and mobile phone used across bilty booking and authorization logs.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active User
                  </span>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        placeholder="e.g. Ankit"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          isDark
                            ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        placeholder="e.g. Sharma"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          isDark
                            ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Email Address (Tenant Login)
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          disabled
                          value={profileForm.email}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold opacity-70 cursor-not-allowed ${
                            isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Verified
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Primary account identifier for multi-tenant isolation.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Mobile Phone Number
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            isDark
                              ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Used for dispatch alerts and driver WhatsApp comms.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Assigned Operating Role
                      </label>
                      <input
                        type="text"
                        disabled
                        value={profileForm.roleName}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold opacity-70 cursor-not-allowed ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Primary Hub / Branch
                      </label>
                      <input
                        type="text"
                        disabled
                        value={profileForm.branchName}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold opacity-70 cursor-not-allowed ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Profile Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Privileges & Multi-Tenant Audit */}
              <div className={`p-6 rounded-3xl border shadow-xl ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Security & Access Authorization</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={`p-3.5 rounded-2xl border ${
                    isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tenant Encryption</p>
                    <p className="text-xs font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Isolated Schema
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">PostgreSQL multi-tenant DB</p>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${
                    isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Active Session</p>
                    <p className="text-xs font-extrabold text-blue-400 mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      JWT Authenticated
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dual-token rotative refresh</p>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${
                    isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Role Privileges</p>
                    <p className="text-xs font-extrabold text-cyan-400 mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      Full Administrative
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Read, Write, Dispatch, Audit</p>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Password & Security (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    <span>Change Account Password</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update your account credentials to keep your transport business data secure.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Current Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="••••••••"
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          isDark
                            ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Min. 6 characters"
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          isDark
                            ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Re-type new password"
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          isDark
                            ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                    isDark ? 'bg-slate-900/40 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}>
                    <p className="font-semibold text-slate-300">Password Checklist:</p>
                    <p className="flex items-center gap-1.5">
                      <span className={passwordForm.newPassword.length >= 6 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {passwordForm.newPassword.length >= 6 ? '✓' : '•'} At least 6 characters
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className={passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword ? '✓' : '•'} Passwords match
                      </span>
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {isSavingPassword ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick links to Organization Settings (Admin only) */}
              {isAdmin && (
                <div className={`p-6 rounded-3xl border shadow-xl ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>Organization & App Settings</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Need to configure company logos, GSTIN, theme colors, or role access matrices?
                  </p>

                  <div className="space-y-2">
                    <Link
                      href="/settings?tab=branding"
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
                        isDark ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <span>Company Logo & GSTIN Branding</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    <Link
                      href="/settings?tab=theme"
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
                        isDark ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Palette className="w-4 h-4 text-purple-400" />
                        <span>Theme & Accent Colors</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    <Link
                      href="/settings?tab=terminology"
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
                        isDark ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>Series & Prefixes (Bilty / Trip / Branch)</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    <Link
                      href="/settings?tab=roles"
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
                        isDark ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Roles & Permissions Matrix</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>
                </div>
              )}

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
