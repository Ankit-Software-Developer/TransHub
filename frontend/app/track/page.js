// frontend/app/track/page.js
'use client';

import React, { useState } from 'react';
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
  Share2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function PublicTrackingPage() {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isDark = theme === 'dark';

  const executeTrack = async (lrCode) => {
    if (!lrCode || !lrCode.trim()) return;

    setLoading(true);
    setError(null);
    setShipment(null);

    try {
      const res = await api.get(`/tracking?lr=${encodeURIComponent(lrCode.trim())}`);
      if (res.data.success) {
        setShipment(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Shipment not found. Please verify the LR / Bilty number.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
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
    e.preventDefault();
    executeTrack(query);
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 selection:bg-cyan-500 selection:text-black ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } relative overflow-hidden font-sans`}>
      
      {/* Background Skyline, Fleet & Network Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <Image
          src="/images/main-bg.jpg"
          alt="TransHub Global Fleet Network"
          fill
          priority
          className="object-cover object-center opacity-35 dark:opacity-40 light:opacity-15 filter transition-opacity duration-500 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06080F]/85 via-[#06080F]/70 to-[#06080F] dark:from-[#06080F]/85 dark:via-[#06080F]/70 dark:to-[#06080F] light:from-white/90 light:via-white/80 light:to-[#F4F6FB]" />

        <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-blue-600/15' : 'bg-blue-400/10'
        }`} />
        <div className={`absolute bottom-0 right-10 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-cyan-500/10' : 'bg-cyan-300/10'
        }`} />
        <div className={`absolute inset-0 ${isDark ? 'cyber-grid' : 'cyber-grid-light'} opacity-40`} />
      </div>

      {/* Top Header */}
      <header className={`relative z-20 h-20 px-6 sm:px-12 flex items-center justify-between border-b backdrop-blur-xl ${
        isDark ? 'bg-[#0B0F19]/85 border-slate-800/80' : 'bg-white/85 border-slate-200 shadow-sm'
      }`}>
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center">
              <span className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Trans<span className="text-cyan-400">Hub</span>
              </span>
            </div>
            <span className={`text-[10px] font-semibold tracking-wider uppercase block ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Logistics Without Limits
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link
            href="/login"
            className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all ${
              isDark
                ? 'border-blue-500/40 text-blue-300 bg-blue-950/40 hover:bg-blue-600 hover:text-white'
                : 'border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white shadow-sm'
            }`}
          >
            Staff & Client Sign In
          </Link>
        </div>
      </header>

      {/* Main Tracking Content */}
      <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 py-10 flex flex-col justify-center">
        
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>Real-Time Fleet & Consignment Telemetry</span>
          </div>
          <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Track Your Consignment
          </h1>
          <p className={`text-sm mt-2 max-w-md mx-auto ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Enter your Docket Number (LR / Bilty) to view live transit milestones, GPS route and digital POD.
          </p>
        </div>

        {/* Tracking Search Form */}
        <form onSubmit={handleTrack} className="mb-8">
          <div className={`relative flex items-center rounded-2xl overflow-hidden border p-1.5 transition-all shadow-xl ${
            isDark
              ? 'bg-[#0B1120]/90 border-cyan-500/30 neon-border-cyan'
              : 'bg-white border-blue-200 shadow-blue-100'
          }`}>
            <Search className={`w-5 h-5 ml-3 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Docket Number (LR / Bilty) e.g. DOC-10492 or CSN-87965"
              className={`w-full px-4 py-3 text-sm font-medium outline-none bg-transparent ${
                isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-cyan-500/30 transition-all shrink-0 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Track Shipment'}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="mb-8">
            <LoadingState
              title="Locating Consignment & Route History..."
              description="Connecting to nationwide logistics telemetry cluster to retrieve live GPS milestones"
            />
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-3 text-red-400 text-xs mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tracking Result Card */}
        {shipment && (
          <div className={`rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            isDark
              ? 'bg-[#0B1120]/90 border-cyan-500/30'
              : 'bg-white border-slate-200'
          }`}>
            {/* Header Status */}
            <div className="p-6 bg-gradient-to-r from-blue-900/60 to-cyan-950/60 border-b border-slate-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
                  Consignment Note
                </span>
                <h2 className="text-2xl font-black text-white">{shipment.lrNumber}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Booked on {shipment.bookingDate}</p>
              </div>
              <Badge status={shipment.currentStatus} size="md" />
            </div>

            {/* Route & Cargo Summary */}
            <div className={`grid grid-cols-2 p-6 border-b ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Origin & Destination</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {shipment.origin} → {shipment.destination}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cargo Units</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {shipment.packages}
                  </p>
                </div>
              </div>
            </div>

            {/* Journey Milestones Timeline */}
            <div className="p-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-6 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Transit Journey Milestones
              </h3>
              <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cyan-500/40">
                {shipment.timeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/20" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge status={event.status} size="xs" />
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {event.location}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* POD Status Bar */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Proof of Delivery (POD):</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {shipment.podStatus}
                </span>
              </div>
              <span className="text-cyan-400 text-[11px] font-mono">Protected Transit Record</span>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-slate-500 border-t border-slate-800/40">
        © 2026 TransHub Technologies Inc. • Commercial Multi-Tenant Logistics Operating Platform
      </footer>

    </div>
  );
}
