// frontend/components/trips/TripPnlModal.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import BuiltyTypeBadge from '../ui/BuiltyTypeBadge';
import api from '../../services/api';
import { useTheme } from '../ThemeProvider';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Fuel,
  Truck,
  User,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  Package,
  FileText,
  X,
  Receipt,
  Coins,
  Eye,
  ArrowRight,
  ShieldCheck,
  Building2,
  Percent
} from 'lucide-react';

export default function TripPnlModal({
  isOpen,
  onClose,
  tripId,
  initialTrip = null,
  onOpenSettle = null,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('SUMMARY'); // 'SUMMARY' | 'CARGO' | 'EXPENSES'
  const [tripData, setTripData] = useState(initialTrip);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !tripId) {
      setTripData(initialTrip || null);
      return;
    }

    let isMounted = true;
    const fetchTripPnl = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/trips/${tripId}`);
        if (isMounted) {
          if (res.data?.success && res.data?.data) {
            setTripData(res.data.data);
          } else {
            setTripData(initialTrip || null);
          }
        }
      } catch (err) {
        console.error('Failed to load trip P&L data:', err);
        if (isMounted) {
          setTripData(initialTrip || null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTripPnl();
    return () => {
      isMounted = false;
    };
  }, [isOpen, tripId, initialTrip]);

  const calculations = useMemo(() => {
    if (!tripData) return null;

    const consignments = Array.isArray(tripData.consignments) ? tripData.consignments : [];
    const expenses = Array.isArray(tripData.expenses) ? tripData.expenses : [];
    const advances = Array.isArray(tripData.advances) ? tripData.advances : [];

    // 1. Gross Freight Inflow (Revenue)
    const consignmentRev = consignments.reduce((acc, c) => acc + Number(c.total_amount || c.freight_amount || 0), 0);
    const expectedRev = Number(tripData.expected_revenue || 0);
    const grossRevenue = expectedRev > 0 ? expectedRev : consignmentRev;

    // 2. Outflow Breakdown
    let fuelSpend = 0;
    let tollSpend = 0;
    let bhattaSpend = 0;
    let maintenanceSpend = 0;
    let miscSpend = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount || 0);
      const catName = (e.category?.name || e.category || '').toLowerCase();
      const method = (e.payment_method || '').toUpperCase();
      const remarks = (e.remarks || '').toLowerCase();

      if (catName.includes('fuel') || catName.includes('diesel') || method === 'FUEL_CARD' || remarks.includes('fuel') || remarks.includes('diesel')) {
        fuelSpend += amt;
      } else if (catName.includes('toll') || catName.includes('fastag') || method === 'FASTAG' || remarks.includes('toll')) {
        tollSpend += amt;
      } else if (catName.includes('bhatta') || catName.includes('food') || remarks.includes('bhatta')) {
        bhattaSpend += amt;
      } else if (catName.includes('repair') || catName.includes('maintenance') || remarks.includes('repair')) {
        maintenanceSpend += amt;
      } else {
        miscSpend += amt;
      }
    });

    const totalExpenseVouchers = fuelSpend + tollSpend + bhattaSpend + maintenanceSpend + miscSpend;
    const totalAdvances = advances.reduce((acc, a) => acc + Number(a.amount || 0), 0);

    const recordedExp = Number(tripData.total_expenses || 0);
    const recordedAdv = Number(tripData.driver_advance || 0);

    const actualExp = totalExpenseVouchers > 0 ? totalExpenseVouchers : recordedExp;
    const actualAdv = totalAdvances > 0 ? totalAdvances : recordedAdv;

    const vehicleOwnership = (tripData.vehicle?.ownership || 'OWN').toUpperCase();
    const isMarketOrAttached = vehicleOwnership === 'MARKET' || vehicleOwnership === 'ATTACHED';
    const vehicleCharge = Number(tripData.vehicle_charge || 0);

    // If Market or Attached, company's primary direct trip cost is the agreed Vehicle Charge
    const totalDriveCost = isMarketOrAttached && vehicleCharge > 0
      ? vehicleCharge
      : (actualExp + actualAdv);

    // Net Operating Profit / Loss
    const netProfit = grossRevenue - totalDriveCost;
    const marginPct = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(1)) : 0;
    const isProfit = netProfit >= 0;

    // Driver reconciliation balance (Company Owned) or Vendor Settlement Balance (Market / Attached)
    const driverBalance = actualAdv - actualExp;
    const netVendorBalance = vehicleCharge - (actualAdv + actualExp);

    const totalWeightKg = consignments.reduce((acc, c) => acc + Number(c.charged_weight || c.actual_weight || 0), 0);
    const totalPackages = consignments.reduce((acc, c) => acc + Number(c.packages_count || 1), 0);

    return {
      grossRevenue,
      totalDriveCost,
      actualExp,
      actualAdv,
      vehicleCharge,
      isMarketOrAttached,
      vehicleOwnership,
      netVendorBalance,
      fuelSpend,
      tollSpend,
      bhattaSpend,
      maintenanceSpend,
      miscSpend,
      netProfit,
      marginPct,
      isProfit,
      driverBalance,
      totalWeightKg,
      totalPackages,
      consignments,
      expenses,
      advances,
    };
  }, [tripData]);

  if (!isOpen) return null;

  const t = tripData || {};
  const c = calculations;

  const originName = t.origin_city || t.originBranch?.city || t.originBranch?.branch_name || 'Origin';
  const destName = t.destination_city || t.destBranch?.city || t.destBranch?.branch_name || 'Destination';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={`relative w-full max-w-5xl max-h-[92vh] my-auto overflow-y-auto rounded-3xl border shadow-2xl p-5 sm:p-7 z-10 transition-all ${
        isDark ? 'bg-[#0B1020] border-slate-800 text-white shadow-black/90' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
      }`}>
        
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center space-x-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
              c?.isProfit
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {c?.isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-mono text-base font-black text-blue-500 dark:text-cyan-400">
                  {t.trip_number || 'Trip Dossier'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                  t.status === 'COMPLETED' || t.status === 'SETTLED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {t.status || 'ACTIVE'}
                </span>
                {t.settlement_status === 'SETTLED' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    Settled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center space-x-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{originName}</span>
                <span className="text-blue-500 font-bold">➔</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{destName}</span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {t.vehicle?.vehicle_number || 'Fleet Vehicle'} ({t.vehicle?.ownership === 'MARKET' ? 'Market Hire' : 'Company Owned'})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {onOpenSettle && t.settlement_status !== 'SETTLED' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettle(t);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Reconcile Driver</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Executive KPI Ribbon */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Analyzing trip revenue, cargo dockets, and expense vouchers...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-5">
              
              {/* Card 1: Gross Revenue */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Gross Freight Revenue</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="font-mono text-2xl font-black text-blue-400">
                    ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {c?.consignmentsCount || 0} dockets • {(c?.totalWeightKg || 0).toLocaleString()} kg
                  </div>
                </div>
              </div>

              {/* Card 2: Vehicle Charge or Total Running Costs */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    {c?.isMarketOrAttached ? 'Vehicle Hire Charge' : 'Total Operating Costs'}
                  </span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {c?.isMarketOrAttached ? <Truck className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="font-mono text-2xl font-black text-amber-400">
                    ₹{Number(c?.totalDriveCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {c?.isMarketOrAttached
                      ? `Agreed ${c?.vehicleOwnership === 'MARKET' ? 'Market' : 'Vendor'} Rate`
                      : `Adv: ₹${Number(c?.actualAdv || 0).toLocaleString('en-IN')} • Exp: ₹${Number(c?.actualExp || 0).toLocaleString('en-IN')}`}
                  </div>
                </div>
              </div>

              {/* Card 3: Net Profit / Loss */}
              <div className={`p-4 rounded-2xl border transition-all ${
                c?.isProfit
                  ? isDark ? 'bg-emerald-950/30 border-emerald-800/60 ring-1 ring-emerald-500/20' : 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500/20'
                  : isDark ? 'bg-rose-950/30 border-rose-800/60 ring-1 ring-rose-500/20' : 'bg-rose-50 border-rose-300 ring-1 ring-rose-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${c?.isProfit ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    Net Trip {c?.isProfit ? 'Profit' : 'Loss'}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${
                    c?.isProfit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {c?.isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className={`font-mono text-2xl font-black ${
                    c?.isProfit ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                  }`}>
                    {c?.isProfit ? '+' : '-'}₹{Math.abs(Number(c?.netProfit || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${c?.isProfit ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                    {c?.marginPct}% Operating Margin
                  </div>
                </div>
              </div>

              {/* Card 4: Driver or Vendor Settlement Balance */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    {c?.isMarketOrAttached ? 'Payable to Vendor' : 'Driver Cash Balance'}
                  </span>
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className={`font-mono text-2xl font-black ${
                    c?.isMarketOrAttached
                      ? (c?.netVendorBalance >= 0 ? 'text-emerald-400' : 'text-amber-400')
                      : (c?.driverBalance >= 0 ? 'text-emerald-400' : 'text-rose-400')
                  }`}>
                    ₹{Math.abs(Number(c?.isMarketOrAttached ? (c?.netVendorBalance || 0) : (c?.driverBalance || 0))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                    {c?.isMarketOrAttached
                      ? (c?.netVendorBalance >= 0 ? 'Payable to Vendor / Owner' : 'Recovery from Vendor')
                      : (c?.driverBalance >= 0 ? 'Refund from Driver' : 'Payable to Driver')}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('SUMMARY')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'SUMMARY'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>1. P&L Comparison Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CARGO')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'CARGO'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>2. Revenue Dockets ({c?.consignmentsCount || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('EXPENSES')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'EXPENSES'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>3. Outflows & Diesel Slips ({c?.expensesCount + c?.advancesCount || 0})</span>
              </button>
            </div>

            {/* TAB 1: P&L Comparison Ledger */}
            {activeTab === 'SUMMARY' && (
              <div className="space-y-4">
                {/* Visual Equation Banner */}
                <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Billed Inflow</span>
                      <div className="font-mono text-lg font-black text-blue-400">
                        ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-xl font-bold text-slate-400">—</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drive Spend Outflow</span>
                      <div className="font-mono text-lg font-black text-amber-400">
                        ₹{Number(c?.totalDriveCost || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-xl font-bold text-slate-400">=</span>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start ${
                    c?.isProfit
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block">
                        Net Operating Margin
                      </span>
                      <div className="font-mono text-xl font-black">
                        {c?.isProfit ? '+' : '-'}₹{Math.abs(Number(c?.netProfit || 0)).toLocaleString('en-IN')} ({c?.marginPct}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Earnings Breakdown */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Breakdown</span>
                      <span className="font-mono font-black text-xs text-blue-400">
                        ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Loaded Cargo Dockets ({c?.consignmentsCount || 0})</span>
                        <span className="font-mono font-semibold text-slate-200">
                          ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Total Cargo Weight</span>
                        <span>{(c?.totalWeightKg || 0).toLocaleString()} kg ({((c?.totalWeightKg || 0) / 1000).toFixed(2)} MT)</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Total Package Count</span>
                        <span>{c?.totalPackages || 0} Pkgs</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Outflows Breakdown */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Highway Outflows Breakdown</span>
                      <span className="font-mono font-black text-xs text-amber-400">
                        ₹{Number(c?.totalDriveCost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Driver Cash Advances Disbursed</span>
                        <span className="font-mono font-semibold text-amber-400">
                          ₹{Number(c?.actualAdv || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Highway Diesel & Fuel Fills</span>
                        <span className="font-mono font-semibold text-cyan-400">
                          ₹{Number(c?.fuelSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">FASTag & Toll Booth Outflows</span>
                        <span className="font-mono font-semibold text-purple-400">
                          ₹{Number(c?.tollSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Driver Meals & Daily Bhatta</span>
                        <span className="font-mono font-semibold text-slate-200">
                          ₹{Number(c?.bhattaSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Repairs, Hamali & Misc En-Route</span>
                        <span className="font-mono font-semibold text-slate-200">
                          ₹{Number(c?.maintenanceSpend + c?.miscSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Cargo Dockets */}
            {activeTab === 'CARGO' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className={`font-bold border-b ${
                    isDark ? 'bg-slate-900/90 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="p-3">Docket #</th>
                      <th className="p-3">Shipper (Consignor)</th>
                      <th className="p-3">Receiver (Consignee)</th>
                      <th className="p-3 text-center">Pkgs / Wt</th>
                      <th className="p-3 text-center">Payment</th>
                      <th className="p-3 text-right">Freight (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {c?.consignments?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          No specific consignments loaded (Direct truck hire or empty transit).
                        </td>
                      </tr>
                    ) : (
                      c?.consignments?.map((item) => (
                        <tr key={item.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="p-3 font-mono font-bold">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-blue-400">{item.docket_number || `DOC-${String(item.id).slice(0, 6)}`}</span>
                              <BuiltyTypeBadge docket={item} />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-200">{item.consignor?.name || 'Shipper'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.consignor?.phone || ''}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-200">{item.consignee?.name || 'Consignee'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.consignee?.phone || ''}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono text-slate-300">
                              {item.packages_count || 1} pkgs • {item.charged_weight || 0} kg
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {item.payment_type || 'TO_PAY'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            ₹{Number(item.total_amount || item.freight_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {c?.consignments?.length > 0 && (
                    <tfoot className={`font-bold border-t ${
                      isDark ? 'bg-slate-900/90 text-white border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'
                    }`}>
                      <tr>
                        <td colSpan={5} className="p-3 text-right text-xs">Total Freight Earnings:</td>
                        <td className="p-3 text-right font-mono font-black text-sm text-emerald-400">
                          ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* TAB 3: Outflows & Diesel Slips */}
            {activeTab === 'EXPENSES' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className={`font-bold border-b ${
                    isDark ? 'bg-slate-900/90 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Category / Slip</th>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3">Purpose & Remarks</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {/* 1. Driver Advances */}
                    {c?.advances?.map((adv) => (
                      <tr key={`adv-${adv.id}`} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                          {adv.disbursed_date || 'Today'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Driver Advance
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-300">
                          {adv.disbursed_mode || 'CASH'}
                        </td>
                        <td className="p-3 text-slate-400">
                          {adv.remarks || 'Driver trip cash bhatta / advance'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-400">
                          ₹{Number(adv.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    {/* 2. Direct Expense Vouchers */}
                    {c?.expenses?.map((exp) => (
                      <tr key={`exp-${exp.id}`} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                          {exp.expense_date || 'Today'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {exp.category?.name || 'Running Expense'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-300">
                          {exp.payment_method || 'CASH'}
                        </td>
                        <td className="p-3 text-slate-400">
                          {exp.remarks || exp.vendor_name || 'Highway expense voucher'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400">
                          ₹{Number(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    {c?.advances?.length === 0 && c?.expenses?.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          No expense slips or advances logged for this trip yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {(c?.advances?.length > 0 || c?.expenses?.length > 0) && (
                    <tfoot className={`font-bold border-t ${
                      isDark ? 'bg-slate-900/90 text-white border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'
                    }`}>
                      <tr>
                        <td colSpan={4} className="p-3 text-right text-xs">Total Outflows Spent:</td>
                        <td className="p-3 text-right font-mono font-black text-sm text-amber-400">
                          ₹{Number(c?.totalDriveCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 mt-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Trip ID: <span className="font-mono text-slate-400">{t.id || tripId}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
