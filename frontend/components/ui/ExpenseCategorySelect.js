// frontend/components/ui/ExpenseCategorySelect.js
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Fuel,
  CreditCard,
  ShieldAlert,
  Wrench,
  Disc,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Coffee,
  ChevronDown,
  Check,
  Package,
} from 'lucide-react';

export const EXPENSE_CATEGORIES_MARKET = [
  {
    group: 'Deducted from Truck Hire (Company Paid)',
    groupBadge: 'Deductible from Hire',
    groupColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    options: [
      {
        value: 'Fuel & Diesel',
        label: 'Fuel & Diesel',
        desc: 'Diesel slips & bunk fuel provided by company',
        icon: Fuel,
        color: 'text-blue-500 bg-blue-500/10',
      },
      {
        value: 'Toll & Fastag',
        label: 'Toll & FASTag',
        desc: 'Highway toll & FASTag recharges paid by company',
        icon: CreditCard,
        color: 'text-emerald-500 bg-emerald-500/10',
      },
      {
        value: 'Police / RTO / Challan',
        label: 'Police / RTO / Challan',
        desc: 'Transit fines & traffic/documentation penalties',
        icon: ShieldAlert,
        color: 'text-rose-500 bg-rose-500/10',
      },
      {
        value: 'Vehicle Maintenance & Spares',
        label: 'Breakdown & Spares',
        desc: 'Emergency en-route vehicle repairs (deductible)',
        icon: Wrench,
        color: 'text-purple-500 bg-purple-500/10',
      },
      {
        value: 'Tyre & Punctures',
        label: 'Tyre & Punctures',
        desc: 'Puncture repair & tyre emergency replacement',
        icon: Disc,
        color: 'text-cyan-500 bg-cyan-500/10',
      },
    ],
  },
  {
    group: 'Direct Operational Cargo Handling',
    groupBadge: 'Cargo Handling',
    groupColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    options: [
      {
        value: 'Loading Charge',
        label: 'Loading Charge',
        desc: 'Origin labor, hamali & cargo loading charges',
        icon: ArrowUpRight,
        color: 'text-indigo-500 bg-indigo-500/10',
      },
      {
        value: 'Unloading Charge',
        label: 'Unloading Charge',
        desc: 'Destination labor & cargo unloading charges',
        icon: ArrowDownLeft,
        color: 'text-teal-500 bg-teal-500/10',
      },
      {
        value: 'Miscellaneous',
        label: 'Miscellaneous',
        desc: 'Weighbridge / Kanta, gate pass & terminal fee',
        icon: Receipt,
        color: 'text-slate-500 bg-slate-500/10',
      },
    ],
  },
];

export const EXPENSE_CATEGORIES_OWN = [
  {
    group: 'Transit & Running Costs',
    groupBadge: 'Transit',
    groupColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    options: [
      {
        value: 'Fuel & Diesel',
        label: 'Fuel & Diesel',
        desc: 'Diesel bunking, slips & fuel refills',
        icon: Fuel,
        color: 'text-blue-500 bg-blue-500/10',
      },
      {
        value: 'Toll & Fastag',
        label: 'Toll & FASTag',
        desc: 'Highway toll gates & automated FASTag debits',
        icon: CreditCard,
        color: 'text-emerald-500 bg-emerald-500/10',
      },
      {
        value: 'Driver Daily Allowance',
        label: 'Driver Daily Allowance / Bhatta',
        desc: 'Driver & helper daily food & lodging allowance',
        icon: Coffee,
        color: 'text-amber-500 bg-amber-500/10',
      },
    ],
  },
  {
    group: 'Cargo Handling & Operations',
    groupBadge: 'Cargo Handling',
    groupColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    options: [
      {
        value: 'Loading Charge',
        label: 'Loading Charge',
        desc: 'Origin labor, hamali & loading labor',
        icon: ArrowUpRight,
        color: 'text-indigo-500 bg-indigo-500/10',
      },
      {
        value: 'Unloading Charge',
        label: 'Unloading Charge',
        desc: 'Destination labor & unloading labor',
        icon: ArrowDownLeft,
        color: 'text-teal-500 bg-teal-500/10',
      },
    ],
  },
  {
    group: 'Fleet Maintenance & En-Route',
    groupBadge: 'Maintenance',
    groupColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    options: [
      {
        value: 'Vehicle Maintenance & Spares',
        label: 'Vehicle Maintenance & Spares',
        desc: 'Mechanical repairs, oil top-up, spare parts',
        icon: Wrench,
        color: 'text-purple-500 bg-purple-500/10',
      },
      {
        value: 'Tyre & Punctures',
        label: 'Tyre & Punctures',
        desc: 'Tyre repairs, alignment & tube changes',
        icon: Disc,
        color: 'text-cyan-500 bg-cyan-500/10',
      },
      {
        value: 'Police / RTO / Challan',
        label: 'Police / RTO / Challan',
        desc: 'Overload fine, traffic penalty or RTO receipt',
        icon: ShieldAlert,
        color: 'text-rose-500 bg-rose-500/10',
      },
      {
        value: 'Miscellaneous',
        label: 'Miscellaneous',
        desc: 'Weighbridge / Kanta, parking & gate entry pass',
        icon: Receipt,
        color: 'text-slate-500 bg-slate-500/10',
      },
    ],
  },
];

export default function ExpenseCategorySelect({
  value,
  onChange,
  isMarket = false,
  isDark = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 280, openUp: false });

  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const groups = isMarket ? EXPENSE_CATEGORIES_MARKET : EXPENSE_CATEGORIES_OWN;
  const allOptions = groups.flatMap((g) => g.options);

  // Normalize matching: handles 'Loading & Hamali' / 'Loading Charge', 'Unloading Charges' / 'Unloading Charge'
  const currentOption =
    allOptions.find((opt) => {
      if (opt.value === value) return true;
      if (
        (opt.value === 'Loading Charge' && (value === 'Loading & Hamali' || value === 'Loading Charges')) ||
        (opt.value === 'Unloading Charge' && value === 'Unloading Charges')
      ) {
        return true;
      }
      return false;
    }) || allOptions[0];

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < 320 && spaceAbove > spaceBelow;

      setCoords({
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width, 320),
        openUp,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleReposition = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  const IconComponent = currentOption?.icon || Package;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
          isOpen
            ? isDark
              ? 'border-blue-500 bg-slate-900 shadow-lg shadow-blue-500/10'
              : 'border-blue-500 bg-white shadow-lg shadow-blue-500/10'
            : isDark
            ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-600'
            : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${currentOption?.color || 'bg-blue-500/10 text-blue-500'}`}>
            <IconComponent className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold truncate text-slate-800 dark:text-slate-100">
            {currentOption?.label || value}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      {/* Flyout Menu (Portaled to document.body) */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 999999,
            }}
            className={`rounded-2xl border shadow-2xl p-2 max-h-[360px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
              isDark
                ? 'bg-[#0B1020]/95 border-slate-700 text-white shadow-black/60'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/20'
            }`}
          >
            {groups.map((group, gIdx) => (
              <div key={group.group} className={gIdx > 0 ? 'mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80' : ''}>
                {/* Group Header Badge */}
                <div className="px-2.5 py-1 mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {group.group}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${group.groupColor}`}>
                    {group.groupBadge}
                  </span>
                </div>

                {/* Group Options */}
                <div className="space-y-0.5">
                  {group.options.map((opt) => {
                    const OptIcon = opt.icon;
                    const isSelected =
                      currentOption?.value === opt.value ||
                      value === opt.value ||
                      (opt.value === 'Loading Charge' && (value === 'Loading & Hamali' || value === 'Loading Charges')) ||
                      (opt.value === 'Unloading Charge' && value === 'Unloading Charges');

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-blue-600/20 text-white border border-blue-500/40'
                              : 'bg-blue-50 text-blue-900 border border-blue-200'
                            : isDark
                            ? 'hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent'
                            : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${opt.color}`}>
                            <OptIcon className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate flex items-center gap-1.5">
                              <span>{opt.label}</span>
                              {isSelected && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {opt.desc}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
