// frontend/app/super-admin/activity/page.js
'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useTheme } from '../../../components/ThemeProvider';
import {
  Activity,
  RefreshCw,
  Building2,
  HelpCircle,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function SuperAdminActivityPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/activity');
      if (res.data?.success) {
        setActivities(res.data.data.activities || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Real-Time Audit
            </span>
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 flex items-center gap-2.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span>Live Platform Activity Stream</span>
            <Activity className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 max-w-2xl ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Real-time feed of newly onboarded transporters, escalated support tickets, and key multi-tenant operational events.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchActivity}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer self-start sm:self-auto shadow-xs ${
            isDark
              ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Activity Timeline */}
      <div
        className={`rounded-3xl border p-6 sm:p-7 shadow-sm transition-colors ${
          isDark ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200'
        }`}
      >
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-500 dark:text-cyan-400" />
            <span>Loading activity stream...</span>
          </div>
        ) : activities.length === 0 ? (
          <div
            className={`py-12 text-center text-xs ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            No platform activity recorded yet.
          </div>
        ) : (
          <div
            className={`relative pl-6 border-l space-y-6 transition-colors ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            {activities.map((act) => {
              const isReg = act.type === 'REGISTRATION';
              const Icon = isReg ? Building2 : HelpCircle;

              return (
                <div key={act.id} className="relative group">
                  <div
                    className={`absolute -left-[31px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs shadow-xs ${
                      isDark ? 'border-[#0B1020]' : 'border-white'
                    } ${
                      isReg
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-purple-500 text-white font-bold'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div
                    className={`p-4 rounded-2xl border transition-all space-y-1 ${
                      isDark
                        ? 'bg-[#070C18] border-slate-800/80 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-bold text-sm ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {act.title}
                      </span>
                      <span
                        className={`text-[10px] flex items-center gap-1 ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {new Date(act.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p
                      className={`text-xs ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {act.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
