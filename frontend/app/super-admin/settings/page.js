// frontend/app/super-admin/settings/page.js
'use client';

import React, { useState } from 'react';
import { useTheme } from '../../../components/ThemeProvider';
import {
  Settings,
  ShieldCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [defaultTrialDays, setDefaultTrialDays] = useState('30');
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div
        className={`pb-6 border-b transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
            Global Configuration
          </span>
        </div>
        <h1
          className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 flex items-center gap-2.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          <span>Platform Plans &amp; SaaS Rules</span>
          <Settings className="w-7 h-7 text-amber-500 dark:text-amber-400" />
        </h1>
        <p
          className={`text-xs sm:text-sm mt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Manage trial lengths, tenant onboarding policies, and global SaaS feature gates.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Global platform settings updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Onboarding & Trial Rules */}
        <div
          className={`p-5 sm:p-6 rounded-3xl border space-y-4 transition-colors ${
            isDark ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h2
            className={`text-sm font-bold flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span>Transporter Onboarding &amp; Trial Rules</span>
          </h2>

          <div className="space-y-3.5">
            <div>
              <label
                className={`font-bold block mb-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Default Free Trial Duration (Days):
              </label>
              <input
                type="number"
                value={defaultTrialDays}
                onChange={(e) => setDefaultTrialDays(e.target.value)}
                className={`w-48 h-10 px-3.5 rounded-xl border font-mono font-bold focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#070C18] border-slate-700 text-white focus:border-amber-400'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                }`}
              />
              <p
                className={`text-[11px] mt-1 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                New transporters automatically receive this duration upon registration without needing a credit card.
              </p>
            </div>

            <div
              className={`pt-3.5 border-t flex items-center justify-between ${
                isDark ? 'border-slate-800/80' : 'border-slate-100'
              }`}
            >
              <div>
                <p
                  className={`font-bold ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Public Self-Registration
                </p>
                <p
                  className={`text-[11px] ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Allow any transporter to register from /register
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowSelfRegistration}
                onChange={(e) => setAllowSelfRegistration(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Global SaaS Plans Summary */}
        <div
          className={`p-5 sm:p-6 rounded-3xl border space-y-4 transition-colors ${
            isDark ? 'bg-[#0B1020]/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h2
            className={`text-sm font-bold flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <span>Active SaaS Subscription Tiers</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div
              className={`p-4 rounded-2xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-[#070C18]'
                  : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <div
                className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Basic Fleet
              </div>
              <div className="text-amber-500 dark:text-amber-400 font-extrabold text-sm mt-0.5">
                ₹500 / month
              </div>
              <div
                className={`text-[10.5px] mt-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Up to 5 Trucks · 1 Branch
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border transition-colors ${
                isDark
                  ? 'border-amber-500/40 bg-[#070C18]'
                  : 'border-amber-300 bg-amber-50/40'
              }`}
            >
              <div
                className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Pro Multimodal (Default)
              </div>
              <div className="text-amber-500 dark:text-amber-400 font-extrabold text-sm mt-0.5">
                ₹1,000 / month
              </div>
              <div
                className={`text-[10.5px] mt-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Up to 25 Trucks · 5 Branches
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-[#070C18]'
                  : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <div
                className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Enterprise Cargo
              </div>
              <div className="text-amber-500 dark:text-amber-400 font-extrabold text-sm mt-0.5">
                ₹2,000 / month
              </div>
              <div
                className={`text-[10.5px] mt-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Unlimited Trucks &amp; API
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-md shadow-amber-500/20 cursor-pointer"
        >
          Save Platform Configuration
        </button>
      </form>
    </div>
  );
}
