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
import { useStore } from '../../../store/useStore';
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

  // Staged Item Selection State: Set of consignment IDs currently loaded into the truck
  const [loadedIds, setLoadedIds] = useState(new Set());

  // Dispatch Confirmation Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [startOdometer, setStartOdometer] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [dispatchRemarks, setDispatchRemarks] = useState('');
  const [driverAdvance, setDriverAdvance] = useState('');
  const [advanceMode, setAdvanceMode] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

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
        limit: 100,
      };
      if (effectiveBranchId && effectiveBranchId !== 'ALL') {
        params.branch_id = effectiveBranchId;
        params.origin_branch_id = effectiveBranchId;
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

          // For branch manager, strictly ensure origin branch matches
          if (isRestrictedBranchUser && userBranchId) {
            if (c.origin_branch_id && c.origin_branch_id !== userBranchId) return false;
          }
          return true;
        })
        .map((c, index) => {
          const weightKg = parseFloat(c.actual_weight || c.charged_weight || 0);
          const weightTons = weightKg > 0 ? parseFloat((weightKg / 1000).toFixed(2)) : 0.5;
          // Estimate volume from packages or weight: approx 1 Ton ~= 2.5 m3
          const volumeM3 = parseFloat((weightTons * 2.5).toFixed(1)) || 1.2;

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
          };
        });

      setStagedConsignments(formatted);

      // Keep valid selected items or pre-select first 2
      setLoadedIds((prev) => {
        const next = new Set();
        prev.forEach((id) => {
          if (formatted.some((item) => item.id === id)) {
            next.add(id);
          }
        });
        if (next.size === 0 && formatted.length > 0) {
          formatted.slice(0, 2).forEach((item) => next.add(item.id));
        }
        return next;
      });
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

  // Filtered consignments for table search
  const filteredConsignments = useMemo(() => {
    if (!searchFilter.trim()) return stagedConsignments;
    const q = searchFilter.toLowerCase();
    return stagedConsignments.filter((c) => {
      return (
        c.docket_number.toLowerCase().includes(q) ||
        c.shipper.toLowerCase().includes(q) ||
        c.receiver.toLowerCase().includes(q) ||
        (c.origin_city && c.origin_city.toLowerCase().includes(q)) ||
        (c.destination_city && c.destination_city.toLowerCase().includes(q))
      );
    });
  }, [stagedConsignments, searchFilter]);

  const toggleSelectAll = () => {
    if (!selectedVehicleId) {
      alert('Please search or select a vehicle in Step 1 before planning cargo.');
      return;
    }
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

    if (v.assignedDriver?.id) {
      setSelectedDriverId(v.assignedDriver.id);
    } else if (v.assigned_driver_id) {
      setSelectedDriverId(v.assigned_driver_id);
    } else {
      setSelectedDriverId('');
    }

    if (v.current_odometer) {
      setStartOdometer(v.current_odometer.toString());
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
      setMarketError('Vehicle registration number is too short (e.g. HR-55-AB-9876).');
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
      const payload = {
        ...marketForm,
        vehicle_number: cleanPlate,
        driver_name: driverName,
        driver_phone: cleanDriverPhone,
        owner_phone: cleanOwnerPhone,
      };

      const res = await api.post('/fleet/vehicles/market-hire', payload);
      const newVeh = res.data?.data;
      if (newVeh) {
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

    setSubmittingDriver(true);
    try {
      const payload = {
        name: cleanName,
        phone: cleanPhone,
        license_number: (driverForm.license_number || '').trim().toUpperCase() || `DL-${cleanPhone.slice(-6)}`,
        status: 'ACTIVE',
      };
      const res = await api.post('/fleet/drivers', payload);
      const newDriver = res.data?.data;
      if (newDriver) {
        setDrivers((prev) => [newDriver, ...prev]);
        setSelectedDriverId(newDriver.id);

        if (currentVehicle) {
          api.put(`/fleet/vehicles/${currentVehicle.id}`, { assigned_driver_id: newDriver.id }).catch(() => {});
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

  // Loaded Items & Aggregate Stats
  const loadedItems = useMemo(() => {
    return stagedConsignments.filter((i) => loadedIds.has(i.id));
  }, [stagedConsignments, loadedIds]);

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

  // Toggle load selection
  const toggleLoad = (id) => {
    if (!selectedVehicleId) {
      alert('Please search or select a vehicle in Step 1 before planning cargo.');
      return;
    }
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
      };

      const res = await api.post('/trips/dispatch', payload);
      const tripData = res.data?.data || {};

      setDispatchModalOpen(false);
      setSuccessResult({
        tripNumber: tripData.trip_number || `TRP-${new Date().getFullYear()}-001`,
        dispatchNumber: tripData.dispatches?.[0]?.dispatch_number || `DISP-${Date.now().toString().slice(-5)}`,
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

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
          
          {/* Header Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 shrink-0">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      Load Planning & Dispatch Operations
                    </h1>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      Live Operations
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Photorealistic 3D cargo stowage, fleet allocation, and trip manifest dispatch.
                  </p>
                </div>
              </div>
            </div>

            {/* Branch Context & Operational Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Branch Selector */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 shrink-0">Origin Dock:</span>
                  {isRestrictedBranchUser ? (
                    <span className={`font-bold text-xs max-w-[240px] truncate ${
                      isDark ? 'text-cyan-300' : 'text-blue-700'
                    }`}>
                      {userAssignedBranch?.branch_code ? `[${userAssignedBranch.branch_code}] ` : ''}{userAssignedBranch?.branch_name || user?.branchName || 'Assigned Branch'} {userAssignedBranch?.city ? `• ${userAssignedBranch.city}` : ''}
                    </span>
                  ) : (
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className={`bg-transparent font-bold focus:outline-none cursor-pointer text-xs max-w-[260px] truncate ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      <option value="ALL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        🌐 All Docks & Branches (Company-Wide)
                      </option>
                      {selectableBranches.map((b) => (
                        <option key={b.id} value={b.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          [{b.branch_code || 'CODE'}] {b.branch_name} {b.is_hub ? '(Hub)' : ''} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Confirm & Dispatch Truck Button */}
              <button
                onClick={handleOpenDispatchModal}
                disabled={loadedItems.length === 0}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>

          {/* Operational KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Staged Dockets</div>
              <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stagedConsignments.length}
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
              <div className={`text-2xl font-black font-mono ${
                isOverweight ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'
              }`}>
                {weightUtilizationPct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                {loadedWeight.toFixed(1)} / {maxVehicleWeightTons.toFixed(1)} Tons
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Volume Capacity</div>
              <div className={`text-2xl font-black font-mono ${
                isOvervolume ? 'text-rose-500' : 'text-amber-500 dark:text-amber-400'
              }`}>
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

          {/* STEP 1: VEHICLE & DRIVER DISPATCH ALLOCATION (Transporter Pre-Loading Unit) */}
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl relative transition-all ${
            isDark ? 'bg-[#0B1020]/95 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
              isDark ? 'border-slate-800/80' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-black text-xs shrink-0">
                  01
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      STEP 1 OF 2
                    </span>
                    <h2 className={`text-sm sm:text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Select Truck & Confirm Driver
                    </h2>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Choose from company fleet, attached trucks, or hire a market vehicle before stowing cargo.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Market Hire & Quick Driver */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMarketModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Hire Market Truck</span>
                </button>
              </div>
            </div>

            {/* Selection Grid: Search Combobox & Quick Selector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 items-start">
              
              {/* Searchable Truck Dropdown (5 Cols) */}
              <div className="lg:col-span-5 relative">
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  Search Vehicle (Plate #, Size, Driver)
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
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
                    placeholder="Search truck number (e.g. DL-01, 5510, RJ-14)..."
                    className={`w-full h-[60px] pl-9 pr-8 rounded-2xl text-xs font-mono font-medium border focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                  {truckSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTruckSearchQuery('')}
                      className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                        isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Combobox Dropdown Results */}
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
                                  ? isDark ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-blue-50 border border-blue-200 text-blue-900'
                                  : isDark ? 'hover:bg-slate-800/80 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Truck className={`w-4 h-4 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
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
                              {isSelected && <Check className={`w-4 h-4 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />}
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
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Hire "{truckSearchQuery.toUpperCase()}" as Market Truck</span>
                        </button>
                      </div>
                    )}

                    {/* Bottom Action in dropdown */}
                    <div className={`p-2 border-t ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setMarketModalOpen(true);
                          setTruckDropdownOpen(false);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
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

              {/* Verified Active Vehicle & Driver Badge (7 Cols) */}
              <div className="lg:col-span-7">
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  Selected Vehicle & Driver Allocation
                </label>
                {currentVehicle ? (
                  <div className={`min-h-[60px] px-3.5 py-2 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-sm ${
                    isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    {/* Vehicle Identity */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono font-black text-sm tracking-wide shrink-0 ${
                          isDark ? 'text-cyan-400' : 'text-slate-900'
                        }`}>
                          {currentVehicle.vehicle_number}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${getOwnershipBadge(currentVehicle.ownership).tagBg}`}>
                          <span>{getOwnershipBadge(currentVehicle.ownership).icon}</span>
                          <span>{getOwnershipBadge(currentVehicle.ownership).label}</span>
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-extrabold border shrink-0 ${
                          isDark ? 'bg-blue-500/20 text-cyan-300 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {activeTruckConfig.feet}FT • {maxVehicleWeightTons}T RATED
                        </span>
                      </div>
                      <div className={`text-[10px] leading-tight flex items-center gap-1.5 mt-1 truncate ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        <span>Body: <strong className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{activeTruckConfig.name}</strong></span>
                        <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>•</span>
                        <span>Max Vol: <strong className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{maxVehicleVolumeM3.toFixed(1)} m³</strong></span>
                      </div>
                    </div>

                    {/* Driver Status & Selector + Clear Control */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-2.5 py-1.5 rounded-xl border text-xs shrink-0 transition-all flex flex-col justify-center ${
                        activeDriver
                          ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-xs'
                          : isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between gap-1.5 leading-none">
                          <div className={`flex items-center gap-1 font-bold text-[10px] ${
                            activeDriver
                              ? isDark ? 'text-emerald-400' : 'text-emerald-800'
                              : isDark ? 'text-amber-400' : 'text-amber-800'
                          }`}>
                            <User className="w-3 h-3" />
                            <span>{activeDriver ? 'Driver:' : 'Driver Needed:'}</span>
                          </div>
                          {isDriverPreAssigned && !overrideDriverSelection && (
                            <span className={`text-[8px] font-bold px-1 py-0.2 rounded border flex items-center gap-0.5 ${
                              isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              <span>🔒 Pre-Assigned</span>
                            </span>
                          )}
                        </div>

                        {activeDriver && !overrideDriverSelection ? (
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1.5 text-[11px] leading-tight">
                              <span className={`font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
                                {activeDriver.name}
                              </span>
                              {activeDriver.phone && (
                                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-emerald-800/80 font-medium'}`}>
                                  ({activeDriver.phone})
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setOverrideDriverSelection(true)}
                              className={`text-[10px] underline font-semibold transition-colors shrink-0 ${
                                isDark ? 'text-slate-400 hover:text-white' : 'text-emerald-700 hover:text-emerald-950'
                              }`}
                            >
                              Switch
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={selectedDriverId}
                                onChange={(e) => {
                                  setSelectedDriverId(e.target.value);
                                  setOverrideDriverSelection(false);
                                }}
                                className={`h-6 px-2 rounded-lg text-xs border font-medium focus:outline-none max-w-[130px] sm:max-w-[150px] truncate ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                                }`}
                              >
                                <option value="">-- Choose Driver --</option>
                                {drivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name} ({d.phone})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setDriverModalOpen(true)}
                                title="Add new driver"
                                className="h-6 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 flex items-center justify-center shadow-xs"
                              >
                                + New
                              </button>
                            </div>
                            {isDriverPreAssigned && (
                              <button
                                type="button"
                                onClick={() => setOverrideDriverSelection(false)}
                                className={`text-[9px] hover:underline block mt-0.5 leading-none ${
                                  isDark ? 'text-cyan-400' : 'text-blue-600 font-semibold'
                                }`}
                              >
                                ↩ Revert to Pre-Assigned Driver
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Clear / Reset Truck Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId('');
                          setSelectedDriverId('');
                          setSelectedFeet(null);
                          setTruckSearchQuery('');
                          setOverrideDriverSelection(false);
                          setLoadedIds(new Set());
                        }}
                        title="Clear truck selection & start fresh"
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                          isDark ? 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-rose-400' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-rose-600'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`h-[60px] px-4 rounded-2xl border flex items-center justify-center text-xs font-medium transition-all ${
                    isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <span className="text-amber-500">⚠️</span>
                      <span>Please search or select a vehicle to begin planning cargo.</span>
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Main Visualizer & Dock Layout: Left 5 Cols (Staged Consignments List) + Right 7 Cols (3D Live Truck) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Left 5 Cols: Staged Consignments Queue (Dense Table / List View) */}
            <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col h-full">
              
              <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex-1 flex flex-col h-full ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* List Header with Select All */}
                <div className={`pb-3 border-b flex items-center justify-between gap-2 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black text-[10px] shrink-0">
                      02
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          STEP 2
                        </span>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Stow Consignments
                        </h3>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {loadedIds.size} / {stagedConsignments.length}
                    </span>
                  </div>

                  {/* Select All Toggle */}
                  {stagedConsignments.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      disabled={!selectedVehicleId}
                      title={!selectedVehicleId ? 'Please select a vehicle in Step 1 first' : ''}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        !selectedVehicleId
                          ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-700 text-slate-400'
                          : loadedIds.size > 0 && loadedIds.size === filteredConsignments.length
                          ? isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                          : isDark ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {loadedIds.size > 0 && loadedIds.size === filteredConsignments.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Truck Selection Required Warning Banner */}
                {!selectedVehicleId && (
                  <div className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs my-2.5 transition-all ${
                    isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                  }`}>
                    <span className="text-sm shrink-0">⚠️</span>
                    <span className="text-[11px] font-semibold">
                      Please select a vehicle in Step 1 above before stowing consignments.
                    </span>
                  </div>
                )}

                {/* Instant Search Bar */}
                <div className="relative my-3">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="text"
                    placeholder="Search by LR#, Shipper, City..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors ${
                      isDark ? 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {loadingConsignments ? (
                  <div className="py-16 flex-1 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                    <RotateCw className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span>Loading dock dockets...</span>
                  </div>
                ) : filteredConsignments.length === 0 ? (
                  <div className="py-12 flex-1 flex flex-col items-center justify-center text-center space-y-2">
                    <Package className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-bold">
                      {stagedConsignments.length === 0 ? 'No Dockets Staged in This Dock' : 'No matching consignments'}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      {stagedConsignments.length === 0
                        ? 'All registered consignments across all hubs have been dispatched or completed.'
                        : 'Try searching with a different LR number or party name.'}
                    </p>
                    {stagedConsignments.length === 0 && (
                      <Link
                        href="/bookings"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Bilty</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  /* Dense Professional Table / List View */
                  <div className="overflow-x-auto flex-1 min-h-[280px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className={`sticky top-0 z-10 text-[10px] uppercase font-bold tracking-wider ${
                        isDark ? 'bg-slate-900 text-slate-400 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                      }`}>
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">
                            <input
                              type="checkbox"
                              disabled={!selectedVehicleId}
                              checked={loadedIds.size > 0 && loadedIds.size === filteredConsignments.length}
                              onChange={toggleSelectAll}
                              title={!selectedVehicleId ? 'Please select a vehicle in Step 1 first' : ''}
                              className="rounded cursor-pointer accent-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
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
                              onClick={() => {
                                if (!selectedVehicleId) {
                                  alert('Please search or select a vehicle in Step 1 before planning cargo.');
                                  return;
                                }
                                toggleLoad(item.id);
                              }}
                              onMouseEnter={() => setHoveredConsignmentId(item.id)}
                              onMouseLeave={() => setHoveredConsignmentId(null)}
                              className={`transition-colors ${
                                !selectedVehicleId
                                  ? 'opacity-60 cursor-not-allowed'
                                  : isLoaded
                                  ? isDark ? 'cursor-pointer bg-cyan-950/30 text-white hover:bg-cyan-950/40' : 'cursor-pointer bg-blue-50/80 text-blue-900 hover:bg-blue-100/60'
                                  : isDark ? 'cursor-pointer hover:bg-slate-900/60 text-slate-300 opacity-70 hover:opacity-100' : 'cursor-pointer hover:bg-slate-50 text-slate-700 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  disabled={!selectedVehicleId}
                                  checked={isLoaded}
                                  onChange={() => toggleLoad(item.id)}
                                  title={!selectedVehicleId ? 'Please select a vehicle in Step 1 first' : ''}
                                  className="rounded cursor-pointer accent-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="py-2.5 px-2 whitespace-nowrap">
                                <div className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">
                                  {item.docket_number}
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  item.priority === 'EXPRESS'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : item.priority === 'PRIORITY'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {item.priority}
                                </span>
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
                <div className={`mt-auto pt-3 border-t flex items-center justify-between gap-3 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div className="text-xs">
                    <span className="text-slate-400">Selected: </span>
                    <strong className="text-cyan-500 font-mono">{loadedIds.size} LRs</strong>
                    <span className="text-slate-400"> ({loadedWeight.toFixed(1)}T • {loadedVolume.toFixed(1)}m³)</span>
                  </div>
                  <button
                    onClick={handleOpenDispatchModal}
                    disabled={!selectedVehicleId || loadedItems.length === 0}
                    title={!selectedVehicleId ? 'Please select a vehicle in Step 1 first' : ''}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-md shadow-cyan-500/20 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Lock & Confirm {loadedItems.length} Consignments ➔
                  </button>
                </div>
              </div>

            </div>

            {/* Right 7 Cols: 3D Live Vehicle Loading Visualizer */}
            <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col h-full">
              
              {/* 3D Cutaway Box Truck Container Visualizer */}
              <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex-1 flex flex-col h-full ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Truck Header Bar with Active Vehicle & Route Badge */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b mb-3 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${
                      isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm tracking-wide">
                          {currentVehicle?.vehicle_number || 'No Vehicle Selected'}
                        </span>
                        {currentVehicle && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getOwnershipBadge(currentVehicle.ownership).tagBg}`}>
                            <span>{getOwnershipBadge(currentVehicle.ownership).icon}</span>
                            <span>{getOwnershipBadge(currentVehicle.ownership).label}</span>
                          </span>
                        )}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          isDark 
                            ? 'bg-blue-500/20 text-cyan-300 border-blue-500/30' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {maxVehicleWeightTons}T RATED • {activeTruckConfig.feet}FT
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Origin: <span className="font-semibold text-cyan-400">{currentBranch?.branch_name || branches.find((b) => b.id === modalOriginBranchId)?.branch_name || 'Origin Hub'}</span> ➔ 
                        Destination: {destBranchId ? (
                          <span className="font-semibold text-emerald-400">
                            {branches.find((b) => b.id === destBranchId)?.branch_name || 'Delivery Hub'}
                          </span>
                        ) : (
                          <span className="font-bold text-amber-500 italic">
                            [Select Destination Hub]
                          </span>
                        )}
                        {activeDriver && (
                          <span className="ml-2 pl-2 border-l border-slate-700 text-slate-300">
                            Driver: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{activeDriver.name}</strong>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Compact Column-way Capacity Strips */}
                  <div className="flex flex-col sm:items-end gap-1 shrink-0 font-mono text-[10px] font-bold">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                      isOvervolume
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : isDark 
                        ? 'bg-slate-900/90 border-slate-800 text-cyan-400' 
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">Vol:</span>
                      <span>{loadedVolume.toFixed(1)} / {maxVehicleVolumeM3.toFixed(1)} m³</span>
                      <span className={`px-1 rounded text-[9px] font-bold ${
                        isOvervolume ? 'bg-rose-500/30 text-rose-300' : isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {volumeUtilizationPct}%
                      </span>
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                      isOverweight
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : isDark 
                        ? 'bg-slate-900/90 border-slate-800 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">Wt:</span>
                      <span>{loadedWeight.toFixed(1)} / {maxVehicleWeightTons.toFixed(1)} T</span>
                      <span className={`px-1 rounded text-[9px] font-bold ${
                        isOverweight ? 'bg-rose-500/30 text-rose-300' : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {weightUtilizationPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real 3D Parametric Truck with Live Volumetric Box Stacking */}
                <div className="mt-1">
                  <Truck3DViewer
                    currentVehicle={currentVehicle}
                    loadedItems={loadedItems}
                    selectedFeet={selectedFeet}
                    onFeetChange={(newFeet) => setSelectedFeet(newFeet)}
                    isDark={isDark}
                  />
                </div>

              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Market Hired Truck Onboarding Modal */}
      {marketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
          <div className={`relative w-full max-w-lg max-h-[85vh] sm:max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Pinned Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  isDark ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-200'
                }`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Hire Market Truck</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Onboard market / attached truck & driver for immediate trip</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMarketModalOpen(false)}
                className={`p-1.5 rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMarketVehicle} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      Vehicle Registration Number*
                    </label>
                    {marketForm.vehicle_number && (
                      <span className={`text-[10px] font-semibold ${
                        marketForm.vehicle_number.trim().length >= 5 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-amber-400' : 'text-amber-700')
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
                    placeholder="e.g. HR-55-AB-9876 or DL-01-XY-5510"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                </div>

                {/* Ownership Type */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    Truck Ownership*
                  </label>
                  <select
                    value={marketForm.ownership}
                    onChange={(e) => setMarketForm({ ...marketForm, ownership: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  >
                    <option value="MARKET">🚛 Market Hired (Ad-Hoc)</option>
                    <option value="ATTACHED">🤝 Attached Fleet</option>
                    <option value="OWN">🏢 Company Owned</option>
                  </select>
                </div>

                {/* Truck Size & Body Length */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
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
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${
                      isDark
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
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    Driver Full Name
                  </label>
                  <input
                    type="text"
                    value={marketForm.driver_name}
                    onChange={(e) => setMarketForm({ ...marketForm, driver_name: e.target.value })}
                    placeholder="e.g. Satish Kumar"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                </div>

                {/* Driver Mobile */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      Driver Mobile Number
                    </label>
                    {marketForm.driver_phone && (
                      <span className={`text-[10px] font-semibold ${
                        marketForm.driver_phone.length === 10 && /^[6-9]/.test(marketForm.driver_phone)
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
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono transition-all ${
                      marketForm.driver_phone && (!/^[6-9]/.test(marketForm.driver_phone) || marketForm.driver_phone.length < 10)
                        ? 'border-amber-500/60 focus:border-amber-400'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                </div>

                {/* Broker / Transporter Name */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    Broker / Transporter Name
                  </label>
                  <input
                    type="text"
                    value={marketForm.owner_name}
                    onChange={(e) => setMarketForm({ ...marketForm, owner_name: e.target.value })}
                    placeholder="e.g. Balaji Roadways"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                </div>

                {/* Broker Mobile Number */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      Broker Mobile (Optional)
                    </label>
                    {marketForm.owner_phone && (
                      <span className={`text-[10px] font-semibold ${
                        marketForm.owner_phone.length === 10 && /^[6-9]/.test(marketForm.owner_phone)
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
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono transition-all ${
                      marketForm.owner_phone && (!/^[6-9]/.test(marketForm.owner_phone) || marketForm.owner_phone.length < 10)
                        ? 'border-amber-500/60 focus:border-amber-400'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                </div>

                {/* Starting Odometer */}
                <div className="space-y-1 sm:col-span-2">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    Current Odometer (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={marketForm.current_odometer}
                    onChange={(e) => setMarketForm({ ...marketForm, current_odometer: e.target.value })}
                    placeholder="e.g. 45000"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                </div>
                </div>
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className={`flex items-center justify-end gap-2.5 px-6 py-3.5 border-t shrink-0 ${
                isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setMarketModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                    isDark
                      ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMarket}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
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
          <div className={`relative w-full max-w-md max-h-[85vh] sm:max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  isDark ? 'bg-blue-600/20 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-600 border-blue-200'
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
                className={`p-1.5 rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickDriver} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
                {driverError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{driverError}</span>
                  </div>
                )}
              <div className="space-y-1">
                <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  Driver Full Name*
                </label>
                <input
                  type="text"
                  required
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="e.g. Ram Singh"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    Mobile Number*
                  </label>
                  {driverForm.phone && (
                    <span className={`text-[10px] font-semibold ${
                      driverForm.phone.length === 10 && /^[6-9]/.test(driverForm.phone)
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
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition-all ${
                    driverForm.phone && (!/^[6-9]/.test(driverForm.phone) || driverForm.phone.length < 10)
                      ? 'border-amber-500/60 focus:border-amber-400'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  Driver License # (Optional)
                </label>
                <input
                  type="text"
                  value={driverForm.license_number}
                  onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                  placeholder="e.g. DL0420220019283"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                  }`}
                />
                </div>
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className={`flex items-center justify-end gap-2.5 px-6 py-3.5 border-t shrink-0 ${
                isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setDriverModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                    isDark
                      ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDriver}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
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
          <div className={`relative w-full max-w-xl max-h-[85vh] sm:max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden my-auto ${
            isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Pinned Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  isDark ? 'bg-blue-600/20 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Generate Dispatch Manifest
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    Lock truck seal, assign driver, and generate trip sheet
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDriverAdvance('');
                  setAdvanceMode('');
                  setDispatchModalOpen(false);
                }}
                className={`p-1.5 rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Load Overview Summary Strip */}
              <div className={`p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-sm ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle</p>
                  <p className={`text-xs font-black mt-0.5 font-mono ${isDark ? 'text-cyan-400' : 'text-slate-900'}`}>{currentVehicle?.vehicle_number || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Loaded Dockets</p>
                  <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900 font-extrabold'}`}>{loadedItems.length} LRs ({loadedPackages} Pkgs)</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Weight</p>
                  <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-extrabold'}`}>{loadedWeight.toFixed(2)} Tons</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Trip Revenue</p>
                  <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-purple-400' : 'text-purple-700 font-extrabold'}`}>₹{Math.round(loadedFreightRevenue).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Origin Departure */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between h-5">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                        isDark ? 'text-slate-400' : 'text-slate-700'
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
                      }}
                      className={`w-full h-10 px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${
                        isDark
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
                      <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                        isDark ? 'text-slate-400' : 'text-slate-700'
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
                      className={`w-full h-10 px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${
                        !destBranchId
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
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      Assigned Driver*
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none transition-all ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                      }`}
                    >
                      <option value="">Select Certified Driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.phone || 'Driver'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Container Seal Number */}
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      Container Seal #*
                    </label>
                    <input
                      type="text"
                      value={sealNumber}
                      onChange={(e) => setSealNumber(e.target.value)}
                      placeholder="e.g. SEAL-88192"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-medium focus:outline-none transition-all ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                      }`}
                    />
                  </div>

                  {/* Current / Starting Odometer */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      Starting Odometer (KM)*
                    </label>
                    <input
                      type="number"
                      value={startOdometer}
                      onChange={(e) => setStartOdometer(e.target.value)}
                      placeholder="e.g. 45210"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-medium focus:outline-none transition-all ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                          : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                      }`}
                    />
                  </div>
                </div>

                {/* Driver Cash/Fuel Advance & Expenses Disbursal */}
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-blue-50/50 border-blue-200/60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isDark ? 'text-cyan-400' : 'text-blue-700'
                    }`}>
                      <span>💵</span> Driver Advance & Disbursed Expenses
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Handed over at dock dispatch
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold block ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
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
                          className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-all ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className={`text-[11px] font-bold block ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
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
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition-all ${
                          parseFloat(driverAdvance) > 0 && !advanceMode
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
                  <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    Gate Pass / Dispatch Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchRemarks}
                    onChange={(e) => setDispatchRemarks(e.target.value)}
                    placeholder="e.g. Cleared dock inspection. Driver instructed via Expressway route."
                    className={`w-full p-2.5 rounded-xl text-xs border font-medium focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400'
                        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Pinned Footer Actions */}
            <div className={`flex items-center justify-end gap-2.5 px-6 py-3.5 border-t shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0E1526]' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setDriverAdvance('');
                  setAdvanceMode('');
                  setDispatchModalOpen(false);
                }}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                  isDark
                    ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={dispatching || !destBranchId}
                onClick={handleConfirmDispatch}
                title={!destBranchId ? 'Please select a destination hub first' : 'Authorize & Dispatch'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dispatching && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Authorize & Dispatch Truck</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Dispatch Success Modal */}
      {successResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 text-center space-y-4 ${
            isDark ? 'bg-[#0E1526] border-emerald-500/40 text-white' : 'bg-white border-emerald-500/40 text-slate-900'
          }`}>
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
            </div>

            <div className={`p-4 rounded-2xl border text-left space-y-2.5 text-xs font-mono shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
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
              <div className={`flex justify-between items-center border-t pt-2.5 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
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
                onClick={() => {
                  setSuccessResult(null);
                  setSelectedVehicleId('');
                  setSelectedDriverId('');
                  setSelectedFeet(null);
                  setTruckSearchQuery('');
                  setTruckDropdownOpen(false);
                  setOverrideDriverSelection(false);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  isDark
                    ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  setSelectedVehicleId('');
                  setSelectedDriverId('');
                  setSelectedFeet(null);
                  router.push('/trips');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
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
