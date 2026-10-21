// frontend/components/ui/VehicleStatusSelect.js
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const VEHICLE_STATUS_OPTIONS = [
  {
    value: 'AVAILABLE',
    label: 'At Yard (Available for Line-Haul Dispatch)',
    shortLabel: 'At Yard (Available)',
    dotColor: 'bg-emerald-500',
    pingColor: 'bg-emerald-400',
    desc: 'Parked at yard and ready for immediate trip loading & dispatch',
  },
  {
    value: 'ON_ROAD',
    label: 'In Transit (Active On Road)',
    shortLabel: 'In Transit (On Road)',
    dotColor: 'bg-blue-500',
    pingColor: 'bg-blue-400',
    desc: 'Currently dispatched on active line-haul or local trip',
  },
  {
    value: 'MAINTENANCE',
    label: 'In Workshop (Under Maintenance)',
    shortLabel: 'In Workshop (Maintenance)',
    dotColor: 'bg-amber-500',
    pingColor: 'bg-amber-400',
    desc: 'Vehicle undergoing repairs, periodic service or fitness checks',
  },
  {
    value: 'INACTIVE',
    label: 'Inactive / Retired (Deactivated)',
    shortLabel: 'Inactive / Retired',
    dotColor: 'bg-rose-500',
    pingColor: 'bg-rose-400',
    desc: 'Off-road, lease expired, or decommissioned from fleet',
  },
];

export default function VehicleStatusSelect({
  value = 'AVAILABLE',
  onChange,
  isDark = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentOption =
    VEHICLE_STATUS_OPTIONS.find((opt) => opt.value === value) || VEHICLE_STATUS_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-600 focus:border-cyan-400'
            : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentOption.pingColor}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentOption.dotColor}`}></span>
          </span>
          <span className="truncate">{currentOption.label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu Popup */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1.5 z-50 rounded-2xl border shadow-2xl p-1.5 space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'bg-[#0B1020]/98 border-slate-800 shadow-black/60'
              : 'bg-white/98 border-slate-200 shadow-slate-300/60'
          }`}
        >
          {VEHICLE_STATUS_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                    : isDark
                    ? 'hover:bg-slate-800/70 text-slate-200'
                    : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${option.dotColor}`}></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{option.label}</div>
                    <div className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {option.desc}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
