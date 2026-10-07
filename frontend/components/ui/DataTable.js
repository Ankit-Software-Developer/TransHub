// frontend/components/ui/DataTable.js
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeProvider';
import { usePermissions } from '../../hooks/usePermissions';
import DateRangeFilter from './DateRangeFilter';
import LoadingState from './LoadingState';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  ChevronDown,
  Calendar
} from 'lucide-react';

/**
 * Enterprise Production-Grade DataTable Component
 * Features:
 * - Server-side & Client-side Pagination
 * - Configurable Page Size (10, 15, 25, 50, 100)
 * - Draggable Column Width Resizing
 * - Multi-directional Sorting (Ascending / Descending)
 * - Data Export (Native CSV & Microsoft Excel .xls with UTF-8 BOM)
 * - Role & Permission Gating
 * - Light / Dark Mode Support
 * - Built-in Date Range Filter positioned before Export button
 */
export default function DataTable({
  columns = [],
  data = [],
  totalCount,
  totalItems,
  isLoading = false,
  loading = false,
  page = 1,
  pageSize = 15,
  pageSizeOptions = [10, 15, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  sortBy = '',
  sortOrder = 'DESC',
  onSortChange,
  searchQuery = '',
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filtersSlot = null,
  actionsSlot = null,
  onRowClick = null,
  exportFilename,
  exportFileName,
  exportable = true,
  searchable = true,
  emptyTitle,
  emptyMessage,
  emptySubtitle = 'There are no records matching your criteria.',
  emptyActionSlot = null,
  requiredExportPermission = 'data.export',
  onExportDateRange = null,
  onExportAll = null,
  dateFilterSlot = null,
  dateFilterable = true,
  fromDate = '',
  toDate = '',
  onDateChange = null,
  onDateFilterChange = null,
  dateFilterKey = '',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canExport, isAdmin } = usePermissions();

  const effectiveLoading = isLoading || loading;
  const effectiveExportFilename = exportFilename || exportFileName || 'Report_Export';
  const effectiveEmptyTitle = emptyTitle || emptyMessage || 'No Records Found';
  const effectiveSearch = searchQuery || search;

  // Internal pagination fallback if client-side
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize || 15);

  const isServerPaged = Boolean(onPageChange);
  const effectivePage = isServerPaged ? page : internalPage;
  const effectivePageSize = isServerPaged ? pageSize : internalPageSize;

  // Date Range Filter State
  const [internalFromDate, setInternalFromDate] = useState(fromDate || '');
  const [internalToDate, setInternalToDate] = useState(toDate || '');

  useEffect(() => {
    if (fromDate !== undefined) setInternalFromDate(fromDate || '');
    if (toDate !== undefined) setInternalToDate(toDate || '');
  }, [fromDate, toDate]);

  const effectiveFromDate = fromDate !== undefined && fromDate !== '' ? fromDate : internalFromDate;
  const effectiveToDate = toDate !== undefined && toDate !== '' ? toDate : internalToDate;

  const handleDateFilterChange = ({ fromDate: newFrom, toDate: newTo, label }) => {
    setInternalFromDate(newFrom);
    setInternalToDate(newTo);
    if (onDateFilterChange) {
      onDateFilterChange({ fromDate: newFrom, toDate: newTo, label });
    } else if (onDateChange) {
      onDateChange({ fromDate: newFrom, toDate: newTo, label });
    } else {
      setInternalPage(1);
    }
  };

  const handleDateFilterClear = () => {
    setInternalFromDate('');
    setInternalToDate('');
    if (onDateFilterChange) {
      onDateFilterChange({ fromDate: '', toDate: '', label: 'All Dates' });
    } else if (onDateChange) {
      onDateChange({ fromDate: '', toDate: '', label: 'All Dates' });
    } else {
      setInternalPage(1);
    }
  };

  // Client-side date filtered data if uncontrolled or not server paged with date handler
  const clientFilteredData = useMemo(() => {
    if (isServerPaged && (onDateFilterChange || onDateChange)) {
      return data;
    }
    if (!effectiveFromDate && !effectiveToDate) {
      return data;
    }

    return data.filter((row) => {
      let val = null;
      if (dateFilterKey && row[dateFilterKey]) {
        val = row[dateFilterKey];
      } else {
        const candidateKeys = [
          'trip_date',
          'expense_date',
          'invoice_date',
          'booking_date',
          'delivery_date',
          'uploaded_at',
          'date',
          'created_at',
          'createdAt',
          'registration_date',
          'updated_at',
        ];
        for (const k of candidateKeys) {
          if (row[k]) {
            val = row[k];
            break;
          }
        }
        if (!val) {
          for (const k in row) {
            if ((k.endsWith('_date') || k.endsWith('_at') || k === 'date') && row[k]) {
              val = row[k];
              break;
            }
          }
        }
      }

      if (!val) return true;

      let rowDateStr = '';
      try {
        if (typeof val === 'string') {
          if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
            rowDateStr = val.slice(0, 10);
          } else {
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
              rowDateStr = parsed.toISOString().slice(0, 10);
            }
          }
        } else if (val instanceof Date) {
          rowDateStr = val.toISOString().slice(0, 10);
        }
      } catch (e) {
        return true;
      }

      if (!rowDateStr) return true;
      if (effectiveFromDate && rowDateStr < effectiveFromDate) return false;
      if (effectiveToDate && rowDateStr > effectiveToDate) return false;
      return true;
    });
  }, [data, isServerPaged, onDateFilterChange, onDateChange, effectiveFromDate, effectiveToDate, dateFilterKey]);

  const effectiveTotalCount = totalCount !== undefined
    ? totalCount
    : (totalItems !== undefined
      ? totalItems
      : (isServerPaged ? data.length : clientFilteredData.length));

  // Column Resizing State
  const [columnWidths, setColumnWidths] = useState({});
  const resizingColRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Export dropdown state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Initialize column widths
  useEffect(() => {
    const initialWidths = {};
    columns.forEach((col) => {
      if (col.width) {
        initialWidths[col.key] = col.width;
      }
    });
    setColumnWidths((prev) => ({ ...initialWidths, ...prev }));
  }, [columns]);

  // Handle Column Resize Dragging
  const handleMouseDownResize = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = col.key;
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[col.key] || col.width || 150;

    const handleMouseMove = (moveEvent) => {
      if (!resizingColRef.current) return;
      const diff = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(col.minWidth || 70, startWidthRef.current + diff);
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColRef.current]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle Sort Click
  const handleSortClick = (col) => {
    if (!col.sortable) return;
    const isCurrent = sortBy === col.key;
    let nextOrder = 'ASC';
    if (isCurrent) {
      nextOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
    }
    if (onSortChange) {
      if (onSortChange.length === 2) {
        onSortChange(col.key, nextOrder);
      } else {
        onSortChange({ sortBy: col.key, sortOrder: nextOrder });
      }
    }
  };

  // Handlers for page & pageSize changes
  const handlePageChange = (newPage) => {
    if (isServerPaged) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  };

  // Client-side slice if not server paged
  const displayData = useMemo(() => {
    if (isServerPaged) return data;
    const start = (effectivePage - 1) * effectivePageSize;
    return clientFilteredData.slice(start, start + effectivePageSize);
  }, [data, clientFilteredData, isServerPaged, effectivePage, effectivePageSize]);

  // Calculate Pagination Numbers
  const totalPages = Math.max(1, Math.ceil(effectiveTotalCount / effectivePageSize));
  const startItem = effectiveTotalCount === 0 ? 0 : (effectivePage - 1) * effectivePageSize + 1;
  const endItem = Math.min(effectiveTotalCount, effectivePage * effectivePageSize);

  // Generate Page Numbers Array with Ellipsis
  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (effectivePage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (effectivePage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', effectivePage - 1, effectivePage, effectivePage + 1, '...', totalPages);
      }
    }
    return pages;
  }, [effectivePage, totalPages]);

  // Helper to extract raw exportable text from a cell
  const getCellExportText = (row, col) => {
    if (col.exportValue) {
      return col.exportValue(row);
    }
    const val = row[col.key];
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      return val.name || val.label || JSON.stringify(val);
    }
    return String(val);
  };

  // Export to CSV
  const handleExportCSV = async () => {
    if (!canExport) {
      alert('Permission Denied: Only users with Administrator or Export permissions can download this dataset.');
      return;
    }
    setIsExportOpen(false);

    let exportRowsData = isServerPaged ? data : clientFilteredData;
    if (onExportAll) {
      try {
        const allData = await onExportAll();
        if (Array.isArray(allData) && allData.length > 0) {
          exportRowsData = allData;
        }
      } catch (e) {
        console.error('Error fetching all data for CSV export:', e);
      }
    }

    const exportCols = columns.filter((c) => !c.excludeFromExport && c.key !== 'actions');
    const headers = exportCols.map((c) => `"${(c.header || c.label || c.key).replace(/"/g, '""')}"`);

    const rows = exportRowsData.map((row) =>
      exportCols
        .map((col) => {
          const raw = getCellExportText(row, col);
          return `"${String(raw).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    // UTF-8 BOM for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${effectiveExportFilename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel (.xls XML Format)
  const handleExportExcel = async () => {
    if (!canExport) {
      alert('Permission Denied: Only users with Administrator or Export permissions can download this dataset.');
      return;
    }
    setIsExportOpen(false);

    let exportRowsData = isServerPaged ? data : clientFilteredData;
    if (onExportAll) {
      try {
        const allData = await onExportAll();
        if (Array.isArray(allData) && allData.length > 0) {
          exportRowsData = allData;
        }
      } catch (e) {
        console.error('Error fetching all data for Excel export:', e);
      }
    }

    const exportCols = columns.filter((c) => !c.excludeFromExport && c.key !== 'actions');

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${effectiveExportFilename.slice(0, 31)}</x:Name>
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
          .number { mso-number-format:"\\#\\,\\#\\#0\\.00"; text-align: right; }
          .date { mso-number-format:"yyyy-mm-dd"; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${exportCols
                .map((c) => `<th>${c.header || c.label || c.key}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${exportRowsData
              .map(
                (row) => `
              <tr>
                ${exportCols
                  .map((col) => {
                    const raw = getCellExportText(row, col);
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${effectiveExportFilename}_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-colors ${
      isDark ? 'bg-[#0B1020]/95 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Top Filter & Toolbar Area */}
      <div className={`p-4 border-b space-y-3.5 ${
        isDark ? 'border-slate-800/80 bg-slate-950/20' : 'border-slate-100 bg-slate-50/50'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left: Search Box */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-2xl">
            {onSearchChange && (
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={effectiveSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-400'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
                {effectiveSearch && (
                  <button
                    onClick={() => onSearchChange('')}
                    className={`absolute right-3 top-2.5 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Action Tools: Date Filter, Export & Custom Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Filter: Render custom slot if provided, or built-in DateRangeFilter */}
            {dateFilterSlot ? (
              dateFilterSlot
            ) : dateFilterable ? (
              <DateRangeFilter
                fromDate={effectiveFromDate}
                toDate={effectiveToDate}
                align="right"
                onChange={handleDateFilterChange}
                onClear={handleDateFilterClear}
              />
            ) : null}

            {/* Export Dropdown (Excel & CSV) */}
            {exportable && (
              <div className="relative" ref={exportRef}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    isDark
                      ? 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                  title={canExport ? 'Export Data' : 'Admin export permission required'}
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {isExportOpen && (
                  <div className={`absolute right-0 mt-1.5 w-44 rounded-xl border shadow-xl z-30 py-1 overflow-hidden animate-in fade-in duration-150 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 flex items-center justify-between">
                      <span>Export Format</span>
                      {!canExport && <Lock className="w-3 h-3 text-amber-400" />}
                    </div>

                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center space-x-2 transition-colors ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Microsoft Excel (.xls)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center space-x-2 transition-colors ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span>Standard CSV (.csv)</span>
                    </button>

                    {onExportDateRange && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportOpen(false);
                          onExportDateRange();
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center space-x-2 border-t transition-colors ${
                          isDark ? 'border-slate-800 hover:bg-slate-800 text-blue-400' : 'border-slate-100 hover:bg-slate-50 text-blue-600'
                        }`}
                      >
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>Filter & Export by Date...</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Custom Header Actions Slot */}
            {actionsSlot}
          </div>

        </div>

        {/* Optional Custom Filters Slot (Status Chips, Corridor Tabs, etc.) */}
        {filtersSlot && (
          <div className="pt-1 border-t border-slate-800/40">
            {filtersSlot}
          </div>
        )}
      </div>

      {/* Main Table Scroll Container */}
      <div className="overflow-x-auto relative min-h-[280px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header */}
          <thead className={`border-b select-none ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          } font-bold text-[10px] tracking-wider uppercase`}>
            <tr>
              {columns.map((col) => {
                const width = columnWidths[col.key] || col.width;
                const isCurrentSort = sortBy === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    style={width ? { width: `${width}px`, minWidth: `${col.minWidth || 70}px` } : {}}
                    className={`py-3.5 px-3 relative group transition-colors ${alignClass} ${
                      col.sortable ? 'cursor-pointer hover:text-cyan-400' : ''
                    } ${isCurrentSort ? (isDark ? 'text-cyan-400 bg-cyan-950/20' : 'text-blue-600 bg-blue-50/50') : ''}`}
                    onClick={() => handleSortClick(col)}
                  >
                    <div className={`inline-flex items-center space-x-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{col.header || col.label || col.key}</span>
                      {col.sortable && (
                        <span className="shrink-0">
                          {isCurrentSort ? (
                            sortOrder === 'ASC' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-75" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Draggable Column Resizer Handle */}
                    {col.resizable !== false && (
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, col)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group-hover:bg-cyan-500/40 hover:!bg-cyan-400 transition-colors z-10"
                        title="Drag to resize column width"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
            {effectiveLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <LoadingState
                    title="Fetching records from server..."
                    description="Syncing real-time operational data across fleet network"
                    minHeight="min-h-[180px]"
                  />
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      <FileText className="w-7 h-7" />
                    </div>
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {effectiveEmptyTitle}
                    </h3>
                    <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {emptySubtitle}
                    </p>
                    {emptyActionSlot && (
                      <div className="pt-2">
                        {emptyActionSlot}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors group ${onRowClick ? 'cursor-pointer' : ''} ${
                    isDark
                      ? 'hover:bg-slate-800/40'
                      : 'hover:bg-blue-50/50'
                  }`}
                >
                  {columns.map((col) => {
                    const width = columnWidths[col.key] || col.width;
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    return (
                      <td
                        key={col.key}
                        style={width ? { width: `${width}px`, maxWidth: `${width}px` } : {}}
                        className={`py-3 px-3.5 text-xs truncate ${alignClass}`}
                      >
                        {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        isDark ? 'border-slate-800 text-slate-400 bg-slate-950/20' : 'border-slate-200 text-slate-500 bg-slate-50/40'
      }`}>
        {/* Left: Summary text */}
        <div>
          Showing{' '}
          <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {startItem}-{endItem}
          </span>{' '}
          of{' '}
          <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {effectiveTotalCount.toLocaleString()}
          </span>{' '}
          records
        </div>

        {/* Right: Rows Per Page Selector + Divider + Pagination Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Rows Per Page Selector */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Rows:
            </span>
            <select
              value={effectivePageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all focus:outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:border-slate-700'
                  : 'bg-white border-slate-200 text-blue-600 hover:border-slate-300 shadow-xs'
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Divider Line */}
          <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

          {/* Pagination Controls */}
          <div className="flex items-center space-x-1.5">
            {/* First Page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={effectivePage <= 1 || effectiveLoading}
            className={`p-1.5 rounded-lg border transition-all ${
              effectivePage <= 1 || effectiveLoading
                ? 'border-transparent text-slate-600 cursor-not-allowed'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => handlePageChange(effectivePage - 1)}
            disabled={effectivePage <= 1 || effectiveLoading}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
              effectivePage <= 1 || effectiveLoading
                ? 'border-transparent text-slate-600 cursor-not-allowed'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            Prev
          </button>

          {/* Page Number Chips */}
          <div className="flex items-center space-x-1">
            {pageNumbers.map((p, pIdx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${pIdx}`} className="px-1 text-slate-500 font-mono">
                    ...
                  </span>
                );
              }
              const isActive = p === effectivePage;
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  disabled={effectiveLoading}
                  className={`min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : isDark
                      ? 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            onClick={() => handlePageChange(effectivePage + 1)}
            disabled={effectivePage >= totalPages || effectiveLoading}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
              effectivePage >= totalPages || effectiveLoading
                ? 'border-transparent text-slate-600 cursor-not-allowed'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            Next
          </button>

          {/* Last Page */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={effectivePage >= totalPages || effectiveLoading}
            className={`p-1.5 rounded-lg border transition-all ${
              effectivePage >= totalPages || effectiveLoading
                ? 'border-transparent text-slate-600 cursor-not-allowed'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

  </div>
);
}
