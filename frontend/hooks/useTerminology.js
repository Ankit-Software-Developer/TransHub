// frontend/hooks/useTerminology.js
'use client';

import { useStore } from '../store/useStore';

export function useTerminology() {
  const terminology = useStore((state) => state.terminology) || 'Docket (LR / Bilty)';

  return {
    term: 'Docket (LR / Bilty)',
    termShort: 'Docket',
    termLower: 'docket',
    plural: 'Dockets (LR / Bilty)',
    newDocLabel: '+ New Docket (LR / Bilty)',
    docNumberLabel: 'Docket Number (LR / Bilty)',
    docDateLabel: 'Docket Date',
    docBookLabel: 'Docket Register (LR / Bilty)',
  };
}
