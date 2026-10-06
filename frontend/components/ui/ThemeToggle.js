// frontend/components/ui/ThemeToggle.js
'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className={`w-10 h-10 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-pulse ${className}`} />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      className={`relative p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center group ${
        isDark
          ? 'bg-slate-900/90 text-amber-400 border border-slate-700/80 hover:border-amber-400/50 hover:bg-slate-800 shadow-md shadow-black/40'
          : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:bg-slate-50 shadow-sm'
      } ${className}`}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={`w-5 h-5 absolute inset-0 transition-all duration-500 transform ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50 pointer-events-none'
          }`}
        />
        <Moon
          className={`w-5 h-5 absolute inset-0 transition-all duration-500 transform ${
            !isDark
              ? 'opacity-100 rotate-0 scale-100 text-blue-600'
              : 'opacity-0 rotate-90 scale-50 pointer-events-none'
          }`}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
