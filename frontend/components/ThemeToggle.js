// frontend/components/ThemeToggle.js
'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ className = '', variant = 'pill' }) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    if (variant === 'button') {
      return (
        <div className={`w-9 h-9 rounded-xl border border-slate-700/50 bg-slate-800/40 animate-pulse ${className}`} />
      );
    }
    return (
      <div className={`w-[78px] h-7 rounded-full border border-slate-700/50 bg-slate-800/40 animate-pulse ${className}`} />
    );
  }

  const isDark = theme === 'dark';

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        className={`relative inline-flex items-center justify-center p-2 rounded-xl border transition-all duration-300 ${
          isDark
            ? 'bg-slate-800/70 border-slate-700/70 text-amber-300 hover:bg-slate-700/80 hover:border-cyan-500/50 shadow-lg shadow-cyan-950/20'
            : 'bg-white/90 border-slate-200 text-amber-600 hover:bg-slate-100 hover:border-blue-400 shadow-md shadow-slate-200/50'
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Mode"
      className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-300 ${
        isDark
          ? 'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300 shadow-inner shadow-slate-950'
          : 'bg-white/95 border-slate-200/90 text-slate-700 hover:border-blue-500/60 hover:text-blue-600 shadow-sm shadow-slate-200/80'
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-blue-600 group-hover:-rotate-12 transition-transform duration-300" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
