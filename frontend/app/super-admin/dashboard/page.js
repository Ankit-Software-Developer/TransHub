// frontend/app/(super-admin)/dashboard/page.js
'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import StatCard from '../../../components/ui/StatCard';
import {
  ShieldCheck,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText
} from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminMetrics = async () => {
      try {
        const res = await api.get('/dashboard/super-admin');
        if (res.data.success) {
          setMetrics(res.data.data.metrics);
        }
      } catch (err) {
        console.error('Failed to load Super Admin dashboard', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminMetrics();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F6F8FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-amber-500" />
                <span>SaaS Platform Super-Admin Console</span>
              </h1>
              <p className="text-xs text-slate-500">
                Multi-tenant operating control, subscription billings, MRR / ARR tracking, and enterprise quotas
              </p>
            </div>
          </div>

          {/* Section 6: SaaS Platform Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Transporters"
              value={metrics?.totalOrganizations || 1}
              subtext="Active Enterprises"
              icon={Building2}
              color="blue"
            />
            <StatCard
              title="Total Branches"
              value={metrics?.totalBranches || 4}
              subtext="Nationwide Hubs"
              icon={Building2}
              color="purple"
            />
            <StatCard
              title="Consignments"
              value={metrics?.totalConsignments || 105}
              subtext="Platform Dockets"
              icon={FileText}
              color="emerald"
            />
            <StatCard
              title="Active Tenants"
              value={metrics?.activeTransporters || 1}
              subtext="Paid Licenses"
              icon={Users}
              color="slate"
            />
            <StatCard
              title="Monthly MRR"
              value={`₹${((metrics?.mrr || 99990) / 1000).toFixed(1)}k`}
              subtext="Recurring"
              icon={CreditCard}
              color="amber"
            />
            <StatCard
              title="Annual ARR"
              value={`₹${(((metrics?.arr || 1199880)) / 100000).toFixed(2)}L`}
              subtext="Projected Run-rate"
              icon={TrendingUp}
              color="emerald"
            />
          </div>

          {/* SaaS Organizations Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Registered Transport Enterprises & Tenancy Status
            </h2>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500">Organization</span>
                <p className="text-base font-bold text-slate-900">ABC Roadways Pvt Ltd</p>
                <p className="text-xs text-slate-500">GST: 07AAACA1234A1Z5 • 4 Regional Branches (DEL, PNP, JAI, BOM)</p>
              </div>

              <div className="text-right">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded">
                  BUSINESS ENTERPRISE PLAN
                </span>
                <p className="text-xs font-bold text-emerald-600 mt-1">Status: ACTIVE • Unlimited Usage</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
