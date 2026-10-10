// frontend/app/(owner)/fleet/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import api from '../../../services/api';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Fuel,
  Wrench,
  ShieldAlert,
  FileCheck2,
  Calendar,
  Phone,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Download,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Navigation,
  MapPin,
  X,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Eye,
  ShieldCheck,
  Radio,
  FileText,
  CreditCard,
  User,
  Gauge,
  UserCheck,
  Award,
  Mail,
  Building,
  Edit2,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DataTable from '../../../components/ui/DataTable';
import { usePermissions } from '../../../hooks/usePermissions';



export default function FleetManagementPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const searchParams = useSearchParams();
  const [activeFleetTab, setActiveFleetTab] = useState(searchParams?.get('tab') === 'drivers' ? 'drivers' : 'vehicles');

  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [addModalTab, setAddModalTab] = useState('basic');
  const [editModalTab, setEditModalTab] = useState('basic');

  // Driver management state & forms
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('ALL');
  const [driverBranchFilter, setDriverBranchFilter] = useState('ALL');
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [isDriverDeleteOpen, setIsDriverDeleteOpen] = useState(false);
  const [driverCountryCode, setDriverCountryCode] = useState('+91');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPhoneError, setDriverPhoneError] = useState('');
  const [driverSubmitting, setDriverSubmitting] = useState(false);
  const [driverFormError, setDriverFormError] = useState('');

  const initialDriverForm = {
    name: '',
    driver_code: '',
    phone: '',
    alt_phone: '',
    license_number: '',
    license_type: 'Heavy Commercial (HMV)',
    license_expiry: '',
    branch_id: '',
    address: '',
    emergency_contact: '',
    salary_type: 'MONTHLY',
    salary_amount: '',
    status: 'ACTIVE',
  };
  const [driverForm, setDriverForm] = useState(initialDriverForm);

  const parsePhoneAndCountry = (rawPhone) => {
    if (!rawPhone) return { countryCode: '+91', digits: '' };
    const str = String(rawPhone).trim();
    const codes = ['+91', '+971', '+966', '+1', '+44', '+65'];
    const matched = codes.find((c) => str.startsWith(c));
    if (matched) {
      const digits = str.slice(matched.length).replace(/[^0-9]/g, '');
      return { countryCode: matched, digits };
    }
    if (str.startsWith('0') && str.length === 11) {
      return { countryCode: '+91', digits: str.slice(1) };
    }
    const digits = str.replace(/[^0-9]/g, '');
    return { countryCode: '+91', digits };
  };

  const handleDriverPhoneChange = (val) => {
    let digits = val.replace(/[^0-9]/g, '');
    if (driverCountryCode === '+91') {
      if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
      else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
      digits = digits.slice(0, 10);
    } else {
      digits = digits.slice(0, 15);
    }
    setDriverPhone(digits);
    if (driverPhoneError) setDriverPhoneError('');
  };

  const openAddDriverModal = () => {
    setEditingDriver(null);
    setDriverForm({
      ...initialDriverForm,
      driver_code: `DRV-${String(drivers.length + 1).padStart(3, '0')}`,
    });
    setDriverCountryCode('+91');
    setDriverPhone('');
    setDriverPhoneError('');
    setDriverFormError('');
    setIsDriverModalOpen(true);
  };

  const openEditDriverModal = (driver) => {
    setEditingDriver(driver);
    const parsed = parsePhoneAndCountry(driver.phone);
    setDriverCountryCode(parsed.countryCode);
    setDriverPhone(parsed.digits);
    setDriverPhoneError('');
    setDriverForm({
      name: driver.name || '',
      driver_code: driver.driver_code || '',
      phone: driver.phone || '',
      alt_phone: driver.alt_phone || '',
      license_number: driver.license_number || '',
      license_type: driver.license_type || 'Heavy Commercial (HMV)',
      license_expiry: driver.license_expiry || '',
      branch_id: driver.branch_id || '',
      address: driver.address || '',
      emergency_contact: driver.emergency_contact || '',
      salary_type: driver.salary_type || 'MONTHLY',
      salary_amount: driver.salary_amount || '',
      status: driver.status || 'ACTIVE',
    });
    setDriverFormError('');
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    if (!driverForm.name.trim() || !driverForm.license_number.trim()) {
      setDriverFormError('Please enter driver name and commercial license number.');
      return;
    }
    if (driverCountryCode === '+91' && driverPhone.trim().length !== 10) {
      setDriverPhoneError('Please enter a valid 10-digit mobile number');
      setDriverFormError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setDriverSubmitting(true);
      setDriverFormError('');

      const finalPhone = `${driverCountryCode} ${driverPhone.trim()}`;
      const payload = {
        ...driverForm,
        phone: finalPhone,
      };

      if (editingDriver) {
        const res = await api.put(`/fleet/drivers/${editingDriver.id}`, payload);
        if (res.data?.success) {
          setDrivers((prev) =>
            prev.map((d) => (d.id === editingDriver.id ? { ...d, ...res.data.data } : d))
          );
          setIsDriverModalOpen(false);
        }
      } else {
        const res = await api.post('/fleet/drivers', payload);
        if (res.data?.success) {
          setDrivers((prev) => [...prev, res.data.data]);
          setIsDriverModalOpen(false);
        }
      }
    } catch (err) {
      setDriverFormError(err.response?.data?.message || err.message || 'Failed to save driver');
    } finally {
      setDriverSubmitting(false);
    }
  };

  const handleToggleDriverStatus = async (driver) => {
    const newStatus = driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/fleet/drivers/${driver.id}/status`, { status: newStatus });
      if (res.data?.success) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === driver.id ? { ...d, status: newStatus } : d))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle driver status');
    }
  };

  const handleDeleteDriver = async () => {
    if (!driverToDelete) return;
    try {
      setDriverSubmitting(true);
      const res = await api.delete(`/fleet/drivers/${driverToDelete.id}`);
      if (res.data?.success) {
        setDrivers((prev) => prev.filter((d) => d.id !== driverToDelete.id));
      }
      setIsDriverDeleteOpen(false);
      setDriverToDelete(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete driver');
    } finally {
      setDriverSubmitting(false);
    }
  };

  const initialVehicleForm = {
    vehicle_number: '',
    vehicle_type: 'TRUCK',
    ownership: 'OWN',
    owner_name: '',
    owner_phone: '',
    capacity_ton: '16.0',
    length_ft: '22',
    make_model: '',
    manufacturing_year: '2023',
    fuel_type: 'DIESEL',
    rc_number: '',
    rc_expiry: '',
    insurance_expiry: '',
    fitness_expiry: '',
    permit_expiry: '',
    puc_expiry: '',
    fastag_id: '',
    gps_device_id: '',
    current_odometer: '',
    branch_id: '',
    assigned_driver_id: '',
    chassis_number: '',
    engine_number: '',
    status: 'AVAILABLE'
  };

  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);

  const fetchFleet = async () => {
    try {
      setLoading(true);
      const [res, branchRes, driverRes] = await Promise.allSettled([
        api.get('/fleet/vehicles'),
        api.get('/organizations/branches'),
        api.get('/fleet/drivers')
      ]);

      if (branchRes.status === 'fulfilled' && branchRes.value?.data?.success) {
        const bData = Array.isArray(branchRes.value.data.data) ? branchRes.value.data.data : [];
        if (bData.length > 0) setBranches(bData);
      }

      if (driverRes.status === 'fulfilled' && driverRes.value?.data?.success) {
        const dData = Array.isArray(driverRes.value.data.data) ? driverRes.value.data.data : [];
        if (dData.length > 0) setDrivers(dData);
      }

      if (res.status === 'fulfilled' && res.value?.data?.success && Array.isArray(res.value.data.data)) {
        const rawList = res.value.data.data;
        if (rawList.length > 0) {
          const mapped = rawList.map((v) => {
            const rawStatus = v.status || 'AVAILABLE';
            const isTransit = rawStatus === 'ON_TRIP' || (v.trips && v.trips.length > 0);
            const isInactive = rawStatus === 'INACTIVE';
            const isMaint = rawStatus === 'MAINTENANCE';
            const activeTrip = v.trips && v.trips.length > 0 ? v.trips[0] : null;
            const originCity = activeTrip?.origin_city || v.branch?.city || 'Delhi';
            const destCity = activeTrip?.destination_city || 'Mumbai';

            return {
              id: v.id,
              plate: v.vehicle_number,
              model: v.make_model || `${v.vehicle_type} Fleet Unit`,
              type: v.vehicle_type,
              capacity: `${v.capacity_ton} Tons`,
              length_ft: v.length_ft ? `${v.length_ft} ft` : '22 ft',
              year: v.manufacturing_year ? String(v.manufacturing_year) : '2023',
              ownership: v.ownership || 'OWN',
              owner_name: v.owner_name || '',
              owner_phone: v.owner_phone || '',
              fastag_id: v.fastag_id || '',
              fuel_type: v.fuel_type || 'DIESEL',
              rc_number: v.rc_number || '',
              rc_expiry: v.rc_expiry || '',
              chassis_number: v.chassis_number || '',
              engine_number: v.engine_number || '',
              permit_expiry: v.permit_expiry || '',
              current_odometer: v.current_odometer || 0,
              rawStatus,
              status: isInactive ? 'INACTIVE' : isTransit ? 'ON_ROAD' : isMaint ? 'MAINTENANCE' : 'YARD',
              status_label: isInactive ? 'Inactive / Retired' : isTransit ? 'On Road (68 km/h)' : isMaint ? 'Under Service' : 'In Yard (Available)',
              location: isTransit ? `${originCity} ➔ ${destCity}` : `Stationed at ${v.branch?.city || 'Delhi'} Hub`,
              driver: v.assignedDriver?.name || 'Assigned Driver',
              driver_rating: '4.9 ★',
              fuel_level: 82,
              mileage_mtd: `${(v.current_odometer || 11840).toLocaleString()} km`,
              avg_fuel_economy: '4.8 km/L',
              insurance_expiry: v.insurance_expiry || '15 Nov 2026',
              insurance_days: 90,
              fitness_expiry: v.fitness_expiry || '18 Jan 2027',
              fitness_days: 120,
              puc_expiry: v.puc_expiry || '08 Dec 2026',
              puc_days: 60,
              maintenance_status: 'HEALTHY',
              gps_device_id: v.gps_device_id,
              rawVehicle: v,
            };
          });
          setVehicles(mapped);
        } else {
          setVehicles([]);
        }

        // Fallback extract branches if endpoint didn't provide
        setBranches((prev) => {
          if (prev.length > 0) return prev;
          const bList = [];
          res.value.data.data.forEach((v) => {
            if (v.branch && !bList.some((b) => b.id === v.branch.id)) bList.push(v.branch);
          });
          return bList;
        });
      }
    } catch (err) {
      console.error('Failed to fetch fleet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!vehicleForm.vehicle_number.trim()) {
      setFormError('Please enter a vehicle registration number');
      setAddModalTab('basic');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/fleet/vehicles', {
        vehicle_number: vehicleForm.vehicle_number.toUpperCase().trim(),
        vehicle_type: vehicleForm.vehicle_type,
        ownership: vehicleForm.ownership || 'OWN',
        owner_name: vehicleForm.owner_name?.trim() || null,
        owner_phone: vehicleForm.owner_phone?.trim() || null,
        capacity_ton: parseFloat(vehicleForm.capacity_ton) || 16,
        length_ft: parseFloat(vehicleForm.length_ft) || null,
        make_model: vehicleForm.make_model?.trim() || null,
        manufacturing_year: parseInt(vehicleForm.manufacturing_year, 10) || null,
        fuel_type: vehicleForm.fuel_type || 'DIESEL',
        rc_number: vehicleForm.rc_number?.trim() || null,
        rc_expiry: vehicleForm.rc_expiry || null,
        insurance_expiry: vehicleForm.insurance_expiry || null,
        fitness_expiry: vehicleForm.fitness_expiry || null,
        permit_expiry: vehicleForm.permit_expiry || null,
        puc_expiry: vehicleForm.puc_expiry || null,
        fastag_id: vehicleForm.fastag_id?.trim() || null,
        gps_device_id: vehicleForm.gps_device_id?.trim() || null,
        current_odometer: parseInt(vehicleForm.current_odometer, 10) || 0,
        branch_id: vehicleForm.branch_id || (branches.length > 0 ? branches[0].id : null),
        assigned_driver_id: vehicleForm.assigned_driver_id || null,
        chassis_number: vehicleForm.chassis_number?.trim() || null,
        engine_number: vehicleForm.engine_number?.trim() || null,
        status: vehicleForm.status || 'AVAILABLE',
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setVehicleForm(initialVehicleForm);
        setAddModalTab('basic');
        await fetchFleet();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add vehicle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (row) => {
    setFormError('');
    setEditModalTab('basic');
    const raw = row.rawVehicle || {};
    setEditingVehicle({
      id: row.id,
      vehicle_number: row.plate,
      vehicle_type: raw.vehicle_type || row.type || 'TRUCK',
      ownership: raw.ownership || 'OWN',
      owner_name: raw.owner_name || '',
      owner_phone: raw.owner_phone || '',
      capacity_ton: String(parseFloat(raw.capacity_ton || row.capacity) || 16),
      length_ft: String(raw.length_ft || '22'),
      make_model: raw.make_model || '',
      manufacturing_year: String(raw.manufacturing_year || '2023'),
      fuel_type: raw.fuel_type || 'DIESEL',
      rc_number: raw.rc_number || '',
      rc_expiry: raw.rc_expiry || '',
      insurance_expiry: raw.insurance_expiry || '',
      fitness_expiry: raw.fitness_expiry || '',
      permit_expiry: raw.permit_expiry || '',
      puc_expiry: raw.puc_expiry || '',
      fastag_id: raw.fastag_id || '',
      gps_device_id: raw.gps_device_id || '',
      current_odometer: String(raw.current_odometer || 0),
      branch_id: raw.branch_id || (raw.branch ? raw.branch.id : ''),
      assigned_driver_id: raw.assigned_driver_id || (raw.assignedDriver ? raw.assignedDriver.id : ''),
      chassis_number: raw.chassis_number || '',
      engine_number: raw.engine_number || '',
      status: raw.status || (row.status === 'YARD' ? 'AVAILABLE' : row.status),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!editingVehicle?.vehicle_number?.trim()) {
      setFormError('Please enter a valid vehicle registration number');
      setEditModalTab('basic');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.put(`/fleet/vehicles/${editingVehicle.id}`, {
        vehicle_number: editingVehicle.vehicle_number.toUpperCase().trim(),
        vehicle_type: editingVehicle.vehicle_type,
        ownership: editingVehicle.ownership || 'OWN',
        owner_name: editingVehicle.owner_name?.trim() || null,
        owner_phone: editingVehicle.owner_phone?.trim() || null,
        capacity_ton: parseFloat(editingVehicle.capacity_ton) || 16,
        length_ft: parseFloat(editingVehicle.length_ft) || null,
        make_model: editingVehicle.make_model?.trim() || null,
        manufacturing_year: parseInt(editingVehicle.manufacturing_year, 10) || null,
        fuel_type: editingVehicle.fuel_type || 'DIESEL',
        rc_number: editingVehicle.rc_number?.trim() || null,
        rc_expiry: editingVehicle.rc_expiry || null,
        insurance_expiry: editingVehicle.insurance_expiry || null,
        fitness_expiry: editingVehicle.fitness_expiry || null,
        permit_expiry: editingVehicle.permit_expiry || null,
        puc_expiry: editingVehicle.puc_expiry || null,
        fastag_id: editingVehicle.fastag_id?.trim() || null,
        gps_device_id: editingVehicle.gps_device_id?.trim() || null,
        current_odometer: parseInt(editingVehicle.current_odometer, 10) || 0,
        branch_id: editingVehicle.branch_id || null,
        assigned_driver_id: editingVehicle.assigned_driver_id || null,
        chassis_number: editingVehicle.chassis_number?.trim() || null,
        engine_number: editingVehicle.engine_number?.trim() || null,
        status: editingVehicle.status || 'AVAILABLE',
      });

      if (res.data?.success) {
        setIsEditModalOpen(false);
        setEditingVehicle(null);
        await fetchFleet();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (row) => {
    const isCurrentlyInactive = row.status === 'INACTIVE';
    const nextStatus = isCurrentlyInactive ? 'AVAILABLE' : 'INACTIVE';
    const nextStatusLabel = isCurrentlyInactive ? 'In Yard (Available)' : 'Inactive';

    // Optimistic UI update
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === row.id ? { ...v, status: nextStatus, status_label: nextStatusLabel } : v
      )
    );

    try {
      const res = await api.patch(`/fleet/vehicles/${row.id}/status`, {
        status: nextStatus,
      });
      if (res.data?.success) {
        await fetchFleet();
      }
    } catch (err) {
      // Revert if error
      setVehicles((prev) =>
        prev.map((v) => (v.id === row.id ? { ...v, status: row.status, status_label: row.status_label } : v))
      );
      alert(err.response?.data?.message || 'Failed to change vehicle status');
    }
  };

  const handleOpenDelete = (row) => {
    if (!canDeleteVehicle) return;
    setVehicleToDelete(row);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      setIsSubmitting(true);
      const res = await api.delete(`/fleet/vehicles/${vehicleToDelete.id}`);
      if (res.data?.success) {
        setIsDeleteModalOpen(false);
        setVehicleToDelete(null);
        await fetchFleet();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetails = (row) => {
    setSelectedAsset(row);
    setIsDetailsModalOpen(true);
  };

  const {
    canExport,
    isAdmin,
    canCreateVehicle,
    canEditVehicle,
    canDeleteVehicle,
    canViewFleet,
    canManageDriver,
  } = usePermissions();

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        driverSearch === '' ||
        d.name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.driver_code?.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.phone?.includes(driverSearch) ||
        d.license_number?.toLowerCase().includes(driverSearch.toLowerCase());

      const matchStatus = driverStatusFilter === 'ALL' || d.status === driverStatusFilter;
      const matchBranch = driverBranchFilter === 'ALL' || d.branch_id === driverBranchFilter;

      return matchSearch && matchStatus && matchBranch;
    });
  }, [drivers, driverSearch, driverStatusFilter, driverBranchFilter]);

  const driverStats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((d) => d.status === 'ACTIVE' || d.status === 'ON_TRIP').length;
    const onTrip = drivers.filter((d) => d.status === 'ON_TRIP').length;
    const available = drivers.filter((d) => d.status === 'ACTIVE').length;

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = drivers.filter((d) => {
      if (!d.license_expiry) return false;
      const exp = new Date(d.license_expiry);
      return exp <= thirtyDays;
    }).length;

    return { total, active, onTrip, available, expiringSoon };
  }, [drivers]);

  const exportDriversData = () => {
    const headers = ['Driver Code', 'Name', 'Phone', 'License Number', 'License Type', 'License Expiry', 'Branch', 'Salary Type', 'Amount', 'Status'];
    const rows = drivers.map((d) => [
      d.driver_code || '',
      `"${d.name || ''}"`,
      d.phone || '',
      d.license_number || '',
      `"${d.license_type || ''}"`,
      d.license_expiry || '',
      `"${d.branch?.branch_name || 'Unassigned'}"`,
      d.salary_type || '',
      d.salary_amount || 0,
      d.status || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TransHub_Commercial_Drivers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('plate');
  const [sortOrder, setSortOrder] = useState('ASC');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const match =
        v.plate.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase()) ||
        v.driver.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase());

      if (filterType === 'ALL') return match;
      if (filterType === 'ON_ROAD') return match && v.status === 'ON_ROAD';
      if (filterType === 'MAINTENANCE') return match && v.status === 'MAINTENANCE';
      if (filterType === 'YARD') return match && v.status === 'YARD';
      if (filterType === 'INACTIVE') return match && v.status === 'INACTIVE';
      return match;
    });
  }, [vehicles, search, filterType]);

  const sortedVehicles = useMemo(() => {
    const list = [...filteredVehicles];
    if (!sortBy) return list;
    return list.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [filteredVehicles, sortBy, sortOrder]);

  const paginatedVehicles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedVehicles.slice(start, start + pageSize);
  }, [sortedVehicles, page, pageSize]);

  const fleetColumns = useMemo(
    () => [
      {
        key: 'plate',
        header: 'Vehicle Plate & Model',
        sortable: true,
        width: 190,
        minWidth: 150,
        exportValue: (row) => `${row.plate} (${row.model}, ${row.year})`,
        render: (val, row) => (
          <div>
            <div className={`font-mono font-bold text-xs flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'
              }`}>
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>{row.plate}</span>
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
              {row.model} ({row.year})
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type & Capacity',
        sortable: true,
        width: 160,
        minWidth: 130,
        exportValue: (row) => `${row.type} - ${row.capacity}`,
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {row.type}
            </div>
            <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{row.capacity}</div>
          </div>
        ),
      },
      {
        key: 'location',
        header: 'Live Location & Speed',
        sortable: true,
        width: 200,
        minWidth: 150,
        exportValue: (row) => `${row.location} - ${row.status_label}`,
        render: (val, row) => (
          <div>
            <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.location}
            </div>
            <span className={`text-[10px] font-mono font-bold ${row.status === 'ON_ROAD'
                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                : isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
              {row.status_label}
            </span>
          </div>
        ),
      },
      {
        key: 'driver',
        header: 'Assigned Driver',
        sortable: true,
        width: 170,
        minWidth: 130,
        exportValue: (row) => `${row.driver} (${row.driver_rating})`,
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.driver}
            </div>
            <span className="text-[10px] text-amber-500 font-bold">{row.driver_rating}</span>
          </div>
        ),
      },
      {
        key: 'fuel_level',
        header: 'Diesel Tank',
        sortable: true,
        width: 130,
        minWidth: 100,
        exportValue: (row) => `${row.fuel_level}%`,
        render: (val, row) => (
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className={`font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {row.fuel_level}%
              </span>
            </div>
            <div className={`w-16 h-1 rounded-full mt-1 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'
              }`}>
              <div
                style={{ width: `${row.fuel_level}%` }}
                className={`h-full ${row.fuel_level > 30 ? (isDark ? 'bg-cyan-400' : 'bg-blue-600') : 'bg-rose-500'}`}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'avg_fuel_economy',
        header: 'Fuel Economy',
        sortable: true,
        width: 130,
        minWidth: 100,
        exportValue: (row) => `${row.avg_fuel_economy}, ${row.mileage_mtd}`,
        render: (val, row) => (
          <div className="whitespace-nowrap">
            <span className={`font-mono font-bold text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {row.avg_fuel_economy}
            </span>
            <div className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {row.mileage_mtd} MTD
            </div>
          </div>
        ),
      },
      {
        key: 'insurance_days',
        header: 'Compliance Expiry',
        sortable: true,
        width: 180,
        minWidth: 140,
        exportValue: (row) => `INS:${row.insurance_days}d, FIT:${row.fitness_days}d, PUC:${row.puc_days}d`,
        render: (val, row) => (
          <div className="flex items-center gap-1.5 text-[10px] font-mono whitespace-nowrap">
            <span className={`px-1.5 py-0.5 rounded border ${row.insurance_days < 30
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                : isDark ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
              INS: {row.insurance_days}d
            </span>
            <span className={`px-1.5 py-0.5 rounded border ${isDark ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
              FIT: {row.fitness_days}d
            </span>
            <span className={`px-1.5 py-0.5 rounded border ${row.puc_days < 0
                ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                : isDark ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
              PUC: {row.puc_days < 0 ? 'EXP' : `${row.puc_days}d`}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        width: 130,
        minWidth: 100,
        exportValue: (row) => row.status,
        render: (val, row) => (
          <div className="text-center whitespace-nowrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.status === 'ON_ROAD'
                ? isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : row.status === 'YARD'
                  ? isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                  : row.status === 'INACTIVE'
                    ? isDark ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                    : isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${row.status === 'INACTIVE' ? 'bg-rose-500' : 'bg-current animate-pulse'}`} />
              {row.status === 'YARD' ? 'IN YARD' : row.status}
            </span>
          </div>
        ),
      },
      {
        key: 'action',
        header: 'Actions',
        align: 'center',
        width: 170,
        resizable: false,
        render: (val, row) => (
          <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
            {/* Edit Button */}
            {canEditVehicle && (
              <button
                onClick={() => handleOpenEdit(row)}
                className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${isDark
                    ? 'border-slate-800 bg-slate-900 text-amber-400 hover:text-amber-300 hover:bg-slate-800'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                title="Edit Vehicle Details (Admin)"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Active (Green) / Deactive (Red) Toggle Switch Button */}
            {canEditVehicle && (
              <div className="flex items-center px-1" title={row.status !== 'INACTIVE' ? 'Vehicle Active (Click to Deactivate)' : 'Vehicle Deactivated (Click to Activate)'}>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(row)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${row.status !== 'INACTIVE'
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400'
                      : 'bg-rose-500 shadow-sm shadow-rose-500/40 hover:bg-rose-400'
                    }`}
                >
                  <span className="sr-only">Toggle Vehicle Active Status</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${row.status !== 'INACTIVE' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            )}

            {/* Delete Button */}
            {canDeleteVehicle && (
              <button
                onClick={() => handleOpenDelete(row)}
                className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${isDark
                    ? 'border-slate-800 bg-slate-900 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                title="Remove Vehicle (Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* View Details Asset Modal */}
            <button
              onClick={() => handleOpenDetails(row)}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${isDark
                  ? 'border-slate-800 bg-slate-900 text-cyan-400 hover:text-white'
                  : 'border-slate-200 bg-slate-100 text-blue-600 hover:bg-blue-50'
                }`}
              title="View Asset Telematics & Specs"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [isDark, branches, drivers]
  );

  const renderFleetSwitcher = () => (
    <div className="flex items-center space-x-2.5 pt-1">
      <button
        type="button"
        onClick={() => setActiveFleetTab('vehicles')}
        className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
          activeFleetTab === 'vehicles'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
            : isDark
              ? 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
      >
        <Truck className="w-4 h-4" />
        <span>Commercial Vehicles</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-mono ${
            activeFleetTab === 'vehicles'
              ? 'bg-white/20 text-white'
              : isDark
                ? 'bg-slate-800 text-slate-300'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          {vehicles.length}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveFleetTab('drivers')}
        className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
          activeFleetTab === 'drivers'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
            : isDark
              ? 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
      >
        <Users className="w-4 h-4" />
        <span>Commercial Drivers & Configuration</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-mono ${
            activeFleetTab === 'drivers'
              ? 'bg-white/20 text-white'
              : isDark
                ? 'bg-slate-800 text-slate-300'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          {drivers.length}
        </span>
      </button>
    </div>
  );

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
      } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">

          {/* TAB 1: COMMERCIAL VEHICLES */}
          {activeFleetTab === 'vehicles' && (
            <div className="space-y-6">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <Truck className="w-6 h-6 text-cyan-400" />
                    <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Fleet & Vehicle Asset Management
                    </h1>
                  </div>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {vehicles.length} heavy commercial vehicles registered with AIS-140 live GPS telematics.
                  </p>
                </div>

                {canCreateVehicle && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Vehicle</span>
                  </button>
                )}
              </div>

              {/* Operational Fleet Health & Utilization Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Vehicles</div>
                  <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{vehicles.length}</div>
                  <div className={`text-[10px] mt-1 ${isDark ? 'text-cyan-400' : 'text-blue-600 font-semibold'}`}>100% GPS Equipped</div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active On Road</div>
                  <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400 font-mono">
                    {vehicles.filter(v => v.status === 'ON_ROAD').length}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-1 font-semibold">
                    {vehicles.length > 0 ? ((vehicles.filter(v => v.status === 'ON_ROAD').length / vehicles.length) * 100).toFixed(1) : 0}% Utilization
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>In Yard (Available)</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {vehicles.filter(v => v.status === 'YARD').length}
                  </div>
                  <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ready for Line-haul</div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Under Maintenance</div>
                  <div className="text-2xl font-black text-amber-500 dark:text-amber-400 font-mono">
                    {vehicles.filter(v => v.status === 'MAINTENANCE').length}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-1 font-semibold">Scheduled Workshop</div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Compliance Alerts</div>
                  <div className="text-2xl font-black text-rose-500 dark:text-rose-400 font-mono">
                    {vehicles.filter(v => (v.insurance_days != null && v.insurance_days < 30) || (v.fitness_days != null && v.fitness_days < 30) || (v.puc_days != null && v.puc_days < 0)).length}
                  </div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400/80 mt-1 font-semibold">Insurance / PUC Due</div>
                </div>
              </div>

              {/* View Switcher Tabs: Before Table after metric tabs */}
              {renderFleetSwitcher()}

              {/* High-Density Vehicle Directory Server-side DataTable */}
              <DataTable
                columns={fleetColumns}
                data={paginatedVehicles}
                totalCount={sortedVehicles.length}
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
                onSearchChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                searchPlaceholder="Search by Registration Plate, Model, Driver, Current City..."
                exportFilename="Fleet_Asset_Register"
                emptyTitle="No Vehicles Found"
                emptySubtitle="No commercial vehicles match your filter criteria."
                filtersSlot={
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => { setFilterType('ALL'); setPage(1); }}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterType === 'ALL'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      All Vehicles ({vehicles.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterType('ON_ROAD'); setPage(1); }}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterType === 'ON_ROAD'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      On Road ({vehicles.filter((v) => v.status === 'ON_ROAD').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterType('YARD'); setPage(1); }}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterType === 'YARD'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      In Yard ({vehicles.filter((v) => v.status === 'YARD').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterType('MAINTENANCE'); setPage(1); }}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterType === 'MAINTENANCE'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Maintenance ({vehicles.filter((v) => v.status === 'MAINTENANCE').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterType('INACTIVE'); setPage(1); }}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterType === 'INACTIVE'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Inactive ({vehicles.filter((v) => v.status === 'INACTIVE').length})
                    </button>
                  </div>
                }
              />
            </div>
          )}

          {/* TAB 2: COMMERCIAL DRIVERS & CONFIGURATION */}
          {activeFleetTab === 'drivers' && (
            <div className="space-y-6">
              {/* Drivers Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <Users className="w-6 h-6 text-cyan-400" />
                    <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Commercial Fleet Drivers Directory
                    </h1>
                  </div>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Register and configure commercial drivers, track license compliance, and assign to hubs or long-haul routes.
                  </p>
                </div>

                {canManageDriver && (
                  <div className="flex items-center space-x-2 shrink-0">
                    {canExport && (
                      <button
                        type="button"
                        onClick={exportDriversData}
                        className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isDark
                            ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={openAddDriverModal}
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register Driver</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Driver Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Fleet Drivers
                    </span>
                    <Truck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black">{driverStats.total}</span>
                    <span className="text-xs font-semibold text-emerald-500">{driverStats.active} Active</span>
                  </div>
                  <div className={`text-[11px] mt-1 flex items-center space-x-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>🛣️ {driverStats.onTrip} On Highway</span>
                    <span>•</span>
                    <span>🏕️ {driverStats.available} In Yard</span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      License Health
                    </span>
                    <AlertTriangle className={`w-4 h-4 ${driverStats.expiringSoon > 0 ? 'text-amber-500' : 'text-blue-500'}`} />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-2xl font-black ${driverStats.expiringSoon > 0 ? 'text-amber-500' : ''}`}>
                      {driverStats.expiringSoon}
                    </span>
                    <span className="text-xs font-medium text-amber-500">Expiring (&lt;30d)</span>
                  </div>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {driverStats.expiringSoon === 0 ? 'All driver licenses valid' : 'Requires renewal attention'}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Assigned Vehicles
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black font-mono">
                      {vehicles.filter(v => v.driver && v.driver !== 'Assigned Driver').length}
                    </span>
                    <span className="text-xs font-semibold text-cyan-400">Assigned</span>
                  </div>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Paired with commercial fleet
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Operating Stations
                    </span>
                    <Building className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black">{branches.length}</span>
                    <span className="text-xs font-medium text-purple-500">Active Stations</span>
                  </div>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Dispatches, yard & line-haul
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs: Before Table after metric tabs */}
              {renderFleetSwitcher()}

              {/* Driver Filters Bar */}
              <div className={`p-3.5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
                isDark ? 'bg-[#0B1020]/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    placeholder="Search by driver name, code (DRV-001), phone, or DL number..."
                    className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-all outline-hidden border ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                  {driverSearch && (
                    <button
                      type="button"
                      onClick={() => setDriverSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <select
                    value={driverStatusFilter}
                    onChange={(e) => setDriverStatusFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold outline-hidden border cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active / Available</option>
                    <option value="ON_TRIP">On Trip</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>

                  <select
                    value={driverBranchFilter}
                    onChange={(e) => setDriverBranchFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold outline-hidden border cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="ALL">All Stations / Hubs</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drivers Table */}
              <div className={`rounded-2xl border overflow-hidden ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                        isDark ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
                      }`}>
                        <th className="py-3 px-4">Driver Profile</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Commercial License (DL)</th>
                        <th className="py-3 px-4">Assigned Hub</th>
                        <th className="py-3 px-4">Remuneration</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800/80 text-slate-200' : 'divide-slate-100 text-slate-700'
                    }`}>
                      {filteredDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            No commercial drivers match your search filters.
                          </td>
                        </tr>
                      ) : (
                        filteredDrivers.map((driver) => {
                          const isExpiring = driver.license_expiry && new Date(driver.license_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                          return (
                            <tr
                              key={driver.id}
                              className={`transition-colors ${
                                isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                    {driver.name ? driver.name.charAt(0).toUpperCase() : 'D'}
                                  </div>
                                  <div>
                                    <div className="font-bold flex items-center space-x-2">
                                      <span className={isDark ? 'text-white' : 'text-slate-900'}>{driver.name}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-emerald-500 font-semibold">
                                      {driver.driver_code || 'NO-CODE'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 font-mono text-[11px]">
                                <div className="flex items-center space-x-1.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{driver.phone || '—'}</span>
                                </div>
                                {driver.alt_phone && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">Alt: {driver.alt_phone}</div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-mono font-bold text-xs flex items-center space-x-1.5">
                                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{driver.license_number}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>{driver.license_type || 'HMV'}</span>
                                  {driver.license_expiry && (
                                    <>
                                      <span>•</span>
                                      <span className={isExpiring ? 'text-amber-500 font-bold' : ''}>
                                        Exp: {driver.license_expiry}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <Building className="w-3 h-3 mr-1 text-slate-400" />
                                  {driver.branch?.branch_name || 'Unassigned Yard'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-bold">
                                  ₹{Number(driver.salary_amount || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase">
                                  {driver.salary_type || 'MONTHLY'}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  driver.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : driver.status === 'ON_TRIP'
                                      ? 'bg-blue-500/10 text-blue-500'
                                      : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    driver.status === 'ACTIVE'
                                      ? 'bg-emerald-500'
                                      : driver.status === 'ON_TRIP'
                                        ? 'bg-blue-500'
                                        : 'bg-rose-500'
                                  }`} />
                                  {driver.status === 'ACTIVE' ? 'Available' : driver.status === 'ON_TRIP' ? 'On Highway' : 'Inactive'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDriverStatus(driver)}
                                    title={driver.status === 'ACTIVE' ? 'Deactivate Driver' : 'Activate Driver'}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      driver.status === 'ACTIVE'
                                        ? isDark ? 'border-slate-800 text-slate-400 hover:text-amber-400' : 'border-slate-200 text-slate-500 hover:text-amber-600'
                                        : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                                    }`}
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>
                                  {canManageDriver && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openEditDriverModal(driver)}
                                        title="Edit Driver Configuration"
                                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                          isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDriverToDelete(driver);
                                          setIsDriverDeleteOpen(true);
                                        }}
                                        title="Delete Driver"
                                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                          isDark ? 'border-slate-800 text-slate-400 hover:text-rose-400' : 'border-slate-200 text-slate-500 hover:text-rose-600'
                                        }`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Add Vehicle Modal */}
      {isAddModalOpen && (
        <div className={`fixed inset-0 z-[9999] backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 ${isDark ? 'bg-slate-950/80' : 'bg-slate-900/50'
          }`}>
          <div className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border ${isDark ? 'bg-[#0B1020] border-cyan-500/40 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>

            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50/70'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs ${isDark ? 'bg-blue-600/20 text-cyan-400 border-cyan-400/30' : 'bg-blue-50 text-blue-600 border-blue-200'
                  }`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Add Commercial Vehicle
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    RTO registration, ownership, compliance expiries & telematics
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transporter Category Navigation Tabs (Only shown for Company Owned fleet) */}
            {vehicleForm.ownership === 'OWN' ? (
              <div className={`flex border-b px-6 gap-1 overflow-x-auto text-xs font-bold ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
                }`}>
                {[
                  { id: 'basic', label: '1. Basic & Ownership', icon: ShieldCheck },
                  { id: 'specs', label: '2. Body & Specs', icon: SlidersHorizontal },
                  { id: 'compliance', label: '3. Compliance Expiries', icon: Calendar },
                  { id: 'telematics', label: '4. FASTag & Operations', icon: Radio },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = addModalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAddModalTab(tab.id)}
                      className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${isActive
                          ? isDark ? 'border-cyan-400 text-cyan-400' : 'border-blue-600 text-blue-600'
                          : isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={`px-6 py-3 border-b flex items-center justify-between gap-3 text-xs ${isDark ? 'border-slate-800/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-amber-200' : 'border-amber-200/80 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white text-amber-900'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-100 border-amber-200 text-amber-700'
                    }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-amber-600 dark:text-amber-400">Quick Trip Setup</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        Essential transporter details only (FASTag, GPS & RTO expiries optional)
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap shrink-0 border shadow-xs ${isDark
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  {vehicleForm.ownership === 'MARKET' ? 'Market Hired' : 'Attached Partner'}
                </span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateVehicle}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* TAB 1: BASIC & OWNERSHIP (OR ONLY TAB FOR MARKET/ATTACHED) */}
                {(addModalTab === 'basic' || vehicleForm.ownership !== 'OWN') && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Vehicle Registration Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. RJ 14 GB 9921 or MH 12 AB 1234"
                          value={vehicleForm.vehicle_number}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                            }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Official vehicle registration plate issued by RTO</p>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Fleet Ownership Type
                        </label>
                        <select
                          value={vehicleForm.ownership}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, ownership: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-semibold ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        >
                          <option value="OWN">Own Fleet (Company Owned)</option>
                          <option value="ATTACHED">Attached Truck (Partner Transporter)</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {vehicleForm.ownership === 'OWN' ? 'Requires full compliance & specs' : 'Only asks essential operational fields'}
                        </p>
                      </div>
                    </div>

                    {/* Conditional: If Attached, show Name, Phone, Body Type & Capacity directly */}
                    {(vehicleForm.ownership === 'ATTACHED') ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Attached Partner / Owner Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Ramesh Yadav / Apex Logistics"
                              value={vehicleForm.owner_name}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, owner_name: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Contact Mobile Phone <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="e.g. +91 98290 12345"
                              value={vehicleForm.owner_phone}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, owner_phone: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Vehicle Body Type
                            </label>
                            <select
                              value={vehicleForm.vehicle_type}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-medium ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            >
                              <option value="TRUCK">Heavy Truck (16T - 25T Taurus)</option>
                              <option value="CONTAINER">Container (28T - 40T Closed Body)</option>
                              <option value="TRAILER">Multi-Axle Trailer (32T+ Flatbed)</option>
                              <option value="MINI_TRUCK">Mini Truck (Eicher / 7T - 14T)</option>
                              <option value="PICKUP">Pickup (Bolero / 2.5T)</option>
                              <option value="TEMPO">Tempo / Local Delivery Carrier</option>
                              <option value="OTHER">Tanker / Bulk Carrier</option>
                            </select>
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Carrying Payload Capacity (Tons)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="100"
                              placeholder="e.g. 16.0"
                              value={vehicleForm.capacity_ton}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_ton: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Default Assigned Driver
                              </label>
                              <Link href="/users" target="_blank" className="text-[11px] text-cyan-400 hover:underline font-semibold">
                                + Add / Manage Drivers
                              </Link>
                            </div>
                            <select
                              value={vehicleForm.assigned_driver_id}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, assigned_driver_id: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            >
                              <option value="">Unassigned (Open Pool)</option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} {d.phone ? `(${d.phone})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Operating Base Hub
                            </label>
                            <select
                              value={vehicleForm.branch_id}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, branch_id: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            >
                              <option value="">{branches.length === 0 ? 'No branches configured yet (Main Yard)' : 'Main Yard / Unassigned'}</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  [{b.branch_code || 'CODE'}] {b.branch_name} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Vehicle Operational Status
                          </label>
                          <select
                            value={vehicleForm.status}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-colors ${isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                              }`}
                          >
                            <option value="AVAILABLE">At Yard / Standby (Available for Dispatch)</option>
                            <option value="ON_ROAD">In Transit (Active On Road)</option>
                            <option value="INACTIVE">Inactive / Deactivated</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      /* Own Fleet Specific Fields */
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Make & Model Brand
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Tata Signa 4825.T / BharatBenz 2823R"
                              value={vehicleForm.make_model}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, make_model: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Manufacturing Year
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 2023"
                              min="1990"
                              max={new Date().getFullYear() + 1}
                              value={vehicleForm.manufacturing_year}
                              onChange={(e) => setVehicleForm({ ...vehicleForm, manufacturing_year: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Fuel Type
                          </label>
                          <select
                            value={vehicleForm.fuel_type}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value })}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                              }`}
                          >
                            <option value="DIESEL">Diesel</option>
                            <option value="CNG">CNG (Clean Fuel)</option>
                            <option value="LNG">LNG (Liquid Natural Gas)</option>
                            <option value="ELECTRIC">Electric (EV Heavy Hauler)</option>
                            <option value="PETROL">Petrol</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 2: BODY & LOAD CAPACITY (Company Owned Fleet) */}
                {vehicleForm.ownership === 'OWN' && addModalTab === 'specs' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Vehicle Type / Classification
                        </label>
                        <select
                          value={vehicleForm.vehicle_type}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-medium ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        >
                          <option value="TRUCK">Heavy Truck (16T - 25T Taurus)</option>
                          <option value="CONTAINER">Container (28T - 40T Closed Body)</option>
                          <option value="TRAILER">Multi-Axle Trailer (32T+ Flatbed)</option>
                          <option value="MINI_TRUCK">Mini Truck (Eicher / 7T - 14T)</option>
                          <option value="PICKUP">Pickup (Bolero / 2.5T)</option>
                          <option value="TEMPO">Tempo / Local Delivery Carrier</option>
                          <option value="OTHER">Tanker / Bulk Carrier</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Carrying Payload Capacity (Tons)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          placeholder="e.g. 16.0"
                          value={vehicleForm.capacity_ton}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_ton: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-bold ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Body Length (Feet)
                        </label>
                        <input
                          type="number"
                          step="1"
                          placeholder="e.g. 22 or 32"
                          value={vehicleForm.length_ft}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, length_ft: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Cargo bed length (e.g. 19ft, 22ft, 32ft)</p>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Chassis Number (VIN)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. MAT622159P8K12345"
                          value={vehicleForm.chassis_number}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Engine Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 697TC56P812345"
                          value={vehicleForm.engine_number}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, engine_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: STATUTORY & LEGAL COMPLIANCE EXPIRIES (Company Owned Fleet) */}
                {vehicleForm.ownership === 'OWN' && addModalTab === 'compliance' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${isDark ? 'bg-blue-950/20 border-blue-500/30 text-blue-300' : 'bg-blue-50/70 border-blue-200 text-blue-800'
                      }`}>
                      <FileCheck2 className="w-4 h-4 shrink-0" />
                      <span>Transporters are alerted before statutory expiries to avoid RTO roadside seizure and highway penalties.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          RC (Registration Certificate) #
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. RC-RJ14GB9921"
                          value={vehicleForm.rc_number}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, rc_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          RC Validity Expiry Date
                        </label>
                        <input
                          type="date"
                          value={vehicleForm.rc_expiry}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, rc_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Insurance Expiry Date
                        </label>
                        <input
                          type="date"
                          value={vehicleForm.insurance_expiry}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, insurance_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Fitness Certificate Expiry Date
                        </label>
                        <input
                          type="date"
                          value={vehicleForm.fitness_expiry}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, fitness_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          National / State Permit Expiry Date
                        </label>
                        <input
                          type="date"
                          value={vehicleForm.permit_expiry}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, permit_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Pollution Under Control (PUC) Expiry Date
                        </label>
                        <input
                          type="date"
                          value={vehicleForm.puc_expiry}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, puc_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: FASTAG & TELEMATICS (Company Owned Fleet) */}
                {vehicleForm.ownership === 'OWN' && addModalTab === 'telematics' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          FASTag ID / Tag Barcode Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. 600101-3482-9901"
                            value={vehicleForm.fastag_id}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, fastag_id: e.target.value })}
                            className={`w-full pl-3.5 pr-20 py-2.5 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${isDark
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                              }`}
                          />
                          <div className="absolute right-3 top-2.5 text-[10px] text-blue-500 font-bold uppercase">
                            NETC RFID
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Used for automatic electronic toll deductions on NHAI plazas</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            AIS-140 GPS Device Tracker ID
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">Optional (Leave blank if no GPS)</span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. GPS-TRK-9921 (leave blank if no GPS fitted)"
                            value={vehicleForm.gps_device_id}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, gps_device_id: e.target.value })}
                            className={`w-full pl-3.5 pr-28 py-2.5 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${isDark
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                              }`}
                          />
                          <div className={`absolute right-3 top-2.5 flex items-center gap-1 text-[10px] font-bold ${vehicleForm.gps_device_id?.trim() ? 'text-emerald-500' : isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${vehicleForm.gps_device_id?.trim() ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`} />
                            {vehicleForm.gps_device_id?.trim() ? 'AIS-140 Live' : 'No GPS'}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Only enter if this vehicle has a GPS tracker installed. If left blank, no GPS is assigned.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Current Odometer (km)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 12450"
                          value={vehicleForm.current_odometer}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, current_odometer: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Home Branch Hub
                        </label>
                        <select
                          value={vehicleForm.branch_id}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, branch_id: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        >
                          {branches.length === 0 ? (
                            <option value="">{branches.length === 0 ? 'No branches configured yet (Main Yard)' : 'Main Yard / Unassigned'}</option>
                          ) : (
                            branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                [{b.branch_code || 'CODE'}] {b.branch_name} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Default Assigned Driver
                          </label>
                          <Link href="/users" target="_blank" className="text-[11px] text-cyan-400 hover:underline font-semibold">
                            + Add / Manage Drivers
                          </Link>
                        </div>
                        <select
                          value={vehicleForm.assigned_driver_id}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, assigned_driver_id: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                            }`}
                        >
                          <option value="">Unassigned (Open Pool)</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.phone ? `(${d.phone})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Initial Vehicle Status
                      </label>
                      <select
                        value={vehicleForm.status}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-colors ${isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          }`}
                      >
                        <option value="AVAILABLE">At Yard (Available for Line-Haul Dispatch)</option>
                        <option value="ON_ROAD">In Transit (Active On Road)</option>
                        <option value="MAINTENANCE">In Workshop (Under Maintenance)</option>
                        <option value="INACTIVE">Inactive / Retired (Deactivated)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Footer */}
              <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50/80'
                }`}>
                <div className="text-[11px] text-slate-400 font-medium">
                  {vehicleForm.ownership === 'OWN' ? (
                    addModalTab === 'basic' ? 'Step 1 of 4: Vehicle & Ownership' :
                      addModalTab === 'specs' ? 'Step 2 of 4: Body Dimensions & Weight' :
                        addModalTab === 'compliance' ? 'Step 3 of 4: Legal & RTO Expiries' :
                          'Step 4 of 4: FASTag & Operational Hub'
                  ) : (
                    'Attached Truck: Ready for dispatch'
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Back button for multi-step Owned vehicle */}
                  {vehicleForm.ownership === 'OWN' && addModalTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (addModalTab === 'specs') setAddModalTab('basic');
                        else if (addModalTab === 'compliance') setAddModalTab('specs');
                        else if (addModalTab === 'telematics') setAddModalTab('compliance');
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    Cancel
                  </button>

                  {/* If Owned Vehicle and not on last tab: Show 'Next Step' button (Hide Save button) */}
                  {vehicleForm.ownership === 'OWN' && addModalTab !== 'telematics' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (addModalTab === 'basic') {
                          if (!vehicleForm.vehicle_number?.trim()) {
                            setFormError('Please enter a valid vehicle registration number');
                            return;
                          }
                          setFormError('');
                          setAddModalTab('specs');
                        } else if (addModalTab === 'specs') {
                          setAddModalTab('compliance');
                        } else if (addModalTab === 'compliance') {
                          setAddModalTab('telematics');
                        }
                      }}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next Step</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    /* Save button: Only rendered on the last page / final step */
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Registering...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Save & Register Vehicle</span>
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

      {/* Edit Vehicle Modal */}
      {isEditModalOpen && editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all ${isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
              }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <span>Edit Vehicle:</span>
                    <span className="font-mono text-amber-500">{editingVehicle.vehicle_number}</span>
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Update fleet specifications, legal expiries, FASTag or operational status
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Edit Modal Tabs (Only shown for Company Owned fleet) */}
            {editingVehicle.ownership === 'OWN' ? (
              <div className={`flex border-b px-6 gap-1 overflow-x-auto text-xs font-bold ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
                }`}>
                {[
                  { id: 'basic', label: '1. Basic & Ownership', icon: ShieldCheck },
                  { id: 'specs', label: '2. Body & Specs', icon: SlidersHorizontal },
                  { id: 'compliance', label: '3. Compliance Expiries', icon: Calendar },
                  { id: 'telematics', label: '4. FASTag & Operations', icon: Radio },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = editModalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setEditModalTab(tab.id)}
                      className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${isActive
                          ? isDark ? 'border-amber-400 text-amber-400' : 'border-amber-600 text-amber-600'
                          : isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={`px-6 py-3 border-b flex items-center justify-between gap-3 text-xs ${isDark ? 'border-slate-800/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-amber-200' : 'border-amber-200/80 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white text-amber-900'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-100 border-amber-200 text-amber-700'
                    }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-amber-600 dark:text-amber-400">Quick Trip Profile</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        Essential transporter details (FASTag, GPS & RTO expiries managed by owner)
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap shrink-0 border shadow-xs ${isDark
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  {editingVehicle.ownership === 'MARKET' ? 'Market Hired' : 'Attached Partner'}
                </span>
              </div>
            )}

            <form onSubmit={handleUpdateVehicle}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* EDIT TAB 1: BASIC & OWNERSHIP (OR ONLY VIEW FOR MARKET/ATTACHED) */}
                {(editModalTab === 'basic' || editingVehicle.ownership !== 'OWN') && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Vehicle Registration Number
                        </label>
                        <input
                          type="text"
                          required
                          value={editingVehicle.vehicle_number}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicle_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Fleet Ownership Type
                        </label>
                        <select
                          value={editingVehicle.ownership}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, ownership: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-semibold ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        >
                          <option value="OWN">Own Fleet (Company Owned)</option>
                          <option value="ATTACHED">Attached Truck (Partner Transporter)</option>
                          {editingVehicle.ownership === 'MARKET' && (
                            <option value="MARKET">Market Hired (Trip-based / Broker)</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {(editingVehicle.ownership === 'ATTACHED' || editingVehicle.ownership === 'MARKET') ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {editingVehicle.ownership === 'MARKET' ? 'Owner / Broker / Transporter Name' : 'Attached Partner / Owner Name'} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={editingVehicle.owner_name || ''}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, owner_name: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Owner Contact Phone <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={editingVehicle.owner_phone || ''}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, owner_phone: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Vehicle Body Type
                            </label>
                            <select
                              value={editingVehicle.vehicle_type}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicle_type: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-medium ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            >
                              <option value="TRUCK">Heavy Truck (16T - 25T Taurus)</option>
                              <option value="CONTAINER">Container (28T - 40T Closed Body)</option>
                              <option value="TRAILER">Multi-Axle Trailer (32T+ Flatbed)</option>
                              <option value="MINI_TRUCK">Mini Truck (Eicher / 7T - 14T)</option>
                              <option value="PICKUP">Pickup (Bolero / 2.5T)</option>
                              <option value="TEMPO">Tempo / Local Delivery Carrier</option>
                              <option value="OTHER">Tanker / Bulk Carrier</option>
                            </select>
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Carrying Payload Capacity (Tons)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={editingVehicle.capacity_ton}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, capacity_ton: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Default Assigned Driver
                              </label>
                              <Link href="/users" target="_blank" className="text-[11px] text-amber-400 hover:underline font-semibold">
                                + Add / Manage Drivers
                              </Link>
                            </div>
                            <select
                              value={editingVehicle.assigned_driver_id || ''}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, assigned_driver_id: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            >
                              <option value="">Unassigned (Open Pool)</option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} {d.phone ? `(${d.phone})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Operating Base Hub
                            </label>
                            <select
                              value={editingVehicle.branch_id || ''}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, branch_id: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            >
                              <option value="">{branches.length === 0 ? 'No branches configured yet (Main Yard)' : 'Main Yard / Unassigned'}</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  [{b.branch_code || 'CODE'}] {b.branch_name} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Operational Status
                          </label>
                          <select
                            value={editingVehicle.status}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, status: e.target.value })}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-colors ${isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                              }`}
                          >
                            <option value="AVAILABLE">At Yard (Ready for Dispatch)</option>
                            <option value="ON_ROAD">In Transit (Active On Road)</option>
                            <option value="INACTIVE">Inactive (Deactivated)</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Fuel Type
                            </label>
                            <select
                              value={editingVehicle.fuel_type}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, fuel_type: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            >
                              <option value="DIESEL">Diesel</option>
                              <option value="CNG">CNG</option>
                              <option value="LNG">LNG</option>
                              <option value="ELECTRIC">Electric</option>
                              <option value="PETROL">Petrol</option>
                            </select>
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Make & Model Brand
                            </label>
                            <input
                              type="text"
                              value={editingVehicle.make_model || ''}
                              onChange={(e) => setEditingVehicle({ ...editingVehicle, make_model: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Manufacturing Year
                          </label>
                          <input
                            type="number"
                            value={editingVehicle.manufacturing_year || ''}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, manufacturing_year: e.target.value })}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                              }`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* EDIT TAB 2: SPECS (Company Owned Fleet) */}
                {editingVehicle.ownership === 'OWN' && editModalTab === 'specs' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Vehicle Type / Classification
                        </label>
                        <select
                          value={editingVehicle.vehicle_type}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicle_type: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-medium ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        >
                          <option value="TRUCK">Heavy Truck (16T - 25T Taurus)</option>
                          <option value="CONTAINER">Container (28T - 40T Closed Body)</option>
                          <option value="TRAILER">Multi-Axle Trailer (32T+ Flatbed)</option>
                          <option value="MINI_TRUCK">Mini Truck (Eicher / 7T - 14T)</option>
                          <option value="PICKUP">Pickup (Bolero / 2.5T)</option>
                          <option value="TEMPO">Tempo / City Carrier</option>
                          <option value="OTHER">Tanker / Bulk Carrier</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Carrying Capacity (Tons)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={editingVehicle.capacity_ton}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, capacity_ton: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-bold ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Body Length (Feet)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={editingVehicle.length_ft}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, length_ft: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Chassis Number (VIN)
                        </label>
                        <input
                          type="text"
                          value={editingVehicle.chassis_number}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, chassis_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Engine Number
                        </label>
                        <input
                          type="text"
                          value={editingVehicle.engine_number}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, engine_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT TAB 3: COMPLIANCE (Company Owned Fleet) */}
                {editingVehicle.ownership === 'OWN' && editModalTab === 'compliance' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          RC Number
                        </label>
                        <input
                          type="text"
                          value={editingVehicle.rc_number}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, rc_number: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono uppercase focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          RC Validity Expiry Date
                        </label>
                        <input
                          type="date"
                          value={editingVehicle.rc_expiry}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, rc_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Insurance Expiry Date
                        </label>
                        <input
                          type="date"
                          value={editingVehicle.insurance_expiry}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, insurance_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Fitness Certificate Expiry Date
                        </label>
                        <input
                          type="date"
                          value={editingVehicle.fitness_expiry}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, fitness_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          National / State Permit Expiry Date
                        </label>
                        <input
                          type="date"
                          value={editingVehicle.permit_expiry}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, permit_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Pollution (PUC) Expiry Date
                        </label>
                        <input
                          type="date"
                          value={editingVehicle.puc_expiry}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, puc_expiry: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT TAB 4: TELEMATICS & OPERATIONS (Company Owned Fleet) */}
                {editingVehicle.ownership === 'OWN' && editModalTab === 'telematics' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          FASTag ID / RFID Barcode
                        </label>
                        <input
                          type="text"
                          value={editingVehicle.fastag_id}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, fastag_id: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            AIS-140 GPS Device Tracker ID
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. GPS-TRK-9921 (leave blank if no GPS fitted)"
                            value={editingVehicle.gps_device_id}
                            onChange={(e) => setEditingVehicle({ ...editingVehicle, gps_device_id: e.target.value })}
                            className={`w-full pl-3.5 pr-28 py-2.5 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                              }`}
                          />
                          <div className={`absolute right-3 top-2.5 flex items-center gap-1 text-[10px] font-bold ${editingVehicle.gps_device_id?.trim() ? 'text-emerald-500' : isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${editingVehicle.gps_device_id?.trim() ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`} />
                            {editingVehicle.gps_device_id?.trim() ? 'AIS-140 Live' : 'No GPS'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Current Odometer (km)
                        </label>
                        <input
                          type="number"
                          value={editingVehicle.current_odometer}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, current_odometer: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Home Branch Hub
                        </label>
                        <select
                          value={editingVehicle.branch_id}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, branch_id: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        >
                          <option value="">{branches.length === 0 ? 'No branches configured yet (Main Yard)' : 'Main Yard / Unassigned'}</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              [{b.branch_code || 'CODE'}] {b.branch_name} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Assigned Driver
                          </label>
                          <Link href="/users" target="_blank" className="text-[11px] text-amber-400 hover:underline font-semibold">
                            + Add / Manage Drivers
                          </Link>
                        </div>
                        <select
                          value={editingVehicle.assigned_driver_id}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, assigned_driver_id: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                            }`}
                        >
                          <option value="">Unassigned</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.phone ? `(${d.phone})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Operational Status
                      </label>
                      <select
                        value={editingVehicle.status}
                        onChange={(e) => setEditingVehicle({ ...editingVehicle, status: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-bold ${isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                          }`}
                      >
                        <option value="AVAILABLE">At Yard (Ready for Dispatch)</option>
                        <option value="ON_TRIP">In Transit (On Highway)</option>
                        <option value="MAINTENANCE">In Workshop (Maintenance)</option>
                        <option value="INACTIVE">Inactive (Deactivated)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
                }`}>
                <div className="text-[11px] text-slate-400 font-medium">
                  {editingVehicle.ownership === 'OWN' ? (
                    editModalTab === 'basic' ? 'Step 1 of 4: Vehicle & Ownership' :
                      editModalTab === 'specs' ? 'Step 2 of 4: Body Dimensions & Weight' :
                        editModalTab === 'compliance' ? 'Step 3 of 4: Legal & RTO Expiries' :
                          'Step 4 of 4: FASTag & Operational Hub'
                  ) : (
                    'Market / Attached Truck: Ready for dispatch'
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Back button for multi-step Owned vehicle */}
                  {editingVehicle.ownership === 'OWN' && editModalTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editModalTab === 'specs') setEditModalTab('basic');
                        else if (editModalTab === 'compliance') setEditModalTab('specs');
                        else if (editModalTab === 'telematics') setEditModalTab('compliance');
                      }}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    Cancel
                  </button>

                  {/* If Owned Vehicle and not on last tab: Show 'Next Step' button (Hide Save button) */}
                  {editingVehicle.ownership === 'OWN' && editModalTab !== 'telematics' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (editModalTab === 'basic') {
                          if (!editingVehicle.vehicle_number?.trim()) {
                            setFormError('Please enter a valid vehicle registration number');
                            return;
                          }
                          setFormError('');
                          setEditModalTab('specs');
                        } else if (editModalTab === 'specs') {
                          setEditModalTab('compliance');
                        } else if (editModalTab === 'compliance') {
                          setEditModalTab('telematics');
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next Step</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    /* Save button: Only rendered on the last page / final step */
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black">Remove Vehicle Asset?</h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Are you sure you want to permanently delete vehicle <strong className="text-white font-mono">{vehicleToDelete.plate}</strong> from the fleet register?
                </p>
                <p className="text-[11px] text-amber-500 font-semibold mt-2">
                  This asset will no longer be available for dispatch or trip assignments.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
                >
                  {isSubmitting ? 'Removing...' : 'Yes, Delete Vehicle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Full Specs Details Modal */}
      {isDetailsModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all ${isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
              }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-blue-50 text-blue-600 border-blue-200'
                  }`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight font-mono">{selectedAsset.plate}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${selectedAsset.ownership === 'OWN'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : selectedAsset.ownership === 'ATTACHED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                      }`}>
                      {selectedAsset.ownership === 'OWN' ? 'Own Fleet' : selectedAsset.ownership === 'ATTACHED' ? 'Attached Truck' : 'Market Hired'}
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedAsset.model} • {selectedAsset.capacity} • {selectedAsset.length_ft || '22 ft'} • {selectedAsset.year || '2023'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Status & Location Bar */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Operational Status</span>
                  <span className="font-bold text-sm text-blue-500">{selectedAsset.status_label || selectedAsset.status}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Location / Terminal</span>
                  <span className="font-semibold text-xs">{selectedAsset.location}</span>
                </div>
              </div>

              {/* Attached Owner / Partner Details (if applicable) */}
              {(selectedAsset.ownership === 'ATTACHED' || selectedAsset.ownership === 'MARKET') && (
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
                  }`}>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                    Partner / Attached Transporter Contact
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs">{selectedAsset.owner_name || 'Individual Truck Owner'}</span>
                    </div>
                    {selectedAsset.owner_phone && (
                      <a
                        href={`tel:${selectedAsset.owner_phone}`}
                        className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline font-semibold"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedAsset.owner_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Technical Specifications */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Specifications & Body</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Type</span>
                    <span className="font-semibold">{selectedAsset.type || 'TRUCK'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fuel Type</span>
                    <span className="font-semibold">{selectedAsset.fuel_type || 'DIESEL'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Body Length</span>
                    <span className="font-semibold">{selectedAsset.length_ft || '22 ft'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Capacity</span>
                    <span className="font-semibold">{selectedAsset.capacity}</span>
                  </div>
                </div>
                {(selectedAsset.chassis_number || selectedAsset.engine_number) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/40 text-[11px]">
                    {selectedAsset.chassis_number && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Chassis No (VIN)</span>
                        <span className="font-mono font-bold text-xs">{selectedAsset.chassis_number}</span>
                      </div>
                    )}
                    {selectedAsset.engine_number && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Engine Number</span>
                        <span className="font-mono font-bold text-xs">{selectedAsset.engine_number}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Telematics, FASTag & Odometer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Driver</span>
                  <span className="font-bold text-xs block truncate">{selectedAsset.driver}</span>
                  <span className="text-[10px] text-amber-400 block mt-0.5">{selectedAsset.driver_rating}</span>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">FASTag Barcode</span>
                  <span className="font-mono font-bold text-xs block truncate text-blue-500">
                    {selectedAsset.fastag_id || 'Not Assigned'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">NETC Toll Plaza</span>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Odometer / GPS</span>
                  <span className="font-mono font-bold text-xs block">
                    {selectedAsset.current_odometer ? `${selectedAsset.current_odometer.toLocaleString()} km` : selectedAsset.mileage_mtd}
                  </span>
                  {selectedAsset.gps_device_id ? (
                    <span className="text-[10px] text-emerald-400 block mt-0.5 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{selectedAsset.gps_device_id}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>No GPS Tracker Fitted</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Statutory Legal Compliance Expiries */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Statutory Compliance Expiries</span>
                  {selectedAsset.rc_number && (
                    <span className="text-[10px] font-mono font-bold text-cyan-400">RC: {selectedAsset.rc_number}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-500/10">
                    <span className="text-slate-400 block text-[10px]">RC Expiry</span>
                    <span className="font-semibold text-xs">{selectedAsset.rc_expiry || 'Active'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-500/10">
                    <span className="text-slate-400 block text-[10px]">Insurance</span>
                    <span className="font-semibold text-xs">{selectedAsset.insurance_expiry}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-500/10">
                    <span className="text-slate-400 block text-[10px]">Fitness Cert</span>
                    <span className="font-semibold text-xs">{selectedAsset.fitness_expiry}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-500/10">
                    <span className="text-slate-400 block text-[10px]">Nat. Permit</span>
                    <span className="font-semibold text-xs">{selectedAsset.permit_expiry || 'All India'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-500/10 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">PUC Cert</span>
                    <span className="font-semibold text-xs">{selectedAsset.puc_expiry}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`p-4 border-t flex justify-end ${isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'}`}>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Close Asset Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Driver Modal */}
      {isDriverModalOpen && (
        <div className={`fixed inset-0 z-[9999] backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 ${
          isDark ? 'bg-slate-950/80' : 'bg-slate-900/50'
        }`}>
          <div className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border max-h-[92vh] flex flex-col ${
            isDark ? 'bg-[#0B1020] border-cyan-500/40 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">
                    {editingDriver ? 'Edit Commercial Driver' : 'Register Commercial Driver'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Configure driver credentials, commercial license compliance, and assigned hub.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDriver} className="flex-1 overflow-y-auto p-6 space-y-4">
              {driverFormError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{driverFormError}</span>
                </div>
              )}

              {/* Personal & Badge Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Driver Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-white focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Driver Code / Badge ID
                  </label>
                  <input
                    type="text"
                    value={driverForm.driver_code}
                    onChange={(e) => setDriverForm({ ...driverForm, driver_code: e.target.value })}
                    placeholder="e.g. DRV-001"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border outline-hidden transition-all ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-cyan-400 focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-blue-600 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Mobile Phone & Alt Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={driverCountryCode}
                      onChange={(e) => setDriverCountryCode(e.target.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-bold border outline-hidden cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+65">🇸🇬 +65</option>
                    </select>
                    <input
                      type="tel"
                      required
                      value={driverPhone}
                      onChange={(e) => handleDriverPhoneChange(e.target.value)}
                      placeholder="9876543210"
                      className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border outline-hidden transition-all ${
                        driverPhoneError ? 'border-rose-500' : ''
                      } ${
                        isDark
                          ? 'bg-slate-900/60 border-slate-800 text-white focus:border-cyan-500/50'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {driverPhoneError && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">{driverPhoneError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">Alternate Contact Phone</label>
                  <input
                    type="tel"
                    value={driverForm.alt_phone}
                    onChange={(e) => setDriverForm({ ...driverForm, alt_phone: e.target.value })}
                    placeholder="e.g. 9811223344"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border outline-hidden transition-all ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-white focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Commercial Driving License (DL) details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Commercial DL Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.license_number}
                    onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value.toUpperCase() })}
                    placeholder="DL-1420110012345"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border outline-hidden transition-all ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-white focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">License Classification</label>
                  <select
                    value={driverForm.license_type}
                    onChange={(e) => setDriverForm({ ...driverForm, license_type: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="Heavy Commercial (HMV)">Heavy Commercial (HMV)</option>
                    <option value="Medium Commercial (MGV)">Medium Commercial (MGV)</option>
                    <option value="Light Commercial (LMV)">Light Commercial (LMV)</option>
                    <option value="Hazardous Goods / Tanker">Hazardous Goods / Tanker</option>
                    <option value="Heavy Trailer / Articulated">Heavy Trailer / Articulated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">DL Expiry Date</label>
                  <input
                    type="date"
                    value={driverForm.license_expiry}
                    onChange={(e) => setDriverForm({ ...driverForm, license_expiry: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  />
                </div>
              </div>

              {/* Station Assignment & Remuneration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">Assigned Station / Hub</label>
                  <select
                    value={driverForm.branch_id}
                    onChange={(e) => setDriverForm({ ...driverForm, branch_id: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="">Unassigned Yard</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">Salary Model</label>
                  <select
                    value={driverForm.salary_type}
                    onChange={(e) => setDriverForm({ ...driverForm, salary_type: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="MONTHLY">Monthly Fixed Salary</option>
                    <option value="TRIP_BASED">Trip Commission Based</option>
                    <option value="PER_KM">Per Kilometer Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">Remuneration Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={driverForm.salary_amount}
                    onChange={(e) => setDriverForm({ ...driverForm, salary_amount: e.target.value })}
                    placeholder="25000"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border outline-hidden ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-white focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Address & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">Residential Address</label>
                  <input
                    type="text"
                    value={driverForm.address}
                    onChange={(e) => setDriverForm({ ...driverForm, address: e.target.value })}
                    placeholder="e.g. Village/Town, District, State"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-white focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">Emergency Contact Details</label>
                  <input
                    type="text"
                    value={driverForm.emergency_contact}
                    onChange={(e) => setDriverForm({ ...driverForm, emergency_contact: e.target.value })}
                    placeholder="Name & Emergency Mobile"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-white focus:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold mb-1.5">Operational Status</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="driverStatus"
                      checked={driverForm.status === 'ACTIVE'}
                      onChange={() => setDriverForm({ ...driverForm, status: 'ACTIVE' })}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-emerald-500">Active / Ready for Line-haul</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="driverStatus"
                      checked={driverForm.status === 'INACTIVE'}
                      onChange={() => setDriverForm({ ...driverForm, status: 'INACTIVE' })}
                      className="text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-rose-500">Inactive / On Leave</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={driverSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {driverSubmitting ? 'Saving Driver...' : editingDriver ? 'Update Driver' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Driver Confirmation Modal */}
      {isDriverDeleteOpen && driverToDelete && (
        <div className={`fixed inset-0 z-[9999] backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 ${
          isDark ? 'bg-slate-950/80' : 'bg-slate-900/50'
        }`}>
          <div className={`relative w-full max-w-md rounded-3xl shadow-2xl p-6 border ${
            isDark ? 'bg-[#0B1020] border-rose-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Remove Commercial Driver</h3>
                <p className="text-xs text-slate-400">Transporter Fleet Registry</p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Are you sure you want to remove <span className="font-bold font-mono">{driverToDelete.name}</span> ({driverToDelete.driver_code || driverToDelete.license_number}) from the fleet? Active trip logs and history will be maintained.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsDriverDeleteOpen(false);
                  setDriverToDelete(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDriver}
                disabled={driverSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {driverSubmitting ? 'Deleting...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
