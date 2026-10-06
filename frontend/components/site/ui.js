// frontend/components/site/ui.js
//
// Shared look of the public pages (landing, login, register), taken from the
// approved reference design: colours, buttons, inputs, the TRANSHUB logo, the
// "── LABEL" eyebrow and the theme button. Keep these here so the three pages
// cannot drift apart.
'use client';

import React from 'react';
import Link from 'next/link';
import { Moon, Sun, Truck } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

// ── Design tokens (sampled from the reference design) ───────────
export const CONTAINER = 'w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20';
export const NAVY = 'text-[#0A1630] dark:text-white';
export const BODY = 'text-[#3A4756] dark:text-slate-400';
export const BLUE_TEXT = 'text-[#0A4FB0] dark:text-[#6EA2FF]';
export const SURFACE_ALT = 'bg-[#F2F8FD] dark:bg-[#0A1120]';
export const CARD =
  'rounded-2xl border border-cyan-500/30 hover:border-cyan-400/80 bg-white/95 dark:bg-[#081528]/90 shadow-[0_0_22px_rgba(0,180,216,0.12)] hover:shadow-[0_0_35px_rgba(0,240,255,0.28)] backdrop-blur transition-all duration-300';
export const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40';
export const BTN_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-5 py-2.5 text-sm font-bold text-white border border-cyan-300/40 shadow-md shadow-cyan-500/30 hover:shadow-lg hover:shadow-cyan-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
export const BTN_OUTLINE = `inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-500/60 bg-cyan-500/5 px-5 py-2.5 text-sm font-bold text-cyan-700 hover:bg-cyan-500/15 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.18)] hover:shadow-[0_0_25px_rgba(0,240,255,0.35)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${FOCUS} dark:border-cyan-400/60 dark:bg-cyan-950/25 dark:text-cyan-300 dark:hover:border-cyan-300 dark:hover:bg-cyan-900/35`;
export const INPUT =
  'h-11 w-full rounded-xl border border-cyan-500/40 bg-white px-3.5 text-sm text-[#0A1630] outline-none transition placeholder:text-slate-400 shadow-[0_0_12px_rgba(0,240,255,0.12)] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/25 dark:border-cyan-500/50 dark:bg-[#06172D] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/30';

/** Typeface of the reference design; pages fall back to Inter. */
export const FONT_STYLE = { fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif" };

export function SiteFont() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
    </>
  );
}

/** "── GLOBAL LOGISTICS SOLUTIONS" label from the reference. */
export function Eyebrow({ children, onDark = false, center = false }) {
  return (
    <div className={`flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
      <span className={`h-[2px] w-6 shrink-0 rounded-full ${onDark ? 'bg-white/80' : 'bg-[#2767AD] dark:bg-[#6EA2FF]'}`} />
      <span
        className={`text-xs font-semibold uppercase tracking-[0.1em] ${
          onDark ? 'text-white/85' : 'text-[#45607A] dark:text-slate-300'
        }`}
      >
        {children}
      </span>
    </div>
  );
}

export function Logo({ onDark = false }) {
  return (
    <Link href="/" aria-label="TransHub TMS" className={`flex shrink-0 items-center gap-3 group rounded-md ${FOCUS}`}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0 transition-transform duration-200 group-hover:scale-105">
        <Truck className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center">
          <span className={`text-[21px] font-black tracking-tight ${onDark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            Trans<span className="text-cyan-500 dark:text-cyan-400">Hub</span>
          </span>
        </div>
        <p className={`text-[10px] font-semibold tracking-wider uppercase truncate ${
          onDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
        }`}>
          Logistics Without Limits
        </p>
      </div>
    </Link>
  );
}

export function IconButton({ label, onClick, href, children }) {
  const cls = `inline-flex h-10 w-10 items-center justify-center rounded-md text-[#14203A] transition hover:bg-slate-100 ${FOCUS} dark:text-slate-200 dark:hover:bg-white/5`;
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {children}
    </button>
  );
}

/** Sun/moon toggle in the header style of the reference. */
export function ThemeButton({ darkLabel = 'Switch to dark mode', lightLabel = 'Switch to light mode' }) {
  const { toggleTheme } = useTheme();
  return (
    <IconButton label="Toggle theme" onClick={toggleTheme}>
      <span className="relative flex h-[18px] w-[18px] items-center justify-center">
        <Sun className="h-[18px] w-[18px] text-amber-300 hidden dark:block" />
        <Moon className="h-[18px] w-[18px] block dark:hidden" />
      </span>
    </IconButton>
  );
}
