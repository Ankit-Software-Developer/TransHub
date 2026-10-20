// frontend/app/(auth)/register/page.js
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { BLUE_TEXT, BODY, BTN_PRIMARY, INPUT, NAVY } from '../../../components/site/ui';
import {
  AuthCard,
  AuthLayout,
  Divider,
  Field,
  Notice,
  SocialButtons,
} from '../../../components/site/auth';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Navigation,
  Boxes,
  Phone,
  Rocket,
  ShieldCheck,
  Truck,
  User,
  Users,
  Zap,
} from 'lucide-react';

const TRANSPORTER_TYPES = [
  {
    id: 'FTL',
    code: 'FTL',
    name: 'FTL',
    fullName: 'Full Truckload',
    badge: 'DIRECT FLEET',
    desc: 'Point-to-point dedicated vehicle bookings',
    icon: Truck,
  },
  {
    id: 'PTL',
    code: 'PTL',
    name: 'PTL',
    fullName: 'Part Truckload / Parcel',
    badge: 'SUNDRY / LTL',
    desc: 'Consolidated shipments, manifest & load planning',
    icon: Boxes,
  },
  {
    id: 'BOTH',
    code: 'BOTH',
    name: 'Both (FTL + PTL)',
    fullName: 'Full Operations Suite',
    badge: 'RECOMMENDED',
    desc: 'Dedicated direct trips & parcel loading sheets',
    icon: Zap,
  },
];

const PLANS = [
  {
    id: 'basic',
    code: 'BASIC',
    name: 'Basic',
    fullName: 'Basic Fleet',
    monthlyPrice: 500,
    annualMonthlyPrice: 400,
    annualTotal: 4800,
    badge: '5 TRUCKS',
    trucks: 'Up to 5 Trucks',
    desc: 'Instant Bilty/LR, basic GPS & GST invoicing',
    icon: Truck,
  },
  {
    id: 'pro',
    code: 'PRO',
    name: 'Pro',
    fullName: 'Pro Multimodal',
    monthlyPrice: 1000,
    annualMonthlyPrice: 800,
    annualTotal: 9600,
    badge: 'POPULAR',
    trucks: 'Up to 25 Trucks',
    desc: 'GPS control tower, FASTag sync, driver mobile POD & auto ageing',
    icon: Rocket,
  },
  {
    id: 'enterprise',
    code: 'ENTERPRISE',
    name: 'Enterprise',
    fullName: 'Enterprise Cargo',
    monthlyPrice: 2000,
    annualMonthlyPrice: 1600,
    annualTotal: 19200,
    badge: 'UNLIMITED',
    trucks: 'Unlimited Fleet',
    desc: 'Dedicated dispatch radar, API integrations & 24/7 account manager',
    icon: Crown,
  },
  {
    id: 'trial',
    code: 'TRIAL',
    name: 'Trial',
    fullName: '30-Day Free Trial',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    annualTotal: 0,
    badge: 'FREE',
    trucks: 'Full Access',
    desc: 'Full-featured multimodal logistics operating platform for 30 days',
    icon: Gift,
  },
];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', short: 'IN' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', short: 'AE' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', short: 'SA' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸', short: 'US' },
  { code: '+44', country: 'UK', flag: '🇬🇧', short: 'GB' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', short: 'SG' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦', short: 'QA' },
  { code: '+968', country: 'Oman', flag: '🇴🇲', short: 'OM' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼', short: 'KW' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭', short: 'BH' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', short: 'AU' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', short: 'DE' },
];

const SHOWCASE = {
  eyebrow: 'Start your 30-day free enterprise trial',
  title: 'Scale your fleet with modern',
  accent: 'intelligence',
  subtitle:
    'Join 500+ transporters across India. Unify consignment booking, automated billing, and live GPS telemetry — all with a 30-day free trial.',
  chips: [
    { icon: BarChart3, label: 'Real-Time Visibility' },
    { icon: ShieldCheck, label: '30-Day Free Trial' },
    { icon: Zap, label: 'Built for Modern Logistics' },
  ],
  testimonial: {
    initials: 'VP',
    name: 'Vikram Patel',
    role: 'MD, Shreeji Transport',
    quote:
      'The free trial was a game-changer. Within 2 weeks, we had our entire 150-truck fleet digitized. The ROI was visible from day one.',
  },
  stats: [
    { icon: Truck, value: '10,000+', label: 'Deliveries Monthly' },
    { icon: Users, value: '500+', label: 'Trusted Customers' },
    { icon: ShieldCheck, value: '99.8%', label: 'Platform Uptime' },
  ],
};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const urlPlan = searchParams.get('plan')?.toLowerCase();
  const urlCycle = searchParams.get('cycle')?.toLowerCase();

  // Start with 'pro' plan by default per user request
  const [selectedPlanId, setSelectedPlanId] = useState('pro');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [transporterType, setTransporterType] = useState('BOTH'); // 'FTL' | 'PTL' | 'BOTH'
  const [countryCode, setCountryCode] = useState('+91');
  const [emailError, setEmailError] = useState(null);
  const [phoneError, setPhoneError] = useState(null);

  // System location detection & Pincode state
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    agreed: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (urlPlan) {
      const match = PLANS.find((p) => p.id === urlPlan || p.code.toLowerCase() === urlPlan);
      if (match) setSelectedPlanId(match.id);
    }
  }, [urlPlan]);

  useEffect(() => {
    if (urlCycle) {
      if (urlCycle === 'annual' || urlCycle === 'annually' || urlCycle === 'yearly') {
        setBillingCycle('ANNUAL');
      } else if (urlCycle === 'monthly') {
        setBillingCycle('MONTHLY');
      }
    }
  }, [urlCycle]);

  const currentPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];
  const update = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, email: val }));
    if (emailError && EMAIL_REGEX.test(val.trim())) {
      setEmailError(null);
    }
  };

  const handleEmailBlur = () => {
    const trimmed = formData.email.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setEmailError('Enter a valid email');
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (e) => {
    // Strictly numbers only, max 10 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digitsOnly }));
    if (digitsOnly.length === 10) {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone && formData.phone.length < 10) {
      setPhoneError('Must be 10 digits');
    } else {
      setPhoneError(null);
    }
  };

  // Helper to fetch details from Indian Postal Pincode API
  const lookupPincodeDetails = async (pin) => {
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const detectedCity = po.District || po.Block || po.Division || po.Name || '';
        const detectedState = po.State || '';
        if (detectedCity) setCity(detectedCity);
        if (detectedState) setState(detectedState);
        setLocationDetected(true);
      }
    } catch (e) {
      // ignore
    }
  };

  const handlePincodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(digits);
    if (digits.length === 6) {
      lookupPincodeDetails(digits);
    }
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    let resolved = false;

    // 1. Try Browser HTML5 Geolocation API (GPS high precision)
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000,
          });
        });

        if (position?.coords) {
          const { latitude, longitude } = position.coords;
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            const pin = addr.postcode?.replace(/\D/g, '').slice(0, 6);
            const detectedCity = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || addr.county || '';
            const detectedState = addr.state || '';

            if (pin && pin.length === 6) {
              setPincode(pin);
              if (detectedCity) setCity(detectedCity);
              if (detectedState) setState(detectedState);
              setLocationDetected(true);
              resolved = true;
            }
          } catch (osmErr) {}
        }
      } catch (geoErr) {
        // Geolocation denied or timed out; fall through to IP
      }
    }

    // 2. Fallback to IP-based Geolocation if GPS didn't resolve
    if (!resolved) {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        const pin = ipData.postal?.replace(/\D/g, '').slice(0, 6);
        const detectedCity = ipData.city || ipData.region || '';
        const detectedState = ipData.region || '';

        if (pin && pin.length === 6) {
          setPincode(pin);
          if (detectedCity) setCity(detectedCity);
          if (detectedState) setState(detectedState);
          setLocationDetected(true);
          resolved = true;
        } else if (detectedCity || detectedState) {
          if (detectedCity) setCity(detectedCity);
          if (detectedState) setState(detectedState);
          setLocationDetected(true);
        }
      } catch (ipErr) {
        try {
          const ipWho = await fetch('https://ipwho.is/');
          const whoData = await ipWho.json();
          const pin = whoData.postal?.replace(/\D/g, '').slice(0, 6);
          if (pin && pin.length === 6) {
            setPincode(pin);
            if (whoData.city) setCity(whoData.city);
            if (whoData.region) setState(whoData.region);
            setLocationDetected(true);
            resolved = true;
          }
        } catch (whoErr) {}
      }
    }

    setDetectingLocation(false);
  };

  // Run auto-detection on mount in background
  useEffect(() => {
    detectLocation();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (!formData.agreed) {
      setError('Please accept the Terms of Service to proceed.');
      setLoading(false);
      return;
    }

    const emailTrimmed = formData.email.trim();
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setError('Please enter a valid work email address (e.g. name@company.com).');
      setEmailError('Invalid email format');
      setLoading(false);
      return;
    }

    if (formData.phone.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      setPhoneError('Must be 10 digits');
      setLoading(false);
      return;
    }

    const fullPhone = `${countryCode} ${formData.phone}`;

    try {
      await register({
        fullName: formData.fullName,
        companyName: formData.companyName,
        email: emailTrimmed.toLowerCase(),
        phone: fullPhone,
        password: formData.password,
        accountType: 'FLEET_OWNER',
        planCode: currentPlan.code,
        billingCycle,
        transporterType,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        address: city.trim() ? `${city.trim()} Terminal / Head Office` : 'Head Office Terminal',
      });

      // Directly redirect to transporter operations dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      header={{ prompt: 'Already have an account?', ctaLabel: 'Log In', ctaHref: '/login' }}
      showcase={SHOWCASE}
    >
      <AuthCard>

        <h2 className={`text-[26px] font-extrabold tracking-tight ${NAVY}`}>Create your account</h2>
        <p className={`mt-1.5 text-sm ${BODY}`}>
          Start with a <strong className={BLUE_TEXT}>30-day free trial</strong>. No credit card required.
        </p>

        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="info">{info}</Notice>}

        {/* Plan Selector with Monthly / Annual calculation */}
        <div className="mt-2.5 space-y-1.5">
          {/* Header row with Cycle Switch and Trial badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#45607A] dark:text-slate-400">
              Select Plan:
            </span>
            <div className="flex items-center gap-1.5">
              {/* Billing Cycle Segmented Switch */}
              <div className="inline-flex items-center rounded-lg border border-cyan-500/30 bg-slate-100 p-0.5 dark:bg-[#07172C]">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold transition-all ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-cyan-500/25 dark:text-cyan-300'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('ANNUAL')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold transition-all ${
                    billingCycle === 'ANNUAL'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <span>Annual</span>
                  <span className={`rounded px-1 text-[9px] font-extrabold ${billingCycle === 'ANNUAL' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                    -20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Plan Options - Decreased Height */}
          <div
            role="radiogroup"
            aria-label="Select plan"
            className="grid grid-cols-4 gap-1 p-0.5 sm:p-1 rounded-xl border border-cyan-500/35 bg-slate-100/80 dark:bg-[#071324] shadow-[0_0_12px_rgba(0,240,255,0.08)]"
          >
            {PLANS.map((plan) => {
              const selected = selectedPlanId === plan.id;
              const PlanIcon = plan.icon;
              const isAnnual = billingCycle === 'ANNUAL';
              const totalDisplay =
                plan.id === 'trial'
                  ? 'Free'
                  : isAnnual
                  ? `₹${plan.annualTotal.toLocaleString('en-IN')}`
                  : `₹${plan.monthlyPrice.toLocaleString('en-IN')}`;

              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`flex flex-col items-center justify-center rounded-lg py-1 px-1 text-center transition-all duration-200 ${
                    selected
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/30 scale-[1.01]'
                      : 'text-[#14203A] dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:text-[#0564D1]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 w-full leading-none">
                    <PlanIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate text-[11px] font-bold">{plan.name}</span>
                  </div>

                  <span className="block text-[11px] font-extrabold tracking-tight leading-none mt-0.5">
                    {totalDisplay}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next line: Shows per-month calculation */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Plan: <strong className="text-slate-800 dark:text-slate-200">{currentPlan.name}</strong>
            </span>
            <span className="flex items-center gap-1">
              {currentPlan.id === 'trial' ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Free 30-day trial</span>
              ) : billingCycle === 'ANNUAL' ? (
                <>
                  <strong className="text-blue-600 dark:text-cyan-400 font-extrabold text-xs">
                    ₹{currentPlan.annualMonthlyPrice}/month
                  </strong>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    (₹{currentPlan.annualTotal.toLocaleString('en-IN')} total / yr)
                  </span>
                </>
              ) : (
                <>
                  <strong className="text-blue-600 dark:text-cyan-400 font-extrabold text-xs">
                    ₹{currentPlan.monthlyPrice.toLocaleString('en-IN')}/month
                  </strong>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">billed monthly</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Operations Type Selector: FTL, PTL, or BOTH */}
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#45607A] dark:text-slate-400">
              Operations Type:
            </span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
              {transporterType === 'FTL' ? '🚛 Dedicated Direct Fleet' : transporterType === 'PTL' ? '📦 Consolidated Parcel/Hub' : '🔄 Full Hybrid FTL + PTL'}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Select operations type"
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border border-cyan-500/35 bg-slate-100/80 dark:bg-[#071324] shadow-[0_0_12px_rgba(0,240,255,0.08)]"
          >
            {TRANSPORTER_TYPES.map((t) => {
              const selected = transporterType === t.id;
              const TIcon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTransporterType(t.id)}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-1 text-center transition-all duration-200 cursor-pointer ${
                    selected
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/30 scale-[1.01]'
                      : 'text-[#14203A] dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:text-[#0564D1]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 w-full leading-none">
                    <TIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate text-[11px] font-bold">{t.name}</span>
                  </div>
                  <span className={`block text-[9.5px] truncate mt-0.5 ${selected ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                    {t.fullName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-2.5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="reg-name" label="Full name" icon={User}>
              <input id="reg-name" type="text" required autoComplete="name" value={formData.fullName} onChange={update('fullName')} placeholder="e.g. Rajesh Kumar" className={`${INPUT} pl-10`} />
            </Field>
            <Field id="reg-company" label="Company / Transporter" icon={Building2}>
              <input id="reg-company" type="text" required autoComplete="organization" value={formData.companyName} onChange={update('companyName')} placeholder="e.g. ABC Roadways" className={`${INPUT} pl-10`} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="reg-email"
              label={
                <span className="flex items-center justify-between">
                  <span>Work email</span>
                  {emailError && <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400">{emailError}</span>}
                </span>
              }
              icon={Mail}
              trailing={
                EMAIL_REGEX.test(formData.email.trim()) ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : null
              }
            >
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="you@company.com"
                className={`${INPUT} pl-10 pr-9 ${
                  emailError ? '!border-rose-500/70 focus:!border-rose-500 focus:!ring-rose-500/25' : ''
                }`}
              />
            </Field>

            <Field
              id="reg-phone"
              label={
                <span className="flex items-center justify-between">
                  <span>Mobile / Phone</span>
                  {phoneError ? (
                    <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400">{phoneError}</span>
                  ) : null}
                </span>
              }
            >
              <div
                className={`flex h-11 w-full items-center rounded-xl border bg-white shadow-[0_0_12px_rgba(0,240,255,0.12)] transition focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/25 dark:bg-[#06172D] ${
                  phoneError
                    ? 'border-rose-500/70 focus-within:border-rose-500 focus-within:ring-rose-500/20'
                    : 'border-cyan-500/40 dark:border-cyan-500/50'
                }`}
              >
                {/* Compact Selectable Country Code Dropdown */}
                <div className="relative flex h-full shrink-0 items-center border-r border-cyan-500/30 bg-slate-50/90 dark:bg-[#040F1E] rounded-l-xl px-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1 pointer-events-none">
                    <span className="text-xs font-bold tracking-tight text-[#0A1630] dark:text-white">
                      {countryCode}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </div>
                  <select
                    id="reg-country-code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    aria-label="Country Code"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.short} value={c.code} className="bg-white text-slate-900 dark:bg-[#06172D] dark:text-white font-medium text-xs">
                        {c.code} — {c.country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 10-Digit Phone Input - Expanded to the right */}
                <div className="relative flex-1 h-full min-w-0">
                  <input
                    id="reg-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    autoComplete="tel-national"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    placeholder="10-digit number"
                    className="h-full w-full bg-transparent px-3 text-sm text-[#0A1630] outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                    {formData.phone.length === 10 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : formData.phone.length > 0 ? (
                      <span className="text-[10.5px] font-bold text-amber-500 dark:text-amber-400">
                        {formData.phone.length}/10
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Field>
          </div>

          {/* Head Office Branch Location & Pincode Detection */}
          <div className="rounded-xl border border-cyan-500/35 bg-slate-50/80 dark:bg-[#06172D] p-3 space-y-2 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#45607A] dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                Head Office Branch Location
              </span>
              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 bg-cyan-100/80 dark:bg-cyan-950/70 hover:bg-cyan-200/80 dark:hover:bg-cyan-900/80 px-2 py-0.5 rounded-md border border-cyan-300/50 dark:border-cyan-700/60 transition cursor-pointer"
                title="Detect current system location"
              >
                {detectingLocation ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                    Detecting GPS...
                  </>
                ) : (
                  <>
                    <Navigation className="h-3 w-3 shrink-0" />
                    Auto-Detect System Location
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">PIN Code (6 digits)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={handlePincodeChange}
                  placeholder="e.g. 110020"
                  className="mt-0.5 w-full h-8 px-2.5 rounded-lg border border-cyan-500/30 bg-white dark:bg-[#071324] text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. South Delhi"
                  className="mt-0.5 w-full h-8 px-2.5 rounded-lg border border-cyan-500/30 bg-white dark:bg-[#071324] text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Delhi"
                  className="mt-0.5 w-full h-8 px-2.5 rounded-lg border border-cyan-500/30 bg-white dark:bg-[#071324] text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {locationDetected && (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>
                  Detected Location: <strong>{[city, state].filter(Boolean).join(', ')}{pincode ? ` · PIN ${pincode}` : ''}</strong>
                </span>
              </div>
            )}
          </div>

          <Field
            id="reg-password"
            label="Create password"
            icon={Lock}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="grid h-8 w-8 place-items-center rounded text-[#5B6878] transition hover:text-[#0A1630] dark:text-slate-400 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          >
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={formData.password}
              onChange={update('password')}
              placeholder="Min. 8 characters"
              className={`${INPUT} pl-10 pr-11`}
            />
          </Field>

          <label className="flex cursor-pointer select-none items-start gap-2.5 text-[13px] leading-relaxed text-[#14203A] dark:text-slate-300">
            <input
              type="checkbox"
              checked={formData.agreed}
              onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] border-[#C5CFDC] accent-[#0564D1]"
            />
            <span>
              I agree to TransHub&apos;s <strong className={BLUE_TEXT}>Terms</strong> &amp;{' '}
              <strong className={BLUE_TEXT}>30-Day Trial Policy</strong>
            </span>
          </label>

          <button type="submit" disabled={loading} className={`${BTN_PRIMARY} h-11 w-full text-[15px]`}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Account…
              </>
            ) : (
              <>
                {selectedPlanId === 'trial' ? 'Start Free Trial' : `Start Trial with ${currentPlan.name}`}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

      </AuthCard>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F9FBFC] text-sm text-[#0A4FB0] dark:bg-[#070C18] dark:text-[#8DB6FF]">
          Loading TransHub Registration...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
