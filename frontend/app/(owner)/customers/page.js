// frontend/app/(owner)/customers/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTheme } from '../../../components/ThemeProvider';
import {
  Users,
  Plus,
  Phone,
  Building2,
  Search,
  CheckCircle2,
  MapPin,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react';

function ServingBranchDropdown({
  label = "Designated Serving Branch / Hub",
  selectedBranchId,
  onSelectBranch,
  branches = [],
  bestMatch = null,
  isDark,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const filteredBranches = useMemo(() => {
    if (!query.trim()) return branches;
    const q = query.toLowerCase().trim();
    return branches.filter((b) => {
      const name = (b.branch_name || '').toLowerCase();
      const code = (b.branch_code || '').toLowerCase();
      const city = (b.city || '').toLowerCase();
      const pin = (b.pincode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q) || pin.includes(q);
    });
  }, [branches, query]);

  const isRecommendedDifferent = bestMatch && bestMatch.branch && bestMatch.branch.id !== selectedBranchId;

  return (
    <div className={`space-y-1.5 relative ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </label>
        {bestMatch && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Recommended ({bestMatch.normalizedScore || 95}% Match)</span>
          </span>
        )}
      </div>

      {/* Recommended Switch Banner if different */}
      {isRecommendedDifferent && (
        <div className={`p-1.5 px-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
          isDark ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-200' : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0 text-[11px] truncate">
            <Sparkles className="w-3 h-3 text-blue-500 dark:text-cyan-400 shrink-0" />
            <span className="font-semibold truncate">
              Nearest: {bestMatch.branch.branch_name} ({bestMatch.branch.branch_code})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectBranch(bestMatch.branch.id)}
            className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded transition-all cursor-pointer shrink-0"
          >
            Apply
          </button>
        </div>
      )}

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer text-left ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-white hover:border-slate-700'
            : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-slate-400'
        } ${isOpen ? 'ring-2 ring-blue-500/40 border-blue-500' : ''}`}
      >
        {selectedBranch ? (
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2 text-xs truncate">
            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-bold truncate">{selectedBranch.branch_name}</span>
            <span className="font-mono text-[10px] font-bold px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              {selectedBranch.branch_code}
            </span>
            <span className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              — {selectedBranch.city} {selectedBranch.pincode ? `[${selectedBranch.pincode}]` : ''}
            </span>
            {selectedBranch.is_hub && (
              <span className="text-[9px] px-1 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                HUB
              </span>
            )}
            {bestMatch?.branch?.id === selectedBranch.id && (
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                ⭐ Nearest
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-xs">-- Auto-Select / Unassigned Serving Branch --</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {/* Dropdown Menu Popup - Opens DOWNWARDS with High Z-Index */}
      {isOpen && (
        <div className={`absolute left-0 right-0 top-full mt-1.5 z-[9999] rounded-xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-white shadow-cyan-950/40'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/40'
        }`}>
          {/* Compact Search inside dropdown */}
          <div className={`p-2 border-b flex items-center gap-2 ${
            isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search branch name, code, city or PIN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full text-xs bg-transparent focus:outline-none ${
                isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/30">
            {/* Option to clear / unassign */}
            <div
              onClick={() => {
                onSelectBranch('');
                setIsOpen(false);
              }}
              className={`py-1.5 px-3 cursor-pointer text-xs transition-colors flex items-center justify-between ${
                !selectedBranchId
                  ? isDark ? 'bg-blue-600/20 text-cyan-400 font-bold' : 'bg-blue-50 text-blue-800 font-bold'
                  : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-500'
              }`}
            >
              <span>-- Auto-Select / Unassigned --</span>
              {!selectedBranchId && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </div>

            {/* If Best Match exists, render it right at the top */}
            {bestMatch && bestMatch.branch && (!query.trim() || filteredBranches.some(b => b.id === bestMatch.branch.id)) && (
              <div
                onClick={() => {
                  onSelectBranch(bestMatch.branch.id);
                  setIsOpen(false);
                }}
                className={`py-1.5 px-3 cursor-pointer transition-colors flex items-center justify-between gap-2 border-l-2 border-l-cyan-500 ${
                  selectedBranchId === bestMatch.branch.id
                    ? isDark ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-cyan-50 text-cyan-900 font-bold'
                    : isDark ? 'bg-slate-800/40 hover:bg-slate-800 text-slate-200' : 'bg-blue-50/50 hover:bg-blue-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                  <span className="text-xs font-bold truncate">{bestMatch.branch.branch_name}</span>
                  <span className="font-mono text-[10px] font-bold px-1 rounded bg-cyan-500/20 text-cyan-400 shrink-0">
                    {bestMatch.branch.branch_code}
                  </span>
                  <span className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    — {bestMatch.branch.city} {bestMatch.branch.pincode ? `[${bestMatch.branch.pincode}]` : ''}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    ⭐ Recommended Match
                  </span>
                  {bestMatch.branch.is_hub && (
                    <span className="text-[9px] px-1 rounded font-bold bg-amber-500/20 text-amber-400 shrink-0">
                      HUB
                    </span>
                  )}
                </div>
                {selectedBranchId === bestMatch.branch.id && (
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
              </div>
            )}

            {/* List other branches */}
            {filteredBranches
              .filter(b => !bestMatch || b.id !== bestMatch.branch?.id)
              .map((b) => {
                const isSelected = selectedBranchId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelectBranch(b.id);
                      setIsOpen(false);
                    }}
                    className={`py-1.5 px-3 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? isDark ? 'bg-blue-600/20 text-cyan-300 font-bold' : 'bg-blue-50 text-blue-900 font-bold'
                        : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                      <span className="text-xs font-semibold truncate">{b.branch_name}</span>
                      <span className="font-mono text-[10px] font-bold px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        {b.branch_code}
                      </span>
                      <span className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        — {b.city} {b.pincode ? `[${b.pincode}]` : ''}
                      </span>
                      {b.is_hub && (
                        <span className="text-[9px] px-1 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                          HUB
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                  </div>
                );
              })}

            {filteredBranches.length === 0 && (
              <div className="py-3 text-center text-xs text-slate-400">
                No branch matching &quot;{query}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    canCreateCustomer,
    canEditCustomer,
    canDeleteCustomer,
    canViewCustomer,
    canExport,
    isAdmin,
  } = usePermissions();

  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Branches for smart logistics routing
  const [branches, setBranches] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [bestBranchMatch, setBestBranchMatch] = useState(null);
  const [isManualBranchSelected, setIsManualBranchSelected] = useState(false);
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const [isPinAutoFilled, setIsPinAutoFilled] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    pincode: '',
    branch_id: '',
    gstin: '',
    customer_type: 'BOTH',
    billing_address: '',
  });

  // Edit Customer States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    phone: '',
    city: '',
    pincode: '',
    branch_id: '',
    gstin: '',
    customer_type: 'BOTH',
    billing_address: '',
    status: 'ACTIVE',
  });
  const [editPhoneError, setEditPhoneError] = useState('');
  const [editPincodeError, setEditPincodeError] = useState('');
  const [editBestBranchMatch, setEditBestBranchMatch] = useState(null);
  const [isEditManualBranchSelected, setIsEditManualBranchSelected] = useState(false);
  const [isEditLookingUpPin, setIsEditLookingUpPin] = useState(false);
  const [isEditPinAutoFilled, setIsEditPinAutoFilled] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Customer State
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches?all=true&limit=200');
        if (res.data.success) {
          setBranches(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    fetchBranches();
  }, []);

  const fetchCustomers = async (overrides = {}) => {
    setLoading(true);
    const p = overrides.page !== undefined ? overrides.page : page;
    const ps = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;
    const sb = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const so = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const sq = overrides.search !== undefined ? overrides.search : search;
    const tf = overrides.type !== undefined ? overrides.type : typeFilter;

    try {
      let url = `/customers?page=${p}&limit=${ps}&sort_by=${sb}&sort_order=${so}`;
      if (sq) url += `&search=${encodeURIComponent(sq)}`;
      if (tf && tf !== 'ALL') url += `&type=${tf}`;
      const res = await api.get(url);
      if (res.data.success) {
        setCustomers(res.data.data || []);
        setTotalCount(res.data.pagination?.total ?? (res.data.data || []).length);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
      setCustomers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, pageSize, sortBy, sortOrder, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCustomers({ search, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Intelligent Algorithm to match the best serving branch based on nearest Pincode and Station/City
  const calculateBestBranch = (pincode, city, branchList) => {
    if (!branchList || branchList.length === 0) return null;
    const cleanPin = (pincode || '').replace(/\D/g, '');
    const cleanCity = (city || '').trim().toLowerCase();

    if (!cleanPin && !cleanCity) return null;

    let best = null;
    let maxScore = -1;
    let matchReason = '';

    for (const b of branchList) {
      let score = 0;
      let reasons = [];
      const bCity = (b.city || '').toLowerCase();
      const bPin = (b.pincode || '').replace(/\D/g, '');

      // 1. Exact 6-digit Pincode match
      if (cleanPin && bPin && cleanPin === bPin) {
        score += 1000;
        reasons.push(`Exact PIN (${cleanPin}) Match`);
      }
      // 2. 4-digit Pincode cluster match
      else if (cleanPin.length >= 4 && bPin.length >= 4 && cleanPin.slice(0, 4) === bPin.slice(0, 4)) {
        score += 800;
        reasons.push(`Nearest PIN Cluster (${bPin})`);
      }
      // 3. 3-digit Pincode prefix match (same postal sorting district)
      else if (cleanPin.length >= 3 && bPin.length >= 3 && cleanPin.slice(0, 3) === bPin.slice(0, 3)) {
        score += 600;
        const diff = Math.abs(parseInt(cleanPin, 10) - parseInt(bPin, 10));
        score += Math.max(0, 50 - Math.min(50, Math.floor(diff / 10)));
        reasons.push(`Nearest District PIN (${bPin})`);
      }
      // 4. 2-digit Pincode prefix match (same state / postal circle)
      else if (cleanPin.length >= 2 && bPin.length >= 2 && cleanPin.slice(0, 2) === bPin.slice(0, 2)) {
        score += 300;
        reasons.push(`State Postal Circle (${bPin})`);
      }
      // 5. Numerical distance if both 6 digits
      else if (cleanPin.length === 6 && bPin.length === 6) {
        const diff = Math.abs(parseInt(cleanPin, 10) - parseInt(bPin, 10));
        if (diff < 500) {
          score += 350;
          reasons.push(`Nearest Geographical PIN (${bPin})`);
        } else if (diff < 2000) {
          score += 150;
          reasons.push(`Regional Area PIN`);
        }
      }

      // 6. Direct City / Station match
      if (cleanCity && bCity && (cleanCity === bCity || bCity.includes(cleanCity) || cleanCity.includes(bCity))) {
        score += 500;
        reasons.push(`Station Location (${b.city})`);
      }

      // 7. Metro region alias matching
      const isDelhiNCR = /delhi|gurugram|gurgaon|noida|faridabad|ghaziabad/i.test(cleanCity);
      const isBranchDelhiNCR = /delhi|gurugram|gurgaon|noida|faridabad|ghaziabad/i.test(bCity) || /delhi/i.test(b.branch_name);
      if (isDelhiNCR && isBranchDelhiNCR) {
        score += 400;
        reasons.push(`Delhi NCR Zone`);
      }

      const isBlr = /bengaluru|bangalore/i.test(cleanCity);
      const isBranchBlr = /bengaluru|bangalore/i.test(bCity) || /bengaluru|bangalore/i.test(b.branch_name);
      if (isBlr && isBranchBlr) {
        score += 400;
        reasons.push(`Bengaluru Hub Zone`);
      }

      const isMumbaiRegion = /mumbai|thane|bhiwandi|navi mumbai/i.test(cleanCity);
      const isBranchMumbai = /mumbai|thane|bhiwandi|navi mumbai/i.test(bCity) || /mumbai/i.test(b.branch_name);
      if (isMumbaiRegion && isBranchMumbai) {
        score += 400;
        reasons.push(`Mumbai Logistics Zone`);
      }

      // 8. Hub bonus for primary cargo routing
      if (b.is_hub && score > 0) {
        score += 30;
      }

      if (score > maxScore && score > 0) {
        maxScore = score;
        best = b;
        matchReason = reasons.join(' • ');
      }
    }

    if (best) {
      let normalized = 75;
      if (maxScore >= 1000) normalized = 100;
      else if (maxScore >= 800) normalized = 95;
      else if (maxScore >= 600) normalized = 90;
      else if (maxScore >= 400) normalized = 85;

      return { branch: best, score: maxScore, normalizedScore: normalized, reason: matchReason };
    }
    return null;
  };

  // Recalculate best branch whenever pincode or city changes
  useEffect(() => {
    const match = calculateBestBranch(formData.pincode, formData.city, branches);
    setBestBranchMatch(match);
    if (match && !isManualBranchSelected) {
      setFormData((prev) => ({ ...prev, branch_id: match.branch.id }));
    }
  }, [formData.pincode, formData.city, branches, isManualBranchSelected]);

  // Strict phone handler (Numbers only, max 10 digits)
  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digits }));

    if (digits.length === 0) {
      setPhoneError('Contact phone number is required');
    } else if (digits.length < 10) {
      setPhoneError(`Must be exactly 10 digits (${digits.length}/10 entered)`);
    } else {
      setPhoneError('');
    }
  };

  // Regional Postal Circle Directory for instant offline fallback
  const PIN_PREFIX_MAP = {
    '11': { city: 'New Delhi', state: 'Delhi' },
    '12': { city: 'Gurugram', state: 'Haryana' },
    '13': { city: 'Ambala', state: 'Haryana' },
    '14': { city: 'Ludhiana', state: 'Punjab' },
    '15': { city: 'Bathinda', state: 'Punjab' },
    '16': { city: 'Chandigarh', state: 'Chandigarh' },
    '17': { city: 'Shimla', state: 'Himachal Pradesh' },
    '18': { city: 'Jammu', state: 'Jammu & Kashmir' },
    '19': { city: 'Srinagar', state: 'Jammu & Kashmir' },
    '20': { city: 'Noida', state: 'Uttar Pradesh' },
    '21': { city: 'Prayagraj', state: 'Uttar Pradesh' },
    '22': { city: 'Lucknow', state: 'Uttar Pradesh' },
    '24': { city: 'Dehradun', state: 'Uttarakhand' },
    '25': { city: 'Meerut', state: 'Uttar Pradesh' },
    '28': { city: 'Agra', state: 'Uttar Pradesh' },
    '30': { city: 'Jaipur', state: 'Rajasthan' },
    '31': { city: 'Udaipur', state: 'Rajasthan' },
    '32': { city: 'Kota', state: 'Rajasthan' },
    '34': { city: 'Jodhpur', state: 'Rajasthan' },
    '38': { city: 'Ahmedabad', state: 'Gujarat' },
    '39': { city: 'Surat', state: 'Gujarat' },
    '40': { city: 'Mumbai', state: 'Maharashtra' },
    '41': { city: 'Pune', state: 'Maharashtra' },
    '42': { city: 'Thane', state: 'Maharashtra' },
    '43': { city: 'Aurangabad', state: 'Maharashtra' },
    '44': { city: 'Nagpur', state: 'Maharashtra' },
    '45': { city: 'Indore', state: 'Madhya Pradesh' },
    '46': { city: 'Bhopal', state: 'Madhya Pradesh' },
    '49': { city: 'Raipur', state: 'Chhattisgarh' },
    '50': { city: 'Hyderabad', state: 'Telangana' },
    '51': { city: 'Tirupati', state: 'Andhra Pradesh' },
    '52': { city: 'Vijayawada', state: 'Andhra Pradesh' },
    '53': { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    '56': { city: 'Bengaluru', state: 'Karnataka' },
    '57': { city: 'Mangaluru', state: 'Karnataka' },
    '58': { city: 'Hubballi', state: 'Karnataka' },
    '60': { city: 'Chennai', state: 'Tamil Nadu' },
    '62': { city: 'Madurai', state: 'Tamil Nadu' },
    '64': { city: 'Coimbatore', state: 'Tamil Nadu' },
    '68': { city: 'Kochi', state: 'Kerala' },
    '69': { city: 'Thiruvananthapuram', state: 'Kerala' },
    '70': { city: 'Kolkata', state: 'West Bengal' },
    '71': { city: 'Howrah', state: 'West Bengal' },
    '75': { city: 'Bhubaneswar', state: 'Odisha' },
    '78': { city: 'Guwahati', state: 'Assam' },
    '80': { city: 'Patna', state: 'Bihar' },
    '83': { city: 'Ranchi', state: 'Jharkhand' },
  };

  const lookupPincodeAddress = async (pin) => {
    if (!pin || pin.length !== 6) return;
    setIsLookingUpPin(true);

    const prefix2 = pin.slice(0, 2);
    const localMatch = PIN_PREFIX_MAP[prefix2];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const detectedCity = po.District || po.Block || po.Circle || (localMatch ? localMatch.city : '');
        const detectedState = po.State || (localMatch ? localMatch.state : '');
        const poName = po.Name || '';

        setFormData((prev) => ({
          ...prev,
          city: detectedCity || prev.city,
          billing_address: prev.billing_address || (poName ? `${poName}, ${detectedCity}, ${detectedState} - ${pin}` : `${detectedCity}, ${detectedState} - ${pin}`),
        }));
        setIsPinAutoFilled(true);
        setIsLookingUpPin(false);
        return;
      }
    } catch (err) {
      // API timeout / network fallback
    }

    if (localMatch) {
      setFormData((prev) => ({
        ...prev,
        city: localMatch.city,
        billing_address: prev.billing_address || `${localMatch.city}, ${localMatch.state} - ${pin}`,
      }));
      setIsPinAutoFilled(true);
    }
    setIsLookingUpPin(false);
  };

  // Strict pincode handler (Numbers only, max 6 digits) with auto-lookup
  const handlePincodeChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, pincode: digits }));
    setIsPinAutoFilled(false);

    if (digits.length > 0 && digits.length < 6) {
      setPincodeError(`PIN code must be exactly 6 digits (${digits.length}/6 entered)`);
    } else {
      setPincodeError('');
      if (digits.length === 6) {
        lookupPincodeAddress(digits);
      }
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!canCreateCustomer) return;

    if (formData.phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (formData.pincode && formData.pincode.length !== 6) {
      setPincodeError('PIN code must be exactly 6 digits');
      return;
    }

    try {
      const res = await api.post('/customers', {
        ...formData,
      });
      if (res.data.success) {
        setShowAddModal(false);
        setIsManualBranchSelected(false);
        setIsPinAutoFilled(false);
        setFormData({
          name: '',
          phone: '',
          city: '',
          pincode: '',
          branch_id: '',
          gstin: '',
          customer_type: 'BOTH',
          billing_address: '',
        });
        setPhoneError('');
        setPincodeError('');
        setBestBranchMatch(null);
        fetchCustomers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create customer');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      id: customer.id,
      name: customer.name || '',
      phone: customer.phone || '',
      city: customer.city || '',
      pincode: customer.pincode || '',
      branch_id: customer.branch_id || customer.branch?.id || '',
      gstin: customer.gstin || '',
      customer_type: customer.customer_type || 'BOTH',
      billing_address: customer.billing_address || '',
      status: customer.status || 'ACTIVE',
    });
    setEditPhoneError('');
    setEditPincodeError('');
    setIsEditManualBranchSelected(Boolean(customer.branch_id || customer.branch?.id));
    setIsEditPinAutoFilled(false);
    setShowEditModal(true);
  };

  const handleEditPhoneChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setEditFormData((prev) => ({ ...prev, phone: digits }));

    if (digits.length === 0) {
      setEditPhoneError('Contact phone number is required');
    } else if (digits.length < 10) {
      setEditPhoneError(`Must be exactly 10 digits (${digits.length}/10 entered)`);
    } else {
      setEditPhoneError('');
    }
  };

  const lookupEditPincodeAddress = async (pin) => {
    if (!pin || pin.length !== 6) return;
    setIsEditLookingUpPin(true);

    const prefix2 = pin.slice(0, 2);
    const localMatch = PIN_PREFIX_MAP[prefix2];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const detectedCity = po.District || po.Block || po.Circle || (localMatch ? localMatch.city : '');
        const detectedState = po.State || (localMatch ? localMatch.state : '');
        const poName = po.Name || '';

        setEditFormData((prev) => ({
          ...prev,
          city: detectedCity || prev.city,
          billing_address: prev.billing_address || (poName ? `${poName}, ${detectedCity}, ${detectedState} - ${pin}` : `${detectedCity}, ${detectedState} - ${pin}`),
        }));
        setIsEditPinAutoFilled(true);
        setIsEditLookingUpPin(false);
        return;
      }
    } catch (err) {}

    if (localMatch) {
      setEditFormData((prev) => ({
        ...prev,
        city: localMatch.city,
        billing_address: prev.billing_address || `${localMatch.city}, ${localMatch.state} - ${pin}`,
      }));
      setIsEditPinAutoFilled(true);
    }
    setIsEditLookingUpPin(false);
  };

  const handleEditPincodeChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setEditFormData((prev) => ({ ...prev, pincode: digits }));
    setIsEditPinAutoFilled(false);

    if (digits.length > 0 && digits.length < 6) {
      setEditPincodeError(`PIN code must be exactly 6 digits (${digits.length}/6 entered)`);
    } else {
      setEditPincodeError('');
      if (digits.length === 6) {
        lookupEditPincodeAddress(digits);
      }
    }
  };

  useEffect(() => {
    if (!showEditModal) return;
    const match = calculateBestBranch(editFormData.pincode, editFormData.city, branches);
    setEditBestBranchMatch(match);
    if (match && !isEditManualBranchSelected) {
      setEditFormData((prev) => ({ ...prev, branch_id: match.branch.id }));
    }
  }, [editFormData.pincode, editFormData.city, branches, isEditManualBranchSelected, showEditModal]);

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!canEditCustomer && !isAdmin) return;

    if (editFormData.phone.length !== 10) {
      setEditPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (editFormData.pincode && editFormData.pincode.length !== 6) {
      setEditPincodeError('PIN code must be exactly 6 digits');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await api.put(`/customers/${editFormData.id}`, editFormData);
      if (res.data.success) {
        setShowEditModal(false);
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirmCustomer || (!canDeleteCustomer && !isAdmin)) return;

    setIsDeleting(true);
    try {
      const res = await api.delete(`/customers/${deleteConfirmCustomer.id}`);
      if (res.data.success) {
        setDeleteConfirmCustomer(null);
        fetchCustomers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'customer_code',
        header: 'Code',
        sortable: true,
        width: 120,
        minWidth: 100,
        exportValue: (row) => row.customer_code,
        render: (val, row) => (
          <span className="font-mono font-bold text-blue-500 hover:underline">
            {row.customer_code}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Party / Company Name',
        sortable: true,
        width: 220,
        minWidth: 160,
        exportValue: (row) => row.name,
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.name}
            </div>
            {row.billing_address && (
              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                {row.billing_address}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'customer_type',
        header: 'Type',
        sortable: true,
        width: 120,
        minWidth: 90,
        exportValue: (row) => row.customer_type,
        render: (val, row) => (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            row.customer_type === 'CONSIGNOR'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
              : row.customer_type === 'CONSIGNEE'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
          }`}>
            {row.customer_type}
          </span>
        ),
      },
      {
        key: 'city',
        header: 'Station / City',
        sortable: true,
        width: 140,
        minWidth: 110,
        exportValue: (row) => row.city || '—',
        render: (val, row) => (
          <span className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {row.city || '—'}
          </span>
        ),
      },
      {
        key: 'pincode',
        header: 'PIN Code',
        sortable: true,
        width: 120,
        minWidth: 100,
        exportValue: (row) => row.pincode || '',
        render: (val, row) => (
          row.pincode ? (
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              {row.pincode}
            </span>
          ) : (
            <span className="text-slate-400 text-xs italic">—</span>
          )
        ),
      },
      {
        key: 'branch',
        header: 'Serving Branch',
        sortable: false,
        width: 200,
        minWidth: 160,
        exportValue: (row) => {
          const match = calculateBestBranch(row.pincode, row.city, branches);
          const b = row.branch || match?.branch;
          return b?.branch_name || 'Central Hub';
        },
        render: (val, row) => {
          const match = calculateBestBranch(row.pincode, row.city, branches);
          const b = row.branch || match?.branch;
          const isNearestAuto = !row.branch && Boolean(match?.branch);

          if (!b) {
            return (
              <span className="text-[10px] text-slate-400 italic">Central Hub</span>
            );
          }

          return (
            <div className="space-y-0.5">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                b.is_hub
                  ? isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'
                  : isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{b.branch_name}</span>
              </span>

              <div className="flex items-center gap-1.5 text-[9px]">
                {b.branch_code && (
                  <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] border ${
                    b.is_hub
                      ? isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'
                      : isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {b.branch_code}
                  </span>
                )}
                {b.pincode && (
                  <span className={`font-mono text-[9px] font-semibold ${
                    b.is_hub
                      ? isDark ? 'text-purple-300/80' : 'text-purple-800/80'
                      : isDark ? 'text-blue-300/80' : 'text-blue-800/80'
                  }`}>
                    PIN: {b.pincode}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'phone',
        header: 'Contact Phone',
        sortable: true,
        width: 140,
        minWidth: 110,
        exportValue: (row) => row.phone,
        render: (val, row) => (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Phone className="w-3 h-3 text-slate-400" />
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              +91 {row.phone}
            </span>
          </div>
        ),
      },
      {
        key: 'gstin',
        header: 'GSTIN',
        sortable: false,
        width: 160,
        minWidth: 130,
        exportValue: (row) => row.gstin || 'UNREGISTERED',
        render: (val, row) => (
          <span className="text-xs font-mono text-slate-400">
            {row.gstin || 'UNREGISTERED'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: 100,
        minWidth: 80,
        exportValue: (row) => row.status || 'ACTIVE',
        render: (val, row) => {
          const isActive = (row.status || 'ACTIVE') === 'ACTIVE';
          return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isActive
                ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {row.status || 'ACTIVE'}
            </span>
          );
        },
      },
      ...(canEditCustomer || canDeleteCustomer || isAdmin
        ? [
            {
              key: 'actions',
              header: 'Actions',
              sortable: false,
              align: 'right',
              width: 100,
              minWidth: 90,
              render: (val, row) => (
                <div className="flex items-center justify-end gap-1.5">
                  {(canEditCustomer || isAdmin) && (
                    <button
                      type="button"
                      title="Edit Customer"
                      onClick={() => handleOpenEditModal(row)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isDark
                          ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(canDeleteCustomer || isAdmin) && (
                    <button
                      type="button"
                      title="Delete Customer"
                      onClick={() => setDeleteConfirmCustomer(row)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isDark
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ),
            },
          ]
        : []),
    ],
    [isDark, canEditCustomer, canDeleteCustomer, isAdmin, branches]
  );

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1720px] mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Customer Master Directory
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Commercial clients, consignors, consignees, verified KYC records, PIN routing, and serving branches.
              </p>
            </div>

            {canCreateCustomer && (
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setIsManualBranchSelected(false);
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Commercial Client</span>
              </button>
            )}
          </div>

          {/* Master Customer Server-side DataTable */}
          <DataTable
            columns={columns}
            data={customers}
            totalCount={totalCount}
            isLoading={loading}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={({ sortBy: newSortBy, sortOrder: newSortOrder }) => {
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            searchQuery={search}
            onSearchChange={(val) => setSearch(val)}
            searchPlaceholder="Search customer name, code, phone, city, PIN..."
            exportFilename="Customer_Directory"
            emptyTitle="No Customers Found"
            emptySubtitle="No commercial clients match your search or filter parameters."
            filtersSlot={
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setTypeFilter('ALL'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Clients ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('CONSIGNOR'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'CONSIGNOR'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Consignors (Shippers)
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('CONSIGNEE'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'CONSIGNEE'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Consignees (Receivers)
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('BOTH'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === 'BOTH'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Dual Role (Both)
                </button>
              </div>
            }
          />

          {/* Add Customer Modal with Strict Validation & Smart Branch Recommendation */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
              <form
                onSubmit={handleCreateCustomer}
                className={`rounded-2xl max-w-xl w-full flex flex-col shadow-2xl border transition-all my-auto relative ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Modal Title & Close (Fixed Header) */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 rounded-t-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-500">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight">Add Commercial Client</h3>
                      <p className="text-[10px] text-slate-400">PIN code auto-detects city and recommends best serving hub</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Fields (Compact Body) */}
                <div className="px-5 py-3.5 space-y-3 relative z-20">
                  {/* Row 1: Company / Trade Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Company / Trade Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Havells India Ltd"
                      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Row 2: Contact Phone + Postal PIN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Contact Phone */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Contact Phone <span className="text-rose-500">*</span>
                        </label>
                        <span className={`text-[10px] font-mono font-bold ${
                          formData.phone.length === 10
                            ? 'text-emerald-500'
                            : formData.phone.length > 0
                            ? 'text-amber-500'
                            : 'text-slate-400'
                        }`}>
                          {formData.phone.length === 10 ? '✓ 10 Digits' : `${formData.phone.length}/10`}
                        </span>
                      </div>
                      
                      <div className="relative flex items-center">
                        <div className={`px-2 py-2 text-xs font-bold border-y border-l rounded-l-xl flex items-center gap-1 shrink-0 ${
                          isDark ? 'bg-slate-800/90 border-slate-700 text-cyan-400' : 'bg-slate-100 border-slate-300 text-slate-700'
                        }`}>
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="8012938120"
                          maxLength={10}
                          className={`w-full rounded-r-xl px-2.5 py-2 text-xs font-mono font-semibold border-y border-r focus:outline-none focus:ring-1 transition-all ${
                            phoneError
                              ? 'border-rose-500 focus:ring-rose-500 text-rose-400'
                              : formData.phone.length === 10
                              ? 'border-emerald-500/70 focus:ring-emerald-500'
                              : isDark
                              ? 'border-slate-800 focus:ring-blue-500'
                              : 'border-slate-300 focus:ring-blue-600'
                          } ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                      </div>
                      {phoneError && (
                        <p className="text-[10px] font-medium text-rose-400 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    {/* Postal PIN Code (Auto-finds Address) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Postal PIN Code
                        </label>
                        <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                          isLookingUpPin
                            ? 'text-blue-500'
                            : formData.pincode.length === 6
                            ? 'text-cyan-500'
                            : 'text-slate-400'
                        }`}>
                          {isLookingUpPin ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              <span>Locating...</span>
                            </>
                          ) : formData.pincode.length === 6 ? (
                            '✓ 6 Digits'
                          ) : (
                            `${formData.pincode.length}/6`
                          )}
                        </span>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={formData.pincode}
                          onChange={handlePincodeChange}
                          placeholder="e.g. 110020, 122001"
                          maxLength={6}
                          className={`w-full rounded-xl pl-8 pr-2.5 py-2 text-xs font-mono font-semibold border focus:outline-none focus:ring-1 transition-all ${
                            pincodeError
                              ? 'border-rose-500 focus:ring-rose-500 text-rose-400'
                              : formData.pincode.length === 6
                              ? 'border-cyan-500/70 focus:ring-cyan-500'
                              : isDark
                              ? 'border-slate-800 focus:ring-blue-500'
                              : 'border-slate-300 focus:ring-blue-600'
                          } ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                      </div>
                      {pincodeError && (
                        <p className="text-[10px] font-medium text-rose-400 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{pincodeError}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Station / City + Commercial Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Station / City */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Station / City <span className="text-rose-500">*</span>
                        </label>
                        {isPinAutoFilled && (
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            ⚡ Auto-Resolved
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Gurugram, Delhi, Mumbai"
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Customer Role */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Commercial Role / Type
                      </label>
                      <select
                        value={formData.customer_type}
                        onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="BOTH">Dual Role (Consignor & Consignee)</option>
                        <option value="CONSIGNOR">Consignor Only (Shipper)</option>
                        <option value="CONSIGNEE">Consignee Only (Receiver)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Serving Branch Selection + Smart Proximity Match */}
                  <ServingBranchDropdown
                    label="Designated Serving Branch / Hub"
                    selectedBranchId={formData.branch_id}
                    onSelectBranch={(branchId) => {
                      setFormData((prev) => ({ ...prev, branch_id: branchId }));
                      setIsManualBranchSelected(true);
                    }}
                    branches={branches}
                    bestMatch={bestBranchMatch}
                    isDark={isDark}
                  />

                  {/* Row 5: GSTIN (Approved Credit Limit REMOVED) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      GSTIN (15 Digits)
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 07AAACA1234A1Z5"
                      maxLength={15}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wide uppercase border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Row 6: Billing / Factory Address */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Full Billing / Factory Address
                    </label>
                    <textarea
                      rows={2}
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      placeholder="Plot 10, Industrial Area, Sector 18..."
                      className={`w-full rounded-xl px-3 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none ${
                        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Footer Controls (Fixed Footer) */}
                <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 dark:border-slate-800 shrink-0 relative z-10 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formData.phone.length !== 10}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Customer</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Customer Modal */}
          {showEditModal && editingCustomer && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
              <form
                onSubmit={handleUpdateCustomer}
                className={`rounded-2xl max-w-xl w-full flex flex-col shadow-2xl border transition-all my-auto relative ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 rounded-t-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-500">
                      <Pencil className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold tracking-tight">Edit Commercial Client</h3>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {editingCustomer.customer_code}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Update customer master directory information</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCustomer(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Fields */}
                <div className="px-5 py-3.5 space-y-3 relative z-20">
                  {/* Row 1: Company / Trade Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Company / Trade Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="e.g. Havells India Ltd"
                      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Row 2: Contact Phone + Postal PIN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Contact Phone */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Contact Phone <span className="text-rose-500">*</span>
                        </label>
                        <span className={`text-[10px] font-mono font-bold ${
                          editFormData.phone.length === 10
                            ? 'text-emerald-500'
                            : editFormData.phone.length > 0
                            ? 'text-amber-500'
                            : 'text-slate-400'
                        }`}>
                          {editFormData.phone.length === 10 ? '✓ 10 Digits' : `${editFormData.phone.length}/10`}
                        </span>
                      </div>
                      
                      <div className="relative flex items-center">
                        <div className={`px-2 py-2 text-xs font-bold border-y border-l rounded-l-xl flex items-center gap-1 shrink-0 ${
                          isDark ? 'bg-slate-800/90 border-slate-700 text-cyan-400' : 'bg-slate-100 border-slate-300 text-slate-700'
                        }`}>
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={editFormData.phone}
                          onChange={handleEditPhoneChange}
                          placeholder="8012938120"
                          maxLength={10}
                          className={`w-full rounded-r-xl px-2.5 py-2 text-xs font-mono font-semibold border-y border-r focus:outline-none focus:ring-1 transition-all ${
                            editPhoneError
                              ? 'border-rose-500 focus:ring-rose-500 text-rose-400'
                              : editFormData.phone.length === 10
                              ? 'border-emerald-500/70 focus:ring-emerald-500'
                              : isDark
                              ? 'border-slate-800 focus:ring-blue-500'
                              : 'border-slate-300 focus:ring-blue-600'
                          } ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                      </div>
                      {editPhoneError && (
                        <p className="text-[10px] font-medium text-rose-400 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editPhoneError}</span>
                        </p>
                      )}
                    </div>

                    {/* Postal PIN Code */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Postal PIN Code
                        </label>
                        <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                          isEditLookingUpPin
                            ? 'text-blue-500'
                            : editFormData.pincode.length === 6
                            ? 'text-cyan-500'
                            : 'text-slate-400'
                        }`}>
                          {isEditLookingUpPin ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              <span>Locating...</span>
                            </>
                          ) : editFormData.pincode.length === 6 ? (
                            '✓ 6 Digits'
                          ) : (
                            `${editFormData.pincode.length}/6`
                          )}
                        </span>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={editFormData.pincode}
                          onChange={handleEditPincodeChange}
                          placeholder="e.g. 110020, 122001"
                          maxLength={6}
                          className={`w-full rounded-xl pl-8 pr-2.5 py-2 text-xs font-mono font-semibold border focus:outline-none focus:ring-1 transition-all ${
                            editPincodeError
                              ? 'border-rose-500 focus:ring-rose-500 text-rose-400'
                              : editFormData.pincode.length === 6
                              ? 'border-cyan-500/70 focus:ring-cyan-500'
                              : isDark
                              ? 'border-slate-800 focus:ring-blue-500'
                              : 'border-slate-300 focus:ring-blue-600'
                          } ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                      </div>
                      {editPincodeError && (
                        <p className="text-[10px] font-medium text-rose-400 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editPincodeError}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Station / City + Commercial Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Station / City */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Station / City <span className="text-rose-500">*</span>
                        </label>
                        {isEditPinAutoFilled && (
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            ⚡ Auto-Resolved
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                        placeholder="e.g. Gurugram, Delhi, Mumbai"
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Customer Role */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Commercial Role / Type
                      </label>
                      <select
                        value={editFormData.customer_type}
                        onChange={(e) => setEditFormData({ ...editFormData, customer_type: e.target.value })}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="BOTH">Dual Role (Consignor & Consignee)</option>
                        <option value="CONSIGNOR">Consignor Only (Shipper)</option>
                        <option value="CONSIGNEE">Consignee Only (Receiver)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Serving Branch Selection + Smart Proximity Match */}
                  <ServingBranchDropdown
                    label="Designated Serving Branch / Hub"
                    selectedBranchId={editFormData.branch_id}
                    onSelectBranch={(branchId) => {
                      setEditFormData((prev) => ({ ...prev, branch_id: branchId }));
                      setIsEditManualBranchSelected(true);
                    }}
                    branches={branches}
                    bestMatch={editBestBranchMatch}
                    isDark={isDark}
                  />

                  {/* Row 5: GSTIN + Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        GSTIN (15 Digits)
                      </label>
                      <input
                        type="text"
                        value={editFormData.gstin}
                        onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value.toUpperCase() })}
                        placeholder="e.g. 07AAACA1234A1Z5"
                        maxLength={15}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wide uppercase border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Status
                      </label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 6: Billing / Factory Address */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Full Billing / Factory Address
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.billing_address}
                      onChange={(e) => setEditFormData({ ...editFormData, billing_address: e.target.value })}
                      placeholder="Plot 10, Industrial Area, Sector 18..."
                      className={`w-full rounded-xl px-3 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none ${
                        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 dark:border-slate-800 shrink-0 relative z-10 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCustomer(null);
                    }}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit || editFormData.phone.length !== 10}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    {isSubmittingEdit ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmCustomer && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
              <div
                className={`rounded-2xl max-w-md w-full shadow-2xl border p-5 transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Delete Customer?</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Are you sure you want to delete customer <strong className={isDark ? 'text-white' : 'text-slate-900'}>{deleteConfirmCustomer.name}</strong> ({deleteConfirmCustomer.customer_code})?
                    </p>
                    <p className="text-[11px] text-amber-500/90 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      ⚠️ Note: If this customer has existing dockets or consignments, the system will prevent deletion to protect your shipment audit trail.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmCustomer(null)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteCustomer}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Customer</span>
                      </>
                    )}
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
