// frontend/app/(owner)/layout.js
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '../../store/useStore';

export default function OwnerRouteGuardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useStore();
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
      <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono tracking-wider text-cyan-400">Verifying authorized access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
