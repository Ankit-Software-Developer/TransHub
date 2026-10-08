// frontend/app/(owner)/unload-planning/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import { useStore } from '../../../store/useStore';
import api from '../../../services/api';
import {
  PackageCheck,
  Truck,
  Boxes,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
  Search,
  FileText,
  Sparkles,
  Clock,
  User,
  Phone,
  RotateCw,
  Printer,
  X,
  ExternalLink,
  Layers,
  Building2,
  Gauge,
  Info,
  Lock,
  Minus,
  Plus,
  ArrowDownToLine,
  Check
} from 'lucide-react';

function UnloadPlanningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTripId = searchParams.get('trip_id') || '';

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const user = useStore((state) => state.user);
  const activeBranch = useStore((state) => state.activeBranch);
  const { isAdmin, isBranchManager } = usePermissions();

  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || user?.assigned_branch_id || null;

  // Master Data
  const [branches, setBranches] = useState([]);
  const [selectedDestBranchId, setSelectedDestBranchId] = useState(() => {
    return userBranchId || 'ALL';
  });
  const [inboundTrips, setInboundTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Selected Trip & Manifest
  const [selectedTripId, setSelectedTripId] = useState(initialTripId);
  const [tripData, setTripData] = useState(null);
  const [gateArrivalDetails, setGateArrivalDetails] = useState(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  // Seal Inspection & Telemetry Form
  const [physicalSealNumber, setPhysicalSealNumber] = useState('');
  const [sealStatus, setSealStatus] = useState('INTACT'); // 'INTACT' | 'MISMATCH' | 'BROKEN' | 'MISSING'
  const [sealMismatchNote, setSealMismatchNote] = useState('');
  const [arrivalOdometer, setArrivalOdometer] = useState('');
  const [unloadingBay, setUnloadingBay] = useState('Bay 1');
  const [supervisorName, setSupervisorName] = useState(user?.name || 'Hub Manager');
  const [unloadingRemarks, setUnloadingRemarks] = useState('');

  // Cargo Dockets Tally State
  // { [consignmentId]: { received_packages, condition: 'GOOD'|'DAMAGED'|'SHORTAGE', remarks: '', verified: boolean } }
  const [docketTallies, setDocketTallies] = useState({});
  const [searchFilter, setSearchFilter] = useState('');

  // Submitting & Completion Result
  const [submitting, setSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch branches
  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        const list = res.data?.data?.branches || res.data?.data || [];
        if (isMounted) {
          setBranches(Array.isArray(list) ? list : []);
          if (userBranchId) {
            setSelectedDestBranchId(userBranchId);
          }
        }
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, [userBranchId]);

  const [enRouteTripsCount, setEnRouteTripsCount] = useState(0);

  // Helper: check if a trip has had physical gate arrival recorded
  const isTripArrived = (t) => {
    if (!t) return false;
    const hasGateIn = Boolean(t.remarks && t.remarks.includes('[GATE-IN ARRIVAL]'));
    const hasEndOdo = Boolean(t.end_odometer && Number(t.end_odometer) > 0);
    const isArrivedFlag = Boolean(t.is_arrived);
    return hasGateIn || hasEndOdo || isArrivedFlag;
  };

  // Helper: format gate arrival info for selector options
  const getTripGateSummary = (t) => {
    if (t.remarks && t.remarks.includes('[GATE-IN ARRIVAL]')) {
      const sealMatch = t.remarks.match(/Seal:\s*([^\s|()]+)(?:\s*\(([^)]+)\))?/i);
      const sealNum = sealMatch?.[1] && sealMatch[1] !== 'N/A' ? sealMatch[1].trim() : (t.dispatches?.[0]?.seal_number || 'N/A');
      const sealSt = sealMatch?.[2] ? sealMatch[2].trim().toUpperCase() : 'INTACT';
      return `[✓ Gate Arrived: Seal ${sealNum} (${sealSt})]`;
    }
    if (t.end_odometer && Number(t.end_odometer) > 0) {
      return `[✓ Gate Arrived • Odo: ${t.end_odometer} KM]`;
    }
    return '[✓ Gate-In Arrival Complete]';
  };

  // 2. Fetch running trips inbound to destination hub
  const fetchInboundTrips = useCallback(async () => {
    setLoadingTrips(true);
    try {
      let url = '/trips?status=RUNNING,READY&limit=50&sort_by=created_at&sort_order=DESC';
      if (selectedDestBranchId && selectedDestBranchId !== 'ALL') {
        url += `&dest_branch_id=${selectedDestBranchId}`;
      }
      const res = await api.get(url);
      const list = res.data?.data || [];
      const allInbound = Array.isArray(list) ? list : [];

      // Only show trips whose Arrival has been completed (gate-in seal & odo matched in trips table)
      const arrivedTrips = allInbound.filter(isTripArrived);
      const enRouteCount = allInbound.filter((t) => !isTripArrived(t)).length;

      setInboundTrips(arrivedTrips);
      setEnRouteTripsCount(enRouteCount);

      if (selectedTripId && !arrivedTrips.some((t) => t.id === selectedTripId)) {
        const unarrivedSelected = allInbound.find((t) => t.id === selectedTripId);
        if (unarrivedSelected && !isTripArrived(unarrivedSelected)) {
          setSelectedTripId('');
          setErrorMessage(`Trip #${unarrivedSelected.trip_number} is currently en route. Arrival verification (seal & odometer gate-in) must first be completed via [ 📍 Arrival ] in the Trips Table before unloading cargo.`);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inbound trips', err);
      setInboundTrips([]);
      setEnRouteTripsCount(0);
    } finally {
      setLoadingTrips(false);
    }
  }, [selectedDestBranchId, selectedTripId]);

  useEffect(() => {
    fetchInboundTrips();
  }, [fetchInboundTrips]);

  // 3. Fetch Trip Manifest when selected
  const fetchManifest = useCallback(async (tripId) => {
    if (!tripId) {
      setTripData(null);
      setGateArrivalDetails(null);
      setDocketTallies({});
      return;
    }
    setLoadingManifest(true);
    setErrorMessage('');
    try {
      const res = await api.get(`/trips/${tripId}/manifest`);
      const trip = res.data?.data;
      if (trip) {
        setTripData(trip);

        // Pre-fill physical seal and arrival odometer with the details verified during Gate-In arrival
        const originSeal = trip.dispatches?.[0]?.seal_number || '';
        let gateSeal = originSeal;
        let gateStatus = 'INTACT';
        let gateOdo = trip.end_odometer ? String(trip.end_odometer) : String(trip.start_odometer || '');
        let gateBay = 'Bay 1';
        let arrivalTimestamp = '';
        let gateNotes = '';
        let isArrivalRecorded = false;

        if (trip.remarks && trip.remarks.includes('[GATE-IN ARRIVAL]')) {
          isArrivalRecorded = true;
          const sealMatch = trip.remarks.match(/Seal:\s*([^\s|()]+)(?:\s*\(([^)]+)\))?/i);
          if (sealMatch) {
            if (sealMatch[1] && sealMatch[1] !== 'N/A') gateSeal = sealMatch[1].trim();
            if (sealMatch[2]) gateStatus = sealMatch[2].trim().toUpperCase();
          }
          const odoMatch = trip.remarks.match(/End Odo:\s*(\d+)/i);
          if (odoMatch) {
            gateOdo = odoMatch[1];
          }
          const bayMatch = trip.remarks.match(/Bay:\s*([^|]+)/i);
          if (bayMatch) {
            gateBay = bayMatch[1].trim();
          }
          const timeMatch = trip.remarks.match(/Time:\s*([^\s|]+)/i);
          if (timeMatch) {
            arrivalTimestamp = timeMatch[1].trim();
          }
          const notesMatch = trip.remarks.match(/Notes:\s*([^|\n]+)/i);
          if (notesMatch) {
            gateNotes = notesMatch[1].trim();
          }
          const discMatch = trip.remarks.match(/Discrepancy:\s*([^|\n]+)/i);
          if (discMatch) {
            setSealMismatchNote(discMatch[1].trim());
          }
        } else if (trip.end_odometer && Number(trip.end_odometer) > 0) {
          isArrivalRecorded = true;
        }

        const discMatchAll = trip.remarks ? trip.remarks.match(/Discrepancy:\s*([^|\n]+)/i) : null;
        const discrepancyReason = discMatchAll ? discMatchAll[1].trim() : '';

        setGateArrivalDetails({
          isArrivalRecorded,
          originSeal,
          gateSeal,
          gateStatus,
          gateOdo,
          gateBay,
          arrivalTimestamp,
          gateNotes,
          discrepancyReason,
        });

        setPhysicalSealNumber(gateSeal);
        setSealStatus(gateStatus);
        setArrivalOdometer(gateOdo);
        if (gateBay) setUnloadingBay(gateBay);

        // Initialize tallies for all loaded consignments
        const initialTallies = {};
        const consignments = trip.consignments || [];
        consignments.forEach((c) => {
          initialTallies[c.id] = {
            received_packages: c.packages_count,
            condition: 'GOOD',
            remarks: '',
            verified: true,
          };
        });
        setDocketTallies(initialTallies);
      }
    } catch (err) {
      console.error('Failed to load trip manifest', err);
      setErrorMessage(err.response?.data?.message || 'Failed to retrieve trip unload manifest.');
      setTripData(null);
      setGateArrivalDetails(null);
    } finally {
      setLoadingManifest(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      fetchManifest(selectedTripId);
    }
  }, [selectedTripId, fetchManifest]);

  // Dispatched Seal from origin
  const dispatchedSealNumber = useMemo(() => {
    return tripData?.dispatches?.[0]?.seal_number || '';
  }, [tripData]);

  // Real-time Seal Comparison Logic
  const sealComparison = useMemo(() => {
    if (!physicalSealNumber.trim()) {
      return { status: 'PENDING', label: 'Awaiting Seal Entry', color: 'slate' };
    }
    if (sealStatus === 'BROKEN') {
      return { status: 'BROKEN', label: 'Seal Broken / Damaged in Transit', color: 'rose' };
    }
    if (sealStatus === 'MISSING') {
      return { status: 'MISSING', label: 'Seal Missing at Destination', color: 'amber' };
    }

    const cleanPhysical = physicalSealNumber.trim().toUpperCase();
    const cleanDispatched = dispatchedSealNumber.trim().toUpperCase();

    if (cleanDispatched && cleanPhysical === cleanDispatched) {
      return { status: 'MATCH', label: 'Seal Intact & Matched', color: 'emerald' };
    } else if (cleanDispatched && cleanPhysical !== cleanDispatched) {
      return { status: 'MISMATCH', label: 'Seal Mismatch / Tampered Alert', color: 'rose' };
    }
    return { status: 'UNVERIFIED', label: 'Dispatched Seal Not Found', color: 'amber' };
  }, [physicalSealNumber, dispatchedSealNumber, sealStatus]);

  // Distance calculation
  const startOdo = parseInt(tripData?.start_odometer || 0, 10);
  const endOdo = parseInt(arrivalOdometer || 0, 10);
  const endOdoVal = gateArrivalDetails?.gateOdo || arrivalOdometer || tripData?.end_odometer || startOdo;
  const endOdoNum = parseInt(endOdoVal || 0, 10);
  const distanceCovered = endOdo >= startOdo ? endOdo - startOdo : 0;
  const isOdometerInvalid = arrivalOdometer !== '' && endOdo < startOdo;

  // Filtered Consignments list
  const loadedConsignments = useMemo(() => {
    return tripData?.consignments || [];
  }, [tripData]);

  const filteredConsignments = useMemo(() => {
    if (!searchFilter.trim()) return loadedConsignments;
    const q = searchFilter.toLowerCase();
    return loadedConsignments.filter((c) => {
      const lr = (c.lr_number || c.docket_number || '').toLowerCase();
      const consignor = (c.consignor?.name || '').toLowerCase();
      const consignee = (c.consignee?.name || '').toLowerCase();
      const mat = (c.material_description || '').toLowerCase();
      return lr.includes(q) || consignor.includes(q) || consignee.includes(q) || mat.includes(q);
    });
  }, [loadedConsignments, searchFilter]);

  // Tally Statistics
  const tallyStats = useMemo(() => {
    let totalExpectedPkgs = 0;
    let totalReceivedPkgs = 0;
    let goodCount = 0;
    let damagedCount = 0;
    let shortCount = 0;
    let unverifiedCount = 0;

    loadedConsignments.forEach((c) => {
      totalExpectedPkgs += c.packages_count;
      const tally = docketTallies[c.id];
      if (tally) {
        totalReceivedPkgs += parseInt(tally.received_packages || 0, 10);
        if (tally.condition === 'DAMAGED') damagedCount++;
        else if (tally.condition === 'SHORTAGE') shortCount++;
        else goodCount++;
      } else {
        unverifiedCount++;
      }
    });

    return {
      totalDockets: loadedConsignments.length,
      totalExpectedPkgs,
      totalReceivedPkgs,
      goodCount,
      damagedCount,
      shortCount,
      unverifiedCount,
    };
  }, [loadedConsignments, docketTallies]);

  // Tally handlers
  const handleUpdateTally = (consignmentId, field, value) => {
    setDocketTallies((prev) => ({
      ...prev,
      [consignmentId]: {
        ...prev[consignmentId],
        [field]: value,
      },
    }));
  };

  const handleMarkAllGood = () => {
    const next = {};
    loadedConsignments.forEach((c) => {
      next[c.id] = {
        received_packages: c.packages_count,
        condition: 'GOOD',
        remarks: '',
        verified: true,
      };
    });
    setDocketTallies(next);
  };

  // Submit Unload & Complete Trip
  const handleSubmitUnload = async (e) => {
    e.preventDefault();
    if (!selectedTripId || !tripData) {
      alert('Please select an active inbound trip.');
      return;
    }

    if (isOdometerInvalid) {
      alert(`Arrival odometer (${endOdo} KM) cannot be less than departure odometer (${startOdo} KM).`);
      return;
    }

    if (!physicalSealNumber.trim()) {
      alert('Please enter or verify the physical seal number observed on the container.');
      return;
    }

    if (sealComparison.status === 'MISMATCH' && !sealMismatchNote.trim()) {
      alert('Seal mismatch detected! Please document supervisor notes regarding the seal discrepancy before proceeding.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const tallyPayload = Object.entries(docketTallies).map(([consignment_id, tally]) => ({
        consignment_id,
        received_packages: parseInt(tally.received_packages || 0, 10),
        condition: tally.condition,
        remarks: tally.remarks || '',
      }));

      const finalRemarks = [
        unloadingRemarks,
        sealComparison.status === 'MISMATCH' ? `[SEAL MISMATCH] Dispatched: ${dispatchedSealNumber}, Received: ${physicalSealNumber}. Reason: ${sealMismatchNote}` : null,
      ].filter(Boolean).join(' | ');

      const payload = {
        end_odometer: endOdo,
        received_seal_number: physicalSealNumber.trim(),
        seal_status: sealComparison.status === 'MATCH' ? 'INTACT' : sealStatus,
        unloading_bay: unloadingBay,
        supervisor_name: supervisorName,
        unloading_remarks: finalRemarks,
        docket_tallies: tallyPayload,
      };

      const res = await api.post(`/trips/${selectedTripId}/complete-unload`, payload);
      const data = res.data?.data;

      setCompletionResult({
        trip_number: tripData.trip_number,
        vehicle_number: tripData.vehicle?.vehicle_number || 'Vehicle',
        origin_city: tripData.originBranch?.city || tripData.origin_city,
        dest_branch: tripData.destBranch?.branch_name || 'Destination Hub',
        km_run: distanceCovered,
        totalDockets: loadedConsignments.length,
        totalPkgs: tallyStats.totalReceivedPkgs,
        goodCount: tallyStats.goodCount,
        damagedCount: tallyStats.damagedCount,
        shortCount: tallyStats.shortCount,
        completed_at: new Date().toLocaleTimeString(),
        unloading_bay: unloadingBay,
        seal_status: sealComparison.status,
      });

      // Refresh list
      fetchInboundTrips();
    } catch (err) {
      console.error('Failed to complete trip unload', err);
      setErrorMessage(err.response?.data?.message || 'Failed to complete trip and unload dockets.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintMemo = () => {
    window.print();
  };

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0B1120]' : 'bg-[#F6F8FB]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/20">
                  <PackageCheck className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Unload Planning & Inbound Dock
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verify transit seal integrity, record arrival odometer, tally docket cargo, and complete line-haul movement.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/load-planning"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
              >
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Load Planning Dock</span>
              </Link>
              <Link
                href="/trips"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
              >
                <Truck className="w-3.5 h-3.5 text-cyan-500" />
                <span>Trips Registry</span>
              </Link>
            </div>
          </div>

          {/* Success Result View */}
          {completionResult ? (
            <div className="p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-md space-y-6 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Gate-In & Unload Finalized
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  Trip #{completionResult.trip_number} Completed Successfully
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto mt-1">
                  Cargo unloaded at <strong>{completionResult.dest_branch}</strong>. Commercial vehicle <strong>{completionResult.vehicle_number}</strong> released to destination yard as <em>AVAILABLE</em>.
                </p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Transit Run</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {completionResult.km_run} KM
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Dockets Received</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {completionResult.totalDockets} LRs
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Packages</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {completionResult.totalPkgs} Pkgs
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo Condition</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                    {completionResult.goodCount} Good
                    {completionResult.damagedCount > 0 && ` | ${completionResult.damagedCount} Damaged`}
                    {completionResult.shortCount > 0 && ` | ${completionResult.shortCount} Short`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintMemo}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  Print Inbound Memo / GRN
                </button>
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <Truck className="w-4 h-4" />
                  Proceed to Trip Settlement
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCompletionResult(null);
                    setSelectedTripId('');
                    setTripData(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Unload Another Inbound Trip
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Destination Hub Filter & Trip Selector Card */}
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Step 1 • Inbound Yard Gate-In
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Select Arriving Vehicle & Inbound Trip
                    </h2>
                  </div>

                  {/* Destination Branch Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Receiving Hub:
                    </span>
                    <select
                      value={selectedDestBranchId}
                      onChange={(e) => setSelectedDestBranchId(e.target.value)}
                      disabled={isBranchManager && userBranchId}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      {isAdmin && <option value="ALL">🌐 All Company Hubs</option>}
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          [{b.branch_code || 'CODE'}] {b.branch_name} • {b.city}{b.pincode ? ` (${b.pincode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Inbound Trip Selector Dropdown */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Choose Arrived Trip (Gate-In Completed)</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {inboundTrips.length} Arrived Trip{inboundTrips.length !== 1 ? 's' : ''} Ready to Unload
                        </span>
                      </label>
                      <select
                        value={selectedTripId}
                        onChange={(e) => setSelectedTripId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Choose Arrived Inbound Trip (Gate-In Verified) --</option>
                        {inboundTrips.map((t) => (
                          <option key={t.id} value={t.id}>
                            Trip #{t.trip_number} • {t.vehicle?.vehicle_number || 'Vehicle'} • {getTripGateSummary(t)} • From: {t.originBranch?.branch_code ? `[${t.originBranch.branch_code}] ` : ''}{t.originBranch?.branch_name || t.origin_city} → To: {t.destBranch?.branch_code ? `[${t.destBranch.branch_code}] ` : ''}{t.destBranch?.branch_name || t.destination_city} ({t.total_packages || 0} Pkgs)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={fetchInboundTrips}
                        disabled={loadingTrips}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${loadingTrips ? 'animate-spin text-emerald-500' : ''}`} />
                        <span>Refresh Inbound Queue</span>
                      </button>
                    </div>
                  </div>

                  {/* Informative En-Route Notification Banner */}
                  {enRouteTripsCount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-300">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                        <div>
                          <span className="font-bold">
                            {enRouteTripsCount} inbound trip{enRouteTripsCount !== 1 ? 's are' : ' is'} currently in transit on the highway.
                          </span>{' '}
                          <span className="text-amber-800/80 dark:text-amber-400/90">
                            Physical seal integrity and arrival odometer must first be recorded via <strong>[ 📍 Arrival ]</strong> in the Trips Registry before unloading cargo.
                          </span>
                        </div>
                      </div>
                      <Link
                        href="/trips"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs whitespace-nowrap shadow-2xs transition-all text-center self-start sm:self-auto"
                      >
                        <span>Open Trips Registry</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Selected Trip Overview Card */}
                {loadingManifest ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Loading vehicle manifest and loaded dockets...
                    </p>
                  </div>
                ) : tripData ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {tripData.vehicle?.vehicle_number || 'N/A'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              {tripData.vehicle?.ownership || 'OWN'} FLEET
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Driver: <strong>{tripData.driver?.name || 'Assigned Driver'}</strong> • Ph: {tripData.driver?.phone || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Trip Number
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          #{tripData.trip_number}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Dispatched: {tripData.trip_date || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-500/15 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Departure Origin</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {tripData.originBranch?.branch_code ? `[${tripData.originBranch.branch_code}] ` : ''}{tripData.originBranch?.branch_name || tripData.origin_city}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Destination Hub</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {tripData.destBranch?.branch_code ? `[${tripData.destBranch.branch_code}] ` : ''}{tripData.destBranch?.branch_name || tripData.destination_city}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Departure Odometer</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {startOdo} KM
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Loaded Payload</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {tripData.total_packages || loadedConsignments.length} Pkgs • {tripData.total_weight || 0} KG
                        </p>
                      </div>
                    </div>

                    {/* Gate-In Arrival Verification Match Summary Card */}
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-emerald-500/25 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500 text-white shadow-xs">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 tracking-wide">
                              Gate-In Arrival Details Matched from Trips Registry
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Physical container seal & telemetry verified at destination inbound gate
                            </p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                          (gateArrivalDetails?.gateStatus || sealStatus) === 'INTACT'
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                        }`}>
                          {(gateArrivalDetails?.gateStatus || sealStatus) === 'INTACT' ? '✓ SEAL INTACT & MATCHED' : `⚠️ ${gateArrivalDetails?.gateStatus || sealStatus}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-emerald-500/15">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Origin Dispatched Seal</span>
                          <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                            {dispatchedSealNumber || 'N/A'}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Arrival Physical Seal</span>
                          <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                            {gateArrivalDetails?.gateSeal || physicalSealNumber || 'N/A'}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Gate Arrival Odometer</span>
                          <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                            {gateArrivalDetails?.gateOdo || arrivalOdometer || tripData.end_odometer || startOdo} KM
                            {endOdoNum > startOdo && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
                                (+{endOdoNum - startOdo} KM)
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Receiving Dock Bay</span>
                          <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                            {gateArrivalDetails?.gateBay || unloadingBay || 'Bay 1'}
                          </p>
                        </div>
                      </div>

                      {gateArrivalDetails?.gateNotes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Gate Inspector Notes:</span> {gateArrivalDetails.gateNotes}
                        </div>
                      )}

                      {gateArrivalDetails?.discrepancyReason && (
                        <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-300 dark:border-amber-700 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400">
                              Security Alert • Seal Discrepancy Recorded at Gate-In:
                            </span>
                            <p className="font-bold text-amber-950 dark:text-amber-100 mt-0.5">{gateArrivalDetails.discrepancyReason}</p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                              <strong>Standard Transporter SOP:</strong> 100% itemized physical tally of all loaded consignments required before completing unload.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                    <Truck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto stroke-[1.5]" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      {inboundTrips.length > 0 ? 'Select an Arrived Trip to Begin Unloading' : 'No Arrived Inbound Trips in Queue'}
                    </p>
                    <p className="max-w-md mx-auto text-slate-500 dark:text-slate-400">
                      {inboundTrips.length > 0
                        ? 'Choose a gate-in verified trip from the dropdown above to review seal integrity, verify dockets, and unload cargo.'
                        : enRouteTripsCount > 0
                        ? `${enRouteTripsCount} trip(s) are en route. Go to the Trips Registry and click [ 📍 Arrival ] to record physical seal & gate arrival first.`
                        : 'No active line-haul trips are scheduled inbound to this receiving hub.'}
                    </p>
                    {inboundTrips.length === 0 && enRouteTripsCount > 0 && (
                      <div className="pt-2">
                        <Link
                          href="/trips"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          <span>Go to Trips Registry to Complete Arrival</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {tripData && (
                <form onSubmit={handleSubmitUnload} className="space-y-6">
                  {/* Step 2: Seal Verification & Telemetry */}
                  <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
                    <div className="pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-wider">
                        Step 2 • Transit Security & Gate Inspection
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        Physical Seal Verification & Odometer Telemetry
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Seal Verification */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-blue-500" />
                            <span>Transit Container Seal</span>
                          </label>
                          <div className="flex items-center gap-2">
                            {dispatchedSealNumber && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
                                Origin Dispatched: {dispatchedSealNumber}
                              </span>
                            )}
                            {gateArrivalDetails?.isArrivalRecorded && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Gate-In: {gateArrivalDetails.gateSeal || physicalSealNumber}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            required
                            value={physicalSealNumber}
                            onChange={(e) => setPhysicalSealNumber(e.target.value)}
                            placeholder="Enter Physical Seal Number observed on truck"
                            className="w-full px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Seal Match Banner */}
                        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                          sealComparison.color === 'emerald'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : sealComparison.color === 'rose'
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {sealComparison.color === 'emerald' ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span className="font-bold">{sealComparison.label}</span>
                          </div>

                          {dispatchedSealNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                setPhysicalSealNumber(dispatchedSealNumber);
                                setSealStatus('INTACT');
                              }}
                              className="text-[10px] font-bold underline hover:opacity-80"
                            >
                              Copy Origin Seal
                            </button>
                          )}
                        </div>

                        {/* Seal Status Radio Toggles */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'INTACT', label: 'Intact Seal', icon: ShieldCheck, color: 'emerald' },
                            { value: 'MISMATCH', label: 'Mismatch', icon: ShieldAlert, color: 'rose' },
                            { value: 'BROKEN', label: 'Broken Seal', icon: AlertTriangle, color: 'amber' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setSealStatus(opt.value)}
                              className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                                sealStatus === opt.value
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <opt.icon className="w-3.5 h-3.5" />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>

                        {sealComparison.status === 'MISMATCH' && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              Seal Discrepancy / Incident Notes (Required for Mismatch):
                            </label>
                            <input
                              type="text"
                              required
                              value={sealMismatchNote}
                              onChange={(e) => setSealMismatchNote(e.target.value)}
                              placeholder="E.g. Broken at toll check, driver provided memo #1234"
                              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-slate-900 dark:text-white"
                            />
                          </div>
                        )}
                      </div>

                      {/* Right: Odometer & Gate Location */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                        <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Arrival Odometer Reading (KM)</span>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Start: <strong>{startOdo} KM</strong>
                          </span>
                        </label>

                        <div className="relative">
                          <input
                            type="number"
                            required
                            min={startOdo}
                            value={arrivalOdometer}
                            onChange={(e) => setArrivalOdometer(e.target.value)}
                            placeholder="Enter End Odometer KM"
                            className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                              isOdometerInvalid
                                ? 'border-rose-500 ring-rose-500/20'
                                : 'border-slate-300 dark:border-slate-700 ring-emerald-500'
                            }`}
                          />
                          <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                            KM
                          </span>
                        </div>

                        {/* Distance Badge */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Calculated Journey Distance:</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            +{distanceCovered} KM
                          </span>
                        </div>
                        {isOdometerInvalid && (
                          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            End odometer cannot be less than departure odometer ({startOdo} KM).
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Dock / Bay #
                            </label>
                            <input
                              type="text"
                              value={unloadingBay}
                              onChange={(e) => setUnloadingBay(e.target.value)}
                              placeholder="Bay 1"
                              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Receiving Supervisor
                            </label>
                            <input
                              type="text"
                              value={supervisorName}
                              onChange={(e) => setSupervisorName(e.target.value)}
                              placeholder="Supervisor Name"
                              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Cargo Manifest & Docket-by-Docket Tally */}
                  <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Step 3 • Cargo Manifest & Tally Checklist
                        </span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                          Unload Dockets & Package Reconciliation
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleMarkAllGood}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mark All Received & Good</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary Counters Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Loaded Dockets</span>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {tallyStats.totalDockets} LRs
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Packages Tally</span>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {tallyStats.totalReceivedPkgs} / {tallyStats.totalExpectedPkgs} Pkgs
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Good Condition</span>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {tallyStats.goodCount} Dockets
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Damaged / Short</span>
                        <p className={`text-base font-black mt-0.5 ${
                          (tallyStats.damagedCount + tallyStats.shortCount) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                        }`}>
                          {tallyStats.damagedCount} Damaged • {tallyStats.shortCount} Short
                        </p>
                      </div>
                    </div>

                    {/* Search inside manifest */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Search dockets by LR #, Consignor, Consignee, or Commodity..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Dockets Table / Checklist */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-4 py-3">LR / Docket #</th>
                              <th className="px-4 py-3">Shipper → Consignee</th>
                              <th className="px-4 py-3">Commodity & Weight</th>
                              <th className="px-4 py-3 text-center">Expected Pkgs</th>
                              <th className="px-4 py-3 text-center">Received Pkgs</th>
                              <th className="px-4 py-3">Condition Status</th>
                              <th className="px-4 py-3">Unload Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredConsignments.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                  No dockets found matching &quot;{searchFilter}&quot;
                                </td>
                              </tr>
                            ) : (
                              filteredConsignments.map((c) => {
                                const tally = docketTallies[c.id] || {
                                  received_packages: c.packages_count,
                                  condition: 'GOOD',
                                  remarks: '',
                                };

                                return (
                                  <tr
                                    key={c.id}
                                    className={`transition-colors ${
                                      tally.condition === 'DAMAGED'
                                        ? 'bg-rose-500/5 hover:bg-rose-500/10'
                                        : tally.condition === 'SHORTAGE'
                                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    {/* LR Number */}
                                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                                      <div className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                                        <span>{c.lr_number || c.docket_number}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        {c.booking_date || 'N/A'}
                                      </span>
                                    </td>

                                    {/* Parties */}
                                    <td className="px-4 py-3.5">
                                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                        {c.consignor?.name || 'Shipper'}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate max-w-[200px] flex items-center gap-1">
                                        <ArrowRight className="w-2.5 h-2.5" />
                                        {c.consignee?.name || 'Consignee'}
                                      </div>
                                    </td>

                                    {/* Commodity */}
                                    <td className="px-4 py-3.5">
                                      <div className="text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                                        {c.material_description || 'General Cargo'}
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        {c.actual_weight || 0} KG
                                      </span>
                                    </td>

                                    {/* Expected Pkgs */}
                                    <td className="px-4 py-3.5 text-center font-bold text-slate-600 dark:text-slate-400">
                                      {c.packages_count}
                                    </td>

                                    {/* Received Pkgs Counter */}
                                    <td className="px-4 py-3.5 text-center">
                                      <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = parseInt(tally.received_packages || 0, 10);
                                            if (current > 0) {
                                              handleUpdateTally(c.id, 'received_packages', current - 1);
                                              if (current - 1 < c.packages_count) {
                                                handleUpdateTally(c.id, 'condition', 'SHORTAGE');
                                              }
                                            }
                                          }}
                                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                          type="number"
                                          min={0}
                                          max={c.packages_count}
                                          value={tally.received_packages}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value || 0, 10);
                                            handleUpdateTally(c.id, 'received_packages', val);
                                            if (val < c.packages_count) {
                                              handleUpdateTally(c.id, 'condition', 'SHORTAGE');
                                            }
                                          }}
                                          className="w-12 text-center text-xs font-black bg-transparent focus:outline-hidden"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = parseInt(tally.received_packages || 0, 10);
                                            handleUpdateTally(c.id, 'received_packages', current + 1);
                                          }}
                                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>

                                    {/* Condition Selector */}
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-1.5">
                                        {[
                                          { value: 'GOOD', label: 'Good', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
                                          { value: 'DAMAGED', label: 'Damaged', activeClass: 'bg-rose-500 text-white border-rose-500' },
                                          { value: 'SHORTAGE', label: 'Short', activeClass: 'bg-amber-500 text-white border-amber-500' },
                                        ].map((cond) => (
                                          <button
                                            key={cond.value}
                                            type="button"
                                            onClick={() => handleUpdateTally(c.id, 'condition', cond.value)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                              tally.condition === cond.value
                                                ? cond.activeClass
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                          >
                                            {cond.label}
                                          </button>
                                        ))}
                                      </div>
                                    </td>

                                    {/* Notes */}
                                    <td className="px-4 py-3.5">
                                      <input
                                        type="text"
                                        value={tally.remarks || ''}
                                        onChange={(e) => handleUpdateTally(c.id, 'remarks', e.target.value)}
                                        placeholder={
                                          tally.condition === 'DAMAGED'
                                            ? 'Describe cargo damage...'
                                            : tally.condition === 'SHORTAGE'
                                            ? 'Describe shortage...'
                                            : 'Remarks...'
                                        }
                                        className="w-40 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                      />
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

                  {/* General Remarks & Final Action Button */}
                  <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 dark:text-white">
                        General Dock Arrival Remarks & Driver Debrief
                      </label>
                      <textarea
                        rows={2}
                        value={unloadingRemarks}
                        onChange={(e) => setUnloadingRemarks(e.target.value)}
                        placeholder="Enter unloading remarks, delay reasons if any, or condition notes..."
                        className="w-full px-4 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {errorMessage && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Finalizing will mark Trip as <strong>COMPLETED</strong>, release vehicle & driver to destination yard, and transition dockets to <strong>REACHED_DESTINATION</strong>.
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Link
                          href="/trips"
                          className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all cursor-pointer"
                        >
                          Cancel
                        </Link>

                        <button
                          type="submit"
                          disabled={submitting || isOdometerInvalid}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>{submitting ? 'Finalizing Cargo Unload...' : 'Finalize Unload & Complete Trip'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function UnloadPlanningPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-cyan-400">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-xs font-bold">Loading Unload Planning Dock...</span>
        </div>
      }
    >
      <UnloadPlanningContent />
    </Suspense>
  );
}
