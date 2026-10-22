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
  Percent,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Check
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

    const settlement = tripData.settlement || null;
    const isSettled = tripData.settlement_status === 'SETTLED' || settlement?.status === 'SETTLED';

    // If trip has an official settlement, read driver allowance (Bhatta) from settlement voucher
    if (settlement && Number(settlement.driver_allowance || 0) > 0) {
      bhattaSpend = Number(settlement.driver_allowance);
    }

    const totalExpenseVouchers = fuelSpend + tollSpend + bhattaSpend + maintenanceSpend + miscSpend;
    const totalAdvances = advances.reduce((acc, a) => acc + Number(a.amount || 0), 0);

    const recordedExp = Number(tripData.total_expenses || 0) + bhattaSpend;
    const recordedAdv = settlement && Number(settlement.total_advance || 0) > 0
      ? Number(settlement.total_advance)
      : Number(tripData.driver_advance || 0);

    const actualExp = totalExpenseVouchers > 0 ? totalExpenseVouchers : recordedExp;
    const actualAdv = totalAdvances > 0 ? totalAdvances : recordedAdv;

    const vehicleOwnership = (tripData.vehicle?.ownership || 'OWN').toUpperCase();
    const isMarketOrAttached = vehicleOwnership === 'MARKET' || vehicleOwnership === 'ATTACHED';
    const vehicleCharge = Number(settlement?.vehicle_charge || tripData.vehicle_charge || 0);

    // If Market or Attached, company's primary direct trip cost is the agreed Vehicle Charge
    // If Company Owned, the direct trip cost is the actual expenses incurred (Fuel, Toll, Bhatta, Repairs)
    // Note: Cash Advance is pre-funding disbursed to the driver to pay those expenses, not an additional separate cost.
    const totalDriveCost = isMarketOrAttached && vehicleCharge > 0
      ? vehicleCharge
      : actualExp;

    // Net Operating Profit / Loss: from official settlement voucher or calculated
    let netProfit = grossRevenue - totalDriveCost;
    if (settlement && settlement.profit_margin !== undefined && settlement.profit_margin !== null) {
      netProfit = Number(settlement.profit_margin);
    }
    const marginPct = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(1)) : 0;
    const isProfit = netProfit >= 0;

    // Driver reconciliation balance (Company Owned): from official settlement voucher or calculated
    let driverBalance = 0;
    if (settlement && settlement.balance_payable_or_receivable !== undefined) {
      const bal = Number(settlement.balance_payable_or_receivable || 0);
      driverBalance = settlement.settlement_type === 'PAYABLE_TO_DRIVER' ? -bal : bal;
    } else {
      driverBalance = actualAdv - actualExp;
    }

    const netVendorBalance = settlement && settlement.balance_payable_or_receivable !== undefined
      ? (settlement.settlement_type === 'PAYABLE_TO_VENDOR' ? Number(settlement.balance_payable_or_receivable) : -Number(settlement.balance_payable_or_receivable))
      : (vehicleCharge - (actualAdv + actualExp));

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
      settlement,
      isSettled,
      consignmentsCount: consignments.length,
      expensesCount: expenses.length,
      advancesCount: advances.length,
    };
  }, [tripData]);

  if (!isOpen) return null;

  const t = tripData || {};
  const c = calculations;

  const settlement = c?.settlement || t.settlement || null;
  const isSettled = Boolean(c?.isSettled || t.settlement_status === 'SETTLED' || settlement?.status === 'SETTLED');

  const originName = t.origin_city || t.originBranch?.city || t.originBranch?.branch_name || 'Origin';
  const destName = t.destination_city || t.destBranch?.city || t.destBranch?.branch_name || 'Destination';

  // Driver Settlement status helpers
  const isDriverPayable = (c?.driverBalance || 0) < 0;
  const isDriverRefund = (c?.driverBalance || 0) > 0;
  const absDriverBalance = Math.abs(Number(c?.driverBalance || 0));

  // Vendor Settlement status helpers
  const isVendorPayable = (c?.netVendorBalance || 0) >= 0;
  const absVendorBalance = Math.abs(Number(c?.netVendorBalance || 0));

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
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}>
              {c?.isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-mono text-base font-black text-blue-600 dark:text-cyan-400">
                  {t.trip_number || 'Trip Dossier'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                  t.status === 'COMPLETED' || t.status === 'SETTLED'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                }`}>
                  {t.status || 'ACTIVE'}
                </span>
                {t.settlement_status === 'SETTLED' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">
                    Settled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center space-x-1.5 flex-wrap">
                <span className="font-bold text-slate-800 dark:text-slate-200">{originName}</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">➔</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{destName}</span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
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

        {/* 4 Executive KPI Cards */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse font-medium">
            Analyzing trip revenue, cargo dockets, and expense vouchers...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-5">
              
              {/* Card 1: Gross Revenue */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-blue-50/40 border-blue-200/80 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Gross Freight Revenue</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">
                    ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                    {c?.consignmentsCount || 0} dockets • {(c?.totalWeightKg || 0).toLocaleString()} kg
                  </div>
                </div>
              </div>

              {/* Card 2: Vehicle Charge or Total Running Costs */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-amber-50/40 border-amber-200/80 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {c?.isMarketOrAttached ? 'Vehicle Hire Charge' : 'Total Operating Costs'}
                  </span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {c?.isMarketOrAttached ? <Truck className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
                    ₹{Number(c?.totalDriveCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                    {c?.isMarketOrAttached
                      ? `Agreed ${c?.vehicleOwnership === 'MARKET' ? 'Market' : 'Vendor'} Rate`
                      : `Adv: ₹${Number(c?.actualAdv || 0).toLocaleString('en-IN')} • Diesel/Exp: ₹${Number(c?.actualExp || 0).toLocaleString('en-IN')}`}
                  </div>
                </div>
              </div>

              {/* Card 3: Net Profit / Loss */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                c?.isProfit
                  ? isDark ? 'bg-emerald-950/30 border-emerald-800/60 ring-1 ring-emerald-500/20' : 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
                  : isDark ? 'bg-rose-950/30 border-rose-800/60 ring-1 ring-rose-500/20' : 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-500/20 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${c?.isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    Net Trip {c?.isProfit ? 'Profit' : 'Loss'}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${
                    c?.isProfit ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  }`}>
                    {c?.isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className={`font-mono text-2xl font-black ${
                    c?.isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {c?.isProfit ? '+' : '-'}₹{Math.abs(Number(c?.netProfit || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${c?.isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                    {c?.marginPct}% Operating Margin
                  </div>
                </div>
              </div>

              {/* Card 4: Driver or Vendor Settlement Balance */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isSettled
                  ? isDark ? 'bg-emerald-950/25 border-emerald-800/60 ring-1 ring-emerald-500/20' : 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
                  : c?.isMarketOrAttached
                  ? (isVendorPayable
                      ? isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-emerald-50/50 border-emerald-200'
                      : isDark ? 'bg-amber-950/20 border-amber-800/50' : 'bg-amber-50/50 border-amber-200')
                  : (isDriverPayable
                      ? isDark ? 'bg-rose-950/20 border-rose-800/50 ring-1 ring-rose-500/20' : 'bg-rose-50/60 border-rose-200 ring-1 ring-rose-400/20'
                      : isDriverRefund
                      ? isDark ? 'bg-emerald-950/20 border-emerald-800/50 ring-1 ring-emerald-500/20' : 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-400/20'
                      : isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200')
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    isSettled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {c?.isMarketOrAttached
                      ? (isSettled ? 'Vendor Settlement (Settled)' : 'Vendor Settlement')
                      : (isSettled ? 'Driver Settlement (Settled)' : 'Driver Cash Balance')}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${
                    isSettled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : c?.isMarketOrAttached
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : isDriverPayable
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : isDriverRefund
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                  }`}>
                    {isSettled ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : (c?.isMarketOrAttached ? <Truck className="w-4 h-4" /> : <Wallet className="w-4 h-4" />)}
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className={`font-mono text-2xl font-black ${
                    isSettled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : c?.isMarketOrAttached
                      ? (isVendorPayable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')
                      : isDriverPayable
                      ? 'text-rose-600 dark:text-rose-400'
                      : isDriverRefund
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    ₹{c?.isMarketOrAttached ? absVendorBalance.toLocaleString('en-IN') : absDriverBalance.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] font-bold mt-0.5 truncate">
                    {isSettled ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
                        <Check className="w-3.5 h-3.5 inline text-emerald-600 dark:text-emerald-400" />
                        {c?.isMarketOrAttached
                          ? '✓ Paid & Settled to Vendor'
                          : isDriverPayable
                          ? '✓ Reimbursed & Settled (Zero Dues)'
                          : isDriverRefund
                          ? '✓ Recovered from Driver (Settled)'
                          : '✓ Settled & Balanced (Zero Dues)'}
                      </span>
                    ) : c?.isMarketOrAttached ? (
                      isVendorPayable ? (
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 inline" /> Payable to Vendor
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400">
                          Recovery from Vendor
                        </span>
                      )
                    ) : isDriverPayable ? (
                      <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3 inline" /> Payable to Driver (Reimburse)
                      </span>
                    ) : isDriverRefund ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 inline" /> Refund from Driver (Cash to Collect)
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">
                        Balanced (Zero Dues)
                      </span>
                    )}
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
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>1. P&L Comparison Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CARGO')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'CARGO'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-4 sm:space-x-6 w-full md:w-auto justify-between md:justify-start px-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Billed Inflow</span>
                      <div className="font-mono text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
                        ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-xl font-bold text-slate-400 dark:text-slate-600">—</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trip Operating Outflow</span>
                      <div className="font-mono text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                        ₹{Number(c?.totalDriveCost || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-xl font-bold text-slate-400 dark:text-slate-600">=</span>
                  </div>

                  <div className={`px-5 py-3 rounded-xl border flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start ${
                    c?.isProfit
                      ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-800'
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Left Column: Earnings Breakdown */}
                  <div className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Revenue Breakdown</span>
                      <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                        ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Loaded Cargo Dockets ({c?.consignmentsCount || 0})</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ₹{Number(c?.grossRevenue || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Total Cargo Weight</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {(c?.totalWeightKg || 0).toLocaleString()} kg ({((c?.totalWeightKg || 0) / 1000).toFixed(2)} MT)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Total Package Count</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {c?.totalPackages || 0} Pkgs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Outflows Breakdown */}
                  <div className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {c?.isMarketOrAttached ? 'Vehicle Rate & Outflows' : 'Highway Expenses Breakdown'}
                      </span>
                      <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                        ₹{Number(c?.totalDriveCost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {c?.isMarketOrAttached && (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Agreed Vehicle Hire Charge</span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                            ₹{Number(c?.vehicleCharge || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Highway Diesel & Fuel Fills</span>
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          ₹{Number(c?.fuelSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">FASTag & Toll Booth Outflows</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          ₹{Number(c?.tollSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Driver Meals & Daily Bhatta</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          ₹{Number(c?.bhattaSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Repairs, Hamali & Misc En-Route</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          ₹{Number(c?.maintenanceSpend + c?.miscSpend || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver Cash Reconciliation Card / Debrief Ledger */}
                <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-slate-50 border-slate-200 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {c?.isMarketOrAttached ? 'Vendor Payment Reconciliation' : 'Driver Cash Balance Reconciliation'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isSettled
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : c?.isMarketOrAttached
                        ? (isVendorPayable
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25')
                        : isDriverPayable
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
                        : isDriverRefund
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                        : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25'
                    }`}>
                      {isSettled
                        ? (settlement?.settlement_number
                            ? `✓ Settled (${settlement.settlement_number})`
                            : '✓ Trip Settled & Paid')
                        : c?.isMarketOrAttached
                        ? (isVendorPayable ? 'Balance Due to Vendor' : 'Recovery from Vendor')
                        : isDriverPayable
                        ? 'Company Reimburses Driver'
                        : isDriverRefund
                        ? 'Driver Cash Refund Pending'
                        : 'Settlement Balanced'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 text-xs">
                    <div className={`p-4 rounded-xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {c?.isMarketOrAttached ? 'Agreed Vendor Rate' : '(+) Driver Cash Advances'}
                      </span>
                      <div className="font-mono text-base font-black text-amber-600 dark:text-amber-400 mt-1">
                        ₹{Number(c?.isMarketOrAttached ? c?.vehicleCharge : c?.actualAdv || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {c?.isMarketOrAttached ? 'Total agreed trip freight' : 'Disbursed cash pre-trip'}
                      </span>
                    </div>

                    <div className={`p-4 rounded-xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {c?.isMarketOrAttached ? '(-) Advances + Fuel Paid' : '(-) Driver Expenses Spent'}
                      </span>
                      <div className="font-mono text-base font-black text-cyan-600 dark:text-cyan-400 mt-1">
                        ₹{Number(c?.isMarketOrAttached ? (c?.actualAdv + c?.actualExp) : c?.actualExp || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {c?.isMarketOrAttached ? 'Paid directly to truck' : 'Diesel, tolls, repairs'}
                      </span>
                    </div>

                    <div className={`p-4 rounded-xl border ${
                      isSettled
                        ? isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50 border-emerald-300'
                        : c?.isMarketOrAttached
                        ? (isVendorPayable
                            ? isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
                            : isDark ? 'bg-amber-950/20 border-amber-800/60' : 'bg-amber-50 border-amber-200')
                        : isDriverPayable
                        ? isDark ? 'bg-rose-950/20 border-rose-800/60' : 'bg-rose-50 border-rose-200'
                        : isDriverRefund
                        ? isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
                        : isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {isSettled
                          ? (c?.isMarketOrAttached ? '(=) Settled Vendor Amount' : '(=) Settled Driver Amount')
                          : (c?.isMarketOrAttached ? '(=) Net Due to Vendor' : '(=) Net Driver Cash Balance')}
                      </span>
                      <div className={`font-mono text-base font-black mt-1 ${
                        isSettled
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : c?.isMarketOrAttached
                          ? (isVendorPayable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')
                          : isDriverPayable
                          ? 'text-rose-600 dark:text-rose-400'
                          : isDriverRefund
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        ₹{c?.isMarketOrAttached ? absVendorBalance.toLocaleString('en-IN') : absDriverBalance.toLocaleString('en-IN')}
                      </div>
                      <span className={`text-[10px] font-bold ${
                        isSettled
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : c?.isMarketOrAttached
                          ? (isVendorPayable ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')
                          : isDriverPayable
                          ? 'text-rose-700 dark:text-rose-400'
                          : isDriverRefund
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {isSettled
                          ? (c?.isMarketOrAttached
                              ? '✓ Paid & Cleared to Vendor'
                              : isDriverPayable
                              ? '✓ Reimbursed & Cleared (Zero Dues Pending)'
                              : isDriverRefund
                              ? '✓ Recovered from Driver (Cleared)'
                              : '✓ Zero balance dues')
                          : c?.isMarketOrAttached
                          ? (isVendorPayable ? 'Payable upon debrief' : 'Deduct from vendor')
                          : isDriverPayable
                          ? 'Company reimburses driver'
                          : isDriverRefund
                          ? 'Collect cash from driver'
                          : 'Zero balance dues'}
                      </span>
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
                    isDark ? 'bg-slate-900/90 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
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
                        <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400">
                          No specific consignments loaded (Direct truck hire or empty transit).
                        </td>
                      </tr>
                    ) : (
                      c?.consignments?.map((item) => (
                        <tr key={item.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                          <td className="p-3 font-mono font-bold">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">{item.docket_number || `DOC-${String(item.id).slice(0, 6)}`}</span>
                              <BuiltyTypeBadge docket={item} />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-200">{item.consignor?.name || 'Shipper'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.consignor?.phone || ''}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-200">{item.consignee?.name || 'Consignee'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.consignee?.phone || ''}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                              {item.packages_count || 1} pkgs • {item.charged_weight || 0} kg
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                              {item.payment_type || 'TO_PAY'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(item.total_amount || item.freight_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {c?.consignments?.length > 0 && (
                    <tfoot className={`font-bold border-t ${
                      isDark ? 'bg-slate-900/90 text-white border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-200'
                    }`}>
                      <tr>
                        <td colSpan={5} className="p-3 text-right text-xs">Total Freight Earnings:</td>
                        <td className="p-3 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
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
                    isDark ? 'bg-slate-900/90 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
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
                      <tr key={`adv-${adv.id}`} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {adv.disbursed_date || 'Today'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Driver Advance
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
                          {adv.disbursed_mode || 'CASH'}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {adv.remarks || 'Driver trip cash bhatta / advance'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          ₹{Number(adv.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    {/* 2. Direct Expense Vouchers */}
                    {c?.expenses?.map((exp) => (
                      <tr key={`exp-${exp.id}`} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {exp.expense_date || 'Today'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                            {exp.category?.name || exp.category || 'Running Expense'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
                          {exp.payment_method || 'CASH'}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {exp.remarks || exp.vendor_name || 'Highway expense voucher'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          ₹{Number(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    {c?.advances?.length === 0 && c?.expenses?.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500 dark:text-slate-400">
                          No expense slips or advances logged for this trip yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {(c?.advances?.length > 0 || c?.expenses?.length > 0) && (
                    <tfoot className={`font-bold border-t ${
                      isDark ? 'bg-slate-900/90 text-white border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-200'
                    }`}>
                      <tr>
                        <td colSpan={4} className="p-3 text-right text-xs">Total Direct Highway Outflows:</td>
                        <td className="p-3 text-right font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                          ₹{Number(c?.actualExp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
            <span>Trip #:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">
              {t.trip_number || 'Direct Fleet Run'}
            </span>
            {settlement?.settlement_number && (
              <>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span>Settlement Voucher:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {settlement.settlement_number}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
