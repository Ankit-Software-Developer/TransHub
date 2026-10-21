// frontend/components/ui/VehicleTypeSelect.js
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Truck, ChevronDown, Check, Sparkles } from 'lucide-react';

export const STANDARD_VEHICLE_TYPES = [
  { value: 'TRUCK', label: 'Heavy Truck (16T - 25T Taurus)', defaultCapacity: 16.0, desc: 'Taurus / Multi-axle long haul' },
  { value: 'CONTAINER', label: 'Container (28T - 40T Closed Body)', defaultCapacity: 30.0, desc: 'Weatherproof closed container' },
  { value: 'TRAILER', label: 'Multi-Axle Trailer (32T+ Flatbed)', defaultCapacity: 35.0, desc: 'Flatbed / Semi-low bed machinery' },
  { value: 'MINI_TRUCK', label: 'Mini Truck (Eicher / 7T - 14T)', defaultCapacity: 9.5, desc: 'Intermediate commercial vehicle' },
  { value: 'PICKUP', label: 'Pickup (Bolero / 2.5T)', defaultCapacity: 2.5, desc: 'Fast feeder & express pickup' },
  { value: 'TEMPO', label: 'Tempo / Local Delivery Carrier', defaultCapacity: 1.5, desc: 'Last-mile city intra-hub' },
  { value: 'TANKER', label: 'Tanker / Bulk Carrier', defaultCapacity: 20.0, desc: 'Liquid / petroleum / edible oil bulk' },
  { value: 'TIPPER', label: 'Tipper / Dumper (10-14 Wheeler)', defaultCapacity: 18.0, desc: 'Mining, aggregates & sand dump' },
  { value: 'REEFER', label: 'Reefer / Refrigerated Carrier', defaultCapacity: 14.0, desc: 'Temperature controlled cold chain' },
];

export default function VehicleTypeSelect({
  value = 'TRUCK',
  onChange,
  onSelectPreset,
  isDark = false,
  className = '',
  placeholder = 'Select or type vehicle type...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Helper to find preset by value or label
  const findPreset = (val) => {
    if (!val) return null;
    const clean = String(val).trim().toUpperCase();
    return STANDARD_VEHICLE_TYPES.find(
      (t) => t.value.toUpperCase() === clean || t.label.toUpperCase() === clean
    );
  };

  const preset = findPreset(value);
  const [inputValue, setInputValue] = useState(preset ? preset.label : (value || ''));

  // Sync internal input value when external value changes
  useEffect(() => {
    const p = findPreset(value);
    setInputValue(p ? p.label : (value || ''));
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter presets based on what the user types
  const filteredPresets = useMemo(() => {
    if (!inputValue.trim()) return STANDARD_VEHICLE_TYPES;
    const q = inputValue.toLowerCase().trim();
    return STANDARD_VEHICLE_TYPES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q)
    );
  }, [inputValue]);

  // When user types in the input box:
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    setIsOpen(true);

    // Auto-save: check if text matches a preset
    const matched = findPreset(text);
    if (matched) {
      onChange(matched.value);
      if (onSelectPreset) onSelectPreset(matched);
    } else {
      // IF NOT PRESENT: directly auto-save what they typed as custom!
      onChange(text);
    }
  };

  // When user selects a preset from the dropdown:
  const handleSelectPreset = (p) => {
    setInputValue(p.label);
    onChange(p.value);
    if (onSelectPreset) onSelectPreset(p);
    setIsOpen(false);
  };

  const isExactPreset = Boolean(findPreset(inputValue) || findPreset(value));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Combobox Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-blue-500 flex items-center justify-center">
          <Truck className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20'
              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-xs'
          }`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setIsOpen(false);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Toggle fleet presets"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1.5 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'bg-[#0B1020]/98 border-slate-800 shadow-black/60'
              : 'bg-white/98 border-slate-200 shadow-slate-300/60'
          }`}
        >
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filteredPresets.map((p) => {
              const isSelected = findPreset(value)?.value === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur before selection
                    handleSelectPreset(p);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                      : isDark
                      ? 'hover:bg-slate-800/70 text-slate-200'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span className="truncate">{p.label}</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {p.desc}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
                </button>
              );
            })}

            {/* If what is typed is NOT in the presets, auto-saved as custom banner */}
            {inputValue.trim() && !isExactPreset && (
              <div
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  isDark
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <div className="min-w-0 flex-1 truncate">
                  Custom type: <strong className="font-bold">&quot;{inputValue.trim()}&quot;</strong> (Auto-saved)
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
