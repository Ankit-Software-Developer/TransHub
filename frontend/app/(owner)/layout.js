// frontend/app/(owner)/layout.js
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { usePermissions } from '../../hooks/usePermissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import LoadingScreen from '../../components/ui/LoadingScreen';

export default function OwnerRouteGuardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useStore();
  const { canAccessRoute } = usePermissions();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthentication = () => {
      try {
        const token = localStorage.getItem('transporter_access_token');
        const storedUserStr = localStorage.getItem('transporter_user');

        if (!token || !storedUserStr) {
          setIsAuthenticated(false);
          setIsChecking(false);
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        const parsedUser = JSON.parse(storedUserStr);
        if (!user) {
          setUser(parsedUser);
        }

        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem('transporter_access_token');
        localStorage.removeItem('transporter_refresh_token');
        localStorage.removeItem('transporter_user');
        setIsAuthenticated(false);
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthentication();
  }, [pathname, router, setUser, user]);

  if (isChecking || !isAuthenticated) {
    return (
      <LoadingScreen
        message="Verifying Authorized Access..."
        subMessage="Authenticating credentials with transport security cluster"
        fullScreen={true}
      />
    );
  }

  // Permission access check for current route
  const hasAccess = canAccessRoute(pathname);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#090D18] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Your assigned role in this transport organization does not have permission to access the{' '}
          <span className="text-cyan-400 font-mono font-semibold">{pathname}</span> module. Please contact your transport administrator if you require access.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-md shadow-blue-600/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
