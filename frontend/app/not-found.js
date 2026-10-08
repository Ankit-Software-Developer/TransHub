// frontend/app/not-found.js
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../components/ThemeProvider';
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  Truck,
  Search,
  Route,
  FileText,
  Boxes,
  Home,
  AlertTriangle,
  Radio,
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      router.push(`/track?lr=${encodeURIComponent(trackingNumber.trim())}`);
    } else {
      router.push('/track');
    }
  };

  const quickLinks = [
    {
      title: 'Operations Dashboard',
      description: 'Fleet KPIs, dispatch alerts & activity feed',
      href: '/dashboard',
      icon: LayoutDashboard,
      color: 'from-blue-600 to-indigo-600',
      textColor: 'text-blue-500 dark:text-blue-400'
    },
    {
      title: 'Live Shipment Tracking',
      description: 'Track consignments, GPS route & PODs',
      href: '/track',
      icon: Compass,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-500 dark:text-cyan-400'
    },
    {
      title: 'Commercial Fleet',
      description: 'Manage yard vehicles, drivers & compliance',
      href: '/fleet',
      icon: Truck,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-500 dark:text-emerald-400'
    },
    {
      title: 'Dockets & Bookings',
      description: 'Electronic bilty manifests & consignments',
      href: '/bookings',
      icon: FileText,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-500 dark:text-purple-400'
    }
  ];

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 font-sans relative overflow-hidden select-none ${
      isDark ? 'bg-[#060A14] text-slate-100' : 'bg-[#F4F7FC] text-slate-900'
    }`}>
      
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Glow Spheres */}
        <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[160px] opacity-40 transition-all ${
          isDark ? 'bg-blue-600/25' : 'bg-blue-400/20'
        }`} />
        <div className={`absolute bottom-[-150px] right-[-100px] w-[600px] h-[600px] rounded-full blur-[160px] opacity-35 transition-all ${
          isDark ? 'bg-cyan-500/20' : 'bg-cyan-300/25'
        }`} />
        
        {/* Ambient Grid overlay */}
        <div className={`absolute inset-0 ${isDark ? 'cyber-grid' : 'cyber-grid-light'} opacity-30`} />
      </div>

      {/* Top Navigation Bar */}
      <header className={`relative z-20 h-20 px-6 sm:px-12 flex items-center justify-between border-b backdrop-blur-xl ${
        isDark ? 'bg-[#090E1D]/80 border-slate-800/80' : 'bg-white/80 border-slate-200/90 shadow-xs'
      }`}>
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Trans<span className="text-cyan-500">Hub</span>
            </span>
            <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              Logistics Operating System
            </p>
          </div>
        </Link>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-blue-500/20 transition-all hover:scale-102 active:scale-98"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Control Center</span>
          </Link>
        </div>
      </header>

      {/* Main 404 Hero Section */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-12 sm:py-16 flex flex-col items-center justify-center text-center">
        
        {/* Radar Telemetry Signal Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border shadow-xs mb-6 animate-pulse transition-all">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <Radio className="w-3.5 h-3.5 text-rose-500" />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            Status 404 • Waypoint Coordinates Lost
          </span>
        </div>

        {/* 404 Hero Graphic with Floating Telemetry Rings */}
        <div className="relative flex items-center justify-center my-2">
          {/* Background Concentric Radar Rings */}
          <div className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-dashed transition-all animate-spin-slow pointer-events-none ${
            isDark ? 'border-cyan-500/20' : 'border-blue-400/30'
          }`} style={{ animationDuration: '30s' }} />
          <div className={`absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-dotted transition-all pointer-events-none ${
            isDark ? 'border-indigo-500/30' : 'border-blue-300/40'
          }`} />

          {/* Glowing 404 Digits */}
          <div className="relative flex items-center gap-1 sm:gap-3">
            <span className="text-8xl sm:text-9xl md:text-[130px] font-black tracking-tighter bg-gradient-to-br from-blue-600 via-cyan-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm select-none">
              4
            </span>
            
            {/* Center Radar Compass Sphere */}
            <div className={`relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl border flex items-center justify-center shadow-2xl backdrop-blur-xl transition-all ${
              isDark
                ? 'bg-[#0C1428]/90 border-cyan-500/40 neon-border-cyan shadow-cyan-500/20'
                : 'bg-white/95 border-blue-200 shadow-xl shadow-blue-500/10'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/15 to-blue-600/10 rounded-3xl pointer-events-none" />
              <div className="relative flex flex-col items-center">
                <Route className="w-9 h-9 sm:w-12 sm:h-12 text-cyan-500 animate-pulse" />
                <span className="text-[9px] sm:text-[11px] font-mono font-bold tracking-widest text-slate-400 mt-1 uppercase">
                  Off-Grid
                </span>
              </div>
            </div>

            <span className="text-8xl sm:text-9xl md:text-[130px] font-black tracking-tighter bg-gradient-to-br from-blue-600 via-cyan-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm select-none">
              4
            </span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mt-6 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          Route Not Found in Transport Network
        </h1>

        <p className={`text-xs sm:text-sm md:text-base mt-3 max-w-xl mx-auto leading-relaxed ${
          isDark ? 'text-slate-400' : 'text-slate-600 font-medium'
        }`}>
          The hub page, consignment link, or telemetry coordinates you were heading to do not exist or have been rerouted to another terminal.
        </p>

        {/* Quick Docket / Consignment Tracking Input */}
        <div className="w-full max-w-md mt-8">
          <form onSubmit={handleTrackSubmit}>
            <div className={`group relative flex items-center rounded-2xl overflow-hidden border p-1.5 transition-all shadow-md ${
              isDark
                ? 'bg-[#0B1222]/95 border-slate-700/80 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20'
                : 'bg-white border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/15'
            }`}>
              <Search className={`w-4 h-4 ml-3 shrink-0 transition-colors ${
                isDark ? 'text-slate-400 group-focus-within:text-cyan-400' : 'text-slate-400 group-focus-within:text-blue-600'
              }`} />
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Missing a docket? Enter LR # to track..."
                className={`w-full px-3 py-2 text-xs sm:text-sm font-medium outline-none bg-transparent ${
                  isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-sm transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                Track
              </button>
            </div>
          </form>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          <Link
            href="/"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home Page</span>
          </Link>
        </div>

        {/* Recommended Navigation Grid */}
        <div className="w-full mt-12 sm:mt-16 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
          <p className={`text-xs font-bold tracking-wider uppercase mb-5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Quick Logistics Terminals
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 shadow-xs ${
                    isDark
                      ? 'bg-[#0B1020]/80 border-slate-800 hover:border-slate-700 hover:bg-[#0E1528]'
                      : 'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                  </div>
                  <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} group-hover:text-cyan-500 transition-colors`}>
                    {item.title}
                  </h3>
                  <p className={`text-[11px] mt-1 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className={`relative z-20 py-4 px-6 border-t text-center text-[11px] ${
        isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200/90 text-slate-400'
      }`}>
        <span>TransHub Global Freight & Fleet Operating System • System Telemetry Active</span>
      </footer>

    </div>
  );
}
