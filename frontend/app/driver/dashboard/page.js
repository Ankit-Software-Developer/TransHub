// frontend/app/driver/dashboard/page.js
'use client';

import React, { useState } from 'react';
import {
  Truck,
  Navigation,
  Camera,
  PenTool,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Fuel,
  Gauge,
  MapPin,
  FileCheck2,
  Phone,
  Radio,
  ChevronRight,
  X,
  Check,
  UploadCloud,
  Compass,
  Bell
} from 'lucide-react';
import Link from 'next/link';

export default function DriverMobileHUD() {
  const [activeTab, setActiveTab] = useState('TRIP');
  const [isPODModalOpen, setIsPODModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [podUploaded, setPodUploaded] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const [delayReported, setDelayReported] = useState(false);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      
      {/* Mobile Smartphone Shell Container (Max Width 460px centered) */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-4 pb-20 sm:p-5 relative">
        
        {/* Top Native Mobile Header & Driver Profile */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-black shadow-md shadow-cyan-500/25">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold text-white leading-none">Rajesh Kumar</h1>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    4.9 ★
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Vehicle: MH 12 AB 1234 (Tata Prima)</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping" />
                GPS LIVE
              </span>
            </div>
          </div>

          {/* Active Trip Card */}
          <div className="my-4 p-4 rounded-3xl bg-[#0B1020] border border-cyan-500/30 shadow-xl space-y-3.5 relative overflow-hidden">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-cyan-400 font-bold text-[11px]">TRIP: TRH-784521</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                Priority Freight
              </span>
            </div>

            {/* Route Vector */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-black text-white">Delhi (DEL)</div>
                <div className="text-[10px] text-slate-400">Hub 01 • DL 110001</div>
              </div>
              <div className="flex flex-col items-center px-3">
                <span className="text-[9px] font-mono text-cyan-400">NH-48</span>
                <ArrowRight className="w-5 h-5 text-cyan-400 my-0.5" />
                <span className="text-[9px] text-slate-500">1,420 km</span>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-white">Mumbai (BOM)</div>
                <div className="text-[10px] text-slate-400">Bhiwandi • MH 400070</div>
              </div>
            </div>

            {/* Simulated Live Corridor Visual */}
            <div className="p-3 rounded-2xl bg-[#070B14] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Vadodara Bypass Corridor</span>
                </span>
                <span className="text-cyan-400 font-mono font-bold">64% Completed</span>
              </div>

              {/* Progress Line */}
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 rounded-full w-[64%]" />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Passed: Jaipur, Udaipur</span>
                <span>Next: Surat Toll</span>
              </div>
            </div>

            {/* 4 Telemetry Pill Gauges */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-mono font-bold text-white text-[11px]">620 km</div>
                <div className="text-[9px] text-slate-400">To Go</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-mono font-bold text-cyan-400 text-[11px]">8h 20m</div>
                <div className="text-[9px] text-slate-400">ETA</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-mono font-bold text-emerald-400 text-[11px]">68 km/h</div>
                <div className="text-[9px] text-slate-400">Speed</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-mono font-bold text-amber-400 text-[11px]">78%</div>
                <div className="text-[9px] text-slate-400">Diesel</div>
              </div>
            </div>
          </div>

          {/* 4-Stage Milestone Stepper */}
          <div className="p-4 rounded-3xl bg-[#0B1020] border border-slate-800 mb-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Trip Milestone Stepper
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delhi Central Warehouse (Loaded)</span>
                <span className="text-[10px] font-mono text-slate-500 ml-auto">06:00 AM</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 flex items-center justify-center animate-ping shrink-0" />
                <span>In Transit (NH-48 Gujarat Highway)</span>
                <span className="text-[10px] font-mono text-cyan-400 ml-auto">Active</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                <span>Bhiwandi Hub Unloading Dock</span>
                <span className="text-[10px] font-mono text-slate-600 ml-auto">Pending</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                <span>POD Signed & Reconciled</span>
                <span className="text-[10px] font-mono text-slate-600 ml-auto">Pending</span>
              </div>
            </div>
          </div>

          {/* One-Tap Driver Touch Action Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            
            {/* Action 1: Navigation */}
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/60 to-blue-950 border border-blue-500/30 text-left active:scale-95 transition-all flex flex-col justify-between h-28 shadow-lg shadow-blue-950/40"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Navigation className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Open Navigation</div>
                <div className="text-[10px] text-cyan-300">Live GPS Corridor</div>
              </div>
            </a>

            {/* Action 2: Upload POD */}
            <button
              onClick={() => setIsPODModalOpen(true)}
              className={`p-4 rounded-2xl border text-left active:scale-95 transition-all flex flex-col justify-between h-28 shadow-lg ${
                podUploaded
                  ? 'bg-emerald-950/60 border-emerald-500/40'
                  : 'bg-gradient-to-br from-purple-900/60 to-purple-950 border-purple-500/30'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                podUploaded ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'
              }`}>
                {podUploaded ? <Check className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {podUploaded ? 'POD Uploaded ✓' : 'Capture POD'}
                </div>
                <div className="text-[10px] text-purple-300">
                  {podUploaded ? 'Stamped & Verified' : 'Camera OCR Scan'}
                </div>
              </div>
            </button>

            {/* Action 3: Receiver Signature */}
            <button
              onClick={() => setIsSignModalOpen(true)}
              className={`p-4 rounded-2xl border text-left active:scale-95 transition-all flex flex-col justify-between h-28 shadow-lg ${
                signatureDone
                  ? 'bg-emerald-950/60 border-emerald-500/40'
                  : 'bg-gradient-to-br from-emerald-900/60 to-emerald-950 border-emerald-500/30'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                signatureDone ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {signatureDone ? <Check className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {signatureDone ? 'Signed by Receiver ✓' : 'Receiver Sign'}
                </div>
                <div className="text-[10px] text-emerald-300">
                  {signatureDone ? 'OTP Verified' : 'Touchscreen Canvas'}
                </div>
              </div>
            </button>

            {/* Action 4: Delay Alert */}
            <button
              onClick={() => setIsDelayModalOpen(true)}
              className={`p-4 rounded-2xl border text-left active:scale-95 transition-all flex flex-col justify-between h-28 shadow-lg ${
                delayReported
                  ? 'bg-rose-950/60 border-rose-500/40'
                  : 'bg-gradient-to-br from-rose-900/60 to-rose-950 border-rose-500/30'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                delayReported ? 'bg-rose-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {delayReported ? 'Halt Reported' : 'Report Delay'}
                </div>
                <div className="text-[10px] text-rose-300">
                  {delayReported ? 'Control Tower Notified' : 'Toll / Border / Breakdown'}
                </div>
              </div>
            </button>

          </div>

          {/* Emergency SOS & Dispatch Helpline */}
          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">24x7 Control Tower Helpline:</span>
            </div>
            <a href="tel:18002660000" className="font-mono font-bold text-cyan-400">
              1800-266-0000
            </a>
          </div>

        </div>

        {/* Bottom Mobile Tab Bar (Fixed Bottom) */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#070B14]/95 backdrop-blur-xl border-t border-slate-800 p-2 z-20 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('TRIP')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              activeTab === 'TRIP' ? 'text-cyan-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Truck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Trip</span>
          </button>

          <button
            onClick={() => alert('Viewing 18 Consignments Manifest for TRH-784521')}
            className="flex flex-col items-center py-1 px-3 rounded-xl text-slate-400 hover:text-white"
          >
            <FileCheck2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Manifest</span>
          </button>

          <button
            onClick={() => setIsPODModalOpen(true)}
            className="flex flex-col items-center py-1 px-3 rounded-xl text-slate-400 hover:text-white"
          >
            <Camera className="w-5 h-5 mb-0.5 text-purple-400" />
            <span className="text-[10px]">POD</span>
          </button>

          <button
            onClick={() => alert('Viewing Diesel Fuel & Toll Card Balance: ₹12,400')}
            className="flex flex-col items-center py-1 px-3 rounded-xl text-slate-400 hover:text-white"
          >
            <Fuel className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Fastag</span>
          </button>

          <Link
            href="/dashboard"
            className="flex flex-col items-center py-1 px-3 rounded-xl text-slate-400 hover:text-white"
          >
            <Compass className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Portal</span>
          </Link>
        </div>

        {/* MODAL 1: Camera POD Upload */}
        {isPODModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-[#0B1020] border border-purple-500/40 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Capture Physical LR POD</h3>
                </div>
                <button onClick={() => setIsPODModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-44 rounded-2xl bg-slate-900 border-2 border-dashed border-purple-500/30 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-purple-400">
                <UploadCloud className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-xs font-bold text-white">Take Photo of Stamped LR</p>
                <p className="text-[10px] text-slate-400 mt-1">Receiver seal & signature must be clearly visible</p>
              </div>

              <button
                onClick={() => {
                  setPodUploaded(true);
                  setIsPODModalOpen(false);
                  alert('Proof of Delivery photo uploaded with GPS stamp. Reconciled in Invoicing ledger!');
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30"
              >
                Upload & Confirm POD ➔
              </button>
            </div>
          </div>
        )}

        {/* MODAL 2: Receiver Touchscreen Signature */}
        {isSignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-[#0B1020] border border-emerald-500/40 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Receiver Touch Signature</h3>
                </div>
                <button onClick={() => setIsSignModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-36 rounded-2xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500">Sign inside this box</span>
                <div className="font-serif italic text-2xl text-cyan-300 text-center select-none">
                  S. K. Sharma
                </div>
                <span className="text-[9px] text-slate-500 text-right">Receiver: Apollo Supply Chain</span>
              </div>

              <button
                onClick={() => {
                  setSignatureDone(true);
                  setIsSignModalOpen(false);
                  alert('Touch signature recorded with timestamp. Consignment marked as DELIVERED!');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Confirm Signature ➔
              </button>
            </div>
          </div>
        )}

        {/* MODAL 3: Report Delay */}
        {isDelayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-[#0B1020] border border-rose-500/40 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Report Transit Halt / Delay</h3>
                </div>
                <button onClick={() => setIsDelayModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <button
                  onClick={() => {
                    setDelayReported(true);
                    setIsDelayModalOpen(false);
                    alert('Delay reported: Toll congestion (+45m). Control tower adjusted ETA.');
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-white font-bold"
                >
                  🛑 Heavy Toll / Border Queue (+45m)
                </button>
                <button
                  onClick={() => {
                    setDelayReported(true);
                    setIsDelayModalOpen(false);
                    alert('Delay reported: Severe Monsoon Rain (+2h). Control tower adjusted ETA.');
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-white font-bold"
                >
                  🌧️ Highway Flooding / Heavy Rain (+2h)
                </button>
                <button
                  onClick={() => {
                    setDelayReported(true);
                    setIsDelayModalOpen(false);
                    alert('Mechanical breakdown logged. Emergency workshop van dispatched!');
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-rose-400 font-bold"
                >
                  ⚠️ Tyre Puncture / Mechanical Issue
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
