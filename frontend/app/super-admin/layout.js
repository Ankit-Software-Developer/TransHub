// frontend/app/super-admin/layout.js
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../components/ThemeProvider';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import SuperAdminNavbar from '../../components/layout/SuperAdminNavbar';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !loading) {
      router.replace('/login?redirect=/super-admin/dashboard');
      return;
    }

    const isSuper =
      user?.email?.toLowerCase() === 'admin@transporter.io' ||
      user?.role === 'SUPER_ADMIN' ||
      user?.roles?.includes('SUPER_ADMIN') ||
      user?.accountType === 'SUPER_ADMIN' ||
      Boolean(user?.isSuperAdmin);

    if (isSuper) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
    setChecking(false);
  }, [user, isAuthenticated, loading, router]);

  if (loading || checking) {
    return (
      <LoadingScreen
        message="Verifying SaaS Super-Admin Privileges..."
        subMessage="Validating master cluster access token"
        fullScreen={true}
      />
    );
  }

  if (!isAuthorized) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors ${
          isDark ? 'bg-[#070C18] text-white' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-5 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black mb-2">Restricted Access</h2>
        <p
          className={`text-sm max-w-md mb-6 leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          The SaaS Super-Admin Console is strictly reserved for platform administrators. Normal transporter accounts cannot access this area.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-blue-600/30 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Transporter Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen antialiased transition-colors selection:bg-amber-500 selection:text-slate-950 ${
        isDark ? 'bg-[#070C18] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* SuperAdmin Sidebar with Light and Dark mode */}
      <SuperAdminSidebar />

      {/* Main Right Content Panel with Top SuperAdmin Navbar */}
      <div className="flex-1 flex flex-col min-w-0">
        <SuperAdminNavbar />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
