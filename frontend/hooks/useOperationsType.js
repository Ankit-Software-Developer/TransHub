// frontend/hooks/useOperationsType.js
'use client';

import { useStore } from '../store/useStore';

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
  const rawType = (user?.transporterType || user?.transporter_type || 'BOTH').toUpperCase().trim();
  const transporterType = OPERATIONS_TYPES[rawType] ? rawType : 'BOTH';

  const isOnlyFTL = transporterType === 'FTL';
  const isOnlyPTL = transporterType === 'PTL';
  const isBoth = transporterType === 'BOTH';

  const hasFTL = isOnlyFTL || isBoth;
  const hasPTL = isOnlyPTL || isBoth;

  const currentConfig = OPERATIONS_TYPES[transporterType];

  return {
    transporterType,
    config: currentConfig,
    isOnlyFTL,
    isOnlyPTL,
    isBoth,
    hasFTL,
    hasPTL,
    allowsLoadPlanning: currentConfig.allowsLoadPlanning,
    allowsUnloadPlanning: currentConfig.allowsUnloadPlanning,
  };
}
