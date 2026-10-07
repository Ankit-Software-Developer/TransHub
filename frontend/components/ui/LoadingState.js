// frontend/components/ui/LoadingState.js
'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

/**
 * Reusable Section / Card / Container Loading State.
 * Fully styled for both Light and Dark themes.
 *
 * @param {string} title - Main loading title
 * @param {string} description - Secondary descriptive subtitle
 * @param {string} minHeight - Height of container
 * @param {boolean} compact - Compact inline spinner mode
 * @param {string} className - Additional CSS classes
 */
export default function LoadingState({
  title = 'Loading data...',
  description = 'Fetching real-time records from transport hub',
  minHeight = 'min-h-[260px]',
  compact = false,
  className = '',
}) {
  const [mounted, setMounted] = useState(false);
  const themeContext = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted
    ? themeContext?.theme === 'dark'
    : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  if (compact) {
    return (
      <div
        className={`flex items-center justify-center space-x-3 p-4 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        } ${className}`}
      >
        <div className="relative flex items-center justify-center w-5 h-5">
          <div
            className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${
              isDark ? 'border-cyan-400' : 'border-blue-600'
            }`}
          />
        </div>
        <span
          className={`text-xs font-semibold ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${minHeight} flex flex-col items-center justify-center p-6 text-center rounded-2xl border transition-colors ${
        isDark
          ? 'bg-[#0B1020]/60 border-slate-800/80 backdrop-blur-sm text-slate-200'
          : 'bg-white/80 border-slate-200/90 shadow-sm backdrop-blur-sm text-slate-800'
      } ${className}`}
    >
      {/* Animated Mini Pulse Badge */}
      <div className="relative flex items-center justify-center w-14 h-14 mb-3.5">
        <div
          className={`absolute inset-0 rounded-full border animate-ping opacity-35 ${
            isDark ? 'border-cyan-400/40' : 'border-blue-500/35'
          }`}
        />
        <div
          className={`absolute inset-1 rounded-full border-2 border-transparent animate-spin ${
            isDark
              ? 'border-t-cyan-400 border-r-blue-500'
              : 'border-t-blue-600 border-r-cyan-500'
          }`}
        />
        <div
          className={`w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md ${
            isDark ? 'shadow-cyan-500/25' : 'shadow-blue-500/25'
          }`}
        >
          <Truck className="w-4 h-4 animate-pulse" />
        </div>
      </div>

      <h4
        className={`text-sm font-bold mb-1 tracking-tight ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h4>
      {description && (
        <p
          className={`text-xs max-w-xs leading-relaxed mb-3.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {description}
        </p>
      )}

      {/* Shimmer line */}
      <div
        className={`w-28 h-1 rounded-full overflow-hidden relative ${
          isDark ? 'bg-slate-800' : 'bg-slate-200'
        }`}
      >
        <div
          className={`absolute inset-y-0 w-16 rounded-full animate-[shimmer_1.2s_infinite] ${
            isDark
              ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent'
              : 'bg-gradient-to-r from-transparent via-blue-600 to-transparent'
          }`}
        />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}
