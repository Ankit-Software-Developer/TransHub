// frontend/components/site/auth.js
//
// Layout shared by the login and registration pages, in the visual language
// of the landing page / reference design: the same header, the reference
// multimodal photo as a full-page background, light-blue surfaces, outline
// icons and form controls.
//
// Desktop (lg+) is a single, non-scrolling screen: the page is exactly one
// viewport tall, the form keeps a fixed width and the showcase on the left
// drops its optional blocks on shorter screens (testimonial first, then the
// stats) instead of overflowing. Phones show the form only.
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowRight, Info, ShieldCheck, Star } from 'lucide-react';
import {
  BTN_OUTLINE,
  CONTAINER,
  Eyebrow,
  FONT_STYLE,
  Logo,
  NAVY,
  SiteFont,
  ThemeButton,
} from './ui';

export function AuthHeader({ prompt, ctaLabel, ctaShortLabel, ctaHref }) {
  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-[#E6ECF3] bg-[#F9FBFD]/95 backdrop-blur-md dark:border-white/10 dark:bg-[#070C18]/95">
      <div className={`${CONTAINER} flex h-[64px] items-center justify-between gap-3 lg:h-[58px]`}>
        <Logo />
        <div className="flex items-center gap-1.5 sm:gap-3">
          <ThemeButton />
          <span className="hidden text-sm text-[#3A4756] md:inline dark:text-slate-400">{prompt}</span>
          <Link href={ctaHref} className={`${BTN_OUTLINE} whitespace-nowrap !px-3.5 !py-2 sm:!px-4`}>
            <span className="sm:hidden">{ctaShortLabel || ctaLabel}</span>
            <span className="hidden sm:inline">{ctaLabel}</span>
            <ArrowRight className="hidden h-4 w-4 sm:block" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Left column, laid over the page's background photo: headline, feature
 * chips, a testimonial and a stats strip in the trust-strip style. The
 * testimonial hides below 820px of height and the stats below 700px, so the
 * column always fits the screen.
 */
export function AuthShowcase({ eyebrow, title, accent, subtitle, chips, testimonial, stats }) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className={`mt-3 text-balance text-[38px] font-extrabold leading-[1.08] tracking-[-0.025em] xl:text-[44px] 2xl:text-[48px] ${NAVY}`}>
        {title} <span className="text-[#0564D1] dark:text-[#5B9BFF]">{accent}</span>
      </h1>
      <p className="mt-3 max-w-3xl text-pretty text-base leading-[1.6] text-[#33404F] dark:text-slate-300">{subtitle}</p>

      <ul className="mt-5 flex flex-wrap gap-2.5">
        {chips.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-white/60 px-3 py-1.5 text-[13px] font-semibold text-[#0A1630] shadow-sm backdrop-blur-xl backdrop-saturate-150 dark:border-cyan-500/30 dark:bg-[#071324]/60 dark:text-white"
          >
            <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            {label}
          </li>
        ))}
      </ul>

      {/* Testimonial and stats */}
      <div className="mt-6 space-y-3.5 [@media(max-height:700px)]:hidden">
        <figure className="rounded-2xl border border-cyan-500/25 bg-white/65 p-4 shadow-[0_0_20px_rgba(0,240,255,0.06)] backdrop-blur-xl dark:border-cyan-500/30 dark:bg-[#071324]/75 [@media(max-height:820px)]:hidden">
          <div className="flex gap-0.5 text-amber-400" aria-label="5 / 5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <blockquote className="mt-2 text-[14px] leading-relaxed text-[#2A3442] dark:text-slate-200">“{testimonial.quote}”</blockquote>
          <figcaption className="mt-3 flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-xs font-bold text-white shadow-sm shadow-cyan-500/30">{testimonial.initials}</span>
            <span className="text-xs sm:text-sm">
              <span className={`block font-bold ${NAVY}`}>{testimonial.name}</span>
              <span className="text-[11.5px] text-[#5B6878] dark:text-slate-400">{testimonial.role}</span>
            </span>
          </figcaption>
        </figure>

        {/* Stats Strip: strictly single horizontal row, compact width with no extra space */}
        <dl className="inline-flex w-fit max-w-full items-center divide-x divide-[#E4EAF1] rounded-2xl border border-cyan-500/30 bg-white/70 px-3 py-2.5 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.08)] dark:divide-white/10 dark:border-cyan-500/35 dark:bg-[#071324]/85 sm:px-4 sm:py-3">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5 px-3 first:pl-1 last:pr-1 sm:gap-3 sm:px-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 sm:h-10 sm:w-10 dark:bg-cyan-500/15 dark:text-cyan-400">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <dt className="sr-only">{label}</dt>
                <dd className={`text-sm sm:text-base font-extrabold leading-tight ${NAVY}`}>{value}</dd>
                <dd className="whitespace-nowrap text-[11px] leading-snug text-[#3A4756] sm:text-xs dark:text-slate-400">{label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function AuthLayout({ header, showcase, children }) {
  return (
    <div
      className="relative isolate flex min-h-[100dvh] flex-col bg-[#F9FBFD] text-[#0A1630] antialiased selection:bg-[#0564D1] selection:text-white lg:h-[100dvh] lg:overflow-hidden dark:bg-[#070C18] dark:text-slate-100"
      style={FONT_STYLE}
    >
      <SiteFont />

      {/* Page background: the reference multimodal photo, fixed behind the
          content and slightly blurred so text and form stay easy to read. The
          fade keeps the headline side readable while the plane, ship and
          truck stay visible towards the form. scale-105 hides the blur's
          soft edges. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <Image src="/images/reference-hero.jpg" alt="" fill priority sizes="100vw" className="scale-105 object-cover object-right blur-[3px]" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(249,251,253,0.97)_0%,rgba(249,251,253,0.9)_34%,rgba(249,251,253,0.45)_58%,rgba(249,251,253,0.12)_100%)] lg:block dark:hidden" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(7,12,24,0.97)_0%,rgba(7,12,24,0.88)_34%,rgba(7,12,24,0.5)_60%,rgba(7,12,24,0.35)_100%)] lg:dark:block" />
        {/* Below lg the content spans the full width, so fade evenly. */}
        <div className="absolute inset-0 bg-[#F9FBFD]/85 lg:hidden dark:bg-[#070C18]/85" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F9FBFD]/90 to-transparent dark:from-[#070C18]/90" />
      </div>

      <AuthHeader {...header} />

      {/* Fills the space between header and footer; content is centred. If a
          screen is ever too short for the form, this area scrolls on its own
          rather than cutting anything off. */}
      <main className="flex flex-1 items-center lg:min-h-0 lg:overflow-y-auto">
        {/* Full width: the form keeps a comfortable fixed width and the
            showcase takes all the remaining space. */}
        <div
          className={`${CONTAINER} grid items-center gap-10 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] lg:gap-12 lg:py-5 xl:grid-cols-[minmax(0,1fr)_500px] xl:gap-16`}
        >
          <div className="hidden min-w-0 lg:block">
            <AuthShowcase {...showcase} />
          </div>
          <div>{children}</div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-[#E6ECF3]/80 bg-[#F9FBFD]/70 py-4 text-center text-xs text-[#5B6878] backdrop-blur-md lg:py-2.5 lg:text-[11px] dark:border-white/10 dark:bg-[#070C18]/70 dark:text-slate-500 lg:[@media(max-height:780px)]:hidden">
        © {new Date().getFullYear()} TransHub TMS · Enterprise Multi-Tenant Transport Management
      </footer>
    </div>
  );
}

/** Frosted-glass form card: translucent fill, a strong backdrop blur so the
 *  photo behind it turns into soft colour, a light edge and a top highlight. */
export function AuthCard({ children }) {
  return (
    <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-xl border border-white/70 bg-white/55 p-6 shadow-[0_30px_60px_-30px_rgba(10,35,80,0.6),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150 sm:px-7 lg:max-w-none dark:border-white/15 dark:bg-[#0D1729]/55 dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]">
      {/* Glass sheen */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-white/0 dark:from-white/[0.08] dark:via-white/[0.02] dark:to-transparent"
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Field({ id, label, icon: Icon, trailing, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold text-[#14203A] dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6878] dark:text-slate-400" />}
        {children}
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = 'error', children }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
      : 'border-[#BFD3F8] bg-[#EAF2FC] text-[#0A4FB0] dark:border-[#4C8DFF]/30 dark:bg-[#4C8DFF]/10 dark:text-[#8DB6FF]';
  const Icon = tone === 'error' ? AlertCircle : Info;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mt-4 flex items-start gap-2.5 rounded-[5px] border px-3.5 py-2.5 text-[13px] ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Divider({ children }) {
  return (
    <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6878] dark:text-slate-500">
      <span className="h-px flex-1 bg-[#E4E9F3] dark:bg-white/10" />
      {children}
      <span className="h-px flex-1 bg-[#E4E9F3] dark:bg-white/10" />
    </div>
  );
}

const SOCIAL_BTN =
  'inline-flex h-10 items-center justify-center gap-2.5 rounded-[5px] border border-[#D8DEE6] bg-white text-sm font-semibold text-[#14203A] transition hover:border-[#0A4FB0]/40 hover:bg-[#F7FAFD] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0564D1]/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';

export function SocialButtons({ onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => onSelect('Google')} className={SOCIAL_BTN}>
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Google
      </button>
      <button type="button" onClick={() => onSelect('Microsoft')} className={SOCIAL_BTN}>
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23" aria-hidden="true">
          <path fill="#f35325" d="M1 1h10v10H1z" />
          <path fill="#81bc06" d="M12 1h10v10H12z" />
          <path fill="#05a6f0" d="M1 12h10v10H1z" />
          <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
        Microsoft
      </button>
    </div>
  );
}

/** Compact security line in the trust-strip style of the reference. */
export function SecurityNote() {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E9EEF5] pt-3.5 dark:border-white/10">
      <span className="flex items-center gap-2 text-xs text-[#3A4756] dark:text-slate-400">
        <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-[#259E6E] dark:text-[#4ADE80]" strokeWidth={1.75} />
        <span>
          <strong className={`font-bold ${NAVY}`}>Enterprise-grade security</strong> · 256-bit SSL · End-to-end encrypted
        </span>
      </span>
      <span className="shrink-0 rounded-[4px] border border-[#259E6E]/30 bg-[#259E6E]/10 px-1.5 py-0.5 text-[10.5px] font-bold text-[#1E7F59] dark:text-[#4ADE80]">SOC 2</span>
    </div>
  );
}
