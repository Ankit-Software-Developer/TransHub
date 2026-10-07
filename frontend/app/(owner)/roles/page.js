// frontend/app/(owner)/roles/page.js
'use client';

import React from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import RolePermissionMatrix from '../../../components/roles/RolePermissionMatrix';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RolesAndPermissionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin, canManageRoles } = usePermissions();

  if (!canManageRoles) {
    return (
      <div className={`flex min-h-screen ${isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-4 ${
              isDark ? 'bg-[#0B1020] border-slate-800' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold">Administrator Access Required</h2>
              <p className="text-xs text-slate-400">
                Only transport organization administrators can configure system roles and assign functional permissions.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto w-full">
          <div className={`p-5 sm:p-7 rounded-3xl border shadow-xl ${
            isDark
              ? 'border-slate-800/90 bg-[#070b16] text-white shadow-2xl'
              : 'border-slate-200 bg-white text-slate-900 shadow-sm'
          }`}>
            <RolePermissionMatrix />
          </div>
        </main>
      </div>
    </div>
  );
}
