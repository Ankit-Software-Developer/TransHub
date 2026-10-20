// frontend/app/(owner)/bookings/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { useTerminology } from '../../../hooks/useTerminology';
import { useOperationsType } from '../../../hooks/useOperationsType';
import { useStore } from '../../../store/useStore';
import BuiltyTypeBadge from '../../../components/ui/BuiltyTypeBadge';
import api from '../../../services/api';
import {
  FileText,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  Download,
  Printer,
  Truck,
  Train,
  Plane,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Building2,
  Package,
  Layers,
  IndianRupee,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Check,
  RotateCw,
  RotateCcw,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  User,
  Users,
  UserCheck,
  Phone,
  QrCode,
  Info,
  Globe,
  Lock
} from 'lucide-react';
import DataTable from '../../../components/ui/DataTable';
import Barcode from '../../../components/ui/Barcode';
import DateRangeFilter from '../../../components/ui/DateRangeFilter';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';
import ExportDateRangeModal from '../../../components/bookings/ExportDateRangeModal';
import { usePermissions } from '../../../hooks/usePermissions';

const FTL_STANDARD_VEHICLES = [
  '32 FT Multi-Axle (14-18 Ton)',
  '32 FT Single Axle (7-9 Ton)',
  '20 FT Container',
  '24 FT Container',
  '32 FT Container (HQ / SXL / MXL)',
  '14 FT Canter (3.5-4 Ton)',
  '17 FT Canter (5 Ton)',
  '19 FT Canter (7 Ton)',
  '40 FT Trailer (Flatbed / High Bed)',
  'Tata Ace / Pick-up (1-1.5 Ton)'
];

const numberToWordsIndian = (num) => {
  if (num === null || num === undefined || isNaN(num) || Number(num) === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  };

  let integerPart = Math.floor(Math.abs(Number(num) || 0));
  let paisePart = Math.round((Math.abs(Number(num) || 0) - integerPart) * 100);

  let words = '';

  if (integerPart >= 10000000) {
    const crore = Math.floor(integerPart / 10000000);
    words += inWords(crore) + ' Crore ';
    integerPart %= 10000000;
  }
  if (integerPart >= 100000) {
    const lakh = Math.floor(integerPart / 100000);
    words += inWords(lakh) + ' Lakh ';
    integerPart %= 100000;
  }
  if (integerPart >= 1000) {
    const thousand = Math.floor(integerPart / 1000);
    words += inWords(thousand) + ' Thousand ';
    integerPart %= 1000;
  }
  if (integerPart >= 100) {
    const hundred = Math.floor(integerPart / 100);
    words += inWords(hundred) + ' Hundred ';
    integerPart %= 100;
  }
  if (integerPart > 0) {
    if (words !== '') words += 'and ';
    words += inWords(integerPart) + ' ';
  }

  words = words.trim() + ' Rupees';
  if (paisePart > 0) {
    words += ' and ' + inWords(paisePart) + ' Paise';
  }
  return words + ' Only';
};

const mapConsignmentFromApi = (c) => {
  const statusToneMap = {
    IN_TRANSIT: 'cyan',
    DISPATCHED: 'cyan',
    DELIVERED: 'emerald',
    DELAYED: 'rose',
    OUT_FOR_DELIVERY: 'amber',
    CANCELLED: 'rose',
    BOOKED: 'purple',
    RECEIVED_AT_HUB: 'blue',
    REACHED_DESTINATION: 'teal',
    LOADED: 'indigo',
    READY_FOR_DISPATCH: 'violet',
  };
  const statusLabelMap = {
    IN_TRANSIT: 'In Transit',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    DELAYED: 'Delayed',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    CANCELLED: 'Cancelled',
    BOOKED: 'Booked / Godown',
    RECEIVED_AT_HUB: 'At Hub (Transshipment)',
    REACHED_DESTINATION: 'Reached Destination',
    LOADED: 'Loaded',
    READY_FOR_DISPATCH: 'Ready for Dispatch',
  };

  const status = c.status || 'BOOKED';
  const originBranchCode = c.originBranch?.branch_code || c.fromBranch?.branch_code;
  const destBranchCode = c.destBranch?.branch_code || c.toBranch?.branch_code;
  const originCity = c.origin_city || (c.originBranch?.city) || 'Delhi';
  const destCity = c.destination_city || (c.destBranch?.city) || 'Mumbai';

  const originCode = originBranchCode || originCity.slice(0, 3).toUpperCase();
  const destCode = destBranchCode || destCity.slice(0, 3).toUpperCase();

  const currentBranch = c.currentBranch || (['REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(status) ? c.destBranch : c.originBranch);
  const currentBranchCode = c.currentBranch?.branch_code || currentBranch?.branch_code || (['REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(status) ? destCode : originCode);
  const currentBranchName = c.currentBranch?.branch_name || currentBranch?.branch_name || (['REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(status) ? (c.destBranch?.branch_name || destCity) : (c.originBranch?.branch_name || originCity));

  const resolvedVehicle = c.vehicle_number || (c.active_trip?.vehicle?.vehicle_number) || (c.trips?.[0]?.vehicle?.vehicle_number) || 'Unassigned';
  const resolvedDriver = c.driver_name || (c.active_trip?.driver?.name) || (c.trips?.[0]?.driver?.name) || 'Pending Allocation';
  const resolvedDriverPhone = c.driver_phone || (c.active_trip?.driver?.phone) || (c.trips?.[0]?.driver?.phone) || '';
  const resolvedTripNumber = c.trip_number || (c.active_trip?.trip_number) || (c.trips?.[0]?.trip_number) || null;

  let presentLocationType = 'ORIGIN_GODOWN';
  let presentLocationTitle = '';
  let presentLocationDetail = '';

  if (['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(status)) {
    presentLocationType = 'DELIVERED';
    presentLocationTitle = `Delivered to Receiver`;
    presentLocationDetail = `${c.consignee?.name || 'Receiver'} • ${destCity}`;
  } else if (['OUT_FOR_DELIVERY'].includes(status)) {
    presentLocationType = 'OUT_FOR_DELIVERY';
    presentLocationTitle = `Out for Local Delivery`;
    presentLocationDetail = `${destCity} ${resolvedDriver !== 'Pending Allocation' ? `(Driver: ${resolvedDriver})` : ''}`;
  } else if (['REACHED_DESTINATION'].includes(status)) {
    presentLocationType = 'DEST_GODOWN';
    presentLocationTitle = `At Dest Branch [${destCode}]`;
    presentLocationDetail = `${c.destBranch?.branch_name || destCity} Godown`;
  } else if (['IN_TRANSIT', 'DISPATCHED', 'ON_TRIP'].includes(status)) {
    presentLocationType = 'IN_TRANSIT';
    presentLocationTitle = `In Transit on Highway`;
    presentLocationDetail = `${resolvedVehicle !== 'Unassigned' ? `Vehicle: ${resolvedVehicle}` : 'Line-haul Truck'}${resolvedTripNumber ? ` (Trip: ${resolvedTripNumber})` : ''}`;
  } else if (status === 'RECEIVED_AT_HUB') {
    presentLocationType = 'TRANSIT_HUB';
    presentLocationTitle = `At Transit Hub [${currentBranchCode}]`;
    presentLocationDetail = `${currentBranchName} Dock`;
  } else {
    presentLocationType = 'ORIGIN_GODOWN';
    presentLocationTitle = `At Origin Branch [${originCode}]`;
    presentLocationDetail = `${c.originBranch?.branch_name || originCity} Godown`;
  }

  return {
    id: c.id,
    booking_id: c.booking_id ? (c.booking_id.startsWith('BKG') ? c.booking_id : `BKG-${c.booking_id.slice(0, 8)}`) : 'BKG-DIRECT',
    lr_number: c.docket_number || c.lr_number || `CSN-${(c.id || '').slice(0, 8).toUpperCase()}`,
    load_type: (c.load_type || 'PTL').toUpperCase() === 'FTL' ? 'FTL' : 'PTL',
    booking_date: c.booking_date ? new Date(c.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
    raw_booking_date: c.booking_date || new Date().toISOString().slice(0, 10),
    origin_city: originCity,
    destination_city: destCity,
    origin_branch: c.originBranch,
    dest_branch: c.destBranch,
    current_branch: currentBranch,
    origin_branch_code: originCode,
    dest_branch_code: destCode,
    current_branch_code: currentBranchCode,
    origin_branch_name: c.originBranch?.branch_name || originCity,
    dest_branch_name: c.destBranch?.branch_name || destCity,
    current_branch_name: currentBranchName,
    present_location_type: presentLocationType,
    present_location_title: presentLocationTitle,
    present_location_detail: presentLocationDetail,
    route_code: `${originCode} ➔ ${destCode}`,
    consignor_id: c.consignor_id || c.consignor?.id,
    consignee_id: c.consignee_id || c.consignee?.id,
    consignor_name: c.consignor_name || c.consignor?.name,
    consignee_name: c.consignee_name || c.consignee?.name,
    consignor_phone: c.consignor_phone || c.consignor?.phone,
    consignee_phone: c.consignee_phone || c.consignee?.phone,
    consignor_address: c.consignor_address || c.consignor?.billing_address || c.consignor?.address || c.pickup_address,
    consignee_address: c.consignee_address || c.consignee?.billing_address || c.consignee?.address || c.delivery_address,
    consignor_gstin: c.consignor_gstin || c.consignor?.gstin,
    consignee_gstin: c.consignee_gstin || c.consignee?.gstin,
    consignor: {
      id: c.consignor_id || c.consignor?.id,
      name: c.consignor?.name || c.consignor_name || c.consignorName || (c.consignor_id ? undefined : 'Commercial Consignor'),
      segment: 'Commercial Freight',
      city: c.consignor?.city || c.consignor_city || c.consignorCity || originCity,
      phone: c.consignor?.phone || c.consignor_phone || c.consignorPhone || '',
      address: c.consignor?.billing_address || c.consignor?.address || c.consignor_address || c.consignorAddress || c.pickup_address || '',
      gstin: c.consignor?.gstin || c.consignor_gstin || c.consignorGstin || '',
    },
    consignee: {
      id: c.consignee_id || c.consignee?.id,
      name: c.consignee?.name || c.consignee_name || c.consigneeName || (c.consignee_id ? undefined : 'Commercial Consignee'),
      segment: 'Receiving Depot',
      city: c.consignee?.city || c.consignee_city || c.consigneeCity || destCity,
      phone: c.consignee?.phone || c.consignee_phone || c.consigneePhone || '',
      address: c.consignee?.billing_address || c.consignee?.address || c.consignee_address || c.consigneeAddress || c.delivery_address || '',
      gstin: c.consignee?.gstin || c.consignee_gstin || c.consigneeGstin || '',
    },
    cargo_type: c.material_description || 'General Goods',
    packages_count: c.packages_count || 1,
    charged_weight: parseFloat(c.charged_weight || c.actual_weight || 0),
    actual_weight: parseFloat(c.actual_weight || 0),
    rate: parseFloat(c.rate || 0),
    freight_amount: parseFloat(c.freight_amount || 0),
    loading_charges: parseFloat(c.loading_charges || 0),
    unloading_charges: parseFloat(c.unloading_charges || 0),
    handling_charges: parseFloat(c.handling_charges || 0),
    hamali_charges: parseFloat(c.hamali_charges || 0),
    door_delivery_charges: parseFloat(c.door_delivery_charges || 0),
    other_charges: parseFloat(c.other_charges || 0),
    tax_percent: parseFloat(c.tax_percent || 0),
    tax_amount: parseFloat(c.tax_amount || 0),
    discount_amount: parseFloat(c.discount_amount || 0),
    vehicle_number: resolvedVehicle,
    vehicle_type: c.vehicle_type || (c.active_trip?.vehicle?.vehicle_type) || (c.trips?.[0]?.vehicle?.vehicle_type) || 'Scheduled Line-haul',
    driver_name: resolvedDriver,
    driver_phone: resolvedDriverPhone,
    trip_number: resolvedTripNumber,
    transport_mode: c.transport_mode || 'ROAD',
    delivery_type: c.delivery_type || (parseFloat(c.door_delivery_charges || 0) > 0 ? 'DOOR_DELIVERY' : 'GODOWN_DELIVERY'),
    total_amount: parseFloat(c.total_amount || c.freight_amount || 0),
    payment_mode: c.payment_type || 'TO_PAY',
    status: status,
    status_label: statusLabelMap[status] || status,
    status_tone: statusToneMap[status] || 'purple',
    current_milestone: status === 'DELIVERED'
      ? 'Receiver Signed with Stamp'
      : status === 'IN_TRANSIT' || status === 'DISPATCHED'
        ? 'In Line-haul Highway Transit'
        : status === 'OUT_FOR_DELIVERY'
          ? 'Out for Local Delivery'
          : status === 'RECEIVED_AT_HUB'
            ? 'Received at Transshipment Hub (Staged for Next Leg)'
            : status === 'REACHED_DESTINATION'
              ? 'Arrived at Destination Branch (Ready for Delivery)'
              : 'Staged at Origin Warehouse Dock',
    eta: status === 'DELIVERED' ? 'Delivered' : status === 'REACHED_DESTINATION' ? 'Ready for Delivery' : 'ETA in 24-48 Hours',
    progress_percent: status === 'DELIVERED' ? 100 : status === 'OUT_FOR_DELIVERY' ? 90 : status === 'REACHED_DESTINATION' ? 80 : status === 'RECEIVED_AT_HUB' ? 50 : status === 'IN_TRANSIT' || status === 'DISPATCHED' ? 65 : 15,
  };
};

// Helper to match customer to nearest branch based on assigned branch, PIN code, or city location
const getNearestBranchForCustomer = (customer, branchList) => {
  if (!customer || !branchList || branchList.length === 0) return null;

  // 1. Direct assigned branch
  const directBranchId = customer.branch_id || customer.branch?.id;
  if (directBranchId) {
    const found = branchList.find((b) => b.id === directBranchId);
    if (found) return found;
  }

  const cleanPin = (customer.pincode || '').replace(/\D/g, '');
  const cleanCity = (customer.city || '').trim().toLowerCase();

  if (!cleanPin && !cleanCity) {
    return branchList.find((b) => b.is_hub) || branchList[0];
  }

  let best = null;
  let maxScore = -1;

  for (const b of branchList) {
    let score = 0;
    const bCity = (b.city || '').toLowerCase();
    const bPin = (b.pincode || '').replace(/\D/g, '');

    // 1. Exact 6-digit Pincode match
    if (cleanPin && bPin && cleanPin === bPin) {
      score += 1500;
    }
    // 2. 4-digit Pincode cluster match
    else if (cleanPin.length >= 4 && bPin.length >= 4 && cleanPin.slice(0, 4) === bPin.slice(0, 4)) {
      score += 1000;
    }
    // 3. 3-digit Pincode district match
    else if (cleanPin.length >= 3 && bPin.length >= 3 && cleanPin.slice(0, 3) === bPin.slice(0, 3)) {
      score += 700;
    }
    // 4. 2-digit Pincode state circle match
    else if (cleanPin.length >= 2 && bPin.length >= 2 && cleanPin.slice(0, 2) === bPin.slice(0, 2)) {
      score += 400;
    }
    // 5. 1-digit Pincode postal zone match
    else if (cleanPin.length >= 1 && bPin.length >= 1 && cleanPin.slice(0, 1) === bPin.slice(0, 1)) {
      score += 150;
    }

    // Continuous numerical PIN distance proximity (closer PIN in India = higher score)
    if (cleanPin.length === 6 && bPin.length === 6) {
      const pinDiff = Math.abs(parseInt(cleanPin, 10) - parseInt(bPin, 10));
      // Proximity score: if diff is 0 -> 500, if diff is 10000 -> 450, etc.
      const proximityBonus = Math.max(0, 500 - Math.floor(pinDiff / 200));
      score += proximityBonus;
    }

    // 6. Direct City match
    if (cleanCity && bCity && (cleanCity === bCity || bCity.includes(cleanCity) || cleanCity.includes(bCity))) {
      score += 600;
    }

    // 7. Metro regional zones
    const isDelhiNCR = /delhi|gurugram|gurgaon|noida|faridabad|ghaziabad/i.test(cleanCity);
    const isBranchDelhiNCR = /delhi|gurugram|gurgaon|noida|faridabad|ghaziabad/i.test(bCity) || /delhi/i.test(b.branch_name);
    if (isDelhiNCR && isBranchDelhiNCR) score += 500;

    const isBlr = /bengaluru|bangalore/i.test(cleanCity);
    const isBranchBlr = /bengaluru|bangalore/i.test(bCity) || /bengaluru|bangalore/i.test(b.branch_name);
    if (isBlr && isBranchBlr) score += 500;

    const isMum = /mumbai|thane|bhiwandi|navi mumbai/i.test(cleanCity);
    const isBranchMum = /mumbai|thane|bhiwandi|navi mumbai/i.test(bCity) || /mumbai/i.test(b.branch_name);
    if (isMum && isBranchMum) score += 500;

    if (b.is_hub && score > 0) score += 30;

    if (score > maxScore) {
      maxScore = score;
      best = b;
    }
  }

  return best || (branchList.find((b) => b.is_hub) || branchList[0]);
};

// Custom Professional Branch / Hub Dropdown for Bookings Modal (Portaled to render cleanly over footer)
function BranchSelectDropdown({
  label,
  required = true,
  selectedBranchId,
  onSelect,
  branches = [],
  placeholder = '-- Select Hub / Branch --',
  isDark = true,
  addHubLink = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const [coords, setCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
    opensUpward: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 800);
      const viewportWidth = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 1200);

      // Distance from button to edges of screen
      const spaceBelow = viewportHeight - rect.bottom - 12; // 12px safety gap to screen bottom/taskbar
      const spaceAbove = rect.top - 12; // 12px safety gap to screen top

      // Flip upward if space below is too small (< 220px) and there's more space above
      const opensUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

      // Available space in chosen direction
      const availableSpace = opensUpward ? spaceAbove : spaceBelow;
      // Responsive max height capped between 130px and 240px, never exceeding available screen space
      const responsiveMaxHeight = Math.max(130, Math.min(240, Math.floor(availableSpace)));

      const dropdownWidth = Math.max(rect.width, 300);
      // Ensure dropdown does not overflow horizontally off screen
      const clampedLeft = Math.max(8, Math.min(rect.left, viewportWidth - dropdownWidth - 8));

      setCoords({
        top: opensUpward ? 0 : rect.bottom + 5,
        bottom: opensUpward ? viewportHeight - rect.top + 5 : 0,
        left: clampedLeft,
        width: dropdownWidth,
        maxHeight: responsiveMaxHeight,
        opensUpward,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    function handleClickOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownMenuRef.current && !dropdownMenuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updateCoords();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
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

  return (
    <div className="space-y-1.5 relative z-10">
      {label && (
        <div className="flex items-center justify-between">
          <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <span>{label}</span>
            {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
          </label>
          {addHubLink && (
            <Link
              href="/branches"
              target="_blank"
              className={`text-[10px] font-semibold flex items-center gap-0.5 ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                }`}
            >
              <span>+ Add Hub</span>
            </Link>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updateCoords();
          setIsOpen((prev) => !prev);
        }}
        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer text-left ${isDark
            ? 'border-slate-800 bg-slate-900/80 text-white hover:border-slate-700'
            : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300'
          } ${isOpen ? (isDark ? 'ring-2 ring-cyan-500/40 border-cyan-500' : 'ring-2 ring-blue-500/40 border-blue-500') : ''}`}
      >
        {selectedBranch ? (
          <div className="flex items-center justify-between min-w-0 flex-1 mr-2 text-xs gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
              <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
              <span className="font-bold truncate">{selectedBranch.branch_name}</span>
              {selectedBranch.is_hub && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  HUB
                </span>
              )}
              <span className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                — {selectedBranch.city} {selectedBranch.pincode ? `[PIN: ${selectedBranch.pincode}]` : ''}
              </span>
            </div>
            {selectedBranch.branch_code && (
              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 border ${
                isDark
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                [{selectedBranch.branch_code}]
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-xs">{placeholder}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>

      {/* Floating Dropdown Menu Portaled to document.body to render cleanly with solid background and screen-responsive height */}
      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownMenuRef}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 99999,
            ...(coords.opensUpward
              ? { bottom: `${coords.bottom}px`, top: 'auto' }
              : { top: `${coords.top}px`, bottom: 'auto' }),
          }}
          className={`flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-all duration-100 ${isDark
              ? 'bg-slate-900 border-slate-700 text-white shadow-black/80'
              : 'bg-white border-slate-300 text-slate-900 shadow-slate-900/25'
            }`}
        >
          {/* Search box inside dropdown (Sticky header) */}
          <div className={`p-2 px-3 border-b flex items-center gap-2 shrink-0 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search branch name, code, city, PIN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full text-xs bg-transparent focus:outline-none ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Branch list (Solid background, dynamic responsive scroll) */}
          <div className={`flex-1 min-h-0 overflow-y-auto divide-y ${isDark ? 'divide-slate-800 bg-slate-900' : 'divide-slate-100 bg-white'
            }`}>
            {/* Unassign / Default option */}
            <div
              onClick={() => {
                onSelect('', '');
                setIsOpen(false);
              }}
              className={`p-2.5 px-3.5 cursor-pointer text-xs transition-colors flex items-center justify-between ${!selectedBranchId
                  ? isDark ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-blue-50 text-blue-800 font-bold'
                  : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'
                }`}
            >
              <span>{placeholder}</span>
              {!selectedBranchId && <Check className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />}
            </div>

            {filteredBranches.length > 0 ? (
              filteredBranches.map((b) => {
                const isSelected = selectedBranchId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelect(b.id, b.city || '');
                      setIsOpen(false);
                    }}
                    className={`p-2.5 px-3.5 cursor-pointer transition-colors flex items-center justify-between gap-2 ${isSelected
                        ? isDark ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-blue-50 text-blue-900 font-bold'
                        : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                      <span className="text-xs font-bold truncate">{b.branch_name}</span>
                      {b.is_hub && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                          HUB
                        </span>
                      )}
                      <span className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        — {b.city} {b.pincode ? `[PIN: ${b.pincode}]` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {b.branch_code && (
                        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 border ${
                          isDark
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          [{b.branch_code}]
                        </span>
                      )}
                      {isSelected && (
                        <Check className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No branch or hub found matching &quot;{query}&quot;
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function FtlVehicleSelectDropdown({
  value,
  onChange,
  vehiclesList = [],
  isDark = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('FLEET'); // 'FLEET' | 'CUSTOM'
  const [customInput, setCustomInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const [coords, setCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    maxHeight: 340,
    opensUpward: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 800);
      const viewportWidth = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 1200);

      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const opensUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
      const availableSpace = opensUpward ? spaceAbove : spaceBelow;
      const responsiveMaxHeight = Math.max(200, Math.min(360, Math.floor(availableSpace)));

      const dropdownWidth = Math.max(rect.width, 380);
      const clampedLeft = Math.max(8, Math.min(rect.left, viewportWidth - dropdownWidth - 8));

      setCoords({
        top: opensUpward ? 0 : rect.bottom + 6,
        bottom: opensUpward ? viewportHeight - rect.top + 6 : 0,
        left: clampedLeft,
        width: dropdownWidth,
        maxHeight: responsiveMaxHeight,
        opensUpward,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    function handleClickOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownMenuRef.current && !dropdownMenuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updateCoords();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const filteredFleet = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return vehiclesList;
    return vehiclesList.filter((v) => {
      const num = (v.vehicle_number || '').toLowerCase();
      const type = (v.vehicle_type || '').toLowerCase();
      const cap = String(v.capacity_ton || '');
      const owner = (v.ownership_type || '').toLowerCase();
      return num.includes(q) || type.includes(q) || cap.includes(q) || owner.includes(q);
    });
  }, [vehiclesList, query]);

  // Determine display representation for selected vehicle
  const renderSelectedDisplay = () => {
    if (!value) {
      return <span className="text-slate-400 text-xs">-- Select Company Vehicle or Enter Custom --</span>;
    }

    const matchedFleet = vehiclesList.find((v) => value.startsWith(v.vehicle_number));
    if (matchedFleet) {
      const ownership = matchedFleet.ownership_type === 'ATTACHED' ? 'Attached' : 'Company Fleet';
      return (
        <div className="flex items-center gap-2 truncate">
          <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-mono font-bold text-xs truncate">{matchedFleet.vehicle_number}</span>
          <span className="text-slate-400 text-xs shrink-0">—</span>
          <span className="text-xs truncate">{matchedFleet.vehicle_type || 'Vehicle'} {matchedFleet.capacity_ton ? `(${matchedFleet.capacity_ton}T)` : ''}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
            matchedFleet.ownership_type === 'ATTACHED'
              ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
          }`}>
            {ownership}
          </span>
        </div>
      );
    }

    // It's a custom vehicle
    return (
      <div className="flex items-center gap-2 truncate">
        <Pencil className="w-3.5 h-3.5 text-purple-500 shrink-0" />
        <span className="font-bold text-xs truncate">{value}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
          Custom
        </span>
      </div>
    );
  };

  const handleApplyCustom = () => {
    const trimmed = (customInput || '').trim();
    if (trimmed) {
      onChange(trimmed);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery('');
          if (value && !vehiclesList.some((v) => value.startsWith(v.vehicle_number))) {
            setCustomInput(value);
            setActiveTab('CUSTOM');
          } else {
            setActiveTab('FLEET');
          }
        }}
        className={`w-full h-11 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
          isDark
            ? 'border-purple-500/40 bg-slate-900/90 text-white hover:border-purple-400'
            : 'border-purple-300 bg-white text-slate-800 hover:border-purple-400 shadow-xs'
        }`}
      >
        <div className="min-w-0 flex-1 text-left truncate mr-2">
          {renderSelectedDisplay()}
        </div>
        <ChevronDown className={`w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown Menu (Portaled to document.body) */}
      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownMenuRef}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 99999,
            ...(coords.opensUpward
              ? { bottom: `${coords.bottom}px`, top: 'auto' }
              : { top: `${coords.top}px`, bottom: 'auto' }),
          }}
          className={`flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all duration-100 ${
            isDark
              ? 'bg-[#0f172a] border-slate-700/80 text-white shadow-black/80'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
          }`}
        >
          {/* Filter Tabs (Only 2 options: Company Fleet and Custom) */}
          <div className={`grid grid-cols-2 p-1.5 gap-1.5 border-b text-xs font-bold shrink-0 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/80 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('FLEET')}
              className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'FLEET'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <span>🏢 Company Fleet</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'FLEET' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {vehiclesList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('CUSTOM');
                if (!customInput && value && !vehiclesList.some((v) => value.startsWith(v.vehicle_number))) {
                  setCustomInput(value);
                }
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'CUSTOM'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <span>✍️ Custom Vehicle</span>
            </button>
          </div>

          {/* TAB 1: Company Fleet */}
          {activeTab === 'FLEET' && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Search Header */}
              <div className={`p-2.5 px-3 border-b flex items-center gap-2 shrink-0 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search truck number, body type, capacity..."
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
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Scrollable Fleet List */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                {filteredFleet.length > 0 ? (
                  filteredFleet.map((v) => {
                    const ownership = v.ownership_type === 'ATTACHED' ? 'Attached' : 'Company Fleet';
                    const itemVal = `${v.vehicle_number} — ${v.vehicle_type || 'Vehicle'}${v.capacity_ton ? ` (${v.capacity_ton} Ton)` : ''} • [${ownership}]`;
                    const isSelected = value === itemVal || (value && value.startsWith(v.vehicle_number));
                    return (
                      <div
                        key={v.id || v.vehicle_number}
                        onClick={() => {
                          onChange(itemVal);
                          setIsOpen(false);
                        }}
                        className={`p-2.5 px-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-2.5 my-0.5 ${
                          isSelected
                            ? isDark ? 'bg-purple-600/20 text-purple-300 font-bold' : 'bg-purple-50 text-purple-900 font-bold'
                            : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                          <Truck className={`w-4 h-4 shrink-0 ${isSelected ? 'text-purple-500' : 'text-emerald-500'}`} />
                          <span className="font-mono font-bold text-xs shrink-0">{v.vehicle_number}</span>
                          <span className="text-slate-400 text-xs shrink-0">—</span>
                          <span className="text-xs truncate">{v.vehicle_type || 'Vehicle'} {v.capacity_ton ? `(${v.capacity_ton} Ton)` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            v.ownership_type === 'ATTACHED'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                          }`}>
                            {ownership}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                    <p>No company fleet vehicle matching &quot;{query}&quot;</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('CUSTOM')}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-bold text-xs cursor-pointer inline-block mt-2"
                    >
                      ✍️ Enter Custom Vehicle Instead →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Vehicle Entry */}
          {activeTab === 'CUSTOM' && (
            <div className="p-4 space-y-3">
              <div>
                <label className={`text-xs font-bold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Enter Custom Vehicle Specification / Reg. No:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. DL01AB1234 — 32 FT Multi-Axle..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCustom();
                      }
                    }}
                    className={`w-full h-11 px-3.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                      isDark
                        ? 'border-purple-500/40 bg-slate-950 text-white placeholder-slate-500 focus:border-purple-400'
                        : 'border-purple-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:bg-white'
                    }`}
                  />
                </div>
                <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  💡 Specify custom truck registration number or container dimensions.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('FLEET')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!customInput.trim()}
                  onClick={handleApplyCustom}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                    customInput.trim()
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/30 active:scale-95'
                      : 'bg-slate-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  Apply Custom Vehicle ➔
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function BookingsMasterPage() {
  const { theme } = useTheme();
  const { term, plural, newDocLabel } = useTerminology();
  const { isOnlyFTL, isOnlyPTL, isBoth } = useOperationsType();
  const activeBranch = useStore((state) => state.activeBranch);

  const isDark = theme === 'dark';
  const { canEdit, canDelete, canExport, isAdmin, canCreateBooking } = usePermissions();

  // Server-side Pagination & Sorting State
  const [branchesList, setBranchesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [consignments, setConsignments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('booking_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loadTypeFilter, setLoadTypeFilter] = useState(() => (isOnlyFTL ? 'FTL' : isOnlyPTL ? 'PTL' : 'ALL'));

  useEffect(() => {
    if (isOnlyFTL) setLoadTypeFilter('FTL');
    else if (isOnlyPTL) setLoadTypeFilter('PTL');
  }, [isOnlyFTL, isOnlyPTL]);
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    pending: 0,
    forDelivery: 0,
    reachedDest: 0,
    inTransit: 0,
    delivered: 0,
    delayed: 0,
  });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(30);
  const [isAutoClosePaused, setIsAutoClosePaused] = useState(false);


  const [isLoading, setIsLoading] = useState(true);

  // Edit Docket State
  const [editingDocket, setEditingDocket] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    docketNumber: '',
    consignorName: '',
    consignorCity: '',
    consigneeName: '',
    consigneeCity: '',
    originCity: '',
    destinationCity: '',
    originBranchId: '',
    destBranchId: '',
    originBranchCode: '',
    destBranchCode: '',
    cargoType: '',
    packagesCount: '10',
    weightKg: '500',
    ratePerKg: '18',
    loadingCharges: '450',
    unloadingCharges: '0',
    doorDeliveryCharges: '0',
    otherCharges: '0',
    customCharges: [], // Array of { id, name, amount }
    discountAmount: '0',
    taxPercent: '0',
    totalAmount: '9450',
    paymentMode: 'TO_PAY',
    transportMode: 'ROAD',
    deliveryType: 'GODOWN_DELIVERY',
    status: 'BOOKED',
  });

  // Dynamically resolve Origin and Destination Branch Codes
  const resolvedOriginCode = useMemo(() => {
    if (editFormData.originBranchCode) return editFormData.originBranchCode;
    if (editFormData.originBranchId) {
      const b = branchesList.find((item) => item.id === editFormData.originBranchId);
      if (b?.branch_code) return b.branch_code;
    }
    if (editFormData.originCity) {
      const b = branchesList.find((item) =>
        (item.city && item.city.toLowerCase() === editFormData.originCity.toLowerCase()) ||
        (item.branch_name && item.branch_name.toLowerCase() === editFormData.originCity.toLowerCase()) ||
        (item.branch_code && item.branch_code.toLowerCase() === editFormData.originCity.toLowerCase())
      );
      if (b?.branch_code) return b.branch_code;
    }
    if (editingDocket?.origin_branch_code) return editingDocket.origin_branch_code;
    if (editingDocket?.originBranch?.branch_code) return editingDocket.originBranch.branch_code;
    return editFormData.originCity ? editFormData.originCity.slice(0, 3).toUpperCase() : 'HUB';
  }, [editFormData.originBranchCode, editFormData.originBranchId, editFormData.originCity, branchesList, editingDocket]);

  const resolvedDestCode = useMemo(() => {
    if (editFormData.destBranchCode) return editFormData.destBranchCode;
    if (editFormData.destBranchId) {
      const b = branchesList.find((item) => item.id === editFormData.destBranchId);
      if (b?.branch_code) return b.branch_code;
    }
    if (editFormData.destinationCity) {
      const b = branchesList.find((item) =>
        (item.city && item.city.toLowerCase() === editFormData.destinationCity.toLowerCase()) ||
        (item.branch_name && item.branch_name.toLowerCase() === editFormData.destinationCity.toLowerCase()) ||
        (item.branch_code && item.branch_code.toLowerCase() === editFormData.destinationCity.toLowerCase())
      );
      if (b?.branch_code) return b.branch_code;
    }
    if (editingDocket?.dest_branch_code) return editingDocket.dest_branch_code;
    if (editingDocket?.destBranch?.branch_code) return editingDocket.destBranch.branch_code;
    return editFormData.destinationCity ? editFormData.destinationCity.slice(0, 3).toUpperCase() : 'DST';
  }, [editFormData.destBranchCode, editFormData.destBranchId, editFormData.destinationCity, branchesList, editingDocket]);

  // Delete Docket State
  const [deletingDocket, setDeletingDocket] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Bilty Print Preview Modal State
  const user = useStore((state) => state.user);
  const userBranchId = user?.branch_id || user?.branchId || user?.branch?.id || null;
  const isGlobalUser = isAdmin || isSuperAdmin;
  const isRestrictedBranchUser = !isGlobalUser && !!userBranchId;
  const setActiveBranch = useStore((state) => state.setActiveBranch);

  const resolveStoreBranchId = (val) => {
    if (!val) return 'ALL';
    if (typeof val === 'object') {
      if (!val.id || val.code === 'ALL' || val.id === 'ALL') return 'ALL';
      return String(val.id);
    }
    if (val === 'ALL') return 'ALL';
    return String(val);
  };

  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (isRestrictedBranchUser && userBranchId) return userBranchId;
    return resolveStoreBranchId(activeBranch);
  });

  useEffect(() => {
    if (isRestrictedBranchUser && userBranchId && selectedBranchId !== userBranchId) {
      setSelectedBranchId(userBranchId);
    }
  }, [isRestrictedBranchUser, userBranchId]);

  useEffect(() => {
    if (isAdmin && activeBranch) {
      const storeId = resolveStoreBranchId(activeBranch);
      if (storeId !== selectedBranchId) {
        setSelectedBranchId(storeId);
        setPage(1);
      }
    }
  }, [activeBranch, isAdmin]);

  const handleBranchChange = (newBranchId) => {
    setSelectedBranchId(newBranchId);
    setPage(1);
    if (newBranchId === 'ALL') {
      if (setActiveBranch) setActiveBranch({ id: null, code: 'ALL', name: 'All Branches' });
    } else {
      const bObj = branchesList.find((b) => String(b.id) === String(newBranchId));
      if (bObj && setActiveBranch) {
        setActiveBranch({ id: bObj.id, code: bObj.branch_code || 'HUB', name: bObj.branch_name || bObj.name });
      }
    }
  };

  const [printConsignment, setPrintConsignment] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintCopy, setActivePrintCopy] = useState('ALL'); // 'ALL' | 'CONSIGNOR' | 'CONSIGNEE' | 'DRIVER'

  // Auto-close details modal after 30 seconds if user does not close it
  useEffect(() => {
    if (!isDetailsOpen) {
      setAutoCloseCountdown(30);
      setIsAutoClosePaused(false);
      return;
    }

    if (isAutoClosePaused || isEditModalOpen || isDeleteModalOpen || isPrintModalOpen) {
      return;
    }

    const timer = setInterval(() => {
      setAutoCloseCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsDetailsOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDetailsOpen, isAutoClosePaused, isEditModalOpen, isDeleteModalOpen, isPrintModalOpen]);

  const handleOpenPrintPreview = (consignment) => {
    if (!consignment) return;
    let resolved = { ...consignment };

    // 1. Resolve from customersList if customer id is available
    const cId = resolved.consignor_id || resolved.consignor?.id;
    if (cId && Array.isArray(customersList)) {
      const matchCust = customersList.find(cu => cu.id === cId);
      if (matchCust?.name) {
        resolved.consignor = {
          ...resolved.consignor,
          id: cId,
          name: matchCust.name,
          phone: matchCust.phone || resolved.consignor?.phone,
          address: matchCust.billing_address || matchCust.address || resolved.consignor?.address,
          city: matchCust.city || resolved.consignor?.city,
          gstin: matchCust.gstin || resolved.consignor?.gstin,
        };
      }
    }
    const ceId = resolved.consignee_id || resolved.consignee?.id;
    if (ceId && Array.isArray(customersList)) {
      const matchCust = customersList.find(cu => cu.id === ceId);
      if (matchCust?.name) {
        resolved.consignee = {
          ...resolved.consignee,
          id: ceId,
          name: matchCust.name,
          phone: matchCust.phone || resolved.consignee?.phone,
          address: matchCust.billing_address || matchCust.address || resolved.consignee?.address,
          city: matchCust.city || resolved.consignee?.city,
          gstin: matchCust.gstin || resolved.consignee?.gstin,
        };
      }
    }

    // 2. If consignor or consignee name is still placeholder or missing, try resolving from active consignments list
    if ((!resolved.consignor?.name || resolved.consignor.name === 'Consignor Shipper' || !resolved.consignee?.name || resolved.consignee.name === 'Consignee Receiver') && Array.isArray(consignments)) {
      const match = consignments.find(c => c.id === consignment.id || c.lr_number === (consignment.docket_number || consignment.lr_number));
      if (match) {
        if (match.consignor?.name && match.consignor.name !== 'Consignor Shipper') {
          resolved.consignor = match.consignor;
        }
        if (match.consignee?.name && match.consignee.name !== 'Consignee Receiver') {
          resolved.consignee = match.consignee;
        }
      }
    }
    setPrintConsignment(resolved);
    setIsPrintModalOpen(true);
  };

  // Renders a single official Indian transport bilty slip sheet
  const renderBiltySlipSheet = (c, copyType = 'CONSIGNOR') => {
    if (!c) return null;

    const companyBrand = user?.businessName || user?.organizationName || (typeof window !== 'undefined' ? localStorage.getItem('transporter_brand_name') : null) || 'Balaji Logistics';
    const companyLogo = user?.logoUrl || (typeof window !== 'undefined' ? localStorage.getItem('transporter_logo') : null);
    const companyAddress = user?.address || 'Plot 42, Transport Nagar, Phase-II, New Delhi - 110042';
    const companyPhone = user?.phone || user?.mobile || '+91 98765 43210';
    const companyEmail = user?.email || 'operations@balajilogistics.in';
    const companyGstin = user?.gstin || '07AABCB1234F1Z8';
    const companyPan = user?.pan || 'AABCB1234F';

    const freightAmt = parseFloat(c.freight_amount || 0);
    const loadingAmt = parseFloat(c.loading_charges || c.hamali_charges || 0);
    const biltyFeeAmt = parseFloat(c.handling_charges ?? c.bilty_fee ?? 50);
    const ddcAmt = parseFloat(c.door_delivery_charges || 0);
    const otherAmt = parseFloat(c.other_charges || 0);
    const discountAmt = parseFloat(c.discount_amount || 0);
    const taxAmt = parseFloat(c.tax_amount || 0);
    const totalAmt = parseFloat(c.total_amount || (freightAmt + loadingAmt + biltyFeeAmt + ddcAmt + otherAmt - discountAmt + taxAmt) || 0);

    const isFixedPricing = c.rate_type === 'FIXED' ||
      c.pricing_mode === 'FIXED' ||
      c.ftl_pricing_mode === 'FIXED' ||
      ((c.load_type || 'PTL') === 'FTL' && (
        !c.rate ||
        parseFloat(c.rate) === 0 ||
        Math.abs(freightAmt - (parseFloat(c.charged_weight || c.actual_weight || 0) * parseFloat(c.rate || 0))) > 1
      ));

    const paymentType = (c.payment_mode || 'TO_PAY').toUpperCase();

    const resolvedConsignor = c.consignor || {};
    let consignorName = (resolvedConsignor.name && resolvedConsignor.name !== 'Consignor Shipper' && resolvedConsignor.name !== 'Commercial Consignor')
      ? resolvedConsignor.name
      : (c.consignor_name || c.consignorName);
    const cId = c.consignor_id || resolvedConsignor.id;
    if (!consignorName && cId && Array.isArray(customersList)) {
      const matchCust = customersList.find(cu => cu.id === cId);
      if (matchCust?.name) consignorName = matchCust.name;
    }
    if (!consignorName || consignorName === 'Consignor Shipper') {
      consignorName = c.consignor_name || 'Commercial Shipper';
    }

    const consignorCity = resolvedConsignor.city || c.consignor_city || c.consignorCity || c.origin_city || 'Origin City';
    const consignorPhone = resolvedConsignor.phone || c.consignor_phone || c.consignorPhone || '';
    const consignorAddress = resolvedConsignor.billing_address || resolvedConsignor.address || c.consignor_address || c.consignorAddress || c.pickup_address || '';
    const consignorGstin = resolvedConsignor.gstin || c.consignor_gstin || c.consignorGstin || '';

    const resolvedConsignee = c.consignee || {};
    let consigneeName = (resolvedConsignee.name && resolvedConsignee.name !== 'Consignee Receiver' && resolvedConsignee.name !== 'Commercial Consignee')
      ? resolvedConsignee.name
      : (c.consignee_name || c.consigneeName);
    const ceId = c.consignee_id || resolvedConsignee.id;
    if (!consigneeName && ceId && Array.isArray(customersList)) {
      const matchCust = customersList.find(cu => cu.id === ceId);
      if (matchCust?.name) consigneeName = matchCust.name;
    }
    if (!consigneeName || consigneeName === 'Consignee Receiver') {
      consigneeName = c.consignee_name || 'Commercial Consignee';
    }

    const consigneeCity = resolvedConsignee.city || c.consignee_city || c.consigneeCity || c.destination_city || 'Destination City';
    const consigneePhone = resolvedConsignee.phone || c.consignee_phone || c.consigneePhone || '';
    const consigneeAddress = resolvedConsignee.billing_address || resolvedConsignee.address || c.consignee_address || c.consigneeAddress || c.delivery_address || '';
    const consigneeGstin = resolvedConsignee.gstin || c.consignee_gstin || c.consigneeGstin || '';

    return (
      <div className="bilty-slip-sheet bg-white text-slate-900 border-2 border-slate-900 rounded-none shadow-xl p-5 sm:p-7 max-w-[860px] mx-auto text-[11px] leading-tight font-sans relative my-4">

        {/* 1. Top Legal & Statutory Strip */}
        <div className="border-b border-slate-900 pb-1 mb-2 flex items-center justify-between text-[9px] font-bold tracking-wider uppercase text-slate-600">
          <span>SUBJECT TO LOCAL JURISDICTION ONLY • PAN: {companyPan}</span>
          <span className="text-slate-800 font-extrabold">AT OWNER'S RISK • MV ACT 1988 COMPLIANT</span>
          <span>GSTIN: {companyGstin}</span>
        </div>

        {/* 2. Main Header: Transporter Info (Left) & LR / Bilty Box (Right) */}
        <div className="grid grid-cols-12 gap-3 border-b-2 border-slate-900 pb-3 items-center">

          {/* Transporter Brand */}
          <div className="col-span-7 sm:col-span-8 flex items-start space-x-3">
            <div className="w-14 h-14 rounded-lg border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-8 h-8 text-cyan-400" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-slate-950 leading-none">
                {companyBrand}
              </h1>
              <p className="text-[10px] font-extrabold text-slate-700 tracking-wide uppercase mt-0.5">
                FLEET OPERATORS & HEAVY ROAD CARGO CONTRACTORS
              </p>
              <p className="text-[9.5px] text-slate-600 mt-0.5 leading-snug">
                {companyAddress}
              </p>
              <p className="text-[9.5px] font-semibold text-slate-700 mt-0.5">
                Ph: <span className="font-mono">{companyPhone}</span> • Email: <span className="font-mono">{companyEmail}</span>
              </p>
            </div>
          </div>

          {/* LR / Docket Meta Box */}
          <div className="col-span-5 sm:col-span-4 border-2 border-slate-900 bg-slate-50 p-2 text-center rounded-sm">
            <div className="text-[11px] font-black tracking-wider uppercase text-slate-900">
              LORRY RECEIPT / BILTY
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-0.5 flex-wrap">
              <div className={`inline-block px-2 py-0.5 border text-[9px] font-black tracking-wide uppercase rounded ${
                copyType === 'CONSIGNOR'
                  ? 'border-rose-600 bg-rose-50 text-rose-800'
                  : copyType === 'CONSIGNEE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-blue-600 bg-blue-50 text-blue-800'
              }`}>
                COPY
              </div>
              <div className={`inline-block px-1.5 py-0.5 border text-[8.5px] font-black tracking-wide uppercase rounded ${
                (c.load_type || 'PTL') === 'FTL'
                  ? 'bg-purple-100 text-purple-900 border-purple-400'
                  : 'bg-amber-100 text-amber-900 border-amber-400'
              }`}>
                {(c.load_type || 'PTL') === 'FTL' ? '🚛 FTL (FULL TRUCK)' : '📦 PTL (PART LOAD)'}
              </div>
            </div>

            {/* Genuine Scannable Code 128 Barcode */}
            <div className="flex items-center justify-center my-1 bg-white px-2 py-1 border border-slate-300 overflow-hidden">
              <Barcode
                value={c.lr_number || 'BAL000001'}
                width={1.3}
                height={28}
                displayValue={false}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] px-1 font-mono">
              <span className="text-slate-500 font-bold">LR NO:</span>
              <span className="font-black text-rose-600 text-xs">{c.lr_number}</span>
            </div>
            <div className="flex items-center justify-between text-[9px] px-1 font-mono text-slate-600">
              <span>DATE:</span>
              <span className="font-bold text-slate-900">{c.booking_date}</span>
            </div>
          </div>
        </div>

        {/* 3. Customer Transit Corridor Strip (Booking Origin Station -> Delivery Destination) */}
        <div className="grid grid-cols-4 border-b-2 border-slate-900 bg-slate-100 text-[10px] font-sans">
          <div className="border-r border-slate-900 p-2">
            <span className="text-[8px] uppercase font-bold text-slate-500 block">FROM (BOOKING / SHIPPER ORIGIN)</span>
            <span className="font-black text-slate-900 uppercase text-[11px] truncate block">{consignorCity}</span>
            <span className="text-[9px] text-slate-600 truncate block font-semibold mt-0.5">{consignorName}</span>
          </div>
          <div className="border-r border-slate-900 p-2">
            <span className="text-[8px] uppercase font-bold text-slate-500 block">TO (DELIVERY DESTINATION / RECEIVER)</span>
            <span className="font-black text-slate-900 uppercase text-[11px] truncate block">{consigneeCity}</span>
            <span className="text-[9px] text-slate-600 truncate block font-semibold mt-0.5">{consigneeName}</span>
          </div>
          <div className="border-r border-slate-900 p-2">
            <span className="text-[8px] uppercase font-bold text-slate-500 block">MODE & VEHICLE</span>
            <span className="font-mono font-black text-slate-900 text-[11px] truncate block">
              {c.transport_mode === 'AIR' ? '✈️ BY AIR' : c.transport_mode === 'RAIL' ? '🚆 BY RAIL' : '🚛 BY ROAD'} {c.vehicle_number && c.vehicle_number !== 'Unassigned' ? `• ${c.vehicle_number}` : ''}
            </span>
          </div>
          <div className="p-2">
            <span className="text-[8px] uppercase font-bold text-slate-500 block">DRIVER / CARRIER</span>
            <span className="font-semibold text-slate-900 truncate block">{c.driver_name || 'Pending Allocation'}</span>
          </div>
        </div>

        {/* 4. Consignor (Customer Shipper) & Consignee (Customer Receiver) Cards */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900">
          {/* Consignor */}
          <div className="border-r border-slate-900 p-2.5">
            <div className="text-[9px] font-black tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span className="font-bold text-slate-800">CONSIGNOR (SHIPPER / CUSTOMER)</span>
              <span className="text-[8.5px] font-normal text-slate-500">DISPATCH FROM</span>
            </div>
            <div className="font-black text-slate-950 text-xs tracking-wide">{consignorName}</div>
            <div className="text-[10px] text-slate-700 mt-0.5 font-medium leading-tight">
              {consignorAddress ? `${consignorAddress}, ` : ''}{consignorCity}
            </div>
            <div className="text-[9.5px] font-mono text-slate-700 mt-1">
              Ph: {consignorPhone || 'Not Provided'}
            </div>
            <div className="text-[9px] font-mono text-slate-600 mt-0.5">
              GSTIN: {consignorGstin ? `${consignorGstin} (Registered)` : 'Unregistered / UR'}
            </div>
          </div>

          {/* Consignee */}
          <div className="p-2.5">
            <div className="text-[9px] font-black tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span className="font-bold text-slate-800">CONSIGNEE (RECEIVER / CUSTOMER)</span>
              <span className="text-[8.5px] font-normal text-slate-500">DELIVER TO</span>
            </div>
            <div className="font-black text-slate-950 text-xs tracking-wide">{consigneeName}</div>
            <div className="text-[10px] text-slate-700 mt-0.5 font-medium leading-tight">
              {consigneeAddress ? `${consigneeAddress}, ` : ''}{consigneeCity}
            </div>
            <div className="text-[9.5px] font-mono text-slate-700 mt-1">
              Ph: {consigneePhone || 'Not Provided'}
            </div>
            <div className="text-[9px] font-mono text-slate-600 mt-0.5">
              GSTIN: {consigneeGstin ? `${consigneeGstin} (Registered)` : 'Unregistered / UR'}
            </div>
          </div>
        </div>

        {/* 5. Shipment Cargo Particulars Table */}
        <div className="border-b-2 border-slate-900">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 text-[9px] font-extrabold uppercase text-slate-700">
                <th className="py-1.5 px-2 border-r border-slate-900 w-20">Packages</th>
                <th className="py-1.5 px-2 border-r border-slate-900">Description of Goods (Said to Contain)</th>
                <th className="py-1.5 px-2 border-r border-slate-900 text-right w-24">Actual Wt.</th>
                <th className="py-1.5 px-2 border-r border-slate-900 text-right w-24">Charged Wt.</th>
                <th className="py-1.5 px-2 border-r border-slate-900 text-right w-24">Rate / Basis</th>
                <th className="py-1.5 px-2 text-right w-28">Basic Freight</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-[10px] font-medium border-b border-slate-300">
                <td className="py-2 px-2 border-r border-slate-900 font-bold">
                  {c.packages_count} Pkgs
                </td>
                <td className="py-2 px-2 border-r border-slate-900 font-semibold text-slate-900">
                  {c.cargo_type || 'Industrial Goods / General Cargo'}
                </td>
                <td className="py-2 px-2 border-r border-slate-900 text-right font-mono">
                  {c.actual_weight || c.charged_weight || 0} KG
                </td>
                <td className="py-2 px-2 border-r border-slate-900 text-right font-mono font-bold">
                  {c.charged_weight || c.actual_weight || 0} KG
                </td>
                <td className="py-2 px-2 border-r border-slate-900 text-right font-mono">
                  {isFixedPricing ? (
                    <span>0 <span className="text-[8px] text-slate-500 font-sans uppercase font-bold">(Fixed)</span></span>
                  ) : (
                    <span>₹{parseFloat(c.rate || 0)} / KG</span>
                  )}
                </td>
                <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                  ₹{freightAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Accounting & Freight Charges Breakdown (Split into Left Stamp & Right Financials) */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900">

          {/* Left Side: Payment Stamp & Amount in Words */}
          <div className="col-span-7 border-r border-slate-900 p-3 flex flex-col justify-between">
            <div>
              {/* Payment Rubber Stamp */}
              <div className="flex items-center space-x-3">
                <div className={`inline-block px-3 py-1 border-2 border-dashed font-black text-xs tracking-widest uppercase rounded rotate-[-3deg] shadow-xs ${paymentType === 'TO_PAY'
                    ? 'border-red-600 text-red-600 bg-red-50/70'
                    : paymentType === 'PAID'
                      ? 'border-emerald-600 text-emerald-600 bg-emerald-50/70'
                      : 'border-blue-600 text-blue-600 bg-blue-50/70'
                  }`}>
                  ★ {paymentType === 'TO_PAY' ? 'TO PAY' : paymentType === 'PAID' ? 'FREIGHT PAID' : 'TO BE BILLED (TBB)'} ★
                </div>
                <span className="text-[9px] text-slate-500 font-semibold">
                  Payment Mode: <strong className="text-slate-900 uppercase">{paymentType}</strong>
                </span>
              </div>

              {/* Amount In Words */}
              <div className="mt-2.5 p-2 bg-slate-50 border border-slate-300 rounded text-[9.5px]">
                <span className="font-bold text-slate-900">Amount in Words: </span>
                <span className="font-semibold text-slate-800 italic">
                  {numberToWordsIndian(totalAmt)}
                </span>
              </div>
            </div>

            {/* GST & Transit Risk Clause */}
            <div className="mt-2 space-y-0.5 text-[8.5px] text-slate-500 leading-tight">
              {taxAmt > 0 ? (
                <p>• <strong>GST Note:</strong> Tax charged under Forward Charge Mechanism ({c.tax_percent || 5}% GST added to bill/LR).</p>
              ) : (parseFloat(c.tax_percent || 0) > 0 || c.is_rcm || c.gst_mode === 'RCM') ? (
                <p>• <strong>GST Note:</strong> Tax payable under Reverse Charge Mechanism (RCM - 5% GTA) by {paymentType === 'TO_PAY' ? 'Consignee' : 'Consignor'} as per Notif. No. 13/2017-CT(R).</p>
              ) : (
                <p>• <strong>GST Note:</strong> Freight services are Nil / Exempt from Goods and Services Tax.</p>
              )}
              <p>• <strong>Transit Insurance:</strong> Booked strictly at Owner's risk. Transporter is not an insurer.</p>
            </div>
          </div>

          {/* Right Side: Itemized Charges Table */}
          <div className="col-span-5 p-0 bg-slate-50/60 font-mono text-[9.5px]">
            <div className="flex justify-between py-1 px-2 border-b border-slate-200">
              <span className="text-slate-600">Basic Freight:</span>
              <span className="font-semibold text-slate-900">₹{freightAmt.toFixed(2)}</span>
            </div>
            {loadingAmt > 0 && (
              <div className="flex justify-between py-1 px-2 border-b border-slate-200">
                <span className="text-slate-600">Loading / Hamali:</span>
                <span className="font-semibold text-slate-900">₹{loadingAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 px-2 border-b border-slate-200">
              <span className="text-slate-600">Bilty / LR Charges:</span>
              <span className="font-semibold text-slate-900">₹{biltyFeeAmt.toFixed(2)}</span>
            </div>
            {ddcAmt > 0 && (
              <div className="flex justify-between py-1 px-2 border-b border-slate-200">
                <span className="text-slate-600">Door Delivery:</span>
                <span className="font-semibold text-slate-900">₹{ddcAmt.toFixed(2)}</span>
              </div>
            )}
            {otherAmt > 0 && (
              <div className="flex justify-between py-1 px-2 border-b border-slate-200">
                <span className="text-slate-600">Other / Handling:</span>
                <span className="font-semibold text-slate-900">₹{otherAmt.toFixed(2)}</span>
              </div>
            )}
            {discountAmt > 0 && (
              <div className="flex justify-between py-1 px-2 border-b border-slate-200 text-emerald-700">
                <span>Discount:</span>
                <span className="font-semibold">- ₹{discountAmt.toFixed(2)}</span>
              </div>
            )}
            {taxAmt > 0 && (
              <div className="flex justify-between py-1 px-2 border-b border-slate-200">
                <span className="text-slate-600">GST / Taxes:</span>
                <span className="font-semibold text-slate-900">₹{taxAmt.toFixed(2)}</span>
              </div>
            )}
            {/* Net Total Row */}
            <div className="flex justify-between py-2 px-2 bg-slate-900 text-white font-sans text-xs font-black">
              <span>TOTAL AMOUNT:</span>
              <span className="font-mono text-sm">₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* 7. Standard Terms & Conditions */}
        <div className="border-b border-slate-900 py-1.5 px-1 text-[8px] text-slate-500 leading-tight">
          <p className="font-bold text-slate-700 uppercase mb-0.5">Summary Terms & Carriage Conditions:</p>
          <p>
            1. The consignment is carried strictly subject to standard conditions of carriage by road.
            2. Delivery will be effected only upon surrender of original Consignment note duly signed and stamped.
            3. Transporter shall not be held liable for damages, leakage, breakage or delays caused by natural perils or road hazards.
            4. Demurrage @ ₹50/day applicable if not claimed within 48 hours of destination arrival.
          </p>
        </div>

        {/* 8. Signature Strip (3 Equal Columns) */}
        <div className="grid grid-cols-3 pt-6 pb-1 text-center text-[9px] font-bold text-slate-700">
          <div className="border-t border-slate-400 mx-2 pt-1">
            Consignor's Signature / Thumb
          </div>
          <div className="border-t border-slate-400 mx-2 pt-1">
            Driver's Signature (Received Cargo)
          </div>
          <div className="border-t border-slate-900 mx-2 pt-1 text-slate-950">
            For {companyBrand} (Auth. Signatory)
          </div>
        </div>

      </div>
    );
  };

  // New Booking Wizard Form State
  const [bookingStep, setBookingStep] = useState(1);
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [isManualConsignor, setIsManualConsignor] = useState(false);
  const [isManualConsignee, setIsManualConsignee] = useState(false);
  const [showAllConsignors, setShowAllConsignors] = useState(false);
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);
  const consignorDropdownRef = useRef(null);
  const consigneeDropdownRef = useRef(null);
  const consignorInputRef = useRef(null);
  const consigneeInputRef = useRef(null);
  const consignorDropdownMenuRef = useRef(null);
  const consigneeDropdownMenuRef = useRef(null);
  const consignorPhoneRef = useRef(null);
  const consigneePhoneRef = useRef(null);

  const [consignorCoords, setConsignorCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    maxHeight: 220,
    opensUpward: false,
  });
  const [consigneeCoords, setConsigneeCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    maxHeight: 220,
    opensUpward: false,
  });

  const [docketSeriesPreview, setDocketSeriesPreview] = useState(null);

  const [formData, setFormData] = useState({
    docketNumberMode: 'auto', // 'auto' | 'manual'
    customDocketNumber: '',
    consignorName: '',
    consignorCity: '',
    consignorAddress: '',
    consignorPhone: '',
    consignorId: '',
    consigneeName: '',
    consigneeCity: '',
    consigneeAddress: '',
    consigneePhone: '',
    consigneeId: '',
    originBranchId: '',
    destBranchId: '',
    originCity: 'Delhi (DEL)',
    destinationCity: 'Bengaluru (BLR)',
    cargoType: 'Industrial Goods',
    packagesCount: '50',
    weightKg: '2500',
    ratePerKg: '18',
    paymentMode: 'TO_PAY',
    pickupDate: new Date().toISOString().split('T')[0],
    transportMode: 'ROAD', // 'ROAD' | 'RAIL' | 'AIR'
    deliveryType: 'DOOR_DELIVERY', // Default to DOOR_DELIVERY
    loadType: isOnlyFTL ? 'FTL' : 'PTL', // 'PTL' | 'FTL'
    ftlVehicleType: '',
    ftlPricingMode: 'FIXED', // 'FIXED' | 'PER_KG'
    ftlFreightAmount: '',
    // Dynamic & Editable Charges
    loadingCharges: '450',
    unloadingCharges: '0',
    doorDeliveryCharges: '100',
    biltyFee: '50',
    customCharges: [], // Array of { id, name, amount }
    discountAmount: '0',
    gstMode: 'RCM', // 'RCM' | 'GST_5' | 'GST_12' | 'EXEMPT'
  });

  const fetchDocketSeriesPreview = async () => {
    try {
      const res = await api.get('/organizations/docket-series');
      if (res.data?.success && res.data.data) {
        setDocketSeriesPreview(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load docket series preview', e);
    }
  };

  // Calculate live freight and all charges breakdown
  const calculateFreightBreakdown = (data) => {
    const isFtl = (data.loadType || 'PTL') === 'FTL';
    let basicFreight = 0;
    if (isFtl && data.ftlPricingMode === 'FIXED' && data.ftlFreightAmount !== undefined && data.ftlFreightAmount !== '') {
      basicFreight = Math.round(parseFloat(data.ftlFreightAmount) || 0);
    } else {
      const weight = parseFloat(data.weightKg) || 0;
      const rate = parseFloat(data.ratePerKg) || 0;
      basicFreight = Math.round(weight * rate);
    }

    const loading = parseFloat(data.loadingCharges) || 0;
    const unloading = parseFloat(data.unloadingCharges) || 0;
    const doorDelivery = parseFloat(data.doorDeliveryCharges) || 0;
    const biltyFee = parseFloat(data.biltyFee) || 0;
    const discount = parseFloat(data.discountAmount) || 0;

    const customTotal = (data.customCharges || []).reduce(
      (acc, c) => acc + (parseFloat(c.amount) || 0),
      0
    );
    const totalAdditionalCharges = loading + unloading + doorDelivery + biltyFee + customTotal;

    const subtotal = Math.max(0, basicFreight + totalAdditionalCharges - discount);

    let taxPercent = 0;
    let taxAmount = 0;
    let isRcm = false;

    if (data.gstMode === 'GST_5') {
      taxPercent = 5;
      taxAmount = Math.round((subtotal * 5) / 100);
    } else if (data.gstMode === 'GST_12') {
      taxPercent = 12;
      taxAmount = Math.round((subtotal * 12) / 100);
    } else if (data.gstMode === 'RCM') {
      taxPercent = 5;
      taxAmount = 0;
      isRcm = true;
    }

    const totalDocketFreight = Math.round(subtotal + taxAmount);

    return {
      basicFreight,
      loading,
      unloading,
      doorDelivery,
      biltyFee,
      customTotal,
      totalAdditionalCharges,
      discount,
      subtotal,
      taxPercent,
      taxAmount,
      gstAmount: taxAmount,
      isRcm,
      totalDocketFreight,
    };
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches?all=true');
      const list = res.data?.data || [];
      setBranchesList(list);
      if (list.length > 0) {
        setFormData((prev) => {
          let originB;
          if (isRestrictedBranchUser && userBranchId) {
            originB = list.find((b) => b.id === userBranchId) || { id: userBranchId, city: user?.city || 'South Delhi' };
          } else {
            const validOrigin = list.find((b) => b.id === prev.originBranchId);
            originB = validOrigin || list[0];
          }

          const otherBranches = list.filter((b) => b.id !== originB.id);
          const validDest = list.find((b) => b.id === prev.destBranchId && b.id !== originB.id);
          const destB = validDest || (otherBranches.length > 0 ? otherBranches[0] : list[0]);

          return {
            ...prev,
            originBranchId: originB.id,
            originCity: originB.city || prev.originCity,
            destBranchId: destB.id,
            destinationCity: destB.city || prev.destinationCity,
          };
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          originBranchId: isRestrictedBranchUser && userBranchId ? userBranchId : '',
          originCity: '',
          destBranchId: '',
          destinationCity: '',
        }));
      }
    } catch (e) {
      console.warn('Failed to load branches for booking dropdown:', e);
      setBranchesList([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers?limit=1000&scope=all');
      const list = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.rows || []);
      setCustomersList(list);
    } catch (err) {
      console.warn('Failed to load customers for booking dropdown:', err);
      setCustomersList([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/fleet/vehicles');
      const list = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.rows || []);
      setVehiclesList(list);
    } catch (err) {
      console.warn('Failed to load fleet vehicles for booking dropdown:', err);
      setVehiclesList([]);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchCustomers();
    fetchVehicles();
    fetchDocketSeriesPreview();
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      fetchBranches();
      fetchCustomers();
      fetchVehicles();
      fetchDocketSeriesPreview();
      setShowAllConsignors(false);
      setIsManualConsignor(false);
      setIsManualConsignee(false);
      setShowConsignorDropdown(false);
      setShowConsigneeDropdown(false);
    }
  }, [isDrawerOpen]);

  const updateConsignorCoords = () => {
    if (!consignorInputRef.current) return;
    const rect = consignorInputRef.current.getBoundingClientRect();
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const opensUpward = spaceBelow < 250 && spaceAbove > spaceBelow;
    const availableSpace = opensUpward ? spaceAbove : spaceBelow;
    const responsiveMaxHeight = Math.max(140, Math.min(250, Math.floor(availableSpace) - 10));

    setConsignorCoords({
      top: opensUpward ? 0 : rect.bottom + 4,
      bottom: opensUpward ? viewportHeight - rect.top + 4 : 0,
      left: Math.max(8, Math.min(rect.left, viewportWidth - rect.width - 8)),
      width: rect.width,
      maxHeight: responsiveMaxHeight,
      opensUpward,
    });
  };

  const updateConsigneeCoords = () => {
    if (!consigneeInputRef.current) return;
    const rect = consigneeInputRef.current.getBoundingClientRect();
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const opensUpward = spaceBelow < 250 && spaceAbove > spaceBelow;
    const availableSpace = opensUpward ? spaceAbove : spaceBelow;
    const responsiveMaxHeight = Math.max(140, Math.min(250, Math.floor(availableSpace) - 10));

    setConsigneeCoords({
      top: opensUpward ? 0 : rect.bottom + 4,
      bottom: opensUpward ? viewportHeight - rect.top + 4 : 0,
      left: Math.max(8, Math.min(rect.left, viewportWidth - rect.width - 8)),
      width: rect.width,
      maxHeight: responsiveMaxHeight,
      opensUpward,
    });
  };

  useEffect(() => {
    if (!showConsignorDropdown) return;
    updateConsignorCoords();
    const handleScrollOrResize = () => updateConsignorCoords();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [showConsignorDropdown]);

  useEffect(() => {
    if (!showConsigneeDropdown) return;
    updateConsigneeCoords();
    const handleScrollOrResize = () => updateConsigneeCoords();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [showConsigneeDropdown]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        consignorDropdownRef.current && !consignorDropdownRef.current.contains(e.target) &&
        (!consignorDropdownMenuRef.current || !consignorDropdownMenuRef.current.contains(e.target))
      ) {
        setShowConsignorDropdown(false);
      }
      if (
        consigneeDropdownRef.current && !consigneeDropdownRef.current.contains(e.target) &&
        (!consigneeDropdownMenuRef.current || !consigneeDropdownMenuRef.current.contains(e.target))
      ) {
        setShowConsigneeDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowConsignorDropdown(false);
        setShowConsigneeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentOriginBranch = useMemo(() => {
    const targetBranchId = userBranchId || formData.originBranchId;
    return branchesList.find((b) => b.id === targetBranchId) || null;
  }, [userBranchId, formData.originBranchId, branchesList]);

  const filteredConsignors = useMemo(() => {
    if (!customersList || customersList.length === 0) return [];

    // Filter out CONSIGNEE-only customers
    let list = customersList.filter((c) => c.customer_type !== 'CONSIGNEE');

    // For Branch Managers (non-admins): show only nearest branch customers unless "View All" is toggled
    if (!isAdmin && !showAllConsignors) {
      const targetBranchId = formData.originBranchId || userBranchId;
      if (targetBranchId && branchesList && branchesList.length > 0) {
        list = list.filter((c) => {
          const nearest = getNearestBranchForCustomer(c, branchesList);
          return nearest && nearest.id === targetBranchId;
        });
      }
    }

    const q = (formData.consignorName || '').toLowerCase().trim();
    if (!q) return list;

    return list.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const code = (c.customer_code || '').toLowerCase();
      const city = (c.city || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      const pin = (c.pincode || '').toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        city.includes(q) ||
        phone.includes(q) ||
        gstin.includes(q) ||
        pin.includes(q)
      );
    });
  }, [
    customersList,
    formData.consignorName,
    isAdmin,
    showAllConsignors,
    userBranchId,
    formData.originBranchId,
    branchesList,
  ]);

  const filteredConsignees = useMemo(() => {
    if (!customersList || customersList.length === 0) return [];
    const q = (formData.consigneeName || '').toLowerCase().trim();
    if (!q) return customersList;
    return customersList.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const code = (c.customer_code || '').toLowerCase();
      const city = (c.city || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q) || phone.includes(q) || gstin.includes(q);
    });
  }, [customersList, formData.consigneeName]);

  // Step validation rules for New Consignment Modal (4 Steps)
  // Step 1: Movement Type & Customer Parties (Consignor & Consignee)
  const isStep1Valid = useMemo(() => {
    if (formData.docketNumberMode === 'manual' && !(formData.customDocketNumber || '').trim()) {
      return false;
    }
    if (!(formData.consignorName || '').trim()) {
      return false;
    }
    // For manual / walk-in shipper, 10-digit mobile number is mandatory
    if (!formData.consignorId) {
      const cleanPhone = (formData.consignorPhone || '').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return false;
      }
    }
    if (!(formData.consigneeName || '').trim()) {
      return false;
    }
    // For manual / walk-in receiver, 10-digit mobile number is mandatory
    if (!formData.consigneeId) {
      const cleanPhone = (formData.consigneePhone || '').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return false;
      }
    }
    return true;
  }, [formData]);

  const step1MissingFields = useMemo(() => {
    const missing = [];
    if (formData.docketNumberMode === 'manual' && !(formData.customDocketNumber || '').trim()) {
      missing.push('Manual Docket No');
    }
    if (!(formData.consignorName || '').trim()) {
      missing.push('Consignor (Shipper)');
    } else if (!formData.consignorId) {
      const cleanPhone = (formData.consignorPhone || '').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        missing.push('Shipper Mobile (10 Digits)');
      }
    }
    if (!(formData.consigneeName || '').trim()) {
      missing.push('Consignee (Receiver)');
    } else if (!formData.consigneeId) {
      const cleanPhone = (formData.consigneePhone || '').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        missing.push('Receiver Mobile (10 Digits)');
      }
    }
    return missing;
  }, [formData]);

  // Step 2: Route & Transit Schedule (Origin Hub, Destination Hub [exempt for FTL], Pickup Date, Mode, Delivery Type)
  const isStep2Valid = useMemo(() => {
    if (!formData.originBranchId) {
      return false;
    }
    const isFtl = (formData.loadType || 'PTL').toUpperCase() === 'FTL';
    // For PTL, Destination Hub is strictly required. For FTL, direct point-to-point movement skips destination hub.
    if (!isFtl && !formData.destBranchId) {
      return false;
    }
    if (!formData.pickupDate) {
      return false;
    }
    if (!formData.transportMode) {
      return false;
    }
    return true;
  }, [formData]);

  const step2MissingFields = useMemo(() => {
    const missing = [];
    if (!formData.originBranchId) {
      missing.push('Origin Hub');
    }
    const isFtl = (formData.loadType || 'PTL').toUpperCase() === 'FTL';
    if (!isFtl && !formData.destBranchId) {
      missing.push('Destination Hub');
    }
    if (!formData.pickupDate) {
      missing.push('Pickup Date');
    }
    if (!formData.transportMode) {
      missing.push('Transport Mode');
    }
    return missing;
  }, [formData]);

  // Step 3: Cargo Commodity, Packages, Weights, Tariff Rates & Payment Term
  const isStep3Valid = useMemo(() => {
    if (!(formData.cargoType || '').trim()) {
      return false;
    }
    const pkg = parseInt(formData.packagesCount, 10);
    if (!formData.packagesCount || isNaN(pkg) || pkg <= 0) {
      return false;
    }
    const wt = parseFloat(formData.weightKg);
    if (!formData.weightKg || isNaN(wt) || wt <= 0) {
      return false;
    }
    if (!formData.paymentMode) {
      return false;
    }
    const isFtl = (formData.loadType || 'PTL').toUpperCase() === 'FTL';
    if (isFtl && formData.ftlPricingMode === 'FIXED') {
      const fixedAmt = parseFloat(formData.ftlFreightAmount || 0);
      if (isNaN(fixedAmt) || fixedAmt <= 0) {
        return false;
      }
    }
    return true;
  }, [formData]);

  const step3MissingFields = useMemo(() => {
    const missing = [];
    if (!(formData.cargoType || '').trim()) {
      missing.push('Cargo Commodity');
    }
    const pkg = parseInt(formData.packagesCount, 10);
    if (!formData.packagesCount || isNaN(pkg) || pkg <= 0) {
      missing.push('Packages Count');
    }
    const wt = parseFloat(formData.weightKg);
    if (!formData.weightKg || isNaN(wt) || wt <= 0) {
      missing.push('Weight (KG)');
    }
    if (!formData.paymentMode) {
      missing.push('Payment Term');
    }
    const isFtl = (formData.loadType || 'PTL').toUpperCase() === 'FTL';
    if (isFtl && formData.ftlPricingMode === 'FIXED') {
      const fixedAmt = parseFloat(formData.ftlFreightAmount || 0);
      if (isNaN(fixedAmt) || fixedAmt <= 0) {
        missing.push('Fixed Truck Freight (₹)');
      }
    }
    return missing;
  }, [formData]);

  const isCurrentStepValid =
    bookingStep === 1
      ? isStep1Valid
      : bookingStep === 2
      ? isStep2Valid
      : bookingStep === 3
      ? isStep3Valid
      : true;

  const currentMissingFields =
    bookingStep === 1
      ? step1MissingFields
      : bookingStep === 2
      ? step2MissingFields
      : bookingStep === 3
      ? step3MissingFields
      : [];

  // Fetch real consignments from backend with Server-Side Pagination & Sorting
  const fetchConsignments = async (overrides = {}) => {
    setIsLoading(true);
    const p = overrides.page !== undefined ? overrides.page : page;
    const ps = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;
    const sb = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const so = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const sq = overrides.search !== undefined ? overrides.search : searchQuery;
    const sf = overrides.status !== undefined ? overrides.status : statusFilter;
    const fd = overrides.fromDate !== undefined ? overrides.fromDate : fromDate;
    const td = overrides.toDate !== undefined ? overrides.toDate : toDate;
    const br = overrides.branchId !== undefined ? overrides.branchId : selectedBranchId;
    const ltf = overrides.loadType !== undefined ? overrides.loadType : loadTypeFilter;

    try {
      let url = `/bookings?page=${p}&limit=${ps}&sort_by=${sb}&sort_order=${so}`;
      if (sq) url += `&search=${encodeURIComponent(sq)}`;
      if (ltf && ltf !== 'ALL') url += `&load_type=${ltf}`;
      if (sf && sf !== 'ALL') {
        if (sf === 'PENDING') {
          url += `&status=BOOKED,MATERIAL_RECEIVED,READY_FOR_DISPATCH,LOADED,RECEIVED_AT_HUB`;
        } else if (sf === 'FOR_DELIVERY' || sf === 'REACHED_DESTINATION') {
          url += `&status=REACHED_DESTINATION,OUT_FOR_DELIVERY`;
        } else if (sf === 'IN_TRANSIT') {
          url += `&status=IN_TRANSIT,DISPATCHED,ON_TRIP`;
        } else if (sf === 'DELIVERED') {
          url += `&status=DELIVERED,COMPLETED,POD_UPLOADED`;
        } else if (sf === 'DELAYED') {
          url += `&status=DELAYED,DAMAGED,SHORT_MATERIAL,HOLD`;
        } else {
          url += `&status=${sf}`;
        }
      }
      if (fd) url += `&from_date=${fd}`;
      if (td) url += `&to_date=${td}`;
      if (br && br !== 'ALL') url += `&branch_id=${br}`;

      const res = await api.get(url);
      const rawList = res.data?.data || [];
      const mapped = rawList.map(item => {
        const m = mapConsignmentFromApi(item);
        const cId = m.consignor_id || m.consignor?.id;
        if ((!m.consignor?.name || m.consignor.name === 'Commercial Consignor' || m.consignor.name === 'Consignor Shipper') && cId && Array.isArray(customersList)) {
          const matchCust = customersList.find(cu => cu.id === cId);
          if (matchCust?.name) {
            m.consignor = {
              ...m.consignor,
              id: cId,
              name: matchCust.name,
              phone: matchCust.phone || m.consignor.phone,
              address: matchCust.billing_address || matchCust.address || m.consignor.address,
              city: matchCust.city || m.consignor.city,
              gstin: matchCust.gstin || m.consignor.gstin,
            };
          }
        }
        const ceId = m.consignee_id || m.consignee?.id;
        if ((!m.consignee?.name || m.consignee.name === 'Commercial Consignee' || m.consignee.name === 'Consignee Receiver') && ceId && Array.isArray(customersList)) {
          const matchCust = customersList.find(cu => cu.id === ceId);
          if (matchCust?.name) {
            m.consignee = {
              ...m.consignee,
              id: ceId,
              name: matchCust.name,
              phone: matchCust.phone || m.consignee.phone,
              address: matchCust.billing_address || matchCust.address || m.consignee.address,
              city: matchCust.city || m.consignee.city,
              gstin: matchCust.gstin || m.consignee.gstin,
            };
          }
        }
        return m;
      });
      setConsignments(mapped);
      setTotalCount(res.data?.pagination?.total ?? mapped.length);
      if (res.data?.pagination?.summary) {
        setStatusSummary(res.data.pagination.summary);
      }
      return mapped;
    } catch (err) {
      console.error('Error fetching bookings from DB:', err);
      setConsignments([]);
      setTotalCount(0);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Full dataset exporter for the current filters & date range
  const handleExportAll = async () => {
    try {
      let url = `/bookings?limit=all&page=1&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (loadTypeFilter && loadTypeFilter !== 'ALL') url += `&load_type=${loadTypeFilter}`;
      if (statusFilter && statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING') {
          url += `&status=BOOKED,MATERIAL_RECEIVED,READY_FOR_DISPATCH,LOADED,RECEIVED_AT_HUB`;
        } else if (statusFilter === 'FOR_DELIVERY' || statusFilter === 'REACHED_DESTINATION') {
          url += `&status=REACHED_DESTINATION,OUT_FOR_DELIVERY`;
        } else if (statusFilter === 'IN_TRANSIT') {
          url += `&status=IN_TRANSIT,DISPATCHED,ON_TRIP`;
        } else if (statusFilter === 'DELIVERED') {
          url += `&status=DELIVERED,COMPLETED,POD_UPLOADED`;
        } else if (statusFilter === 'DELAYED') {
          url += `&status=DELAYED,DAMAGED,SHORT_MATERIAL,HOLD`;
        } else {
          url += `&status=${statusFilter}`;
        }
      }
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;
      if (selectedBranchId && selectedBranchId !== 'ALL') {
        url += `&branch_id=${selectedBranchId}`;
      } else if (activeBranch && activeBranch !== 'ALL') {
        const abId = typeof activeBranch === 'object' ? activeBranch.id : activeBranch;
        if (abId) url += `&branch_id=${abId}`;
      }

      const res = await api.get(url);
      const rawList = res.data?.data || [];
      return rawList.map(mapConsignmentFromApi);
    } catch (err) {
      console.error('Error fetching all bookings for export:', err);
      return consignments;
    }
  };

  useEffect(() => {
    fetchConsignments();
  }, [selectedBranchId, page, pageSize, sortBy, sortOrder, statusFilter, loadTypeFilter, fromDate, toDate]);

  // Debounce search so keystrokes don't spam the server
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchConsignments({ search: searchQuery, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Edit Action
  const handleOpenEdit = (c) => {
    if (!c) return;
    const isDelivered = Boolean(
      c.is_delivered ||
      ['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(c.status)
    );
    if (isDelivered) {
      alert('Delivered dockets cannot be edited. Only view and print are permitted.');
      return;
    }
    setEditingDocket(c);
    const weight = parseFloat(c.charged_weight || c.actual_weight || 0);
    const rate = parseFloat(c.rate || 18);
    const loading = parseFloat(c.loading_charges || c.hamali_charges || 0);
    const unloading = parseFloat(c.unloading_charges || 0);
    const doorDelivery = parseFloat(c.door_delivery_charges || 0);
    const other = parseFloat(c.other_charges || c.handling_charges || 0);
    const discount = parseFloat(c.discount_amount || 0);
    const taxP = parseFloat(c.tax_percent || 0);
    const total = parseFloat(c.total_amount || 0);

    const matchedOriginBranch = branchesList.find(b =>
      b.id === (c.origin_branch_id || c.from_branch_id || c.origin_branch?.id || c.originBranch?.id) ||
      (b.city && c.origin_city && b.city.toLowerCase() === c.origin_city.toLowerCase()) ||
      (b.branch_name && c.origin_city && b.branch_name.toLowerCase() === c.origin_city.toLowerCase()) ||
      (b.branch_code && c.origin_branch_code && b.branch_code.toLowerCase() === c.origin_branch_code.toLowerCase())
    );
    const matchedDestBranch = branchesList.find(b =>
      b.id === (c.dest_branch_id || c.to_branch_id || c.dest_branch?.id || c.destBranch?.id) ||
      (b.city && c.destination_city && b.city.toLowerCase() === c.destination_city.toLowerCase()) ||
      (b.branch_name && c.destination_city && b.branch_name.toLowerCase() === c.destination_city.toLowerCase()) ||
      (b.branch_code && c.dest_branch_code && b.branch_code.toLowerCase() === c.dest_branch_code.toLowerCase())
    );

    setEditFormData({
      docketNumber: c.lr_number,
      consignorName: c.consignor?.name || '',
      consignorCity: c.consignor?.city || c.origin_city || '',
      consigneeName: c.consignee?.name || '',
      consigneeCity: c.consignee?.city || c.destination_city || '',
      originCity: c.origin_city || '',
      destinationCity: c.destination_city || '',
      originBranchId: matchedOriginBranch?.id || c.origin_branch_id || '',
      destBranchId: matchedDestBranch?.id || c.dest_branch_id || '',
      originBranchCode: matchedOriginBranch?.branch_code || c.origin_branch_code || c.originBranch?.branch_code || '',
      destBranchCode: matchedDestBranch?.branch_code || c.dest_branch_code || c.destBranch?.branch_code || '',
      cargoType: c.cargo_type,
      packagesCount: (c.packages_count || 1).toString(),
      weightKg: weight.toString(),
      ratePerKg: rate.toString(),
      loadingCharges: loading.toString(),
      unloadingCharges: unloading.toString(),
      doorDeliveryCharges: doorDelivery.toString(),
      otherCharges: other.toString(),
      customCharges: [],
      discountAmount: discount.toString(),
      taxPercent: taxP.toString(),
      totalAmount: total.toString(),
      paymentMode: c.payment_type || c.payment_mode || 'TO_PAY',
      transportMode: c.transport_mode || 'ROAD',
      loadType: (c.load_type || 'PTL').toUpperCase() === 'FTL' ? 'FTL' : 'PTL',
      deliveryType: c.delivery_type || (parseFloat(c.door_delivery_charges || 0) > 0 ? 'DOOR_DELIVERY' : 'GODOWN_DELIVERY'),
      status: c.status || 'BOOKED',
    });
    setIsEditModalOpen(true);
  };

  const isEditingDocketPaid = Boolean(
    editingDocket && (
      (editingDocket.payment_type || '').toUpperCase() === 'PAID' ||
      (editingDocket.payment_status || '').toUpperCase() === 'PAID' ||
      (editingDocket.payment_mode || '').toUpperCase() === 'PAID'
    )
  );

  const updateEditField = (field, value, customChargesOverride = null) => {
    if (isEditingDocketPaid) {
      const lockedFinancialFields = [
        'deliveryType',
        'packagesCount',
        'weightKg',
        'ratePerKg',
        'loadingCharges',
        'unloadingCharges',
        'doorDeliveryCharges',
        'otherCharges',
        'customCharges',
        'discountAmount',
        'taxPercent',
        'totalAmount',
      ];
      if (lockedFinancialFields.includes(field)) {
        return;
      }
    }
    const updated = { ...editFormData, [field]: value };
    if (field === 'deliveryType') {
      if (value === 'DOOR_DELIVERY') {
        const curDdc = parseFloat(editFormData.doorDeliveryCharges || 0);
        if (curDdc < 100) {
          updated.doorDeliveryCharges = '100';
        }
      } else if (value === 'GODOWN_DELIVERY') {
        if (parseFloat(editFormData.doorDeliveryCharges || 0) === 100) {
          updated.doorDeliveryCharges = '0';
        }
      }
    }
    if (customChargesOverride !== null) {
      updated.customCharges = customChargesOverride;
    }
    const weight = parseFloat(field === 'weightKg' ? value : updated.weightKg) || 0;
    const rate = parseFloat(field === 'ratePerKg' ? value : updated.ratePerKg) || 0;
    const basicFreight = Math.round(weight * rate);
    const loading = parseFloat(field === 'loadingCharges' ? value : updated.loadingCharges) || 0;
    const unloading = parseFloat(field === 'unloadingCharges' ? value : updated.unloadingCharges) || 0;
    const doorDelivery = parseFloat(field === 'doorDeliveryCharges' ? value : updated.doorDeliveryCharges) || 0;
    const other = parseFloat(field === 'otherCharges' ? value : updated.otherCharges) || 0;
    const customList = customChargesOverride !== null ? customChargesOverride : (updated.customCharges || []);
    const customTotal = customList.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
    const discount = parseFloat(field === 'discountAmount' ? value : updated.discountAmount) || 0;
    const taxP = parseFloat(field === 'taxPercent' ? value : updated.taxPercent) || 0;

    const subtotal = Math.max(0, basicFreight + loading + unloading + doorDelivery + other + customTotal - discount);
    const taxAmt = taxP > 0 ? Math.round((subtotal * taxP) / 100) : 0;
    const calculatedTotal = Math.round(subtotal + taxAmt);

    if (field === 'totalAmount') {
      setEditFormData(updated);
    } else {
      setEditFormData({
        ...updated,
        totalAmount: calculatedTotal.toString(),
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDocket) return;
    const isDelivered = Boolean(
      editingDocket.is_delivered ||
      ['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(editingDocket.status)
    );
    if (isDelivered) {
      alert('Delivered dockets cannot be edited. Only view and print are permitted.');
      setIsSubmittingEdit(false);
      setIsEditModalOpen(false);
      return;
    }
    setIsSubmittingEdit(true);
    try {
      const weight = parseFloat(editFormData.weightKg) || 0;
      const rate = parseFloat(editFormData.ratePerKg) || 0;
      const calculatedFreight = Math.round(weight * rate);
      const loading = parseFloat(editFormData.loadingCharges) || 0;
      const unloading = parseFloat(editFormData.unloadingCharges) || 0;
      const doorDelivery = parseFloat(editFormData.doorDeliveryCharges) || 0;
      const otherBase = parseFloat(editFormData.otherCharges) || 0;
      const customTotal = (editFormData.customCharges || []).reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
      const totalOther = otherBase + customTotal;
      const discount = parseFloat(editFormData.discountAmount) || 0;
      const taxPercent = parseFloat(editFormData.taxPercent) || 0;

      const subtotal = Math.max(0, calculatedFreight + loading + unloading + doorDelivery + totalOther - discount);
      const taxAmount = taxPercent > 0 ? Math.round((subtotal * taxPercent) / 100) : 0;
      const calculatedTotal = Math.round(subtotal + taxAmount);
      const totalAmount = parseFloat(editFormData.totalAmount) || calculatedTotal;

      if (isEditingDocketPaid) {
        const origRate = parseFloat(editingDocket.rate || 0);
        const origTotal = parseFloat(editingDocket.total_amount || 0);
        const origWeight = parseFloat(editingDocket.charged_weight || editingDocket.actual_weight || 0);
        const origPackages = parseInt(editingDocket.packages_count || 0, 10);
        const origDeliveryType = editingDocket.delivery_type || (parseFloat(editingDocket.door_delivery_charges || 0) > 0 ? 'DOOR_DELIVERY' : 'GODOWN_DELIVERY');
        if (editFormData.deliveryType && editFormData.deliveryType !== origDeliveryType) {
          alert('Delivery type cannot be modified for a PAID bilty. Payment has already been settled.');
          setIsSubmittingEdit(false);
          return;
        }
        if (
          Math.abs(rate - origRate) > 0.01 ||
          Math.abs(totalAmount - origTotal) > 0.01 ||
          Math.abs(weight - origWeight) > 0.01 ||
          (parseInt(editFormData.packagesCount, 10) !== origPackages && origPackages > 0)
        ) {
          alert('Packages count, weight, and freight charges cannot be modified for a PAID bilty. Payment has already been settled.');
          setIsSubmittingEdit(false);
          return;
        }
      }

      const payload = {
        docket_number: editFormData.docketNumber,
        lr_number: editFormData.docketNumber,
        consignor_name: editFormData.consignorName,
        consignor_city: editFormData.consignorCity,
        consignee_name: editFormData.consigneeName,
        consignee_city: editFormData.consigneeCity,
        origin_city: editFormData.originCity,
        destination_city: editFormData.destinationCity,
        origin_branch_id: editFormData.originBranchId || editingDocket.origin_branch_id || undefined,
        dest_branch_id: editFormData.destBranchId || editingDocket.dest_branch_id || undefined,
        origin_branch_code: resolvedOriginCode,
        dest_branch_code: resolvedDestCode,
        material_description: editFormData.cargoType,
        packages_count: parseInt(editFormData.packagesCount, 10) || 1,
        actual_weight: weight,
        charged_weight: weight,
        rate_type: (editFormData.loadType || editingDocket?.load_type || 'PTL') === 'FTL' && (editFormData.rateType === 'FIXED' || rate === 0) ? 'FIXED' : (editingDocket?.rate_type || 'PER_KG'),
        rate: (editFormData.loadType || editingDocket?.load_type || 'PTL') === 'FTL' && (editFormData.rateType === 'FIXED' || rate === 0) ? 0 : rate,
        freight_amount: calculatedFreight,
        loading_charges: loading,
        hamali_charges: 0,
        unloading_charges: unloading,
        door_delivery_charges: doorDelivery,
        handling_charges: biltyFee,
        other_charges: totalOther,
        discount_amount: discount,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        is_rcm: isRcm,
        gst_mode: editFormData.gstMode,
        payment_type: editFormData.paymentMode,
        transport_mode: editFormData.transportMode || 'ROAD',
        load_type: editFormData.loadType || editingDocket?.load_type || 'PTL',
        delivery_type: editFormData.deliveryType || (doorDelivery > 0 ? 'DOOR_DELIVERY' : 'GODOWN_DELIVERY'),
        status: editFormData.status,
      };

      await api.put(`/bookings/${editingDocket.id}`, payload);
      setIsEditModalOpen(false);
      setEditingDocket(null);
      await fetchConsignments();
    } catch (err) {
      console.error('Failed to update docket:', err);
      alert(err.response?.data?.message || 'Failed to update docket in database.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Action
  const handleOpenDelete = (c) => {
    if (!c) return;
    const isDelivered = Boolean(
      c.is_delivered ||
      ['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(c.status)
    );
    if (isDelivered) {
      alert('Delivered dockets cannot be deleted. Only view and print are permitted.');
      return;
    }
    setDeletingDocket(c);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDocket) return;
    const isDelivered = Boolean(
      deletingDocket.is_delivered ||
      ['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(deletingDocket.status)
    );
    if (isDelivered) {
      alert('Delivered dockets cannot be deleted. Only view and print are permitted.');
      setIsDeleteModalOpen(false);
      setDeletingDocket(null);
      return;
    }
    setIsSubmittingDelete(true);
    try {
      await api.delete(`/bookings/${deletingDocket.id}`);
      setIsDeleteModalOpen(false);
      setDeletingDocket(null);
      if (selectedConsignment?.id === deletingDocket.id) {
        setIsDetailsOpen(false);
        setSelectedConsignment(null);
      }
      await fetchConsignments();
    } catch (err) {
      console.error('Failed to delete docket:', err);
      alert(err.response?.data?.message || 'Failed to delete docket from database.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // KPI Calculations
  const totalBookingsCount = statusSummary.total || consignments.length;
  const inTransitCount = statusSummary.inTransit || consignments.filter((c) => c.status === 'IN_TRANSIT' || c.status === 'DISPATCHED' || c.status === 'ON_TRIP').length;
  const deliveredCount = statusSummary.delivered || consignments.filter((c) => c.status === 'DELIVERED' || c.status === 'COMPLETED' || c.status === 'POD_UPLOADED').length;
  const forDeliveryCount = statusSummary.forDelivery || statusSummary.reachedDest || consignments.filter((c) => c.status === 'REACHED_DESTINATION' || c.status === 'OUT_FOR_DELIVERY').length;
  const pendingOrGodownCount = statusSummary.pending || consignments.filter((c) =>
    ['BOOKED', 'MATERIAL_RECEIVED', 'READY_FOR_DISPATCH', 'LOADED', 'RECEIVED_AT_HUB'].includes(c.status)
  ).length;
  const delayedCount = statusSummary.delayed || consignments.filter((c) => c.status === 'DELAYED' || c.status === 'DAMAGED' || c.status === 'SHORT_MATERIAL' || c.status === 'HOLD').length;

  const kpis = [
    {
      title: 'Total Bookings',
      count: totalBookingsCount.toString(),
      change: totalBookingsCount > 0 ? 'Live DB' : 'Fresh',
      subtext: 'Registered consignments',
      color: 'blue',
      icon: FileText
    },
    {
      title: 'Pending / Dock',
      count: pendingOrGodownCount.toString(),
      change: 'Staged',
      subtext: 'Origin / Transit Hub dock',
      color: 'rose',
      icon: AlertTriangle
    },
    {
      title: 'Ready for Delivery',
      count: forDeliveryCount.toString(),
      change: 'At Terminal',
      subtext: 'Destination branch dock',
      color: 'teal',
      icon: CheckCircle2
    },
    {
      title: 'In Transit',
      count: inTransitCount.toString(),
      change: 'Active',
      subtext: 'Active on road',
      color: 'cyan',
      icon: Truck
    }
  ];

  // Filtered & Priority-Sorted List
  const filteredConsignments = useMemo(() => {
    const list = consignments.filter((c) => {
      const matchesSearch =
        (c.lr_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.booking_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.consignor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.consignee?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.origin_city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.destination_city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.vehicle_number || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'IN_TRANSIT') return c.status === 'IN_TRANSIT' || c.status === 'DISPATCHED' || c.status === 'ON_TRIP';
      if (statusFilter === 'FOR_DELIVERY' || statusFilter === 'REACHED_DESTINATION') return c.status === 'REACHED_DESTINATION' || c.status === 'OUT_FOR_DELIVERY';
      if (statusFilter === 'DELIVERED') return c.status === 'DELIVERED' || c.status === 'COMPLETED' || c.status === 'POD_UPLOADED';
      if (statusFilter === 'DELAYED') return c.status === 'DELAYED' || c.status === 'DAMAGED' || c.status === 'SHORT_MATERIAL' || c.status === 'HOLD';
      if (statusFilter === 'PENDING') return ['BOOKED', 'MATERIAL_RECEIVED', 'READY_FOR_DISPATCH', 'LOADED', 'RECEIVED_AT_HUB'].includes(c.status);

      return true;
    });

    // Priority Sort for Pending / Dock:
    // Dockets arriving or stationed at THIS branch first, then other branch dockets
    if (statusFilter === 'PENDING') {
      const activeBranchId = (activeBranch && typeof activeBranch === 'object') ? activeBranch.id : activeBranch;
      const branchId = selectedBranchId !== 'ALL' ? selectedBranchId : (activeBranchId !== 'ALL' ? activeBranchId : userBranchId);
      return [...list].sort((a, b) => {
        const aIsThisBranch = branchId && (a.current_branch_id === branchId || a.dest_branch_id === branchId || a.origin_branch_id === branchId);
        const bIsThisBranch = branchId && (b.current_branch_id === branchId || b.dest_branch_id === branchId || b.origin_branch_id === branchId);

        if (aIsThisBranch && !bIsThisBranch) return -1;
        if (!aIsThisBranch && bIsThisBranch) return 1;

        // Dockets arriving at transit hub (RECEIVED_AT_HUB) prioritized for prompt loading
        const aAtHub = a.status === 'RECEIVED_AT_HUB';
        const bAtHub = b.status === 'RECEIVED_AT_HUB';
        if (aAtHub && !bAtHub) return -1;
        if (!aAtHub && bAtHub) return 1;

        return 0;
      });
    }

    return list;
  }, [consignments, searchQuery, statusFilter, selectedBranchId, activeBranch, userBranchId]);

  const handleOpenDetails = (c) => {
    setSelectedConsignment(c);
    setIsDetailsOpen(true);
  };

  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) {
      alert('Please fill all mandatory fields across all steps before creating the consignment note.');
      return;
    }
    setIsLoading(true);
    try {
      const breakdown = calculateFreightBreakdown(formData);
      const otherTotal = breakdown.biltyFee + breakdown.customTotal;

      // Compile remarks with any custom charges list
      let customRemarks = '';
      if (formData.customCharges && formData.customCharges.length > 0) {
        customRemarks = formData.customCharges
          .filter(c => c.name && parseFloat(c.amount) > 0)
          .map(c => `${c.name}: ₹${c.amount}`)
          .join(', ');
      }

      const isManualDocket = formData.docketNumberMode === 'manual';
      const customDocNum = (formData.customDocketNumber || '').trim();

      if (isManualDocket && !customDocNum) {
        alert('Please enter a custom Docket / LR number or switch to Auto-generate.');
        setIsLoading(false);
        return;
      }

      const isFtl = isOnlyFTL || (formData.loadType || 'PTL').toUpperCase() === 'FTL';

      const payload = {
        docket_number: isManualDocket ? customDocNum : undefined,
        lr_number: isManualDocket ? customDocNum : undefined,
        origin_branch_id: formData.originBranchId || undefined,
        dest_branch_id: isFtl ? null : (formData.destBranchId || undefined),
        origin_city: formData.originCity,
        destination_city: isFtl ? (formData.consigneeCity || formData.destinationCity) : formData.destinationCity,
        consignor_id: formData.consignorId || undefined,
        consignor_name: formData.consignorName || 'Shipper Party',
        consignor_phone: formData.consignorPhone ? formData.consignorPhone.replace(/\D/g, '') : undefined,
        consignor_address: formData.consignorAddress || undefined,
        consignee_id: formData.consigneeId || undefined,
        consignee_name: formData.consigneeName || 'Consignee Party',
        consignee_phone: formData.consigneePhone ? formData.consigneePhone.replace(/\D/g, '') : undefined,
        consignee_address: formData.consigneeAddress || undefined,
        material_description: formData.cargoType || 'General Freight',
        packages_count: parseInt(formData.packagesCount, 10) || 10,
        actual_weight: parseFloat(formData.weightKg) || 0,
        charged_weight: parseFloat(formData.weightKg) || 0,
        rate_type: isFtl && (formData.ftlPricingMode || 'FIXED') === 'FIXED' ? 'FIXED' : 'PER_KG',
        rate: isFtl && (formData.ftlPricingMode || 'FIXED') === 'FIXED' ? 0 : (parseFloat(formData.ratePerKg) || 0),
        freight_amount: breakdown.basicFreight,
        loading_charges: breakdown.loading,
        hamali_charges: 0,
        unloading_charges: breakdown.unloading,
        door_delivery_charges: breakdown.doorDelivery,
        handling_charges: breakdown.biltyFee,
        other_charges: otherTotal,
        discount_amount: breakdown.discount,
        tax_percent: breakdown.taxPercent,
        tax_amount: breakdown.taxAmount,
        total_amount: breakdown.totalDocketFreight,
        is_rcm: breakdown.isRcm,
        gst_mode: formData.gstMode,
        payment_type: formData.paymentMode || 'TO_PAY',
        transport_mode: formData.transportMode || 'ROAD',
        load_type: (formData.loadType || 'PTL').toUpperCase() === 'FTL' ? 'FTL' : 'PTL',
        delivery_type: formData.deliveryType || (breakdown.doorDelivery > 0 ? 'DOOR_DELIVERY' : 'GODOWN_DELIVERY'),
        pickup_address: formData.consignorAddress || formData.consignorCity || formData.originCity,
        delivery_address: formData.consigneeAddress || formData.consigneeCity || formData.destinationCity,
        booking_remarks: [
          formData.loadType === 'FTL' && formData.ftlVehicleType ? `FTL Vehicle: ${formData.ftlVehicleType}` : null,
          customRemarks ? `Additional Charges: ${customRemarks}` : null,
        ].filter(Boolean).join(' | ') || undefined,
      };

      const res = await api.post('/bookings', payload);
      setIsDrawerOpen(false);
      setShowConsignorDropdown(false);
      setShowConsigneeDropdown(false);
      setBookingStep(1);
      // Capture customer details entered in form before resetting formData
      const submittedConsignor = {
        name: formData.consignorName || 'Shipper Party',
        city: formData.consignorCity || formData.originCity || 'Origin City',
        phone: formData.consignorPhone || '',
        address: formData.consignorAddress || '',
      };
      const submittedConsignee = {
        name: formData.consigneeName || 'Consignee Party',
        city: formData.consigneeCity || formData.destinationCity || 'Destination City',
        phone: formData.consigneePhone || '',
        address: formData.consigneeAddress || '',
      };

      setFormData({
        docketNumberMode: 'auto',
        customDocketNumber: '',
        consignorName: '',
        consignorCity: '',
        consignorAddress: '',
        consignorPhone: '',
        consignorId: '',
        consigneeName: '',
        consigneeCity: '',
        consigneeAddress: '',
        consigneePhone: '',
        consigneeId: '',
        originBranchId: formData.originBranchId,
        destBranchId: formData.destBranchId,
        originCity: formData.originCity || 'Delhi (DEL)',
        destinationCity: formData.destinationCity || 'Bengaluru (BLR)',
        cargoType: 'Industrial Goods',
        packagesCount: '50',
        weightKg: '2500',
        ratePerKg: '18',
        paymentMode: 'TO_PAY',
        pickupDate: new Date().toISOString().split('T')[0],
        transportMode: 'ROAD',
        deliveryType: 'GODOWN_DELIVERY',
        loadType: 'PTL',
        ftlVehicleType: '',
        ftlPricingMode: 'FIXED',
        ftlFreightAmount: '',
        loadingCharges: '450',
        unloadingCharges: '0',
        doorDeliveryCharges: '0',
        biltyFee: '50',
        customCharges: [],
        discountAmount: '0',
        gstMode: 'RCM',
      });
      fetchDocketSeriesPreview();

      const updated = await fetchConsignments();
      if (res.data?.data) {
        const foundInUpdated = Array.isArray(updated)
          ? updated.find(item => item.id === res.data.data.id || item.lr_number === (res.data.data.docket_number || res.data.data.lr_number))
          : null;
        let createdConsignment = foundInUpdated || mapConsignmentFromApi(res.data.data);

        // Ensure consignor and consignee are accurately set even if the server response missed associations
        if ((!createdConsignment.consignor?.name || createdConsignment.consignor.name === 'Commercial Consignor' || createdConsignment.consignor.name === 'Consignor Shipper') && submittedConsignor.name) {
          createdConsignment = {
            ...createdConsignment,
            consignor: {
              ...createdConsignment.consignor,
              name: submittedConsignor.name,
              city: submittedConsignor.city,
              phone: submittedConsignor.phone,
              address: submittedConsignor.address,
            }
          };
        }
        if ((!createdConsignment.consignee?.name || createdConsignment.consignee.name === 'Commercial Consignee' || createdConsignment.consignee.name === 'Consignee Receiver') && submittedConsignee.name) {
          createdConsignment = {
            ...createdConsignment,
            consignee: {
              ...createdConsignment.consignee,
              name: submittedConsignee.name,
              city: submittedConsignee.city,
              phone: submittedConsignee.phone,
              address: submittedConsignee.address,
            }
          };
        }

        setSelectedConsignment(createdConsignment);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      console.error('Failed to create booking:', err);
      alert(err.response?.data?.message || 'Failed to create booking in database. Please verify inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  const bookingColumns = useMemo(
    () => [
      {
        key: 'lr_number',
        header: 'Docket No. (LR / Bilty)',
        sortable: true,
        width: 175,
        minWidth: 140,
        exportValue: (row) => `${row.lr_number} [${(row.load_type || 'PTL') === 'FTL' ? 'FTL' : 'PTL'}]`,
        render: (val, row) => {
          const isFtl = (row.load_type || 'PTL') === 'FTL';
          return (
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className={`font-mono font-bold group-hover:underline flex items-center gap-1 ${
                  isDark ? 'text-cyan-400' : 'text-blue-600'
                }`}>
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>{row.lr_number}</span>
                </div>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${
                  isFtl
                    ? isDark
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-purple-50 text-purple-700 border-purple-300'
                    : isDark
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  {isFtl ? '🚛 FTL' : '📦 PTL'}
                </span>
              </div>
              <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {row.booking_id}
              </div>
            </div>
          );
        },
      },
      {
        key: 'booking_date',
        header: 'Date',
        sortable: true,
        width: 110,
        minWidth: 95,
        exportValue: (row) => row.booking_date,
        render: (val, row) => (
          <span className={`text-[11px] whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {row.booking_date}
          </span>
        ),
      },
      {
        key: 'origin_city',
        header: 'Corridor & Destination',
        sortable: true,
        width: 195,
        minWidth: 160,
        exportValue: (row) => `From: ${row.origin_branch_code || row.origin_city} ➔ To: ${row.dest_branch_code || row.destination_city} (${row.transport_mode || 'ROAD'})`,
        render: (val, row) => (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] inline-flex items-center gap-1 ${
                isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-800'
              }`}>
                <span className="text-cyan-500 dark:text-cyan-400 font-bold">[{row.origin_branch_code || row.origin_city.slice(0, 3).toUpperCase()}]</span>
                <span className="text-slate-400">➔</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">[{row.dest_branch_code || row.destination_city.slice(0, 3).toUpperCase()}]</span>
              </span>
            </div>
            {/* Clear Destination Branch Line */}
            <div className={`text-[10px] truncate mt-1 flex items-center gap-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`} title={`Destination Branch: ${row.dest_branch_name || row.destination_city}`}>
              <Building2 className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
              <span className="truncate">Goes to: <strong className="font-semibold">{row.dest_branch_name || row.destination_city}</strong></span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px]">
              {row.transport_mode === 'AIR' ? (
                <span className={`inline-flex items-center gap-1 font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  <Plane className="w-3 h-3" /> By Air
                </span>
              ) : row.transport_mode === 'RAIL' ? (
                <span className={`inline-flex items-center gap-1 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Train className="w-3 h-3" /> By Rail
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  <Truck className="w-3 h-3" /> By Road
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'consignor',
        header: 'Consignor (Shipper)',
        sortable: false,
        width: 180,
        minWidth: 130,
        exportValue: (row) => `${row.consignor?.name || ''} (${row.consignor?.city || ''})`,
        render: (val, row) => (
          <div className="max-w-[170px] truncate">
            <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.consignor?.name}
            </div>
            <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {row.consignor?.segment} • {row.consignor?.city}
            </div>
          </div>
        ),
      },
      {
        key: 'consignee',
        header: 'Consignee (Receiver)',
        sortable: false,
        width: 180,
        minWidth: 130,
        exportValue: (row) => `${row.consignee?.name || ''} (${row.consignee?.city || ''})`,
        render: (val, row) => (
          <div className="max-w-[170px] truncate">
            <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.consignee?.name}
            </div>
            <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {row.consignee?.segment} • {row.consignee?.city}
            </div>
          </div>
        ),
      },
      {
        key: 'charged_weight',
        header: 'Cargo & Weight',
        sortable: true,
        width: 160,
        minWidth: 130,
        exportValue: (row) => `${row.packages_count} Pkgs • ${row.charged_weight} KG (${row.cargo_type})`,
        render: (val, row) => (
          <div className="whitespace-nowrap">
            <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {row.packages_count} Pkgs • {row.charged_weight} KG
            </div>
            <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {row.cargo_type}
            </div>
          </div>
        ),
      },
      {
        key: 'vehicle_number',
        header: 'Vehicle & Driver',
        sortable: false,
        width: 160,
        minWidth: 130,
        exportValue: (row) => `${row.vehicle_number} (${row.driver_name})`,
        render: (val, row) => {
          const isAssigned = row.vehicle_number && row.vehicle_number !== 'Unassigned';
          return (
            <div className="whitespace-nowrap">
              {isAssigned ? (
                <>
                  <div className={`font-mono font-bold text-xs ${isDark ? 'text-cyan-300' : 'text-blue-700'}`}>
                    {row.vehicle_number}
                  </div>
                  <div className={`text-[10.5px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {row.driver_name}{row.driver_phone ? ` • ${row.driver_phone}` : ''}
                  </div>
                  {row.trip_number && (
                    <div className={`text-[9px] font-mono font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      Trip: {row.trip_number}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Unassigned
                  </div>
                  <div className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Pending Allocation
                  </div>
                </>
              )}
            </div>
          );
        },
      },
      {
        key: 'total_amount',
        header: 'Freight',
        sortable: true,
        align: 'right',
        width: 130,
        minWidth: 110,
        exportValue: (row) => row.total_amount,
        render: (val, row) => (
          <div className="text-right whitespace-nowrap">
            <div className={`font-black font-mono text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ₹ {row.total_amount?.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${row.payment_mode === 'PAID'
                  ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                {row.payment_mode}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${row.delivery_type === 'DOOR_DELIVERY'
                  ? isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title={row.delivery_type === 'DOOR_DELIVERY' ? 'Door Delivery' : 'Godown Delivery'}>
                {row.delivery_type === 'DOOR_DELIVERY' ? 'Door' : 'Godown'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status & Location',
        sortable: true,
        align: 'center',
        width: 200,
        minWidth: 175,
        exportValue: (row) => `${row.status_label} - ${row.present_location_title || ''}`,
        render: (val, row) => (
          <div className="text-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.status === 'IN_TRANSIT' || row.status === 'DISPATCHED' || row.status === 'ON_TRIP'
                ? isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                : row.status === 'DELIVERED' || row.status === 'COMPLETED'
                  ? isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : row.status === 'DELAYED' || row.status === 'HOLD' || row.status === 'DAMAGED'
                    ? isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
                    : row.status === 'REACHED_DESTINATION' || row.status === 'OUT_FOR_DELIVERY'
                      ? isDark ? 'bg-teal-500/15 text-teal-300 border-teal-500/30' : 'bg-teal-50 text-teal-800 border-teal-200'
                      : row.status === 'RECEIVED_AT_HUB'
                        ? isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200'
                        : isDark ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'
              }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
              {row.status_label}
            </span>

            {/* Current Present Location Badge */}
            <div
              className={`text-[10px] mt-1 font-semibold truncate flex items-center justify-center gap-1 ${
                row.present_location_type === 'IN_TRANSIT'
                  ? isDark ? 'text-cyan-400' : 'text-blue-700'
                  : row.present_location_type === 'DELIVERED'
                  ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                  : row.present_location_type === 'DEST_GODOWN'
                  ? isDark ? 'text-teal-300' : 'text-teal-700'
                  : isDark ? 'text-amber-300' : 'text-amber-700'
              }`}
              title={`${row.present_location_title} — ${row.present_location_detail}`}
            >
              <MapPin className="w-2.5 h-2.5 shrink-0 opacity-80" />
              <span className="truncate max-w-[185px]">
                {row.present_location_title}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        width: 150,
        minWidth: 130,
        excludeFromExport: true,
        resizable: false,
        render: (val, row) => {
          const isDelivered = Boolean(
            row.is_delivered ||
            ['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(row.status)
          );

          return (
            <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleOpenDetails(row)}
                className={`p-1.5 rounded-lg border transition-all ${isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'
                  }`}
                title="View Consignment Details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {canEdit && !isDelivered && (
                <button
                  onClick={() => handleOpenEdit(row)}
                  className={`p-1.5 rounded-lg border transition-all ${isDark
                      ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10'
                      : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                  title="Edit Docket"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {canDelete && !isDelivered && (
                <button
                  onClick={() => handleOpenDelete(row)}
                  className={`p-1.5 rounded-lg border transition-all ${isDark
                      ? 'bg-slate-900 border-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10'
                      : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    }`}
                  title="Delete Docket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => handleOpenPrintPreview(row)}
                className={`p-1.5 rounded-lg border transition-all ${isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'
                  }`}
                title="Print 3-Part Lorry Receipt / Bilty"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [isDark, canEdit, canDelete]
  );

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
      } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                  Bookings & Consignments
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {totalBookingsCount} total consignments registered in tenant database.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {isAdmin && (
                <BranchFilterDropdown
                  selectedBranchId={selectedBranchId}
                  onChange={handleBranchChange}
                  branches={branchesList}
                  allLabel="All Branches (Network-wide)"
                  allSubtitle="Consolidated Consignments & Dockets"
                  label="Branch:"
                  showLabel={true}
                  align="right"
                />
              )}

              {canCreateBooking && (
                <button
                  onClick={() => {
                    setBookingStep(1);
                    setFormData(prev => ({
                      ...prev,
                      docketNumberMode: 'auto',
                      customDocketNumber: '',
                      deliveryType: 'DOOR_DELIVERY',
                      doorDeliveryCharges: parseFloat(prev.doorDeliveryCharges || 0) < 100 ? '100' : prev.doorDeliveryCharges,
                      originBranchId: selectedBranchId !== 'ALL' ? selectedBranchId : prev.originBranchId,
                    }));
                    fetchDocketSeriesPreview();
                    setIsDrawerOpen(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Booking</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all duration-200 shadow-sm ${isDark
                      ? 'bg-[#0B1020]/90 border-slate-800/90'
                      : 'bg-white border-slate-200'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {kpi.title}
                    </span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-blue-600'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {kpi.count}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                    <span className="font-bold text-emerald-400">{kpi.change}</span>
                    <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{kpi.subtext}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consignment Master Register Server-side DataTable */}
          <DataTable
            columns={bookingColumns}
            data={consignments}
            totalCount={totalCount}
            isLoading={isLoading}
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
            searchQuery={searchQuery}
            onSearchChange={(val) => setSearchQuery(val)}
            searchPlaceholder="Search by LR #, Consignor, Consignee, Vehicle, Route..."
            dateFilterSlot={
              <DateRangeFilter
                fromDate={fromDate}
                toDate={toDate}
                onChange={({ fromDate: newFrom, toDate: newTo }) => {
                  setFromDate(newFrom);
                  setToDate(newTo);
                  setPage(1);
                }}
                onClear={() => {
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
              />
            }
            onExportDateRange={() => setIsExportModalOpen(true)}
            onExportAll={handleExportAll}
            onRowClick={(row) => handleOpenDetails(row)}
            exportFilename="Consignment_Register"
            emptyTitle="No Dockets (LR / Bilty) Found"
            emptySubtitle="Your database is clean or no consignments match the active filters. Register your first consignment note to issue an official digital bilty."
            emptyActionSlot={
              canCreateBooking ? (
                <button
                  onClick={() => {
                    setBookingStep(1);
                    setIsDrawerOpen(true);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Booking</span>
                </button>
              ) : null
            }
            filtersSlot={
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setStatusFilter('PENDING'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'PENDING'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-slate-900 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Pending / Dock ({pendingOrGodownCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('FOR_DELIVERY'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'FOR_DELIVERY' || statusFilter === 'REACHED_DESTINATION'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-slate-900 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Ready for Delivery ({forDeliveryCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('DELAYED'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'DELAYED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-slate-900 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Delayed ({delayedCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('IN_TRANSIT'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'IN_TRANSIT'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : isDark
                        ? 'bg-slate-900 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  In Transit ({inTransitCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('DELIVERED'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'DELIVERED'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-slate-900 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Delivered ({deliveredCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ALL'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-slate-900 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  All ({totalBookingsCount})
                </button>

                {/* Movement / Load Type Filter (PTL vs FTL) - Only shown for hybrid (BOTH) transporters */}
                {isBoth && (
                  <div className={`hidden sm:flex items-center ml-2 p-0.5 rounded-xl border ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-200/70 border-slate-300/80'
                  }`}>
                    <button
                      type="button"
                      onClick={() => { setLoadTypeFilter('ALL'); setPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        loadTypeFilter === 'ALL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Loads
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoadTypeFilter('PTL'); setPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        loadTypeFilter === 'PTL'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>📦</span>
                      <span>PTL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoadTypeFilter('FTL'); setPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        loadTypeFilter === 'FTL'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🚛</span>
                      <span>FTL</span>
                    </button>
                  </div>
                )}
              </div>
            }
          />

        </main>
      </div>

      {/* ======================================================== */}
      {/* 3-STEP CENTERED NEW BOOKING MODAL */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex min-h-full items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Modal Body */}
          <div className={`relative w-full max-w-4xl max-h-[92vh] my-auto rounded-3xl shadow-2xl flex flex-col z-10 border overflow-hidden ${isDark ? 'bg-[#0A0E1A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>

            {/* Modal Header */}
            <div className={`p-4 sm:p-5 px-6 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${isDark
                      ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                    DOCKET (LR / BILTY)
                  </span>
                  <h2 className="text-lg font-bold">Issue New Consignment</h2>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  3-Step Consignment Note & Rate Calculation
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TOP BAR: UNIFIED DOCKET RIBBON (Number + Auto/Manual Toggle + Series Info) */}
            <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap shrink-0 ${
              isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-slate-50/90 border-slate-200'
            }`}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Docket No:
                  </span>
                  {formData.docketNumberMode === 'manual' ? (
                    <input
                      type="text"
                      required
                      placeholder="ENTER DOCKET NUMBER"
                      value={formData.customDocketNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customDocketNumber: e.target.value.toUpperCase().replace(/\s+/g, '')
                      }))}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-black uppercase tracking-wider focus:outline-none w-44 ${
                        isDark
                          ? 'bg-slate-900 border-amber-500/40 text-amber-300 placeholder-slate-600 focus:border-amber-400'
                          : 'bg-white border-amber-300 text-amber-800 placeholder-slate-400 focus:border-amber-500'
                      }`}
                    />
                  ) : (
                    <span className="font-mono text-sm font-black text-blue-600 dark:text-cyan-400 tracking-wide">
                      {docketSeriesPreview?.nextNumber || 'BAL000001'}
                    </span>
                  )}
                </div>

                {/* Mode Toggle Switch */}
                <div className={`inline-flex p-0.5 rounded-lg border ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-200/70 border-slate-300/60'
                }`}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, docketNumberMode: 'auto', customDocketNumber: '' }))}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      formData.docketNumberMode === 'auto'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, docketNumberMode: 'manual' }))}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      formData.docketNumberMode === 'manual'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Manual</span>
                  </button>
                </div>
              </div>

              {/* Right: Series info + Info Tooltip */}
              <div className="flex items-center gap-2.5">
                {formData.docketNumberMode === 'auto' ? (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    Series: <b className="text-cyan-600 dark:text-cyan-400">{docketSeriesPreview?.prefix || 'BAL'}</b>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                    Physical Stationery
                  </span>
                )}

                {isAdmin && formData.docketNumberMode === 'auto' && (
                  <Link
                    href="/settings?tab=terminology"
                    target="_blank"
                    title="Configure Docket Series"
                    className={`text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                      isDark
                        ? 'border-slate-800 text-slate-400 hover:text-cyan-400'
                        : 'border-slate-200 text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    <span>Config</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                )}

                <div className="relative group flex items-center">
                  <div
                    role="tooltip"
                    tabIndex={0}
                    className={`w-5 h-5 rounded-full flex items-center justify-center border cursor-help text-[11px] transition-all ${
                      isDark ? 'border-slate-700 text-slate-400 hover:text-cyan-400' : 'border-slate-300 text-slate-500 hover:text-blue-600'
                    }`}
                  >
                    <Info className="w-3 h-3" />
                  </div>
                  <div className="absolute right-0 top-full mt-2 hidden group-hover:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow-2xl border z-50 whitespace-nowrap pointer-events-none bg-slate-900 border-slate-700 text-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Consignment numbers & addresses verified against GSTIN master.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className={`px-6 py-3 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/80'
              }`}>
              <button
                type="button"
                onClick={() => setBookingStep(1)}
                className="flex items-center space-x-2 cursor-pointer focus:outline-none"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === 1
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                  {bookingStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <span className={`text-xs font-bold ${bookingStep === 1
                    ? isDark ? 'text-cyan-400' : 'text-blue-600'
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                  1. Movement & Parties
                </span>
              </button>
              <div className={`w-8 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={() => {
                  if (isStep1Valid) setBookingStep(2);
                }}
                className={`flex items-center space-x-2 focus:outline-none transition-opacity ${isStep1Valid ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50'
                  }`}
                title={!isStep1Valid ? 'Fill mandatory fields in Step 1 to unlock' : 'Route & Transit'}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === 2
                    ? 'bg-blue-600 text-white'
                    : bookingStep > 2
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                  }`}>
                  {bookingStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <span className={`text-xs font-bold ${bookingStep === 2
                    ? isDark ? 'text-cyan-400' : 'text-blue-600'
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                  2. Route & Transit
                </span>
              </button>
              <div className={`w-8 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <button
                type="button"
                disabled={!isStep1Valid || !isStep2Valid}
                onClick={() => {
                  if (isStep1Valid && isStep2Valid) setBookingStep(3);
                }}
                className={`flex items-center space-x-2 focus:outline-none transition-opacity ${isStep1Valid && isStep2Valid ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50'
                  }`}
                title={!isStep1Valid || !isStep2Valid ? 'Fill mandatory fields in Steps 1 & 2 to unlock' : 'Cargo & Rates'}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === 3
                    ? 'bg-blue-600 text-white'
                    : bookingStep > 3
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                  }`}>
                  {bookingStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
                </div>
                <span className={`text-xs font-bold ${bookingStep === 3
                    ? isDark ? 'text-cyan-400' : 'text-blue-600'
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                  3. Cargo & Rates
                </span>
              </button>
              <div className={`w-8 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <button
                type="button"
                disabled={!isStep1Valid || !isStep2Valid || !isStep3Valid}
                onClick={() => {
                  if (isStep1Valid && isStep2Valid && isStep3Valid) setBookingStep(4);
                }}
                className={`flex items-center space-x-2 focus:outline-none transition-opacity ${isStep1Valid && isStep2Valid && isStep3Valid ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50'
                  }`}
                title={!isStep1Valid || !isStep2Valid || !isStep3Valid ? 'Fill mandatory fields in Steps 1, 2 & 3 to unlock' : 'Confirm'}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === 4
                    ? 'bg-blue-600 text-white'
                    : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                  }`}>
                  4
                </div>
                <span className={`text-xs font-bold ${bookingStep === 4
                    ? isDark ? 'text-cyan-400' : 'text-blue-600'
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                  4. Confirm
                </span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateBookingSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-28 space-y-5">

                {/* STEP 1: Parties & Route Hubs */}
                {bookingStep === 1 && (
                  <div className="space-y-4">

                    {/* Consignment Movement Type Selector (PTL vs FTL) */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isDark ? 'bg-blue-500/20 text-cyan-400' : 'bg-blue-100 text-blue-700'
                          }`}>
                            <Truck className="w-3.5 h-3.5" />
                          </span>
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Consignment Movement Type <span className="text-rose-500">*</span>
                          </span>
                        </div>
                        {(formData.loadType || 'PTL') === 'FTL' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25">
                            Dedicated Vehicle • Direct Point-to-Point
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Sundry / Loose Load • Hub Consolidation
                          </span>
                        )}
                      </div>

                      {isOnlyFTL ? (
                        <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">🚛</span>
                            <div>
                              <span className="font-bold text-xs block">Full Truck Load (FTL) Booking</span>
                              <span className="text-[10.5px] text-purple-600/90 dark:text-purple-300/80">
                                Dedicated point-to-point vehicle movement (Transporter set to FTL operations)
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-600 text-white shadow-xs shrink-0">
                            Dedicated FTL
                          </span>
                        </div>
                      ) : isOnlyPTL ? (
                        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">📦</span>
                            <div>
                              <span className="font-bold text-xs block">Part Truck Load (PTL / Sundry) Booking</span>
                              <span className="text-[10.5px] text-amber-700/90 dark:text-amber-300/80">
                                Loose parcels &amp; sundry bilties for hub consolidation and load planning
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-xs shrink-0">
                            Sundry PTL
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* PTL Option */}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, loadType: 'PTL' }))}
                            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              (formData.loadType || 'PTL') === 'PTL'
                                ? isDark
                                  ? 'bg-amber-500/10 border-amber-500/70 text-white ring-2 ring-amber-500/30 shadow-xs'
                                  : 'bg-amber-50/80 border-amber-400 text-slate-900 ring-2 ring-amber-400/30 shadow-xs'
                                : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs flex items-center gap-2">
                                <span className="text-base">📦</span>
                                <span>PTL (Part Truck Load)</span>
                              </span>
                              {(formData.loadType || 'PTL') === 'PTL' ? (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                  Selected
                                </span>
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-400" />
                              )}
                            </div>
                            <p className={`text-[10.5px] mt-1 leading-snug line-clamp-1 sm:line-clamp-none ${
                              (formData.loadType || 'PTL') === 'PTL'
                                ? isDark ? 'text-amber-300/90' : 'text-amber-900/80 font-medium'
                                : 'text-slate-400'
                            }`}>
                              Loose parcels, packages &amp; sundry bilties consolidated with other cargo at hubs.
                            </p>
                          </button>

                          {/* FTL Option */}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              loadType: 'FTL',
                              transportMode: 'ROAD',
                              deliveryType: 'DOOR_DELIVERY',
                              ftlPricingMode: prev.ftlPricingMode || 'FIXED'
                            }))}
                            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              (formData.loadType || 'PTL') === 'FTL'
                                ? isDark
                                  ? 'bg-purple-500/10 border-purple-500/70 text-white ring-2 ring-purple-500/30 shadow-xs'
                                  : 'bg-purple-50/80 border-purple-400 text-slate-900 ring-2 ring-purple-400/30 shadow-xs'
                                : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs flex items-center gap-2">
                                <span className="text-base">🚛</span>
                                <span>FTL (Full Truck Load)</span>
                              </span>
                              {(formData.loadType || 'PTL') === 'FTL' ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    Direct • No Hub
                                  </span>
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-xs">
                                    Selected
                                  </span>
                                </div>
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-400" />
                              )}
                            </div>
                            <p className={`text-[10.5px] mt-1 leading-snug line-clamp-1 sm:line-clamp-none ${
                              (formData.loadType || 'PTL') === 'FTL'
                                ? isDark ? 'text-purple-300/90' : 'text-purple-900/80 font-medium'
                                : 'text-slate-400'
                            }`}>
                              Entire dedicated truck from shipper direct to consignee with no cross-docking.
                            </p>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 2-Column Parties Grid: Consignor (Shipper) and Consignee (Receiver) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                      {/* 1. CONSIGNOR (SHIPPER) CARD */}
                      <div
                        className={`p-4 rounded-2xl border transition-all relative ${
                          !isManualConsignor && showConsignorDropdown ? 'z-50' : 'z-30'
                        } ${
                          formData.consignorId
                            ? isDark
                              ? 'bg-cyan-950/20 border-cyan-500/40 shadow-sm'
                              : 'bg-cyan-50/50 border-cyan-300 shadow-xs'
                            : isDark
                            ? 'bg-slate-900/60 border-slate-800'
                            : 'bg-slate-50/80 border-slate-200'
                        }`}
                        ref={consignorDropdownRef}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
                            }`}>
                              <Building2 className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  Consignor (Shipper)
                                </span>
                                <span className="text-rose-500 font-bold">*</span>
                              </div>
                            </div>
                          </div>

                          {/* Mode Actions */}
                          <div>
                            {formData.consignorId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    consignorName: '',
                                    consignorId: '',
                                    consignorPhone: '',
                                    consignorAddress: '',
                                    consignorCity: ''
                                  }));
                                  setIsManualConsignor(false);
                                  setShowConsignorDropdown(true);
                                }}
                                className="text-[11px] font-bold text-cyan-500 hover:text-cyan-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Change Shipper</span>
                              </button>
                            ) : isManualConsignor ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsManualConsignor(false);
                                  setShowConsignorDropdown(true);
                                }}
                                className={`text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                  isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                                }`}
                              >
                                <Search className="w-3 h-3" />
                                <span>Select Registered</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsManualConsignor(true);
                                  setShowConsignorDropdown(false);
                                }}
                                className={`text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                  isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
                                }`}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>+ Not Registered Shipper</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Case 1: Confirmed Registered Customer Card */}
                        {formData.consignorId ? (
                          <div className="space-y-2.5 animate-in fade-in duration-150">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                  {formData.consignorName}
                                </h4>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30">
                                  <UserCheck className="w-3 h-3" />
                                  Verified CRM Customer
                                </span>
                              </div>

                              <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                                {formData.consignorPhone && (
                                  <span className="flex items-center gap-1 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                    <Phone className="w-3 h-3" />
                                    {formData.consignorPhone}
                                  </span>
                                )}
                                {formData.consignorCity && (
                                  <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium">
                                    <MapPin className="w-3 h-3" />
                                    {formData.consignorCity}
                                  </span>
                                )}
                              </div>

                              {formData.consignorAddress && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2" title={formData.consignorAddress}>
                                  {formData.consignorAddress}
                                </p>
                              )}
                            </div>

                            {/* TBB Credit Limit Status */}
                            {(() => {
                              const sc = (customersList || []).find(c => c.id === formData.consignorId);
                              if (!sc || (!sc.credit_days && !parseFloat(sc.credit_limit || 0))) return null;
                              const limit = parseFloat(sc.credit_limit || 0);
                              const outstanding = parseFloat(sc.outstanding_freight || sc.current_balance || 0);
                              const available = Math.max(0, limit - outstanding);
                              const isBreached = limit > 0 && available <= 0;
                              const scBranchCap = sc.branch_cap || (sc.branch?.max_customer_credit_limit ? parseFloat(sc.branch.max_customer_credit_limit) : 1000000);
                              const isHoApproved = limit > scBranchCap;

                              return (
                                <div className={`p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                                  isBreached
                                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                    : isDark
                                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                                }`}>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold shrink-0">⭐ TBB Credit:</span>
                                    <span className="truncate font-mono">Limit: ₹{limit.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`font-mono font-bold ${isBreached ? 'text-rose-400' : 'text-emerald-500'}`}>
                                      {isBreached ? '⚠️ Limit Exhausted' : `Avail: ₹${available.toLocaleString('en-IN')}`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : isManualConsignor ? (
                          /* Case 2: Manual / Not Registered Shipper */
                          <div className="space-y-2.5 animate-in fade-in duration-150">
                            <div>
                              <label className="text-[11px] font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                Shipper / Consignor Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Person or Company Name (Not Registered)"
                                value={formData.consignorName}
                                onChange={(e) => setFormData(prev => ({ ...prev, consignorName: e.target.value, consignorId: '' }))}
                                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                  isDark
                                    ? 'border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-cyan-400'
                                    : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                }`}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                  Mobile Number <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    ref={consignorPhoneRef}
                                    type="tel"
                                    maxLength={10}
                                    required
                                    placeholder="10-digit mobile"
                                    value={formData.consignorPhone || ''}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                      setFormData(prev => ({ ...prev, consignorPhone: val }));
                                    }}
                                    className={`w-full px-3 py-2 pr-7 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-all ${
                                      (formData.consignorPhone || '').replace(/\D/g, '').length === 10
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500'
                                        : (formData.consignorPhone || '').length > 0
                                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 focus:border-rose-500'
                                        : isDark
                                        ? 'border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-cyan-400'
                                        : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                                  />
                                  {(formData.consignorPhone || '').replace(/\D/g, '').length === 10 && (
                                    <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                                  )}
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                  Pickup Address / City
                                </label>
                                <input
                                  type="text"
                                  placeholder="Premises / City"
                                  value={formData.consignorAddress || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, consignorAddress: e.target.value }))}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-cyan-400'
                                      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Case 3: Search Registered Shipper */
                          <div className="relative">
                            <div ref={consignorInputRef} className="relative">
                              <input
                                type="text"
                                placeholder="Search registered shipper by name, code, phone..."
                                value={formData.consignorName}
                                onFocus={() => {
                                  updateConsignorCoords();
                                  setShowConsignorDropdown(true);
                                }}
                                onChange={(e) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    consignorName: e.target.value,
                                    consignorId: ''
                                  }));
                                  updateConsignorCoords();
                                  setShowConsignorDropdown(true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    setShowConsignorDropdown(false);
                                    const trimmed = (formData.consignorName || '').trim();
                                    if (trimmed && !formData.consignorId) {
                                      const exactMatch = customersList.find(
                                        (c) => (c.name || '').toLowerCase() === trimmed.toLowerCase()
                                      );
                                      if (exactMatch) {
                                        const isTbb = (parseInt(exactMatch.credit_days, 10) > 0 || parseFloat(exactMatch.credit_limit || 0) > 0);
                                        setFormData((prev) => ({
                                          ...prev,
                                          consignorName: exactMatch.name,
                                          consignorId: exactMatch.id,
                                          consignorPhone: exactMatch.phone || '',
                                          consignorAddress: exactMatch.billing_address || exactMatch.address || '',
                                          consignorCity: exactMatch.city || prev.consignorCity,
                                          paymentMode: isTbb ? 'TBB' : prev.paymentMode,
                                        }));
                                        setIsManualConsignor(false);
                                      } else {
                                        setIsManualConsignor(true);
                                        setTimeout(() => consignorPhoneRef.current?.focus(), 100);
                                      }
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  const trimmed = (formData.consignorName || '').trim();
                                  if (trimmed && !formData.consignorId) {
                                    const exactMatch = customersList.find(
                                      (c) => (c.name || '').toLowerCase() === trimmed.toLowerCase()
                                    );
                                    if (exactMatch) {
                                      const isTbb = (parseInt(exactMatch.credit_days, 10) > 0 || parseFloat(exactMatch.credit_limit || 0) > 0);
                                      setFormData((prev) => ({
                                        ...prev,
                                        consignorName: exactMatch.name,
                                        consignorId: exactMatch.id,
                                        consignorPhone: exactMatch.phone || '',
                                        consignorAddress: exactMatch.billing_address || exactMatch.address || '',
                                        consignorCity: exactMatch.city || prev.consignorCity,
                                        paymentMode: isTbb ? 'TBB' : prev.paymentMode,
                                      }));
                                      setIsManualConsignor(false);
                                    }
                                  }
                                }}
                                className={`w-full px-3.5 py-2.5 pr-14 rounded-xl border text-xs focus:outline-none transition-colors ${
                                  isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                                    : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                }`}
                              />

                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {formData.consignorName && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        consignorName: '',
                                        consignorId: '',
                                        consignorPhone: '',
                                        consignorCity: '',
                                        consignorAddress: ''
                                      }));
                                      updateConsignorCoords();
                                      setShowConsignorDropdown(true);
                                    }}
                                    className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                    title="Clear input"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateConsignorCoords();
                                    setShowConsignorDropdown(prev => !prev);
                                  }}
                                  className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                  title="Toggle list"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showConsignorDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
                                </button>
                              </div>
                            </div>

                            {/* Portaled Floating Dropdown Menu */}
                            {showConsignorDropdown && typeof document !== 'undefined' && createPortal(
                              <div
                                ref={consignorDropdownMenuRef}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  position: 'fixed',
                                  left: `${consignorCoords.left}px`,
                                  width: `${consignorCoords.width}px`,
                                  maxHeight: `${consignorCoords.maxHeight}px`,
                                  zIndex: 99999,
                                  ...(consignorCoords.opensUpward
                                    ? { bottom: `${consignorCoords.bottom}px`, top: 'auto' }
                                    : { top: `${consignorCoords.top}px`, bottom: 'auto' }),
                                }}
                                className={`flex flex-col rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700/80 text-white shadow-cyan-950/40'
                                  : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/25'
                              }`}>
                                <div className={`px-3 py-2 border-b flex items-center justify-between text-[11px] font-semibold shrink-0 ${
                                  isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                                }`}>
                                  <span className="flex items-center gap-1.5 truncate">
                                    <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                    <span>
                                      {isAdmin || showAllConsignors ? `Registered (${filteredConsignors.length})` : `Nearest Shippers (${filteredConsignors.length})`}
                                    </span>
                                  </span>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {!isAdmin && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowAllConsignors(prev => !prev);
                                        }}
                                        className="text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer"
                                      >
                                        {showAllConsignors ? '⚡ Nearest' : '🌐 View All'}
                                      </button>
                                    )}
                                    <Link
                                      href="/customers"
                                      target="_blank"
                                      className="text-[10px] text-cyan-500 hover:underline flex items-center gap-0.5"
                                    >
                                      + CRM
                                    </Link>
                                  </div>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/40">
                                  {filteredConsignors.length > 0 ? (
                                    filteredConsignors.map((c) => {
                                      const isSelected = formData.consignorId === c.id;
                                      return (
                                        <div
                                          key={c.id}
                                          onClick={() => {
                                            const isTbb = (parseInt(c.credit_days, 10) > 0 || parseFloat(c.credit_limit || 0) > 0);
                                            setFormData(prev => ({
                                              ...prev,
                                              consignorName: c.name,
                                              consignorId: c.id,
                                              consignorPhone: c.phone || '',
                                              consignorAddress: c.billing_address || c.address || '',
                                              consignorCity: c.city || prev.consignorCity,
                                              paymentMode: isTbb ? 'TBB' : prev.paymentMode,
                                            }));
                                            setIsManualConsignor(false);
                                            setShowConsignorDropdown(false);
                                          }}
                                          className={`p-2.5 px-3 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                            isSelected
                                              ? isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-50 text-blue-900 font-semibold'
                                              : isDark
                                              ? 'hover:bg-slate-800/80 text-slate-200'
                                              : 'hover:bg-slate-50 text-slate-700'
                                          }`}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs font-bold truncate">{c.name}</span>
                                              <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-medium ${
                                                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                              }`}>
                                                {c.customer_code || 'ID:' + c.id}
                                              </span>
                                              {(parseInt(c.credit_days, 10) > 0 || parseFloat(c.credit_limit || 0) > 0) && (
                                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                                  ⭐ TBB
                                                </span>
                                              )}
                                            </div>
                                            <div className={`text-[11px] flex items-center gap-2 mt-0.5 flex-wrap ${
                                              isDark ? 'text-slate-400' : 'text-slate-500'
                                            }`}>
                                              {c.city && <span>📍 {c.city}</span>}
                                              {c.phone && <span>📞 {c.phone}</span>}
                                            </div>
                                          </div>
                                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                      No matching customers found.
                                    </div>
                                  )}
                                </div>

                                {formData.consignorName && (
                                  <div
                                    onClick={() => {
                                      setIsManualConsignor(true);
                                      setShowConsignorDropdown(false);
                                    }}
                                    className={`p-2 px-3 border-t text-xs cursor-pointer flex items-center justify-between font-medium shrink-0 ${
                                      isDark ? 'bg-slate-950/80 border-slate-800 text-cyan-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 text-blue-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>Use &quot;{formData.consignorName}&quot; as Not Registered Shipper</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>,
                              document.body
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. CONSIGNEE (RECEIVER) CARD */}
                      <div
                        className={`p-4 rounded-2xl border transition-all relative ${
                          !isManualConsignee && showConsigneeDropdown ? 'z-50' : 'z-20'
                        } ${
                          formData.consigneeId
                            ? isDark
                              ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                              : 'bg-blue-50/50 border-blue-300 shadow-xs'
                            : isDark
                            ? 'bg-slate-900/60 border-slate-800'
                            : 'bg-slate-50/80 border-slate-200'
                        }`}
                        ref={consigneeDropdownRef}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                            }`}>
                              <UserCheck className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  Consignee (Receiver)
                                </span>
                                <span className="text-rose-500 font-bold">*</span>
                              </div>
                            </div>
                          </div>

                          {/* Mode Actions */}
                          <div>
                            {formData.consigneeId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    consigneeName: '',
                                    consigneeId: '',
                                    consigneePhone: '',
                                    consigneeAddress: '',
                                    consigneeCity: ''
                                  }));
                                  setIsManualConsignee(false);
                                  setShowConsigneeDropdown(true);
                                }}
                                className="text-[11px] font-bold text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Change Receiver</span>
                              </button>
                            ) : isManualConsignee ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsManualConsignee(false);
                                  setShowConsigneeDropdown(true);
                                }}
                                className={`text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                  isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                                }`}
                              >
                                <Search className="w-3 h-3" />
                                <span>Select Registered</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsManualConsignee(true);
                                  setShowConsigneeDropdown(false);
                                }}
                                className={`text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                  isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
                                }`}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>+ Not Registered Receiver</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Case 1: Confirmed Registered Customer Card */}
                        {formData.consigneeId ? (
                          <div className="space-y-2.5 animate-in fade-in duration-150">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                  {formData.consigneeName}
                                </h4>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30">
                                  <UserCheck className="w-3 h-3" />
                                  Verified CRM Customer
                                </span>
                              </div>

                              <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                                {formData.consigneePhone && (
                                  <span className="flex items-center gap-1 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                    <Phone className="w-3 h-3" />
                                    {formData.consigneePhone}
                                  </span>
                                )}
                                {formData.consigneeCity && (
                                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                    <MapPin className="w-3 h-3" />
                                    {formData.consigneeCity}
                                  </span>
                                )}
                              </div>

                              {formData.consigneeAddress && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2" title={formData.consigneeAddress}>
                                  {formData.consigneeAddress}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : isManualConsignee ? (
                          /* Case 2: Manual / Not Registered Receiver */
                          <div className="space-y-2.5 animate-in fade-in duration-150">
                            <div>
                              <label className="text-[11px] font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                Receiver / Consignee Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Person or Company Name (Not Registered)"
                                value={formData.consigneeName}
                                onChange={(e) => setFormData(prev => ({ ...prev, consigneeName: e.target.value, consigneeId: '' }))}
                                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                  isDark
                                    ? 'border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-cyan-400'
                                    : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                }`}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                  Mobile Number <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    ref={consigneePhoneRef}
                                    type="tel"
                                    maxLength={10}
                                    required
                                    placeholder="10-digit mobile"
                                    value={formData.consigneePhone || ''}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                      setFormData(prev => ({ ...prev, consigneePhone: val }));
                                    }}
                                    className={`w-full px-3 py-2 pr-7 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-all ${
                                      (formData.consigneePhone || '').replace(/\D/g, '').length === 10
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500'
                                        : (formData.consigneePhone || '').length > 0
                                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 focus:border-rose-500'
                                        : isDark
                                        ? 'border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-cyan-400'
                                        : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                                  />
                                  {(formData.consigneePhone || '').replace(/\D/g, '').length === 10 && (
                                    <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                                  )}
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                  Delivery Destination / Address
                                </label>
                                <input
                                  type="text"
                                  placeholder="Shop / Plot / City"
                                  value={formData.consigneeAddress || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, consigneeAddress: e.target.value }))}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                    isDark
                                      ? 'border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-cyan-400'
                                      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Case 3: Search Registered Receiver */
                          <div className="relative">
                            <div ref={consigneeInputRef} className="relative">
                              <input
                                type="text"
                                placeholder="Search registered receiver by name, code, phone..."
                                value={formData.consigneeName}
                                onFocus={() => {
                                  updateConsigneeCoords();
                                  setShowConsigneeDropdown(true);
                                }}
                                onChange={(e) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    consigneeName: e.target.value,
                                    consigneeId: ''
                                  }));
                                  updateConsigneeCoords();
                                  setShowConsigneeDropdown(true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    setShowConsigneeDropdown(false);
                                    const trimmed = (formData.consigneeName || '').trim();
                                    if (trimmed && !formData.consigneeId) {
                                      const exactMatch = customersList.find(
                                        (c) => (c.name || '').toLowerCase() === trimmed.toLowerCase()
                                      );
                                      if (exactMatch) {
                                        setFormData((prev) => ({
                                          ...prev,
                                          consigneeName: exactMatch.name,
                                          consigneeId: exactMatch.id,
                                          consigneePhone: exactMatch.phone || '',
                                          consigneeAddress: exactMatch.delivery_address || exactMatch.address || '',
                                          consigneeCity: exactMatch.city || prev.consigneeCity,
                                        }));
                                        setIsManualConsignee(false);
                                      } else {
                                        setIsManualConsignee(true);
                                        setTimeout(() => consigneePhoneRef.current?.focus(), 100);
                                      }
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  const trimmed = (formData.consigneeName || '').trim();
                                  if (trimmed && !formData.consigneeId) {
                                    const exactMatch = customersList.find(
                                      (c) => (c.name || '').toLowerCase() === trimmed.toLowerCase()
                                    );
                                    if (exactMatch) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        consigneeName: exactMatch.name,
                                        consigneeId: exactMatch.id,
                                        consigneePhone: exactMatch.phone || '',
                                        consigneeAddress: exactMatch.delivery_address || exactMatch.address || '',
                                        consigneeCity: exactMatch.city || prev.consigneeCity,
                                      }));
                                      setIsManualConsignee(false);
                                    }
                                  }
                                }}
                                className={`w-full px-3.5 py-2.5 pr-14 rounded-xl border text-xs focus:outline-none transition-colors ${
                                  isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                                    : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                }`}
                              />

                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {formData.consigneeName && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        consigneeName: '',
                                        consigneeId: '',
                                        consigneePhone: '',
                                        consigneeCity: '',
                                        consigneeAddress: ''
                                      }));
                                      updateConsigneeCoords();
                                      setShowConsigneeDropdown(true);
                                    }}
                                    className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                    title="Clear input"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateConsigneeCoords();
                                    setShowConsigneeDropdown(prev => !prev);
                                  }}
                                  className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                  title="Toggle list"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showConsigneeDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
                                </button>
                              </div>
                            </div>

                            {/* Portaled Floating Dropdown Menu */}
                            {showConsigneeDropdown && typeof document !== 'undefined' && createPortal(
                              <div
                                ref={consigneeDropdownMenuRef}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  position: 'fixed',
                                  left: `${consigneeCoords.left}px`,
                                  width: `${consigneeCoords.width}px`,
                                  maxHeight: `${consigneeCoords.maxHeight}px`,
                                  zIndex: 99999,
                                  ...(consigneeCoords.opensUpward
                                    ? { bottom: `${consigneeCoords.bottom}px`, top: 'auto' }
                                    : { top: `${consigneeCoords.top}px`, bottom: 'auto' }),
                                }}
                                className={`flex flex-col rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700/80 text-white shadow-blue-950/40'
                                  : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/25'
                              }`}>
                                <div className={`px-3 py-2 border-b flex items-center justify-between text-[11px] font-semibold shrink-0 ${
                                  isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                                }`}>
                                  <span className="flex items-center gap-1.5 truncate">
                                    <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span>Registered Receivers ({filteredConsignees.length})</span>
                                  </span>

                                  <Link
                                    href="/customers"
                                    target="_blank"
                                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                                  >
                                    + CRM
                                  </Link>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/40">
                                  {filteredConsignees.length > 0 ? (
                                    filteredConsignees.map((c) => {
                                      const isSelected = formData.consigneeId === c.id;
                                      return (
                                        <div
                                          key={c.id}
                                          onClick={() => {
                                            setFormData(prev => ({
                                              ...prev,
                                              consigneeName: c.name,
                                              consigneeId: c.id,
                                              consigneePhone: c.phone || '',
                                              consigneeAddress: c.delivery_address || c.address || '',
                                              consigneeCity: c.city || prev.consigneeCity,
                                            }));
                                            setIsManualConsignee(false);
                                            setShowConsigneeDropdown(false);
                                          }}
                                          className={`p-2.5 px-3 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                            isSelected
                                              ? isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-900 font-semibold'
                                              : isDark
                                              ? 'hover:bg-slate-800/80 text-slate-200'
                                              : 'hover:bg-slate-50 text-slate-700'
                                          }`}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs font-bold truncate">{c.name}</span>
                                              <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-medium ${
                                                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                              }`}>
                                                {c.customer_code || 'ID:' + c.id}
                                              </span>
                                            </div>
                                            <div className={`text-[11px] flex items-center gap-2 mt-0.5 flex-wrap ${
                                              isDark ? 'text-slate-400' : 'text-slate-500'
                                            }`}>
                                              {c.city && <span>📍 {c.city}</span>}
                                              {c.phone && <span>📞 {c.phone}</span>}
                                            </div>
                                          </div>
                                          {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                      No matching receivers found.
                                    </div>
                                  )}
                                </div>

                                {formData.consigneeName && (
                                  <div
                                    onClick={() => {
                                      setIsManualConsignee(true);
                                      setShowConsigneeDropdown(false);
                                    }}
                                    className={`p-2 px-3 border-t text-xs cursor-pointer flex items-center justify-between font-medium shrink-0 ${
                                      isDark ? 'bg-slate-950/80 border-slate-800 text-blue-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 text-blue-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>Use &quot;{formData.consigneeName}&quot; as Not Registered Receiver</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>,
                              document.body
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* STEP 2: Route & Transit Parameters */}
                {bookingStep === 2 && (
                  <div className="space-y-4">

                    {/* Movement Indicator Strip */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      (formData.loadType || 'PTL') === 'FTL'
                        ? isDark ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
                        : isDark ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{(formData.loadType || 'PTL') === 'FTL' ? '🚛' : '📦'}</span>
                        <span className="font-bold">
                          {(formData.loadType || 'PTL') === 'FTL' ? 'FTL Dedicated Load Active' : 'PTL Sundry Load Active'}
                        </span>
                        <span className="text-[11px] opacity-75 hidden sm:inline">
                          — {(formData.loadType || 'PTL') === 'FTL' ? 'Point-to-point direct dispatch (no hub transfer)' : 'Hub-to-hub consolidation'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 uppercase">
                        {formData.loadType || 'PTL'}
                      </span>
                    </div>

                    {/* Corridor Route Section */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isDark ? 'bg-blue-500/20 text-cyan-400' : 'bg-blue-100 text-blue-700'
                          }`}>
                            <Truck className="w-3.5 h-3.5" />
                          </span>
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {(formData.loadType || 'PTL') === 'FTL'
                              ? 'Direct Route (Origin Hub ➔ Direct Consignee Destination)'
                              : 'Corridor Route (Origin Hub ➔ Destination Hub)'}
                          </span>
                        </div>
                        {!isRestrictedBranchUser && (formData.loadType || 'PTL') !== 'FTL' && (
                          <Link
                            href="/branches"
                            target="_blank"
                            className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                              isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            <span>+ Add Hub</span>
                          </Link>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Origin Hub */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between h-5">
                            <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              <Building2 className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                              <span>Origin Hub / Branch</span>
                              <span className="text-rose-500 font-bold">*</span>
                            </label>
                            {isRestrictedBranchUser ? (
                              <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                Assigned Hub
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full">
                                Booking Origin
                              </span>
                            )}
                          </div>

                          {isRestrictedBranchUser ? (
                            <div className={`w-full h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs ${
                              isDark ? 'border-slate-800 bg-slate-900/90 text-white' : 'border-slate-200 bg-slate-100/90 text-slate-900'
                            }`}>
                              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                                <span className="truncate">
                                  {branchesList.find((b) => b.id === userBranchId)?.branch_name || user?.branchName || 'Your Branch'}
                                </span>
                                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 border ${
                                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  [{branchesList.find((b) => b.id === userBranchId)?.branch_code || 'HUB'}]
                                </span>
                                <span className={`text-[11px] font-normal truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  — {branchesList.find((b) => b.id === userBranchId)?.city || user?.city || 'Origin'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">🔒 Locked</span>
                            </div>
                          ) : (
                            <BranchSelectDropdown
                              selectedBranchId={formData.originBranchId}
                              onSelect={(branchId, city) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  originBranchId: branchId,
                                  originCity: city,
                                }));
                              }}
                              branches={branchesList}
                              placeholder="-- Select Origin Hub / Branch --"
                              isDark={isDark}
                            />
                          )}
                        </div>

                        {/* Destination Hub / Branch (PTL) OR Direct Consignee Destination (FTL) */}
                        {(formData.loadType || 'PTL') === 'FTL' ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between h-5">
                              <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                                <span>Destination / Delivery Point</span>
                                <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/25">
                                Direct Point-to-Point
                              </span>
                            </div>
                            <div className={`w-full h-11 px-3 rounded-xl border text-xs flex items-center justify-between shadow-xs ${
                              isDark ? 'border-purple-500/40 bg-purple-950/20 text-purple-200' : 'border-purple-200 bg-purple-50/70 text-purple-900'
                            }`}>
                              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="font-bold truncate text-slate-900 dark:text-white">
                                  Direct to {formData.consigneeName || 'Consignee'}
                                </span>
                                <span className={`text-[11px] font-normal truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  — {formData.consigneeAddress || formData.consigneeCity || 'Consignee Delivery Premises'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white shrink-0 ml-1">
                                Direct Door
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between h-5">
                              <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <Building2 className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                                <span>Destination Hub / Branch</span>
                                <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full">
                                Hub Consolidation
                              </span>
                            </div>
                            <BranchSelectDropdown
                              selectedBranchId={formData.destBranchId}
                              onSelect={(branchId, city) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  destBranchId: branchId,
                                  destinationCity: city,
                                }));
                              }}
                              branches={branchesList.filter((b) => b.id !== formData.originBranchId)}
                              placeholder="-- Select Destination Hub / Branch --"
                              isDark={isDark}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dispatch Parameters: Pickup Date, Transit Mode & Delivery Type */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      {(formData.loadType || 'PTL') === 'FTL' ? (
                        /* FTL: All 3 parameters in a single unified row, fixed and non-changeable */
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* 1. Pickup Date (Changeable) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center h-5">
                              <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                                <span>Pickup Date</span>
                                <span className="text-rose-500 font-bold">*</span>
                              </label>
                            </div>
                            <input
                              type="date"
                              value={formData.pickupDate}
                              onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                              className={`w-full h-11 px-3 rounded-xl border text-xs font-bold focus:outline-none transition-colors cursor-pointer shadow-xs ${
                                isDark
                                  ? 'border-purple-500/40 bg-slate-900/90 text-white focus:border-purple-400 [color-scheme:dark]'
                                  : 'border-purple-200 bg-white text-slate-900 focus:border-purple-500 [color-scheme:light]'
                              }`}
                            />
                          </div>

                          {/* 2. Mode of Transport (Road Only) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center h-5">
                              <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <Truck className="w-3.5 h-3.5 text-purple-500" />
                                <span>Mode of Transport</span>
                                <span className="text-rose-500 font-bold">*</span>
                              </label>
                            </div>
                            <div className={`w-full h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs select-none ${
                              isDark ? 'border-purple-500/40 bg-purple-950/20 text-purple-200' : 'border-purple-200 bg-purple-50/70 text-purple-900'
                            }`}>
                              <div className="flex items-center gap-2 truncate">
                                <Truck className="w-4 h-4 text-purple-500 shrink-0" />
                                <span className="truncate">By Road (Dedicated Truck)</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white shrink-0">
                                FTL Road
                              </span>
                            </div>
                          </div>

                          {/* 3. Delivery Type (Direct Doorstep) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center h-5">
                              <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Delivery Type</span>
                                <span className="text-rose-500 font-bold">*</span>
                              </label>
                            </div>
                            <div className={`w-full h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs select-none ${
                              isDark ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200' : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                            }`}>
                              <div className="flex items-center gap-2 truncate">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="truncate">Direct Doorstep Delivery</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shrink-0">
                                Direct Door
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* PTL: Interactive Selection */
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Pickup Date */}
                            <div className="space-y-1.5">
                              <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span>Pickup Date</span>
                                <span className="text-rose-500 font-bold ml-0.5">*</span>
                              </label>
                              <input
                                type="date"
                                value={formData.pickupDate}
                                onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                                className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                                  isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400 [color-scheme:dark]'
                                    : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 [color-scheme:light]'
                                }`}
                              />
                            </div>

                            {/* Mode of Transport */}
                            <div className="space-y-1.5">
                              <label className={`text-xs font-bold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span>Mode of Transport <span className="text-rose-500">*</span></span>
                                <span className="text-[10px] text-slate-400 font-normal">Select Mode</span>
                              </label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { id: 'ROAD', label: 'By Road', icon: Truck },
                                  { id: 'RAIL', label: 'By Rail', icon: Train },
                                  { id: 'AIR', label: 'By Air', icon: Plane },
                                ].map((m) => {
                                  const IconComp = m.icon;
                                  const isSelected = (formData.transportMode || 'ROAD') === m.id;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => setFormData({ ...formData, transportMode: m.id })}
                                      className={`py-2 px-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                          : isDark
                                          ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                      }`}
                                    >
                                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{m.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Delivery Type */}
                          <div className="space-y-1.5 pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                            <div className="flex items-center justify-between">
                              <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span>Delivery Type <span className="text-rose-500">*</span></span>
                              </label>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {(formData.deliveryType || 'DOOR_DELIVERY') === 'DOOR_DELIVERY'
                                  ? 'Consignee Doorstep Delivery'
                                  : 'Hub / Godown Delivery'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const curDdc = parseFloat(formData.doorDeliveryCharges || 0);
                                  setFormData({
                                    ...formData,
                                    deliveryType: 'DOOR_DELIVERY',
                                    doorDeliveryCharges: curDdc < 100 ? '100' : formData.doorDeliveryCharges,
                                  });
                                }}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  (formData.deliveryType || 'DOOR_DELIVERY') === 'DOOR_DELIVERY'
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                    : isDark
                                    ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <Truck className="w-4 h-4 shrink-0" />
                                <div className="text-left">
                                  <span className="block leading-tight">Door Delivery</span>
                                  <span className={`block text-[10px] font-normal ${
                                    (formData.deliveryType || 'DOOR_DELIVERY') === 'DOOR_DELIVERY' ? 'text-blue-100' : 'text-slate-400'
                                  }`}>Direct doorstep delivery</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const curDdc = parseFloat(formData.doorDeliveryCharges || 0);
                                  setFormData({
                                    ...formData,
                                    deliveryType: 'GODOWN_DELIVERY',
                                    doorDeliveryCharges: curDdc === 100 ? '0' : formData.doorDeliveryCharges,
                                  });
                                }}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  formData.deliveryType === 'GODOWN_DELIVERY'
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                    : isDark
                                    ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <Building2 className="w-4 h-4 shrink-0" />
                                <div className="text-left">
                                  <span className="block leading-tight">Godown Delivery</span>
                                  <span className={`block text-[10px] font-normal ${
                                    formData.deliveryType === 'GODOWN_DELIVERY' ? 'text-blue-100' : 'text-slate-400'
                                  }`}>Pickup from branch</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                )}

                {/* STEP 3: Cargo & Freight Charges */}
                {bookingStep === 3 && (
                  <div className="space-y-4">
                    {/* If FTL is active: Pricing mode (Lump Sum Truck Hire vs Per KG) */}
                    {(formData.loadType || 'PTL') === 'FTL' && (
                      <div className={`p-4 rounded-2xl border transition-all ${
                        isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50/70 border-purple-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base">🏷️</span>
                              <label className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                FTL Freight Pricing Basis
                              </label>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25">
                                {(formData.ftlPricingMode || 'FIXED') === 'FIXED' ? 'Lump Sum Freight' : 'Weight-Based Tariff'}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {(formData.ftlPricingMode || 'FIXED') === 'FIXED'
                                ? 'Charge a flat lump-sum truck hire freight for this consignment.'
                                : 'Calculate freight based on cargo weight rate (₹ / KG).'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 h-11 shrink-0 sm:w-80">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, ftlPricingMode: 'FIXED' }))}
                              className={`h-full px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                (formData.ftlPricingMode || 'FIXED') === 'FIXED'
                                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/25'
                                  : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span>Fixed Truck Hire (₹)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, ftlPricingMode: 'PER_KG' }))}
                              className={`h-full px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                formData.ftlPricingMode === 'PER_KG'
                                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/25'
                                  : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span>Weight / Per KG (₹)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Declared Cargo Commodity</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Consumer Electronics & Inverters"
                        value={formData.cargoType}
                        onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                          }`}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold flex items-center h-5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Packages</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            required
                            value={formData.packagesCount}
                            onChange={(e) => setFormData({ ...formData, packagesCount: e.target.value })}
                            className={`w-full px-3.5 pr-12 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                              }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                            Pkgs
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold flex items-center h-5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Weight (KG)</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={formData.weightKg}
                            onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                            className={`w-full px-3.5 pr-10 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${isDark
                                ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                              }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                            KG
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold flex items-center h-5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>{formData.loadType === 'FTL' && formData.ftlPricingMode === 'FIXED' ? 'Truck Freight (₹)' : 'Rate / KG (₹)'}</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            ₹
                          </span>
                          {formData.loadType === 'FTL' && formData.ftlPricingMode === 'FIXED' ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              placeholder="e.g. 25000"
                              value={formData.ftlFreightAmount}
                              onChange={(e) => setFormData({ ...formData, ftlFreightAmount: e.target.value })}
                              className={`w-full pl-7 pr-16 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${isDark
                                  ? 'border-purple-500/40 bg-slate-900/80 text-white focus:border-purple-400'
                                  : 'border-purple-300 bg-purple-50/30 text-slate-900 focus:border-purple-500 focus:bg-white'
                                }`}
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              value={formData.ratePerKg}
                              onChange={(e) => setFormData({ ...formData, ratePerKg: e.target.value })}
                              className={`w-full pl-7 pr-12 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${isDark
                                  ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                  : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                }`}
                            />
                          )}
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                            {formData.loadType === 'FTL' && formData.ftlPricingMode === 'FIXED' ? '/ Truck' : '/ KG'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Payment Term</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['PAID', 'TO_PAY', 'TBB'].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setFormData({ ...formData, paymentMode: mode })}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${formData.paymentMode === mode
                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                : isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                              }`}
                          >
                            {mode === 'TBB' ? 'T.B.B. (Bill)' : mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Freight Charges & Tariff Configuration */}
                    {(() => {
                      const liveBreakdown = calculateFreightBreakdown(formData);
                      return (
                        <div className="space-y-3 pt-1">
                          {/* Section Header */}
                          <div className="flex items-center justify-between">
                            <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              <IndianRupee className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                              <span>Charges & Tariff Configuration</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const newId = Date.now().toString();
                                setFormData({
                                  ...formData,
                                  customCharges: [
                                    ...(formData.customCharges || []),
                                    { id: newId, name: 'Toll / Border Tax', amount: '' },
                                  ],
                                });
                              }}
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${isDark
                                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                }`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Other Charge</span>
                            </button>
                          </div>

                          {/* Standard Indian Logistics Charges Grid */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Loading / Hamali */}
                            <div className="space-y-1">
                              <span className={`text-[11px] font-semibold flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span>Loading / Hamali</span>
                                <span className="text-[10px] text-slate-500">₹</span>
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={formData.loadingCharges}
                                onChange={(e) => setFormData({ ...formData, loadingCharges: e.target.value })}
                                placeholder="0"
                                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                              />
                            </div>

                            {/* Bilty / LR Fee */}
                            <div className="space-y-1">
                              <span className={`text-[11px] font-semibold flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span>Bilty / LR Fee</span>
                                <span className="text-[10px] text-slate-500">₹</span>
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={formData.biltyFee}
                                onChange={(e) => setFormData({ ...formData, biltyFee: e.target.value })}
                                placeholder="0"
                                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                              />
                            </div>

                            {/* Door Delivery (DDC) */}
                            <div className="space-y-1">
                              <span className={`text-[11px] font-semibold flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span className="flex items-center gap-1.5">
                                  <span>Door Delivery (DDC)</span>
                                  {formData.deliveryType === 'DOOR_DELIVERY' && (
                                    <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                      Door Active
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-500">₹ (Editable)</span>
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={formData.doorDeliveryCharges}
                                onChange={(e) => setFormData({ ...formData, doorDeliveryCharges: e.target.value })}
                                placeholder="0"
                                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                  formData.deliveryType === 'DOOR_DELIVERY' && parseFloat(formData.doorDeliveryCharges || 0) >= 100
                                    ? isDark
                                      ? 'border-emerald-500/50 bg-slate-900/80 text-emerald-300 focus:border-emerald-400 font-semibold'
                                      : 'border-emerald-300 bg-emerald-50/30 text-emerald-900 focus:border-emerald-500 focus:bg-white font-semibold'
                                    : isDark
                                      ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                }`}
                              />
                            </div>

                            {/* Unloading Charges */}
                            <div className="space-y-1">
                              <span className={`text-[11px] font-semibold flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span>Unloading Charges</span>
                                <span className="text-[10px] text-slate-500">₹</span>
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={formData.unloadingCharges}
                                onChange={(e) => setFormData({ ...formData, unloadingCharges: e.target.value })}
                                placeholder="0"
                                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                              />
                            </div>
                          </div>

                          {/* Dynamic Custom Charges Added by User */}
                          {formData.customCharges && formData.customCharges.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                                Custom Charges Added ({formData.customCharges.length})
                              </span>
                              {formData.customCharges.map((item, index) => (
                                <div
                                  key={item.id || index}
                                  className={`flex items-center gap-2 p-2 rounded-xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                                    }`}
                                >
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      list={`charge-suggestions-${index}`}
                                      value={item.name}
                                      placeholder="Charge Name (e.g. Toll Tax)"
                                      onChange={(e) => {
                                        const updated = [...formData.customCharges];
                                        updated[index] = { ...updated[index], name: e.target.value };
                                        setFormData({ ...formData, customCharges: updated });
                                      }}
                                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${isDark
                                          ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                                          : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                                        }`}
                                    />
                                    <datalist id={`charge-suggestions-${index}`}>
                                      <option value="Toll / Border Tax" />
                                      <option value="Cartage / Pickup Charge" />
                                      <option value="FOV / Insurance Charge" />
                                      <option value="Demurrage / Detention" />
                                      <option value="Fuel Surcharge" />
                                      <option value="Handling / Labour" />
                                      <option value="Statistical / Misc Charge" />
                                    </datalist>
                                  </div>
                                  <div className="w-28 relative">
                                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.amount}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const updated = [...formData.customCharges];
                                        updated[index] = { ...updated[index], amount: e.target.value };
                                        setFormData({ ...formData, customCharges: updated });
                                      }}
                                      className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none ${isDark
                                          ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                                          : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                                        }`}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = formData.customCharges.filter((_, i) => i !== index);
                                      setFormData({ ...formData, customCharges: updated });
                                    }}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    title="Remove Charge"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Discount & GST Controls */}
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <div className="space-y-1">
                              <span className={`text-[11px] font-semibold flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span>Discount (₹)</span>
                                <span className="text-[10px] text-slate-500">Deduction</span>
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={formData.discountAmount}
                                onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                                placeholder="0"
                                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                              />
                            </div>

                            <div className="space-y-1">
                              <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                GST / Tax Terms
                              </span>
                              <select
                                value={formData.gstMode}
                                onChange={(e) => setFormData({ ...formData, gstMode: e.target.value })}
                                className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${isDark
                                    ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                                  }`}
                              >
                                <option value="RCM">5% GTA (RCM - ₹0 added)</option>
                                <option value="GST_5">5% Forward Charge (+5%)</option>
                                <option value="GST_12">12% Forward Charge (+12%)</option>
                                <option value="EXEMPT">Exempt / Nil (0% GST)</option>
                              </select>
                            </div>
                          </div>

                          {/* Calculated Live Tariff Card */}
                          <div className={`p-4 rounded-2xl border space-y-2 mt-2 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <div className={`text-xs font-bold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                              <span>
                                {formData.loadType === 'FTL' && (formData.ftlPricingMode || 'FIXED') === 'FIXED'
                                  ? 'Fixed Truck Freight (Lump Sum)'
                                  : `Basic Freight (${formData.weightKg || 0} kg @ ₹${formData.ratePerKg || 0})`}
                              </span>
                              <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹ {(liveBreakdown.basicFreight || 0).toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Editable Loading/Hamali line */}
                            {liveBreakdown.loading > 0 && (
                              <div className={`text-xs font-medium flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                <span>Loading / Hamali Charges</span>
                                <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  ₹ {(liveBreakdown.loading || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}

                            {/* Bilty Fee */}
                            {liveBreakdown.biltyFee > 0 && (
                              <div className={`text-xs font-medium flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                <span>Bilty / LR Stationary Fee</span>
                                <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  ₹ {(liveBreakdown.biltyFee || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}

                            {/* Door Delivery */}
                            {liveBreakdown.doorDelivery > 0 && (
                              <div className={`text-xs font-medium flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                <span>Door Delivery Charges (DDC)</span>
                                <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  ₹ {(liveBreakdown.doorDelivery || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}

                            {/* Unloading */}
                            {liveBreakdown.unloading > 0 && (
                              <div className={`text-xs font-medium flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                <span>Unloading Charges</span>
                                <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  ₹ {(liveBreakdown.unloading || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}

                            {/* Custom charges list */}
                            {formData.customCharges && formData.customCharges
                              .filter(c => parseFloat(c.amount) > 0)
                              .map((c, i) => (
                                <div key={i} className={`text-xs font-medium flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                  <span>{c.name || 'Additional Charge'}</span>
                                  <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    ₹ {parseFloat(c.amount || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))}

                            {/* Discount */}
                            {liveBreakdown.discount > 0 && (
                              <div className="text-xs font-medium flex items-center justify-between text-rose-500">
                                <span>Special Discount</span>
                                <span className="font-mono font-semibold">- ₹ {(liveBreakdown.discount || 0).toLocaleString('en-IN')}</span>
                              </div>
                            )}

                            {/* GST */}
                            <div className={`text-xs font-medium flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                              <span>
                                GST ({formData.gstMode === 'RCM'
                                  ? '5% GTA RCM Applicable'
                                  : formData.gstMode === 'GST_5'
                                    ? '5% Forward Charge'
                                    : formData.gstMode === 'GST_12'
                                      ? '12% Forward Charge'
                                      : 'Exempt Goods'})
                              </span>
                              <span className={`font-mono ${liveBreakdown.isRcm ? (isDark ? 'text-emerald-400' : 'text-emerald-600 font-semibold') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                {liveBreakdown.isRcm ? '₹ 0 (RCM)' : `₹ ${(liveBreakdown.gstAmount ?? liveBreakdown.taxAmount ?? 0).toLocaleString('en-IN')}`}
                              </span>
                            </div>

                            <div className={`pt-2 border-t flex items-center justify-between font-black text-sm ${isDark ? 'border-slate-800' : 'border-slate-200'
                              }`}>
                              <span className={isDark ? 'text-cyan-400' : 'text-blue-600 font-bold'}>Total Docket Freight:</span>
                              <span className={`font-mono text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹ {(liveBreakdown.totalDocketFreight || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* STEP 4: Review & Generate Docket (LR / Bilty) */}
                {bookingStep === 4 && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border space-y-3 ${isDark
                        ? 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-cyan-950/30 border-cyan-500/40'
                        : 'bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 border-blue-200'
                      }`}>
                      <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                        <div>
                          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            DOCKET NUMBER ({formData.docketNumberMode === 'manual' ? 'MANUAL LR' : 'AUTO-SERIES'})
                          </span>
                          <div className={`font-mono text-base font-black ${isDark ? 'text-cyan-400' : 'text-blue-700'}`}>
                            {formData.docketNumberMode === 'manual'
                              ? (formData.customDocketNumber || 'Manual (Pending Input)')
                              : (docketSeriesPreview?.nextNumber || 'BAL000001 (Auto)')}
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${formData.docketNumberMode === 'manual'
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            : isDark
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          {formData.docketNumberMode === 'manual' ? 'Manual Stationery' : 'Auto Sequenced'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Shipper:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.consignorName || 'Apex Logistics Partner'}</span>
                            {formData.consignorId ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
                                Registered
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold">
                                Walk-in Party
                              </span>
                            )}
                          </div>
                          {(formData.consignorPhone || formData.consignorAddress || formData.consignorCity) && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {formData.consignorPhone ? `📞 ${formData.consignorPhone}` : ''}
                              {formData.consignorAddress ? ` • 📍 ${formData.consignorAddress}` : formData.consignorCity ? ` • 📍 ${formData.consignorCity}` : ''}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Receiver:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.consigneeName || 'Universal Distributing Corp'}</span>
                            {formData.consigneeId ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
                                Registered
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold">
                                Walk-in Party
                              </span>
                            )}
                          </div>
                          {(formData.consigneePhone || formData.consigneeAddress || formData.consigneeCity) && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {formData.consigneePhone ? `📞 ${formData.consigneePhone}` : ''}
                              {formData.consigneeAddress ? ` • 📍 ${formData.consigneeAddress}` : formData.consigneeCity ? ` • 📍 ${formData.consigneeCity}` : ''}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Corridor Route:</span>
                          <div className={`font-bold ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>
                            {(formData.loadType || 'PTL') === 'FTL' ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{branchesList.find((b) => b.id === formData.originBranchId)?.branch_name || formData.originCity || 'Origin'}</span>
                                <span>➔</span>
                                <span className={isDark ? 'text-purple-300' : 'text-purple-700'}>
                                  Direct {formData.consigneeName || 'Consignee'} ({formData.consigneeCity || formData.destinationCity || 'Customer Destination'})
                                </span>
                                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                  Direct FTL (No Hub)
                                </span>
                              </div>
                            ) : (
                              <span>
                                {branchesList.find((b) => b.id === formData.originBranchId)?.branch_name || formData.originCity || 'Origin'} ➔ {branchesList.find((b) => b.id === formData.destBranchId)?.branch_name || formData.destinationCity || 'Destination'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Transport Mode:</span>
                          <span className={`font-bold inline-flex items-center gap-1.5 ${formData.transportMode === 'AIR'
                              ? isDark ? 'text-purple-400' : 'text-purple-700'
                              : formData.transportMode === 'RAIL'
                                ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                                : isDark ? 'text-cyan-400' : 'text-blue-700'
                            }`}>
                            {formData.transportMode === 'AIR' ? <Plane className="w-3.5 h-3.5" /> : formData.transportMode === 'RAIL' ? <Train className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                            {formData.transportMode === 'AIR' ? 'By Air Cargo' : formData.transportMode === 'RAIL' ? 'By Rail Express' : 'By Road Line-haul'}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Movement Type:</span>
                          <span className={`font-bold inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] ${
                            (formData.loadType || 'PTL') === 'FTL'
                              ? isDark ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-300'
                              : isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            <span>{(formData.loadType || 'PTL') === 'FTL' ? '🚛 FTL (Full Truck)' : '📦 PTL (Part Load)'}</span>
                            {formData.loadType === 'FTL' && formData.ftlVehicleType && (
                              <span className="opacity-80 font-normal">({formData.ftlVehicleType})</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Delivery Type:</span>
                          <span className={`font-bold inline-flex items-center gap-1.5 ${
                            formData.deliveryType === 'DOOR_DELIVERY'
                              ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                              : isDark ? 'text-cyan-400' : 'text-blue-700'
                          }`}>
                            {formData.deliveryType === 'DOOR_DELIVERY' ? <Truck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                            {formData.deliveryType === 'DOOR_DELIVERY' ? 'Door Delivery' : 'Godown Delivery'}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Payment:</span>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.paymentMode}</span>
                        </div>
                      </div>

                      {/* Step 4 Live Itemized Charges Summary */}
                      {(() => {
                        const breakdown = calculateFreightBreakdown(formData);
                        return (
                          <div className={`pt-3 border-t space-y-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Basic Freight:</span>
                              <span className={`font-mono font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹ {(breakdown.basicFreight || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            {breakdown.totalAdditionalCharges > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Additional Charges:</span>
                                <span className="font-mono font-semibold text-amber-500">
                                  + ₹ {(breakdown.totalAdditionalCharges || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                            {breakdown.discount > 0 && (
                              <div className="flex items-center justify-between text-xs text-rose-500">
                                <span>Discount:</span>
                                <span className="font-mono font-semibold">- ₹ {(breakdown.discount || 0).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs">
                              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>GST:</span>
                              <span className={`font-mono font-semibold ${breakdown.isRcm ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                {breakdown.isRcm ? '₹ 0 (5% RCM)' : `₹ ${(breakdown.gstAmount ?? breakdown.taxAmount ?? 0).toLocaleString('en-IN')}`}
                              </span>
                            </div>
                            <div className={`pt-2 border-t flex items-center justify-between font-mono font-black text-sm ${isDark ? 'border-slate-800' : 'border-slate-200'
                              }`}>
                              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Total Docket Value:</span>
                              <span className={`text-lg ${isDark ? 'text-cyan-400' : 'text-blue-700'}`}>
                                ₹ {(breakdown.totalDocketFreight || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      By confirming this consignment, an official 3-copy digital bilty (Consignor, Consignee, Driver) will be registered and queued in the Load Planning terminal for multi-axle truck allocation.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className={`p-4 px-6 border-t flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                {bookingStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setBookingStep(bookingStep - 1)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${isDark
                        ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
                        : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                  >
                    ← Previous
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${isDark
                        ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                  >
                    Cancel
                  </button>
                )}

                <div className="flex items-center gap-3">
                  {!isCurrentStepValid && currentMissingFields.length > 0 && (
                    <span className="text-[11px] text-amber-500 font-medium hidden sm:inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Pending: {currentMissingFields.join(', ')}
                    </span>
                  )}

                  {bookingStep < 4 ? (
                    <button
                      type="button"
                      disabled={!isCurrentStepValid}
                      onClick={() => {
                        if (!isCurrentStepValid) return;
                        setBookingStep(bookingStep + 1);
                      }}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${isCurrentStepValid
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 cursor-pointer active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700/60 shadow-none cursor-not-allowed opacity-60'
                        }`}
                    >
                      <span>
                        Next: {bookingStep === 1 ? 'Route & Transit' : bookingStep === 2 ? 'Cargo & Rates' : 'Review & Confirm'}
                      </span>
                      <span>➔</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading || !isStep1Valid || !isStep2Valid || !isStep3Valid}
                      className={`px-6 py-2.5 rounded-xl text-white text-xs font-black shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center gap-1.5 ${isLoading || !isStep1Valid || !isStep2Valid || !isStep3Valid
                          ? 'bg-slate-700 opacity-60 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 cursor-pointer'
                        }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Issuing LR...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm & Issue LR</span>
                          <span>➔</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONSIGNMENT DETAIL MODAL */}
      {/* ======================================================== */}
      {isDetailsOpen && selectedConsignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex min-h-full items-center justify-center">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDetailsOpen(false)}
          />

          <div className={`relative w-full max-w-2xl max-h-[90vh] my-auto rounded-3xl shadow-2xl flex flex-col z-10 border overflow-hidden ${isDark ? 'bg-[#0A0E1A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>

            {/* 30s Countdown Progress Indicator Bar */}
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800/80 overflow-hidden shrink-0">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${isAutoClosePaused
                    ? 'bg-amber-500/50'
                    : autoCloseCountdown <= 5
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  }`}
                style={{ width: `${(autoCloseCountdown / 30) * 100}%` }}
              />
            </div>

            {/* Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-black text-base ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    {selectedConsignment.lr_number}
                  </span>
                  <BuiltyTypeBadge docket={selectedConsignment} />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedConsignment.status === 'IN_TRANSIT'
                      ? isDark
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      : isDark
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                    {selectedConsignment.status_label}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Booking Ref: {selectedConsignment.booking_id}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {/* 30s Auto-Close Indicator / Pause Button */}
                <button
                  type="button"
                  onClick={() => setIsAutoClosePaused((p) => !p)}
                  className={`text-[10px] font-mono px-2 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${isAutoClosePaused
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 font-bold'
                      : isDark
                        ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  title={isAutoClosePaused ? "Auto-close is paused. Click to resume 30s timer" : "Auto-closes after 30 seconds. Click to pause"}
                >
                  <Clock className={`w-3 h-3 ${isAutoClosePaused ? 'text-amber-500' : 'text-cyan-500'}`} />
                  <span className="hidden sm:inline">
                    {isAutoClosePaused ? 'Paused' : `Closing in ${autoCloseCountdown}s`}
                  </span>
                  <span className="sm:hidden font-bold">
                    {isAutoClosePaused ? '||' : `${autoCloseCountdown}s`}
                  </span>
                </button>

                {canEdit && !selectedConsignment?.is_delivered && !['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(selectedConsignment?.status) && (
                  <button
                    onClick={() => handleOpenEdit(selectedConsignment)}
                    className={`p-2 rounded-xl border transition-colors ${isDark
                        ? 'border-slate-800 bg-slate-900/60 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                        : 'border-slate-200 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700'
                      }`}
                    title="Edit Docket"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canDelete && !selectedConsignment?.is_delivered && !['DELIVERED', 'COMPLETED', 'POD_UPLOADED', 'POD_VERIFIED'].includes(selectedConsignment?.status) && (
                  <button
                    onClick={() => handleOpenDelete(selectedConsignment)}
                    className={`p-2 rounded-xl border transition-colors ${isDark
                        ? 'border-slate-800 bg-slate-900/60 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                        : 'border-slate-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700'
                      }`}
                    title="Delete Docket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleOpenPrintPreview(selectedConsignment)}
                  className={`p-2 rounded-xl border transition-colors ${isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  title="Print Bilty"
                >
                  <Printer className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                </button>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className={`p-2 rounded-xl border transition-colors ${isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Live Tracking Progress Bar */}
              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Truck className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                    <span>{selectedConsignment.current_milestone}</span>
                  </span>
                  <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    {selectedConsignment.progress_percent}%
                  </span>
                </div>

                <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    style={{ width: `${selectedConsignment.progress_percent}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                  />
                </div>

                <div className={`flex items-center justify-between text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                  <span>Origin: {selectedConsignment.origin_city}</span>
                  <span>ETA: {selectedConsignment.eta}</span>
                  <span>Dest: {selectedConsignment.destination_city}</span>
                </div>
              </div>

              {/* Present Location & Branch Journey Card */}
              <div className={`p-4 rounded-2xl border space-y-3.5 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${
                      selectedConsignment.present_location_type === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : selectedConsignment.present_location_type === 'IN_TRANSIT'
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Current Present Location
                      </span>
                      <h4 className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selectedConsignment.present_location_title || 'Location Unknown'}
                      </h4>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    selectedConsignment.status === 'DELIVERED'
                      ? isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : selectedConsignment.status === 'IN_TRANSIT' || selectedConsignment.status === 'DISPATCHED'
                      ? isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                      : isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {selectedConsignment.status_label || selectedConsignment.status}
                  </span>
                </div>

                <p className={`text-xs leading-relaxed px-3 py-2 rounded-xl ${
                  isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-50 text-slate-600'
                }`}>
                  {selectedConsignment.present_location_detail}
                </p>

                {/* 3-Step Journey Nodes */}
                <div className={`pt-2 border-t grid grid-cols-3 gap-2 text-center text-xs ${
                  isDark ? 'border-slate-800/80' : 'border-slate-100'
                }`}>
                  <div className={`p-2 rounded-xl ${
                    selectedConsignment.present_location_type === 'ORIGIN_GODOWN'
                      ? isDark ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
                      : isDark ? 'bg-slate-800/40' : 'bg-slate-50'
                  }`}>
                    <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Origin Branch</div>
                    <div className={`font-mono font-bold text-xs mt-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {selectedConsignment.origin_branch_code || selectedConsignment.origin_city}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{selectedConsignment.origin_branch_name}</div>
                  </div>

                  <div className={`p-2 rounded-xl ${
                    selectedConsignment.present_location_type === 'IN_TRANSIT' || selectedConsignment.present_location_type === 'TRANSIT_HUB'
                      ? isDark ? 'bg-cyan-500/15 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'
                      : isDark ? 'bg-slate-800/40' : 'bg-slate-50'
                  }`}>
                    <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Corridor Route</div>
                    <div className={`font-mono font-bold text-xs mt-0.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      {selectedConsignment.route_code}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {selectedConsignment.origin_city} ➔ {selectedConsignment.destination_city}
                    </div>
                  </div>

                  <div className={`p-2 rounded-xl ${
                    selectedConsignment.present_location_type === 'DEST_GODOWN' || selectedConsignment.present_location_type === 'OUT_FOR_DELIVERY' || selectedConsignment.present_location_type === 'DELIVERED'
                      ? isDark ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'
                      : isDark ? 'bg-slate-800/40' : 'bg-slate-50'
                  }`}>
                    <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Destination Branch</div>
                    <div className={`font-mono font-bold text-xs mt-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {selectedConsignment.destination_branch_code || selectedConsignment.destination_city}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{selectedConsignment.destination_branch_name}</div>
                  </div>
                </div>
              </div>

              {/* Shipper & Consignee Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-xl border space-y-1 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                  }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>Shipper (From)</span>
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedConsignment.consignor.name}</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedConsignment.consignor.city}</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{selectedConsignment.consignor.segment}</div>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                  }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>Consignee (To)</span>
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedConsignment.consignee.name}</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedConsignment.consignee.city}</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{selectedConsignment.consignee.segment}</div>
                </div>
              </div>

              {/* Cargo & Line-haul Vehicle Info */}
              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
                }`}>
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Line-haul Telemetry & Freight Details</div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Transport Mode:</span>
                    <span className={`font-bold inline-flex items-center gap-1.5 ${selectedConsignment.transport_mode === 'AIR'
                        ? isDark ? 'text-purple-400' : 'text-purple-600'
                        : selectedConsignment.transport_mode === 'RAIL'
                          ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                          : isDark ? 'text-cyan-400' : 'text-blue-600'
                      }`}>
                      {selectedConsignment.transport_mode === 'AIR' ? <Plane className="w-3.5 h-3.5" /> : selectedConsignment.transport_mode === 'RAIL' ? <Train className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                      {selectedConsignment.transport_mode === 'AIR' ? 'By Air Cargo' : selectedConsignment.transport_mode === 'RAIL' ? 'By Rail Express' : 'By Road Line-haul'}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Delivery Type:</span>
                    <span className={`font-bold inline-flex items-center gap-1.5 ${
                      selectedConsignment.delivery_type === 'DOOR_DELIVERY'
                        ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                        : isDark ? 'text-cyan-400' : 'text-blue-600'
                    }`}>
                      {selectedConsignment.delivery_type === 'DOOR_DELIVERY' ? <Truck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                      {selectedConsignment.delivery_type === 'DOOR_DELIVERY' ? 'Door Delivery' : 'Godown Delivery'}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vehicle Number:</span>
                    <span className={`font-mono font-bold ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>{selectedConsignment.vehicle_number}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Assigned Driver:</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {selectedConsignment.driver_name}
                      {selectedConsignment.driver_phone && <span className="text-[11px] font-normal font-mono opacity-80 ml-1">({selectedConsignment.driver_phone})</span>}
                    </span>
                  </div>
                  {selectedConsignment.trip_number && (
                    <div>
                      <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Trip ID:</span>
                      <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedConsignment.trip_number}</span>
                    </div>
                  )}
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cargo Description:</span>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConsignment.cargo_type}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Packages & Weight:</span>
                    <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {selectedConsignment.packages_count} Pkgs • {selectedConsignment.charged_weight} KG
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex items-center justify-between font-semibold pb-1.5 border-b border-dashed border-slate-700/50">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Freight & Charges Breakdown</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {selectedConsignment.payment_mode}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      Basic Freight ({selectedConsignment.charged_weight || 0} KG @ ₹{selectedConsignment.rate || 0}/KG):
                    </span>
                    <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      ₹ {(selectedConsignment.freight_amount || ((selectedConsignment.charged_weight || 0) * (selectedConsignment.rate || 0)) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {(Number(selectedConsignment.loading_charges || 0) > 0 || Number(selectedConsignment.hamali_charges || 0) > 0) && (
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Loading / Hamali Charges:</span>
                      <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹ {Number(selectedConsignment.loading_charges || selectedConsignment.hamali_charges || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {Number(selectedConsignment.handling_charges || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Bilty / Handling Charges:</span>
                      <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹ {Number(selectedConsignment.handling_charges || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {Number(selectedConsignment.door_delivery_charges || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Door Delivery Charges (DDC):</span>
                      <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹ {Number(selectedConsignment.door_delivery_charges || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {Number(selectedConsignment.unloading_charges || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Unloading Charges:</span>
                      <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹ {Number(selectedConsignment.unloading_charges || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {Number(selectedConsignment.other_charges || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Other / Toll / Surcharges:</span>
                      <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹ {Number(selectedConsignment.other_charges || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {Number(selectedConsignment.discount_amount || 0) > 0 && (
                    <div className="flex items-center justify-between text-rose-500">
                      <span>Discount:</span>
                      <span className="font-mono font-medium">
                        - ₹ {Number(selectedConsignment.discount_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      GST ({selectedConsignment.tax_percent > 0 ? `${selectedConsignment.tax_percent}%` : 'RCM / Exempt'}):
                    </span>
                    <span className={`font-mono ${selectedConsignment.tax_amount > 0 ? (isDark ? 'text-white' : 'text-slate-900') : 'text-emerald-500 font-semibold'}`}>
                      {selectedConsignment.tax_amount > 0 ? `₹ ${Number(selectedConsignment.tax_amount || 0).toLocaleString('en-IN')}` : '₹ 0 (RCM)'}
                    </span>
                  </div>
                </div>

                <div className={`pt-2 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                  <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>Total Docket Freight:</span>
                  <span className={`font-mono font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ₹ {Number(selectedConsignment.total_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className={`p-4 px-6 border-t flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <Link
                href={`/track?lr=${selectedConsignment.lr_number}`}
                className={`text-xs font-bold hover:underline flex items-center gap-1 ${isDark ? 'text-cyan-400' : 'text-blue-600'
                  }`}
              >
                <span>Live Public Tracking</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => handleOpenPrintPreview(selectedConsignment)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Preview Bilty Slip</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT DOCKET MODAL */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex min-h-full items-center justify-center">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => !isSubmittingEdit && setIsEditModalOpen(false)}
          />

          <div className={`relative w-full max-w-2xl max-h-[90vh] my-auto rounded-3xl border shadow-2xl overflow-hidden flex flex-col z-10 ${isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl border ${isDark
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Edit Docket / Consignment Note</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Modify consignment specifications, parties, freight and status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmittingEdit}
                className={`p-1.5 rounded-lg border transition-colors ${isDark
                    ? 'border-slate-800 text-slate-400 hover:text-white'
                    : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Docket Number */}
                  <div className="space-y-1">
                    <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Docket No. (LR / Bilty)</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.docketNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, docketNumber: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Consignment Status</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none transition-colors ${isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                    >
                      <option value="BOOKED">Booked / Godown</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="DELAYED">Delayed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  {/* Consignor Name */}
                  <div className="space-y-1">
                    <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Consignor (Shipper Name)</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.consignorName}
                      onChange={(e) => setEditFormData({ ...editFormData, consignorName: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                    />
                  </div>

                  {/* Consignee Name */}
                  <div className="space-y-1">
                    <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Consignee (Receiver Name)</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.consigneeName}
                      onChange={(e) => setEditFormData({ ...editFormData, consigneeName: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                    />
                  </div>

                  {/* Origin City with Branch Code */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Origin City</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      {resolvedOriginCode && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          <Building2 className="w-3 h-3" />
                          <span>Branch Code: {resolvedOriginCode}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <span className={`px-2.5 py-2 rounded-l-xl border border-r-0 text-xs font-mono font-bold shrink-0 flex items-center gap-1 ${
                        isDark ? 'bg-slate-800 text-cyan-400 border-slate-800' : 'bg-slate-100 text-blue-700 border-slate-200'
                      }`}>
                        [{resolvedOriginCode || 'ORG'}]
                      </span>
                      <input
                        type="text"
                        required
                        value={editFormData.originCity}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = branchesList.find(b =>
                            (b.city && b.city.toLowerCase() === val.toLowerCase()) ||
                            (b.branch_name && b.branch_name.toLowerCase() === val.toLowerCase()) ||
                            (b.branch_code && b.branch_code.toLowerCase() === val.toLowerCase())
                          );
                          setEditFormData((prev) => ({
                            ...prev,
                            originCity: val,
                            originBranchId: matched ? matched.id : prev.originBranchId,
                            originBranchCode: matched ? matched.branch_code : prev.originBranchCode,
                          }));
                        }}
                        list="edit-origin-branches-list"
                        placeholder="e.g. Bengaluru"
                        className={`w-full px-3 py-2 rounded-r-xl border text-xs focus:outline-none transition-colors ${isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                          }`}
                      />
                      <datalist id="edit-origin-branches-list">
                        {branchesList.map((b) => (
                          <option key={b.id} value={b.city || b.branch_name}>
                            {b.branch_code ? `[${b.branch_code}] ` : ''}{b.city || b.branch_name} ({b.branch_name})
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Destination City with Branch Code */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Destination City</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      {resolvedDestCode && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          <Building2 className="w-3 h-3" />
                          <span>Branch Code: {resolvedDestCode}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <span className={`px-2.5 py-2 rounded-l-xl border border-r-0 text-xs font-mono font-bold shrink-0 flex items-center gap-1 ${
                        isDark ? 'bg-slate-800 text-cyan-400 border-slate-800' : 'bg-slate-100 text-blue-700 border-slate-200'
                      }`}>
                        [{resolvedDestCode || 'DST'}]
                      </span>
                      <input
                        type="text"
                        required
                        value={editFormData.destinationCity}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = branchesList.find(b =>
                            (b.city && b.city.toLowerCase() === val.toLowerCase()) ||
                            (b.branch_name && b.branch_name.toLowerCase() === val.toLowerCase()) ||
                            (b.branch_code && b.branch_code.toLowerCase() === val.toLowerCase())
                          );
                          setEditFormData((prev) => ({
                            ...prev,
                            destinationCity: val,
                            destBranchId: matched ? matched.id : prev.destBranchId,
                            destBranchCode: matched ? matched.branch_code : prev.destBranchCode,
                          }));
                        }}
                        list="edit-dest-branches-list"
                        placeholder="e.g. South West Delhi"
                        className={`w-full px-3 py-2 rounded-r-xl border text-xs focus:outline-none transition-colors ${isDark
                            ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                          }`}
                      />
                      <datalist id="edit-dest-branches-list">
                        {branchesList.map((b) => (
                          <option key={b.id} value={b.city || b.branch_name}>
                            {b.branch_code ? `[${b.branch_code}] ` : ''}{b.city || b.branch_name} ({b.branch_name})
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Cargo Type */}
                  <div className="space-y-1 col-span-2">
                    <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Material / Commodity Description</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.cargoType}
                      onChange={(e) => setEditFormData({ ...editFormData, cargoType: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                    />
                  </div>

                  {/* Packages Count */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Packages Count</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      {isEditingDocketPaid && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked (PAID)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      required
                      disabled={isEditingDocketPaid}
                      value={editFormData.packagesCount}
                      onChange={(e) => setEditFormData({ ...editFormData, packagesCount: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                        isEditingDocketPaid
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Weight KG */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Charged Weight (KG)</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      {isEditingDocketPaid && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked (PAID)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      required
                      disabled={isEditingDocketPaid}
                      value={editFormData.weightKg}
                      onChange={(e) => updateEditField('weightKg', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                        isEditingDocketPaid
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Rate per KG */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Rate / KG (₹)</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      {isEditingDocketPaid && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked (PAID)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      disabled={isEditingDocketPaid}
                      value={editFormData.ratePerKg}
                      onChange={(e) => updateEditField('ratePerKg', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                        isEditingDocketPaid
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Additional Charges & Surcharges Section in Edit Modal */}
                  <div className={`col-span-2 p-3.5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>Configure Docket Charges & Surcharges</span>
                      </span>
                      {!isEditingDocketPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            const newId = Date.now().toString();
                            const nextCustom = [
                              ...(editFormData.customCharges || []),
                              { id: newId, name: 'Toll / Border Tax', amount: '' },
                            ];
                            updateEditField('customCharges', nextCustom, nextCustom);
                          }}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${isDark
                              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                              : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Other Charge</span>
                        </button>
                      )}
                    </div>

                    {/* Paid Bilty Warning Notice */}
                    {isEditingDocketPaid && (
                      <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-2.5 text-xs">
                        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="font-bold">PAID Bilty (Charges Locked):</span>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            Payment for this consignment has already been settled. Freight rates and delivery charges cannot be altered.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Standard Logistics Charges Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {/* Loading / Hamali */}
                      <div className="space-y-1">
                        <label className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Loading / Hamali (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={isEditingDocketPaid}
                          value={editFormData.loadingCharges}
                          onChange={(e) => updateEditField('loadingCharges', e.target.value)}
                          placeholder="0"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                            isEditingDocketPaid
                              ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                              : isDark
                              ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      {/* Unloading */}
                      <div className="space-y-1">
                        <label className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Unloading (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={isEditingDocketPaid}
                          value={editFormData.unloadingCharges}
                          onChange={(e) => updateEditField('unloadingCharges', e.target.value)}
                          placeholder="0"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                            isEditingDocketPaid
                              ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                              : isDark
                              ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      {/* Door Delivery */}
                      <div className="space-y-1">
                        <label className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Door Delivery (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={isEditingDocketPaid}
                          value={editFormData.doorDeliveryCharges}
                          onChange={(e) => updateEditField('doorDeliveryCharges', e.target.value)}
                          placeholder="0"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                            isEditingDocketPaid
                              ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                              : isDark
                              ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      {/* Other Charges / Bilty Fee */}
                      <div className="space-y-1">
                        <label className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Bilty Fee / Misc (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={isEditingDocketPaid}
                          value={editFormData.otherCharges}
                          onChange={(e) => updateEditField('otherCharges', e.target.value)}
                          placeholder="0"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                            isEditingDocketPaid
                              ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                              : isDark
                              ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Dynamic Custom Charges Added by User in Edit Modal */}
                    {editFormData.customCharges && editFormData.customCharges.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-slate-700/40">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                          Custom Charges Added ({editFormData.customCharges.length})
                        </span>
                        {editFormData.customCharges.map((item, index) => (
                          <div
                            key={item.id || index}
                            className={`flex items-center gap-2 p-2 rounded-xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                              }`}
                          >
                            <div className="flex-1">
                              <input
                                type="text"
                                list={`edit-charge-suggestions-${index}`}
                                value={item.name}
                                disabled={isEditingDocketPaid}
                                placeholder="Charge Name (e.g. Toll / Demurrage)"
                                onChange={(e) => {
                                  const updatedList = [...editFormData.customCharges];
                                  updatedList[index] = { ...updatedList[index], name: e.target.value };
                                  updateEditField('customCharges', updatedList, updatedList);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                                  isEditingDocketPaid
                                    ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                                    : isDark
                                    ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                                    : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-500'
                                }`}
                              />
                              <datalist id={`edit-charge-suggestions-${index}`}>
                                <option value="Toll / Border Tax" />
                                <option value="Cartage / Pickup Charge" />
                                <option value="FOV / Insurance Charge" />
                                <option value="Demurrage / Detention" />
                                <option value="Fuel Surcharge" />
                                <option value="Handling / Labour" />
                                <option value="Statistical / Misc Charge" />
                              </datalist>
                            </div>
                            <div className="w-28 relative">
                              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                disabled={isEditingDocketPaid}
                                value={item.amount}
                                placeholder="0"
                                onChange={(e) => {
                                  const updatedList = [...editFormData.customCharges];
                                  updatedList[index] = { ...updatedList[index], amount: e.target.value };
                                  updateEditField('customCharges', updatedList, updatedList);
                                }}
                                className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                                  isEditingDocketPaid
                                    ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                                    : isDark
                                    ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                                    : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            {!isEditingDocketPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedList = editFormData.customCharges.filter((_, i) => i !== index);
                                  updateEditField('customCharges', updatedList, updatedList);
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Remove Charge"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Discount & GST row in Edit Modal */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/40">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold flex items-center justify-between text-rose-400">
                          <span>Discount (₹)</span>
                          <span className="text-[10px] text-slate-500">Deduction</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={isEditingDocketPaid}
                          value={editFormData.discountAmount}
                          onChange={(e) => updateEditField('discountAmount', e.target.value)}
                          placeholder="0"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                            isEditingDocketPaid
                              ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                              : isDark
                              ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          GST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="28"
                          disabled={isEditingDocketPaid}
                          value={editFormData.taxPercent}
                          onChange={(e) => updateEditField('taxPercent', e.target.value)}
                          placeholder="0"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                            isEditingDocketPaid
                              ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                              : isDark
                              ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Freight */}
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                        <span>Total Docket Freight (₹)</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isEditingDocketPaid
                          ? 'Charges locked for PAID bilty'
                          : 'Auto-calculated from Basic + Charges - Discount + Tax (Editable)'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      disabled={isEditingDocketPaid}
                      value={editFormData.totalAmount}
                      onChange={(e) => updateEditField('totalAmount', e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono font-black focus:outline-none transition-colors ${
                        isEditingDocketPaid
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/90 text-cyan-300 focus:border-cyan-400'
                          : 'border-blue-200 bg-blue-50/50 text-blue-700 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Payment Term</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      {isEditingDocketPaid && (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Payment Settled (PAID)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['PAID', 'TO_PAY', 'TBB'].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          disabled={isEditingDocketPaid}
                          onClick={() => setEditFormData({ ...editFormData, paymentMode: mode })}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                            isEditingDocketPaid ? 'opacity-60 cursor-not-allowed ' : ''
                          }${editFormData.paymentMode === mode
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                        >
                          {mode === 'TBB' ? 'T.B.B. (Bill)' : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Load / Movement Type (PTL vs FTL) */}
                  <div className="space-y-1 col-span-2">
                    <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Consignment Load Type (PTL / FTL) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, loadType: 'PTL' })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          (editFormData.loadType || 'PTL') === 'PTL'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>📦</span>
                        <span>PTL (Part Truck Load)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, loadType: 'FTL' })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          (editFormData.loadType || 'PTL') === 'FTL'
                            ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                            : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>🚛</span>
                        <span>FTL (Full Truck Load)</span>
                      </button>
                    </div>
                  </div>

                  {/* Transport Mode */}
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Mode of Transport *
                      </label>
                      {isEditingDocketPaid && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked (PAID)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'ROAD', label: 'By Road', icon: Truck },
                        { id: 'RAIL', label: 'By Rail', icon: Train },
                        { id: 'AIR', label: 'By Air', icon: Plane },
                      ].map((m) => {
                        const IconComp = m.icon;
                        const isSelected = (editFormData.transportMode || 'ROAD') === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={isEditingDocketPaid}
                            onClick={() => setEditFormData({ ...editFormData, transportMode: m.id })}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              isEditingDocketPaid ? 'opacity-60 cursor-not-allowed ' : ''
                            }${isSelected
                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                : isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                              }`}
                          >
                            <IconComp className="w-3.5 h-3.5 shrink-0" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Type */}
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Delivery Type *
                      </label>
                      {isEditingDocketPaid ? (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked for PAID Bilty
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {editFormData.deliveryType === 'DOOR_DELIVERY' ? 'Doorstep Delivery' : 'Godown Delivery'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isEditingDocketPaid}
                        onClick={() => updateEditField('deliveryType', 'GODOWN_DELIVERY')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          isEditingDocketPaid ? 'opacity-60 cursor-not-allowed ' : ''
                        }${(editFormData.deliveryType || 'GODOWN_DELIVERY') === 'GODOWN_DELIVERY'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Godown Delivery</span>
                      </button>

                      <button
                        type="button"
                        disabled={isEditingDocketPaid}
                        onClick={() => updateEditField('deliveryType', 'DOOR_DELIVERY')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          isEditingDocketPaid ? 'opacity-60 cursor-not-allowed ' : ''
                        }${editFormData.deliveryType === 'DOOR_DELIVERY'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Door Delivery</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className={`p-4 px-6 border-t flex items-center justify-end space-x-3 shrink-0 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Docket Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE DOCKET CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isDeleteModalOpen && deletingDocket && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex min-h-full items-center justify-center">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => !isSubmittingDelete && setIsDeleteModalOpen(false)}
          />

          <div className={`relative w-full max-w-md my-auto rounded-3xl border shadow-2xl p-6 z-10 ${isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Delete Docket (LR / Bilty)</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Irreversible database record removal</p>
              </div>
            </div>

            <div className={`mt-4 p-3.5 rounded-xl border text-xs space-y-1 ${isDark
                ? 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
              <p className="font-bold">
                Are you sure you want to delete Docket <span className={`font-mono underline ${isDark ? 'text-white' : 'text-slate-900 font-bold'}`}>{deletingDocket.lr_number}</span>?
              </p>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                This action will delete the consignment, parcel items, tracking milestones, and associated booking from your tenant database permanently.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={() => setIsDeleteModalOpen(false)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${isDark
                    ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting from DB...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BILTY (LR) PRINT PREVIEW MODAL - LARGE SLIP TYPE */}
      {/* ======================================================== */}
      {isPrintModalOpen && printConsignment && typeof document !== 'undefined' && createPortal(
        <div id="bilty-modal-portal">
          {/* Print media CSS */}
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 6mm 6mm;
              }

              /* Force browser to print exact colors, stamps, and dark total bars */
              *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              html, body {
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }

              /* Hide the entire background web application */
              body > *:not(#bilty-modal-portal) {
                display: none !important;
              }

              #bilty-modal-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }

              /* Remove modal backdrop fixed overlay & flex centering */
              #bilty-modal-backdrop {
                position: static !important;
                inset: auto !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                background: transparent !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }

              /* Remove dialog max-height (92vh) and overflow clipping */
              #bilty-modal-dialog {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                background: transparent !important;
              }

              /* Remove body scroll container (overflow-y-auto) */
              #bilty-modal-body {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
              }

              /* Hide toolbar and footer info bar from print */
              #bilty-modal-toolbar,
              #bilty-modal-footer,
              .no-print {
                display: none !important;
              }

              /* Printable area starts right at top of paper */
              #bilty-slip-printable-area {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }

              /* Bilty Slip Sheet styling for paper */
              .bilty-slip-sheet {
                display: block !important;
                position: relative !important;
                box-shadow: none !important;
                border: 2px solid #000000 !important;
                border-radius: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 0 10mm 0 !important;
                padding: 4mm 5mm !important;
                background: #ffffff !important;
                color: #000000 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
              }

              /* Triplicate page break: each copy on its own clean single A4 sheet */
              .bilty-page-break {
                page-break-after: always !important;
                break-after: page !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                visibility: hidden !important;
              }
            }
          `}} />

          {/* Modal Container */}
          <div
            id="bilty-modal-backdrop"
            className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4 bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center"
          >
            <div
              id="bilty-modal-dialog"
              className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto z-10 transition-colors ${isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
            >

              {/* Top Toolbar (Non-printable) */}
              <div
                id="bilty-modal-toolbar"
                className={`p-3 sm:p-4 px-4 sm:px-6 border-b flex items-center justify-between gap-3 shrink-0 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
              >
                {/* Left: Icon, LR Number & Customer Route */}
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold truncate">Consignment Note (Bilty / LR)</h3>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/30 shrink-0">
                        {printConsignment.lr_number}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {printConsignment.consignor?.name || printConsignment.consignor_name || 'Shipper'} ➔ {printConsignment.consignee?.name || printConsignment.consignee_name || 'Receiver'}
                      </span>
                      <span className="mx-1.5 opacity-50">•</span>
                      <span>{printConsignment.consignor?.city || printConsignment.origin_city} ➔ {printConsignment.consignee?.city || printConsignment.destination_city}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Copy Selector Pills + Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Copy Selector Pills */}
                  <div className={`hidden md:flex items-center p-0.5 rounded-xl border text-[11px] font-semibold shrink-0 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => setActivePrintCopy('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activePrintCopy === 'ALL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      Triplicate (All 3)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePrintCopy('CONSIGNOR')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activePrintCopy === 'CONSIGNOR'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      Consignor Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePrintCopy('CONSIGNEE')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activePrintCopy === 'CONSIGNEE'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      Consignee Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePrintCopy('DRIVER')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activePrintCopy === 'DRIVER'
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      Driver / Transporter
                    </button>
                  </div>

                  {/* Action Buttons: Print Slip & Close */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') window.print();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5 transition-transform active:scale-95 cursor-pointer shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Bilty</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(false)}
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${isDark
                          ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      title="Close preview"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body / Scrollable Sheet Preview */}
              <div
                id="bilty-modal-body"
                className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isDark ? 'bg-slate-950/70' : 'bg-slate-200/60'
                  }`}
              >
                <div id="bilty-slip-printable-area" className="w-full">
                  {(activePrintCopy === 'ALL'
                    ? ['CONSIGNOR', 'CONSIGNEE', 'DRIVER']
                    : [activePrintCopy]
                  ).map((copyType, idx, arr) => (
                    <div key={copyType}>
                      {renderBiltySlipSheet(printConsignment, copyType)}
                      {idx < arr.length - 1 && (
                        <div className="bilty-page-break my-6 border-b-2 border-dashed border-slate-400 no-print" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Footer info bar */}
              <div
                id="bilty-modal-footer"
                className={`p-3 px-6 border-t flex items-center justify-between text-xs shrink-0 ${isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Compliant with Indian Carriage by Road Act 2007 & Rule 138 of CGST</span>
                </span>
                <span>
                  Press <strong>Ctrl + P</strong> or click <strong>Print Slip</strong> to generate physical bilty or save as PDF.
                </span>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Date Range Export Modal */}
      <ExportDateRangeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialFromDate={fromDate}
        initialToDate={toDate}
        initialStatus={statusFilter}
        branches={branchesList}
        activeBranch={activeBranch}
        columns={bookingColumns}
        documentTerminology={term || 'Docket'}
      />

    </div>
  );
}
