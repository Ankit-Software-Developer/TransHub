// frontend/app/(owner)/branches/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import LoadingState from '../../../components/ui/LoadingState';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import api from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import {
  Warehouse,
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  Layers,
  ArrowRight,
  Truck,
  Sparkles,
  AlertTriangle,
  X,
  RefreshCw,
  Share2,
  Loader2,
  Check,
  Settings
} from 'lucide-react';
import Link from 'next/link';

export default function BranchesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canCreateBranch, canEditBranch, canDeleteBranch, canViewBranch, isAdmin } = usePermissions();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'HEAD_OFFICE' | 'HUB' | 'BRANCH'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Helper to determine if a branch is Head Office / HQ
  const isHeadOfficeBranch = (b) => {
    if (!b) return false;
    if (b.is_head_office === true || b.is_head_office === 1 || b.is_head_office === 'true') return true;
    const code = (b.branch_code || '').trim().toUpperCase();
    if (code === 'BHQ' || code === 'HQ' || code.endsWith('HQ')) return true;
    const name = (b.branch_name || '').trim().toLowerCase();
    if (name.includes('head office') || name.includes('corporate hq') || name.includes('central hq')) return true;
    return false;
  };

  // Form State
  const initialForm = {
    branch_name: '',
    branch_code: '',
    facility_type: 'BRANCH', // 'HEAD_OFFICE' | 'HUB' | 'BRANCH'
    is_hub: false,
    is_head_office: false,
    city: '',
    state: '',
    pincode: '',
    address: '',
    phone: '',
    email: '',
    is_active: true,
    max_customer_credit_limit: 1000000,
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch branches from API
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/branches?all=true');
      if (res.data?.success) {
        setBranches(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load branches', err);
    } finally {
      setLoading(false);
    }
  };

  const [companyPrefix, setCompanyPrefix] = useState('B');
  const [customPrefix, setCustomPrefix] = useState('');
  const [userEditedCode, setUserEditedCode] = useState(false);

  const fetchConfiguredPrefix = async () => {
    try {
      const res = await api.get('/organizations/branch-series');
      if (res.data?.success && res.data.data?.prefix) {
        setCompanyPrefix(res.data.data.prefix);
      }
    } catch (err) {
      console.warn('Could not load company branch prefix', err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchConfiguredPrefix();
  }, []);

  // Helper to extract a 3-letter area code from branch name or city
  const extractAreaSnippet = (name, city) => {
    const raw = (name || city || '').trim().replace(/[^a-zA-Z\s]/g, '');
    const words = raw.split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const ignore = ['BRANCH', 'HUB', 'DEPOT', 'TERMINAL', 'GODOWN', 'OFFICE', 'STATION', 'CARGO', 'HEAD'];
    const meaningful = words.filter((w) => !ignore.includes(w.toUpperCase()));
    const targetWord = meaningful.length > 0 ? meaningful[0] : words[0];
    return targetWord.slice(0, 3).toUpperCase();
  };

  // Helper to compute standard branch code: [CompanyPrefix] + [AreaSnippet] + [B/H/HQ Suffix]
  const computeBranchCode = (name, city, facilityTypeOrIsHub, prefix = companyPrefix) => {
    const activePrefix = (prefix || 'B').trim().toUpperCase();
    if (facilityTypeOrIsHub === 'HEAD_OFFICE') {
      return `${activePrefix}HQ`;
    }
    const isHub = facilityTypeOrIsHub === 'HUB' || facilityTypeOrIsHub === true;
    const snippet = extractAreaSnippet(name, city);
    if (!snippet) return '';
    const suffix = isHub ? 'H' : 'B';
    return `${activePrefix}${snippet}${suffix}`;
  };

  const isCodeDuplicate = useMemo(() => {
    if (!formData.branch_code || !formData.branch_code.trim()) return false;
    const clean = formData.branch_code.trim().toUpperCase();
    return branches.some(
      (b) => b.branch_code?.toUpperCase() === clean && b.id !== editingBranch?.id
    );
  }, [formData.branch_code, branches, editingBranch]);

  const suggestedSnippets = useMemo(() => {
    const activePrefix = (companyPrefix || 'B').trim().toUpperCase();
    if (formData.facility_type === 'HEAD_OFFICE') {
      return [`${activePrefix}HQ`, 'HQ', `${activePrefix}-HQ`];
    }
    const area = extractAreaSnippet(formData.branch_name, formData.city);
    if (!area) return [];
    const suffix = formData.facility_type === 'HUB' ? 'H' : 'B';
    const base = `${activePrefix}${area}${suffix}`;
    const pin = (formData.pincode || '').slice(0, 6);
    const list = [base, `${base}-01`];
    if (pin && pin.length >= 4) {
      list.push(`${base}-${pin}`);
    }
    return list;
  }, [companyPrefix, formData.branch_name, formData.city, formData.pincode, formData.facility_type]);

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState(''); // 'success' | 'not_found' | 'error' | ''

  const fetchPincodeDetails = async (pin) => {
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPincodeStatus('');
      return;
    }
    setPincodeLoading(true);
    setPincodeStatus('');
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const fetchedCity = po.District || po.Division || po.Name || '';
        const fetchedState = po.State || '';

        setFormData(prev => {
          const nextCity = fetchedCity || prev.city;
          let nextCode = prev.branch_code;
          if (!editingBranch && !userEditedCode && !prev.branch_name && nextCity) {
            nextCode = computeBranchCode('', nextCity, prev.facility_type);
          }
          return {
            ...prev,
            city: nextCity,
            state: fetchedState || prev.state,
            branch_code: nextCode,
          };
        });
        setPincodeStatus('success');
      } else {
        setPincodeStatus('not_found');
      }
    } catch (err) {
      console.warn('Pincode auto-fetch error:', err);
      setPincodeStatus('error');
    } finally {
      setPincodeLoading(false);
    }
  };

  const openCreateModal = () => {
    if (!canCreateBranch && !isAdmin) {
      alert('Only administrators have permission to register new branches.');
      return;
    }
    setEditingBranch(null);
    setFormData(initialForm);
    fetchConfiguredPrefix();
    setUserEditedCode(false);
    setCustomPrefix('');
    setModalError('');
    setPincodeStatus('');
    setIsModalOpen(true);
  };

  const openEditModal = (branch) => {
    if (!canEditBranch) return;
    const isHO = isHeadOfficeBranch(branch);
    const facilityType = isHO ? 'HEAD_OFFICE' : branch.is_hub ? 'HUB' : 'BRANCH';
    setEditingBranch(branch);
    setUserEditedCode(true);
    setFormData({
      branch_name: branch.branch_name || '',
      branch_code: branch.branch_code || '',
      facility_type: facilityType,
      is_hub: branch.is_hub ?? (facilityType === 'HUB' || facilityType === 'HEAD_OFFICE'),
      is_head_office: isHO,
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      is_active: branch.is_active ?? true,
      max_customer_credit_limit: branch.max_customer_credit_limit !== undefined && branch.max_customer_credit_limit !== null ? parseFloat(branch.max_customer_credit_limit) : 1000000,
    });
    setModalError('');
    setPincodeStatus('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingBranch && !canEditBranch) {
      setModalError('You do not have permission to edit branches or hubs');
      return;
    }
    if (!editingBranch && !canCreateBranch) {
      setModalError('You do not have permission to add new branches or hubs');
      return;
    }
    if (!formData.branch_name.trim()) {
      setModalError('Branch or Hub Name is required');
      return;
    }

    if (!formData.branch_code.trim()) {
      setModalError('Branch Code is required (e.g. DEL-01 or BLR-HUB)');
      return;
    }

    // Pincode validation: must be exactly 6 digits
    const pin = (formData.pincode || '').trim();
    if (!pin) {
      setModalError('Pincode is required');
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setModalError('Pincode must be a valid 6-digit Indian PIN code (e.g. 110020)');
      return;
    }

    if (!formData.city.trim()) {
      setModalError('City is required');
      return;
    }

    if (!formData.state.trim()) {
      setModalError('State is required');
      return;
    }

    if (!formData.address.trim()) {
      setModalError('Physical Address & Location Details is required');
      return;
    }

    // Phone validation: required and must be 10 digits
    const phone = (formData.phone || '').trim();
    if (!phone) {
      setModalError('Contact Phone is required');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setModalError('Contact Phone must be a valid 10-digit mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210)');
      return;
    }

    // Email validation: required and must be valid format
    const email = (formData.email || '').trim();
    if (!email) {
      setModalError('Contact Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setModalError('Contact Email must be a valid email format (e.g. hub@transhub.in)');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const isHO = formData.facility_type === 'HEAD_OFFICE';
      const payload = {
        ...formData,
        is_head_office: isHO,
        is_hub: isHO ? true : formData.facility_type === 'HUB',
      };
      if (editingBranch) {
        const res = await api.put(`/branches/${editingBranch.id}`, payload);
        if (res.data?.success) {
          setIsModalOpen(false);
          fetchBranches();
        }
      } else {
        const res = await api.post('/branches', payload);
        if (res.data?.success) {
          setIsModalOpen(false);
          fetchBranches();
        }
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canDeleteBranch) return;
    if (isHeadOfficeBranch(deleteTarget)) {
      alert('The Head Office is the central transport owner headquarters and cannot be deleted.');
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      const res = await api.delete(`/branches/${deleteTarget.id}`);
      if (res.data?.success) {
        setDeleteTarget(null);
        fetchBranches();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete branch');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const isHO = isHeadOfficeBranch(b);
      if (typeFilter === 'HEAD_OFFICE' && !isHO) return false;
      if (typeFilter === 'HUB' && (!b.is_hub || isHO)) return false;
      if (typeFilter === 'BRANCH' && (b.is_hub || isHO)) return false;
      if (statusFilter === 'ACTIVE' && !b.is_active) return false;
      if (statusFilter === 'INACTIVE' && b.is_active) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (b.branch_name || '').toLowerCase().includes(q);
        const matchesCode = (b.branch_code || '').toLowerCase().includes(q);
        const matchesCity = (b.city || '').toLowerCase().includes(q);
        const matchesState = (b.state || '').toLowerCase().includes(q);
        const matchesPincode = (b.pincode || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCity && !matchesState && !matchesPincode) {
          return false;
        }
      }
      return true;
    });
  }, [branches, search, typeFilter, statusFilter]);

  // Statistics
  const totalCount = branches.length;
  const headOfficeCount = branches.filter((b) => isHeadOfficeBranch(b)).length;
  const hubsCount = branches.filter((b) => b.is_hub && !isHeadOfficeBranch(b)).length;
  const branchesCount = branches.filter((b) => !b.is_hub && !isHeadOfficeBranch(b)).length;
  const activeCount = branches.filter((b) => b.is_active).length;

  if (!canViewBranch) {
    return (
      <div className={`flex min-h-screen ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'} font-sans`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-4 ${
              isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold">Access Denied</h2>
              <p className="text-xs text-slate-400">
                You do not have permission to view Branches & Logistics Hubs. Please contact your organization administrator.
              </p>
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
          
          {/* Header Action Bar */}
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2.5">
                <Warehouse className="w-6 h-6 text-blue-600 dark:text-cyan-400 shrink-0" />
                <h1 className={`text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Branches & Logistics Hubs
                </h1>
              </div>
              <p className={`text-xs lg:text-[13px] xl:text-sm mt-0.5 sm:mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure booking stations, transshipment hubs, and delivery pin-code coverage for consignments.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                onClick={fetchBranches}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all shrink-0 ${
                  isDark 
                    ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
                title="Refresh branches list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? (isDark ? 'animate-spin text-cyan-400' : 'animate-spin text-blue-600') : ''}`} />
              </button>

              {canCreateBranch && (
                <button
                  onClick={openCreateModal}
                  className="flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Add Branch / Hub</span>
                </button>
              )}
            </div>
          </div>

          {/* Operational KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Facilities</div>
              <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalCount}</div>
              <div className="text-[10px] text-blue-500 dark:text-cyan-400 mt-1 font-semibold">Active operational network</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#120f26]/90 border-purple-500/30' : 'bg-purple-50/50 border-purple-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                <span>🏛️</span>
                <span>Head Office</span>
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-300 font-mono">{headOfficeCount}</div>
              <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-1 font-semibold">Admin & Owner HQ</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Transshipment Hubs</div>
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{hubsCount}</div>
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Major cross-dock centers</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Booking Branches</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{branchesCount}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-1 font-semibold">Local delivery godowns</div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by hub name, code, city, pincode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center rounded-xl p-1 border text-xs font-semibold gap-1">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    typeFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Types ({totalCount})
                </button>
                <button
                  onClick={() => setTypeFilter('HEAD_OFFICE')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    typeFilter === 'HEAD_OFFICE'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-700 hover:text-purple-900'
                  }`}
                >
                  <span>🏛️</span>
                  <span>Head Office ({headOfficeCount})</span>
                </button>
                <button
                  onClick={() => setTypeFilter('HUB')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    typeFilter === 'HUB'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hubs ({hubsCount})
                </button>
                <button
                  onClick={() => setTypeFilter('BRANCH')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    typeFilter === 'BRANCH'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Branches ({branchesCount})
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                  isDark
                    ? 'border-slate-800 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Locations Grid */}
          {loading ? (
            <LoadingState
              title="Loading branches & logistics hubs..."
              description="Fetching terminal facilities, contacts, and origin routing network"
              minHeight="min-h-[280px]"
            />
          ) : filteredBranches.length === 0 ? (
            <div className={`p-12 rounded-3xl border text-center flex flex-col items-center justify-center ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-900 flex items-center justify-center mb-4">
                <Warehouse className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {search ? 'No matching branches or hubs found' : 'No branches configured yet'}
              </h3>
              <p className={`text-xs max-w-sm mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {search 
                  ? 'Try adjusting your search criteria or filter tags.' 
                  : 'Add your primary transshipment hub and branch offices with pincodes to start creating bilties and line-haul dispatches.'}
              </p>
              {!search && canCreateBranch && (
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30"
                >
                  + Add Your First Branch / Hub
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filteredBranches.map((branch) => {
                const isHO = isHeadOfficeBranch(branch);
                return (
                <div
                  key={branch.id}
                  className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                    isHO
                      ? isDark
                        ? 'bg-[#0f1227]/95 border-purple-500/40 shadow-lg shadow-purple-950/20 ring-1 ring-purple-500/20 hover:border-purple-500/60'
                        : 'bg-white border-purple-300 shadow-md ring-1 ring-purple-400/20 hover:border-purple-400 hover:shadow-lg'
                      : isDark
                        ? 'bg-[#0B1020]/90 border-slate-800/90 hover:border-slate-700'
                        : 'bg-white border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200'
                  }`}
                >
                  <div>
                    {/* Top Row: Code, Type Badge, Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${
                          isHO
                            ? isDark ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-xs' : 'bg-purple-50 border-purple-300 text-purple-900'
                            : branch.is_hub
                            ? isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                            : isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                          {branch.branch_code}
                        </span>

                        {isHO ? (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs ${
                            isDark ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50' : 'bg-purple-100 text-purple-900 border border-purple-300'
                          }`}>
                            <span>🏛️</span>
                            <span>HEAD OFFICE</span>
                          </span>
                        ) : branch.is_hub ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            TRANSSHIPMENT HUB
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            BRANCH GODOWN
                          </span>
                        )}
                      </div>

                      <span className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        branch.is_active
                          ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{branch.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </div>

                    {/* Head Office Admin Sub-Badge */}
                    {isHO && (
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-400 mb-1.5 tracking-wide">
                        <span>👑</span>
                        <span>Admin & Transport Owner Base</span>
                      </div>
                    )}

                    {/* Branch Title & City */}
                    <h3 className={`text-base font-bold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {branch.branch_name}
                    </h3>

                    {/* Location & Pincode */}
                    <div className="flex items-center space-x-1.5 mt-2 text-xs font-semibold text-blue-600 dark:text-cyan-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{branch.city}, {branch.state} {branch.pincode ? `• PIN: ${branch.pincode}` : ''}</span>
                    </div>

                    {/* Full Address */}
                    {branch.address && (
                      <p className={`text-xs mt-2 leading-relaxed line-clamp-2 ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {branch.address}
                      </p>
                    )}

                    {/* Contact details */}
                    <div className={`mt-3 pt-3 border-t text-xs space-y-1.5 ${
                      isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-600'
                    }`}>
                      {branch.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{branch.phone}</span>
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{branch.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Branch Manager TBB Authorization Limit Badge */}
                    <div className={`mt-3 p-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                      isHO
                        ? isDark ? 'bg-purple-950/30 border-purple-500/30' : 'bg-purple-50/70 border-purple-200'
                        : isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                          isHO ? (isDark ? 'text-purple-300' : 'text-purple-700') : 'text-slate-400'
                        }`}>
                          {isHO ? 'HQ TBB Authorization' : 'Branch TBB Cap Limit'}
                        </span>
                        <span className={`font-mono font-bold ${
                          isHO ? (isDark ? 'text-purple-300' : 'text-purple-800') : 'text-amber-500'
                        }`}>
                          {isHO ? 'Full HO Authority (₹50L+)' : `₹${Number(branch.max_customer_credit_limit || 1000000).toLocaleString('en-IN')}`}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isHO
                          ? isDark ? 'bg-purple-500/25 text-purple-200 border-purple-500/40' : 'bg-purple-100 text-purple-900 border-purple-300'
                          : Number(branch.max_customer_credit_limit || 1000000) > 1000000
                          ? isDark ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                          : isDark ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {isHO ? '🏛️ Admin Authority' : Number(branch.max_customer_credit_limit || 1000000) > 1000000 ? '⚡ Increased Cap' : 'Default ₹10L Cap'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
                    isDark ? 'border-slate-800/80' : 'border-slate-100'
                  }`}>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ID: {branch.id?.slice(0, 8)}...
                    </span>

                    {(canEditBranch || canDeleteBranch) ? (
                      <div className="flex items-center space-x-2">
                        {canEditBranch && (
                          <button
                            onClick={() => openEditModal(branch)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              isDark
                                ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                            title="Edit Branch / Hub"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDeleteBranch && !isHO && (
                          <button
                            onClick={() => setDeleteTarget(branch)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              isDark
                                ? 'border-rose-950/60 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40'
                                : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                            }`}
                            title="Delete Branch / Hub"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDeleteBranch && isHO && (
                          <span
                            className={`p-1.5 rounded-lg border text-xs opacity-50 cursor-not-allowed ${
                              isDark ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                            title="Primary Head Office cannot be deleted"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                        isDark ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}>
                        View only
                      </span>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {/* Add / Edit Dialog Modal */}
          <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)}>
            {isModalOpen && (
              <div className={`relative w-full max-w-xl max-h-[90vh] my-auto overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-8 z-10 transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">
                        {editingBranch ? 'Edit Branch / Hub' : 'Add New Branch or Hub'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Specify pincode, address, city, and classification.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {modalError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Facility Type Selector */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Facility Classification</span>
                      <span className="text-rose-500 font-bold ml-0.5">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. Head Office (HQ) */}
                      <div
                        onClick={() => {
                          setFormData((prev) => {
                            let newCode = prev.branch_code || '';
                            if (!editingBranch) {
                              if (!userEditedCode) {
                                newCode = computeBranchCode(prev.branch_name, prev.city, 'HEAD_OFFICE');
                              } else if (!newCode.endsWith('HQ')) {
                                newCode = (companyPrefix || 'B') + 'HQ';
                              }
                            }
                            return {
                              ...prev,
                              facility_type: 'HEAD_OFFICE',
                              is_head_office: true,
                              is_hub: true,
                              branch_code: newCode,
                            };
                          });
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          formData.facility_type === 'HEAD_OFFICE'
                            ? isDark 
                              ? 'bg-purple-950/40 border-purple-400 shadow-md shadow-purple-950/20 ring-1 ring-purple-400' 
                              : 'bg-purple-50/80 border-purple-500 shadow-xs ring-1 ring-purple-500'
                            : isDark ? 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">🏛️</span>
                          <span className={`text-xs font-bold ${formData.facility_type === 'HEAD_OFFICE' ? (isDark ? 'text-purple-300' : 'text-purple-950') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                            Head Office (HQ)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Admin & owner headquarters
                        </div>
                      </div>

                      {/* 2. Transshipment Hub */}
                      <div
                        onClick={() => {
                          setFormData((prev) => {
                            let newCode = prev.branch_code || '';
                            if (!editingBranch) {
                              if (!userEditedCode) {
                                newCode = computeBranchCode(prev.branch_name, prev.city, 'HUB');
                              } else if (newCode.endsWith('B') || newCode.endsWith('HQ')) {
                                newCode = newCode.replace(/(HQ|B)$/, '') + 'H';
                              }
                            }
                            return {
                              ...prev,
                              facility_type: 'HUB',
                              is_head_office: false,
                              is_hub: true,
                              branch_code: newCode,
                            };
                          });
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          formData.facility_type === 'HUB'
                            ? isDark 
                              ? 'bg-amber-950/40 border-amber-400 shadow-md shadow-amber-950/20 ring-1 ring-amber-400' 
                              : 'bg-amber-50/80 border-amber-500 shadow-xs ring-1 ring-amber-500'
                            : isDark ? 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Warehouse className={`w-4 h-4 ${formData.facility_type === 'HUB' ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${formData.facility_type === 'HUB' ? (isDark ? 'text-amber-300' : 'text-amber-950') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                            Transshipment Hub
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Cross-dock sorting hub
                        </div>
                      </div>

                      {/* 3. Branch Godown */}
                      <div
                        onClick={() => {
                          setFormData((prev) => {
                            let newCode = prev.branch_code || '';
                            if (!editingBranch) {
                              if (!userEditedCode) {
                                newCode = computeBranchCode(prev.branch_name, prev.city, 'BRANCH');
                              } else if (newCode.endsWith('H') || newCode.endsWith('HQ')) {
                                newCode = newCode.replace(/(HQ|H)$/, '') + 'B';
                              }
                            }
                            return {
                              ...prev,
                              facility_type: 'BRANCH',
                              is_head_office: false,
                              is_hub: false,
                              branch_code: newCode,
                            };
                          });
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          formData.facility_type === 'BRANCH'
                            ? isDark 
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/20' 
                              : 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500'
                            : isDark ? 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className={`w-4 h-4 ${formData.facility_type === 'BRANCH' ? (isDark ? 'text-cyan-400' : 'text-blue-600') : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${formData.facility_type === 'BRANCH' ? (isDark ? 'text-cyan-300' : 'text-blue-950') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                            Branch Godown
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Local booking & delivery
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row: Branch Name & Branch Code Side-by-Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Branch / Hub Name */}
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="flex items-center">
                          <span>Branch / Hub Name</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          e.g. Okhla Godown
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Okhla Godown"
                        value={formData.branch_name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setFormData((prev) => {
                            const updated = { ...prev, branch_name: newName };
                            // If code not manually overridden, auto-compute with suffix B, H, or HQ
                            if (!editingBranch && !userEditedCode) {
                              updated.branch_code = computeBranchCode(newName, prev.city, prev.facility_type);
                            }
                            return updated;
                          });
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-hidden transition-colors ${
                          isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                    </div>

                    {/* Branch Code (Mandatory & Unique) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Branch Code</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>

                        {/* Uniqueness status */}
                        {isCodeDuplicate ? (
                          <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Code taken</span>
                          </span>
                        ) : formData.branch_code && formData.branch_code.trim().length >= 2 ? (
                          <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                            <Check className="w-3 h-3 shrink-0" />
                            <span>Unique & Valid</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {formData.is_hub ? 'e.g. BOKHH, BMUMH' : 'e.g. BOKHB, BMUMB'}
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder={formData.is_hub ? "e.g. BOKHH, BMUMH" : "e.g. BOKHB, BMUMB"}
                          value={formData.branch_code}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                            if (!val) {
                              setUserEditedCode(false);
                            } else {
                              setUserEditedCode(true);
                            }
                            setFormData({ ...formData, branch_code: val });
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider focus:outline-hidden transition-colors ${
                            isCodeDuplicate
                              ? 'border-rose-500 bg-rose-50/20 text-rose-700 dark:text-rose-400'
                              : isDark
                              ? 'border-slate-800 bg-slate-900/80 text-cyan-300 focus:border-cyan-400'
                              : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pincode, City, State Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Pincode</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        {pincodeLoading && (
                          <span className="text-[10px] text-cyan-500 font-semibold flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Fetching...</span>
                          </span>
                        )}
                        {!pincodeLoading && pincodeStatus === 'success' && (
                          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            <span>Auto-filled</span>
                          </span>
                        )}
                        {!pincodeLoading && pincodeStatus === 'not_found' && (
                          <span className="text-[10px] text-amber-500 font-medium">
                            Not found
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 110020"
                        value={formData.pincode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setFormData(prev => ({ ...prev, pincode: digits }));
                          if (digits.length === 6) {
                            fetchPincodeDetails(digits);
                          } else {
                            setPincodeStatus('');
                          }
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider focus:outline-none transition-colors ${
                          formData.pincode && formData.pincode.length > 0 && formData.pincode.length !== 6
                            ? 'border-amber-500 focus:border-amber-500'
                            : isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                      {formData.pincode && formData.pincode.length > 0 && formData.pincode.length !== 6 && (
                        <span className="text-[10px] text-amber-500 block">
                          Must be exactly 6 digits ({formData.pincode.length}/6)
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>City</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. New Delhi"
                        value={formData.city}
                        onChange={(e) => {
                          const newCity = e.target.value;
                          setFormData((prev) => {
                            let nextCode = prev.branch_code;
                            if (!editingBranch && !userEditedCode && !prev.branch_name) {
                              nextCode = computeBranchCode('', newCity, prev.is_hub);
                            }
                            return { ...prev, city: newCity, branch_code: nextCode };
                          });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>State</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delhi"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Physical Address / Location */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Physical Address & Location Details</span>
                      <span className="text-rose-500 font-bold ml-0.5">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Shed No. 14, Sanjay Gandhi Transport Nagar, GT Karnal Road"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors resize-none ${
                        isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Contact Phone</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formData.phone ? `${formData.phone.length}/10 digits` : '10 digits'}
                        </span>
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone: digits });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${
                          formData.phone && formData.phone.length > 0 && !/^[6-9]\d{9}$/.test(formData.phone)
                            ? 'border-rose-500 focus:border-rose-500'
                            : isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                      {formData.phone && formData.phone.length > 0 && !/^[6-9]\d{9}$/.test(formData.phone) && (
                        <span className="text-[10px] text-rose-500 block">
                          Must be a 10-digit mobile number starting with 6, 7, 8, or 9
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Contact Email</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. delhi.hub@transhub.in"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          formData.email && formData.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
                            ? 'border-rose-500 focus:border-rose-500'
                            : isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                      {formData.email && formData.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                        <span className="text-[10px] text-rose-500 block">
                          Enter a valid email address (e.g. name@domain.com)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Branch Manager TBB Authorization Limit (Admin Configured) */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <span>Branch Manager TBB Credit Limit (₹)</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            isAdmin
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isAdmin ? '🏛️ Admin Authority' : '🔒 HO Locked'}
                          </span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Branch Managers at this branch can authorize TBB customer freight contracts up to this limit.
                        </p>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">₹</span>
                          <input
                            type="number"
                            min="100000"
                            step="100000"
                            value={formData.max_customer_credit_limit || 1000000}
                            onChange={(e) => setFormData({ ...formData, max_customer_credit_limit: parseFloat(e.target.value) || 0 })}
                            className={`w-full pl-8 pr-3.5 py-2 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                              isDark
                                ? 'border-slate-800 bg-slate-900 text-amber-400 focus:border-amber-500'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>
                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-semibold">Admin Presets:</span>
                          {[
                            { label: '₹10 Lakh (Standard)', val: 1000000 },
                            { label: '₹20 Lakh', val: 2000000 },
                            { label: '₹30 Lakh', val: 3000000 },
                            { label: '₹50 Lakh', val: 5000000 },
                          ].map((p) => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => setFormData({ ...formData, max_customer_credit_limit: p.val })}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                Number(formData.max_customer_credit_limit) === p.val
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                  : isDark
                                  ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-cyan-500 dark:text-cyan-400">
                          💡 When a branch manager requests higher credit authority (e.g. for high-volume industrial hubs), Admin can increase this branch limit here.
                        </p>
                      </div>
                    ) : (
                      <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-400">Authorized Cap:</span>
                          <span className="font-mono font-bold text-amber-500">
                            ₹{Number(formData.max_customer_credit_limit || 1000000).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">
                          Contact Head Office / Admin to request limit increase
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active Toggle */}
                  <div className="pt-2 flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="branch_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <label htmlFor="branch_active" className={`text-xs font-semibold cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Active & operational for bookings, dispatches and bilty generation
                    </label>
                  </div>

                  {/* Actions Buttons */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setIsModalOpen(false)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        isDark 
                          ? 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : editingBranch ? 'Update Facility' : 'Save Facility'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal isOpen={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
            {deleteTarget && (
              <div className={`relative w-full max-w-md my-auto rounded-3xl border shadow-2xl p-6 z-10 ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>

                <h3 className="text-base font-bold mb-1">
                  Delete {deleteTarget.is_hub ? 'Hub' : 'Branch'}?
                </h3>
                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">{deleteTarget.branch_name}</span> ({deleteTarget.branch_code})? If this branch is linked to existing consignments, you will be advised to mark it inactive instead.
                </p>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleting}
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
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
