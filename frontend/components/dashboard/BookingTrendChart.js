// frontend/components/dashboard/BookingTrendChart.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Activity, TrendingUp, BarChart3, ArrowRight, Calendar } from 'lucide-react';

export default function BookingTrendChart({
  trends = [],
  totalBookings = 0,
  isDark = true,
  className = ''
}) {
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format chart data
  const chartData = trends.length > 0 ? trends.map((item, idx) => ({
    name: item.day || `Day ${idx + 1}`,
    bookings: typeof item.value === 'number' ? item.value : (parseInt(item.value, 10) || 0),
    isPeak: item.highlight || false
  })) : [
    { name: 'Mon', bookings: 0 },
    { name: 'Tue', bookings: 0 },
    { name: 'Wed', bookings: 0 },
    { name: 'Thu', bookings: 0 },
    { name: 'Fri', bookings: 0 },
    { name: 'Sat', bookings: 0 },
    { name: 'Sun', bookings: 0 }
  ];

  const peakItem = [...chartData].sort((a, b) => b.bookings - a.bookings)[0];
  const maxVal = Math.max(...chartData.map(d => d.bookings), 5);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-2.5 rounded-xl border shadow-xl text-xs backdrop-blur-md ${
          isDark ? 'bg-slate-950/95 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold">Bookings:</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              {payload[0].value} {payload[0].value === 1 ? 'docket' : 'dockets'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between transition-all ${className} ${
      isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      {/* Header with Title, Quick Stats, and Line/Bar Toggle */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm sm:text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Booking Trend & Docket Velocity
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 dark:text-cyan-400 border border-blue-500/20 font-bold">
                  Last 7 Days
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Daily LR / Bilty creation patterns and consignment throughput
              </p>
            </div>
          </div>

          {/* Quick Metrics & Line vs Bar Switcher */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            {/* Stat Pill: Total Bookings */}
            <div className={`px-3 py-1.5 rounded-xl border hidden md:flex items-center gap-2 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
              <span className={`font-mono font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalBookings}</span>
            </div>

            {/* Stat Pill: Peak */}
            <div className={`px-3 py-1.5 rounded-xl border hidden md:flex items-center gap-2 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Peak</span>
              <span className="font-mono font-bold text-xs text-emerald-500 dark:text-emerald-400">
                {peakItem?.bookings || 0} ({peakItem?.name || 'N/A'})
              </span>
            </div>

            {/* Line vs Bar Switcher */}
            <div className={`flex items-center p-0.5 rounded-xl border text-[11px] font-bold ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Show Line Area Curve"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Line</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Show Bar Chart"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Bar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="flex-1 min-h-[220px] w-full pt-1">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? '#00F0FF' : '#2563EB'} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={isDark ? '#00F0FF' : '#2563EB'} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? '#1E293B' : '#E2E8F0'}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, Math.ceil(maxVal * 1.2)]}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    stroke={isDark ? '#00F0FF' : '#2563EB'}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#bookingAreaGrad)"
                    activeDot={{
                      r: 5,
                      fill: isDark ? '#00F0FF' : '#2563EB',
                      stroke: isDark ? '#0F172A' : '#FFFFFF',
                      strokeWidth: 2
                    }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? '#00F0FF' : '#3B82F6'} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={isDark ? '#0284C7' : '#1D4ED8'} stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="bookingBarEmptyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? '#1E293B' : '#E2E8F0'} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={isDark ? '#0F172A' : '#CBD5E1'} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? '#1E293B' : '#E2E8F0'}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, Math.ceil(maxVal * 1.2)]}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="bookings"
                    radius={[6, 6, 0, 0]}
                    fill="url(#bookingBarGrad)"
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Loading chart...
            </div>
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t mt-2 border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold">
        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
          {totalBookings === 0 ? 'No dockets created this week' : `${totalBookings} total registered`}
        </span>
        <Link
          href="/bookings"
          className="flex items-center gap-1 text-blue-600 dark:text-cyan-400 hover:underline"
        >
          <span>Issue Docket</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
