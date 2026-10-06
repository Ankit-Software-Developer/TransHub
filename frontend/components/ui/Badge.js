// frontend/components/ui/Badge.js
import React from 'react';

const statusMap = {
  BOOKED: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/60', label: 'Booked' },
  MATERIAL_RECEIVED: { bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', label: 'In Godown' },
  READY_FOR_DISPATCH: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800/60', label: 'Ready' },
  LOADED: { bg: 'bg-violet-50 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800/60', label: 'Loaded' },
  DISPATCHED: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/60', label: 'Dispatched' },
  IN_TRANSIT: { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700', label: 'In Transit' },
  REACHED_DESTINATION: { bg: 'bg-cyan-50 dark:bg-cyan-950/50', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800/60', label: 'Reached Dest' },
  OUT_FOR_DELIVERY: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60', label: 'Out for Delivery' },
  DELIVERED: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60', label: 'Delivered' },
  POD_PENDING: { bg: 'bg-yellow-50 dark:bg-yellow-950/50', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-800/60', label: 'POD Pending' },
  POD_UPLOADED: { bg: 'bg-teal-50 dark:bg-teal-950/50', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800/60', label: 'POD Uploaded' },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', label: 'Completed' },
  DELAYED: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800/60', label: 'Delayed' },
  CANCELLED: { bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800', label: 'Cancelled' },
  PAID: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60', label: 'PAID' },
  TO_PAY: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/60', label: 'TO PAY' },
  TBB: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60', label: 'TBB' },
  AVAILABLE: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60', label: 'Available' },
  ON_TRIP: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/60', label: 'On Trip' },
  RUNNING: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/60', label: 'Running' },
};

export default function Badge({ status, label, size = 'sm' }) {
  const config = statusMap[status] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: status || 'Unknown',
  };

  const displayText = label || config.label;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${config.bg} ${config.text} ${config.border}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {displayText}
    </span>
  );
}
