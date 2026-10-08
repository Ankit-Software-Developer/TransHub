// frontend/app/track/page.js
'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../components/ThemeProvider';
import LoadingState from '../../components/ui/LoadingState';
import {
  Search,
  Truck,
  MapPin,
  Calendar,
  Package,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Compass,
  CheckCircle2,
  Share2,
  Printer,
  RotateCw,
  X,
  ExternalLink,
  Check
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function PublicTrackingPage() {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const isDark = theme === 'dark';

  const executeTrack = async (lrCode) => {
    if (!lrCode || !lrCode.trim()) return;

    setLoading(true);
    setError(null);
    setShipment(null);

    try {
      const res = await api.get(`/tracking?lr=${encodeURIComponent(lrCode.trim())}`);
      if (res.data?.success) {
        setShipment(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Shipment not found. Please verify the LR / Bilty number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lrParam = params.get('lr') || params.get('q');
      if (lrParam) {
        setQuery(lrParam);
        executeTrack(lrParam);
      }
    }
  }, []);

  const handleTrack = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    executeTrack(query);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && shipment?.lrNumber) {
      const url = `${window.location.origin}/track?lr=${encodeURIComponent(shipment.lrNumber)}`;
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Determine transit progress stage (1 to 4)
  const getProgressStage = (status) => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 4;
      case 'OUT_FOR_DELIVERY':
      case 'REACHED_DESTINATION':
        return 3;
      case 'IN_TRANSIT':
      case 'DISPATCHED':
      case 'ON_TRIP':
        return 2;
      case 'LOADED':
      case 'READY_FOR_DISPATCH':
      case 'MATERIAL_RECEIVED':
      case 'BOOKED':
      default:
        return 1;
    }
  };

  const activeStage = shipment ? getProgressStage(shipment.currentStatus) : 1;

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 selection:bg-cyan-500 selection:text-black ${
      isDark ? 'bg-[#070B14] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
    } relative overflow-hidden font-sans`}>
      
      {/* Background Atmosphere - Distinctly Tailored for Both Themes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isDark ? (
          <>
            <Image
              src="/images/main-bg.jpg"
              alt="TransHub Global Fleet Network"
              fill
              priority
              className="object-cover object-center opacity-25 filter scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/90 via-[#070B14]/85 to-[#070B14]" />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none bg-blue-600/15" />
            <div className="absolute bottom-0 right-10 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none bg-cyan-500/10" />
            <div className="absolute inset-0 cyber-grid opacity-30" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/70 via-slate-50 to-indigo-50/40" />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none bg-blue-400/10" />
            <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none bg-cyan-400/10" />
            <div className="absolute inset-0 cyber-grid-light opacity-25" />
          </>
        )}
      </div>

      {/* Top Navigation Bar */}
      <header className={`relative z-20 h-20 px-6 sm:px-12 flex items-center justify-between border-b backdrop-blur-xl transition-colors duration-200 ${
        isDark ? 'bg-[#070B14]/80 border-slate-800/80 text-white' : 'bg-white/85 border-slate-200/80 text-slate-900 shadow-xs'
      }`}>
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center">
              <span className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Trans<span className="text-cyan-500">Hub</span>
              </span>
            </div>
            <span className={`text-[10px] font-semibold tracking-wider uppercase block ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Logistics Without Limits
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <ThemeToggle />
          <Link
            href="/login"
            className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all active:scale-95 ${
              isDark
                ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30 hover:bg-cyan-500 hover:text-black shadow-xs'
                : 'border-blue-600 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white shadow-xs'
            }`}
          >
            Staff & Client Sign In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border mb-3 shadow-xs ${
            isDark 
              ? 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300 shadow-cyan-950/40' 
              : 'border-blue-200 bg-blue-50 text-blue-700 shadow-blue-100'
          }`}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <Compass className="w-3.5 h-3.5" />
            <span>Real-Time Fleet & Consignment Telemetry</span>
          </div>
          <h1 className={`text-3xl sm:text-5xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Track Your Consignment
          </h1>
          <p className={`text-xs sm:text-sm mt-2 max-w-lg mx-auto ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Enter your Docket Number (LR / Bilty) to view live transit milestones, GPS route corridor and digital proof of delivery.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleTrack} className="mb-4">
          <div className={`relative flex items-center rounded-2xl overflow-hidden border p-1.5 transition-all shadow-xl ${
            isDark
              ? 'bg-[#0C1322]/95 border-slate-700/80 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/15'
              : 'bg-white border-slate-300 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 shadow-slate-200/60'
          }`}>
            <Search className={`w-5 h-5 ml-3 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Enter Docket Number (e.g. BAL000008, BDEL-01)..."
              className={`w-full px-3 py-3 text-sm font-mono font-bold tracking-wider outline-hidden bg-transparent ${
                isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white mr-1"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 sm:px-7 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-cyan-500/25 transition-all shrink-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Track Shipment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        {!shipment && !loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-8 flex-wrap">
            <span>Quick test sample:</span>
            <button
              type="button"
              onClick={() => {
                setQuery('BAL000008');
                executeTrack('BAL000008');
              }}
              className={`font-mono font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                isDark 
                  ? 'border-slate-800 bg-slate-900/60 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-950/30' 
                  : 'border-slate-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 shadow-xs'
              }`}
            >
              BAL000008
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="my-8">
            <LoadingState
              title="Locating Consignment & Route Milestones..."
              description="Connecting to logistics telemetry to retrieve transit status and GPS milestone records"
            />
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs my-6 ${
            isDark 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Tracking Result Card */}
        {shipment && (
          <div className={`rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 mb-8 ${
            isDark
              ? 'bg-[#0C1322]/95 border-slate-800 shadow-cyan-950/20 backdrop-blur-xl'
              : 'bg-white border-slate-200 shadow-slate-200/80'
          }`}>
            {/* Header Status Bar */}
            <div className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${
              isDark
                ? 'bg-gradient-to-r from-blue-950/90 via-slate-900 to-cyan-950/90 border-slate-800 text-white'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white border-blue-700'
            }`}>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-widest block ${
                  isDark ? 'text-cyan-400' : 'text-blue-100'
                }`}>
                  Consignment Note (LR)
                </span>
                <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                  {shipment.lrNumber}
                </h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-blue-100'}`}>
                  Booked on {shipment.bookingDate ? new Date(shipment.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge status={shipment.currentStatus} size="md" />
              </div>
            </div>

            {/* 4-Stage Visual Transit Corridor Stepper */}
            <div className={`p-6 border-b ${isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50/70 border-slate-200'}`}>
              <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className={`absolute top-4 left-6 right-6 h-1 -translate-y-1/2 z-0 rounded-full ${
                  isDark ? 'bg-slate-800' : 'bg-slate-200'
                }`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700"
                    style={{ width: `${((activeStage - 1) / 3) * 100}%` }}
                  />
                </div>

                {[
                  { step: 1, label: 'Booked', desc: 'Docked' },
                  { step: 2, label: 'Dispatched', desc: 'On Highway' },
                  { step: 3, label: 'In Transit', desc: 'Line-haul' },
                  { step: 4, label: 'Delivered', desc: 'POD Complete' }
                ].map((s) => {
                  const isDone = activeStage >= s.step;
                  const isCurrent = activeStage === s.step;
                  return (
                    <div key={s.step} className="relative z-10 flex flex-col items-center text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                        isDone
                          ? 'bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-md shadow-cyan-500/30'
                          : isDark
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : 'bg-white text-slate-400 border border-slate-300 shadow-xs'
                      } ${isCurrent ? 'ring-4 ring-cyan-500/25 scale-110' : ''}`}>
                        {isDone ? <Check className="w-4 h-4 text-white" /> : s.step}
                      </div>
                      <span className={`text-[11px] font-bold mt-2 ${
                        isDone
                          ? isDark ? 'text-white' : 'text-slate-900'
                          : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                      <span className="text-[9px] text-slate-400 hidden sm:block">
                        {s.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Route & Cargo Details 3-Col Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x border-b ${
              isDark ? 'bg-slate-900/20 divide-slate-800 border-slate-800' : 'bg-white divide-slate-200 border-slate-200'
            }`}>
              {/* Origin & Destination */}
              <div className="p-5 flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 ${isDark ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origin & Destination</p>
                  <p className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {shipment.origin || 'Origin'}
                  </p>
                  <p className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span>➔</span>
                    <span className={isDark ? 'text-cyan-300' : 'text-blue-700'}>{shipment.destination || 'Destination'}</span>
                  </p>
                </div>
              </div>

              {/* Cargo Units */}
              <div className="p-5 flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 ${isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargo & Packages</p>
                  <p className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {shipment.packages || 'Standard Freight'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Commercial Goods</p>
                </div>
              </div>

              {/* Delivery ETA */}
              <div className="p-5 flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 ${isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Delivery</p>
                  <p className={`text-sm font-bold mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {shipment.expectedDelivery 
                      ? new Date(shipment.expectedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '24 - 48 Hours Standard'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Express Freight Line</p>
                </div>
              </div>
            </div>

            {/* Journey Milestones Timeline */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  <Compass className="w-4 h-4 text-cyan-500" />
                  <span>Transit Journey Milestones</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {shipment.timeline?.length || 0} Events Recorded
                </span>
              </div>

              {shipment.timeline && shipment.timeline.length > 0 ? (
                <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:to-blue-600">
                  {shipment.timeline.map((event, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/20 group-hover:scale-125 transition-transform" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center space-x-2">
                          <Badge status={event.status} size="xs" />
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                            {event.location}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {event.timestamp ? new Date(event.timestamp).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-xl text-center text-xs text-slate-400 border border-dashed ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  Milestones recorded upon vehicle gate out and corridor scanning.
                </div>
              )}
            </div>

            {/* POD Status & Verification Bar */}
            <div className={`p-4 px-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center space-x-2">
                <FileCheck className={`w-4 h-4 ${shipment.hasPod ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span>Proof of Delivery (POD):</span>
                <span className={`font-mono font-bold ${
                  shipment.hasPod
                    ? 'text-emerald-500'
                    : isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {shipment.podStatus}
                </span>
              </div>

              {/* Card Actions: Copy Link & Print */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    copied
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className={`relative z-10 py-5 text-center text-xs border-t transition-colors ${
        isDark ? 'border-slate-800/60 text-slate-500' : 'border-slate-200 text-slate-500 bg-white/60'
      }`}>
        © 2026 TransHub Technologies Inc. • Commercial Multi-Tenant Logistics Operating Platform
      </footer>

    </div>
  );
}
