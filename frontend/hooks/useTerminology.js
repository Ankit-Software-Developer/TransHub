// frontend/hooks/useTerminology.js
'use client';

import { useStore } from '../store/useStore';

const TERMINOLOGY_CONFIGS = {
  Docket: {
    term: 'Docket',
    termShort: 'Docket',
    termLower: 'docket',
    plural: 'Dockets',
    newDocLabel: '+ New Docket',
    docNumberLabel: 'Docket Number',
    docDateLabel: 'Docket Date',
    docBookLabel: 'Docket Register',
  },
  Bilty: {
    term: 'Bilty',
    termShort: 'Bilty',
    termLower: 'bilty',
    plural: 'Biltys',
    newDocLabel: '+ New Bilty',
    docNumberLabel: 'Bilty Number',
    docDateLabel: 'Bilty Date',
    docBookLabel: 'Bilty Register',
  },
  LR: {
    term: 'LR',
    termShort: 'LR',
    termLower: 'lr',
    plural: 'LRs',
    newDocLabel: '+ New LR',
    docNumberLabel: 'LR Number',
    docDateLabel: 'LR Date',
    docBookLabel: 'LR Register',
  },
  GR: {
    term: 'GR',
    termShort: 'GR',
    termLower: 'gr',
    plural: 'GRs',
    newDocLabel: '+ New GR',
    docNumberLabel: 'GR Number',
    docDateLabel: 'GR Date',
    docBookLabel: 'GR Register',
  },
  'Consignment Note': {
    term: 'Consignment Note',
    termShort: 'CN',
    termLower: 'consignment note',
    plural: 'Consignment Notes',
    newDocLabel: '+ New Consignment Note',
    docNumberLabel: 'Consignment Note Number',
    docDateLabel: 'Consignment Note Date',
    docBookLabel: 'Consignment Register',
  },
};

export function useTerminology() {
  const terminology = useStore((state) => state.terminology) || 'Docket';

  // Find matching config or fallback to Docket
  const cleanTerm = (terminology || '').trim();
  const matchedKey = Object.keys(TERMINOLOGY_CONFIGS).find(
    (k) => k.toLowerCase() === cleanTerm.toLowerCase() || cleanTerm.toLowerCase().startsWith(k.toLowerCase())
  );

  const config = TERMINOLOGY_CONFIGS[matchedKey] || TERMINOLOGY_CONFIGS.Docket;

  return {
    ...config,
    raw: terminology,
  };
}
