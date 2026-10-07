// frontend/app/(owner)/reports/page.js
'use client';

import React, { useState } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTerminology } from '../../../hooks/useTerminology';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  DollarSign,
  Truck,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function ReportsPage() {
  const { term, plural } = useTerminology();
  const { canExport } = usePermissions();

  const reportCards = [
    {
      title: `${plural} & Freight Register`,
      description: `Comprehensive export of all booked ${plural.toLowerCase()}, charged weight, freight revenue, and payment types.`,
      icon: FileText,
      color: 'blue',
      endpoint: '/bookings',
    },
    {
      title: 'Customer Outstanding & Ageing',
      description: 'Receivables ageing schedule (0-30, 31-60, 61-90, 90+ days) and unpaid invoices.',
      icon: TrendingUp,
      color: 'red',
      endpoint: '/billing/invoices?status=GENERATED',
    },
    {
      title: 'Line-Haul Trip & Settlement Audit',
      description: 'Trip kilometers, vehicle revenue, diesel expenses, FASTag tolls, and driver advance reconciliations.',
      icon: Truck,
      color: 'purple',
      endpoint: '/trips',
    },
    {
      title: 'Proof of Delivery (POD) Compliance',
      description: 'Detailed audit of delivered consignments, receiver signatures, and pending POD verification.',
      icon: FileSpreadsheet,
      color: 'emerald',
      endpoint: '/pods',
    },
  ];

  const handleDownloadCsv = (reportTitle) => {
    alert(`Generating and downloading live CSV export for "${reportTitle}"...`);
  };

  return (
    <div className="flex min-h-screen bg-[#F6F8FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Reports & Operational Analytics
              </h1>
              <p className="text-xs text-slate-500">
                Generate audited commercial statements, tax registers, and exportable business spreadsheets
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportCards.map((r, idx) => {
              const Icon = r.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">{r.title}</h2>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6">
                      {r.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Export Formats: CSV / Excel / PDF</span>
                    {canExport ? (
                      <button
                        onClick={() => handleDownloadCsv(r.title)}
                        className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download CSV</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">View only</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
