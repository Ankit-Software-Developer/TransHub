// frontend/components/ui/StatCard.js
import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
  onClick,
  active = false,
}) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''
      } ${active ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200/80 shadow-card'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${colorStyles[color] || colorStyles.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {subtext && (
          <span className="text-xs font-medium text-slate-500">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
