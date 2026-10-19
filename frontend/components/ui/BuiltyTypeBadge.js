// frontend/components/ui/BuiltyTypeBadge.js
'use client';

import React from 'react';

/**
 * Universal Builty / Docket Type Badge (FTL vs PTL)
 * Renders consistent, high-contrast, theme-adaptive badges across all tables.
 *
 * @param {string} loadType - Optional explicit load type string ('FTL' | 'PTL')
 * @param {object} docket - Optional docket/consignment object to extract load_type from
 * @param {string} className - Optional additional CSS classes
 */
export default function BuiltyTypeBadge({ loadType, docket, className = '' }) {
  const rawType = loadType
    || docket?.load_type
    || docket?.loadType
    || docket?.consignment?.load_type
    || docket?.consignment?.loadType
    || (Array.isArray(docket?.items) && docket.items[0]?.consignment?.load_type)
    || 'PTL';

  const isFtl = String(rawType).trim().toUpperCase() === 'FTL';

  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border shrink-0 inline-flex items-center gap-1 select-none whitespace-nowrap leading-none ${
        isFtl
          ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/30 shadow-2xs'
          : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 shadow-2xs'
      } ${className}`}
      title={isFtl ? 'Full Truck Load (FTL) - Dedicated Direct Vehicle' : 'Part Truck Load (PTL) - Consolidated Sundry Builty'}
    >
      <span>{isFtl ? '🚛 FTL' : '📦 PTL'}</span>
    </span>
  );
}
