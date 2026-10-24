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
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
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
    badge: 'Fleet',
    desc: 'Point-to-point dedicated vehicle bookings',
    icon: Truck,
  },
  {
    id: 'PTL',
    code: 'PTL',
    name: 'PTL',
    fullName: 'Part Truckload / Parcel',
    badge: 'Sundry',
    desc: 'Consolidated shipments, manifest & load planning',
    icon: Boxes,
  },
  {
    id: 'BOTH',
    code: 'BOTH',
    name: 'Both (FTL + PTL)',
    fullName: 'Full Operations Suite',
    badge: 'Popular',
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

  // Start with 'enterprise' plan when 'BOTH' (FTL+PTL) is selected by default per user request
  const [transporterType, setTransporterType] = useState('BOTH'); // 'FTL' | 'PTL' | 'BOTH'
  const [selectedPlanId, setSelectedPlanId] = useState('enterprise');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [transporterSubType, setTransporterSubType] = useState('FLEET_SUPPLIER'); // 'FLEET_SUPPLIER' | 'DIRECT_CARRIER' | 'COMPLETE_FTL'
  const [countryCode, setCountryCode] = useState('+91');
  const [emailError, setEmailError] = useState(null);
  const [phoneError, setPhoneError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // System location detection & Pincode state
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
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

  // Automatically select plan according to user's exact tier specification:
  // - BOTH (FTL + PTL) -> Enterprise (₹2000/mo)
  // - FTL Full-Service -> Pro (₹1000/mo)
  // - PTL -> Pro (₹1000/mo)
  // - FTL Fleet Supplier or Direct Carrier -> Basic (₹500/mo)
  useEffect(() => {
    if (transporterType === 'BOTH') {
      setSelectedPlanId('enterprise');
    } else if (transporterType === 'PTL') {
      setSelectedPlanId('pro');
    } else if (transporterType === 'FTL') {
      if (transporterSubType === 'COMPLETE_FTL') {
        setSelectedPlanId('pro');
      } else if (transporterSubType === 'FLEET_SUPPLIER' || transporterSubType === 'DIRECT_CARRIER') {
        setSelectedPlanId('basic');
      }
    }
  }, [transporterType, transporterSubType]);

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
    setPincodeLoading(true);
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
    } finally {
      setPincodeLoading(false);
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

    // 1. Fast IP-based Location (Instant response in <200ms)
    try {
      const ipWho = await fetch('https://ipwho.is/');
      const whoData = await ipWho.json();
      const pin = whoData.postal?.replace(/\D/g, '').slice(0, 6);
      if (pin && pin.length === 6) {
        setPincode(pin);
        await lookupPincodeDetails(pin);
        if (!city && whoData.city) setCity(whoData.city);
        if (!state && whoData.region) setState(whoData.region);
        setLocationDetected(true);
        resolved = true;
      } else if (whoData.city || whoData.region) {
        if (whoData.city) setCity(whoData.city);
        if (whoData.region) setState(whoData.region);
        setLocationDetected(true);
        resolved = true;
      }
    } catch (_) {}

    // 2. High-accuracy Browser GPS fallback
    if (!resolved && typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 3500,
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
              lookupPincodeDetails(pin);
              resolved = true;
            }
            if (detectedCity) setCity(detectedCity);
            if (detectedState) setState(detectedState);
            setLocationDetected(true);
          } catch (_) {}
        }
      } catch (_) {}
    }

    setDetectingLocation(false);
  };

  // Automatically fetch location & pincode in background on component mount
  useEffect(() => {
    detectLocation();
  }, []);

  // When user navigates to Step 3, ensure location & pincode are auto-detected
  useEffect(() => {
    if (currentStep === 3 && (!pincode || !city)) {
      detectLocation();
    }
  }, [currentStep]);
  // Helper to advance to Step 2 with validation
  const handleNextFromStep1 = (e) => {
    e?.preventDefault?.();
    setError(null);

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }
    if (!formData.companyName.trim() || formData.companyName.trim().length < 2) {
      setError('Please enter your company or transporter name.');
      return;
    }
    const emailTrimmed = formData.email.trim();
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setError('Please enter a valid work email address (e.g. name@company.com).');
      setEmailError('Invalid email format');
      return;
    }
    if (formData.phone.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      setPhoneError('Must be 10 digits');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setCurrentStep(2);
  };

  // Helper to advance to Step 3
  const handleNextFromStep2 = (e) => {
    e?.preventDefault?.();
    setError(null);
    if (!transporterType) {
      setError('Please select an operations type.');
      return;
    }
    setCurrentStep(3);
  };

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
        transporterSubType: transporterType === 'FTL' || transporterType === 'BOTH' ? transporterSubType : null,
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

  const STEPS = [
    { num: 1, title: 'Profile', desc: 'Account & Login' },
    { num: 2, title: 'Operations', desc: 'Fleet & Movement' },
    { num: 3, title: 'Hub & Plan', desc: 'Terminal & Pricing' },
  ];

  return (
    <AuthLayout
      header={{ prompt: 'Already have an account?', ctaLabel: 'Log In', ctaHref: '/login' }}
      showcase={SHOWCASE}
      formWidth="wide"
    >
      <AuthCard maxWidth="wide">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-black tracking-tight ${NAVY}`}>Create your account</h2>
            <span className="rounded-full bg-cyan-100 dark:bg-cyan-950/80 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-300/40 dark:border-cyan-700/50">
              Step {currentStep} of 3
            </span>
          </div>
          <p className={`mt-1 text-xs sm:text-sm ${BODY}`}>
            Start with a <strong className={BLUE_TEXT}>30-day free trial</strong>. No credit card required.
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="mt-3.5 mb-2">
          <div className="relative flex items-center justify-between">
            {/* Connecting background line */}
            <div className="absolute left-4 right-4 top-4 -translate-y-1/2 h-[2px] bg-slate-200 dark:bg-slate-700" />
            {/* Connecting filled line */}
            <div
              className="absolute left-4 top-4 -translate-y-1/2 h-[2px] bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
              style={{
                width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : 'calc(100% - 2rem)',
              }}
            />

            {STEPS.map((s) => {
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep) setCurrentStep(s.num);
                  }}
                  disabled={s.num > currentStep}
                  className={`relative z-10 flex flex-col items-center group ${
                    s.num < currentStep ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                      isPassed
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/40 shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white ring-4 ring-cyan-500/25 scale-105 shadow-cyan-500/40'
                        : 'bg-white text-slate-400 border border-slate-300 dark:bg-[#071324] dark:border-slate-700 dark:text-slate-500'
                    }`}
                  >
                    {isPassed ? <Check className="h-4 w-4 stroke-[3]" /> : s.num}
                  </div>
                  <span
                    className={`mt-1 text-[11px] font-bold ${
                      isCurrent
                        ? 'text-blue-600 dark:text-cyan-400'
                        : isPassed
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="info">{info}</Notice>}

        {/* STEP 1: Account Profile & Credentials */}
        {currentStep === 1 && (
          <form onSubmit={handleNextFromStep1} className="mt-2 space-y-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-[#08182d] p-2.5">
              <span className="text-[11px] font-bold text-blue-700 dark:text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Step 1: Your Profile &amp; Transporter Details
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="reg-name" label="Full name" icon={User}>
                <input
                  id="reg-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={update('fullName')}
                  placeholder="e.g. Rajesh Kumar"
                  className={`${INPUT} pl-10`}
                />
              </Field>
              <Field id="reg-company" label="Company / Transporter Name" icon={Building2}>
                <input
                  id="reg-company"
                  type="text"
                  required
                  autoComplete="organization"
                  value={formData.companyName}
                  onChange={update('companyName')}
                  placeholder="e.g. ABC Roadways Logistics"
                  className={`${INPUT} pl-10`}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="reg-email"
                label={
                  <span className="flex items-center justify-between">
                    <span>Work email</span>
                    {emailError && (
                      <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                        {emailError}
                      </span>
                    )}
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
                      <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                        {phoneError}
                      </span>
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
                        <option
                          key={c.code + c.short}
                          value={c.code}
                          className="bg-white text-slate-900 dark:bg-[#06172D] dark:text-white font-medium text-xs"
                        >
                          {c.code} — {c.country}
                        </option>
                      ))}
                    </select>
                  </div>

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

            <Field
              id="reg-password"
              label="Create secure password"
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
                placeholder="Minimum 8 characters"
                className={`${INPUT} pl-10 pr-11`}
              />
            </Field>

            <button type="submit" className={`${BTN_PRIMARY} mt-4 h-11 w-full text-[15px]`}>
              <span>Continue to Operations Setup</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Operations Type & Freight Model */}
        {currentStep === 2 && (
          <form onSubmit={handleNextFromStep2} className="mt-2 space-y-4">
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-50/50 dark:bg-[#07192f] p-2.5">
              <span className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Step 2: Choose Your Logistics Operations Model
              </span>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                This customizes your booking bilties, manifests, vendor trip advances, and tracking radar.
              </p>
            </div>

            {/* Operations Type Cards */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Core Movement Type:
                </span>
                <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                  {transporterType === 'FTL'
                    ? '🚛 Dedicated Full Truckload'
                    : transporterType === 'PTL'
                    ? '📦 Part-load & Parcels'
                    : '🔄 Hybrid (Both FTL + PTL)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TRANSPORTER_TYPES.map((t) => {
                  const selected = transporterType === t.id;
                  const TIcon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTransporterType(t.id);
                        if (t.id === 'BOTH') {
                          setTransporterSubType('COMPLETE_FTL');
                        } else if (t.id === 'FTL') {
                          setTransporterSubType('FLEET_SUPPLIER');
                        }
                      }}
                      className={`relative flex flex-col justify-start p-2.5 rounded-xl border text-left transition-all cursor-pointer h-full ${
                        selected
                          ? 'border-cyan-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-[#08203d] dark:to-[#092a4f] shadow-md shadow-cyan-500/20 ring-2 ring-cyan-500/40'
                          : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#071324] hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 w-full">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                            selected
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <TIcon className="h-4 w-4" />
                        </div>

                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white leading-tight">
                            {t.name}
                          </span>
                          <span
                            className={`mt-1 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ${
                              selected
                                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {t.badge}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
                        {t.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* When BOTH (FTL+PTL) is selected: Show Full-Service Enterprise in one bar and hide the other two */}
            {transporterType === 'BOTH' && (
              <div className="p-3 rounded-xl border border-cyan-500/35 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 dark:from-[#061e38] dark:to-[#08284d] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        🏢 Full-Service Enterprise FTL + PTL Suite
                      </span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 uppercase border border-cyan-500/30">
                        ₹2,000/mo (Enterprise Suite)
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      Direct Customer Bilties + Parcel Manifests + Own &amp; Market Hired Fleet enabled.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline">Included</span>
                </div>
              </div>
            )}

            {/* When only FTL is selected: Show all 3 sub-category options */}
            {transporterType === 'FTL' && (
              <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <span>👑</span>
                    FTL Operating Category (How your fleet operates):
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransporterSubType('FLEET_SUPPLIER');
                      setSelectedPlanId('basic');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      transporterSubType === 'FLEET_SUPPLIER'
                        ? 'border-purple-500 bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/40'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-bold text-xs truncate">🤝 Fleet Supplier</div>
                      <span
                        className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0 ${
                          transporterSubType === 'FLEET_SUPPLIER'
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        ₹500/mo
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-1 leading-snug ${
                        transporterSubType === 'FLEET_SUPPLIER'
                          ? 'text-purple-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Vendor / Provider to Other Transporters
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTransporterSubType('DIRECT_CARRIER');
                      setSelectedPlanId('basic');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      transporterSubType === 'DIRECT_CARRIER'
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-bold text-xs truncate">🏭 Direct Carrier</div>
                      <span
                        className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0 ${
                          transporterSubType === 'DIRECT_CARRIER'
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        ₹500/mo
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-1 leading-snug ${
                        transporterSubType === 'DIRECT_CARRIER'
                          ? 'text-indigo-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Direct Factory Bilties &amp; Corporate Contracts
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTransporterSubType('COMPLETE_FTL');
                      setSelectedPlanId('pro');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      transporterSubType === 'COMPLETE_FTL'
                        ? 'border-cyan-500 bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-400/40'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-bold text-xs truncate">🏢 Full-Service FTL</div>
                      <span
                        className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0 ${
                          transporterSubType === 'COMPLETE_FTL'
                            ? 'bg-white/20 text-white'
                            : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                        }`}
                      >
                        ₹1,000/mo
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-1 leading-snug ${
                        transporterSubType === 'COMPLETE_FTL'
                          ? 'text-cyan-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Customer Dockets + Own &amp; Market Hired Fleet
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button type="submit" className={`${BTN_PRIMARY} flex-1 h-11 text-[15px]`}>
                <span>Continue to Terminal &amp; Plan</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Branch Location, Subscription Plan & Submission */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmit} className="mt-2 space-y-3.5">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-50/50 dark:bg-[#07241c] p-2.5">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Step 3: Head Office Hub &amp; Subscription Plan
              </span>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Configure your primary dispatch terminal and select a 30-day free trial tier.
              </p>
            </div>

            {/* Head Office Branch Location & Pincode Detection */}
            <div className="rounded-xl border border-cyan-500/35 bg-slate-50/80 dark:bg-[#06172D] p-3 space-y-2 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#45607A] dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  Head Office Branch / Terminal
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      PIN Code (6 digits)
                    </label>
                    {pincodeLoading && (
                      <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Fetching...
                      </span>
                    )}
                  </div>
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
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. South Delhi"
                    className="mt-0.5 w-full h-8 px-2.5 rounded-lg border border-cyan-500/30 bg-white dark:bg-[#071324] text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    State
                  </label>
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
                    Auto-fetched Location:{' '}
                    <strong>
                      {[city, state].filter(Boolean).join(', ')}
                      {pincode ? ` · PIN ${pincode}` : ''}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Plan Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#45607A] dark:text-slate-400">
                  Select Subscription Plan (All include 30-Day Free Trial):
                </span>
                <div className="flex items-center gap-1.5">
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
                      <span
                        className={`rounded px-1 text-[9px] font-extrabold ${
                          billingCycle === 'ANNUAL'
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        -20%
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Plan Options */}
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
                      className={`flex flex-col items-center justify-center rounded-lg py-1 px-1 text-center transition-all duration-200 cursor-pointer ${
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

              {/* Cost summary note */}
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  Selected Plan:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{currentPlan.name}</strong>
                </span>
                <span className="flex items-center gap-1">
                  {currentPlan.id === 'trial' ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Free 30-day trial
                    </span>
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
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        billed monthly
                      </span>
                    </>
                  )}
                </span>
              </div>

              {transporterType === 'BOTH' && (
                <div className="px-1 text-[10.5px] font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5 pt-0.5">
                  <Zap className="h-3 w-3 shrink-0 text-cyan-500" />
                  <span>Enterprise Tier (₹2,000/mo) auto-selected for Both (FTL + PTL) Suite.</span>
                </div>
              )}
              {transporterType === 'FTL' && transporterSubType === 'COMPLETE_FTL' && (
                <div className="px-1 text-[10.5px] font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5 pt-0.5">
                  <Truck className="h-3 w-3 shrink-0 text-cyan-500" />
                  <span>Pro Tier (₹1,000/mo) auto-selected for Full-Service Dedicated FTL operations.</span>
                </div>
              )}
              {transporterType === 'PTL' && (
                <div className="px-1 text-[10.5px] font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5 pt-0.5">
                  <Boxes className="h-3 w-3 shrink-0 text-cyan-500" />
                  <span>Pro Tier (₹1,000/mo) auto-selected for Part-Load (PTL) / Sundry operations.</span>
                </div>
              )}
              {transporterType === 'FTL' && (transporterSubType === 'FLEET_SUPPLIER' || transporterSubType === 'DIRECT_CARRIER') && (
                <div className="px-1 text-[10.5px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-purple-500" />
                  <span>Basic Tier (₹500/mo) auto-selected for {transporterSubType === 'FLEET_SUPPLIER' ? 'Fleet Supplier' : 'Direct Carrier'}.</span>
                </div>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex cursor-pointer select-none items-start gap-2.5 text-[12.5px] leading-relaxed text-[#14203A] dark:text-slate-300 pt-1">
              <input
                type="checkbox"
                checked={formData.agreed}
                onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] border-[#C5CFDC] accent-[#0564D1]"
              />
              <span>
                I agree to TransHub&apos;s <strong className={BLUE_TEXT}>Terms of Service</strong> &amp;{' '}
                <strong className={BLUE_TEXT}>30-Day Free Trial Policy</strong>. No charge today.
              </span>
            </label>

            {/* Navigation & Submit buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`${BTN_PRIMARY} flex-1 h-11 text-[15px]`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Account…
                  </>
                ) : (
                  <>
                    <span>
                      {selectedPlanId === 'trial'
                        ? 'Complete & Start Free Trial'
                        : `Start 30-Day Trial (${currentPlan.name})`}
                    </span>
                    <Rocket className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

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
