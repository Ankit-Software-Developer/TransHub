// frontend/components/layout/HelpModal.js
'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeProvider';
import {
  X,
  HelpCircle,
  Search,
  BookOpen,
  Phone,
  MessageCircle,
  Mail,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Truck,
  FileText,
  Send,
  Receipt,
  Keyboard,
  CheckCircle2,
  Sparkles,
  LifeBuoy,
  Clock
} from 'lucide-react';

const FAQS = [
  {
    category: 'Bookings & Dockets',
    question: 'How do I issue a manual or auto-numbered Docket (LR / Bilty)?',
    answer: 'Navigate to Dockets (LR / Bilty) in the sidebar and click "+ Create Docket". You can choose Auto-Generate Series or enter a manual serial number. Enter consignor and consignee details, weight, package description, and freight amount, then click "Create Consignment".',
  },
  {
    category: 'Bookings & Dockets',
    question: 'Can I print or download a digital consignment copy?',
    answer: 'Yes! From the Dockets table, click the print or download icon on any consignment row to instantly generate a standard GST-compliant 3-copy transport bilty (Driver, Consignor, Consignee).',
  },
  {
    category: 'Fleet & Dispatches',
    question: 'How does Load Planning & Vehicle Dispatch work?',
    answer: 'Go to Load Planning, select an available truck from your fleet, and allocate consignments waiting at the hub. Once capacity is optimized, click "Generate Manifest & Gate Pass" to dispatch the vehicle onto the highway radar.',
  },
  {
    category: 'Roles & Access',
    question: 'How do I configure staff permissions and create custom roles?',
    answer: 'Only Transport Admins can access Settings > Roles & Permissions. You can toggle granular rights (View, Create, Edit, Delete, Approve, Export) for system roles (Admin, Branch Manager, Driver) or create unlimited custom operational roles with permission cloning.',
  },
  {
    category: 'Invoicing & POD',
    question: 'How do I reconcile POD (Proof of Delivery) and generate tax invoices?',
    answer: 'Drivers upload digital POD photos via the driver portal. Hub managers verify them under Deliveries & POD. Once marked "Verified", freight invoices can be issued with one click under Invoices & Billing.',
  },
  {
    category: 'System & Tracking',
    question: 'How often does live Control Tower GPS radar refresh?',
    answer: 'Control Tower radar streams live coordinates from telemetry devices and driver GPS every 5 seconds. In-transit vehicles automatically show corridor waypoints, current speed, and toll gate passes.',
  },
];

const GUIDES = [
  {
    title: 'Consignment & Booking Lifecycle',
    icon: FileText,
    steps: [
      'Create Docket with consignor/consignee GSTIN & parcel weights',
      'Assign to Branch Hub Godown intake',
      'Allocate to Load Plan truck manifest',
      'Generate Road Gate Pass & Highway E-Way Bill',
    ],
  },
  {
    title: 'Trip Dispatch & GPS Radar Tracking',
    icon: Truck,
    steps: [
      'Assign vehicle & driver with initial diesel advance',
      'Track live transit milestones on Control Tower Radar',
      'Driver logs toll receipts & en-route vouchers',
      'Close trip sheet at destination hub for final settlement',
    ],
  },
  {
    title: 'Roles & Staff Permission Administration',
    icon: ShieldCheck,
    steps: [
      'Open Settings > Roles & Permissions',
      'Select a system role (Admin, Branch Manager, Driver) or create custom role',
      'Use "Grant All", "Revoke All", or customize module permissions',
      'Click "Save Changes" to apply real-time authorization access',
    ],
  },
  {
    title: 'Invoicing & Freight Cash Reconciliation',
    icon: Receipt,
    steps: [
      'Inspect verified Proof of Delivery (POD) signatures',
      'Generate GST Tax Invoice with freight charges & loading fees',
      'Record customer payments (NEFT, RTGS, Cheque, Cash)',
      'Export financial ledger to Tally / Excel audit reports',
    ],
  },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Open Global Quick Search (Dockets, Trucks, Trips)' },
  { keys: ['Esc'], desc: 'Close any active modal, drawer, or dropdown' },
  { keys: ['Ctrl', 'B'], desc: 'Create new Consignment Docket shortcut' },
  { keys: ['Ctrl', 'Shift', 'L'], desc: 'Toggle Dark / Light theme mode' },
];

export default function HelpModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('faq'); // 'faq' | 'guides' | 'support' | 'shortcuts'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(0);

  // Ticket form state
  const [ticketForm, setTicketForm] = useState({ subject: '', category: 'Technical Issue', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSuccess(true);
      setTicketForm({ subject: '', category: 'Technical Issue', message: '' });
      setTimeout(() => setTicketSuccess(false), 5000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Dialog Container */}
      <div
        className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 transform scale-100 ${
          isDark
            ? 'bg-[#090D18] border-slate-800 text-slate-100 shadow-blue-950/40'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className={`p-5 sm:p-6 border-b shrink-0 flex items-center justify-between ${
          isDark ? 'border-slate-800/80 bg-slate-950/70' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
              <LifeBuoy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Help & Operational Support Desk</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 font-mono">
                  24/7 Live
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Operational playbooks, knowledgebase, keyboard shortcuts & dispatch hotline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Close Help Center (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-5 py-2.5 border-b flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs ${
          isDark ? 'border-slate-800/60 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'faq'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQs & Answers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'guides'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Workflow Guides</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'support'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Direct Support & Helpline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'shortcuts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: FAQS */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search transport procedures, billing questions, bilty numbering..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-2.5">
                {filteredFaqs.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No matching answers found for &ldquo;{searchQuery}&rdquo;. Try browsing Workflow Guides or Contact Support.
                  </div>
                ) : (
                  filteredFaqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isExpanded
                            ? isDark
                              ? 'border-blue-500/40 bg-blue-950/20'
                              : 'border-blue-200 bg-blue-50/40 shadow-xs'
                            : isDark
                            ? 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono shrink-0 ${
                              isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'
                            }`}>
                              {faq.category}
                            </span>
                            <span className="text-xs sm:text-sm font-bold leading-snug">
                              {faq.question}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-blue-500' : ''
                          }`} />
                        </button>

                        {isExpanded && (
                          <div className={`px-4 pb-4 pt-1 text-xs sm:text-sm leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            <p>{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WORKFLOW GUIDES */}
          {activeTab === 'guides' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GUIDES.map((guide, idx) => {
                const IconComponent = guide.icon;
                return (
                  <div
                    key={idx}
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 transition-all ${
                      isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold tracking-tight">
                        {guide.title}
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {guide.steps.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2.5 text-xs">
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-mono text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: DIRECT SUPPORT & HELPLINE */}
          {activeTab === 'support' && (
            <div className="space-y-5">
              {/* Quick Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <Phone className="w-5 h-5 text-emerald-500 mx-auto" />
                  <div className="text-xs font-bold">Toll-Free Helpline</div>
                  <div className="text-xs font-mono font-semibold text-emerald-500">1800 266 8726</div>
                  <div className="text-[10px] text-slate-400">Available 24x7 all corridors</div>
                </div>

                <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <MessageCircle className="w-5 h-5 text-blue-500 mx-auto" />
                  <div className="text-xs font-bold">WhatsApp Dispatch</div>
                  <div className="text-xs font-mono font-semibold text-blue-500">+91 98200 12345</div>
                  <div className="text-[10px] text-slate-400">Instant driver GPS assistance</div>
                </div>

                <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <Mail className="w-5 h-5 text-purple-500 mx-auto" />
                  <div className="text-xs font-bold">Priority Tech Email</div>
                  <div className="text-xs font-mono font-semibold text-purple-500">ops@transhub.in</div>
                  <div className="text-[10px] text-slate-400">&lt; 15 min SLA for billing/API</div>
                </div>
              </div>

              {/* In-Modal Ticket / Dispatch Query Form */}
              <div className={`p-5 rounded-2xl border space-y-3.5 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold">Submit Support Request to Central Command</h3>
                  </div>
                  {ticketSuccess && (
                    <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ticket #TH-8941 Logged!</span>
                    </span>
                  )}
                </div>

                <form onSubmit={handleTicketSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Category
                      </label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="Technical Issue">Technical & System Issue</option>
                        <option value="Bilty / Docket Query">Bilty / Docket Numbering Question</option>
                        <option value="Fleet GPS Radar">GPS Vehicle Radar Offline</option>
                        <option value="GST Billing & Invoices">GST Billing & Invoicing Discrepancy</option>
                        <option value="Account & Permissions">Staff Roles & Permissions</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Summary / Subject *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Docket printing alignment issue on HP deskjet"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                      </input>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Detailed Operational Message *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe the issue, vehicle number, docket series, or specific error message..."
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Dispatching Ticket...' : 'Dispatch Ticket to Support'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Speed up operational workflows using universal keyboard shortcuts anywhere in the TransHub portal:
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {SHORTCUTS.map((sc, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                      isDark ? 'hover:bg-slate-900/40 bg-slate-900/20' : 'hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {sc.desc}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border shadow-2xs ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 text-slate-200'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`p-4 border-t shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
          isDark ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Central Transport Cloud Engine: v4.8.2 Online</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
