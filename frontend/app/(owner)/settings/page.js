// frontend/app/(owner)/settings/page.js - Updated tab navigation
'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { useStore } from '../../../store/useStore';
import { useTerminology } from '../../../hooks/useTerminology';
import { useTheme } from '../../../components/ThemeProvider';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import {
  User,
  Lock,
  Building2,
  Palette,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Image as ImageIcon,
  Check,
  Trash2,
  ExternalLink,
  Crown,
  Plus,
  Layers,
  Users,
  Warehouse,
  Truck,
  Send,
  Receipt,
  Wallet,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import RolePermissionMatrix from '../../../components/roles/RolePermissionMatrix';

const MODULE_ICONS = {
  'Bookings & Dockets': FileText,
  'Branches & Hubs': Warehouse,
  'Customers (CRM)': Users,
  'Fleet & Vehicles': Truck,
  'Dispatches & Trips': Send,
  'Deliveries & POD': CheckCircle2,
  'Invoices & Billing': Receipt,
  'Expenses & Financials': Wallet,
  'Analytics & Reports': BarChart3,
  'Settings & Administration': SettingsIcon,
};

const ACCENT_PRESETS = [
  { name: 'Cyber Cyan', value: '#00F0FF', hex: '#00F0FF', bg: 'bg-[#00F0FF]', text: 'text-cyan-400' },
  { name: 'Ocean Blue', value: '#2563EB', hex: '#2563EB', bg: 'bg-blue-600', text: 'text-blue-500' },
  { name: 'Emerald Fleet', value: '#10B981', hex: '#10B981', bg: 'bg-emerald-500', text: 'text-emerald-400' },
  { name: 'Royal Violet', value: '#8B5CF6', hex: '#8B5CF6', bg: 'bg-purple-500', text: 'text-purple-400' },
  { name: 'Sunset Amber', value: '#F59E0B', hex: '#F59E0B', bg: 'bg-amber-500', text: 'text-amber-400' },
  { name: 'Crimson Red', value: '#EF4444', hex: '#EF4444', bg: 'bg-rose-500', text: 'text-rose-400' },
];

export default function SettingsPage() {
  const { user, setUser, terminology, setTerminology } = useStore();
  const { term } = useTerminology();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'theme' | 'terminology' | 'roles' | 'profile' | 'security'
  
  // Feedback alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Roles & Permissions State
  const [rolesList, setRolesList] = useState([]);
  const [permissionsData, setPermissionsData] = useState({ raw: [], grouped: {}, definitions: [] });
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [rolePermissionsDraft, setRolePermissionsDraft] = useState({}); // { [roleId]: string[] of codes }
  const [rolesViewMode, setRolesViewMode] = useState('by_role'); // 'by_role' | 'matrix'
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSavingRolePerms, setIsSavingRolePerms] = useState(false);

  // New Custom Role Modal
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    display_name: '',
    name: '',
    description: '',
  });

  // Branding Form State
  const [brandingForm, setBrandingForm] = useState({
    businessName: '',
    tagline: '',
    logoUrl: '',
    legalName: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
  });
  const fileInputRef = useRef(null);
  const [pendingLogo, setPendingLogo] = useState(null); // { base64Data, fileName, fileSize }
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);

  // Docket Number Series State
  const [docketSeries, setDocketSeries] = useState({
    prefix: 'BAL',
    startingNumber: 1,
    sequenceLength: 6,
    nextNumber: 'BAL000001',
  });
  const [isSavingDocketSeries, setIsSavingDocketSeries] = useState(false);

  // Theme & Appearance State
  const [selectedAccent, setSelectedAccent] = useState('#00F0FF');
  const [selectedTerm, setSelectedTerm] = useState(terminology || 'Bilty');

  // Load initial data from user store & organizations profile API
  useEffect(() => {
    if (user) {
      setBrandingForm((prev) => ({
        ...prev,
        businessName: user.organizationName || user.businessName || '',
        logoUrl: user.logoUrl || '',
        tagline: user.tagline || 'Moving Businesses Across Bharat',
      }));
    }

    // Load saved accent color and query tab from URL
    if (typeof window !== 'undefined') {
      const savedColor = localStorage.getItem('transporter_accent_color');
      if (savedColor) setSelectedAccent(savedColor);

      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['branding', 'theme', 'terminology', 'roles'].includes(tabParam)) {
        setActiveTab(tabParam);
      } else if (tabParam === 'profile' || tabParam === 'security') {
        window.location.href = '/profile';
      }
    }

    // Fetch full organization profile from DB
    const fetchOrg = async () => {
      try {
        const res = await api.get('/organizations/profile');
        if (res.data?.success && res.data.data) {
          const org = res.data.data;
          setBrandingForm((prev) => ({
            ...prev,
            businessName: org.business_name || prev.businessName,
            legalName: org.legal_name || '',
            gstin: org.gstin || '',
            pan: org.pan || '',
            address: org.address || '',
            city: org.city || '',
            state: org.state || '',
            pincode: org.pincode || '',
            phone: org.phone || '',
            email: org.email || '',
            logoUrl: org.logo_url || prev.logoUrl,
            tagline: org.settings?.tagline || prev.tagline,
          }));
          if (org.document_terminology) {
            setSelectedTerm(org.document_terminology);
          }
          if (org.settings?.themeColor) {
            setSelectedAccent(org.settings.themeColor);
          }
          if (org.logo_url && user && !user.logoUrl) {
            const updated = { ...user, logoUrl: org.logo_url };
            setUser(updated);
            if (typeof window !== 'undefined') {
              localStorage.setItem('transporter_user', JSON.stringify(updated));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load organization details', err);
      }
    };

    const fetchDocketSeries = async () => {
      try {
        const res = await api.get('/organizations/docket-series');
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setDocketSeries({
            prefix: d.prefix || 'BAL',
            startingNumber: (d.currentNumber ?? 0) + 1,
            sequenceLength: d.sequenceLength || 6,
            nextNumber: d.nextNumber || 'BAL000001',
          });
        }
      } catch (e) {
        console.warn('Could not load docket series', e);
      }
    };

    fetchOrg();
    fetchDocketSeries();
  }, [user]);

  // Load Roles & Permissions when roles tab is active
  const fetchRolesAndPermissions = async () => {
    setIsLoadingRoles(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);

      const fetchedRoles = rolesRes.data?.data || [];
      const fetchedPerms = permsRes.data?.data || { raw: [], grouped: {}, definitions: [] };

      setRolesList(fetchedRoles);
      setPermissionsData(fetchedPerms);

      // Initialize draft permissions per role
      const drafts = {};
      fetchedRoles.forEach((r) => {
        drafts[r.id] = r.permissionCodes || [];
      });
      setRolePermissionsDraft(drafts);

      if (fetchedRoles.length > 0) {
        setSelectedRoleId((prev) => {
          if (prev && fetchedRoles.some((r) => r.id === prev)) return prev;
          const defRole = fetchedRoles.find((r) => r.name === 'BOOKING_OPERATOR') || fetchedRoles[0];
          return defRole.id;
        });
      }
    } catch (err) {
      console.warn('Failed to load roles and permissions:', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchRolesAndPermissions();
    }
  }, [activeTab]);

  const handleTogglePermission = (roleId, permCode) => {
    setRolePermissionsDraft((prev) => {
      const current = prev[roleId] || [];
      const exists = current.includes(permCode);
      const updated = exists ? current.filter((c) => c !== permCode) : [...current, permCode];
      return { ...prev, [roleId]: updated };
    });
  };

  const handleToggleModuleAll = (roleId, modulePermCodes, enableAll) => {
    setRolePermissionsDraft((prev) => {
      const current = prev[roleId] || [];
      let updated;
      if (enableAll) {
        const set = new Set([...current, ...modulePermCodes]);
        updated = Array.from(set);
      } else {
        updated = current.filter((c) => !modulePermCodes.includes(c));
      }
      return { ...prev, [roleId]: updated };
    });
  };

  const handleSaveRolePermissions = async (roleId) => {
    setIsSavingRolePerms(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const permsToSave = rolePermissionsDraft[roleId] || [];
      const targetRole = rolesList.find((r) => r.id === roleId);
      const res = await api.put(`/roles/${roleId}/permissions`, { permissions: permsToSave });
      
      setSuccessMsg(res.data?.message || `Permissions for ${targetRole?.display_name || 'role'} saved successfully!`);
      setRolesList((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissionCodes: permsToSave } : r))
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save permissions:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save role permissions.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsSavingRolePerms(false);
    }
  };

  const handleCreateCustomRole = async (e) => {
    e.preventDefault();
    if (!newRoleForm.display_name.trim()) return;
    setIsSavingRolePerms(true);
    try {
      const res = await api.post('/roles', {
        display_name: newRoleForm.display_name,
        name: newRoleForm.name,
        description: newRoleForm.description,
        permissions: ['booking.view', 'consignment.view'],
      });
      setIsNewRoleModalOpen(false);
      setNewRoleForm({ display_name: '', name: '', description: '' });
      setSuccessMsg(`Custom role "${res.data?.data?.display_name}" created successfully!`);
      await fetchRolesAndPermissions();
      if (res.data?.data?.id) {
        setSelectedRoleId(res.data.data.id);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to create role:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create role.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsSavingRolePerms(false);
    }
  };

  const selectedRole = rolesList.find((r) => r.id === selectedRoleId) || rolesList[0] || null;

  // Flash message helper
  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // 1. Handle Logo File Selection (Does NOT change active logo until user clicks Save)
  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      triggerError('Logo image size should be less than 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target?.result;
      if (base64Data) {
        setPendingLogo({
          base64Data,
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        });
        setIsRemovingLogo(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3b. Quick Save Logo directly from upload card
  const handleQuickSaveLogo = async () => {
    if (!pendingLogo?.base64Data) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      const newLogo = pendingLogo.base64Data;
      const res = await api.patch('/auth/profile', {
        businessName: brandingForm.businessName,
        tagline: brandingForm.tagline,
        logoUrl: newLogo,
        themeColor: selectedAccent,
      });

      if (res.data?.success) {
        setBrandingForm((prev) => ({ ...prev, logoUrl: newLogo }));
        setPendingLogo(null);
        setIsRemovingLogo(false);

        const updated = {
          ...user,
          organizationName: brandingForm.businessName,
          businessName: brandingForm.businessName,
          logoUrl: newLogo,
          tagline: brandingForm.tagline,
        };
        setUser(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('transporter_user', JSON.stringify(updated));
          localStorage.setItem('transporter_logo', newLogo);
          if (brandingForm.businessName) {
            localStorage.setItem('transporter_brand_name', brandingForm.businessName);
          }
        }
        triggerSuccess('Company logo saved and applied successfully!');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to save logo');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Handle Company Branding & Logo Save (Persists to database, localStorage and global store)
  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      const finalLogoUrl = isRemovingLogo
        ? ''
        : pendingLogo
        ? pendingLogo.base64Data
        : brandingForm.logoUrl;

      const res = await api.patch('/auth/profile', {
        businessName: brandingForm.businessName,
        tagline: brandingForm.tagline,
        logoUrl: finalLogoUrl,
        themeColor: selectedAccent,
      });

      if (res.data?.success) {
        setBrandingForm((prev) => ({ ...prev, logoUrl: finalLogoUrl }));
        setPendingLogo(null);
        setIsRemovingLogo(false);

        const updated = {
          ...user,
          organizationName: brandingForm.businessName,
          businessName: brandingForm.businessName,
          logoUrl: finalLogoUrl,
          tagline: brandingForm.tagline,
        };
        setUser(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('transporter_user', JSON.stringify(updated));
          if (finalLogoUrl) {
            localStorage.setItem('transporter_logo', finalLogoUrl);
          } else {
            localStorage.removeItem('transporter_logo');
          }
          if (brandingForm.businessName) {
            localStorage.setItem('transporter_brand_name', brandingForm.businessName);
          }
        }
        triggerSuccess('Company branding and logo saved successfully!');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to save branding');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Handle Theme Accent Color Select
  const handleSelectAccent = async (color) => {
    setSelectedAccent(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('transporter_accent_color', color);
      document.documentElement.style.setProperty('--brand-accent', color);
    }
    try {
      await api.patch('/auth/profile', { themeColor: color });
    } catch (e) {
      console.warn('Could not sync color to backend', e);
    }
    triggerSuccess(`Theme accent updated to ${color}!`);
  };

  // 6. Handle Terminology Save
  const handleSaveTerminology = async (opt) => {
    setSelectedTerm(opt);
    try {
      const res = await api.patch('/organizations/terminology', { terminology: opt });
      if (res.data?.success) {
        setTerminology(opt);
        triggerSuccess(`Document terminology set to ${opt}!`);
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to update terminology');
    }
  };

  // 7. Handle Docket Series Save
  const handleSaveDocketSeries = async (e) => {
    e.preventDefault();
    setIsSavingDocketSeries(true);
    try {
      const res = await api.patch('/organizations/docket-series', {
        prefix: docketSeries.prefix,
        startingNumber: docketSeries.startingNumber,
        sequenceLength: docketSeries.sequenceLength,
      });
      if (res.data?.success) {
        triggerSuccess(`Docket series saved! Next docket number: ${res.data.data?.nextNumber}`);
        if (res.data.data?.nextNumber) {
          setDocketSeries((prev) => ({
            ...prev,
            nextNumber: res.data.data.nextNumber,
          }));
        }
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to update docket series');
    } finally {
      setIsSavingDocketSeries(false);
    }
  };

  const terminologyOptions = ['Bilty', 'LR', 'GR', 'Docket', 'Consignment Note'];

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Company Settings & Branding
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure transport company branding, fleet themes, docket settings, number series, and staff permissions.
              </p>
            </div>
          </div>

          {/* Feedback Toasts */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Settings Tabs & Content Layout */}
          <div className="space-y-6">
            
            {/* Upperside Horizontal Navigation Tabs */}
            <div className={`p-2 rounded-2xl border flex items-center justify-between gap-3 overflow-x-auto ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-max flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('branding')}
                  className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'branding'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Company Logo & Branding</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('theme')}
                  className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'theme'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Palette className="w-4 h-4 shrink-0" />
                  <span>Theme & Brand Colors</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'roles'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Roles & Permissions</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('terminology')}
                  className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'terminology'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Docket Settings</span>
                </button>

              </div>
            </div>

            {/* Active Tab Panel Content */}
            <div className="w-full">

              {/* TAB 3: COMPANY BRANDING & LOGO */}
              {activeTab === 'branding' && (
                <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                    <h2 className="text-base font-bold">Company Logo & Fleet Identity</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload your transport company logo. It will be printed on official Bilties, consignor receipts, and invoice headers.
                    </p>
                  </div>

                  <form onSubmit={handleSaveBranding} className="space-y-6">
                    {/* Logo Upload & Preview Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Company Logo / Brand Mark
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Logo is saved and displayed on Bilties & platform only after clicking Save
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        {/* Logo Preview Box - Shows ONLY SAVED Active Logo */}
                        <div className={`w-28 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 relative overflow-hidden shrink-0 transition-all ${
                          isRemovingLogo
                            ? 'border-rose-500/50 bg-rose-500/10'
                            : isDark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-slate-50'
                        }`}>
                          {isRemovingLogo ? (
                            <div className="text-center p-2">
                              <Trash2 className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                              <span className="text-[10px] text-rose-400 font-bold block leading-tight">Removal Pending</span>
                              <span className="text-[8px] text-slate-400 block mt-0.5">Click Save to confirm</span>
                            </div>
                          ) : brandingForm.logoUrl ? (
                            <>
                              <img
                                src={brandingForm.logoUrl}
                                alt="Official Saved Logo"
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow uppercase">
                                Saved
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-2">
                              <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                              <span className="text-[10px] text-slate-400 font-semibold">No Logo Set</span>
                            </div>
                          )}
                        </div>

                        {/* Upload Controls & Pending Status */}
                        <div className="space-y-3 flex-1">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoFileSelect}
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="hidden"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
                            >
                              <Upload className="w-4 h-4" />
                              <span>{brandingForm.logoUrl ? 'Select New Logo' : 'Upload Logo'}</span>
                            </button>

                            {brandingForm.logoUrl && !isRemovingLogo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRemovingLogo(true);
                                  setPendingLogo(null);
                                }}
                                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                                  isDark ? 'border-rose-950/60 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                                }`}
                                title="Remove existing logo (click Save to confirm)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Saved Logo</span>
                              </button>
                            )}
                          </div>

                          {/* When a new logo file is selected but NOT saved yet */}
                          {pendingLogo && (
                            <div className={`p-3 rounded-2xl border ${
                              isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-300'
                            } space-y-2`}>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-xs">
                                    <img src={pendingLogo.base64Data} alt="Pending selection" className="w-full h-full object-contain" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                        {pendingLogo.fileName}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        ({pendingLogo.fileSize})
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>Selected file NOT saved yet! Click "Save Logo Now" to apply.</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={handleQuickSaveLogo}
                                    disabled={isSaving}
                                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{isSaving ? 'Saving...' : 'Save Logo Now'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingLogo(null)}
                                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                  >
                                    Discard
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* When logo removal is pending save */}
                          {isRemovingLogo && (
                            <div className="flex items-center justify-between gap-2 text-xs text-rose-500 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Logo marked for removal. Click <strong>"Save Company Branding"</strong> below to confirm.</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsRemovingLogo(false)}
                                className="text-xs font-bold underline text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              >
                                Undo
                              </button>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400">
                            Recommended: PNG, JPG, or SVG with transparent background (Max 2MB).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Live Bilty Print Preview Card */}
                    <div className={`p-4 rounded-2xl border text-xs ${
                      isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          LIVE BILTY / INVOICE HEADER PREVIEW
                        </span>
                        <span className="text-[10px] text-emerald-500 font-bold">Standard A4 Layout</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs">
                            {!isRemovingLogo && brandingForm.logoUrl ? (
                              <img src={brandingForm.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Building2 className="w-6 h-6 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                              {brandingForm.businessName || 'Your Transport Company'}
                            </div>
                            <div className="text-[10px] text-slate-500 italic">
                              "{brandingForm.tagline || 'Logistics Without Limits'}"
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                              GSTIN: {brandingForm.gstin || '27AAACB1234F1Z5'} • State: {brandingForm.state || 'Maharashtra'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-blue-600 dark:text-cyan-400">CSN-879654</span>
                          <div className="text-[9px] text-slate-400">Original Consignment Copy</div>
                        </div>
                      </div>
                    </div>

                    {/* Business Name & Tagline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Company / Business Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Balaji Logistics & Transport Co."
                          value={brandingForm.businessName}
                          onChange={(e) => setBrandingForm({ ...brandingForm, businessName: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                            isDark
                              ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                              : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Company Tagline / Slogan
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Moving Businesses Across Bharat"
                          value={brandingForm.tagline}
                          onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                            isDark
                              ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                              : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        {pendingLogo && (
                          <span className="text-xs text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                            New logo pending! Click Save to apply and update platform logo.
                          </span>
                        )}
                        {isRemovingLogo && (
                          <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
                            Logo removal pending confirmation. Click Save to apply.
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer ${
                          pendingLogo
                            ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400 shadow-emerald-600/50'
                            : isRemovingLogo
                            ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                            : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {isSaving
                            ? 'Saving...'
                            : pendingLogo
                            ? 'Save Company Branding & New Logo'
                            : isRemovingLogo
                            ? 'Save Company Branding & Remove Logo'
                            : 'Save Company Branding'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: THEME & BRAND ACCENT COLORS */}
              {activeTab === 'theme' && (
                <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                    <h2 className="text-base font-bold">Theme & Visual Experience</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Switch light and dark modes, or customize your platform's accent brand color.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Theme Mode Toggle (Dark vs Light) */}
                    <div className="space-y-2">
                      <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Display Mode
                      </label>
                      <div className="grid grid-cols-2 gap-3 max-w-md">
                        <div
                          onClick={() => { if (isDark) toggleTheme(); }}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                            !isDark
                              ? 'bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                              : 'bg-slate-900 border-slate-800 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <Sun className={`w-5 h-5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
                          <div>
                            <div className={`text-xs font-bold ${!isDark ? 'text-slate-900' : 'text-slate-300'}`}>
                              Light Theme
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Clean high-contrast daylight
                            </div>
                          </div>
                        </div>

                        <div
                          onClick={() => { if (!isDark) toggleTheme(); }}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                            isDark
                              ? 'bg-blue-950/40 border-cyan-400 shadow-md shadow-cyan-950/20 ring-2 ring-cyan-400/20'
                              : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <Moon className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <div>
                            <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>
                              Dark Theme
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Cyber-logistics night cockpit
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Brand Accent Palette */}
                    <div className="space-y-3">
                      <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Brand Accent Tone
                      </label>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ACCENT_PRESETS.map((preset) => {
                          const isSelected = selectedAccent.toLowerCase() === preset.hex.toLowerCase();
                          return (
                            <div
                              key={preset.name}
                              onClick={() => handleSelectAccent(preset.hex)}
                              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                isSelected
                                  ? isDark
                                    ? 'bg-slate-900 border-white shadow-md'
                                    : 'bg-slate-50 border-slate-900 shadow-sm'
                                  : isDark
                                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <span className={`w-4 h-4 rounded-full ${preset.bg} shadow-xs shrink-0`} />
                                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {preset.name}
                                </span>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-500" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Custom Hex Picker */}
                      <div className="flex items-center space-x-3 pt-2">
                        <label className="text-xs font-semibold text-slate-400">
                          Custom Palette Tone:
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={selectedAccent}
                            onChange={(e) => handleSelectAccent(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                          />
                          <span className="font-mono text-xs font-bold uppercase">{selectedAccent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DOCKET SETTINGS */}
              {activeTab === 'terminology' && (
                <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                    <h2 className="text-base font-bold">Docket Settings & Document Terminology</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure document naming (Bilty, LR, GR, Consignment Note) and customize your auto-generated docket number series.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {terminologyOptions.map((opt) => {
                      const isSelected = selectedTerm === opt;
                      return (
                        <div
                          key={opt}
                          onClick={() => handleSaveTerminology(opt)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? isDark
                                ? 'bg-blue-950/40 border-cyan-400 shadow-md shadow-cyan-950/20'
                                : 'bg-blue-50/80 border-blue-500 shadow-sm'
                              : isDark
                              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{opt}</div>
                            <span className="text-[10px] text-slate-400">
                              {opt === 'Bilty' ? 'Hindi Belt (North & Central)' : opt === 'LR' ? 'Lorry Receipt (Pan-India)' : opt === 'GR' ? 'Goods Receipt (West)' : 'Standard Format'}
                            </span>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                    isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div className="font-bold text-slate-700 dark:text-slate-200">Current Application Impact:</div>
                    <p>
                      Buttons will read <span className="font-bold text-blue-600 dark:text-cyan-400">"New {selectedTerm}"</span>, tables will show <span className="font-bold text-blue-600 dark:text-cyan-400">"{selectedTerm} Number"</span>, and printed delivery dockets will bear <span className="font-bold text-blue-600 dark:text-cyan-400">"{selectedTerm.toUpperCase()}"</span>.
                    </p>
                  </div>

                  {/* DOCKET / BILTY AUTO-NUMBER SERIES CONFIGURATION */}
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                    <div className="pb-3 mb-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>Auto-Generated {selectedTerm} / Docket Number Series</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure how new dockets and consignment numbers are auto-generated. Default is 3-letter company code followed by a sequential number (minimum 6 digits).
                      </p>
                    </div>

                    <form onSubmit={handleSaveDocketSeries} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Prefix */}
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Series Prefix (e.g. BAL, DWB) *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={8}
                            value={docketSeries.prefix}
                            onChange={(e) => setDocketSeries({ ...docketSeries, prefix: e.target.value.toUpperCase() })}
                            placeholder="e.g. BAL, DWB"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none transition-colors ${
                              isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">3-character code (e.g. BAL for Balaji Logistics or DWB)</span>
                        </div>

                        {/* Starting / Next Number */}
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Starting / Next Number *
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={docketSeries.startingNumber}
                            onChange={(e) => setDocketSeries({ ...docketSeries, startingNumber: parseInt(e.target.value, 10) || 1 })}
                            placeholder="1"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                              isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">First docket starts at this number (e.g. 1)</span>
                        </div>

                        {/* Sequence Length / Digits */}
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Minimum Digits Padding *
                          </label>
                          <input
                            type="number"
                            required
                            min={6}
                            max={10}
                            value={docketSeries.sequenceLength}
                            onChange={(e) => setDocketSeries({ ...docketSeries, sequenceLength: parseInt(e.target.value, 10) || 6 })}
                            placeholder="6"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                              isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">6 digits produces 000001, 000002...</span>
                        </div>
                      </div>

                      {/* Live Output Preview Card */}
                      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDark ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            LIVE NEXT DOCKET NUMBER PREVIEW
                          </span>
                          <div className="font-mono text-xl font-black text-blue-600 dark:text-cyan-400 mt-0.5">
                            {docketSeries.prefix || 'BAL'}{String(docketSeries.startingNumber || 1).padStart(docketSeries.sequenceLength || 6, '0')}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Next consignment will be assigned this number automatically. Subsequent dockets increment by 1.
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingDocketSeries}
                          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSavingDocketSeries ? 'Saving...' : 'Save Series Format'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 6: ROLES & PAGE PERMISSIONS */}
              {activeTab === 'roles' && (
                <div className={`p-5 sm:p-7 rounded-3xl border shadow-xl ${
                  isDark
                    ? 'border-slate-800/90 bg-[#070b16] text-white shadow-2xl'
                    : 'border-slate-200 bg-white text-slate-900 shadow-sm'
                }`}>
                  <RolePermissionMatrix />
                </div>
              )}

            </div>

          </div>

          {/* CREATE CUSTOM ROLE MODAL */}
          {isNewRoleModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsNewRoleModalOpen(false)} />
              <div className={`relative w-full max-w-md rounded-3xl shadow-2xl border p-6 z-10 space-y-4 ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                    <h3 className="text-base font-bold">Create Custom Role</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewRoleModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateCustomRole} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Role Display Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operations Supervisor, Auditor, Store Incharge"
                      value={newRoleForm.display_name}
                      onChange={(e) => setNewRoleForm({ ...newRoleForm, display_name: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Role Description</label>
                    <textarea
                      rows={2}
                      placeholder="Brief summary of duties and responsibilities for this role..."
                      value={newRoleForm.description}
                      onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsNewRoleModalOpen(false)}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold ${
                        isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRolePerms}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 disabled:opacity-50"
                    >
                      {isSavingRolePerms ? 'Creating...' : 'Create Role'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
