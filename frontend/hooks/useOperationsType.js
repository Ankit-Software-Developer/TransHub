// frontend/hooks/useOperationsType.js
'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export const FTL_SUB_TYPES = {
  FLEET_SUPPLIER: {
    key: 'FLEET_SUPPLIER',
    label: 'Fleet Supplier / Vendor Provider',
    shortLabel: 'Fleet Supplier',
    badgeText: 'Fleet Contractor / Vendor',
    hindiAlias: 'गाड़ी सप्लायर / ट्रांसपोर्ट वेंडर',
    targetAudience: 'Other Transporters, Fleet Aggregators and Contracted Logistics Companies',
    tagline: 'Vehicle Placement & Vendor Provider to Other Transporters',
    description: 'Providing owned or attached vehicles to other transport companies and contracted corporate clients on hire or trip basis.',
    icon: '🤝',
    workflows: [
      'Placing vehicles on hire/trip contract with other transporters',
      'Driver trip advances (Diesel + Fastag + Driver cash)',
      'Vendor freight billing to the hiring transport company',
      'POD submission to principal transporter for payment clearance',
    ],
  },
  DIRECT_CARRIER: {
    key: 'DIRECT_CARRIER',
    label: 'Direct Shipper Carrier',
    shortLabel: 'Direct Carrier',
    badgeText: 'Direct Corporate FTL',
    hindiAlias: 'डायरेक्ट पार्टी / फैक्ट्री लोडिंग',
    targetAudience: 'Direct Manufacturers, Factories, Traders & Shippers',
    tagline: 'Point-to-Point Factory & Corporate Direct Dispatch',
    description: 'Booking freight directly from manufacturers, factories, and consignors with direct consignor-to-consignee bilties.',
    icon: '🏭',
    workflows: [
      'Direct Consignor-to-Consignee Bilties (LR)',
      'Customer rate contracts (per ton or per trip)',
      'E-Way bill generation & delivery direct to factory/warehouse',
    ],
  },
  COMPLETE_FTL: {
    key: 'COMPLETE_FTL',
    label: 'Full-Service Enterprise FTL Carrier',
    shortLabel: 'Full-Service FTL',
    badgeText: 'Complete Carrier Suite',
    hindiAlias: 'कम्प्लीट एफटीएल कैरियर (बुकिंग डॉकेट + मार्केट गाड़ी)',
    targetAudience: 'Direct Corporate Shippers, Factories & Market Hired Trucks',
    tagline: 'Customer Full-Truck Dockets with Own & Market Hired Fleet',
    description: 'Booking full truckload consignments with formal customer dockets (packages & e-way bills) and dispatching using both owned fleet and hired market trucks.',
    icon: '🏢',
    workflows: [
      'Customer Full Truckload Dockets (LR) with package details',
      'Dual Fleet: Dispatch via Own Trucks + Hired Market Vehicles',
      'Lorry Hire Memo (LHR / Trip Challan) & diesel/cash advances',
      'Dual Billing: Customer Invoicing + Vendor Lorry Hire Settlement',
    ],
  },
};

export const OPERATIONS_TYPES = {
  FTL: {
    key: 'FTL',
    label: 'Full Truckload (FTL)',
    shortLabel: 'FTL Only',
    tagline: 'Dedicated Point-to-Point Fleet Operations',
    description: 'Direct point-to-point dedicated full vehicle bookings without hub consolidation or parcel sorting.',
    icon: '🚛',
    allowsLoadPlanning: false,
    allowsUnloadPlanning: false,
  },
  PTL: {
    key: 'PTL',
    label: 'Part Truckload (PTL / Sundry)',
    shortLabel: 'PTL Only',
    tagline: 'Multi-Consignment Hub Manifest Operations',
    description: 'Consolidated shipments, loading sheet manifests, branch receiving, and hub deconsolidation.',
    icon: '📦',
    allowsLoadPlanning: true,
    allowsUnloadPlanning: true,
  },
  BOTH: {
    key: 'BOTH',
    label: 'Hybrid (FTL & PTL)',
    shortLabel: 'Both (FTL + PTL)',
    tagline: 'Full-Spectrum Transport Logistics',
    description: 'Comprehensive transport operations supporting both dedicated direct truckloads and consolidated parcel manifests.',
    icon: '🔄',
    allowsLoadPlanning: true,
    allowsUnloadPlanning: true,
  },
};

export function useOperationsType() {
  const user = useStore((state) => state.user);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('transporter_mode_updated', handleUpdate);
      window.addEventListener('storage', handleUpdate);
      return () => {
        window.removeEventListener('transporter_mode_updated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }
  }, []);

  // Check support impersonation mode
  let impersonatedType = null;
  let impersonatedSubType = null;
  if (typeof window !== 'undefined' && localStorage.getItem('superadmin_impersonate_tenant_id')) {
    impersonatedType = localStorage.getItem('superadmin_impersonate_transporter_type');
    impersonatedSubType = localStorage.getItem('superadmin_impersonate_transporter_subtype');
  }

  const rawType = (
    impersonatedType ||
    user?.transporterType ||
    user?.transporter_type ||
    user?.organization?.settings?.transporterType ||
    user?.organization?.settings?.transporter_type ||
    (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('transporter_user') || '{}')?.transporterType) ||
    'FTL'
  ).toUpperCase().trim();
  const transporterType = OPERATIONS_TYPES[rawType] ? rawType : 'FTL';

  // Resolve plan tier to ensure safe fallback (Basic plans must default to FLEET_SUPPLIER, not COMPLETE_FTL)
  const sub = user?.subscription || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('transporter_subscription') || 'null') : null);
  const rawPlan = (
    sub?.planCode ||
    sub?.plan_code ||
    user?.planCode ||
    user?.organization?.settings?.registered_plan ||
    'BASIC'
  ).toUpperCase();
  const isBasicPlan = rawPlan.includes('BASIC') || (!rawPlan.includes('PRO') && !rawPlan.includes('ENTERPRISE'));
  const defaultSub = isBasicPlan ? 'FLEET_SUPPLIER' : 'COMPLETE_FTL';

  const rawSubType = (
    impersonatedSubType ||
    user?.transporterSubType ||
    user?.transporter_sub_type ||
    user?.organization?.settings?.transporterSubType ||
    user?.organization?.settings?.transporter_subtype ||
    (typeof window !== 'undefined' && (
      JSON.parse(localStorage.getItem('transporter_user') || '{}')?.transporterSubType ||
      JSON.parse(localStorage.getItem('transporter_user') || '{}')?.transporter_sub_type ||
      JSON.parse(localStorage.getItem('transporter_user') || '{}')?.organization?.settings?.transporterSubType ||
      JSON.parse(localStorage.getItem('transporter_user') || '{}')?.organization?.settings?.transporter_subtype
    )) ||
    defaultSub
  ).toUpperCase().trim();
  const transporterSubType = FTL_SUB_TYPES[rawSubType] ? rawSubType : defaultSub;

  const isOnlyFTL = transporterType === 'FTL';
  const isOnlyPTL = transporterType === 'PTL';
  const isBoth = transporterType === 'BOTH';

  const isFleetSupplier = isOnlyFTL && transporterSubType === 'FLEET_SUPPLIER';
  const isDirectCarrier = isOnlyFTL && transporterSubType === 'DIRECT_CARRIER';
  const isCompleteFTL = isOnlyFTL && (transporterSubType === 'COMPLETE_FTL' || (!isFleetSupplier && !isDirectCarrier));

  const hasFTL = isOnlyFTL || isBoth;
  const hasPTL = isOnlyPTL || isBoth;

  const currentConfig = OPERATIONS_TYPES[transporterType];
  const currentSubConfig = isOnlyFTL ? FTL_SUB_TYPES[transporterSubType] : null;

  // Unified mode badge labels across all screens (Sidebar, Dashboard, Settings)
  const modeBadgeText = isOnlyFTL
    ? (isFleetSupplier ? 'FTL • VENDOR' : isDirectCarrier ? 'FTL • DIRECT' : 'FTL • FULL-SERVICE')
    : isOnlyPTL
    ? 'PTL • SUNDRY'
    : 'FTL + PTL';

  const modeLongLabel = isOnlyFTL
    ? (isFleetSupplier ? 'FTL • Vendor Fleet' : isDirectCarrier ? 'FTL • Direct Carrier' : 'FTL • Full-Service')
    : isOnlyPTL
    ? 'PTL • Sundry Manifest'
    : 'Both (FTL + PTL)';

  const modeBadgeColor = isOnlyFTL
    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/90 dark:border-indigo-800/60'
    : isOnlyPTL
    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/60'
    : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200/90 dark:border-cyan-800/60';

  // Single HQ Branch vs Multi-Branch Hubs:
  // FTL Fleet Supplier & Direct Carrier operate exclusively out of single Head Office HQ (hide Branches & Hubs).
  // FTL Full-Service Enterprise, PTL Sundry, and Hybrid BOTH support multi-branch networks and transshipment hubs.
  const allowsMultiBranchHubs = !isOnlyFTL || isCompleteFTL;

  // Docket / Bilty Booking system:
  // In FTL Fleet Supplier & Direct Carrier, operators only assign vehicles directly to other transport companies / customers via Trips.
  // Docket / Bilty booking is not needed in these two modes.
  // Full-Service Enterprise FTL, PTL Sundry, and Hybrid use full Bilties / Dockets.
  const allowsBookings = !isOnlyFTL || isCompleteFTL;

  return {
    transporterType,
    transporterSubType,
    config: currentConfig,
    subConfig: currentSubConfig,
    isOnlyFTL,
    isOnlyPTL,
    isBoth,
    isFleetSupplier,
    isDirectCarrier,
    isCompleteFTL,
    hasFTL,
    hasPTL,
    modeBadgeText,
    modeLongLabel,
    modeBadgeColor,
    allowsMultiBranchHubs,
    allowsBookings,
    allowsLoadPlanning: isCompleteFTL || currentConfig.allowsLoadPlanning,
    allowsUnloadPlanning: isCompleteFTL || currentConfig.allowsUnloadPlanning,
  };
}

/**
 * Universal helper to check if a branch is the Centralized Head Office (HQ).
 * Head Office is strictly HQ, NEVER a transshipment HUB.
 */
export const isHeadOfficeBranch = (b) => {
  if (!b) return false;
  if (b.is_head_office === true || b.is_head_office === 1 || b.is_head_office === 'true') return true;
  const code = (b.branch_code || '').trim().toUpperCase();
  if (code === 'BHQ' || code === 'HQ' || code.endsWith('HQ')) return true;
  const name = (b.branch_name || b.name || '').trim().toLowerCase();
  if (name.includes('head office') || name.includes('corporate hq') || name.includes('central hq')) return true;
  return false;
};
