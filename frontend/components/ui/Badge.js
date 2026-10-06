// frontend/components/ui/Badge.js
import React from 'react';

const statusMap = {
  BOOKED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Booked' },
  MATERIAL_RECEIVED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'In Godown' },
  READY_FOR_DISPATCH: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Ready' },
  LOADED: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'Loaded' },
  DISPATCHED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Dispatched' },
  IN_TRANSIT: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: 'In Transit' },
  REACHED_DESTINATION: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', label: 'Reached Dest' },
  OUT_FOR_DELIVERY: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Out for Delivery' },
  DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Delivered' },
  POD_PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300', label: 'POD Pending' },
  POD_UPLOADED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'POD Uploaded' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Completed' },
  DELAYED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Delayed' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Cancelled' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'PAID' },
  TO_PAY: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'TO PAY' },
  TBB: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'TBB' },
  AVAILABLE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Available' },
  ON_TRIP: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'On Trip' },
  RUNNING: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Running' },
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
