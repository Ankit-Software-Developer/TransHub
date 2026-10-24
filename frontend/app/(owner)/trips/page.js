// frontend/app/(owner)/trips/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import Modal from '../../../components/ui/Modal';
import CameraCaptureModal from '../../../components/ui/CameraCaptureModal';
import {
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  CheckCircle2,
  FileText,
  User,
  Layers,
  ArrowRight,
  Plus,
  X,
  AlertTriangle,
  Wallet,
  Receipt,
  Fuel,
  CreditCard,
  Banknote,
  PackageCheck,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Send,
  Info,
  ChevronDown,
  RotateCw,
  Camera,
  UploadCloud,
  FileCheck,
  Eye,
  Building2,
  Check,
  Search,
  Printer,
} from 'lucide-react';
import Link from 'next/link';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';
import { useStore } from '../../../store/useStore';
import { useOperationsType } from '../../../hooks/useOperationsType';

/**
 * Enterprise Custom Popover Select for Modal Forms
 * Replaces native HTML <select> with modern, searchable, styled popovers
 * Renders via React Portal directly into document.body so it NEVER gets clipped by modal overflow!
 */
function ModalCustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  icon: Icon,
  searchable = false,
  searchPlaceholder = 'Search...',
  bottomAction = null,
  emptyText = 'No options available',
  isDark = false,
  className = '',
  maxHeight = 'max-h-60',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If there's less than 240px below, but more space above, open upwards
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;

      setCoords({
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16),
        openUp,
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 60);
      }

      const handleReposition = () => {
        updatePosition();
      };
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }
  }, [isOpen, searchable]);

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
    if (!value) return null;
    return options.find((opt) => String(opt.value) === String(value));
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) => {
      const matchLabel = (opt.label || '').toLowerCase().includes(q);
      const matchSub = (opt.sublabel || '').toLowerCase().includes(q);
      const matchBadge = (opt.badge || '').toLowerCase().includes(q);
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, searchQuery]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`w-full flex items-center justify-between pl-3.5 pr-3 py-2.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer text-left focus:outline-hidden ${
          isOpen
            ? isDark
              ? 'border-indigo-500 ring-2 ring-indigo-500/25 bg-slate-900 text-white'
              : 'border-indigo-600 ring-2 ring-indigo-600/20 bg-white text-slate-900 shadow-md shadow-indigo-600/5'
            : isDark
            ? 'bg-slate-900/90 border-slate-700/80 text-white hover:border-slate-600 hover:bg-slate-900'
            : 'bg-white border-slate-200/90 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {Icon && (
            <div className="shrink-0 text-indigo-500">
              <Icon className="w-4 h-4" />
            </div>
          )}
          {selectedOption ? (
            <div className="min-w-0 flex items-center gap-2">
              <span className="font-bold truncate text-slate-900 dark:text-white">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedOption.badgeColor === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                      : selectedOption.badgeColor === 'amber'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                      : selectedOption.badgeColor === 'rose'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                      : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {/* Floating Popover Menu mounted to document.body via Portal to break free from any overflow-hidden / overflow-y-auto clipping */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : 'auto',
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 100005,
          }}
          className={`rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'bg-[#0B1020] border-slate-700/80 text-slate-200 divide-slate-800/80 shadow-black/90 ring-1 ring-white/10'
              : 'bg-white border-slate-200 text-slate-800 divide-slate-100 shadow-slate-900/25 ring-1 ring-black/5'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header if searchable */}
          {searchable && (
            <div className={`p-2 border-b ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/80'}`}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs focus:outline-hidden transition-all ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className={`overflow-y-auto ${maxHeight} p-1 space-y-0.5 custom-scrollbar`}>
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-1.5">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{emptyText}</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[10px] text-indigo-500 font-bold mt-1 hover:underline cursor-pointer"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value, opt);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer group ${
                      isSelected
                        ? isDark
                          ? 'bg-indigo-600/20 text-indigo-300 font-bold border-l-2 border-indigo-400'
                          : 'bg-indigo-50 text-indigo-700 font-bold border-l-2 border-indigo-600'
                        : isDark
                        ? 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                        : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              opt.badgeColor === 'emerald'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                : opt.badgeColor === 'amber'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                                : opt.badgeColor === 'rose'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <p className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Action */}
          {bottomAction && (
            <div className={`p-1.5 border-t ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'}`}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  bottomAction.onClick();
                }}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDark
                    ? 'text-indigo-400 hover:bg-indigo-950/40 hover:text-indigo-300'
                    : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                {bottomAction.icon && <bottomAction.icon className="w-3.5 h-3.5" />}
                <span>{bottomAction.label}</span>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function TripsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport, isAdmin, canCreateTrip, canEditTrip, canSettleTrip } = usePermissions();

  const user = useStore((state) => state.user);
  const activeBranch = useStore((state) => state.activeBranch);
  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || user?.assigned_branch_id || null;
  const { isOnlyFTL, isOnlyPTL, isBoth, isFleetSupplier, isDirectCarrier, isCompleteFTL } = useOperationsType();

  const [trips, setTrips] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [settling, setSettling] = useState(false);
  const [driverAllowance, setDriverAllowance] = useState(1500);
  const [settleVehicleCharge, setSettleVehicleCharge] = useState('');

  // Trip Settlement Center States
  const [settleExpensesList, setSettleExpensesList] = useState([]);
  const [settleAdvancesList, setSettleAdvancesList] = useState([]);
  const [loadingSettleData, setLoadingSettleData] = useState(false);
  const [settleRemarks, setSettleRemarks] = useState('');
  const [showAddExpenseInSettle, setShowAddExpenseInSettle] = useState(false);
  const [settleNewExpCategory, setSettleNewExpCategory] = useState('Fuel & Diesel');
  const [settleNewExpAmount, setSettleNewExpAmount] = useState('');
  const [settleNewExpPaymentMethod, setSettleNewExpPaymentMethod] = useState('CASH');
  const [settleNewExpRemarks, setSettleNewExpRemarks] = useState('');
  const [savingSettleExpense, setSavingSettleExpense] = useState(false);
  const [settleExpenseError, setSettleExpenseError] = useState('');

  // Settlement Slip / Debrief Voucher States
  const [showSettlementSlip, setShowSettlementSlip] = useState(false);
  const [settlementSlipData, setSettlementSlipData] = useState(null);
  const [expenseCategoriesMap, setExpenseCategoriesMap] = useState({});

  // Dedicated FTL Vehicle Placement Invoice Modal State
  const [isTripInvoiceModalOpen, setIsTripInvoiceModalOpen] = useState(false);
  const [tripToInvoice, setTripToInvoice] = useState(null);
  const [tripInvoiceDate, setTripInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [tripInvoiceCreditDays, setTripInvoiceCreditDays] = useState(30);
  const [tripInvoiceTaxRate, setTripInvoiceTaxRate] = useState(5.0);
  const [tripInvoiceIsRcm, setTripInvoiceIsRcm] = useState(false);
  const [tripInvoiceExtraCharges, setTripInvoiceExtraCharges] = useState(0);
  const [tripInvoiceRemarks, setTripInvoiceRemarks] = useState('');
  const [isSubmittingTripInvoice, setIsSubmittingTripInvoice] = useState(false);
  const [tripInvoiceSuccessData, setTripInvoiceSuccessData] = useState(null);

  const getExpenseCategoryName = (exp) => {
    if (!exp) return 'Highway Expense';
    if (exp.category?.name) return exp.category.name;
    if (exp.category_name) return exp.category_name;
    if (typeof exp.category === 'string') return exp.category;
    if (exp.category_id && expenseCategoriesMap[exp.category_id]) {
      return expenseCategoriesMap[exp.category_id];
    }
    // If category_id is already a human name (not UUID or hash)
    if (exp.category_id && !/^[0-9a-fA-F-]{20,}$/.test(String(exp.category_id).trim())) {
      return exp.category_id;
    }
    // Extract category name from remarks if formatted like "(Fuel & Diesel)"
    if (exp.remarks) {
      const match = exp.remarks.match(/\(([^)]+)\)$/);
      if (match && match[1] && match[1].length < 40) {
        return match[1];
      }
      const lower = exp.remarks.toLowerCase();
      if (lower.includes('diesel') || lower.includes('fuel')) return 'Fuel & Diesel';
      if (lower.includes('toll') || lower.includes('fastag')) return 'Toll & FASTag';
      if (lower.includes('hamali') || lower.includes('loading')) return 'Loading & Hamali';
      if (lower.includes('repair') || lower.includes('puncture') || lower.includes('tyre')) return 'Vehicle Maintenance';
    }
    return 'Highway Expense';
  };

  const userBranchCode = user?.branchCode || user?.branch_code || user?.branch?.branch_code || null;

  // Vehicle Assignment & Trip Creation State
  const [vehiclesList, setVehiclesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [tripToAssign, setTripToAssign] = useState(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [assignDriverId, setAssignDriverId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dedicated Vehicle Placement / Direct Contract Hire States
  const [isDirectHireModalOpen, setIsDirectHireModalOpen] = useState(false);
  const [directHireStep, setDirectHireStep] = useState(1); // Step 1: Party & Route, Step 2: Vehicle & Driver, Step 3: Financials
  const [submittingDirectHire, setSubmittingDirectHire] = useState(false);
  const [directHireError, setDirectHireError] = useState('');
  const initialDirectHireForm = {
    hiring_party_mode: 'CUSTOMER', // 'CUSTOMER' | 'DIRECT_PARTY'
    customer_id: '',
    hiring_party_name: '',
    hiring_party_phone: '',
    auto_save_customer: true,
    party_ref_number: '',
    eway_bill_no: '',
    goods_description: '',
    origin_branch_id: '',
    origin_city: '',
    destination_city: '',
    vehicle_mode: 'FLEET', // 'FLEET' | 'CUSTOM'
    vehicle_id: '',
    driver_id: '',
    custom_vehicle_number: '',
    custom_truck_type: '19',
    custom_vehicle_type_name: '',
    custom_capacity_ton: '10',
    custom_driver_name: '',
    custom_driver_phone: '',
    contract_amount: '',
    advance_received: '',
    driver_advance: '',
    advance_mode: 'CASH',
    start_odometer: '',
    remarks: '',
  };
  const [directHireForm, setDirectHireForm] = useState(initialDirectHireForm);

  // Login Branch & Movement Filter State
  const isBranchUser = !isAdmin && Boolean(userBranchId);
  const [selectedBranchId, setSelectedBranchId] = useState(isBranchUser ? userBranchId : 'ALL');
  const [movementTab, setMovementTab] = useState('ALL'); // 'ALL' | 'OUTBOUND' | 'INBOUND'

  // The user's actual physical login/home branch (e.g. BHQ)
  const loginBranchId = useMemo(() => {
    if (userBranchId) return userBranchId;
    if (userBranchCode && branchesList.length > 0) {
      const b = branchesList.find((item) => item.branch_code === userBranchCode);
      if (b) return b.id;
    }
    if (activeBranch?.id && activeBranch.id !== 'ALL') return activeBranch.id;
    if (branchesList.length > 0) return branchesList[0].id;
    return null;
  }, [userBranchId, userBranchCode, activeBranch, branchesList]);

  // Resolved branch filter for querying API
  const currentBranchId = useMemo(() => {
    if (isBranchUser) return userBranchId;
    if (selectedBranchId && selectedBranchId !== 'ALL') return selectedBranchId;
    return null;
  }, [isBranchUser, userBranchId, selectedBranchId]);

  // Auto-sync directHireForm origin_branch_id to loginBranchId when modal opens
  useEffect(() => {
    if (loginBranchId) {
      setDirectHireForm((prev) => {
        const originBr = branchesList.find((b) => b.id === loginBranchId);
        const resolvedCity =
          originBr?.city && originBr.city.toLowerCase() !== 'head office'
            ? originBr.city
            : '';
        const currentOriginCity =
          prev.origin_city && prev.origin_city.toLowerCase() !== 'head office'
            ? prev.origin_city
            : resolvedCity;

        if (!prev.origin_branch_id || prev.origin_branch_id !== loginBranchId || prev.origin_city?.toLowerCase() === 'head office') {
          return {
            ...prev,
            origin_branch_id: loginBranchId,
            origin_city: currentOriginCity,
          };
        }
        return prev;
      });
    }
  }, [loginBranchId, branchesList, isDirectHireModalOpen]);

  // Quick Advance & Expense Disbursal Modal State
  const [advExpModalOpen, setAdvExpModalOpen] = useState(false);
  const [advExpTrip, setAdvExpTrip] = useState(null);
  const [advExpType, setAdvExpType] = useState('EXPENSE'); // 'EXPENSE' | 'ADVANCE'
  const [advAmount, setAdvAmount] = useState('');
  const [advMode, setAdvMode] = useState('CASH');
  const [advRemarks, setAdvRemarks] = useState('');
  const [expCategory, setExpCategory] = useState('Fuel & Diesel');
  const [expAmount, setExpAmount] = useState('');
  const [expPaymentMethod, setExpPaymentMethod] = useState('CASH');
  const [expRemarks, setExpRemarks] = useState('');
  const [submittingAdvExp, setSubmittingAdvExp] = useState(false);
  const [advExpError, setAdvExpError] = useState('');

  // Inbound Gate-In Arrival Modal State
  const [recordArrivalModalOpen, setRecordArrivalModalOpen] = useState(false);
  const [arrivalTrip, setArrivalTrip] = useState(null);
  const [arrivalPhysicalSeal, setArrivalPhysicalSeal] = useState('');
  const [arrivalSealStatus, setArrivalSealStatus] = useState('INTACT'); // 'INTACT' | 'MISMATCH' | 'BROKEN'
  const [arrivalDiscrepancyCategory, setArrivalDiscrepancyCategory] = useState('RTO / Police Highway Inspection (Memo Checked)');
  const [arrivalDiscrepancyReason, setArrivalDiscrepancyReason] = useState('');
  const [arrivalMemoNumber, setArrivalMemoNumber] = useState('');
  const [arrivalOdometerInput, setArrivalOdometerInput] = useState('');
  const [arrivalDockBay, setArrivalDockBay] = useState('Bay 1');
  const [arrivalRemarks, setArrivalRemarks] = useState('');
  const [submittingArrival, setSubmittingArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState('');

  // FTL Direct Delivery Modal State
  const [ftlDeliveryModalOpen, setFtlDeliveryModalOpen] = useState(false);
  const [ftlDeliveryTrip, setFtlDeliveryTrip] = useState(null);
  const [ftlEndOdo, setFtlEndOdo] = useState('');
  const [ftlReceiverName, setFtlReceiverName] = useState('');
  const [ftlReceiverPhone, setFtlReceiverPhone] = useState('');
  const [ftlPhysicalSeal, setFtlPhysicalSeal] = useState('');
  const [ftlSealStatus, setFtlSealStatus] = useState('INTACT'); // 'INTACT' | 'MISMATCH' | 'BROKEN' | 'NO_SEAL'
  const [ftlDiscrepancyCategory, setFtlDiscrepancyCategory] = useState('RTO / Police Highway Inspection (Memo Checked)');
  const [ftlDiscrepancyReason, setFtlDiscrepancyReason] = useState('');
  const [ftlMemoNumber, setFtlMemoNumber] = useState('');
  const [ftlCargoCondition, setFtlCargoCondition] = useState('INTACT'); // 'INTACT' | 'MINOR_DAMAGE' | 'SEVERE_DAMAGE'
  const [ftlPodDocType, setFtlPodDocType] = useState('SIGNED_BILTY');
  const [ftlPodNumber, setFtlPodNumber] = useState('');
  const [ftlPodFileUrl, setFtlPodFileUrl] = useState('');
  const [ftlPodFileName, setFtlPodFileName] = useState('');
  const [ftlPodFileSize, setFtlPodFileSize] = useState('');
  const [ftlPodUploading, setFtlPodUploading] = useState(false);
  const [ftlCameraModalOpen, setFtlCameraModalOpen] = useState(false);
  const [ftlRemarks, setFtlRemarks] = useState('');
  const [submittingFtlDelivery, setSubmittingFtlDelivery] = useState(false);
  const [ftlDeliveryError, setFtlDeliveryError] = useState('');
  const ftlPodFileInputRef = useRef(null);

  // 360° Trip Comprehensive Details & Audit Drawer
  const [viewingTripDetails, setViewingTripDetails] = useState(null);
  const [tripDetailsLoading, setTripDetailsLoading] = useState(false);
  const [tripDetailsTab, setTripDetailsTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'FINANCIALS' | 'CARGO' | 'AUDIT_SEALS'

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('trip_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadTypeFilter, setLoadTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Debounce search keystrokes by 350ms to deliver smooth server-side search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      let url = `/trips?page=${page}&limit=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (debouncedSearch && debouncedSearch.trim()) url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (loadTypeFilter) url += `&load_type=${loadTypeFilter}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      if (movementTab === 'DIRECT_HIRE') {
        url += '&trip_mode=DIRECT_VEHICLE_HIRE';
      }

      if (currentBranchId) {
        if (movementTab === 'OUTBOUND') {
          url += `&origin_branch_id=${currentBranchId}`;
        } else if (movementTab === 'INBOUND') {
          url += `&dest_branch_id=${currentBranchId}`;
        } else {
          url += `&branch_id=${currentBranchId}`;
        }
      }

      const res = await api.get(url);
      if (res.data?.success) {
        setTrips(res.data.data || []);
        if (res.data.pagination) {
          setTotalRecords(res.data.pagination.total || 0);
        } else {
          setTotalRecords((res.data.data || []).length);
        }
      }
    } catch (err) {
      console.error('Failed to load trips', err);
      setTrips([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [vRes, bRes, dRes, cRes, catRes] = await Promise.allSettled([
        api.get('/fleet/vehicles'),
        api.get('/branches'),
        api.get('/fleet/drivers'),
        api.get('/customers?limit=200'),
        api.get('/expenses/categories'),
      ]);
      if (vRes.status === 'fulfilled' && vRes.value?.data?.success) {
        setVehiclesList(vRes.value.data.data || []);
      }
      if (bRes.status === 'fulfilled') {
        const bList = bRes.value?.data?.data?.branches || bRes.value?.data?.data || [];
        setBranchesList(Array.isArray(bList) ? bList : []);
      }
      if (dRes.status === 'fulfilled' && dRes.value?.data?.success) {
        setDriversList(dRes.value.data.data || []);
      }
      if (cRes.status === 'fulfilled') {
        const cList = cRes.value?.data?.data?.customers || cRes.value?.data?.data || [];
        setCustomersList(Array.isArray(cList) ? cList : []);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.data?.success) {
        const rawCats = catRes.value?.data?.data || [];
        if (Array.isArray(rawCats)) {
          const catMap = {};
          rawCats.forEach((c) => {
            if (c.id && c.name) catMap[c.id] = c.name;
            if (c.code && c.name) catMap[c.code] = c.name;
          });
          setExpenseCategoriesMap((prev) => ({ ...prev, ...catMap }));
        }
      }
    } catch (err) {
      console.error('Failed to load fleet master data for trips:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [page, pageSize, sortBy, sortOrder, statusFilter, loadTypeFilter, debouncedSearch, fromDate, toDate, currentBranchId, movementTab]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (isAdmin && activeBranch) {
      if (activeBranch.id && activeBranch.id !== 'ALL') {
        setSelectedBranchId(activeBranch.id);
      } else if (activeBranch === 'ALL' || activeBranch.code === 'ALL' || activeBranch.id === null) {
        setSelectedBranchId('ALL');
      }
    }
  }, [activeBranch, isAdmin]);

  const handleOpenRecordArrival = (trip) => {
    setArrivalTrip(trip);
    const dispatchedSeal = trip.dispatches?.[0]?.seal_number || '';
    setArrivalPhysicalSeal(dispatchedSeal);
    setArrivalSealStatus('INTACT');
    setArrivalDiscrepancyCategory('RTO / Police Highway Inspection (Memo Checked)');
    setArrivalDiscrepancyReason('');
    setArrivalMemoNumber('');
    setArrivalOdometerInput(trip.start_odometer ? String(trip.start_odometer) : '');
    setArrivalDockBay('Bay 1');
    setArrivalRemarks('');
    setArrivalError('');
    setRecordArrivalModalOpen(true);
  };

  const handleSubmitRecordArrival = async (e) => {
    e.preventDefault();
    if (!arrivalTrip) return;

    const startOdo = parseInt(arrivalTrip.start_odometer || 0, 10);
    const endOdo = parseInt(arrivalOdometerInput || 0, 10);
    if (endOdo < startOdo) {
      setArrivalError(`Arrival odometer (${endOdo} KM) cannot be less than departure odometer (${startOdo} KM).`);
      return;
    }
    if (!arrivalPhysicalSeal.trim()) {
      setArrivalError('Please enter the physical seal number observed on the vehicle container.');
      return;
    }

    if (arrivalSealStatus !== 'INTACT' && !arrivalDiscrepancyReason.trim()) {
      setArrivalError('Please specify the incident explanation / reason for the broken or mismatched seal.');
      return;
    }

    const fullDiscrepancy = arrivalSealStatus !== 'INTACT'
      ? `${arrivalDiscrepancyCategory}${arrivalMemoNumber.trim() ? ` [Memo #${arrivalMemoNumber.trim()}]` : ''}: ${arrivalDiscrepancyReason.trim()}`
      : '';

    setSubmittingArrival(true);
    setArrivalError('');
    try {
      const payload = {
        end_odometer: endOdo,
        received_seal_number: arrivalPhysicalSeal.trim(),
        seal_status: arrivalSealStatus,
        discrepancy_reason: fullDiscrepancy,
        dock_bay: arrivalDockBay,
        remarks: arrivalRemarks,
        arrival_time: new Date().toISOString(),
      };

      const res = await api.post(`/trips/${arrivalTrip.id}/record-arrival`, payload);
      if (res.data?.success) {
        // Update local trip state immediately
        const gateNoteText = `[GATE-IN ARRIVAL] Seal: ${arrivalPhysicalSeal} (${arrivalSealStatus})${fullDiscrepancy ? ` | Discrepancy: ${fullDiscrepancy}` : ''}`;
        setTrips((prev) =>
          prev.map((t) =>
            t.id === arrivalTrip.id
              ? {
                  ...t,
                  end_odometer: endOdo,
                  is_arrived: true,
                  remarks: `${t.remarks || ''}\n${gateNoteText}`,
                }
              : t
          )
        );
        setRecordArrivalModalOpen(false);
        setArrivalTrip(null);
      }
    } catch (err) {
      console.error('Failed to record arrival', err);
      setArrivalError(err.response?.data?.message || 'Failed to record gate arrival.');
    } finally {
      setSubmittingArrival(false);
    }
  };

  // Helper to test if a POD URL is an image
  const isPodImage = (url) => {
    if (!url) return false;
    if (url.startsWith('data:image')) return true;
    if (url.endsWith('.pdf')) return false;
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url) || url.includes('/uploads/pods/');
  };

  // Safely open Base64 or remote URL in new tab
  const openBlobInNewTab = (dataUrl) => {
    if (!dataUrl) return;
    try {
      if (dataUrl.startsWith('data:')) {
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(dataUrl, '_blank');
      }
    } catch (e) {
      console.warn('Error opening blob URL:', e);
      window.open(dataUrl, '_blank');
    }
  };

  // Client-side image compression using HTML5 Canvas
  const compressImageFile = (file, maxDimension = 1400, quality = 0.75) => {
    return new Promise((resolve) => {
      if (!file.type || !file.type.startsWith('image/')) {
        return resolve(file);
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              if (!blob) {
                return resolve(file);
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }, 'image/jpeg', quality);
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleOpenFtlDeliveryModal = (trip) => {
    setFtlDeliveryTrip(trip);
    setFtlEndOdo('');
    const consignee = trip.consignments?.[0]?.consignee;
    setFtlReceiverName(consignee?.name || (trip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? (trip.hiring_party_name || '') : ''));
    const rawPhone = consignee?.phone ? String(consignee.phone).replace(/\D/g, '') : '';
    setFtlReceiverPhone(rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone);

    const dispatchedSeal = trip.dispatches?.[0]?.seal_number || trip.seal_number || '';
    setFtlPhysicalSeal(dispatchedSeal);
    setFtlSealStatus('INTACT');
    setFtlDiscrepancyCategory('RTO / Police Highway Inspection (Memo Checked)');
    setFtlDiscrepancyReason('');
    setFtlMemoNumber('');
    setFtlCargoCondition('INTACT');

    setFtlPodDocType('SIGNED_BILTY');
    setFtlPodNumber('');
    setFtlPodFileUrl('');
    setFtlPodFileName('');
    setFtlPodFileSize('');
    setFtlRemarks('');
    setFtlDeliveryError('');
    setFtlDeliveryModalOpen(true);
  };

  const handleFtlPodFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      if (file.size > 1 * 1024 * 1024) {
        alert(`PDF file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 1 MB database limit. Please select a smaller PDF.`);
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result;
        if (base64Data) {
          setFtlPodFileUrl(base64Data);
          setFtlPodFileName(file.name);
          setFtlPodFileSize(`${(file.size / 1024).toFixed(0)} KB (PDF)`);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    try {
      setFtlPodUploading(true);
      const compressedFile = await compressImageFile(file, 1280, 0.72);
      if (compressedFile.size > 1 * 1024 * 1024) {
        alert('Image size exceeds 1 MB database limit. Please capture or select a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result;
        if (base64Data) {
          const sizeKb = (compressedFile.size / 1024).toFixed(0);
          setFtlPodFileUrl(base64Data);
          setFtlPodFileName(file.name);
          setFtlPodFileSize(`${sizeKb} KB (Photo)`);
        }
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Error processing POD file:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setFtlPodUploading(false);
      e.target.value = '';
    }
  };

  const handleFtlCameraCaptured = (base64Data, sizeKb) => {
    setFtlPodFileUrl(base64Data);
    setFtlPodFileName(`POD_Camera_${Date.now()}.jpg`);
    setFtlPodFileSize(`${sizeKb} KB (Camera Photo)`);
    setFtlCameraModalOpen(false);
  };

  const handleSubmitFtlDelivery = async (e) => {
    e.preventDefault();
    if (!ftlDeliveryTrip) return;

    const startOdo = parseInt(ftlDeliveryTrip.start_odometer || 0, 10);
    const hasEndOdo = ftlEndOdo !== undefined && ftlEndOdo !== null && String(ftlEndOdo).trim() !== '';
    const endOdo = hasEndOdo ? parseInt(ftlEndOdo, 10) : startOdo;
    if (hasEndOdo && endOdo < startOdo) {
      setFtlDeliveryError(`Delivery odometer (${endOdo} KM) cannot be less than departure odometer (${startOdo} KM).`);
      return;
    }

    const isDirectHire = ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE';

    if (!isDirectHire && !ftlPhysicalSeal.trim()) {
      setFtlDeliveryError('Please enter the physical seal number observed on the truck container.');
      return;
    }

    if (!isDirectHire && ftlPhysicalSeal.trim() && ftlSealStatus !== 'INTACT' && !ftlDiscrepancyReason.trim()) {
      setFtlDeliveryError('Please specify the incident explanation / reason for the broken or mismatched seal.');
      return;
    }

    const cleanedPhone = ftlReceiverPhone.replace(/\D/g, '');
    if (cleanedPhone && cleanedPhone.length !== 10) {
      setFtlDeliveryError(`Receiver contact phone must be exactly 10 digits (currently ${cleanedPhone.length} digits).`);
      return;
    }

    if (!ftlReceiverName.trim()) {
      setFtlDeliveryError('Please enter the name of the receiver / representative who accepted delivery.');
      return;
    }

    const fullDiscrepancy = (!isDirectHire && ftlPhysicalSeal.trim() && ftlSealStatus !== 'INTACT')
      ? `${ftlDiscrepancyCategory}${ftlMemoNumber.trim() ? ` [Memo #${ftlMemoNumber.trim()}]` : ''}: ${ftlDiscrepancyReason.trim()}`
      : '';

    setSubmittingFtlDelivery(true);
    setFtlDeliveryError('');

    try {
      const res = await api.post(`/trips/${ftlDeliveryTrip.id}/complete-ftl-delivery`, {
        end_odometer: endOdo,
        receiver_name: ftlReceiverName.trim() || (isDirectHire ? (ftlDeliveryTrip.hiring_party_name || 'Client Receiver') : 'Client Store'),
        receiver_phone: ftlReceiverPhone.trim(),
        received_seal_number: isDirectHire ? 'N/A' : (ftlPhysicalSeal.trim() || 'N/A'),
        seal_status: isDirectHire ? 'INTACT' : ftlSealStatus,
        discrepancy_reason: isDirectHire ? '' : fullDiscrepancy,
        cargo_condition: isDirectHire ? 'INTACT' : ftlCargoCondition,
        pod_doc_type: ftlPodDocType,
        pod_number: ftlPodNumber.trim(),
        pod_file_url: ftlPodFileUrl || null,
        delivery_remarks: ftlRemarks.trim(),
        delivery_date: new Date().toISOString(),
      });

      if (res.data?.success) {
        setFtlDeliveryModalOpen(false);
        setFtlDeliveryTrip(null);
        fetchTrips();
      }
    } catch (err) {
      console.error('Failed to complete FTL delivery', err);
      setFtlDeliveryError(err.response?.data?.message || 'Failed to record direct delivery.');
    } finally {
      setSubmittingFtlDelivery(false);
    }
  };

  const handleOpenAssignVehicle = (trip) => {
    setTripToAssign(trip);
    setAssignVehicleId(trip.vehicle?.id || trip.vehicle_id || '');
    setAssignDriverId(trip.driver?.id || trip.driver_id || '');
    setIsAssignVehicleOpen(true);
  };

  const handleConfirmAssignVehicle = async (e) => {
    e.preventDefault();
    if (!tripToAssign) return;
    if (!assignVehicleId) {
      alert('Please select a vehicle');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.patch(`/trips/${tripToAssign.id}/assign-vehicle`, {
        vehicle_id: assignVehicleId,
        driver_id: assignDriverId || null,
      });
      if (res.data?.success) {
        setIsAssignVehicleOpen(false);
        setTripToAssign(null);
        fetchTrips();
        fetchMasterData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSettleModal = async (trip) => {
    setSelectedTrip(trip);
    setDriverAllowance(1500);
    setSettleVehicleCharge(trip.vehicle_charge !== undefined && trip.vehicle_charge !== null ? String(trip.vehicle_charge) : '');
    setSettleRemarks('Trip advance & highway expense reconciliation closed');
    setShowAddExpenseInSettle(false);
    setSettleNewExpCategory('Fuel & Diesel');
    setSettleNewExpAmount('');
    setSettleNewExpPaymentMethod('CASH');
    setSettleNewExpRemarks('');
    setSettleExpenseError('');
    setLoadingSettleData(true);
    try {
      const [expRes, tripRes, catRes] = await Promise.allSettled([
        api.get(`/expenses?trip_id=${trip.id}`),
        api.get(`/trips/${trip.id}`),
        api.get('/expenses/categories'),
      ]);
      if (catRes.status === 'fulfilled' && catRes.value?.data?.success) {
        const rawCats = catRes.value.data.data || [];
        if (Array.isArray(rawCats)) {
          const catMap = {};
          rawCats.forEach((c) => {
            if (c.id && c.name) catMap[c.id] = c.name;
            if (c.code && c.name) catMap[c.code] = c.name;
          });
          setExpenseCategoriesMap((prev) => ({ ...prev, ...catMap }));
        }
      }
      if (expRes.status === 'fulfilled' && expRes.value?.data?.success) {
        setSettleExpensesList(expRes.value.data.data || []);
      } else {
        setSettleExpensesList([]);
      }
      if (tripRes.status === 'fulfilled' && tripRes.value?.data?.success) {
        const detailedTrip = tripRes.value.data.data;
        if (detailedTrip) {
          setSelectedTrip((prev) => ({ ...prev, ...detailedTrip }));
          if (detailedTrip.vehicle_charge !== undefined && detailedTrip.vehicle_charge !== null) {
            setSettleVehicleCharge(String(detailedTrip.vehicle_charge));
          }
          if (Array.isArray(detailedTrip.advances)) {
            setSettleAdvancesList(detailedTrip.advances);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load trip settlement data', err);
    } finally {
      setLoadingSettleData(false);
    }
  };

  const handleAddExpenseInSettle = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    const val = parseFloat(settleNewExpAmount);
    if (!val || val <= 0) {
      setSettleExpenseError('Please enter a valid expense amount');
      return;
    }
    setSavingSettleExpense(true);
    setSettleExpenseError('');
    try {
      const res = await api.post('/expenses', {
        trip_id: selectedTrip.id,
        category_id: settleNewExpCategory,
        amount: val,
        payment_method: settleNewExpPaymentMethod,
        expense_date: new Date().toISOString().slice(0, 10),
        remarks: settleNewExpRemarks || `Trip #${selectedTrip.trip_number} final settlement expense (${settleNewExpCategory})`,
      });
      if (res.data?.success) {
        let newExp = res.data.data;
        if (!newExp.category?.name) {
          newExp = {
            ...newExp,
            category: { name: settleNewExpCategory },
            category_name: settleNewExpCategory,
          };
        }
        setSettleExpensesList((prev) => [newExp, ...prev]);
        setSelectedTrip((prev) => ({
          ...prev,
          total_expenses: (parseFloat(prev?.total_expenses || 0) + val),
        }));
        setSettleNewExpAmount('');
        setSettleNewExpRemarks('');
        setShowAddExpenseInSettle(false);
        setTrips((prev) =>
          prev.map((t) =>
            t.id === selectedTrip.id
              ? { ...t, total_expenses: (parseFloat(t.total_expenses || 0) + val) }
              : t
          )
        );
      }
    } catch (err) {
      setSettleExpenseError(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setSavingSettleExpense(false);
    }
  };

  const handleSettle = async (tripId) => {
    setSettling(true);
    try {
      const res = await api.post('/expenses/settle', {
        trip_id: tripId,
        driver_allowance: parseFloat(driverAllowance || 0),
        vehicle_charge: parseFloat(settleVehicleCharge || 0),
        remarks: settleRemarks || 'Trip advance & expense reconciliation closed',
      });
      if (res.data?.success) {
        const settlementData = res.data?.data;
        const currentTrip = selectedTrip;
        const ownership = (currentTrip?.vehicle?.ownership || 'OWN').toUpperCase();
        const isMarketOrAttached = ownership === 'MARKET' || ownership === 'ATTACHED';
        const totalAdv = parseFloat(currentTrip?.driver_advance || 0);
        const totalExp = settleExpensesList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
        const bhatta = parseFloat(driverAllowance || 0);
        const parsedVehicleCharge = parseFloat(settleVehicleCharge || currentTrip?.vehicle_charge || 0);
        const balance = isMarketOrAttached
          ? Math.abs(parsedVehicleCharge - (totalAdv + totalExp))
          : Math.abs(totalAdv - (totalExp + bhatta));

        setSettlementSlipData({
          trip: { ...currentTrip, settlement: settlementData, settlement_status: 'SETTLED' },
          settlement: settlementData || {
            settlement_number: `SETTLE-${currentTrip?.trip_number || 'TRP'}`,
            settlement_date: new Date().toISOString().slice(0, 10),
            total_advance: totalAdv,
            total_expenses: totalExp,
            driver_allowance: isMarketOrAttached ? 0 : bhatta,
            vehicle_charge: isMarketOrAttached ? parsedVehicleCharge : 0,
            vehicle_ownership: ownership,
            balance_payable_or_receivable: balance,
            settlement_type: isMarketOrAttached
              ? (parsedVehicleCharge > (totalAdv + totalExp) ? 'PAYABLE_TO_VENDOR' : 'RECOVER_FROM_VENDOR')
              : (totalAdv > (totalExp + bhatta) ? 'REFUND_FROM_DRIVER' : 'PAYABLE_TO_DRIVER'),
            status: 'SETTLED',
            remarks: settleRemarks,
          },
          isFinal: true,
          driverAllowance: bhatta,
          vehicleCharge: parsedVehicleCharge,
          remarks: settleRemarks,
          expensesList: [...settleExpensesList],
          advancesList: [...settleAdvancesList],
        });
        setSelectedTrip(null);
        setShowSettlementSlip(true);
        await fetchTrips();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Settlement failed');
    } finally {
      setSettling(false);
    }
  };

  const handleOpenSettledSlip = async (trip) => {
    try {
      const [expRes, tripRes, catRes] = await Promise.allSettled([
        api.get(`/expenses?trip_id=${trip.id}`),
        api.get(`/trips/${trip.id}`),
        api.get('/expenses/categories'),
      ]);
      if (catRes.status === 'fulfilled' && catRes.value?.data?.success) {
        const rawCats = catRes.value.data.data || [];
        if (Array.isArray(rawCats)) {
          const catMap = {};
          rawCats.forEach((c) => {
            if (c.id && c.name) catMap[c.id] = c.name;
            if (c.code && c.name) catMap[c.code] = c.name;
          });
          setExpenseCategoriesMap((prev) => ({ ...prev, ...catMap }));
        }
      }
      const expenses = (expRes.status === 'fulfilled' && expRes.value?.data?.success)
        ? (expRes.value.data.data || [])
        : (trip.expenses || []);
      const detailedTrip = (tripRes.status === 'fulfilled' && tripRes.value?.data?.success)
        ? tripRes.value.data.data
        : trip;

      const settlement = detailedTrip.settlement || {};
      const ownership = (detailedTrip.vehicle?.ownership || 'OWN').toUpperCase();
      const isMarketOrAttached = ownership === 'MARKET' || ownership === 'ATTACHED';

      const totalAdv = parseFloat(settlement.total_advance !== undefined ? settlement.total_advance : (detailedTrip.driver_advance || 0));
      const totalExp = parseFloat(settlement.total_expenses !== undefined ? settlement.total_expenses : (detailedTrip.total_expenses || expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)));
      const bhatta = parseFloat(settlement.driver_allowance !== undefined ? settlement.driver_allowance : (detailedTrip.driver_allowance || 0));
      const vCharge = parseFloat(settlement.vehicle_charge !== undefined ? settlement.vehicle_charge : (detailedTrip.vehicle_charge || 0));
      const balance = parseFloat(settlement.balance_payable_or_receivable !== undefined ? settlement.balance_payable_or_receivable : (isMarketOrAttached ? Math.abs(vCharge - (totalAdv + totalExp)) : Math.abs(totalAdv - (totalExp + bhatta))));

      setSettlementSlipData({
        trip: detailedTrip,
        settlement: {
          settlement_number: settlement.settlement_number || `SETTLE-${detailedTrip.trip_number}`,
          settlement_date: settlement.settlement_date || (settlement.createdAt ? settlement.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          total_advance: totalAdv,
          total_expenses: totalExp,
          driver_allowance: bhatta,
          vehicle_charge: vCharge,
          vehicle_ownership: ownership,
          balance_payable_or_receivable: balance,
          settlement_type: settlement.settlement_type || (isMarketOrAttached ? (vCharge > (totalAdv + totalExp) ? 'PAYABLE_TO_VENDOR' : 'RECOVER_FROM_VENDOR') : (totalAdv > (totalExp + bhatta) ? 'REFUND_FROM_DRIVER' : 'PAYABLE_TO_DRIVER')),
          status: 'SETTLED',
          remarks: settlement.remarks || detailedTrip.remarks || '',
        },
        isFinal: true,
        driverAllowance: bhatta,
        vehicleCharge: vCharge,
        remarks: settlement.remarks || '',
        expensesList: expenses,
        advancesList: detailedTrip.advances || [],
      });
      setShowSettlementSlip(true);
    } catch (err) {
      console.error('Error opening settlement slip:', err);
    }
  };

  const handleOpenTripInvoiceModal = (trip) => {
    if (!trip) return;
    setTripToInvoice(trip);
    setTripInvoiceDate(new Date().toISOString().slice(0, 10));
    setTripInvoiceCreditDays(trip.customer?.credit_days || 30);
    setTripInvoiceTaxRate(5.0);
    setTripInvoiceIsRcm(false);
    setTripInvoiceExtraCharges(0);
    setTripInvoiceRemarks(`Dedicated FTL Placement #${trip.trip_number} (${trip.origin_city} to ${trip.destination_city})`);
    setTripInvoiceSuccessData(null);
    setIsTripInvoiceModalOpen(true);
  };

  const handleSubmitTripInvoice = async (e) => {
    e.preventDefault();
    if (!tripToInvoice) return;
    setIsSubmittingTripInvoice(true);
    try {
      const payload = {
        trip_id: tripToInvoice.id,
        customer_id: tripToInvoice.customer_id || undefined,
        invoice_date: tripInvoiceDate,
        credit_days: parseInt(tripInvoiceCreditDays, 10) || 30,
        tax_rate: tripInvoiceIsRcm ? 0 : (parseFloat(tripInvoiceTaxRate) || 0),
        is_rcm: Boolean(tripInvoiceIsRcm),
        extra_charges: parseFloat(tripInvoiceExtraCharges) || 0,
        remarks: tripInvoiceRemarks,
      };

      const res = await api.post('/billing/invoices', payload);
      if (res.data?.success) {
        const createdInv = res.data.data;
        // Update local trips state to mark billing_status = 'INVOICED'
        setTrips((prev) =>
          prev.map((t) =>
            t.id === tripToInvoice.id
              ? { ...t, billing_status: 'INVOICED', invoice_id: createdInv?.id }
              : t
          )
        );
        if (viewingTripDetails && viewingTripDetails.id === tripToInvoice.id) {
          setViewingTripDetails((prev) => ({
            ...prev,
            billing_status: 'INVOICED',
            invoice_id: createdInv?.id,
          }));
        }
        setTripInvoiceSuccessData(createdInv);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate freight invoice');
    } finally {
      setIsSubmittingTripInvoice(false);
    }
  };

  const handleOpenTripDetails = async (trip) => {
    if (!trip?.id) return;
    setViewingTripDetails(trip);
    setTripDetailsTab('OVERVIEW');
    setTripDetailsLoading(true);
    try {
      const [tripRes, expRes, advRes, catRes] = await Promise.allSettled([
        api.get(`/trips/${trip.id}`),
        api.get(`/expenses?trip_id=${trip.id}`),
        api.get(`/expenses/advances?trip_id=${trip.id}`),
        api.get('/expenses/categories'),
      ]);

      if (catRes.status === 'fulfilled' && catRes.value?.data?.success) {
        const rawCats = catRes.value.data.data || [];
        if (Array.isArray(rawCats)) {
          const catMap = {};
          rawCats.forEach((c) => {
            if (c.id && c.name) catMap[c.id] = c.name;
            if (c.code && c.name) catMap[c.code] = c.name;
          });
          setExpenseCategoriesMap((prev) => ({ ...prev, ...catMap }));
        }
      }

      let detailedTrip = trip;
      if (tripRes.status === 'fulfilled' && tripRes.value?.data?.data) {
        detailedTrip = tripRes.value.data.data;
      }

      let itemizedExpenses = detailedTrip.expenses || [];
      if (expRes.status === 'fulfilled' && Array.isArray(expRes.value?.data?.data)) {
        itemizedExpenses = expRes.value.data.data;
      }

      let itemizedAdvances = detailedTrip.advances || [];
      if (advRes.status === 'fulfilled' && Array.isArray(advRes.value?.data?.data)) {
        itemizedAdvances = advRes.value.data.data;
      }

      setViewingTripDetails({
        ...detailedTrip,
        expenses: itemizedExpenses,
        advances: itemizedAdvances,
      });
    } catch (err) {
      console.error('Failed to load comprehensive trip details:', err);
    } finally {
      setTripDetailsLoading(false);
    }
  };

  const handleOpenAddAdvanceOrExp = (trip, defaultType = 'EXPENSE') => {
    setAdvExpTrip(trip);
    setAdvExpType(defaultType);
    setAdvAmount('');
    setAdvMode('CASH');
    setAdvRemarks('');
    setExpCategory('Fuel & Diesel');
    setExpAmount('');
    setExpPaymentMethod('CASH');
    setExpRemarks('');
    setAdvExpError('');
    setAdvExpModalOpen(true);
  };

  const handleSubmitAdvExp = async (e) => {
    e.preventDefault();
    if (!advExpTrip) return;
    setAdvExpError('');
    setSubmittingAdvExp(true);
    try {
      if (advExpType === 'ADVANCE') {
        const val = parseFloat(advAmount);
        if (!val || val <= 0) {
          setAdvExpError('Please enter a valid advance amount');
          setSubmittingAdvExp(false);
          return;
        }
        await api.post('/expenses/advance', {
          trip_id: advExpTrip.id,
          driver_id: advExpTrip.driver?.id || advExpTrip.driver_id,
          amount: val,
          disbursed_mode: advMode,
          remarks: advRemarks || `Driver advance for Trip #${advExpTrip.trip_number}`,
        });
      } else {
        const val = parseFloat(expAmount);
        if (!val || val <= 0) {
          setAdvExpError('Please enter a valid expense amount');
          setSubmittingAdvExp(false);
          return;
        }
        await api.post('/expenses', {
          trip_id: advExpTrip.id,
          category_id: expCategory,
          amount: val,
          payment_method: expPaymentMethod,
          expense_date: new Date().toISOString().slice(0, 10),
          remarks: expRemarks || `Trip #${advExpTrip.trip_number} expense (${expCategory})`,
        });
      }
      setAdvExpModalOpen(false);
      setAdvExpTrip(null);
      await fetchTrips();
    } catch (err) {
      setAdvExpError(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setSubmittingAdvExp(false);
    }
  };

  const handleNextStep1 = async (e) => {
    if (e) e.preventDefault();
    setDirectHireError('');
    if (directHireForm.hiring_party_mode === 'CUSTOMER' && !directHireForm.customer_id && !directHireForm.hiring_party_name?.trim()) {
      setDirectHireError('Please select a customer or specify hiring party name');
      return;
    }
    if (directHireForm.hiring_party_mode === 'DIRECT_PARTY' && !directHireForm.hiring_party_name?.trim()) {
      setDirectHireError('Please enter the hiring party / company name');
      return;
    }
    if (!directHireForm.origin_city?.trim()) {
      setDirectHireError('Please enter the origin loading city / yard');
      return;
    }
    if (!directHireForm.destination_city?.trim()) {
      setDirectHireError('Destination delivery site or city is required');
      return;
    }
    if (directHireForm.hiring_party_phone && directHireForm.hiring_party_phone.length !== 10) {
      setDirectHireError('Party contact phone must be exactly 10 digits (or leave blank if unknown)');
      return;
    }

    // Auto-save customer to CRM directory if in DIRECT_PARTY mode and auto-save is enabled
    if (directHireForm.hiring_party_mode === 'DIRECT_PARTY' && directHireForm.auto_save_customer && !directHireForm.customer_id) {
      const cleanPhone = (directHireForm.hiring_party_phone || '').replace(/\D/g, '').slice(-10);
      if (cleanPhone.length === 10) {
        try {
          const cRes = await api.post('/customers', {
            name: directHireForm.hiring_party_name.trim(),
            company_name: directHireForm.hiring_party_name.trim(),
            phone: cleanPhone,
            city: directHireForm.origin_city?.trim() || undefined,
          });
          const newCust = cRes.data?.data;
          if (newCust?.id) {
            setCustomersList((prev) => {
              if (prev.some((c) => c.id === newCust.id)) return prev;
              return [newCust, ...prev];
            });
            setDirectHireForm((prev) => ({ ...prev, customer_id: newCust.id }));
          }
        } catch (cErr) {
          console.log('Customer auto-save note:', cErr?.response?.data?.message || cErr.message);
        }
      }
    }

    setDirectHireStep(2);
  };

  const handleNextStep2 = async (e) => {
    if (e) e.preventDefault();
    setDirectHireError('');

    if (directHireForm.vehicle_mode === 'FLEET') {
      if (!directHireForm.vehicle_id) {
        setDirectHireError('Please select an assigned vehicle from fleet');
        return;
      }
      if (!directHireForm.driver_id) {
        setDirectHireError('Please select an assigned driver');
        return;
      }
      setDirectHireStep(3);
    } else {
      // CUSTOM / MARKET VEHICLE MODE - Auto-add and save into fleet database
      const cleanPlate = (directHireForm.custom_vehicle_number || '').toUpperCase().replace(/\s+/g, ' ').trim();
      if (!cleanPlate || cleanPlate.length < 5) {
        setDirectHireError('Please enter a valid vehicle registration plate (e.g. HR-55-AY-8724)');
        return;
      }
      const driverName = (directHireForm.custom_driver_name || '').trim();
      if (!driverName) {
        setDirectHireError('Please enter the driver full name');
        return;
      }
      const rawDriverPhone = (directHireForm.custom_driver_phone || '').replace(/\D/g, '');
      const cleanDriverPhone = (rawDriverPhone.length === 12 && rawDriverPhone.startsWith('91')) ? rawDriverPhone.slice(2) : rawDriverPhone;
      if (!cleanDriverPhone || cleanDriverPhone.length !== 10) {
        setDirectHireError('Driver mobile number must be a valid 10-digit number (e.g. 9829012345)');
        return;
      }

      try {
        setSubmittingDirectHire(true);
        const feetVal = directHireForm.custom_truck_type === 'CUSTOM'
          ? (parseFloat(directHireForm.custom_capacity_ton) >= 20 ? 32 : 19)
          : (directHireForm.custom_truck_type?.includes('32') ? 32 : directHireForm.custom_truck_type?.includes('40') ? 40 : 19);
        const capacityTon = parseFloat(directHireForm.custom_capacity_ton) || (feetVal >= 32 ? 16 : feetVal >= 24 ? 12 : 10);
        const odoVal = directHireForm.start_odometer ? parseInt(directHireForm.start_odometer, 10) : 0;
        const vType = (directHireForm.custom_truck_type === 'CUSTOM' && directHireForm.custom_vehicle_type_name?.trim())
          ? directHireForm.custom_vehicle_type_name.trim()
          : (directHireForm.custom_truck_type === 'bolero' ? 'PICKUP' : 'TRUCK');

        const res = await api.post('/fleet/vehicles/market-hire', {
          vehicle_number: cleanPlate,
          vehicle_type: vType,
          truck_size_feet: feetVal,
          capacity_ton: capacityTon,
          ownership: 'MARKET',
          driver_name: driverName,
          driver_phone: cleanDriverPhone,
          current_odometer: odoVal,
        });

        const newVeh = res.data?.data;
        if (newVeh) {
          setVehiclesList((prev) => [newVeh, ...prev.filter((v) => v.id !== newVeh.id)]);
          if (newVeh.assignedDriver) {
            setDriversList((prev) => [newVeh.assignedDriver, ...prev.filter((d) => d.id !== newVeh.assignedDriver.id)]);
          }
          setDirectHireForm((prev) => ({
            ...prev,
            vehicle_id: newVeh.id,
            driver_id: newVeh.assigned_driver_id || newVeh.assignedDriver?.id || prev.driver_id,
            start_odometer: prev.start_odometer || String(odoVal || 0),
          }));
          setDirectHireStep(3);
        } else {
          setDirectHireError('Failed to auto-register custom vehicle');
        }
      } catch (vehErr) {
        setDirectHireError(vehErr.response?.data?.message || 'Failed to auto-save custom vehicle and driver');
      } finally {
        setSubmittingDirectHire(false);
      }
    }
  };

  const handleCreateDirectHire = async (e) => {
    e.preventDefault();
    setDirectHireError('');

    // Ensure vehicle & driver are assigned or auto-saved
    let finalVehicleId = directHireForm.vehicle_id;
    let finalDriverId = directHireForm.driver_id;

    if (directHireForm.vehicle_mode === 'CUSTOM' && (!finalVehicleId || !finalDriverId)) {
      const cleanPlate = (directHireForm.custom_vehicle_number || '').toUpperCase().replace(/\s+/g, ' ').trim();
      const driverName = (directHireForm.custom_driver_name || '').trim();
      const rawDriverPhone = (directHireForm.custom_driver_phone || '').replace(/\D/g, '');
      const cleanDriverPhone = (rawDriverPhone.length === 12 && rawDriverPhone.startsWith('91')) ? rawDriverPhone.slice(2) : rawDriverPhone;

      if (!cleanPlate || cleanPlate.length < 5) {
        setDirectHireError('Please enter a valid vehicle registration plate in Step 2');
        setDirectHireStep(2);
        return;
      }
      if (!driverName || cleanDriverPhone.length !== 10) {
        setDirectHireError('Please enter valid driver name and 10-digit mobile number in Step 2');
        setDirectHireStep(2);
        return;
      }

      try {
        setSubmittingDirectHire(true);
        const feetVal = directHireForm.custom_truck_type === 'CUSTOM'
          ? (parseFloat(directHireForm.custom_capacity_ton) >= 20 ? 32 : 19)
          : (directHireForm.custom_truck_type?.includes('32') ? 32 : directHireForm.custom_truck_type?.includes('40') ? 40 : 19);
        const capacityTon = parseFloat(directHireForm.custom_capacity_ton) || 10;
        const odoVal = directHireForm.start_odometer ? parseInt(directHireForm.start_odometer, 10) : 0;
        const vType = (directHireForm.custom_truck_type === 'CUSTOM' && directHireForm.custom_vehicle_type_name?.trim())
          ? directHireForm.custom_vehicle_type_name.trim()
          : (directHireForm.custom_truck_type === 'bolero' ? 'PICKUP' : 'TRUCK');

        const res = await api.post('/fleet/vehicles/market-hire', {
          vehicle_number: cleanPlate,
          vehicle_type: vType,
          truck_size_feet: feetVal,
          capacity_ton: capacityTon,
          ownership: 'MARKET',
          driver_name: driverName,
          driver_phone: cleanDriverPhone,
          current_odometer: odoVal,
        });
        const newVeh = res.data?.data;
        if (newVeh) {
          finalVehicleId = newVeh.id;
          finalDriverId = newVeh.assigned_driver_id || newVeh.assignedDriver?.id;
          setVehiclesList((prev) => [newVeh, ...prev.filter((v) => v.id !== newVeh.id)]);
        }
      } catch (err) {
        setDirectHireError(err.response?.data?.message || 'Failed to auto-save custom vehicle');
        setSubmittingDirectHire(false);
        setDirectHireStep(2);
        return;
      }
    }

    if (!finalVehicleId) {
      setDirectHireError('Please select a vehicle to assign');
      setDirectHireStep(2);
      return;
    }
    if (!finalDriverId) {
      setDirectHireError('Please select an assigned driver');
      setDirectHireStep(2);
      return;
    }
    if (!directHireForm.destination_city?.trim()) {
      setDirectHireError('Destination city / unloading site is required');
      setDirectHireStep(1);
      return;
    }
    if (!directHireForm.contract_amount || parseFloat(directHireForm.contract_amount) <= 0) {
      setDirectHireError('Please enter a valid agreed hiring / contract freight amount');
      setDirectHireStep(3);
      return;
    }
    if (directHireForm.hiring_party_mode === 'CUSTOMER' && !directHireForm.customer_id && !directHireForm.hiring_party_name?.trim()) {
      setDirectHireError('Please select a customer or specify hiring party name');
      setDirectHireStep(1);
      return;
    }
    if (directHireForm.hiring_party_mode === 'DIRECT_PARTY' && !directHireForm.hiring_party_name?.trim()) {
      setDirectHireError('Please enter the hiring party / company name');
      setDirectHireStep(1);
      return;
    }

    try {
      setSubmittingDirectHire(true);
      const originBranch = branchesList.find((b) => b.id === directHireForm.origin_branch_id) || branchesList[0];
      const effectiveOriginBranchId = directHireForm.origin_branch_id || loginBranchId || originBranch?.id;
      const destCityNorm = (directHireForm.destination_city || '').trim().toLowerCase();
      const matchedDestBranch = branchesList.find(
        (b) => b.city && (b.city.toLowerCase() === destCityNorm || destCityNorm.includes(b.city.toLowerCase()))
      );
      const effectiveDestBranchId = directHireForm.dest_branch_id || matchedDestBranch?.id || effectiveOriginBranchId;

      const payload = {
        vehicle_id: finalVehicleId,
        driver_id: finalDriverId,
        origin_branch_id: effectiveOriginBranchId,
        dest_branch_id: effectiveDestBranchId,
        origin_city: directHireForm.origin_city?.trim() || originBranch?.city || 'Origin Yard',
        destination_city: directHireForm.destination_city.trim(),
        contract_amount: parseFloat(directHireForm.contract_amount),
        advance_received: parseFloat(directHireForm.advance_received) || 0,
        driver_advance: parseFloat(directHireForm.driver_advance) || 0,
        advance_mode: directHireForm.advance_mode || 'CASH',
        hiring_party_type: directHireForm.hiring_party_mode,
        customer_id: directHireForm.hiring_party_mode === 'CUSTOMER' ? directHireForm.customer_id : (directHireForm.customer_id || null),
        hiring_party_name: directHireForm.hiring_party_name?.trim() || null,
        hiring_party_phone: directHireForm.hiring_party_phone?.trim() || null,
        party_ref_number: directHireForm.party_ref_number?.trim() || null,
        eway_bill_no: directHireForm.eway_bill_no?.trim() || null,
        goods_description: directHireForm.goods_description?.trim() || null,
        start_odometer: directHireForm.start_odometer !== '' ? parseInt(directHireForm.start_odometer, 10) : undefined,
        remarks: directHireForm.remarks?.trim() || '',
      };

      const res = await api.post('/trips/direct-hire', payload);
      if (res.data?.success) {
        setIsDirectHireModalOpen(false);
        setDirectHireStep(1);
        setDirectHireForm(initialDirectHireForm);
        await Promise.all([fetchTrips(), fetchMasterData()]);
      }
    } catch (err) {
      setDirectHireError(err.response?.data?.message || 'Failed to create dedicated vehicle hire trip');
    } finally {
      setSubmittingDirectHire(false);
    }
  };

  // Pre-fill from query parameter e.g. /trips?action=new-placement&vehicleId=xyz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new-placement') {
        const preselectedVehId = params.get('vehicleId');
        if (preselectedVehId && vehiclesList.length > 0) {
          const matchedVeh = vehiclesList.find((v) => v.id === preselectedVehId);
          setDirectHireForm((prev) => ({
            ...prev,
            vehicle_id: preselectedVehId,
            start_odometer: matchedVeh?.current_odometer !== undefined ? matchedVeh.current_odometer : prev.start_odometer,
            driver_id: matchedVeh?.assigned_driver_id || matchedVeh?.assignedDriver?.id || prev.driver_id,
            origin_branch_id: matchedVeh?.branch_id || prev.origin_branch_id,
          }));
        }
        setIsDirectHireModalOpen(true);
      }
    }
  }, [vehiclesList]);

  const renderLoadTypeBadge = (trip, { size = 'sm', showLabel = false } = {}) => {
    if (!trip) return null;

    if (trip.trip_mode === 'DIRECT_VEHICLE_HIRE') {
      return (
        <span
          className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md border shadow-2xs transition-all ${
            size === 'xs'
              ? 'px-1.5 py-0.5 text-[9px]'
              : 'px-2 py-0.5 text-[10px]'
          } bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80`}
          title={`Dedicated Vehicle Placement for ${trip.hiring_party_name || 'Direct Client'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
          <span>VEHICLE PLACEMENT</span>
          {showLabel && <span className="font-semibold text-indigo-600/80 dark:text-indigo-400/80 text-[9px]">(Dedicated)</span>}
        </span>
      );
    }

    const isFtl =
      (trip.load_type || '').toUpperCase() === 'FTL' ||
      (Array.isArray(trip.consignments) && trip.consignments.some((c) => (c.load_type || '').toUpperCase() === 'FTL')) ||
      (trip.remarks && trip.remarks.toUpperCase().includes('FTL'));

    if (isFtl) {
      return (
        <span
          className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md border shadow-2xs transition-all ${
            size === 'xs'
              ? 'px-1.5 py-0.5 text-[9px]'
              : 'px-2 py-0.5 text-[10px]'
          } bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80`}
          title="Full Truckload (FTL) - Dedicated Direct Vehicle"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
          <span>FTL</span>
          {showLabel && <span className="font-semibold text-purple-600/80 dark:text-purple-400/80 text-[9px]">(Dedicated)</span>}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md border shadow-2xs transition-all ${
          size === 'xs'
            ? 'px-1.5 py-0.5 text-[9px]'
            : 'px-2 py-0.5 text-[10px]'
        } bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80`}
        title="Part Truckload (PTL) - Consolidated Sundry Cargo"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
        <span>PTL</span>
        {showLabel && <span className="font-semibold text-sky-600/70 dark:text-sky-400/70 text-[9px]">(Consolidated)</span>}
      </span>
    );
  };

  const columns = useMemo(() => [
    {
      key: 'trip_number',
      label: 'Trip Number',
      width: 195,
      minWidth: 165,
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenTripDetails(row);
            }}
            className="font-bold font-mono tracking-tight text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300 hover:underline text-left cursor-pointer transition-colors"
            title="Click to view complete 360° Trip Details, Financial Ledger & Route Audit"
          >
            {val}
          </button>
          {renderLoadTypeBadge(row, { size: 'xs' })}
        </div>
      )
    },
    {
      key: 'trip_date',
      label: 'Trip Date',
      width: 130,
      minWidth: 110,
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {val ? new Date(val).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      key: 'route',
      label: 'Route',
      width: 220,
      minWidth: 170,
      sortable: false,
      render: (val, row) => (
        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
            {row.originBranch?.branch_code && (
              <span className="font-mono text-[11px] text-blue-600 dark:text-cyan-400 font-bold">
                [{row.originBranch.branch_code}]
              </span>
            )}
            <span>{row.origin_city || row.originBranch?.city || 'Origin'}</span>
            <span className="text-slate-400 font-normal">→</span>
            {row.destBranch?.branch_code && (
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                [{row.destBranch.branch_code}]
              </span>
            )}
            <span>{row.destination_city || row.destBranch?.city || 'Dest'}</span>
          </div>
          {(row.originBranch?.branch_name || row.destBranch?.branch_name) && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {row.originBranch?.branch_name || row.origin_city} ➔ {row.destBranch?.branch_name || row.destination_city}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'vehicle',
      label: 'Assigned Vehicle',
      width: 220,
      minWidth: 190,
      sortable: false,
      render: (val, row) => {
        const ownership = (row.vehicle?.ownership || 'OWN').toUpperCase();
        const isMarket = ownership === 'MARKET';
        const isAttached = ownership === 'ATTACHED';
        const isOwn = ownership === 'OWN';
        const vehicleCharge = parseFloat(row.vehicle_charge || 0);

        return (
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-mono font-bold text-xs ${row.vehicle ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'}`}>
                {row.vehicle?.vehicle_number || 'Unassigned'}
              </span>
              {isMarket && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 tracking-tight">
                  Market Hire
                </span>
              )}
              {isAttached && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 tracking-tight">
                  Vendor Attached
                </span>
              )}
              {isOwn && row.vehicle && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tracking-tight">
                  Company Owned
                </span>
              )}
            </div>

            {row.vehicle?.vehicle_type && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {row.vehicle.vehicle_type} ({row.vehicle.capacity_ton || '10'}T)
              </p>
            )}

            {(isMarket || isAttached) && vehicleCharge > 0 && (
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/60">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Vehicle Charge:</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">₹{vehicleCharge.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'driver',
      label: 'Assigned Driver',
      width: 160,
      minWidth: 130,
      sortable: false,
      render: (val, row) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {row.driver?.name || 'Unassigned'}
          </span>
          {row.driver?.phone && (
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{row.driver.phone}</p>
          )}
        </div>
      )
    },
    {
      key: 'total_weight',
      label: 'Cargo / Details',
      width: 140,
      minWidth: 110,
      sortable: true,
      align: 'right',
      render: (val, row) => {
        if (row.trip_mode === 'DIRECT_VEHICLE_HIRE') {
          return (
            <div className="text-right">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate block max-w-[130px]" title={row.goods_description || row.hiring_party_name}>
                {row.goods_description || (row.hiring_party_name ? `For ${row.hiring_party_name}` : 'Dedicated FTL')}
              </span>
              {row.party_ref_number ? (
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate" title={`Ref: ${row.party_ref_number}`}>
                  Ref: {row.party_ref_number}
                </span>
              ) : (
                <span className="text-[9px] text-slate-400 block">No Docket Req.</span>
              )}
            </div>
          );
        }
        return (
          <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
            {val ? `${Number(val).toLocaleString()} KG` : '0 KG'}
          </span>
        );
      }
    },
    {
      key: 'financials',
      label: 'Financials / Advance',
      width: 165,
      minWidth: 140,
      sortable: false,
      align: 'right',
      render: (val, row) => {
        if (row.trip_mode === 'DIRECT_VEHICLE_HIRE') {
          const agreed = parseFloat(row.contract_amount || row.expected_revenue || 0);
          const partyAdv = parseFloat(row.advance_received || 0);
          const exp = parseFloat(row.total_expenses || 0);
          return (
            <div className="text-xs text-right space-y-0.5">
              <div className="font-black text-indigo-600 dark:text-indigo-400 font-mono flex items-center justify-end gap-1">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-sans">Freight:</span>
                <span>₹{agreed.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                {partyAdv > 0 && <span className="text-emerald-600 dark:text-emerald-400">Rec: ₹{partyAdv.toLocaleString('en-IN')} | </span>}
                <span>Exp: ₹{exp.toLocaleString('en-IN')}</span>
              </p>
            </div>
          );
        }

        const ownership = (row.vehicle?.ownership || 'OWN').toUpperCase();
        const isVendorOrMarket = ownership === 'MARKET' || ownership === 'ATTACHED';
        const vehicleCharge = parseFloat(row.vehicle_charge || 0);
        const adv = parseFloat(row.driver_advance || 0);
        const exp = parseFloat(row.total_expenses || 0);

        return (
          <div className="text-xs text-right space-y-0.5">
            {isVendorOrMarket ? (
              <>
                <div className="font-black text-slate-900 dark:text-slate-100 flex items-center justify-end gap-1 font-mono">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-sans">Charge:</span>
                  <span>₹{vehicleCharge.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  Adv: ₹{adv.toLocaleString('en-IN')} | Exp: ₹{exp.toLocaleString('en-IN')}
                </p>
              </>
            ) : (
              <>
                <span className="font-black text-slate-900 dark:text-slate-100 font-mono">
                  ₹{adv.toLocaleString('en-IN')}
                </span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  Exp: ₹{exp.toLocaleString('en-IN')}
                </p>
              </>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Trip Status',
      width: 140,
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (val, row) => {
        const hasBroken = row.remarks && row.remarks.includes('(BROKEN)');
        const hasMismatch = row.remarks && row.remarks.includes('(MISMATCH)');
        const hasDiscrepancy = hasBroken || hasMismatch;
        const isSettled = row.settlement_status === 'SETTLED';
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge status={val} size="xs" />
            {isSettled && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800 tracking-tight">
                ✓ Settled
              </span>
            )}
            {hasDiscrepancy && (
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tight ${
                  hasBroken
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                }`}
                title={row.remarks || 'Seal discrepancy reported at gate arrival'}
              >
                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                <span>{hasBroken ? 'SEAL BROKEN' : 'SEAL MISMATCH'}</span>
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'inbound_arrival',
      label: isOnlyFTL ? 'Dispatch / Delivery' : 'Dispatch & Unload',
      width: 175,
      minWidth: 155,
      sortable: false,
      align: 'center',
      render: (val, row) => {
        const effectiveBranch = loginBranchId;
        const currentBranchObj = branchesList.find((b) => b.id === effectiveBranch);

        // 1. Check if this trip is arriving at this branch (Inbound arrival)
        const isInboundToHere = Boolean(
          effectiveBranch && (
            row.dest_branch_id === effectiveBranch ||
            row.destBranch?.id === effectiveBranch ||
            (currentBranchObj?.branch_code && (row.destBranch?.branch_code === currentBranchObj.branch_code || row.dest_branch_code === currentBranchObj.branch_code))
          )
        );

        // 2. Check if this trip was dispatched from this branch (Outbound dispatch from here and not ending here)
        const isOutboundFromHere = Boolean(
          effectiveBranch &&
          !isInboundToHere && (
            row.origin_branch_id === effectiveBranch ||
            row.originBranch?.id === effectiveBranch ||
            (currentBranchObj?.branch_code && (row.originBranch?.branch_code === currentBranchObj.branch_code || row.origin_branch_code === currentBranchObj.branch_code))
          )
        );

        const isFtlTrip = (row.load_type || '').toUpperCase() === 'FTL' || (Array.isArray(row.consignments) && row.consignments.some((c) => (c.load_type || '').toUpperCase() === 'FTL'));

        // 3. If trip is COMPLETED
        if (row.status === 'COMPLETED') {
          return isFtlTrip ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded-md border border-sky-200 dark:border-sky-800 whitespace-nowrap shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
              Delivered & Done
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Unloaded & Done
            </span>
          );
        }

        // 4. FTL Dedicated Trips: Direct Client Delivery (Does not depend on destination hub gate)
        if (isFtlTrip && (row.status === 'RUNNING' || row.status === 'READY')) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFtlDeliveryModal(row);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:text-white bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 dark:hover:bg-purple-600 px-2.5 py-1 rounded-md border border-purple-300 dark:border-purple-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
              title={`Record Direct FTL Delivery at ${row.destination_city || row.destBranch?.city || 'Customer Site'}`}
            >
              <Truck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Reached & Deliver</span>
            </button>
          );
        }

        // 5. PTL Consolidated Trips: RUNNING / READY (Hub-to-Hub transit & gate entry)
        if (row.status === 'RUNNING' || row.status === 'READY') {
          const hasArrived = Boolean(row.end_odometer && Number(row.end_odometer) > 0) || Boolean(row.is_arrived);

          if (!hasArrived) {
            if (isInboundToHere) {
              // First step: Arrival not yet recorded -> Show "Arrival" button for destination branch
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenRecordArrival(row);
                  }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-white bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 dark:hover:bg-indigo-600 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                  title={`Record Physical Seal & Gate Arrival at ${row.destBranch?.branch_name || row.destBranch?.city || row.destination_city || 'Destination Hub'}`}
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  Arrival
                </button>
              );
            }

            if (isOutboundFromHere) {
              // Dispatched from this login/origin branch heading elsewhere
              return (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60 whitespace-nowrap shadow-2xs"
                  title={`Dispatched from ${row.originBranch?.branch_name || row.origin_city || 'Origin Hub'}. En route to ${row.destBranch?.branch_name || row.destBranch?.city || row.destination_city || 'Destination'}.`}
                >
                  <Send className="w-3 h-3 text-blue-500 dark:text-cyan-400" />
                  Dispatched
                </span>
              );
            }

            // Neither destination nor origin of this login branch (e.g. running between other branches across company)
            return (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60 whitespace-nowrap shadow-2xs"
                title={`In transit en route to ${row.destBranch?.branch_name || row.destBranch?.city || row.destination_city || 'Destination Hub'}`}
              >
                <Truck className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                In Transit
              </span>
            );
          } else {
            // Second step: Arrival recorded
            if (isInboundToHere) {
              const hasBroken = row.remarks && row.remarks.includes('(BROKEN)');
              const hasMismatch = row.remarks && row.remarks.includes('(MISMATCH)');
              const hasDiscrepancy = hasBroken || hasMismatch;

              let discReason = '';
              if (hasDiscrepancy && row.remarks) {
                const m = row.remarks.match(/Discrepancy:\s*([^|\n]+)/i);
                if (m) discReason = m[1].trim();
              }

              return (
                <div className="flex flex-col items-center gap-1">
                  <Link
                    href={`/unload-planning?trip_id=${row.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                      hasDiscrepancy
                        ? 'text-amber-800 dark:text-amber-200 bg-amber-50 hover:bg-amber-600 hover:text-white dark:bg-amber-950/40 dark:hover:bg-amber-600 border-amber-300 dark:border-amber-700 animate-pulse'
                        : 'text-emerald-700 dark:text-emerald-300 hover:text-white bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 dark:hover:bg-emerald-600 border-emerald-300 dark:border-emerald-800 animate-pulse'
                    }`}
                    title={hasDiscrepancy ? `Security Alert: ${discReason || 'Seal discrepancy recorded'}. Requires 100% docket tally inspection.` : 'Gate-in recorded! Proceed to cargo unload dock'}
                  >
                    {hasDiscrepancy ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <PackageCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{hasDiscrepancy ? 'Audit & Unload' : 'Unload Cargo'}</span>
                  </Link>
                  {hasDiscrepancy && (
                    <span
                      className="text-[9px] font-bold text-amber-700 dark:text-amber-300 truncate max-w-[155px]"
                      title={discReason || (hasBroken ? 'Seal Broken' : 'Seal Mismatch')}
                    >
                      ⚠️ {hasBroken ? 'Broken' : 'Mismatch'}: {discReason || 'Flagged'}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/60 whitespace-nowrap"
                title={`Vehicle arrived at destination hub (${row.destBranch?.branch_name || 'Destination'}). Unloading in progress.`}
              >
                <PackageCheck className="w-3 h-3 text-amber-500" />
                Arrived at Dest
              </span>
            );
          }
        }

        return <span className="text-xs text-slate-400 font-medium">-</span>;
      }
    },
    {
      key: 'settlement',
      label: 'Settlement',
      width: 110,
      minWidth: 90,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        row.settlement_status === 'SETTLED' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenSettledSlip(row);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
            title="Trip is settled! Click to view official Settlement Voucher Slip"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>SETTLED</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Pending</span>
        )
      )
    },
    {
      key: 'trip_details',
      label: isAdmin ? 'Details' : 'View',
      width: 95,
      minWidth: 80,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenTripDetails(row);
          }}
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95 ${
            isAdmin
              ? 'text-blue-600 dark:text-cyan-400 hover:text-white bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 dark:hover:bg-cyan-600 border-blue-200 dark:border-blue-800'
              : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
          }`}
          title={isAdmin ? 'View Complete Trip Details & Financial Management' : 'View Trip Details (View Only Mode)'}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isAdmin ? 'Details' : 'View'}</span>
        </button>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 165,
      minWidth: 140,
      sortable: false,
      align: 'center',
      render: (val, row) => {
        const effectiveBranch = loginBranchId;
        const currentBranchObj = branchesList.find((b) => b.id === effectiveBranch);
        // Only the Origin/Dispatch branch (who gave the cash advance) or Admins can settle
        const isOriginDispatchBranch = Boolean(
          !effectiveBranch ||
          isAdmin ||
          row.origin_branch_id === effectiveBranch ||
          row.originBranch?.id === effectiveBranch ||
          (currentBranchObj?.branch_code && (row.originBranch?.branch_code === currentBranchObj.branch_code || row.origin_branch_code === currentBranchObj.branch_code))
        );

        return (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">

            {row.settlement_status !== 'SETTLED' && row.status !== 'COMPLETED' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddAdvanceOrExp(row);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                title="Disburse Driver Advance or Log Trip Expense"
              >
                <Plus className="w-3 h-3" />
                Add Adv / Exp
              </button>
            )}

            {row.settlement_status !== 'SETTLED' && (canSettleTrip || canEditTrip || canEdit || isAdmin) && row.status === 'COMPLETED' && (
              isOriginDispatchBranch ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSettleModal(row);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1 rounded-md border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
                  title="Open Settlement Center to reconcile driver advance, expenses & bhatta"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Settle Trip
                </button>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 cursor-help"
                  title={`Trip financial settlement must be closed by the dispatch origin branch (${row.origin_city || row.originBranch?.city || 'Origin Branch'})`}
                >
                  Pending Origin Settle
                </span>
              )
            )}

            {row.settlement_status === 'SETTLED' && (
              row.trip_mode === 'DIRECT_VEHICLE_HIRE' && row.billing_status !== 'INVOICED' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTripInvoiceModal(row);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-white bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 dark:hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
                  title="Generate Freight Tax Invoice for Dedicated Vehicle Placement"
                >
                  <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Generate Freight Invoice</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSettledSlip(row);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-white bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 dark:hover:bg-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
                  title="View & Print Official Trip Settlement Voucher Slip"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Settlement Slip</span>
                </button>
              )
            )}
          </div>
        );
      }
    }
  ], [canEdit, canSettleTrip, canEditTrip, isAdmin, loginBranchId, branchesList, movementTab, isOnlyFTL]);

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Planned', value: 'PLANNED' },
    { label: 'Ready', value: 'READY' },
    { label: 'Running', value: 'RUNNING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Settled', value: 'SETTLED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0B1120]' : 'bg-[#F6F8FB]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 w-full max-w-full">
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0" />
                Trip and Movement
              </h1>
              <p className="text-xs lg:text-[13px] xl:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
                Monitor fleet journeys, assign commercial vehicles, and reconcile trip settlements.
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {isAdmin && (
                <BranchFilterDropdown
                  selectedBranchId={selectedBranchId}
                  onChange={(newBranchId) => {
                    setSelectedBranchId(newBranchId);
                    setPage(1);
                  }}
                  branches={branchesList}
                  allLabel="All Branches"
                  allSubtitle="All Operating Hubs"
                  label="Branch:"
                  showLabel={true}
                  align="right"
                />
              )}
              {/* 1. FTL Vehicle Placement: Available for FTL Only and BOTH (Suppressed for PTL Only) */}
              {!isOnlyPTL && (
                <button
                  type="button"
                  onClick={() => {
                    setDirectHireStep(1);
                    setDirectHireError('');
                    const originBr = branchesList.find((b) => b.id === loginBranchId) || branchesList[0];
                    setDirectHireForm((prev) => ({
                      ...prev,
                      origin_branch_id: loginBranchId || originBr?.id || '',
                      origin_city: prev.origin_city || originBr?.city || '',
                    }));
                    setIsDirectHireModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Create dedicated vehicle placement trip for customer or transport vendor"
                >
                  <Truck className="w-4 h-4" />
                  <span>+ Vehicle Placement</span>
                </button>
              )}

              {/* 2. FTL Dedicated Dispatch: Available strictly for FTL Full Service Enterprise (Hidden in FTL Vendor & FTL Direct Carrier) */}
              {isCompleteFTL && !isFleetSupplier && !isDirectCarrier && (
                <Link
                  href="/load-planning"
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Dispatch dedicated company or attached fleet vehicle for FTL consignment"
                >
                  <Send className="w-4 h-4" />
                  <span>+ Dispatch Dedicated Trip</span>
                </Link>
              )}

              {/* 3. PTL / Consolidated Load Planning Dock: Available for PTL Only and BOTH */}
              {!isOnlyFTL && (
                <Link
                  href="/load-planning"
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Access Load Planning Dock for multi-consignment manifest planning"
                >
                  <Layers className="w-4 h-4" />
                  <span>{isOnlyPTL ? '+ Load Planning (PTL)' : 'Load Planning Dock'}</span>
                </Link>
              )}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={trips}
            loading={loading}
            totalItems={totalRecords}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(field, order) => {
              setSortBy(field);
              setSortOrder(order);
              setPage(1);
            }}
            onRowClick={(row) => handleOpenTripDetails(row)}
            searchable={true}
            searchQuery={searchInput}
            searchPlaceholder="Search by trip #, vehicle, driver, route..."
            onSearchChange={(q) => {
              setSearchInput(q);
              if (!q) {
                setDebouncedSearch('');
                setPage(1);
              }
            }}
            filtersSlot={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-0.5">
                {/* Movement Tabs (All Trips / Outbound / Inbound / Placements) */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
                  {[
                    { value: 'ALL', label: isOnlyFTL ? 'All Dedicated Trips' : isOnlyPTL ? 'All PTL Trips' : 'All Trips' },
                    { value: 'OUTBOUND', label: 'Outbound Dispatches' },
                    { value: 'INBOUND', label: 'Inbound Arrivals' },
                    ...(!isOnlyPTL ? [{ value: 'DIRECT_HIRE', label: 'Vehicle Placements' }] : []),
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMovementTab(m.value);
                        setPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        movementTab === m.value
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold'
                          : isDark
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            }
            branchFilterable={false}
            headerFiltersSlot={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className={`pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none appearance-none cursor-pointer ${
                      statusFilter !== 'ALL' && statusFilter !== ''
                        ? isDark
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                          : 'bg-blue-50 border-blue-300 text-blue-800'
                        : isDark
                        ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                    title="Filter trips by operational status"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {isBoth && (
                  <div className="relative">
                    <select
                      value={loadTypeFilter}
                      onChange={(e) => {
                        setLoadTypeFilter(e.target.value);
                        setPage(1);
                      }}
                      className={`pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none appearance-none cursor-pointer ${
                        loadTypeFilter
                          ? isDark
                            ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                            : 'bg-purple-50 border-purple-300 text-purple-800'
                          : isDark
                          ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-slate-600'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                      }`}
                      title="Filter trips by FTL / PTL load type"
                    >
                      <option value="" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>All Loads</option>
                      <option value="FTL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>⚡ FTL (Dedicated)</option>
                      <option value="PTL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>📦 PTL (Consolidated)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>
            }
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={({ fromDate: newFrom, toDate: newTo }) => {
              setFromDate(newFrom);
              setToDate(newTo);
              setPage(1);
            }}
            exportable={true}
            exportFileName="Trips_Log"
            emptyMessage="No trips recorded yet."
          />

          {/* Trip Expense Settlement & Driver Reconciliation Center Modal */}
          <Modal isOpen={Boolean(selectedTrip)} onClose={() => { setSelectedTrip(null); setShowAddExpenseInSettle(false); }}>
            {selectedTrip && (
              <div
                className={`relative w-full max-w-2xl max-h-[92vh] my-auto flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Header */}
                <div className={`shrink-0 px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black tracking-tight">Trip Expense Settlement & Reconciliation</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          Final Debrief
                        </span>
                        {renderLoadTypeBadge(selectedTrip, { size: 'xs', showLabel: true })}
                      </div>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                        Trip #{selectedTrip.trip_number} • {selectedTrip.origin_city || selectedTrip.originBranch?.city || 'Origin'} → {selectedTrip.destination_city || selectedTrip.destBranch?.city || 'Dest'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTrip(null);
                      setShowAddExpenseInSettle(false);
                    }}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Driver & Vehicle Quick Banner */}
                <div className={`shrink-0 px-6 py-2.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 ${
                  isDark ? 'border-slate-800/80 bg-slate-900/40 text-slate-300' : 'border-slate-100 bg-slate-50/50 text-slate-600'
                }`}>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Driver:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedTrip.driver?.name || 'Unassigned'} {selectedTrip.driver?.phone ? `(${selectedTrip.driver.phone})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Truck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Assigned Vehicle:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">
                      {selectedTrip.vehicle?.vehicle_number || 'N/A'}
                    </span>
                    {/* Vehicle Ownership Badge */}
                    {(() => {
                      const own = (selectedTrip.vehicle?.ownership || 'OWN').toUpperCase();
                      if (own === 'MARKET') {
                        return (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            🚛 Market Hired Truck
                          </span>
                        );
                      }
                      if (own === 'ATTACHED') {
                        return (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            🤝 Vendor Attached Truck
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                          🏢 Company Owned Fleet
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Scrollable Body */}
                {(() => {
                  const ownership = (selectedTrip.vehicle?.ownership || 'OWN').toUpperCase();
                  const isMarketOrAttached = ownership === 'MARKET' || ownership === 'ATTACHED';

                  const totalAdv = parseFloat(selectedTrip.driver_advance || 0);
                  const totalExp = settleExpensesList.length > 0
                    ? settleExpensesList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0)
                    : parseFloat(selectedTrip.total_expenses || 0);
                  const bhatta = parseFloat(driverAllowance || 0);

                  const parsedVehicleCharge = parseFloat(
                    settleVehicleCharge !== '' && settleVehicleCharge !== null && settleVehicleCharge !== undefined
                      ? settleVehicleCharge
                      : (selectedTrip.vehicle_charge || 0)
                  ) || 0;

                  const grossRev = parseFloat(selectedTrip.expected_revenue || 0);

                  // Calculation for MARKET / ATTACHED:
                  // Net Payable to Vendor/Market Owner = Agreed Vehicle Charge - (Disbursed Advance + Company Paid Highway Expenses)
                  const totalCompanyDeductions = totalAdv + totalExp;
                  const netVendorBalance = parsedVehicleCharge - totalCompanyDeductions;
                  const isVendorPayable = netVendorBalance > 0;
                  const isVendorRecover = netVendorBalance < 0;
                  const absVendorBalance = Math.abs(netVendorBalance);
                  const vendorGrossMargin = grossRev - parsedVehicleCharge;
                  const vendorMarginPct = grossRev > 0 ? ((vendorGrossMargin / grossRev) * 100).toFixed(1) : 0;

                  // Calculation for COMPANY OWNED:
                  // Driver debrief: Advance - (Highway Expenses + Bhatta)
                  const netDriverBalance = totalAdv - (totalExp + bhatta);
                  const isPayableToDriver = netDriverBalance < 0;
                  const isRefundFromDriver = netDriverBalance > 0;
                  const absDriverBalance = Math.abs(netDriverBalance);
                  const ownOperatingCosts = totalExp + bhatta;
                  const ownMargin = grossRev - ownOperatingCosts;
                  const ownMarginPct = grossRev > 0 ? ((ownMargin / grossRev) * 100).toFixed(1) : 0;

                  return (
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 max-h-[calc(92vh-150px)]">
                      {/* Direct Vehicle Placement Contract Details */}
                      {selectedTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' && (
                        <div className={`p-4 rounded-2xl border ${
                          isDark ? 'bg-purple-950/25 border-purple-800/60' : 'bg-purple-50/80 border-purple-200'
                        }`}>
                          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-purple-500/20">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5" />
                                <span>Direct Vehicle Hire Contract</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300">
                                External / Dedicated Placement
                              </span>
                            </div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Billing Status: <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">{selectedTrip.billing_status || 'PENDING'}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Hiring Party</span>
                              <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                                {selectedTrip.customer?.name || selectedTrip.hiring_party_name || 'Direct Client / Transporter'}
                              </p>
                              {(selectedTrip.hiring_party_phone || selectedTrip.customer?.phone) && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {selectedTrip.hiring_party_phone || selectedTrip.customer?.phone}
                                </p>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Party Docket / Ref #</span>
                              <p className="font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                                {selectedTrip.party_ref_number || 'None (Direct Placement)'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">e-Way Bill #</span>
                              <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                                {selectedTrip.eway_bill_no || 'None'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Commodity / Cargo</span>
                              <p className="font-medium text-slate-900 dark:text-white mt-0.5 truncate">
                                {selectedTrip.goods_description || 'General Goods'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">Agreed Placement Freight:</span>
                              <span className="font-bold font-mono text-purple-600 dark:text-purple-300">
                                ₹{(parseFloat(selectedTrip.contract_amount || selectedTrip.expected_revenue || 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">Advance from Party:</span>
                              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                ₹{(parseFloat(selectedTrip.advance_received || 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">Receivable Balance:</span>
                              <span className="font-black font-mono text-amber-600 dark:text-amber-400">
                                ₹{Math.max(0, parseFloat(selectedTrip.contract_amount || selectedTrip.expected_revenue || 0) - parseFloat(selectedTrip.advance_received || 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Financial KPI Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {isMarketOrAttached ? (
                          <>
                            {/* 1. Agreed Vehicle Charge */}
                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-purple-950/20 border-purple-800/50' : 'bg-purple-50/70 border-purple-200'
                            }`}>
                              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-[11px] font-bold mb-1">
                                <span>Vehicle Charge</span>
                                <Truck className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-base font-black font-mono text-purple-700 dark:text-purple-300">
                                ₹{parsedVehicleCharge.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-400">Agreed Hire Rate</span>
                            </div>

                            {/* 2. Disbursed Advance (Less) */}
                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
                                <span>Less: Advance</span>
                                <Banknote className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                                ₹{totalAdv.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-400">Cash / Fuel Card</span>
                            </div>

                            {/* 3. Company Paid Highway Expenses (Less) */}
                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
                                <span>Less: Highway Exp.</span>
                                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                              <div className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                                ₹{totalExp.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-400">{settleExpensesList.length} slips company paid</span>
                            </div>

                            {/* 4. Net Settlement Balance */}
                            <div className={`p-3 rounded-xl border ${
                              isVendorPayable
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                                : isVendorRecover
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
                                : 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100'
                            }`}>
                              <div className="flex items-center justify-between text-[11px] font-bold mb-1 opacity-90">
                                <span>{isVendorPayable ? 'Company to Pay' : isVendorRecover ? 'Recovery Due' : 'Reconciled'}</span>
                                <DollarSign className="w-3.5 h-3.5" />
                              </div>
                              <div className={`text-base font-black font-mono ${
                                isVendorPayable
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isVendorRecover
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                ₹{absVendorBalance.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] font-semibold opacity-80">
                                {isVendorPayable
                                  ? (ownership === 'MARKET' ? 'Payable to Market Owner' : 'Payable to Attached Vendor')
                                  : isVendorRecover
                                  ? 'Deduction exceeds hire rate'
                                  : 'Balanced (₹0)'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* 1. Advance */}
                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
                                <span>Disbursed Advance</span>
                                <Banknote className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                                ₹{totalAdv.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-400">Cash / Fuel Card</span>
                            </div>

                            {/* 2. Expenses */}
                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
                                <span>Highway Expenses</span>
                                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                              <div className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                                ₹{totalExp.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-400">{settleExpensesList.length} slips recorded</span>
                            </div>

                            {/* 3. Bhatta */}
                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
                                <span>Driver Bhatta</span>
                                <User className="w-3.5 h-3.5 text-indigo-500" />
                              </div>
                              <div className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                                ₹{bhatta.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-400">Daily allowance</span>
                            </div>

                            {/* 4. Net Settlement */}
                            <div className={`p-3 rounded-xl border ${
                              isPayableToDriver
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                                : isRefundFromDriver
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
                                : 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100'
                            }`}>
                              <div className="flex items-center justify-between text-[11px] font-bold mb-1 opacity-90">
                                <span>{isPayableToDriver ? 'Company to Pay' : isRefundFromDriver ? 'Driver to Refund' : 'Reconciled'}</span>
                                <DollarSign className="w-3.5 h-3.5" />
                              </div>
                              <div className={`text-base font-black font-mono ${
                                isPayableToDriver
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isRefundFromDriver
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                ₹{absDriverBalance.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] font-semibold opacity-80">
                                {isPayableToDriver ? 'Payable to Driver' : isRefundFromDriver ? 'Refund to Transporter' : 'Balanced (₹0)'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Financial Margin & Operating Summary Bar */}
                      <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-semibold">Customer Freight Revenue:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ₹{grossRev.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {isMarketOrAttached ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">Vehicle Hire Charge:</span>
                            <span className="font-mono font-bold text-rose-500">
                              -₹{parsedVehicleCharge.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">Total Trip Operating Costs:</span>
                            <span className="font-mono font-bold text-rose-500">
                              -₹{ownOperatingCosts.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-semibold">Net Trip Margin:</span>
                          <span className={`font-mono font-black ${
                            (isMarketOrAttached ? vendorGrossMargin : ownMargin) >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500'
                          }`}>
                            ₹{(isMarketOrAttached ? vendorGrossMargin : ownMargin).toLocaleString('en-IN')} ({(isMarketOrAttached ? vendorMarginPct : ownMarginPct)}%)
                          </span>
                        </div>
                      </div>

                      {/* Section: Vehicle Charge Adjustment for MARKET / ATTACHED */}
                      {isMarketOrAttached && (
                        <div className={`p-4 rounded-xl border ${
                          isDark ? 'bg-purple-950/20 border-purple-800/40' : 'bg-purple-50/60 border-purple-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-purple-500" />
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                Vehicle Charge (Agreed Hire / Trip Freight) ₹ <span className="text-red-500 font-bold ml-0.5">*</span>
                              </h4>
                            </div>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                              {ownership === 'MARKET' ? 'Market Hired Rate' : 'Vendor Attached Rate'}
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={settleVehicleCharge}
                              onChange={(e) => setSettleVehicleCharge(e.target.value)}
                              placeholder="e.g. 25000"
                              className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-slate-900 border-purple-800/60 text-white focus:border-purple-400'
                                  : 'bg-white border-purple-300 text-slate-900 focus:border-purple-500'
                              }`}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            Agreed vehicle hire freight. Disbursed advances (₹{totalAdv.toLocaleString('en-IN')}) and company-paid diesel/toll slips (₹{totalExp.toLocaleString('en-IN')}) are deducted automatically.
                          </p>
                        </div>
                      )}

                      {/* Section: Highway Expense Slips & Vouchers */}
                      <div className={`p-4 rounded-xl border ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              Highway Bills & Expense Records ({settleExpensesList.length})
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowAddExpenseInSettle(!showAddExpenseInSettle)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{showAddExpenseInSettle ? 'Close Form' : 'Add Expense / Slip'}</span>
                          </button>
                        </div>

                        {/* Inline Add Expense Form */}
                        {showAddExpenseInSettle && (
                          <form onSubmit={handleAddExpenseInSettle} className={`p-3.5 mb-3.5 rounded-xl border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                            isDark ? 'bg-[#0E1528] border-blue-900/50' : 'bg-white border-blue-200 shadow-xs'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" />
                                Add New Expense Slip / Voucher
                              </span>
                              <span className="text-[10px] text-slate-400">Updates settlement balance immediately</span>
                            </div>

                            {settleExpenseError && (
                              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{settleExpenseError}</span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Category <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <select
                                  value={settleNewExpCategory}
                                  onChange={(e) => setSettleNewExpCategory(e.target.value)}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border focus:outline-none ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                  }`}
                                >
                                  <option value="Fuel & Diesel">Fuel & Diesel</option>
                                  <option value="Toll & Fastag">Toll & FASTag</option>
                                  <option value="Loading & Hamali">Loading & Hamali</option>
                                  <option value="Unloading Charges">Unloading Charges</option>
                                  <option value="Vehicle Maintenance & Spares">Vehicle Maintenance</option>
                                  <option value="Police / RTO / Challan">Police / RTO / Challan</option>
                                  <option value="Tyre & Punctures">Tyre & Punctures</option>
                                  <option value="Miscellaneous">Miscellaneous</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Amount (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    value={settleNewExpAmount}
                                    onChange={(e) => setSettleNewExpAmount(e.target.value)}
                                    placeholder="e.g. 1200"
                                    className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border focus:outline-none ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                    }`}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Paid Via
                                </label>
                                <select
                                  value={settleNewExpPaymentMethod}
                                  onChange={(e) => setSettleNewExpPaymentMethod(e.target.value)}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs border focus:outline-none ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                  }`}
                                >
                                  <option value="CASH">Cash in Hand</option>
                                  <option value="FUEL_CARD">Fuel Card</option>
                                  <option value="FASTAG">FASTag / RFID</option>
                                  <option value="UPI">UPI / Digital</option>
                                  <option value="COMPANY_CARD">Company Card</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={settleNewExpRemarks}
                                onChange={(e) => setSettleNewExpRemarks(e.target.value)}
                                placeholder="Receipt / Challan # or pump name (e.g. HPCL Pump Diesel Slip #9482)"
                                className={`flex-1 px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                              />
                              <button
                                type="submit"
                                disabled={savingSettleExpense}
                                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                              >
                                {savingSettleExpense ? 'Saving...' : 'Add Slip'}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* List of expenses */}
                        {loadingSettleData ? (
                          <div className="py-4 text-center text-xs text-slate-400">Loading trip vouchers...</div>
                        ) : settleExpensesList.length > 0 ? (
                          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            {settleExpensesList.map((exp, idx) => (
                              <div
                                key={exp.id || idx}
                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/80 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <Receipt className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {getExpenseCategoryName(exp)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {exp.payment_method || 'CASH'} • {exp.remarks || 'No notes'}
                                    </div>
                                  </div>
                                </div>
                                <div className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                  ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`p-4 rounded-xl border border-dashed text-center ${
                            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-500'
                          }`}>
                            <p className="text-xs font-medium">No highway expense slips recorded yet for this trip.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              If diesel or toll bills were paid on behalf of this vehicle, click &quot;+ Add Expense / Slip&quot; above to log and deduct them.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Section: Driver Allowance (Bhatta) Adjustment - Only for Company Owned trucks */}
                      {!isMarketOrAttached && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Driver Daily Allowance (Bhatta) ₹ <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <div className="flex items-center gap-1.5">
                              {[0, 500, 1000, 1500, 2000].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setDriverAllowance(amt)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                    Number(driverAllowance) === amt
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {amt === 0 ? '₹0 (None)' : `₹${amt}`}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={driverAllowance}
                              onChange={(e) => setDriverAllowance(e.target.value)}
                              className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Section: Settlement Remarks */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Reconciliation & Closing Remarks (Optional)
                        </label>
                        <input
                          type="text"
                          value={settleRemarks}
                          onChange={(e) => setSettleRemarks(e.target.value)}
                          placeholder={isMarketOrAttached ? 'e.g. Cleared market truck hire payment after diesel deduction' : 'e.g. Verified fuel slips and settled cash balance with driver'}
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Sticky Footer */}
                {(() => {
                  const ownership = (selectedTrip.vehicle?.ownership || 'OWN').toUpperCase();
                  const isMarketOrAttached = ownership === 'MARKET' || ownership === 'ATTACHED';

                  const totalAdv = parseFloat(selectedTrip.driver_advance || 0);
                  const totalExp = settleExpensesList.length > 0
                    ? settleExpensesList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0)
                    : parseFloat(selectedTrip.total_expenses || 0);
                  const bhatta = parseFloat(driverAllowance || 0);

                  const parsedVehicleCharge = parseFloat(
                    settleVehicleCharge !== '' && settleVehicleCharge !== null && settleVehicleCharge !== undefined
                      ? settleVehicleCharge
                      : (selectedTrip.vehicle_charge || 0)
                  ) || 0;

                  const netVendorBalance = parsedVehicleCharge - (totalAdv + totalExp);
                  const isVendorPayable = netVendorBalance > 0;
                  const isVendorRecover = netVendorBalance < 0;
                  const absVendorBalance = Math.abs(netVendorBalance);

                  const netDriverBalance = totalAdv - (totalExp + bhatta);
                  const isPayableToDriver = netDriverBalance < 0;
                  const isRefundFromDriver = netDriverBalance > 0;
                  const absDriverBalance = Math.abs(netDriverBalance);

                  return (
                    <div className={`p-4 px-6 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                      isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="text-xs">
                        <span className="text-slate-400">Final Decision: </span>
                        {isMarketOrAttached ? (
                          isVendorPayable ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Pay {ownership === 'MARKET' ? 'Market Owner' : 'Vendor'} ₹{absVendorBalance.toLocaleString('en-IN')}
                            </span>
                          ) : isVendorRecover ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              Recover ₹{absVendorBalance.toLocaleString('en-IN')} from {ownership === 'MARKET' ? 'Market Owner' : 'Vendor'}
                            </span>
                          ) : (
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              Zero Balance Reconciled (₹0)
                            </span>
                          )
                        ) : (
                          isPayableToDriver ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Pay Driver ₹{absDriverBalance.toLocaleString('en-IN')}
                            </span>
                          ) : isRefundFromDriver ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              Collect ₹{absDriverBalance.toLocaleString('en-IN')} Cash Refund
                            </span>
                          ) : (
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              Zero Balance Reconciled
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTrip(null);
                            setShowAddExpenseInSettle(false);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Cancel
                        </button>

                        {/* View Slip Preview Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSettlementSlipData({
                              trip: selectedTrip,
                              settlement: {
                                settlement_number: `PREVIEW-${selectedTrip?.trip_number || 'TRP'}`,
                                settlement_date: new Date().toISOString().slice(0, 10),
                                total_advance: totalAdv,
                                total_expenses: totalExp,
                                driver_allowance: isMarketOrAttached ? 0 : bhatta,
                                vehicle_charge: isMarketOrAttached ? parsedVehicleCharge : 0,
                                vehicle_ownership: ownership,
                                balance_payable_or_receivable: isMarketOrAttached ? absVendorBalance : absDriverBalance,
                                settlement_type: isMarketOrAttached
                                  ? (isVendorPayable ? 'PAYABLE_TO_VENDOR' : isVendorRecover ? 'RECOVER_FROM_VENDOR' : 'ZERO_BALANCE')
                                  : (isPayableToDriver ? 'PAYABLE_TO_DRIVER' : isRefundFromDriver ? 'REFUND_FROM_DRIVER' : 'ZERO_BALANCE'),
                                status: 'PENDING_VERIFICATION',
                                remarks: settleRemarks,
                              },
                              isFinal: false,
                              driverAllowance: bhatta,
                              vehicleCharge: parsedVehicleCharge,
                              remarks: settleRemarks,
                              expensesList: [...settleExpensesList],
                              advancesList: [...settleAdvancesList],
                            });
                            setShowSettlementSlip(true);
                          }}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isDark
                              ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                              : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Preview full debrief verification slip before settling"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>View Slip</span>
                        </button>

                        <button
                          type="button"
                          disabled={settling}
                          onClick={() => handleSettle(selectedTrip.id)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          {settling ? (
                            <>
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>Settling Trip...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {isMarketOrAttached
                                  ? (isVendorPayable
                                      ? `Pay ₹${absVendorBalance.toLocaleString('en-IN')} & Settle Trip`
                                      : isVendorRecover
                                      ? `Recover ₹${absVendorBalance.toLocaleString('en-IN')} & Settle`
                                      : 'Confirm & Settle Trip')
                                  : (isPayableToDriver
                                      ? `Pay ₹${absDriverBalance.toLocaleString('en-IN')} & Settle Trip`
                                      : isRefundFromDriver
                                      ? `Collect ₹${absDriverBalance.toLocaleString('en-IN')} & Settle`
                                      : 'Confirm & Settle Trip')}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </Modal>

          {/* Dedicated FTL Vehicle Placement Freight Invoice Generator Modal */}
          <Modal
            isOpen={Boolean(isTripInvoiceModalOpen && tripToInvoice)}
            onClose={() => {
              setIsTripInvoiceModalOpen(false);
              setTripInvoiceSuccessData(null);
            }}
            size="lg"
          >
            {tripToInvoice && (
              <div
                className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all text-xs ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight">
                        Generate Freight Tax Invoice
                      </h3>
                      <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Dedicated Vehicle Placement • Trip #{tripToInvoice.trip_number}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTripInvoiceModalOpen(false);
                      setTripInvoiceSuccessData(null);
                    }}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {tripInvoiceSuccessData ? (
                  /* Success View */
                  <div className="p-6 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center animate-in zoom-in">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">
                        Freight Invoice Issued Successfully!
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Official Tax Invoice #{tripInvoiceSuccessData.invoice_number} has been generated and posted to Billing & Customer Ledger.
                      </p>
                    </div>

                    <div className={`p-4 rounded-xl border max-w-md mx-auto text-left grid grid-cols-2 gap-3 text-xs ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Customer / Hirer:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {tripToInvoice.hiring_party_name || 'Direct Client'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Freight:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          ₹{parseFloat(tripInvoiceSuccessData.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Advance Adjusted:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          - ₹{parseFloat(tripInvoiceSuccessData.paid_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Net Balance Due:</span>
                        <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                          ₹{parseFloat(tripInvoiceSuccessData.balance_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTripInvoiceModalOpen(false);
                          setTripInvoiceSuccessData(null);
                          handleOpenSettledSlip(tripToInvoice);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Settlement Slip</span>
                      </button>

                      <Link
                        href="/billing/invoices"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View in Invoices Register ➔</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Form View */
                  <form onSubmit={handleSubmitTripInvoice} className="p-6 space-y-4">
                    {/* Trip & Hiring Party Brief Card */}
                    <div className={`p-3.5 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs ${
                      isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-blue-50/50 border-blue-100'
                    }`}>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Hiring Client</span>
                        <span className="font-black text-slate-900 dark:text-white truncate block">
                          {tripToInvoice.hiring_party_name || 'Direct Hirer'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{tripToInvoice.hiring_party_phone || 'No Phone'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Assigned Vehicle</span>
                        <span className="font-black text-slate-900 dark:text-white font-mono block">
                          {tripToInvoice.vehicle?.vehicle_number || 'RJ14GB1234'}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">{tripToInvoice.vehicle?.ownership || 'Company'} Owned</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Trip Route</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {tripToInvoice.origin_city} ➔ {tripToInvoice.destination_city}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">{tripToInvoice.goods_description || 'Dedicated Placement'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Settlement Status</span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Settled
                        </span>
                      </div>
                    </div>

                    {/* Agreed Commercial Financials Breakdown */}
                    {(() => {
                      const contractAmt = parseFloat(tripToInvoice.contract_amount || tripToInvoice.expected_revenue || 0);
                      const advRec = parseFloat(tripToInvoice.advance_received || 0);
                      const extra = parseFloat(tripInvoiceExtraCharges || 0);
                      const taxable = Math.max(0, contractAmt + extra);
                      const gstRate = tripInvoiceIsRcm ? 0 : (parseFloat(tripInvoiceTaxRate) || 0);
                      const taxAmt = Math.round((taxable * gstRate) / 100);
                      const totalInv = taxable + taxAmt;
                      const balDue = Math.max(0, totalInv - advRec);

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-2.5 text-center">
                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Agreed Freight</span>
                              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                                ₹{contractAmt.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-semibold">Less Advance Paid</span>
                              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                - ₹{advRec.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 block uppercase font-semibold">Net Balance Due</span>
                              <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                                ₹{balDue.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {/* Invoice Configuration Controls */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                Invoice Date <span className="text-red-500 font-bold">*</span>
                              </label>
                              <input
                                type="date"
                                value={tripInvoiceDate}
                                onChange={(e) => setTripInvoiceDate(e.target.value)}
                                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                                required
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                Payment Terms / Credit Days
                              </label>
                              <div className="flex gap-2">
                                {[15, 30, 45].map((days) => (
                                  <button
                                    key={days}
                                    type="button"
                                    onClick={() => setTripInvoiceCreditDays(days)}
                                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                      tripInvoiceCreditDays === days
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {days} Days
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                GST Tax Slab (GTA Freight)
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTripInvoiceIsRcm(false);
                                    setTripInvoiceTaxRate(5.0);
                                  }}
                                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    !tripInvoiceIsRcm && tripInvoiceTaxRate === 5.0
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  5% Forward GST
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTripInvoiceIsRcm(true);
                                    setTripInvoiceTaxRate(0);
                                  }}
                                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    tripInvoiceIsRcm
                                      ? 'bg-purple-600 text-white border-purple-600'
                                      : isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  0% GST (RCM)
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                Extra Charges (Detention / Toll / Loading)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={tripInvoiceExtraCharges}
                                onChange={(e) => setTripInvoiceExtraCharges(e.target.value)}
                                placeholder="₹0"
                                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none font-mono ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                              Invoice Line Item Description / Remarks
                            </label>
                            <input
                              type="text"
                              value={tripInvoiceRemarks}
                              onChange={(e) => setTripInvoiceRemarks(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          {/* Live Calculation Bar */}
                          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">Total Invoiced:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">₹{totalInv.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">Advance Received:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">-₹{advRec.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-blue-500 block font-sans font-bold">Client Net Outstanding:</span>
                              <span className="text-base font-black text-blue-600 dark:text-blue-400">₹{balDue.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setIsTripInvoiceModalOpen(false)}
                              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingTripInvoice}
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
                            >
                              {isSubmittingTripInvoice ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Generating Freight Invoice...</span>
                                </>
                              ) : (
                                <>
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Generate & Issue Freight Invoice (₹{balDue.toLocaleString('en-IN')})</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </form>
                )}
              </div>
            )}
          </Modal>

          {/* Trip Settlement Debrief Slip / Voucher Modal */}
          <Modal
            isOpen={Boolean(showSettlementSlip && settlementSlipData)}
            onClose={() => setShowSettlementSlip(false)}
            size="2xl"
          >
            {settlementSlipData && (
              <div
                id="trip-settlement-slip-voucher"
                className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden transition-all text-xs print:m-0 print:border-none print:shadow-none print:text-black print:bg-white ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Header (with screen-only actions) */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center print:hidden">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black tracking-tight uppercase">
                          {settlementSlipData.isFinal ? 'Official Trip Debrief & Settlement Voucher' : 'Pre-Settlement Verification Slip'}
                        </h3>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          settlementSlipData.isFinal
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {settlementSlipData.isFinal ? 'Verified & Settled' : 'Draft Preview'}
                        </span>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                        Voucher #{settlementSlipData.settlement?.settlement_number || `SETTLE-${settlementSlipData.trip?.trip_number}`} • Date: {settlementSlipData.settlement?.settlement_date || new Date().toISOString().slice(0, 10)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                        isDark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Print Official Slip or Save as PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-500" />
                      <span>Print Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSettlementSlip(false)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Printable Slip Content */}
                <div className="p-6 space-y-5 max-h-[calc(90vh-140px)] overflow-y-auto print:max-h-none print:overflow-visible">
                  {/* Transporter Organisation Stamp Header */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-dashed border-slate-300 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">TRANSHUB LOGISTICS NETWORK</h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Fleet Operations & Highway Debrief Settlement Division
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Issuing Hub: <span className="font-bold text-slate-700 dark:text-slate-300">{settlementSlipData.trip?.origin_city || settlementSlipData.trip?.originBranch?.city || 'Origin Branch'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 rounded-lg font-mono font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                        {settlementSlipData.settlement?.settlement_number || `SETTLE-${settlementSlipData.trip?.trip_number}`}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Trip #{settlementSlipData.trip?.trip_number}
                      </p>
                    </div>
                  </div>

                  {/* Trip Details Grid */}
                  <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Route</span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {settlementSlipData.trip?.origin_city || settlementSlipData.trip?.originBranch?.city || 'Origin'} → {settlementSlipData.trip?.destination_city || settlementSlipData.trip?.destBranch?.city || 'Destination'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vehicle Number</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-blue-600 dark:text-cyan-400 text-xs">
                          {settlementSlipData.trip?.vehicle?.vehicle_number || 'N/A'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-black uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          {(settlementSlipData.trip?.vehicle?.ownership || 'OWN').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Driver Name & Phone</span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                        {settlementSlipData.trip?.driver?.name || 'Unassigned'}
                      </span>
                      {settlementSlipData.trip?.driver?.phone && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {settlementSlipData.trip?.driver?.phone}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Movement Type</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs block">
                        {settlementSlipData.trip?.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Dedicated Vehicle Placement' : (settlementSlipData.trip?.load_type || 'FTL')}
                      </span>
                    </div>
                  </div>

                  {/* Direct Placement Contract (if applicable) */}
                  {settlementSlipData.trip?.trip_mode === 'DIRECT_VEHICLE_HIRE' && (
                    <div className={`p-4 rounded-xl border ${
                      isDark ? 'bg-purple-950/20 border-purple-800/40' : 'bg-purple-50/70 border-purple-200'
                    }`}>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-500/20">
                        <span className="text-[11px] font-black uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Customer Placement Commercials</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          Status: {settlementSlipData.trip?.billing_status || 'UNBILLED'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Hiring Client</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {settlementSlipData.trip?.customer?.name || settlementSlipData.trip?.hiring_party_name || 'Direct Client'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Agreed Freight</span>
                          <span className="font-bold text-purple-700 dark:text-purple-300 font-mono">
                            ₹{parseFloat(settlementSlipData.trip?.contract_amount || settlementSlipData.trip?.expected_revenue || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Advance from Party</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹{parseFloat(settlementSlipData.trip?.advance_received || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Receivable Balance</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                            ₹{Math.max(0, parseFloat(settlementSlipData.trip?.contract_amount || settlementSlipData.trip?.expected_revenue || 0) - parseFloat(settlementSlipData.trip?.advance_received || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial Settlement Ledger Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Trip Reconciliation Ledger</span>
                      <span className="text-[10px] font-normal normal-case text-slate-400">Amounts in INR (₹)</span>
                    </h4>

                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className={`border-b ${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                          <tr>
                            <th className="py-2.5 px-3 font-bold">Ledger Head / Particulars</th>
                            <th className="py-2.5 px-3 font-bold">Description / Notes</th>
                            <th className="py-2.5 px-3 font-bold text-right">Debit (-)</th>
                            <th className="py-2.5 px-3 font-bold text-right">Credit (+)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {/* Disbursed Driver Advance */}
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              Disbursed Cash Advance
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              Disbursed at origin branch before dispatch
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{parseFloat(settlementSlipData.settlement?.total_advance || settlementSlipData.trip?.driver_advance || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>

                          {/* Highway Expenses */}
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              Highway Bills & Expenses
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              Diesel, toll, hamali, maintenance vouchers ({settlementSlipData.expensesList?.length || 0} slips)
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              ₹{parseFloat(settlementSlipData.settlement?.total_expenses || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                          </tr>

                          {/* Driver Bhatta / Allowance */}
                          {(settlementSlipData.driverAllowance > 0 || settlementSlipData.settlement?.driver_allowance > 0) && (
                            <tr>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                Driver Bhatta (Daily Allowance)
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                Food & journey allowance payable to driver
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                                ₹{parseFloat(settlementSlipData.driverAllowance || settlementSlipData.settlement?.driver_allowance || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                            </tr>
                          )}

                          {/* Vehicle Hire Charge (For Market Trucks) */}
                          {(settlementSlipData.vehicleCharge > 0 || settlementSlipData.settlement?.vehicle_charge > 0) && (
                            <tr>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                Agreed Market Vehicle Charge
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                Agreed freight payable to market truck supplier
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                ₹{parseFloat(settlementSlipData.vehicleCharge || settlementSlipData.settlement?.vehicle_charge || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className={`border-t-2 ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                          <tr>
                            <td colSpan={2} className="py-3 px-3 font-black text-slate-900 dark:text-white uppercase">
                              Final Reconciled Settlement Position
                            </td>
                            <td colSpan={2} className="py-3 px-3 text-right">
                              {(() => {
                                const st = settlementSlipData.settlement?.settlement_type;
                                const bal = parseFloat(settlementSlipData.settlement?.balance_payable_or_receivable || 0);
                                if (st === 'PAYABLE_TO_DRIVER') {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">
                                        Company to Pay Driver
                                      </span>
                                      <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                        ₹{bal.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  );
                                }
                                if (st === 'REFUND_FROM_DRIVER') {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">
                                        Driver Refund to Company
                                      </span>
                                      <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                                        ₹{bal.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  );
                                }
                                if (st === 'PAYABLE_TO_VENDOR') {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">
                                        Pay to Market Vendor
                                      </span>
                                      <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                        ₹{bal.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  );
                                }
                                if (st === 'RECOVER_FROM_VENDOR') {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">
                                        Recover from Market Vendor
                                      </span>
                                      <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                                        ₹{bal.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider">
                                      Reconciled Position
                                    </span>
                                    <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                                      ₹0 (Balanced)
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Itemized Highway Slips Breakdown */}
                  {settlementSlipData.expensesList && settlementSlipData.expensesList.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Itemized Expense Vouchers & Fuel Slips ({settlementSlipData.expensesList.length})
                      </h4>
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                        <table className="w-full text-left">
                          <thead className={`border-b ${isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <tr>
                              <th className="py-1.5 px-3 font-semibold">#</th>
                              <th className="py-1.5 px-3 font-semibold">Category</th>
                              <th className="py-1.5 px-3 font-semibold">Voucher / Slip Details</th>
                              <th className="py-1.5 px-3 font-semibold">Paid Via</th>
                              <th className="py-1.5 px-3 font-semibold text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {settlementSlipData.expensesList.map((exp, idx) => (
                              <tr key={exp.id || idx}>
                                <td className="py-1.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200">{getExpenseCategoryName(exp)}</td>
                                <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                                  {exp.remarks || '-'}
                                </td>
                                <td className="py-1.5 px-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {exp.payment_method || 'CASH'}
                                  </span>
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Reconciliation Notes */}
                  {settlementSlipData.remarks && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Debrief Closing Remarks:</span>
                      <p className="text-slate-600 dark:text-slate-400 italic">"{settlementSlipData.remarks}"</p>
                    </div>
                  )}

                  {/* Sign-off & Audit Verification Section */}
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
                    <div className="space-y-6">
                      <div className="border-b border-dashed border-slate-400 dark:border-slate-600 h-8 mx-6" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Driver Verification Signature</p>
                        <p className="text-[10px] text-slate-400">{settlementSlipData.trip?.driver?.name || 'Driver'}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="border-b border-dashed border-slate-400 dark:border-slate-600 h-8 mx-6" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Branch Manager / Settlement Officer</p>
                        <p className="text-[10px] text-slate-400">Seal & Official Authorization</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    System-generated settlement audit slip from TransHub Logistics ERP • All highway vouchers and cash debrief verified.
                  </p>
                </div>

                {/* Slip Modal Action Footer (Screen only, hidden when printing) */}
                <div className={`p-4 px-6 border-t flex items-center justify-between gap-3 shrink-0 print:hidden ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <button
                    type="button"
                    onClick={() => setShowSettlementSlip(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Close Slip
                  </button>

                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-500" />
                      <span>Print Slip / PDF</span>
                    </button>

                    {!settlementSlipData.isFinal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettlementSlip(false);
                          if (selectedTrip) {
                            handleSettle(selectedTrip.id);
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Settle Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Quick Assign Vehicle Modal */}
          <Modal isOpen={Boolean(isAssignVehicleOpen && tripToAssign)} onClose={() => setIsAssignVehicleOpen(false)}>
            {isAssignVehicleOpen && tripToAssign && (
              <div
                className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black">Assign Vehicle</h3>
                        {renderLoadTypeBadge(tripToAssign, { size: 'xs' })}
                      </div>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Trip #{tripToAssign.trip_number}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAssignVehicleOpen(false)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleConfirmAssignVehicle} className="p-6 space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Select Vehicle <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <select
                      required
                      value={assignVehicleId}
                      onChange={(e) => setAssignVehicleId(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">-- Choose Vehicle --</option>
                      {vehiclesList.map((v) => {
                        const isInactive = v.status === 'INACTIVE';
                        const isAvail = v.status === 'AVAILABLE';
                        return (
                          <option key={v.id} value={v.id} disabled={isInactive}>
                            {v.vehicle_number} — {v.vehicle_type} ({v.capacity_ton}T) {isInactive ? '❌ [INACTIVE]' : isAvail ? '✅ [In Yard]' : `[${v.status}]`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Assign Driver (Optional)
                    </label>
                    <select
                      value={assignDriverId}
                      onChange={(e) => setAssignDriverId(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Keep current driver</option>
                      {driversList
                        .filter((d) => {
                          const originId = tripToAssign?.origin_branch_id || tripToAssign?.originBranch?.id || tripToAssign?.origin_branch?.id;
                          if (!d.branch_id) return true;
                          return originId ? d.branch_id === originId : true;
                        })
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.phone ? `(${d.phone})` : ''} {d.branch?.branch_name ? `• [${d.branch.branch_name}]` : '• [Yard]'}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800/40">
                    <button
                      type="button"
                      onClick={() => setIsAssignVehicleOpen(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                    >
                      {isSubmitting ? 'Assigning...' : 'Assign Vehicle'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* Quick Disburse Driver Advance & Log Trip Expense Modal */}
          <Modal isOpen={Boolean(advExpModalOpen && advExpTrip)} onClose={() => setAdvExpModalOpen(false)}>
            {advExpModalOpen && advExpTrip && (
              <div
                className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Modal Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black tracking-tight">Driver Advance & Trip Expenses</h2>
                        {renderLoadTypeBadge(advExpTrip, { size: 'xs' })}
                      </div>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Trip #{advExpTrip.trip_number} • {advExpTrip.origin_city || advExpTrip.originBranch?.city || 'Origin'} → {advExpTrip.destination_city || advExpTrip.destBranch?.city || 'Dest'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAdvExpModalOpen(false)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Trip Financial Snapshot Banner */}
                <div className={`px-6 py-3 border-b grid grid-cols-2 gap-3 text-xs ${
                  isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Driver:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {advExpTrip.driver?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-cyan-400 truncate">
                      {advExpTrip.vehicle?.vehicle_number || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Current Advance:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{parseFloat(advExpTrip.driver_advance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Total Expenses:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                      ₹{parseFloat(advExpTrip.total_expenses || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Action Mode Toggle Pills */}
                <div className="px-6 pt-4">
                  <div className={`flex rounded-xl p-1 border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setAdvExpType('EXPENSE')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        advExpType === 'EXPENSE'
                          ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm')
                          : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Log Trip Expense (Fuel/Toll)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvExpType('ADVANCE')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        advExpType === 'ADVANCE'
                          ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm')
                          : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Disburse Driver Advance
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmitAdvExp} className="p-6 space-y-4">
                  {advExpError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{advExpError}</span>
                    </div>
                  )}

                  {advExpType === 'ADVANCE' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Disbursed Amount (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              required
                              min="1"
                              value={advAmount}
                              onChange={(e) => setAdvAmount(e.target.value)}
                              placeholder="e.g. 2000"
                              className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Disbursal Mode
                          </label>
                          <select
                            value={advMode}
                            onChange={(e) => setAdvMode(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="CASH">Cash in Hand</option>
                            <option value="UPI">UPI / Digital (GPay/PhonePe)</option>
                            <option value="FUEL_CARD">Fuel Card (Diesel)</option>
                            <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Advance Remarks / Voucher Note
                        </label>
                        <input
                          type="text"
                          value={advRemarks}
                          onChange={(e) => setAdvRemarks(e.target.value)}
                          placeholder="e.g. Handed over cash advance at hub before departure"
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Expense Category <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <select
                            value={expCategory}
                            onChange={(e) => setExpCategory(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="Fuel & Diesel">Fuel & Diesel</option>
                            <option value="Toll & Fastag">Toll & FASTag</option>
                            <option value="Driver Daily Allowance">Driver Daily Allowance / Bhatta</option>
                            <option value="Loading & Hamali">Loading & Hamali</option>
                            <option value="Unloading Charges">Unloading Charges</option>
                            <option value="Vehicle Maintenance & Spares">Vehicle Maintenance & Spares</option>
                            <option value="Police / RTO / Challan">Police / RTO / Challan</option>
                            <option value="Tyre & Punctures">Tyre & Punctures</option>
                            <option value="Miscellaneous">Miscellaneous</option>
                          </select>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Expense Amount (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              required
                              min="1"
                              value={expAmount}
                              onChange={(e) => setExpAmount(e.target.value)}
                              placeholder="e.g. 1500"
                              className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Payment Method
                          </label>
                          <select
                            value={expPaymentMethod}
                            onChange={(e) => setExpPaymentMethod(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="CASH">Cash</option>
                            <option value="FUEL_CARD">Fuel Card</option>
                            <option value="FASTAG">FASTag / RFID</option>
                            <option value="UPI">UPI / Digital</option>
                            <option value="COMPANY_CARD">Company Card</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                          </select>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Expense Description
                          </label>
                          <input
                            type="text"
                            value={expRemarks}
                            onChange={(e) => setExpRemarks(e.target.value)}
                            placeholder="e.g. Toll plaza receipt #8291"
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className={`flex items-center justify-end space-x-2.5 pt-3 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setAdvExpModalOpen(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAdvExp}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-2"
                    >
                      {submittingAdvExp ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : advExpType === 'ADVANCE' ? (
                        <span>Disburse Advance</span>
                      ) : (
                        <span>Save Expense</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* Inbound Gate-In Record Arrival Modal */}
          <Modal
            isOpen={Boolean(recordArrivalModalOpen && arrivalTrip)}
            onClose={() => {
              if (!submittingArrival) {
                setRecordArrivalModalOpen(false);
                setArrivalTrip(null);
              }
            }}
          >
            {recordArrivalModalOpen && arrivalTrip && (
              <div className={`relative w-full max-w-xl max-h-[90vh] my-auto rounded-3xl shadow-2xl flex flex-col z-10 border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                isDark ? 'bg-[#0B1120] border-slate-800 text-white shadow-cyan-950/40' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/80'
              }`}>
                {/* Modal Header (Sticky) */}
                <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Vehicle Arrival & Gate-In
                        </h3>
                        {renderLoadTypeBadge(arrivalTrip, { size: 'xs' })}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Trip #{arrivalTrip.trip_number} • {arrivalTrip.originBranch?.city || arrivalTrip.origin_city} → {arrivalTrip.destBranch?.city || arrivalTrip.destination_city}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordArrivalModalOpen(false);
                      setArrivalTrip(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form with Scrollable Content Body and Sticky Footer */}
                <form onSubmit={handleSubmitRecordArrival} className="flex flex-col flex-1 overflow-hidden">
                  {/* Scrollable Form Body */}
                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 max-h-[calc(90vh-140px)]">
                  {/* Origin Dispatched Context Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Plate</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {arrivalTrip.vehicle?.vehicle_number || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Departure Odo</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {arrivalTrip.start_odometer || 0} KM
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Dispatched Seal</span>
                      <p className="font-mono font-bold text-indigo-600 dark:text-cyan-400 mt-0.5 truncate">
                        {arrivalTrip.dispatches?.[0]?.seal_number || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {arrivalError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{arrivalError}</span>
                    </div>
                  )}

                  {/* 1. Physical Seal Verification */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Physical Transit Seal on Arrival <span className="text-red-500 font-bold ml-0.5">*</span></span>
                      </label>
                      {arrivalTrip.dispatches?.[0]?.seal_number && (
                        <button
                          type="button"
                          onClick={() => {
                            setArrivalPhysicalSeal(arrivalTrip.dispatches[0].seal_number);
                            setArrivalSealStatus('INTACT');
                          }}
                          className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                        >
                          Match Origin Seal
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      value={arrivalPhysicalSeal}
                      onChange={(e) => setArrivalPhysicalSeal(e.target.value)}
                      placeholder="Enter seal number observed on vehicle door..."
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Seal Status Radio Selector */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { value: 'INTACT', label: 'Seal Intact', icon: ShieldCheck, color: 'emerald' },
                        { value: 'MISMATCH', label: 'Seal Mismatch', icon: ShieldAlert, color: 'rose' },
                        { value: 'BROKEN', label: 'Seal Broken', icon: AlertTriangle, color: 'amber' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setArrivalSealStatus(opt.value)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            arrivalSealStatus === opt.value
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <opt.icon className="w-3 h-3" />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Discrepancy & Reason Section (Opens when Mismatch or Broken is selected) */}
                    {arrivalSealStatus !== 'INTACT' && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              {arrivalSealStatus === 'BROKEN' ? 'Seal Broken Incident Report' : 'Seal Mismatch Discrepancy Report'}
                            </h4>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                              Mandatory security record: explain why container seal does not match origin manifest.
                            </p>
                          </div>
                        </div>

                        {/* Quick Category Selector */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Incident Category / Cause <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <select
                            value={arrivalDiscrepancyCategory}
                            onChange={(e) => setArrivalDiscrepancyCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="RTO / Police Highway Inspection (Memo Checked)">RTO / Police Highway Inspection (Memo Checked)</option>
                            <option value="Accidental Breakage / Transit Impact">Accidental Breakage / Transit Impact</option>
                            <option value="Toll Plaza / Border Barrier Clearance">Toll Plaza / Border Barrier Clearance</option>
                            <option value="Wrong Seal Tag Number Applied at Origin Hub">Wrong Seal Tag Number Applied at Origin Hub</option>
                            <option value="Commercial Tax / GST Flying Squad Checking">Commercial Tax / GST Flying Squad Checking</option>
                            <option value="Driver Tampering / Theft Suspicion">Driver Tampering / Theft Suspicion</option>
                            <option value="Other Highway Incident">Other Highway Incident</option>
                          </select>
                        </div>

                        {/* Official Memo / Challan / Slip Ref */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>Inspection Memo / Challan # (Optional)</span>
                            <span className="text-[10px] text-slate-400">E.g. RTO-KA-2026-918</span>
                          </label>
                          <input
                            type="text"
                            value={arrivalMemoNumber}
                            onChange={(e) => setArrivalMemoNumber(e.target.value)}
                            placeholder="Enter memo, challan, or receipt number if provided by driver..."
                            className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        {/* Detailed Reason Notes */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Discrepancy Explanation & Driver Statement <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <textarea
                            required
                            rows={2}
                            value={arrivalDiscrepancyReason}
                            onChange={(e) => setArrivalDiscrepancyReason(e.target.value)}
                            placeholder="Explain what the driver stated or why the seal was broken/replaced..."
                            className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                          />
                        </div>

                        <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Standard Transporter Protocol: Flagged for 100% docket tally inspection at the receiving bay.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Arrival Odometer */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Arrival End Odometer (KM) <span className="text-red-500 font-bold ml-0.5">*</span></span>
                      </span>
                      {arrivalOdometerInput && parseInt(arrivalOdometerInput, 10) >= (arrivalTrip.start_odometer || 0) && (
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                          +{parseInt(arrivalOdometerInput, 10) - (arrivalTrip.start_odometer || 0)} KM Run
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={arrivalTrip.start_odometer || 0}
                        value={arrivalOdometerInput}
                        onChange={(e) => setArrivalOdometerInput(e.target.value)}
                        placeholder={`Min ${arrivalTrip.start_odometer || 0} KM`}
                        className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3.5 top-2 text-xs font-bold text-slate-400">
                        KM
                      </span>
                    </div>
                  </div>

                  {/* 3. Dock Bay & Notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Unloading Bay / Dock #
                      </label>
                      <input
                        type="text"
                        value={arrivalDockBay}
                        onChange={(e) => setArrivalDockBay(e.target.value)}
                        placeholder="Bay 1"
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Gate Entry Remarks
                      </label>
                      <input
                        type="text"
                        value={arrivalRemarks}
                        onChange={(e) => setArrivalRemarks(e.target.value)}
                        placeholder="Driver debrief notes..."
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Sticky Footer */}
                  <div className={`p-4 px-6 border-t flex items-center justify-end space-x-2.5 shrink-0 ${
                    isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordArrivalModalOpen(false);
                        setArrivalTrip(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingArrival}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {submittingArrival ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Saving Arrival...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Arrival & Gate-In</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* FTL Direct Delivery Modal */}
          <Modal
            isOpen={Boolean(ftlDeliveryModalOpen && ftlDeliveryTrip)}
            onClose={() => {
              if (!submittingFtlDelivery) {
                setFtlDeliveryModalOpen(false);
                setFtlDeliveryTrip(null);
              }
            }}
          >
            {ftlDeliveryModalOpen && ftlDeliveryTrip && (
              <div className={`relative w-full max-w-2xl max-h-[90vh] my-auto rounded-3xl shadow-2xl flex flex-col z-10 border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                isDark ? 'bg-[#0B1120] border-slate-800 text-white shadow-purple-950/40' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/80'
              }`}>
                {/* Modal Header */}
                <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Record Placement Delivery & Handover' : 'Record FTL Direct Delivery & POD'}
                        </h3>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          {ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'VEHICLE PLACEMENT' : 'FTL DEDICATED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Trip #{ftlDeliveryTrip.trip_number} • {ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Direct Client Site Placement & Completion' : 'Direct Client Site Delivery & Handover'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFtlDeliveryModalOpen(false);
                      setFtlDeliveryTrip(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form with Scrollable Content */}
                <form onSubmit={handleSubmitFtlDelivery} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 max-h-[calc(90vh-140px)]">
                    {/* FTL Trip & Route Context */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Truck</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                          {ftlDeliveryTrip.vehicle?.vehicle_number || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Driver</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                          {ftlDeliveryTrip.driver?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Destination</span>
                        <p className="font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                          {ftlDeliveryTrip.destination_city || ftlDeliveryTrip.destBranch?.city || 'Party Site'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo Weight</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                          {ftlDeliveryTrip.total_weight ? `${Number(ftlDeliveryTrip.total_weight).toLocaleString()} KG` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Placement Type' : 'Dispatched Seal'}
                        </span>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono truncate" title={ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Dedicated Vehicle Placement' : (ftlDeliveryTrip.dispatches?.[0]?.seal_number || ftlDeliveryTrip.seal_number || 'None')}>
                          {ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Dedicated FTL' : (ftlDeliveryTrip.dispatches?.[0]?.seal_number || ftlDeliveryTrip.seal_number || 'N/A')}
                        </p>
                      </div>
                    </div>

                    {/* Error display */}
                    {ftlDeliveryError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{ftlDeliveryError}</span>
                      </div>
                    )}

                    {/* Direct Placement Contract Context */}
                    {ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' && (
                      <div className={`p-3.5 rounded-2xl border ${
                        isDark ? 'bg-purple-950/25 border-purple-800/60' : 'bg-purple-50/80 border-purple-200'
                      }`}>
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-purple-500/20">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dedicated Vehicle Placement Contract</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            Contract Rate: ₹{(parseFloat(ftlDeliveryTrip.contract_amount || ftlDeliveryTrip.expected_revenue || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Hiring Party</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                              {ftlDeliveryTrip.customer?.name || ftlDeliveryTrip.hiring_party_name || 'Direct Client'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Party Ref / Docket</span>
                            <p className="font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                              {ftlDeliveryTrip.party_ref_number || 'None'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">e-Way Bill #</span>
                            <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                              {ftlDeliveryTrip.eway_bill_no || 'None'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Goods</span>
                            <p className="font-medium text-slate-900 dark:text-white mt-0.5 truncate">
                              {ftlDeliveryTrip.goods_description || 'General Cargo'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 1. CONTAINER SEAL VERIFICATION & TRUCK INSPECTION (Only for Standard Freight / Dispatches, NOT for Vehicle Placement) */}
                    {ftlDeliveryTrip.trip_mode !== 'DIRECT_VEHICLE_HIRE' && (
                      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>1. Container Seal Verification on Arrival <span className="text-red-500 font-bold ml-0.5">*</span></span>
                          </label>
                          {(ftlDeliveryTrip.dispatches?.[0]?.seal_number || ftlDeliveryTrip.seal_number) && (
                            <button
                              type="button"
                              onClick={() => {
                                const seal = ftlDeliveryTrip.dispatches?.[0]?.seal_number || ftlDeliveryTrip.seal_number;
                                setFtlPhysicalSeal(seal);
                                setFtlSealStatus('INTACT');
                              }}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Match Origin Seal
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Physical Seal Number Observed <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            required={ftlDeliveryTrip.trip_mode !== 'DIRECT_VEHICLE_HIRE'}
                            value={ftlPhysicalSeal}
                            onChange={(e) => setFtlPhysicalSeal(e.target.value)}
                            placeholder="Enter seal number observed on vehicle door..."
                            className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        {/* Seal Status Radio Selector */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { value: 'INTACT', label: 'Seal Intact', icon: ShieldCheck, color: 'emerald' },
                            { value: 'MISMATCH', label: 'Seal Mismatch', icon: ShieldAlert, color: 'rose' },
                            { value: 'BROKEN', label: 'Seal Broken', icon: AlertTriangle, color: 'amber' },
                            { value: 'NO_SEAL', label: 'No Seal / Open', icon: Lock, color: 'slate' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setFtlSealStatus(opt.value)}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                ftlSealStatus === opt.value
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <opt.icon className="w-3 h-3" />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Discrepancy & Reason Section (Opens when Mismatch or Broken is selected) */}
                        {ftlSealStatus !== 'INTACT' && ftlSealStatus !== 'NO_SEAL' && (
                          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <div>
                                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                  {ftlSealStatus === 'BROKEN' ? 'Seal Broken Incident Report' : 'Seal Mismatch Discrepancy Report'}
                                </h4>
                                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                  Explain why container seal does not match dispatch manifest.
                                </p>
                              </div>
                            </div>

                            {/* Quick Category Selector */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                Incident Category / Cause <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <select
                                value={ftlDiscrepancyCategory}
                                onChange={(e) => setFtlDiscrepancyCategory(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="RTO / Police Highway Inspection (Memo Checked)">RTO / Police Highway Inspection (Memo Checked)</option>
                                <option value="Accidental Breakage / Transit Impact">Accidental Breakage / Transit Impact</option>
                                <option value="Toll Plaza / Border Barrier Clearance">Toll Plaza / Border Barrier Clearance</option>
                                <option value="Wrong Seal Tag Number Applied at Origin Hub">Wrong Seal Tag Number Applied at Origin Hub</option>
                                <option value="Commercial Tax / GST Flying Squad Checking">Commercial Tax / GST Flying Squad Checking</option>
                                <option value="Driver Tampering / Theft Suspicion">Driver Tampering / Theft Suspicion</option>
                                <option value="Other Highway Incident">Other Highway Incident</option>
                              </select>
                            </div>

                            {/* Official Memo / Challan / Slip Ref */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>Inspection Memo / Challan # (Optional)</span>
                                <span className="text-[9px] text-slate-400">E.g. RTO-KA-2026-918</span>
                              </label>
                              <input
                                type="text"
                                value={ftlMemoNumber}
                                onChange={(e) => setFtlMemoNumber(e.target.value)}
                                placeholder="Enter memo or receipt number..."
                                className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            {/* Detailed Reason Notes */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                Discrepancy Explanation & Driver Statement <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <textarea
                                rows={2}
                                value={ftlDiscrepancyReason}
                                onChange={(e) => setFtlDiscrepancyReason(e.target.value)}
                                placeholder="Driver explanation on how and where seal was broken..."
                                className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        )}

                        {/* Cargo Condition Selector */}
                        <div className="space-y-1 pt-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            Truck Cargo Physical Condition
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'INTACT', label: '100% Intact & Sound' },
                              { value: 'MINOR_DAMAGE', label: 'Minor Scratches / Dents' },
                              { value: 'SEVERE_DAMAGE', label: 'Damage / Shortage' },
                            ].map((cond) => (
                              <button
                                key={cond.value}
                                type="button"
                                onClick={() => setFtlCargoCondition(cond.value)}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                                  ftlCargoCondition === cond.value
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-400 font-black'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {cond.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RECEIVER PERSON DETAILS */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <span>{ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? '1' : '2'}. Consignee / Receiver Person Details <span className="text-red-500 font-bold ml-0.5">*</span></span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Received By (Name) <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={ftlReceiverName}
                            onChange={(e) => setFtlReceiverName(e.target.value)}
                            placeholder="e.g. Ramesh Kumar (Store In-charge)"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              Receiver Contact Phone <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                            </label>
                            <span className={`text-[10px] font-mono font-bold ${
                              ftlReceiverPhone.length === 10
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : ftlReceiverPhone.length > 0
                                ? 'text-amber-500'
                                : 'text-slate-400'
                            }`}>
                              {ftlReceiverPhone.length}/10 digits
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono">
                              +91
                            </span>
                            <input
                              type="tel"
                              maxLength={10}
                              value={ftlReceiverPhone}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setFtlReceiverPhone(digits);
                              }}
                              placeholder="9876543210"
                              className={`w-full pl-10 pr-3 py-2 rounded-xl border text-xs font-mono transition-colors focus:outline-hidden focus:ring-2 ${
                                ftlReceiverPhone.length === 10
                                  ? 'border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-emerald-500'
                                  : ftlReceiverPhone.length > 0
                                  ? 'border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-amber-500'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-purple-500'
                              }`}
                            />
                          </div>
                          {ftlReceiverPhone.length > 0 && ftlReceiverPhone.length < 10 && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                              Phone number must be exactly 10 digits ({10 - ftlReceiverPhone.length} more needed).
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4. PROOF OF DELIVERY (POD) & DOCUMENT UPLOAD */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? '2' : '3'}. Proof of Delivery (POD) Documentation</span>
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Camera / Upload supported (Max 1 MB)
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Document Type <span className="text-red-500 font-bold ml-0.5">*</span>
                        </label>
                        <select
                          value={ftlPodDocType}
                          onChange={(e) => setFtlPodDocType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="SIGNED_BILTY">Signed Bilty / POD (Consignee Copy)</option>
                          <option value="CUSTOMER_STAMP">Customer Stamped Invoice / Challan</option>
                          <option value="DELIVERY_CHALLAN">Consignee Delivery Challan</option>
                          <option value="WEIGHBRIDGE_SLIP">Factory Weighbridge Slip</option>
                          <option value="GATE_PASS">Gate Security Pass Stamp</option>
                        </select>
                      </div>

                      {/* Hidden File Input for POD upload */}
                      <input
                        type="file"
                        ref={ftlPodFileInputRef}
                        onChange={handleFtlPodFileSelect}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />

                      {/* Attached File Preview or Camera/Upload Actions */}
                      {ftlPodFileUrl ? (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                          isDark ? 'bg-slate-900 border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-500/30'
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isPodImage(ftlPodFileUrl) ? (
                              <img
                                src={ftlPodFileUrl}
                                alt="POD Preview"
                                className="w-10 h-10 rounded-lg object-cover border border-emerald-500/40 shrink-0 cursor-pointer"
                                onClick={() => openBlobInNewTab(ftlPodFileUrl)}
                                title="Click to view full image"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate text-emerald-700 dark:text-emerald-400">
                                {ftlPodFileName || 'Signed_POD_Document.jpg'}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {ftlPodFileSize || 'Attached Document'} • Ready for DB Storage
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openBlobInNewTab(ftlPodFileUrl)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="View Document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => ftlPodFileInputRef.current?.click()}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFtlPodFileUrl('');
                                setFtlPodFileName('');
                                setFtlPodFileSize('');
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => setFtlCameraModalOpen(true)}
                            className={`p-3 rounded-2xl border-2 border-dashed flex items-center gap-3 text-left transition-all cursor-pointer ${
                              isDark
                                ? 'border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300'
                                : 'border-purple-300 bg-purple-50/60 hover:bg-purple-100/60 text-purple-700'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                              <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight">Take Photo</p>
                              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Use Device Camera</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => ftlPodFileInputRef.current?.click()}
                            disabled={ftlPodUploading}
                            className={`p-3 rounded-2xl border-2 border-dashed flex items-center gap-3 text-left transition-all cursor-pointer ${
                              isDark
                                ? 'border-slate-700 hover:border-slate-600 bg-slate-800/40 text-slate-300'
                                : 'border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              {ftlPodUploading ? (
                                <RotateCw className="w-5 h-5 text-slate-500 animate-spin" />
                              ) : (
                                <UploadCloud className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight">
                                {ftlPodUploading ? 'Compressing...' : 'Upload File'}
                              </p>
                              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Image or PDF (Max 1MB)</p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* FINAL ODOMETER & MILEAGE (Before Delivery Remarks) */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-purple-500" />
                          <span>{ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? '3' : '4'}. Final Odometer Reading (KM) <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Optional)</span></span>
                        </label>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Departure: {ftlDeliveryTrip.start_odometer ? `${ftlDeliveryTrip.start_odometer} KM` : '0 KM'}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={ftlEndOdo}
                        onChange={(e) => setFtlEndOdo(e.target.value)}
                        placeholder="Enter vehicle final odometer (optional)..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                      {ftlEndOdo && Number(ftlEndOdo) >= (Number(ftlDeliveryTrip.start_odometer) || 0) && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          ✓ Trip Distance: {(Number(ftlEndOdo) - (Number(ftlDeliveryTrip.start_odometer) || 0)).toLocaleString()} KM
                        </p>
                      )}
                    </div>

                    {/* 5. DELIVERY REMARKS */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? '4' : '5'}. Delivery Remarks & Debrief Notes <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={ftlRemarks}
                        onChange={(e) => setFtlRemarks(e.target.value)}
                        placeholder="e.g. Full load delivered safely. Unloaded at client factory warehouse bay."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Sticky Footer */}
                  <div className={`p-4 border-t flex items-center justify-end gap-3 shrink-0 ${
                    isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setFtlDeliveryModalOpen(false);
                        setFtlDeliveryTrip(null);
                      }}
                      disabled={submittingFtlDelivery}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingFtlDelivery}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {submittingFtlDelivery && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{ftlDeliveryTrip.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Confirm & Complete Placement ➔' : 'Confirm & Complete FTL Delivery ➔'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* FTL CAMERA CAPTURE MODAL */}
          <CameraCaptureModal
            isOpen={ftlCameraModalOpen}
            onClose={() => setFtlCameraModalOpen(false)}
            onCapture={(base64Data, sizeKb) => handleFtlCameraCaptured(base64Data, sizeKb)}
            onFallbackUpload={() => {
              setFtlCameraModalOpen(false);
              ftlPodFileInputRef.current?.click();
            }}
            title="Capture FTL Delivery POD Document"
          />

          {/* DEDICATED VEHICLE PLACEMENT (DIRECT CONTRACT FTL) 3-STEP MODAL */}
          <Modal isOpen={isDirectHireModalOpen} onClose={() => setIsDirectHireModalOpen(false)}>
            <div
              className={`w-full max-w-4xl max-h-[92vh] my-auto flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div
                className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
                  isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black tracking-tight">Vehicle Placement</h3>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        FTL Contract
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Dedicated truck placement with agreed freight
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDirectHireModalOpen(false)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3-Step Wizard Progress Stepper Bar */}
              <div
                className={`px-6 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
                  isDark ? 'border-slate-800 bg-[#090E1B]' : 'border-slate-100 bg-slate-50/90'
                }`}
              >
                {/* Step 1 Tab Button */}
                <button
                  type="button"
                  onClick={() => setDirectHireStep(1)}
                  className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    directHireStep === 1
                      ? 'text-indigo-600 dark:text-indigo-400 font-black'
                      : directHireStep > 1
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      directHireStep === 1
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                        : directHireStep > 1
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {directHireStep > 1 ? '✓' : '1'}
                  </span>
                  <span>Party & Route</span>
                </button>

                {/* Connector 1 */}
                <div
                  className={`flex-1 h-0.5 rounded-full transition-all ${
                    directHireStep > 1 ? 'bg-emerald-500' : isDark ? 'bg-slate-800' : 'bg-slate-200'
                  }`}
                />

                {/* Step 2 Tab Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      directHireStep > 2 ||
                      (directHireForm.destination_city &&
                        (directHireForm.customer_id || directHireForm.hiring_party_name))
                    ) {
                      setDirectHireStep(2);
                    }
                  }}
                  className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    directHireStep === 2
                      ? 'text-indigo-600 dark:text-indigo-400 font-black'
                      : directHireStep > 2
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      directHireStep === 2
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                        : directHireStep > 2
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {directHireStep > 2 ? '✓' : '2'}
                  </span>
                  <span>Vehicle & Crew</span>
                </button>

                {/* Connector 2 */}
                <div
                  className={`flex-1 h-0.5 rounded-full transition-all ${
                    directHireStep > 2 ? 'bg-emerald-500' : isDark ? 'bg-slate-800' : 'bg-slate-200'
                  }`}
                />

                {/* Step 3 Tab Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (directHireForm.vehicle_id && directHireForm.driver_id) {
                      setDirectHireStep(3);
                    }
                  }}
                  className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    directHireStep === 3
                      ? 'text-indigo-600 dark:text-indigo-400 font-black'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      directHireStep === 3
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    3
                  </span>
                  <span>Commercials</span>
                </button>
              </div>

              {/* Wizard Content */}
              <form onSubmit={handleCreateDirectHire} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto min-h-[360px] max-h-[calc(92vh-175px)]">
                  {directHireError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{directHireError}</span>
                    </div>
                  )}

                  {/* ================= STEP 1: HIRING PARTY & ROUTE ================= */}
                  {directHireStep === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Step 1 of 3: Hiring Client & Journey Route
                        </span>
                        <span className="text-[10px] text-indigo-500 font-medium font-mono">
                          Client / Transporter Info
                        </span>
                      </div>

                      {/* 1. Hiring Party Card */}
                      <div
                        className={`p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>Hiring Party (Who hired the truck?)</span>
                          </label>
                          <div className="inline-flex p-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold">
                            <button
                              type="button"
                              onClick={() =>
                                setDirectHireForm((prev) => ({ ...prev, hiring_party_mode: 'CUSTOMER' }))
                              }
                              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                directHireForm.hiring_party_mode === 'CUSTOMER'
                                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
                              }`}
                            >
                              Registered Customer
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDirectHireForm((prev) => ({
                                  ...prev,
                                  hiring_party_mode: 'DIRECT_PARTY',
                                  customer_id: '',
                                }))
                              }
                              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                directHireForm.hiring_party_mode === 'DIRECT_PARTY'
                                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
                              }`}
                            >
                              Other Transporter / Direct Client
                            </button>
                          </div>
                        </div>

                        {directHireForm.hiring_party_mode === 'CUSTOMER' ? (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label
                                className={`block text-xs font-semibold ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                Select Client / Shipper <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {customersList.length} registered customer(s)
                              </span>
                            </div>
                            <ModalCustomSelect
                              isDark={isDark}
                              value={directHireForm.customer_id}
                              onChange={(cId, opt) => {
                                setDirectHireForm((prev) => ({
                                  ...prev,
                                  customer_id: cId,
                                  hiring_party_name:
                                    opt?.raw?.company_name || opt?.raw?.name || prev.hiring_party_name,
                                  hiring_party_phone: opt?.raw?.phone || prev.hiring_party_phone,
                                }));
                              }}
                              options={customersList.map((c) => ({
                                value: c.id,
                                label: c.company_name || c.name,
                                sublabel: `${c.phone ? `Phone: ${c.phone}` : ''} ${c.city ? `• ${c.city}` : ''} ${c.gstin ? `• GST: ${c.gstin}` : ''}`.trim(),
                                badge: c.city || 'Client',
                                raw: c,
                              }))}
                              placeholder="-- Choose Customer / Shipper from CRM --"
                              emptyText="No registered customers found in CRM database"
                              icon={Building2}
                              searchable={true}
                              searchPlaceholder="Search customer by name, phone or city..."
                              bottomAction={{
                                label: '+ Enter Direct Party Name & Phone Manually ➔',
                                icon: ArrowRight,
                                onClick: () =>
                                  setDirectHireForm((prev) => ({
                                    ...prev,
                                    hiring_party_mode: 'DIRECT_PARTY',
                                  })),
                              }}
                            />
                            {customersList.length === 0 && (
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 px-1">
                                <span>No saved customers in CRM database yet.</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDirectHireForm((prev) => ({
                                      ...prev,
                                      hiring_party_mode: 'DIRECT_PARTY',
                                    }))
                                  }
                                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <span>Type Party Name Manually ➔</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label
                                className={`block text-xs font-semibold mb-1 ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                Hiring Party / Company Name <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Associated Roadways / Regional Logistics / ABC Factory"
                                value={directHireForm.hiring_party_name}
                                onChange={(e) =>
                                  setDirectHireForm((prev) => ({ ...prev, hiring_party_name: e.target.value }))
                                }
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-hidden ${
                                  isDark
                                    ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                }`}
                              />
                            </div>
                            <div>
                              <label
                                className={`block text-xs font-semibold mb-1 ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                Party Contact Phone <span className="text-[10px] text-slate-400 font-normal">(Optional, 10 Digits)</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="tel"
                                  inputMode="numeric"
                                  pattern="[0-9]{10}"
                                  maxLength={10}
                                  placeholder="e.g. 9829012345"
                                  value={directHireForm.hiring_party_phone}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setDirectHireForm((prev) => ({ ...prev, hiring_party_phone: digits }));
                                  }}
                                  className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-xs font-mono font-semibold focus:outline-hidden transition-colors ${
                                    directHireForm.hiring_party_phone && directHireForm.hiring_party_phone.length < 10
                                      ? 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20'
                                      : directHireForm.hiring_party_phone.length === 10
                                      ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                                      : isDark
                                      ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                  } ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
                                />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                  {directHireForm.hiring_party_phone.length === 10 ? (
                                    <span className="text-emerald-500 text-xs font-bold font-mono">10/10 ✓</span>
                                  ) : directHireForm.hiring_party_phone.length > 0 ? (
                                    <span className="text-amber-500 text-[11px] font-mono font-semibold">
                                      {directHireForm.hiring_party_phone.length}/10
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="text-[10px] mt-1">
                                {directHireForm.hiring_party_phone && directHireForm.hiring_party_phone.length < 10 ? (
                                  <span className="text-amber-500 font-medium">
                                    Enter 10-digit number ({10 - directHireForm.hiring_party_phone.length} more digits needed)
                                  </span>
                                ) : directHireForm.hiring_party_phone.length === 10 ? (
                                  <span className="text-emerald-500 font-semibold">
                                    ✓ Valid 10-digit phone number
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Optional (strictly 10 digits if entered)</span>
                                )}
                              </div>
                            </div>
                            <div className="sm:col-span-2 flex items-center gap-2 pt-0.5">
                              <input
                                type="checkbox"
                                id="dh_auto_save_cust"
                                checked={directHireForm.auto_save_customer !== false}
                                onChange={(e) =>
                                  setDirectHireForm((prev) => ({ ...prev, auto_save_customer: e.target.checked }))
                                }
                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                              />
                              <label
                                htmlFor="dh_auto_save_cust"
                                className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none"
                              >
                                Auto-save to Saved Customers CRM for future billing
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Optional Reference Numbers & Goods */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Party Docket / Memo <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. DOC-99214"
                              value={directHireForm.party_ref_number}
                              onChange={(e) =>
                                setDirectHireForm((prev) => ({ ...prev, party_ref_number: e.target.value }))
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-hidden ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                              }`}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Leave blank if client has not given a docket</p>
                          </div>

                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Client E-Way Bill <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 121045981240"
                              value={directHireForm.eway_bill_no}
                              onChange={(e) =>
                                setDirectHireForm((prev) => ({ ...prev, eway_bill_no: e.target.value }))
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-hidden ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                              }`}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">For roadside RTO & GST transit check</p>
                          </div>

                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Goods Summary <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Steel Coils / 24 MT"
                              value={directHireForm.goods_description}
                              onChange={(e) =>
                                setDirectHireForm((prev) => ({ ...prev, goods_description: e.target.value }))
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-hidden ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                              }`}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Brief commodity description</p>
                          </div>
                        </div>
                      </div>

                      {/* 2. Route & Journey Card */}
                      <div
                        className={`p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Journey Route & Location</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Dispatching Hub / Branch
                            </label>
                            <div className="relative">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-500">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={
                                  (() => {
                                    const b = branchesList.find(
                                      (item) => item.id === (directHireForm.origin_branch_id || loginBranchId)
                                    ) || branchesList[0];
                                    if (b) {
                                      const code = b.branch_code ? `[${b.branch_code}] ` : '';
                                      return `${code}${b.branch_name || 'Head Office'}`;
                                    }
                                    return 'Head Office';
                                  })()
                                }
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-bold cursor-not-allowed select-none transition-all shadow-xs ${
                                  isDark
                                    ? 'bg-slate-900/90 border-slate-700 text-slate-200'
                                    : 'bg-slate-100/90 border-slate-200 text-slate-800'
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Origin Loading City <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Jaipur Yard"
                              value={directHireForm.origin_city}
                              onChange={(e) => setDirectHireForm((prev) => ({ ...prev, origin_city: e.target.value }))}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-hidden ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                              }`}
                            />
                          </div>

                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Destination Delivery Site / City <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Mumbai Nhava Sheva / Surat GIDC"
                              value={directHireForm.destination_city}
                              onChange={(e) =>
                                setDirectHireForm((prev) => ({ ...prev, destination_city: e.target.value }))
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-hidden ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= STEP 2: VEHICLE & DRIVER ALLOCATION ================= */}
                  {directHireStep === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Step Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Step 2 of 3: Fleet Vehicle & Driver Crew
                        </span>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-mono font-bold">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{directHireForm.origin_city || 'Origin'}</span>
                          <span>➔</span>
                          <span>{directHireForm.destination_city || 'Destination'}</span>
                        </div>
                      </div>

                      {/* Fleet Assignment Form */}
                      <div
                        className={`p-4 rounded-2xl border space-y-3.5 shadow-xs transition-all ${
                          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Truck className="w-4 h-4" />
                            <span>Vehicle & Driver Assignment</span>
                          </label>
                          <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-[11px] font-semibold gap-1">
                            <button
                              type="button"
                              onClick={() => setDirectHireForm((prev) => ({ ...prev, vehicle_mode: 'FLEET' }))}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                directHireForm.vehicle_mode !== 'CUSTOM'
                                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span>Fleet Yard ({vehiclesList.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDirectHireForm((prev) => ({ ...prev, vehicle_mode: 'CUSTOM' }))}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                directHireForm.vehicle_mode === 'CUSTOM'
                                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span>+ Market / Outside Truck</span>
                            </button>
                          </div>
                        </div>

                        {directHireForm.vehicle_mode !== 'CUSTOM' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 1. Assigned Truck */}
                            <div>
                              <label
                                className={`block text-xs font-semibold mb-1 ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                Assigned Truck / Vehicle <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <ModalCustomSelect
                                isDark={isDark}
                                value={directHireForm.vehicle_id}
                                onChange={(vId) => {
                                  const matched = vehiclesList.find((v) => v.id === vId);
                                  setDirectHireForm((prev) => ({
                                    ...prev,
                                    vehicle_id: vId,
                                    start_odometer:
                                      matched?.current_odometer !== undefined
                                        ? matched.current_odometer
                                        : prev.start_odometer,
                                    driver_id:
                                      matched?.assigned_driver_id ||
                                      matched?.assignedDriver?.id ||
                                      prev.driver_id,
                                    origin_branch_id: matched?.branch_id || prev.origin_branch_id,
                                  }));
                                }}
                                options={vehiclesList.map((v) => ({
                                  value: v.id,
                                  label: v.vehicle_number,
                                  sublabel: `${v.vehicle_type || 'Truck'} • Capacity: ${v.capacity_ton || '10'} Tons`,
                                  badge: v.status === 'AVAILABLE' ? 'Available' : v.status,
                                  badgeColor: v.status === 'AVAILABLE' ? 'emerald' : 'amber',
                                }))}
                                placeholder="-- Choose Truck from Fleet Yard --"
                                icon={Truck}
                                searchable={true}
                                searchPlaceholder="Search truck plate or body type..."
                                bottomAction={{
                                  label: '+ Enter Custom / Market Truck...',
                                  icon: Plus,
                                  onClick: () =>
                                    setDirectHireForm((prev) => ({ ...prev, vehicle_mode: 'CUSTOM' })),
                                }}
                              />
                            </div>

                            {/* 2. Assigned Driver */}
                            <div>
                              <label
                                className={`block text-xs font-semibold mb-1 ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                Assigned Driver <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <ModalCustomSelect
                                isDark={isDark}
                                value={directHireForm.driver_id}
                                onChange={(dId) => {
                                  setDirectHireForm((prev) => ({ ...prev, driver_id: dId }));
                                }}
                                options={driversList.map((d) => ({
                                  value: d.id,
                                  label: d.name,
                                  sublabel: d.phone ? `Mobile: ${d.phone}` : 'No mobile registered',
                                  badge: d.status || 'Active',
                                  badgeColor: d.status === 'AVAILABLE' ? 'emerald' : 'indigo',
                                }))}
                                placeholder="-- Choose Assigned Driver --"
                                icon={User}
                                searchable={true}
                                searchPlaceholder="Search driver by name or mobile..."
                                bottomAction={{
                                  label: '+ Enter Custom / Outside Driver...',
                                  icon: Plus,
                                  onClick: () =>
                                    setDirectHireForm((prev) => ({ ...prev, vehicle_mode: 'CUSTOM' })),
                                }}
                              />
                            </div>

                            <div>
                              <label
                                className={`block text-xs font-semibold mb-1 ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                Departure Odometer (KM)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  placeholder="52400"
                                  value={directHireForm.start_odometer}
                                  onChange={(e) =>
                                    setDirectHireForm((prev) => ({ ...prev, start_odometer: e.target.value }))
                                  }
                                  className={`w-full pl-3.5 pr-12 py-2.5 rounded-xl border text-xs font-mono focus:outline-hidden ${
                                    isDark
                                      ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                  }`}
                                />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                  <span className="text-[10px] font-bold font-mono text-slate-400">KM</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Custom / Market Vehicle & Driver Inputs */
                          <div className="space-y-4">
                            {/* Vehicle Specs Header */}
                            <div className="flex items-center justify-between text-xs pt-0.5">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Vehicle Specifications</span>
                              </span>
                              {directHireForm.custom_truck_type === 'CUSTOM' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDirectHireForm((prev) => ({
                                      ...prev,
                                      custom_truck_type: '19',
                                      custom_capacity_ton: '10',
                                      custom_vehicle_type_name: '',
                                    }))
                                  }
                                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <span>← Back to Presets</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400">Market hire or new vehicle</span>
                              )}
                            </div>

                            {/* 4-Column Grid for Vehicle Specs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {/* 1. Custom Plate */}
                              <div>
                                <label
                                  className={`block text-xs font-semibold mb-1 ${
                                    isDark ? 'text-slate-300' : 'text-slate-700'
                                  }`}
                                >
                                  Vehicle Plate Number <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. HR-55-AY-8724"
                                  value={directHireForm.custom_vehicle_number}
                                  onChange={(e) =>
                                    setDirectHireForm((prev) => ({
                                      ...prev,
                                      custom_vehicle_number: e.target.value.toUpperCase(),
                                    }))
                                  }
                                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-hidden transition-all shadow-xs ${
                                    isDark
                                      ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                  }`}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Plate / registration number</p>
                              </div>

                              {/* 2. Vehicle Type / Body */}
                              <div>
                                <label
                                  className={`block text-xs font-semibold mb-1 ${
                                    isDark ? 'text-slate-300' : 'text-slate-700'
                                  }`}
                                >
                                  Vehicle Type / Body <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                {directHireForm.custom_truck_type !== 'CUSTOM' ? (
                                  <ModalCustomSelect
                                    isDark={isDark}
                                    value={directHireForm.custom_truck_type}
                                    onChange={(val) => {
                                      const cap =
                                        val === '32'
                                          ? '16'
                                          : val === '40'
                                          ? '24'
                                          : val === '14'
                                          ? '5'
                                          : val === '17'
                                          ? '7'
                                          : val === 'bolero'
                                          ? '2.5'
                                          : '10';
                                      setDirectHireForm((prev) => ({
                                        ...prev,
                                        custom_truck_type: val,
                                        custom_capacity_ton: cap,
                                        custom_vehicle_type_name: '',
                                      }));
                                    }}
                                    options={[
                                      { value: '19', label: '19 Ft • 10 Ton Truck', badge: '10 Ton' },
                                      { value: '32', label: '32 Ft • 16 Ton Multi-Axle', badge: '16 Ton' },
                                      { value: '40', label: '40 Ft • 24 Ton Trailer', badge: '24 Ton' },
                                      { value: '17', label: '17 Ft • 7 Ton Eicher', badge: '7 Ton' },
                                      { value: '14', label: '14 Ft • 5 Ton Light Truck', badge: '5 Ton' },
                                      { value: 'bolero', label: 'Bolero Pickup • 2.5 Ton', badge: '2.5 Ton' },
                                    ]}
                                    placeholder="Select Vehicle Type..."
                                    icon={Layers}
                                    searchable={false}
                                    bottomAction={{
                                      label: '+ Enter Custom Vehicle Type...',
                                      icon: Plus,
                                      onClick: () =>
                                        setDirectHireForm((prev) => ({
                                          ...prev,
                                          custom_truck_type: 'CUSTOM',
                                          custom_capacity_ton: prev.custom_capacity_ton || '10',
                                        })),
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="e.g. Tanker / Container / Dumper"
                                    value={directHireForm.custom_vehicle_type_name}
                                    onChange={(e) =>
                                      setDirectHireForm((prev) => ({
                                        ...prev,
                                        custom_vehicle_type_name: e.target.value,
                                      }))
                                    }
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden transition-all shadow-xs ${
                                      isDark
                                        ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                    }`}
                                  />
                                )}
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {directHireForm.custom_truck_type === 'CUSTOM' ? 'Type custom body description' : 'Standard preset sizes'}
                                </p>
                              </div>

                              {/* 3. Rated Capacity (Tons) */}
                              <div>
                                <label
                                  className={`block text-xs font-semibold mb-1 ${
                                    isDark ? 'text-slate-300' : 'text-slate-700'
                                  }`}
                                >
                                  Load Capacity (Tons) <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    required
                                    placeholder="10"
                                    value={directHireForm.custom_capacity_ton}
                                    onChange={(e) =>
                                      setDirectHireForm((prev) => ({
                                        ...prev,
                                        custom_capacity_ton: e.target.value,
                                      }))
                                    }
                                    className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-hidden transition-all shadow-xs ${
                                      isDark
                                        ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                    }`}
                                  />
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                      TONS
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Carrying payload rating</p>
                              </div>

                              {/* 4. Departure Odometer */}
                              <div>
                                <label
                                  className={`block text-xs font-semibold mb-1 ${
                                    isDark ? 'text-slate-300' : 'text-slate-700'
                                  }`}
                                >
                                  Departure Odometer (KM)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    placeholder="52400"
                                    value={directHireForm.start_odometer}
                                    onChange={(e) =>
                                      setDirectHireForm((prev) => ({ ...prev, start_odometer: e.target.value }))
                                    }
                                    className={`w-full pl-3.5 pr-12 py-2.5 rounded-xl border text-xs font-mono focus:outline-hidden transition-all shadow-xs ${
                                      isDark
                                        ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                    }`}
                                  />
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-[10px] font-bold font-mono text-slate-400">KM</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Initial odometer reading</p>
                              </div>
                            </div>

                            {/* Driver & Crew Specs Header */}
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                <User className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Assigned Driver Details</span>
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Driver Name */}
                                <div>
                                  <label
                                    className={`block text-xs font-semibold mb-1 ${
                                      isDark ? 'text-slate-300' : 'text-slate-700'
                                    }`}
                                  >
                                    Assigned Driver Name <span className="text-red-500 font-bold ml-0.5">*</span>
                                  </label>
                                  <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-500">
                                      <User className="w-3.5 h-3.5" />
                                    </div>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Mukesh Yadav"
                                      value={directHireForm.custom_driver_name}
                                      onChange={(e) =>
                                        setDirectHireForm((prev) => ({ ...prev, custom_driver_name: e.target.value }))
                                      }
                                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden transition-all shadow-xs ${
                                        isDark
                                          ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                          : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                      }`}
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1">Driver on-board the vehicle</p>
                                </div>

                                {/* Driver Phone with 10/10 validation */}
                                <div>
                                  <label
                                    className={`block text-xs font-semibold mb-1 ${
                                      isDark ? 'text-slate-300' : 'text-slate-700'
                                    }`}
                                  >
                                    Driver 10-Digit Mobile Number <span className="text-red-500 font-bold ml-0.5">*</span>
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="tel"
                                      inputMode="numeric"
                                      pattern="[0-9]{10}"
                                      maxLength={10}
                                      required
                                      placeholder="e.g. 9829012345"
                                      value={directHireForm.custom_driver_phone}
                                      onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setDirectHireForm((prev) => ({ ...prev, custom_driver_phone: digits }));
                                      }}
                                      className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-xs font-mono font-semibold focus:outline-hidden transition-colors ${
                                        directHireForm.custom_driver_phone && directHireForm.custom_driver_phone.length < 10
                                          ? 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20'
                                          : directHireForm.custom_driver_phone.length === 10
                                          ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                                          : isDark
                                          ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                          : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                                      } ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                      {directHireForm.custom_driver_phone.length === 10 ? (
                                        <span className="text-emerald-500 text-xs font-bold font-mono">10/10 ✓</span>
                                      ) : directHireForm.custom_driver_phone.length > 0 ? (
                                        <span className="text-amber-500 text-[11px] font-mono font-semibold">
                                          {directHireForm.custom_driver_phone.length}/10
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="text-[10px] mt-1">
                                    {directHireForm.custom_driver_phone && directHireForm.custom_driver_phone.length < 10 ? (
                                      <span className="text-amber-500 font-medium">
                                        Enter 10-digit number ({10 - directHireForm.custom_driver_phone.length} more digits needed)
                                      </span>
                                    ) : directHireForm.custom_driver_phone.length === 10 ? (
                                      <span className="text-emerald-500 font-semibold">
                                        ✓ Valid 10-digit mobile
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Strictly 10 digits required for driver dispatch</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Visual Truck Deployment Card */}
                      {(() => {
                        const veh = vehiclesList.find((v) => v.id === directHireForm.vehicle_id);
                        const drv = driversList.find((d) => d.id === directHireForm.driver_id);
                        const isCustomMode = directHireForm.vehicle_mode === 'CUSTOM';
                        const displayPlate = isCustomMode ? directHireForm.custom_vehicle_number : veh?.vehicle_number;
                        const displayDriver = isCustomMode ? directHireForm.custom_driver_name : drv?.name;
                        const customTypeName =
                          directHireForm.custom_truck_type === 'CUSTOM'
                            ? (directHireForm.custom_vehicle_type_name || 'Custom Vehicle')
                            : directHireForm.custom_truck_type === 'bolero'
                            ? 'Bolero Pickup'
                            : `${directHireForm.custom_truck_type} Ft Truck`;
                        const displayCap = isCustomMode
                          ? `${directHireForm.custom_capacity_ton || '10'} Tons • ${customTypeName}`
                          : veh
                          ? `${veh.capacity_ton || '10'} Tons • ${veh.vehicle_type || 'Truck'}`
                          : '';

                        if (!displayPlate) return null;
                        return (
                          <div
                            className={`p-4 rounded-2xl border space-y-2.5 shadow-xs ${
                              isDark ? 'bg-indigo-950/20 border-indigo-800/50' : 'bg-indigo-50/70 border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-indigo-500/20">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <Truck className="w-4 h-4" />
                                <span>Vehicle Deployment Preview</span>
                              </span>
                              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                {isCustomMode ? 'MARKET HIRE • AUTO-REGISTERED' : `${veh?.ownership || 'OWN'} FLEET`}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-indigo-100'}`}>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Truck Number</span>
                                <p className="font-mono font-black text-slate-900 dark:text-white mt-0.5">
                                  {displayPlate}
                                </p>
                              </div>
                              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-indigo-100'}`}>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Body & Capacity</span>
                                <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                                  {displayCap || '10 Tons'}
                                </p>
                              </div>
                              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-indigo-100'}`}>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Driver</span>
                                <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                                  {displayDriver || 'Assigned Driver'}
                                </p>
                              </div>
                              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-indigo-100'}`}>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Route</span>
                                <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                                  {directHireForm.origin_city || 'Origin'} ➔ {directHireForm.destination_city || 'Destination'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* ================= STEP 3: FINANCIALS & ADVANCE ================= */}
                  {directHireStep === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Step Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Step 3 of 3: Freight Rate & Driver Cash Advance
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Financial Settlement</span>
                        </div>
                      </div>

                      {/* Commercial Freight & Advance Inputs Card */}
                      <div
                        className={`p-4 rounded-2xl border space-y-3.5 shadow-xs transition-all ${
                          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/90'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Banknote className="w-4 h-4" />
                            <span>Commercial Freight & Driver Advance</span>
                          </label>
                          <span className="text-[10px] font-mono text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">
                            INR (₹)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* 1. Agreed Freight */}
                          <div>
                            <label
                              className={`block text-xs font-bold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Agreed Placement Freight (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <div className="relative">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                                ₹
                              </div>
                              <input
                                type="number"
                                step="100"
                                required
                                placeholder="55000"
                                value={directHireForm.contract_amount}
                                onChange={(e) =>
                                  setDirectHireForm((prev) => ({ ...prev, contract_amount: e.target.value }))
                                }
                                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm font-black font-mono focus:outline-hidden transition-all shadow-xs ${
                                  isDark
                                    ? 'bg-slate-900 border-slate-700 text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                    : 'bg-white border-slate-200 text-emerald-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15'
                                }`}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Total revenue to bill the customer</p>
                          </div>

                          {/* 2. Client Advance */}
                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Client Advance Received (₹) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-blue-600 dark:text-blue-400 font-black text-sm">
                                ₹
                              </div>
                              <input
                                type="number"
                                step="100"
                                placeholder="0 (Optional)"
                                value={directHireForm.advance_received}
                                onChange={(e) =>
                                  setDirectHireForm((prev) => ({ ...prev, advance_received: e.target.value }))
                                }
                                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm font-bold font-mono focus:outline-hidden transition-all shadow-xs ${
                                  isDark
                                    ? 'bg-slate-900 border-slate-700 text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    : 'bg-white border-slate-200 text-blue-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15'
                                }`}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Upfront advance collected before loading</p>
                          </div>

                          {/* 3. Driver Advance */}
                          <div>
                            <label
                              className={`block text-xs font-semibold mb-1 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              Driver Trip Advance / Bhatta (₹) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-rose-500 font-black text-sm">
                                  ₹
                                </div>
                                <input
                                  type="number"
                                  step="100"
                                  placeholder="0"
                                  value={directHireForm.driver_advance}
                                  onChange={(e) =>
                                    setDirectHireForm((prev) => ({ ...prev, driver_advance: e.target.value }))
                                  }
                                  className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm font-bold font-mono focus:outline-hidden transition-all shadow-xs ${
                                    isDark
                                      ? 'bg-slate-900 border-slate-700 text-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                      : 'bg-white border-slate-200 text-rose-600 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/15'
                                  }`}
                                />
                              </div>
                              <div className="relative shrink-0 w-36">
                                <ModalCustomSelect
                                  isDark={isDark}
                                  value={directHireForm.advance_mode}
                                  onChange={(modeVal) => {
                                    setDirectHireForm((prev) => ({ ...prev, advance_mode: modeVal }));
                                  }}
                                  options={[
                                    { value: 'CASH', label: '💵 Cash', sublabel: 'Hand Cash' },
                                    { value: 'UPI', label: '📱 UPI', sublabel: 'PhonePe / GPay' },
                                    { value: 'BANK_TRANSFER', label: '🏦 Bank', sublabel: 'NEFT / IMPS' },
                                  ]}
                                  placeholder="Mode"
                                  searchable={false}
                                />
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Disbursed for fuel, toll & crew bhatta</p>
                          </div>
                        </div>

                        {/* Payment Notes & Billing Terms */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Payment Terms / Billing Remarks <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Balance payment on unloading, TDS 1% applicable, Diesel slip issued"
                            value={directHireForm.remarks}
                            onChange={(e) => setDirectHireForm((prev) => ({ ...prev, remarks: e.target.value }))}
                            className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-hidden transition-all ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                                : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Executive Real-time Commercial Summary Breakdown Card */}
                      {(() => {
                        const agreed = parseFloat(directHireForm.contract_amount) || 0;
                        const clientAdv = parseFloat(directHireForm.advance_received) || 0;
                        const driverAdv = parseFloat(directHireForm.driver_advance) || 0;
                        const balanceDue = Math.max(0, agreed - clientAdv);
                        const netImmediate = clientAdv - driverAdv;
                        const clientName =
                          directHireForm.hiring_party_name ||
                          customersList.find((c) => c.id === directHireForm.customer_id)?.name ||
                          'Direct Client';

                        return (
                          <div
                            className={`p-4 rounded-2xl border space-y-3 shadow-xs ${
                              isDark
                                ? 'bg-slate-900/70 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            {/* Summary Header */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                                  <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                                    Deal Financial Summary & Expected Net Flow
                                  </h4>
                                  <p className="text-[10px] text-slate-400">Live settlement breakdown</p>
                                </div>
                              </div>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-xs">
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase">Client:</span>
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                  {clientName}
                                </span>
                              </div>
                            </div>

                            {/* 4 Metric Stat Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                              {/* 1. Agreed Freight */}
                              <div className={`p-3 rounded-xl border ${
                                isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200/70'
                              }`}>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">
                                  Agreed Freight
                                </span>
                                <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                                  ₹{agreed.toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                                  100% Contract Revenue
                                </span>
                              </div>

                              {/* 2. Client Advance */}
                              <div className={`p-3 rounded-xl border ${
                                isDark ? 'bg-blue-950/20 border-blue-800/40' : 'bg-blue-50/60 border-blue-200/70'
                              }`}>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">
                                  Client Advance
                                </span>
                                <p className="text-base font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                                  ₹{clientAdv.toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium">
                                  Collected Upfront
                                </span>
                              </div>

                              {/* 3. Balance Due */}
                              <div className={`p-3 rounded-xl border ${
                                isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/60 border-amber-200/70'
                              }`}>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">
                                  Balance Due
                                </span>
                                <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                                  ₹{balanceDue.toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                                  Due on Delivery / POD
                                </span>
                              </div>

                              {/* 4. Driver Bhatta */}
                              <div className={`p-3 rounded-xl border ${
                                isDark ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50/60 border-rose-200/70'
                              }`}>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">
                                  Driver Bhatta
                                </span>
                                <p className="text-base font-black font-mono text-rose-500 dark:text-rose-400 mt-1">
                                  -₹{driverAdv.toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] text-rose-500/80 dark:text-rose-400/80 font-medium">
                                  Disbursed ({directHireForm.advance_mode})
                                </span>
                              </div>
                            </div>

                            {/* Net Immediate Cashflow Strip */}
                            <div className={`px-3 py-2 rounded-xl text-[11px] font-medium flex items-center justify-between flex-wrap gap-2 ${
                              netImmediate > 0
                                ? isDark ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                                : netImmediate < 0
                                ? isDark ? 'bg-amber-950/30 text-amber-300 border border-amber-800/40' : 'bg-amber-50 text-amber-800 border border-amber-200/80'
                                : isDark ? 'bg-slate-800/60 text-slate-300 border border-slate-700/60' : 'bg-slate-100/80 text-slate-700 border border-slate-200'
                            }`}>
                              <span className="flex items-center gap-1.5 font-bold">
                                <span>Immediate Cash Position:</span>
                                <span className="font-mono text-xs">
                                  {netImmediate >= 0 ? `+₹${netImmediate.toLocaleString('en-IN')}` : `-₹${Math.abs(netImmediate).toLocaleString('en-IN')}`}
                                </span>
                              </span>
                              <span className="text-[10px] opacity-80">
                                {netImmediate > 0
                                  ? 'Net upfront cash surplus retained before dispatch'
                                  : netImmediate < 0
                                  ? 'Company advance funded for driver before client balance collection'
                                  : 'Client advance equals driver advance disbursed'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Wizard Footer Controls */}
                <div
                  className={`p-4 border-t flex items-center justify-between shrink-0 ${
                    isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
                  }`}
                >
                  {/* Left Action Button */}
                  <div>
                    {directHireStep === 1 ? (
                      <button
                        type="button"
                        onClick={() => setIsDirectHireModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDirectHireStep((prev) => Math.max(1, prev - 1))}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>← Back to {directHireStep === 2 ? 'Party & Route' : 'Vehicle & Crew'}</span>
                      </button>
                    )}
                  </div>

                  {/* Right Action Button */}
                  <div className="flex items-center gap-3">
                    {directHireStep === 1 && (
                      <button
                        type="button"
                        onClick={handleNextStep1}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Continue to Vehicle & Crew ➔</span>
                      </button>
                    )}

                    {directHireStep === 2 && (
                      <button
                        type="button"
                        onClick={handleNextStep2}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Continue to Commercials ➔</span>
                      </button>
                    )}

                    {directHireStep === 3 && (
                      <button
                        type="submit"
                        disabled={submittingDirectHire}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {submittingDirectHire ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Launch Dedicated Placement ➔</span>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </Modal>

          {/* 360° TRIP COMPREHENSIVE DETAILS, FINANCIAL LEDGER & AUDIT DRAWER MODAL */}
          <Modal isOpen={Boolean(viewingTripDetails)} onClose={() => setViewingTripDetails(null)}>
            {viewingTripDetails && (
              <div
                className={`w-full max-w-5xl max-h-[92vh] my-auto flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
                  isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* 1. MODAL HEADER */}
                <div
                  className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 shrink-0 ${
                    isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-100 bg-slate-50/90'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                      <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black font-mono tracking-tight text-blue-600 dark:text-cyan-400">
                          {viewingTripDetails.trip_number}
                        </h2>
                        {renderLoadTypeBadge(viewingTripDetails, { size: 'sm' })}
                        <Badge status={viewingTripDetails.status} size="sm" />
                        {viewingTripDetails.settlement_status === 'SETTLED' ? (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                            SETTLED
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            Settlement Pending
                          </span>
                        )}
                        {!isAdmin && (
                          <span className="text-[10px] font-bold text-blue-700 dark:text-cyan-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5 text-blue-500 dark:text-cyan-400" />
                            <span>View Only Mode</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                        <span className="text-slate-900 dark:text-slate-200 font-bold">
                          {viewingTripDetails.origin_city || viewingTripDetails.originBranch?.city || 'Origin'}
                        </span>
                        <span>➔</span>
                        <span className="text-slate-900 dark:text-slate-200 font-bold">
                          {viewingTripDetails.destination_city || viewingTripDetails.destBranch?.city || 'Destination'}
                        </span>
                        {viewingTripDetails.trip_date && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(viewingTripDetails.trip_date).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {tripDetailsLoading && (
                      <RotateCw className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    <button
                      type="button"
                      onClick={() => setViewingTripDetails(null)}
                      className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 2. TAB NAVIGATION */}
                <div
                  className={`px-4 sm:px-6 border-b flex items-center gap-2 overflow-x-auto shrink-0 ${
                    isDark ? 'border-slate-800 bg-[#0B1020]' : 'border-slate-100 bg-white'
                  }`}
                >
                  {[
                    { id: 'OVERVIEW', label: 'Overview & P&L', icon: DollarSign },
                    {
                      id: 'FINANCIALS',
                      label: 'Driver Advance & Highway Expenses',
                      icon: Receipt,
                      count: (viewingTripDetails.advances?.length || 0) + (viewingTripDetails.expenses?.length || 0),
                    },
                    {
                      id: 'CARGO',
                      label: viewingTripDetails.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Dedicated Cargo Details' : 'Cargo Manifest & Dockets',
                      icon: Layers,
                      count: viewingTripDetails.consignments?.length || 0,
                    },
                    { id: 'AUDIT_SEALS', label: 'Transit Seals & Odometer', icon: ShieldCheck },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tripDetailsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTripDetailsTab(tab.id)}
                        className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isActive
                                ? 'bg-blue-100 dark:bg-cyan-950/60 text-blue-700 dark:text-cyan-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 3. TAB BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {/* TAB 1: OVERVIEW & FINANCIAL KPI DASHBOARD */}
                  {tripDetailsTab === 'OVERVIEW' && (
                    <div className="space-y-6">
                      {/* 4 HIGH-IMPACT FINANCIAL KPI CARDS */}
                      {(() => {
                        const agreedRev = parseFloat(
                          viewingTripDetails.contract_amount ||
                          viewingTripDetails.expected_revenue ||
                          viewingTripDetails.financial_summary?.grossRevenue ||
                          (viewingTripDetails.consignments || []).reduce((acc, c) => acc + Number(c.total_amount || 0), 0) ||
                          0
                        );
                        const partyAdv = parseFloat(viewingTripDetails.advance_received || 0);
                        const partyBal = Math.max(0, agreedRev - partyAdv);

                        const totalDriverAdv = parseFloat(
                          (viewingTripDetails.advances && viewingTripDetails.advances.length > 0)
                            ? viewingTripDetails.advances.reduce((s, a) => s + parseFloat(a.amount || 0), 0)
                            : (viewingTripDetails.driver_advance || 0)
                        );

                        const totalExp = parseFloat(
                          (viewingTripDetails.expenses && viewingTripDetails.expenses.length > 0)
                            ? viewingTripDetails.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                            : (viewingTripDetails.total_expenses || 0)
                        );

                        const vehicleHire = parseFloat(viewingTripDetails.vehicle_charge || 0);
                        const totalOperatingOutflows = totalDriverAdv + totalExp + vehicleHire;
                        const netTripMargin = agreedRev > 0 ? (agreedRev - totalOperatingOutflows) : 0;
                        const isProfitable = netTripMargin >= 0;

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {/* Card 1: Gross Freight / Revenue */}
                            <div className="p-4 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/70 via-white to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 shadow-2xs">
                              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Gross Freight</span>
                                <DollarSign className="w-4 h-4" />
                              </div>
                              <p className="text-xl sm:text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
                                ₹{agreedRev.toLocaleString('en-IN')}
                              </p>
                              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                                <p>Party Adv Rec: <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{partyAdv.toLocaleString('en-IN')}</span></p>
                                <p>Party Bal Due: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">₹{partyBal.toLocaleString('en-IN')}</span></p>
                              </div>
                            </div>

                            {/* Card 2: Driver Advance Given */}
                            <div className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/70 via-white to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 shadow-2xs">
                              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Driver Advance Given</span>
                                <Wallet className="w-4 h-4" />
                              </div>
                              <p className="text-xl sm:text-2xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
                                ₹{totalDriverAdv.toLocaleString('en-IN')}
                              </p>
                              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                                {viewingTripDetails.advances?.length || (totalDriverAdv > 0 ? 1 : 0)} advance transaction(s) recorded
                              </p>
                            </div>

                            {/* Card 3: Highway Expenses Logged */}
                            <div className="p-4 rounded-2xl border border-purple-200/70 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/70 via-white to-white dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 shadow-2xs">
                              <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Highway Expenses</span>
                                <Receipt className="w-4 h-4" />
                              </div>
                              <p className="text-xl sm:text-2xl font-black font-mono mt-1 text-purple-600 dark:text-purple-400">
                                ₹{totalExp.toLocaleString('en-IN')}
                              </p>
                              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                                {viewingTripDetails.expenses?.length || 0} expense bill(s) logged on route
                              </p>
                            </div>

                            {/* Card 4: Operating Contribution / Net Margin */}
                            <div className={`p-4 rounded-2xl border shadow-2xs ${
                              isProfitable
                                ? 'border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/70 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900'
                                : 'border-rose-200/70 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/70 via-white to-white dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900'
                            }`}>
                              <div className={`flex items-center justify-between ${
                                isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                              }`}>
                                <span className="text-[11px] font-bold uppercase tracking-wider">Operating Margin</span>
                                <CheckCircle className="w-4 h-4" />
                              </div>
                              <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                                isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                ₹{netTripMargin.toLocaleString('en-IN')}
                              </p>
                              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                                Revenue minus (Adv + Exp + Hire)
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* SETTLEMENT CLOSURE & VOUCHER CARD (Visible when trip is settled) */}
                      {viewingTripDetails.settlement_status === 'SETTLED' && (
                        <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/80 via-white to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 shadow-md space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                    Trip Financial Settlement Closed
                                  </h4>
                                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                                    {viewingTripDetails.settlement?.settlement_number || `SETTLE-${viewingTripDetails.trip_number}`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Reconciled & finalized • All driver advances, highway expenses, and bhatta settled
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {viewingTripDetails.trip_mode === 'DIRECT_VEHICLE_HIRE' && (
                                viewingTripDetails.billing_status === 'INVOICED' ? (
                                  <Link
                                    href="/billing/invoices"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>Invoiced (View in Billing)</span>
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTripInvoiceModal(viewingTripDetails)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>Generate Freight Invoice ➔</span>
                                  </button>
                                )
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenSettledSlip(viewingTripDetails)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
                                title="Open & Print Official Settlement Voucher Slip"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View & Print Settlement Slip ➔</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick settlement breakdown */}
                          {(() => {
                            const st = viewingTripDetails.settlement || {};
                            const totalAdv = parseFloat(st.total_advance !== undefined ? st.total_advance : (viewingTripDetails.driver_advance || 0));
                            const totalExp = parseFloat(st.total_expenses !== undefined ? st.total_expenses : (viewingTripDetails.total_expenses || 0));
                            const bhatta = parseFloat(st.driver_allowance !== undefined ? st.driver_allowance : (viewingTripDetails.driver_allowance || 0));
                            const balance = parseFloat(st.balance_payable_or_receivable !== undefined ? st.balance_payable_or_receivable : 0);
                            const stType = st.settlement_type || '';
                            const isRefund = stType.includes('REFUND');

                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/60 text-xs">
                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 block">Total Advances:</span>
                                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">₹{totalAdv.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 block">Approved Expenses:</span>
                                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">₹{totalExp.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 block">Driver Bhatta:</span>
                                  <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">₹{bhatta.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 block">
                                    {isRefund ? 'Refund from Driver:' : 'Net Paid to Driver:'}
                                  </span>
                                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">₹{balance.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* QUICK ROUTE & CREW INFO CARDS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Vehicle & Crew Card */}
                        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                            <Truck className="w-3.5 h-3.5 text-blue-500" />
                            <span>Assigned Fleet & Crew</span>
                          </h3>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-500 dark:text-slate-400">Vehicle Number:</span>
                              <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">
                                {viewingTripDetails.vehicle?.vehicle_number || 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-500 dark:text-slate-400">Vehicle Ownership:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {viewingTripDetails.vehicle?.ownership === 'MARKET' ? 'Market Hire' : viewingTripDetails.vehicle?.ownership === 'ATTACHED' ? 'Vendor Attached' : 'Company Owned'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-500 dark:text-slate-400">Assigned Driver:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {viewingTripDetails.driver?.name || 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-500 dark:text-slate-400">Driver Phone:</span>
                              {viewingTripDetails.driver?.phone ? (
                                <a
                                  href={`tel:${viewingTripDetails.driver.phone}`}
                                  className="font-mono text-blue-600 dark:text-cyan-400 font-bold hover:underline"
                                >
                                  {viewingTripDetails.driver.phone}
                                </a>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Origin, Destination & Transit Card */}
                        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Route & Transit Milestone</span>
                          </h3>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-500 dark:text-slate-400">Origin Loading Yard:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {viewingTripDetails.origin_city || viewingTripDetails.originBranch?.branch_name || 'Origin Hub'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-500 dark:text-slate-400">Destination Hub/Site:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {viewingTripDetails.destination_city || viewingTripDetails.destBranch?.branch_name || 'Destination'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-500 dark:text-slate-400">Odometer Run:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {viewingTripDetails.start_odometer ? `${viewingTripDetails.start_odometer} KM` : '0 KM'}
                                {viewingTripDetails.end_odometer ? ` ➔ ${viewingTripDetails.end_odometer} KM (${Math.max(0, Number(viewingTripDetails.end_odometer) - Number(viewingTripDetails.start_odometer || 0))} KM)` : ' (In Transit)'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-500 dark:text-slate-400">Dispatch Seal:</span>
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                {viewingTripDetails.dispatches?.[0]?.seal_number || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DETAILED DRIVER ADVANCE & HIGHWAY EXPENSES LEDGER */}
                  {tripDetailsTab === 'FINANCIALS' && (
                    <div className="space-y-6">
                      {/* Quick Action Header Bar */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-200 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                            <span>Trip Financial Outflows & Reconciliation</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Track every rupee given in cash/UPI to the driver and all transit highway bills.
                          </p>
                        </div>
                        {isAdmin && viewingTripDetails.settlement_status !== 'SETTLED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddAdvanceOrExp(viewingTripDetails)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Disburse Advance / Log Expense</span>
                          </button>
                        )}
                      </div>

                      {/* SECTION 1: DRIVER ADVANCES TABLE */}
                      <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 uppercase tracking-wider">
                            <Wallet className="w-4 h-4 text-amber-600" />
                            <span>Driver Advances Given (Cash / Online)</span>
                          </h4>
                          <span className="font-mono font-black text-xs text-amber-700 dark:text-amber-300">
                            Total Adv: ₹{parseFloat(
                              (viewingTripDetails.advances && viewingTripDetails.advances.length > 0)
                                ? viewingTripDetails.advances.reduce((s, a) => s + parseFloat(a.amount || 0), 0)
                                : (viewingTripDetails.driver_advance || 0)
                            ).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {viewingTripDetails.advances && viewingTripDetails.advances.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-white dark:bg-slate-900">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-amber-100/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold border-b border-amber-200/60 dark:border-amber-900/40">
                                <tr>
                                  <th className="py-2.5 px-3">#</th>
                                  <th className="py-2.5 px-3">Date</th>
                                  <th className="py-2.5 px-3">Disbursal Mode</th>
                                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                                  <th className="py-2.5 px-3">Remarks / Purpose</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100/50 dark:divide-slate-800">
                                {viewingTripDetails.advances.map((adv, idx) => (
                                  <tr key={adv.id || idx} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40">
                                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                      {adv.disbursed_date ? new Date(adv.disbursed_date).toLocaleDateString() : (adv.createdAt ? new Date(adv.createdAt).toLocaleDateString() : '-')}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        {adv.disbursed_mode || 'CASH'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                      ₹{parseFloat(adv.amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                      {adv.remarks || 'Driver trip advance'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : parseFloat(viewingTripDetails.driver_advance || 0) > 0 ? (
                          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Opening Driver Advance (Placement Disbursal)
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Disbursed at vehicle dispatch / movement creation
                              </p>
                            </div>
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                              ₹{parseFloat(viewingTripDetails.driver_advance).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 text-center text-xs text-slate-500 dark:text-slate-400">
                            No advance has been disbursed to driver for this trip.
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: HIGHWAY & TRANSIT EXPENSES TABLE */}
                      <div className="p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wider">
                            <Receipt className="w-4 h-4 text-purple-600" />
                            <span>Highway Transit Expenses (Fuel, Toll, Repairs, Challan)</span>
                          </h4>
                          <span className="font-mono font-black text-xs text-purple-700 dark:text-purple-300">
                            Total Exp: ₹{parseFloat(
                              (viewingTripDetails.expenses && viewingTripDetails.expenses.length > 0)
                                ? viewingTripDetails.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                                : (viewingTripDetails.total_expenses || 0)
                            ).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {viewingTripDetails.expenses && viewingTripDetails.expenses.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-white dark:bg-slate-900">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-purple-100/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold border-b border-purple-200/60 dark:border-purple-900/40">
                                <tr>
                                  <th className="py-2.5 px-3">#</th>
                                  <th className="py-2.5 px-3">Date</th>
                                  <th className="py-2.5 px-3">Expense Category</th>
                                  <th className="py-2.5 px-3">Paid Via</th>
                                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                                  <th className="py-2.5 px-3">Remarks / Bill No</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-purple-100/50 dark:divide-slate-800">
                                {viewingTripDetails.expenses.map((exp, idx) => (
                                  <tr key={exp.id || idx} className="hover:bg-purple-50/40 dark:hover:bg-slate-800/40">
                                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                      {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : (exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : '-')}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                        {getExpenseCategoryName(exp)}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                      {exp.payment_method || 'CASH'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                                      ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                      {exp.remarks || exp.bill_number || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : parseFloat(viewingTripDetails.total_expenses || 0) > 0 ? (
                          <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Consolidated Trip Expenses
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Logged in trip financial ledger
                              </p>
                            </div>
                            <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                              ₹{parseFloat(viewingTripDetails.total_expenses).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 text-center text-xs text-slate-500 dark:text-slate-400">
                            No highway expenses have been recorded for this trip.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CARGO MANIFEST & DOCKETS */}
                  {tripDetailsTab === 'CARGO' && (
                    <div className="space-y-4">
                      {viewingTripDetails.trip_mode === 'DIRECT_VEHICLE_HIRE' ? (
                        <div className="p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-4">
                          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            <span>Dedicated Vehicle Placement Details</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Client / Hiring Party:</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {viewingTripDetails.hiring_party_name || viewingTripDetails.customer?.name || 'Direct Client'}
                              </span>
                              {viewingTripDetails.hiring_party_phone && (
                                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{viewingTripDetails.hiring_party_phone}</p>
                              )}
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Goods Description:</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {viewingTripDetails.goods_description || 'Full Truck Load Cargo'}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 text-[10px] block">E-Way Bill Number:</span>
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {viewingTripDetails.eway_bill_no || 'N/A'}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Party Ref / PO Number:</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {viewingTripDetails.party_ref_number || 'N/A'}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Agreed Freight:</span>
                              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                                ₹{parseFloat(viewingTripDetails.contract_amount || viewingTripDetails.expected_revenue || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Party Advance Received:</span>
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                ₹{parseFloat(viewingTripDetails.advance_received || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : viewingTripDetails.consignments && viewingTripDetails.consignments.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Docket #</th>
                                <th className="py-2.5 px-3">Consignor</th>
                                <th className="py-2.5 px-3">Consignee</th>
                                <th className="py-2.5 px-3 text-right">Packages</th>
                                <th className="py-2.5 px-3 text-right">Weight (KG)</th>
                                <th className="py-2.5 px-3 text-right">Freight (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {viewingTripDetails.consignments.map((c, i) => (
                                <tr key={c.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-cyan-400">
                                    {c.docket_number}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                    {c.consignor?.name || c.consignor_name || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                    {c.consignee?.name || c.consignee_name || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">
                                    {c.total_packages || 1}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-semibold">
                                    {Number(c.actual_weight || c.charged_weight || 0).toLocaleString()}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    ₹{Number(c.total_amount || 0).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                          No cargo dockets attached directly to this trip record.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: TRANSIT SEALS & ODOMETER AUDIT */}
                  {tripDetailsTab === 'AUDIT_SEALS' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Odometer Details */}
                        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                            <Gauge className="w-4 h-4 text-purple-500" />
                            <span>Odometer & Journey Mileage</span>
                          </h4>
                          <div className="text-xs space-y-1.5 pt-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Departure Odometer:</span>
                              <span className="font-mono font-bold">{viewingTripDetails.start_odometer ? `${viewingTripDetails.start_odometer} KM` : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Arrival Final Odometer:</span>
                              <span className="font-mono font-bold">{viewingTripDetails.end_odometer ? `${viewingTripDetails.end_odometer} KM` : 'Pending'}</span>
                            </div>
                            {viewingTripDetails.start_odometer && viewingTripDetails.end_odometer && (
                              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-slate-500 font-bold">Total Transit KM:</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {Math.max(0, Number(viewingTripDetails.end_odometer) - Number(viewingTripDetails.start_odometer)).toLocaleString()} KM
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Security Seal Details */}
                        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4 text-indigo-500" />
                            <span>Container / Body Security Seals</span>
                          </h4>
                          <div className="text-xs space-y-1.5 pt-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Dispatch Seal #:</span>
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {viewingTripDetails.dispatches?.[0]?.seal_number || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Arrival Seal Inspection:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {viewingTripDetails.remarks?.includes('Seal #') ? 'Recorded on gate entry' : 'Verified'}
                              </span>
                            </div>
                            {viewingTripDetails.remarks && (
                              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                                <span className="font-bold block text-slate-700 dark:text-slate-200 mb-0.5">Audit Log / Remarks:</span>
                                {viewingTripDetails.remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. MODAL FOOTER */}
                <div
                  className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                    isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Trip Mode:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {viewingTripDetails.trip_mode === 'DIRECT_VEHICLE_HIRE' ? 'Dedicated Placement' : 'Consolidated Freight'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {viewingTripDetails.settlement_status === 'SETTLED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenSettledSlip(viewingTripDetails);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>View Settlement Slip</span>
                      </button>
                    )}

                    {isAdmin && viewingTripDetails.settlement_status !== 'SETTLED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenAddAdvanceOrExp(viewingTripDetails);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-xs font-bold text-blue-600 dark:text-cyan-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Adv / Exp</span>
                      </button>
                    )}

                    {isAdmin && viewingTripDetails.settlement_status !== 'SETTLED' && viewingTripDetails.status === 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingTripDetails(null);
                          handleOpenSettleModal(viewingTripDetails);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Settle Trip</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setViewingTripDetails(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Modal>

        </main>
      </div>
    </div>
  );
}
