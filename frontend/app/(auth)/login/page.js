// frontend/app/(auth)/login/page.js
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { BLUE_TEXT, BODY, BTN_PRIMARY, INPUT, NAVY } from '../../../components/site/ui';
import {
  AuthCard,
  AuthLayout,
  Divider,
  Field,
  Notice,
  SecurityNote,
  SocialButtons,
} from '../../../components/site/auth';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Truck,
  Users,
  Zap,
} from 'lucide-react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Demo accounts removed per request. Can be restored if needed:
// const DEMO_ACCOUNTS = [
//   { label: 'Fleet Owner', email: 'owner@abcroadways.com' },
//   { label: 'Dispatcher', email: 'dispatch@abcroadways.com' },
//   { label: 'Driver', email: 'driver@abcroadways.com' },
// ];

const SHOWCASE = {
  eyebrow: 'The modern transport management platform',
  title: 'Log in to a smarter, faster',
  accent: 'supply chain',
  subtitle:
    'Access your TransHub account and keep your operations moving — anytime, anywhere. Track, manage, and optimize your entire fleet in real-time.',
  chips: [
    { icon: BarChart3, label: 'Real-Time Visibility' },
    { icon: ShieldCheck, label: 'Enterprise Security' },
    { icon: Zap, label: 'AI-Powered Insights' },
  ],
  testimonial: {
    initials: 'RS',
    name: 'Rajesh Sharma',
    role: 'CEO, ABC Roadways',
    quote:
      'TransHub transformed our fleet operations. We reduced operational costs by 32% and improved delivery times across 200+ trucks.',
  },
  stats: [
    { icon: Truck, value: '10,000+', label: 'Deliveries Monthly' },
    { icon: Users, value: '500+', label: 'Trusted Customers' },
    { icon: ShieldCheck, value: '99.8%', label: 'Platform Uptime' },
  ],
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError && EMAIL_REGEX.test(val.trim())) {
      setEmailError(null);
    }
  };

  const handleEmailBlur = () => {
    const trimmed = email.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setEmailError('Enter a valid email');
    } else {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. you@company.com).');
      setEmailError('Invalid email');
      setLoading(false);
      return;
    }

    try {
      const user = await login(trimmedEmail, password);
      if (user?.roles?.includes('SUPER_ADMIN')) {
        router.push('/super-admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      header={{ prompt: 'New to TransHub?', ctaLabel: 'Create an account', ctaShortLabel: 'Sign up', ctaHref: '/register' }}
      showcase={SHOWCASE}
    >
      <AuthCard>
        <h2 className={`text-[26px] font-extrabold tracking-tight ${NAVY}`}>Welcome back</h2>
        <p className={`mt-1.5 text-sm ${BODY}`}>Sign in to your fleet operations, shipments &amp; billing</p>

        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="info">{info}</Notice>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <Field
            id="login-email"
            label={
              <span className="flex items-center justify-between">
                <span>Email address</span>
                {emailError && <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400">{emailError}</span>}
              </span>
            }
            icon={Mail}
            trailing={
              EMAIL_REGEX.test(email.trim()) ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : null
            }
          >
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="you@company.com"
              className={`${INPUT} pl-10 pr-9 ${
                emailError ? '!border-rose-500/70 focus:!border-rose-500 focus:!ring-rose-500/25' : ''
              }`}
            />
          </Field>

          <Field
            id="login-password"
            label="Password"
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
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`${INPUT} pl-10 pr-11`}
            />
          </Field>

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-[#14203A] dark:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded-[3px] border-[#C5CFDC] accent-[#0564D1]"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfo('Password reset link sent to registered email address in demo mode.');
              }}
              className={`text-sm font-semibold ${BLUE_TEXT} hover:underline`}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading} className={`${BTN_PRIMARY} h-11 w-full text-[15px]`}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>



        <Divider>Or continue with</Divider>
        <SocialButtons
          onSelect={(provider) => {
            setError(null);
            setInfo(`${provider} Single Sign-On triggered in demo mode.`);
          }}
        />

        <SecurityNote />
      </AuthCard>
    </AuthLayout>
  );
}
