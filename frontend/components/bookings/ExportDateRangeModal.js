// frontend/components/bookings/ExportDateRangeModal.js
'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';

export default function ExportDateRangeModal({
  isOpen,
  onClose,
  initialFromDate = '',
  initialToDate = '',
  initialStatus = 'ALL',
  branches = [],
  activeBranch = 'ALL',
  columns = [],
  documentTerminology = 'Docket',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canExport } = usePermissions();

  const [datePreset, setDatePreset] = useState('THIS_MONTH');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState(initialStatus || 'ALL');
  const [branchId, setBranchId] = useState(activeBranch !== 'ALL' ? activeBranch : 'ALL');
  const [format, setFormat] = useState('EXCEL'); // 'EXCEL' or 'CSV'
  const [isExporting, setIsExporting] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const formatDateYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set initial dates based on initialFromDate/initialToDate or preset
  useEffect(() => {
    if (!isOpen) return;

    if (initialFromDate || initialToDate) {
      setFromDate(initialFromDate || '');
      setToDate(initialToDate || '');
      setDatePreset('CUSTOM');
    } else {
      applyPreset('THIS_MONTH');
    }
    setStatus(initialStatus || 'ALL');
    setBranchId(activeBranch !== 'ALL' ? activeBranch : 'ALL');
  }, [isOpen, initialFromDate, initialToDate, initialStatus, activeBranch]);

  const applyPreset = (presetKey) => {
    setDatePreset(presetKey);
    const now = new Date();

    if (presetKey === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (presetKey === 'TODAY') {
      const today = formatDateYMD(now);
      setFromDate(today);
      setToDate(today);
    } else if (presetKey === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = formatDateYMD(y);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (presetKey === 'LAST_7_DAYS') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setFromDate(formatDateYMD(past));
      setToDate(formatDateYMD(now));
    } else if (presetKey === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatDateYMD(start));
      setToDate(formatDateYMD(now));
    } else if (presetKey === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(formatDateYMD(start));
      setToDate(formatDateYMD(end));
    }
  };

  // Fetch count preview when filters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchPreviewCount = async () => {
      setIsLoadingPreview(true);
      try {
        let url = `/bookings?page=1&limit=1`;
        if (fromDate) url += `&from_date=${fromDate}`;
        if (toDate) url += `&to_date=${toDate}`;
        if (status && status !== 'ALL') {
          url += `&status=${status === 'PENDING' ? 'BOOKED' : status}`;
        }
        if (branchId && branchId !== 'ALL') {
          url += `&branch_id=${branchId}`;
        }

        const res = await api.get(url);
        if (isMounted) {
          setPreviewCount(res.data?.pagination?.total ?? 0);
        }
      } catch (err) {
        if (isMounted) setPreviewCount(null);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreviewCount, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, fromDate, toDate, status, branchId]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!canExport) {
      alert('Permission Denied: Only users with Administrator or Export permissions can download this dataset.');
      return;
    }

    setIsExporting(true);
    try {
      let url = `/bookings?limit=all&page=1&sort_by=booking_date&sort_order=DESC`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;
      if (status && status !== 'ALL') {
        url += `&status=${status === 'PENDING' ? 'BOOKED' : status}`;
      }
      if (branchId && branchId !== 'ALL') {
        url += `&branch_id=${branchId}`;
      }

      const res = await api.get(url);
      const rawRows = res.data?.data || [];

      if (rawRows.length === 0) {
        alert('No dockets found matching the selected date range and filters.');
        setIsExporting(false);
        return;
      }

      // Map raw rows into flat export objects
      const exportCols = columns.filter((c) => !c.excludeFromExport && c.key !== 'actions');
      const getVal = (row, col) => {
        if (col.exportValue) return col.exportValue(row);
        const val = row[col.key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return val.name || val.label || JSON.stringify(val);
        return String(val);
      };

      const dateSuffix = fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate ? `from_${fromDate}` : toDate ? `up_to_${toDate}` : 'all_dates';
      const fileName = `${documentTerminology}_Register_${dateSuffix}`;

      if (format === 'CSV') {
        const headers = exportCols.map((c) => `"${(c.header || c.label || c.key).replace(/"/g, '""')}"`);
        const rows = rawRows.map((row) =>
          exportCols
            .map((col) => {
              const text = getVal(row, col);
              return `"${String(text).replace(/"/g, '""')}"`;
            })
            .join(',')
        );

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      } else {
        // Excel (.xls XML Format)
        const tableHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>${documentTerminology.slice(0, 31)}</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              th { background-color: #0f172a; color: #38bdf8; font-weight: bold; padding: 10px; border: 1px solid #334155; }
              td { padding: 8px; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 11px; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${exportCols.map((c) => `<th>${c.header || c.label || c.key}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rawRows
                  .map(
                    (row) => `
                  <tr>
                    ${exportCols
                      .map((col) => {
                        const raw = getVal(row, col);
                        return `<td>${String(raw).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
                      })
                      .join('')}
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${fileName}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }

      onClose();
    } catch (err) {
      console.error('Error during date range export:', err);
      alert('Failed to generate export file. Please check server connection.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Export {documentTerminology} Register
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Download consignments filtered by date range and status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Date Range Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>1. Select Date Range</span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: 'ALL', label: 'All Time' },
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'LAST_7_DAYS', label: '7 Days' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'LAST_MONTH', label: 'Last Month' },
              ].map((p) => {
                const isSelected = datePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold text-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : isDark
                        ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Step 2: Filters */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              <span>2. Additional Filters (Optional)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="BOOKED">Booked / Godown</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                </select>
              </div>

              {branches.length > 0 && (
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Branch</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Choose Format */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>3. Choose Export Format</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setFormat('EXCEL')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 ${
                  format === 'EXCEL'
                    ? 'border-blue-600 bg-blue-600/10 text-blue-500'
                    : isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Excel Spreadsheet</div>
                  <div className="text-[10px] text-slate-400">Microsoft Excel (.xls)</div>
                </div>
              </div>

              <div
                onClick={() => setFormat('CSV')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 ${
                  format === 'CSV'
                    ? 'border-blue-600 bg-blue-600/10 text-blue-500'
                    : isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-6 h-6 text-cyan-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Standard CSV</div>
                  <div className="text-[10px] text-slate-400">Comma-separated (.csv)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Match Badge */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            isDark ? 'bg-[#0E1528] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Matching Dockets in Range:</span>
            </span>
            <span className="font-black text-sm">
              {isLoadingPreview ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                `${previewCount ?? 0} Record${previewCount === 1 ? '' : 's'}`
              )}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-[#0E1528]' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Export...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {previewCount ? `${previewCount} Dockets` : 'Export'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
