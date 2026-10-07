// frontend/app/(owner)/bookings/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { useTerminology } from '../../../hooks/useTerminology';
import { useStore } from '../../../store/useStore';
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
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  User,
  Users,
  UserCheck,
  Phone,
  QrCode
} from 'lucide-react';
import DataTable from '../../../components/ui/DataTable';
import Barcode from '../../../components/ui/Barcode';
import DateRangeFilter from '../../../components/ui/DateRangeFilter';
import ExportDateRangeModal from '../../../components/bookings/ExportDateRangeModal';
import { usePermissions } from '../../../hooks/usePermissions';

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
    DELIVERED: 'emerald',
    DELAYED: 'rose',
    OUT_FOR_DELIVERY: 'amber',
    CANCELLED: 'rose',
    BOOKED: 'purple',
  };
  const statusLabelMap = {
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    DELAYED: 'Delayed',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    CANCELLED: 'Cancelled',
    BOOKED: 'Booked / Godown',
  };

  const status = c.status || 'BOOKED';
  const originCity = c.origin_city || (c.originBranch?.city) || 'Delhi';
  const destCity = c.destination_city || (c.destBranch?.city) || 'Mumbai';

  return {
    id: c.id,
    booking_id: c.booking_id ? (c.booking_id.startsWith('BKG') ? c.booking_id : `BKG-${c.booking_id.slice(0, 8)}`) : 'BKG-DIRECT',
    lr_number: c.docket_number || c.lr_number || `CSN-${(c.id || '').slice(0, 8).toUpperCase()}`,
    booking_date: c.booking_date ? new Date(c.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
    raw_booking_date: c.booking_date || new Date().toISOString().slice(0, 10),
    origin_city: originCity,
    destination_city: destCity,
    route_code: `${originCity.slice(0, 3).toUpperCase()} ➔ ${destCity.slice(0, 3).toUpperCase()}`,
    consignor: {
      name: c.consignor?.name || 'Consignor Shipper',
      segment: 'Commercial Freight',
      city: c.consignor?.city || originCity,
      phone: c.consignor?.phone || '',
    },
    consignee: {
      name: c.consignee?.name || 'Consignee Receiver',
      segment: 'Receiving Depot',
      city: c.consignee?.city || destCity,
      phone: c.consignee?.phone || '',
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
    vehicle_number: c.vehicle_number || (c.active_trip?.vehicle?.vehicle_number) || (c.trips?.[0]?.vehicle?.vehicle_number) || 'Unassigned',
    vehicle_type: c.vehicle_type || (c.active_trip?.vehicle?.vehicle_type) || (c.trips?.[0]?.vehicle?.vehicle_type) || 'Scheduled Line-haul',
    driver_name: c.driver_name || (c.active_trip?.driver?.name) || (c.trips?.[0]?.driver?.name) || 'Pending Allocation',
    driver_phone: c.driver_phone || (c.active_trip?.driver?.phone) || (c.trips?.[0]?.driver?.phone) || '',
    trip_number: c.trip_number || (c.active_trip?.trip_number) || (c.trips?.[0]?.trip_number) || null,
    transport_mode: c.transport_mode || 'ROAD',
    total_amount: parseFloat(c.total_amount || c.freight_amount || 0),
    payment_mode: c.payment_type || 'TO_PAY',
    status: status,
    status_label: statusLabelMap[status] || status,
    status_tone: statusToneMap[status] || 'purple',
    current_milestone: status === 'DELIVERED'
      ? 'Receiver Signed with Stamp'
      : status === 'IN_TRANSIT'
      ? 'In Line-haul Highway Transit'
      : status === 'OUT_FOR_DELIVERY'
      ? 'Out for Local Delivery'
      : 'Staged at Origin Warehouse Dock',
    eta: status === 'DELIVERED' ? 'Delivered' : 'ETA in 24-48 Hours',
    progress_percent: status === 'DELIVERED' ? 100 : status === 'IN_TRANSIT' ? 65 : status === 'OUT_FOR_DELIVERY' ? 90 : 15,
  };
};

export default function BookingsMasterPage() {
  const { theme } = useTheme();
  const { term, plural, newDocLabel } = useTerminology();
  const activeBranch = useStore((state) => state.activeBranch);

  const isDark = theme === 'dark';
  const { canEdit, canDelete, canExport, isAdmin, canCreateBooking } = usePermissions();

  // Server-side Pagination & Sorting State
  const [consignments, setConsignments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('booking_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    pending: 0,
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
    status: 'BOOKED',
  });

  // Delete Docket State
  const [deletingDocket, setDeletingDocket] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Bilty Print Preview Modal State
  const user = useStore((state) => state.user);
  const userBranchId = user?.branch_id || user?.branchId || null;
  const isGlobalUser = user?.role === 'SUPER_ADMIN' || user?.role === 'TRANSPORT_OWNER' || user?.role === 'ADMIN';
  const isRestrictedBranchUser = !isGlobalUser && !!userBranchId;
  const [printConsignment, setPrintConsignment] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintCopy, setActivePrintCopy] = useState('ALL'); // 'ALL' | 'CONSIGNOR' | 'CONSIGNEE' | 'DRIVER'

  const handleOpenPrintPreview = (consignment) => {
    if (!consignment) return;
    setPrintConsignment(consignment);
    setIsPrintModalOpen(true);
  };

  // Renders a single official Indian transport bilty slip sheet
  const renderBiltySlipSheet = (c, copyTitle) => {
    if (!c) return null;

    const companyBrand = user?.businessName || user?.organizationName || (typeof window !== 'undefined' ? localStorage.getItem('transporter_brand_name') : null) || 'Balaji Logistics';
    const companyLogo = user?.logoUrl || (typeof window !== 'undefined' ? localStorage.getItem('transporter_logo') : null);
    const companyAddress = user?.address || 'Plot 42, Transport Nagar, Phase-II, New Delhi - 110042';
    const companyPhone = user?.phone || user?.mobile || '+91 98765 43210';
    const companyEmail = user?.email || 'operations@balajilogistics.in';
    const companyGstin = user?.gstin || '07AABCB1234F1Z8';
    const companyPan = user?.pan || 'AABCB1234F';

    const isConsignorCopy = copyTitle.includes('CONSIGNOR');
    const isConsigCopy = copyTitle.includes('CONSIGNEE');

    const badgeTheme = isConsignorCopy
      ? 'border-rose-600 bg-rose-50 text-rose-800'
      : isConsigCopy
      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
      : 'border-blue-600 bg-blue-50 text-blue-800';

    const freightAmt = parseFloat(c.freight_amount || 0);
    const loadingAmt = parseFloat(c.loading_charges || 0);
    const biltyFeeAmt = parseFloat(c.bilty_fee || 50);
    const ddcAmt = parseFloat(c.door_delivery_charges || 0);
    const otherAmt = parseFloat(c.other_charges || 0);
    const discountAmt = parseFloat(c.discount_amount || 0);
    const taxAmt = parseFloat(c.tax_amount || 0);
    const totalAmt = parseFloat(c.total_amount || (freightAmt + loadingAmt + biltyFeeAmt + ddcAmt + otherAmt - discountAmt + taxAmt) || 0);

    const paymentType = (c.payment_mode || 'TO_PAY').toUpperCase();

    return (
      <div className="bilty-slip-sheet bg-white text-slate-900 border-2 border-slate-900 rounded-none shadow-xl p-5 sm:p-7 max-w-[860px] mx-auto text-[11px] leading-tight font-sans relative my-4">
        
        {/* Faint Background Security Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none overflow-hidden">
          <span className="text-8xl font-black rotate-[-22deg] uppercase tracking-widest text-slate-900 whitespace-nowrap">
            {copyTitle.split(' ')[0]} COPY
          </span>
        </div>

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
            <div className={`mt-0.5 inline-block px-2 py-0.5 border text-[9px] font-extrabold tracking-wide uppercase rounded ${badgeTheme}`}>
              {copyTitle}
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

        {/* 3. Operational Transit Corridor Strip (4 Columns) */}
        <div className="grid grid-cols-4 border-b-2 border-slate-900 bg-slate-100 text-[10px] font-sans">
          <div className="border-r border-slate-900 p-2">
            <span className="text-[8.5px] uppercase font-bold text-slate-500 block">ORIGIN HUB (FROM)</span>
            <span className="font-black text-slate-900 uppercase text-[11px] truncate block">{c.origin_city}</span>
          </div>
          <div className="border-r border-slate-900 p-2">
            <span className="text-[8.5px] uppercase font-bold text-slate-500 block">DESTINATION (TO)</span>
            <span className="font-black text-slate-900 uppercase text-[11px] truncate block">{c.destination_city}</span>
          </div>
          <div className="border-r border-slate-900 p-2">
            <span className="text-[8.5px] uppercase font-bold text-slate-500 block">MODE & VEHICLE</span>
            <span className="font-mono font-black text-slate-900 text-[11px] truncate block">
              {c.transport_mode === 'AIR' ? '✈️ BY AIR' : c.transport_mode === 'RAIL' ? '🚆 BY RAIL' : '🚛 BY ROAD'} {c.vehicle_number && c.vehicle_number !== 'Unassigned' ? `• ${c.vehicle_number}` : ''}
            </span>
          </div>
          <div className="p-2">
            <span className="text-[8.5px] uppercase font-bold text-slate-500 block">DRIVER / CARRIER</span>
            <span className="font-semibold text-slate-900 truncate block">{c.driver_name || 'Pending Assignment'}</span>
          </div>
        </div>

        {/* 4. Consignor & Consignee Box (Two-Columns) */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900">
          {/* Consignor */}
          <div className="border-r border-slate-900 p-2.5">
            <div className="text-[9px] font-black tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span>CONSIGNOR (SHIPPER)</span>
              <span className="text-[8.5px] font-normal text-slate-400">DISPATCH FROM</span>
            </div>
            <div className="font-bold text-slate-950 text-xs">{c.consignor?.name || 'Commercial Consignor'}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{c.consignor?.city || c.origin_city}</div>
            <div className="text-[9.5px] font-mono text-slate-700 mt-1">
              Ph: {c.consignor?.phone || 'Not Provided'}
            </div>
            <div className="text-[9px] font-mono text-slate-500 mt-0.5">
              GSTIN: 07AABCT8842K1Z9 (Regular)
            </div>
          </div>

          {/* Consignee */}
          <div className="p-2.5">
            <div className="text-[9px] font-black tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span>CONSIGNEE (RECEIVER)</span>
              <span className="text-[8.5px] font-normal text-slate-400">DELIVER TO</span>
            </div>
            <div className="font-bold text-slate-950 text-xs">{c.consignee?.name || 'Commercial Consignee'}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{c.consignee?.city || c.destination_city}</div>
            <div className="text-[9.5px] font-mono text-slate-700 mt-1">
              Ph: {c.consignee?.phone || 'Not Provided'}
            </div>
            <div className="text-[9px] font-mono text-slate-500 mt-0.5">
              GSTIN: 29AABCT8842K1Z2 (Regular)
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
                  ₹{c.rate || 0} / KG
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
                <div className={`inline-block px-3 py-1 border-2 border-dashed font-black text-xs tracking-widest uppercase rounded rotate-[-3deg] shadow-xs ${
                  paymentType === 'TO_PAY'
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
              <p>• <strong>GST Note:</strong> Tax payable under Reverse Charge Mechanism (RCM) by {paymentType === 'TO_PAY' ? 'Consignee' : 'Consignor'} as per Notif. No. 13/2017-CT(R).</p>
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
            2. Delivery will be effected only upon surrender of original Consignee copy duly signed and stamped.
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
  const [branchesList, setBranchesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const consignorDropdownRef = useRef(null);
  const consigneeDropdownRef = useRef(null);

  const [docketSeriesPreview, setDocketSeriesPreview] = useState(null);

  const [formData, setFormData] = useState({
    docketNumberMode: 'auto', // 'auto' | 'manual'
    customDocketNumber: '',
    consignorName: '',
    consignorCity: '',
    consignorPhone: '',
    consignorId: '',
    consigneeName: '',
    consigneeCity: '',
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
    // Dynamic & Editable Charges
    loadingCharges: '450',
    unloadingCharges: '0',
    doorDeliveryCharges: '0',
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
    const weight = parseFloat(data.weightKg) || 0;
    const rate = parseFloat(data.ratePerKg) || 0;
    const basicFreight = Math.round(weight * rate);

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
      const res = await api.get('/customers?limit=200');
      const list = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.rows || []);
      setCustomersList(list);
    } catch (err) {
      console.warn('Failed to load customers for booking dropdown:', err);
      setCustomersList([]);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchCustomers();
    fetchDocketSeriesPreview();
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      fetchBranches();
      fetchCustomers();
      fetchDocketSeriesPreview();
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (consignorDropdownRef.current && !consignorDropdownRef.current.contains(e.target)) {
        setShowConsignorDropdown(false);
      }
      if (consigneeDropdownRef.current && !consigneeDropdownRef.current.contains(e.target)) {
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

  const filteredConsignors = useMemo(() => {
    if (!customersList || customersList.length === 0) return [];
    const q = (formData.consignorName || '').toLowerCase().trim();
    if (!q) return customersList;
    return customersList.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const code = (c.customer_code || '').toLowerCase();
      const city = (c.city || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q) || phone.includes(q) || gstin.includes(q);
    });
  }, [customersList, formData.consignorName]);

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

  // Step validation rules for New Consignment Modal
  const isStep1Valid = useMemo(() => {
    if (formData.docketNumberMode === 'manual' && !(formData.customDocketNumber || '').trim()) {
      return false;
    }
    if (!(formData.consignorName || '').trim()) {
      return false;
    }
    if (!(formData.consigneeName || '').trim()) {
      return false;
    }
    if (!formData.originBranchId) {
      return false;
    }
    if (!formData.destBranchId) {
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

  const step1MissingFields = useMemo(() => {
    const missing = [];
    if (formData.docketNumberMode === 'manual' && !(formData.customDocketNumber || '').trim()) {
      missing.push('Manual Docket No');
    }
    if (!(formData.consignorName || '').trim()) {
      missing.push('Consignor (Shipper)');
    }
    if (!(formData.consigneeName || '').trim()) {
      missing.push('Consignee (Receiver)');
    }
    if (!formData.originBranchId) {
      missing.push('Origin Hub');
    }
    if (!formData.destBranchId) {
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

  const isStep2Valid = useMemo(() => {
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
    return true;
  }, [formData]);

  const step2MissingFields = useMemo(() => {
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
    return missing;
  }, [formData]);

  const isCurrentStepValid = bookingStep === 1 ? isStep1Valid : bookingStep === 2 ? isStep2Valid : true;
  const currentMissingFields = bookingStep === 1 ? step1MissingFields : bookingStep === 2 ? step2MissingFields : [];

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

    try {
      let url = `/bookings?page=${p}&limit=${ps}&sort_by=${sb}&sort_order=${so}`;
      if (sq) url += `&search=${encodeURIComponent(sq)}`;
      if (sf && sf !== 'ALL') {
        if (sf === 'PENDING') {
          url += `&status=BOOKED,MATERIAL_RECEIVED,READY_FOR_DISPATCH,LOADED`;
        } else if (sf === 'IN_TRANSIT') {
          url += `&status=IN_TRANSIT,DISPATCHED,ON_TRIP`;
        } else {
          url += `&status=${sf}`;
        }
      }
      if (fd) url += `&from_date=${fd}`;
      if (td) url += `&to_date=${td}`;

      const res = await api.get(url);
      const rawList = res.data?.data || [];
      const mapped = rawList.map(mapConsignmentFromApi);
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
      if (statusFilter && statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING') {
          url += `&status=BOOKED,MATERIAL_RECEIVED,READY_FOR_DISPATCH,LOADED`;
        } else if (statusFilter === 'IN_TRANSIT') {
          url += `&status=IN_TRANSIT,DISPATCHED,ON_TRIP`;
        } else {
          url += `&status=${statusFilter}`;
        }
      }
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;
      if (activeBranch && activeBranch !== 'ALL') url += `&branch_id=${activeBranch}`;

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
  }, [activeBranch, page, pageSize, sortBy, sortOrder, statusFilter, fromDate, toDate]);

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

    setEditFormData({
      docketNumber: c.lr_number,
      consignorName: c.consignor?.name || '',
      consignorCity: c.consignor?.city || c.origin_city || '',
      consigneeName: c.consignee?.name || '',
      consigneeCity: c.consignee?.city || c.destination_city || '',
      originCity: c.origin_city,
      destinationCity: c.destination_city,
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
      paymentMode: c.payment_mode || 'TO_PAY',
      transportMode: c.transport_mode || 'ROAD',
      status: c.status || 'BOOKED',
    });
    setIsEditModalOpen(true);
  };

  const updateEditField = (field, value, customChargesOverride = null) => {
    const updated = { ...editFormData, [field]: value };
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

      const payload = {
        docket_number: editFormData.docketNumber,
        lr_number: editFormData.docketNumber,
        consignor_name: editFormData.consignorName,
        consignor_city: editFormData.consignorCity,
        consignee_name: editFormData.consigneeName,
        consignee_city: editFormData.consigneeCity,
        origin_city: editFormData.originCity,
        destination_city: editFormData.destinationCity,
        material_description: editFormData.cargoType,
        packages_count: parseInt(editFormData.packagesCount, 10) || 1,
        actual_weight: weight,
        charged_weight: weight,
        rate: rate,
        freight_amount: calculatedFreight,
        loading_charges: loading,
        hamali_charges: loading,
        unloading_charges: unloading,
        door_delivery_charges: doorDelivery,
        other_charges: totalOther,
        discount_amount: discount,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_type: editFormData.paymentMode,
        transport_mode: editFormData.transportMode || 'ROAD',
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
    setDeletingDocket(c);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDocket) return;
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
  const deliveredCount = statusSummary.delivered || consignments.filter((c) => c.status === 'DELIVERED').length;
  const pendingOrGodownCount = statusSummary.pending || consignments.filter((c) => c.status === 'BOOKED' || c.status === 'MATERIAL_RECEIVED' || c.status === 'READY_FOR_DISPATCH' || c.status === 'LOADED' || c.status === 'OUT_FOR_DELIVERY').length;
  const delayedCount = statusSummary.delayed || consignments.filter((c) => c.status === 'DELAYED').length;

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
      title: 'In Transit',
      count: inTransitCount.toString(),
      change: 'Active',
      subtext: 'Active on road',
      color: 'cyan',
      icon: Truck
    },
    {
      title: 'Delivered',
      count: deliveredCount.toString(),
      change: 'Completed',
      subtext: 'Delivered consignments',
      color: 'emerald',
      icon: CheckCircle2
    },
    {
      title: 'Pending / Godown',
      count: pendingOrGodownCount.toString(),
      change: 'Staged',
      subtext: 'Ready for loading',
      color: 'rose',
      icon: AlertTriangle
    }
  ];

  // Filtered List
  const filteredConsignments = useMemo(() => {
    return consignments.filter((c) => {
      const matchesSearch =
        (c.lr_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.booking_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.consignor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.consignee?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.origin_city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.destination_city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.vehicle_number || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === 'ALL') return matchesSearch;
      if (statusFilter === 'IN_TRANSIT') return matchesSearch && (c.status === 'IN_TRANSIT' || c.status === 'DISPATCHED' || c.status === 'ON_TRIP');
      if (statusFilter === 'DELIVERED') return matchesSearch && c.status === 'DELIVERED';
      if (statusFilter === 'DELAYED') return matchesSearch && c.status === 'DELAYED';
      if (statusFilter === 'PENDING') return matchesSearch && (c.status === 'BOOKED' || c.status === 'MATERIAL_RECEIVED' || c.status === 'READY_FOR_DISPATCH' || c.status === 'LOADED' || c.status === 'OUT_FOR_DELIVERY');

      return matchesSearch;
    });
  }, [consignments, searchQuery, statusFilter]);

  const handleOpenDetails = (c) => {
    setSelectedConsignment(c);
    setIsDetailsOpen(true);
  };

  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    if (!isStep1Valid || !isStep2Valid) {
      alert('Please fill all mandatory fields before creating the consignment note.');
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

      const payload = {
        docket_number: isManualDocket ? customDocNum : undefined,
        lr_number: isManualDocket ? customDocNum : undefined,
        origin_branch_id: formData.originBranchId || undefined,
        dest_branch_id: formData.destBranchId || undefined,
        origin_city: formData.originCity,
        destination_city: formData.destinationCity,
        consignor_id: formData.consignorId || undefined,
        consignor_name: formData.consignorName || 'Shipper Party',
        consignor_phone: formData.consignorPhone || undefined,
        consignee_id: formData.consigneeId || undefined,
        consignee_name: formData.consigneeName || 'Consignee Party',
        consignee_phone: formData.consigneePhone || undefined,
        material_description: formData.cargoType || 'General Freight',
        packages_count: parseInt(formData.packagesCount, 10) || 10,
        actual_weight: parseFloat(formData.weightKg) || 0,
        charged_weight: parseFloat(formData.weightKg) || 0,
        rate: parseFloat(formData.ratePerKg) || 0,
        freight_amount: breakdown.basicFreight,
        loading_charges: breakdown.loading,
        hamali_charges: breakdown.loading,
        unloading_charges: breakdown.unloading,
        door_delivery_charges: breakdown.doorDelivery,
        handling_charges: breakdown.biltyFee,
        other_charges: otherTotal,
        discount_amount: breakdown.discount,
        tax_percent: breakdown.taxPercent,
        tax_amount: breakdown.taxAmount,
        total_amount: breakdown.totalDocketFreight,
        payment_type: formData.paymentMode || 'TO_PAY',
        transport_mode: formData.transportMode || 'ROAD',
        pickup_address: formData.consignorCity || formData.originCity,
        delivery_address: formData.consigneeCity || formData.destinationCity,
        booking_remarks: customRemarks ? `Additional Charges: ${customRemarks}` : undefined,
      };

      const res = await api.post('/bookings', payload);
      setIsDrawerOpen(false);
      setShowConsignorDropdown(false);
      setShowConsigneeDropdown(false);
      setBookingStep(1);
      setFormData({
        docketNumberMode: 'auto',
        customDocketNumber: '',
        consignorName: '',
        consignorCity: '',
        consignorPhone: '',
        consignorId: '',
        consigneeName: '',
        consigneeCity: '',
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
        const createdConsignment = mapConsignmentFromApi(res.data.data);
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
        exportValue: (row) => row.lr_number,
        render: (val, row) => (
          <div>
            <div className={`font-mono font-bold group-hover:underline flex items-center gap-1.5 ${
              isDark ? 'text-cyan-400' : 'text-blue-600'
            }`}>
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>{row.lr_number}</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {row.booking_id}
            </div>
          </div>
        ),
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
        header: 'Corridor & Mode',
        sortable: true,
        width: 150,
        minWidth: 120,
        exportValue: (row) => `${row.origin_city} ➔ ${row.destination_city} (${row.transport_mode || 'ROAD'})`,
        render: (val, row) => (
          <div>
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] inline-block ${
              isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
            }`}>
              {row.route_code}
            </span>
            <div className="mt-1 flex items-center gap-1 text-[10px]">
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
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
              row.payment_mode === 'PAID'
                ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {row.payment_mode}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        width: 140,
        minWidth: 120,
        exportValue: (row) => row.status_label,
        render: (val, row) => (
          <div className="text-center whitespace-nowrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              row.status === 'IN_TRANSIT'
                ? isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                : row.status === 'DELIVERED'
                ? isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : row.status === 'DELAYED'
                ? isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
                : isDark ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
              {row.status_label}
            </span>
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
        render: (val, row) => (
          <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleOpenDetails(row)}
              className={`p-1.5 rounded-lg border transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'
              }`}
              title="View Consignment Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {canEdit && (
              <button
                onClick={() => handleOpenEdit(row)}
                className={`p-1.5 rounded-lg border transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
                title="Edit Docket (Admin)"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => handleOpenDelete(row)}
                className={`p-1.5 rounded-lg border transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
                title="Delete Docket (Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => handleOpenPrintPreview(row)}
              className={`p-1.5 rounded-lg border transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'
              }`}
              title="Print 3-Part Lorry Receipt / Bilty"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [isDark, canEdit, canDelete]
  );

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
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
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Bookings & Consignments
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {totalBookingsCount} total consignments registered in tenant database.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {canCreateBooking && (
                <button
                  onClick={() => {
                    setBookingStep(1);
                    setFormData(prev => ({ ...prev, docketNumberMode: 'auto', customDocketNumber: '' }));
                    fetchDocketSeriesPreview();
                    setIsDrawerOpen(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
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
                  className={`p-4 rounded-2xl border transition-all duration-200 shadow-sm ${
                    isDark
                      ? 'bg-[#0B1020]/90 border-slate-800/90'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {kpi.title}
                    </span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-blue-600'
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
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'PENDING'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pending / Dock{statusFilter === 'PENDING' ? ` (${pendingOrGodownCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('IN_TRANSIT'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'IN_TRANSIT'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  In Transit{statusFilter === 'IN_TRANSIT' ? ` (${inTransitCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('DELIVERED'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'DELIVERED'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Delivered{statusFilter === 'DELIVERED' ? ` (${deliveredCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('DELAYED'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'DELAYED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Delayed{statusFilter === 'DELAYED' ? ` (${delayedCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ALL'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All{statusFilter === 'ALL' ? ` (${totalBookingsCount})` : ''}
                </button>
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
          <div className={`relative w-full max-w-2xl max-h-[90vh] my-auto rounded-3xl shadow-2xl flex flex-col z-10 border overflow-hidden ${
            isDark ? 'bg-[#0A0E1A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    isDark 
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
                className={`p-2 rounded-xl border transition-colors ${
                  isDark 
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white' 
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TOP BAR: DOCKET NUMBER DISPLAY ONLY */}
            <div className={`px-6 py-2.5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-blue-50/70 border-blue-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <FileText className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Docket No:
                </span>
                <span className="font-mono text-sm font-black text-blue-600 dark:text-cyan-400 tracking-wide">
                  {formData.docketNumberMode === 'manual'
                    ? (formData.customDocketNumber || 'Pending Input...')
                    : (docketSeriesPreview?.nextNumber || 'BAL000001')}
                </span>
                {formData.docketNumberMode === 'manual' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Manual
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Auto-Generated
                  </span>
                )}
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className={`px-6 py-3 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/80'
            }`}>
              <button
                type="button"
                onClick={() => setBookingStep(1)}
                className="flex items-center space-x-2 cursor-pointer focus:outline-none"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  bookingStep === 1 
                    ? 'bg-blue-600 text-white' 
                    : isDark 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {bookingStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <span className={`text-xs font-bold ${
                  bookingStep === 1 
                    ? isDark ? 'text-cyan-400' : 'text-blue-600' 
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Parties & Hubs
                </span>
              </button>
              <div className={`w-8 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={() => {
                  if (isStep1Valid) setBookingStep(2);
                }}
                className={`flex items-center space-x-2 focus:outline-none transition-opacity ${
                  isStep1Valid ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50'
                }`}
                title={!isStep1Valid ? 'Fill mandatory fields in Step 1 to unlock' : 'Cargo & Rates'}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  bookingStep === 2 
                    ? 'bg-blue-600 text-white' 
                    : bookingStep > 2 
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                }`}>
                  {bookingStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <span className={`text-xs font-bold ${
                  bookingStep === 2 
                    ? isDark ? 'text-cyan-400' : 'text-blue-600' 
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Cargo & Rates
                </span>
              </button>
              <div className={`w-8 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <button
                type="button"
                disabled={!isStep1Valid || !isStep2Valid}
                onClick={() => {
                  if (isStep1Valid && isStep2Valid) setBookingStep(3);
                }}
                className={`flex items-center space-x-2 focus:outline-none transition-opacity ${
                  isStep1Valid && isStep2Valid ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50'
                }`}
                title={!isStep1Valid || !isStep2Valid ? 'Fill mandatory fields in Steps 1 & 2 to unlock' : 'Confirm'}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  bookingStep === 3 
                    ? 'bg-blue-600 text-white' 
                    : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                }`}>
                  3
                </div>
                <span className={`text-xs font-bold ${
                  bookingStep === 3 
                    ? isDark ? 'text-cyan-400' : 'text-blue-600' 
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Confirm
                </span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateBookingSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* STEP 1: Parties & Route Hubs */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                    isDark 
                      ? 'bg-blue-950/20 border-blue-500/20 text-cyan-300' 
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                    <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                    <span>Selected addresses are verified against GSTIN and e-Way Bill masters.</span>
                  </div>

                  {/* DOCKET / BILTY NUMBER ASSIGNMENT CARD */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {/* Row: 2 Buttons + Configure Series Link */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, docketNumberMode: 'auto', customDocketNumber: '' }))}
                          className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                            formData.docketNumberMode === 'auto'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isDark 
                                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Auto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, docketNumberMode: 'manual' }))}
                          className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                            formData.docketNumberMode === 'manual'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isDark 
                                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Enter Manually</span>
                        </button>
                      </div>

                      {isAdmin && (
                        <Link
                          href="/settings?tab=terminology"
                          target="_blank"
                          className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <span>Configure Series</span>
                          <span>↗</span>
                        </Link>
                      )}
                    </div>

                    {/* Input box shown when Enter Manually is active */}
                    {formData.docketNumberMode === 'manual' && (
                      <div className="space-y-1.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 mt-3 animate-in fade-in duration-150">
                        <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Enter Manual Docket / DWB Number</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={formData.customDocketNumber}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            customDocketNumber: e.target.value.toUpperCase().replace(/\s+/g, '') 
                          }))}
                          placeholder="e.g. DWB123222322 or BAL823883"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wide uppercase focus:outline-none transition-colors ${
                            isDark
                              ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400'
                              : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Enter your physical pre-printed stationery or custom consignment number.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Consignor (Shipper) */}
                  <div className="space-y-1.5 relative z-30" ref={consignorDropdownRef}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1.5 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        <span>Consignor (Shipper)</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                        {formData.consignorId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            <UserCheck className="w-3 h-3" />
                            Registered Customer
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        {formData.consignorId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                consignorName: '',
                                consignorId: '',
                                consignorPhone: '',
                                consignorCity: ''
                              }));
                              setShowConsignorDropdown(true);
                            }}
                            className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            Change / New Party
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                consignorName: '',
                                consignorId: '',
                                consignorPhone: '',
                                consignorCity: ''
                              }));
                              setShowConsignorDropdown(false);
                            }}
                            className={`text-[10px] font-semibold transition-colors ${
                              isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            New Party (Manual)
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Search or select registered customer (e.g. Reliance Retail Ltd)"
                        value={formData.consignorName}
                        onFocus={() => setShowConsignorDropdown(true)}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            consignorName: e.target.value,
                            consignorId: '' // Detach ID on manual text editing
                          }));
                          setShowConsignorDropdown(true);
                        }}
                        className={`w-full px-3.5 py-2.5 pr-16 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400' 
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
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
                                consignorCity: ''
                              }));
                              setShowConsignorDropdown(true);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Clear input"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConsignorDropdown(prev => !prev)}
                          className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Toggle customer list"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showConsignorDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Consignor Suggestion Dropdown */}
                    {showConsignorDropdown && (
                      <div className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
                        isDark 
                          ? 'bg-slate-900/95 border-slate-700/80 text-white shadow-cyan-950/20' 
                          : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/20'
                      }`}>
                        <div className={`px-3.5 py-2 border-b flex items-center justify-between text-[11px] font-semibold ${
                          isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                        }`}>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            Registered Customers ({filteredConsignors.length})
                          </span>
                          <Link
                            href="/customers"
                            target="_blank"
                            className="text-[10px] text-cyan-500 hover:underline flex items-center gap-0.5"
                          >
                            + Add New in CRM
                          </Link>
                        </div>

                        <div className="max-h-52 overflow-y-auto divide-y divide-slate-800/40">
                          {filteredConsignors.length > 0 ? (
                            filteredConsignors.map((c) => {
                              const isSelected = formData.consignorId === c.id;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      consignorName: c.name,
                                      consignorId: c.id,
                                      consignorPhone: c.phone || prev.consignorPhone,
                                      consignorCity: c.city || prev.consignorCity,
                                    }));
                                    setShowConsignorDropdown(false);
                                  }}
                                  className={`p-2.5 px-3.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                                    isSelected 
                                      ? isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-50 text-blue-900 font-semibold'
                                      : isDark 
                                        ? 'hover:bg-slate-800/80 text-slate-200' 
                                        : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold truncate">{c.name}</span>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {c.customer_code || 'ID: ' + c.id}
                                      </span>
                                      {c.customer_type && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-semibold">
                                          {c.customer_type}
                                        </span>
                                      )}
                                    </div>
                                    <div className={`text-[11px] flex items-center gap-3 mt-0.5 ${
                                      isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                      {c.city && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-cyan-400" />
                                          {c.city}
                                        </span>
                                      )}
                                      {c.phone && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="w-3 h-3 text-emerald-400" />
                                          {c.phone}
                                        </span>
                                      )}
                                      {c.gstin && (
                                        <span className="font-mono text-[10px] text-slate-400">
                                          GST: {c.gstin}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center space-y-1">
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                No registered customer matching &quot;{formData.consignorName}&quot;
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Keep typing to register as a <b>New Party</b>, or add in Customers page.
                              </p>
                            </div>
                          )}
                        </div>

                        {formData.consignorName && (
                          <div 
                            onClick={() => setShowConsignorDropdown(false)}
                            className={`p-2 px-3.5 border-t text-xs cursor-pointer flex items-center justify-between font-medium ${
                              isDark ? 'bg-slate-950/80 border-slate-800 text-cyan-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 text-blue-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>Use &quot;{formData.consignorName}&quot; as New Custom Party</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Consignee (Receiver) */}
                  <div className="space-y-1.5 relative z-20" ref={consigneeDropdownRef}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1.5 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        <span>Consignee (Receiver)</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                        {formData.consigneeId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            <UserCheck className="w-3 h-3" />
                            Registered Customer
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        {formData.consigneeId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                consigneeName: '',
                                consigneeId: '',
                                consigneePhone: '',
                                consigneeCity: ''
                              }));
                              setShowConsigneeDropdown(true);
                            }}
                            className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            Change / New Party
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                consigneeName: '',
                                consigneeId: '',
                                consigneePhone: '',
                                consigneeCity: ''
                              }));
                              setShowConsigneeDropdown(false);
                            }}
                            className={`text-[10px] font-semibold transition-colors ${
                              isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            New Party (Manual)
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Search or select registered customer (e.g. Apollo Supply Chain Solutions)"
                        value={formData.consigneeName}
                        onFocus={() => setShowConsigneeDropdown(true)}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            consigneeName: e.target.value,
                            consigneeId: '' // Detach ID on manual text editing
                          }));
                          setShowConsigneeDropdown(true);
                        }}
                        className={`w-full px-3.5 py-2.5 pr-16 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400' 
                            : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
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
                                consigneeCity: ''
                              }));
                              setShowConsigneeDropdown(true);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Clear input"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConsigneeDropdown(prev => !prev)}
                          className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Toggle customer list"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showConsigneeDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Consignee Suggestion Dropdown */}
                    {showConsigneeDropdown && (
                      <div className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
                        isDark 
                          ? 'bg-slate-900/95 border-slate-700/80 text-white shadow-cyan-950/20' 
                          : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/20'
                      }`}>
                        <div className={`px-3.5 py-2 border-b flex items-center justify-between text-[11px] font-semibold ${
                          isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                        }`}>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            Registered Customers ({filteredConsignees.length})
                          </span>
                          <Link
                            href="/customers"
                            target="_blank"
                            className="text-[10px] text-cyan-500 hover:underline flex items-center gap-0.5"
                          >
                            + Add New in CRM
                          </Link>
                        </div>

                        <div className="max-h-52 overflow-y-auto divide-y divide-slate-800/40">
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
                                      consigneePhone: c.phone || prev.consigneePhone,
                                      consigneeCity: c.city || prev.consigneeCity,
                                    }));
                                    setShowConsigneeDropdown(false);
                                  }}
                                  className={`p-2.5 px-3.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                                    isSelected 
                                      ? isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-50 text-blue-900 font-semibold'
                                      : isDark 
                                        ? 'hover:bg-slate-800/80 text-slate-200' 
                                        : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold truncate">{c.name}</span>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {c.customer_code || 'ID: ' + c.id}
                                      </span>
                                      {c.customer_type && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-semibold">
                                          {c.customer_type}
                                        </span>
                                      )}
                                    </div>
                                    <div className={`text-[11px] flex items-center gap-3 mt-0.5 ${
                                      isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                      {c.city && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-cyan-400" />
                                          {c.city}
                                        </span>
                                      )}
                                      {c.phone && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="w-3 h-3 text-emerald-400" />
                                          {c.phone}
                                        </span>
                                      )}
                                      {c.gstin && (
                                        <span className="font-mono text-[10px] text-slate-400">
                                          GST: {c.gstin}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center space-y-1">
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                No registered customer matching &quot;{formData.consigneeName}&quot;
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Keep typing to register as a <b>New Party</b>, or add in Customers page.
                              </p>
                            </div>
                          )}
                        </div>

                        {formData.consigneeName && (
                          <div 
                            onClick={() => setShowConsigneeDropdown(false)}
                            className={`p-2 px-3.5 border-t text-xs cursor-pointer flex items-center justify-between font-medium ${
                              isDark ? 'bg-slate-950/80 border-slate-800 text-cyan-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 text-blue-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>Use &quot;{formData.consigneeName}&quot; as New Custom Party</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Origin & Destination Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Origin Hub / Branch</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                          {isRestrictedBranchUser && (
                            <span className="ml-1.5 text-[9px] font-bold text-cyan-500 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                              Assigned
                            </span>
                          )}
                        </label>
                        {!isRestrictedBranchUser && (
                          <Link
                            href="/branches"
                            target="_blank"
                            className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                              isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            <span>+ Add Hub</span>
                          </Link>
                        )}
                      </div>
                      {isRestrictedBranchUser ? (
                        <div className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/90 text-cyan-300' 
                            : 'border-slate-200 bg-slate-100 text-blue-900'
                        }`}>
                          <span className="truncate">
                            {branchesList.find((b) => b.id === userBranchId)?.branch_name || user?.branchName || 'Your Branch'} ({branchesList.find((b) => b.id === userBranchId)?.branch_code || 'HUB'}) - {branchesList.find((b) => b.id === userBranchId)?.city || user?.city || 'South Delhi'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-1">🔒 Locked</span>
                        </div>
                      ) : (
                        <select
                          value={formData.originBranchId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = branchesList.find((b) => b.id === val);
                            setFormData({
                              ...formData,
                              originBranchId: val,
                              originCity: found ? found.city : '',
                            });
                          }}
                          required
                          className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                            isDark 
                              ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                              : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                          }`}
                        >
                          {branchesList.length > 0 ? (
                            <>
                              <option value="">-- Select Origin Hub / Branch --</option>
                              {branchesList.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.branch_name} ({b.branch_code}) - {b.city} {b.pincode ? `[PIN: ${b.pincode}]` : ''}
                                </option>
                              ))}
                            </>
                          ) : (
                            <option value="">-- No Branch or Hub Present (Click "+ Add Hub") --</option>
                          )}
                        </select>
                      )}
                      {branchesList.length === 0 && !isRestrictedBranchUser && (
                        <p className="text-[11px] text-amber-500 font-semibold mt-1">
                          ⚠️ No branch or hub added yet. Click <Link href="/branches" target="_blank" className="underline font-bold">+ Add Hub</Link> to create one.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span>Destination Hub / Branch</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        {!isRestrictedBranchUser && (
                          <Link
                            href="/branches"
                            target="_blank"
                            className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                              isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            <span>+ Add Hub</span>
                          </Link>
                        )}
                      </div>
                      <select
                        value={formData.destBranchId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = branchesList.find((b) => b.id === val);
                          setFormData({
                            ...formData,
                            destBranchId: val,
                            destinationCity: found ? found.city : '',
                          });
                        }}
                        required
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                      >
                        {branchesList.length > 0 ? (
                          <>
                            <option value="">-- Select Destination Hub / Branch --</option>
                            {branchesList
                              .filter((b) => b.id !== formData.originBranchId)
                              .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.branch_name} ({b.branch_code}) - {b.city} {b.pincode ? `[PIN: ${b.pincode}]` : ''}
                              </option>
                            ))}
                          </>
                        ) : (
                          <option value="">-- No Branch or Hub Present (Click "+ Add Hub") --</option>
                        )}
                      </select>
                      {branchesList.length === 0 && (
                        <p className="text-[11px] text-amber-500 font-semibold mt-1">
                          ⚠️ No branch or hub added yet. Click <Link href="/branches" target="_blank" className="underline font-bold">+ Add Hub</Link> to create one.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pickup Date & Priority */}
                  <div className="grid grid-cols-2 gap-3">
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
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white [color-scheme:light]'
                        }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="flex items-center">
                          <span>Mode of Transport</span>
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </span>
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
                              className={`py-2 px-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                                  : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
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
                </div>
              )}

              {/* STEP 2: Cargo & Freight Charges */}
              {bookingStep === 2 && (
                <div className="space-y-4">
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
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                        isDark 
                          ? 'border-slate-800 bg-slate-900/80 text-white placeholder-slate-500 focus:border-cyan-400' 
                          : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Packages</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.packagesCount}
                        onChange={(e) => setFormData({ ...formData, packagesCount: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold flex items-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span>Weight (KG)</span>
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.weightKg}
                        onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Rate / KG (₹)</label>
                      <input
                        type="number"
                        value={formData.ratePerKg}
                        onChange={(e) => setFormData({ ...formData, ratePerKg: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                        }`}
                      />
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
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                            formData.paymentMode === mode
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
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                              isDark
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
                              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                isDark
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
                              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                isDark
                                  ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400'
                                  : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                              }`}
                            />
                          </div>

                          {/* Door Delivery (DDC) */}
                          <div className="space-y-1">
                            <span className={`text-[11px] font-semibold flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              <span>Door Delivery (DDC)</span>
                              <span className="text-[10px] text-slate-500">₹</span>
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={formData.doorDeliveryCharges}
                              onChange={(e) => setFormData({ ...formData, doorDeliveryCharges: e.target.value })}
                              placeholder="0"
                              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                isDark
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
                              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                isDark
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
                                className={`flex items-center gap-2 p-2 rounded-xl border ${
                                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
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
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                                      isDark
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
                                    className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                                      isDark
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
                              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                                isDark
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
                              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                                isDark
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
                        <div className={`p-4 rounded-2xl border space-y-2 mt-2 ${
                          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className={`text-xs font-bold flex items-center justify-between ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                            <span>Basic Freight ({formData.weightKg || 0} kg @ ₹{formData.ratePerKg || 0})</span>
                            <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              ₹ {(liveBreakdown.basicFreight || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Editable Loading/Hamali line */}
                          {liveBreakdown.loading > 0 && (
                            <div className={`text-xs font-medium flex items-center justify-between ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <span>Loading / Hamali Charges</span>
                              <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹ {(liveBreakdown.loading || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}

                          {/* Bilty Fee */}
                          {liveBreakdown.biltyFee > 0 && (
                            <div className={`text-xs font-medium flex items-center justify-between ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <span>Bilty / LR Stationary Fee</span>
                              <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹ {(liveBreakdown.biltyFee || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}

                          {/* Door Delivery */}
                          {liveBreakdown.doorDelivery > 0 && (
                            <div className={`text-xs font-medium flex items-center justify-between ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <span>Door Delivery Charges (DDC)</span>
                              <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹ {(liveBreakdown.doorDelivery || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}

                          {/* Unloading */}
                          {liveBreakdown.unloading > 0 && (
                            <div className={`text-xs font-medium flex items-center justify-between ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
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
                              <div key={i} className={`text-xs font-medium flex items-center justify-between ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
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
                          <div className={`text-xs font-medium flex items-center justify-between ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
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

                          <div className={`pt-2 border-t flex items-center justify-between font-black text-sm ${
                            isDark ? 'border-slate-800' : 'border-slate-200'
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

              {/* STEP 3: Review & Generate Docket (LR / Bilty) */}
              {bookingStep === 3 && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isDark 
                      ? 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-cyan-950/30 border-cyan-500/40' 
                      : 'bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 border-blue-200'
                  }`}>
                    <div className={`flex items-center justify-between pb-2 border-b ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        formData.docketNumberMode === 'manual'
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
                          {formData.consignorId && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
                              Registered
                            </span>
                          )}
                        </div>
                        {formData.consignorCity && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{formData.consignorCity} {formData.consignorPhone ? `• ${formData.consignorPhone}` : ''}</span>
                        )}
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Receiver:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.consigneeName || 'Universal Distributing Corp'}</span>
                          {formData.consigneeId && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
                              Registered
                            </span>
                          )}
                        </div>
                        {formData.consigneeCity && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{formData.consigneeCity} {formData.consigneePhone ? `• ${formData.consigneePhone}` : ''}</span>
                        )}
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Corridor Route:</span>
                        <span className={`font-bold ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>
                          {branchesList.find((b) => b.id === formData.originBranchId)?.branch_name || formData.originCity || 'Origin'} ➔ {branchesList.find((b) => b.id === formData.destBranchId)?.branch_name || formData.destinationCity || 'Destination'}
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Transport Mode:</span>
                        <span className={`font-bold inline-flex items-center gap-1.5 ${
                          formData.transportMode === 'AIR'
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
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Payment:</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.paymentMode}</span>
                      </div>
                    </div>

                    {/* Step 3 Live Itemized Charges Summary */}
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
                          <div className={`pt-2 border-t flex items-center justify-between font-mono font-black text-sm ${
                            isDark ? 'border-slate-800' : 'border-slate-200'
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
              <div className={`p-4 px-6 border-t flex items-center justify-between shrink-0 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {bookingStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setBookingStep(bookingStep - 1)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${
                      isDark 
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
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white' 
                        : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Cancel
                  </button>
                )}

                <div className="flex items-center gap-3">

                  {bookingStep < 3 ? (
                    <button
                      type="button"
                      disabled={!isCurrentStepValid}
                      onClick={() => {
                        if (!isCurrentStepValid) return;
                        setBookingStep(bookingStep + 1);
                      }}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isCurrentStepValid
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 cursor-pointer active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700/60 shadow-none cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>Next: {bookingStep === 1 ? 'Cargo & Rates' : 'Review & Confirm'}</span>
                      <span>➔</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading || !isStep1Valid || !isStep2Valid}
                      className={`px-6 py-2.5 rounded-xl text-white text-xs font-black shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center gap-1.5 ${
                        isLoading || !isStep1Valid || !isStep2Valid
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

          <div className={`relative w-full max-w-2xl max-h-[90vh] my-auto rounded-3xl shadow-2xl flex flex-col z-10 border overflow-hidden ${
            isDark ? 'bg-[#0A0E1A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-black text-base ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    {selectedConsignment.lr_number}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedConsignment.status === 'IN_TRANSIT'
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
                <button
                  onClick={() => handleOpenEdit(selectedConsignment)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/60 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                      : 'border-slate-200 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700'
                  }`}
                  title="Edit Docket"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenDelete(selectedConsignment)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/60 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                      : 'border-slate-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700'
                  }`}
                  title="Delete Docket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenPrintPreview(selectedConsignment)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                  title="Print Bilty"
                >
                  <Printer className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                </button>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isDark
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
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
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

                <div className={`flex items-center justify-between text-[10px] font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Origin: {selectedConsignment.origin_city}</span>
                  <span>ETA: {selectedConsignment.eta}</span>
                  <span>Dest: {selectedConsignment.destination_city}</span>
                </div>
              </div>

              {/* Shipper & Consignee Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>Shipper (From)</span>
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedConsignment.consignor.name}</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedConsignment.consignor.city}</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{selectedConsignment.consignor.segment}</div>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>Consignee (To)</span>
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedConsignment.consignee.name}</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedConsignment.consignee.city}</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{selectedConsignment.consignee.segment}</div>
                </div>
              </div>

              {/* Cargo & Line-haul Vehicle Info */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Line-haul Telemetry & Freight Details</div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Transport Mode:</span>
                    <span className={`font-bold inline-flex items-center gap-1.5 ${
                      selectedConsignment.transport_mode === 'AIR'
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
              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between font-semibold pb-1.5 border-b border-dashed border-slate-700/50">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Freight & Charges Breakdown</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-700'
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

                <div className={`pt-2 border-t flex items-center justify-between ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>Total Docket Freight:</span>
                  <span className={`font-mono font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ₹ {Number(selectedConsignment.total_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className={`p-4 px-6 border-t flex items-center justify-between shrink-0 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <Link
                href={`/track?lr=${selectedConsignment.lr_number}`}
                className={`text-xs font-bold hover:underline flex items-center gap-1 ${
                  isDark ? 'text-cyan-400' : 'text-blue-600'
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

          <div className={`relative w-full max-w-2xl max-h-[90vh] my-auto rounded-3xl border shadow-2xl overflow-hidden flex flex-col z-10 ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl border ${
                  isDark 
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
                className={`p-1.5 rounded-lg border transition-colors ${
                  isDark 
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
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Docket No. (LR / Bilty) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.docketNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, docketNumber: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Consignment Status *
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none transition-colors ${
                      isDark 
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
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Consignor (Shipper Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.consignorName}
                    onChange={(e) => setEditFormData({ ...editFormData, consignorName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Consignee Name */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Consignee (Receiver Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.consigneeName}
                    onChange={(e) => setEditFormData({ ...editFormData, consigneeName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Origin City */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Origin City *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.originCity}
                    onChange={(e) => setEditFormData({ ...editFormData, originCity: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Destination City */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Destination City *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.destinationCity}
                    onChange={(e) => setEditFormData({ ...editFormData, destinationCity: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Cargo Type */}
                <div className="space-y-1 col-span-2">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Material / Commodity Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.cargoType}
                    onChange={(e) => setEditFormData({ ...editFormData, cargoType: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Packages Count */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Packages Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editFormData.packagesCount}
                    onChange={(e) => setEditFormData({ ...editFormData, packagesCount: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Weight KG */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Charged Weight (KG) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editFormData.weightKg}
                    onChange={(e) => updateEditField('weightKg', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Rate per KG */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Rate / KG (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.ratePerKg}
                    onChange={(e) => updateEditField('ratePerKg', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/80 text-white focus:border-cyan-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Additional Charges & Surcharges Section in Edit Modal */}
                <div className={`col-span-2 p-3.5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Configure Docket Charges & Surcharges</span>
                    </span>
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
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                        isDark
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                          : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Other Charge</span>
                    </button>
                  </div>

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
                        value={editFormData.loadingCharges}
                        onChange={(e) => updateEditField('loadingCharges', e.target.value)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          isDark 
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
                        value={editFormData.unloadingCharges}
                        onChange={(e) => updateEditField('unloadingCharges', e.target.value)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          isDark 
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
                        value={editFormData.doorDeliveryCharges}
                        onChange={(e) => updateEditField('doorDeliveryCharges', e.target.value)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          isDark 
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
                        value={editFormData.otherCharges}
                        onChange={(e) => updateEditField('otherCharges', e.target.value)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          isDark 
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
                          className={`flex items-center gap-2 p-2 rounded-xl border ${
                            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex-1">
                            <input
                              type="text"
                              list={`edit-charge-suggestions-${index}`}
                              value={item.name}
                              placeholder="Charge Name (e.g. Toll / Demurrage)"
                              onChange={(e) => {
                                const updatedList = [...editFormData.customCharges];
                                updatedList[index] = { ...updatedList[index], name: e.target.value };
                                updateEditField('customCharges', updatedList, updatedList);
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                                isDark
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
                              value={item.amount}
                              placeholder="0"
                              onChange={(e) => {
                                const updatedList = [...editFormData.customCharges];
                                updatedList[index] = { ...updatedList[index], amount: e.target.value };
                                updateEditField('customCharges', updatedList, updatedList);
                              }}
                              className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                                isDark
                                  ? 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400'
                                  : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-500'
                              }`}
                            />
                          </div>
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
                        value={editFormData.discountAmount}
                        onChange={(e) => updateEditField('discountAmount', e.target.value)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          isDark 
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
                        value={editFormData.taxPercent}
                        onChange={(e) => updateEditField('taxPercent', e.target.value)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          isDark 
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
                    <label className={`text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      Total Docket Freight (₹) *
                    </label>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Auto-calculated from Basic + Charges - Discount + Tax (Editable)
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.totalAmount}
                    onChange={(e) => updateEditField('totalAmount', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono font-black focus:outline-none transition-colors ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900/90 text-cyan-300 focus:border-cyan-400' 
                        : 'border-blue-200 bg-blue-50/50 text-blue-700 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Payment Mode */}
                <div className="space-y-1 col-span-2">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Payment Term *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['PAID', 'TO_PAY', 'TBB'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, paymentMode: mode })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          editFormData.paymentMode === mode
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

                {/* Transport Mode */}
                <div className="space-y-1 col-span-2">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Mode of Transport *
                  </label>
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
                          onClick={() => setEditFormData({ ...editFormData, transportMode: m.id })}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            isSelected
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
              </div>

              </div>

              {/* Modal Footer */}
              <div className={`p-4 px-6 border-t flex items-center justify-end space-x-3 shrink-0 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    isDark 
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

          <div className={`relative w-full max-w-md my-auto rounded-3xl border shadow-2xl p-6 z-10 ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
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

            <div className={`mt-4 p-3.5 rounded-xl border text-xs space-y-1 ${
              isDark 
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
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${
                  isDark 
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
      {isPrintModalOpen && printConsignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4 bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center">
          {/* Print media CSS */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 6mm;
              }
              body * {
                visibility: hidden !important;
              }
              #bilty-slip-printable-area, #bilty-slip-printable-area * {
                visibility: visible !important;
              }
              #bilty-slip-printable-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
              }
              .bilty-page-break {
                page-break-after: always !important;
                break-after: page !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .bilty-slip-sheet {
                box-shadow: none !important;
                border: 2px solid #000 !important;
                margin: 0 0 10mm 0 !important;
                padding: 5mm !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          {/* Modal Container */}
          <div className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto z-10 transition-colors ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
          }`}>
            
            {/* Top Toolbar (Non-printable) */}
            <div className={`p-4 px-6 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">Consignment Note (Bilty / LR)</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/30">
                      {printConsignment.lr_number}
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Official 3-Part Transport Docket • {printConsignment.origin_city} ➔ {printConsignment.destination_city}
                  </p>
                </div>
              </div>

              {/* Copy Selector Pills */}
              <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setActivePrintCopy('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activePrintCopy === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Triplicate (All 3 Copies)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePrintCopy('CONSIGNOR')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activePrintCopy === 'CONSIGNOR'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Consignor Copy
                </button>
                <button
                  type="button"
                  onClick={() => setActivePrintCopy('CONSIGNEE')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activePrintCopy === 'CONSIGNEE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Consignee Copy
                </button>
                <button
                  type="button"
                  onClick={() => setActivePrintCopy('DRIVER')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activePrintCopy === 'DRIVER'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Driver / Transporter
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-2 transition-transform active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable Sheet Preview */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${
              isDark ? 'bg-slate-950/70' : 'bg-slate-200/60'
            }`}>
              <div id="bilty-slip-printable-area" className="w-full">
                {(activePrintCopy === 'ALL'
                  ? ['1. CONSIGNOR COPY (FOR SENDER)', '2. CONSIGNEE COPY (FOR RECEIVER)', '3. DRIVER / TRANSPORTER COPY (FOR RECORDS)']
                  : activePrintCopy === 'CONSIGNOR'
                  ? ['CONSIGNOR COPY (FOR SENDER)']
                  : activePrintCopy === 'CONSIGNEE'
                  ? ['CONSIGNEE COPY (FOR RECEIVER)']
                  : ['DRIVER / TRANSPORTER COPY (FOR RECORDS)']
                ).map((copyTitle, idx, arr) => (
                  <div key={copyTitle}>
                    {renderBiltySlipSheet(printConsignment, copyTitle)}
                    {idx < arr.length - 1 && (
                      <div className="bilty-page-break my-6 border-b-2 border-dashed border-slate-400 no-print" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Footer info bar */}
            <div className={`p-3 px-6 border-t flex items-center justify-between text-xs shrink-0 ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
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
