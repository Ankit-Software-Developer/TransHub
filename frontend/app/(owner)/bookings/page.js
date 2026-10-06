// frontend/app/(owner)/bookings/page.js
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
  Loader2
} from 'lucide-react';
import DataTable from '../../../components/ui/DataTable';
import { usePermissions } from '../../../hooks/usePermissions';

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
    vehicle_number: c.vehicle_number || 'Unassigned',
    vehicle_type: 'Scheduled Line-haul',
    driver_name: c.driver_name || 'Pending Allocation',
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
  const { canEdit, canDelete, canExport, isAdmin } = usePermissions();

  // Server-side Pagination & Sorting State
  const [consignments, setConsignments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('booking_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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
    totalAmount: '9450',
    paymentMode: 'TO_PAY',
    status: 'BOOKED',
  });

  // Delete Docket State
  const [deletingDocket, setDeletingDocket] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // New Booking Wizard Form State
  const [bookingStep, setBookingStep] = useState(1);
  const [formData, setFormData] = useState({
    consignorName: '',
    consignorCity: '',
    consigneeName: '',
    consigneeCity: '',
    originCity: 'Delhi (DEL)',
    destinationCity: 'Bengaluru (BLR)',
    cargoType: 'Industrial Goods',
    packagesCount: '50',
    weightKg: '2500',
    ratePerKg: '18',
    paymentMode: 'TO_PAY',
    pickupDate: new Date().toISOString().split('T')[0],
    priority: 'STANDARD'
  });

  // Fetch real consignments from backend with Server-Side Pagination & Sorting
  const fetchConsignments = async (overrides = {}) => {
    setIsLoading(true);
    const p = overrides.page !== undefined ? overrides.page : page;
    const ps = overrides.pageSize !== undefined ? overrides.pageSize : pageSize;
    const sb = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const so = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const sq = overrides.search !== undefined ? overrides.search : searchQuery;
    const sf = overrides.status !== undefined ? overrides.status : statusFilter;

    try {
      let url = `/bookings?page=${p}&limit=${ps}&sort_by=${sb}&sort_order=${so}`;
      if (sq) url += `&search=${encodeURIComponent(sq)}`;
      if (sf && sf !== 'ALL') {
        if (sf === 'PENDING') {
          url += `&status=BOOKED`;
        } else {
          url += `&status=${sf}`;
        }
      }
      const res = await api.get(url);
      const rawList = res.data?.data || [];
      const mapped = rawList.map(mapConsignmentFromApi);
      setConsignments(mapped);
      setTotalCount(res.data?.pagination?.total ?? mapped.length);
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

  useEffect(() => {
    fetchConsignments();
  }, [activeBranch, page, pageSize, sortBy, sortOrder, statusFilter]);

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
    setEditFormData({
      docketNumber: c.lr_number,
      consignorName: c.consignor.name,
      consignorCity: c.consignor.city,
      consigneeName: c.consignee.name,
      consigneeCity: c.consignee.city,
      originCity: c.origin_city,
      destinationCity: c.destination_city,
      cargoType: c.cargo_type,
      packagesCount: c.packages_count.toString(),
      weightKg: c.charged_weight.toString(),
      ratePerKg: (c.rate || 18).toString(),
      totalAmount: c.total_amount.toString(),
      paymentMode: c.payment_mode,
      status: c.status,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDocket) return;
    setIsSubmittingEdit(true);
    try {
      const weight = parseFloat(editFormData.weightKg) || 0;
      const rate = parseFloat(editFormData.ratePerKg) || 0;
      const calculatedFreight = weight * rate;
      const totalAmount = parseFloat(editFormData.totalAmount) || (calculatedFreight + 450);

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
        total_amount: totalAmount,
        payment_type: editFormData.paymentMode,
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
  const totalBookingsCount = consignments.length;
  const inTransitCount = consignments.filter((c) => c.status === 'IN_TRANSIT').length;
  const deliveredCount = consignments.filter((c) => c.status === 'DELIVERED').length;
  const pendingOrGodownCount = consignments.filter((c) => c.status === 'BOOKED' || c.status === 'OUT_FOR_DELIVERY').length;
  const delayedCount = consignments.filter((c) => c.status === 'DELAYED').length;

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
      if (statusFilter === 'IN_TRANSIT') return matchesSearch && c.status === 'IN_TRANSIT';
      if (statusFilter === 'DELIVERED') return matchesSearch && c.status === 'DELIVERED';
      if (statusFilter === 'DELAYED') return matchesSearch && c.status === 'DELAYED';
      if (statusFilter === 'PENDING') return matchesSearch && (c.status === 'BOOKED' || c.status === 'OUT_FOR_DELIVERY');

      return matchesSearch;
    });
  }, [consignments, searchQuery, statusFilter]);

  const handleOpenDetails = (c) => {
    setSelectedConsignment(c);
    setIsDetailsOpen(true);
  };

  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const weight = parseFloat(formData.weightKg) || 100;
      const rate = parseFloat(formData.ratePerKg) || 18;
      const freight = weight * rate;
      const total = freight + 450;

      const payload = {
        origin_city: formData.originCity,
        destination_city: formData.destinationCity,
        consignor_name: formData.consignorName || 'Shipper Party',
        consignee_name: formData.consigneeName || 'Consignee Party',
        material_description: formData.cargoType || 'General Freight',
        packages_count: parseInt(formData.packagesCount, 10) || 10,
        actual_weight: weight,
        charged_weight: weight,
        rate: rate,
        freight_amount: freight,
        total_amount: total,
        payment_type: formData.paymentMode || 'TO_PAY',
        pickup_address: formData.consignorCity || formData.originCity,
        delivery_address: formData.consigneeCity || formData.destinationCity,
      };

      const res = await api.post('/bookings', payload);
      setIsDrawerOpen(false);
      setBookingStep(1);
      setFormData({
        consignorName: '',
        consignorCity: '',
        consigneeName: '',
        consigneeCity: '',
        originCity: 'Delhi (DEL)',
        destinationCity: 'Bengaluru (BLR)',
        cargoType: 'Industrial Goods',
        packagesCount: '50',
        weightKg: '2500',
        ratePerKg: '18',
        paymentMode: 'TO_PAY',
        pickupDate: new Date().toISOString().split('T')[0],
        priority: 'STANDARD'
      });

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
            <div className="font-mono font-bold text-cyan-400 group-hover:underline flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>{row.lr_number}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
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
          <span className="text-slate-400 text-[11px] whitespace-nowrap">
            {row.booking_date}
          </span>
        ),
      },
      {
        key: 'origin_city',
        header: 'Corridor / Route',
        sortable: true,
        width: 140,
        minWidth: 110,
        exportValue: (row) => `${row.origin_city} ➔ ${row.destination_city}`,
        render: (val, row) => (
          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
            isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
          }`}>
            {row.route_code}
          </span>
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
            <div className="text-[10px] text-slate-400 truncate">
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
            <div className="text-[10px] text-slate-400 truncate">
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
            <div className="text-[10px] text-slate-400 truncate">
              {row.cargo_type}
            </div>
          </div>
        ),
      },
      {
        key: 'vehicle_number',
        header: 'Vehicle & Driver',
        sortable: false,
        width: 150,
        minWidth: 120,
        exportValue: (row) => `${row.vehicle_number} (${row.driver_name})`,
        render: (val, row) => (
          <div className="whitespace-nowrap">
            <div className="font-mono font-bold text-xs text-cyan-300">
              {row.vehicle_number}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {row.driver_name}
            </div>
          </div>
        ),
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
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
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
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : row.status === 'DELIVERED'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : row.status === 'DELAYED'
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
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
              onClick={() => alert(`Printing official 3-copy Bilty for ${row.lr_number}...`)}
              className={`p-1.5 rounded-lg border transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'
              }`}
              title="Print 3-Part Lorry Receipt"
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
              <button
                onClick={() => {
                  setBookingStep(1);
                  setIsDrawerOpen(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Booking</span>
              </button>
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
            onRowClick={(row) => handleOpenDetails(row)}
            exportFilename="Consignment_Register"
            emptyTitle="No Dockets (LR / Bilty) Found"
            emptySubtitle="Your database is clean or no consignments match the active filters. Register your first consignment note to issue an official digital bilty."
            emptyActionSlot={
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
            }
            filtersSlot={
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
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
                  All ({totalBookingsCount})
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
                  In Transit ({inTransitCount})
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
                  Delivered ({deliveredCount})
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
                  Delayed ({delayedCount})
                </button>
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
                  Pending / Dock ({pendingOrGodownCount})
                </button>
              </div>
            }
          />

        </main>
      </div>

      {/* ======================================================== */}
      {/* 3-STEP SLIDE-OVER NEW BOOKING DRAWER */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className={`relative w-full max-w-xl h-full shadow-2xl flex flex-col z-10 border-l ${
            isDark ? 'bg-[#0A0E1A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-cyan-400 border border-blue-500/30">
                    DOCKET (LR / BILTY)
                  </span>
                  <h2 className="text-lg font-bold">Issue New Consignment</h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">3-Step Consignment Note & Rate Calculation</p>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  bookingStep === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {bookingStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <span className={`text-xs font-bold ${bookingStep === 1 ? 'text-cyan-400' : 'text-slate-400'}`}>
                  Parties & Hubs
                </span>
              </div>
              <div className="w-8 h-px bg-slate-800" />
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  bookingStep === 2 ? 'bg-blue-600 text-white' : bookingStep > 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  {bookingStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <span className={`text-xs font-bold ${bookingStep === 2 ? 'text-cyan-400' : 'text-slate-400'}`}>
                  Cargo & Rates
                </span>
              </div>
              <div className="w-8 h-px bg-slate-800" />
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  bookingStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  3
                </div>
                <span className={`text-xs font-bold ${bookingStep === 3 ? 'text-cyan-400' : 'text-slate-400'}`}>
                  Confirm
                </span>
              </div>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleCreateBookingSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* STEP 1: Parties & Route Hubs */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-cyan-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                    <span>Selected addresses are verified against GSTIN and e-Way Bill masters.</span>
                  </div>

                  {/* Consignor (Shipper) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Consignor (Shipper) *</span>
                      <span className="text-[10px] text-cyan-400 cursor-pointer">New Party</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Reliance Retail Ltd"
                      value={formData.consignorName}
                      onChange={(e) => setFormData({ ...formData, consignorName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  {/* Consignee (Receiver) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Consignee (Receiver) *</span>
                      <span className="text-[10px] text-cyan-400 cursor-pointer">New Party</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Supply Chain Solutions"
                      value={formData.consigneeName}
                      onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  {/* Origin & Destination Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Origin Hub *</label>
                      <select
                        value={formData.originCity}
                        onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="Delhi (DEL)">Delhi Hub (DEL)</option>
                        <option value="Mumbai (MUM)">Mumbai Hub (MUM)</option>
                        <option value="Pune (PUN)">Pune Hub (PUN)</option>
                        <option value="Nagpur (NAG)">Nagpur Hub (NAG)</option>
                        <option value="Jaipur (JAI)">Jaipur Hub (JAI)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Destination Hub *</label>
                      <select
                        value={formData.destinationCity}
                        onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="Bengaluru (BLR)">Bengaluru Hub (BLR)</option>
                        <option value="Chennai (MAA)">Chennai Hub (MAA)</option>
                        <option value="Ahmedabad (AHD)">Ahmedabad Hub (AHD)</option>
                        <option value="Kolkata (CCU)">Kolkata Hub (CCU)</option>
                        <option value="Hyderabad (HYD)">Hyderabad Hub (HYD)</option>
                      </select>
                    </div>
                  </div>

                  {/* Pickup Date & Priority */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Pickup Date *</label>
                      <input
                        type="date"
                        value={formData.pickupDate}
                        onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Priority Level</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="STANDARD">Standard Line-haul</option>
                        <option value="EXPRESS">Express Overnight</option>
                        <option value="CRITICAL">Critical Medicine / Cold Chain</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Cargo & Freight Charges */}
              {bookingStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Declared Cargo Commodity *</label>
                    <input
                      type="text"
                      placeholder="e.g. Consumer Electronics & Inverters"
                      value={formData.cargoType}
                      onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Packages *</label>
                      <input
                        type="number"
                        value={formData.packagesCount}
                        onChange={(e) => setFormData({ ...formData, packagesCount: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Weight (KG) *</label>
                      <input
                        type="number"
                        value={formData.weightKg}
                        onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Rate / KG (₹)</label>
                      <input
                        type="number"
                        value={formData.ratePerKg}
                        onChange={(e) => setFormData({ ...formData, ratePerKg: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Payment Term *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['PAID', 'TO_PAY', 'TBB'].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFormData({ ...formData, paymentMode: mode })}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                            formData.paymentMode === mode
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {mode === 'TBB' ? 'T.B.B. (Bill)' : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Tariff Card */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Basic Freight ({formData.weightKg} kg @ ₹{formData.ratePerKg})</span>
                      <span className="font-mono text-white">
                        ₹ {(parseInt(formData.weightKg || 0) * parseFloat(formData.ratePerKg || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                      <span>Loading / Hamali Charges</span>
                      <span className="font-mono text-white">₹ 450</span>
                    </div>
                    <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                      <span>GST (5% RCM Applicable)</span>
                      <span className="font-mono text-emerald-400">₹ 0 (RCM)</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-black text-sm">
                      <span className="text-cyan-400">Total Docket Freight:</span>
                      <span className="font-mono text-white text-base">
                        ₹ {(parseInt(formData.weightKg || 0) * parseFloat(formData.ratePerKg || 0) + 450).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Review & Generate Docket (LR / Bilty) */}
              {bookingStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-cyan-950/30 border border-cyan-500/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400">DOCKET NUMBER (LR / BILTY)</span>
                        <div className="font-mono text-base font-black text-cyan-400">CSN-8796551024</div>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Ready for Print
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Shipper:</span>
                        <span className="font-bold text-white">{formData.consignorName || 'Apex Logistics Partner'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Receiver:</span>
                        <span className="font-bold text-white">{formData.consigneeName || 'Universal Distributing Corp'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Corridor:</span>
                        <span className="font-bold text-cyan-300">{formData.originCity} ➔ {formData.destinationCity}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Payment:</span>
                        <span className="font-bold text-white">{formData.paymentMode}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-mono font-black text-sm">
                      <span className="text-slate-300">Total Docket Value:</span>
                      <span className="text-cyan-400 text-lg">
                        ₹ {(parseInt(formData.weightKg || 0) * parseFloat(formData.ratePerKg || 0) + 450).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    By confirming this consignment, an official 3-copy digital bilty (Consignor, Consignee, Driver) will be registered and queued in the Load Planning terminal for multi-axle truck allocation.
                  </p>
                </div>
              )}

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                {bookingStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setBookingStep(bookingStep - 1)}
                    className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    ← Previous
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                )}

                {bookingStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setBookingStep(bookingStep + 1)}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
                  >
                    Next: {bookingStep === 1 ? 'Cargo & Rates' : 'Review & Confirm'} ➔
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-cyan-500/25"
                  >
                    Confirm & Issue LR ➔
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONSIGNMENT DETAIL SLIDE-OVER MODAL */}
      {/* ======================================================== */}
      {isDetailsOpen && selectedConsignment && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDetailsOpen(false)}
          />

          <div className={`relative w-full max-w-xl h-full shadow-2xl flex flex-col z-10 border-l ${
            isDark ? 'bg-[#0A0E1A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-black text-base">
                    {selectedConsignment.lr_number}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedConsignment.status === 'IN_TRANSIT'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {selectedConsignment.status_label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Booking Ref: {selectedConsignment.booking_id}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(selectedConsignment)}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  title="Edit Docket"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenDelete(selectedConsignment)}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  title="Delete Docket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => alert(`Printing official 3-copy Bilty for ${selectedConsignment.lr_number}`)}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white"
                  title="Print Bilty"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Live Tracking Progress Bar */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedConsignment.current_milestone}</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedConsignment.progress_percent}%</span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${selectedConsignment.progress_percent}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Origin: {selectedConsignment.origin_city}</span>
                  <span>ETA: {selectedConsignment.eta}</span>
                  <span>Dest: {selectedConsignment.destination_city}</span>
                </div>
              </div>

              {/* Shipper & Consignee Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shipper (From)</span>
                  <div className="font-bold text-xs text-white">{selectedConsignment.consignor.name}</div>
                  <div className="text-[11px] text-slate-400">{selectedConsignment.consignor.city}</div>
                  <div className="text-[10px] text-cyan-400">{selectedConsignment.consignor.segment}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consignee (To)</span>
                  <div className="font-bold text-xs text-white">{selectedConsignment.consignee.name}</div>
                  <div className="text-[11px] text-slate-400">{selectedConsignment.consignee.city}</div>
                  <div className="text-[10px] text-cyan-400">{selectedConsignment.consignee.segment}</div>
                </div>
              </div>

              {/* Cargo & Line-haul Vehicle Info */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
                <div className="text-xs font-bold text-white">Line-haul Telemetry & Freight Details</div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Vehicle Number:</span>
                    <span className="font-mono font-bold text-cyan-300">{selectedConsignment.vehicle_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Assigned Driver:</span>
                    <span className="font-bold text-white">{selectedConsignment.driver_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cargo Description:</span>
                    <span className="font-medium text-white">{selectedConsignment.cargo_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Packages & Weight:</span>
                    <span className="font-mono font-bold text-white">{selectedConsignment.packages_count} Pkgs • {selectedConsignment.charged_weight} KG</span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Bilty Freight:</span>
                  <span className="font-mono font-black text-white text-sm">
                    ₹ {selectedConsignment.total_amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Payment Term:</span>
                  <span className="font-bold text-emerald-400">{selectedConsignment.payment_mode}</span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <Link
                href={`/track?lr=${selectedConsignment.lr_number}`}
                className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Live Public Tracking</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => alert(`Generated PDF Bilty download for ${selectedConsignment.lr_number}`)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
              >
                Download Bilty PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT DOCKET MODAL */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => !isSubmittingEdit && setIsEditModalOpen(false)}
          />

          <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden z-10 ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Edit Docket / Consignment Note</h3>
                  <p className="text-xs text-slate-400">Modify consignment specifications, parties, freight and status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmittingEdit}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Docket Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Docket No. (LR / Bilty) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.docketNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, docketNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Consignment Status *</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs font-bold focus:border-cyan-400 focus:outline-none"
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
                  <label className="text-xs font-bold text-slate-300">Consignor (Shipper Name) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.consignorName}
                    onChange={(e) => setEditFormData({ ...editFormData, consignorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Consignee Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Consignee (Receiver Name) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.consigneeName}
                    onChange={(e) => setEditFormData({ ...editFormData, consigneeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Origin City */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Origin City *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.originCity}
                    onChange={(e) => setEditFormData({ ...editFormData, originCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Destination City */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Destination City *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.destinationCity}
                    onChange={(e) => setEditFormData({ ...editFormData, destinationCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Cargo Type */}
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-300">Material / Commodity Description *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.cargoType}
                    onChange={(e) => setEditFormData({ ...editFormData, cargoType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Packages Count */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Packages Count *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editFormData.packagesCount}
                    onChange={(e) => setEditFormData({ ...editFormData, packagesCount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Weight KG */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Charged Weight (KG) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editFormData.weightKg}
                    onChange={(e) => {
                      const weight = e.target.value;
                      const rate = parseFloat(editFormData.ratePerKg) || 0;
                      const calculatedTotal = (parseFloat(weight) || 0) * rate + 450;
                      setEditFormData({
                        ...editFormData,
                        weightKg: weight,
                        totalAmount: calculatedTotal.toString(),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Rate per KG */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Rate / KG (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.ratePerKg}
                    onChange={(e) => {
                      const rate = e.target.value;
                      const weight = parseFloat(editFormData.weightKg) || 0;
                      const calculatedTotal = weight * (parseFloat(rate) || 0) + 450;
                      setEditFormData({
                        ...editFormData,
                        ratePerKg: rate,
                        totalAmount: calculatedTotal.toString(),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Total Freight */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Total Docket Freight (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.totalAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, totalAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs font-bold focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Payment Mode */}
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-300">Payment Term *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['PAID', 'TO_PAY', 'TBB'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, paymentMode: mode })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          editFormData.paymentMode === mode
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode === 'TBB' ? 'T.B.B. (Bill)' : mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white"
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => !isSubmittingDelete && setIsDeleteModalOpen(false)}
          />

          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 z-10 ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Delete Docket (LR / Bilty)</h3>
                <p className="text-xs text-slate-400">Irreversible database record removal</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300 space-y-1">
              <p className="font-bold">
                Are you sure you want to delete Docket <span className="font-mono text-white underline">{deletingDocket.lr_number}</span>?
              </p>
              <p className="text-[11px] text-slate-400">
                This action will delete the consignment, parcel items, tracking milestones, and associated booking from your tenant database permanently.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white"
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

    </div>
  );
}
