// frontend/app/(owner)/trips/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
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
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useStore } from '../../../store/useStore';

export default function TripsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport, isAdmin, canCreateTrip, canEditTrip, canSettleTrip } = usePermissions();

  const user = useStore((state) => state.user);
  const activeBranch = useStore((state) => state.activeBranch);
  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || user?.assigned_branch_id || null;

  const [trips, setTrips] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [settling, setSettling] = useState(false);
  const [driverAllowance, setDriverAllowance] = useState(1500);

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

  // Login Branch & Movement Filter State
  const loginBranchId = useMemo(() => {
    return userBranchId || (activeBranch?.id && activeBranch.id !== 'ALL' ? activeBranch.id : (typeof activeBranch === 'string' && activeBranch !== 'ALL' ? activeBranch : null));
  }, [userBranchId, activeBranch]);
  const [movementTab, setMovementTab] = useState('ALL'); // 'ALL' | 'OUTBOUND' | 'INBOUND'

  // Vehicle Assignment & Trip Creation State
  const [vehiclesList, setVehiclesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [tripToAssign, setTripToAssign] = useState(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [assignDriverId, setAssignDriverId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Advance & Expense Disbursal Modal State
  const [advExpModalOpen, setAdvExpModalOpen] = useState(false);
  const [advExpTrip, setAdvExpTrip] = useState(null);
  const [advExpType, setAdvExpType] = useState('ADVANCE'); // 'ADVANCE' | 'EXPENSE'
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

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('trip_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [statusFilter, setStatusFilter] = useState('');
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
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      if (loginBranchId) {
        if (movementTab === 'OUTBOUND') {
          url += `&origin_branch_id=${loginBranchId}`;
        } else if (movementTab === 'INBOUND') {
          url += `&dest_branch_id=${loginBranchId}`;
        } else {
          url += `&branch_id=${loginBranchId}`;
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
      const [vRes, bRes, dRes] = await Promise.allSettled([
        api.get('/fleet/vehicles'),
        api.get('/branches'),
        api.get('/fleet/drivers'),
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
    } catch (err) {
      console.error('Failed to load fleet master data for trips:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [page, pageSize, sortBy, sortOrder, statusFilter, debouncedSearch, fromDate, toDate, loginBranchId, movementTab]);

  useEffect(() => {
    fetchMasterData();
  }, []);

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
    setSettleRemarks('Trip advance & highway expense reconciliation closed');
    setShowAddExpenseInSettle(false);
    setSettleNewExpCategory('Fuel & Diesel');
    setSettleNewExpAmount('');
    setSettleNewExpPaymentMethod('CASH');
    setSettleNewExpRemarks('');
    setSettleExpenseError('');
    setLoadingSettleData(true);
    try {
      const [expRes, tripRes] = await Promise.allSettled([
        api.get(`/expenses?trip_id=${trip.id}`),
        api.get(`/trips/${trip.id}`),
      ]);
      if (expRes.status === 'fulfilled' && expRes.value?.data?.success) {
        setSettleExpensesList(expRes.value.data.data || []);
      } else {
        setSettleExpensesList([]);
      }
      if (tripRes.status === 'fulfilled' && tripRes.value?.data?.success) {
        const detailedTrip = tripRes.value.data.data;
        if (detailedTrip) {
          setSelectedTrip((prev) => ({ ...prev, ...detailedTrip }));
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
        const newExp = res.data.data;
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
        remarks: settleRemarks || 'Trip advance & expense reconciliation closed',
      });
      if (res.data?.success) {
        setSelectedTrip(null);
        await fetchTrips();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Settlement failed');
    } finally {
      setSettling(false);
    }
  };

  const handleOpenAddAdvanceOrExp = (trip, defaultType = 'ADVANCE') => {
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

  const columns = useMemo(() => [
    {
      key: 'trip_number',
      label: 'Trip Number',
      width: 170,
      minWidth: 140,
      sortable: true,
      render: (val) => (
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {val}
        </span>
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
      width: 190,
      minWidth: 160,
      sortable: false,
      render: (val, row) => (
        <div className="min-w-0">
          <span className={`font-mono font-bold text-xs truncate block ${row.vehicle ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'}`}>
            {row.vehicle?.vehicle_number || 'Unassigned'}
          </span>
          {row.vehicle?.vehicle_type && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {row.vehicle.vehicle_type} ({row.vehicle.capacity_ton || '10'}T)
            </p>
          )}
        </div>
      )
    },
    {
      key: 'driver',
      label: 'Assigned Driver',
      width: 160,
      minWidth: 130,
      sortable: false,
      render: (val, row) => (
        <div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {row.driver?.name || 'Unassigned'}
          </span>
          {row.driver?.phone && (
            <p className="text-[11px] text-slate-400">{row.driver.phone}</p>
          )}
        </div>
      )
    },
    {
      key: 'total_weight',
      label: 'Cargo Weight',
      width: 140,
      minWidth: 110,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {val ? `${Number(val).toLocaleString()} KG` : '0 KG'}
        </span>
      )
    },
    {
      key: 'financials',
      label: 'Advance / Exp',
      width: 140,
      minWidth: 120,
      sortable: false,
      align: 'right',
      render: (val, row) => (
        <div className="text-xs text-right space-y-0.5">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            ₹{parseFloat(row.driver_advance || 0).toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-slate-400">
            Exp: ₹{parseFloat(row.total_expenses || 0).toLocaleString('en-IN')}
          </p>
        </div>
      )
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
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge status={val} size="xs" />
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
      key: 'settlement',
      label: 'Settlement',
      width: 110,
      minWidth: 90,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        row.settlement_status === 'SETTLED' ? (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
            SETTLED
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Pending</span>
        )
      )
    },
    {
      key: 'inbound_arrival',
      label: 'Dispatch & Unload',
      width: 175,
      minWidth: 155,
      sortable: false,
      align: 'center',
      render: (val, row) => {
        const effectiveBranch = loginBranchId;
        const currentBranchObj = branchesList.find((b) => b.id === effectiveBranch);
        const currentCity = (currentBranchObj?.city || '').toLowerCase();
        const currentName = (currentBranchObj?.branch_name || '').toLowerCase();
        const isCurrentDelhi = currentCity.includes('delhi') || currentName.includes('delhi');
        const isCurrentMumbai = currentCity.includes('mumbai') || currentName.includes('mumbai');
        const isCurrentBlr = currentCity.includes('bengaluru') || currentCity.includes('bangalore') || currentName.includes('bengaluru') || currentName.includes('bangalore');

        const isOutboundFromHere = Boolean(
          effectiveBranch && (
            row.origin_branch_id === effectiveBranch ||
            (isCurrentDelhi && row.origin_city?.toLowerCase().includes('delhi')) ||
            (isCurrentMumbai && row.origin_city?.toLowerCase().includes('mumbai')) ||
            (isCurrentBlr && (row.origin_city?.toLowerCase().includes('bengaluru') || row.origin_city?.toLowerCase().includes('bangalore')))
          )
        );

        // 1. If trip was DISPATCHED FROM this branch (Outbound dispatch from here)
        if (isOutboundFromHere) {
          return (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60 whitespace-nowrap shadow-2xs"
              title="Dispatched from this origin hub. En route on highway."
            >
              <Send className="w-3 h-3 text-blue-500 dark:text-cyan-400" />
              Dispatched
            </span>
          );
        }

        // 2. If trip is COMPLETED
        if (row.status === 'COMPLETED') {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Unloaded & Done
            </span>
          );
        }

        // 3. If trip is RUNNING / READY (In Transit / Arriving)
        if (row.status === 'RUNNING' || row.status === 'READY') {
          const hasArrived = Boolean(row.end_odometer && Number(row.end_odometer) > 0) || Boolean(row.is_arrived);

          if (!hasArrived) {
            // First step: Arrival not yet recorded -> Show "Record Arrival"
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenRecordArrival(row);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-white bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 dark:hover:bg-indigo-600 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                title={`Record Physical Seal & Gate Arrival at ${row.destBranch?.city || 'Destination'}`}
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                Arrival
              </button>
            );
          } else {
            // Second step: Arrival recorded -> Show "Unload Cargo" or "Audit & Unload" if seal discrepancy
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
        }

        return <span className="text-xs text-slate-400 font-medium">-</span>;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 180,
      minWidth: 160,
      sortable: false,
      align: 'center',
      render: (val, row) => {
        const effectiveBranch = loginBranchId;
        const currentBranchObj = branchesList.find((b) => b.id === effectiveBranch);
        const currentCity = (currentBranchObj?.city || '').toLowerCase();
        const currentName = (currentBranchObj?.branch_name || '').toLowerCase();
        const isCurrentDelhi = currentCity.includes('delhi') || currentName.includes('delhi');
        const isCurrentMumbai = currentCity.includes('mumbai') || currentName.includes('mumbai');
        const isCurrentBlr = currentCity.includes('bengaluru') || currentCity.includes('bangalore') || currentName.includes('bengaluru') || currentName.includes('bangalore');

        // Only the Origin/Dispatch branch (who gave the cash advance) or Admins can settle
        const isOriginDispatchBranch = Boolean(
          !effectiveBranch ||
          isAdmin ||
          row.origin_branch_id === effectiveBranch ||
          (isCurrentDelhi && row.origin_city?.toLowerCase().includes('delhi')) ||
          (isCurrentMumbai && row.origin_city?.toLowerCase().includes('mumbai')) ||
          (isCurrentBlr && (row.origin_city?.toLowerCase().includes('bengaluru') || row.origin_city?.toLowerCase().includes('bangalore')))
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
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3 h-3" />
                Settled
              </span>
            )}
          </div>
        );
      }
    }
  ], [canEdit, canSettleTrip, canEditTrip, isAdmin, loginBranchId, branchesList]);

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Created', value: 'CREATED' },
    { label: 'Loading', value: 'LOADING' },
    { label: 'Dispatched', value: 'DISPATCHED' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Settled', value: 'SETTLED' },
  ];

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0B1120]' : 'bg-[#F6F8FB]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-500" />
                Trip and Movement
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitor fleet journeys, assign commercial vehicles, and reconcile trip settlements.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <Link
                href="/load-planning"
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Load Planning Dock</span>
              </Link>
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
                {/* Movement Tabs (All Trips / Outbound / Inbound) */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
                  {[
                    { value: 'ALL', label: 'All Trips' },
                    { value: 'OUTBOUND', label: 'Outbound Dispatches' },
                    { value: 'INBOUND', label: 'Inbound Arrivals' },
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

                {/* Status Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Status:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 shadow-2xs'
                    }`}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
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
          {selectedTrip && (
            <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex min-h-full items-center justify-center bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
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
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black tracking-tight">Trip Expense Settlement & Reconciliation</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          Final Debrief
                        </span>
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
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Assigned Vehicle:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">
                      {selectedTrip.vehicle?.vehicle_number || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Scrollable Body */}
                {(() => {
                  const totalAdv = parseFloat(selectedTrip.driver_advance || 0);
                  const totalExp = settleExpensesList.length > 0
                    ? settleExpensesList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0)
                    : parseFloat(selectedTrip.total_expenses || 0);
                  const bhatta = parseFloat(driverAllowance || 0);
                  // Logistics Formula:
                  // Balance = Total Advance - (Total Highway Expenses + Driver Bhatta)
                  // If balance > 0 => Driver has excess advance -> Driver must refund to Company
                  // If balance < 0 => Expenses + Bhatta exceeded advance -> Company owes balance to Driver
                  const netBalance = totalAdv - (totalExp + bhatta);
                  const isPayableToDriver = netBalance < 0;
                  const isRefundFromDriver = netBalance > 0;
                  const absBalance = Math.abs(netBalance);

                  return (
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 max-h-[calc(92vh-150px)]">
                      {/* Financial KPI Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                            ₹{absBalance.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] font-semibold opacity-80">
                            {isPayableToDriver ? 'Payable to Driver' : isRefundFromDriver ? 'Refund to Transporter' : 'Balanced (₹0)'}
                          </span>
                        </div>
                      </div>

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
                                  Category *
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
                                  Amount (₹) *
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
                                      {exp.category?.name || exp.category_id || 'Expense'}
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
                              If driver submitted diesel or toll bills upon arrival, click &quot;+ Add Expense / Slip&quot; above to log them before closing.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Section: Driver Allowance (Bhatta) Adjustment */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Driver Daily Allowance (Bhatta) ₹ *
                          </label>
                          <div className="flex items-center gap-1.5">
                            {[500, 1000, 1500, 2000].map((amt) => (
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
                                ₹{amt}
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

                      {/* Section: Settlement Remarks */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Reconciliation & Closing Remarks (Optional)
                        </label>
                        <input
                          type="text"
                          value={settleRemarks}
                          onChange={(e) => setSettleRemarks(e.target.value)}
                          placeholder="e.g. Verified fuel slips and settled cash balance with driver at Bangalore hub desk"
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
                  const totalAdv = parseFloat(selectedTrip.driver_advance || 0);
                  const totalExp = settleExpensesList.length > 0
                    ? settleExpensesList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0)
                    : parseFloat(selectedTrip.total_expenses || 0);
                  const bhatta = parseFloat(driverAllowance || 0);
                  const netBalance = totalAdv - (totalExp + bhatta);
                  const isPayableToDriver = netBalance < 0;
                  const isRefundFromDriver = netBalance > 0;
                  const absBalance = Math.abs(netBalance);

                  return (
                    <div className={`p-4 px-6 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                      isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="text-xs">
                        <span className="text-slate-400">Final Decision: </span>
                        {isPayableToDriver ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Pay Driver ₹{absBalance.toLocaleString('en-IN')}
                          </span>
                        ) : isRefundFromDriver ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            Collect ₹{absBalance.toLocaleString('en-IN')} Cash Refund
                          </span>
                        ) : (
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            Zero Balance Reconciled
                          </span>
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
                                {isPayableToDriver
                                  ? `Pay ₹${absBalance} & Settle Trip`
                                  : isRefundFromDriver
                                  ? `Collect ₹${absBalance} & Settle Trip`
                                  : 'Confirm & Settle Trip'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}


          {/* Quick Assign Vehicle Modal */}
          {isAssignVehicleOpen && tripToAssign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
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
                      <h3 className="text-base font-black">Assign Vehicle</h3>
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
                      Select Vehicle *
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
                      {driversList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.phone ? `(${d.phone})` : ''}
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
            </div>
          )}

          {/* Quick Disburse Driver Advance & Log Trip Expense Modal */}
          {advExpModalOpen && advExpTrip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
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
                      <h2 className="text-base font-black tracking-tight">Driver Advance & Trip Expenses</h2>
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
                            Disbursed Amount (₹) *
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
                            Expense Category *
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
                            Expense Amount (₹) *
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
            </div>
          )}

          {/* Inbound Gate-In Record Arrival Modal */}
          {recordArrivalModalOpen && arrivalTrip && (
            <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex min-h-full items-center justify-center">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
                onClick={() => {
                  if (!submittingArrival) {
                    setRecordArrivalModalOpen(false);
                    setArrivalTrip(null);
                  }
                }}
              />

              {/* Modal Container */}
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
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Vehicle Arrival & Gate-In
                      </h3>
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
                        <span>Physical Transit Seal on Arrival *</span>
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
                            Incident Category / Cause *
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
                            Discrepancy Explanation & Driver Statement *
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
                        <span>Arrival End Odometer (KM) *</span>
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
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
