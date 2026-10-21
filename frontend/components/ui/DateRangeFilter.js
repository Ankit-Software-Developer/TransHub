// frontend/components/ui/DateRangeFilter.js
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X, Check } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export default function DateRangeFilter({
  fromDate = '',
  toDate = '',
  onChange,
  onClear,
  className = '',
  align = 'right',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(fromDate);
  const [tempTo, setTempTo] = useState(toDate);
  const [activePreset, setActivePreset] = useState('ALL');
  const dropdownRef = useRef(null);

  // Sync internal state and activePreset when external props change
  useEffect(() => {
    setTempFrom(fromDate || '');
    setTempTo(toDate || '');

    if (!fromDate && !toDate) {
      setActivePreset('ALL');
      return;
    }

    const now = new Date();
    const today = formatDateYMD(now);
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const yStr = formatDateYMD(y);

    const past7 = new Date(now);
    past7.setDate(now.getDate() - 6);
    const past7Str = formatDateYMD(past7);

    const thisMonthStart = formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    const thisMonthEnd = formatDateYMD(now);

    const lastMonthStart = formatDateYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 0));

    if (fromDate === today && toDate === today) {
      setActivePreset('TODAY');
    } else if (fromDate === yStr && toDate === yStr) {
      setActivePreset('YESTERDAY');
    } else if (fromDate === past7Str && toDate === today) {
      setActivePreset('LAST_7_DAYS');
    } else if (fromDate === thisMonthStart && toDate === thisMonthEnd) {
      setActivePreset('THIS_MONTH');
    } else if (fromDate === lastMonthStart && toDate === lastMonthEnd) {
      setActivePreset('LAST_MONTH');
    } else {
      setActivePreset('CUSTOM');
    }
  }, [fromDate, toDate]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const formatDateYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelectPreset = (presetKey) => {
    setActivePreset(presetKey);
    const now = new Date();

    if (presetKey === 'ALL') {
      setTempFrom('');
      setTempTo('');
      if (onChange) onChange({ fromDate: '', toDate: '', label: 'All Dates' });
      setIsOpen(false);
      return;
    }

    if (presetKey === 'TODAY') {
      const today = formatDateYMD(now);
      setTempFrom(today);
      setTempTo(today);
      if (onChange) onChange({ fromDate: today, toDate: today, label: 'Today' });
      setIsOpen(false);
      return;
    }

    if (presetKey === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = formatDateYMD(y);
      setTempFrom(yStr);
      setTempTo(yStr);
      if (onChange) onChange({ fromDate: yStr, toDate: yStr, label: 'Yesterday' });
      setIsOpen(false);
      return;
    }

    if (presetKey === 'LAST_7_DAYS') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      const startStr = formatDateYMD(past);
      const endStr = formatDateYMD(now);
      setTempFrom(startStr);
      setTempTo(endStr);
      if (onChange) onChange({ fromDate: startStr, toDate: endStr, label: 'Last 7 Days' });
      setIsOpen(false);
      return;
    }

    if (presetKey === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(now);
      setTempFrom(startStr);
      setTempTo(endStr);
      if (onChange) onChange({ fromDate: startStr, toDate: endStr, label: 'This Month' });
      setIsOpen(false);
      return;
    }

    if (presetKey === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(end);
      setTempFrom(startStr);
      setTempTo(endStr);
      if (onChange) onChange({ fromDate: startStr, toDate: endStr, label: 'Last Month' });
      setIsOpen(false);
      return;
    }

    if (presetKey === 'CUSTOM') {
      // Keep open for user to choose dates
    }
  };

  const handleApplyCustom = () => {
    if (!tempFrom && !tempTo) {
      handleClear();
      return;
    }
    setActivePreset('CUSTOM');
    if (onChange) {
      onChange({
        fromDate: tempFrom,
        toDate: tempTo,
        label: tempFrom && tempTo ? `${tempFrom} to ${tempTo}` : tempFrom ? `From ${tempFrom}` : `Up to ${tempTo}`,
      });
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    if (e) e.stopPropagation();
    setTempFrom('');
    setTempTo('');
    setActivePreset('ALL');
    if (onClear) onClear();
    else if (onChange) onChange({ fromDate: '', toDate: '', label: 'All Dates' });
    setIsOpen(false);
  };

  // Determine active display label
  const isFiltered = Boolean(fromDate || toDate);
  const getDisplayLabel = () => {
    if (!fromDate && !toDate) return 'All Dates';
    if (fromDate === toDate) {
      const today = formatDateYMD(new Date());
      if (fromDate === today) return 'Today';
      const y = new Date();
      y.setDate(y.getDate() - 1);
      if (fromDate === formatDateYMD(y)) return 'Yesterday';
      return fromDate;
    }
    if (activePreset === 'LAST_7_DAYS') return 'Last 7 Days';
    if (activePreset === 'THIS_MONTH') return 'This Month';
    if (activePreset === 'LAST_MONTH') return 'Last Month';
    return `${fromDate} ➔ ${toDate}`;
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer ${
          isFiltered
            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
            : isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
        }`}
        title="Filter by date range"
      >
        <div className="flex items-center space-x-1.5 sm:space-x-2 truncate min-w-0">
          <Calendar className={`w-3.5 h-3.5 shrink-0 ${isFiltered ? 'text-white' : 'text-blue-500'}`} />
          <span className="truncate">{getDisplayLabel()}</span>
        </div>

        {isFiltered ? (
          <span
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-blue-700/80 text-white transition-colors cursor-pointer ml-1.5 shrink-0"
            title="Clear date filter"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-80 rounded-3xl border shadow-2xl z-50 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-[#0E1528] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              FILTER BY DATE
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-rose-500 hover:text-rose-400 font-bold cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Quick Presets Grid (3 x 2) */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
            ].map((p) => {
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isDark
                      ? 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Box */}
          <div className={`p-3 rounded-2xl border space-y-2.5 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              CUSTOM DATE RANGE
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => {
                    setTempFrom(e.target.value);
                    setActivePreset('CUSTOM');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={tempTo}
                  onChange={(e) => {
                    setTempTo(e.target.value);
                    setActivePreset('CUSTOM');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!tempFrom && !tempTo}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
