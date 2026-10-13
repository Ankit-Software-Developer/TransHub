// frontend/app/(owner)/billing/invoices/page.js
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from '../../../../components/layout/Sidebar';
import Navbar from '../../../../components/layout/Navbar';
import DataTable from '../../../../components/ui/DataTable';
import { useTheme } from '../../../../components/ThemeProvider';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useStore } from '../../../../store/useStore';
import { useTerminology } from '../../../../hooks/useTerminology';
import api from '../../../../services/api';
import billingService from '../../../../services/billingService';
import {
  Receipt,
  Plus,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  Building2,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Printer,
  CreditCard,
  FileCheck2,
  PieChart,
  Eye,
  SlidersHorizontal,
  X,
  FileText,
  Check,
  Share2,
  MessageSquare,
  Mail,
  AlertCircle,
  Truck,
  Building,
  ShieldCheck,
  Percent,
  MapPin,
  RefreshCw,
  FolderOpen,
  CheckSquare,
  Square,
  Layers,
  Zap,
  Banknote,
  ChevronDown
} from 'lucide-react';

export default function InvoicesMasterPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport, isAdmin, canCreateInvoice, canCreatePayment } = usePermissions();

  // Settings & Terminology from Zustand Store & useTerminology hook
  const { terminology: storeTerminology, user, activeBranch, setTerminology } = useStore();
  const terminologyHook = useTerminology();
  const [orgProfile, setOrgProfile] = useState(null);

  // Dynamic Terminology according to Transporter Settings (Docket / Bilty / LR / GR / Consignment Note)
  const activeTerm = orgProfile?.document_terminology || storeTerminology || terminologyHook.term || 'Docket';
  const termSingular = activeTerm;
  const termPlural = useMemo(() => {
    if (activeTerm === 'Bilty') return 'Bilties';
    if (activeTerm === 'LR') return 'LRs';
    if (activeTerm === 'GR') return 'GRs';
    if (activeTerm === 'Docket') return 'Dockets';
    if (activeTerm === 'Consignment Note') return 'Consignment Notes';
    return terminologyHook.plural || `${activeTerm}s`;
  }, [activeTerm, terminologyHook.plural]);
  const termLower = activeTerm.toLowerCase();
  const termPluralLower = termPlural.toLowerCase();
  const docNumberLabel = `${activeTerm} Number`;

  // Dynamic Transporter Details strictly configured in Settings
  const transporterDetails = useMemo(() => {
    const businessName =
      orgProfile?.business_name ||
      orgProfile?.legal_name ||
      user?.organizationName ||
      user?.businessName ||
      user?.organization?.name ||
      (typeof window !== 'undefined' ? localStorage.getItem('transporter_brand_name') : null) ||
      'Transport Agency';

    const tagline =
      orgProfile?.settings?.tagline ||
      orgProfile?.tagline ||
      user?.tagline ||
      'Logistics & Goods Transport Agency (GTA)';

    const address =
      orgProfile?.address ||
      orgProfile?.settings?.address ||
      'Registered Operations Hub';

    const city = orgProfile?.city || orgProfile?.settings?.city || '';
    const state = orgProfile?.state || orgProfile?.settings?.state || '';
    const pincode = orgProfile?.pincode || orgProfile?.settings?.pincode || '';
    const fullAddress = [address, city, state, pincode].filter(Boolean).join(', ');

    const phone = orgProfile?.phone || orgProfile?.settings?.phone || user?.phone || '';
    const email = orgProfile?.email || orgProfile?.settings?.email || user?.email || '';
    const gstin = orgProfile?.gstin || orgProfile?.settings?.gstin || user?.gstin || user?.organization?.gst_number || '';
    const pan = orgProfile?.pan || orgProfile?.settings?.pan || user?.pan || '';
    const sacCode = orgProfile?.settings?.sacCode || orgProfile?.sac_code || '9965';

    const bankName =
      orgProfile?.settings?.bankName ||
      orgProfile?.bank_name ||
      '';

    const accountNumber =
      orgProfile?.settings?.accountNumber ||
      orgProfile?.account_number ||
      '';

    const ifscCode =
      orgProfile?.settings?.ifscCode ||
      orgProfile?.ifsc_code ||
      '';

    const bankBranch =
      orgProfile?.settings?.bankBranch ||
      orgProfile?.bank_branch ||
      '';

    return {
      businessName,
      tagline,
      address,
      city,
      state,
      pincode,
      fullAddress,
      phone,
      email,
      gstin,
      pan,
      sacCode,
      bankName,
      accountNumber,
      ifscCode,
      bankBranch,
    };
  }, [orgProfile, user]);

  // Pure Database State (Zero Dummy Data)
  const [invoices, setInvoices] = useState([]);
  const [unbilledConsignments, setUnbilledConsignments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [onlyBranchesWithDockets, setOnlyBranchesWithDockets] = useState(false);
  const branchDropdownRef = useRef(null);

  // Close branch dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    if (isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBranchDropdownOpen]);

  const [customersList, setCustomersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Main View Navigation: 'UNBILLED' (Delivered / Pending Invoicing Dockets) | 'INVOICES' (Tax Invoices)
  const [activeTab, setActiveTab] = useState('UNBILLED');
  const [unbilledSearch, setUnbilledSearch] = useState('');
  const [unbilledFilter, setUnbilledFilter] = useState('ALL'); // Default to All Delivered Dockets ready to Bill
  const [showPendingTransit, setShowPendingTransit] = useState(false); // Strict: Only show completed deliveries (POD uploaded)

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [printModalInvoice, setPrintModalInvoice] = useState(null);

  // Helper to open Print Modal with safe string formatting for customer & branch
  const openPrintModal = (invoice) => {
    if (!invoice) return;
    const custName = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer?.name || invoice.customer_name || 'Customer Account');
    const custGstin = typeof invoice.gstin === 'string'
      ? invoice.gstin
      : (invoice.customer?.gstin || invoice.customer_gstin || 'URP');
    const delBranch = typeof invoice.delivery_branch === 'string'
      ? invoice.delivery_branch
      : (invoice.delivery_branch?.branch_name || invoice.branch?.branch_name || 'Destination Branch');
    setPrintModalInvoice({
      ...invoice,
      customer: custName,
      customer_name: custName,
      gstin: custGstin,
      delivery_branch: delBranch
    });
  };
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isTdsModalOpen, setIsTdsModalOpen] = useState(false);

  // Extend / Edit Due Date Modal state
  const [editDueDateModalInvoice, setEditDueDateModalInvoice] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [editDueRemarks, setEditDueRemarks] = useState('');
  const [isUpdatingDueDate, setIsUpdatingDueDate] = useState(false);

  // Cancel / Void Invoice Modal state
  const [cancelModalInvoice, setCancelModalInvoice] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancellingInvoice, setIsCancellingInvoice] = useState(false);

  // Form states for Generate Invoice
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLrIds, setSelectedLrIds] = useState([]);
  const [wizardPaymentFilter, setWizardPaymentFilter] = useState('TBB'); // Default to TBB credit dockets
  const [onlyDeliveredPod, setOnlyDeliveredPod] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [creditDays, setCreditDays] = useState(30);
  const [taxRate, setTaxRate] = useState(5.0);
  const [isRcm, setIsRcm] = useState(false);
  const [extraCharges, setExtraCharges] = useState(0);
  const [invoiceRemarks, setInvoiceRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Modal state
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [tdsDeducted, setTdsDeducted] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('NEFT');
  const [utrNumber, setUtrNumber] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Context-Aware Row Actions Modal State
  const [collectFreightModalDocket, setCollectFreightModalDocket] = useState(null);
  const [collectFreightForm, setCollectFreightForm] = useState({
    paymentMethod: 'CASH',
    paymentRef: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    remarks: 'Counter delivery collection',
  });
  const [quickBillModalDocket, setQuickBillModalDocket] = useState(null);
  const [quickBillCreditDays, setQuickBillCreditDays] = useState(30);
  const [quickBillInvoiceDate, setQuickBillInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [podModalDocket, setPodModalDocket] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Transporter Profile & Database Records
  const loadDatabaseRecords = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch organization profile, invoices, unbilled consignments, customers, and branches concurrently
      const [profileRes, invRes, unbilledRes, custList, branchesRes] = await Promise.allSettled([
        api.get('/organizations/profile'),
        billingService.listInvoices({ limit: 100 }),
        billingService.getUnbilledConsignments(),
        billingService.getCustomers(),
        api.get('/branches?all=true')
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data?.data) {
        const org = profileRes.value.data.data;
        setOrgProfile(org);
        if (org.document_terminology) {
          setTerminology(org.document_terminology);
        }
        if (org.settings?.bankName || org.bank_name) {
          setBankName(org.settings?.bankName || org.bank_name);
        }
      }

      if (branchesRes.status === 'fulfilled' && branchesRes.value?.data) {
        const bData = branchesRes.value.data.data;
        const bList = Array.isArray(bData)
          ? bData
          : Array.isArray(bData?.rows)
          ? bData.rows
          : [];
        setBranches(bList);

        // Pre-select user's active branch if available
        const uBranchCode = user?.branchCode || user?.branch_code || user?.branch?.branch_code || (activeBranch?.code && activeBranch.code !== 'ALL' ? activeBranch.code : null);
        const uBranchId = user?.branchId || user?.branch_id || user?.branch?.id || (activeBranch?.id && activeBranch.code !== 'ALL' ? activeBranch.id : null);
        if (uBranchCode || uBranchId) {
          const matchedBranch = bList.find((b) =>
            (uBranchId && String(b.id) === String(uBranchId)) ||
            (uBranchCode && (b.branch_code || '').trim().toUpperCase() === String(uBranchCode).trim().toUpperCase())
          );
          if (matchedBranch) {
            setBranchFilter(matchedBranch.id);
          } else if (uBranchId) {
            setBranchFilter(uBranchId);
          }
        }
      }

      const rawUnbilledList = unbilledRes.status === 'fulfilled' && Array.isArray(unbilledRes.value) ? unbilledRes.value : [];
      const consignmentPaymentMap = new Map();
      rawUnbilledList.forEach((ub) => {
        if (ub.payment_type) {
          if (ub.id) consignmentPaymentMap.set(String(ub.id), ub.payment_type);
          if (ub.lr_number) consignmentPaymentMap.set(String(ub.lr_number).trim().toUpperCase(), ub.payment_type);
          if (ub.docket_number) consignmentPaymentMap.set(String(ub.docket_number).trim().toUpperCase(), ub.payment_type);
        }
      });

      const rawInvoices = invRes.status === 'fulfilled'
        ? (Array.isArray(invRes.value?.data)
            ? invRes.value.data
            : Array.isArray(invRes.value?.data?.rows)
            ? invRes.value.data.rows
            : Array.isArray(invRes.value?.data?.data)
            ? invRes.value.data.data
            : [])
        : [];

      if (rawInvoices.length > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const rows = rawInvoices.map((row) => {
          const bal = parseFloat(row.balance_amount || 0);
          const paid = parseFloat(row.paid_amount || 0);
          const isCancelled = row.status === 'CANCELLED';
          const isPaid = bal === 0 && !isCancelled;
          const isOverdue = !isCancelled && bal > 0 && row.due_date && row.due_date < todayStr;
          const isPartial = !isCancelled && paid > 0 && bal > 0;

          // Days difference calculation
          let daysDiff = 0;
          if (row.due_date) {
            const d1 = new Date(todayStr);
            const d2 = new Date(row.due_date);
            daysDiff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
          }

          let displayStatus = row.computed_status || row.status;
          let statusTone = 'amber';
          let statusLabel = 'Unpaid';

          if (isCancelled) {
            displayStatus = 'CANCELLED';
            statusTone = 'slate';
            statusLabel = 'Cancelled';
          } else if (isPaid) {
            displayStatus = 'PAID';
            statusTone = 'emerald';
            statusLabel = 'Paid & Cleared';
          } else if (isOverdue) {
            displayStatus = 'OVERDUE';
            statusTone = 'rose';
            statusLabel = `Overdue (${Math.abs(daysDiff)}d)`;
          } else if (isPartial) {
            displayStatus = 'PARTIAL';
            statusTone = 'cyan';
            statusLabel = 'Partially Paid';
          } else {
            displayStatus = 'PENDING';
            statusTone = 'amber';
            statusLabel = daysDiff === 0 ? 'Due Today' : `Due in ${daysDiff}d`;
          }

          const itemDockets = (row.items || [])
            .map((it) => it.consignment?.docket_number || it.consignment?.lr_number || it.docket_number || it.lr_number)
            .filter(Boolean);
          const rawDockets = row.docket_numbers && Array.isArray(row.docket_numbers) && row.docket_numbers.length > 0
            ? row.docket_numbers
            : itemDockets;
          const uniqueDockets = Array.from(new Set(rawDockets));

          const itemTypes = (row.items || [])
            .map((it) => {
              const docNum = it.consignment?.docket_number || it.consignment?.lr_number || it.lr_number;
              return it.payment_type ||
                it.consignment?.payment_type ||
                (it.consignment_id && consignmentPaymentMap.get(String(it.consignment_id))) ||
                (it.lr_number && consignmentPaymentMap.get(String(it.lr_number).trim().toUpperCase())) ||
                (docNum && consignmentPaymentMap.get(String(docNum).trim().toUpperCase()));
            })
            .filter(Boolean);

          if (itemTypes.length === 0 && uniqueDockets.length > 0) {
            uniqueDockets.forEach((dn) => {
              const matchedType = consignmentPaymentMap.get(String(dn).trim().toUpperCase());
              if (matchedType) itemTypes.push(matchedType);
            });
          }

          const uniqueTypes = Array.from(new Set(itemTypes));
          const primaryDocketType = (row.docket_type && row.docket_type !== 'TBB')
            ? row.docket_type
            : (uniqueTypes[0] || row.docket_type || row.payment_type || 'TO_PAY');

          return {
            id: row.id,
            invoice_number: row.invoice_number,
            customer_id: row.customer_id,
            customer: typeof row.customer === 'string' ? row.customer : (row.customer?.name || 'Customer Account'),
            gstin: typeof row.customer === 'object' ? (row.customer?.gstin || row.gstin || 'URP') : (row.gstin || 'URP'),
            customer_phone: typeof row.customer === 'object' ? (row.customer?.phone || row.customer_phone || '') : (row.customer_phone || ''),
            customer_balance: parseFloat(row.customer_balance || row.customer?.current_balance || 0),
            booking_branch: typeof row.booking_branch === 'string' ? row.booking_branch : (row.items?.[0]?.consignment?.originBranch?.branch_name || row.branch?.branch_name || 'Booking Branch'),
            booking_branch_code: row.booking_branch_code || row.items?.[0]?.consignment?.originBranch?.branch_code || row.branch?.branch_code || '',
            delivery_branch: typeof row.delivery_branch === 'string' ? row.delivery_branch : (row.items?.[0]?.consignment?.destBranch?.branch_name || row.items?.[0]?.destination_city || 'Destination Branch'),
            delivery_branch_code: row.delivery_branch_code || row.items?.[0]?.consignment?.destBranch?.branch_code || '',
            invoice_date: row.invoice_date,
            due_date: row.due_date,
            days_diff: daysDiff,
            payment_terms: row.payment_terms || '30 Days Credit',
            remarks: row.remarks || '',
            taxable_amount: parseFloat(row.taxable_amount || 0),
            gst_amount: parseFloat(row.total_tax_amount || 0),
            total_amount: parseFloat(row.total_amount || 0),
            paid_amount: paid,
            balance_amount: bal,
            status: displayStatus,
            status_label: statusLabel,
            status_tone: statusTone,
            lr_count: row.lr_count || (row.items && row.items.length) || uniqueDockets.length || 0,
            docket_numbers: uniqueDockets,
            docket_number: uniqueDockets[0] || row.docket_number || (row.items?.[0]?.lr_number) || '',
            docket_summary: uniqueDockets.join(', ') || row.docket_summary || (row.items?.[0]?.lr_number) || '',
            docket_type: primaryDocketType,
            docket_types: uniqueTypes.length > 0 ? uniqueTypes : (row.docket_types || [primaryDocketType]),
            items: row.items || []
          };
        });
        setInvoices(rows);
      } else {
        setInvoices([]);
      }

      const unbilledList = rawUnbilledList.map((c) => {
        const cName = typeof c.customer === 'string'
          ? c.customer
          : (c.customer?.name || c.consignor?.name || c.consignee?.name || 'Customer Account');
        const consigneeName = typeof c.consignee === 'string'
          ? c.consignee
          : (c.consignee?.name || 'Receiver');
        const consignorName = typeof c.consignor === 'string'
          ? c.consignor
          : (c.consignor?.name || cName);
        return {
          ...c,
          customer: cName,
          consignor_name: consignorName,
          consignee_name: consigneeName
        };
      });
      setUnbilledConsignments(unbilledList);

      // Auto-default to Unbilled Dockets view if no invoices have been generated yet
      const rowsCount = rawInvoices.length;
      if (rowsCount === 0 && unbilledList.length > 0) {
        setActiveTab('UNBILLED');
      }

      if (custList.status === 'fulfilled' && Array.isArray(custList.value)) {
        setCustomersList(custList.value);
        if (custList.value.length > 0 && !selectedCustomerId) {
          // Prioritize customer with unbilled TBB dockets first, or any unbilled dockets
          const customerWithTbb = custList.value.find((c) =>
            unbilledList.some(
              (ub) => (ub.consignor_id === c.id || ub.consignee_id === c.id) && ub.payment_type === 'TBB'
            )
          );
          const customerWithUnbilled = custList.value.find((c) =>
            unbilledList.some((ub) => ub.consignor_id === c.id || ub.consignee_id === c.id)
          );
          setSelectedCustomerId(customerWithTbb?.id || customerWithUnbilled?.id || custList.value[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to query database:', err);
      setInvoices([]);
      setUnbilledConsignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseRecords();
  }, []);

  // Server-side dynamic query when unbilled search input changes
  useEffect(() => {
    if (!unbilledSearch.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const results = await billingService.getUnbilledConsignments({ search: unbilledSearch.trim() });
        if (Array.isArray(results)) {
          const mapped = results.map((c) => {
            const cName = typeof c.customer === 'string'
              ? c.customer
              : (c.customer?.name || c.consignor?.name || c.consignee?.name || 'Customer Account');
            const consigneeName = typeof c.consignee === 'string'
              ? c.consignee
              : (c.consignee?.name || 'Receiver');
            const consignorName = typeof c.consignor === 'string'
              ? c.consignor
              : (c.consignor?.name || cName);
            return {
              ...c,
              customer: cName,
              consignor_name: consignorName,
              consignee_name: consigneeName,
            };
          });
          setUnbilledConsignments((prev) => {
            const existingIds = new Set(mapped.map((m) => String(m.id || m.lr_number)));
            const nonDuplicates = prev.filter((p) => !existingIds.has(String(p.id || p.lr_number)));
            return [...mapped, ...nonDuplicates];
          });
        }
      } catch (err) {
        console.warn('Server unbilled search error:', err.message);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [unbilledSearch]);

  // Server-side dynamic query when invoice search changes
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const results = await billingService.listInvoices({ search: search.trim(), limit: 100 });
        const rows = Array.isArray(results?.data)
          ? results.data
          : Array.isArray(results?.data?.rows)
          ? results.data.rows
          : Array.isArray(results?.data?.data)
          ? results.data.data
          : [];
        if (rows.length > 0) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const decorated = rows.map((row) => {
            const bal = parseFloat(row.balance_amount || 0);
            const paid = parseFloat(row.paid_amount || 0);
            const isCancelled = row.status === 'CANCELLED';
            const isPaid = bal === 0 && !isCancelled;
            const isOverdue = !isCancelled && bal > 0 && row.due_date && row.due_date < todayStr;
            const isPartial = !isCancelled && paid > 0 && bal > 0;
            let daysDiff = 0;
            if (row.due_date) {
              const d1 = new Date(todayStr);
              const d2 = new Date(row.due_date);
              daysDiff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
            }
            let displayStatus = row.computed_status || row.status;
            let statusTone = 'amber';
            let statusLabel = 'Unpaid';
            if (isCancelled) {
              displayStatus = 'CANCELLED';
              statusTone = 'slate';
              statusLabel = 'Cancelled';
            } else if (isPaid) {
              displayStatus = 'PAID';
              statusTone = 'emerald';
              statusLabel = 'Paid & Cleared';
            } else if (isOverdue) {
              displayStatus = 'OVERDUE';
              statusTone = 'rose';
              statusLabel = `Overdue (${Math.abs(daysDiff)}d)`;
            } else if (isPartial) {
              displayStatus = 'PARTIAL';
              statusTone = 'cyan';
              statusLabel = 'Partially Paid';
            } else {
              displayStatus = 'PENDING';
              statusTone = 'amber';
              statusLabel = daysDiff === 0 ? 'Due Today' : `Due in ${daysDiff}d`;
            }
            const itemDockets = (row.items || [])
              .map((it) => it.consignment?.docket_number || it.consignment?.lr_number || it.docket_number || it.lr_number)
              .filter(Boolean);
            const rawDockets = row.docket_numbers && Array.isArray(row.docket_numbers) && row.docket_numbers.length > 0
              ? row.docket_numbers
              : itemDockets;
            const uniqueDockets = Array.from(new Set(rawDockets));
            return {
              id: row.id,
              invoice_number: row.invoice_number,
              customer_id: row.customer_id,
              customer: typeof row.customer === 'string' ? row.customer : (row.customer?.name || 'Customer Account'),
              gstin: typeof row.customer === 'object' ? (row.customer?.gstin || row.gstin || 'URP') : (row.gstin || 'URP'),
              customer_phone: typeof row.customer === 'object' ? (row.customer?.phone || row.customer_phone || '') : (row.customer_phone || ''),
              customer_balance: parseFloat(row.customer_balance || row.customer?.current_balance || 0),
              booking_branch: typeof row.booking_branch === 'string' ? row.booking_branch : (row.items?.[0]?.consignment?.originBranch?.branch_name || row.branch?.branch_name || 'Booking Branch'),
              booking_branch_code: row.booking_branch_code || row.items?.[0]?.consignment?.originBranch?.branch_code || row.branch?.branch_code || '',
              delivery_branch: typeof row.delivery_branch === 'string' ? row.delivery_branch : (row.items?.[0]?.consignment?.destBranch?.branch_name || row.items?.[0]?.destination_city || 'Destination Branch'),
              delivery_branch_code: row.delivery_branch_code || row.items?.[0]?.consignment?.destBranch?.branch_code || '',
              invoice_date: row.invoice_date,
              due_date: row.due_date,
              days_diff: daysDiff,
              payment_terms: row.payment_terms || '30 Days Credit',
              remarks: row.remarks || '',
              taxable_amount: parseFloat(row.taxable_amount || 0),
              gst_amount: parseFloat(row.total_tax_amount || 0),
              total_amount: parseFloat(row.total_amount || 0),
              paid_amount: paid,
              balance_amount: bal,
              status: displayStatus,
              status_label: statusLabel,
              status_tone: statusTone,
              lr_count: row.lr_count || (row.items && row.items.length) || uniqueDockets.length || 0,
              docket_numbers: uniqueDockets,
              docket_number: uniqueDockets[0] || row.docket_number || (row.items?.[0]?.lr_number) || '',
              docket_summary: uniqueDockets.join(', ') || row.docket_summary || (row.items?.[0]?.lr_number) || '',
              docket_type: row.docket_type || 'TO_PAY',
              docket_types: row.docket_types || [row.docket_type || 'TO_PAY'],
              items: row.items || [],
            };
          });
          setInvoices((prev) => {
            const existingIds = new Set(decorated.map((d) => String(d.id)));
            const nonDuplicates = prev.filter((p) => !existingIds.has(String(p.id)));
            return [...decorated, ...nonDuplicates];
          });
        }
      } catch (err) {
        console.warn('Server invoice search error:', err.message);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Admin & Branch Scoping Resolution
  const isUserAdmin = Boolean(
    isAdmin ||
    ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(user?.role?.toUpperCase()) ||
    user?.is_owner ||
    user?.isAdmin ||
    (Array.isArray(user?.permissions) && user.permissions.includes('*'))
  );

  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || (activeBranch?.id && activeBranch.code !== 'ALL' ? activeBranch.id : null);
  const userBranchCode = user?.branchCode || user?.branch_code || user?.branch?.branch_code || (activeBranch?.code && activeBranch.code !== 'ALL' ? activeBranch.code : null);
  const userBranchName = user?.branchName || user?.branch_name || user?.branch?.branch_name || (activeBranch?.name && activeBranch.name !== 'All Branches' ? activeBranch.name : null);

  const userBranch = useMemo(() => {
    if (user?.branch) return user.branch;
    if (userBranchId && branches.length > 0) {
      const found = branches.find((b) => String(b.id) === String(userBranchId));
      if (found) return found;
    }
    if (userBranchCode && branches.length > 0) {
      const found = branches.find((b) => (b.branch_code || '').trim().toUpperCase() === String(userBranchCode).trim().toUpperCase());
      if (found) return found;
    }
    if (branches.length > 0 && userBranchCode) {
      const found = branches.find((b) => (b.branch_code || '').trim().toUpperCase() === 'BOKD');
      if (found) return found;
    }
    return null;
  }, [user, userBranchId, userBranchCode, branches]);

  // Helper to determine if a docket/consignment is related to a branch (either booking origin OR delivery destination)
  // Helper to determine if a docket/consignment is related to a branch based on Indian transport billing rules:
  // - TO_PAY: Only billed/collected at the Delivery Branch (destination).
  // - PAID: Billed/collected upfront at the Booking Branch (origin).
  // - TBB: Billed on credit to Shipper (origin) or Consignee (destination).
  const isDocketRelatedToBranch = (c, branch) => {
    if (!branch) return true;
    const bId = branch.id ? String(branch.id) : null;
    const bCode = (branch.branch_code || '').trim().toLowerCase();
    const bName = (branch.branch_name || '').trim().toLowerCase();
    const bCity = (branch.city || '').trim().toLowerCase();

    const cOrigId = c.origin_branch_id || c.booking_branch_id || c.originBranch?.id;
    const cDestId = c.dest_branch_id || c.destination_branch_id || c.destBranch?.id;

    const cOrigCode = (c.originBranch?.branch_code || '').trim().toLowerCase();
    const cDestCode = (c.destBranch?.branch_code || '').trim().toLowerCase();

    const cOrigCity = (c.origin_city || c.originBranch?.city || '').trim().toLowerCase();
    const cDestCity = (c.destination_city || c.destBranch?.city || '').trim().toLowerCase();

    const cOrigName = (c.originBranch?.branch_name || c.booking_branch || '').trim().toLowerCase();
    const cDestName = (c.destBranch?.branch_name || c.delivery_branch || '').trim().toLowerCase();

    // Metro region resolution
    const isDelhiBranch = /delhi|okhla/i.test(bCity) || /delhi|okhla/i.test(bName) || /del|bokd/i.test(bCode);
    const isBlrBranch = /bengaluru|bangalore/i.test(bCity) || /bengaluru|bangalore/i.test(bName) || /blr/i.test(bCode);
    const isBomBranch = /mumbai|thane|navi mumbai|bhiwandi/i.test(bCity) || /mumbai/i.test(bName) || /bom/i.test(bCode);

    const matchesOrigin = Boolean(
      (bId && cOrigId && String(cOrigId) === bId) ||
      (bCode && (cOrigCode === bCode || (c.booking_branch && c.booking_branch.toLowerCase().includes(bCode)))) ||
      (bCity && cOrigCity && (cOrigCity === bCity || cOrigCity.includes(bCity) || bCity.includes(cOrigCity))) ||
      (bName && cOrigName && (cOrigName.includes(bName) || bName.includes(cOrigName))) ||
      (isDelhiBranch && (/delhi|okhla/i.test(cOrigCity) || /delhi|okhla/i.test(c.booking_branch || ''))) ||
      (isBlrBranch && (/bengaluru|bangalore/i.test(cOrigCity) || /bengaluru|bangalore/i.test(c.booking_branch || ''))) ||
      (isBomBranch && (/mumbai|thane|navi mumbai|bhiwandi/i.test(cOrigCity) || /mumbai/i.test(c.booking_branch || '')))
    );

    const matchesDestination = Boolean(
      (bId && cDestId && String(cDestId) === bId) ||
      (bCode && (cDestCode === bCode || (c.delivery_branch && c.delivery_branch.toLowerCase().includes(bCode)))) ||
      (bCity && cDestCity && (cDestCity === bCity || cDestCity.includes(bCity) || bCity.includes(cDestCity))) ||
      (bName && cDestName && (cDestName.includes(bName) || bName.includes(cDestName))) ||
      (isDelhiBranch && (/delhi|okhla/i.test(cDestCity) || /delhi|okhla/i.test(c.delivery_branch || ''))) ||
      (isBlrBranch && (/bengaluru|bangalore/i.test(cDestCity) || /bengaluru|bangalore/i.test(c.delivery_branch || ''))) ||
      (isBomBranch && (/mumbai|thane|navi mumbai|bhiwandi/i.test(cDestCity) || /mumbai/i.test(c.delivery_branch || '')))
    );

    // Business Logic for Transport Billing:
    // If user is non-admin staff (strictly restricted to their assigned branch):
    if (!isUserAdmin) {
      if (c.payment_type === 'TO_PAY') return matchesDestination;
      if (c.payment_type === 'PAID') return matchesOrigin;
      if (c.payment_type === 'TBB') return matchesOrigin;
    }

    // For Admin Network Access & general branch scope: matches if origin OR destination is this branch
    return matchesOrigin || matchesDestination;
  };

  // Helper to check if an invoice is related to a branch (origin, destination, or issuing branch)
  const isInvoiceRelatedToBranch = (inv, branch) => {
    if (!branch || !inv) return true;
    const bId = String(branch.id || branch._id || '');
    const bCode = (branch.branch_code || '').trim().toLowerCase();
    const bCity = (branch.city || '').trim().toLowerCase();
    const bName = (branch.branch_name || '').trim().toLowerCase();

    // 1. Direct invoice branch match
    if (bId && (String(inv.branch_id) === bId || String(inv.branch?.id) === bId)) return true;
    if (bCode && inv.branch?.branch_code && inv.branch.branch_code.trim().toLowerCase() === bCode) return true;

    // 2. Booking / Origin Branch match
    const invBCode = (inv.booking_branch_code || '').trim().toLowerCase();
    const invBName = (inv.booking_branch || '').trim().toLowerCase();
    if (bCode && invBCode && (invBCode === bCode || invBCode.includes(bCode) || bCode.includes(invBCode))) return true;
    if (bName && invBName && (invBName.includes(bName) || bName.includes(invBName))) return true;
    if (bCity && invBName && invBName.includes(bCity)) return true;

    // 3. Delivery / Destination Branch match
    const invDCode = (inv.delivery_branch_code || '').trim().toLowerCase();
    const invDName = (inv.delivery_branch || '').trim().toLowerCase();
    if (bCode && invDCode && (invDCode === bCode || invDCode.includes(bCode) || bCode.includes(invDCode))) return true;
    if (bName && invDName && (invDName.includes(bName) || bName.includes(invDName))) return true;
    if (bCity && invDName && invDName.includes(bCity)) return true;

    // 4. City match
    if (bCity && inv.customer?.city && inv.customer.city.trim().toLowerCase() === bCity) return true;

    // 5. Consignment items match
    if (Array.isArray(inv.items)) {
      const itemMatch = inv.items.some((it) => {
        const c = it.consignment || it;
        const cOrigId = String(c.origin_branch_id || c.booking_branch_id || c.originBranch?.id || '');
        const cDestId = String(c.dest_branch_id || c.delivery_branch_id || c.destBranch?.id || '');
        if (bId && (cOrigId === bId || cDestId === bId)) return true;
        const cOrigCode = (c.origin_branch_code || c.originBranch?.branch_code || '').trim().toLowerCase();
        const cDestCode = (c.dest_branch_code || c.destBranch?.branch_code || '').trim().toLowerCase();
        if (bCode && (cOrigCode === bCode || cDestCode === bCode)) return true;
        const cOrigCity = (c.origin_city || c.originBranch?.city || '').trim().toLowerCase();
        const cDestCity = (c.destination_city || c.destBranch?.city || '').trim().toLowerCase();
        if (bCity && (cOrigCity === bCity || cDestCity === bCity)) return true;
        return false;
      });
      if (itemMatch) return true;
    }

    return false;
  };

  // Scoped unbilled consignments based on user branch & role
  const scopedUnbilledConsignments = useMemo(() => {
    if (isUserAdmin) {
      if (branchFilter && branchFilter !== 'ALL') {
        const selectedBranch = branches.find(
          (b) => String(b.id) === String(branchFilter) || (b.branch_code && b.branch_code.toUpperCase() === String(branchFilter).toUpperCase())
        ) || (userBranch && (String(userBranch.id) === String(branchFilter) || userBranch.branch_code === branchFilter) ? userBranch : null);

        if (selectedBranch) {
          return unbilledConsignments.filter((c) => isDocketRelatedToBranch(c, selectedBranch));
        }
        return unbilledConsignments.filter((c) => {
          const isOrigin =
            String(c.origin_branch_id) === String(branchFilter) ||
            String(c.booking_branch_id) === String(branchFilter) ||
            String(c.originBranch?.id) === String(branchFilter) ||
            (c.originBranch?.branch_code && c.originBranch.branch_code.toUpperCase() === String(branchFilter).toUpperCase());
          const isDest =
            String(c.dest_branch_id) === String(branchFilter) ||
            String(c.destBranch?.id) === String(branchFilter) ||
            (c.destBranch?.branch_code && c.destBranch.branch_code.toUpperCase() === String(branchFilter).toUpperCase());

          if (c.payment_type === 'TO_PAY') return isDest;
          if (c.payment_type === 'PAID') return isOrigin;
          if (c.payment_type === 'TBB') return isOrigin;
          return isOrigin;
        });
      }
      return unbilledConsignments;
    }

    // Non-admin user: strictly scoped to dockets booked through or delivering to their branch
    if (userBranch) {
      return unbilledConsignments.filter((c) => isDocketRelatedToBranch(c, userBranch));
    }
    if (userBranchId || userBranchCode) {
      const dummyBranch = {
        id: userBranchId,
        branch_code: userBranchCode,
        branch_name: userBranchName,
        city: user?.city || user?.branchCity || ''
      };
      return unbilledConsignments.filter((c) => isDocketRelatedToBranch(c, dummyBranch));
    }

    return unbilledConsignments;
  }, [unbilledConsignments, isUserAdmin, branchFilter, branches, userBranch, userBranchId, userBranchCode, userBranchName, user]);

  // Computed branch docket counts for instant lookup and sorting
  const branchDocketStats = useMemo(() => {
    const totalCount = unbilledConsignments.filter(
      (c) => showPendingTransit || c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(c.status)
    ).length;

    const countsMap = {};
    branches.forEach((b) => {
      const cnt = unbilledConsignments.filter(
        (c) => isDocketRelatedToBranch(c, b) &&
        (showPendingTransit || c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(c.status))
      ).length;
      countsMap[String(b.id)] = cnt;
      if (b.branch_code) countsMap[b.branch_code.toUpperCase()] = cnt;
    });

    return { totalCount, countsMap };
  }, [unbilledConsignments, branches, showPendingTransit, isDocketRelatedToBranch]);

  // Selected Branch object
  const selectedBranchObj = useMemo(() => {
    if (!branchFilter || branchFilter === 'ALL') return null;
    return branches.find(
      (b) => String(b.id) === String(branchFilter) || (b.branch_code && b.branch_code.toUpperCase() === String(branchFilter).toUpperCase())
    ) || null;
  }, [branchFilter, branches]);

  // Top Active Branches with pending dockets > 0 (up to 3 for quick 1-click pills)
  const topActiveBranches = useMemo(() => {
    return branches
      .filter((b) => (branchDocketStats.countsMap[String(b.id)] || 0) > 0)
      .sort((a, b) => (branchDocketStats.countsMap[String(b.id)] || 0) - (branchDocketStats.countsMap[String(a.id)] || 0))
      .slice(0, 3);
  }, [branches, branchDocketStats.countsMap]);

  // Number of branches that currently have pending dockets
  const branchesWithDocketsCount = useMemo(() => {
    return branches.filter((b) => (branchDocketStats.countsMap[String(b.id)] || 0) > 0).length;
  }, [branches, branchDocketStats.countsMap]);

  // Filtered branch list for searchable popover dropdown (scales up to 100+ branches)
  const filteredDropdownBranches = useMemo(() => {
    return branches.filter((b) => {
      if (onlyBranchesWithDockets && (branchDocketStats.countsMap[String(b.id)] || 0) === 0) {
        return false;
      }
      if (!branchSearch.trim()) return true;
      const q = branchSearch.trim().toLowerCase();
      const name = (b.branch_name || '').toLowerCase();
      const code = (b.branch_code || '').toLowerCase();
      const city = (b.city || '').toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q);
    });
  }, [branches, branchSearch, onlyBranchesWithDockets, branchDocketStats.countsMap]);

  // Live Computed KPIs from Database Records
  const kpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalReceived = 0;
    let outstandingBalance = 0;
    let overdueReceivables = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    invoices.forEach((inv) => {
      if (inv.status === 'CANCELLED') return;
      const tot = parseFloat(inv.total_amount || 0);
      const paid = parseFloat(inv.paid_amount || 0);
      const bal = parseFloat(inv.balance_amount || 0);

      totalInvoiced += tot;
      totalReceived += paid;
      outstandingBalance += bal;

      if (inv.due_date && inv.due_date < todayStr && bal > 0) {
        overdueReceivables += bal;
      }
    });

    const efficiency = totalInvoiced > 0 ? ((totalReceived / totalInvoiced) * 100).toFixed(1) : '0.0';

    // Unbilled TBB delivered pending billing (scoped to active branch view)
    const unbilledTbbItems = scopedUnbilledConsignments.filter((c) => c.payment_type === 'TBB');
    const unbilledTbbDeliveredItems = unbilledTbbItems.filter(
      (c) => c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status)
    );
    const unbilledTbbAmount = unbilledTbbDeliveredItems.reduce(
      (sum, c) => sum + parseFloat(c.total_amount || c.freight_amount || 0),
      0
    );

    const unbilledTotalAmount = scopedUnbilledConsignments.reduce(
      (sum, c) => sum + parseFloat(c.total_amount || c.freight_amount || 0),
      0
    );

    return {
      totalInvoiced,
      totalReceived,
      outstandingBalance,
      overdueReceivables,
      efficiency,
      unbilledTbbAmount,
      unbilledTbbCount: unbilledTbbDeliveredItems.length,
      unbilledTotalCount: scopedUnbilledConsignments.length,
      unbilledTotalAmount,
    };
  }, [invoices, scopedUnbilledConsignments]);

  // Branch Scoped Invoices
  const branchScopedInvoices = useMemo(() => {
    if (!isUserAdmin) {
      const effectiveBranch = userBranch || (userBranchId ? { id: userBranchId, branch_code: userBranchCode, branch_name: userBranchName, city: user?.city } : null);
      if (effectiveBranch) {
        return invoices.filter((inv) => isInvoiceRelatedToBranch(inv, effectiveBranch));
      }
      return invoices;
    }

    if (branchFilter && branchFilter !== 'ALL') {
      const selectedBranch = branches.find(
        (b) => String(b.id) === String(branchFilter) || (b.branch_code && b.branch_code.toUpperCase() === String(branchFilter).toUpperCase())
      ) || (userBranch && (String(userBranch.id) === String(branchFilter) || userBranch.branch_code === branchFilter) ? userBranch : null);

      if (selectedBranch) {
        return invoices.filter((inv) => isInvoiceRelatedToBranch(inv, selectedBranch));
      }
      return invoices.filter((inv) =>
        String(inv.branch_id) === String(branchFilter) ||
        (inv.booking_branch_code && inv.booking_branch_code.toUpperCase() === String(branchFilter).toUpperCase()) ||
        (inv.delivery_branch_code && inv.delivery_branch_code.toUpperCase() === String(branchFilter).toUpperCase())
      );
    }

    return invoices;
  }, [invoices, isUserAdmin, branchFilter, branches, userBranch, userBranchId, userBranchCode, userBranchName, user]);

  // Computed branch invoice counts for instant lookup
  const branchInvoiceStats = useMemo(() => {
    const totalCount = invoices.length;
    const countsMap = {};
    branches.forEach((b) => {
      const cnt = invoices.filter((inv) => isInvoiceRelatedToBranch(inv, b)).length;
      countsMap[String(b.id)] = cnt;
      if (b.branch_code) countsMap[b.branch_code.toUpperCase()] = cnt;
    });
    return { totalCount, countsMap };
  }, [invoices, branches]);

  // Filtered Invoices (now strictly reflecting active branch selection)
  const filteredInvoices = useMemo(() => {
    return branchScopedInvoices.filter((inv) => {
      const q = (search || '').trim().toLowerCase();
      const match =
        !q ||
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
        (inv.customer && inv.customer.toLowerCase().includes(q)) ||
        (inv.customer_name && inv.customer_name.toLowerCase().includes(q)) ||
        (inv.docket_summary && inv.docket_summary.toLowerCase().includes(q)) ||
        (inv.docket_number && inv.docket_number.toLowerCase().includes(q)) ||
        (inv.docket_type && inv.docket_type.toLowerCase().includes(q)) ||
        (inv.docket_numbers && inv.docket_numbers.some((d) => String(d).toLowerCase().includes(q))) ||
        (inv.gstin && inv.gstin.toLowerCase().includes(q)) ||
        (inv.booking_branch && inv.booking_branch.toLowerCase().includes(q)) ||
        (inv.delivery_branch && inv.delivery_branch.toLowerCase().includes(q));

      const todayStr = new Date().toISOString().slice(0, 10);
      const isCancelled = inv.status === 'CANCELLED';
      const isOverdue = !isCancelled && inv.balance_amount > 0 && inv.due_date < todayStr;
      const isPaid = !isCancelled && inv.balance_amount === 0;
      const isPartial = !isCancelled && inv.paid_amount > 0 && inv.balance_amount > 0;
      const isUnpaid = !isCancelled && inv.balance_amount > 0 && inv.due_date >= todayStr;

      if (statusFilter === 'ALL') return match;
      if (statusFilter === 'UNCLEARED') return match && inv.balance_amount > 0 && !isCancelled;
      if (statusFilter === 'UNPAID' || statusFilter === 'PENDING') return match && isUnpaid;
      if (statusFilter === 'OVERDUE') return match && isOverdue;
      if (statusFilter === 'PARTIAL') return match && isPartial;
      if (statusFilter === 'PAID') return match && isPaid;
      if (statusFilter === 'CANCELLED') return match && isCancelled;
      return match;
    });
  }, [branchScopedInvoices, search, statusFilter]);

  // Counts and Total Amounts for Invoice filter tabs
  const invoiceCounts = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeInvoices = branchScopedInvoices.filter((i) => i.status !== 'CANCELLED');
    const sumBal = (list) => list.reduce((sum, i) => sum + parseFloat(i.balance_amount || 0), 0);
    const sumPaid = (list) => list.reduce((sum, i) => sum + parseFloat(i.paid_amount || 0), 0);
    const sumTotal = (list) => list.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0);

    const unpaidList = activeInvoices.filter((i) => i.balance_amount > 0 && i.due_date >= todayStr);
    const overdueList = activeInvoices.filter((i) => i.balance_amount > 0 && i.due_date < todayStr);
    const partialList = activeInvoices.filter((i) => i.paid_amount > 0 && i.balance_amount > 0);
    const paidList = activeInvoices.filter((i) => i.balance_amount === 0);
    const cancelledList = branchScopedInvoices.filter((i) => i.status === 'CANCELLED');

    return {
      all: branchScopedInvoices.length,
      allAmount: sumTotal(branchScopedInvoices),
      unpaid: unpaidList.length,
      unpaidAmount: sumBal(unpaidList),
      overdue: overdueList.length,
      overdueAmount: sumBal(overdueList),
      partial: partialList.length,
      partialAmount: sumBal(partialList),
      paid: paidList.length,
      paidAmount: sumPaid(paidList),
      cancelled: cancelledList.length,
    };
  }, [branchScopedInvoices]);

  // TBB unbilled calculations
  const unbilledTbbDockets = useMemo(() => {
    return scopedUnbilledConsignments.filter((c) => c.payment_type === 'TBB');
  }, [scopedUnbilledConsignments]);

  const unbilledTbbDelivered = useMemo(() => {
    return unbilledTbbDockets.filter(
      (c) => c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status)
    );
  }, [unbilledTbbDockets]);

  const unbilledTbbPendingAmount = useMemo(() => {
    return unbilledTbbDelivered.reduce(
      (sum, c) => sum + parseFloat(c.total_amount || c.freight_amount || 0),
      0
    );
  }, [unbilledTbbDelivered]);

  // Counts and Total Amounts for Unbilled filter tabs (Delivered & POD Uploaded)
  const unbilledCounts = useMemo(() => {
    const sumTotal = (list) => list.reduce((sum, c) => sum + parseFloat(c.total_amount || c.freight_amount || 0), 0);

    const isDeliveredDocket = (c) => Boolean(
      c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(c.status)
    );

    const deliveredList = scopedUnbilledConsignments.filter(isDeliveredDocket);
    const inTransitList = scopedUnbilledConsignments.filter((c) => !isDeliveredDocket(c));

    const tbbReadyList = deliveredList.filter((c) => c.payment_type === 'TBB');
    const toPayList = deliveredList.filter((c) => c.payment_type === 'TO_PAY');
    const paidList = deliveredList.filter((c) => c.payment_type === 'PAID');

    return {
      all: deliveredList.length,
      allAmount: sumTotal(deliveredList),
      tbbReady: tbbReadyList.length,
      tbbReadyAmount: sumTotal(tbbReadyList),
      tbbAll: tbbReadyList.length,
      tbbAllAmount: sumTotal(tbbReadyList),
      toPay: toPayList.length,
      toPayAmount: sumTotal(toPayList),
      paid: paidList.length,
      paidAmount: sumTotal(paidList),
      inTransit: inTransitList.length,
      inTransitAmount: sumTotal(inTransitList),
      allTotalWithTransit: scopedUnbilledConsignments.length,
    };
  }, [scopedUnbilledConsignments]);

  // Filtered unbilled consignments for main table
  const filteredUnbilledConsignments = useMemo(() => {
    return scopedUnbilledConsignments.filter((c) => {
      const isDelivered = Boolean(
        c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(c.status)
      );

      // Strict Delivery Completion Requirement:
      // Only show dockets where delivery is completed (POD uploaded). Exclude booked or present in hub.
      if (!showPendingTransit && !isDelivered) {
        return false;
      }

      const q = (unbilledSearch || '').trim().toLowerCase();
      let match = true;
      if (q) {
        const docNum = String(c.docket_number || '').toLowerCase();
        const lrNum = String(c.lr_number || '').toLowerCase();
        const custName = String(c.customer || c.consignor?.name || c.consignor_name || '').toLowerCase();
        const receiverName = String(c.consignee?.name || c.consignee_name || '').toLowerCase();
        const origCity = String(c.origin_city || c.booking_branch || c.originBranch?.branch_name || '').toLowerCase();
        const destCity = String(c.destination_city || c.delivery_branch || c.destBranch?.branch_name || '').toLowerCase();
        const corridor = `${origCity} ${destCity}`;
        const gstin = String(c.customer_gstin || c.consignor?.gstin || c.consignee?.gstin || '').toLowerCase();
        const eway = String(c.eway_bill_no || '').toLowerCase();
        const invNo = String(c.invoice_no || '').toLowerCase();
        const payType = String(c.payment_type || '').toLowerCase();
        const statusStr = String(c.status || '').toLowerCase();
        const freight = String(c.freight_amount || c.total_amount || '');

        match =
          docNum.includes(q) ||
          lrNum.includes(q) ||
          custName.includes(q) ||
          receiverName.includes(q) ||
          origCity.includes(q) ||
          destCity.includes(q) ||
          corridor.includes(q) ||
          gstin.includes(q) ||
          eway.includes(q) ||
          invNo.includes(q) ||
          payType.includes(q) ||
          statusStr.includes(q) ||
          freight.includes(q);
      }

      if (unbilledFilter === 'TBB_READY' || unbilledFilter === 'TBB' || unbilledFilter === 'ALL_TBB') {
        return match && c.payment_type === 'TBB' && isDelivered;
      }
      if (unbilledFilter === 'TBB_IN_TRANSIT') {
        return match && c.payment_type === 'TBB' && !isDelivered;
      }
      if (unbilledFilter === 'TO_PAY') {
        return match && c.payment_type === 'TO_PAY';
      }
      if (unbilledFilter === 'PAID') {
        return match && c.payment_type === 'PAID';
      }
      if (unbilledFilter === 'ALL') {
        return match;
      }
      return match;
    });
  }, [scopedUnbilledConsignments, unbilledSearch, unbilledFilter, showPendingTransit]);

  // Active customer for generation modal
  const currentSelectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customersList.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customersList, selectedCustomerId]);

  // All unbilled consignments for selected customer (Strictly completed deliveries only)
  const customerUnbilledAll = useMemo(() => {
    const deliveredBase = scopedUnbilledConsignments.filter(
      (c) => c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(c.status)
    );
    if (!selectedCustomerId) return deliveredBase;
    const cust = currentSelectedCustomer;
    const custName = cust?.name?.trim()?.toLowerCase();
    const custGstin = cust?.gstin?.trim()?.toLowerCase();
    const targetIdStr = String(selectedCustomerId);

    return deliveredBase.filter((c) => {
      // 1. Direct ID matching (string-safe for integer and UUID ids)
      if (c.consignor_id && String(c.consignor_id) === targetIdStr) return true;
      if (c.consignee_id && String(c.consignee_id) === targetIdStr) return true;
      if (c.consignor?.id && String(c.consignor.id) === targetIdStr) return true;
      if (c.consignee?.id && String(c.consignee.id) === targetIdStr) return true;

      // 2. GSTIN matching
      if (custGstin && custGstin !== 'urp') {
        const cGstin = (c.customer_gstin || c.consignor?.gstin || c.consignee?.gstin || '')?.trim()?.toLowerCase();
        if (cGstin && cGstin === custGstin) return true;
      }

      // 3. Name matching
      if (custName) {
        const cName = (c.customer || c.consignor?.name || '')?.trim()?.toLowerCase();
        const rName = (c.consignee?.name || '')?.trim()?.toLowerCase();
        if (cName === custName || rName === custName) return true;
      }

      return false;
    });
  }, [scopedUnbilledConsignments, selectedCustomerId, currentSelectedCustomer]);

  // Payment type counts for customer's unbilled dockets
  const wizardPaymentCounts = useMemo(() => {
    return {
      all: customerUnbilledAll.length,
      tbb: customerUnbilledAll.filter((c) => c.payment_type === 'TBB').length,
      to_pay: customerUnbilledAll.filter((c) => c.payment_type === 'TO_PAY').length,
      paid: customerUnbilledAll.filter((c) => c.payment_type === 'PAID').length,
    };
  }, [customerUnbilledAll]);

  // Auto-switch filter tab if active tab has 0 dockets but others exist
  useEffect(() => {
    if (isGenerateModalOpen && customerUnbilledAll.length > 0) {
      if (wizardPaymentFilter === 'TBB' && wizardPaymentCounts.tbb === 0) {
        setWizardPaymentFilter('ALL');
      }
    }
  }, [isGenerateModalOpen, customerUnbilledAll.length, wizardPaymentCounts.tbb, wizardPaymentFilter]);

  // Filtered unbilled consignments for active tab in wizard
  const unbilledForCustomer = useMemo(() => {
    let list = customerUnbilledAll;
    if (wizardPaymentFilter !== 'ALL') {
      list = list.filter((c) => c.payment_type === wizardPaymentFilter);
    }
    if (onlyDeliveredPod) {
      list = list.filter((c) => c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status));
    }
    return list;
  }, [customerUnbilledAll, wizardPaymentFilter, onlyDeliveredPod]);

  // Calculate Subtotal, Granular Docket Charges, and Prepaid vs Credit split
  const wizardCalculations = useMemo(() => {
    const selectedItems = customerUnbilledAll.filter((c) => selectedLrIds.includes(c.id));
    const gstRate = parseFloat(taxRate || 5.0);
    const extra = parseFloat(extraCharges || 0);

    let docketsBaseFreight = 0;
    let docketsLoading = 0;
    let docketsUnloading = 0;
    let docketsDoorDelivery = 0;
    let docketsHandling = 0;
    let docketsOther = 0;
    let docketsTaxable = 0;
    let docketsTax = 0;
    let prepaidFreight = 0;

    selectedItems.forEach((c) => {
      const cFreight = parseFloat(c.freight_amount || 0);
      const cLoading = parseFloat(c.loading_charges || c.hamali_charges || 0);
      const cUnloading = parseFloat(c.unloading_charges || 0);
      const cDelivery = parseFloat(c.door_delivery_charges || 0);
      const cHandling = parseFloat(c.handling_charges || 0);
      const cOther = parseFloat(c.other_charges || c.fuel_surcharge || 0);

      docketsBaseFreight += cFreight;
      docketsLoading += cLoading;
      docketsUnloading += cUnloading;
      docketsDoorDelivery += cDelivery;
      docketsHandling += cHandling;
      docketsOther += cOther;

      const cTotal = parseFloat(c.total_amount || (cFreight + cLoading + cUnloading + cDelivery + cHandling + cOther));
      const cTax = parseFloat(c.tax_amount || 0);
      const cTaxPercent = parseFloat(c.tax_percent || 0);

      let itemTaxable = 0;
      let itemTax = 0;

      if (cTax > 0) {
        // Docket already has tax included in total_amount
        itemTaxable = Math.max(0, cTotal - cTax);
        if (isRcm || gstRate === 0) {
          itemTax = 0;
        } else if (Math.abs(gstRate - cTaxPercent) < 0.1 || !cTaxPercent) {
          // Same tax rate: use exact docket tax amount (prevents rounding discrepancy)
          itemTax = cTax;
        } else {
          // Rate was explicitly modified by user: re-calculate based on taxable base
          itemTax = Math.round((itemTaxable * gstRate) / 100);
        }
      } else {
        // Docket was booked with 0 tax (e.g. RCM or pre-tax)
        itemTaxable = cTotal;
        itemTax = (!isRcm && gstRate > 0) ? Math.round((itemTaxable * gstRate) / 100) : 0;
      }

      docketsTaxable += itemTaxable;
      docketsTax += itemTax;

      const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status);
      const isPaidUpfront = c.payment_type === 'PAID';
      const isToPayCollected = c.payment_type === 'TO_PAY' && isDelivered;
      if (isPaidUpfront || isToPayCollected) {
        prepaidFreight += cTotal;
      }
    });

    const totalDocketSurcharges = docketsLoading + docketsUnloading + docketsDoorDelivery + docketsHandling + docketsOther;
    const extraTax = (!isRcm && gstRate > 0 && extra > 0) ? Math.round((extra * gstRate) / 100) : 0;

    const taxable = Math.round(docketsTaxable + extra);
    const gstAmount = Math.round(docketsTax + extraTax);
    const totalAmount = taxable + gstAmount;

    const prepaidAmount = Math.min(totalAmount, Math.round(prepaidFreight));
    const creditDueAmount = Math.max(0, totalAmount - prepaidAmount);

    const d = new Date(invoiceDate || new Date());
    d.setDate(d.getDate() + parseInt(creditDays || 30, 10));
    const computedDueDate = d.toISOString().slice(0, 10);

    const deliveryBranchName = selectedItems[0]?.delivery_branch || selectedItems[0]?.destination_city || 'Destination Delivery Branch';

    return {
      selectedCount: selectedItems.length,
      docketsBaseFreight,
      docketsLoading,
      docketsUnloading,
      docketsDoorDelivery,
      docketsHandling,
      docketsOther,
      totalDocketSurcharges,
      taxable,
      gstAmount,
      totalAmount,
      prepaidAmount,
      creditDueAmount,
      hasPrepaidItems: prepaidAmount > 0,
      hasCreditItems: creditDueAmount > 0,
      computedDueDate,
      deliveryBranchName,
      selectedItems
    };
  }, [customerUnbilledAll, selectedLrIds, extraCharges, taxRate, isRcm, invoiceDate, creditDays]);

  // Handle Generate Invoice Submit
  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      showToast('Please select a customer', 'error');
      return;
    }
    if (selectedLrIds.length === 0) {
      showToast(`Please select at least 1 ${termSingular} to generate freight invoice`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await billingService.createInvoice({
        customer_id: selectedCustomerId,
        consignment_ids: selectedLrIds,
        invoice_date: invoiceDate,
        credit_days: creditDays,
        tax_rate: isRcm ? 0 : taxRate,
        is_rcm: isRcm,
        extra_charges: extraCharges,
        remarks: invoiceRemarks
      });

      showToast(`Freight Invoice generated successfully for ${wizardCalculations.selectedCount} ${termPlural}!`);
      setIsGenerateModalOpen(false);
      setSelectedLrIds([]);
      setActiveTab('INVOICES');
      await loadDatabaseRecords();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create invoice in database', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Collect To-Pay Freight Modal
  const openCollectFreightModal = (row) => {
    setCollectFreightModalDocket(row);
    setCollectFreightForm({
      paymentMethod: 'CASH',
      paymentRef: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      remarks: 'Delivery counter freight collection',
    });
  };

  // Confirm To-Pay Freight Collection & Issue Delivery Bill
  const handleConfirmCollectFreight = async (e) => {
    if (e) e.preventDefault();
    if (!collectFreightModalDocket) return;

    const row = collectFreightModalDocket;
    const customerId = row.consignee_id || row.consignor_id;
    if (!customerId) {
      showToast('Cannot collect: Consignee/Party not linked to this docket', 'error');
      return;
    }

    if (!collectFreightForm.paymentRef?.trim()) {
      showToast(
        collectFreightForm.paymentMethod === 'CASH'
          ? 'Cash receipt / voucher number is required'
          : collectFreightForm.paymentMethod === 'CHEQUE'
          ? 'Cheque number is required'
          : 'Payment UTR / Reference number is required',
        'error'
      );
      return;
    }

    if (!collectFreightForm.remarks?.trim()) {
      showToast('Delivery remarks / counter notes are required', 'error');
      return;
    }

    setIsProcessingAction(true);
    try {
      const payload = {
        customer_id: customerId,
        consignment_ids: [row.id],
        invoice_date: collectFreightForm.paymentDate,
        credit_days: 0,
        tax_rate: parseFloat(row.tax_percent || 5.0),
        is_rcm: false,
        branch_id: row.dest_branch_id || activeBranch?.id,
        remarks: `[TO-PAY COLLECTION] Mode: ${collectFreightForm.paymentMethod}${collectFreightForm.paymentRef ? ` • Ref/UTR: ${collectFreightForm.paymentRef}` : ''}. ${collectFreightForm.remarks || ''}`
      };

      const result = await billingService.createInvoice(payload);
      showToast(`To-Pay freight collected and Delivery Bill created for ${row.docket_number || row.lr_number}!`);
      setCollectFreightModalDocket(null);
      await loadDatabaseRecords();

      if (result?.id) {
        try {
          const fullInv = await billingService.getInvoiceById(result.id);
          if (fullInv) {
            openPrintModal(fullInv);
          }
        } catch (fetchErr) {
          console.warn('Could not auto-open print modal:', fetchErr);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to collect freight and generate bill', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open Quick Bill Modal for TBB / Single LR
  const openQuickBillModal = (row) => {
    setQuickBillModalDocket(row);
    setQuickBillCreditDays(row.credit_days || 30);
    setQuickBillInvoiceDate(new Date().toISOString().slice(0, 10));
  };

  // Confirm Quick Bill Single Invoice
  const handleConfirmQuickBill = async (e) => {
    if (e) e.preventDefault();
    if (!quickBillModalDocket) return;

    const row = quickBillModalDocket;
    const customerId = row.consignor_id || row.consignee_id;
    if (!customerId) {
      showToast('Cannot bill: Shipper/Party not linked to this docket', 'error');
      return;
    }

    setIsProcessingAction(true);
    try {
      const payload = {
        customer_id: customerId,
        consignment_ids: [row.id],
        invoice_date: quickBillInvoiceDate,
        credit_days: quickBillCreditDays,
        tax_rate: parseFloat(row.tax_percent || 5.0),
        is_rcm: false,
        branch_id: row.origin_branch_id || activeBranch?.id,
        remarks: `Single Freight Tax Invoice for ${row.docket_number || row.lr_number}`
      };

      const result = await billingService.createInvoice(payload);
      showToast(`GST Freight Invoice generated for ${row.docket_number || row.lr_number}!`);
      setQuickBillModalDocket(null);
      await loadDatabaseRecords();

      if (result?.id) {
        try {
          const fullInv = await billingService.getInvoiceById(result.id);
          if (fullInv) {
            openPrintModal(fullInv);
          }
        } catch (fetchErr) {
          console.warn('Could not auto-open print modal:', fetchErr);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to generate invoice', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open Collect Modal
  const openPaymentModal = (invoice) => {
    setPaymentModalInvoice(invoice);
    setReceivedAmount(invoice.balance_amount);
    setTdsDeducted(0);
    setUtrNumber(`UTR${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  // Confirm Payment
  const handleConfirmPayment = async () => {
    if (!paymentModalInvoice) return;

    const payAmt = parseFloat(receivedAmount || 0);
    const tdsAmt = parseFloat(tdsDeducted || 0);
    const totalCredit = payAmt + tdsAmt;

    if (totalCredit <= 0) {
      showToast('Amount received or TDS credit must be greater than ₹0', 'error');
      return;
    }

    setIsRecordingPayment(true);
    try {
      await billingService.recordPayment({
        invoice_id: paymentModalInvoice.id,
        customer_id: paymentModalInvoice.customer_id,
        amount: payAmt,
        tds_amount: tdsAmt,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: paymentMethod,
        reference_number: utrNumber,
        bank_name: bankName,
        remarks: `Remittance received against ${paymentModalInvoice.invoice_number}`
      });

      showToast(`Payment of ₹${payAmt.toLocaleString('en-IN')}${tdsAmt > 0 ? ` (+ ₹${tdsAmt.toLocaleString('en-IN')} TDS)` : ''} recorded in database!`);
      setPaymentModalInvoice(null);
      await loadDatabaseRecords();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to record payment in database', 'error');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Open Edit Due Date Modal
  const openEditDueDateModal = (invoice) => {
    setEditDueDateModalInvoice(invoice);
    setNewDueDate(invoice.due_date || new Date().toISOString().slice(0, 10));
    setEditDueRemarks(invoice.remarks || '');
  };

  // Save Extended Due Date
  const handleSaveDueDate = async (e) => {
    e.preventDefault();
    if (!editDueDateModalInvoice || !newDueDate) return;

    setIsUpdatingDueDate(true);
    try {
      await billingService.updateInvoice(editDueDateModalInvoice.id, {
        due_date: newDueDate,
        remarks: editDueRemarks,
      });

      showToast(`Credit due date updated to ${newDueDate} for ${editDueDateModalInvoice.invoice_number}!`);
      setEditDueDateModalInvoice(null);
      await loadDatabaseRecords();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update due date', 'error');
    } finally {
      setIsUpdatingDueDate(false);
    }
  };

  // Open Cancel Modal
  const openCancelModal = (invoice) => {
    setCancelModalInvoice(invoice);
    setCancelReason('');
  };

  // Confirm Cancel Invoice
  const handleConfirmCancelInvoice = async (e) => {
    e.preventDefault();
    if (!cancelModalInvoice) return;

    setIsCancellingInvoice(true);
    try {
      await billingService.cancelInvoice(cancelModalInvoice.id, {
        reason: cancelReason || 'Cancelled by transporter operator',
      });

      showToast(`Invoice ${cancelModalInvoice.invoice_number} voided and consignments returned to unbilled queue!`);
      setCancelModalInvoice(null);
      await loadDatabaseRecords();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to cancel invoice', 'error');
    } finally {
      setIsCancellingInvoice(false);
    }
  };

  // 1-Click WhatsApp Payment Follow-up
  const sendInvoiceWhatsAppReminder = (inv) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isPastDue = inv.due_date && inv.due_date < todayStr;
    const days = inv.days_diff !== undefined ? inv.days_diff : 0;
    const company = transporterDetails.businessName;
    const bank = transporterDetails.bankName;
    const acc = transporterDetails.accountNumber;
    const ifsc = transporterDetails.ifscCode;
    const balFormatted = Number(inv.balance_amount).toLocaleString('en-IN');

    let msg = '';
    if (isPastDue) {
      msg = `*URGENT FREIGHT PAYMENT OVERDUE*\n\nDear *${inv.customer}*,\nThis is a priority reminder from *${company}*.\nInvoice *#${inv.invoice_number}* of *₹ ${balFormatted}* was due on *${inv.due_date}* and is currently *${Math.abs(days)} DAYS OVERDUE*.\n\nKindly clear this outstanding amount to our registered bank account:\n🏦 Bank: *${bank}*\n🔢 A/C: *${acc}*\n🏛️ IFSC: *${ifsc}*\n\nPlease share the transfer UTR reference upon remittance. Thank you!`;
    } else {
      msg = `*FREIGHT INVOICE PAYMENT REMINDER*\n\nDear *${inv.customer}*,\nGreetings from *${company}*.\nFreight Invoice *#${inv.invoice_number}* for *₹ ${balFormatted}* has credit due date *${inv.due_date}* (${days === 0 ? 'Due Today' : `${days} days remaining`}).\n\nBank Account Details for Remittance:\n🏦 Bank: *${bank}*\n🔢 A/C: *${acc}*\n🏛️ IFSC: *${ifsc}*\n\nThank you for your business!`;
    }

    const phone = (inv.customer_phone || '').replace(/\D/g, '');
    const url = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    showToast(`WhatsApp reminder opened for ${inv.customer}!`);
  };

  // 1-Click Email Invoice / Follow-up
  const sendInvoiceEmail = (inv) => {
    const company = transporterDetails.businessName;
    const bank = transporterDetails.bankName;
    const acc = transporterDetails.accountNumber;
    const ifsc = transporterDetails.ifscCode;
    const balFormatted = Number(inv.balance_amount || inv.total_amount).toLocaleString('en-IN');
    const emailTo = inv.customer_email || inv.email || '';
    const subject = encodeURIComponent(`GST Freight Invoice #${inv.invoice_number} from ${company}`);
    const body = encodeURIComponent(
      `Dear ${inv.customer},\n\nPlease find the details of GST Freight Tax Invoice #${inv.invoice_number} issued by ${company}.\n\nInvoice Total: ₹ ${Number(inv.total_amount).toLocaleString('en-IN')}\nOutstanding Balance: ₹ ${balFormatted}\nDue Date: ${inv.due_date}\n\nBank Remittance Details (NEFT/RTGS):\nBank: ${bank}\nA/C No: ${acc}\nIFSC: ${ifsc}\n\nKindly acknowledge receipt and share the remittance UTR upon transfer.\n\nBest Regards,\n${company}`
    );
    window.open(`mailto:${emailTo}?subject=${subject}&body=${body}`, '_blank');
    showToast(`Email client opened for ${inv.customer}!`);
  };

  // Export GSTR-1 as CSV
  const handleExportGstr1 = () => {
    if (invoices.length === 0) {
      showToast('No invoices available in database to export', 'error');
      return;
    }

    const headers = [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Delivery Branch',
      'Invoice Number',
      'Invoice Date',
      'Invoice Value',
      'Place Of Supply',
      'Reverse Charge',
      'Applicable % of Tax Rate',
      'Invoice Type',
      'Taxable Value',
      'Central Tax (CGST)',
      'State/UT Tax (SGST)',
      'Balance Due'
    ];

    const rows = invoices.map((inv) => [
      `"${inv.gstin || 'URP'}"`,
      `"${inv.customer}"`,
      `"${inv.delivery_branch}"`,
      `"${inv.invoice_number}"`,
      `"${inv.invoice_date}"`,
      inv.total_amount,
      `"27-Maharashtra"`,
      `"N"`,
      5,
      `"Regular B2B"`,
      inv.taxable_amount,
      Math.round(inv.gst_amount / 2),
      Math.round(inv.gst_amount / 2),
      inv.balance_amount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR1_Outward_B2B_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('GSTR-1 Outward B2B Supply Register exported to Excel CSV!');
  };

  // DataTable Columns
  const columns = useMemo(() => [
    {
      key: 'invoice_number',
      label: 'Invoice # & Date',
      width: 170,
      minWidth: 140,
      sortable: true,
      render: (val, row) => (
        <div>
          <button
            onClick={() => openPrintModal(row)}
            className="font-mono font-bold text-xs text-cyan-500 dark:text-cyan-400 hover:underline flex items-center gap-1.5 text-left"
            title="Click to view & print GST Tax Invoice"
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span>{val}</span>
          </button>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.invoice_date}</div>
        </div>
      )
    },
    {
      key: 'dockets',
      label: `${termSingular} # & Type`,
      width: 220,
      minWidth: 185,
      sortable: true,
      render: (val, row) => {
        const dockets = (row.docket_numbers && row.docket_numbers.length > 0)
          ? row.docket_numbers
          : ((row.items || []).map((it) => it.consignment?.docket_number || it.consignment?.lr_number || it.docket_number || it.lr_number).filter(Boolean));
        const uniqueDockets = Array.from(new Set(dockets));
        const fallback = row.docket_number || row.docket_summary || (row.items?.[0]?.lr_number) || (row.items?.[0]?.consignment?.docket_number) || '';

        const rawType = (row.docket_type || row.items?.[0]?.payment_type || row.items?.[0]?.consignment?.payment_type || row.payment_type || 'TO_PAY').toUpperCase();
        const activeTypes = (row.docket_types && row.docket_types.length > 0)
          ? row.docket_types
          : [rawType];

        const renderTypeBadges = (
          <div className="inline-flex items-center gap-1 flex-wrap">
            {activeTypes.map((t, idx) => {
              const uType = String(t).toUpperCase();
              const fType = uType === 'TO_PAY' ? 'To Pay' : uType === 'PAID' ? 'Paid' : uType === 'TBB' ? 'TBB' : uType;
              const tone = uType === 'PAID'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : uType === 'TO_PAY'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : uType === 'TBB'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
              return (
                <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border shrink-0 ${tone}`}>
                  {fType}
                </span>
              );
            })}
          </div>
        );

        if (uniqueDockets.length === 0) {
          if (fallback) {
            return (
              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                  <span>{fallback}</span>
                </div>
                {renderTypeBadges}
              </div>
            );
          }
          return (
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 italic">Direct Bill</span>
              {renderTypeBadges}
            </div>
          );
        }

        if (uniqueDockets.length === 1) {
          return (
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs">
                <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span>{uniqueDockets[0]}</span>
              </div>
              {renderTypeBadges}
            </div>
          );
        }

        return (
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-mono font-bold text-xs" title={uniqueDockets.join(', ')}>
                <FileText className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                <span>{uniqueDockets[0]}</span>
              </div>
              {renderTypeBadges}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>+{uniqueDockets.length - 1} more</span>
              <span className="text-slate-500 font-sans">({uniqueDockets.length} {termPlural})</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'customer',
      label: 'Customer & GSTIN',
      width: 220,
      minWidth: 170,
      sortable: true,
      render: (val, row) => {
        const displayCust = typeof val === 'string'
          ? val
          : (val?.name || (typeof row.customer === 'object' ? row.customer?.name : row.customer) || 'Customer Account');

        return (
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
              <span>{displayCust}</span>
              {row.balance_amount > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/30">
                  Uncleared
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{row.gstin || 'URP'}</span>
              <span>•</span>
              <span className="text-slate-500 font-sans">
                {row.lr_count || 1} {row.lr_count === 1 ? termSingular : termPlural}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'branch_details',
      label: 'Corridor Route',
      width: 155,
      minWidth: 140,
      sortable: true,
      render: (val, row) => {
        const bCode = row.booking_branch_code || (row.booking_branch ? row.booking_branch.slice(0, 4).toUpperCase() : 'BOKB');
        const dCode = row.delivery_branch_code || (row.delivery_branch ? row.delivery_branch.slice(0, 4).toUpperCase() : 'BBLH');
        const fullTooltip = `Booking: ${row.booking_branch || 'Origin'} (${bCode}) → Delivery: ${row.delivery_branch || 'Destination'} (${dCode})`;

        return (
          <div
            className="inline-flex items-center space-x-1.5 whitespace-nowrap px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 cursor-help"
            title={fullTooltip}
          >
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {bCode}
            </span>
            <span className="text-slate-400 font-bold text-xs">→</span>
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              {dCode}
            </span>
          </div>
        );
      }
    },
    {
      key: 'due_date',
      label: 'Credit Due Date & Aging',
      width: 170,
      minWidth: 150,
      sortable: true,
      render: (val, row) => {
        const isCancelled = row.status === 'CANCELLED';
        const isPaid = row.balance_amount === 0 && !isCancelled;
        const days = row.days_diff !== undefined ? row.days_diff : 0;
        const isOverdue = !isCancelled && !isPaid && days < 0;
        const isDueToday = !isCancelled && !isPaid && days === 0;

        return (
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <span className={`font-mono text-xs font-semibold ${
                isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : isCancelled ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'
              }`}>
                {val}
              </span>
              {!isCancelled && !isPaid && canEdit && (
                <button
                  type="button"
                  onClick={() => openEditDueDateModal(row)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-500 transition-colors"
                  title="Extend or Update Credit Due Date"
                >
                  <Calendar className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              {isCancelled ? (
                <span className="text-[10px] text-slate-400 font-mono">Voided</span>
              ) : isPaid ? (
                <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  Settled
                </span>
              ) : isOverdue ? (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  {Math.abs(days)}d Overdue
                </span>
              ) : isDueToday ? (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Due Today
                </span>
              ) : (
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium font-mono">
                  {days}d credit left
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'total_amount',
      label: 'Total Invoiced',
      width: 130,
      minWidth: 110,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'paid_amount',
      label: 'Received',
      width: 120,
      minWidth: 100,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'balance_amount',
      label: 'Uncleared Balance',
      width: 130,
      minWidth: 110,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={`font-mono font-bold text-xs ${val > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'}`}>
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Payment Status',
      width: 140,
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (val, row) => {
        const isCancelled = row.status === 'CANCELLED';
        const isPaid = row.balance_amount === 0 && !isCancelled;
        const isOverdue = !isCancelled && row.balance_amount > 0 && row.due_date < new Date().toISOString().slice(0, 10);
        const isPartial = !isCancelled && row.paid_amount > 0 && row.balance_amount > 0;

        let tone = 'amber';
        let label = 'Unpaid';

        if (isCancelled) {
          tone = 'slate';
          label = 'Cancelled';
        } else if (isPaid) {
          tone = 'emerald';
          label = 'Paid & Cleared';
        } else if (isOverdue) {
          tone = 'rose';
          label = 'Overdue';
        } else if (isPartial) {
          tone = 'cyan';
          label = 'Partially Paid';
        }

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            tone === 'emerald'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
              : tone === 'rose'
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
              : tone === 'cyan'
              ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30'
              : tone === 'slate'
              ? 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
          }`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'billing_actions',
      label: 'Actions',
      width: 140,
      minWidth: 125,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Print GST Tax Invoice */}
          <button
            onClick={() => openPrintModal(row)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-400 transition-all shadow-2xs"
            title="View & Print Official GST Tax Invoice"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Record / Collect Remittance */}
          {row.balance_amount > 0 && row.status !== 'CANCELLED' && (
            <button
              onClick={() => openPaymentModal(row)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1"
              title="Collect Remittance / Record Payment (NEFT / RTGS / TDS)"
            >
              <span>Collect</span>
            </button>
          )}

          {/* Extend Credit Due Date */}
          {row.balance_amount > 0 && row.status !== 'CANCELLED' && canEdit && (
            <button
              onClick={() => openEditDueDateModal(row)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-400 transition-all shadow-2xs"
              title="Extend Credit Due Date"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    },
    {
      key: 'share_actions',
      label: 'Share & Close',
      width: 125,
      minWidth: 110,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {/* WhatsApp Payment Follow-up */}
          {row.balance_amount > 0 && row.status !== 'CANCELLED' && (
            <button
              onClick={() => sendInvoiceWhatsAppReminder(row)}
              className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all shadow-2xs"
              title="Send 1-Click WhatsApp Payment Follow-up"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Email Invoice & Bank Details */}
          {row.status !== 'CANCELLED' && (
            <button
              onClick={() => sendInvoiceEmail(row)}
              className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all shadow-2xs"
              title="Send Invoice & Bank Details via Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close / Cancel Invoice */}
          {parseFloat(row.paid_amount || 0) === 0 && row.status !== 'CANCELLED' && canEdit && (
            <button
              onClick={() => openCancelModal(row)}
              className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all shadow-2xs"
              title="Cancel / Close Invoice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ], [canCreatePayment, canEdit, termPlural, termSingular, transporterDetails]);

  // DataTable Columns for Unbilled Consignments Queue
  const unbilledColumns = useMemo(() => [
    {
      key: 'docket_number',
      label: `${termSingular} # & Date`,
      width: 170,
      minWidth: 150,
      sortable: true,
      render: (val, row) => {
        const docNum = termSingular === 'Docket' ? (row.docket_number || row.lr_number) : (row.lr_number || row.docket_number);
        return (
          <div>
            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>{docNum}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {row.booking_date} • {row.packages_count || 1} Pkgs
            </div>
          </div>
        );
      }
    },
    {
      key: 'customer',
      label: 'Billed Party (Shipper)',
      width: 220,
      minWidth: 180,
      sortable: true,
      render: (val, row) => {
        const displayCustomer = typeof val === 'string'
          ? val
          : (val?.name || (typeof row.consignor === 'object' ? row.consignor?.name : row.consignor) || (typeof row.customer === 'object' ? row.customer?.name : row.customer) || 'Customer Account');
        return (
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
              <span>{displayCustomer}</span>
              {row.payment_type === 'TBB' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono font-bold border border-purple-500/30">
                  TBB Party
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              GSTIN: {row.customer_gstin || row.consignor?.gstin || 'URP'} • {row.credit_days || 30}D Credit
            </div>
          </div>
        );
      }
    },
    {
      key: 'consignee',
      label: 'Receiver (Consignee)',
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (val, row) => {
        const receiverName = typeof row.consignee === 'object'
          ? (row.consignee?.name || 'Receiver')
          : (row.consignee || (typeof val === 'object' ? val?.name : val) || 'Receiver');
        return (
          <div>
            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              {receiverName}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {row.destination_city || row.delivery_branch || 'Destination'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'route',
      label: 'Corridor Route',
      width: 170,
      minWidth: 140,
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center space-x-1.5">
          <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {row.origin_city || row.booking_branch} ➔ {row.destination_city || row.delivery_branch}
          </span>
        </div>
      )
    },
    {
      key: 'freight_amount',
      label: 'Freight Amount',
      width: 140,
      minWidth: 120,
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <div>
          <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
            ₹ {Number(row.total_amount || row.freight_amount || 0).toLocaleString('en-IN')}
          </span>
          <div className="text-[9.5px] text-slate-400 font-mono">
            {row.charged_weight ? `${row.charged_weight} KG` : 'Std Freight'}
          </div>
        </div>
      )
    },
    {
      key: 'payment_type',
      label: 'Payment Mode',
      width: 120,
      minWidth: 100,
      sortable: true,
      align: 'center',
      render: (val) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
          val === 'TBB'
            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
            : val === 'PAID'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
        }`}>
          {val === 'TBB' ? '⭐ TBB' : val || 'TO_PAY'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Delivery & Invoicing Status',
      width: 180,
      minWidth: 160,
      sortable: true,
      align: 'center',
      render: (val, row) => {
        const isDelivered = row.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(val);
        const isPodUploaded = row.is_pod_uploaded || ['POD_UPLOADED', 'COMPLETED'].includes(val);
        const isTbb = row.payment_type === 'TBB';

        let badgeTone = 'blue';
        let badgeText = val;

        if (isPodUploaded) {
          badgeTone = 'purple';
          badgeText = '• POD Uploaded';
        } else if (isDelivered) {
          badgeTone = 'emerald';
          badgeText = '• Delivered';
        } else if (val === 'OUT_FOR_DELIVERY') {
          badgeTone = 'amber';
          badgeText = '• Out for Delivery';
        } else if (val === 'IN_TRANSIT') {
          badgeTone = 'blue';
          badgeText = '• In Transit';
        }

        return (
          <div className="flex flex-col items-center gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              badgeTone === 'purple'
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30'
                : badgeTone === 'emerald'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                : badgeTone === 'amber'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                : 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30'
            }`}>
              {badgeText}
            </span>
            {isTbb && isDelivered ? (
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Ready to Bill</span>
              </span>
            ) : isTbb ? (
              <span className="text-[9px] text-amber-500 font-medium">
                Pending Delivery
              </span>
            ) : null}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 175,
      minWidth: 165,
      sortable: false,
      align: 'center',
      render: (val, row) => {
        const isToPay = row.payment_type === 'TO_PAY';
        const hasPod = Boolean(row.pod_url || row.is_pod_completed || ['POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(row.status));

        return (
          <div className="flex items-center justify-center space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {canCreateInvoice && isToPay && (
              <button
                onClick={() => openCollectFreightModal(row)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all whitespace-nowrap shrink-0 h-7"
                title="Collect To-Pay freight amount from Consignee & generate Delivery Bill / MR"
              >
                <Banknote className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Collect</span>
              </button>
            )}

            {canCreateInvoice && !isToPay && (
              <button
                onClick={() => openQuickBillModal(row)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all whitespace-nowrap shrink-0 h-7"
                title="Instant 1-Click GST Freight Tax Invoice for this docket"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Quick Bill</span>
              </button>
            )}

            {hasPod && (
              <button
                onClick={() => setPodModalDocket(row)}
                className="h-7 w-7 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold shadow-xs active:scale-95 transition-all inline-flex items-center justify-center shrink-0"
                title="View verified Proof of Delivery (POD) document"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          </div>
        );
      }
    }
  ], [canCreateInvoice, termPlural, termSingular, openCollectFreightModal, openQuickBillModal]);

  return (
    <>
      {/* ======================================================== */}
      {/* GLOBAL PRINT STYLES FOR CRISP FULL-PAGE A4 GST INVOICES  */}
      {/* ======================================================== */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 10mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #screen-app-layout,
          .no-print,
          aside,
          nav,
          header,
          footer {
            display: none !important;
          }
          .invoice-print-dialog {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .invoice-print-card {
            position: static !important;
            display: block !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          #invoice-printable-sheet {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12px 16px !important;
            border: 1.5px solid #334155 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* ======================================================== */}
      {/* MAIN SCREEN APPLICATION LAYOUT (HIDDEN ON PRINT)         */}
      {/* ======================================================== */}
      <div
        id="screen-app-layout"
        className={`flex min-h-screen transition-colors duration-300 ${
          isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
        } font-sans`}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />

          <main className="flex-1 p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
            
            {/* Header Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <Receipt className="w-6 h-6 text-cyan-400" />
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    GST Freight Billing & Invoices
                  </h1>
                </div>
                <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Operational TBB credit billing, delivery branch reconciliation, and customer receivables.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={loadDatabaseRecords}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Refresh Database Records"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>

                {canExport && (
                  <button
                    onClick={handleExportGstr1}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                    title="Export official GSTR-1 Outward B2B Supply Sheet"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span className="hidden sm:inline">Export GSTR-1</span>
                  </button>
                )}

                {canCreateInvoice && (
                  <button
                    onClick={() => {
                      setSelectedCustomerId('');
                      setSelectedLrIds([]);
                      setWizardPaymentFilter('TBB');
                      setIsGenerateModalOpen(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
                    title="Consolidate multiple delivered dockets into a single monthly invoice for corporate clients"
                  >
                    <Layers className="w-4 h-4" />
                    <span>+ Batch / Consolidated Invoice</span>
                  </button>
                )}
              </div>
            </div>

            {/* Feedback Toast */}
            {toastMessage && (
              <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center space-x-2.5 shadow-md animate-in fade-in ${
                toastMessage.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}>
                {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{toastMessage.text}</span>
              </div>
            )}

            {/* Top 6 Financial KPIs (Including Live Unbilled TBB Credit) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div
                onClick={() => setActiveTab('INVOICES')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                  activeTab === 'INVOICES' ? 'ring-2 ring-blue-500/40' : ''
                } ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}
              >
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Invoiced</div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                  ₹ {kpis.totalInvoiced.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {invoiceCounts.all - invoiceCounts.cancelled} Active {invoiceCounts.cancelled > 0 ? `(${invoiceCounts.cancelled} Cancelled)` : 'Invoices'}
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveTab('UNBILLED');
                  setUnbilledFilter('TBB_READY');
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                  activeTab === 'UNBILLED' ? 'ring-2 ring-purple-500/40' : ''
                } ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}
              >
                <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center justify-between">
                  <span>Unbilled TBB Credit</span>
                  {kpis.unbilledTbbCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                  ₹ {kpis.unbilledTbbAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-purple-500/80 mt-1">
                  {kpis.unbilledTbbCount} Delivered {termPlural} Ready
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Received</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-500 dark:text-emerald-400 font-mono">
                  ₹ {kpis.totalReceived.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-500/80 mt-1">{invoiceCounts.paid} Invoices Cleared</div>
              </div>

              <div
                onClick={() => {
                  setActiveTab('INVOICES');
                  setStatusFilter('UNCLEARED');
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Outstanding Balance</div>
                <div className="text-xl sm:text-2xl font-black text-cyan-500 dark:text-cyan-400 font-mono">
                  ₹ {kpis.outstandingBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{invoiceCounts.unpaid + invoiceCounts.partial + invoiceCounts.overdue} Invoices Pending</div>
              </div>

              <div
                onClick={() => {
                  setActiveTab('INVOICES');
                  setStatusFilter('OVERDUE');
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Overdue Receivables</div>
                <div className={`text-xl sm:text-2xl font-black font-mono ${kpis.overdueReceivables > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'}`}>
                  ₹ {kpis.overdueReceivables.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-rose-500/80 mt-1">{kpis.overdueReceivables > 0 ? `${invoiceCounts.overdue} Invoices Overdue` : 'Zero overdue'}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Collection Efficiency</div>
                <div className="text-xl sm:text-2xl font-black text-blue-500 dark:text-blue-400 font-mono">
                  {kpis.efficiency}%
                </div>
                <div className="text-[10px] text-blue-500/80 mt-1">Settled vs Invoiced</div>
              </div>
            </div>

            {/* Alert Banner for Delivered TBB Consignments Pending Invoicing */}
            {unbilledTbbDelivered.length > 0 && (
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark
                  ? 'bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/20 border-purple-800/50'
                  : 'bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50/30 border-purple-200 shadow-xs'
              }`}>
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {unbilledTbbDelivered.length} Delivered TBB {unbilledTbbDelivered.length === 1 ? termSingular : termPlural} Awaiting Freight Tax Invoice
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30">
                        ₹ {unbilledTbbPendingAmount.toLocaleString('en-IN')} Pending Billing
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Deliveries and PODs completed. Generate GST Freight Tax Invoices to dispatch formal bills to your corporate customers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => {
                      setActiveTab('UNBILLED');
                      setUnbilledFilter('TBB_READY');
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    View Pending Dockets
                  </button>
                  <button
                    onClick={() => {
                      const firstTbb = unbilledTbbDelivered[0];
                      if (firstTbb) {
                        const custId = firstTbb.consignor_id || firstTbb.consignee_id;
                        if (custId) setSelectedCustomerId(custId);
                        setSelectedLrIds([firstTbb.id]);
                        setWizardPaymentFilter('TBB');
                      }
                      setIsGenerateModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center space-x-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate Invoice</span>
                  </button>
                </div>
              </div>
            )}

            {/* Primary Navigation Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setActiveTab('UNBILLED');
                    setUnbilledFilter('ALL');
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'UNBILLED'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : isDark
                      ? 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Unbilled {termPlural} / Pending Invoicing</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold transition-all ${
                      activeTab === 'UNBILLED'
                        ? 'bg-white/20 text-white border border-white/20'
                        : unbilledCounts.all > 0
                        ? isDark
                          ? 'bg-purple-950/70 text-purple-300 border border-purple-700/60'
                          : 'bg-purple-100 text-purple-800 border border-purple-300'
                        : isDark
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {unbilledCounts.all > 0
                      ? `${unbilledCounts.all} Ready • ₹${unbilledCounts.allAmount.toLocaleString('en-IN')}`
                      : '0 Ready • ₹0'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('INVOICES')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'INVOICES'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : isDark
                      ? 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Tax Invoices</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold transition-all ${
                      activeTab === 'INVOICES'
                        ? 'bg-white/20 text-white border border-white/20'
                        : isDark
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {invoiceCounts.all} • ₹{invoiceCounts.allAmount.toLocaleString('en-IN')}
                  </span>
                </button>
              </div>
            </div>

            {/* Branch Scope Header & Filter Bar (Active for both Tax Invoices & Unbilled Dockets) */}
            {isUserAdmin && (
              <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Branch Scope</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Admin Network Access
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Filtering {activeTab === 'INVOICES' ? 'tax invoices' : 'dockets'} booked through (origin) or delivering to (destination) each branch.
                      </p>
                    </div>
                  </div>

                  {/* Searchable Branch Dropdown Selector at Far Right End */}
                  <div className="relative shrink-0 sm:ml-auto" ref={branchDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                      className={`px-3.5 py-2 rounded-xl transition-all flex items-center justify-between gap-2.5 text-xs font-semibold border min-w-[220px] sm:min-w-[260px] max-w-[320px] shadow-xs active:scale-[0.99] ${
                        selectedBranchObj
                          ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/20 font-bold'
                          : isDark
                          ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-purple-500 hover:bg-slate-800/90'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-purple-400 hover:bg-slate-50'
                      }`}
                      title="Select branch to filter dockets & invoices"
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {selectedBranchObj ? (
                          <>
                            <span className="text-xs shrink-0">📍</span>
                            <span className="truncate font-bold">
                              {selectedBranchObj.branch_name || selectedBranchObj.city}
                            </span>
                            <span className="text-[10px] font-mono opacity-80 shrink-0">
                              [{selectedBranchObj.branch_code}]
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs shrink-0">🌐</span>
                            <span className="truncate font-semibold">
                              All Branches
                            </span>
                            <span className="text-[10px] font-mono opacity-60 shrink-0">
                              ({branches.length})
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          selectedBranchObj
                            ? 'bg-white/20 text-white'
                            : isDark
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}>
                          {activeTab === 'INVOICES'
                            ? (selectedBranchObj
                                ? (branchInvoiceStats.countsMap[String(selectedBranchObj.id)] || 0)
                                : branchInvoiceStats.totalCount)
                            : (selectedBranchObj
                                ? (branchDocketStats.countsMap[String(selectedBranchObj.id)] || 0)
                                : branchDocketStats.totalCount)}
                        </span>

                        {selectedBranchObj && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBranchFilter('ALL');
                            }}
                            className="hover:bg-white/25 p-0.5 rounded-full transition-colors cursor-pointer"
                            title="Reset to All Branches"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </span>
                        )}

                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          selectedBranchObj ? 'text-white' : 'text-slate-400'
                        } ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Popover Dropdown */}
                    {isBranchDropdownOpen && (
                      <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 p-2.5 space-y-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
                        isDark
                          ? 'bg-[#0D1326]/98 border-slate-700/80 text-white'
                          : 'bg-white/98 border-slate-200 text-slate-800'
                      }`}>
                        {/* Search Box */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={branchSearch}
                            onChange={(e) => setBranchSearch(e.target.value)}
                            placeholder={`Search ${branches.length} branches by name, city, code...`}
                            className={`w-full pl-8 pr-7 py-2 rounded-xl text-xs font-medium border outline-none transition-all ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500'
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                            }`}
                            autoFocus
                          />
                          {branchSearch && (
                            <button
                              type="button"
                              onClick={() => setBranchSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options List */}
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {/* All Branches Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setBranchFilter('ALL');
                              setIsBranchDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                              branchFilter === 'ALL'
                                ? 'bg-purple-600 text-white font-bold'
                                : isDark
                                ? 'hover:bg-slate-800/80 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-purple-400">🌐</span>
                              <div>
                                <div className="font-semibold">All Branches (Global Network)</div>
                                <div className={`text-[10px] ${branchFilter === 'ALL' ? 'text-purple-200' : 'text-slate-400'}`}>
                                  Consolidated view of all active branches
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                branchFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-500/15 text-slate-400'
                              }`}>
                                {activeTab === 'INVOICES' ? branchInvoiceStats.totalCount : branchDocketStats.totalCount}
                              </span>
                              {branchFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </button>

                          {/* Branch Rows */}
                          {filteredDropdownBranches.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400">
                              No branches found matching "{branchSearch}"
                            </div>
                          ) : (
                            filteredDropdownBranches.map((b) => {
                              const isSelected = String(branchFilter) === String(b.id) || branchFilter === b.branch_code;
                              const count = activeTab === 'INVOICES'
                                ? (branchInvoiceStats.countsMap[String(b.id)] || 0)
                                : (branchDocketStats.countsMap[String(b.id)] || 0);
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setBranchFilter(b.id);
                                    setIsBranchDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                                    isSelected
                                      ? 'bg-purple-600 text-white font-bold'
                                      : isDark
                                      ? 'hover:bg-slate-800/80 text-slate-300'
                                      : 'hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <span className="text-purple-400 shrink-0">📍</span>
                                    <div className="min-w-0">
                                      <div className="font-semibold truncate">
                                        {b.branch_name || b.city}
                                      </div>
                                      <div className={`text-[10px] font-mono ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                                        {b.city && `${b.city} • `}[{b.branch_code}]
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 shrink-0">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : count > 0
                                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                                        : 'bg-slate-500/10 text-slate-400'
                                    }`}>
                                      {count}
                                    </span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* Dropdown Footer */}
                        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
                          <span>Showing {filteredDropdownBranches.length} of {branches.length} branches</span>
                          {selectedBranchObj && (
                            <button
                              type="button"
                              onClick={() => {
                                setBranchFilter('ALL');
                                setIsBranchDropdownOpen(false);
                              }}
                              className="text-purple-500 dark:text-purple-400 hover:underline font-semibold"
                            >
                              Reset to All
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 1. TAX INVOICES TABLE */}
            {activeTab === 'INVOICES' && (
              invoices.length === 0 && !isLoading ? (
                <div className={`p-12 rounded-3xl border text-center space-y-4 ${
                  isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      No Freight Invoices Found in Database
                    </h3>
                    <p className="text-xs text-slate-400">
                      {unbilledCounts.tbbAll > 0 ? (
                        <span>
                          You have <strong className="text-purple-400">{unbilledCounts.tbbReady} delivered TBB {termPlural.toLowerCase()} (₹{unbilledCounts.tbbReadyAmount.toLocaleString('en-IN')})</strong> ready for GST tax invoice generation.
                        </span>
                      ) : (
                        <span>
                          No invoices have been generated yet. When you book consignments with payment mode <strong className="text-slate-300">TBB (To Be Billed)</strong>, deliver them, and click Generate Invoice, they will appear here with delivery branch details.
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    {unbilledCounts.tbbAll > 0 && (
                      <button
                        onClick={() => {
                          setActiveTab('UNBILLED');
                          setUnbilledFilter('TBB_READY');
                        }}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isDark
                            ? 'bg-purple-950/40 border-purple-800 text-purple-300 hover:text-white'
                            : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        View Unbilled TBB ({unbilledCounts.tbbReady} Ready)
                      </button>
                    )}
                    <button
                      onClick={() => setIsGenerateModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 inline-flex items-center space-x-1.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Generate First Invoice</span>
                    </button>
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredInvoices}
                  loading={isLoading}
                  pageSizeOptions={[10, 15, 25, 50, 100]}
                  searchable={true}
                  searchPlaceholder={`Search by Invoice #, Customer, ${termSingular} #, Type (TBB, To Pay, Paid), GSTIN...`}
                  searchQuery={search}
                  onSearchChange={setSearch}
                  filtersSlot={
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          statusFilter === 'ALL'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All ({invoiceCounts.all} • ₹{kpis.totalInvoiced.toLocaleString('en-IN')})
                      </button>
                      <button
                        onClick={() => setStatusFilter('UNPAID')}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          statusFilter === 'UNPAID'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Unpaid / Open ({invoiceCounts.unpaid} • ₹{invoiceCounts.unpaidAmount.toLocaleString('en-IN')})
                      </button>
                      <button
                        onClick={() => setStatusFilter('OVERDUE')}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          statusFilter === 'OVERDUE'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Overdue ({invoiceCounts.overdue} • ₹{invoiceCounts.overdueAmount.toLocaleString('en-IN')})
                      </button>
                      <button
                        onClick={() => setStatusFilter('PARTIAL')}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          statusFilter === 'PARTIAL'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Partially Paid ({invoiceCounts.partial} • ₹{invoiceCounts.partialAmount.toLocaleString('en-IN')})
                      </button>
                      <button
                        onClick={() => setStatusFilter('PAID')}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          statusFilter === 'PAID'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Paid & Cleared ({invoiceCounts.paid} • ₹{invoiceCounts.paidAmount.toLocaleString('en-IN')})
                      </button>
                      {invoiceCounts.cancelled > 0 && (
                        <button
                          onClick={() => setStatusFilter('CANCELLED')}
                          className={`px-3 py-1.5 rounded-xl transition-all ${
                            statusFilter === 'CANCELLED'
                              ? 'bg-slate-700 text-white shadow-sm'
                              : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Cancelled ({invoiceCounts.cancelled})
                        </button>
                      )}
                    </div>
                  }
                  exportable={true}
                  exportFileName="GST_Invoices_Register"
                  emptyMessage="No invoices found matching criteria."
                />
              )
            )}

            {/* TAB CONTENT: 2. UNBILLED DOCKETS / PENDING BILLING TABLE */}
            {activeTab === 'UNBILLED' && (
              <div className="space-y-4">


                <DataTable
                  columns={unbilledColumns}
                  data={filteredUnbilledConsignments}
                  loading={isLoading}
                  pageSizeOptions={[10, 15, 25, 50, 100]}
                  searchable={true}
                  searchPlaceholder={`Search unbilled ${termPlural.toLowerCase()} by Docket #, Shipper, Consignee, Route, GSTIN...`}
                  searchQuery={unbilledSearch}
                  onSearchChange={setUnbilledSearch}
                  filtersSlot={
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      <button
                        onClick={() => {
                          setUnbilledFilter('ALL');
                          setShowPendingTransit(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          unbilledFilter === 'ALL' && !showPendingTransit
                            ? 'bg-purple-600 text-white shadow-sm font-bold'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title="All delivered dockets ready for invoicing"
                      >
                        All Delivered ({unbilledCounts.all} • ₹{unbilledCounts.allAmount.toLocaleString('en-IN')})
                      </button>

                      {unbilledCounts.toPay > 0 && (
                        <button
                          onClick={() => {
                            setUnbilledFilter('TO_PAY');
                            setShowPendingTransit(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
                            unbilledFilter === 'TO_PAY' && !showPendingTransit
                              ? 'bg-amber-600 text-white shadow-sm font-bold'
                              : isDark ? 'bg-slate-800 text-amber-400 hover:text-white border border-amber-500/20' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          <span>💰 To-Pay Delivered</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
                            {unbilledCounts.toPay} • ₹{unbilledCounts.toPayAmount.toLocaleString('en-IN')}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setUnbilledFilter('TBB_READY');
                          setShowPendingTransit(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
                          unbilledFilter === 'TBB_READY' && !showPendingTransit
                            ? 'bg-purple-600 text-white shadow-sm font-bold'
                            : isDark
                            ? 'bg-slate-800 text-purple-400 hover:text-white border border-purple-500/20'
                            : 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100'
                        }`}
                        title="Delivered TBB dockets with POD verified, ready to generate invoice"
                      >
                        <span>⭐ TBB Credit</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
                          {unbilledCounts.tbbReady} • ₹{unbilledCounts.tbbReadyAmount.toLocaleString('en-IN')}
                        </span>
                      </button>

                      {unbilledCounts.paid > 0 && (
                        <button
                          onClick={() => {
                            setUnbilledFilter('PAID');
                            setShowPendingTransit(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all ${
                            unbilledFilter === 'PAID' && !showPendingTransit
                              ? 'bg-emerald-600 text-white shadow-sm font-bold'
                              : isDark ? 'bg-slate-800 text-emerald-400 hover:text-white border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          Paid Upfront ({unbilledCounts.paid} • ₹{unbilledCounts.paidAmount.toLocaleString('en-IN')})
                        </button>
                      )}

                      {unbilledCounts.inTransit > 0 && (
                        <button
                          onClick={() => setShowPendingTransit(!showPendingTransit)}
                          className={`px-3 py-1.5 rounded-xl transition-all border ${
                            showPendingTransit
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isDark
                              ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
                          }`}
                          title="Toggle to view dockets still booked or in transit/hub (cannot be billed yet)"
                        >
                          {showPendingTransit
                            ? `Showing Hub & Booked (${unbilledCounts.inTransit}) ✕`
                            : `Include Hub / Booked (${unbilledCounts.inTransit})`}
                        </button>
                      )}
                    </div>
                  }
                  exportable={true}
                  exportFileName="Unbilled_Consignments_Register"
                  emptyMessage="No unbilled consignments found matching criteria."
                />
              </div>
            )}

            {/* Quick Actions Strip (Customer Ledger & TDS Reconciliation) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className={`p-4 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1">Customer Ledger Statement</span>
                  <p className="text-[11px] text-slate-400">Generate signed ledger statements and send WhatsApp payment reminders for uncleared balances.</p>
                </div>
                <button
                  onClick={() => setIsLedgerModalOpen(true)}
                  className="w-full mt-3 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 text-cyan-600 dark:text-cyan-300 text-xs font-bold text-center transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>View Uncleared Ledgers</span>
                  <span>➔</span>
                </button>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-[#0B1020]/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1">TDS Certificate (26AS) Reconciliation</span>
                  <p className="text-[11px] text-slate-400">Match Section 194C TDS credits deducted by corporate enterprise consignors.</p>
                </div>
                <button
                  onClick={() => setIsTdsModalOpen(true)}
                  className="w-full mt-3 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-blue-600 dark:text-blue-300 text-xs font-bold text-center transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>Reconcile TDS</span>
                  <span>➔</span>
                </button>
              </div>
            </div>

          </main>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. PRINT OFFICIAL GST FREIGHT TAX INVOICE MODAL           */}
      {/* ======================================================== */}
      {printModalInvoice && (
        <div className="invoice-print-dialog fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6 print:p-0">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm no-print" onClick={() => setPrintModalInvoice(null)} />
          <div className="invoice-print-card relative w-full max-w-4xl my-auto max-h-[95vh] overflow-y-auto rounded-3xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl z-10 space-y-5">
            
            {/* Top Action Toolbar (Hidden during print) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Official GST Freight Tax Invoice</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold">
                  {printModalInvoice.invoice_number}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setPrintModalInvoice(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE GST TAX INVOICE SHEET (DYNAMIC FROM SETTINGS) */}
            <div id="invoice-printable-sheet" className="space-y-4 bg-white text-slate-900">
              
              {/* Header: Transporter Profile from Settings */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {transporterDetails.businessName}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {transporterDetails.tagline}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {transporterDetails.fullAddress}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Phone: {transporterDetails.phone} • Email: {transporterDetails.email}
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-wider">
                    GST TAX INVOICE
                  </div>
                  <div className="text-xs font-black font-mono text-slate-900">
                    GSTIN: {transporterDetails.gstin}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    SAC Code: <strong className="font-mono text-slate-900">{transporterDetails.sacCode}</strong> (Road Freight)
                  </div>
                </div>
              </div>

              {/* Billed To & Invoice Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Billed To (Consignor / Party):
                  </span>
                  <div className="font-black text-sm text-slate-900">
                    {typeof printModalInvoice.customer === 'object'
                      ? (printModalInvoice.customer?.name || 'Customer Account')
                      : (printModalInvoice.customer || 'Customer Account')}
                  </div>
                  <div className="font-mono text-slate-700">
                    GSTIN / UIN: <span className="font-bold text-slate-900">
                      {typeof printModalInvoice.gstin === 'string'
                        ? printModalInvoice.gstin
                        : (printModalInvoice.customer?.gstin || 'URP')}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Branch of Delivery: <strong className="text-slate-900">
                        {typeof printModalInvoice.delivery_branch === 'object'
                          ? (printModalInvoice.delivery_branch?.branch_name || 'Destination Branch')
                          : (printModalInvoice.delivery_branch || 'Destination Branch')}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70 space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <span className="font-black text-slate-900">{printModalInvoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Date:</span>
                    <span className="font-bold text-slate-900">{printModalInvoice.invoice_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credit Due Date:</span>
                    <span className="font-black text-rose-600">{printModalInvoice.due_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reverse Charge (RCM):</span>
                    <span className="font-bold text-slate-900">No (Forward Charge 5%)</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table (Using Configured Terminology) */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">{termSingular} Number</th>
                      <th className="p-2">Booking Date</th>
                      <th className="p-2">Origin ➔ Delivery Branch</th>
                      <th className="p-2 text-right">Weight (Kg)</th>
                      <th className="p-2 text-right">Taxable Freight (₹)</th>
                      <th className="p-2 text-right">GST (₹)</th>
                      <th className="p-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {printModalInvoice.items && printModalInvoice.items.length > 0 ? (
                      printModalInvoice.items.map((item, idx) => {
                        const itemTaxable = Number(item.taxable_amount || item.freight_amount || (item.total_amount && item.tax_amount ? item.total_amount - item.tax_amount : (item.total_amount ? Math.round(item.total_amount / 1.05) : printModalInvoice.taxable_amount)) || 0);
                        const itemGst = Number(item.tax_amount || item.gst_amount || (item.total_amount ? item.total_amount - itemTaxable : printModalInvoice.gst_amount) || 0);
                        const itemTotal = Number(item.total_amount || (itemTaxable + itemGst) || printModalInvoice.total_amount || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{item.docket_number || item.lr_number}</td>
                            <td className="p-2 text-slate-600">{item.booking_date}</td>
                            <td className="p-2 font-sans">{item.origin_city} ➔ {typeof printModalInvoice.delivery_branch === 'object' ? (printModalInvoice.delivery_branch?.branch_name || 'Destination') : (printModalInvoice.delivery_branch || item.destination_city)}</td>
                            <td className="p-2 text-right">{item.charged_weight || '—'}</td>
                            <td className="p-2 text-right text-slate-900 font-bold">₹ {itemTaxable.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right text-slate-600">₹ {itemGst.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right font-black text-slate-900">₹ {itemTotal.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="p-2 text-slate-400">1</td>
                        <td className="p-2 font-bold text-slate-900">{printModalInvoice.invoice_number}-CONSOLIDATED</td>
                        <td className="p-2 text-slate-600">{printModalInvoice.invoice_date}</td>
                        <td className="p-2 font-sans">Full Truckload Transport ➔ {typeof printModalInvoice.delivery_branch === 'object' ? (printModalInvoice.delivery_branch?.branch_name || 'Destination') : (printModalInvoice.delivery_branch || 'Destination')}</td>
                        <td className="p-2 text-right">Standard</td>
                        <td className="p-2 text-right text-slate-900 font-bold">₹ {Number(printModalInvoice.taxable_amount).toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right text-slate-600">₹ {Number(printModalInvoice.gst_amount).toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right font-black text-slate-900">₹ {Number(printModalInvoice.total_amount).toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakup & Bank Details */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70 text-xs space-y-1">
                  <span className="font-bold text-slate-800 text-[11px] block">
                    Bank Details for Remittance (NEFT / RTGS):
                  </span>
                  <div className="font-mono text-slate-700 text-[11px]">
                    Bank: <strong className="text-slate-900">{transporterDetails.bankName}</strong>
                  </div>
                  <div className="font-mono text-slate-700 text-[11px]">
                    A/C No: <strong className="text-slate-900">{transporterDetails.accountNumber}</strong>
                  </div>
                  <div className="font-mono text-slate-700 text-[11px]">
                    IFSC Code: <strong className="text-slate-900">{transporterDetails.ifscCode}</strong>
                  </div>
                  <div className="font-mono text-slate-700 text-[11px]">
                    Branch: <strong className="text-slate-900">{transporterDetails.bankBranch}</strong>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Freight Value:</span>
                    <span>₹ {Number(printModalInvoice.taxable_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST @ 2.5%:</span>
                    <span>₹ {Number(Math.round(printModalInvoice.gst_amount / 2)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST @ 2.5%:</span>
                    <span>₹ {Number(Math.round(printModalInvoice.gst_amount / 2)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-300">
                    <span>Total Invoice Amount:</span>
                    <span>₹ {Number(printModalInvoice.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Declaration & Signatory */}
              <div className="pt-3 border-t border-slate-300 flex justify-between items-end text-xs">
                <div className="text-[10px] text-slate-500 max-w-sm">
                  Declaration: We declare that this invoice shows the actual price of the goods and transportation services described and that all particulars are true and correct.
                </div>
                <div className="text-center font-bold">
                  <div className="h-10 flex items-center justify-center text-slate-400 italic text-[11px]">
                    [Digitally Signed & Verified]
                  </div>
                  <div className="border-t border-slate-400 pt-1 text-slate-900 text-xs">
                    For {transporterDetails.businessName}<br/>
                    <span className="text-[10px] font-normal text-slate-500">Authorized Signatory</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. GENERATE INVOICE MODAL (WIZARD FOR TBB CUSTOMERS)     */}
      {/* ======================================================== */}
      {isGenerateModalOpen && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-3 sm:p-6">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={() => setIsGenerateModalOpen(false)} />
          <div className="relative w-full max-w-4xl lg:max-w-5xl my-auto max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl z-10 text-slate-900 dark:text-white space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generate GST Freight Invoice</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Consolidate unbilled dockets into a single freight invoice with automated charges, taxes, and customer credit ledger tracking.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsGenerateModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-5 text-xs">
              
              {/* Step 1: Customer (Party) Selection & Terms Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-cyan-500" />
                    <span>Party & Invoice Terms</span>
                  </span>
                  {customerUnbilledAll.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-[11px] border border-cyan-500/20">
                      {customerUnbilledAll.length} Unbilled Dockets Found (₹ {customerUnbilledAll.reduce((sum, ub) => sum + parseFloat(ub.total_amount || ub.freight_amount || 0), 0).toLocaleString('en-IN')})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Select Customer (Party) *</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        const newCustId = e.target.value;
                        setSelectedCustomerId(newCustId);
                        const targetIdStr = String(newCustId);
                        const custObj = customersList.find((c) => String(c.id) === targetIdStr);
                        const cName = custObj?.name?.trim()?.toLowerCase();
                        const cGstin = custObj?.gstin?.trim()?.toLowerCase();
                        const matching = unbilledConsignments.filter((ub) => {
                          if (ub.consignor_id && String(ub.consignor_id) === targetIdStr) return true;
                          if (ub.consignee_id && String(ub.consignee_id) === targetIdStr) return true;
                          if (ub.consignor?.id && String(ub.consignor.id) === targetIdStr) return true;
                          if (ub.consignee?.id && String(ub.consignee.id) === targetIdStr) return true;
                          if (cGstin && cGstin !== 'urp' && (ub.customer_gstin || ub.consignor?.gstin || ub.consignee?.gstin)?.trim()?.toLowerCase() === cGstin) return true;
                          if (cName && ((ub.customer || ub.consignor?.name)?.trim()?.toLowerCase() === cName || ub.consignee?.name?.trim()?.toLowerCase() === cName)) return true;
                          return false;
                        });
                        // Automatically select all unbilled dockets for this customer for 1-click batch billing
                        setSelectedLrIds(matching.map((ub) => ub.id));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                    >
                      {customersList.length === 0 ? (
                        <option value="">No customers found in database</option>
                      ) : (
                        customersList.map((c) => {
                          const targetIdStr = String(c.id);
                          const cName = c.name?.trim()?.toLowerCase();
                          const cGstin = c.gstin?.trim()?.toLowerCase();

                          const custUnbilled = unbilledConsignments.filter((ub) => {
                            if (ub.consignor_id && String(ub.consignor_id) === targetIdStr) return true;
                            if (ub.consignee_id && String(ub.consignee_id) === targetIdStr) return true;
                            if (ub.consignor?.id && String(ub.consignor.id) === targetIdStr) return true;
                            if (ub.consignee?.id && String(ub.consignee.id) === targetIdStr) return true;
                            if (cGstin && cGstin !== 'urp' && (ub.customer_gstin || ub.consignor?.gstin || ub.consignee?.gstin)?.trim()?.toLowerCase() === cGstin) return true;
                            if (cName && ((ub.customer || ub.consignor?.name)?.trim()?.toLowerCase() === cName || ub.consignee?.name?.trim()?.toLowerCase() === cName)) return true;
                            return false;
                          });

                          const tbbCount = custUnbilled.filter((ub) => ub.payment_type === 'TBB').length;
                          const totalAmt = custUnbilled.reduce(
                            (sum, ub) => sum + parseFloat(ub.total_amount || ub.freight_amount || 0),
                            0
                          );
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.gstin ? `(${c.gstin})` : ''}
                              {custUnbilled.length > 0
                                ? ` — ${custUnbilled.length} Dockets (₹${totalAmt.toLocaleString('en-IN')})`
                                : ' — (0 Dockets)'}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Invoice Date *</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Credit Term (TBB Days) *</label>
                    <select
                      value={creditDays}
                      onChange={(e) => setCreditDays(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                    >
                      <option value={15}>15 Days Credit</option>
                      <option value={30}>30 Days Credit (Standard TBB)</option>
                      <option value={45}>45 Days Credit</option>
                      <option value={60}>60 Days Credit</option>
                    </select>
                  </div>
                </div>

                {/* Customer Outstanding Alert Banner */}
                {currentSelectedCustomer && currentSelectedCustomer.current_balance > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        Uncleared Ledger Balance for <strong>{currentSelectedCustomer.name}</strong>:
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-500 text-sm">
                      ₹ {Number(currentSelectedCustomer.current_balance).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: Unbilled Dockets Selection Queue (Multi-Docket Batch Ready) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                        <Truck className="w-4 h-4 text-cyan-500" />
                        <span>Select Dockets to Include in this Invoice</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10.5px]">
                        {wizardCalculations.selectedCount} of {unbilledForCustomer.length} Selected
                      </span>
                    </div>

                    {/* Payment Mode Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setWizardPaymentFilter('ALL')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          wizardPaymentFilter === 'ALL'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        All ({wizardPaymentCounts.all})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardPaymentFilter('TBB')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          wizardPaymentFilter === 'TBB'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
                        }`}
                        title="To Be Billed - Recommended for corporate credit billing"
                      >
                        ⭐ TBB - Credit ({wizardPaymentCounts.tbb})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardPaymentFilter('TO_PAY')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          wizardPaymentFilter === 'TO_PAY'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                        title="To-Pay - Paid by Consignee upon delivery at destination branch"
                      >
                        To-Pay ({wizardPaymentCounts.to_pay})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardPaymentFilter('PAID')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          wizardPaymentFilter === 'PAID'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                        title="Paid - Paid in advance at booking counter"
                      >
                        Paid Upfront ({wizardPaymentCounts.paid})
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                    <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyDeliveredPod}
                        onChange={(e) => setOnlyDeliveredPod(e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                      />
                      <span>Only Delivered & POD Done</span>
                    </label>

                    {unbilledForCustomer.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentFilteredIds = unbilledForCustomer.map((c) => c.id);
                          const allSelected = currentFilteredIds.every((id) => selectedLrIds.includes(id));
                          if (allSelected) {
                            setSelectedLrIds(selectedLrIds.filter((id) => !currentFilteredIds.includes(id)));
                          } else {
                            setSelectedLrIds(Array.from(new Set([...selectedLrIds, ...currentFilteredIds])));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 border transition-all ${
                          unbilledForCustomer.map((c) => c.id).every((id) => selectedLrIds.includes(id))
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                            : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500 shadow-xs'
                        }`}
                      >
                        {unbilledForCustomer.map((c) => c.id).every((id) => selectedLrIds.includes(id)) ? (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Deselect All</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Select All ({unbilledForCustomer.length} Dockets)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Unbilled List Queue Container with Comfortable Height */}
                <div className="max-h-72 sm:max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-slate-950/50">
                  {unbilledForCustomer.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-1.5">
                      <FolderOpen className="w-7 h-7 mx-auto opacity-50" />
                      <p className="font-bold text-xs text-slate-600 dark:text-slate-300">
                        {onlyDeliveredPod
                          ? `No dockets with completed POD & delivery found for ${currentSelectedCustomer?.name || 'this customer'}.`
                          : wizardPaymentFilter === 'TBB'
                          ? `No unbilled TBB (To Be Billed) ${termPlural.toLowerCase()} found for ${currentSelectedCustomer?.name || 'this customer'}.`
                          : wizardPaymentFilter === 'TO_PAY'
                          ? `No To-Pay ${termPlural.toLowerCase()} found for ${currentSelectedCustomer?.name || 'this customer'}.`
                          : wizardPaymentFilter === 'PAID'
                          ? `No Paid ${termPlural.toLowerCase()} found for ${currentSelectedCustomer?.name || 'this customer'}.`
                          : `No unbilled ${termPlural.toLowerCase()} found for ${currentSelectedCustomer?.name || 'this customer'}.`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {onlyDeliveredPod
                          ? 'Uncheck "Only Delivered & POD Done" or complete delivery at destination branch first.'
                          : 'Try switching to "All" tab above to view all dockets.'}
                      </p>
                    </div>
                  ) : (
                    unbilledForCustomer.map((lr) => {
                      const isChecked = selectedLrIds.includes(lr.id);
                      const isDelivered = lr.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(lr.status);
                      const isPaidUpfront = lr.payment_type === 'PAID';
                      const isToPayCollected = lr.payment_type === 'TO_PAY' && isDelivered;

                      const baseFreightVal = parseFloat(lr.freight_amount || 0);
                      const loadingVal = parseFloat(lr.loading_charges || lr.hamali_charges || 0);
                      const unloadingVal = parseFloat(lr.unloading_charges || 0);
                      const deliveryVal = parseFloat(lr.door_delivery_charges || 0);
                      const otherVal = parseFloat(lr.other_charges || lr.handling_charges || lr.fuel_surcharge || 0);

                      return (
                        <div
                          key={lr.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedLrIds(selectedLrIds.filter((id) => id !== lr.id));
                            } else {
                              setSelectedLrIds([...selectedLrIds, lr.id]);
                            }
                          }}
                          className={`p-3.5 flex items-start sm:items-center justify-between cursor-pointer transition-all ${
                            isChecked ? 'bg-cyan-500/10 dark:bg-cyan-950/30' : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <div className="flex items-start sm:items-center space-x-3.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-1 sm:mt-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4 shrink-0"
                            />
                            <div className="space-y-1">
                              {/* Top Row: Docket #, Badges */}
                              <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center flex-wrap gap-2 text-xs">
                                <span className="text-blue-600 dark:text-cyan-400">
                                  {termSingular === 'Docket' ? (lr.docket_number || lr.lr_number) : (lr.lr_number || lr.docket_number)}
                                </span>
                                
                                {/* Payment Mode Badge */}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  lr.payment_type === 'TBB'
                                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                    : lr.payment_type === 'PAID'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                }`}>
                                  {lr.payment_type === 'TBB' ? '⭐ TBB (Credit)' : lr.payment_type || 'TO_PAY'}
                                </span>

                                {/* Delivery Status Badge */}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                  isDelivered
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : lr.status === 'OUT_FOR_DELIVERY'
                                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                                    : lr.status === 'IN_TRANSIT'
                                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                    : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                                }`}>
                                  {isDelivered ? '✓ Delivered & POD Uploaded' : lr.delivery_status_label || lr.status || 'Booked'}
                                </span>
                              </div>

                              {/* Route & Shipment Meta */}
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center flex-wrap gap-x-3 gap-y-0.5">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-cyan-500 shrink-0" />
                                  <span>From: <strong className="text-slate-700 dark:text-slate-300">{lr.booking_branch || lr.origin_city}</strong></span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span>To: <strong className="text-slate-700 dark:text-slate-300">{lr.delivery_branch || lr.destination_city}</strong></span>
                                </span>
                                <span>• {lr.charged_weight || lr.actual_weight || 0} kg • {lr.booking_date}</span>
                              </div>

                              {/* Granular Charges Breakdown on Docket Card */}
                              <div className="flex items-center flex-wrap gap-1.5 pt-0.5 text-[10.5px]">
                                {baseFreightVal > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                    Base: ₹{baseFreightVal.toLocaleString('en-IN')}
                                  </span>
                                )}
                                {loadingVal > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                                    Loading: ₹{loadingVal.toLocaleString('en-IN')}
                                  </span>
                                )}
                                {unloadingVal > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                                    Unloading: ₹{unloadingVal.toLocaleString('en-IN')}
                                  </span>
                                )}
                                {deliveryVal > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                                    Delivery: ₹{deliveryVal.toLocaleString('en-IN')}
                                  </span>
                                )}
                                {otherVal > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
                                    Other: ₹{otherVal.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Docket Total Amount & Status */}
                          <div className="text-right shrink-0 pl-3">
                            <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                              ₹ {Number(lr.total_amount).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] font-semibold mt-0.5">
                              {lr.payment_type === 'TBB' ? (
                                isDelivered ? (
                                  <span className="text-emerald-500 font-bold flex items-center gap-1 justify-end">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>POD Done • Ready to Bill</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-500 font-medium flex items-center gap-1 justify-end">
                                    <Clock className="w-3 h-3" />
                                    <span>Pending Delivery</span>
                                  </span>
                                )
                              ) : isPaidUpfront ? (
                                <span className="text-emerald-600 dark:text-emerald-400">Paid Upfront (₹0 Due)</span>
                              ) : isToPayCollected ? (
                                <span className="text-emerald-600 dark:text-emerald-400">Collected at Branch</span>
                              ) : (
                                <span className="text-amber-500">To-Pay at Destination</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Informational Guidance Notice for Prepaid Items */}
              {wizardCalculations.hasPrepaidItems && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                  <div>
                    <span className="font-bold">Prepaid / Destination-Collected Freight Included:</span>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      Selected dockets include <strong>₹ {wizardCalculations.prepaidAmount.toLocaleString('en-IN')}</strong> of freight already settled (paid upfront at booking or collected upon delivery). The GST Freight Invoice will record this as <strong>Paid & Settled</strong> and will NOT add it as an unpaid debt to the customer's ledger.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Granular Docket Charges Breakdown & Taxes */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 space-y-4">
                
                {/* Visual Charges Breakdown Card from Selected Dockets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Charges Breakdown from Selected {wizardCalculations.selectedCount} Docket(s)</span>
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      All docket charges are automatically factored into Taxable Subtotal
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10.5px] text-slate-400 block font-medium">Base Freight</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                        ₹ {wizardCalculations.docketsBaseFreight.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] text-slate-400 font-medium">Loading / Hamali</span>
                        {wizardCalculations.docketsLoading > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                            Included
                          </span>
                        )}
                      </div>
                      <span className={`font-mono font-bold text-sm mt-0.5 block ${
                        wizardCalculations.docketsLoading > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        ₹ {wizardCalculations.docketsLoading.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] text-slate-400 font-medium">Door Delivery</span>
                        {wizardCalculations.docketsDoorDelivery > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                            Included
                          </span>
                        )}
                      </div>
                      <span className={`font-mono font-bold text-sm mt-0.5 block ${
                        wizardCalculations.docketsDoorDelivery > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        ₹ {wizardCalculations.docketsDoorDelivery.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] text-slate-400 font-medium">Other Surcharges</span>
                        {(wizardCalculations.docketsUnloading + wizardCalculations.docketsOther + wizardCalculations.docketsHandling) > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                            Included
                          </span>
                        )}
                      </div>
                      <span className={`font-mono font-bold text-sm mt-0.5 block ${
                        (wizardCalculations.docketsUnloading + wizardCalculations.docketsOther + wizardCalculations.docketsHandling) > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        ₹ {(wizardCalculations.docketsUnloading + wizardCalculations.docketsOther + wizardCalculations.docketsHandling).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Charges Input & GST Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Additional Charges (Halting/Detention) (₹)
                    </label>
                    <input
                      type="number"
                      value={extraCharges}
                      onChange={(e) => setExtraCharges(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {wizardCalculations.totalDocketSurcharges > 0 
                        ? `Docket charges (₹${wizardCalculations.totalDocketSurcharges.toLocaleString('en-IN')}) are already included above.`
                        : 'Optional extra halting or unforeseen invoice charges.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">GST Rate (GTA SAC 9965)</label>
                    <select
                      value={taxRate}
                      disabled={isRcm}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value={5.0}>5.0% (CGST 2.5% + SGST 2.5%)</option>
                      <option value={12.0}>12.0% (With ITC)</option>
                      <option value={0.0}>0.0% (Exempt)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Standard Goods Transport Agency rate
                    </p>
                  </div>

                  <div className="space-y-1 flex flex-col justify-center pt-2 sm:pt-0">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="rcmCheck"
                        checked={isRcm}
                        onChange={(e) => setIsRcm(e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        GST Reverse Charge (RCM)
                      </span>
                    </label>
                    <p className="text-[10.5px] text-slate-400 pl-6 leading-tight">
                      Tax paid directly by Customer to GST portal
                    </p>
                  </div>
                </div>

                {/* Calculation Summary Metric Cards Bar */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10.5px] font-medium">Taxable Subtotal</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
                      ₹ {wizardCalculations.taxable.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10.5px] font-medium">GST Amount</span>
                    <span className="font-mono font-bold text-emerald-500 text-sm mt-0.5 block">
                      {isRcm ? '₹ 0 (RCM)' : `₹ ${wizardCalculations.gstAmount.toLocaleString('en-IN')}`}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10.5px] font-medium">Total Invoice</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-sm mt-0.5 block">
                      ₹ {wizardCalculations.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10.5px] font-medium">Already Settled</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                      ₹ {wizardCalculations.prepaidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10.5px] font-medium">Net Credit Due</span>
                    <span className={`font-mono font-black text-sm mt-0.5 block ${
                      wizardCalculations.creditDueAmount > 0 ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                      ₹ {wizardCalculations.creditDueAmount.toLocaleString('en-IN')}
                    </span>
                    {wizardCalculations.creditDueAmount > 0 && (
                      <span className="text-[10px] text-cyan-500 block font-mono mt-0.5">Due: {wizardCalculations.computedDueDate}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wizardCalculations.selectedCount === 0 || isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Generating Invoice...'
                      : `Generate Freight Invoice for ${wizardCalculations.selectedCount} ${termPlural} (₹ ${wizardCalculations.totalAmount.toLocaleString('en-IN')}) ➔`}
                  </span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RECORD PAYMENT / COLLECT REMITTANCE MODAL              */}
      {/* ======================================================== */}
      {paymentModalInvoice && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPaymentModalInvoice(null)} />
          <div className="relative w-full max-w-md my-auto max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 text-slate-900 dark:text-white space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold">Record Customer Remittance</h3>
              </div>
              <button onClick={() => setPaymentModalInvoice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">Invoice & Customer:</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {paymentModalInvoice.invoice_number} • {paymentModalInvoice.customer}
                </div>
                <div className="text-slate-400 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <span>Delivery Branch: {paymentModalInvoice.delivery_branch}</span>
                </div>
                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <span className="text-slate-400">Total Billed: ₹{paymentModalInvoice.total_amount.toLocaleString('en-IN')}</span>
                  <span className="font-mono font-bold text-rose-500 dark:text-rose-400">
                    Uncleared: ₹{paymentModalInvoice.balance_amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Amount Received Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Amount Received in Bank (₹) *</label>
                <input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Section 194C TDS Deduction option */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-blue-500" />
                    <span>TDS Deducted (Sec 194C)</span>
                  </label>
                  <div className="space-x-1">
                    <button
                      type="button"
                      onClick={() => setTdsDeducted(Math.round(paymentModalInvoice.taxable_amount * 0.01))}
                      className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold"
                    >
                      1% (Individual)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTdsDeducted(Math.round(paymentModalInvoice.taxable_amount * 0.02))}
                      className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold"
                    >
                      2% (Corporate)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={tdsDeducted}
                  onChange={(e) => setTdsDeducted(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  Total settled against invoice: <strong className="text-slate-900 dark:text-white font-mono">₹ {(Number(receivedAmount) + Number(tdsDeducted)).toLocaleString('en-IN')}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Bank Reference / UTR Number *</label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. UTR879654210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isRecordingPayment}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isRecordingPayment ? 'Recording...' : 'Confirm Payment ➔'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CUSTOMER LEDGER STATEMENT & WHATSAPP REMINDER MODAL   */}
      {/* ======================================================== */}
      {isLedgerModalOpen && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsLedgerModalOpen(false)} />
          <div className="relative w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 text-slate-900 dark:text-white space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold">Customer Ledger & Uncleared Remittance</h3>
              </div>
              <button onClick={() => setIsLedgerModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Customer (Party)</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-medium"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.current_balance > 0 ? `(Uncleared: ₹${Number(c.current_balance).toLocaleString('en-IN')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Running Ledger Info */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Party Uncleared Outstanding:</span>
                  <span className="font-mono font-black text-rose-500 text-sm">
                    ₹ {Number(currentSelectedCustomer?.current_balance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Agreed Credit Term: {currentSelectedCustomer?.credit_days || 30} Days • Status: {currentSelectedCustomer?.current_balance > 0 ? 'Follow-up Required' : 'All Dues Cleared'}
                </div>
              </div>

              {/* Ready WhatsApp Reminder Message */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Preview WhatsApp Statement Reminder:</span>
                </span>
                <p className="font-mono text-[11px] bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-emerald-500/20">
                  "Dear {currentSelectedCustomer?.name || 'Customer'}, reminder from {transporterDetails.businessName} regarding uncleared freight bills. Current outstanding ledger balance is ₹ {Number(currentSelectedCustomer?.current_balance || 0).toLocaleString('en-IN')}. Kindly remit via NEFT/RTGS to {transporterDetails.bankName} A/C {transporterDetails.accountNumber} (IFSC: {transporterDetails.ifscCode}). Thank you!"
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const company = transporterDetails.businessName;
                  const bank = transporterDetails.bankName;
                  const acc = transporterDetails.accountNumber;
                  const text = encodeURIComponent(`Dear ${currentSelectedCustomer?.name}, reminder from ${company}. Current outstanding ledger balance is ₹ ${Number(currentSelectedCustomer?.current_balance || 0).toLocaleString('en-IN')}. Kindly remit to ${bank} A/C ${acc}.`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  setIsLedgerModalOpen(false);
                  showToast('WhatsApp reminder window triggered!');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send WhatsApp Reminder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TDS 194C RECONCILIATION WORKBENCH MODAL               */}
      {/* ======================================================== */}
      {isTdsModalOpen && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsTdsModalOpen(false)} />
          <div className="relative w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 text-slate-900 dark:text-white space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold">Form 26AS TDS (Section 194C) Workbench</h3>
              </div>
              <button onClick={() => setIsTdsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Match Section 194C transport contractor tax credits deducted by corporate consignors before filing annual income tax returns.
              </p>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center text-slate-400">
                TDS deductions recorded through invoice payments will be matched automatically against incoming Form 26AS records.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsTdsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. EDIT / EXTEND CREDIT DUE DATE MODAL                   */}
      {/* ======================================================== */}
      {editDueDateModalInvoice && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditDueDateModalInvoice(null)} />
          <div className="relative w-full max-w-md my-auto max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 text-slate-900 dark:text-white space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold">Extend Credit Due Date</h3>
              </div>
              <button onClick={() => setEditDueDateModalInvoice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDueDate} className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">Invoice & Customer:</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {editDueDateModalInvoice.invoice_number} • {editDueDateModalInvoice.customer}
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-slate-400">Current Due Date: <strong className="text-slate-700 dark:text-slate-300 font-mono">{editDueDateModalInvoice.due_date}</strong></span>
                  <span className="font-mono font-bold text-rose-500">₹ {editDueDateModalInvoice.balance_amount.toLocaleString('en-IN')} pending</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">New Credit Due Date *</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Extension Reason / Remarks</label>
                <input
                  type="text"
                  value={editDueRemarks}
                  onChange={(e) => setEditDueRemarks(e.target.value)}
                  placeholder="e.g. Approved monthly billing cycle / Customer approval"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditDueDateModalInvoice(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingDueDate}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUpdatingDueDate ? 'Saving...' : 'Update Due Date ➔'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. CANCEL / VOID INVOICE MODAL (RELEASE CONSIGNMENTS)    */}
      {/* ======================================================== */}
      {cancelModalInvoice && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCancelModalInvoice(null)} />
          <div className="relative w-full max-w-md my-auto max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-rose-500/30 p-6 shadow-2xl z-10 text-slate-900 dark:text-white space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-rose-500">Cancel & Void Invoice</h3>
              </div>
              <button onClick={() => setCancelModalInvoice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelInvoice} className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1.5">
                <p className="font-bold">Are you sure you want to cancel invoice {cancelModalInvoice.invoice_number}?</p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  This will reverse the ledger debit of <strong>₹{cancelModalInvoice.total_amount.toLocaleString('en-IN')}</strong> and release the {cancelModalInvoice.lr_count} attached {termPlural.toLowerCase()} back to the unbilled queue so they can be re-billed.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Cancellation Reason *</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Rate revision needed / Wrong consignments attached"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-rose-400 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCancelModalInvoice(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-xs"
                >
                  Keep Invoice
                </button>
                <button
                  type="submit"
                  disabled={isCancellingInvoice}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center space-x-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>{isCancellingInvoice ? 'Cancelling...' : 'Void & Release Consignments'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. COLLECT TO-PAY FREIGHT & ISSUE DELIVERY BILL (MR)     */}
      {/* ======================================================== */}
      {collectFreightModalDocket && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !isProcessingAction && setCollectFreightModalDocket(null)} />
          <div className="relative w-full max-w-lg my-auto max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-emerald-500/30 p-6 sm:p-7 shadow-2xl z-10 text-slate-900 dark:text-white space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Collect Freight & Issue Delivery Bill</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Counter payment collection for To-Pay delivery at branch godown.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isProcessingAction && setCollectFreightModalDocket(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCollectFreight} className="space-y-4 text-xs">
              
              {/* Docket & Consignee Summary Card */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                      Docket / LR Number
                    </span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                      {collectFreightModalDocket.docket_number || collectFreightModalDocket.lr_number}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                      Freight to Collect
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹ {Number(collectFreightModalDocket.total_amount || collectFreightModalDocket.freight_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Paying Party (Consignee):</span>
                    <strong className="text-slate-900 dark:text-white">
                      {(typeof collectFreightModalDocket.consignee === 'object' ? collectFreightModalDocket.consignee?.name : collectFreightModalDocket.consignee) ||
                       (typeof collectFreightModalDocket.customer === 'object' ? collectFreightModalDocket.customer?.name : collectFreightModalDocket.customer) ||
                       'Consignee'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Delivery Godown:</span>
                    <strong className="text-slate-900 dark:text-white">{collectFreightModalDocket.delivery_branch || collectFreightModalDocket.destination_city}</strong>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Payment Mode <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['CASH', 'UPI', 'CHEQUE', 'NEFT'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCollectFreightForm({ ...collectFreightForm, paymentMethod: mode })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          collectFreightForm.paymentMethod === mode
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {mode === 'CASH' ? '💵 Cash' : mode === 'UPI' ? '📱 UPI / QR' : mode === 'CHEQUE' ? '🏦 Cheque' : '🏛️ Bank/NEFT'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Payment Collection Date <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="date"
                      value={collectFreightForm.paymentDate}
                      onChange={(e) => setCollectFreightForm({ ...collectFreightForm, paymentDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      {collectFreightForm.paymentMethod === 'CASH'
                        ? 'Cash Receipt / Voucher #'
                        : collectFreightForm.paymentMethod === 'CHEQUE'
                        ? 'Cheque Number'
                        : collectFreightForm.paymentMethod === 'UPI'
                        ? 'UPI UTR / Reference No.'
                        : 'Bank Transaction / UTR No.'}{' '}
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={collectFreightForm.paymentRef}
                      onChange={(e) => setCollectFreightForm({ ...collectFreightForm, paymentRef: e.target.value })}
                      placeholder={
                        collectFreightForm.paymentMethod === 'CASH'
                          ? 'e.g. CR-00123 / Cash Slip #'
                          : collectFreightForm.paymentMethod === 'CHEQUE'
                          ? 'e.g. CHQ-489102'
                          : collectFreightForm.paymentMethod === 'UPI'
                          ? 'e.g. 329012394812 (12-digit UTR)'
                          : 'e.g. HDFC98230129'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Delivery Remarks / Counter Notes <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={collectFreightForm.remarks}
                    onChange={(e) => setCollectFreightForm({ ...collectFreightForm, remarks: e.target.value })}
                    placeholder="e.g. Handed over to driver against cash collection"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCollectFreightModalDocket(null)}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isProcessingAction ||
                    !collectFreightForm.paymentMethod ||
                    !collectFreightForm.paymentDate?.trim() ||
                    !collectFreightForm.paymentRef?.trim() ||
                    !collectFreightForm.remarks?.trim()
                  }
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
                    !collectFreightForm.paymentMethod ||
                    !collectFreightForm.paymentDate?.trim() ||
                    !collectFreightForm.paymentRef?.trim() ||
                    !collectFreightForm.remarks?.trim() ||
                    isProcessingAction
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md shadow-emerald-600/30'
                  }`}
                  title={
                    !collectFreightForm.paymentRef?.trim() || !collectFreightForm.remarks?.trim()
                      ? 'Please fill all mandatory fields (*) to activate button'
                      : 'Confirm payment and print delivery bill'
                  }
                >
                  <Banknote className="w-4 h-4" />
                  <span>{isProcessingAction ? 'Recording & Generating...' : 'Confirm Payment & Print Delivery Bill ➔'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. QUICK BILL (1-CLICK SINGLE LR FREIGHT INVOICE)        */}
      {/* ======================================================== */}
      {quickBillModalDocket && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !isProcessingAction && setQuickBillModalDocket(null)} />
          <div className="relative w-full max-w-lg my-auto max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-blue-500/30 p-6 sm:p-7 shadow-2xl z-10 text-slate-900 dark:text-white space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Instant 1-Click Freight Invoice</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Generate an individual GST Tax Invoice for this docket without batch steps.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isProcessingAction && setQuickBillModalDocket(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickBill} className="space-y-4 text-xs">
              
              {/* Docket Summary */}
              <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                      Docket / LR Number
                    </span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                      {quickBillModalDocket.docket_number || quickBillModalDocket.lr_number}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                      Invoice Total (incl. GST)
                    </span>
                    <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                      ₹ {Number(quickBillModalDocket.total_amount || quickBillModalDocket.freight_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/20 text-[11px]">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Billed Party (Shipper):</span>
                    <strong className="text-slate-900 dark:text-white">
                      {(typeof quickBillModalDocket.consignor === 'object' ? quickBillModalDocket.consignor?.name : quickBillModalDocket.consignor) ||
                       (typeof quickBillModalDocket.customer === 'object' ? quickBillModalDocket.customer?.name : quickBillModalDocket.customer) ||
                       'Shipper'}
                    </strong>
                    <span className="text-[10px] font-mono text-slate-400 block">GSTIN: {quickBillModalDocket.customer_gstin || 'URP'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Booking Branch:</span>
                    <strong className="text-slate-900 dark:text-white">{quickBillModalDocket.booking_branch || quickBillModalDocket.origin_city}</strong>
                    <span className="text-[10px] text-slate-400 block">Destination: {quickBillModalDocket.delivery_branch || quickBillModalDocket.destination_city}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Invoice Date <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    value={quickBillInvoiceDate}
                    onChange={(e) => setQuickBillInvoiceDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Credit Term (TBB Days) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={quickBillCreditDays}
                    onChange={(e) => setQuickBillCreditDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value={15}>15 Days Credit</option>
                    <option value={30}>30 Days Credit (Standard TBB)</option>
                    <option value={45}>45 Days Credit</option>
                    <option value={60}>60 Days Credit</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickBillModalDocket(null)}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isProcessingAction ? 'Generating Invoice...' : 'Generate GST Invoice & Print ➔'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. VERIFIED POD (PROOF OF DELIVERY) PREVIEW MODAL       */}
      {/* ======================================================== */}
      {podModalDocket && (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPodModalDocket(null)} />
          <div className="relative w-full max-w-lg my-auto max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-purple-500/30 p-6 sm:p-7 shadow-2xl z-10 text-slate-900 dark:text-white space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Proof of Delivery (POD)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Receiver acknowledgment copy for docket {podModalDocket.docket_number || podModalDocket.lr_number}.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPodModalDocket(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* POD Details & Image */}
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Consignee Receiver:</span>
                  <strong className="text-slate-900 dark:text-white">
                    {podModalDocket.pod_receiver ||
                     (typeof podModalDocket.consignee === 'object' ? podModalDocket.consignee?.name : podModalDocket.consignee) ||
                     (typeof podModalDocket.customer === 'object' ? podModalDocket.customer?.name : podModalDocket.customer) ||
                     'Receiver'}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Delivery Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[10px]">
                    ✓ Delivery Completed & Verified
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Corridor Route:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {podModalDocket.booking_branch || podModalDocket.origin_city} ➔ {podModalDocket.delivery_branch || podModalDocket.destination_city}
                  </span>
                </div>
              </div>

              {/* POD Document Display */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-3 flex flex-col items-center justify-center min-h-[220px]">
                {podModalDocket.pod_url ? (
                  <img
                    src={podModalDocket.pod_url}
                    alt="Proof of Delivery Document"
                    className="max-h-72 w-auto object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">POD Verified Digitally</div>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Delivery was verified and acknowledged by the receiving consignee counter. The docket is officially cleared for billing.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPodModalDocket(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const row = podModalDocket;
                    setPodModalDocket(null);
                    if (row.payment_type === 'TO_PAY') {
                      openCollectFreightModal(row);
                    } else {
                      openQuickBillModal(row);
                    }
                  }}
                  className={`px-5 py-2 rounded-xl font-bold text-xs text-white shadow-md flex items-center space-x-1.5 ${
                    podModalDocket.payment_type === 'TO_PAY'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  }`}
                >
                  {podModalDocket.payment_type === 'TO_PAY' ? (
                    <>
                      <Banknote className="w-4 h-4" />
                      <span>Proceed to Collect Freight ➔</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Proceed to Quick Bill ➔</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </>
  );
}
