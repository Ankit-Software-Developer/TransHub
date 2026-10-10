// frontend/app/(owner)/deliveries/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../../services/api';
import { useTerminology } from '../../../hooks/useTerminology';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import DataTable from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import { useStore } from '../../../store/useStore';
import CameraCaptureModal from '../../../components/ui/CameraCaptureModal';
import {
  PackageCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Phone,
  Send,
  AlertCircle,
  Truck,
  Building2,
  QrCode,
  FileText,
  Printer,
  UploadCloud,
  ShieldCheck,
  DollarSign,
  Layers,
  Search,
  X,
  ChevronRight,
  Download,
  Receipt,
  Boxes,
  MapPin,
  RefreshCw,
  PlusCircle,
  Check,
  AlertTriangle,
  Lock,
  Package,
  Calendar,
  Filter,
  IndianRupee,
  Loader2,
  Camera,
  ExternalLink
} from 'lucide-react';

export default function DeliveriesPage() {
  const { term, plural } = useTerminology();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin, canEdit, canExport, canEditDelivery } = usePermissions();
  const user = useStore((state) => state.user);
  const activeBranch = useStore((state) => state.activeBranch);

  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.id || user?.assigned_branch_id || (activeBranch?.id && activeBranch.id !== 'ALL' ? activeBranch.id : null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('READY'); // 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'ALL'
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (!isAdmin && userBranchId) return userBranchId;
    return 'ALL';
  });
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState([]);

  // Auto-sync non-admin branch to login branch
  useEffect(() => {
    if (!isAdmin && userBranchId) {
      setSelectedBranchId(userBranchId);
    }
  }, [isAdmin, userBranchId]);

  // Resolve current active/login branch details for display
  const currentBranch = useMemo(() => {
    if (userBranchId && branches.length > 0) {
      const match = branches.find((b) => String(b.id) === String(userBranchId));
      if (match) return match;
    }
    if (user?.branch) return user.branch;
    if (user?.branchName) return { branch_name: user.branchName, branch_code: user.branchCode, city: user?.city || user?.branchCity };
    return null;
  }, [userBranchId, branches, user]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Data table state
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [summary, setSummary] = useState({
    ready_in_godown_count: 0,
    ready_in_godown_packages: 0,
    door_delivery_pending_count: 0,
    godown_pickup_pending_count: 0,
    out_for_delivery_count: 0,
    delivered_count: 0,
    pending_to_pay_amount: 0,
  });

  // Multi-select for DRS
  const [selectedDocketIds, setSelectedDocketIds] = useState(new Set());

  // Modals state
  const [counterHandoverDocket, setCounterHandoverDocket] = useState(null);
  const [drsModalOpen, setDrsModalOpen] = useState(false);
  const [gatePassDocket, setGatePassDocket] = useState(null);
  const [doorstepDeliveryDocket, setDoorstepDeliveryDocket] = useState(null);
  const [createdDrsRecord, setCreatedDrsRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [podUploading, setPodUploading] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [viewingPodDocket, setViewingPodDocket] = useState(null);
  const [handoverSuccessDocket, setHandoverSuccessDocket] = useState(null);

  // DRS-specific full docket list and search/filters
  const [drsDockets, setDrsDockets] = useState([]);
  const [drsLoading, setDrsLoading] = useState(false);
  const [drsDocketSearch, setDrsDocketSearch] = useState('');
  const [drsFilterType, setDrsFilterType] = useState('ALL'); // 'ALL' | 'DOOR_DELIVERY' | 'TO_PAY'

  const activeDrsDockets = drsDockets.length > 0 ? drsDockets : consignments;

  const filteredDrsConsignments = useMemo(() => {
    return activeDrsDockets.filter((c) => {
      if (drsFilterType === 'DOOR_DELIVERY' && c.delivery_type !== 'DOOR_DELIVERY') return false;
      if (drsFilterType === 'TO_PAY' && c.payment_type !== 'TO_PAY') return false;
      if (!drsDocketSearch.trim()) return true;
      const q = drsDocketSearch.toLowerCase().trim();
      const lr = (c.docket_number || c.lr_number || '').toLowerCase();
      const consigneeName = (c.consignee?.name || '').toLowerCase();
      const consigneePhone = (c.consignee?.phone || '').toLowerCase();
      const consignorName = (c.consignor?.name || '').toLowerCase();
      const originCity = (c.origin_city || '').toLowerCase();
      const destCity = (c.destination_city || '').toLowerCase();
      const originBranch = (c.originBranch?.branch_name || c.originBranch?.branch_code || '').toLowerCase();
      const destBranch = (c.destBranch?.branch_name || c.destBranch?.branch_code || '').toLowerCase();
      const address = (c.consignee?.address || c.delivery_address || '').toLowerCase();
      return (
        lr.includes(q) ||
        consigneeName.includes(q) ||
        consigneePhone.includes(q) ||
        consignorName.includes(q) ||
        originCity.includes(q) ||
        destCity.includes(q) ||
        originBranch.includes(q) ||
        destBranch.includes(q) ||
        address.includes(q)
      );
    });
  }, [activeDrsDockets, drsDocketSearch, drsFilterType]);

  // Live selected dockets list and calculation for DRS
  const selectedDocketsList = useMemo(() => {
    return activeDrsDockets.filter((c) => selectedDocketIds.has(c.id));
  }, [activeDrsDockets, selectedDocketIds]);

  const selectedDocketsSummary = useMemo(() => {
    let pkgs = 0;
    let weight = 0;
    let toPayCash = 0;
    selectedDocketsList.forEach((c) => {
      pkgs += Number(c.packages_count) || 0;
      weight += Number(c.charged_weight || c.actual_weight) || 0;
      if (c.payment_type === 'TO_PAY') {
        toPayCash += Number(c.total_amount) || 0;
      }
    });
    return {
      count: selectedDocketsList.length,
      pkgs,
      weight,
      toPayCash,
    };
  }, [selectedDocketsList]);

  // Open DRS modal and pre-load all ready dockets up to 200
  const openDrsModal = async () => {
    setDrsDocketSearch('');
    setDrsFilterType('ALL');
    setDrsModalOpen(true);
    setDrsLoading(true);
    try {
      const params = new URLSearchParams({
        tab: 'READY',
        branch_id: selectedBranchId,
        limit: '200',
        page: '1',
      });
      const res = await api.get(`/deliveries/operations?${params.toString()}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDrsDockets(res.data.data);
        if (selectedDocketIds.size === 0) {
          setSelectedDocketIds(new Set(res.data.data.map((c) => c.id)));
        }
      } else {
        setDrsDockets(consignments);
        if (selectedDocketIds.size === 0) {
          setSelectedDocketIds(new Set(consignments.map((c) => c.id)));
        }
      }
    } catch (e) {
      console.warn('Failed to load full DRS dockets list:', e);
      setDrsDockets(consignments);
    } finally {
      setDrsLoading(false);
    }
  };

  // Refs for POD file upload & Camera capture
  const cameraInputRef = useRef(null);
  const podFileInputRef = useRef(null);
  const doorstepCameraInputRef = useRef(null);
  const doorstepPodFileInputRef = useRef(null);

  // Form states for Counter Handover
  const [handoverForm, setHandoverForm] = useState({
    receiver_name: '',
    receiver_phone: '',
    receiver_id_proof: 'Bilty Consignee Copy Verified',
    delivered_packages: '',
    short_packages: 0,
    damaged_packages: 0,
    payment_collected: true,
    payment_mode: 'CASH',
    payment_ref: '',
    pod_file_url: '',
    pod_file_name: '',
    pod_file_size: '',
    receiver_signature_url: '',
    remarks: '',
  });

  // Form states for DRS
  const [drsForm, setDrsForm] = useState({
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    delivery_area: '',
    remarks: '',
  });

  // Fetch initial master data
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [bRes, vRes, dRes] = await Promise.all([
          api.get('/branches?all=true').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/fleet/drivers').catch(() => ({ data: { data: [] } })),
        ]);
        const branchList = bRes.data?.data?.branches || bRes.data?.data || [];
        setBranches(Array.isArray(branchList) ? branchList : []);
        setVehicles(Array.isArray(vRes.data?.data) ? vRes.data.data : []);
        setDrivers(Array.isArray(dRes.data?.data) ? dRes.data.data : []);
      } catch (e) {
        console.error('Failed to load masters', e);
      }
    };
    loadMasters();
  }, []);

  // Fetch delivery operations
  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        branch_id: selectedBranchId,
        delivery_type: deliveryTypeFilter,
        payment_type: paymentTypeFilter,
        search,
        page: String(page),
        limit: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const res = await api.get(`/deliveries/operations?${params.toString()}`);
      if (res.data?.success) {
        const rawList = res.data.data || [];
        const uniqueList = [];
        const seenIds = new Set();
        for (const item of rawList) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueList.push(item);
          }
        }
        setConsignments(uniqueList);
        const metaObj = res.data.meta || res.data.pagination || {};
        setTotalCount(metaObj.total !== undefined ? metaObj.total : uniqueList.length);
        if (metaObj.summary) {
          setSummary(metaObj.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load deliveries', err);
      setConsignments([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedBranchId, deliveryTypeFilter, paymentTypeFilter, search, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Handle Tab Switch
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setPage(1);
    setSelectedDocketIds(new Set());
  };

  // Toggle selection for DRS
  const toggleSelectDocket = (id) => {
    setSelectedDocketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllReadyDockets = () => {
    const doorDeliveryConsignments = consignments.filter((c) => c.delivery_type === 'DOOR_DELIVERY');
    if (doorDeliveryConsignments.length === 0) {
      alert('None of the ready dockets are configured for Door Delivery (all are Godown Delivery).');
      return;
    }
    if (selectedDocketIds.size === doorDeliveryConsignments.length) {
      setSelectedDocketIds(new Set());
    } else {
      setSelectedDocketIds(new Set(doorDeliveryConsignments.map((c) => c.id)));
    }
  };

  // Helper to test if a POD URL is an image
  const isPodImage = (url) => {
    if (!url) return false;
    if (url.startsWith('data:image')) return true;
    if (url.endsWith('.pdf')) return false;
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url) || url.includes('/uploads/pods/');
  };

  // Safely open Base64 or remote URL in new tab without Chromium blocking top-level data: navigation
  const openBlobInNewTab = (dataUrl) => {
    if (!dataUrl) return;
    try {
      if (dataUrl.startsWith('data:')) {
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(dataUrl, '_blank');
      }
    } catch (e) {
      console.warn('Error opening blob URL:', e);
      window.open(dataUrl, '_blank');
    }
  };

  // Safely download POD file
  const downloadPodFile = (dataUrl, filename = 'Signed_POD.jpg') => {
    if (!dataUrl) return;
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Error downloading POD:', e);
    }
  };

  // Client-side image compression using HTML5 Canvas
  // Scales down high-res phone photos to max 1400px and 75% quality JPEG (~80-120KB)
  const compressImageFile = (file, maxDimension = 1400, quality = 0.75) => {
    return new Promise((resolve) => {
      if (!file.type || !file.type.startsWith('image/')) {
        return resolve(file);
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              if (!blob) {
                return resolve(file);
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }, 'image/jpeg', quality);
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Handle POD File Selection (converts to Base64 for direct DB storage with 1 MB limit)
  const MAX_ALLOWED_DB_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB limit

  const handlePodFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If PDF, validate raw size (PDFs cannot be canvas compressed)
    if (file.type === 'application/pdf') {
      if (file.size > MAX_ALLOWED_DB_SIZE_BYTES) {
        alert(`PDF file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 1 MB database limit. Please upload a smaller PDF under 1 MB.`);
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result;
        if (base64Data) {
          setHandoverForm((prev) => ({
            ...prev,
            pod_file_url: base64Data,
            pod_file_name: file.name,
            pod_file_size: `${(file.size / 1024).toFixed(0)} KB (PDF in DB • Max 1 MB)`,
          }));
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    try {
      setPodUploading(true);
      // 1. Auto-compress image to fit comfortably under 1 MB DB limit (~150-350 KB)
      const compressedFile = await compressImageFile(file, 1280, 0.72);

      // 2. Validate final compressed size against 1 MB limit
      if (compressedFile.size > MAX_ALLOWED_DB_SIZE_BYTES) {
        alert(`Image size (${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 1 MB database storage limit. Please capture or select a smaller photo.`);
        return;
      }

      // 3. Convert to Base64 Data URL to store directly in DB
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result;
        if (base64Data) {
          const sizeKb = (compressedFile.size / 1024).toFixed(0);
          setHandoverForm((prev) => ({
            ...prev,
            pod_file_url: base64Data,
            pod_file_name: file.name,
            pod_file_size: `${sizeKb} KB (Base64 in DB • Max 1 MB)`,
          }));
        }
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Error processing POD file:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setPodUploading(false);
      e.target.value = '';
    }
  };

  // Handle camera photo capture callback from CameraCaptureModal
  const handleCameraCaptured = (base64Data, sizeKb) => {
    setHandoverForm((prev) => ({
      ...prev,
      pod_file_url: base64Data,
      pod_file_name: `POD_Camera_${Date.now()}.jpg`,
      pod_file_size: `${sizeKb} KB (Camera • Base64 in DB)`,
    }));
  };

  // Open Handover Modal
  const openHandoverModal = (docket) => {
    setCounterHandoverDocket(docket);
    setHandoverForm({
      receiver_name: docket.consignee?.name || '',
      receiver_phone: docket.consignee?.phone || '',
      receiver_id_proof: 'Bilty Consignee Copy / Aadhaar Verified',
      delivered_packages: docket.packages_count,
      short_packages: 0,
      damaged_packages: 0,
      payment_collected: true,
      payment_mode: docket.payment_type === 'TO_PAY' ? 'CASH' : 'NOT_APPLICABLE',
      payment_ref: '',
      pod_file_url: '',
      pod_file_name: '',
      pod_file_size: '',
      receiver_signature_url: '',
      remarks: '',
    });
  };

  // Submit Godown Counter Handover
  const handleCompleteHandover = async () => {
    if (!handoverForm.receiver_name?.trim()) {
      alert('Receiver Full Name is mandatory.');
      return;
    }
    if (!handoverForm.receiver_phone?.trim()) {
      alert('Receiver Phone Number is mandatory.');
      return;
    }
    const cleanPhone = handoverForm.receiver_phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit receiver mobile number (cannot be less or more than 10 digits).');
      return;
    }
    if (!handoverForm.pod_file_url) {
      alert('Signed Proof of Delivery (POD) photo is mandatory. Please upload or take a photo of the signed POD.');
      return;
    }
    if (counterHandoverDocket.payment_type === 'TO_PAY' && !handoverForm.payment_collected) {
      alert('Freight amount is TO-PAY. Please confirm payment collection before releasing goods.');
      return;
    }
    if (!handoverForm.delivered_packages || Number(handoverForm.delivered_packages) <= 0) {
      alert('Delivered packages count is mandatory and must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        consignment_id: counterHandoverDocket.id,
        receiver_name: handoverForm.receiver_name,
        receiver_phone: handoverForm.receiver_phone,
        receiver_id_proof: handoverForm.receiver_id_proof,
        delivered_packages: Number(handoverForm.delivered_packages) || counterHandoverDocket.packages_count,
        short_packages: Math.max(0, Number(counterHandoverDocket.packages_count || 0) - (Number(handoverForm.delivered_packages) || counterHandoverDocket.packages_count)),
        damaged_packages: Number(handoverForm.damaged_packages) || 0,
        payment_collected: handoverForm.payment_collected,
        payment_mode: handoverForm.payment_mode,
        payment_ref: handoverForm.payment_ref,
        pod_file_url: handoverForm.pod_file_url,
        receiver_signature_url: handoverForm.receiver_signature_url,
        remarks: handoverForm.remarks,
      };

      const res = await api.post('/deliveries/godown-handover', payload);
      if (res.data?.success) {
        const savedDocket = counterHandoverDocket;
        setCounterHandoverDocket(null);
        fetchDeliveries();
        // Show custom interactive Gate Pass confirmation dialog
        setHandoverSuccessDocket(savedDocket);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Handover failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit DRS Dispatch
  const handleCreateDrs = async () => {
    if (selectedDocketIds.size === 0) {
      alert('Please select at least one docket for DRS dispatch.');
      return;
    }
    if (!drsForm.vehicle_number.trim() || !drsForm.driver_name.trim()) {
      alert('Vehicle number and driver name are required.');
      return;
    }
    const cleanDriverPhone = (drsForm.driver_phone || '').replace(/\D/g, '');
    if (drsForm.driver_phone && drsForm.driver_phone.trim()) {
      if (cleanDriverPhone.length !== 10) {
        alert('Driver mobile phone must be exactly 10 digits (cannot be less or more than 10 digits).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        consignment_ids: Array.from(selectedDocketIds),
        vehicle_number: drsForm.vehicle_number,
        driver_name: drsForm.driver_name,
        driver_phone: drsForm.driver_phone,
        delivery_area: drsForm.delivery_area,
        remarks: drsForm.remarks,
      };

      const res = await api.post('/deliveries/drs/create', payload);
      if (res.data?.success) {
        const createdData = res.data.data;
        setDrsModalOpen(false);
        setSelectedDocketIds(new Set());
        setDrsForm({ vehicle_number: '', driver_name: '', driver_phone: '', delivery_area: '', remarks: '' });
        setActiveTab('OUT_FOR_DELIVERY');
        fetchDeliveries();
        if (createdData) {
          setCreatedDrsRecord(createdData);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'DRS generation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Doorstep Delivered Modal
  const openDoorstepModal = (docket) => {
    setDoorstepDeliveryDocket(docket);
    setHandoverForm({
      receiver_name: docket.consignee?.name || '',
      receiver_phone: docket.consignee?.phone || '',
      receiver_id_proof: 'Customer Signature',
      delivered_packages: docket.packages_count,
      short_packages: 0,
      damaged_packages: 0,
      payment_collected: true,
      payment_mode: docket.payment_type === 'TO_PAY' ? 'CASH' : 'NOT_APPLICABLE',
      payment_ref: '',
      pod_file_url: '',
      pod_file_name: '',
      pod_file_size: '',
      receiver_signature_url: '',
      remarks: '',
    });
  };

  // Submit Doorstep Delivered
  const handleDoorstepDelivered = async () => {
    if (!handoverForm.receiver_name?.trim()) {
      alert('Receiver Full Name is mandatory.');
      return;
    }
    if (!handoverForm.receiver_phone?.trim()) {
      alert('Receiver Mobile Phone is mandatory for delivery sign-off.');
      return;
    }
    const cleanPhone = handoverForm.receiver_phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit receiver mobile number (cannot be less or more than 10 digits).');
      return;
    }
    if (!handoverForm.pod_file_url) {
      alert('Signed Proof of Delivery (POD) photo is mandatory. Please upload or capture the POD photo.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/deliveries/${doorstepDeliveryDocket.id}/delivered`, {
        receiver_name: handoverForm.receiver_name,
        receiver_phone: handoverForm.receiver_phone,
        receiver_id_proof: handoverForm.receiver_id_proof,
        delivered_packages: Number(handoverForm.delivered_packages) || doorstepDeliveryDocket.packages_count,
        short_packages: Math.max(0, Number(doorstepDeliveryDocket.packages_count || 0) - (Number(handoverForm.delivered_packages) || doorstepDeliveryDocket.packages_count)),
        damaged_packages: Number(handoverForm.damaged_packages) || 0,
        payment_mode: handoverForm.payment_mode,
        payment_ref: handoverForm.payment_ref,
        pod_file_url: handoverForm.pod_file_url,
        receiver_signature_url: handoverForm.receiver_signature_url,
        remarks: handoverForm.remarks,
      });

      if (res.data?.success) {
        setDoorstepDeliveryDocket(null);
        fetchDeliveries();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record delivery');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Gate Pass
  const openGatePass = async (id) => {
    try {
      const res = await api.get(`/deliveries/${id}/gate-pass`);
      if (res.data?.success) {
        setGatePassDocket(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not fetch Gate Pass');
    }
  };

  // Table Columns Definition
  const columns = useMemo(() => {
    const cols = [];

    // Checkbox column for batch DRS dispatch on READY tab
    if (activeTab === 'READY') {
      const doorDeliveryItems = consignments.filter((c) => c.delivery_type === 'DOOR_DELIVERY');
      cols.push({
        key: 'selection',
        header: (
          <div className="flex items-center justify-center p-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={doorDeliveryItems.length > 0 && selectedDocketIds.size === doorDeliveryItems.length}
              onChange={selectAllReadyDockets}
              className="w-4 h-4 rounded border-slate-500 text-indigo-600 focus:ring-0 cursor-pointer"
              title="Select all Door Delivery dockets for DRS"
            />
          </div>
        ),
        width: 48,
        minWidth: 48,
        align: 'center',
        resizable: false,
        excludeFromExport: true,
        render: (val, row) => {
          if (row.delivery_type !== 'DOOR_DELIVERY') {
            return (
              <div className="flex items-center justify-center" title="Godown Delivery (Handover only)">
                <span className="text-[10px] text-slate-400 font-bold">—</span>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedDocketIds.has(row.id)}
                onChange={() => toggleSelectDocket(row.id)}
                className="w-4 h-4 rounded border-slate-500 text-indigo-600 focus:ring-0 cursor-pointer"
                title="Select for DRS (Door Delivery)"
              />
            </div>
          );
        },
      });
    }

    cols.push(
      {
        key: 'lr_number',
        header: `${term} Number`,
        sortable: true,
        width: 170,
        minWidth: 130,
        exportValue: (row) => row.docket_number || row.lr_number,
        render: (val, row) => (
          <div>
            <div className="font-mono font-bold text-blue-500 hover:underline">
              {row.docket_number || row.lr_number}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Booked: {row.booking_date ? new Date(row.booking_date).toLocaleDateString('en-GB') : 'N/A'}
            </div>
          </div>
        ),
      },
      {
        key: 'corridor',
        header: 'Corridor & Destination',
        sortable: false,
        width: 190,
        minWidth: 150,
        exportValue: (row) => {
          const originCode = row.originBranch?.branch_code || (row.origin_city ? row.origin_city.slice(0, 3).toUpperCase() : 'ORG');
          const destCode = row.destBranch?.branch_code || (row.destination_city ? row.destination_city.slice(0, 3).toUpperCase() : 'DST');
          return `[${originCode}] → [${destCode}] (${row.origin_city} → ${row.destination_city})`;
        },
        render: (val, row) => {
          const originCode = row.originBranch?.branch_code || (row.origin_city ? row.origin_city.slice(0, 3).toUpperCase() : 'ORG');
          const destCode = row.destBranch?.branch_code || (row.destination_city ? row.destination_city.slice(0, 3).toUpperCase() : 'DST');

          return (
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] inline-flex items-center gap-1.5 ${
                  isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-800'
                }`}>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">[{originCode}]</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">[{destCode}]</span>
                </span>
              </div>
              <div className={`text-[10px] flex items-center gap-1 mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Building2 className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                <span className="truncate">{row.destBranch?.branch_name || row.destBranch?.city || row.destination_city}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'consignee',
        header: 'Consignee (Customer)',
        sortable: false,
        width: 200,
        minWidth: 150,
        exportValue: (row) => row.consignee?.name || '',
        render: (val, row) => (
          <div>
            <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.consignee?.name || 'Customer'}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Phone className="w-2.5 h-2.5" />
              {row.consignee?.phone || 'No phone'}
            </div>
            {row.consignee?.address && (
              <div className="text-[9px] text-slate-500 truncate max-w-[190px]">
                {row.consignee.address}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'packages_count',
        header: 'Packages & Weight',
        sortable: true,
        align: 'right',
        width: 140,
        minWidth: 110,
        exportValue: (row) => `${row.packages_count} Pkgs (${row.charged_weight || row.actual_weight} KG)`,
        render: (val, row) => (
          <div className="text-right whitespace-nowrap">
            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {row.packages_count} Pkgs
            </span>
            <div className="text-[10px] text-slate-400">
              {row.charged_weight || row.actual_weight || 0} KG ({row.package_type || 'Boxes'})
            </div>
          </div>
        ),
      },
      {
        key: 'delivery_type',
        header: 'Delivery Type',
        sortable: true,
        align: 'center',
        width: 140,
        minWidth: 120,
        render: (val, row) => (
          <div className="text-center">
            {row.delivery_type === 'DOOR_DELIVERY' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <Truck className="w-3 h-3" />
                DOOR DELIVERY
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Building2 className="w-3 h-3" />
                GODOWN PICKUP
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'payment_type',
        header: 'Payment Status',
        sortable: true,
        align: 'center',
        width: 150,
        minWidth: 130,
        render: (val, row) => {
          const isToPay = row.payment_type === 'TO_PAY';
          const isPaid = row.payment_type === 'PAID';
          return (
            <div className="text-center">
              {isToPay ? (
                <div className="inline-flex flex-col items-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="w-3 h-3" />
                    TO-PAY: ₹{Number(row.total_amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-amber-400 font-semibold mt-0.5">Collect at handover</span>
                </div>
              ) : isPaid ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  PAID (₹{Number(row.total_amount || 0).toLocaleString('en-IN')})
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {row.payment_type || 'TBB (Credit)'}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Cargo Status',
        sortable: true,
        align: 'center',
        width: 140,
        minWidth: 120,
        render: (val, row) => (
          <div className="text-center">
            <Badge status={row.status} size="xs" />
            {row.status === 'DAMAGED' && (
              <span className="text-[9px] text-red-400 block font-bold">Damage Noted</span>
            )}
            {row.status === 'SHORT_MATERIAL' && (
              <span className="text-[9px] text-amber-400 block font-bold">Short Material</span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Delivery Actions',
        align: 'center',
        width: 240,
        minWidth: 210,
        excludeFromExport: true,
        resizable: false,
        render: (val, row) => {
          const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(row.status);
          const isOut = row.status === 'OUT_FOR_DELIVERY';

          return (
            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {/* Ready in Godown Actions */}
              {activeTab === 'READY' && (
                <>
                  <button
                    onClick={() => openHandoverModal(row)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title="Direct Counter Handover at Godown (Customer Pickup)"
                  >
                    <Building2 className="w-3 h-3" />
                    Handover
                  </button>

                  {/* Only show 'Out for Delivery' button if consignment is configured for Door Delivery */}
                  {row.delivery_type === 'DOOR_DELIVERY' && (
                    <button
                      onClick={() => {
                        setSelectedDocketIds(new Set([row.id]));
                        setDrsModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Send Out for Delivery via Delivery Run Sheet (DRS)"
                    >
                      <Truck className="w-3 h-3" />
                      Out for Delivery
                    </button>
                  )}
                </>
              )}

              {/* Out for Delivery Actions */}
              {isOut && (
                <button
                  onClick={() => openDoorstepModal(row)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Mark Delivered
                </button>
              )}

              {/* Delivered Tab Actions */}
              {isDelivered && (
                <>
                  {/* Gate Pass is ONLY for Godown Self-Pickup (where consignee collects at godown gate) */}
                  {row.delivery_type !== 'DOOR_DELIVERY' && (
                    <button
                      onClick={() => openGatePass(row.id)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Print Delivery Gate Pass (Godown Cargo Release)"
                    >
                      <Printer className="w-3 h-3" />
                      Gate Pass
                    </button>
                  )}
                  {row.pod?.file_url ? (
                    <button
                      type="button"
                      onClick={() => setViewingPodDocket(row)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-colors flex items-center gap-1 cursor-pointer"
                      title="View Signed Proof of Delivery (POD)"
                    >
                      <FileText className="w-3 h-3" />
                      POD
                    </button>
                  ) : (
                    <button
                      onClick={() => openHandoverModal(row)}
                      className="px-2 py-1 text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/25 transition-colors cursor-pointer"
                      title="Upload POD"
                    >
                      + POD
                    </button>
                  )}
                </>
              )}
            </div>
          );
        },
      }
    );

    return cols;
  }, [activeTab, consignments, selectedDocketIds, term, isDark]);

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1720px] mx-auto w-full space-y-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Last-Mile Delivery & POD Operations
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Process Godown Counter Handovers, dispatch Delivery Run Sheets (DRS), verify TO-PAY collections, and generate Gate Passes.
              </p>
            </div>

            {/* Top Action Controls: Branch Switcher & Quick DRS in a single non-wrapping row */}
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              {isAdmin ? (
                <div className={`flex items-center gap-1.5 p-1 rounded-xl border shadow-xs transition-colors shrink-0 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <Building2 className={`w-4 h-4 ml-2 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setPage(1);
                    }}
                    className={`bg-transparent text-xs font-semibold px-2 py-1.5 rounded-lg border-0 focus:ring-0 cursor-pointer ${
                      isDark ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    <option value="ALL" className={isDark ? 'bg-[#0B1020] text-white' : 'bg-white text-slate-900'}>
                      🏢 All Destination Hubs
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className={isDark ? 'bg-[#0B1020] text-white' : 'bg-white text-slate-900'}>
                        {b.branch_name} ({b.city || 'Hub'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-xs shrink-0 select-none ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {currentBranch?.branch_name || user?.branchName || 'Assigned Branch'}
                    </span>
                    {(currentBranch?.city || user?.city) && (
                      <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        ({currentBranch?.city || user?.city})
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 tracking-wider">
                      {currentBranch?.branch_code || user?.branchCode || 'HUB'}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'READY' && (
                <button
                  onClick={openDrsModal}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
                    selectedDocketIds.size > 0
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                  }`}
                  title="Create Delivery Run Sheet (DRS) for doorstep delivery"
                >
                  <Truck className="w-3.5 h-3.5" />
                  {selectedDocketIds.size > 0
                    ? `Dispatch DRS (${selectedDocketIds.size} Selected)`
                    : '+ Create Delivery Run Sheet (DRS)'}
                </button>
              )}

              <button
                onClick={fetchDeliveries}
                className={`p-2 rounded-xl border transition-colors shadow-xs cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Refresh Deliveries"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80 hover:border-slate-700/80' : 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Ready in Godown
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {summary.ready_in_godown_count}
                </span>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ({summary.ready_in_godown_packages} Pkgs)
                </span>
              </div>
              <p className="text-[10px] text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Stocked & Ready
              </p>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80 hover:border-slate-700/80' : 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Door Delivery Pending
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {summary.door_delivery_pending_count}
                </span>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>dockets</span>
              </div>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ready for DRS local run</p>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80 hover:border-slate-700/80' : 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Godown Self-Pickup
                </span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {summary.godown_pickup_pending_count}
                </span>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>dockets</span>
              </div>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customer counter pickup</p>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80 hover:border-slate-700/80' : 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Out for Delivery
                </span>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {summary.out_for_delivery_count}
                </span>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>active runs</span>
              </div>
              <p className="text-[10px] text-blue-500 font-semibold mt-1">Driver on road</p>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80 hover:border-slate-700/80' : 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Pending TO-PAY Cash
                </span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-500">
                  ₹{Number(summary.pending_to_pay_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Collect before handover
              </p>
            </div>
          </div>

          {/* Operational Tabs & Search Bar */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3 ${
            isDark ? 'border-slate-800/80' : 'border-slate-200'
          }`}>
            <div className={`flex items-center space-x-1 p-1 rounded-2xl border overflow-x-auto ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/90 border-slate-200'
            }`}>
              <button
                onClick={() => handleTabChange('READY')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  activeTab === 'READY'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Boxes className="w-4 h-4" />
                Ready at Destination Godown ({summary.ready_in_godown_count})
              </button>

              <button
                onClick={() => handleTabChange('OUT_FOR_DELIVERY')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  activeTab === 'OUT_FOR_DELIVERY'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Truck className="w-4 h-4" />
                Out for Delivery (DRS) ({summary.out_for_delivery_count})
              </button>

              <button
                onClick={() => handleTabChange('DELIVERED')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  activeTab === 'DELIVERED'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Delivered & Gate Pass Archive ({summary.delivered_count})
              </button>
            </div>

            {/* Quick Filters: Delivery Mode & Payment */}
            <div className="flex items-center gap-2">
              <select
                value={deliveryTypeFilter}
                onChange={(e) => setDeliveryTypeFilter(e.target.value)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border shadow-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <option value="ALL">All Delivery Types</option>
                <option value="DOOR_DELIVERY">Door Delivery</option>
                <option value="GODOWN_DELIVERY">Godown Pickup</option>
              </select>

              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border shadow-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <option value="ALL">All Payment Types</option>
                <option value="TO_PAY">TO-PAY (Freight Pending)</option>
                <option value="PAID">PAID</option>
                <option value="TBB">TBB (Billed to Account)</option>
              </select>
            </div>
          </div>

          {/* Master Deliveries DataTable */}
          <DataTable
            columns={columns}
            data={consignments}
            totalCount={totalCount}
            isLoading={loading}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={({ sortBy: newSortBy, sortOrder: newSortOrder }) => {
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            searchQuery={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder={`Search by ${term} #, consignee name, destination city...`}
            exportFilename="LastMile_Deliveries_Registry"
            emptyTitle={
              activeTab === 'READY'
                ? 'No Dockets Awaiting Delivery at this Branch'
                : activeTab === 'OUT_FOR_DELIVERY'
                ? 'No Active Delivery Run Sheets on Road'
                : 'No Completed Delivery Records Found'
            }
            emptySubtitle={
              activeTab === 'READY'
                ? 'When an inbound trip completes unloading at this destination branch, arriving dockets will appear here for delivery.'
                : 'Select dockets in the Ready tab to dispatch local doorstep delivery runs.'
            }
          />

          {/* MODAL 1: GODOWN COUNTER HANDOVER (SELF-PICKUP) */}
          {counterHandoverDocket && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className={`rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Fixed Header */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Godown Counter Handover (Self-Pickup)
                      </h3>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Docket #{counterHandoverDocket.docket_number || counterHandoverDocket.lr_number} • {counterHandoverDocket.origin_city} → {counterHandoverDocket.destination_city}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCounterHandoverDocket(null)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
                  {/* CRITICAL TO-PAY PAYMENT VERIFICATION BOX */}
                  {counterHandoverDocket.payment_type === 'TO_PAY' ? (
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                          <Receipt className="w-4 h-4" /> Freight Payment Required (TO-PAY)
                        </span>
                        <span className={`text-base font-black ${isDark ? 'text-white' : 'text-rose-950'}`}>
                          ₹{Number(counterHandoverDocket.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Consignee must pay the freight balance in full before parcels can leave the godown.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                            Payment Method <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <select
                            value={handoverForm.payment_mode}
                            onChange={(e) => setHandoverForm({ ...handoverForm, payment_mode: e.target.value })}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold border ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="CASH">💵 Cash at Counter</option>
                            <option value="UPI">📱 UPI / QR Code (PhonePe/GPay)</option>
                            <option value="NEFT">🏦 Bank NEFT / RTGS</option>
                            <option value="LEDGER">📑 Debit to Ledger Account</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Receipt / UTR Reference</label>
                          <input
                            type="text"
                            value={handoverForm.payment_ref}
                            onChange={(e) => setHandoverForm({ ...handoverForm, payment_ref: e.target.value })}
                            placeholder="e.g. Cash Receipt # or UPI Ref"
                            className={`w-full rounded-lg px-2.5 py-1.5 text-xs border ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 pt-0.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={handoverForm.payment_collected}
                          onChange={(e) => setHandoverForm({ ...handoverForm, payment_collected: e.target.checked })}
                          className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                        />
                        <span className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          Confirm: Full amount ₹{Number(counterHandoverDocket.total_amount || 0).toLocaleString('en-IN')} has been collected <span className="text-rose-500 font-bold">*</span>
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">Payment Status: {counterHandoverDocket.payment_type}</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Freight settled at origin or billed on credit. No cash collection needed.</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">₹{Number(counterHandoverDocket.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {/* PACKAGE TALLY & HANDOVER VERIFICATION */}
                  <div className={`px-4 py-2 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    {/* Item 1: Booked Packages */}
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-tight">
                        Booked Pkgs
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-base font-black text-blue-600 dark:text-cyan-400 font-mono leading-none">
                          {counterHandoverDocket.packages_count}
                        </span>
                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-none`}>
                          {counterHandoverDocket.package_type || 'Boxes'}
                        </span>
                      </div>
                    </div>

                    {/* Item 2: Delivered Packages (Editable Input) */}
                    <div className="flex flex-col items-center">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-tight text-center">
                        Delivered Pkgs <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={counterHandoverDocket.packages_count}
                        value={handoverForm.delivered_packages}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = Number(val) || 0;
                          const shortPkgs = Math.max(0, Number(counterHandoverDocket.packages_count || 0) - numVal);
                          setHandoverForm({
                            ...handoverForm,
                            delivered_packages: val,
                            short_packages: shortPkgs,
                          });
                        }}
                        className={`w-20 text-center font-mono font-black text-sm rounded-lg px-2 py-0.5 border shadow-xs transition-all mt-0.5 focus:ring-2 focus:ring-blue-500/20 ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-white focus:border-cyan-400'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    {/* Item 3: Short Packages (Automatically displayed if partial delivery) */}
                    {Number(counterHandoverDocket.packages_count || 0) > (Number(handoverForm.delivered_packages) || 0) && (
                      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
                        <span className="text-[10px] uppercase tracking-wider text-rose-500 dark:text-rose-400 font-bold leading-tight text-center">
                          Short Pkgs
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25">
                          <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">
                            {Number(counterHandoverDocket.packages_count || 0) - (Number(handoverForm.delivered_packages) || 0)}
                          </span>
                          <span className="text-xs font-bold text-rose-500 dark:text-rose-400 leading-none">
                            {counterHandoverDocket.package_type || 'Boxes'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Item 4: Total Weight */}
                    <div className="flex flex-col items-end text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-tight">
                        Total Weight
                      </span>
                      <div className="flex items-baseline justify-end gap-1 mt-0.5">
                        <span className={`text-base font-black font-mono leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {counterHandoverDocket.charged_weight || counterHandoverDocket.actual_weight}
                        </span>
                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-none`}>
                          KG
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RECIPIENT IDENTITY VERIFICATION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        Receiver Full Name <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={handoverForm.receiver_name}
                        onChange={(e) => setHandoverForm({ ...handoverForm, receiver_name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar (Consignee / Driver)"
                        className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        Receiver Phone Number <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={handoverForm.receiver_phone}
                        onChange={(e) => setHandoverForm({ ...handoverForm, receiver_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit mobile number"
                        className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* ID PROOF & SIGNED POD UPLOAD */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        ID Proof / Authorization Verified
                      </label>
                      <input
                        type="text"
                        value={handoverForm.receiver_id_proof}
                        onChange={(e) => setHandoverForm({ ...handoverForm, receiver_id_proof: e.target.value })}
                        placeholder="e.g. Original Bilty Copy / Aadhaar"
                        className={`w-full rounded-xl px-3 py-1.5 text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-0.5">
                        <span>Signed POD Photo <span className="text-rose-500 font-bold">*</span></span>
                        {handoverForm.pod_file_url && (
                          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Attached
                          </span>
                        )}
                      </label>
                      <input
                        type="file"
                        ref={cameraInputRef}
                        accept="image/*"
                        capture="environment"
                        onChange={handlePodFileSelect}
                        className="hidden"
                      />
                      <input
                        type="file"
                        ref={podFileInputRef}
                        accept="image/*,.pdf"
                        onChange={handlePodFileSelect}
                        className="hidden"
                      />
                      {podUploading ? (
                        <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <div>
                            <p className="text-[11px] font-bold">Optimizing photo for database...</p>
                            <p className="text-[9px] text-slate-400">Compressing to Base64 within 1 MB limit</p>
                          </div>
                        </div>
                      ) : handoverForm.pod_file_url ? (
                        <div className={`p-1.5 rounded-xl border flex items-center justify-between gap-2 ${
                          isDark ? 'bg-slate-900 border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-500/30'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {isPodImage(handoverForm.pod_file_url) ? (
                              <img
                                src={handoverForm.pod_file_url}
                                alt="POD"
                                className="w-8 h-8 rounded-lg object-cover border border-emerald-500/40 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold truncate text-emerald-600 dark:text-emerald-400">
                                {handoverForm.pod_file_name || 'Signed_POD.jpg'}
                              </p>
                              <p className="text-[9px] text-slate-400 truncate">
                                {handoverForm.pod_file_size || 'Attached'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => podFileInputRef.current?.click()}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => setHandoverForm((prev) => ({ ...prev, pod_file_url: '', pod_file_name: '', pod_file_size: '' }))}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setCameraModalOpen(true)}
                              className={`p-2.5 rounded-xl border-2 border-dashed flex items-center gap-2 text-left transition-all cursor-pointer ${
                                isDark
                                  ? 'border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300'
                                  : 'border-indigo-300 bg-indigo-50/60 hover:bg-indigo-100/60 text-indigo-700'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold leading-tight">Take Photo</p>
                                <p className="text-[9px] text-slate-400 leading-tight">Open Camera</p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => podFileInputRef.current?.click()}
                              className={`p-2.5 rounded-xl border-2 border-dashed flex items-center gap-2 text-left transition-all cursor-pointer ${
                                isDark
                                  ? 'border-slate-700 hover:border-slate-600 bg-slate-900/60 text-slate-300'
                                  : 'border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold leading-tight">Upload File</p>
                                <p className="text-[9px] text-slate-400 leading-tight">Image / PDF</p>
                              </div>
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 px-1">
                            <span>Base64 in Database</span>
                            <span className="font-semibold text-amber-500/80">Max Limit: 1 MB</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* REMARKS */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                      Handover Remarks
                    </label>
                    <input
                      type="text"
                      value={handoverForm.remarks}
                      onChange={(e) => setHandoverForm({ ...handoverForm, remarks: e.target.value })}
                      placeholder="Cargo handed over in sound condition"
                      className={`w-full rounded-xl px-3 py-1.5 text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-t shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <button
                    onClick={() => setCounterHandoverDocket(null)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleCompleteHandover}
                    className="px-5 py-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting ? 'Confirming Delivery...' : 'Confirm Delivery & Issue Gate Pass'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: CREATE DELIVERY RUN SHEET (DRS) FOR DOORSTEP DISPATCH */}
          {drsModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden animate-in fade-in duration-200">
              <div className={`rounded-2xl max-w-6xl w-full h-[90vh] max-h-[860px] flex flex-col shadow-2xl border transition-all overflow-hidden ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Fixed Top Header */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Create Delivery Run Sheet (DRS)
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                          Doorstep Delivery
                        </span>
                      </div>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Assign ready godown consignments to local delivery vehicle for last-mile delivery
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      <Boxes className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{selectedDocketIds.size} of {activeDrsDockets.length} Selected</span>
                    </div>

                    <button
                      onClick={() => setDrsModalOpen(false)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 2-Column Responsive Body */}
                <div className={`grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 divide-y lg:divide-y-0 lg:divide-x ${
                  isDark ? 'divide-slate-800' : 'divide-slate-200'
                } overflow-hidden`}>

                  {/* LEFT COLUMN: Dockets Selection & Route Details (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col min-h-0 h-full overflow-hidden">
                    {/* Left Column Controls Header */}
                    <div className={`p-3.5 border-b shrink-0 space-y-2.5 ${
                      isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Select Bilties / Dockets
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {filteredDrsConsignments.length} Available
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedDocketIds(new Set(activeDrsDockets.map((c) => c.id)))}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Select All ({activeDrsDockets.length})
                          </button>
                          <span className="text-slate-400">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedDocketIds(new Set())}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                          >
                            Clear Selection
                          </button>
                        </div>
                      </div>

                      {/* Search & Quick Filter Controls */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={drsDocketSearch}
                            onChange={(e) => setDrsDocketSearch(e.target.value)}
                            placeholder="Filter by LR no, consignee, consignor, city..."
                            className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500'
                                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                            }`}
                          />
                          {drsDocketSearch && (
                            <button
                              type="button"
                              onClick={() => setDrsDocketSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDrsFilterType('ALL')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              drsFilterType === 'ALL'
                                ? 'bg-indigo-600 text-white'
                                : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrsFilterType('DOOR_DELIVERY')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              drsFilterType === 'DOOR_DELIVERY'
                                ? 'bg-indigo-600 text-white'
                                : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            Door Delivery
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrsFilterType('TO_PAY')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              drsFilterType === 'TO_PAY'
                                ? 'bg-rose-600 text-white'
                                : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            TO-PAY
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Docket Checklist */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-0">
                      {drsLoading ? (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                          <span className="text-xs">Loading ready dockets...</span>
                        </div>
                      ) : filteredDrsConsignments.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                          <Boxes className="w-8 h-8 text-slate-500 opacity-40" />
                          <p className="text-xs font-semibold">No ready consignments match your criteria</p>
                          <span className="text-[11px] text-slate-500">Try clearing the search or filter</span>
                        </div>
                      ) : (
                        filteredDrsConsignments.map((c) => {
                          const isChecked = selectedDocketIds.has(c.id);
                          const originCode = c.originBranch?.branch_code || (c.origin_city ? c.origin_city.slice(0, 3).toUpperCase() : 'ORG');
                          const destCode = c.destBranch?.branch_code || (c.destination_city ? c.destination_city.slice(0, 3).toUpperCase() : 'DST');

                          return (
                            <div
                              key={c.id}
                              onClick={() => toggleSelectDocket(c.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? isDark
                                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/40'
                                    : 'bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-400/40'
                                  : isDark
                                  ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                              }`}
                            >
                              {/* Card Header: Checkbox + LR Number + Date + Badges */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // handled by parent onClick
                                    className="w-4 h-4 rounded border-slate-500 text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                                  />
                                  <span className="font-mono font-black text-sm text-blue-500 dark:text-cyan-400">
                                    {c.docket_number || c.lr_number}
                                  </span>
                                  {c.booking_date && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <Calendar className="w-2.5 h-2.5" />
                                      {new Date(c.booking_date).toLocaleDateString('en-GB')}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    c.delivery_type === 'DOOR_DELIVERY'
                                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {c.delivery_type === 'DOOR_DELIVERY' ? <Truck className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                                    {c.delivery_type === 'DOOR_DELIVERY' ? 'Door Delivery' : 'Godown Delivery'}
                                  </span>

                                  {c.payment_type === 'TO_PAY' ? (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                      TO-PAY: ₹{Number(c.total_amount || 0).toLocaleString('en-IN')}
                                    </span>
                                  ) : c.payment_type === 'PAID' ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      PAID
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                      T.B.B.
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Route / Transit Flow (Where Booked ➔ Where Deliver) */}
                              <div className="grid grid-cols-2 gap-3 mt-2.5 pt-2 border-t border-slate-700/20 text-xs">
                                {/* Booked At (Origin) */}
                                <div className="space-y-0.5">
                                  <div className="text-[9.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-cyan-500" />
                                    <span>Booked At ({originCode})</span>
                                  </div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                                    {c.originBranch?.branch_name || c.origin_city}
                                  </div>
                                  <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1">
                                    <User className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{c.consignor?.name || 'Commercial Shipper'}</span>
                                    {c.consignor?.phone && <span className="font-mono text-[9.5px]">({c.consignor.phone})</span>}
                                  </div>
                                </div>

                                {/* Deliver To (Destination) */}
                                <div className="space-y-0.5">
                                  <div className="text-[9.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <Truck className="w-2.5 h-2.5 text-emerald-500" />
                                    <span>Deliver To ({destCode})</span>
                                  </div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                                    {c.destBranch?.branch_name || c.destBranch?.city || c.destination_city}
                                  </div>
                                  <div className="text-[10.5px] text-slate-700 dark:text-slate-300 font-semibold truncate flex items-center gap-1">
                                    <User className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                                    <span className="truncate">{c.consignee?.name || 'Customer'}</span>
                                    {c.consignee?.phone && <span className="font-mono text-[9.5px]">({c.consignee.phone})</span>}
                                  </div>
                                  {(c.consignee?.address || c.delivery_address) && (
                                    <div className="text-[9.5px] text-slate-400 truncate max-w-[240px]" title={c.consignee?.address || c.delivery_address}>
                                      📍 {c.consignee?.address || c.delivery_address}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Cargo Specs Footer Strip */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/20 text-[10px] text-slate-500 font-medium">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {c.packages_count} Pkgs
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {c.charged_weight || c.actual_weight || 0} KG
                                  </span>
                                  <span>•</span>
                                  <span className="truncate max-w-[160px] text-slate-400">
                                    {c.cargo_type || c.material_description || 'General Cargo'}
                                  </span>
                                </div>

                                {c.payment_type === 'TO_PAY' && (
                                  <span className="font-mono font-black text-rose-500">
                                    Cash Due: ₹{Number(c.total_amount || 0).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Fleet, Driver & Dispatch Control (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col min-h-0 h-full overflow-hidden">
                    {/* Right Column Header */}
                    <div className={`p-3.5 border-b shrink-0 flex items-center justify-between ${
                      isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                    }`}>
                      <div>
                        <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Delivery Fleet & Driver Details
                        </span>
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Specify vehicle, driver contact and delivery sector
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Step 2: Assign
                      </span>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs min-h-0">
                      {/* Summary KPI Cards */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2.5 rounded-xl border ${
                          isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
                        }`}>
                          <span className="text-[9.5px] font-bold text-indigo-500 uppercase tracking-wider block">
                            Selected
                          </span>
                          <span className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {selectedDocketIds.size} / {activeDrsDockets.length}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                        }`}>
                          <span className="text-[9.5px] font-bold text-blue-500 uppercase tracking-wider block truncate">
                            Cargo Load
                          </span>
                          <span className={`text-xs sm:text-sm font-black truncate block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {selectedDocketsSummary.pkgs} Pkgs ({selectedDocketsSummary.weight} KG)
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          selectedDocketsSummary.toPayCash > 0
                            ? isDark ? 'bg-rose-500/15 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                            : isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                        }`}>
                          <span className={`text-[9.5px] font-bold uppercase tracking-wider block truncate ${
                            selectedDocketsSummary.toPayCash > 0 ? 'text-rose-500' : 'text-emerald-500'
                          }`}>
                            To-Pay Cash
                          </span>
                          <span className={`text-sm sm:text-base font-black truncate block ${
                            selectedDocketsSummary.toPayCash > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            ₹{Number(selectedDocketsSummary.toPayCash).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Cash collection alert if TO-PAY items exist */}
                      {selectedDocketsSummary.toPayCash > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px]">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>
                            <strong>Driver Collection Alert:</strong> Collect <strong>₹{Number(selectedDocketsSummary.toPayCash).toLocaleString('en-IN')}</strong> before handing over cargo.
                          </span>
                        </div>
                      )}

                      {/* Selected Dockets Quick Tag List */}
                      {selectedDocketsList.length > 0 && (
                        <div className={`p-2.5 rounded-xl border space-y-1.5 ${
                          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Selected Consignments ({selectedDocketsList.length})</span>
                            <span className="text-[9px] font-normal text-slate-500">Click ✕ to remove</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {selectedDocketsList.map((c) => (
                              <span
                                key={c.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-colors ${
                                  isDark ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                }`}
                              >
                                <span>{c.docket_number || c.lr_number}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectDocket(c.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="Remove from DRS"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vehicle & Driver Input Fields */}
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Delivery Vehicle Number <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <Truck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              list="vehicles-list"
                              value={drsForm.vehicle_number}
                              onChange={(e) => setDrsForm({ ...drsForm, vehicle_number: e.target.value.toUpperCase() })}
                              placeholder="e.g. DL 01 AB 1234 (Tata Ace / Pickup)"
                              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold border ${
                                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                          <datalist id="vehicles-list">
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.vehicle_number}>
                                {v.vehicle_number} ({v.type || 'Mini Truck'})
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Driver Name <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              list="drivers-list"
                              value={drsForm.driver_name}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matchedDriver = drivers.find((d) => d.name?.toLowerCase() === val.toLowerCase());
                                const autoPhone = matchedDriver?.phone ? matchedDriver.phone.replace(/\D/g, '').slice(0, 10) : drsForm.driver_phone;
                                setDrsForm({
                                  ...drsForm,
                                  driver_name: val,
                                  driver_phone: autoPhone,
                                });
                              }}
                              placeholder="e.g. Rajesh Kumar"
                              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-semibold border ${
                                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                          <datalist id="drivers-list">
                            {drivers.map((d) => (
                              <option key={d.id} value={d.name}>
                                {d.name} ({d.phone || ''})
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-400">
                              Driver Mobile Phone
                            </label>
                            <span className={`text-[10px] font-mono ${
                              (drsForm.driver_phone || '').length === 10
                                ? 'text-emerald-500 font-bold'
                                : (drsForm.driver_phone || '').length > 0
                                ? 'text-amber-500 font-bold'
                                : 'text-slate-500'
                            }`}>
                              {(drsForm.driver_phone || '').length}/10 Digits
                            </span>
                          </div>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="tel"
                              maxLength={10}
                              value={drsForm.driver_phone}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setDrsForm({ ...drsForm, driver_phone: digits });
                              }}
                              placeholder="10-digit mobile number"
                              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono border transition-colors ${
                                drsForm.driver_phone && drsForm.driver_phone.length !== 10
                                  ? 'border-amber-500 focus:border-amber-500 bg-amber-500/5'
                                  : drsForm.driver_phone && drsForm.driver_phone.length === 10
                                  ? 'border-emerald-500 focus:border-emerald-500 bg-emerald-500/5 text-emerald-400'
                                  : isDark
                                  ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                          {drsForm.driver_phone && drsForm.driver_phone.length !== 10 && (
                            <span className="text-[10px] text-amber-500 font-semibold mt-1 block">
                              Mobile number must be exactly 10 digits ({10 - drsForm.driver_phone.length} more digits needed)
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Delivery Sector / Route Area
                          </label>
                          <div className="relative">
                            <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={drsForm.delivery_area}
                              onChange={(e) => setDrsForm({ ...drsForm, delivery_area: e.target.value })}
                              placeholder="e.g. Okhla Phase 2 / South Delhi Industrial Area"
                              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border ${
                                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Dispatch Instructions / Remarks
                          </label>
                          <input
                            type="text"
                            value={drsForm.remarks}
                            onChange={(e) => setDrsForm({ ...drsForm, remarks: e.target.value })}
                            placeholder="e.g. Collect signed copy and cash receipt before unloading"
                            className={`w-full rounded-xl px-3 py-2 text-xs border ${
                              isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fixed Right Column Footer */}
                    <div className={`p-4 border-t shrink-0 flex items-center justify-between ${
                      isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setDrsModalOpen(false)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submitting || selectedDocketIds.size === 0 || !drsForm.vehicle_number.trim() || !drsForm.driver_name.trim()}
                        onClick={handleCreateDrs}
                        className="px-5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        {submitting ? 'Generating DRS...' : `Dispatch DRS (${selectedDocketIds.size} Dockets)`}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* MODAL 2.5: OFFICIAL PRINTABLE DELIVERY RUN SHEET (DRS) */}
          {createdDrsRecord && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-hidden print:p-0 print:bg-white animate-in fade-in duration-150">
              <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-300 print:max-h-none print:border-none print:shadow-none print:m-0 print:w-full print:overflow-visible">
                {/* Print Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                      {user?.companyName || user?.tenantName || 'Balaji Logistics'}
                    </h2>
                    <p className="text-xs text-slate-600">
                      Fleet Delivery Run Sheet • Doorstep Dispatched Run
                    </p>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      Destination Branch: {currentBranch?.branch_name || user?.branchName || 'Hub'} ({currentBranch?.branch_code || 'HUB'})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-indigo-600 text-white font-black text-xs rounded uppercase tracking-wider mb-1">
                      DELIVERY RUN SHEET (DRS)
                    </span>
                    <div className="text-sm font-mono font-black text-indigo-700">
                      {createdDrsRecord.drs_number}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Date: {new Date(createdDrsRecord.dispatched_at || Date.now()).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* DRS Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <span className="font-bold text-slate-500 uppercase text-[9px] block">Vehicle Number</span>
                    <div className="font-black text-slate-900 text-sm">{createdDrsRecord.vehicle_number}</div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <span className="font-bold text-slate-500 uppercase text-[9px] block">Driver Name</span>
                    <div className="font-black text-slate-900 text-sm">{createdDrsRecord.driver_name}</div>
                    <div className="text-[10px] text-slate-600">{createdDrsRecord.driver_phone || 'No phone'}</div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <span className="font-bold text-slate-500 uppercase text-[9px] block">Delivery Route / Area</span>
                    <div className="font-bold text-slate-900 text-xs">{createdDrsRecord.delivery_area || 'Destination City'}</div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-rose-50 border-rose-200">
                    <span className="font-bold text-rose-600 uppercase text-[9px] block">Total TO-PAY Cash</span>
                    <div className="font-black text-rose-600 text-sm">
                      ₹{Number(createdDrsRecord.total_to_pay_to_collect || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] text-rose-500">Driver Must Collect</div>
                  </div>
                </div>

                {/* Manifest Dockets Table */}
                <table className="w-full text-xs border border-slate-300 mb-4">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                      <th className="p-2 text-center w-8">#</th>
                      <th className="p-2 text-left">Docket #</th>
                      <th className="p-2 text-left">Consignee & Phone</th>
                      <th className="p-2 text-left">Delivery Address</th>
                      <th className="p-2 text-center">Pkgs</th>
                      <th className="p-2 text-center">Weight</th>
                      <th className="p-2 text-center">Payment</th>
                      <th className="p-2 text-right">Collect (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {(createdDrsRecord.dockets || []).map((doc, idx) => (
                      <tr key={doc.id || idx}>
                        <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-mono font-black text-blue-700 whitespace-nowrap">
                          {doc.docket_number}
                        </td>
                        <td className="p-2">
                          <div className="font-bold text-slate-900">{doc.consignee_name || 'Customer'}</div>
                          <div className="text-[10px] text-slate-600">{doc.consignee_phone}</div>
                        </td>
                        <td className="p-2 max-w-[140px] truncate text-slate-600 text-[10px]">
                          {doc.consignee_address || 'Destination Hub'}
                        </td>
                        <td className="p-2 text-center font-bold">{doc.packages_count}</td>
                        <td className="p-2 text-center">{doc.weight} KG</td>
                        <td className="p-2 text-center">
                          {doc.payment_type === 'TO_PAY' ? (
                            <span className="font-bold text-rose-600">TO-PAY</span>
                          ) : (
                            <span className="font-bold text-emerald-600">PAID</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {doc.to_pay_amount > 0 ? `₹${Number(doc.to_pay_amount).toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={4} className="p-2 text-right uppercase text-[10px]">Total Run Sheet Load:</td>
                      <td className="p-2 text-center font-black">{createdDrsRecord.total_packages}</td>
                      <td className="p-2 text-center font-black">{createdDrsRecord.total_weight} KG</td>
                      <td className="p-2 text-center text-[10px]">TOTAL TO-PAY:</td>
                      <td className="p-2 text-right font-black text-rose-600">
                        ₹{Number(createdDrsRecord.total_to_pay_to_collect || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs text-center">
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                    <span className="font-bold text-slate-800">
                      Driver Acceptance ({createdDrsRecord.driver_name})
                    </span>
                    <p className="text-[10px] text-slate-500">I accept cargo & cash collection liability</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                    <span className="font-bold text-slate-800">Branch Dispatcher / Incharge</span>
                    <p className="text-[10px] text-slate-500">Cargo inspected & dispatched</p>
                  </div>
                </div>

                {/* Print Modal Footer */}
                <div className="text-[10px] text-slate-400 text-center mt-6 print:hidden flex justify-between items-center">
                  <span>Official Delivery Run Sheet for Local Dispatch</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreatedDrsRecord(null)}
                      className="px-4 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-500 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print DRS Manifest
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 3: DOORSTEP DELIVERY SIGN-OFF MODAL */}
          {doorstepDeliveryDocket && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className={`rounded-2xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl border transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Fixed Header */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <div>
                    <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Confirm Doorstep Delivery
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Docket #{doorstepDeliveryDocket.docket_number || doorstepDeliveryDocket.lr_number}
                    </p>
                  </div>
                  <button
                    onClick={() => setDoorstepDeliveryDocket(null)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
                  {doorstepDeliveryDocket.payment_type === 'TO_PAY' && (
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-rose-500 dark:text-rose-400">TO-PAY Freight Collection</span>
                        <p className={`text-[10px] ${isDark ? 'text-slate-300' : 'text-rose-800'}`}>Driver must collect cash/UPI</p>
                      </div>
                      <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-rose-950'}`}>
                        ₹{Number(doorstepDeliveryDocket.total_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className={`block text-[10px] font-bold mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Receiver Name <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={handoverForm.receiver_name}
                      onChange={(e) => setHandoverForm({ ...handoverForm, receiver_name: e.target.value })}
                      placeholder="Receiver person name"
                      className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Receiver Mobile Phone <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={handoverForm.receiver_phone}
                      onChange={(e) => setHandoverForm({ ...handoverForm, receiver_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit mobile number"
                      className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-0.5">
                      <span>Signed POD Photo <span className="text-rose-500 font-bold">*</span></span>
                      {handoverForm.pod_file_url && (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Attached
                        </span>
                      )}
                    </label>
                    <input
                      type="file"
                      ref={doorstepCameraInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handlePodFileSelect}
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={doorstepPodFileInputRef}
                      accept="image/*,.pdf"
                      onChange={handlePodFileSelect}
                      className="hidden"
                    />
                    {podUploading ? (
                      <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold">Optimizing photo for database...</p>
                          <p className="text-[9px] text-slate-400">Compressing to Base64 within 1 MB limit</p>
                        </div>
                      </div>
                    ) : handoverForm.pod_file_url ? (
                      <div className={`p-1.5 rounded-xl border flex items-center justify-between gap-2 ${
                        isDark ? 'bg-slate-900 border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-500/30'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          {isPodImage(handoverForm.pod_file_url) ? (
                            <img
                              src={handoverForm.pod_file_url}
                              alt="POD"
                              className="w-8 h-8 rounded-lg object-cover border border-emerald-500/40 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate text-emerald-600 dark:text-emerald-400">
                              {handoverForm.pod_file_name || 'Signed_POD.jpg'}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {handoverForm.pod_file_size || 'Attached'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => doorstepPodFileInputRef.current?.click()}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                              isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setHandoverForm((prev) => ({ ...prev, pod_file_url: '', pod_file_name: '', pod_file_size: '' }))}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCameraModalOpen(true)}
                            className={`p-2.5 rounded-xl border-2 border-dashed flex items-center gap-2 text-left transition-all cursor-pointer ${
                              isDark
                                ? 'border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300'
                                : 'border-indigo-300 bg-indigo-50/60 hover:bg-indigo-100/60 text-indigo-700'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                              <Camera className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold leading-tight">Take Photo</p>
                              <p className="text-[9px] text-slate-400 leading-tight">Open Camera</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => doorstepPodFileInputRef.current?.click()}
                            className={`p-2.5 rounded-xl border-2 border-dashed flex items-center gap-2 text-left transition-all cursor-pointer ${
                              isDark
                                ? 'border-slate-700 hover:border-slate-600 bg-slate-900/60 text-slate-300'
                                : 'border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold leading-tight">Upload File</p>
                              <p className="text-[9px] text-slate-400 leading-tight">Image / PDF</p>
                            </div>
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 px-1">
                          <span>Base64 in Database</span>
                          <span className="font-semibold text-amber-500/80">Max Limit: 1 MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-t shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <button
                    onClick={() => setDoorstepDeliveryDocket(null)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleDoorstepDelivered}
                    className="px-5 py-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting ? 'Confirming...' : 'Mark Delivered'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 4: PRINTABLE GATE PASS / DELIVERY CHALLAN */}
          {gatePassDocket && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-hidden print:p-0 print:bg-white animate-in fade-in duration-150">
              <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-300 print:max-h-none print:border-none print:shadow-none print:m-0 print:w-full print:overflow-visible">
                {/* Print Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                      {gatePassDocket.transporter?.name || 'TransHub Logistics'}
                    </h2>
                    <p className="text-xs text-slate-600">
                      GSTIN: {gatePassDocket.transporter?.gstin || 'N/A'} • Phone: {gatePassDocket.transporter?.phone || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-600 font-semibold">
                      Branch: {gatePassDocket.branch?.name} ({gatePassDocket.branch?.city})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded uppercase tracking-wider mb-1">
                      DELIVERY GATE PASS
                    </span>
                    <div className="text-xs font-mono font-bold text-slate-800">
                      {gatePassDocket.gate_pass_number}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Date: {new Date(gatePassDocket.generated_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Consignment & Parties info */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Consignor (Sender)</span>
                    <div className="font-bold text-slate-900">{gatePassDocket.consignment?.consignor_name || 'N/A'}</div>
                    <div className="text-slate-600 text-[11px]">{gatePassDocket.consignment?.consignor_city}</div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Consignee (Recipient)</span>
                    <div className="font-bold text-slate-900">{gatePassDocket.consignment?.consignee_name || 'N/A'}</div>
                    <div className="text-slate-600 text-[11px]">{gatePassDocket.consignment?.consignee_address || gatePassDocket.consignment?.consignee_phone}</div>
                  </div>
                </div>

                {/* Cargo Details Table */}
                <table className="w-full text-xs border border-slate-200 mb-4">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                      <th className="p-2 text-left">Docket / LR #</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-center">Packages</th>
                      <th className="p-2 text-center">Weight</th>
                      <th className="p-2 text-right">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-2 font-mono font-bold text-slate-900">
                        {gatePassDocket.consignment?.docket_number || gatePassDocket.consignment?.lr_number}
                      </td>
                      <td className="p-2 text-slate-700">
                        {gatePassDocket.consignment?.material_description || 'Standard Cargo'}
                      </td>
                      <td className="p-2 text-center font-bold text-slate-900">
                        {gatePassDocket.consignment?.packages_count} {gatePassDocket.consignment?.package_type}
                      </td>
                      <td className="p-2 text-center text-slate-700">
                        {gatePassDocket.consignment?.charged_weight || gatePassDocket.consignment?.actual_weight} KG
                      </td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        {gatePassDocket.consignment?.payment_type} (₹{gatePassDocket.consignment?.freight_amount})
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Handover & Receiver Info */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Material Handed Over To:</span>
                    <span className="font-bold text-slate-900">
                      {gatePassDocket.delivery?.receiver_name || gatePassDocket.consignment?.consignee_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Receiver Contact:</span>
                    <span className="font-bold text-slate-900">
                      {gatePassDocket.delivery?.receiver_phone || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ID Verification Note:</span>
                    <span className="font-bold text-slate-900">
                      {gatePassDocket.delivery?.receiver_id_proof || 'Verified at Godown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Delivered Packages Tally:</span>
                    <span className="font-bold text-emerald-700">
                      {gatePassDocket.delivery?.delivered_packages || gatePassDocket.consignment?.packages_count} Packages Delivered in Sound Condition
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs text-center">
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                    <span className="font-bold text-slate-800">Receiver / Customer Signature</span>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                    <span className="font-bold text-slate-800">Warehouse In-charge / Gate Authority</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center mt-6 print:hidden flex justify-between items-center">
                  <span>Authorized Gate Pass for Cargo Exit</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGatePassDocket(null)}
                      className="px-4 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-500 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Gate Pass
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 5: FULLSCREEN PROOF OF DELIVERY (POD) VIEWER */}
          {viewingPodDocket && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className={`rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border transition-all ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Proof of Delivery (POD)
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          #{viewingPodDocket.docket_number || viewingPodDocket.lr_number}
                        </span>
                      </h3>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Recipient: <span className="font-semibold text-slate-700 dark:text-slate-300">{viewingPodDocket.pod?.receiver_name || viewingPodDocket.deliveryRecord?.receiver_name || viewingPodDocket.consignee?.name || 'Customer'}</span>
                        {(viewingPodDocket.deliveryRecord?.receiver_phone || viewingPodDocket.consignee?.phone) && (
                          <span> • {viewingPodDocket.deliveryRecord?.receiver_phone || viewingPodDocket.consignee?.phone}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => downloadPodFile(viewingPodDocket.pod?.file_url, `POD_${viewingPodDocket.docket_number || viewingPodDocket.lr_number}.jpg`)}
                      className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Download POD File"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openBlobInNewTab(viewingPodDocket.pod?.file_url)}
                      className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Open full image in new tab (safe blob)"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open Full</span>
                    </button>

                    <button
                      onClick={() => setViewingPodDocket(null)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ml-1 ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body with Image / PDF preview */}
                <div className={`flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center min-h-[320px] ${
                  isDark ? 'bg-slate-950/60' : 'bg-slate-100/70'
                }`}>
                  {viewingPodDocket.pod?.file_url?.includes('application/pdf') ? (
                    <iframe
                      src={viewingPodDocket.pod.file_url}
                      title="POD PDF Document"
                      className="w-full h-[65vh] rounded-xl border border-slate-700"
                    />
                  ) : (
                    <div className="relative group max-h-[70vh] flex items-center justify-center">
                      <img
                        src={viewingPodDocket.pod?.file_url}
                        alt={`POD #${viewingPodDocket.docket_number || viewingPodDocket.lr_number}`}
                        className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-slate-700/50"
                      />
                    </div>
                  )}
                </div>

                {/* Footer Details */}
                <div className={`flex items-center justify-between px-5 py-3 border-t text-xs shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50/50 text-slate-500'
                }`}>
                  <div className="flex items-center gap-3">
                    <span>Delivery: <strong className="text-slate-800 dark:text-slate-200">{viewingPodDocket.delivery_type === 'DOOR_DELIVERY' ? 'Doorstep Delivery' : 'Godown Self-Pickup'}</strong></span>
                    <span>•</span>
                    <span>Packages: <strong className="text-slate-800 dark:text-slate-200">{viewingPodDocket.deliveryRecord?.delivered_packages || viewingPodDocket.packages_count} Pkgs</strong></span>
                  </div>
                  <button
                    onClick={() => setViewingPodDocket(null)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 6: HANDOVER SUCCESS & GATE PASS CONFIRMATION */}
          {handoverSuccessDocket && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border transition-all text-center ${
                isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Glowing Success Icon */}
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Cargo Handover Successful!
                </h3>
                <p className={`text-xs mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Docket <span className="font-mono font-bold text-emerald-500">#{handoverSuccessDocket.docket_number || handoverSuccessDocket.lr_number}</span> released at godown counter.
                </p>

                {/* Handover Snapshot Card */}
                <div className={`mt-4 p-3.5 rounded-xl border text-left text-xs space-y-1.5 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Recipient Name:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate ml-2">
                      {handoverSuccessDocket.consignee?.name || 'Customer'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Packages Handed Over:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {handoverSuccessDocket.packages_count} Packages
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Freight Payment:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {handoverSuccessDocket.payment_type} (Settled)
                    </span>
                  </div>
                </div>

                <div className={`mt-4 p-3 rounded-xl border text-xs text-left flex items-start gap-2.5 ${
                  isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <Printer className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Would you like to view and print the <strong>Delivery Gate Pass</strong> now for warehouse exit verification?
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 mt-5">
                  <button
                    type="button"
                    onClick={() => setHandoverSuccessDocket(null)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      isDark
                        ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    Skip for Now
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const docketId = handoverSuccessDocket.id;
                      setHandoverSuccessDocket(null);
                      openGatePass(docketId);
                    }}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Gate Pass
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CAMERA CAPTURE MODAL */}
          <CameraCaptureModal
            isOpen={cameraModalOpen}
            onClose={() => setCameraModalOpen(false)}
            onCapture={handleCameraCaptured}
            onFallbackUpload={() => {
              if (counterHandoverDocket) {
                podFileInputRef.current?.click();
              } else if (doorstepDeliveryDocket) {
                doorstepPodFileInputRef.current?.click();
              }
            }}
            title="Take Signed POD Photo"
          />
        </main>
      </div>
    </div>
  );
}
