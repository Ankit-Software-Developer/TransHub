// frontend/components/ui/LoadingScreen.js
'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

/**
 * Premium, dual-theme Loading Screen for TransHub.
 * Fully optimized for both Light Mode and Dark Mode.
 *
 * @param {string} message - Primary headline text
 * @param {string} subMessage - Secondary informative caption
 * @param {boolean} fullScreen - If true, renders a fixed full-page overlay
 * @param {string} minHeight - Custom min-height when not fullscreen (e.g. 'min-h-[50vh]')
 * @param {string} className - Additional CSS classes
 */
export default function LoadingScreen({
  message = 'Loading TransHub...',
  subMessage = 'Connecting to secure transport workspace',
  fullScreen = true,
  minHeight = 'min-h-[60vh]',
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

  const containerClasses = fullScreen
    ? isDark
      ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060913]/95 backdrop-blur-md text-slate-200'
      : 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-md text-slate-800'
    : isDark
      ? `w-full ${minHeight} flex flex-col items-center justify-center p-8 bg-[#070B16]/80 rounded-2xl border border-slate-800/80 backdrop-blur-sm text-slate-200 shadow-xl ${className}`
      : `w-full ${minHeight} flex flex-col items-center justify-center p-8 bg-white/90 rounded-2xl border border-slate-200/80 backdrop-blur-sm text-slate-800 shadow-xl ${className}`;

  return (
    <div className={containerClasses}>
      {/* Ambient Radial Gradient Glow */}
      <div
        className={`absolute w-80 h-80 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse ${
          isDark
            ? 'bg-gradient-to-tr from-cyan-500/15 via-blue-600/10 to-indigo-600/10'
            : 'bg-gradient-to-tr from-blue-200/50 via-cyan-100/40 to-indigo-100/30'
        }`}
      />

      {/* Centerpiece Multi-Ring Orbital Loader */}
      <div className="relative flex items-center justify-center w-24 h-24 mb-6">
        {/* Pulsing Outer Ripple Ring */}
        <div
          className={`absolute inset-0 rounded-full border animate-ping opacity-40 duration-1000 ${
            isDark ? 'border-cyan-500/25' : 'border-blue-500/30'
          }`}
        />

        {/* Outer Orbital Rotating Ring */}
        <div
          className={`absolute inset-1 rounded-full border-2 border-transparent animate-spin duration-700 shadow-sm ${
            isDark
              ? 'border-t-cyan-400 border-r-blue-500 shadow-cyan-500/30'
              : 'border-t-blue-600 border-r-cyan-500 shadow-blue-500/20'
          }`}
        />

        {/* Counter-Rotating Inner Accent Ring */}
        <div
          className={`absolute inset-3 rounded-full border border-dashed animate-spin duration-1000 ${
            isDark ? 'border-indigo-400/50' : 'border-indigo-400/40'
          }`}
          style={{ animationDirection: 'reverse' }}
        />

        {/* Glowing Core Badge with TransHub Truck Icon */}
        <div
          className={`relative flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg ${
            isDark
              ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-cyan-500/35'
              : 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-blue-500/30'
          }`}
        >
          <Truck className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      {/* Typography & Status Messaging */}
      <div className="text-center max-w-sm px-4">
        <h3
          className={`text-base font-bold tracking-tight mb-1.5 flex items-center justify-center gap-1.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          <span>{message}</span>
        </h3>
        {subMessage && (
          <p
            className={`text-xs font-medium leading-relaxed mb-4 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {subMessage}
          </p>
        )}

        {/* Sleek Shimmering Indeterminate Progress Bar */}
        <div
          className={`w-44 h-1.5 mx-auto rounded-full overflow-hidden relative ${
            isDark ? 'bg-slate-800/90' : 'bg-slate-200/90'
          }`}
        >
          <div
            className={`absolute inset-y-0 w-24 rounded-full animate-[shimmer_1.4s_infinite] ${
              isDark
                ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent'
                : 'bg-gradient-to-r from-transparent via-blue-600 to-transparent'
            }`}
          />
        </div>
      </div>

      {/* Subtle Keyframe Style for shimmer */}
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
