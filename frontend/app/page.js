'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, MotionConfig } from 'framer-motion';
import {
  BLUE_TEXT,
  BODY,
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD,
  CONTAINER,
  Eyebrow,
  FOCUS,
  FONT_STYLE,
  IconButton,
  INPUT,
  Logo,
  NAVY,
  SiteFont,
  SURFACE_ALT,
  ThemeButton,
} from '../components/site/ui';
import {
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  NUMBER_LOCALE,
  getDictionary,
  isSupportedLanguage,
} from '../components/landing/translations';
import {
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  Fuel,
  Globe2,
  Leaf,
  MapPin,
  Menu,
  Navigation,
  Package,
  PackageCheck,
  Plane,
  Quote,
  Radar,
  Search,
  Shield,
  ShieldCheck,
  Ship,
  Smartphone,
  Star,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';

const NAV_SECTIONS = ['top', /* 'solutions', */ 'features', 'how-it-works', 'pricing', 'customers', 'faq'];

function formatINR(value, lang) {
  try {
    return new Intl.NumberFormat(`${NUMBER_LOCALE[lang] || 'en-IN'}-u-nu-latn`, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₹${value}`;
  }
}

// ── Small building blocks ───────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, subtitle, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {eyebrow && <Eyebrow center={center}>{eyebrow}</Eyebrow>}
      <h2 className={`mt-3 text-balance text-[28px] font-extrabold leading-tight tracking-tight sm:text-[30px] ${NAVY}`}>{title}</h2>
      {subtitle && <p className={`mt-2 text-pretty text-[15px] leading-relaxed sm:text-base ${BODY}`}>{subtitle}</p>}
    </div>
  );
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

// ── Header ──────────────────────────────────────────────────────
function LanguageMenu({ lang, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current.native}`}
        className={`inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-[#14203A] transition hover:bg-slate-100 ${FOCUS} dark:text-slate-200 dark:hover:bg-white/5`}
      >
        <Globe2 className="h-[18px] w-[18px]" />
        <span className="uppercase">{current.code}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-[#E4E9F3] bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0D1729] dark:shadow-black/50"
        >
          <li className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</li>
          {LANGUAGES.map((l) => {
            const selected = l.code === lang;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  lang={l.code}
                  onClick={() => {
                    onChange(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2.5 text-left text-sm transition ${selected
                      ? 'bg-[#EAF2FC] font-semibold text-[#0A4FB0] dark:bg-[#4C8DFF]/15 dark:text-[#8DB6FF]'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'
                    }`}
                >
                  <span className="flex items-baseline gap-2">
                    <span>{l.native}</span>
                    {l.native !== l.name && <span className="text-xs font-normal text-slate-400">{l.name}</span>}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Header({ t, lang, onLanguageChange }) {
  const [open, setOpen] = useState(false);
  const active = useActiveSection(NAV_SECTIONS);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1280) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const links = [
    ['top', t.nav.home],
    // ['solutions', t.nav.solutions], // Reserved for future multimodal freight expansion
    ['features', t.nav.features],
    ['how-it-works', t.nav.how],
    ['pricing', t.nav.pricing],
    ['customers', t.nav.customers],
    ['faq', t.nav.faq],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#E6ECF3] bg-[#F9FBFD]/95 backdrop-blur-md dark:border-white/10 dark:bg-[#070C18]/95">
      <div className={`${CONTAINER} flex h-[64px] items-center justify-between gap-4 lg:h-[58px]`}>
        <Logo />

        <nav aria-label="Primary" className="hidden h-full items-stretch gap-[30px] xl:flex">
          {links.map(([id, label]) => {
            const isActive = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`relative flex items-center whitespace-nowrap text-[13.5px] font-medium transition ${isActive ? 'text-[#0A4FB0] dark:text-[#6EA2FF]' : 'text-[#14203A] hover:text-[#0A4FB0] dark:text-slate-300 dark:hover:text-white'
                  }`}
              >
                {label}
                <span
                  className={`absolute inset-x-0 bottom-0 h-[2px] bg-[#1C4597] transition-opacity dark:bg-[#6EA2FF] ${isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <span className="hidden sm:inline-flex">
            <IconButton label={t.nav.search} href="/track">
              <Search className="h-[18px] w-[18px]" />
            </IconButton>
          </span>
          <ThemeButton darkLabel={t.nav.darkMode} lightLabel={t.nav.lightMode} />
          <LanguageMenu lang={lang} onChange={onLanguageChange} label={t.nav.language} />
          <Link href="/login" className={`${BTN_OUTLINE} ml-2 hidden whitespace-nowrap !px-5 !py-2 md:inline-flex`}>
            {t.nav.login}
          </Link>
          <Link href="/register?plan=pro" className={`${BTN_PRIMARY} hidden whitespace-nowrap !px-5 !py-2 sm:inline-flex`}>
            {t.nav.trial}
          </Link>
          <span className="xl:hidden">
            <IconButton label={open ? t.nav.closeMenu : t.nav.openMenu} onClick={() => setOpen((o) => !o)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </IconButton>
          </span>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-[#E6ECF3] xl:hidden dark:border-white/10">
          <nav aria-label="Mobile" className={`${CONTAINER} py-3`}>
            <ul className="grid gap-0.5">
              {links.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-md px-3 py-3 text-[15px] font-medium transition hover:bg-slate-100 dark:hover:bg-white/5 ${active === id ? BLUE_TEXT : 'text-[#14203A] dark:text-slate-200'
                      }`}
                  >
                    {label}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#E6ECF3] pt-4 dark:border-white/10">
              <Link href="/login" className={BTN_OUTLINE}>
                {t.nav.login}
              </Link>
              <Link href="/register?plan=pro" className={BTN_PRIMARY}>
                {t.nav.trial}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Hero: shipment tracking widget ──────────────────────────────
function ShipmentWidget({ t }) {
  const router = useRouter();
  const [trackingNo, setTrackingNo] = useState('');

  const onTrack = (e) => {
    e.preventDefault();
    const value = trackingNo.trim();
    router.push(value ? `/track?lr=${encodeURIComponent(value)}` : '/track');
  };

  return (
    <div className="w-full max-w-[520px]">
      <form onSubmit={onTrack}>
        <div className="group relative flex items-center rounded-2xl overflow-hidden border p-1.5 sm:p-2 transition-all bg-white/95 border-slate-200/90 shadow-[0_12px_36px_rgba(15,23,42,0.08)] hover:border-blue-400/60 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 dark:bg-[#0B1120]/95 dark:border-cyan-500/50 dark:neon-border-cyan dark:shadow-2xl dark:focus-within:border-cyan-400 dark:focus-within:ring-cyan-500/20">
          <Search className="w-5 h-5 ml-3 sm:ml-4 text-slate-400 group-focus-within:text-blue-600 dark:text-cyan-400 dark:group-focus-within:text-cyan-300 shrink-0 transition-colors" />
          <input
            type="text"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder={t.trackPlaceholder || 'e.g. DEL/26-27/000001 or LR-7642'}
            aria-label={t.trackLabel || 'Track Shipment'}
            className="w-full px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium outline-none bg-transparent text-[#14203A] placeholder-slate-400 dark:text-white dark:placeholder-slate-400"
          />
          <button
            type="submit"
            className="px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-500 shadow-md shadow-blue-500/25 dark:from-blue-600 dark:to-cyan-500 dark:hover:from-blue-500 dark:hover:to-cyan-400 dark:shadow-cyan-500/30 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t.trackBtn || 'Track Shipment'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sections ────────────────────────────────────────────────────
function Hero({ t }) {
  return (
    <section id="top" className="relative scroll-mt-24 overflow-hidden bg-white dark:bg-[#070C18]">
      {/* The reference banner (1312 x 492). Its height tracks its width
          (37.5vw) so from 1312px up it shows at the same position and scale as
          the design; below that it anchors right and crops the faded sky. */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
        <Image src="/images/reference-hero.jpg" alt="" fill priority sizes="100vw" className="object-cover object-right" />
        {/* Soft readable gradient behind headline and widget */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.85)_40%,rgba(255,255,255,0.2)_65%,rgba(255,255,255,0)_82%)] dark:hidden" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#070C18_0%,rgba(7,12,24,0.96)_38%,rgba(7,12,24,0.6)_64%,rgba(7,12,24,0.25)_100%)] dark:block" />
      </div>

      <div className={`${CONTAINER} relative`}>
        <div className="flex flex-col justify-center py-12 sm:py-14 lg:min-h-[max(492px,36vw)] lg:pb-8 lg:pt-10">
          <Reveal className="max-w-[620px]">
            <Eyebrow>{t.hero.eyebrow}</Eyebrow>
            <h1 className={`mt-4 text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[50px] lg:text-[56px] ${NAVY}`}>
              <span className="block">{t.hero.title1}</span>
              <span className="block text-[#0564D1] dark:text-[#5B9BFF]">{t.hero.title2}</span>
            </h1>
            <p className="mt-4 max-w-[520px] text-pretty text-base leading-[1.6] text-[#33404F] dark:text-slate-300">{t.hero.subtitle}</p>
          </Reveal>

          <Reveal delay={0.1} className="mt-6">
            <ShipmentWidget t={t.widget} />
          </Reveal>

          {/* Below lg the banner becomes a card; 3:2 keeps the plane, ship and
              truck in frame. */}
          <Reveal delay={0.15} className="mt-10 lg:hidden">
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-cyan-500/40 shadow-[0_0_25px_rgba(0,240,255,0.18)]">
              <Image src="/images/reference-hero.jpg" alt={t.hero.imageAlt} fill sizes="100vw" className="object-cover object-right" />
              <div className="absolute inset-0 hidden bg-[#070C18]/20 dark:block" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function TrustStrip({ t }) {
  const items = [
    { icon: Globe2, title: t.trust.networkTitle, sub: t.trust.networkSub },
    { icon: ShieldCheck, title: t.trust.secureTitle, sub: t.trust.secureSub },
    { icon: Leaf, title: t.trust.greenTitle, sub: t.trust.greenSub, green: true },
    { icon: Clock, title: t.trust.realtimeTitle, sub: t.trust.realtimeSub },
    { icon: Users, title: t.trust.trustedTitle, sub: t.trust.trustedSub },
  ];
  return (
    <section aria-label={t.trust.networkTitle} className={`border-b border-[#E4EAF1] ${SURFACE_ALT} dark:border-white/10`}>
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-5 py-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:py-[18px]`}>
        {items.map(({ icon: Icon, title, sub, green }) => (
          <div
            key={title}
            className="flex items-center gap-3.5 lg:border-l lg:border-[#E4EAF1] lg:px-5 lg:py-1.5 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0 dark:lg:border-white/10"
          >
            <Icon
              className={`h-[34px] w-[34px] shrink-0 ${green ? 'text-[#259E6E] dark:text-[#4ADE80]' : 'text-[#0A4FB0] dark:text-[#6EA2FF]'}`}
              strokeWidth={1.5}
            />
            <div className="min-w-0">
              <p className={`text-[13.5px] font-bold leading-snug ${NAVY}`}>{title}</p>
              <p className="mt-0.5 text-xs leading-snug text-[#3A4756] dark:text-slate-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Preserved for future multimodal freight expansion (Air, Sea, Rail) ──
// Currently road transport / one type of booking is active.
function ModesSection({ t }) {
  const m = t.modes;
  const modes = [
    { icon: Plane, img: '/images/reference-air.jpg', title: m.airTitle, tag: m.airTag, desc: m.airDesc, cta: m.airCta, href: '/register?plan=pro' },
    { icon: Ship, img: '/images/reference-sea.jpg', title: m.seaTitle, tag: m.seaTag, desc: m.seaDesc, cta: m.seaCta, href: '/register?plan=pro' },
    { icon: Truck, img: '/images/reference-road.jpg', title: m.roadTitle, tag: m.roadTag, desc: m.roadDesc, cta: m.roadCta, href: '/register?plan=basic' },
  ];
  return (
    <section id="solutions" className="scroll-mt-24 bg-gradient-to-b from-[#F9FBFC] to-[#F2F8FD] py-10 sm:py-12 dark:from-[#0A1120] dark:to-[#0A1120]">
      <div className={CONTAINER}>
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow={m.eyebrow} title={m.title} subtitle={m.subtitle} />
          <a href="#pricing" className={`inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-bold ${BLUE_TEXT} hover:underline`}>
            {m.link}
            <ArrowRight className="h-4 w-4" />
          </a>
        </Reveal>

        <div className="mt-6 grid gap-[18px] md:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode, i) => {
            const Icon = mode.icon;
            return (
              <Reveal key={mode.title} delay={i * 0.07} className={i === 2 ? 'md:col-span-2 lg:col-span-1' : ''}>
                <article className={`group relative isolate flex h-full min-h-[184px] overflow-hidden ${CARD} bg-[#F7FAFD] shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgba(10,35,80,0.35)]`}>
                  {/* The reference photo at its natural size (about 210 x 181),
                      pinned bottom-right as in the design. A taller card just
                      shows more card above it, so the subject never slides
                      under the text; the top edge fades into the card. */}
                  <div
                    className="absolute bottom-0 right-0 -z-10 h-[181px] w-[210px] [-webkit-mask-image:linear-gradient(to_top,#000_72%,transparent)] [mask-image:linear-gradient(to_top,#000_72%,transparent)]"
                    aria-hidden="true"
                  >
                    {/* Dark mode: hide the photo's baked-in white fade on its left. */}
                    <div className="absolute inset-0 dark:[-webkit-mask-image:linear-gradient(90deg,transparent_0%,#000_62%)] dark:[mask-image:linear-gradient(90deg,transparent_0%,#000_62%)]">
                      <Image src={mode.img} alt="" fill sizes="210px" className="object-cover object-right-bottom transition duration-700 group-hover:scale-105" />
                    </div>
                  </div>

                  <div className="flex w-full flex-col p-[18px]">
                    <div className="flex items-start gap-3.5">
                      <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full bg-[#1575E2] text-white shadow-md shadow-[#1575E2]/30 dark:bg-[#2F74F0]">
                        <Icon className="h-6 w-6" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className={`text-[18px] font-bold leading-snug ${NAVY}`}>{mode.title}</h3>
                        <p className="mt-0.5 text-[13px] text-[#5B6878] dark:text-slate-400">{mode.tag}</p>
                        {/* xl+: the description stops where the photo's subject
                            begins (as in the reference). Narrower cards stack
                            the photo under the text instead. */}
                        <p className="mt-2.5 text-[13px] leading-[1.55] text-[#2A3442] xl:max-w-[calc(100%-120px)] dark:text-slate-300">{mode.desc}</p>
                      </div>
                    </div>
                    <div className="h-[118px] xl:hidden" aria-hidden="true" />
                    <Link href={mode.href} className={`mt-auto inline-flex w-fit items-center gap-1.5 pt-4 text-[13px] font-bold ${BLUE_TEXT} transition-all hover:gap-2.5`}>
                      {mode.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function NetworkSection({ t }) {
  const n = t.network;
  const metrics = [
    { icon: Globe2, value: '200+', label: n.m1 },
    { icon: Users, value: '10,000+', label: n.m2 },
    { icon: Package, value: '1M+', label: n.m3 },
    { icon: Clock, value: '99.8%', label: n.m4 },
  ];

  const statCells = (sizing) =>
    metrics.map(({ icon: Icon, value, label }, i) => (
      <div
        key={label}
        className={`flex min-w-0 items-center ${sizing.cell} ${i % 2 === 0 ? 'border-r border-white/10' : ''} ${i < 2 ? 'border-b border-white/10' : ''}`}
      >
        <span className={`grid shrink-0 place-items-center rounded-full bg-[#183960]/80 text-[#8DB6FF] ${sizing.disc}`}>
          <Icon className={sizing.icon} />
        </span>
        <div className="min-w-0">
          <p className={`font-extrabold leading-none tracking-tight text-white ${sizing.value}`}>{value}</p>
          <p className={`mt-1.5 leading-snug text-slate-300 ${sizing.label}`}>{label}</p>
        </div>
      </div>
    ));

  return (
    <section className="relative isolate overflow-hidden bg-[#00152C] text-white">
      {/* Full width map spanning entire section width */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src="/images/reference-network.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-90"
        />
        {/* Subtle gradient to ensure left text readability while keeping center map glowing routes completely untouched and clear */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00152C]/90 via-[#00152C]/20 to-[#00152C]/50" />
      </div>

      <div className="mx-auto w-full max-w-[1312px] px-6 sm:px-8 lg:px-12 flex flex-col justify-between gap-10 py-14 lg:flex-row lg:items-center lg:py-20">
        <Reveal className="max-w-xl">
          <Eyebrow onDark>{n.eyebrow}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-extrabold leading-[1.14] tracking-tight sm:text-4xl text-white">
            {n.title}
          </h2>
          <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-white/85">
            {n.subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
            <Link href="/register?plan=pro" className={`${BTN_PRIMARY} !py-3 !px-6`}>
              {n.cta1}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/track"
              className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-500/50 bg-cyan-950/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-cyan-900/30 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.18)] ${FOCUS}`}
            >
              <Radar className="h-4 w-4 text-cyan-400" />
              {n.cta2}
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="w-full lg:max-w-md xl:max-w-[480px] shrink-0">
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#0D2744]/80 shadow-[0_0_30px_rgba(0,240,255,0.25)] backdrop-blur-md">
            {statCells({
              cell: 'gap-3.5 p-5 sm:p-6 lg:p-7',
              disc: 'h-11 w-11 sm:h-12 sm:w-12',
              icon: 'h-5 w-5',
              value: 'text-2xl sm:text-3xl font-extrabold',
              label: 'text-xs sm:text-sm font-medium',
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FeaturesSection({ t }) {
  const f = t.features;
  const features = [
    { icon: FileCheck, title: f.f1Title, desc: f.f1Desc },
    { icon: Boxes, title: f.f2Title, desc: f.f2Desc },
    { icon: Radar, title: f.f3Title, desc: f.f3Desc },
    { icon: Smartphone, title: f.f4Title, desc: f.f4Desc },
    { icon: Fuel, title: f.f5Title, desc: f.f5Desc },
    { icon: TrendingUp, title: f.f6Title, desc: f.f6Desc },
  ];
  return (
    <section id="features" className="scroll-mt-24 bg-white py-16 sm:py-20 dark:bg-[#070C18]">
      <div className={CONTAINER}>
        <Reveal>
          <SectionHeading eyebrow={f.eyebrow} title={f.title} subtitle={f.subtitle} />
        </Reveal>
        <div className="mt-9 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={(i % 3) * 0.06}>
              <div className={`group h-full p-6 ${CARD} transition duration-300 hover:-translate-y-0.5 hover:border-[#BFD3F8] hover:shadow-[0_18px_36px_-18px_rgba(10,35,80,0.3)] dark:hover:border-[#4C8DFF]/40`}>
                <span className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#EAF2FC] text-[#1575E2] transition group-hover:bg-[#1575E2] group-hover:text-white dark:bg-[#4C8DFF]/15 dark:text-[#8DB6FF]">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className={`mt-5 text-[17px] font-bold ${NAVY}`}>{title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${BODY}`}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ t }) {
  const h = t.how;
  const steps = [
    { icon: FileText, title: h.s1Title, desc: h.s1Desc },
    { icon: Truck, title: h.s2Title, desc: h.s2Desc },
    { icon: Navigation, title: h.s3Title, desc: h.s3Desc },
    { icon: PackageCheck, title: h.s4Title, desc: h.s4Desc },
    { icon: Wallet, title: h.s5Title, desc: h.s5Desc },
  ];
  return (
    <section id="how-it-works" className={`scroll-mt-24 py-16 sm:py-20 ${SURFACE_ALT}`}>
      <div className={CONTAINER}>
        <Reveal>
          <SectionHeading eyebrow={h.eyebrow} title={h.title} subtitle={h.subtitle} />
        </Reveal>
        <div className="relative mt-12">
          <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-[#C9D6EA] lg:block dark:bg-white/15" />
          <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
                className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center"
              >
                <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#1575E2] bg-white text-[#1575E2] dark:border-[#6EA2FF] dark:bg-[#0D1729] dark:text-[#8DB6FF]">
                  <Icon className="h-6 w-6" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#0564D1] text-[11px] font-bold text-white ring-4 ring-[#F2F8FD] dark:bg-[#2F74F0] dark:ring-[#0A1120]">
                    {i + 1}
                  </span>
                </span>
                <div className="lg:mt-4">
                  <h3 className={`text-base font-bold ${NAVY}`}>{title}</h3>
                  <p className={`mt-1.5 text-sm leading-relaxed ${BODY}`}>{desc}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function PricingSection({ t, lang }) {
  const p = t.pricing;
  const [cycle, setCycle] = useState('monthly');
  const plans = [
    {
      id: 'basic',
      name: 'Basic Fleet',
      monthly: 500,
      annual: 400,
      trucks: p.basicTrucks,
      desc: p.basicDesc,
      cta: p.basicCta,
      href: '/register?plan=basic',
      features: [p.feat.trial, p.feat.unlimitedBilty, p.feat.basicGps, p.feat.gstInvoicing, p.feat.alerts],
    },
    {
      id: 'pro',
      name: 'Pro Multimodal',
      monthly: 1000,
      annual: 800,
      trucks: p.proTrucks,
      desc: p.proDesc,
      cta: p.proCta,
      href: '/register?plan=pro',
      popular: true,
      features: [p.feat.trial, p.feat.multimodal, p.feat.controlTower, p.feat.driverPod, p.feat.fastag, p.feat.ageing],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Cargo',
      monthly: 2000,
      annual: 1600,
      trucks: p.entTrucks,
      desc: p.entDesc,
      cta: p.entCta,
      href: '/register?plan=enterprise',
      features: [p.feat.trial, p.feat.globalCargo, p.feat.dedicatedRadar, p.feat.customRoles, p.feat.api, p.feat.accountManager],
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-24 bg-white py-16 sm:py-20 dark:bg-[#070C18]">
      <div className={CONTAINER}>
        <Reveal>
          <SectionHeading center eyebrow={p.eyebrow} title={p.title} subtitle={p.subtitle} />
          <div className="mt-7 flex justify-center">
            <div role="radiogroup" aria-label={p.eyebrow} className="inline-flex items-center gap-1 rounded-2xl border border-cyan-500/40 bg-[#F2F8FD] p-1.5 shadow-[0_0_18px_rgba(0,240,255,0.15)] dark:border-cyan-500/40 dark:bg-[#081528]/90">
              {[
                ['monthly', p.monthly],
                ['annual', p.annual],
              ].map(([id, label]) => {
                const active = cycle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCycle(id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all ${active ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/30' : 'text-[#3A4756] hover:text-[#0A1630] dark:text-slate-400 dark:hover:text-white'
                      }`}
                  >
                    {label}
                    {id === 'annual' && (
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'}`}>
                        {p.save}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const price = cycle === 'annual' ? plan.annual : plan.monthly;
            return (
              <Reveal key={plan.id} delay={i * 0.07} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-7 transition-all duration-300 ${plan.popular
                      ? 'border-2 border-cyan-400 bg-white/95 dark:bg-[#081528]/95 shadow-[0_0_35px_rgba(0,240,255,0.32)] ring-1 ring-cyan-400/50'
                      : 'border border-cyan-500/30 hover:border-cyan-400/80 bg-white/95 dark:bg-[#081528]/90 shadow-[0_0_20px_rgba(0,240,255,0.12)] hover:shadow-[0_0_30px_rgba(0,240,255,0.28)]'
                    }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-cyan-500/30 border border-cyan-300/40">
                      {p.popular}
                    </span>
                  )}
                  <h3 className={`text-lg font-bold ${NAVY}`}>{plan.name}</h3>
                  <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded bg-[#EAF2FC] px-2.5 py-1 text-xs font-semibold text-[#0A4FB0] dark:bg-[#4C8DFF]/15 dark:text-[#8DB6FF]">
                    <Truck className="h-3.5 w-3.5" />
                    {plan.trucks}
                  </span>
                  <p className={`mt-4 min-h-[2.75rem] text-pretty text-sm leading-relaxed ${BODY}`}>{plan.desc}</p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className={`text-[44px] font-extrabold leading-none tracking-tight ${NAVY}`}>{formatINR(price, lang)}</span>
                    <span className="text-sm text-[#5B6878] dark:text-slate-400">{p.perMonth}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#5B6878] dark:text-slate-400">{cycle === 'annual' ? p.billedAnnually : p.billedMonthly}</p>

                  <Link href={`/register?plan=${plan.id}&cycle=${cycle}`} className={`mt-6 w-full !py-3 ${plan.popular ? BTN_PRIMARY : BTN_OUTLINE}`}>
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <ul className="mt-7 space-y-3 border-t border-[#E9EEF5] pt-7 dark:border-white/10">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm text-[#2A3442] dark:text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#0564D1] dark:text-[#6EA2FF]" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ t }) {
  const s = t.testimonials;
  const metrics = [
    { icon: Truck, value: '10,000+', label: s.m1 },
    { icon: MapPin, value: '200+', label: s.m2 },
    { icon: CheckCircle2, value: '99.8%', label: s.m3 },
    { icon: Star, value: '4.9 / 5', label: s.m4 },
  ];
  return (
    <section id="customers" className={`scroll-mt-24 py-16 sm:py-20 ${SURFACE_ALT}`}>
      <div className={`${CONTAINER} grid items-center gap-10 lg:grid-cols-12`}>
        <Reveal className="lg:col-span-7">
          <SectionHeading eyebrow={s.eyebrow} title={s.title} subtitle={s.subtitle} />
          <figure className={`mt-8 p-7 sm:p-8 ${CARD} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex gap-1 text-amber-400" aria-label="5 / 5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <Quote className="h-9 w-9 text-[#0564D1]/20 dark:text-[#6EA2FF]/30" />
            </div>
            <blockquote className="mt-4 text-[17px] leading-relaxed text-[#2A3442] sm:text-lg dark:text-slate-200">“{s.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1575E2] text-sm font-bold text-white dark:bg-[#2F74F0]">RK</span>
              <div>
                <p className={`font-bold ${NAVY}`}>Rajesh Kumar</p>
                <p className="text-sm text-[#5B6878] dark:text-slate-400">{s.role}</p>
              </div>
            </figcaption>
          </figure>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 lg:col-span-5">
          {metrics.map(({ icon: Icon, value, label }, i) => (
            <Reveal key={label} delay={i * 0.05}>
              <div className={`h-full p-6 text-center ${CARD}`}>
                <Icon className="mx-auto h-[34px] w-[34px] text-[#0A4FB0] dark:text-[#6EA2FF]" strokeWidth={1.5} />
                <p className={`mt-3 text-[28px] font-extrabold leading-none tracking-tight ${NAVY}`}>{value}</p>
                <p className="mt-2 text-sm text-[#5B6878] dark:text-slate-400">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ t }) {
  const f = t.faq;
  const [openIndex, setOpenIndex] = useState(0);
  const items = [1, 2, 3, 4, 5].map((n) => ({ q: f[`q${n}`], a: f[`a${n}`] }));
  return (
    <section id="faq" className="scroll-mt-24 bg-white py-16 sm:py-20 dark:bg-[#070C18]">
      <div className={`${CONTAINER} grid gap-10 lg:grid-cols-12 lg:gap-14`}>
        <Reveal className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <SectionHeading eyebrow={f.eyebrow} title={f.title} subtitle={f.subtitle} />
            <a href="#contact" className={`${BTN_OUTLINE} mt-7 !py-3`}>
              {f.contactCta}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-8">
          <div className={`divide-y divide-[#E9EEF5] overflow-hidden dark:divide-white/10 ${CARD}`}>
            {items.map(({ q, a }, i) => {
              const open = openIndex === i;
              return (
                <div key={q}>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={open}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpenIndex(open ? -1 : i)}
                    className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition hover:bg-[#F8FAFD] dark:hover:bg-white/[0.03]"
                  >
                    <span className={`text-base font-semibold ${open ? BLUE_TEXT : NAVY}`}>{q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180 text-[#0564D1]' : ''}`} />
                  </button>
                  <div
                    id={`faq-a-${i}`}
                    role="region"
                    aria-labelledby={`faq-q-${i}`}
                    className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <p className={`px-6 pb-6 text-[15px] leading-relaxed ${BODY}`}>{a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CtaBand({ t }) {
  return (
    <section className="bg-white pb-16 sm:pb-20 dark:bg-[#070C18]">
      <div className={CONTAINER}>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-2xl bg-[#01479C] px-6 py-12 text-center sm:px-12 sm:py-16 border-2 border-cyan-400/50 shadow-[0_0_35px_rgba(0,240,255,0.3)]">
            <Image src="/images/reference-network.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover opacity-60 mix-blend-screen" aria-hidden="true" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0564D1]/90 via-[#01479C]/80 to-[#01479C]/60" aria-hidden="true" />
            <h2 className="mx-auto max-w-3xl text-balance text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-[36px]">{t.cta.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-blue-100">{t.cta.subtitle}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register?plan=pro" className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold text-[#01479C] shadow-lg shadow-black/20 transition-all duration-200 hover:bg-cyan-50 hover:scale-[1.02] ${FOCUS}`}>
                {t.cta.primary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/track" className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-400/70 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all duration-200 hover:bg-white/20 hover:border-cyan-300 hover:scale-[1.02] ${FOCUS}`}>
                <Search className="h-4 w-4" />
                {t.cta.secondary}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ t }) {
  const f = t.footer;
  const linkCls = 'text-sm text-slate-400 transition hover:text-white';
  const columns = [
    { title: f.operations, links: [['#solutions', f.air], ['#solutions', f.sea], ['#solutions', f.rail], ['#solutions', f.road]] },
    { title: f.featuresCol, links: [['#features', f.bilty], ['#features', f.pod], ['#features', f.gps], ['#features', f.fastag]] },
    {
      title: f.pricingTools,
      links: [['#pricing', f.basicPlan], ['#pricing', f.proPlan], ['#pricing', f.entPlan], ['/track', f.tracker], ['/register?plan=pro', f.freeTrial]],
    },
    { title: f.company, links: [['/login', f.login], ['#contact', f.about], ['#contact', f.sustainability], ['#contact', f.support]] },
  ];

  return (
    <footer id="contact" className="relative isolate overflow-hidden scroll-mt-24 bg-[#00152C] text-slate-200 dark:bg-[#030814]">
      {/* Background World Network Map */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src="/images/reference-network.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-80 sm:opacity-85"
        />
        {/* Subtle gradient to ensure footer links readability while preserving vibrant glowing routes */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#00152C]/85 via-[#00152C]/70 to-[#00152C]/92 dark:from-[#030814]/85 dark:via-[#030814]/70 dark:to-[#030814]/92" />
      </div>

      <div className={`${CONTAINER} pt-12 sm:pt-14 pb-5 sm:pb-6 relative z-10`}>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo onDark />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">{f.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-950/30 px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                SOC-2 Type II
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-950/30 px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ISO 27001
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold text-white">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map(([href, label]) => (
                    <li key={label}>
                      {href.startsWith('/') ? (
                        <Link href={href} className={linkCls}>
                          {label}
                        </Link>
                      ) : (
                        <a href={href} className={linkCls}>
                          {label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm text-slate-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} TransHub Technologies Inc. {f.rights}
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href="#contact" className={linkCls}>
              {f.privacy}
            </a>
            <a href="#contact" className={linkCls}>
              {f.terms}
            </a>
            <a href="#contact" className={linkCls}>
              {f.security}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState('en');
  const t = useMemo(() => getDictionary(lang), [lang]);

  // Restore the visitor's language (same storage key the old page used).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && isSupportedLanguage(saved)) setLang(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Keep <html lang> in sync for screen readers and font selection; restore
  // English when leaving the page, since the app screens are not translated.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => () => {
    document.documentElement.lang = 'en';
  }, []);

  // Smooth in-page anchor scrolling, unless the visitor prefers reduced motion.
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) root.style.scrollBehavior = 'smooth';
    return () => {
      root.style.scrollBehavior = '';
    };
  }, []);

  const changeLanguage = (code) => {
    if (!isSupportedLanguage(code)) return;
    setLang(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <SiteFont />
      <div
        className="min-h-screen bg-white text-[#0A1630] antialiased selection:bg-[#0564D1] selection:text-white dark:bg-[#070C18] dark:text-slate-100"
        style={FONT_STYLE}
      >
        <Header t={t} lang={lang} onLanguageChange={changeLanguage} />
        <main>
          <Hero t={t} />
          <TrustStrip t={t} />
          {/* Reserved for future multimodal expansion:
          <ModesSection t={t} />
          */}
          <FeaturesSection t={t} />
          <HowItWorks t={t} />
          <PricingSection t={t} lang={lang} />
          <TestimonialsSection t={t} />
          <FaqSection t={t} />
          <CtaBand t={t} />
          {/* Network details removed per user request; background map moved to footer:
          <NetworkSection t={t} />
          */}
        </main>
        <Footer t={t} />
      </div>
    </MotionConfig>
  );
}
