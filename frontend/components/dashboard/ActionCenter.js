// frontend/components/dashboard/ActionCenter.js
import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Wrench,
  FileCheck,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export default function ActionCenter({ items = [] }) {
  const getIcon = (type) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'info':
        return <Wrench className="w-5 h-5 text-blue-600" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-slate-600" />;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>ACTION CENTER</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          </h2>
          <p className="text-xs text-slate-500">Immediate operational matters requiring management attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.actionUrl}
            className="group p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-start justify-between"
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg border ${getBadgeStyle(item.type)} mt-0.5`}>
                {getIcon(item.type)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {item.description}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
