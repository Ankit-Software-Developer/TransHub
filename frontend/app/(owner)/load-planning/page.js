// frontend/app/(owner)/load-planning/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import { useOperationsType } from '../../../hooks/useOperationsType';
import { useStore } from '../../../store/useStore';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';
import api from '../../../services/api';
import { TRUCK_CONFIGS, getTruckConfigForVehicle } from '../../../components/loadPlanning/packingEngine';

const Truck3DViewer = dynamic(() => import('../../../components/loadPlanning/Truck3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[440px] flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#070B14] text-cyan-400">
      <div className="w-9 h-9 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-bold tracking-wider uppercase">Loading 3D Truck Simulation Engine...</span>
    </div>
  ),
});
import {
  Boxes,
  Truck,
  Layers,
  ArrowRight,
  Package,
  Weight,
  Maximize2,
  CheckCircle2,
  CheckCircle,
  Clock,
  Send,
  SlidersHorizontal,
  Plus,
  PlusCircle,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  Zap,
  RotateCw,
  Building2,
  UserCheck,
  ShieldCheck,
  Key,
  X,
  Check,
  ExternalLink,
  ChevronDown,
  Search,
  User,
  Phone,
  Sparkles,
  Info,
  MapPin,
  Calendar,
  FileText,
  CheckCheck,
  Lock,
} from 'lucide-react';

const PALETTE = [
  '#00F0FF',
  '#38BDF8',
  '#34D399',
  '#A78BFA',
  '#FBBF24',
  '#F472B6',
  '#4ADE80',
  '#818CF8',
  '#FB923C',
  '#2DD4BF',
];

export default function LoadPlanningPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const user = useStore((state) => state.user);
  const activeBranch = useStore((state) => state.activeBranch);
  const { isAdmin, isBranchManager, canCreateDispatch } = usePermissions();
  const { isOnlyFTL, isOnlyPTL, isBoth } = useOperationsType();

  // Branch Manager Scope Identification
  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || user?.assigned_branch_id || null;

  const isRestrictedBranchUser = useMemo(() => {
    if (!user) return false;
    if (isBranchManager) return true;
    const r = (user.role || '').toUpperCase();
    if (r === 'BRANCH_MANAGER' || r === 'HUB_MANAGER') return true;
    if (Array.isArray(user.roles) && user.roles.some((role) => {
      const name = typeof role === 'string' ? role : role?.name || '';
      return name.toUpperCase() === 'BRANCH_MANAGER' || name.toUpperCase() === 'HUB_MANAGER';
    })) return true;
    if (user?.designation?.toLowerCase().includes('branch')) return true;
    if (!isAdmin && userBranchId) return true;
    return false;
  }, [user, isBranchManager, isAdmin, userBranchId]);

  // Core Data State
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return (isRestrictedBranchUser && userBranchId) ? userBranchId : 'ALL';
  });
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stagedConsignments, setStagedConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingConsignments, setLoadingConsignments] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [dispatchedIds, setDispatchedIds] = useState(new Set());

  // Resolved user login branch or primary hub
  const loginBranchId = useMemo(() => {
    if (userBranchId) return userBranchId;
    if (activeBranch?.id && activeBranch.id !== 'ALL') return activeBranch.id;
    if (user?.branchName && branches.length > 0) {
      const match = branches.find((b) => b.branch_name?.toLowerCase() === user.branchName?.toLowerCase());
      if (match) return match.id;
    }
    const hub = branches.find((b) => b.is_hub);
    if (hub) return hub.id;
    return branches[0]?.id || null;
  }, [userBranchId, activeBranch, user?.branchName, branches]);

  // User's assigned branch fallback object
  const userAssignedBranch = useMemo(() => {
    if (!userBranchId) return null;
    return branches.find((b) => b.id === userBranchId) || {
      id: userBranchId,
      branch_name: user?.branchName || 'Assigned Branch',
      city: user?.branchCode || '',
    };
  }, [branches, userBranchId, user]);

  // Selectable Branches: Branch Manager ONLY sees their assigned branch
  const selectableBranches = useMemo(() => {
    if (isRestrictedBranchUser && userBranchId) {
      const match = branches.filter((b) => b.id === userBranchId);
      if (match.length > 0) return match;
      if (userAssignedBranch) return [userAssignedBranch];
    }
    return branches;
  }, [branches, isRestrictedBranchUser, userBranchId, userAssignedBranch]);

  // Selected Truck & Configuration
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedFeet, setSelectedFeet] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [modalOriginBranchId, setModalOriginBranchId] = useState('');

  // Truck Search & Dropdown State
  const [truckSearchQuery, setTruckSearchQuery] = useState('');
  const [truckDropdownOpen, setTruckDropdownOpen] = useState(false);
  const [overrideDriverSelection, setOverrideDriverSelection] = useState(false);

  // Market Hired Truck Modal State
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const [marketForm, setMarketForm] = useState({
    vehicle_number: '',
    truck_size_feet: '19',
    capacity_ton: '9.5',
    ownership: 'MARKET',
    driver_name: '',
    driver_phone: '',
    driver_license: '',
    owner_name: '',
    owner_phone: '',
    current_odometer: '',
    vehicle_charge: '',
  });
  const [submittingMarket, setSubmittingMarket] = useState(false);
  const [marketError, setMarketError] = useState('');

  // Quick Driver Add Modal State
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    license_number: '',
  });
  const [submittingDriver, setSubmittingDriver] = useState(false);
  const [driverError, setDriverError] = useState('');
  // Operation Mode: PTL (Consolidated Sundry Truck) vs FTL (Dedicated Direct Full Truck Load)
  const [operationMode, setOperationMode] = useState(() => (isOnlyFTL ? 'FTL' : 'PTL'));

  // Sync operationMode if transporter company type loads or updates asynchronously
  useEffect(() => {
    if (isOnlyFTL) {
      setOperationMode('FTL');
    } else if (isOnlyPTL) {
      setOperationMode('PTL');
    }
  }, [isOnlyFTL, isOnlyPTL]);
  const [selectedFtlDocketId, setSelectedFtlDocketId] = useState(null);
  const [ftlSearchFilter, setFtlSearchFilter] = useState('');

  // Staged Item Selection State: Set of consignment IDs currently loaded into the truck
  const [loadedIds, setLoadedIds] = useState(new Set());

  // Dispatch Confirmation Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [startOdometer, setStartOdometer] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [dispatchRemarks, setDispatchRemarks] = useState('');
  const [driverAdvance, setDriverAdvance] = useState('');
  const [advanceMode, setAdvanceMode] = useState('');
  const [dispatchVehicleCharge, setDispatchVehicleCharge] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [successCountdown, setSuccessCountdown] = useState(10);

  const handleCloseSuccessModal = useCallback(() => {
    setSuccessResult(null);
    setSuccessCountdown(10);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setSelectedFeet(null);
    setTruckSearchQuery('');
    setTruckDropdownOpen(false);
    setOverrideDriverSelection(false);
  }, []);

  // Automatically close success modal after 10 seconds
  useEffect(() => {
    if (!successResult) return;
    setSuccessCountdown(10);

    const timer = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCloseSuccessModal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [successResult, handleCloseSuccessModal]);

  const [hoveredConsignmentId, setHoveredConsignmentId] = useState(null);

  // 1. Initial Load: Fetch Branches, Vehicles, Drivers
  useEffect(() => {
    let isMounted = true;
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [branchesRes, vehiclesRes, driversRes] = await Promise.all([
          api.get('/branches').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/drivers').catch(() => ({ data: { data: [] } })),
        ]);

        if (!isMounted) return;

        const branchList = branchesRes.data?.data?.branches || branchesRes.data?.data || [];
        const vehicleList = vehiclesRes.data?.data || [];
        const driverList = driversRes.data?.data || [];

        setBranches(Array.isArray(branchList) ? branchList : []);
        setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
        setDrivers(Array.isArray(driverList) ? driverList : []);

        // Resolve default login branch or hub for origin
        const initialLoginOrigin = (isRestrictedBranchUser && userBranchId)
          ? userBranchId
          : (user?.branchId || user?.branch_id || (activeBranch?.id && activeBranch.id !== 'ALL' ? activeBranch.id : null) || branchList.find((b) => b.is_hub)?.id || branchList[0]?.id || '');

        // Default Branch Selection: Branch Managers always default to their own branch
        if (isRestrictedBranchUser && userBranchId) {
          setSelectedBranchId(userBranchId);
        } else {
          setSelectedBranchId('ALL');
        }

        // Origin Departure Hub is automatically selected according to login branch or hub
        if (initialLoginOrigin) {
          setModalOriginBranchId(initialLoginOrigin);
        }

        // Destination Hub: Do NOT select by default - user must select explicitly
        setDestBranchId('');

        // Pick initial vehicle
        let allowedVehicles = Array.isArray(vehicleList) ? vehicleList : [];
        if (isRestrictedBranchUser && userBranchId) {
          const branchVehicles = allowedVehicles.filter((v) => !v.branch_id || v.branch_id === userBranchId);
          if (branchVehicles.length > 0) allowedVehicles = branchVehicles;
        }

        // Keep vehicle and driver unselected so load planning starts fresh
        setSelectedVehicleId('');
        setSelectedDriverId('');
        setSelectedFeet(null);
        setStartOdometer('');
      } catch (err) {
        console.error('Failed to load load planning master data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMasterData();
    return () => { isMounted = false; };
  }, [user, isRestrictedBranchUser, userBranchId]);

  // 2. Fetch Staged Consignments whenever selectedBranchId changes
  const fetchStagedConsignments = useCallback(async () => {
    setLoadingConsignments(true);
    try {
      const effectiveBranchId = (isRestrictedBranchUser && userBranchId)
        ? userBranchId
        : selectedBranchId;

      const params = {
        limit: 150,
        load_planning: true,
      };
      if (effectiveBranchId && effectiveBranchId !== 'ALL') {
        params.branch_id = effectiveBranchId;
      }

      // Query bookings ready for load planning
      const res = await api.get('/bookings', { params });

      const rawList = res.data?.data || [];
      const formatted = (Array.isArray(rawList) ? rawList : [])
        .filter((c) => {
          const s = (c.status || 'BOOKED').toUpperCase();
          const isExcluded = [
            'LOADED',
            'DISPATCHED',
            'IN_TRANSIT',
            'ON_TRIP',
            'REACHED_DESTINATION',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'POD_PENDING',
            'POD_UPLOADED',
            'COMPLETED',
            'CANCELLED',
            'REJECTED',
            'RETURNED'
          ].includes(s);
          if (isExcluded || dispatchedIds.has(c.id)) return false;

          // For branch / hub manager, allow local origin bookings OR cargo received at this hub for transshipment
          if (isRestrictedBranchUser && userBranchId) {
            const isLocalOrigin = String(c.origin_branch_id) === String(userBranchId);
            const isLocalHubHolding = String(c.current_branch_id) === String(userBranchId) && s === 'RECEIVED_AT_HUB';
            if (!isLocalOrigin && !isLocalHubHolding) return false;

            // Never re-plan cargo if this branch is its final destination
            if (c.dest_branch_id && String(c.dest_branch_id) === String(userBranchId)) return false;
          }
          return true;
        })
        .map((c, index) => {
          const weightKg = parseFloat(c.actual_weight || c.charged_weight || 0);
          const weightTons = weightKg > 0 ? parseFloat((weightKg / 1000).toFixed(2)) : 0.5;
          // Estimate volume from packages or weight: approx 1 Ton ~= 2.5 m3
          const volumeM3 = parseFloat((weightTons * 2.5).toFixed(1)) || 1.2;
          const s = (c.status || 'BOOKED').toUpperCase();
          const isTransshipment = s === 'RECEIVED_AT_HUB' || (c.origin_branch_id && userBranchId && String(c.origin_branch_id) !== String(userBranchId));

          return {
            id: c.id,
            docket_number: c.docket_number || c.lr_number || `LR-${c.id.slice(0, 6)}`,
            shipper: c.consignor?.name || c.consignor_name || 'Consignor Shipper',
            receiver: c.consignee?.name || c.consignee_name || 'Consignee Receiver',
            origin: c.originBranch?.branch_name || c.origin_city || 'Origin Hub',
            origin_city: c.origin_city || c.originBranch?.city || '',
            origin_branch_id: c.origin_branch_id,
            destination: c.destBranch?.branch_name || c.destination_city || 'Destination Hub',
            destination_city: c.destination_city || c.destBranch?.city || '',
            destination_branch_id: c.dest_branch_id,
            items: c.material_description || 'General Merchandise',
            packages: parseInt(c.packages_count || 1, 10),
            weight_t: weightTons,
            weight_kg: weightKg,
            volume_m3: volumeM3,
            amount: parseFloat(c.total_amount || 0),
            priority: c.delivery_type === 'DOOR_DELIVERY' ? 'EXPRESS' : (index % 3 === 0 ? 'PRIORITY' : 'STANDARD'),
            color: PALETTE[index % PALETTE.length],
            status: s,
            is_transshipment: isTransshipment,
            load_type: (c.load_type || 'PTL').toUpperCase(),
            vehicle_type: c.vehicle_type || '',
            truck_type: c.truck_type || '',
            delivery_type: c.delivery_type || '',
            consignor_phone: c.consignor_phone || c.consignor?.phone || '',
            consignee_phone: c.consignee_phone || c.consignee?.phone || '',
            pickup_address: c.pickup_address || '',
            delivery_address: c.delivery_address || '',
            invoice_no: c.invoice_no || '',
            eway_bill_no: c.eway_bill_no || '',
            booking_date: c.booking_date || c.createdAt || '',
            payment_type: c.payment_type || 'TO_PAY',
            raw: c,
          };
        });

      setStagedConsignments(formatted);

      // By default start with NO builty selected (empty Set like FTL)
      setLoadedIds(new Set());
    } catch (err) {
      console.error('Failed to fetch staged consignments', err);
      setStagedConsignments([]);
    } finally {
      setLoadingConsignments(false);
    }
  }, [selectedBranchId, dispatchedIds, isRestrictedBranchUser, userBranchId]);

  useEffect(() => {
    fetchStagedConsignments();
  }, [fetchStagedConsignments]);

  // Consignments split by mode: PTL (Part Truck Load) vs FTL (Full Truck Load)
  const ptlConsignments = useMemo(() => {
    return stagedConsignments.filter((c) => (c.load_type || 'PTL').toUpperCase() !== 'FTL');
  }, [stagedConsignments]);

  const ftlConsignments = useMemo(() => {
    return stagedConsignments.filter((c) => (c.load_type || '').toUpperCase() === 'FTL');
  }, [stagedConsignments]);

  const selectedFtlDocket = useMemo(() => {
    if (!selectedFtlDocketId) return null;
    return ftlConsignments.find((c) => c.id === selectedFtlDocketId) || null;
  }, [ftlConsignments, selectedFtlDocketId]);

  const filteredFtlConsignments = useMemo(() => {
    if (!ftlSearchFilter.trim()) return ftlConsignments;
    const q = ftlSearchFilter.toLowerCase();
    return ftlConsignments.filter((c) => {
      return (
        c.docket_number.toLowerCase().includes(q) ||
        c.shipper.toLowerCase().includes(q) ||
        c.receiver.toLowerCase().includes(q) ||
        (c.origin_city && c.origin_city.toLowerCase().includes(q)) ||
        (c.destination_city && c.destination_city.toLowerCase().includes(q)) ||
        (c.items && c.items.toLowerCase().includes(q))
      );
    });
  }, [ftlConsignments, ftlSearchFilter]);

  // Filtered PTL consignments for table search
  const filteredConsignments = useMemo(() => {
    if (!searchFilter.trim()) return ptlConsignments;
    const q = searchFilter.toLowerCase();
    return ptlConsignments.filter((c) => {
      return (
        c.docket_number.toLowerCase().includes(q) ||
        c.shipper.toLowerCase().includes(q) ||
        c.receiver.toLowerCase().includes(q) ||
        (c.origin_city && c.origin_city.toLowerCase().includes(q)) ||
        (c.destination_city && c.destination_city.toLowerCase().includes(q))
      );
    });
  }, [ptlConsignments, searchFilter]);

  const toggleSelectAll = () => {
    if (loadedIds.size === filteredConsignments.length && filteredConsignments.length > 0) {
      setLoadedIds(new Set());
    } else {
      const next = new Set();
      filteredConsignments.forEach((c) => next.add(c.id));
      setLoadedIds(next);
    }
  };

  // Active Vehicle & Calculations
  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  const assignedDriver = useMemo(() => {
    if (!currentVehicle) return null;
    if (currentVehicle.assignedDriver) return currentVehicle.assignedDriver;
    if (currentVehicle.assigned_driver_id) {
      return drivers.find((d) => d.id === currentVehicle.assigned_driver_id) || null;
    }
    return null;
  }, [currentVehicle, drivers]);

  const activeDriver = useMemo(() => {
    if (selectedDriverId) {
      const found = drivers.find((d) => d.id === selectedDriverId);
      if (found) return found;
    }
    return assignedDriver || null;
  }, [selectedDriverId, drivers, assignedDriver]);

  const isDriverPreAssigned = useMemo(() => {
    return Boolean(assignedDriver && activeDriver && activeDriver.id === assignedDriver.id);
  }, [assignedDriver, activeDriver]);

  const filteredVehicles = useMemo(() => {
    if (!truckSearchQuery.trim()) return vehicles;
    const q = truckSearchQuery.toUpperCase().trim();
    return vehicles.filter((v) => {
      const plate = (v.vehicle_number || '').toUpperCase();
      const code = (v.vehicle_code || '').toUpperCase();
      const type = (v.vehicle_type || '').toUpperCase();
      const own = (v.ownership || '').toUpperCase();
      const driverName = (v.assignedDriver?.name || '').toUpperCase();
      return plate.includes(q) || code.includes(q) || type.includes(q) || own.includes(q) || driverName.includes(q);
    });
  }, [vehicles, truckSearchQuery]);

  const getOwnershipBadge = (ownership) => {
    const own = (ownership || 'OWN').toUpperCase();
    if (own === 'MARKET') {
      return {
        label: 'Market Hired',
        shortLabel: 'MARKET',
        icon: '🚛',
        tagBg: isDark ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-300 font-bold',
        dot: 'bg-purple-400',
      };
    }
    if (own === 'ATTACHED') {
      return {
        label: 'Attached Fleet',
        shortLabel: 'ATTACHED',
        icon: '🤝',
        tagBg: isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
        dot: 'bg-amber-400',
      };
    }
    return {
      label: 'Company Owned',
      shortLabel: 'OWNED',
      icon: '🏢',
      tagBg: isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-800 border-blue-300 font-bold',
      dot: 'bg-cyan-400',
    };
  };

  const handleSelectVehicle = (v) => {
    if (!v) return;
    setSelectedVehicleId(v.id);
    setSelectedFeet(null);
    setTruckSearchQuery('');
    setTruckDropdownOpen(false);
    setOverrideDriverSelection(false);

    const candidateDriverId = v.assignedDriver?.id || v.assigned_driver_id || '';
    if (candidateDriverId) {
      const dObj = drivers.find((d) => d.id === candidateDriverId);
      const originBranch = (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : modalOriginBranchId;
      if (!dObj?.branch_id || !originBranch || dObj.branch_id === originBranch) {
        setSelectedDriverId(candidateDriverId);
      } else {
        setSelectedDriverId('');
      }
    } else {
      setSelectedDriverId('');
    }

    if (v.current_odometer) {
      setStartOdometer(v.current_odometer.toString());
    }

    if (v.vehicle_charge || v.hire_charges) {
      setDispatchVehicleCharge(String(v.vehicle_charge || v.hire_charges));
    } else {
      setDispatchVehicleCharge('');
    }
  };

  const handleCreateMarketVehicle = async (e) => {
    e.preventDefault();
    setMarketError('');

    const cleanPlate = (marketForm.vehicle_number || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (!cleanPlate) {
      setMarketError('Please enter the vehicle registration number.');
      return;
    }
    if (cleanPlate.length < 5) {
      setMarketError('Vehicle registration number is too short (e.g. HR-55-AY-8724).');
      return;
    }

    const driverName = (marketForm.driver_name || '').trim();
    const rawDriverPhone = (marketForm.driver_phone || '').replace(/\D/g, '');
    const cleanDriverPhone = (rawDriverPhone.length === 12 && rawDriverPhone.startsWith('91')) ? rawDriverPhone.slice(2) : rawDriverPhone;

    if (driverName && !cleanDriverPhone) {
      setMarketError('Please enter a 10-digit mobile number for the driver.');
      return;
    }
    if (cleanDriverPhone) {
      if (!driverName) {
        setMarketError('Please enter the driver full name.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(cleanDriverPhone)) {
        setMarketError('Driver mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        return;
      }
    }

    const rawOwnerPhone = (marketForm.owner_phone || '').replace(/\D/g, '');
    const cleanOwnerPhone = (rawOwnerPhone.length === 12 && rawOwnerPhone.startsWith('91')) ? rawOwnerPhone.slice(2) : rawOwnerPhone;
    if (cleanOwnerPhone && !/^[6-9]\d{9}$/.test(cleanOwnerPhone)) {
      setMarketError('Broker/Transporter mobile number must be a valid 10-digit mobile number.');
      return;
    }

    setSubmittingMarket(true);
    try {
      const enteredCharge = parseFloat(marketForm.vehicle_charge) || 0;
      const payload = {
        ...marketForm,
        vehicle_number: cleanPlate,
        driver_name: driverName,
        driver_phone: cleanDriverPhone,
        owner_phone: cleanOwnerPhone,
        vehicle_charge: enteredCharge,
      };

      const res = await api.post('/fleet/vehicles/market-hire', payload);
      const newVeh = res.data?.data;
      if (newVeh) {
        if (enteredCharge > 0) {
          newVeh.vehicle_charge = enteredCharge;
          setDispatchVehicleCharge(String(enteredCharge));
        }
        setVehicles((prev) => [newVeh, ...prev.filter((v) => v.id !== newVeh.id)]);
        setSelectedVehicleId(newVeh.id);
        setSelectedFeet(parseInt(marketForm.truck_size_feet, 10));

        if (newVeh.assignedDriver) {
          setSelectedDriverId(newVeh.assignedDriver.id);
          setDrivers((prev) => {
            if (prev.some((d) => d.id === newVeh.assignedDriver.id)) return prev;
            return [newVeh.assignedDriver, ...prev];
          });
        }
        if (marketForm.current_odometer) {
          setStartOdometer(marketForm.current_odometer);
        }
        setMarketModalOpen(false);
        setTruckSearchQuery('');
        setTruckDropdownOpen(false);
        setMarketForm({
          vehicle_number: '',
          truck_size_feet: '19',
          capacity_ton: '9.5',
          ownership: 'MARKET',
          driver_name: '',
          driver_phone: '',
          driver_license: '',
          owner_name: '',
          owner_phone: '',
          current_odometer: '',
          vehicle_charge: '',
        });
      }
    } catch (err) {
      console.error('Error creating market vehicle', err);
      setMarketError(err.response?.data?.message || 'Failed to onboard market vehicle');
    } finally {
      setSubmittingMarket(false);
    }
  };

  const handleCreateQuickDriver = async (e) => {
    e.preventDefault();
    setDriverError('');

    const cleanName = (driverForm.name || '').trim();
    if (!cleanName || cleanName.length < 2) {
      setDriverError('Please enter a valid driver full name (at least 2 characters).');
      return;
    }

    const rawPhone = (driverForm.phone || '').replace(/\D/g, '');
    const cleanPhone = (rawPhone.length === 12 && rawPhone.startsWith('91')) ? rawPhone.slice(2) : rawPhone;
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setDriverError('Driver phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    const cleanLicense = (driverForm.license_number || '').trim().toUpperCase();
    if (!cleanLicense) {
      setDriverError('Driver license number is mandatory.');
      return;
    }

    setSubmittingDriver(true);
    try {
      const effBranch = (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : modalOriginBranchId;
      const payload = {
        name: cleanName,
        phone: cleanPhone,
        license_number: cleanLicense,
        status: 'ACTIVE',
        branch_id: effBranch || undefined,
      };
      const res = await api.post('/fleet/drivers', payload);
      const newDriver = res.data?.data;
      if (newDriver) {
        setDrivers((prev) => [newDriver, ...prev]);
        setSelectedDriverId(newDriver.id);

        if (currentVehicle) {
          api.put(`/fleet/vehicles/${currentVehicle.id}`, { assigned_driver_id: newDriver.id }).catch(() => { });
          currentVehicle.assignedDriver = newDriver;
        }

        setDriverModalOpen(false);
        setDriverForm({ name: '', phone: '', license_number: '' });
      }
    } catch (err) {
      console.error('Error adding quick driver', err);
      setDriverError(err.response?.data?.message || 'Failed to register driver');
    } finally {
      setSubmittingDriver(false);
    }
  };

  const currentBranch = useMemo(() => {
    if (selectedBranchId === 'ALL') {
      return { branch_name: 'All Docks & Branches (Company-Wide)', city: 'All Regions', is_hub: true };
    }
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const activeTruckConfig = useMemo(() => {
    return getTruckConfigForVehicle(currentVehicle, selectedFeet);
  }, [currentVehicle, selectedFeet]);

  const maxVehicleWeightTons = useMemo(() => {
    return activeTruckConfig.tonnage;
  }, [activeTruckConfig]);

  // Volume capacity aligned with 3D truck container dimensions
  const maxVehicleVolumeM3 = useMemo(() => {
    return activeTruckConfig.volumeM3;
  }, [activeTruckConfig]);

  // Loaded Items & Aggregate Stats (for PTL consolidation)
  const loadedItems = useMemo(() => {
    return ptlConsignments.filter((i) => loadedIds.has(i.id));
  }, [ptlConsignments, loadedIds]);

  const loadedVolume = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.volume_m3, 0);
  }, [loadedItems]);

  const loadedWeight = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.weight_t, 0);
  }, [loadedItems]);

  const loadedPackages = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.packages, 0);
  }, [loadedItems]);

  const loadedFreightRevenue = useMemo(() => {
    return loadedItems.reduce((acc, i) => acc + i.amount, 0);
  }, [loadedItems]);

  const weightUtilizationPct = useMemo(() => {
    if (maxVehicleWeightTons <= 0) return 0;
    return Math.min(100, Math.round((loadedWeight / maxVehicleWeightTons) * 100));
  }, [loadedWeight, maxVehicleWeightTons]);

  const volumeUtilizationPct = useMemo(() => {
    if (maxVehicleVolumeM3 <= 0) return 0;
    return Math.min(100, Math.round((loadedVolume / maxVehicleVolumeM3) * 100));
  }, [loadedVolume, maxVehicleVolumeM3]);

  const isOverweight = loadedWeight > maxVehicleWeightTons;
  const isOvervolume = loadedVolume > maxVehicleVolumeM3;

  // FTL Docket Specific Aggregate Stats & 3D Items
  const ftlWeightTons = useMemo(() => {
    if (!selectedFtlDocket) return 0;
    return selectedFtlDocket.weight_t ? parseFloat(selectedFtlDocket.weight_t) : (parseFloat(selectedFtlDocket.weight_kg || 0) / 1000);
  }, [selectedFtlDocket]);

  const ftlVolumeM3 = useMemo(() => {
    if (!selectedFtlDocket) return 0;
    return selectedFtlDocket.volume_m3
      ? parseFloat(selectedFtlDocket.volume_m3)
      : (selectedFtlDocket.cbm ? parseFloat(selectedFtlDocket.cbm) : Math.max(1, (selectedFtlDocket.packages || 1) * 0.15));
  }, [selectedFtlDocket]);

  const ftlWeightUtilizationPct = useMemo(() => {
    if (!maxVehicleWeightTons) return 0;
    return Math.min(100, Math.round((ftlWeightTons / maxVehicleWeightTons) * 100));
  }, [ftlWeightTons, maxVehicleWeightTons]);

  const ftlVolumeUtilizationPct = useMemo(() => {
    if (!maxVehicleVolumeM3) return 0;
    return Math.min(100, Math.round((ftlVolumeM3 / maxVehicleVolumeM3) * 100));
  }, [ftlVolumeM3, maxVehicleVolumeM3]);

  const isFtlOverweight = ftlWeightTons > maxVehicleWeightTons;
  const isFtlOvervolume = ftlVolumeM3 > maxVehicleVolumeM3;

  const ftlLoadedItems = useMemo(() => {
    if (!selectedFtlDocket) return [];
    return [{
      ...selectedFtlDocket,
      weight_t: ftlWeightTons,
      volume_m3: ftlVolumeM3,
    }];
  }, [selectedFtlDocket, ftlWeightTons, ftlVolumeM3]);

  // Toggle load selection
  const toggleLoad = (id) => {
    setLoadedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open Dispatch Modal
  const handleOpenDispatchModal = () => {
    if (operationMode === 'FTL') {
      if (!selectedFtlDocket) {
        alert('Please select an FTL consignment docket from Step 1.');
        return;
      }
      if (!selectedVehicleId) {
        alert('Please allocate a dedicated vehicle in Step 2.');
        return;
      }
      if (!selectedDriverId) {
        alert('Please assign a certified driver for this FTL shipment.');
        return;
      }

      // Pre-fill origin
      const autoOrigin = modalOriginBranchId
        || selectedFtlDocket.origin_branch_id
        || (isRestrictedBranchUser && userBranchId ? userBranchId : null)
        || loginBranchId
        || (selectedBranchId !== 'ALL' ? selectedBranchId : null)
        || branches[0]?.id
        || '';
      setModalOriginBranchId(autoOrigin);

      // Pre-fill destination from FTL docket
      let ftlDestId = destBranchId || selectedFtlDocket.destination_branch_id;
      if (!ftlDestId && selectedFtlDocket.destination_city) {
        const matchBranch = branches.find(
          (b) => (b.city || '').toLowerCase() === selectedFtlDocket.destination_city.toLowerCase()
        );
        if (matchBranch) ftlDestId = matchBranch.id;
      }
      if (ftlDestId && ftlDestId !== autoOrigin) {
        setDestBranchId(ftlDestId);
      }

      if (!sealNumber) {
        setSealNumber(`SEAL-${Math.floor(10000 + Math.random() * 90000)}`);
      }
      if (!dispatchRemarks) {
        setDispatchRemarks(`Direct FTL Dispatch for LR ${selectedFtlDocket.docket_number}`);
      }

      setDispatchModalOpen(true);
      return;
    }

    if (loadedItems.length === 0) {
      alert('Please stage at least one consignment into the truck before dispatching.');
      return;
    }
    if (!selectedVehicleId) {
      alert('Please select a target line-haul vehicle.');
      return;
    }

    // Origin is automatically selected according to the login branch or hub
    const autoOrigin = (isRestrictedBranchUser && userBranchId)
      ? userBranchId
      : (loginBranchId
        || (selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : null)
        || loadedItems[0]?.origin_branch_id
        || branches.find((b) => b.is_hub)?.id
        || branches[0]?.id
        || '');
    setModalOriginBranchId(autoOrigin);

    // Destination should NOT be auto-selected - require explicit user selection
    if (destBranchId === autoOrigin) {
      setDestBranchId('');
    }
    setDriverAdvance('');
    setAdvanceMode('');
    if (!sealNumber) {
      setSealNumber(`SEAL-${Math.floor(10000 + Math.random() * 90000)}`);
    }
    setDispatchModalOpen(true);
  };

  // Confirm and Execute Real Dispatch
  const handleConfirmDispatch = async () => {
    if (!selectedDriverId) {
      alert('Please assign a certified driver for this trip.');
      return;
    }

    const effectiveOriginBranchId = modalOriginBranchId || (isRestrictedBranchUser && userBranchId
      ? userBranchId
      : (loginBranchId || (selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : loadedItems[0]?.origin_branch_id || branches[0]?.id)));

    if (!effectiveOriginBranchId) {
      alert('Please select a departure origin branch/hub.');
      return;
    }
    if (!destBranchId) {
      alert('Please select a destination delivery hub or branch before dispatching.');
      return;
    }
    if (parseFloat(driverAdvance) > 0 && !advanceMode) {
      alert('Please select a payment disbursal mode for the driver advance.');
      return;
    }

    setDispatching(true);
    try {
      const payload = {
        origin_branch_id: effectiveOriginBranchId,
        dest_branch_id: destBranchId,
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        consignment_ids: Array.from(loadedIds),
        start_odometer: parseInt(startOdometer || 0, 10),
        seal_number: sealNumber || `SEAL-${Math.floor(10000 + Math.random() * 90000)}`,
        remarks: dispatchRemarks || 'Dispatched via 3D Load Planning Dock',
        driver_advance: parseFloat(driverAdvance) || 0,
        advance_mode: advanceMode || 'CASH',
        vehicle_charge: parseFloat(dispatchVehicleCharge) || 0,
        load_type: 'PTL',
      };

      const res = await api.post('/trips/dispatch', payload);
      const resData = res.data?.data || {};
      const tripObj = resData.trip || resData;
      const dispatchObj = resData.dispatch || resData.dispatches?.[0] || {};
      const finalTripNum = tripObj.trip_number || resData.trip_number;
      const finalDispatchNum = dispatchObj.dispatch_number || resData.dispatch_number;

      setDispatchModalOpen(false);
      setSuccessResult({
        tripNumber: finalTripNum || `TRP-${new Date().getFullYear()}-001`,
        dispatchNumber: finalDispatchNum || `DISP-${Date.now().toString().slice(-5)}`,
        packagesCount: loadedPackages,
        totalWeight: loadedWeight.toFixed(2),
        vehicleNumber: currentVehicle?.vehicle_number || 'Vehicle',
        destination: branches.find((b) => b.id === destBranchId)?.branch_name || 'Destination',
      });

      // Clear loaded ids and immediately remove dispatched consignments
      setDispatchedIds((prev) => {
        const next = new Set(prev);
        Array.from(loadedIds).forEach((id) => next.add(id));
        return next;
      });
      setStagedConsignments((prev) => prev.filter((item) => !loadedIds.has(item.id)));
      setLoadedIds(new Set());

      // Reset vehicle, driver and trip inputs to fresh state
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setSelectedFeet(null);
      setTruckSearchQuery('');
      setTruckDropdownOpen(false);
      setOverrideDriverSelection(false);
      setDestBranchId('');
      setStartOdometer('');
      setSealNumber('');
      setDispatchRemarks('');
      setDriverAdvance('');
      setAdvanceMode('');
      setDispatchVehicleCharge('');

      // Refresh fleet and drivers so the dispatched vehicle is marked ON_TRIP and not pre-selected
      try {
        const [vehiclesRes, driversRes] = await Promise.all([
          api.get('/fleet/vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/drivers').catch(() => ({ data: { data: [] } })),
        ]);
        const vehicleList = vehiclesRes.data?.data || [];
        const driverList = driversRes.data?.data || [];
        setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
        setDrivers(Array.isArray(driverList) ? driverList : []);
      } catch (refreshErr) {
        console.warn('Failed to refresh fleet list after dispatch', refreshErr);
      }

      await fetchStagedConsignments();
    } catch (err) {
      console.error('Dispatch failed:', err);
      alert(err.response?.data?.message || 'Failed to generate trip and dispatch manifest.');
    } finally {
      setDispatching(false);
    }
  };

  // Select FTL Docket for Dedicated Vehicle Assignment
  const handleSelectFtlDocket = (docket) => {
    if (selectedFtlDocketId === docket.id) {
      setSelectedFtlDocketId(null);
      return;
    }
    setSelectedFtlDocketId(docket.id);

    // Auto-select origin branch for FTL
    if (docket.origin_branch_id) {
      setModalOriginBranchId(docket.origin_branch_id);
    } else {
      const effOrigin = (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : (loginBranchId || branches[0]?.id || '');
      if (effOrigin) setModalOriginBranchId(effOrigin);
    }

    // Auto-select destination branch for FTL
    if (docket.destination_branch_id) {
      setDestBranchId(docket.destination_branch_id);
    } else if (docket.destination_city) {
      const matchBranch = branches.find(
        (b) => (b.city || '').toLowerCase() === docket.destination_city.toLowerCase()
      );
      if (matchBranch) {
        setDestBranchId(matchBranch.id);
      }
    }

    if (!sealNumber) {
      setSealNumber(`SEAL-${Math.floor(10000 + Math.random() * 90000)}`);
    }
  };

  // Direct FTL Dispatch Execution
  const handleDispatchFtl = async () => {
    if (!selectedFtlDocket) {
      alert('Please select an FTL docket from Step 1 before dispatching.');
      return;
    }
    if (!selectedVehicleId) {
      alert('Please select or hire a dedicated truck in Step 2.');
      return;
    }
    if (!selectedDriverId) {
      alert('Please assign a certified driver for this FTL shipment.');
      return;
    }

    const effectiveOriginBranchId = modalOriginBranchId
      || selectedFtlDocket.origin_branch_id
      || (selectedBranchId !== 'ALL' ? selectedBranchId : null)
      || loginBranchId
      || branches[0]?.id;

    let effectiveDestBranchId = destBranchId || selectedFtlDocket.destination_branch_id;
    if (!effectiveDestBranchId && selectedFtlDocket.destination_city) {
      const matchBranch = branches.find(
        (b) => (b.city || '').toLowerCase() === selectedFtlDocket.destination_city.toLowerCase()
      );
      if (matchBranch) effectiveDestBranchId = matchBranch.id;
    }

    if (!effectiveOriginBranchId) {
      alert('Please select departure origin branch.');
      return;
    }
    if (!effectiveDestBranchId) {
      alert('Please select a destination delivery hub or branch before dispatching.');
      return;
    }

    if (parseFloat(driverAdvance) > 0 && !advanceMode) {
      alert('Please select a payment disbursal mode for the driver advance.');
      return;
    }

    setDispatching(true);
    try {
      const payload = {
        origin_branch_id: effectiveOriginBranchId,
        dest_branch_id: effectiveDestBranchId,
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        consignment_ids: [selectedFtlDocket.id],
        start_odometer: parseInt(startOdometer || 0, 10),
        seal_number: sealNumber || `SEAL-${Math.floor(10000 + Math.random() * 90000)}`,
        remarks: dispatchRemarks || `Direct FTL Dispatch for LR ${selectedFtlDocket.docket_number}`,
        driver_advance: parseFloat(driverAdvance) || 0,
        advance_mode: advanceMode || 'CASH',
        vehicle_charge: parseFloat(dispatchVehicleCharge) || 0,
        load_type: 'FTL',
      };

      const res = await api.post('/trips/dispatch', payload);
      const resData = res.data?.data || {};
      const tripObj = resData.trip || resData;
      const dispatchObj = resData.dispatch || resData.dispatches?.[0] || {};
      const finalTripNum = tripObj.trip_number || resData.trip_number;
      const finalDispatchNum = dispatchObj.dispatch_number || resData.dispatch_number;

      setDispatchModalOpen(false);
      setSuccessResult({
        tripNumber: finalTripNum || `TRP-${new Date().getFullYear()}-001`,
        dispatchNumber: finalDispatchNum || `DISP-${Date.now().toString().slice(-5)}`,
        packagesCount: selectedFtlDocket.packages,
        totalWeight: selectedFtlDocket.weight_t ? selectedFtlDocket.weight_t.toFixed(2) : (selectedFtlDocket.weight_kg / 1000).toFixed(2),
        vehicleNumber: currentVehicle?.vehicle_number || 'Vehicle',
        destination: branches.find((b) => b.id === effectiveDestBranchId)?.branch_name || selectedFtlDocket.destination_city || 'Destination',
      });

      // Clear dispatched FTL docket immediately
      setDispatchedIds((prev) => new Set([...prev, selectedFtlDocket.id]));
      setStagedConsignments((prev) => prev.filter((item) => item.id !== selectedFtlDocket.id));
      setSelectedFtlDocketId(null);

      // Reset trip & vehicle selection
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setSelectedFeet(null);
      setTruckSearchQuery('');
      setTruckDropdownOpen(false);
      setOverrideDriverSelection(false);
      setDestBranchId('');
      setStartOdometer('');
      setSealNumber('');
      setDispatchRemarks('');
      setDriverAdvance('');
      setAdvanceMode('');
      setDispatchVehicleCharge('');

      // Refresh fleet
      try {
        const [vehiclesRes, driversRes] = await Promise.all([
          api.get('/fleet/vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/drivers').catch(() => ({ data: { data: [] } })),
        ]);
        setVehicles(vehiclesRes.data?.data || []);
        setDrivers(driversRes.data?.data || []);
      } catch (refreshErr) {
        console.warn('Failed to refresh fleet after FTL dispatch', refreshErr);
      }

      await fetchStagedConsignments();
    } catch (err) {
      console.error('FTL Dispatch failed:', err);
      alert(err.response?.data?.message || 'Failed to dispatch FTL trip.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
      } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 w-full max-w-full">

          {/* Header Action Bar */}
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-2xl ${
                  operationMode === 'FTL'
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20'
                    : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/20'
                } text-white shadow-lg shrink-0`}>
                  {operationMode === 'FTL' ? <Truck className="w-5 h-5 sm:w-6 sm:h-6" /> : <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                      {operationMode === 'FTL' ? 'FTL Dedicated Vehicle Dispatch' : 'Load Planning & Dispatch Operations'}
                    </h1>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                      operationMode === 'FTL'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border-cyan-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        operationMode === 'FTL' ? 'bg-purple-400' : 'bg-cyan-400'
                      }`} />
                      {operationMode === 'FTL' ? 'FTL Dispatch' : 'Live Operations'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate sm:whitespace-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {operationMode === 'FTL'
                      ? 'Point-to-point dedicated vehicle allocation, driver assignment, and trip dispatch.'
                      : 'Photorealistic 3D cargo stowage, fleet allocation, and trip manifest dispatch.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Branch Context & Operational Actions */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Branch Selector: only for multi-branch admins who can switch origin docks */}
              {!isRestrictedBranchUser && (
                <BranchFilterDropdown
                  selectedBranchId={selectedBranchId}
                  onChange={(newBranchId) => {
                    setSelectedBranchId(newBranchId);
                    setLoadedIds(new Set());
                    setSelectedFtlDocketId(null);
                  }}
                  branches={selectableBranches}
                  allLabel="All Docks & Branches"
                  allSubtitle="Company-Wide Origin Docks"
                  label="Origin Dock:"
                  showLabel={true}
                  align="right"
                />
              )}

              {/* Create New Docket Button (styled with blue-to-cyan gradient) */}
              <Link
                href="/bookings"
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-cyan-500/20 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Docket</span>
              </Link>
            </div>
          </div>

          {/* Operation Mode Selector: PTL vs FTL (Only visible if company supports BOTH modes) */}
          {isBoth && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl border bg-white/80 dark:bg-[#0B1020]/90 border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setOperationMode('PTL');
                      setLoadedIds(new Set());
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      operationMode === 'PTL'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>PTL (Part Truck Load)</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      operationMode === 'PTL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {ptlConsignments.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOperationMode('FTL');
                      setSelectedFtlDocketId(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      operationMode === 'FTL'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>FTL (Full Truck Load)</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      operationMode === 'FTL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {ftlConsignments.length}
                    </span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                  {operationMode === 'PTL'
                    ? '📦 Multi-docket consolidation with 3D cargo stowage engine'
                    : '🚛 Dedicated point-to-point truck dispatch: Select FTL docket ➔ Assign Vehicle & Driver'}
                </span>
              </div>
            </div>
          )}

          {/* Operational KPI Strip */}
          {operationMode === 'PTL' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Staged PTL Dockets</div>
                <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {ptlConsignments.length}
                </div>
                <div className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-1 font-semibold">
                  Available at {currentBranch?.branch_name || 'Branch'}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Loaded Into Truck</div>
                <div className="text-2xl font-black text-cyan-500 dark:text-cyan-400 font-mono">
                  {loadedItems.length}
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {loadedPackages} packages selected
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Weight Utilization</div>
                <div className={`text-2xl font-black font-mono ${isOverweight ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                  {weightUtilizationPct}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                  {loadedWeight.toFixed(1)} / {maxVehicleWeightTons.toFixed(1)} Tons
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Volume Capacity</div>
                <div className={`text-2xl font-black font-mono ${isOvervolume ? 'text-rose-500' : 'text-amber-500 dark:text-amber-400'}`}>
                  {volumeUtilizationPct}%
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {loadedVolume.toFixed(1)} / {maxVehicleVolumeM3.toFixed(1)} m³
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Expected Trip Revenue</div>
                <div className="text-2xl font-black text-purple-500 dark:text-purple-400 font-mono">
                  ₹{Math.round(loadedFreightRevenue).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400/80 mt-1 font-semibold">
                  Freight sum of loaded items
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className={`py-2.5 px-3.5 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Staged FTL</div>
                <div className="text-xl font-black font-mono text-purple-500 dark:text-purple-400">
                  {ftlConsignments.length}
                </div>
                <div className="text-[10px] text-purple-500 dark:text-purple-400/80 font-semibold truncate">
                  Pending Assignment
                </div>
              </div>

              <div className={`py-2.5 px-3.5 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Selected Docket</div>
                <div className={`text-sm font-black font-mono truncate ${selectedFtlDocket ? (isDark ? 'text-cyan-400' : 'text-blue-600') : 'text-slate-400'}`}>
                  {selectedFtlDocket ? selectedFtlDocket.docket_number : 'None'}
                </div>
                <div className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {selectedFtlDocket ? `${selectedFtlDocket.packages} pkgs • ${selectedFtlDocket.items}` : 'Select below'}
                </div>
              </div>

              <div className={`py-2.5 px-3.5 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Assigned Vehicle</div>
                <div className={`text-sm font-black font-mono truncate ${currentVehicle ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-amber-500'}`}>
                  {currentVehicle ? currentVehicle.vehicle_number : 'Unassigned'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  {currentVehicle ? `${activeTruckConfig.feet}FT • ${maxVehicleWeightTons}T rated` : 'Assign truck in Step 2'}
                </div>
              </div>

              <div className={`py-2.5 px-3.5 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">FTL Cargo Wt</div>
                <div className={`text-xl font-black font-mono ${selectedFtlDocket && currentVehicle && selectedFtlDocket.weight_t > maxVehicleWeightTons ? 'text-rose-500' : isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedFtlDocket ? `${selectedFtlDocket.weight_t.toFixed(1)} T` : '--'}
                </div>
                <div className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {selectedFtlDocket && currentVehicle
                    ? `${Math.min(100, Math.round((selectedFtlDocket.weight_t / maxVehicleWeightTons) * 100))}% truck capacity`
                    : selectedFtlDocket ? `${selectedFtlDocket.weight_kg} kg gross` : 'Select docket'}
                </div>
              </div>

              <div className={`py-2.5 px-3.5 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Trip Freight</div>
                <div className="text-xl font-black text-emerald-500 dark:text-emerald-400 font-mono">
                  {selectedFtlDocket ? `₹${Math.round(selectedFtlDocket.amount).toLocaleString('en-IN')}` : '₹0'}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-semibold truncate">
                  {selectedFtlDocket ? `${selectedFtlDocket.origin_city || 'Origin'} ➔ ${selectedFtlDocket.destination_city || 'Dest'}` : 'Direct Contract'}
                </div>
              </div>
            </div>
          )}

          {/* PTL CONSOLIDATED PLANNING & 3D STOWAGE WORKSPACE */}
          {operationMode === 'PTL' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* Left 5 Cols: Step 1 - Staged PTL Consignments Queue */}
            <div className="lg:col-span-5 flex flex-col h-full min-h-[640px]">
              <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col transition-all h-full ${
                isDark ? 'bg-[#0B1020]/95 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Step 1 Header with Select All */}
                <div className={`pb-3 border-b flex items-center justify-between gap-2 shrink-0 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-xl shrink-0 ${isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          STEP 1
                        </span>
                        <h3 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Stow Consignments
                        </h3>
                      </div>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Select LRs to stow into consolidated run
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                      {loadedIds.size} / {ptlConsignments.length}
                    </span>
                    {ptlConsignments.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          loadedIds.size > 0 && loadedIds.size === filteredConsignments.length
                            ? isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                            : isDark ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        {loadedIds.size > 0 && loadedIds.size === filteredConsignments.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Instant Search Bar */}
                <div className="relative my-3 shrink-0">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="Search by LR#, Shipper, City..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-purple-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600'
                    }`}
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {loadingConsignments ? (
                  <div className="py-16 flex-1 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                    <RotateCw className="w-5 h-5 text-purple-400 animate-spin" />
                    <span>Loading dock dockets...</span>
                  </div>
                ) : filteredConsignments.length === 0 ? (
                  <div className="py-12 flex-1 flex flex-col items-center justify-center text-center space-y-2">
                    <Package className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-bold">
                      {ptlConsignments.length === 0 ? 'No PTL Dockets Staged in This Dock' : 'No matching consignments'}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      {ptlConsignments.length === 0
                        ? 'All registered PTL consignments have been dispatched or completed.'
                        : 'Try searching with a different LR number or party name.'}
                    </p>
                    {ptlConsignments.length === 0 && (
                      <Link
                        href="/bookings"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold mt-2 shadow-md shadow-purple-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Bilty</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  /* Dense Professional Table / List View */
                  <div className="overflow-x-auto flex-1 h-full min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className={`sticky top-0 z-10 text-[10px] uppercase font-bold tracking-wider ${
                        isDark ? 'bg-slate-900 text-slate-400 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                      }`}>
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={loadedIds.size > 0 && loadedIds.size === filteredConsignments.length}
                              onChange={toggleSelectAll}
                              className="rounded cursor-pointer accent-purple-600"
                            />
                          </th>
                          <th className="py-2.5 px-2">LR / Docket</th>
                          <th className="py-2.5 px-2">Party & Route</th>
                          <th className="py-2.5 px-2 text-right">Wt / Pkgs</th>
                          <th className="py-2.5 px-3 text-right">Freight</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                        {filteredConsignments.map((item) => {
                          const isLoaded = loadedIds.has(item.id);
                          return (
                            <tr
                              key={item.id}
                              onClick={() => toggleLoad(item.id)}
                              onMouseEnter={() => setHoveredConsignmentId(item.id)}
                              onMouseLeave={() => setHoveredConsignmentId(null)}
                              className={`transition-colors cursor-pointer ${
                                isLoaded
                                  ? isDark ? 'bg-purple-950/30 text-white hover:bg-purple-950/40' : 'bg-purple-50/80 text-purple-900 hover:bg-purple-100/60'
                                  : isDark ? 'hover:bg-slate-900/60 text-slate-300 opacity-70 hover:opacity-100' : 'hover:bg-slate-50 text-slate-700 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isLoaded}
                                  onChange={() => toggleLoad(item.id)}
                                  className="rounded cursor-pointer accent-purple-600"
                                />
                              </td>
                              <td className="py-2.5 px-2 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                                    {item.docket_number}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    item.priority === 'EXPRESS'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : item.priority === 'PRIORITY'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {item.priority}
                                  </span>
                                  {item.is_transshipment && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                      Transshipment
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 max-w-[160px]">
                                <div className="font-semibold truncate text-[11px]">
                                  {item.shipper}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                  <span>{item.origin_city || item.origin}</span>
                                  <span>➔</span>
                                  <span className="text-emerald-500 dark:text-emerald-400 font-medium">{item.destination_city || item.destination}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right whitespace-nowrap">
                                <div className="font-mono font-bold text-[11px]">
                                  {item.weight_t ? `${item.weight_t} T` : `${item.weight_kg} kg`}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {item.packages} pkgs • {item.volume_m3}m³
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                ₹{Math.round(item.amount).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-3 shrink-0 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div className="text-xs">
                    <span className="text-slate-400">Selected: </span>
                    <strong className="text-purple-500 dark:text-purple-400 font-mono">{loadedIds.size} LRs</strong>
                    <span className="text-slate-400"> ({loadedWeight.toFixed(1)}T • {loadedVolume.toFixed(1)}m³)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right 7 Cols: Step 2 - Vehicle Allocation & Live Stowing */}
            <div className="lg:col-span-7 flex flex-col h-full min-h-[640px]">
              {loadedItems.length === 0 ? (
                <div className={`p-8 sm:p-12 rounded-3xl border shadow-xl text-center space-y-4 flex flex-col items-center justify-center h-full ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-inner">
                    <Truck className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Step 1: Select a PTL Consignment Docket
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Please select one or more PTL consignment dockets from the dock queue on the left. Once selected, you can allocate a vehicle, inspect 3D stowage, verify capacity, and dispatch the consolidated trip.
                    </p>
                  </div>
                  {filteredConsignments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleLoad(filteredConsignments[0].id)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                    >
                      <span>Select First Docket ({filteredConsignments[0].docket_number})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between space-y-2.5 transition-all h-full ${
                  isDark ? 'bg-[#0B1020]/95 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Step 2 Header & Route / Capacity Strip */}
                <div className={`pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-xl shrink-0 ${isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      {/* Line 1: Step Badge & Vehicle Header */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          STEP 2
                        </span>
                        <h2 className={`font-mono font-black text-xs sm:text-sm tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {currentVehicle?.vehicle_number || 'No Vehicle Selected'}
                        </h2>
                        {currentVehicle && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border flex items-center gap-1 ${getOwnershipBadge(currentVehicle.ownership).tagBg}`}>
                            <span>{getOwnershipBadge(currentVehicle.ownership).icon}</span>
                            <span>{getOwnershipBadge(currentVehicle.ownership).label}</span>
                          </span>
                        )}
                      </div>

                      {/* Line 2: Consolidated dispatch, Route & Vehicle Rated Badge */}
                      <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5 flex-wrap`}>
                        <span>Consolidated dispatch:</span>
                        <span className="font-semibold text-emerald-400 dark:text-emerald-300">
                          {currentBranch?.branch_name || branches.find((b) => b.id === modalOriginBranchId)?.branch_name || 'Origin Hub'}
                          {' '}➔{' '}
                          {destBranchId ? (branches.find((b) => b.id === destBranchId)?.branch_name || 'Delivery Hub') : '[Select Destination Hub]'}
                        </span>
                        <span>•</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${isDark
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {maxVehicleWeightTons}T RATED • {activeTruckConfig.shortName || `${activeTruckConfig.feet}FT`}
                        </span>
                        {activeDriver && (
                          <span className={`ml-1.5 pl-1.5 border-l ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`}>
                            Driver: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{activeDriver.name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMarketModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer self-start sm:self-end"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Hire Market Truck</span>
                    </button>

                    {/* Compact Workload & Capacity Strips (Single Low-Profile Row) */}
                    <div className="flex items-center sm:justify-end gap-1 font-mono text-[9px] font-bold flex-wrap">
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                        isOvervolume
                          ? isDark
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                          : isDark
                            ? 'bg-slate-900/90 border-slate-800 text-cyan-400'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        <span className={`text-[8px] uppercase font-semibold ${isOvervolume ? (isDark ? 'text-rose-400' : 'text-rose-600') : 'text-slate-400'}`}>
                          VOL:
                        </span>
                        <span>{loadedVolume.toFixed(1)} / {maxVehicleVolumeM3.toFixed(1)} m³</span>
                        <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                          isOvervolume
                            ? isDark ? 'bg-rose-500/30 text-rose-300' : 'bg-rose-200 text-rose-800'
                            : isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {volumeUtilizationPct}%
                        </span>
                      </div>

                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                        isOverweight
                          ? isDark
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                          : isDark
                            ? 'bg-slate-900/90 border-slate-800 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        <span className={`text-[8px] uppercase font-semibold ${isOverweight ? (isDark ? 'text-rose-400' : 'text-rose-600') : 'text-slate-400'}`}>
                          WT:
                        </span>
                        <span>{loadedWeight.toFixed(1)} / {maxVehicleWeightTons.toFixed(1)} T</span>
                        <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                          isOverweight
                            ? isDark ? 'bg-rose-500/30 text-rose-300' : 'bg-rose-200 text-rose-800'
                            : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {weightUtilizationPct}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clear, High-Efficiency Vehicle & Driver Assignment Toolbar */}
                <div className={`p-3 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-3 items-center shrink-0 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/90 border-slate-200 shadow-xs'
                }`}>
                  {/* 1. Vehicle Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        1. Assigned Vehicle
                      </label>
                      {currentVehicle && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVehicleId('');
                            setSelectedDriverId('');
                            setSelectedFeet(null);
                            setTruckSearchQuery('');
                            setOverrideDriverSelection(false);
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          Change Truck
                        </button>
                      )}
                    </div>

                    {currentVehicle ? (
                      <div className={`h-11 px-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isDark ? 'bg-slate-950/80 border-purple-500/40 text-white' : 'bg-white border-purple-300 text-slate-900 shadow-xs'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Truck className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                          <div className="min-w-0 truncate">
                            <span className="font-mono font-black text-xs text-purple-500 dark:text-purple-300 mr-1.5">
                              {currentVehicle.vehicle_number}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border mr-1.5 ${getOwnershipBadge(currentVehicle.ownership).tagBg}`}>
                              {getOwnershipBadge(currentVehicle.ownership).shortLabel}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {activeTruckConfig.shortName || `${activeTruckConfig.feet}FT`} • {maxVehicleWeightTons}T
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVehicleId('');
                            setSelectedDriverId('');
                            setSelectedFeet(null);
                            setTruckSearchQuery('');
                            setOverrideDriverSelection(false);
                          }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                          title="Deselect truck"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={truckSearchQuery}
                          onChange={(e) => {
                            setTruckSearchQuery(e.target.value);
                            setTruckDropdownOpen(true);
                          }}
                          onFocus={() => setTruckDropdownOpen(true)}
                          placeholder="Search fleet / market truck (e.g. DL-01, RJ-14)..."
                          className={`w-full h-11 pl-9 pr-8 rounded-xl text-xs font-mono font-medium border focus:outline-none transition-all ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-400'
                              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-600 shadow-xs'
                          }`}
                        />
                        {truckSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setTruckSearchQuery('')}
                            className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {truckDropdownOpen && (
                          <div className={`absolute z-30 mt-1 w-full rounded-2xl border shadow-2xl overflow-hidden max-h-72 overflow-y-auto ${
                            isDark ? 'bg-[#0E1526] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                          }`}>
                            <div className={`p-2 border-b text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                              isDark ? 'border-slate-800 text-slate-400 bg-slate-900/50' : 'border-slate-200 text-slate-600 bg-slate-50'
                            }`}>
                              <span>Available Fleet Vehicles ({filteredVehicles.length})</span>
                              <button
                                type="button"
                                onClick={() => setTruckDropdownOpen(false)}
                                className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {filteredVehicles.length > 0 ? (
                              <div className="p-1 space-y-1">
                                {filteredVehicles.map((v) => {
                                  const badge = getOwnershipBadge(v.ownership);
                                  const isSelected = v.id === selectedVehicleId;
                                  return (
                                    <div
                                      key={v.id}
                                      onClick={() => handleSelectVehicle(v)}
                                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                                        isSelected
                                          ? isDark ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'bg-purple-50 border border-purple-200 text-purple-900'
                                          : isDark ? 'hover:bg-slate-800/80 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <Truck className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className={`font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                              {v.vehicle_number}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.tagBg}`}>
                                              {badge.shortLabel}
                                            </span>
                                            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>
                                              {v.length_ft || 19}FT • {v.capacity_ton || 9.5}T
                                            </span>
                                          </div>
                                          <div className={`text-[10px] flex items-center gap-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                                            {v.assignedDriver ? (
                                              <span>👤 {v.assignedDriver.name}</span>
                                            ) : (
                                              <span className={isDark ? 'text-amber-400/90' : 'text-amber-700 font-semibold'}>⚠️ Unassigned Driver</span>
                                            )}
                                            <span>•</span>
                                            <span className={v.status === 'AVAILABLE' ? (isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold') : 'text-slate-500'}>
                                              {v.status || 'AVAILABLE'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && <Check className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 text-center space-y-2">
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No vehicle found matching "{truckSearchQuery}"</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMarketForm((prev) => ({ ...prev, vehicle_number: truckSearchQuery.toUpperCase() }));
                                    setMarketModalOpen(true);
                                    setTruckDropdownOpen(false);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Hire "{truckSearchQuery.toUpperCase()}" as Market Truck</span>
                                </button>
                              </div>
                            )}

                            <div className={`p-2 border-t ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setMarketModalOpen(true);
                                  setTruckDropdownOpen(false);
                                }}
                                className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                  isDark
                                    ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
                                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Hire / Add New Market Truck</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Driver Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        2. Assigned Driver
                      </label>
                      {activeDriver && !overrideDriverSelection && (
                        <button
                          type="button"
                          onClick={() => setOverrideDriverSelection(true)}
                          className="text-[10px] font-bold text-slate-400 hover:text-purple-400 cursor-pointer"
                        >
                          Change Driver
                        </button>
                      )}
                    </div>

                    {activeDriver && !overrideDriverSelection ? (
                      <div className={`h-11 px-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs shrink-0">👤</span>
                          <div className="truncate">
                            <span className="text-xs font-bold truncate block">{activeDriver.name}</span>
                            {activeDriver.phone && <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">{activeDriver.phone}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOverrideDriverSelection(true)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors shrink-0 cursor-pointer ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Switch
                        </button>
                      </div>
                    ) : (
                      <div className={`h-11 pl-3 pr-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus-within:border-purple-400'
                          : 'bg-white border-slate-300 text-slate-900 focus-within:border-purple-600 shadow-xs'
                      }`}>
                        <select
                          value={selectedDriverId}
                          onChange={(e) => {
                            setSelectedDriverId(e.target.value);
                            setOverrideDriverSelection(false);
                          }}
                          className={`h-full flex-1 min-w-0 bg-transparent text-xs font-medium focus:outline-none transition-all truncate border-none outline-none cursor-pointer ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          <option value="" className={isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-900'}>-- Choose Driver --</option>
                          {drivers
                            .filter((d) => {
                              const effOrigin = (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : modalOriginBranchId;
                              return !d.branch_id || !effOrigin || d.branch_id === effOrigin;
                            })
                            .map((d) => (
                              <option key={d.id} value={d.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                                {d.name} ({d.phone || 'Driver'})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setDriverModalOpen(true)}
                          className="h-8 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-purple-600/25 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parametric 3D Truck Visualizer */}
                <div className="flex-1 min-h-[460px] flex flex-col justify-center">
                  <Truck3DViewer
                    currentVehicle={currentVehicle}
                    loadedItems={loadedItems}
                    selectedFeet={selectedFeet}
                    onFeetChange={(newFeet) => setSelectedFeet(newFeet)}
                    isDark={isDark}
                  />
                </div>

                {/* Dedicated Dispatch Action Footer */}
                <div className={`pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div className="text-xs">
                    <span className="text-slate-400">Stowed Cargo: </span>
                    <strong className="text-purple-500 dark:text-purple-400 font-mono">
                      {loadedIds.size} LRs ({loadedPackages} pkgs • {loadedWeight.toFixed(2)} T • {loadedVolume.toFixed(2)} m³)
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenDispatchModal}
                    disabled={!selectedVehicleId || loadedItems.length === 0}
                    title={!selectedVehicleId ? 'Please assign a vehicle in Step 2' : loadedItems.length === 0 ? 'Please stow at least one consignment' : 'Lock & Confirm Consolidated PTL Trip'}
                    className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Lock & Confirm Consolidated PTL Trip ➔</span>
                  </button>
                </div>
              </div>
              )}
            </div>

          </div>
          )}

          {/* FTL DEDICATED DISPATCH WORKSPACE */}
          {operationMode === 'FTL' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

              {/* Left 5 Cols: Step 1 - Staged FTL Dockets Queue */}
              <div className="lg:col-span-5 flex flex-col h-full min-h-[640px]">
                <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col transition-all h-full ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  {/* Step 1 Header */}
                  <div className={`pb-3 border-b flex items-center justify-between gap-2 shrink-0 ${
                    isDark ? 'border-slate-800/80' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 font-black text-xs shrink-0">
                        01
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            STEP 1 OF 2
                          </span>
                          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Select FTL Docket
                          </h3>
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Pick full-truck-load booking waiting for vehicle allocation
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono shrink-0 ${
                      isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                      {filteredFtlConsignments.length} Available
                    </span>
                  </div>

                  {/* Search input */}
                  <div className="relative my-3 shrink-0">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                    <input
                      type="text"
                      placeholder="Search FTL by LR#, Shipper, Consignee, City..."
                      value={ftlSearchFilter}
                      onChange={(e) => setFtlSearchFilter(e.target.value)}
                      className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors ${
                        isDark ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    {ftlSearchFilter && (
                      <button
                        type="button"
                        onClick={() => setFtlSearchFilter('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* FTL Dockets List - flex-1 stretches to full equal height */}
                  {loadingConsignments ? (
                    <div className="flex-1 py-16 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                      <RotateCw className="w-5 h-5 text-purple-400 animate-spin" />
                      <span>Loading staged FTL dockets...</span>
                    </div>
                  ) : filteredFtlConsignments.length === 0 ? (
                    <div className="flex-1 py-12 flex flex-col items-center justify-center text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                        <Truck className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold">
                        {ftlConsignments.length === 0 ? 'No FTL Dockets Waiting for Dispatch' : 'No matching FTL consignments'}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        {ftlConsignments.length === 0
                          ? 'All FTL dockets have either been dispatched or no FTL dockets were booked at this dock.'
                          : 'Try changing your search terms or clearing the filter.'}
                      </p>
                      {ftlConsignments.length === 0 && (
                        <Link
                          href="/bookings"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold mt-2 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create FTL Bilty</span>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                      {filteredFtlConsignments.map((docket) => {
                        const isSelected = selectedFtlDocketId === docket.id;
                        return (
                          <div
                            key={docket.id}
                            onClick={() => handleSelectFtlDocket(docket)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? isDark
                                  ? 'bg-purple-950/40 border-purple-500/80 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50'
                                  : 'bg-purple-50/90 border-purple-500 shadow-md ring-1 ring-purple-400'
                                : isDark
                                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-mono font-black text-xs ${
                                    isSelected
                                      ? isDark ? 'text-purple-300' : 'text-purple-700'
                                      : isDark ? 'text-cyan-400' : 'text-blue-600'
                                  }`}>
                                    {docket.docket_number}
                                  </span>
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                    FTL DEDICATED
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    docket.priority === 'EXPRESS'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {docket.priority}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                                  <span>📅 {docket.booking_date ? new Date(docket.booking_date).toLocaleDateString('en-IN') : 'Recent'}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-emerald-500 dark:text-emerald-400">{docket.payment_type}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                                  ₹{Math.round(docket.amount).toLocaleString('en-IN')}
                                </div>
                                <div className={`text-[10px] font-bold mt-0.5 ${
                                  isSelected
                                    ? isDark ? 'text-purple-400' : 'text-purple-700'
                                    : 'text-slate-400'
                                }`}>
                                  {isSelected ? '✓ SELECTED' : 'Click to select'}
                                </div>
                              </div>
                            </div>

                            {/* Route Indicator */}
                            <div className="mt-2.5 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                              <div className="truncate flex-1">
                                <span className="text-[10px] text-slate-400 block leading-tight">ORIGIN</span>
                                <span className={`font-bold truncate text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {docket.origin_city || docket.origin}
                                </span>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mx-2" />
                              <div className="truncate flex-1 text-right">
                                <span className="text-[10px] text-slate-400 block leading-tight">DESTINATION</span>
                                <span className={`font-bold truncate text-[11px] ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
                                  {docket.destination_city || docket.destination}
                                </span>
                              </div>
                            </div>

                            {/* Parties & Cargo Details */}
                            <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Consignor (Sender):</span>
                                <span className="font-semibold truncate block" title={docket.shipper}>
                                  {docket.shipper}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Consignee (Receiver):</span>
                                <span className="font-semibold truncate block" title={docket.receiver}>
                                  {docket.receiver}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                              <span className="truncate max-w-[170px]" title={docket.items}>
                                📦 {docket.items}
                              </span>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                {docket.weight_t ? `${docket.weight_t.toFixed(1)} T` : `${docket.weight_kg} kg`} • {docket.packages} pkgs
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 7 Cols: Step 2 - Assign Dedicated Vehicle & Driver (Equal Height) */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-[640px]">
                {!selectedFtlDocket ? (
                  <div className={`p-8 sm:p-12 rounded-3xl border shadow-xl text-center space-y-4 flex flex-col items-center justify-center h-full ${
                    isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-inner">
                      <Truck className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1.5">
                      <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Step 1: Select an FTL Consignment Docket
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Please select an FTL consignment docket from the queue on the left. Once selected, you can allocate a dedicated company vehicle, attached truck, or hire a market vehicle, verify the direct point-to-point route, and dispatch the trip.
                      </p>
                    </div>
                    {filteredFtlConsignments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectFtlDocket(filteredFtlConsignments[0])}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                      >
                        <span>Select First Docket ({filteredFtlConsignments[0].docket_number})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between space-y-2.5 transition-all h-full ${
                    isDark ? 'bg-[#0B1020]/95 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    {/* Step 2 Header & Docket Summary Strip */}
                    <div className={`pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 ${
                      isDark ? 'border-slate-800/80' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-xl shrink-0 ${isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          {/* Line 1: Step Badge & Vehicle Header */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              STEP 2
                            </span>
                            <h2 className={`font-mono font-black text-xs sm:text-sm tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {currentVehicle?.vehicle_number || 'No Vehicle Selected'}
                            </h2>
                            {currentVehicle && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border flex items-center gap-1 ${getOwnershipBadge(currentVehicle.ownership).tagBg}`}>
                                <span>{getOwnershipBadge(currentVehicle.ownership).icon}</span>
                                <span>{getOwnershipBadge(currentVehicle.ownership).label}</span>
                              </span>
                            )}
                          </div>

                          {/* Line 2: Direct Dispatch, Route & Vehicle Rated Badge */}
                          <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5 flex-wrap`}>
                            <span>Direct dispatch:</span>
                            <span className="font-mono font-bold text-purple-500 dark:text-purple-300">{selectedFtlDocket.docket_number}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-400 dark:text-emerald-300">{selectedFtlDocket.origin_city || selectedFtlDocket.origin} ➔ {selectedFtlDocket.destination_city || selectedFtlDocket.destination}</span>
                            <span>•</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${isDark
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {maxVehicleWeightTons}T RATED • {activeTruckConfig.shortName || `${activeTruckConfig.feet}FT`}
                            </span>
                            {activeDriver && (
                              <span className={`ml-1.5 pl-1.5 border-l ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`}>
                                Driver: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{activeDriver.name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setMarketModalOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer self-start sm:self-end"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Hire Market Truck</span>
                        </button>

                        {/* Compact Workload & Capacity Strips (Single Low-Profile Row) */}
                        <div className="flex items-center sm:justify-end gap-1 font-mono text-[9px] font-bold flex-wrap">
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                            isFtlOvervolume
                              ? isDark
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                              : isDark
                                ? 'bg-slate-900/90 border-slate-800 text-cyan-400'
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>
                            <span className={`text-[8px] uppercase font-semibold ${isFtlOvervolume ? (isDark ? 'text-rose-400' : 'text-rose-600') : 'text-slate-400'}`}>
                              VOL:
                            </span>
                            <span>{ftlVolumeM3.toFixed(1)} / {maxVehicleVolumeM3.toFixed(1)} m³</span>
                            <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                              isFtlOvervolume
                                ? isDark ? 'bg-rose-500/30 text-rose-300' : 'bg-rose-200 text-rose-800'
                                : isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {ftlVolumeUtilizationPct}%
                            </span>
                          </div>

                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                            isFtlOverweight
                              ? isDark
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                              : isDark
                                ? 'bg-slate-900/90 border-slate-800 text-emerald-400'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            <span className={`text-[8px] uppercase font-semibold ${isFtlOverweight ? (isDark ? 'text-rose-400' : 'text-rose-600') : 'text-slate-400'}`}>
                              WT:
                            </span>
                            <span>{ftlWeightTons.toFixed(1)} / {maxVehicleWeightTons.toFixed(1)} T</span>
                            <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                              isFtlOverweight
                                ? isDark ? 'bg-rose-500/30 text-rose-300' : 'bg-rose-200 text-rose-800'
                                : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {ftlWeightUtilizationPct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clear, High-Efficiency Vehicle & Driver Assignment Toolbar */}
                    <div className={`p-3 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-3 items-center shrink-0 ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/90 border-slate-200 shadow-xs'
                    }`}>
                      {/* 1. Vehicle Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            1. Assigned Vehicle
                          </label>
                          {currentVehicle && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVehicleId('');
                                setSelectedDriverId('');
                                setTruckSearchQuery('');
                                setOverrideDriverSelection(false);
                              }}
                              className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              Change Truck
                            </button>
                          )}
                        </div>

                        {currentVehicle ? (
                          <div className={`h-11 px-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isDark ? 'bg-slate-950/80 border-purple-500/40 text-white' : 'bg-white border-purple-300 text-slate-900 shadow-xs'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Truck className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                              <div className="min-w-0 truncate">
                                <span className="font-mono font-black text-xs text-purple-500 dark:text-purple-300 mr-1.5">
                                  {currentVehicle.vehicle_number}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border mr-1.5 ${getOwnershipBadge(currentVehicle.ownership).tagBg}`}>
                                  {getOwnershipBadge(currentVehicle.ownership).shortLabel}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {activeTruckConfig.shortName || `${activeTruckConfig.feet}FT`} • {maxVehicleWeightTons}T
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVehicleId('');
                                setSelectedDriverId('');
                                setTruckSearchQuery('');
                                setOverrideDriverSelection(false);
                              }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                              title="Deselect truck"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              <Search className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              value={truckSearchQuery}
                              onChange={(e) => {
                                setTruckSearchQuery(e.target.value);
                                setTruckDropdownOpen(true);
                              }}
                              onFocus={() => setTruckDropdownOpen(true)}
                              placeholder="Search fleet / market truck (e.g. DL-01, RJ-14)..."
                              className={`w-full h-11 pl-9 pr-8 rounded-xl text-xs font-mono font-medium border focus:outline-none transition-all ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-400'
                                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-600 shadow-xs'
                              }`}
                            />
                            {truckSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setTruckSearchQuery('')}
                                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {truckDropdownOpen && (
                              <div className={`absolute z-30 mt-1 w-full rounded-2xl border shadow-2xl overflow-hidden max-h-72 overflow-y-auto ${
                                isDark ? 'bg-[#0E1526] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}>
                                <div className={`p-2 border-b text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                                  isDark ? 'border-slate-800 text-slate-400 bg-slate-900/50' : 'border-slate-200 text-slate-600 bg-slate-50'
                                }`}>
                                  <span>Available Fleet Vehicles ({filteredVehicles.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => setTruckDropdownOpen(false)}
                                    className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>

                                {filteredVehicles.length > 0 ? (
                                  <div className="p-1 space-y-1">
                                    {filteredVehicles.map((v) => {
                                      const badge = getOwnershipBadge(v.ownership);
                                      const isSelected = v.id === selectedVehicleId;
                                      return (
                                        <div
                                          key={v.id}
                                          onClick={() => handleSelectVehicle(v)}
                                          className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                                            isSelected
                                              ? isDark ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'bg-purple-50 border border-purple-200 text-purple-900'
                                              : isDark ? 'hover:bg-slate-800/80 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <Truck className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className={`font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                  {v.vehicle_number}
                                                </span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.tagBg}`}>
                                                  {badge.shortLabel}
                                                </span>
                                                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>
                                                  {v.length_ft || 19}FT • {v.capacity_ton || 9.5}T
                                                </span>
                                              </div>
                                              <div className={`text-[10px] flex items-center gap-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                                                {v.assignedDriver ? (
                                                  <span>👤 {v.assignedDriver.name}</span>
                                                ) : (
                                                  <span className={isDark ? 'text-amber-400/90' : 'text-amber-700 font-semibold'}>⚠️ Unassigned Driver</span>
                                                )}
                                                <span>•</span>
                                                <span className={v.status === 'AVAILABLE' ? (isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold') : 'text-slate-500'}>
                                                  {v.status || 'AVAILABLE'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          {isSelected && <Check className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="p-4 text-center space-y-2">
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No vehicle found matching "{truckSearchQuery}"</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMarketForm((prev) => ({ ...prev, vehicle_number: truckSearchQuery.toUpperCase() }));
                                        setMarketModalOpen(true);
                                        setTruckDropdownOpen(false);
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Hire "{truckSearchQuery.toUpperCase()}" as Market Truck</span>
                                    </button>
                                  </div>
                                )}

                                <div className={`p-2 border-t ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMarketModalOpen(true);
                                      setTruckDropdownOpen(false);
                                    }}
                                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                      isDark
                                        ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
                                        : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Hire / Add New Market Truck</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. Driver Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            2. Assigned Driver
                          </label>
                          {activeDriver && !overrideDriverSelection && (
                            <button
                              type="button"
                              onClick={() => setOverrideDriverSelection(true)}
                              className="text-[10px] font-bold text-slate-400 hover:text-purple-400 cursor-pointer"
                            >
                              Change Driver
                            </button>
                          )}
                        </div>

                        {activeDriver && !overrideDriverSelection ? (
                          <div className={`h-11 px-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs shrink-0">👤</span>
                              <div className="truncate">
                                <span className="text-xs font-bold truncate block">{activeDriver.name}</span>
                                {activeDriver.phone && <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">{activeDriver.phone}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOverrideDriverSelection(true)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors shrink-0 cursor-pointer ${
                                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              Switch
                            </button>
                          </div>
                        ) : (
                          <div className={`h-11 pl-3 pr-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus-within:border-purple-400'
                              : 'bg-white border-slate-300 text-slate-900 focus-within:border-purple-600 shadow-xs'
                          }`}>
                            <select
                              value={selectedDriverId}
                              onChange={(e) => {
                                setSelectedDriverId(e.target.value);
                                setOverrideDriverSelection(false);
                              }}
                              className={`h-full flex-1 min-w-0 bg-transparent text-xs font-medium focus:outline-none transition-all truncate border-none outline-none cursor-pointer ${
                                isDark ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              <option value="" className={isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-900'}>-- Choose Driver --</option>
                              {drivers
                                .filter((d) => {
                                  const effOrigin = modalOriginBranchId || selectedFtlDocket.origin_branch_id;
                                  return !d.branch_id || !effOrigin || d.branch_id === effOrigin;
                                })
                                .map((d) => (
                                  <option key={d.id} value={d.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                                    {d.name} ({d.phone || 'Driver'})
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setDriverModalOpen(true)}
                              className="h-8 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-purple-600/25 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>New</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3D Cutaway Container Loading Visualizer */}
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner flex-1 flex flex-col justify-center">
                      <Truck3DViewer
                        currentVehicle={currentVehicle}
                        loadedItems={ftlLoadedItems}
                        selectedFeet={selectedFeet}
                        onFeetChange={(newFeet) => setSelectedFeet(newFeet)}
                        isDark={isDark}
                        isFtl={true}
                      />
                    </div>

                    {/* Dispatch Action Footer */}
                    <div className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs">
                            <span className="text-slate-400">Total Trip Freight: </span>
                            <strong className="text-emerald-500 font-mono text-sm">₹{Math.round(selectedFtlDocket.amount).toLocaleString('en-IN')}</strong>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            Direct Point-to-Point • {ftlWeightTons.toFixed(1)}T ({selectedFtlDocket.packages} Pkgs)
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenDispatchModal}
                        disabled={!selectedVehicleId || !selectedDriverId}
                        title={!selectedVehicleId ? 'Please allocate a vehicle first' : !selectedDriverId ? 'Please assign a driver first' : 'Lock & Confirm Dedicated FTL Trip'}
                        className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-purple-500/25 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Lock & Confirm Dedicated FTL Trip ➔</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Market Hired Truck Onboarding Modal */}
      {marketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
          <div className={`relative w-full max-w-lg max-h-[85vh] sm:max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Pinned Header */}
            <div className={`flex items-center justify-between border-b px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 ${isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-white'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-200'
                  }`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Hire Market Truck</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Onboard hired market truck & driver for immediate trip</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMarketModalOpen(false)}
                className={`p-1.5 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMarketVehicle} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {marketError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{marketError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Vehicle Number */}
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                        Vehicle Registration Number*
                      </label>
                      {marketForm.vehicle_number && (
                        <span className={`text-[10px] font-semibold ${marketForm.vehicle_number.trim().length >= 5 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-amber-400' : 'text-amber-700')
                          }`}>
                          {marketForm.vehicle_number.trim().length >= 5 ? '✓ Valid Plate' : 'Min 5 characters'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      value={marketForm.vehicle_number}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
                        setMarketForm({ ...marketForm, vehicle_number: val });
                      }}
                      placeholder="e.g. HR-55-AY-8724 or HR-55-AZ-6141"
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>

                  {/* Ownership Type */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Truck Ownership*
                    </label>
                    <select
                      value="MARKET"
                      disabled
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-not-allowed ${isDark
                          ? 'bg-slate-900 border-slate-700 text-purple-300'
                          : 'bg-purple-50/70 border-purple-200 text-purple-800 shadow-xs'
                        }`}
                    >
                      <option value="MARKET">🚛 Market Hired (Ad-Hoc)</option>
                    </select>
                  </div>

                  {/* Truck Size & Body Length */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Body Size & Rating*
                    </label>
                    <select
                      value={marketForm.truck_size_feet}
                      onChange={(e) => {
                        const feet = e.target.value;
                        const cap = feet === '32' ? '16.0' : feet === '24' ? '12.0' : feet === '19' ? '9.5' : feet === '14' ? '5.5' : '3.5';
                        setMarketForm({ ...marketForm, truck_size_feet: feet, capacity_ton: cap });
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    >
                      <option value="11">11 Feet (3.5T Rated Mini Truck)</option>
                      <option value="14">14 Feet (5.5T Rated LCV)</option>
                      <option value="19">19 Feet (9.5T Rated ICV)</option>
                      <option value="24">24 Feet (12.0T Rated Heavy)</option>
                      <option value="32">32 Feet (16.0T Multi-Axle Container)</option>
                    </select>
                  </div>

                  {/* Driver Name */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Driver Full Name
                    </label>
                    <input
                      type="text"
                      value={marketForm.driver_name}
                      onChange={(e) => setMarketForm({ ...marketForm, driver_name: e.target.value })}
                      placeholder="e.g. Satish Kumar"
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>

                  {/* Driver Mobile */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                        Driver Mobile Number
                      </label>
                      {marketForm.driver_phone && (
                        <span className={`text-[10px] font-semibold ${marketForm.driver_phone.length === 10 && /^[6-9]/.test(marketForm.driver_phone)
                            ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                            : !/^[6-9]/.test(marketForm.driver_phone)
                              ? (isDark ? 'text-rose-400' : 'text-rose-700')
                              : (isDark ? 'text-amber-400' : 'text-amber-700')
                          }`}>
                          {marketForm.driver_phone.length === 10
                            ? /^[6-9]/.test(marketForm.driver_phone) ? '✓ Valid Mobile' : '⚠️ Must start with 6-9'
                            : `${10 - marketForm.driver_phone.length} digits left`}
                        </span>
                      )}
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={marketForm.driver_phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMarketForm({ ...marketForm, driver_phone: val });
                      }}
                      placeholder="10 digits (e.g. 9876543210)"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono transition-all ${marketForm.driver_phone && (!/^[6-9]/.test(marketForm.driver_phone) || marketForm.driver_phone.length < 10)
                          ? 'border-amber-500/60 focus:border-amber-400'
                          : isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>

                  {/* Broker / Transporter Name */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Broker / Transporter Name
                    </label>
                    <input
                      type="text"
                      value={marketForm.owner_name}
                      onChange={(e) => setMarketForm({ ...marketForm, owner_name: e.target.value })}
                      placeholder="e.g. Associated Transporter / Fleet Vendor"
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>

                  {/* Broker Mobile Number */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                        Broker Mobile (Optional)
                      </label>
                      {marketForm.owner_phone && (
                        <span className={`text-[10px] font-semibold ${marketForm.owner_phone.length === 10 && /^[6-9]/.test(marketForm.owner_phone)
                            ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                            : !/^[6-9]/.test(marketForm.owner_phone)
                              ? (isDark ? 'text-rose-400' : 'text-rose-700')
                              : (isDark ? 'text-amber-400' : 'text-amber-700')
                          }`}>
                          {marketForm.owner_phone.length === 10
                            ? /^[6-9]/.test(marketForm.owner_phone) ? '✓ Valid Mobile' : '⚠️ Must start with 6-9'
                            : `${10 - marketForm.owner_phone.length} digits left`}
                        </span>
                      )}
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={marketForm.owner_phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMarketForm({ ...marketForm, owner_phone: val });
                      }}
                      placeholder="10 digits (e.g. 9811223344)"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono transition-all ${marketForm.owner_phone && (!/^[6-9]/.test(marketForm.owner_phone) || marketForm.owner_phone.length < 10)
                          ? 'border-amber-500/60 focus:border-amber-400'
                          : isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>

                  {/* Current Odometer & Vehicle Charge (Agreed Hire) */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Current Odometer (KM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={marketForm.current_odometer}
                      onChange={(e) => setMarketForm({ ...marketForm, current_odometer: e.target.value })}
                      placeholder="e.g. 45000"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>

                  {/* Vehicle Charge (Agreed Hire Amount) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                        Vehicle Charge (Agreed Hire ₹)*
                      </label>
                      <span className="text-[10px] text-purple-500 font-bold">Total Trip Rate</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={marketForm.vehicle_charge}
                        onChange={(e) => setMarketForm({ ...marketForm, vehicle_charge: e.target.value })}
                        placeholder="e.g. 25000"
                        className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs border font-mono font-bold focus:outline-none transition-all ${isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-400'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 shadow-sm'
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className={`flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 border-t shrink-0 ${isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-slate-50'
                }`}>
                <button
                  type="button"
                  onClick={() => setMarketModalOpen(false)}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-bold transition-all text-center ${isDark
                      ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMarket}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {submittingMarket && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Onboard & Assign to Trip</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Driver Modal */}
      {driverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
          <div className={`relative w-full max-w-md max-h-[85vh] sm:max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 ${isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-white'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-blue-600/20 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-600 border-blue-200'
                  }`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Register New Driver</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Quick driver enrollment for vehicle assignment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDriverModalOpen(false)}
                className={`p-1.5 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickDriver} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
                {driverError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{driverError}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                    Driver Full Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    placeholder="e.g. Ram Singh"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-all ${isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                      }`}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Mobile Number*
                    </label>
                    {driverForm.phone && (
                      <span className={`text-[10px] font-semibold ${driverForm.phone.length === 10 && /^[6-9]/.test(driverForm.phone)
                          ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                          : !/^[6-9]/.test(driverForm.phone)
                            ? (isDark ? 'text-rose-400' : 'text-rose-700')
                            : (isDark ? 'text-amber-400' : 'text-amber-700')
                        }`}>
                        {driverForm.phone.length === 10
                          ? /^[6-9]/.test(driverForm.phone) ? '✓ Valid Mobile' : '⚠️ Must start with 6-9'
                          : `${10 - driverForm.phone.length} digits left`}
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={driverForm.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setDriverForm({ ...driverForm, phone: val });
                    }}
                    placeholder="10-digit number (e.g. 9811234567)"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition-all ${driverForm.phone && (!/^[6-9]/.test(driverForm.phone) || driverForm.phone.length < 10)
                        ? 'border-amber-500/60 focus:border-amber-400'
                        : isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                      }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                    Driver License # *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.license_number}
                    onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. DL0420220019283"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-all ${isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                      }`}
                  />
                </div>
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className={`flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 border-t shrink-0 ${isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-slate-50'
                }`}>
                <button
                  type="button"
                  onClick={() => setDriverModalOpen(false)}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-bold transition-all text-center ${isDark
                      ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDriver}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {submittingDriver && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Assign Driver</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Confirm Dispatch & Seal Truck Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
          <div className={`relative w-full max-w-xl max-h-[85vh] sm:max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Pinned Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-white'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  operationMode === 'FTL'
                    ? isDark ? 'bg-purple-600/20 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                    : isDark ? 'bg-blue-600/20 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {operationMode === 'FTL' ? <Lock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {operationMode === 'FTL' ? 'Dedicated FTL Trip Manifest & Seal Lock' : 'Generate Dispatch Manifest'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    {operationMode === 'FTL'
                      ? 'Confirm departure/delivery hubs, container seal number, odometer and driver advance'
                      : 'Lock truck seal, assign driver, and generate trip sheet'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDriverAdvance('');
                  setAdvanceMode('');
                  setDispatchModalOpen(false);
                }}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Load Overview Summary Strip */}
              <div className={`p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-sm ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle</p>
                  <p className={`text-xs font-black mt-0.5 font-mono ${isDark ? 'text-cyan-400' : 'text-slate-900'}`}>{currentVehicle?.vehicle_number || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {operationMode === 'FTL' ? 'FTL Consignment' : 'Loaded Dockets'}
                  </p>
                  <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900 font-extrabold'}`}>
                    {operationMode === 'FTL' ? selectedFtlDocket?.docket_number : `${loadedItems.length} LRs (${loadedPackages} Pkgs)`}
                  </p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Weight</p>
                  <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-extrabold'}`}>
                    {operationMode === 'FTL' ? `${ftlWeightTons.toFixed(2)} Tons` : `${loadedWeight.toFixed(2)} Tons`}
                  </p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {operationMode === 'FTL' ? 'Trip Freight' : 'Trip Revenue'}
                  </p>
                  <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-purple-400' : 'text-purple-700 font-extrabold'}`}>
                    ₹{Math.round(operationMode === 'FTL' ? (selectedFtlDocket?.amount || 0) : loadedFreightRevenue).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Origin Departure */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between h-5">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                        Origin Departure*
                      </label>
                    </div>
                    <select
                      value={modalOriginBranchId}
                      onChange={(e) => {
                        const newOrigin = e.target.value;
                        setModalOriginBranchId(newOrigin);
                        if (destBranchId === newOrigin) {
                          setDestBranchId('');
                        }
                        if (selectedDriverId) {
                          const curD = drivers.find((d) => d.id === selectedDriverId);
                          if (curD && curD.branch_id && curD.branch_id !== newOrigin) {
                            setSelectedDriverId('');
                          }
                        }
                      }}
                      className={`w-full h-10 px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          [{b.branch_code || 'CODE'}] {b.branch_name} {b.is_hub ? '(Hub)' : ''} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                          {b.id === loginBranchId ? ' (Login Hub)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between h-5">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                        Destination*
                      </label>
                      {!destBranchId ? (
                        <span className="text-[10px] font-bold text-amber-500 animate-pulse">
                          ⚠️ Please Select
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-500">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    <select
                      value={destBranchId}
                      onChange={(e) => setDestBranchId(e.target.value)}
                      required
                      className={`w-full h-10 px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${!destBranchId
                          ? (isDark
                            ? 'bg-slate-900 border-amber-500/60 text-amber-300 focus:border-amber-400 ring-1 ring-amber-500/20'
                            : 'bg-amber-50/60 border-amber-400 text-slate-800 focus:border-amber-500 ring-1 ring-amber-400/20 shadow-sm')
                          : (isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm')
                        }`}
                    >
                      <option value="" className={isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500'}>
                        -- Select Destination --
                      </option>
                      {branches.filter((b) => b.id !== modalOriginBranchId).map((b) => (
                        <option key={b.id} value={b.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          [{b.branch_code || 'CODE'}] {b.branch_name} {b.is_hub ? '(Hub)' : ''} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assigned Certified Driver */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Assigned Driver*
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    >
                      <option value="">Select Certified Driver</option>
                      {drivers
                        .filter((d) => !d.branch_id || !modalOriginBranchId || d.branch_id === modalOriginBranchId)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.phone || 'Driver'}) {d.branch?.branch_name ? `• [${d.branch.branch_name}]` : '• [Yard]'}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Container Seal Number */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Container Seal #*
                    </label>
                    <input
                      type="text"
                      value={sealNumber}
                      onChange={(e) => setSealNumber(e.target.value)}
                      placeholder="e.g. SEAL-88192"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-medium focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>

                  {/* Current / Starting Odometer */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                      Starting Odometer (KM)*
                    </label>
                    <input
                      type="number"
                      value={startOdometer}
                      onChange={(e) => setStartOdometer(e.target.value)}
                      placeholder="e.g. 45210"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-medium focus:outline-none transition-all ${isDark
                          ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                        }`}
                    />
                  </div>
                </div>

                {/* Vehicle Charge for Market Hired or Vendor Attached Vehicles */}
                {(() => {
                  const ownType = (currentVehicle?.ownership || 'OWN').toUpperCase();
                  const isMarketOrAttached = ownType === 'MARKET' || ownType === 'ATTACHED';

                  if (isMarketOrAttached) {
                    return (
                      <div className={`p-3.5 rounded-xl border ${
                        isDark ? 'bg-purple-950/20 border-purple-800/50' : 'bg-purple-50/70 border-purple-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            isDark ? 'text-purple-400' : 'text-purple-800'
                          }`}>
                            <span>🚛</span> Vehicle Charge (Agreed Hire Rate) *
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                            {ownType === 'MARKET' ? 'Market Hired Truck' : 'Vendor Attached Truck'}
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={dispatchVehicleCharge}
                            onChange={(e) => setDispatchVehicleCharge(e.target.value)}
                            placeholder="e.g. 25000"
                            className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-all ${
                              isDark
                                ? 'bg-slate-950 border-purple-700/60 text-white placeholder:text-slate-500 focus:border-purple-400'
                                : 'bg-white border-purple-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 shadow-sm'
                            }`}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Advances and company-paid fuel/expenses will be deducted from this vehicle charge upon final trip settlement.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className={`p-2.5 px-3.5 rounded-xl border flex items-center justify-between text-xs ${
                      isDark ? 'bg-cyan-950/15 border-cyan-800/40 text-cyan-300' : 'bg-blue-50/60 border-blue-200 text-blue-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span>🏢</span>
                        <span className="font-bold">Company Owned Fleet</span>
                      </div>
                      <span className="text-[11px] opacity-80 font-medium">
                        Direct vehicle — vehicle charge not applicable
                      </span>
                    </div>
                  );
                })()}

                {/* Driver Cash/Fuel Advance & Expenses Disbursal */}
                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-blue-50/50 border-blue-200/60'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-blue-700'
                      }`}>
                      <span>💵</span> Driver Advance & Disbursed Expenses
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Handed over at dock dispatch
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                        Driver Advance Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={driverAdvance}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDriverAdvance(val);
                            if (!val || parseFloat(val) <= 0) {
                              setAdvanceMode('');
                            }
                          }}
                          placeholder="0"
                          className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-all ${isDark
                              ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className={`text-[11px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                          Payment Disbursal Mode
                        </label>
                        {parseFloat(driverAdvance) > 0 && !advanceMode && (
                          <span className="text-[10px] font-bold text-amber-500 animate-pulse">
                            ⚠️ Select Mode
                          </span>
                        )}
                      </div>
                      <select
                        value={advanceMode}
                        onChange={(e) => setAdvanceMode(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition-all ${parseFloat(driverAdvance) > 0 && !advanceMode
                            ? (isDark
                              ? 'bg-slate-950 border-amber-500/60 text-amber-300 focus:border-amber-400 ring-1 ring-amber-500/20'
                              : 'bg-amber-50/60 border-amber-400 text-slate-800 focus:border-amber-500 ring-1 ring-amber-400/20 shadow-sm')
                            : (isDark
                              ? 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm')
                          }`}
                      >
                        <option value="" className={isDark ? 'bg-slate-950 text-slate-400' : 'bg-white text-slate-500'}>
                          -- Select Payment Mode --
                        </option>
                        <option value="CASH">Cash in Hand</option>
                        <option value="UPI">UPI / Digital (GPay/PhonePe)</option>
                        <option value="FUEL_CARD">Fuel Card (Diesel Advance)</option>
                        <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dispatch Remarks */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                    Gate Pass / Dispatch Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchRemarks}
                    onChange={(e) => setDispatchRemarks(e.target.value)}
                    placeholder="e.g. Cleared dock inspection. Driver instructed via Expressway route."
                    className={`w-full p-2.5 rounded-xl text-xs border font-medium focus:outline-none transition-all ${isDark
                        ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* Pinned Footer Actions */}
            <div className={`flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 border-t shrink-0 ${isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-slate-50'
              }`}>
              <button
                type="button"
                onClick={() => {
                  setDriverAdvance('');
                  setAdvanceMode('');
                  setDispatchModalOpen(false);
                }}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${isDark
                    ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                  }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={dispatching || !destBranchId || !selectedDriverId}
                onClick={operationMode === 'FTL' ? handleDispatchFtl : handleConfirmDispatch}
                title={!destBranchId ? 'Please select a destination hub first' : !selectedDriverId ? 'Please select a driver first' : 'Authorize & Dispatch'}
                className={`w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  operationMode === 'FTL'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-cyan-500/20'
                }`}
              >
                {dispatching && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{operationMode === 'FTL' ? 'Authorize & Dispatch Dedicated FTL Trip ➔' : 'Authorize & Dispatch Truck'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Dispatch Success Modal */}
      {successResult && (
        <div
          onClick={handleCloseSuccessModal}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 text-center space-y-4 cursor-default ${
              isDark ? 'bg-[#0E1526] border-emerald-500/40 text-white' : 'bg-white border-emerald-500/40 text-slate-900'
            }`}
          >
            {/* Manual Close 'X' Button */}
            <button
              type="button"
              onClick={handleCloseSuccessModal}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top Auto-Close Countdown Progress Bar */}
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(successCountdown / 10) * 100}%` }}
              />
            </div>

            <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className={`text-lg font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Truck Dispatched Successfully!
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Trip manifest & gate pass generated atomically in database
              </p>
              <p className={`text-[11px] mt-1.5 flex items-center justify-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span>Auto-closing in</span>
                <span className="font-mono font-bold text-emerald-500 dark:text-emerald-400">{successCountdown}s</span>
                <span className="text-slate-400">• or close anytime</span>
              </p>
            </div>

            <div className={`p-4 rounded-2xl border text-left space-y-2.5 text-xs font-mono shadow-sm ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>Trip Code:</span>
                <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{successResult.tripNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>Dispatch Challan:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{successResult.dispatchNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>Vehicle Assigned:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{successResult.vehicleNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>En-Route Destination:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{successResult.destination}</span>
              </div>
              <div className={`flex justify-between items-center border-t pt-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>Cargo Handled:</span>
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {successResult.packagesCount} Pkgs ({successResult.totalWeight} T)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-3">
              <button
                type="button"
                onClick={handleCloseSuccessModal}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isDark
                    ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-sm'
                  }`}
              >
                Close ({successCountdown}s)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseSuccessModal();
                  router.push('/trips');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>View in Trips</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
