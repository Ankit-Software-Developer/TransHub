// frontend/app/(owner)/bookings/[id]/page.js
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '../../../../services/api';
import { useTerminology } from '../../../../hooks/useTerminology';
import Sidebar from '../../../../components/layout/Sidebar';
import Navbar from '../../../../components/layout/Navbar';
import Badge from '../../../../components/ui/Badge';
import LoadingState from '../../../../components/ui/LoadingState';
import BiltyPrint from '../../../../components/documents/BiltyPrint';
import {
  Printer,
  ArrowLeft,
  Truck,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  Clock,
  FileCheck,
  ShieldAlert,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

function ConsignmentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { term } = useTerminology();

  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPrintMode, setShowPrintMode] = useState(false);

  useEffect(() => {
    if (searchParams?.get('print') === 'true') {
      setShowPrintMode(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/bookings/${params.id}`);
        if (res.data.success) {
          setConsignment(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load consignment', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchDetail();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <LoadingState
          title={`Loading ${term} details...`}
          description="Fetching shipment records, tracking timeline, and billing data"
          minHeight="min-h-[340px]"
        />
      </div>
    );
  }

  if (!consignment) {
    return (
      <div className="flex-1 p-8 text-center text-slate-500">
        {term} not found.
      </div>
    );
  }

  if (showPrintMode) {
    return (
      <BiltyPrint
        consignment={consignment}
        onBack={() => setShowPrintMode(false)}
      />
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline & Tracking' },
    { id: 'trip', label: 'Trip & Vehicle' },
    { id: 'pod', label: 'POD & Delivery' },
    { id: 'billing', label: 'Billing & Charges' },
  ];

  return (
    <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push('/bookings')}
          className="flex items-center space-x-1 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {term}s</span>
        </button>

        <button
          onClick={() => setShowPrintMode(true)}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print {term}</span>
        </button>
      </div>

      {/* Unified Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {consignment.lr_number}
              </h1>
              <Badge status={consignment.status} size="md" />
              <Badge status={consignment.payment_type} size="md" />
            </div>
            <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Booked: {consignment.booking_date}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{consignment.origin_city} → {consignment.destination_city}</span>
              </span>
              <span>•</span>
              <span>Origin: {consignment.originBranch?.branch_name}</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Freight</p>
            <p className="text-2xl font-black text-slate-900">₹{parseFloat(consignment.total_amount).toLocaleString('en-IN')}</p>
            <p className="text-xs text-slate-500">Weight: {consignment.charged_weight} KG | {consignment.packages_count} Pkgs</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-6 pt-4 border-b border-slate-100 text-sm font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shipper / Consignor</span>
            <h3 className="text-base font-bold text-slate-900 mt-1">{consignment.consignor?.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{consignment.consignor?.billing_address}</p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
              <p><span className="text-slate-500">Phone:</span> <span className="font-semibold">{consignment.consignor?.phone}</span></p>
              <p><span className="text-slate-500">GSTIN:</span> <span className="font-semibold">{consignment.consignor?.gstin || 'N/A'}</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consignee / Recipient</span>
            <h3 className="text-base font-bold text-slate-900 mt-1">{consignment.consignee?.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{consignment.consignee?.billing_address}</p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
              <p><span className="text-slate-500">Phone:</span> <span className="font-semibold">{consignment.consignee?.phone}</span></p>
              <p><span className="text-slate-500">GSTIN:</span> <span className="font-semibold">{consignment.consignee?.gstin || 'N/A'}</span></p>
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-card">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Commodity & Package Breakdown</h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y">
                <tr>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Package Type</th>
                  <th className="py-2 px-3">Quantity</th>
                  <th className="py-2 px-3 text-right">Actual Weight</th>
                  <th className="py-2 px-3 text-right">Charged Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-900">{consignment.material_description}</td>
                  <td className="py-3 px-3">{consignment.package_type}</td>
                  <td className="py-3 px-3 font-bold">{consignment.packages_count}</td>
                  <td className="py-3 px-3 text-right">{consignment.actual_weight} KG</td>
                  <td className="py-3 px-3 text-right font-bold text-blue-700">{consignment.charged_weight} KG</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-card">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Complete Movement Journey</h3>
          <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {consignment.statusHistory?.map((event, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-50"></div>
                <div>
                  <div className="flex items-center space-x-2">
                    <Badge status={event.status} size="xs" />
                    <span className="text-xs font-bold text-slate-800">{event.location}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{event.remarks}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Trip */}
      {activeTab === 'trip' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-card">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Assigned Line-Haul Trip</h3>
          {consignment.trips && consignment.trips.length > 0 ? (
            <div className="space-y-4">
              {consignment.trips.map((trip) => (
                <div key={trip.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-purple-100 text-purple-700">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{trip.trip_number}</p>
                      <p className="text-xs text-slate-600">Vehicle: <span className="font-semibold">{trip.vehicle?.vehicle_number}</span></p>
                      <p className="text-xs text-slate-600">Driver: <span className="font-semibold">{trip.driver?.name}</span></p>
                    </div>
                  </div>
                  <Badge status={trip.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Not yet assigned to any line haul dispatch trip.</p>
          )}
        </div>
      )}

      {/* Tab 4: POD */}
      {activeTab === 'pod' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-card">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Proof of Delivery (POD) Status</h3>
          {consignment.pod ? (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Proof of Delivery Received</span>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Receiver Sign-off: <span className="font-semibold">{consignment.pod.receiver_name}</span>
              </p>
              <div className="mt-4">
                <a
                  href={consignment.pod.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>View Signed POD Document</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">POD Pending</p>
              <p className="text-xs text-slate-500 mt-1">
                Material pending delivery or destination physical acknowledgment.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Billing */}
      {activeTab === 'billing' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-card">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Financial & Freight Breakdown</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Basic Freight Rate:</span>
                <span className="font-bold">₹{consignment.rate} / {consignment.rate_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Base Freight Amount:</span>
                <span className="font-bold">₹{consignment.freight_amount}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Loading Charges:</span>
                <span>₹{consignment.loading_charges}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Unloading Charges:</span>
                <span>₹{consignment.unloading_charges}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Hamali Charges:</span>
                <span>₹{consignment.hamali_charges}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Door Delivery Surcharge:</span>
                <span>₹{consignment.door_delivery_charges}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">GST ({consignment.tax_percent}%):</span>
                <span>₹{consignment.tax_amount}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-slate-900 text-sm">
                <span>Total Amount:</span>
                <span>₹{consignment.total_amount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ConsignmentDetailPage() {
  return (
    <div className="flex min-h-screen bg-[#F6F8FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading detail...</div>}>
          <ConsignmentDetailContent />
        </Suspense>
      </div>
    </div>
  );
}
