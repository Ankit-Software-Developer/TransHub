// frontend/app/(owner)/bookings/new/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../services/api';
import { useTerminology } from '../../../../hooks/useTerminology';
import { useStore } from '../../../../store/useStore';
import Sidebar from '../../../../components/layout/Sidebar';
import Navbar from '../../../../components/layout/Navbar';
import {
  FileText,
  Save,
  Printer,
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function NewBookingPage() {
  const router = useRouter();
  const { term } = useTerminology();
  const activeBranch = useStore((state) => state.activeBranch);

  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docketSeriesPreview, setDocketSeriesPreview] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    docket_number: '',
    branch_id: '',
    dest_branch_id: '',
    booking_date: new Date().toISOString().slice(0, 10),
    origin_city: 'Delhi',
    destination_city: 'Mumbai',
    consignor_id: '',
    consignee_id: '',
    material_description: '',
    packages_count: 1,
    package_type: 'Carton Boxes',
    actual_weight: 100,
    charged_weight: 100,
    rate_type: 'PER_KG',
    rate: 8.50,
    freight_amount: 850,
    loading_charges: 200,
    unloading_charges: 200,
    handling_charges: 0,
    hamali_charges: 100,
    door_delivery_charges: 0,
    other_charges: 0,
    tax_percent: 5,
    tax_amount: 67.50,
    discount_amount: 0,
    total_amount: 1417.50,
    payment_type: 'TO_PAY',
    delivery_type: 'GODOWN_DELIVERY',
    invoice_no: '',
    invoice_value: 50000,
    eway_bill_no: '',
    booking_remarks: '',
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [branchRes, custRes, seriesRes] = await Promise.all([
          api.get('/organizations/branches'),
          api.get('/customers?limit=100'),
          api.get('/organizations/docket-series').catch(() => null),
        ]);
        if (seriesRes?.data?.success && seriesRes.data.data) {
          setDocketSeriesPreview(seriesRes.data.data);
        }
        if (branchRes.data.success) {
          setBranches(branchRes.data.data);
          if (branchRes.data.data.length > 0) {
            const defBranch = activeBranch?.id || branchRes.data.data[0].id;
            const dest = branchRes.data.data.length > 1 ? branchRes.data.data[1].id : branchRes.data.data[0].id;
            setFormData((prev) => ({
              ...prev,
              branch_id: defBranch,
              dest_branch_id: dest,
              origin_city: branchRes.data.data.find(b => b.id === defBranch)?.city || prev.origin_city,
              destination_city: branchRes.data.data.find(b => b.id === dest)?.city || prev.destination_city,
            }));
          }
        }
        if (custRes.data.success) {
          setCustomers(custRes.data.data);
          if (custRes.data.data.length >= 2) {
            setFormData((prev) => ({
              ...prev,
              consignor_id: custRes.data.data[0].id,
              consignee_id: custRes.data.data[1].id,
            }));
          }
        }
      } catch (err) {
        console.error('Master data load failed', err);
      }
    };

    fetchMasterData();
  }, [activeBranch]);

  // Recalculate freight totals on change
  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      const chargedWt = parseFloat(field === 'charged_weight' ? value : updated.charged_weight || 0);
      const pkgs = parseInt(field === 'packages_count' ? value : updated.packages_count || 1, 10);
      const rateVal = parseFloat(field === 'rate' ? value : updated.rate || 0);

      let calcFreight = parseFloat(updated.freight_amount || 0);
      if (['rate', 'charged_weight', 'packages_count', 'rate_type'].includes(field)) {
        if (updated.rate_type === 'PER_PACKAGE') {
          calcFreight = pkgs * rateVal;
        } else {
          calcFreight = chargedWt * rateVal;
        }
        updated.freight_amount = parseFloat(calcFreight.toFixed(2));
      }

      const load = parseFloat(updated.loading_charges || 0);
      const unload = parseFloat(updated.unloading_charges || 0);
      const handling = parseFloat(updated.handling_charges || 0);
      const hamali = parseFloat(updated.hamali_charges || 0);
      const door = parseFloat(updated.door_delivery_charges || 0);
      const other = parseFloat(updated.other_charges || 0);
      const discount = parseFloat(updated.discount_amount || 0);

      const sub = calcFreight + load + unload + handling + hamali + door + other;
      const taxable = Math.max(0, sub - discount);
      const taxRate = parseFloat(updated.tax_percent || 0);
      const tax = (taxable * taxRate) / 100;
      const total = taxable + tax;

      updated.tax_amount = parseFloat(tax.toFixed(2));
      updated.total_amount = parseFloat(total.toFixed(2));

      return updated;
    });
  };

  const handleSubmit = async (shouldPrint = false) => {
    setLoading(true);
    setError(null);
    try {
      const customNum = formData.docket_number ? formData.docket_number.trim().toUpperCase() : undefined;
      const payload = {
        ...formData,
        docket_number: customNum || undefined,
        lr_number: customNum || undefined,
      };
      const res = await api.post('/bookings', payload);
      if (res.data.success) {
        const createdId = res.data.data.id;
        if (shouldPrint) {
          router.push(`/bookings/${createdId}?print=true`);
        } else {
          router.push(`/bookings/${createdId}`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F6F8FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Link
                href="/bookings"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  New Digital {term} Entry
                </h1>
                <p className="text-xs text-slate-500">
                  Rapid consignment docket generator modeled after physical Bilty registers
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(false)}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save {term}</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Save & Print</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Digital Bilty Register Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
            {/* Section 1: Route & Branch Configuration */}
            <div className="p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>1. Route & Branch Particulars</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Docket Number (LR / Bilty)</span>
                    <span className="text-[10px] text-blue-600 font-bold">
                      {docketSeriesPreview?.nextNumber ? `Next: ${docketSeriesPreview.nextNumber}` : 'Auto / Manual'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.docket_number}
                    onChange={(e) => handleChange('docket_number', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-semibold"
                    placeholder={docketSeriesPreview?.nextNumber ? `Auto (${docketSeriesPreview.nextNumber}) or Manual No.` : "Auto or enter physical No."}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Leave blank to auto-generate sequentially.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Booking Branch *
                  </label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => {
                      const b = branches.find(item => item.id === e.target.value);
                      handleChange('branch_id', e.target.value);
                      if (b) handleChange('origin_city', b.city);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    <option value="">{branches.length === 0 ? '-- No branches added yet (Add Branch first) --' : '-- Select Origin Branch --'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Branch
                  </label>
                  <select
                    value={formData.dest_branch_id}
                    onChange={(e) => {
                      const b = branches.find(item => item.id === e.target.value);
                      handleChange('dest_branch_id', e.target.value);
                      if (b) handleChange('destination_city', b.city);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  >
                    <option value="">{branches.length === 0 ? '-- No branches added yet (Add Branch first) --' : '-- Select Destination Branch --'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Origin Station *
                  </label>
                  <input
                    type="text"
                    value={formData.origin_city}
                    onChange={(e) => handleChange('origin_city', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Delhi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Station *
                  </label>
                  <input
                    type="text"
                    value={formData.destination_city}
                    onChange={(e) => handleChange('destination_city', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Mumbai"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Consignor & Consignee */}
            <div className="p-6 bg-slate-50/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>2. Consignor & Consignee Parties</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    CONSIGNOR (Shipper / Sender) *
                  </label>
                  <select
                    value={formData.consignor_id}
                    onChange={(e) => handleChange('consignor_id', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold mb-2"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    value={formData.pickup_address}
                    onChange={(e) => handleChange('pickup_address', e.target.value)}
                    placeholder="Specific pickup address / factory gate..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    CONSIGNEE (Receiver / Recipient) *
                  </label>
                  <select
                    value={formData.consignee_id}
                    onChange={(e) => handleChange('consignee_id', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold mb-2"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    value={formData.delivery_address}
                    onChange={(e) => handleChange('delivery_address', e.target.value)}
                    placeholder="Specific delivery godown / site address..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Cargo Details, Packages & Weights */}
            <div className="p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>3. Material Specifications & Weights</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Material / Commodity Description *
                  </label>
                  <input
                    type="text"
                    value={formData.material_description}
                    onChange={(e) => handleChange('material_description', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    placeholder="e.g. Electrical Goods / Ceramic Tiles"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Packages Count *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.packages_count}
                    onChange={(e) => handleChange('packages_count', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Actual Weight (KG)
                  </label>
                  <input
                    type="number"
                    value={formData.actual_weight}
                    onChange={(e) => handleChange('actual_weight', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Charged Weight (KG) *
                  </label>
                  <input
                    type="number"
                    value={formData.charged_weight}
                    onChange={(e) => handleChange('charged_weight', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-blue-700"
                  />
                </div>
              </div>

              {/* Statutory: Invoice & E-Way Bill */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Invoice No
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_no}
                    onChange={(e) => handleChange('invoice_no', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="INV-99238"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Declared Invoice Value (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.invoice_value}
                    onChange={(e) => handleChange('invoice_value', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-Way Bill Number
                  </label>
                  <input
                    type="text"
                    value={formData.eway_bill_no}
                    onChange={(e) => handleChange('eway_bill_no', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="371089234120"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Freight Charges & Billing */}
            <div className="p-6 bg-slate-50/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>4. Freight Charges & Payment Mode</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Type *
                  </label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) => handleChange('payment_type', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-900"
                  >
                    <option value="TO_PAY">TO PAY (Destination Collect)</option>
                    <option value="PAID">PAID (Origin Paid)</option>
                    <option value="TBB">TBB (To Be Billed)</option>
                    <option value="CREDIT">CREDIT</option>
                    <option value="FOC">FOC (Free Of Cost)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rate per KG / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => handleChange('rate', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Basic Freight (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.freight_amount}
                    onChange={(e) => handleChange('freight_amount', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loading / Hamali (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.loading_charges}
                    onChange={(e) => handleChange('loading_charges', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">TOTAL FREIGHT & CHARGES (INC. TAX):</span>
                  <p className="text-2xl font-black text-white">₹{formData.total_amount}</p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    Save {term}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
                  >
                    Save & Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
