// frontend/app/(owner)/expenses/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import Modal from '../../../components/ui/Modal';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import { useStore } from '../../../store/useStore';
import TripPnlModal from '../../../components/trips/TripPnlModal';
import {
  Wallet,
  Plus,
  Fuel,
  Receipt,
  Truck,
  Building2,
  Gauge,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  UserCheck,
  Coins,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Filter,
  Sparkles,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  X,
  Calendar,
  CreditCard,
  FileText,
  User,
  Tag
} from 'lucide-react';

const TAB_OPERATIONAL = 'OPERATIONAL';
const TAB_BRANCH_OVERHEADS = 'BRANCH_OVERHEADS';
// Backward-compatible aliases
const TAB_TRIP_EXPENSES = 'OPERATIONAL';
const TAB_FUEL_LOGS = 'OPERATIONAL';
const TAB_DRIVER_ADVANCES = 'OPERATIONAL';

/**
 * Enterprise Custom Filter Popover Dropdown
 * Replaces native HTML select elements with high-end animated popovers
 */
function CustomFilterDropdown({
  value,
  onChange,
  options = [],
  allLabel = 'All',
  icon: Icon,
  searchable = false,
  align = 'left',
  isDark = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = useMemo(() => {
    if (!value || value === 'ALL') return null;
    return options.find((opt) => String(opt.value) === String(value));
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const isFiltered = value && value !== 'ALL';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
          isFiltered
            ? isDark
              ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 shadow-xs'
              : 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
            : isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
        }`}
      >
        {Icon && (
          <Icon className={`w-3.5 h-3.5 shrink-0 ${
            isFiltered
              ? isDark ? 'text-blue-400' : 'text-blue-600'
              : 'text-slate-400'
          }`} />
        )}
        <span className="truncate max-w-[105px] sm:max-w-[125px]">
          {selectedOption ? selectedOption.label : allLabel}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 min-w-[210px] max-w-xs rounded-2xl border shadow-2xl p-1.5 z-50 transition-all overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'bg-[#0B1020]/95 backdrop-blur-md border-slate-800 text-white shadow-black/80 ring-1 ring-white/10'
              : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-xl ring-1 ring-black/5'
          }`}
        >
          {/* Optional Search */}
          {searchable && options.length > 5 && (
            <div className="p-1 mb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-xs outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {/* "All" Option */}
            <button
              type="button"
              onClick={() => {
                onChange('ALL');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors text-left cursor-pointer ${
                !isFiltered
                  ? isDark
                    ? 'bg-blue-600/20 text-blue-400 font-bold'
                    : 'bg-blue-50 text-blue-700 font-bold'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              <span>{allLabel}</span>
              {!isFiltered && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-center text-[11px] text-slate-400">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors text-left cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-600/20 text-blue-400 font-bold'
                          : 'bg-blue-50 text-blue-700 font-bold'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {opt.icon && <opt.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin, canCreateExpense } = usePermissions();
  const user = useStore((state) => state.user);
  const activeBranchFromStore = useStore((state) => state.activeBranch);

  // Active Station Scoping
  // Non-admin (Branch Manager) is strictly restricted to login branch; Admin can choose 'ALL' or any branch
  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || activeBranchFromStore?.id || null;
  const userBranchName = user?.branchName || user?.branch?.name || activeBranchFromStore?.name || (userBranchId ? `Branch #${userBranchId}` : 'Assigned Station');
  
  const [selectedBranchId, setSelectedBranchId] = useState(
    isAdmin ? (activeBranchFromStore?.id || 'ALL') : (userBranchId || 'ALL')
  );

  // Strictly sync and lock selectedBranchId to login branch for non-admin / Branch Manager
  useEffect(() => {
    if (!isAdmin && userBranchId) {
      setSelectedBranchId(userBranchId);
    }
  }, [isAdmin, userBranchId]);

  const [branchList, setBranchList] = useState([]);

  // Formatted branches for BranchFilterDropdown
  const formattedBranches = useMemo(() => {
    return branchList.map((b) => ({
      ...b,
      id: b.id,
      name: b.name || b.branch_name,
      branch_name: b.name || b.branch_name,
      code: b.code || b.branch_code,
      branch_code: b.code || b.branch_code,
      city: b.city || '',
    }));
  }, [branchList]);

  // Active Tab
  const [activeTab, setActiveTab] = useState(TAB_OPERATIONAL);

  // KPI Summary
  const [summaryData, setSummaryData] = useState({
    totalOutflows: 0,
    tripDirectExpenses: 0,
    branchOverheads: 0,
    totalFuelAmount: 0,
    totalFuelLitres: 0,
    avgFuelRate: 0,
    fuelEntriesCount: 0,
    totalDriverAdvances: 0,
    categoryBreakdown: [],
  });

  // Data Stores
  const [expenses, setExpenses] = useState([]);
  const [tripWiseExpenses, setTripWiseExpenses] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);

  // Scoped Trips, Vehicles, and Drivers for Branch Manager
  const filteredTrips = useMemo(() => {
    if (isAdmin) return trips;
    if (!userBranchId) return trips;
    return trips.filter(
      (t) =>
        String(t.origin_branch_id) === String(userBranchId) ||
        String(t.dest_branch_id) === String(userBranchId)
    );
  }, [trips, isAdmin, userBranchId]);

  const filteredVehicles = useMemo(() => {
    if (isAdmin) return vehicles;
    if (!userBranchId) return vehicles;
    return vehicles.filter((v) => !v.branch_id || String(v.branch_id) === String(userBranchId));
  }, [vehicles, isAdmin, userBranchId]);

  const filteredDrivers = useMemo(() => {
    if (isAdmin) return drivers;
    if (!userBranchId) return drivers;
    return drivers.filter((d) => !d.branch_id || String(d.branch_id) === String(userBranchId));
  }, [drivers, isAdmin, userBranchId]);

  // Global & Tab Loading
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table Filters & Pagination
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');

  // Fleet Ownership Filter Options
  const ownershipOptions = useMemo(() => [
    { value: 'OWN', label: 'Company Owned' },
    { value: 'ATTACHED', label: 'Vendor Attached' },
    { value: 'MARKET', label: 'Market Hired' },
  ], []);

  // Category & Payment Mode Filter Options for CustomFilterDropdown
  const categoryOptions = useMemo(() => {
    return categories
      .filter((c) => (activeTab === TAB_TRIP_EXPENSES ? c.is_trip_expense : !c.is_trip_expense))
      .map((c) => ({
        value: String(c.id),
        label: c.name,
      }));
  }, [categories, activeTab]);

  const paymentModeOptions = useMemo(() => [
    { value: 'CASH', label: 'Cash (Petty Cash)' },
    { value: 'FASTAG', label: 'FASTag Toll Wallet' },
    { value: 'FUEL_CARD', label: 'Fuel Fleet Card' },
    { value: 'UPI', label: 'UPI / QR Code' },
    { value: 'BANK_TRANSFER', label: 'Direct Bank NEFT' },
  ], []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showPnlModal, setShowPnlModal] = useState(false);
  const [selectedPnlTrip, setSelectedPnlTrip] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [recordModalType, setRecordModalType] = useState('TRIP_DIRECT'); // 'TRIP_DIRECT' | 'FUEL' | 'DRIVER_BHATTA' | 'BRANCH_OVERHEAD'

  const handleOpenTripPnl = useCallback((trip) => {
    if (!trip) return;
    setSelectedPnlTrip(trip);
    setShowPnlModal(true);
  }, []);

  const handleSelectRecordType = useCallback((type) => {
    setRecordModalType(type);
    if (type === 'TRIP_DIRECT' || type === 'BRANCH_OVERHEAD') {
      const isTrip = type === 'TRIP_DIRECT';
      setExpenseForm((prev) => {
        const matchingCats = categories.filter((c) => isTrip ? c.is_trip_expense : !c.is_trip_expense);
        const currentValid = matchingCats.some((c) => String(c.id) === String(prev.category_id));
        return {
          ...prev,
          expense_type: type,
          category_id: currentValid ? prev.category_id : (matchingCats[0]?.id || prev.category_id),
        };
      });
    }
  }, [categories]);

  const handleOpenRecordModal = useCallback((preferredType, tripRow) => {
    let type = preferredType;
    if (!type) {
      type = activeTab === TAB_BRANCH_OVERHEADS ? 'BRANCH_OVERHEAD' : 'TRIP_DIRECT';
    }
    setRecordModalType(type);
    if (type === 'TRIP_DIRECT' || type === 'BRANCH_OVERHEAD') {
      const isTrip = type === 'TRIP_DIRECT';
      setExpenseForm((prev) => {
        const matchingCats = categories.filter((c) => isTrip ? c.is_trip_expense : !c.is_trip_expense);
        const currentValid = matchingCats.some((c) => String(c.id) === String(prev.category_id));
        return {
          ...prev,
          expense_type: type,
          category_id: currentValid ? prev.category_id : (matchingCats[0]?.id || prev.category_id),
        };
      });
    }

    if (tripRow) {
      setExpenseForm((prev) => ({
        ...prev,
        expense_type: 'TRIP_DIRECT',
        trip_id: tripRow.id,
        vehicle_id: tripRow.vehicle_id || prev.vehicle_id,
        driver_id: tripRow.driver_id || prev.driver_id,
      }));
      setFuelForm((prev) => ({
        ...prev,
        trip_id: tripRow.id,
        vehicle_id: tripRow.vehicle_id || prev.vehicle_id,
        driver_id: tripRow.driver_id || prev.driver_id,
      }));
      setAdvanceForm((prev) => ({
        ...prev,
        trip_id: tripRow.id,
        driver_id: tripRow.driver_id || prev.driver_id,
      }));
    }
    setShowExpenseModal(true);
  }, [activeTab, categories]);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    expense_type: 'TRIP_DIRECT', // 'TRIP_DIRECT' | 'BRANCH_OVERHEAD'
    category_id: '',
    branch_id: selectedBranchId !== 'ALL' ? selectedBranchId : (userBranchId || ''),
    trip_id: '',
    vehicle_id: '',
    driver_id: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: 'CASH',
    vendor_name: '',
    bill_number: '',
    remarks: '',
  });

  // Fuel Form State
  const [fuelForm, setFuelForm] = useState({
    vehicle_id: '',
    trip_id: '',
    driver_id: '',
    fuel_date: new Date().toISOString().slice(0, 10),
    fuel_type: 'DIESEL',
    litres: '',
    rate_per_litre: '94.50',
    total_amount: '',
    odometer_reading: '',
    fuel_station: '',
    payment_mode: 'FUEL_CARD',
    receipt_url: '',
  });

  // Advance Form State
  const [advanceForm, setAdvanceForm] = useState({
    trip_id: '',
    driver_id: '',
    amount: '',
    payment_mode: 'CASH',
    disbursed_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Settlement Form State
  const [settleForm, setSettleForm] = useState({
    trip_id: '',
    driver_id: '',
    total_advances: 0,
    total_expenses: 0,
    net_payable: 0,
    settlement_status: 'SETTLED',
    payment_mode: 'CASH',
    notes: '',
  });

  // Load Reference Data (Branches, Vehicles, Drivers, Trips, Categories)
  const fetchMetadata = async () => {
    try {
      const [branchRes, catRes, vehRes, dvrRes, trpRes] = await Promise.all([
        api.get('/branches?all=true').catch(() => ({ data: { data: [] } })),
        api.get('/expenses/categories').catch(() => ({ data: { data: [] } })),
        api.get('/fleet/vehicles?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/fleet/drivers?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/trips?limit=100&status=RUNNING,READY,COMPLETED').catch(() => ({ data: { data: [] } })),
      ]);

      const branches = branchRes.data?.data || [];
      setBranchList(branches);

      const cats = catRes.data?.data || [];
      setCategories(cats);
      if (cats.length > 0 && !expenseForm.category_id) {
        setExpenseForm((prev) => ({ ...prev, category_id: cats[0].id }));
      }

      setVehicles(vehRes.data?.data || []);
      setDrivers(dvrRes.data?.data || []);
      setTrips(trpRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load expense reference metadata:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Compute Effective Branch Parameter
  const effectiveBranchParam = useMemo(() => {
    if (!isAdmin) {
      return userBranchId ? `branch_id=${userBranchId}` : '';
    }
    if (selectedBranchId && selectedBranchId !== 'ALL') {
      return `branch_id=${selectedBranchId}`;
    }
    return '';
  }, [isAdmin, userBranchId, selectedBranchId]);

  // Fetch KPI Summary
  const fetchSummary = useCallback(async () => {
    try {
      const params = [];
      if (effectiveBranchParam) params.push(effectiveBranchParam);
      if (fromDate) params.push(`from_date=${fromDate}`);
      if (toDate) params.push(`to_date=${toDate}`);

      const url = `/expenses/summary${params.length > 0 ? `?${params.join('&')}` : ''}`;
      const res = await api.get(url);
      if (res.data?.success && res.data.data) {
        setSummaryData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch expense summary:', err);
    }
  }, [effectiveBranchParam, fromDate, toDate]);

  // Fetch Tab Specific Data
  const fetchTabData = useCallback(async () => {
    setTableLoading(true);
    try {
      const baseParams = [];
      if (effectiveBranchParam) baseParams.push(effectiveBranchParam);
      if (fromDate) baseParams.push(`from_date=${fromDate}`);
      if (toDate) baseParams.push(`to_date=${toDate}`);
      if (search) baseParams.push(`search=${encodeURIComponent(search.trim())}`);
      if (paymentModeFilter !== 'ALL') baseParams.push(`payment_method=${paymentModeFilter}`);

      baseParams.push(`page=${page}`);
      baseParams.push(`limit=${pageSize}`);
      baseParams.push(`sort_by=${sortBy}`);
      baseParams.push(`sort_order=${sortOrder}`);

      if (activeTab === TAB_BRANCH_OVERHEADS) {
        baseParams.push('expense_type=BRANCH_OVERHEAD');
        if (categoryFilter !== 'ALL') baseParams.push(`category_id=${categoryFilter}`);
        const url = `/expenses?${baseParams.join('&')}`;
        const res = await api.get(url);
        if (res.data?.success) {
          setExpenses(res.data.data || []);
          setTotalCount(res.data.pagination?.total || (res.data.data ? res.data.data.length : 0));
        }
      } else {
        // TAB_OPERATIONAL: Unified Trip-Wise Ledger
        if (ownershipFilter !== 'ALL') baseParams.push(`ownership=${ownershipFilter}`);
        const url = `/expenses/trip-wise?${baseParams.join('&')}`;
        const res = await api.get(url);
        if (res.data?.success) {
          setTripWiseExpenses(res.data.data || []);
          setTotalCount(res.data.pagination?.total || (res.data.data ? res.data.data.length : 0));
        }
      }
    } catch (err) {
      console.error('Failed to load table data:', err);
      setTotalCount(0);
      setExpenses([]);
      setTripWiseExpenses([]);
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [activeTab, effectiveBranchParam, fromDate, toDate, search, paymentModeFilter, categoryFilter, ownershipFilter, page, pageSize, sortBy, sortOrder]);

  // Trigger data fetches on tab or scope change
  useEffect(() => {
    fetchSummary();
    fetchTabData();
  }, [fetchSummary, fetchTabData]);

  // Handle Tab Switch
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setPage(1);
    setSearch('');
    setCategoryFilter('ALL');
    setPaymentModeFilter('ALL');
    setOwnershipFilter('ALL');
    setTotalCount(0);
    setExpenses([]);
    setTripWiseExpenses([]);
  };

  // Live Auto-calc for Fuel Form
  useEffect(() => {
    const l = parseFloat(fuelForm.litres);
    const r = parseFloat(fuelForm.rate_per_litre);
    if (!isNaN(l) && !isNaN(r) && l > 0 && r > 0) {
      setFuelForm((prev) => ({ ...prev, total_amount: (l * r).toFixed(2) }));
    }
  }, [fuelForm.litres, fuelForm.rate_per_litre]);

  // Auto-fill vehicle and driver when trip is selected in Expense Form
  const handleExpenseTripChange = (tripId) => {
    setExpenseForm((prev) => {
      const selected = trips.find((t) => String(t.id) === String(tripId));
      return {
        ...prev,
        trip_id: tripId,
        vehicle_id: selected?.vehicle_id || prev.vehicle_id,
        driver_id: selected?.driver_id || prev.driver_id,
      };
    });
  };

  // Auto-fill vehicle and driver when trip is selected in Fuel Form
  const handleFuelTripChange = (tripId) => {
    setFuelForm((prev) => {
      const selected = trips.find((t) => String(t.id) === String(tripId));
      return {
        ...prev,
        trip_id: tripId,
        vehicle_id: selected?.vehicle_id || prev.vehicle_id,
        driver_id: selected?.driver_id || prev.driver_id,
      };
    });
  };

  // Auto-fill driver when trip is selected in Advance Form
  const handleAdvanceTripChange = (tripId) => {
    setAdvanceForm((prev) => {
      const selected = trips.find((t) => String(t.id) === String(tripId));
      return {
        ...prev,
        trip_id: tripId,
        driver_id: selected?.driver_id || prev.driver_id,
      };
    });
  };

  // Create Expense Submit
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!canCreateExpense) return;
    setIsSubmitting(true);
    try {
      let targetBranchId = expenseForm.branch_id;
      if (expenseForm.expense_type === 'TRIP_DIRECT' && expenseForm.trip_id) {
        const trip = trips.find((t) => String(t.id) === String(expenseForm.trip_id));
        if (trip?.origin_branch_id) targetBranchId = trip.origin_branch_id;
      }
      if (!targetBranchId && selectedBranchId !== 'ALL') {
        targetBranchId = selectedBranchId;
      }
      if (!targetBranchId && userBranchId) {
        targetBranchId = userBranchId;
      }
      if (!targetBranchId && branchList.length > 0) {
        targetBranchId = branchList[0].id;
      }

      const payload = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        branch_id: targetBranchId,
      };
      const res = await api.post('/expenses', payload);
      if (res.data?.success) {
        setShowExpenseModal(false);
        setExpenseForm((prev) => ({
          ...prev,
          amount: '',
          remarks: '',
          bill_number: '',
          vendor_name: '',
        }));
        fetchSummary();
        fetchTabData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Fuel Refill Submit
  const handleCreateFuelLog = async (e) => {
    e.preventDefault();
    if (!fuelForm.vehicle_id) {
      alert('Please select a vehicle');
      return;
    }
    setIsSubmitting(true);
    try {
      let targetBranchId = selectedBranchId !== 'ALL' ? selectedBranchId : userBranchId;
      if (!targetBranchId && fuelForm.trip_id) {
        const trip = trips.find((t) => String(t.id) === String(fuelForm.trip_id));
        if (trip?.origin_branch_id) targetBranchId = trip.origin_branch_id;
      }
      if (!targetBranchId && fuelForm.vehicle_id) {
        const veh = vehicles.find((v) => String(v.id) === String(fuelForm.vehicle_id));
        if (veh?.branch_id) targetBranchId = veh.branch_id;
      }
      if (!targetBranchId && branchList.length > 0) {
        targetBranchId = branchList[0].id;
      }

      const payload = {
        ...fuelForm,
        branch_id: targetBranchId,
      };
      const res = await api.post('/expenses/fuel-logs', payload);
      if (res.data?.success) {
        setShowFuelModal(false);
        setShowExpenseModal(false);
        setFuelForm((prev) => ({
          ...prev,
          litres: '',
          odometer_reading: '',
          fuel_station: '',
          total_amount: '',
        }));
        fetchSummary();
        fetchTabData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log fuel entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Driver Advance Submit
  const handleCreateAdvance = async (e) => {
    e.preventDefault();
    if (!advanceForm.driver_id) {
      alert('Driver is required for advance disbursal');
      return;
    }
    setIsSubmitting(true);
    try {
      let targetBranchId = selectedBranchId !== 'ALL' ? selectedBranchId : userBranchId;
      if (!targetBranchId && advanceForm.trip_id) {
        const trip = trips.find((t) => String(t.id) === String(advanceForm.trip_id));
        if (trip?.origin_branch_id) targetBranchId = trip.origin_branch_id;
      }
      if (!targetBranchId && branchList.length > 0) {
        targetBranchId = branchList[0].id;
      }

      const payload = {
        ...advanceForm,
        branch_id: targetBranchId,
      };
      const res = await api.post('/expenses/advance', payload);
      if (res.data?.success) {
        setShowAdvanceModal(false);
        setShowExpenseModal(false);
        setAdvanceForm((prev) => ({
          ...prev,
          amount: '',
          notes: '',
        }));
        fetchSummary();
        fetchTabData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to disburse advance');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Settlement Modal
  const handleOpenSettle = (trip) => {
    if (!trip) return;
    const tripAdvances = advances.filter((a) => String(a.trip_id) === String(trip.id));
    const fallbackAdv = tripAdvances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    const totalAdv = trip.driver_advance_total !== undefined ? Number(trip.driver_advance_total) : fallbackAdv;
    const totalExp = trip.total_operational_spend !== undefined ? Number(trip.total_operational_spend) : parseFloat(trip.total_expenses || 0);

    const own = (trip.vehicle?.ownership || 'OWN').toUpperCase();
    const isVendorOrMarket = own === 'MARKET' || own === 'ATTACHED';
    const vehCharge = parseFloat(trip.vehicle_charge || 0);

    let netBalance = 0;
    let settlementStatus = 'BALANCED';

    if (isVendorOrMarket) {
      // Net Payable to Vendor = Agreed Vehicle Charge - (Advances + Highway Expenses)
      netBalance = vehCharge - (totalAdv + totalExp);
      settlementStatus = netBalance > 0 ? 'PAYABLE_TO_VENDOR' : (netBalance < 0 ? 'RECOVER_FROM_VENDOR' : 'BALANCED');
    } else {
      // Driver Balance = Total Advances - Total Expenses
      netBalance = totalAdv - totalExp;
      settlementStatus = netBalance >= 0 ? 'REFUND_FROM_DRIVER' : 'PAYABLE_TO_DRIVER';
    }

    setSettleForm({
      trip_id: trip.id,
      driver_id: trip.driver_id || '',
      total_advances: totalAdv,
      total_expenses: totalExp,
      vehicle_charge: vehCharge,
      is_vendor_or_market: isVendorOrMarket,
      ownership: own,
      net_payable: netBalance,
      settlement_status: settlementStatus,
      payment_mode: 'CASH',
      notes: `Settlement for Trip ${trip.trip_number || trip.id}`,
    });
    setShowSettleModal(true);
  };

  // Confirm Trip Settlement
  const handleConfirmSettle = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        trip_id: settleForm.trip_id,
        vehicle_charge: settleForm.vehicle_charge || 0,
        remarks: settleForm.notes,
        payment_mode: settleForm.payment_mode,
      };
      const res = await api.post('/expenses/settle', payload);
      if (res.data?.success) {
        setShowSettleModal(false);
        fetchSummary();
        fetchTabData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Settlement failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Expense
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/expenses/${deleteTarget.id}`);
      if (res.data?.success) {
        setDeleteTarget(null);
        fetchSummary();
        fetchTabData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to void expense');
    }
  };

  // -------------------------------------------------------------
  // Data Table Column Definitions
  // -------------------------------------------------------------

  // 1. Columns for TRIP_EXPENSES & BRANCH_OVERHEADS
  const expenseColumns = useMemo(
    () => [
      {
        key: 'expense_date',
        header: 'Date & Voucher',
        sortable: true,
        width: 140,
        render: (val, row) => (
          <div className="flex flex-col">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {row.expense_date || 'Today'}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {row.voucher_number || row.bill_number || `EXP-${String(row.id).slice(0, 6)}`}
            </span>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Expense Head',
        sortable: false,
        width: 180,
        render: (val, row) => {
          const name = row.category?.name || 'Operating Cost';
          const isTrip = row.category ? row.category.is_trip_expense : Boolean(row.trip_id);
          return (
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isTrip ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div className="flex flex-col">
                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isTrip ? 'Trip Direct Cost' : 'Branch Overhead'}
                </span>
              </div>
            </div>
          );
        },
      },
      ...(activeTab === TAB_TRIP_EXPENSES
        ? [
            {
              key: 'trip',
              header: 'Trip # / Route',
              sortable: false,
              width: 180,
              render: (val, row) => (
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => row.trip && handleOpenTripPnl(row.trip)}
                      disabled={!row.trip}
                      className="font-mono text-xs font-black text-blue-400 hover:text-blue-300 text-left hover:underline cursor-pointer disabled:cursor-default"
                      title="Inspect Trip Profit & Loss breakdown"
                    >
                      {row.trip?.trip_number || 'Direct Fleet Run'}
                    </button>
                    {row.trip && (
                      <button
                        type="button"
                        onClick={() => handleOpenTripPnl(row.trip)}
                        className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 transition-all cursor-pointer"
                        title="View Trip P&L Dossier"
                      >
                        P&L
                      </button>
                    )}
                  </div>
                  {row.trip?.route && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                      {row.trip.route}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'vehicle',
              header: 'Vehicle / Driver',
              sortable: false,
              width: 160,
              render: (val, row) => (
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold tracking-wider text-cyan-400">
                    {row.vehicle?.vehicle_number || '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {row.driver?.name || 'Assigned Driver'}
                  </span>
                </div>
              ),
            },
          ]
        : [
            {
              key: 'branch',
              header: 'Station / Godown',
              sortable: false,
              width: 160,
              render: (val, row) => (
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {row.branch?.branch_name || row.branch?.name || userBranchName}
                  </span>
                </div>
              ),
            },
            {
              key: 'vendor_name',
              header: 'Vendor / Payee',
              sortable: false,
              width: 160,
              render: (val, row) => (
                <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                  {row.vendor_name || 'Direct Branch Petty'}
                </span>
              ),
            },
          ]),
      {
        key: 'payment_method',
        header: 'Payment Mode',
        sortable: true,
        width: 130,
        render: (val, row) => {
          const mode = row.payment_method || 'CASH';
          const isCash = mode === 'CASH';
          const isFastag = mode === 'FASTAG';
          const isFuelCard = mode === 'FUEL_CARD';
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                isCash
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : isFastag
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                  : isFuelCard
                  ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
              }`}
            >
              {mode}
            </span>
          );
        },
      },
      {
        key: 'remarks',
        header: 'Notes & Remarks',
        sortable: false,
        width: 200,
        render: (val, row) => (
          <span className="text-xs text-slate-700 dark:text-slate-300 truncate block max-w-[220px]" title={row.remarks || ''}>
            {row.remarks || '—'}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: 140,
        render: (val, row) => (
          <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
            ₹{parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        sortable: false,
        width: 60,
        render: (val, row) => (
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Void / Delete Expense"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    [isDark, activeTab, userBranchName]
  );

  // 2. Columns for FUEL_LOGS (KMPL Efficiency Display)
  const fuelColumns = useMemo(
    () => [
      {
        key: 'fuel_date',
        header: 'Date & Time',
        sortable: true,
        width: 130,
        render: (val, row) => (
          <div className="flex flex-col">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {row.fuel_date || 'Today'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {row.fuel_type || 'DIESEL'}
            </span>
          </div>
        ),
      },
      {
        key: 'vehicle',
        header: 'Vehicle Reg #',
        sortable: false,
        width: 150,
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-black tracking-wider text-slate-900 dark:text-cyan-400">
              {row.vehicle?.vehicle_number || 'N/A'}
            </span>
            <span className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">
              {row.driver?.name || 'Highway Fill'}
            </span>
          </div>
        ),
      },
      {
        key: 'odometer_reading',
        header: 'Odometer (km)',
        sortable: true,
        width: 140,
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
              {row.odometer_reading ? `${row.odometer_reading.toLocaleString()} km` : '—'}
            </span>
            {row.distance_covered_km > 0 && (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                +{row.distance_covered_km} km run
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'litres',
        header: 'Quantity (L)',
        sortable: true,
        width: 110,
        render: (val, row) => (
          <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">
            {parseFloat(row.litres || 0).toFixed(1)} L
          </span>
        ),
      },
      {
        key: 'rate_per_litre',
        header: 'Rate / L',
        sortable: true,
        width: 100,
        render: (val, row) => (
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            ₹{parseFloat(row.rate_per_litre || 0).toFixed(2)}
          </span>
        ),
      },
      {
        key: 'kmpl_calculated',
        header: 'Economy (KMPL)',
        sortable: true,
        width: 160,
        render: (val, row) => {
          const kmpl = row.kmpl_calculated;
          if (!kmpl) {
            return <span className="text-slate-500 text-xs font-mono">— Baseline</span>;
          }
          const isHigh = kmpl >= 4.0;
          const isModerate = kmpl >= 3.0 && kmpl < 4.0;
          return (
            <div className="flex items-center space-x-1.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border ${
                  isHigh
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : isModerate
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                }`}
              >
                ⚡ {kmpl} KMPL
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium hidden sm:inline">
                {isHigh ? 'Efficient' : isModerate ? 'Normal' : 'High Fuel'}
              </span>
            </div>
          );
        },
      },
      {
        key: 'fuel_station',
        header: 'Fuel Pump / Station',
        sortable: false,
        width: 170,
        render: (val, row) => (
          <span className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate block max-w-[160px]">
            {row.fuel_station || 'Highway Bunk'}
          </span>
        ),
      },
      {
        key: 'total_amount',
        header: 'Total Diesel Cost',
        sortable: true,
        align: 'right',
        width: 140,
        render: (val, row) => (
          <span className="font-mono font-black text-sm text-sky-700 dark:text-cyan-400">
            ₹{parseFloat(row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
    ],
    [isDark]
  );

  // 3. Columns for DRIVER_ADVANCES
  const advanceColumns = useMemo(
    () => [
      {
        key: 'disbursed_date',
        header: 'Disbursed Date',
        sortable: true,
        width: 130,
        render: (val, row) => (
          <div className="flex flex-col">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {row.disbursed_date || 'Today'}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {row.advance_number || `ADV-${String(row.id).slice(0, 6)}`}
            </span>
          </div>
        ),
      },
      {
        key: 'driver',
        header: 'Driver / Pilot',
        sortable: false,
        width: 180,
        render: (val, row) => (
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
              {(row.driver?.name || 'D')[0]}
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {row.driver?.name || 'Driver'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {row.driver?.phone || 'On Fleet Trip'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'trip',
        header: 'Trip # & Destination',
        sortable: false,
        width: 175,
        render: (val, row) => (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => row.trip && handleOpenTripPnl(row.trip)}
              disabled={!row.trip}
              className="font-mono text-xs font-black text-blue-600 dark:text-cyan-400 hover:text-blue-700 text-left hover:underline cursor-pointer disabled:cursor-default"
              title="Click to view full Trip Profit & Loss Dossier"
            >
              {row.trip?.trip_number || 'En-Route Run'}
            </button>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
              {row.trip?.origin_city && row.trip?.destination_city
                ? `${row.trip.origin_city} ➔ ${row.trip.destination_city}`
                : (row.trip?.route || 'Highway Dispatch')}
            </span>
          </div>
        ),
      },
      {
        key: 'payment_mode',
        header: 'Disbursal Mode',
        sortable: true,
        width: 120,
        render: (val, row) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            {row.payment_mode || 'CASH'}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'This Advance',
        sortable: true,
        align: 'right',
        width: 125,
        render: (val, row) => (
          <div className="text-right">
            <span className="font-mono font-black text-xs text-amber-700 dark:text-amber-400">
              ₹{parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Bhatta Disbursal
            </div>
          </div>
        ),
      },
      {
        key: 'total_spend',
        header: 'Total Spent in Drive',
        sortable: false,
        align: 'right',
        width: 155,
        render: (val, row) => {
          const fin = row.trip_financials;
          const totalSpend = fin?.totalDriveSpend ?? parseFloat(row.amount || 0);
          const exp = fin?.totalExpenses ?? 0;
          const adv = fin?.driverAdvance ?? parseFloat(row.amount || 0);
          return (
            <div className="text-right">
              <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100">
                ₹{Number(totalSpend).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                Adv ₹{Number(adv).toLocaleString('en-IN', { maximumFractionDigits: 0 })} • Exp ₹{Number(exp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          );
        },
      },
      {
        key: 'profit_loss',
        header: 'Trip Profit / Loss',
        sortable: false,
        align: 'right',
        width: 190,
        render: (val, row) => {
          const fin = row.trip_financials;
          if (!fin || (!fin.grossRevenue && !fin.totalDriveSpend)) {
            return <span className="text-[11px] text-slate-500 font-mono">— Pending</span>;
          }
          const isProf = fin.netProfitLoss >= 0;
          return (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center space-x-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <span className="font-bold">Rev:</span>
                <span className="font-black text-slate-900 dark:text-slate-100">₹{Number(fin.grossRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <span
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black font-mono border whitespace-nowrap ${
                  isProf
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                }`}
                title={isProf ? 'Net Trip Profit' : 'Net Trip Operating Loss'}
              >
                {isProf ? <TrendingUp className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" /> : <TrendingDown className="w-3 h-3 text-rose-700 dark:text-rose-400 shrink-0" />}
                <span>
                  {isProf ? '+' : '-'}₹{Math.abs(Number(fin.netProfitLoss)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-sans font-black ml-0.5">
                  {isProf ? 'PROFIT' : 'LOSS'}
                </span>
              </span>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        align: 'center',
        width: 175,
        render: (val, row) => (
          <div className="flex items-center justify-center space-x-1.5">
            <button
              type="button"
              onClick={() => row.trip && handleOpenTripPnl(row.trip)}
              disabled={!row.trip}
              className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap"
              title="Inspect Trip Income, Expenses, & P&L breakdown"
            >
              <Eye className="w-3 h-3" />
              <span>P&L Details</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenSettle(row.trip)}
              disabled={!row.trip}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap"
              title="Open driver trip settlement"
            >
              Reconcile
            </button>
          </div>
        ),
      },
    ],
    [isDark, handleOpenTripPnl, handleOpenSettle]
  );

  // Unified Columns for OPERATIONAL (Trip-Wise Operational Ledger)
  const tripWiseColumns = useMemo(
    () => [
      {
        key: 'trip',
        header: 'Trip # & Route',
        sortable: false,
        width: 185,
        minWidth: 165,
        render: (val, row) => (
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => handleOpenTripPnl(row)}
                className="font-mono text-xs font-black text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                title="Inspect Trip Profit & Loss breakdown"
              >
                {row.trip_number || 'Direct Fleet Run'}
              </button>
              <button
                type="button"
                onClick={() => handleOpenTripPnl(row)}
                className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                title="View Trip P&L Dossier"
              >
                P&L
              </button>
            </div>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px] mt-0.5">
              {row.origin_city || row.originBranch?.city || 'Origin'} ➔ {row.destination_city || row.destBranch?.city || 'Destination'}
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {row.trip_date || (row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Active')}
            </span>
          </div>
        ),
      },
      {
        key: 'vehicle',
        header: 'Vehicle & Driver',
        sortable: false,
        width: 200,
        minWidth: 180,
        render: (val, row) => {
          const v = row.vehicle;
          const d = row.driver;
          const own = (v?.ownership || 'OWN').toUpperCase();
          
          let ownershipLabel = 'Company Owned';
          let badgeClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
          if (own === 'MARKET') {
            ownershipLabel = 'Market Hired';
            badgeClass = 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
          } else if (own === 'ATTACHED') {
            ownershipLabel = 'Vendor Attached';
            badgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
          }

          // Format vehicle type & capacity
          const rawType = v?.vehicle_type ? v.vehicle_type.replace(/_/g, ' ') : 'Truck';
          const formattedType = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
          const capText = v?.capacity_ton && parseFloat(v.capacity_ton) > 0 ? `${parseFloat(v.capacity_ton)}T` : '';
          const typeAndCap = capText ? `${formattedType} (${capText})` : formattedType;

          return (
            <div className="flex flex-col space-y-0.5">
              {/* Row 1: Vehicle Plate & Ownership Badge */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-black tracking-wider text-slate-900 dark:text-cyan-400">
                  {v?.vehicle_number || '—'}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border whitespace-nowrap ${badgeClass}`}>
                  {ownershipLabel}
                </span>
              </div>

              {/* Row 2: Vehicle Type & Load Mode */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {typeAndCap}
                </span>
                {row.load_type && (
                  <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                    {row.load_type}
                  </span>
                )}
              </div>

              {/* Row 3: Assigned Driver & Contact */}
              <div className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[185px]">
                <span className="font-semibold">{d?.name || 'Assigned Driver'}</span>
                {d?.phone && (
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 ml-1">
                    • {d.phone}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'vehicle_charge',
        header: 'Vehicle Charge',
        sortable: false,
        width: 140,
        minWidth: 130,
        render: (val, row) => {
          const raw = row.vehicle_charge;
          const charge = raw !== undefined && raw !== null && raw !== '' ? Number(raw) : 0;
          const own = (row.vehicle?.ownership || 'OWN').toUpperCase();
          const isMarket = own === 'MARKET';
          const isAttached = own === 'ATTACHED';

          let subtitle = 'Company Owned';
          if (charge > 0) {
            subtitle = isMarket ? 'Market Hire Rate' : (isAttached ? 'Vendor Rate' : 'Agreed Rate');
          } else {
            subtitle = isMarket ? 'Market (Rate Pending)' : (isAttached ? 'Vendor (Rate Pending)' : 'Company Fleet (₹0)');
          }

          return (
            <div className="flex flex-col">
              <span className={`font-mono font-black text-xs ${
                charge > 0 
                  ? 'text-amber-700 dark:text-amber-400' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                ₹{charge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {subtitle}
              </span>
            </div>
          );
        },
      },
      {
        key: 'driver_advance',
        header: 'Driver Bhatta / Advance',
        sortable: false,
        width: 150,
        minWidth: 135,
        render: (val, row) => {
          const adv = Number(row.driver_advance_total || 0);
          const count = (row.advances || []).length;
          return (
            <div className="flex flex-col">
              <span className="font-mono font-black text-xs text-amber-700 dark:text-amber-400">
                ₹{adv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {count > 0 ? `${count} advance slip${count > 1 ? 's' : ''}` : 'No advance logged'}
              </span>
            </div>
          );
        },
      },
      {
        key: 'fuel_cost',
        header: 'Diesel & Fuel Cost',
        sortable: false,
        width: 145,
        minWidth: 130,
        render: (val, row) => {
          const fuel = Number(row.fuel_cost_total || 0);
          const litres = Number(row.fuel_litres_total || 0);
          return (
            <div className="flex flex-col">
              <span className="font-mono font-black text-xs text-sky-700 dark:text-cyan-400">
                ₹{fuel.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {litres > 0 ? `${litres.toFixed(1)} L diesel` : (fuel > 0 ? 'Direct fuel slip' : 'No fuel logged')}
              </span>
            </div>
          );
        },
      },
      {
        key: 'running_expenses',
        header: 'Tolls & Running Rep.',
        sortable: false,
        width: 145,
        minWidth: 130,
        render: (val, row) => {
          const toll = Number(row.running_expense_total || 0);
          const count = (row.expenses || []).filter((e) => {
            const cat = (e.category?.name || '').toLowerCase();
            return !cat.includes('fuel') && !cat.includes('diesel');
          }).length;
          return (
            <div className="flex flex-col">
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                ₹{toll.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {count > 0 ? `${count} running voucher${count > 1 ? 's' : ''}` : '—'}
              </span>
            </div>
          );
        },
      },
      {
        key: 'total_operational_spend',
        header: 'Total Fleet Outflow',
        sortable: false,
        width: 145,
        minWidth: 135,
        render: (val, row) => {
          const total = Number(row.total_operational_spend || 0);
          return (
            <div className="flex flex-col">
              <span className="font-mono font-black text-xs text-rose-700 dark:text-rose-400">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Bhatta + Fuel + Tolls
              </span>
            </div>
          );
        },
      },
      {
        key: 'profit_loss',
        header: 'Freight Revenue & P&L',
        sortable: false,
        width: 195,
        minWidth: 180,
        render: (val, row) => {
          const rev = Number(row.gross_revenue || 0);
          const pnl = Number(row.net_profit_loss || 0);
          const isProf = pnl >= 0;
          return (
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-slate-600 dark:text-slate-400 font-bold">Rev:</span>
                <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                  ₹{rev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border font-mono whitespace-nowrap ${
                  isProf
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                }`}
              >
                {isProf ? '+' : '-'}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                <span className="text-[9px] font-sans font-bold ml-1 opacity-90">
                  ({isProf ? 'PROFIT' : 'LOSS'})
                </span>
              </span>
            </div>
          );
        },
      },
      {
        key: 'settlement_actions',
        header: 'Settle & Actions',
        sortable: false,
        align: 'center',
        width: 210,
        minWidth: 195,
        render: (val, row) => {
          const isSettled = row.settlement_status === 'SETTLED';
          return (
            <div className="flex items-center justify-center space-x-1.5">
              <button
                type="button"
                onClick={() => handleOpenRecordModal('TRIP_DIRECT', row)}
                className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                title="Log fuel, bhatta, or running cost for this trip"
              >
                <Plus className="w-3 h-3" />
                <span>+ Cost</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenTripPnl(row)}
                className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                title="Inspect Trip Income, Expenses, & P&L breakdown"
              >
                <Eye className="w-3 h-3" />
                <span>P&L Dossier</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenSettle(row)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                  isSettled
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-600 hover:text-white'
                    : 'bg-amber-50 dark:bg-blue-600/20 text-amber-800 dark:text-blue-400 border-amber-300 dark:border-blue-500/30 hover:bg-amber-600 hover:text-white'
                }`}
                title="Reconcile & settle driver trip account"
              >
                {isSettled ? 'Settled ✓' : 'Reconcile'}
              </button>
            </div>
          );
        },
      },
    ],
    [handleOpenTripPnl, handleOpenSettle, handleOpenRecordModal, isDark]
  );

  // Active Table Data & Columns selection
  const currentTableConfig = useMemo(() => {
    switch (activeTab) {
      case TAB_BRANCH_OVERHEADS:
        return {
          data: expenses,
          columns: expenseColumns,
          exportFilename: 'Branch_Godown_Overheads',
          emptyTitle: 'No Branch Overheads',
          emptySubtitle: 'No rent, stationery, or utility vouchers logged for this station.',
        };
      case TAB_OPERATIONAL:
      default:
        return {
          data: tripWiseExpenses,
          columns: tripWiseColumns,
          exportFilename: 'Trip_Wise_Operational_Expenses',
          emptyTitle: 'No Trip Expenses Logged',
          emptySubtitle: 'No active line-haul trips or operational running costs recorded for this period.',
        };
    }
  }, [activeTab, expenses, tripWiseExpenses, expenseColumns, tripWiseColumns]);

  // Derived Fleet Avg KMPL
  const fleetAvgKmpl = useMemo(() => {
    const validLogs = fuelLogs.filter((f) => f.kmpl_calculated && parseFloat(f.kmpl_calculated) > 0);
    if (validLogs.length === 0) return '—';
    const sum = validLogs.reduce((acc, f) => acc + parseFloat(f.kmpl_calculated), 0);
    return (sum / validLogs.length).toFixed(2);
  }, [fuelLogs]);

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-full">
          
          {/* Top Header & Single-Row Fast Action Toolbar */}
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/20 shrink-0" />
                <h1 className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Operating Expenses & Fuel Logs
                </h1>
              </div>
              <p className={`text-xs lg:text-[13px] xl:text-sm mt-0.5 sm:mt-1 truncate sm:whitespace-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Operational cash outflows: highway running costs, diesel logs, driver bhatta, and branch godown overheads.
              </p>
            </div>

            {/* Quick Action Toolbar - Column-wise on small screens, row on sm+ */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Professional Branch Filter Dropdown for Admins / Locked Badge for Branch Staff */}
              {isAdmin ? (
                <BranchFilterDropdown
                  selectedBranchId={selectedBranchId}
                  onChange={(newId) => {
                    setSelectedBranchId(newId);
                    setPage(1);
                  }}
                  branches={formattedBranches}
                  allLabel="All Branches"
                  allSubtitle="Consolidated Network View"
                  showLabel={false}
                  size="sm"
                  align="right"
                  searchable={true}
                  className="shrink-0"
                />
              ) : (
                <div
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 ${
                    isDark ? 'bg-slate-900/80 border-slate-700/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                  }`}
                  title={`Operational station locked to your assigned login branch: ${userBranchName}`}
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate max-w-[150px]">{userBranchName}</span>
                  <span className="text-[10px] text-amber-500 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/20 px-1.5 py-0.5 rounded-md font-mono">
                    Assigned
                  </span>
                </div>
              )}

              {/* Single Unified Record Expense Action Button */}
              {canCreateExpense && (
                <button
                  type="button"
                  onClick={() => handleOpenRecordModal()}
                  className={`flex items-center space-x-2 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap ${
                    activeTab === TAB_BRANCH_OVERHEADS
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
                  }`}
                  title={activeTab === TAB_BRANCH_OVERHEADS ? "Record Station & Godown Overhead Voucher" : "Record direct trip cost, fuel refill, or driver bhatta"}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>{activeTab === TAB_BRANCH_OVERHEADS ? 'Record Overhead Voucher' : 'Record Expense'}</span>
                </button>
              )}
            </div>
          </div>


          {/* Executive Summary KPI Ribbon (5 Cards - Single Row on lg+) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Card 1: Total Outflows -> Trip-Wise Operational */}
            <div
              onClick={() => handleTabChange(TAB_OPERATIONAL)}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] select-none ${
                activeTab === TAB_OPERATIONAL
                  ? isDark
                    ? 'bg-[#0B1020] border-amber-500/50 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20'
                    : 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : isDark
                  ? 'bg-[#0B1020] border-slate-800/80 hover:border-slate-700 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
              title="Click to view Trip-Wise Operational Outflows"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Outflows</span>
                <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="font-mono text-base sm:text-lg lg:text-xl font-black text-amber-700 dark:text-amber-400">
                  ₹{Number(summaryData.totalOutflows || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">
                  <span>Trip: ₹{Number(summaryData.tripDirectExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  <span>Ovh: ₹{Number(summaryData.branchOverheads || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Diesel Spend -> Trip-Wise Operational */}
            <div
              onClick={() => handleTabChange(TAB_OPERATIONAL)}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] select-none ${
                activeTab === TAB_OPERATIONAL
                  ? isDark
                    ? 'bg-[#0B1020] border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/20'
                    : 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                  : isDark
                  ? 'bg-[#0B1020] border-slate-800/80 hover:border-slate-700 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
              title="Click to view Trip-Wise Fuel Outflows"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Diesel & Fuel Cost</span>
                <div className="p-1.5 rounded-xl bg-sky-50 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/20">
                  <Fuel className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="font-mono text-base sm:text-lg lg:text-xl font-black text-sky-700 dark:text-cyan-400">
                  ₹{Number(summaryData.totalFuelAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">
                  <span>{Number(summaryData.totalFuelLitres || 0).toFixed(0)} L filled</span>
                  <span>Avg ₹{summaryData.avgFuelRate}/L</span>
                </div>
              </div>
            </div>

            {/* Card 3: Fleet KMPL */}
            <div
              onClick={() => handleTabChange(TAB_OPERATIONAL)}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] select-none ${
                activeTab === TAB_OPERATIONAL
                  ? isDark
                    ? 'bg-[#0B1020] border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : isDark
                  ? 'bg-[#0B1020] border-slate-800/80 hover:border-slate-700 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
              title="Fleet Fuel Efficiency"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Fleet Fuel Economy</span>
                <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <Gauge className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-mono text-base sm:text-lg lg:text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {fleetAvgKmpl}
                  </span>
                  {fleetAvgKmpl !== '—' && <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">KMPL</span>}
                </div>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">
                  <span>Dynamic odo</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{summaryData.fuelEntriesCount || 0} logs</span>
                </div>
              </div>
            </div>

            {/* Card 4: Driver Bhatta -> Trip-Wise Operational */}
            <div
              onClick={() => handleTabChange(TAB_OPERATIONAL)}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] select-none ${
                activeTab === TAB_OPERATIONAL
                  ? isDark
                    ? 'bg-[#0B1020] border-blue-500/50 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                    : 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : isDark
                  ? 'bg-[#0B1020] border-slate-800/80 hover:border-slate-700 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
              title="Click to view Driver Bhatta in Trip Ledger"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Driver Bhatta</span>
                <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="font-mono text-base sm:text-lg lg:text-xl font-black text-blue-700 dark:text-blue-400">
                  ₹{Number(summaryData.totalDriverAdvances || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">
                  <span>Trip cash disbursals</span>
                  <span className="text-blue-700 dark:text-blue-400 font-semibold">Trip-wise</span>
                </div>
              </div>
            </div>

            {/* Card 5: Branch Overheads -> Tab 2 */}
            <div
              onClick={() => handleTabChange(TAB_BRANCH_OVERHEADS)}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] select-none ${
                activeTab === TAB_BRANCH_OVERHEADS
                  ? isDark
                    ? 'bg-[#0B1020] border-purple-500/50 shadow-lg shadow-purple-500/10 ring-2 ring-purple-500/20'
                    : 'bg-white border-purple-500 shadow-md ring-2 ring-purple-500/20'
                  : isDark
                  ? 'bg-[#0B1020] border-slate-800/80 hover:border-slate-700 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
              title="Click to view Branch & Godown Overheads"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Station Overheads</span>
                <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="font-mono text-base sm:text-lg lg:text-xl font-black text-purple-700 dark:text-purple-400">
                  ₹{Number(summaryData.branchOverheads || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">
                  <span>Rent & Stationery</span>
                  <span>Petty Ledger</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2 Primary Modern Transport Accounting Pillars */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              {/* Level 1: 2 Main Expense Types */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleTabChange(TAB_OPERATIONAL)}
                  className={`flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === TAB_OPERATIONAL
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>1. Operational & Fleet Expenses (Trip-Wise)</span>
                  <span className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === TAB_OPERATIONAL
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Bhatta, Diesel, Tolls & P&L
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange(TAB_BRANCH_OVERHEADS)}
                  className={`flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === TAB_BRANCH_OVERHEADS
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>2. Staff & Company Overheads</span>
                  <span className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === TAB_BRANCH_OVERHEADS
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Office & Godown
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Master Responsive DataTable */}
          <DataTable
            columns={currentTableConfig.columns}
            data={currentTableConfig.data}
            totalCount={totalCount}
            isLoading={tableLoading}
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
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder={
              activeTab === TAB_BRANCH_OVERHEADS
                ? 'Search voucher #, vendor, category, remarks...'
                : 'Search trip #, vehicle plate, driver name, route...'
            }
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={({ fromDate: newFrom, toDate: newTo }) => {
              setFromDate(newFrom);
              setToDate(newTo);
              setPage(1);
            }}
            headerFiltersSlot={
              <div className="flex items-center space-x-2">
                {/* Fleet Ownership Filter for Operational Trip Ledger */}
                {activeTab === TAB_OPERATIONAL && (
                  <CustomFilterDropdown
                    value={ownershipFilter}
                    onChange={(val) => {
                      setOwnershipFilter(val);
                      setPage(1);
                    }}
                    options={ownershipOptions}
                    allLabel="All Fleet Types"
                    icon={Truck}
                    searchable={false}
                    isDark={isDark}
                  />
                )}

                {/* Custom Category Filter Popover for Overheads */}
                {activeTab === TAB_BRANCH_OVERHEADS && (
                  <CustomFilterDropdown
                    value={categoryFilter}
                    onChange={(val) => {
                      setCategoryFilter(val);
                      setPage(1);
                    }}
                    options={categoryOptions}
                    allLabel="All Overhead Categories"
                    icon={Tag}
                    searchable={true}
                    isDark={isDark}
                  />
                )}

                {/* Custom Payment Mode Filter Popover */}
                <CustomFilterDropdown
                  value={paymentModeFilter}
                  onChange={(val) => {
                    setPaymentModeFilter(val);
                    setPage(1);
                  }}
                  options={paymentModeOptions}
                  allLabel="All Payment Modes"
                  icon={CreditCard}
                  searchable={false}
                  isDark={isDark}
                />
              </div>
            }
            exportFilename={currentTableConfig.exportFilename}
            emptyTitle={currentTableConfig.emptyTitle}
            emptySubtitle={currentTableConfig.emptySubtitle}
          />

          {/* ========================================================= */}
          {/* Modal 1: Record Operating Expense (Trip Direct vs Overhead) */}
          {/* ========================================================= */}
          <Modal
            isOpen={Boolean(showExpenseModal || showFuelModal || showAdvanceModal)}
            onClose={() => {
              setShowExpenseModal(false);
              setShowFuelModal(false);
              setShowAdvanceModal(false);
            }}
          >
            {(showExpenseModal || showFuelModal || showAdvanceModal) && (
              <div className={`relative w-full max-w-2xl max-h-[92vh] my-auto overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-7 z-10 transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
              }`}>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border ${
                      recordModalType === 'FUEL'
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                        : recordModalType === 'DRIVER_BHATTA'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : recordModalType === 'BRANCH_OVERHEAD'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    }`}>
                      {recordModalType === 'FUEL' ? (
                        <Fuel className="w-5 h-5" />
                      ) : recordModalType === 'DRIVER_BHATTA' ? (
                        <Coins className="w-5 h-5" />
                      ) : recordModalType === 'BRANCH_OVERHEAD' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Receipt className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">
                        {recordModalType === 'FUEL'
                          ? 'Log Diesel & Fuel Refill'
                          : recordModalType === 'DRIVER_BHATTA'
                          ? 'Disburse Driver Bhatta & Advance'
                          : recordModalType === 'BRANCH_OVERHEAD'
                          ? 'Record Staff & Godown Overhead'
                          : 'Record Trip Direct Running Cost'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {recordModalType === 'FUEL'
                          ? 'Highway bunk refuelling, odometer capture & efficiency metrics.'
                          : recordModalType === 'DRIVER_BHATTA'
                          ? 'Trip running advance, toll cash & daily food allowance.'
                          : recordModalType === 'BRANCH_OVERHEAD'
                          ? 'Station rent, electricity, stationery & petty cash vouchers.'
                          : 'FASTag tolls, police/RTO, repairs, weighbridge & running costs.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpenseModal(false);
                      setShowFuelModal(false);
                      setShowAdvanceModal(false);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Expense Modal Scope / Record Type Selector */}
                {recordModalType === 'BRANCH_OVERHEAD' ? (
                  /* Staff & Godown Overhead Voucher Context (No Fleet Tabs) */
                  <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 mb-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                          Station & Godown Overhead Voucher
                        </span>
                        <p className="text-[10px] text-purple-600/90 dark:text-purple-400">
                          Station rent, electricity, stationery & petty cash vouchers
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Station Scope
                    </span>
                  </div>
                ) : (
                  /* Operational Expense Mode: ONLY 3 Tabs (Trip Running, Diesel / Fuel, Driver Bhatta) - No Station Overhead */
                  <div className="space-y-1.5 mb-5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Select Expense Record Type:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Option 1: Trip Direct */}
                      <button
                        type="button"
                        onClick={() => handleSelectRecordType('TRIP_DIRECT')}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          recordModalType === 'TRIP_DIRECT'
                            ? isDark
                              ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/25 shadow-md shadow-blue-950/30'
                              : 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : isDark
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <Truck className={`w-3.5 h-3.5 ${recordModalType === 'TRIP_DIRECT' ? (isDark ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${recordModalType === 'TRIP_DIRECT' ? (isDark ? 'text-white' : 'text-blue-950') : ''}`}>
                            Trip Running
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 truncate">Tolls, RTO & repairs</p>
                      </button>

                      {/* Option 2: Diesel & Fuel */}
                      <button
                        type="button"
                        onClick={() => handleSelectRecordType('FUEL')}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          recordModalType === 'FUEL'
                            ? isDark
                              ? 'bg-cyan-950/60 border-cyan-500 ring-2 ring-cyan-500/25 shadow-md shadow-cyan-950/30'
                              : 'bg-cyan-50/90 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                            : isDark
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <Fuel className={`w-3.5 h-3.5 ${recordModalType === 'FUEL' ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${recordModalType === 'FUEL' ? (isDark ? 'text-white' : 'text-cyan-950') : ''}`}>
                            Diesel / Fuel
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 truncate">Pump refill & litres</p>
                      </button>

                      {/* Option 3: Driver Bhatta */}
                      <button
                        type="button"
                        onClick={() => handleSelectRecordType('DRIVER_BHATTA')}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          recordModalType === 'DRIVER_BHATTA'
                            ? isDark
                              ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/25 shadow-md shadow-amber-950/30'
                              : 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                            : isDark
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <Coins className={`w-3.5 h-3.5 ${recordModalType === 'DRIVER_BHATTA' ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${recordModalType === 'DRIVER_BHATTA' ? (isDark ? 'text-white' : 'text-amber-950') : ''}`}>
                            Driver Bhatta
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 truncate">Advance & allowance</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Form 1: Trip Direct & Branch Overhead Expense */}
                {(recordModalType === 'TRIP_DIRECT' || recordModalType === 'BRANCH_OVERHEAD') && (
                  <form onSubmit={handleCreateExpense} className="space-y-4">
                    {/* Dynamic Assignment: Trip Direct vs Branch Overhead */}
                    {expenseForm.expense_type === 'TRIP_DIRECT' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Linked Trip # (Optional)
                        </label>
                        <div className="relative">
                          <select
                            value={expenseForm.trip_id}
                            onChange={(e) => handleExpenseTripChange(e.target.value)}
                            className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-medium border outline-none appearance-none cursor-pointer transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                            }`}
                          >
                            <option value="">No Trip (General Fleet)</option>
                            {filteredTrips.map((t) => (
                              <option key={t.id} value={t.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                                {t.trip_number} {t.route ? `• ${t.route}` : ''}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Vehicle Reg #
                        </label>
                        <div className="relative">
                          <select
                            value={expenseForm.vehicle_id}
                            onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                            className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-bold font-mono border outline-none appearance-none cursor-pointer transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-cyan-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                : 'bg-slate-50/70 border-slate-200 text-blue-700 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                            }`}
                          >
                            <option value="">No Vehicle</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                                {v.vehicle_number}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Target Station / Godown Hub <span className="text-purple-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          disabled={!isAdmin}
                          value={expenseForm.branch_id}
                          onChange={(e) => setExpenseForm({ ...expenseForm, branch_id: e.target.value })}
                          className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-bold border outline-none appearance-none cursor-pointer transition-all ${
                            !isAdmin ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80' : ''
                          } ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15'
                          }`}
                        >
                          {(isAdmin ? branchList : (branchList.filter(b => String(b.id) === String(userBranchId)).length > 0 ? branchList.filter(b => String(b.id) === String(userBranchId)) : branchList)).map((b) => (
                            <option key={b.id} value={b.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                              {b.name} ({b.code || 'HUB'})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Category & Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Expense Head <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={expenseForm.category_id}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                          className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-bold border outline-none appearance-none cursor-pointer transition-all ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                          }`}
                        >
                          {categories
                            .filter((c) =>
                              expenseForm.expense_type === 'TRIP_DIRECT' ? c.is_trip_expense : !c.is_trip_expense
                            )
                            .map((c) => (
                              <option key={c.id} value={c.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-base font-black text-emerald-600 dark:text-emerald-400 pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          className={`w-full rounded-xl pl-8 pr-3.5 py-2 text-base font-mono font-black border outline-none transition-all ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                              : 'bg-slate-50/70 border-slate-200 text-emerald-600 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Payment Method
                      </label>
                      <div className="relative">
                        <select
                          value={expenseForm.payment_method}
                          onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                          className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                          }`}
                        >
                          <option value="CASH">Cash (Petty Cash)</option>
                          <option value="FASTAG">FASTag Toll Wallet</option>
                          <option value="FUEL_CARD">Fuel Fleet Card</option>
                          <option value="UPI">UPI / QR Code</option>
                          <option value="BANK_TRANSFER">Direct Bank NEFT</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Expense Date
                      </label>
                      <input
                        type="date"
                        required
                        value={expenseForm.expense_date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                        className={`w-full rounded-xl px-3.5 py-2 text-xs font-medium border outline-none transition-all ${
                          isDark
                            ? 'bg-slate-900/90 border-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Vendor & Voucher # */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Vendor / Payee Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Navkar Weighbridge / Landlord"
                        value={expenseForm.vendor_name}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-xs border outline-none transition-all ${
                          isDark
                            ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Bill / Voucher Ref #
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SLIP-8921"
                        value={expenseForm.bill_number}
                        onChange={(e) => setExpenseForm({ ...expenseForm, bill_number: e.target.value })}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono border outline-none transition-all ${
                          isDark
                            ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Operational Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Operational Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tyre puncture repair at NH-48 toll plaza"
                      value={expenseForm.remarks}
                      onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-xs border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                      }`}
                    />
                  </div>

                  {/* Submit Footer */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowExpenseModal(false)}
                      className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-6 py-2.5 text-xs text-white font-bold rounded-xl shadow-lg flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                        recordModalType === 'BRANCH_OVERHEAD'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
                      }`}
                    >
                      {isSubmitting ? (
                        <span>{recordModalType === 'BRANCH_OVERHEAD' ? 'Saving Overhead...' : 'Saving Expense...'}</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{recordModalType === 'BRANCH_OVERHEAD' ? 'Save Overhead Voucher' : 'Save Operating Expense'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
                )}

                {/* Form 2: Log Diesel & Fuel Refill (Executive Calculator) */}
                {recordModalType === 'FUEL' && (
                  <form onSubmit={handleCreateFuelLog} className="space-y-4">
                    {/* Vehicle & Trip Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Vehicle Reg # <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={fuelForm.vehicle_id}
                            onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                            className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-mono font-bold border outline-none appearance-none cursor-pointer transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                                : 'bg-slate-50/70 border-slate-200 text-cyan-800 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
                            }`}
                          >
                            <option value="">Select Fleet Vehicle</option>
                            {filteredVehicles.map((v) => (
                              <option key={v.id} value={v.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                                {v.vehicle_number}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Linked Trip (Optional)
                        </label>
                        <div className="relative">
                          <select
                            value={fuelForm.trip_id}
                            onChange={(e) => handleFuelTripChange(e.target.value)}
                            className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-medium border outline-none appearance-none cursor-pointer transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                                : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
                            }`}
                          >
                            <option value="">No Active Trip</option>
                            {filteredTrips.map((t) => (
                              <option key={t.id} value={t.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                                {t.trip_number} {t.route ? `• ${t.route}` : ''}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Odometer Reading & Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Odometer Reading (km) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <Gauge className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                          <input
                            type="number"
                            required
                            placeholder="e.g. 142580"
                            value={fuelForm.odometer_reading}
                            onChange={(e) => setFuelForm({ ...fuelForm, odometer_reading: e.target.value })}
                            className={`w-full rounded-xl pl-9 pr-12 py-2 text-xs font-mono font-bold border outline-none transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
                            }`}
                          />
                          <span className="absolute right-3.5 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                            KM
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Fuel Date
                        </label>
                        <input
                          type="date"
                          required
                          value={fuelForm.fuel_date}
                          onChange={(e) => setFuelForm({ ...fuelForm, fuel_date: e.target.value })}
                          className={`w-full rounded-xl px-3.5 py-2 text-xs font-medium border outline-none transition-all ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
                          }`}
                        />
                      </div>
                    </div>

                    {/* High-Contrast Interactive Fuel Cost Calculator Widget */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isDark
                        ? 'bg-slate-900/70 border-slate-800 shadow-inner'
                        : 'bg-slate-50/90 border-slate-200/80 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-1.5">
                          <Fuel className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Fuel Quantity & Rate
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          ⚡ Live Outflow Calculator
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Litres Filled (L) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="e.g. 80.0"
                              value={fuelForm.litres}
                              onChange={(e) => setFuelForm({ ...fuelForm, litres: e.target.value })}
                              className={`w-full rounded-xl pl-3.5 pr-8 py-2 text-sm font-mono font-black border outline-none transition-all ${
                                isDark
                                  ? 'bg-slate-950 border-slate-700 text-amber-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                                  : 'bg-white border-slate-300 text-amber-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 shadow-2xs'
                              }`}
                            />
                            <span className="absolute right-3 text-xs font-black text-slate-400">L</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Rate per Litre (₹/L) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-xs font-black text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="94.50"
                              value={fuelForm.rate_per_litre}
                              onChange={(e) => setFuelForm({ ...fuelForm, rate_per_litre: e.target.value })}
                              className={`w-full rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-black border outline-none transition-all ${
                                isDark
                                  ? 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                                  : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 shadow-2xs'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Executive Contrast Total Display Card */}
                      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#0A1020] text-white p-4 rounded-xl border border-cyan-500/30 shadow-md flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
                            Total Diesel Outflow
                          </span>
                          <span className="text-[11px] text-slate-300 font-medium">
                            {fuelForm.litres && fuelForm.rate_per_litre
                              ? `${fuelForm.litres} L × ₹${fuelForm.rate_per_litre}/L`
                              : 'Enter quantity & rate above'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xl sm:text-2xl font-black text-cyan-300 drop-shadow-sm">
                            ₹{fuelForm.total_amount ? Number(fuelForm.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fuel Station & Payment Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Fuel Station / Bunk Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Indian Oil NH-48 Pump"
                          value={fuelForm.fuel_station}
                          onChange={(e) => setFuelForm({ ...fuelForm, fuel_station: e.target.value })}
                          className={`w-full rounded-xl px-3.5 py-2.5 text-xs border outline-none transition-all ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Payment Mode
                        </label>
                        <div className="relative">
                          <select
                            value={fuelForm.payment_mode}
                            onChange={(e) => setFuelForm({ ...fuelForm, payment_mode: e.target.value })}
                            className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                                : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15'
                            }`}
                          >
                            <option value="FUEL_CARD">Fuel Fleet Card</option>
                            <option value="FASTAG">FASTag Diesel Wallet</option>
                            <option value="CASH">Cash Pump Slip</option>
                            <option value="UPI">UPI / QR Code</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Submit Footer */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExpenseModal(false);
                          setShowFuelModal(false);
                          setShowAdvanceModal(false);
                        }}
                        className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-xs bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <span>Logging Fuel...</span>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Save Fuel Log</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Form 3: Disburse Driver Bhatta / Cash Advance */}
                {recordModalType === 'DRIVER_BHATTA' && (
                  <form onSubmit={handleCreateAdvance} className="space-y-4">
                    {/* Trip Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Target Outbound Trip (Optional)
                      </label>
                      <div className="relative">
                        <select
                          value={advanceForm.trip_id}
                          onChange={(e) => handleAdvanceTripChange(e.target.value)}
                          className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-medium border outline-none appearance-none cursor-pointer transition-all ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15'
                          }`}
                        >
                          <option value="">Select Outbound Trip</option>
                          {filteredTrips.map((t) => (
                            <option key={t.id} value={t.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                              {t.trip_number} {t.route ? `• ${t.route}` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Driver Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Driver / Pilot <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={advanceForm.driver_id}
                          onChange={(e) => setAdvanceForm({ ...advanceForm, driver_id: e.target.value })}
                          className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-bold border outline-none appearance-none cursor-pointer transition-all ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-800 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15'
                          }`}
                        >
                          <option value="">Select Driver</option>
                          {filteredDrivers.map((d) => (
                            <option key={d.id} value={d.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                              {d.name} {d.phone ? `(${d.phone})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Amount & Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Advance Amount (₹) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-base font-black text-amber-500 pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="1"
                            required
                            placeholder="e.g. 5000"
                            value={advanceForm.amount}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                            className={`w-full rounded-xl pl-8 pr-3.5 py-2 text-base font-mono font-black border outline-none transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                                : 'bg-slate-50/70 border-slate-200 text-amber-600 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Payment Mode
                        </label>
                        <div className="relative">
                          <select
                            value={advanceForm.payment_mode}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, payment_mode: e.target.value })}
                            className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all ${
                              isDark
                                ? 'bg-slate-900/90 border-slate-800 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                                : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15'
                            }`}
                          >
                            <option value="CASH">Cash in Hand</option>
                            <option value="UPI">UPI Driver QR</option>
                            <option value="BANK_TRANSFER">Bank IMPS Transfer</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex items-center space-x-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-400">Quick:</span>
                      {[2000, 3000, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAdvanceForm((p) => ({ ...p, amount: String(amt) }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                            advanceForm.amount === String(amt)
                              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25'
                              : isDark
                              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80'
                          }`}
                        >
                          +₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Purpose / Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Outbound trip Bhatta + Toll cash advance"
                        value={advanceForm.notes}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-xs border outline-none transition-all ${
                          isDark
                            ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15'
                        }`}
                      />
                    </div>

                    {/* Submit Footer */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExpenseModal(false);
                          setShowFuelModal(false);
                          setShowAdvanceModal(false);
                        }}
                        className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <span>Disbursing...</span>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Disburse Bhatta</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </Modal>

          {/* ========================================================= */}
          {/* Modal 4: Trip Settlement Reconciliation Dialog            */}
          {/* ========================================================= */}
          <Modal isOpen={Boolean(showSettleModal)} onClose={() => setShowSettleModal(false)}>
            {showSettleModal && (
              <div className={`relative w-full max-w-lg max-h-[92vh] my-auto overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-7 z-10 transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
              }`}>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">Trip Expense Reconciliation</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Reconcile driver bhatta advance against verified trip vouchers.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettleModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleConfirmSettle} className="space-y-4">
                  {/* Summary Comparison Calculation Box */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-900/90 border-slate-800 shadow-inner' : 'bg-slate-50/90 border-slate-200/80 shadow-xs'
                  }`}>
                    {settleForm.is_vendor_or_market ? (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">Agreed Vehicle Charge:</span>
                          <span className="font-mono font-bold text-amber-500 text-sm">
                            ₹{Number(settleForm.vehicle_charge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">Less: Driver Advances:</span>
                          <span className="font-mono font-bold text-slate-400 text-sm">
                            -₹{Number(settleForm.total_advances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">Less: Highway Expenses:</span>
                          <span className="font-mono font-bold text-slate-400 text-sm">
                            -₹{Number(settleForm.total_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`pt-3 border-t flex justify-between items-center p-3 rounded-xl ${
                          settleForm.net_payable >= 0
                            ? isDark ? 'bg-emerald-950/40 border border-emerald-800/60' : 'bg-emerald-50 border border-emerald-200'
                            : isDark ? 'bg-rose-950/40 border border-rose-800/60' : 'bg-rose-50 border border-rose-200'
                        }`}>
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-wider block ${
                              settleForm.net_payable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {settleForm.net_payable >= 0 ? 'Net Payable to Vendor / Owner:' : 'Recovery Due from Vendor:'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {settleForm.net_payable >= 0 ? 'Vehicle charge minus company-paid advances/fuel' : 'Company advances exceeded agreed hire rate'}
                            </span>
                          </div>
                          <span className={`font-mono text-xl font-black ${
                            settleForm.net_payable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            ₹{Math.abs(Number(settleForm.net_payable || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Advances Given:</span>
                          <span className="font-mono font-bold text-amber-500 text-sm">
                            ₹{Number(settleForm.total_advances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Expenses Logged:</span>
                          <span className="font-mono font-bold text-blue-500 text-sm">
                            ₹{Number(settleForm.total_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`pt-3 border-t flex justify-between items-center p-3 rounded-xl ${
                          settleForm.net_payable >= 0
                            ? isDark ? 'bg-emerald-950/40 border border-emerald-800/60' : 'bg-emerald-50 border border-emerald-200'
                            : isDark ? 'bg-rose-950/40 border border-rose-800/60' : 'bg-rose-50 border border-rose-200'
                        }`}>
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-wider block ${
                              settleForm.net_payable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {settleForm.net_payable >= 0 ? 'Refund Due from Driver:' : 'Company Owes Driver:'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {settleForm.net_payable >= 0 ? 'Driver returns excess advance cash' : 'Reimbursement to be transferred to driver'}
                            </span>
                          </div>
                          <span className={`font-mono text-xl font-black ${
                            settleForm.net_payable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            ₹{Math.abs(Number(settleForm.net_payable || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Settlement Mode
                    </label>
                    <div className="relative">
                      <select
                        value={settleForm.payment_mode}
                        onChange={(e) => setSettleForm({ ...settleForm, payment_mode: e.target.value })}
                        className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all ${
                          isDark
                            ? 'bg-slate-900/90 border-slate-800 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                        }`}
                      >
                        <option value="CASH">Cash Settlement</option>
                        <option value="UPI">UPI Transfer</option>
                        <option value="BANK_TRANSFER">Bank Account NEFT</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Reconciliation Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verified fuel slips and toll deductions with driver"
                      value={settleForm.notes}
                      onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-xs border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                      }`}
                    />
                  </div>

                  {/* Submit Footer */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowSettleModal(false)}
                      className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span>Reconciling...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirm Settlement</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* ========================================================= */}
          {/* Modal 5: Delete / Void Expense Confirmation Dialog        */}
          {/* ========================================================= */}
          <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
            {deleteTarget && (
              <div className={`relative w-full max-w-sm my-auto rounded-3xl border shadow-2xl p-6 z-10 transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
              }`}>
                <div className="flex items-center space-x-3 text-rose-500 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">Void Expense Voucher?</h3>
                    <p className="text-[10px] text-slate-400">Irreversible accounting action</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  Are you sure you want to void voucher{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {deleteTarget.voucher_number || `EXP-${String(deleteTarget.id).slice(0, 6)}`}
                  </span>{' '}
                  amounting to{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{parseFloat(deleteTarget.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  ? This will automatically recalculate linked trip total expenses.
                </p>
                <div className="flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-md shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    Void Expense
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* ========================================================= */}
          {/* Modal 6: Comprehensive Trip Profit & Loss (P&L) Dossier   */}
          {/* ========================================================= */}
          <TripPnlModal
            isOpen={showPnlModal}
            onClose={() => {
              setShowPnlModal(false);
              setSelectedPnlTrip(null);
            }}
            tripId={selectedPnlTrip?.id}
            initialTrip={selectedPnlTrip}
            onOpenSettle={(trip) => handleOpenSettle(trip)}
          />

        </main>
      </div>
    </div>
  );
}
