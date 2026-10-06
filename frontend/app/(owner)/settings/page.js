// frontend/app/(owner)/settings/page.js
'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useStore } from '../../../store/useStore';
import { useTerminology } from '../../../hooks/useTerminology';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import {
  Settings,
  Building2,
  FileText,
  CheckCircle2,
  Save,
  Globe,
  DollarSign
} from 'lucide-react';

export default function SettingsPage() {
  const { user, terminology, setTerminology } = useStore();
  const { term } = useTerminology();

  const [selectedTerm, setSelectedTerm] = useState(terminology || 'Bilty');
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/organizations/profile');
        if (res.data.success) {
          setProfile(res.data.data);
          setSelectedTerm(res.data.data.document_terminology || 'Bilty');
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveTerminology = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await api.patch('/organizations/terminology', {
        terminology: selectedTerm,
      });
      if (res.data.success) {
        setTerminology(selectedTerm);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const options = ['Bilty', 'LR', 'GR', 'Docket', 'Consignment Note'];

  return (
    <div className="flex min-h-screen bg-[#F6F8FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Organization & System Settings
            </h1>
            <p className="text-xs text-slate-500">
              Configure company profile, branch structures, and document naming conventions
            </p>
          </div>

          {/* Section 12: Terminology Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
            <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Document Terminology Preference</h2>
                <p className="text-xs text-slate-500">
                  Different transport regions use distinct names. Changing this dynamically adapts all UI buttons, titles, and print layouts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {options.map((opt) => (
                <div
                  key={opt}
                  onClick={() => setSelectedTerm(opt)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTerm === opt
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900">{opt}</span>
                    {selectedTerm === opt && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-500">
                    Use &quot;{opt}&quot; throughout forms, reports, and navbar
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                {savedSuccess && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Updated! Current UI label is now &quot;{selectedTerm}&quot;</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveTerminology}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Updating...' : 'Save Terminology'}</span>
              </button>
            </div>
          </div>

          {/* Organization Legal Information */}
          {profile && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
              <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
                <Building2 className="w-5 h-5 text-purple-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Transport Enterprise Profile</h2>
                  <p className="text-xs text-slate-500">Tax registration and registered head office</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Business Name:</span>
                  <p className="text-sm font-bold text-slate-900">{profile.business_name}</p>
                </div>
                <div>
                  <span className="text-slate-500">GSTIN:</span>
                  <p className="text-sm font-bold text-slate-900">{profile.gstin}</p>
                </div>
                <div>
                  <span className="text-slate-500">PAN:</span>
                  <p className="text-sm font-bold text-slate-900">{profile.pan}</p>
                </div>
                <div>
                  <span className="text-slate-500">Operating Currency:</span>
                  <p className="text-sm font-bold text-slate-900">{profile.currency} (₹)</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Head Office Address:</span>
                  <p className="text-sm text-slate-800 font-medium">{profile.address}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
