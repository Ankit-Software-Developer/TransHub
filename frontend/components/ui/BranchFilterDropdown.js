// frontend/components/ui/BranchFilterDropdown.js
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, ChevronDown, Check, Search, X, MapPin } from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { useOperationsType, isHeadOfficeBranch } from '../../hooks/useOperationsType';

export default function BranchFilterDropdown({
  selectedBranchId = 'ALL',
  onChange,
  branches = [],
  branchStats = null, // Array of { branch_id, customer_count, total_credit_limit, etc. }
  totalCount = null,
  allLabel = 'All Branches',
  allSubtitle = 'Consolidated Network View',
  showLabel = true,
  label = 'Branch:',
  placeholder = 'Select branch...',
  align = 'right',
  size = 'md', // 'sm' | 'md'
  className = '',
  searchable = true,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { allowsMultiBranchHubs } = useOperationsType();

  // In Single HQ modes (FTL Fleet Supplier & FTL Direct Carrier), hide branch filter dropdown across every screen
  if (!allowsMultiBranchHubs) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input if open
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, searchable]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Index branch stats for fast lookup
  const statsMap = useMemo(() => {
    if (!branchStats || !Array.isArray(branchStats)) return {};
    const map = {};
    branchStats.forEach((st) => {
      const key = String(st.branch_id || st.id);
      map[key] = st;
    });
    return map;
  }, [branchStats]);

  // Normalize selectedBranchId to string ID or 'ALL'
  const normalizedId = useMemo(() => {
    if (!selectedBranchId) return 'ALL';
    if (typeof selectedBranchId === 'object') {
      if (!selectedBranchId.id || selectedBranchId.code === 'ALL' || selectedBranchId.id === 'ALL') {
        return 'ALL';
      }
      return String(selectedBranchId.id);
    }
    if (selectedBranchId === 'ALL' || selectedBranchId === 'null' || selectedBranchId === 'undefined') {
      return 'ALL';
    }
    return String(selectedBranchId);
  }, [selectedBranchId]);

  // Find active branch
  const activeBranch = useMemo(() => {
    if (normalizedId === 'ALL') return null;
    return branches.find((b) => String(b.id) === normalizedId) || null;
  }, [normalizedId, branches]);

  // Filtered branches list
  const filteredBranches = useMemo(() => {
    if (!search.trim()) return branches;
    const q = search.toLowerCase();
    return branches.filter((b) => {
      const name = (b.branch_name || b.name || '').toLowerCase();
      const code = (b.branch_code || '').toLowerCase();
      const city = (b.city || '').toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q);
    });
  }, [branches, search]);

  const handleSelect = (id) => {
    if (onChange) {
      onChange(id);
    }
    setIsOpen(false);
    setSearch('');
  };

  // Label display for trigger button
  const displayLabel = useMemo(() => {
    if (normalizedId === 'ALL') {
      return allLabel;
    }
    if (activeBranch) {
      return activeBranch.branch_name || activeBranch.name || allLabel;
    }
    return allLabel;
  }, [normalizedId, activeBranch, allLabel]);

  const isAllSelected = normalizedId === 'ALL';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border font-bold transition-all select-none cursor-pointer active:scale-98 ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
        } ${
          !isAllSelected
            ? isDark
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-900/20'
              : 'bg-blue-50/80 border-blue-300 text-blue-800 shadow-xs'
            : isDark
            ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-600'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs hover:border-slate-300'
        }`}
        title={activeBranch ? `Filtered to: ${displayLabel}` : 'Filter by branch'}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2
            className={`w-3.5 h-3.5 shrink-0 ${
              !isAllSelected ? 'text-cyan-400 dark:text-cyan-300' : 'text-cyan-500 dark:text-cyan-400'
            }`}
          />
          {showLabel && (
            <span
              className={`text-[11px] font-semibold shrink-0 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {label}
            </span>
          )}
          <span className="truncate max-w-[130px] sm:max-w-[180px] font-semibold">
            {displayLabel}
          </span>
          {activeBranch?.branch_code && (
            <span
              className={`text-[10px] font-mono px-1 py-0.2 rounded shrink-0 hidden sm:inline ${
                isDark ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-blue-700'
              }`}
            >
              {activeBranch.branch_code}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-1.5 w-72 sm:w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-[#0E1528] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Filter by Branch
              </span>
            </div>
            {branches.length > 0 && (
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {branches.length} Active Hubs
              </span>
            )}
          </div>

          {/* Search bar inside dropdown if > 4 branches */}
          {searchable && branches.length > 4 && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-800/80">
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs ${
                  isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search branch, code, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Branches List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 p-1">
            {/* All Branches / Network-wide Option */}
            <div
              onClick={() => handleSelect('ALL')}
              className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors flex items-center justify-between gap-2 ${
                isAllSelected
                  ? isDark
                    ? 'bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'bg-blue-50 text-blue-800 font-bold'
                  : isDark
                  ? 'hover:bg-slate-800/60 text-slate-300'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isAllSelected
                      ? 'bg-cyan-500 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{allLabel}</div>
                  <div className="text-[10px] text-slate-400 font-normal truncate">
                    {allSubtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {totalCount !== null && totalCount !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold ${
                      isAllSelected
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {totalCount}
                  </span>
                )}
                {isAllSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </div>
            </div>

            {/* Individual Branches */}
            {filteredBranches.map((b) => {
              const isSelected = String(selectedBranchId) === String(b.id);
              const stat = statsMap[String(b.id)];
              const count = stat?.customer_count ?? stat?.count ?? b.count ?? null;
              const creditLimit = stat?.total_credit_limit ?? null;

              return (
                <div
                  key={b.id}
                  onClick={() => handleSelect(b.id)}
                  className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors flex items-center justify-between gap-2 ${
                    isSelected
                      ? isDark
                        ? 'bg-cyan-500/15 text-cyan-300 font-bold'
                        : 'bg-blue-50 text-blue-800 font-bold'
                      : isDark
                      ? 'hover:bg-slate-800/60 text-slate-300'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-cyan-500 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold truncate">
                          {b.branch_name || b.name}
                        </span>
                        {isHeadOfficeBranch(b) ? (
                          <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                            HQ
                          </span>
                        ) : b.is_hub ? (
                          <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                            HUB
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 truncate">
                        {b.branch_code && <span>[{b.branch_code}]</span>}
                        {b.city && <span>• {b.city}</span>}
                        {b.pincode && <span>({b.pincode})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {creditLimit > 0 && (
                      <span className="text-[9px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">
                        ₹{(creditLimit / 100000).toFixed(0)}L
                      </span>
                    )}
                    {count !== null && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </div>
                </div>
              );
            })}

            {filteredBranches.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No branches match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
