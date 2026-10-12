// frontend/app/(owner)/billing/invoices/page.js
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle,
  Truck,
  Building,
  ShieldCheck,
  Percent,
  MapPin,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export default function InvoicesMasterPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canEdit, canExport, isAdmin, canCreateInvoice, canCreatePayment } = usePermissions();

  // Settings & Terminology from Zustand Store & useTerminology hook
  const { terminology: storeTerminology, user, setTerminology } = useStore();
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
      'BALAJI LOGISTICS';

    const tagline =
      orgProfile?.settings?.tagline ||
      orgProfile?.tagline ||
      user?.tagline ||
      'Logistics Without Limits • Goods Transport Agency (GTA)';

    const address =
      orgProfile?.address ||
      'Plot 45, Transport Nagar';

    const city = orgProfile?.city || 'Pune';
    const state = orgProfile?.state || 'Maharashtra';
    const pincode = orgProfile?.pincode || '411044';
    const fullAddress = `${address}, ${city}, ${state} - ${pincode}`;

    const phone = orgProfile?.phone || user?.phone || '+91 98230 12345';
    const email = orgProfile?.email || user?.email || 'billing@balajilogistics.in';
    const gstin = orgProfile?.gstin || user?.gstin || user?.organization?.gst_number || '27AABCT9845P1Z2';
    const pan = orgProfile?.pan || user?.pan || 'AABCT9845P';
    const sacCode = orgProfile?.settings?.sacCode || orgProfile?.sac_code || '9965';

    const bankName =
      orgProfile?.settings?.bankName ||
      orgProfile?.bank_name ||
      'HDFC Bank Ltd';

    const accountNumber =
      orgProfile?.settings?.accountNumber ||
      orgProfile?.account_number ||
      '50200048910245';

    const ifscCode =
      orgProfile?.settings?.ifscCode ||
      orgProfile?.ifsc_code ||
      'HDFC0001824';

    const bankBranch =
      orgProfile?.settings?.bankBranch ||
      orgProfile?.bank_branch ||
      'Main Branch';

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
  const [customersList, setCustomersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Main View Navigation: 'INVOICES' (Tax Invoices) | 'UNBILLED' (Delivered / Pending Invoicing Dockets)
  const [activeTab, setActiveTab] = useState('INVOICES');
  const [unbilledSearch, setUnbilledSearch] = useState('');
  const [unbilledFilter, setUnbilledFilter] = useState('TBB_READY'); // Default to TBB Ready to Bill

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [printModalInvoice, setPrintModalInvoice] = useState(null);
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
  const [onlyDeliveredPod, setOnlyDeliveredPod] = useState(false);
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
      // 1. Fetch organization profile to get transporter branding & terminology concurrently
      const [profileRes, invRes, unbilledRes, custList] = await Promise.allSettled([
        api.get('/organizations/profile'),
        billingService.listInvoices({ limit: 100 }),
        billingService.getUnbilledConsignments(),
        billingService.getCustomers()
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

      if (invRes.status === 'fulfilled' && invRes.value?.data?.rows) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const rows = invRes.value.data.rows.map((row) => {
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

          return {
            id: row.id,
            invoice_number: row.invoice_number,
            customer_id: row.customer_id,
            customer: row.customer?.name || 'Customer Account',
            gstin: row.customer?.gstin || 'URP',
            customer_phone: row.customer?.phone || '',
            customer_balance: parseFloat(row.customer_balance || row.customer?.current_balance || 0),
            delivery_branch: row.delivery_branch || row.branch?.branch_name || 'Destination Branch',
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
            lr_count: row.lr_count || (row.items && row.items.length) || 0,
            items: row.items || []
          };
        });
        setInvoices(rows);
      } else {
        setInvoices([]);
      }

      const unbilledList = unbilledRes.status === 'fulfilled' && Array.isArray(unbilledRes.value) ? unbilledRes.value : [];
      setUnbilledConsignments(unbilledList);

      // Auto-default to Unbilled Dockets view if no invoices have been generated yet
      const rowsCount = invRes.status === 'fulfilled' && invRes.value?.data?.rows ? invRes.value.data.rows.length : 0;
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

    // Unbilled TBB delivered pending billing
    const unbilledTbbItems = unbilledConsignments.filter((c) => c.payment_type === 'TBB');
    const unbilledTbbDeliveredItems = unbilledTbbItems.filter(
      (c) => c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status)
    );
    const unbilledTbbAmount = unbilledTbbDeliveredItems.reduce(
      (sum, c) => sum + parseFloat(c.total_amount || c.freight_amount || 0),
      0
    );

    const unbilledTotalAmount = unbilledConsignments.reduce(
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
      unbilledTotalCount: unbilledConsignments.length,
      unbilledTotalAmount,
    };
  }, [invoices, unbilledConsignments]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const match =
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.toLowerCase().includes(search.toLowerCase()) ||
        inv.gstin.toLowerCase().includes(search.toLowerCase()) ||
        (inv.delivery_branch && inv.delivery_branch.toLowerCase().includes(search.toLowerCase()));

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
  }, [invoices, search, statusFilter]);

  // Counts and Total Amounts for Invoice filter tabs
  const invoiceCounts = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
    const sumBal = (list) => list.reduce((sum, i) => sum + parseFloat(i.balance_amount || 0), 0);
    const sumPaid = (list) => list.reduce((sum, i) => sum + parseFloat(i.paid_amount || 0), 0);

    const unpaidList = activeInvoices.filter((i) => i.balance_amount > 0 && i.due_date >= todayStr);
    const overdueList = activeInvoices.filter((i) => i.balance_amount > 0 && i.due_date < todayStr);
    const partialList = activeInvoices.filter((i) => i.paid_amount > 0 && i.balance_amount > 0);
    const paidList = activeInvoices.filter((i) => i.balance_amount === 0);
    const cancelledList = invoices.filter((i) => i.status === 'CANCELLED');

    return {
      all: invoices.length,
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
  }, [invoices]);

  // TBB unbilled calculations
  const unbilledTbbDockets = useMemo(() => {
    return unbilledConsignments.filter((c) => c.payment_type === 'TBB');
  }, [unbilledConsignments]);

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

  // Counts and Total Amounts for Unbilled filter tabs
  const unbilledCounts = useMemo(() => {
    const sumTotal = (list) => list.reduce((sum, c) => sum + parseFloat(c.total_amount || c.freight_amount || 0), 0);

    const tbbReadyList = unbilledTbbDelivered;
    const tbbAllList = unbilledTbbDockets;
    const tbbInTransitList = unbilledTbbDockets.filter(
      (c) => !c.is_delivered && !['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status)
    );
    const toPayList = unbilledConsignments.filter((c) => c.payment_type === 'TO_PAY');
    const paidList = unbilledConsignments.filter((c) => c.payment_type === 'PAID');
    const otherList = unbilledConsignments.filter((c) => c.payment_type !== 'TBB');

    return {
      all: unbilledConsignments.length,
      allAmount: sumTotal(unbilledConsignments),
      tbbReady: tbbReadyList.length,
      tbbReadyAmount: sumTotal(tbbReadyList),
      tbbAll: tbbAllList.length,
      tbbAllAmount: sumTotal(tbbAllList),
      tbbInTransit: tbbInTransitList.length,
      tbbInTransitAmount: sumTotal(tbbInTransitList),
      toPay: toPayList.length,
      toPayAmount: sumTotal(toPayList),
      paid: paidList.length,
      paidAmount: sumTotal(paidList),
      other: otherList.length,
      otherAmount: sumTotal(otherList),
    };
  }, [unbilledConsignments, unbilledTbbDelivered, unbilledTbbDockets]);

  // Filtered unbilled consignments for main table
  const filteredUnbilledConsignments = useMemo(() => {
    return unbilledConsignments.filter((c) => {
      const docNum = termSingular === 'Docket' ? (c.docket_number || c.lr_number || '') : (c.lr_number || c.docket_number || '');
      const custName = c.customer || c.consignor?.name || '';
      const receiverName = c.consignee?.name || '';
      const orig = c.origin_city || c.booking_branch || '';
      const dest = c.destination_city || c.delivery_branch || '';

      const match =
        docNum.toLowerCase().includes(unbilledSearch.toLowerCase()) ||
        custName.toLowerCase().includes(unbilledSearch.toLowerCase()) ||
        receiverName.toLowerCase().includes(unbilledSearch.toLowerCase()) ||
        orig.toLowerCase().includes(unbilledSearch.toLowerCase()) ||
        dest.toLowerCase().includes(unbilledSearch.toLowerCase()) ||
        (c.customer_gstin && c.customer_gstin.toLowerCase().includes(unbilledSearch.toLowerCase()));

      const isDelivered = c.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status);

      if (unbilledFilter === 'TBB_READY') return match && c.payment_type === 'TBB' && isDelivered;
      if (unbilledFilter === 'TBB' || unbilledFilter === 'ALL_TBB') return match && c.payment_type === 'TBB';
      if (unbilledFilter === 'TBB_IN_TRANSIT') return match && c.payment_type === 'TBB' && !isDelivered;
      if (unbilledFilter === 'OTHER') return match && c.payment_type !== 'TBB';
      if (unbilledFilter === 'TO_PAY') return match && c.payment_type === 'TO_PAY';
      if (unbilledFilter === 'PAID') return match && c.payment_type === 'PAID';
      if (unbilledFilter === 'IN_TRANSIT') return match && !isDelivered;
      if (unbilledFilter === 'ALL') return match;
      return match;
    });
  }, [unbilledConsignments, unbilledSearch, unbilledFilter, termSingular]);

  // Active customer for generation modal
  const currentSelectedCustomer = useMemo(() => {
    return customersList.find((c) => c.id === selectedCustomerId) || null;
  }, [customersList, selectedCustomerId]);

  // All unbilled consignments for selected customer
  const customerUnbilledAll = useMemo(() => {
    if (!selectedCustomerId) return unbilledConsignments;
    return unbilledConsignments.filter((c) => {
      return c.consignor_id === selectedCustomerId || c.consignee_id === selectedCustomerId;
    });
  }, [unbilledConsignments, selectedCustomerId]);

  // Payment type counts for customer's unbilled dockets
  const wizardPaymentCounts = useMemo(() => {
    return {
      all: customerUnbilledAll.length,
      tbb: customerUnbilledAll.filter((c) => c.payment_type === 'TBB').length,
      to_pay: customerUnbilledAll.filter((c) => c.payment_type === 'TO_PAY').length,
      paid: customerUnbilledAll.filter((c) => c.payment_type === 'PAID').length,
    };
  }, [customerUnbilledAll]);

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

  // Calculate Subtotal and Prepaid vs Credit split for Selected LRs in Wizard
  const wizardCalculations = useMemo(() => {
    const selectedItems = customerUnbilledAll.filter((c) => selectedLrIds.includes(c.id));
    const gstRate = parseFloat(taxRate || 5.0);
    const extra = parseFloat(extraCharges || 0);

    let docketsTaxable = 0;
    let docketsTax = 0;
    let prepaidFreight = 0;

    selectedItems.forEach((c) => {
      const cTotal = parseFloat(c.total_amount || 0);
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
      await loadDatabaseRecords();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create invoice in database', 'error');
    } finally {
      setIsSubmitting(false);
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
            onClick={() => setPrintModalInvoice(row)}
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
      key: 'customer',
      label: 'TBB Customer & GSTIN',
      width: 220,
      minWidth: 170,
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
            <span>{val}</span>
            {row.balance_amount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/30">
                Uncleared
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {row.gstin} • {row.lr_count} {termPlural}
          </div>
        </div>
      )
    },
    {
      key: 'delivery_branch',
      label: 'Branch of Delivery',
      width: 170,
      minWidth: 140,
      sortable: true,
      render: (val) => (
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {val || 'Destination Hub'}
          </span>
        </div>
      )
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
      key: 'taxable_amount',
      label: 'Taxable',
      width: 120,
      minWidth: 100,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'gst_amount',
      label: 'GST (5%)',
      width: 110,
      minWidth: 90,
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs">
          ₹ {Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
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
      key: 'actions',
      label: 'Actions',
      width: 180,
      minWidth: 160,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Print GST Tax Invoice */}
          <button
            onClick={() => setPrintModalInvoice(row)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-400 transition-all shadow-2xs"
            title="View & Print Official GST Tax Invoice"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Record / Collect Remittance */}
          {row.balance_amount > 0 && row.status !== 'CANCELLED' && canCreatePayment && (
            <button
              onClick={() => openPaymentModal(row)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-xs active:scale-95 transition-all"
              title="Collect Remittance / Record Payment"
            >
              Collect
            </button>
          )}

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

          {/* Extend Due Date */}
          {row.balance_amount > 0 && row.status !== 'CANCELLED' && canEdit && (
            <button
              onClick={() => openEditDueDateModal(row)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-400 transition-all shadow-2xs"
              title="Extend Credit Due Date"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Cancel Invoice */}
          {parseFloat(row.paid_amount || 0) === 0 && row.status !== 'CANCELLED' && canEdit && (
            <button
              onClick={() => openCancelModal(row)}
              className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all shadow-2xs"
              title="Cancel / Void Invoice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ], [canCreatePayment, canEdit, termPlural, transporterDetails]);

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
      render: (val, row) => (
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
            <span>{val || row.consignor?.name || 'Customer Account'}</span>
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
      )
    },
    {
      key: 'consignee',
      label: 'Receiver (Consignee)',
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            {row.consignee?.name || 'Receiver'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {row.destination_city || row.delivery_branch || 'Destination'}
          </div>
        </div>
      )
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
      width: 140,
      minWidth: 120,
      sortable: false,
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {canCreateInvoice && (
            <button
              onClick={() => {
                const customerId = row.consignor_id || row.consignee_id;
                if (customerId) {
                  setSelectedCustomerId(customerId);
                }
                setSelectedLrIds([row.id]);
                if (row.payment_type) {
                  setWizardPaymentFilter(row.payment_type);
                }
                setIsGenerateModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all flex items-center space-x-1"
              title="Generate GST Freight Invoice for this docket"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Bill Docket</span>
            </button>
          )}
        </div>
      )
    }
  ], [canCreateInvoice, termPlural, termSingular]);

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
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Generate Invoice</span>
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

            {/* Quick Actions Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    activeTab === 'INVOICES' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {invoiceCounts.all} • ₹{kpis.totalInvoiced.toLocaleString('en-IN')}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('UNBILLED');
                    setUnbilledFilter('TBB_READY');
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
                  <span>Unbilled TBB {termPlural} / Pending Invoicing</span>
                  {unbilledCounts.tbbReady > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-purple-500/30 text-purple-200 border border-purple-400/30 animate-pulse font-bold">
                      {unbilledCounts.tbbReady} Ready • ₹{unbilledCounts.tbbReadyAmount.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                      activeTab === 'UNBILLED' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {unbilledCounts.tbbAll} TBB • ₹{unbilledCounts.tbbAllAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                </button>
              </div>
            </div>

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
                  searchPlaceholder={`Search by Invoice #, Customer, Delivery Branch, ${termSingular} #, GSTIN...`}
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
              <DataTable
                columns={unbilledColumns}
                data={filteredUnbilledConsignments}
                loading={isLoading}
                pageSizeOptions={[10, 15, 25, 50, 100]}
                searchable={true}
                searchPlaceholder={`Search unbilled ${termPlural.toLowerCase()} by Docket #, Shipper, Consignee, Route, GSTIN...`}
                onSearchChange={setUnbilledSearch}
                filtersSlot={
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    <button
                      onClick={() => setUnbilledFilter('TBB_READY')}
                      className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
                        unbilledFilter === 'TBB_READY'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : isDark
                          ? 'bg-slate-800 text-purple-400 hover:text-white border border-purple-500/20'
                          : 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100'
                      }`}
                      title="Delivered TBB dockets with POD verified, ready to generate invoice"
                    >
                      <span>⭐ TBB Ready to Bill</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
                        {unbilledCounts.tbbReady} • ₹{unbilledCounts.tbbReadyAmount.toLocaleString('en-IN')}
                      </span>
                    </button>
                    <button
                      onClick={() => setUnbilledFilter('TBB')}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        unbilledFilter === 'TBB'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      All TBB ({unbilledCounts.tbbAll} • ₹{unbilledCounts.tbbAllAmount.toLocaleString('en-IN')})
                    </button>
                    <button
                      onClick={() => setUnbilledFilter('TBB_IN_TRANSIT')}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        unbilledFilter === 'TBB_IN_TRANSIT'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      TBB In Transit ({unbilledCounts.tbbInTransit} • ₹{unbilledCounts.tbbInTransitAmount.toLocaleString('en-IN')})
                    </button>
                    {unbilledCounts.other > 0 && (
                      <button
                        onClick={() => setUnbilledFilter(unbilledFilter === 'ALL' ? 'TBB_READY' : 'ALL')}
                        className={`px-3 py-1.5 rounded-xl transition-all border ${
                          unbilledFilter === 'ALL'
                            ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                            : isDark
                            ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
                        }`}
                        title="Toggle other non-credit dockets (To-Pay and Paid Upfront)"
                      >
                        {unbilledFilter === 'ALL'
                          ? `Showing All Modes (${unbilledCounts.all}) ✕`
                          : `Include To-Pay & Paid (${unbilledCounts.other})`}
                      </button>
                    )}
                  </div>
                }
                exportable={true}
                exportFileName="Unbilled_Consignments_Register"
                emptyMessage="No unbilled consignments found matching criteria."
              />
            )}

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
                  <div className="font-black text-sm text-slate-900">{printModalInvoice.customer}</div>
                  <div className="font-mono text-slate-700">GSTIN / UIN: <span className="font-bold text-slate-900">{printModalInvoice.gstin}</span></div>
                  <div className="text-slate-600 text-[11px] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Branch of Delivery: <strong className="text-slate-900">{printModalInvoice.delivery_branch}</strong></span>
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
                      <th className="p-2 text-right">Freight (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {printModalInvoice.items && printModalInvoice.items.length > 0 ? (
                      printModalInvoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">{item.docket_number || item.lr_number}</td>
                          <td className="p-2 text-slate-600">{item.booking_date}</td>
                          <td className="p-2 font-sans">{item.origin_city} ➔ {printModalInvoice.delivery_branch || item.destination_city}</td>
                          <td className="p-2 text-right">{item.charged_weight}</td>
                          <td className="p-2 text-right font-bold text-slate-900">₹ {Number(item.total_amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 text-slate-400">1</td>
                        <td className="p-2 font-bold text-slate-900">{printModalInvoice.invoice_number}-CONSOLIDATED</td>
                        <td className="p-2 text-slate-600">{printModalInvoice.invoice_date}</td>
                        <td className="p-2 font-sans">Full Truckload Transport ➔ {printModalInvoice.delivery_branch}</td>
                        <td className="p-2 text-right">Standard</td>
                        <td className="p-2 text-right font-bold text-slate-900">₹ {Number(printModalInvoice.taxable_amount).toLocaleString('en-IN')}</td>
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
        <div className="no-print fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsGenerateModalOpen(false)} />
          <div className="relative w-full max-w-3xl my-auto max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 text-slate-900 dark:text-white space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold">Generate GST Freight Invoice</h3>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-4 text-xs">
              
              {/* Step 1: Select TBB Customer & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Select Customer (Party) *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      setSelectedLrIds([]);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:border-cyan-400 focus:outline-none"
                  >
                    {customersList.length === 0 ? (
                      <option value="">No customers found in database</option>
                    ) : (
                      customersList.map((c) => {
                        const custUnbilled = unbilledConsignments.filter(
                          (ub) => ub.consignor_id === c.id || ub.consignee_id === c.id
                        );
                        const tbbCount = custUnbilled.filter((ub) => ub.payment_type === 'TBB').length;
                        const totalAmt = custUnbilled.reduce(
                          (sum, ub) => sum + parseFloat(ub.total_amount || ub.freight_amount || 0),
                          0
                        );
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.gstin ? `(${c.gstin})` : ''}
                            {tbbCount > 0
                              ? ` — ⭐ ${tbbCount} TBB Ready (₹${totalAmt.toLocaleString('en-IN')})`
                              : custUnbilled.length > 0
                              ? ` — ${custUnbilled.length} Dockets (₹${totalAmt.toLocaleString('en-IN')})`
                              : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Credit Term (TBB Days) *</label>
                  <select
                    value={creditDays}
                    onChange={(e) => setCreditDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:border-cyan-400 focus:outline-none"
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
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Uncleared Ledger Balance for <strong>{currentSelectedCustomer.name}</strong>:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-500">
                    ₹ {Number(currentSelectedCustomer.current_balance).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Step 2: Unbilled Bilty/Docket Selection Queue with Delivery Branch */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Select Unbilled {termPlural} to Include ({wizardCalculations.selectedCount} selected)</span>
                    </span>
                    {/* Payment Mode Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setWizardPaymentFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                          wizardPaymentFilter === 'ALL'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        All ({wizardPaymentCounts.all})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardPaymentFilter('TBB')}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
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
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
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
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
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

                  <div className="flex items-center space-x-3 self-end sm:self-auto">
                    <label className="flex items-center space-x-1.5 text-[10.5px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
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
                        className="text-cyan-500 hover:underline font-bold text-[11px]"
                      >
                        {unbilledForCustomer.map((c) => c.id).every((id) => selectedLrIds.includes(id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Unbilled List Queue */}
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-slate-950/50">
                  {unbilledForCustomer.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-1">
                      <FolderOpen className="w-6 h-6 mx-auto opacity-50" />
                      <p className="font-semibold text-xs text-slate-500 dark:text-slate-400">
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
                          : 'Try switching the filter above to view all dockets.'}
                      </p>
                    </div>
                  ) : (
                    unbilledForCustomer.map((lr) => {
                      const isChecked = selectedLrIds.includes(lr.id);
                      const isDelivered = lr.is_delivered || ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(lr.status);
                      const isPaidUpfront = lr.payment_type === 'PAID';
                      const isToPayCollected = lr.payment_type === 'TO_PAY' && isDelivered;
                      const isAlreadySettled = isPaidUpfront || isToPayCollected;

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
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-cyan-500/10 dark:bg-cyan-950/30' : 'hover:bg-slate-100 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4 shrink-0"
                            />
                            <div>
                              <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center flex-wrap gap-1.5">
                                <span>{termSingular === 'Docket' ? (lr.docket_number || lr.lr_number) : (lr.lr_number || lr.docket_number)}</span>
                                
                                {/* Payment Mode Badge */}
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold border ${
                                  lr.payment_type === 'TBB'
                                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                    : lr.payment_type === 'PAID'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                }`}>
                                  {lr.payment_type === 'TBB' ? 'TBB (Credit)' : lr.payment_type || 'TO_PAY'}
                                </span>

                                {/* Delivery & POD Status Badge */}
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold border ${
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

                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center flex-wrap gap-x-2.5 gap-y-0.5">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-cyan-500 shrink-0" />
                                  <span>Booking Branch: <strong className="text-slate-800 dark:text-slate-200">{lr.booking_branch || lr.origin_branch || lr.origin_city}</strong></span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span>Delivery Branch: <strong className="text-slate-800 dark:text-slate-200">{lr.delivery_branch || lr.destination_city}</strong></span>
                                </span>
                                <span>• {lr.charged_weight} kg • {lr.booking_date}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-2">
                            <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
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
                                    <span>Pending Delivery & POD</span>
                                  </span>
                                )
                              ) : isPaidUpfront ? (
                                <span className="text-emerald-600 dark:text-emerald-400">Paid Upfront (₹0 Due)</span>
                              ) : isToPayCollected ? (
                                <span className="text-emerald-600 dark:text-emerald-400">Collected at Branch (₹0 Due)</span>
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
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                  <div>
                    <span className="font-bold">Prepaid / Destination-Collected Freight Included:</span>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      Selected dockets include <strong>₹ {wizardCalculations.prepaidAmount.toLocaleString('en-IN')}</strong> of freight already settled (paid upfront at booking or collected upon delivery). The GST Freight Invoice will record this as <strong>Paid & Settled</strong> and will NOT add it as an unpaid debt to the customer's ledger.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Taxes & Surcharges */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Extra Charges (Halting/Loading) (₹)</label>
                    <input
                      type="number"
                      value={extraCharges}
                      onChange={(e) => setExtraCharges(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">GST Rate (GTA SAC 9965)</label>
                    <select
                      value={taxRate}
                      disabled={isRcm}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value={5.0}>5.0% (CGST 2.5% + SGST 2.5%)</option>
                      <option value={12.0}>12.0% (With ITC)</option>
                      <option value={0.0}>0.0% (Exempt)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      type="checkbox"
                      id="rcmCheck"
                      checked={isRcm}
                      onChange={(e) => setIsRcm(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <label htmlFor="rcmCheck" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      GST Reverse Charge (RCM - Tax Paid by Customer)
                    </label>
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Taxable Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹ {wizardCalculations.taxable.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">GST Amount:</span>
                    <span className="font-mono font-bold text-emerald-500">
                      {isRcm ? '₹ 0 (RCM)' : `₹ ${wizardCalculations.gstAmount.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Invoice:</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                      ₹ {wizardCalculations.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Already Settled:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹ {wizardCalculations.prepaidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Net Credit Due:</span>
                    <span className={`font-mono font-black text-xs ${wizardCalculations.creditDueAmount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      ₹ {wizardCalculations.creditDueAmount.toLocaleString('en-IN')}
                    </span>
                    {wizardCalculations.creditDueAmount > 0 && (
                      <span className="text-[9.5px] text-cyan-500 block font-mono">Due: {wizardCalculations.computedDueDate}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wizardCalculations.selectedCount === 0 || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generating...' : `Generate Freight Invoice for ${wizardCalculations.selectedCount} ${termPlural} ➔`}</span>
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

    </>
  );
}
