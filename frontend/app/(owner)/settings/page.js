// frontend/app/(owner)/settings/page.js - Updated tab navigation
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../../../services/api';
import { useStore } from '../../../store/useStore';
import { useTerminology } from '../../../hooks/useTerminology';
import { useTheme } from '../../../components/ThemeProvider';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { usePermissions } from '../../../hooks/usePermissions';
import Modal from '../../../components/ui/Modal';
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
  ArrowRight,
  Radio,
  MapPin,
  Activity,
  Cpu,
  Zap,
  X,
  Key,
  Signal,
  Navigation,
  Clock,
  Power,
  Search,
  Landmark,
  CreditCard,
  BadgePercent,
  QrCode,
  Hash,
  Printer,
  Download,
  Copy,
  Smartphone,
  Compass,
  Boxes,
  Route,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import RolePermissionMatrix from '../../../components/roles/RolePermissionMatrix';
import paymentService from '../../../services/paymentService';
import { useLiveLocation } from '../../../hooks/useLiveLocation';
import { useToast } from '../../../components/ui/AlertModalProvider';

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

const GPS_PROVIDER_TEMPLATES = [
  {
    code: 'WHEELSEYE',
    name: 'WheelsEye Fleet GPS',
    description: 'Premier telematics provider for Indian commercial transport fleets. Live vehicle tracking, speed, ignition, and fuel monitoring.',
    defaultBaseUrl: 'https://api.wheelseye.com/currentLoc',
    keyPlaceholder: 'Enter WheelsEye Access Token / API Key',
    popular: true,
    badge: 'Popular for Indian Transporters',
    color: 'from-amber-500 to-orange-600',
    accentText: 'text-amber-500',
    borderActive: 'border-amber-500/40 bg-amber-500/5',
  },
  {
    code: 'LOCONAV',
    name: 'LocoNav Telematics',
    description: 'AI-driven IoT platform for fleet management, video telematics, and vehicle tracking across India & SEA.',
    defaultBaseUrl: 'https://api.loconav.com/v1',
    keyPlaceholder: 'Enter LocoNav Access Token',
    popular: false,
    color: 'from-blue-600 to-indigo-700',
    accentText: 'text-blue-500',
    borderActive: 'border-blue-500/40 bg-blue-500/5',
  },
  {
    code: 'INTANGLES',
    name: 'Intangles Digital Twin',
    description: 'Edge-to-cloud vehicle health, AI predictive maintenance, and precise fuel pilferage tracking.',
    defaultBaseUrl: 'https://api.intangles.com/v2',
    keyPlaceholder: 'Enter Intangles Auth Key',
    popular: false,
    color: 'from-emerald-500 to-teal-700',
    accentText: 'text-emerald-500',
    borderActive: 'border-emerald-500/40 bg-emerald-500/5',
  },
  {
    code: 'FLEETX',
    name: 'Fleetx IoT & GPS',
    description: 'Enterprise fleet & asset management, cold storage sensor tracking, and line-haul trip automation.',
    defaultBaseUrl: 'https://api.fleetx.io/api/v1',
    keyPlaceholder: 'Enter Fleetx API Token',
    popular: false,
    color: 'from-purple-600 to-violet-800',
    accentText: 'text-purple-400',
    borderActive: 'border-purple-500/40 bg-purple-500/5',
  },
  {
    code: 'MAPMYINDIA',
    name: 'MapmyIndia / Mappls GPS',
    description: 'Indigenous Indian GIS map platform offering high-accuracy vehicle tracking & geofencing APIs.',
    defaultBaseUrl: 'https://apis.mapmyindia.com/advancedmaps/v1',
    keyPlaceholder: 'Enter MapmyIndia REST Key',
    popular: false,
    color: 'from-rose-500 to-red-700',
    accentText: 'text-rose-500',
    borderActive: 'border-rose-500/40 bg-rose-500/5',
  },
  {
    code: 'CUSTOM_API',
    name: 'Custom REST GPS Endpoint',
    description: 'Connect any proprietary GPS server, broker integration, or third-party vehicle tracking API.',
    defaultBaseUrl: 'https://api.your-gps-provider.com/v1',
    keyPlaceholder: 'Enter Custom Bearer or API Key',
    popular: false,
    color: 'from-slate-600 to-slate-800',
    accentText: 'text-slate-400',
    borderActive: 'border-slate-500/40 bg-slate-500/5',
  },
];

/**
 * Masks an API Key or Access Token for display security, keeping only the last 4-6 characters visible
 * and masking preceding characters with 'X' (e.g. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXa28d81 or XXXXXXXXXXXX182312).
 */
export const maskApiKey = (key) => {
  if (!key) return '';
  const str = String(key).trim();
  if (str.length <= 6) return 'XXXX' + str.slice(-2);
  
  // If standard UUID format (8-4-4-4-12)
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str)) {
    return `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXX${str.slice(-6)}`;
  }
  
  // Generic format: mask with X and keep last 6 characters
  const visibleChars = Math.min(6, Math.max(4, str.length > 10 ? 6 : 4));
  const maskedLength = Math.max(12, str.length - visibleChars);
  return 'X'.repeat(maskedLength) + str.slice(-visibleChars);
};

/**
 * Reactive cell that displays the exact real-time address of a vehicle using free reverse geocoding API.
 */
function VehicleLiveLocationCell({ latitude, longitude, lastLocationName, heading }) {
  const { location, isExact, source, isLoading } = useLiveLocation(latitude, longitude, lastLocationName);
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  const hasCoords = !isNaN(latNum) && !isNaN(lngNum) && !(latNum === 0 && lngNum === 0);

  if (!hasCoords) {
    return <span className="text-[11px] text-slate-400 italic">No GPS coordinates</span>;
  }

  return (
    <div className="flex items-start gap-1.5">
      <span className="p-1 mt-0.5 rounded-md bg-rose-500/10 text-rose-500 dark:text-rose-400 shrink-0">
        <MapPin className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {/* Exact Live Location Name */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span 
            className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[210px]"
            title={`${location} • Source: ${source}`}
          >
            {location}
          </span>
          {isExact && (
            <span 
              title={`Exact Live Location via ${source}`}
              className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0"
            >
              Exact GPS
            </span>
          )}
          {isLoading && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" title="Resolving exact address..." />
          )}
        </div>
        {/* Numeric Lat/Long Coordinates and Heading Angle */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
          <span className="font-semibold text-slate-700 dark:text-cyan-300">
            {latNum.toFixed(5)}, {lngNum.toFixed(5)}
          </span>
          {heading ? (
            <span className="text-slate-400 dark:text-slate-500">
              • {Math.round(heading)}°
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, setUser, terminology, setTerminology, setTransporterType } = useStore();
  const { term } = useTerminology();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin, canManageSettings, canManageRoles } = usePermissions();

  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'operations' | 'theme' | 'terminology' | 'roles' | 'profile' | 'security'
  
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Operations Mode State (FTL, PTL, BOTH)
  const [selectedTransporterType, setSelectedTransporterType] = useState('BOTH');
  const [isSavingTransporterType, setIsSavingTransporterType] = useState(false);

  // Tabs scroll & navigation management
  const tabsContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tabsContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
    }
    window.addEventListener('resize', checkScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const handleScrollTabs = (direction) => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -240 : 240,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 320);
    }
  };

  const handleTabClick = (tabId, e) => {
    setActiveTab(tabId);
    if (e?.currentTarget) {
      e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  useEffect(() => {
    if (user?.transporterType) {
      setSelectedTransporterType(user.transporterType);
    }
  }, [user?.transporterType]);

  const handleSaveTransporterType = async (typeToSave) => {
    const targetType = typeToSave || selectedTransporterType;
    setIsSavingTransporterType(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.patch('/organizations/profile', {
        transporterType: targetType,
      });
      if (res.data?.success) {
        setSelectedTransporterType(targetType);
        if (setTransporterType) setTransporterType(targetType);
        try {
          const stored = localStorage.getItem('transporter_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.transporterType = targetType;
            localStorage.setItem('transporter_user', JSON.stringify(parsed));
          }
        } catch (e) {}

        const label = targetType === 'FTL' ? 'Full Truckload (FTL)' : targetType === 'PTL' ? 'Part Truckload (PTL)' : 'Hybrid (FTL + PTL)';
        triggerSuccess(`Operations Mode updated to ${label}! Navigation and workflows have updated automatically.`);
      } else {
        triggerError(res.data?.message || 'Failed to update operations mode.');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to update operations mode.');
    } finally {
      setIsSavingTransporterType(false);
    }
  };

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

  // Bank & GST Tax Details Form State (Configurable by Admin for Customer Invoices)
  const [bankGstForm, setBankGstForm] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    bankBranch: '',
    accountHolderName: '',
    upiId: '',
    gstin: '',
    pan: '',
    sacCode: '9965',
    legalName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
  });
  const [isSavingBankGst, setIsSavingBankGst] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [isSavingGst, setIsSavingGst] = useState(false);

  // Dynamic Registered Tenant Identifiers for generic placeholders and fallbacks
  const tenantOrgName = brandingForm.businessName || user?.organizationName || user?.businessName || '';
  const tenantHandle = (tenantOrgName || 'transport').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'transporter';
  const tenantSuggestedPrefix = (tenantOrgName ? tenantOrgName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() : 'TRP') || 'TRP';
  const tenantSuggestedInitial = (tenantOrgName ? tenantOrgName.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() : 'T') || 'T';

  // UPI QR Scanner Preview & Standee State
  const [upiQrPreview, setUpiQrPreview] = useState(null);
  const [upiPreviewAmount, setUpiPreviewAmount] = useState('');
  const [isGeneratingUpiQr, setIsGeneratingUpiQr] = useState(false);
  const [copiedUpiVpa, setCopiedUpiVpa] = useState(false);
  const [copiedUpiIntent, setCopiedUpiIntent] = useState(false);
  const [showStandeePrintModal, setShowStandeePrintModal] = useState(false);
  const [isSimulatingUpiTest, setIsSimulatingUpiTest] = useState(false);
  const [upiTestResult, setUpiTestResult] = useState(null);

  // Docket Number Series State
  const [docketSeries, setDocketSeries] = useState({
    prefix: 'BAL',
    startingNumber: 1,
    sequenceLength: 6,
    nextNumber: 'BAL000001',
  });
  const [isSavingDocketSeries, setIsSavingDocketSeries] = useState(false);

  // Trip Number Series State
  const [tripSeries, setTripSeries] = useState({
    prefix: 'TRP',
    startingNumber: 1,
    sequenceLength: 3,
    nextNumber: `TRP-${new Date().getFullYear()}-001`,
  });
  const [isSavingTripSeries, setIsSavingTripSeries] = useState(false);

  // Company Branch Code Prefix State
  const [branchPrefix, setBranchPrefix] = useState('B');
  const [isSavingBranchPrefix, setIsSavingBranchPrefix] = useState(false);

  // Theme & Appearance State
  const [selectedAccent, setSelectedAccent] = useState('#00F0FF');
  const [selectedTerm, setSelectedTerm] = useState(terminology || 'Bilty');

  // GPS & API Integrations State
  const [gpsConfigs, setGpsConfigs] = useState([]);
  const [gpsStats, setGpsStats] = useState({ totalFleetVehicles: 0, vehiclesWithGps: 0, activeProviders: 0 });
  const [gpsTelemetryList, setGpsTelemetryList] = useState([]);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [editingGpsId, setEditingGpsId] = useState(null);
  const [isTestingGps, setIsTestingGps] = useState(false);
  const [isSyncingGps, setIsSyncingGps] = useState(false);
  const [gpsTestResult, setGpsTestResult] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [gpsSearchTerm, setGpsSearchTerm] = useState('');
  const [gpsFilterStatus, setGpsFilterStatus] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'OFFLINE'
  const [gpsTelemetryPage, setGpsTelemetryPage] = useState(1);
  const [gpsTelemetryPageSize, setGpsTelemetryPageSize] = useState(10);

  const [gpsForm, setGpsForm] = useState({
    provider_code: 'WHEELSEYE',
    provider_name: 'WheelsEye Fleet GPS',
    api_key: '',
    api_secret: '',
    client_id: '',
    base_url: 'https://api.wheelseye.com/currentLoc',
    sync_interval_mins: 5,
    is_active: true,
    saved_key_preview: '',
  });

  const [quickWheelsEyeToken, setQuickWheelsEyeToken] = useState('');

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
      if (tabParam && ['branding', 'bank_gst', 'theme', 'terminology', 'roles', 'gps'].includes(tabParam)) {
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
          setBankGstForm({
            bankName: org.settings?.bankName || '',
            accountNumber: org.settings?.accountNumber || '',
            ifscCode: org.settings?.ifscCode || '',
            bankBranch: org.settings?.bankBranch || '',
            accountHolderName: org.settings?.accountHolderName || '',
            upiId: org.settings?.upiId || '',
            gstin: org.gstin || org.settings?.gstin || '',
            pan: org.pan || org.settings?.pan || '',
            sacCode: org.settings?.sacCode || '9965',
            legalName: org.legal_name || org.settings?.legalName || '',
            address: org.address || org.settings?.address || '',
            city: org.city || org.settings?.city || '',
            state: org.state || org.settings?.state || '',
            pincode: org.pincode || org.settings?.pincode || '',
            phone: org.phone || org.settings?.phone || '',
            email: org.email || org.settings?.email || '',
          });
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

    const fetchTripSeries = async () => {
      try {
        const res = await api.get('/organizations/trip-series');
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setTripSeries({
            prefix: d.prefix || 'TRP',
            startingNumber: (d.currentNumber ?? 0) + 1,
            sequenceLength: d.sequenceLength || 3,
            nextNumber: d.nextNumber || `TRP-${new Date().getFullYear()}-001`,
          });
        }
      } catch (e) {
        console.warn('Could not load trip series', e);
      }
    };

    const fetchBranchSeries = async () => {
      try {
        const res = await api.get('/organizations/branch-series');
        if (res.data?.success && res.data.data?.prefix) {
          setBranchPrefix(res.data.data.prefix);
        }
      } catch (e) {
        console.warn('Could not load branch series', e);
      }
    };

    fetchOrg();
    fetchDocketSeries();
    fetchTripSeries();
    fetchBranchSeries();
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
          const defRole = fetchedRoles.find((r) => r.name === 'ADMIN') || fetchedRoles[0];
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
      
      triggerSuccess(res.data?.message || `Permissions for ${targetRole?.display_name || 'role'} saved successfully!`);
      setRolesList((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissionCodes: permsToSave } : r))
      );
    } catch (err) {
      console.error('Failed to save permissions:', err);
      triggerError(err.response?.data?.message || 'Failed to save role permissions.');
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
      triggerSuccess(`Custom role "${res.data?.data?.display_name}" created successfully!`);
      await fetchRolesAndPermissions();
      if (res.data?.data?.id) {
        setSelectedRoleId(res.data.data.id);
      }
    } catch (err) {
      console.error('Failed to create role:', err);
      triggerError(err.response?.data?.message || 'Failed to create role.');
    } finally {
      setIsSavingRolePerms(false);
    }
  };

  const selectedRole = rolesList.find((r) => r.id === selectedRoleId) || rolesList[0] || null;

  // Flash message helper using top-corner floating toasts with progress bar & pause-on-hover
  const triggerSuccess = (msg, title = 'Operation Successful') => {
    showToast({
      type: 'success',
      title,
      message: msg,
    });
  };

  const triggerError = (msg, title = 'Action Required') => {
    showToast({
      type: 'error',
      title,
      message: msg,
    });
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

  // 4b-1. Handle Bank Remittance Details Save Only
  const handleSaveBankDetails = async (e) => {
    if (e) e.preventDefault();
    if (!bankGstForm.bankName?.trim()) {
      triggerError('Please enter Bank Name');
      return;
    }
    if (!bankGstForm.accountNumber?.trim()) {
      triggerError('Please enter Bank Account Number');
      return;
    }
    if (!bankGstForm.ifscCode?.trim()) {
      triggerError('Please enter Bank IFSC Code');
      return;
    }
    setIsSavingBank(true);
    setErrorMsg('');
    try {
      const payload = {
        bankName: (bankGstForm.bankName || '').trim(),
        accountNumber: (bankGstForm.accountNumber || '').trim(),
        ifscCode: (bankGstForm.ifscCode || '').trim().toUpperCase(),
        bankBranch: (bankGstForm.bankBranch || '').trim(),
        accountHolderName: (bankGstForm.accountHolderName || '').trim(),
      };

      const res = await api.patch('/organizations/profile', payload);
      if (res.data?.success) {
        triggerSuccess('Bank remittance details saved successfully! All customer tax invoices will now reflect this account.');
      } else {
        triggerError(res.data?.message || 'Failed to save bank details');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to save bank details');
    } finally {
      setIsSavingBank(false);
    }
  };

  // 4b-2. Handle Direct UPI Configuration Save Only
  const handleSaveUpiDetails = async (e) => {
    if (e) e.preventDefault();
    if (!bankGstForm.upiId?.trim()) {
      triggerError('Please enter Company UPI VPA / Handle');
      return;
    }
    setIsSavingUpi(true);
    setErrorMsg('');
    try {
      const payload = {
        upiId: (bankGstForm.upiId || '').trim(),
        accountHolderName: (bankGstForm.accountHolderName || '').trim(),
      };

      const res = await api.patch('/organizations/profile', payload);
      if (res.data?.success) {
        triggerSuccess('Direct UPI settlement details saved successfully! Counter QR & standee updated.');
        refreshUpiPreviewQr(payload.upiId, payload.accountHolderName);
      } else {
        triggerError(res.data?.message || 'Failed to save UPI details');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to save UPI details');
    } finally {
      setIsSavingUpi(false);
    }
  };

  // 4b-3. Handle GST & Regulatory Tax Registration Save Only
  const handleSaveGstDetails = async (e) => {
    if (e) e.preventDefault();
    setIsSavingGst(true);
    setErrorMsg('');
    try {
      const payload = {
        gstin: (bankGstForm.gstin || '').trim().toUpperCase(),
        pan: (bankGstForm.pan || '').trim().toUpperCase(),
        sacCode: (bankGstForm.sacCode || '').trim() || '9965',
        legalName: (bankGstForm.legalName || '').trim(),
        address: (bankGstForm.address || '').trim(),
        city: (bankGstForm.city || '').trim(),
        state: (bankGstForm.state || '').trim(),
        pincode: (bankGstForm.pincode || '').trim(),
        phone: (bankGstForm.phone || '').trim(),
        email: (bankGstForm.email || '').trim(),
      };

      const res = await api.patch('/organizations/profile', payload);
      if (res.data?.success) {
        setBrandingForm((prev) => ({
          ...prev,
          legalName: payload.legalName || prev.legalName,
          gstin: payload.gstin || prev.gstin,
          pan: payload.pan || prev.pan,
          address: payload.address || prev.address,
          city: payload.city || prev.city,
          state: payload.state || prev.state,
          pincode: payload.pincode || prev.pincode,
          phone: payload.phone || prev.phone,
          email: payload.email || prev.email,
        }));
        triggerSuccess('GST & Regulatory Tax credentials saved successfully! Tax invoices updated.');
      } else {
        triggerError(res.data?.message || 'Failed to save GST details');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to save GST details');
    } finally {
      setIsSavingGst(false);
    }
  };

  // 4b-4. Handle All Bank, UPI & GST Details Save
  const handleSaveBankGst = async (e) => {
    if (e) e.preventDefault();
    setIsSavingBankGst(true);
    setErrorMsg('');
    try {
      const payload = {
        ...bankGstForm,
        gstin: (bankGstForm.gstin || '').trim().toUpperCase(),
        pan: (bankGstForm.pan || '').trim().toUpperCase(),
        ifscCode: (bankGstForm.ifscCode || '').trim().toUpperCase(),
        sacCode: (bankGstForm.sacCode || '').trim() || '9965',
      };

      const res = await api.patch('/organizations/profile', payload);
      if (res.data?.success) {
        setBrandingForm((prev) => ({
          ...prev,
          legalName: payload.legalName || prev.legalName,
          gstin: payload.gstin || prev.gstin,
          pan: payload.pan || prev.pan,
          address: payload.address || prev.address,
          city: payload.city || prev.city,
          state: payload.state || prev.state,
          pincode: payload.pincode || prev.pincode,
          phone: payload.phone || prev.phone,
          email: payload.email || prev.email,
        }));
        triggerSuccess('All bank remittance details & GST credentials saved successfully!');
      } else {
        triggerError(res.data?.message || 'Failed to save bank & GST details');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to save bank & GST details');
    } finally {
      setIsSavingBankGst(false);
    }
  };

  // 4c. Generate & Refresh UPI QR Scanner for Bank Settings
  const refreshUpiPreviewQr = useCallback(async (vpaVal, nameVal, amtVal) => {
    const currentTenant = brandingForm.businessName || user?.organizationName || user?.businessName || 'Transport Co.';
    const currentHandle = currentTenant.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'company';
    const vpa = (vpaVal !== undefined ? vpaVal : bankGstForm.upiId) || `${currentHandle}@upi`;
    const payee = (nameVal !== undefined ? nameVal : (bankGstForm.accountHolderName || currentTenant)) || currentTenant;
    const amt = amtVal !== undefined ? amtVal : (parseFloat(upiPreviewAmount) || 0);

    const numAmount = amt > 0 ? amt : 0;
    let fallbackIntent = `upi://pay?pa=${encodeURIComponent(vpa.trim())}&pn=${encodeURIComponent(payee.trim())}`;
    if (numAmount > 0) fallbackIntent += `&am=${numAmount.toFixed(2)}`;
    fallbackIntent += `&cu=INR&tn=${encodeURIComponent('Freight Payment')}`;
    const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallbackIntent)}&margin=8`;

    setIsGeneratingUpiQr(true);
    try {
      const res = await paymentService.generateUpiQr({
        entity_type: 'SETTINGS_PREVIEW',
        entity_id: 'BANK_CONFIG',
        amount: amt,
        vpa: vpa.trim(),
        payee_name: payee.trim(),
        reference_no: 'BANKCONFIG',
        remarks: 'Direct Bank Settlement',
      });
      if (res?.success && res.data?.qr_data_url) {
        setUpiQrPreview(res.data);
      } else {
        setUpiQrPreview({
          qr_data_url: fallbackQr,
          upi_intent: fallbackIntent,
          vpa: vpa.trim(),
          payee_name: payee.trim(),
          amount: numAmount,
        });
      }
    } catch (err) {
      setUpiQrPreview({
        qr_data_url: fallbackQr,
        upi_intent: fallbackIntent,
        vpa: vpa.trim(),
        payee_name: payee.trim(),
        amount: numAmount,
      });
    } finally {
      setIsGeneratingUpiQr(false);
    }
  }, [bankGstForm.upiId, bankGstForm.accountHolderName, brandingForm.businessName, upiPreviewAmount]);

  useEffect(() => {
    if (activeTab === 'bank_gst' || activeTab === 'company') {
      const timer = setTimeout(() => {
        refreshUpiPreviewQr();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, bankGstForm.upiId, bankGstForm.accountHolderName, upiPreviewAmount, refreshUpiPreviewQr]);

  const handleCopyUpiVpa = () => {
    const vpa = upiQrPreview?.vpa || bankGstForm.upiId || `${tenantHandle}@upi`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(vpa);
      setCopiedUpiVpa(true);
      setTimeout(() => setCopiedUpiVpa(false), 2000);
    }
  };

  const handleCopyUpiIntent = () => {
    const intent = upiQrPreview?.upi_intent;
    if (intent && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(intent);
      setCopiedUpiIntent(true);
      setTimeout(() => setCopiedUpiIntent(false), 2000);
    }
  };

  const getLiveUpiQrSrc = useCallback(() => {
    if (upiQrPreview?.qr_data_url) return upiQrPreview.qr_data_url;
    const currentTenant = brandingForm.businessName || user?.organizationName || user?.businessName || 'Transport Co.';
    const currentHandle = currentTenant.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'company';
    const vpa = (bankGstForm.upiId || `${currentHandle}@upi`).trim();
    const payee = (bankGstForm.accountHolderName || currentTenant).trim();
    const amt = parseFloat(upiPreviewAmount) || 0;
    let intent = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}`;
    if (amt > 0) intent += `&am=${amt.toFixed(2)}`;
    intent += `&cu=INR&tn=${encodeURIComponent('Freight Payment')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(intent)}&margin=8`;
  }, [upiQrPreview?.qr_data_url, bankGstForm.upiId, bankGstForm.accountHolderName, brandingForm.businessName, user?.organizationName, user?.businessName, upiPreviewAmount]);

  const handleDownloadUpiQr = () => {
    const qrUrl = getLiveUpiQrSrc();
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${(bankGstForm.upiId || 'transporter_upi').replace(/[^a-zA-Z0-9]/g, '_')}_standee_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerSuccess('UPI QR Code downloaded as high-resolution PNG!');
  };

  const handleSimulateTestPayment = async () => {
    setIsSimulatingUpiTest(true);
    setUpiTestResult(null);
    try {
      const testUtr = `UPI/${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
      setTimeout(() => {
        setUpiTestResult({
          success: true,
          utr: testUtr,
          message: `Direct UPI payment of ₹${upiPreviewAmount || '100'} verified successfully to ${bankGstForm.bankName || 'HDFC Bank'}!`,
        });
        setIsSimulatingUpiTest(false);
        setTimeout(() => setUpiTestResult(null), 6000);
      }, 900);
    } catch (err) {
      setUpiTestResult({ success: false, message: err.message || 'Payment simulation failed' });
      setIsSimulatingUpiTest(false);
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
        if (user) {
          const updatedUser = { ...user, documentTerminology: opt, document_terminology: opt };
          setUser(updatedUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('transporter_user', JSON.stringify(updatedUser));
            localStorage.setItem('transporter_terminology', opt);
          }
        }
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

  // 8. Handle Trip Series Save
  const handleSaveTripSeries = async (e) => {
    e.preventDefault();
    setIsSavingTripSeries(true);
    try {
      const res = await api.patch('/organizations/trip-series', {
        prefix: tripSeries.prefix,
        startingNumber: tripSeries.startingNumber,
        sequenceLength: tripSeries.sequenceLength,
      });
      if (res.data?.success) {
        triggerSuccess(`Trip series saved! Next trip number: ${res.data.data?.nextNumber}`);
        if (res.data.data?.nextNumber) {
          setTripSeries((prev) => ({
            ...prev,
            nextNumber: res.data.data.nextNumber,
          }));
        }
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to update trip series');
    } finally {
      setIsSavingTripSeries(false);
    }
  };

  // 9. Handle Company Branch Code Prefix Save
  const handleSaveBranchPrefix = async (e) => {
    e.preventDefault();
    setIsSavingBranchPrefix(true);
    try {
      const res = await api.patch('/organizations/branch-series', {
        prefix: branchPrefix,
      });
      if (res.data?.success) {
        triggerSuccess(`Company branch code prefix saved! Prefix: ${res.data.data?.prefix}`);
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to update branch prefix');
    } finally {
      setIsSavingBranchPrefix(false);
    }
  };

  // 10. Fetch GPS configs and fleet telemetry
  const fetchGpsData = async () => {
    setIsLoadingGps(true);
    try {
      const [configsRes, telemetryRes] = await Promise.all([
        api.get('/gps/configs'),
        api.get('/gps/telemetry'),
      ]);
      if (configsRes.data?.success) {
        setGpsConfigs(configsRes.data.data.configs || []);
        if (configsRes.data.data.stats) {
          setGpsStats(configsRes.data.data.stats);
        }
      }
      if (telemetryRes.data?.success) {
        setGpsTelemetryList(telemetryRes.data.data || []);
      }
    } catch (err) {
      console.warn('Failed to load GPS integrations:', err);
    } finally {
      setIsLoadingGps(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gps') {
      fetchGpsData();
      const interval = setInterval(fetchGpsData, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleQuickConnectWheelsEye = async (tokenOverride = null) => {
    const token = (tokenOverride || quickWheelsEyeToken || '').trim();
    if (!token) {
      triggerError('Please enter WheelsEye Access Token to connect');
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.post('/gps/configs', {
        provider_code: 'WHEELSEYE',
        provider_name: 'WheelsEye Fleet GPS',
        api_key: token,
        base_url: 'https://api.wheelseye.com/currentLoc',
        sync_interval_mins: 5,
        is_active: true,
      });
      if (res.data?.success) {
        const syncedCount = res.data.data?.syncResult?.syncedCount ?? (gpsStats.totalFleetVehicles || 0);
        triggerSuccess(`WheelsEye Connected! Successfully synced ${syncedCount} active GPS vehicles.`);
        setQuickWheelsEyeToken(''); // Clear input after successful save
        await fetchGpsData();
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to connect WheelsEye API');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenGpsModal = (providerCode = 'WHEELSEYE', existing = null) => {
    setGpsTestResult(null);
    setShowApiKey(false);
    const existingCfg = existing || gpsConfigs.find((c) => c.provider_code === providerCode);
    if (existingCfg) {
      setEditingGpsId(existingCfg.id);
      setGpsForm({
        provider_code: existingCfg.provider_code,
        provider_name: existingCfg.provider_name,
        api_key: '', // Keep blank so user can choose to leave it unchanged or enter a new key
        api_secret: existingCfg.api_secret || '',
        client_id: existingCfg.client_id || '',
        base_url: existingCfg.base_url || '',
        sync_interval_mins: existingCfg.sync_interval_mins || 5,
        is_active: existingCfg.is_active ?? true,
        saved_key_preview: existingCfg.api_key || '',
      });
    } else {
      setEditingGpsId(null);
      const template = GPS_PROVIDER_TEMPLATES.find((t) => t.code === providerCode) || GPS_PROVIDER_TEMPLATES[0];
      setGpsForm({
        provider_code: template.code,
        provider_name: template.name,
        api_key: '',
        api_secret: '',
        client_id: '',
        base_url: template.defaultBaseUrl,
        sync_interval_mins: 5,
        is_active: true,
        saved_key_preview: '',
      });
    }
    setIsGpsModalOpen(true);
  };

  const handleSelectGpsProvider = (code) => {
    const existingCfg = gpsConfigs.find((c) => c.provider_code === code);
    if (existingCfg) {
      setEditingGpsId(existingCfg.id);
      setGpsForm({
        provider_code: existingCfg.provider_code,
        provider_name: existingCfg.provider_name,
        api_key: '',
        api_secret: existingCfg.api_secret || '',
        client_id: existingCfg.client_id || '',
        base_url: existingCfg.base_url || '',
        sync_interval_mins: existingCfg.sync_interval_mins || 5,
        is_active: existingCfg.is_active ?? true,
        saved_key_preview: existingCfg.api_key || '',
      });
    } else {
      setEditingGpsId(null);
      const template = GPS_PROVIDER_TEMPLATES.find((t) => t.code === code);
      if (template) {
        setGpsForm((prev) => ({
          ...prev,
          provider_code: template.code,
          provider_name: template.name,
          api_key: '',
          api_secret: '',
          client_id: '',
          base_url: template.defaultBaseUrl,
          sync_interval_mins: 5,
          is_active: true,
          saved_key_preview: '',
        }));
      }
    }
  };

  const handleTestGpsConnection = async () => {
    const keyToTest = gpsForm.api_key?.trim() || gpsForm.saved_key_preview;
    if (!keyToTest) {
      setGpsTestResult({ success: false, message: 'Please enter an API Key / Access Token to test connection.' });
      return;
    }
    setIsTestingGps(true);
    setGpsTestResult(null);
    try {
      const res = await api.post('/gps/test-connection', {
        provider_code: gpsForm.provider_code,
        api_key: keyToTest,
        api_secret: gpsForm.api_secret?.trim() || null,
        base_url: gpsForm.base_url?.trim() || null,
      });
      if (res.data?.success) {
        setGpsTestResult({
          success: true,
          message: res.data.message || 'Connection successful! Verified API connectivity.',
          devicesDetected: res.data.data?.devicesDetected,
        });
      } else {
        setGpsTestResult({
          success: false,
          message: res.data?.message || 'Connection test failed.',
        });
      }
    } catch (err) {
      setGpsTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Connection test failed. Check API credentials.',
      });
    } finally {
      setIsTestingGps(false);
    }
  };

  const handleSaveGpsConfig = async (e) => {
    e.preventDefault();
    const isNew = !editingGpsId && !gpsConfigs.find((c) => c.provider_code === gpsForm.provider_code)?.id;
    if (isNew && !gpsForm.api_key?.trim()) {
      triggerError('API Key / Access Token is required');
      return;
    }
    setIsSaving(true);
    try {
      const targetId = editingGpsId || gpsConfigs.find((c) => c.provider_code === gpsForm.provider_code)?.id;
      const payload = { ...gpsForm };
      // If editing and key was left blank or is masked, don't overwrite existing secret key
      if (targetId && (!payload.api_key?.trim() || payload.api_key.includes('XXXX') || payload.api_key.includes('••••'))) {
        delete payload.api_key;
      }
      delete payload.saved_key_preview;

      if (targetId) {
        const res = await api.put(`/gps/configs/${targetId}`, payload);
        if (res.data?.success) {
          triggerSuccess('GPS Provider integration updated successfully (no duplicates)!');
          setIsGpsModalOpen(false);
          fetchGpsData();
        }
      } else {
        const res = await api.post('/gps/configs', payload);
        if (res.data?.success) {
          triggerSuccess('GPS Provider connected and synced successfully!');
          setIsGpsModalOpen(false);
          fetchGpsData();
        }
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to save GPS configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGpsConfig = async (id, name) => {
    if (!window.confirm(`Are you sure you want to disconnect and delete "${name}"?`)) return;
    try {
      const res = await api.delete(`/gps/configs/${id}`);
      if (res.data?.success) {
        triggerSuccess(`GPS configuration "${name}" removed successfully.`);
        fetchGpsData();
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Failed to delete GPS integration');
    }
  };

  const handleSyncGpsNow = async (integrationId = null) => {
    setIsSyncingGps(true);
    try {
      const payload = integrationId ? { integration_id: integrationId } : {};
      const res = await api.post('/gps/sync-now', payload);
      if (res.data?.success) {
        const syncedCount = res.data.data?.syncedVehicles ?? 0;
        triggerSuccess(`GPS Sync complete! Updated telemetry for ${syncedCount} fleet vehicle(s).`);
        fetchGpsData();
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'GPS sync failed');
    } finally {
      setIsSyncingGps(false);
    }
  };

  const handleTestExistingConfig = async (cfg) => {
    try {
      triggerSuccess(`Testing connection to ${cfg.provider_name}...`);
      const res = await api.post('/gps/test-connection', {
        provider_code: cfg.provider_code,
        api_key: cfg.api_key,
        api_secret: cfg.api_secret,
        base_url: cfg.base_url,
      });
      if (res.data?.success) {
        triggerSuccess(res.data.message || `Connection to ${cfg.provider_name} verified successfully!`);
        fetchGpsData();
      } else {
        triggerError(res.data?.message || 'Connection test failed.');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || `Failed to connect to ${cfg.provider_name}`);
    }
  };

  const terminologyOptions = ['Bilty', 'LR', 'GR', 'Docket', 'Consignment Note'];
  
  // Memoized client-side filtered and paginated telemetry stream
  const filteredGpsTelemetryList = useMemo(() => {
    return (gpsTelemetryList || []).filter((v) => {
      if (v.last_latitude === null || v.last_latitude === undefined) return false;

      const q = (gpsSearchTerm || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.vehicle_number?.toLowerCase().includes(q) ||
        v.driver?.name?.toLowerCase().includes(q) ||
        v.assignedDriver?.name?.toLowerCase().includes(q) ||
        v.gps_device_id?.toLowerCase().includes(q) ||
        v.gps_provider_name?.toLowerCase().includes(q) ||
        v.branch?.branch_name?.toLowerCase().includes(q) ||
        v.branch?.city?.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (gpsFilterStatus === 'ACTIVE') return parseFloat(v.last_speed || 0) > 0;
      if (gpsFilterStatus === 'OFFLINE') return parseFloat(v.last_speed || 0) === 0;
      return true;
    });
  }, [gpsTelemetryList, gpsSearchTerm, gpsFilterStatus]);

  const totalGpsTelemetryCount = filteredGpsTelemetryList.length;
  const totalGpsTelemetryPages = Math.max(1, Math.ceil(totalGpsTelemetryCount / gpsTelemetryPageSize));
  const startTelemetryItem = totalGpsTelemetryCount === 0 ? 0 : (gpsTelemetryPage - 1) * gpsTelemetryPageSize + 1;
  const endTelemetryItem = Math.min(totalGpsTelemetryCount, gpsTelemetryPage * gpsTelemetryPageSize);

  const pagedGpsTelemetryList = useMemo(() => {
    const start = (gpsTelemetryPage - 1) * gpsTelemetryPageSize;
    return filteredGpsTelemetryList.slice(start, start + gpsTelemetryPageSize);
  }, [filteredGpsTelemetryList, gpsTelemetryPage, gpsTelemetryPageSize]);

  if (!isAdmin) {
    return (
      <div className={`flex min-h-screen ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-4 ${
              isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold">Administrator Access Required</h2>
              <p className="text-xs text-slate-400">
                Only transport organization administrators can configure company settings and permissions.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 w-full max-w-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className={`text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Company Settings & Branding
                </h1>
              </div>
              <p className={`text-xs lg:text-[13px] xl:text-sm mt-0.5 sm:mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure transport company branding, fleet themes, docket settings, number series, and staff permissions.
              </p>
            </div>
          </div>

          {/* Settings Tabs & Content Layout */}
          <div className="space-y-6">
            
            {/* Upperside Horizontal Navigation Tabs with Responsive Scroll Controls */}
            <div className="relative flex items-center group">
              {/* Left Scroll Indicator Button */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => handleScrollTabs('left')}
                  className="absolute left-1.5 z-20 p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-lg text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all backdrop-blur-md cursor-pointer"
                  title="Scroll tabs left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Scrollable Tabs Track */}
              <div
                ref={tabsContainerRef}
                className={`p-1.5 sm:p-2 rounded-2xl border flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full transition-colors ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <button
                  type="button"
                  onClick={(e) => handleTabClick('branding', e)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
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
                  onClick={(e) => handleTabClick('operations', e)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    activeTab === 'operations'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Route className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>Operations Mode</span>
                  <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                    selectedTransporterType === 'FTL'
                      ? 'bg-purple-500/20 text-purple-300'
                      : selectedTransporterType === 'PTL'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {selectedTransporterType}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleTabClick('bank_gst', e)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    activeTab === 'bank_gst'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Landmark className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Bank & GST Details</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleTabClick('theme', e)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    activeTab === 'theme'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Palette className="w-4 h-4 shrink-0" />
                  <span>Theme & Brand Colors</span>
                </button>

                {canManageRoles && (
                  <button
                    type="button"
                    onClick={(e) => handleTabClick('roles', e)}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                      activeTab === 'roles'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Roles & Permissions</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => handleTabClick('terminology', e)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    activeTab === 'terminology'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Series & Prefixes</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleTabClick('gps', e)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    activeTab === 'gps'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Radio className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>GPS & API Integrations</span>
                  {gpsConfigs.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-emerald-500 text-slate-950">
                      {gpsConfigs.filter(c => c.is_active).length}
                    </span>
                  )}
                </button>
              </div>

              {/* Right Scroll Indicator Button */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => handleScrollTabs('right')}
                  className="absolute right-1.5 z-20 p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-lg text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all backdrop-blur-md cursor-pointer"
                  title="Scroll tabs right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Active Tab Panel Content */}
            <div className="w-full">

              {/* TAB: OPERATIONS MODE (FTL vs PTL vs BOTH) */}
              {activeTab === 'operations' && (
                <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-200 dark:border-slate-800 mb-6 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-cyan-500" />
                        <h2 className="text-base font-bold">Transport Operations Mode</h2>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          selectedTransporterType === 'FTL'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30'
                            : selectedTransporterType === 'PTL'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                        }`}>
                          Current: {selectedTransporterType === 'FTL' ? 'FTL Dedicated' : selectedTransporterType === 'PTL' ? 'PTL Parcel Hub' : 'Hybrid FTL + PTL'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Select whether your company handles dedicated point-to-point Full Truckloads (FTL), consolidated hub Part Truckloads (PTL), or both. Workflows and sidebar menus automatically adapt.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSavingTransporterType}
                      onClick={() => handleSaveTransporterType(selectedTransporterType)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
                    >
                      {isSavingTransporterType ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Mode…</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Operations Mode</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 3 Interactive Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* FTL Card */}
                    <div
                      onClick={() => setSelectedTransporterType('FTL')}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedTransporterType === 'FTL'
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                      }`}
                    >
                      {selectedTransporterType === 'FTL' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">Full Truckload (FTL)</h3>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-500/20 text-purple-300">
                          Direct
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Dedicated point-to-point vehicle operations from origin to destination without sorting or parcel manifests.
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Direct Vehicle Trips</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Single-Consignment Bookings</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                          <X className="w-3.5 h-3.5 shrink-0" />
                          <span>Hides Load & Unload Planning</span>
                        </div>
                      </div>
                    </div>

                    {/* PTL Card */}
                    <div
                      onClick={() => setSelectedTransporterType('PTL')}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedTransporterType === 'PTL'
                          ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                      }`}
                    >
                      {selectedTransporterType === 'PTL' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">Part Truckload (PTL / Sundry)</h3>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300">
                          Hub Manifest
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Consolidated parcels, multi-customer sundry bookings, loading sheet manifests, and branch receiving.
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Vehicle Load Planning & 3D</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Branch Inward & Unload Sheet</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Multi-Consignment Hub Manifests</span>
                        </div>
                      </div>
                    </div>

                    {/* BOTH Card */}
                    <div
                      onClick={() => setSelectedTransporterType('BOTH')}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedTransporterType === 'BOTH'
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                      }`}
                    >
                      {selectedTransporterType === 'BOTH' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">Both (FTL + PTL)</h3>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-cyan-500/20 text-cyan-300">
                          Complete Suite
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Full-spectrum logistics carrier operating both dedicated point-to-point vehicles and consolidated parcel networks.
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>All FTL & Direct Trip Workflows</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>All PTL Load & Unload Manifests</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Flexible Booking Type Switcher</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational impact explanation box */}
                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>How this affects your team and platform navigation:</span>
                    </div>
                    {selectedTransporterType === 'FTL' ? (
                      <p>
                        When set to <strong>Full Truckload (FTL)</strong>, the navigation menu hides parcel consolidation features like <em>Load Planning</em> and <em>Unload Planning</em>. Booking forms will default to dedicated full truckloads, keeping workflows straightforward for direct freight dispatch.
                      </p>
                    ) : selectedTransporterType === 'PTL' ? (
                      <p>
                        When set to <strong>Part Truckload (PTL)</strong>, your operations center around booking sundry parcels, consolidating them into vehicle loading sheets (<em>Load Planning</em>), and receiving/deconsolidating them at branches (<em>Unload Planning</em>).
                      </p>
                    ) : (
                      <p>
                        When set to <strong>Both (FTL + PTL)</strong>, all platform capabilities are unlocked. Your dispatchers can book both dedicated FTL trips and consolidated PTL parcel manifests simultaneously.
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                          placeholder={tenantOrgName ? `e.g. ${tenantOrgName}` : 'e.g. Registered Transport & Logistics Co.'}
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
                      {canManageSettings ? (
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
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic">View only mode</span>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* TAB: BANK REMITTANCE & GST TAX DETAILS (ADMIN CONFIGURABLE) */}
              {activeTab === 'bank_gst' && (
                <div className="space-y-6">
                  {/* Top Intro Banner */}
                  <div className={`py-3 px-4 sm:px-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                        <Landmark className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold truncate">Bank Remittance, UPI &amp; GST Configuration</h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Manage company settlement accounts, live counter QR standee, and official GSTIN.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <Link
                        href="/billing/invoices"
                        target="_blank"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isDark
                            ? 'border-slate-800 bg-slate-900 text-cyan-400 hover:bg-slate-800'
                            : 'border-slate-200 bg-slate-50 text-blue-600 hover:bg-slate-100'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Invoice Preview</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>

                      {canManageSettings && (
                        <button
                          type="button"
                          onClick={() => handleSaveBankGst()}
                          disabled={isSavingBankGst || isSavingBank || isSavingUpi || isSavingGst}
                          title="Save all Bank Remittance, UPI & GST details simultaneously"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          {isSavingBankGst ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Save All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2-Column Grid: Left is Form, Right is Real-time Invoice Print Preview */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                    
                    {/* Left Column: Form Cards */}
                    <div className="w-full xl:col-span-7 space-y-4">

                        {/* Card 1: Bank Remittance Details */}
                        <div className={`rounded-2xl border shadow-md transition-all duration-300 relative overflow-hidden ${
                          isDark
                            ? 'bg-[#0D1527] border-slate-800 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500" />

                          <div className="p-4 sm:p-5 relative z-10">
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                  <CreditCard className="w-4 h-4 stroke-[2.2]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                                    <h3 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                                      Bank Details for Remittance
                                    </h3>
                                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 whitespace-nowrap shrink-0">
                                      NEFT / RTGS
                                    </span>
                                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap shrink-0">
                                      Bilty Payment Box
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    Customer payment instructions printed on computerized invoices &amp; bilty.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Form Fields Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Bank Name */}
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>Bank Name *</span>
                                  <span className="text-[10px] text-slate-400 font-normal">HDFC, SBI, ICICI</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. HDFC Bank Ltd"
                                  value={bankGstForm.bankName}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, bankName: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Bank Account Number */}
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>Account Number *</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Current / Business</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 50200048910245"
                                  value={bankGstForm.accountNumber}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, accountNumber: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold tracking-wider focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-cyan-300 focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* IFSC Code */}
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>IFSC Code *</span>
                                  <span className="text-[10px] text-slate-400 font-normal">11 digits</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. HDFC0001824"
                                  value={bankGstForm.ifscCode}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, ifscCode: e.target.value.toUpperCase() })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Branch Name */}
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>Branch Name *</span>
                                  <span className="text-[10px] text-slate-400 font-normal">City branch</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Nigdi Branch, Pune"
                                  value={bankGstForm.bankBranch}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, bankBranch: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Account Beneficiary Name */}
                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>Beneficiary / Legal Entity Name</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Shown as account payee</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder={tenantOrgName ? `e.g. ${tenantOrgName} Pvt Ltd` : 'e.g. Registered Legal Entity Name'}
                                  value={bankGstForm.accountHolderName}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, accountHolderName: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Card 1 Dedicated Action Footer */}
                            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                Syncs to invoices &amp; bilty payment box
                              </span>
                              {canManageSettings ? (
                                <button
                                  type="button"
                                  onClick={handleSaveBankDetails}
                                  disabled={isSavingBank}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  {isSavingBank ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      <span>Save Bank Details</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400 italic">View only</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card 1b: Direct Bank UPI Configuration & Live Payment Scanner */}
                        <div className={`rounded-2xl border shadow-md transition-all duration-300 relative overflow-hidden ${
                          isDark
                            ? 'bg-[#0D1527] border-slate-800 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                          <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500" />

                          <div className="p-4 sm:p-5 relative z-10">
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                  <QrCode className="w-4 h-4 stroke-[2.2]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                                      Direct UPI Remittance &amp; Counter Scanner
                                    </h3>
                                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                                      Instant Credit
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    Direct freight settlement into {bankGstForm.bankName || 'Company Bank'} via any UPI app.
                                  </p>
                                </div>
                              </div>

                              {/* Header Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={handleDownloadUpiQr}
                                  title="Download High-Resolution QR PNG"
                                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Download QR</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setShowStandeePrintModal(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Print Standee</span>
                                </button>
                              </div>
                            </div>

                            {/* Main Content Grid: Left inputs (7 cols), Right compact standee (5 cols) */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                              {/* Left Settings Column */}
                              <div className="md:col-span-7 space-y-3">
                                {/* UPI ID Input */}
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <Smartphone className="w-3.5 h-3.5 text-teal-500" />
                                      <span>Company UPI VPA / Merchant Handle *</span>
                                    </span>
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      placeholder={`e.g. ${tenantHandle}@hdfcbank, 98XXXXXXXX@paytm`}
                                      value={bankGstForm.upiId}
                                      onChange={(e) => {
                                        setBankGstForm({ ...bankGstForm, upiId: e.target.value });
                                        refreshUpiPreviewQr(e.target.value);
                                      }}
                                      className={`w-full pl-3 pr-20 py-2 rounded-xl border text-xs font-mono font-bold tracking-wide focus:outline-none transition-all ${
                                        isDark
                                          ? 'border-slate-800 bg-slate-900/90 text-teal-300 focus:border-teal-400'
                                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-teal-500 focus:bg-white'
                                      }`}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={handleCopyUpiVpa}
                                        title="Copy UPI VPA"
                                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                      >
                                        {copiedUpiVpa ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                      <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                        UPI
                                      </span>
                                    </div>
                                  </div>

                                  {/* Quick Bank Handles Chips */}
                                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                    <span className="text-[10px] text-slate-400 font-medium mr-0.5">Quick:</span>
                                    {['@okhdfcbank', '@okaxis', '@paytm', '@ybl', '@icici', '@sbi', '@kotak'].map((handle) => {
                                      const isCurrent = (bankGstForm.upiId || '').toLowerCase().endsWith(handle.toLowerCase());
                                      return (
                                        <button
                                          key={handle}
                                          type="button"
                                          onClick={() => {
                                            const cleanBase = (bankGstForm.upiId || '').split('@')[0] || tenantHandle;
                                            const nextVpa = `${cleanBase}${handle}`;
                                            setBankGstForm({ ...bankGstForm, upiId: nextVpa });
                                            refreshUpiPreviewQr(nextVpa);
                                          }}
                                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                                            isCurrent
                                              ? 'bg-teal-600 text-white font-bold border-teal-600 shadow-xs'
                                              : isDark
                                              ? 'border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 text-slate-400'
                                              : 'border-slate-200 hover:border-teal-500/50 hover:bg-teal-50 text-slate-600'
                                          }`}
                                        >
                                          {handle}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Payee / Beneficiary Name */}
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>Payee Display Name</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Shown in customer's UPI app</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={tenantOrgName ? `e.g. ${tenantOrgName} Private Limited` : 'e.g. Registered Payee Entity'}
                                    value={bankGstForm.accountHolderName}
                                    onChange={(e) => {
                                      setBankGstForm({ ...bankGstForm, accountHolderName: e.target.value });
                                      refreshUpiPreviewQr(undefined, e.target.value);
                                    }}
                                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-all ${
                                      isDark
                                        ? 'border-slate-800 bg-slate-900/90 text-white focus:border-cyan-400'
                                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                    }`}
                                  />
                                </div>

                                {/* QR Code Scan Amount Selector */}
                                <div className={`p-2.5 rounded-xl border ${
                                  isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/70'
                                } space-y-1.5`}>
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                    <span>QR Preset Amount:</span>
                                    <span className="font-bold text-teal-600 dark:text-teal-400">
                                      {upiPreviewAmount ? `₹${upiPreviewAmount}` : 'Open (Any Value)'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUpiPreviewAmount('');
                                        refreshUpiPreviewQr(undefined, undefined, 0);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        !upiPreviewAmount
                                          ? 'bg-teal-600 text-white shadow-xs'
                                          : 'border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                      }`}
                                    >
                                      Open Amount
                                    </button>
                                    {[100, 500, 1000, 2000].map((amt) => (
                                      <button
                                        key={amt}
                                        type="button"
                                        onClick={() => {
                                          setUpiPreviewAmount(String(amt));
                                          refreshUpiPreviewQr(undefined, undefined, amt);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                          upiPreviewAmount === String(amt)
                                            ? 'bg-teal-600 text-white shadow-xs'
                                            : 'border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                        }`}
                                      >
                                        ₹{amt}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Quick Tools & Test Flow */}
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={handleCopyUpiIntent}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    {copiedUpiIntent ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <ExternalLink className="w-3 h-3 text-slate-400" />
                                        <span>Copy Link</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleSimulateTestPayment}
                                    disabled={isSimulatingUpiTest}
                                    className="px-2.5 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    <Zap className={`w-3 h-3 text-amber-500 ${isSimulatingUpiTest ? 'animate-bounce' : ''}`} />
                                    <span>{isSimulatingUpiTest ? 'Simulating...' : 'Test Payment Flow'}</span>
                                  </button>
                                </div>

                                {/* Test Result Alert */}
                                {upiTestResult && (
                                  <div className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 transition-all ${
                                    upiTestResult.success
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                  }`}>
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                                    <div>
                                      <div className="font-bold">{upiTestResult.message}</div>
                                      {upiTestResult.utr && (
                                        <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                                          Simulated UTR: <span className="font-bold text-slate-800 dark:text-white">{upiTestResult.utr}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Sleek Compact Standee Preview */}
                              <div className="md:col-span-5 flex flex-col items-center justify-start">
                                <div className="w-full max-w-[210px] rounded-2xl border-2 border-teal-500/40 bg-white text-slate-900 shadow-xl overflow-hidden flex flex-col items-center text-center p-3 relative">
                                  {/* Top Merchant Header Banner */}
                                  <div className="w-full pb-2 border-b border-slate-200 mb-2">
                                    <div className="flex items-center justify-center gap-1 text-[10px] font-black tracking-wide text-slate-900 uppercase truncate">
                                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                                        <Zap className="w-2 h-2 text-white fill-current" />
                                      </div>
                                      <span className="truncate">{brandingForm.businessName || 'Transporter Hub'}</span>
                                    </div>
                                    <div className="text-[8px] text-teal-700 font-extrabold uppercase tracking-wider mt-0.5">
                                      Official Payment Standee
                                    </div>
                                  </div>

                                  <div className="text-[9px] font-black text-slate-800 uppercase tracking-wide">
                                    SCAN &amp; PAY WITH ANY UPI APP
                                  </div>

                                  {/* Scanner Frame with Corner Brackets & High-Res QR Code */}
                                  <div className="relative my-2 p-2 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center min-h-[140px] w-[140px]">
                                    <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-teal-600 rounded-tl-sm pointer-events-none" />
                                    <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-teal-600 rounded-tr-sm pointer-events-none" />
                                    <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-teal-600 rounded-bl-sm pointer-events-none" />
                                    <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-teal-600 rounded-br-sm pointer-events-none" />

                                    {isGeneratingUpiQr && !upiQrPreview?.qr_data_url ? (
                                      <div className="flex flex-col items-center gap-1.5">
                                        <RefreshCw className="w-6 h-6 text-teal-500 animate-spin" />
                                        <span className="text-[9px] text-slate-400">Loading QR...</span>
                                      </div>
                                    ) : (bankGstForm.upiId || upiQrPreview?.qr_data_url) ? (
                                      <img
                                        src={getLiveUpiQrSrc()}
                                        alt="UPI Payment QR Code"
                                        className="w-[124px] h-[124px] object-contain rounded-md"
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-slate-400">
                                        <QrCode className="w-12 h-12 stroke-1 text-slate-300" />
                                        <span className="text-[9px] mt-1 font-medium">Enter UPI ID</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dynamic Amount Badge */}
                                  <div className="mb-1.5">
                                    {upiPreviewAmount ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        ₹{upiPreviewAmount}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                        Accepts Any Amount
                                      </span>
                                    )}
                                  </div>

                                  {/* Merchant Name & UPI ID Display */}
                                  <div className="space-y-0.5 mb-2 w-full">
                                    <div className="text-[10px] font-bold text-slate-900 truncate" title={bankGstForm.accountHolderName || tenantOrgName}>
                                      {bankGstForm.accountHolderName || tenantOrgName || 'Registered Transport Entity'}
                                    </div>
                                    <div
                                      onClick={handleCopyUpiVpa}
                                      className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/70 hover:bg-teal-100 transition-colors cursor-pointer max-w-full truncate"
                                      title="Click to copy UPI ID"
                                    >
                                      <span className="truncate">{bankGstForm.upiId || `${tenantHandle}@upi`}</span>
                                      <Copy className="w-2 h-2 shrink-0 opacity-70" />
                                    </div>
                                  </div>

                                  {/* Supported UPI Apps Footer */}
                                  <div className="w-full pt-1.5 border-t border-slate-200 flex items-center justify-around text-[8px] font-bold text-slate-600">
                                    <span>GPay</span>
                                    <span>•</span>
                                    <span>PhonePe</span>
                                    <span>•</span>
                                    <span>Paytm</span>
                                    <span>•</span>
                                    <span>BHIM</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Card 1b Dedicated Action Footer */}
                            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                Direct deposit into {bankGstForm.bankName || 'registered bank account'}
                              </span>
                              {canManageSettings ? (
                                <button
                                  type="button"
                                  onClick={handleSaveUpiDetails}
                                  disabled={isSavingUpi}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  {isSavingUpi ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      <span>Save UPI Settings</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400 italic">View only</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card 2: GST & Regulatory Tax Details */}
                        <div className={`rounded-2xl border shadow-md transition-all duration-300 relative overflow-hidden ${
                          isDark
                            ? 'bg-[#0D1527] border-slate-800 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

                          <div className="p-4 sm:p-5 relative z-10">
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <Receipt className="w-4 h-4 stroke-[2.2]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                                      GST &amp; GTA Regulatory Tax Registration
                                    </h3>
                                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                                      SAC 9965
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    Goods Transport Agency (GTA) credentials for tax invoices, e-way bills &amp; GSTR-1.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Form Fields Grid: Efficient 3-column layout */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* GSTIN */}
                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>GSTIN (GST Identification Number) *</span>
                                  <span className="text-[10px] text-slate-400 font-normal">15 chars</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 27AABCT9845P1Z2"
                                  value={bankGstForm.gstin}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, gstin: e.target.value.toUpperCase() })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-emerald-400 focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-emerald-700 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* SAC Code */}
                              <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>SAC Code</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Road: 9965</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="9965"
                                  value={bankGstForm.sacCode}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, sacCode: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* PAN Number */}
                              <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                  <span>PAN Number</span>
                                  <span className="text-[10px] text-slate-400 font-normal">10 chars</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. AABCT9845P"
                                  value={bankGstForm.pan}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, pan: e.target.value.toUpperCase() })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Legal Registered Name */}
                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Legal Registered Entity Name
                                </label>
                                <input
                                  type="text"
                                  placeholder={tenantOrgName ? `e.g. ${tenantOrgName} Transport Pvt Ltd` : 'e.g. Registered Transport Co.'}
                                  value={bankGstForm.legalName}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, legalName: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Tax Office Address */}
                              <div className="space-y-1 sm:col-span-3">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Registered Tax Office Address
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Plot 45, Transport Nagar, Nigdi"
                                  value={bankGstForm.address}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, address: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* City */}
                              <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">City</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Pune"
                                  value={bankGstForm.city}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, city: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* State */}
                              <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">State</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Maharashtra"
                                  value={bankGstForm.state}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, state: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Pincode */}
                              <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pincode</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 411044"
                                  value={bankGstForm.pincode}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, pincode: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Official Phone */}
                              <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Billing Phone</label>
                                <input
                                  type="text"
                                  placeholder="e.g. +91 8168333871"
                                  value={bankGstForm.phone}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, phone: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>

                              {/* Official Email */}
                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Billing Email</label>
                                <input
                                  type="email"
                                  placeholder={`e.g. accounts@${tenantHandle || 'transporter'}.com`}
                                  value={bankGstForm.email}
                                  onChange={(e) => setBankGstForm({ ...bankGstForm, email: e.target.value })}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Card 2 Dedicated Action Footer */}
                            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                Formatted automatically for GSTR-1 &amp; e-way bills
                              </span>
                              {canManageSettings ? (
                                <button
                                  type="button"
                                  onClick={handleSaveGstDetails}
                                  disabled={isSavingGst}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  {isSavingGst ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      <span>Save GST &amp; Tax Details</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400 italic">View only</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                    {/* Right Column: Live Customer Tax Invoice Preview */}
                    <div className="w-full xl:col-span-5 space-y-3 xl:sticky xl:top-4">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Live Invoice Print Preview
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Real-time
                        </span>
                      </div>

                      {/* Mock Invoice Sheet */}
                      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl p-4 sm:p-5 text-slate-900 font-sans text-[11px] leading-tight space-y-4 select-none">
                        
                        {/* Invoice Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-3 border-slate-200">
                          <div>
                            <div className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase">
                              {brandingForm.businessName || user?.businessName || user?.organizationName || 'Transport Agency'}
                            </div>
                            <div className="text-[10px] font-medium text-slate-600">
                              {brandingForm.tagline || user?.tagline || 'Logistics & Goods Transport Agency (GTA)'}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1">
                              {bankGstForm.address || brandingForm.address
                                ? `${(bankGstForm.address || brandingForm.address)}${(bankGstForm.city || brandingForm.city) ? `, ${bankGstForm.city || brandingForm.city}` : ''}${(bankGstForm.state || brandingForm.state) ? `, ${bankGstForm.state || brandingForm.state}` : ''}${(bankGstForm.pincode || brandingForm.pincode) ? ` - ${bankGstForm.pincode || brandingForm.pincode}` : ''}`
                                : 'Registered Operations Hub & Transport Office'}
                            </div>
                            <div className="text-[9px] text-slate-500">
                              Phone: {bankGstForm.phone || brandingForm.phone || user?.phone || 'Contact Phone Unset'} • Email: {bankGstForm.email || brandingForm.email || user?.email || 'accounts@transporter.in'}
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0">
                            <span className="inline-block px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-black text-[9px] border border-blue-200 tracking-wider">
                              GST TAX INVOICE
                            </span>
                            <div className="text-[10px] font-bold text-slate-900 mt-1">
                              GSTIN: <span className="font-mono text-emerald-700">{bankGstForm.gstin || brandingForm.gstin || user?.gstin || user?.organization?.gst_number || 'GST Unregistered / URP'}</span>
                            </div>
                            <div className="text-[9px] font-semibold text-slate-600">
                              SAC Code: <span className="font-mono font-bold text-blue-700">{bankGstForm.sacCode || '9965'}</span> (Road Freight)
                            </div>
                          </div>
                        </div>

                        {/* Invoice Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Billed To (Consignor / Party):
                            </div>
                            <div className="font-bold text-slate-900 mt-0.5">Sample Client Account</div>
                            <div className="text-slate-600">GSTIN / UIN: <span className="font-semibold">URP</span></div>
                            <div className="text-slate-500 text-[9px] mt-0.5">Branch: Head Office Hub</div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Invoice Number:</span>
                              <span className="font-mono font-bold text-slate-900">INV-{new Date().getFullYear().toString().slice(-2)}-{(new Date().getFullYear() + 1).toString().slice(-2)}/000001</span>
                            </div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-slate-500">Invoice Date:</span>
                              <span className="font-medium text-slate-900">{new Date().toISOString().slice(0, 10)}</span>
                            </div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-slate-500">Reverse Charge:</span>
                              <span className="font-semibold text-slate-900">No (Forward Charge 5%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Sample Docket Row with horizontal scroll on tiny screens */}
                        <div className="border border-slate-200 rounded-lg overflow-x-auto text-[9px]">
                          <div className="min-w-[320px]">
                            <div className="grid grid-cols-12 bg-slate-100 font-bold text-slate-700 p-1.5 border-b border-slate-200">
                              <div className="col-span-1">#</div>
                              <div className="col-span-3">{term || 'Docket'} Number</div>
                              <div className="col-span-4">Origin → Delivery</div>
                              <div className="col-span-2 text-right">Weight</div>
                              <div className="col-span-2 text-right">Total (₹)</div>
                            </div>
                            <div className="grid grid-cols-12 p-1.5 text-slate-800 font-medium">
                              <div className="col-span-1">1</div>
                              <div className="col-span-3 font-mono font-bold text-blue-600">
                                {docketSeries.nextNumber || `${docketSeries.prefix || 'DOC'}000001`}
                              </div>
                              <div className="col-span-4 text-slate-600 truncate">Origin Hub → Destination Hub</div>
                              <div className="col-span-2 text-right">2500 Kg</div>
                              <div className="col-span-2 text-right font-bold">₹ 47,880</div>
                            </div>
                          </div>
                        </div>

                        {/* HIGHLIGHTED: The exact Bank Details Box from the Screenshot! */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                          
                          {/* The Bank Details for Remittance Box */}
                          <div className="sm:col-span-7 p-3 rounded-xl bg-blue-50/50 border border-blue-200 shadow-xs relative">
                            <div className="text-[10px] font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                              <span>Bank Details for Remittance:</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            </div>
                            <div className="space-y-0.5 text-[9.5px]">
                              <div>
                                <span className="text-slate-500 font-medium">Bank: </span>
                                <span className="font-bold text-slate-900">{bankGstForm.bankName || 'Bank Name Unset'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-medium">A/C No: </span>
                                <span className="font-mono font-bold text-slate-900">{bankGstForm.accountNumber || 'A/C Number Unset'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-medium">IFSC Code: </span>
                                <span className="font-mono font-bold text-slate-900">{bankGstForm.ifscCode || 'IFSC Unset'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-medium">Branch: </span>
                                <span className="font-medium text-slate-900">{bankGstForm.bankBranch || 'Branch Unset'}</span>
                              </div>
                              {bankGstForm.accountHolderName && (
                                <div>
                                  <span className="text-slate-500 font-medium">Beneficiary: </span>
                                  <span className="font-semibold text-slate-900">{bankGstForm.accountHolderName}</span>
                                </div>
                              )}
                              {bankGstForm.upiId && (
                                <div>
                                  <span className="text-slate-500 font-medium">UPI VPA: </span>
                                  <span className="font-mono text-blue-700 break-all">{bankGstForm.upiId}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Invoice Totals Preview */}
                          <div className="sm:col-span-5 text-right space-y-1 text-[9.5px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Taxable Freight:</span>
                              <span className="font-mono font-semibold text-slate-900">₹ 45,600</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">CGST @ 2.5%:</span>
                              <span className="font-mono text-slate-700">₹ 1,140</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">SGST @ 2.5%:</span>
                              <span className="font-mono text-slate-700">₹ 1,140</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-300 font-bold text-slate-950 text-[11px]">
                              <span>Total Amount:</span>
                              <span className="text-blue-700">₹ 47,880</span>
                            </div>
                          </div>
                        </div>

                        {/* Signatory Footer */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
                          <div>Declaration: This invoice shows the actual price of services described.</div>
                          <div className="text-right font-medium">
                            <div className="text-[7.5px] italic text-slate-400">[Digitally Signed & Verified]</div>
                            <div className="font-bold text-slate-900">For {brandingForm.businessName || user?.businessName || user?.organizationName || 'Transporter'}</div>
                            <div>Authorized Signatory</div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
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

              {/* TAB 5: NUMBER SERIES & PREFIXES */}
              {activeTab === 'terminology' && (
                <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                    <h2 className="text-base font-bold">Number Series, Prefixes & Document Terminology</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure document terminology (Bilty, LR, GR), auto-generated Bilty / Docket number series, Trip & Dispatch prefixes, and Company Branch Code prefixes.
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
                          <span className="text-[10px] text-slate-400">3-character code (e.g. {tenantSuggestedPrefix} for {tenantOrgName || 'Your Fleet'})</span>
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

                        {canManageSettings ? (
                          <button
                            type="submit"
                            disabled={isSavingDocketSeries}
                            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
                          >
                            <Save className="w-4 h-4" />
                            <span>{isSavingDocketSeries ? 'Saving...' : 'Save Series Format'}</span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 italic">View only mode</span>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Trip Number Series Section */}
                  <div className={`mt-8 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="pb-3 mb-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-400" />
                        <span>Auto-Generated Trip & Dispatch Number Series</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure how trip and dispatch numbers are generated upon load completion. Format follows TRP-YYYY-001 (transporter specific).
                      </p>
                    </div>

                    <form onSubmit={handleSaveTripSeries} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Prefix */}
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Series Prefix (e.g. TRP) *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={8}
                            value={tripSeries.prefix}
                            onChange={(e) => setTripSeries({ ...tripSeries, prefix: e.target.value.toUpperCase() })}
                            placeholder="e.g. TRP"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none transition-colors ${
                              isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-emerald-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">Prefix code for trips (default is TRP)</span>
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
                            value={tripSeries.startingNumber}
                            onChange={(e) => setTripSeries({ ...tripSeries, startingNumber: parseInt(e.target.value, 10) || 1 })}
                            placeholder="1"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                              isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-emerald-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">Next trip counter (e.g. 1 for 001)</span>
                        </div>

                        {/* Sequence Length / Digits */}
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Minimum Digits Padding *
                          </label>
                          <input
                            type="number"
                            required
                            min={3}
                            max={8}
                            value={tripSeries.sequenceLength}
                            onChange={(e) => setTripSeries({ ...tripSeries, sequenceLength: parseInt(e.target.value, 10) || 3 })}
                            placeholder="3"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                              isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-emerald-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">3 digits produces 001, 002...</span>
                        </div>
                      </div>

                      {/* Live Output Preview Card */}
                      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            LIVE NEXT TRIP NUMBER PREVIEW
                          </span>
                          <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {(tripSeries.prefix || 'TRP').replace(/[^a-zA-Z0-9]/g, '')}-{new Date().getFullYear()}-{String(tripSeries.startingNumber || 1).padStart(tripSeries.sequenceLength || 3, '0')}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Trips generated via Load Planning dispatch or Direct Trips will use this transporter-specific format.
                          </span>
                        </div>

                        {canManageSettings ? (
                          <button
                            type="submit"
                            disabled={isSavingTripSeries}
                            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
                          >
                            <Save className="w-4 h-4" />
                            <span>{isSavingTripSeries ? 'Saving...' : 'Save Series Format'}</span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 italic">View only mode</span>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* COMPANY BRANCH CODE PREFIX CONFIGURATION */}
                  <div className={`mt-8 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="pb-3 mb-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-cyan-400" />
                        <span>Company Brand Prefix & Branch Code Generator Settings</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure your company brand initial or prefix for all physical branch offices and hubs. When registering branches, codes are automatically generated using this prefix (e.g. <strong>{branchPrefix}</strong> + Area = <strong>{branchPrefix}OKH</strong> for Okhla, <strong>{branchPrefix}DEL</strong> for Delhi).
                      </p>
                    </div>

                    <form onSubmit={handleSaveBranchPrefix} className="space-y-4">
                      <div className="space-y-2">
                        <label className={`text-xs font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Select Company Brand Initial / Prefix (e.g. <strong>{tenantSuggestedInitial}</strong> for {tenantOrgName || 'Your Transport'}) *
                        </label>

                        {/* Quick Alphabet Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {['B', 'A', 'C', 'D', 'M', 'S', 'T', 'V', 'K', 'P', 'R', 'N', 'L'].map((char) => (
                            <button
                              key={char}
                              type="button"
                              onClick={() => setBranchPrefix(char)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                branchPrefix === char
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                                  : isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {char}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              Brand Prefix Code (1–4 characters)
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={4}
                              value={branchPrefix}
                              onChange={(e) => setBranchPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                              placeholder="e.g. B, BAL"
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-black uppercase focus:outline-none transition-colors ${
                                isDark
                                  ? 'border-slate-800 bg-slate-900/80 text-cyan-300 focus:border-cyan-400'
                                  : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                              }`}
                            />
                            <span className="text-[10px] text-slate-400">Company brand identifier for branch codes</span>
                          </div>

                          {/* Live Output Preview Card */}
                          <div className={`p-3.5 rounded-2xl border flex flex-col justify-center gap-1.5 ${
                            isDark ? 'bg-cyan-950/20 border-cyan-800/40' : 'bg-cyan-50/70 border-cyan-200'
                          }`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              LIVE AUTO-GENERATION PREVIEW
                            </span>
                            <div className="font-mono text-xs font-bold text-blue-600 dark:text-cyan-400 flex flex-wrap gap-2">
                              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60 shadow-2xs">
                                Okhla: <strong>{branchPrefix || 'B'}OKH</strong>
                              </span>
                              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60 shadow-2xs">
                                Bengaluru: <strong>{branchPrefix || 'B'}BLR</strong>
                              </span>
                              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60 shadow-2xs">
                                Mumbai: <strong>{branchPrefix || 'B'}MUM</strong>
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              New branches created under Branches & Hubs will inherit this prefix by default.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        {canManageSettings ? (
                          <button
                            type="submit"
                            disabled={isSavingBranchPrefix}
                            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
                          >
                            <Save className="w-4 h-4" />
                            <span>{isSavingBranchPrefix ? 'Saving...' : 'Save Branch Prefix Setting'}</span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 italic">View only mode</span>
                        )}
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

              {/* TAB 7: GPS & API INTEGRATIONS */}
              {activeTab === 'gps' && (
                <div className="space-y-4">
                  {/* Top GPS Overview & Control Banner (Compact) */}
                  <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <Radio className="w-5 h-5 animate-pulse" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900 dark:text-white">GPS & Fleet Telematics Gateway</h2>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            gpsConfigs.some(c => c.is_active)
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}>
                            {gpsConfigs.some(c => c.is_active) ? '● LIVE OPERATIONAL' : '○ STANDBY'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          High-frequency IoT telemetry synchronizing live coordinates, speed, and ignition signals every 10s.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSyncGpsNow()}
                        disabled={isSyncingGps}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200'
                            : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                        } disabled:opacity-50`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGps ? 'animate-spin text-cyan-400' : ''}`} />
                        <span>{isSyncingGps ? 'Syncing...' : 'Sync Fleet Now'}</span>
                      </button>

                      <Link
                        href="/control-tower"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Control Tower Map</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleOpenGpsModal('WHEELSEYE')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Configure Provider</span>
                      </button>
                    </div>
                  </div>

                  {/* Compact Fleet Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-3.5 rounded-xl border ${
                      isDark ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Fleet Vehicles</span>
                        <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{gpsTelemetryList.length || gpsStats.totalFleetVehicles || 0}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">units</span>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                      isDark ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live GPS Linked</span>
                        <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          {gpsTelemetryList.filter(v => v.last_latitude !== null && v.last_latitude !== undefined).length || gpsStats.vehiclesWithGps || 0}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          {gpsTelemetryList.length > 0
                            ? Math.round((gpsTelemetryList.filter(v => v.last_latitude).length / gpsTelemetryList.length) * 100)
                            : 0}% Coverage
                        </span>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                      isDark ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Moving Right Now</span>
                        <Navigation className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                          {gpsTelemetryList.filter(v => parseFloat(v.last_speed || 0) > 0).length}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">trucks in motion</span>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                      isDark ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Gateway</span>
                        <Signal className={`w-3.5 h-3.5 ${gpsConfigs.some(c => c.is_active) ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'}`} />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400 truncate">
                          {gpsConfigs.find(c => c.is_active)?.provider_name || (gpsConfigs.length > 0 ? 'Gateway Disabled' : 'Standby / Connect')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Supported Providers Strip (No massive scrolling!) */}
                  <div className={`p-3 rounded-2xl border ${
                    isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-slate-50/80 border-slate-200 text-slate-900'
                  }`}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
                        Supported Telematics Gateways
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Select any provider to link or adjust API credentials</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {GPS_PROVIDER_TEMPLATES.map((tpl) => {
                        const existingCfg = gpsConfigs.find((c) => c.provider_code === tpl.code);
                        const isConnected = !!existingCfg;

                        return (
                          <button
                            key={tpl.code}
                            type="button"
                            onClick={() => handleOpenGpsModal(tpl.code, existingCfg)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                              tpl.popular
                                ? isDark ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20' : 'border-amber-400 bg-amber-50/80 hover:bg-amber-100/70 shadow-xs'
                                : isConnected
                                ? isDark ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50/80 shadow-xs'
                                : isDark ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tpl.color} text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs`}>
                              {tpl.code.slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-bold truncate flex items-center gap-1 text-slate-900 dark:text-white">
                                <span>{tpl.name.split(' ')[0]}</span>
                                {tpl.popular && <span className="text-[9px] text-amber-500 dark:text-amber-400 font-black">★</span>}
                              </div>
                              <span className={`text-[9px] font-semibold ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {isConnected ? '● Connected' : '+ Connect'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* WheelsEye Quick-Connect / Active Gateway Banner */}
                  {!gpsConfigs.some(c => c.provider_code === 'WHEELSEYE' && c.is_active) ? (
                    <div className={`p-4 rounded-2xl border shadow-sm transition-all ${
                      isDark
                        ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 text-white'
                        : 'border-amber-300 bg-gradient-to-r from-amber-50 via-white to-amber-50/40 text-slate-900'
                    }`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                            WH
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Connect WheelsEye Fleet GPS</h4>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                                Recommended for Transporters
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Paste your WheelsEye Access Token to link your fleet vehicles and stream live coordinates.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                          <input
                            type="text"
                            placeholder="Enter WheelsEye Access Token / API Key"
                            value={quickWheelsEyeToken}
                            onChange={(e) => setQuickWheelsEyeToken(e.target.value)}
                            className={`px-3 py-2 rounded-xl text-xs font-mono border w-full sm:w-80 focus:outline-none focus:border-amber-400 ${
                              isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-xs'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickConnectWheelsEye()}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>{isSaving ? 'Connecting...' : `Connect & Fetch ${gpsStats.totalFleetVehicles > 0 ? `${gpsStats.totalFleetVehicles} ` : ''}Vehicles`}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Active WheelsEye Gateway Card */
                    gpsConfigs.filter(c => c.is_active).map((cfg) => (
                      <div
                        key={cfg.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                            WH
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{cfg.provider_name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Operational & Streaming
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 font-mono">
                                <Clock className="w-2.5 h-2.5" />
                                Auto-Sync: Every {cfg.sync_interval_mins || 5} min{cfg.sync_interval_mins === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                              <span className="font-mono flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-lg text-[10.5px] border border-slate-200 dark:border-slate-700/60">
                                <Key className="w-3 h-3 text-amber-500" />
                                <span className="text-slate-500 dark:text-slate-400">Token:</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                                  {maskApiKey(cfg.api_key)}
                                </span>
                              </span>
                              <span>•</span>
                              <span>{gpsTelemetryList.length || cfg.vehicles_count || gpsStats.totalFleetVehicles || 0} fleet units linked</span>
                              {cfg.last_sync_at && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    Last Synced: {new Date(cfg.last_sync_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSyncGpsNow(cfg.id)}
                            disabled={isSyncingGps}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                              isDark
                                ? 'border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300'
                                : 'border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 shadow-xs'
                            }`}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGps ? 'animate-spin' : ''}`} />
                            <span>Sync Now</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTestExistingConfig(cfg)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isDark
                                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-xs'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Ping</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenGpsModal(cfg.provider_code, cfg)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isDark
                                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-xs'
                            }`}
                          >
                            Settings
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGpsConfig(cfg.id, cfg.provider_name)}
                            className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all cursor-pointer"
                            title="Disconnect integration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Live Fleet GPS Telemetry Stream Table with Fixed Responsive Scrollable Height */}
                  <div className={`p-4 sm:p-5 rounded-2xl border shadow-md space-y-3.5 ${
                    isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                  }`}>
                    {/* Table Control Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                          <span className="text-slate-900 dark:text-white">Live Fleet Telemetry Stream</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {gpsTelemetryList.filter(v => v.last_latitude !== null && v.last_latitude !== undefined).length} Vehicles Broadcasting
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Live GPS coordinates, speed, and ignition signals streamed directly from WheelsEye Gateway • Auto-Sync interval: <strong className="text-slate-700 dark:text-slate-200">Every {gpsConfigs.find(c => c.is_active)?.sync_interval_mins || 5} Minutes</strong>.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search vehicle no, IMEI, driver..."
                            value={gpsSearchTerm}
                            onChange={(e) => {
                              setGpsSearchTerm(e.target.value);
                              setGpsTelemetryPage(1);
                            }}
                            className={`pl-8 pr-7 py-1.5 rounded-xl border text-xs focus:outline-none w-48 sm:w-60 transition-all ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-xs'
                            }`}
                          />
                          {gpsSearchTerm && (
                            <button
                              type="button"
                              onClick={() => {
                                setGpsSearchTerm('');
                                setGpsTelemetryPage(1);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Filter Status Pills */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}>
                          {[
                            { key: 'ALL', label: `All (${gpsTelemetryList.filter(v => v.last_latitude !== null && v.last_latitude !== undefined).length})`, color: 'blue' },
                            { key: 'ACTIVE', label: `Moving (${gpsTelemetryList.filter(v => (v.last_latitude !== null && v.last_latitude !== undefined) && parseFloat(v.last_speed || 0) > 0).length})`, color: 'emerald' },
                            { key: 'OFFLINE', label: `Stopped (${gpsTelemetryList.filter(v => (v.last_latitude !== null && v.last_latitude !== undefined) && parseFloat(v.last_speed || 0) === 0).length})`, color: 'rose' },
                          ].map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => {
                                setGpsFilterStatus(st.key);
                                setGpsTelemetryPage(1);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                gpsFilterStatus === st.key
                                  ? st.color === 'rose'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : st.color === 'emerald'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-blue-600 text-white shadow-xs'
                                  : st.key === 'OFFLINE'
                                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                                  : st.key === 'ACTIVE'
                                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Fixed Height Responsive Scroll Container with Sticky Header */}
                    <div className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[340px] rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
                      <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                        <thead className={`sticky top-0 z-10 backdrop-blur-md border-b text-[10px] uppercase font-bold tracking-wider ${
                          isDark
                            ? 'bg-slate-950/95 border-slate-800 text-slate-300'
                            : 'bg-slate-100/95 border-slate-200 text-slate-700'
                        }`}>
                          <tr>
                            <th className="py-3 px-3.5">Vehicle Number</th>
                            <th className="py-3 px-3.5">Driver & Branch</th>
                            <th className="py-3 px-3.5">Hardware IMEI / Operator</th>
                            <th className="py-3 px-3.5">Live Location & Coordinates</th>
                            <th className="py-3 px-3.5">Speed / Motion</th>
                            <th className="py-3 px-3.5">Ignition</th>
                            <th className="py-3 px-3.5">Last Ping</th>
                            <th className="py-3 px-3.5 text-right">Radar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                          {totalGpsTelemetryCount === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400">
                                <Truck className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                                <p className="text-xs font-bold text-slate-800 dark:text-white">No live telematics packets received yet</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Click <strong>&quot;Sync Fleet Now&quot;</strong> above to refresh live WheelsEye positions.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            pagedGpsTelemetryList.map((v) => {
                              const hasSignal = v.last_latitude !== null && v.last_latitude !== undefined;
                                const isMoving = parseFloat(v.last_speed || 0) > 0;
                                const driverName = v.driver?.name || v.assignedDriver?.name || 'Driver In-charge';
                                const branchCity = v.branch?.city || v.branch?.branch_name || 'Fleet Hub';

                                return (
                                  <tr
                                    key={v.id}
                                    className={`transition-colors ${
                                      isDark
                                        ? isMoving
                                          ? 'hover:bg-slate-900/60'
                                          : 'hover:bg-rose-950/20 bg-rose-950/5'
                                        : isMoving
                                        ? 'hover:bg-blue-50/40 bg-white'
                                        : 'hover:bg-rose-50/50 bg-rose-50/15'
                                    }`}
                                  >
                                    {/* Vehicle Plate & Type */}
                                    <td className="py-3 px-3.5">
                                      <div className="flex items-center gap-1.5">
                                        <Truck className={`w-3.5 h-3.5 shrink-0 ${
                                          isMoving ? 'text-emerald-500' : 'text-rose-500'
                                        }`} />
                                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-cyan-400">
                                          {v.vehicle_number}
                                        </span>
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                          isMoving
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        }`}>
                                          {isMoving ? 'Moving' : 'Stopped'}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 pl-5">
                                        {v.vehicle_type || 'Container'}
                                      </span>
                                    </td>

                                    {/* Driver & Branch */}
                                    <td className="py-3 px-3.5">
                                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                                        {driverName}
                                      </div>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {branchCity}
                                      </span>
                                    </td>

                                    {/* Hardware IMEI / Operator */}
                                    <td className="py-3 px-3.5">
                                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                                        {v.gps_provider_name || 'WheelsEye Fleet GPS'}
                                      </div>
                                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                        {v.gps_device_id || '864445069875070'}
                                      </span>
                                    </td>

                                    {/* Live Location & GPS Coordinates with Exact Free Reverse Geocoding */}
                                    <td className="py-3 px-3.5 max-w-[280px]">
                                      <VehicleLiveLocationCell
                                        latitude={v.last_latitude}
                                        longitude={v.last_longitude}
                                        lastLocationName={v.last_location_name}
                                        heading={v.last_heading}
                                      />
                                    </td>

                                    {/* Speed / Motion (Green for Moving, Red for Stopped) */}
                                    <td className="py-3 px-3.5">
                                      {hasSignal ? (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                                          isMoving
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                        }`}>
                                          {isMoving ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                          ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          )}
                                          <span>
                                            {isMoving ? `${Math.round(v.last_speed)} km/h` : '0 km/h (Stopped)'}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">—</span>
                                      )}
                                    </td>

                                    {/* Ignition (Green for ON, Red for OFF) */}
                                    <td className="py-3 px-3.5">
                                      {hasSignal ? (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                          v.last_ignition
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                                        }`}>
                                          <Power className="w-2.5 h-2.5" />
                                          {v.last_ignition ? 'ON' : 'OFF'}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">—</span>
                                      )}
                                    </td>

                                    {/* Last Ping */}
                                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                      {v.last_gps_updated_at ? (
                                        <div>
                                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                                            {new Date(v.last_gps_updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                          <div className="text-[9px] text-slate-400 dark:text-slate-500">
                                            {(() => {
                                              const diffSec = Math.max(0, Math.floor((Date.now() - new Date(v.last_gps_updated_at).getTime()) / 1000));
                                              if (diffSec < 60) return `${diffSec}s ago`;
                                              const diffMin = Math.floor(diffSec / 60);
                                              if (diffMin < 60) return `${diffMin}m ago`;
                                              return `${Math.floor(diffMin / 60)}h ago`;
                                            })()}
                                          </div>
                                        </div>
                                      ) : (
                                        <span>Just now</span>
                                      )}
                                    </td>

                                    {/* Radar Link */}
                                    <td className="py-3 px-3.5 text-right">
                                      {hasSignal ? (
                                        <Link
                                          href={`/control-tower?vehicle=${encodeURIComponent(v.vehicle_number)}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-bold transition-all cursor-pointer"
                                        >
                                          <span>Radar</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Telemetry Stream Pagination Footer */}
                    <div className={`p-3 sm:px-4 sm:py-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}>
                      {/* Left: Total Entries Info */}
                      <div className="flex items-center gap-2">
                        <span>
                          Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{startTelemetryItem}</strong> to{' '}
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>{endTelemetryItem}</strong> of{' '}
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalGpsTelemetryCount}</strong> live vehicles
                        </span>
                      </div>

                      {/* Right: Rows per page and Page navigation */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Rows:</span>
                          <select
                            value={gpsTelemetryPageSize}
                            onChange={(e) => {
                              setGpsTelemetryPageSize(Number(e.target.value));
                              setGpsTelemetryPage(1);
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                            }`}
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setGpsTelemetryPage((p) => Math.max(1, p - 1))}
                            disabled={gpsTelemetryPage <= 1}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                              gpsTelemetryPage <= 1
                                ? 'opacity-40 cursor-not-allowed border-transparent'
                                : isDark
                                ? 'hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
                                : 'hover:bg-white border-slate-200 text-slate-700 shadow-2xs cursor-pointer'
                            }`}
                            title="Previous page"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <span className="px-2 text-xs font-semibold">
                            Page <strong className={isDark ? 'text-white' : 'text-slate-900'}>{gpsTelemetryPage}</strong> of{' '}
                            <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalGpsTelemetryPages}</strong>
                          </span>

                          <button
                            type="button"
                            onClick={() => setGpsTelemetryPage((p) => Math.min(totalGpsTelemetryPages, p + 1))}
                            disabled={gpsTelemetryPage >= totalGpsTelemetryPages}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                              gpsTelemetryPage >= totalGpsTelemetryPages
                                ? 'opacity-40 cursor-not-allowed border-transparent'
                                : isDark
                                ? 'hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
                                : 'hover:bg-white border-slate-200 text-slate-700 shadow-2xs cursor-pointer'
                            }`}
                            title="Next page"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* CREATE CUSTOM ROLE MODAL */}
          <Modal isOpen={isNewRoleModalOpen} onClose={() => setIsNewRoleModalOpen(false)}>
            {isNewRoleModalOpen && (
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
            )}
          </Modal>

          {/* CONFIGURE GPS INTEGRATION MODAL */}
          <Modal isOpen={isGpsModalOpen} onClose={() => setIsGpsModalOpen(false)}>
            {isGpsModalOpen && (
              <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl border p-6 z-10 space-y-4 ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-blue-600 dark:text-cyan-400 animate-pulse" />
                    <div>
                      <h3 className="text-base font-bold">
                        {editingGpsId ? 'Edit GPS Provider Integration' : 'Connect GPS Telematics Provider'}
                      </h3>
                      <span className="text-[11px] text-slate-400">Stream live vehicle positions via REST API</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGpsModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveGpsConfig} className="space-y-4">
                  {/* Select Provider */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Select Telematics Provider *</label>
                    <select
                      value={gpsForm.provider_code}
                      onChange={(e) => handleSelectGpsProvider(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {GPS_PROVIDER_TEMPLATES.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name} {t.popular ? '★ (Recommended for India)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Provider Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Integration Label / Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WheelsEye Fleet GPS"
                      value={gpsForm.provider_name}
                      onChange={(e) => setGpsForm({ ...gpsForm, provider_name: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* API Key / Token */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold">API Key / Access Token {editingGpsId ? '' : '*'}</label>
                      {editingGpsId && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Saved & Protected
                        </span>
                      )}
                      {!editingGpsId && (
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showApiKey ? 'Hide Key' : 'Show Key'}</span>
                        </button>
                      )}
                    </div>

                    {editingGpsId && (gpsForm.saved_key_preview || gpsForm.api_key) && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 min-w-0">
                          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Saved Token:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {maskApiKey(gpsForm.saved_key_preview || gpsForm.api_key)}
                          </span>
                        </div>
                      </div>
                    )}

                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required={!editingGpsId}
                      placeholder={
                        editingGpsId
                          ? 'Leave blank to keep existing key, or enter new key to replace'
                          : (GPS_PROVIDER_TEMPLATES.find((t) => t.code === gpsForm.provider_code)?.keyPlaceholder || 'Enter API Key or Access Token')
                      }
                      value={gpsForm.api_key}
                      onChange={(e) => setGpsForm({ ...gpsForm, api_key: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 block">
                      {editingGpsId
                        ? 'Token is encrypted and safely stored. Only type here if you wish to replace your credentials.'
                        : "Obtained from your GPS provider's developer console or account manager."}
                    </span>
                  </div>

                  {/* Base URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">API Gateway Base URL</label>
                    <input
                      type="text"
                      placeholder="https://api.wheelseye.com/v1"
                      value={gpsForm.base_url}
                      onChange={(e) => setGpsForm({ ...gpsForm, base_url: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Sync Interval & Active Switch */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold">Auto-Sync Interval</label>
                      <select
                        value={gpsForm.sync_interval_mins}
                        onChange={(e) => setGpsForm({ ...gpsForm, sync_interval_mins: parseInt(e.target.value, 10) || 5 })}
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value={1}>Every 1 Minute (Live Streaming)</option>
                        <option value={2}>Every 2 Minutes (High Precision)</option>
                        <option value={5}>Every 5 Minutes (Standard)</option>
                        <option value={10}>Every 10 Minutes</option>
                        <option value={15}>Every 15 Minutes</option>
                        <option value={30}>Every 30 Minutes</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold">Integration Status</label>
                      <div className="flex items-center h-[38px]">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={gpsForm.is_active}
                            onChange={(e) => setGpsForm({ ...gpsForm, is_active: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                          />
                          <span>Active / Enable Sync</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Test Connection Inline Alert */}
                  {gpsTestResult && (
                    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      gpsTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {gpsTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{gpsTestResult.success ? 'Success' : 'Test Failed'}</div>
                        <p className="text-[11px] mt-0.5">{gpsTestResult.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleTestGpsConnection}
                      disabled={isTestingGps}
                      className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-400 ${isTestingGps ? 'animate-bounce' : ''}`} />
                      <span>{isTestingGps ? 'Testing API...' : 'Test Connection'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsGpsModalOpen(false)}
                        className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                          isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? 'Saving...' : editingGpsId ? 'Update Settings' : 'Save & Connect'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* Official Printable UPI Counter Standee Modal */}
          <Modal
            isOpen={showStandeePrintModal}
            onClose={() => setShowStandeePrintModal(false)}
          >
            {showStandeePrintModal && (
              <div className={`relative w-full max-w-md rounded-3xl shadow-2xl border p-5 sm:p-6 z-10 space-y-4 transition-colors ${
                isDark ? 'bg-[#0D1527] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <QrCode className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Official Payment Standee Preview
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Counter QR display for customer UPI settlements
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStandeePrintModal(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Standee Card Ready for Print */}
                <div
                  id="printable-standee-card"
                  className={`mx-auto w-full max-w-[320px] rounded-2xl border-2 p-5 flex flex-col items-center text-center shadow-lg relative overflow-hidden transition-all print:bg-white print:text-slate-900 print:border-slate-900 ${
                    isDark
                      ? 'bg-[#090E1A] border-teal-500/30 text-white shadow-teal-500/5'
                      : 'bg-white border-teal-600/30 text-slate-900 shadow-slate-200'
                  }`}
                >
                  {/* Top Merchant Header Banner */}
                  <div className="w-full pb-2.5 border-b border-slate-200 dark:border-slate-800 print:border-slate-900 mb-2.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>BHIM UPI OFFICIAL MERCHANT</span>
                    </div>
                    <h2 className="text-sm font-black uppercase text-slate-950 dark:text-white print:text-slate-950 mt-0.5 leading-tight truncate">
                      {brandingForm.businessName || tenantOrgName || 'Official Transport Merchant'}
                    </h2>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-500 font-semibold uppercase tracking-wider truncate">
                      {brandingForm.tagline || 'Logistics & Cargo Transport Services'}
                    </p>
                  </div>

                  <div className="text-[11px] font-black text-slate-900 dark:text-slate-100 print:text-slate-950 uppercase tracking-wide">
                    SCAN &amp; PAY WITH ANY UPI APP
                  </div>

                  {/* QR Code Frame with Live Fallback */}
                  <div className="my-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-900 bg-white shadow-xs">
                    <img
                      src={getLiveUpiQrSrc()}
                      alt="UPI Counter Standee QR"
                      className="w-[170px] h-[170px] object-contain rounded-md"
                    />
                  </div>

                  {/* Payee Info */}
                  <div className="w-full space-y-1 mb-2.5">
                    <div
                      onClick={handleCopyUpiVpa}
                      className="inline-flex items-center justify-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer max-w-full truncate bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 print:bg-slate-100 print:text-slate-900 print:border-slate-300"
                      title="Click to copy UPI ID"
                    >
                      <span className="truncate">{bankGstForm.upiId || `${tenantHandle}@upi`}</span>
                      <Copy className="w-3 h-3 shrink-0 opacity-70" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 print:text-slate-700 truncate">
                      Payee: {bankGstForm.accountHolderName || tenantOrgName || 'Official Payee Entity'}
                    </div>
                    {upiPreviewAmount ? (
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 print:text-emerald-700 pt-0.5">
                        Amount: ₹{upiPreviewAmount}
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                        Accepted for Freight, Doorstep &amp; Counter Deliveries
                      </div>
                    )}
                  </div>

                  {/* Direct Bank Remittance Trust Footer */}
                  <div className="w-full pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 print:border-slate-300 text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-600 space-y-0.5 text-left">
                    <div className="flex justify-between font-semibold">
                      <span>Direct Deposit:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 print:text-slate-900 truncate ml-1">{bankGstForm.bankName || 'HDFC Bank'}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>A/C No:</span>
                      <span>{bankGstForm.accountNumber || '••••••••'}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>IFSC:</span>
                      <span>{bankGstForm.ifscCode || '••••••'}</span>
                    </div>
                  </div>

                  {/* Accepted Payment Apps Badges */}
                  <div className="w-full pt-2 mt-1.5 border-t border-slate-200 dark:border-slate-800 print:border-slate-900 flex items-center justify-around text-[9px] font-black text-slate-700 dark:text-slate-300 print:text-slate-800">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-slate-100">GPay</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-slate-100">PhonePe</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-slate-100">Paytm</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-slate-100">BHIM</span>
                  </div>
                </div>

                {/* Modal Action Buttons: Responsive Single Row */}
                <div className="flex items-center gap-1.5 sm:gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleCopyUpiVpa}
                    title="Copy UPI VPA"
                    className={`flex-1 min-w-0 py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {copiedUpiVpa ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <span className="truncate">{copiedUpiVpa ? 'Copied' : 'Copy VPA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadUpiQr}
                    title="Save PNG Image"
                    className={`flex-1 min-w-0 py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Save PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowStandeePrintModal(false)}
                    className={`py-2 px-3 rounded-xl border text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                      isDark
                        ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>Close</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                    title="Print Counter Standee"
                    className="flex-[1.2] min-w-0 py-2 px-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 hover:from-teal-500 hover:to-emerald-500 text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Print Standee</span>
                  </button>
                </div>
              </div>
            )}
          </Modal>

        </main>
      </div>
    </div>
  );
}
