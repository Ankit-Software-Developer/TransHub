// frontend/components/documents/BiltyPrint.js
'use client';

import React from 'react';
import { Printer, Download, Share2, ArrowLeft } from 'lucide-react';

export default function BiltyPrint({ consignment, onBack }) {
  if (!consignment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto my-6 bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
      {/* Top Action Bar (hidden on print) */}
      <div className="no-print flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Docket (LR / Bilty)</span>
          </button>
        </div>
      </div>

      {/* Printable Bilty Layout */}
      <div className="border-2 border-slate-900 p-6 text-slate-900 font-sans">
        {/* Header: Transporter Profile */}
        <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-blue-900">
                ABC ROADWAYS PVT LTD
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Fleet Owners, Nationwide Transport Contractors & Forwarding Agents
            </p>
            <p className="text-xs text-slate-600">
              Plot 42, Transport Nagar, GT Road, Delhi - 110042 | Phone: +91 11 4567 8900
            </p>
            <p className="text-xs font-bold text-slate-800">
              GSTIN: 07AAACA1234A1Z5 | PAN: AAACA1234A
            </p>
          </div>

          <div className="text-right">
            <div className="inline-block bg-slate-900 text-white px-3 py-1 font-bold text-sm tracking-wider uppercase rounded">
              CONSIGNMENT DOCKET (LR / BILTY)
            </div>
            <div className="mt-2 text-base font-black text-blue-900">
              Docket No. (LR / Bilty): {consignment.docket_number || consignment.lr_number}
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Date: {consignment.booking_date}
            </div>
          </div>
        </div>

        {/* Route Row: From, To, Payment Type */}
        <div className="grid grid-cols-3 border-b-2 border-slate-900 py-2.5 bg-slate-50 text-xs font-bold">
          <div>
            <span className="text-slate-500 font-normal">FROM (Origin):</span>{' '}
            <span className="text-sm font-black uppercase">{consignment.origin_city}</span>
          </div>
          <div className="text-center">
            <span className="text-slate-500 font-normal">TO (Destination):</span>{' '}
            <span className="text-sm font-black uppercase">{consignment.destination_city}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-normal">PAYMENT:</span>{' '}
            <span className="text-sm font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded">
              {consignment.payment_type}
            </span>
          </div>
        </div>

        {/* Consignor & Consignee Columns */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900 divide-x-2 divide-slate-900">
          {/* Consignor */}
          <div className="p-3 text-xs space-y-1">
            <p className="font-bold uppercase text-slate-500 text-[10px]">CONSIGNOR (Booking Party)</p>
            <p className="font-black text-sm text-slate-900">{consignment.consignor?.name}</p>
            <p className="text-slate-600">{consignment.consignor?.billing_address || consignment.pickup_address}</p>
            <p className="font-semibold">Phone: {consignment.consignor?.phone}</p>
            <p className="font-bold">GSTIN: {consignment.consignor?.gstin || 'UNREGISTERED'}</p>
          </div>

          {/* Consignee */}
          <div className="p-3 text-xs space-y-1">
            <p className="font-bold uppercase text-slate-500 text-[10px]">CONSIGNEE (Delivery Party)</p>
            <p className="font-black text-sm text-slate-900">{consignment.consignee?.name}</p>
            <p className="text-slate-600">{consignment.consignee?.billing_address || consignment.delivery_address}</p>
            <p className="font-semibold">Phone: {consignment.consignee?.phone}</p>
            <p className="font-bold">GSTIN: {consignment.consignee?.gstin || 'UNREGISTERED'}</p>
          </div>
        </div>

        {/* Invoice & E-Way Bill Bar */}
        <div className="grid grid-cols-3 border-b-2 border-slate-900 p-2.5 text-xs bg-slate-50 font-medium">
          <div>
            <span className="text-slate-500">Invoice No:</span>{' '}
            <span className="font-bold">{consignment.invoice_no || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500">E-Way Bill:</span>{' '}
            <span className="font-bold">{consignment.eway_bill_no || 'N/A'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Declared Value:</span>{' '}
            <span className="font-bold">₹{parseFloat(consignment.invoice_value || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Material & Freight Table */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900 divide-x-2 divide-slate-900 min-h-[160px]">
          {/* Left: Goods Description */}
          <div className="col-span-7 p-3 text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-500 uppercase text-[10px]">
                  <th className="pb-1">Packages</th>
                  <th className="pb-1">Description of Cargo</th>
                  <th className="pb-1 text-right">Actual Wt</th>
                  <th className="pb-1 text-right">Charged Wt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pt-2 font-bold">{consignment.packages_count} {consignment.package_type}</td>
                  <td className="pt-2 font-semibold text-slate-800">{consignment.material_description}</td>
                  <td className="pt-2 text-right font-medium">{consignment.actual_weight} KG</td>
                  <td className="pt-2 text-right font-bold">{consignment.charged_weight} KG</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right: Freight Charges Breakdown */}
          <div className="col-span-5 p-3 text-xs bg-slate-50/50 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Basic Freight (Rate ₹{consignment.rate}):</span>
              <span className="font-semibold">₹{consignment.freight_amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Loading Charges:</span>
              <span>₹{consignment.loading_charges}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Unloading Charges:</span>
              <span>₹{consignment.unloading_charges}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Hamali / Labour:</span>
              <span>₹{consignment.hamali_charges}</span>
            </div>
            {parseFloat(consignment.door_delivery_charges) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Door Delivery:</span>
                <span>₹{consignment.door_delivery_charges}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">GST ({consignment.tax_percent}%):</span>
              <span>₹{consignment.tax_amount}</span>
            </div>
            <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between font-black text-sm text-slate-900">
              <span>TOTAL AMOUNT:</span>
              <span className="text-base font-black">₹{consignment.total_amount}</span>
            </div>
          </div>
        </div>

        {/* Footer & Signatures */}
        <div className="pt-4 grid grid-cols-3 text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800 uppercase text-[10px]">Terms & Conditions</p>
            <p className="text-[9px] leading-tight text-slate-500 mt-1">
              1. Goods carried at owner’s risk unless insured.<br />
              2. Demurrage charged after 48 hrs of arrival.<br />
              3. Disputes subject to Delhi jurisdiction only.
            </p>
          </div>
          <div className="text-center pt-8">
            <div className="border-t border-slate-400 mx-6 pt-1 text-[10px] font-semibold">
              Consignor Signature
            </div>
          </div>
          <div className="text-right pt-8">
            <div className="border-t border-slate-400 ml-6 pt-1 text-[10px] font-bold text-slate-900">
              For ABC Roadways Pvt Ltd (Authorised Signatory)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
