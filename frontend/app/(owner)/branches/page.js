// frontend/app/(owner)/branches/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import LoadingState from '../../../components/ui/LoadingState';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import api from '../../../services/api';
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
  Check
} from 'lucide-react';

export default function BranchesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canCreateBranch, canEditBranch, canDeleteBranch, canViewBranch, isAdmin } = usePermissions();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'HUB' | 'BRANCH'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const initialForm = {
    branch_name: '',
    branch_code: '',
    is_hub: false,
    city: '',
    state: '',
    pincode: '',
    address: '',
    phone: '',
    email: '',
    is_active: true,
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

  useEffect(() => {
    fetchBranches();
  }, []);

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

        setFormData(prev => ({
          ...prev,
          city: fetchedCity || prev.city,
          state: fetchedState || prev.state,
        }));
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
    if (!canCreateBranch) return;
    setEditingBranch(null);
    setFormData(initialForm);
    setModalError('');
    setPincodeStatus('');
    setIsModalOpen(true);
  };

  const openEditModal = (branch) => {
    if (!canEditBranch) return;
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name || '',
      branch_code: branch.branch_code || '',
      is_hub: branch.is_hub ?? false,
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      is_active: branch.is_active ?? true,
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
      if (editingBranch) {
        const res = await api.put(`/branches/${editingBranch.id}`, formData);
        if (res.data?.success) {
          setIsModalOpen(false);
          fetchBranches();
        }
      } else {
        const res = await api.post('/branches', formData);
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
      if (typeFilter === 'HUB' && !b.is_hub) return false;
      if (typeFilter === 'BRANCH' && b.is_hub) return false;
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
  const hubsCount = branches.filter((b) => b.is_hub).length;
  const branchesCount = totalCount - hubsCount;
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

        <main className="flex-1 p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <Warehouse className="w-6 h-6 text-blue-600 dark:text-cyan-400" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Branches & Logistics Hubs
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure booking stations, transshipment hubs, and delivery pin-code coverage for consignments.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchBranches}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
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
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Branch / Hub</span>
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

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Active Status</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">{activeCount} / {totalCount}</div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400/80 mt-1 font-semibold">Ready for Bilty & Trips</div>
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
                  All Types
                </button>
                <button
                  onClick={() => setTypeFilter('HUB')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    typeFilter === 'HUB'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hubs Only
                </button>
                <button
                  onClick={() => setTypeFilter('BRANCH')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    typeFilter === 'BRANCH'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Branches Only
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
              {filteredBranches.map((branch) => (
                <div
                  key={branch.id}
                  className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                    isDark
                      ? 'bg-[#0B1020]/90 border-slate-800/90 hover:border-slate-700'
                      : 'bg-white border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200'
                  }`}
                >
                  <div>
                    {/* Top Row: Code, Type Badge, Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${
                          branch.is_hub
                            ? isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                            : isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                          {branch.branch_code}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          branch.is_hub
                            ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
                            : isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {branch.is_hub ? 'TRANSSHIPMENT HUB' : 'BRANCH GODOWN'}
                        </span>
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

                        {canDeleteBranch && (
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
              ))}
            </div>
          )}

          {/* Add / Edit Dialog Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
              <div 
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
                onClick={() => !submitting && setIsModalOpen(false)} 
              />

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
                    <div className="grid grid-cols-2 gap-3">
                      {/* 1. Branch Godown First */}
                      <div
                        onClick={() => setFormData({ ...formData, is_hub: false })}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                          !formData.is_hub
                            ? isDark 
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/20' 
                              : 'bg-blue-50 border-blue-500 shadow-xs'
                            : isDark ? 'bg-slate-900/60 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-70'
                        }`}
                      >
                        <Building2 className={`w-5 h-5 ${!formData.is_hub ? (isDark ? 'text-cyan-400' : 'text-blue-600') : 'text-slate-400'}`} />
                        <div>
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Branch Godown
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Local booking & delivery
                          </div>
                        </div>
                      </div>

                      {/* 2. Transshipment Hub Next */}
                      <div
                        onClick={() => setFormData({ ...formData, is_hub: true })}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                          formData.is_hub
                            ? isDark 
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/20' 
                              : 'bg-blue-50 border-blue-500 shadow-xs'
                            : isDark ? 'bg-slate-900/60 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-70'
                        }`}
                      >
                        <Warehouse className={`w-5 h-5 ${formData.is_hub ? (isDark ? 'text-cyan-400' : 'text-blue-600') : 'text-slate-400'}`} />
                        <div>
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Transshipment Hub
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Major sorting & cross-dock
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Branch Name & Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Branch / Hub Name</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delhi Central Hub"
                        value={formData.branch_name}
                        onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Branch Code (Short identifier)</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DEL-01 or BLR-HUB"
                        value={formData.branch_code}
                        onChange={(e) => setFormData({ ...formData, branch_code: e.target.value.toUpperCase() })}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-none transition-colors ${
                          isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
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
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4">
              <div 
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" 
                onClick={() => !deleting && setDeleteTarget(null)} 
              />

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
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
