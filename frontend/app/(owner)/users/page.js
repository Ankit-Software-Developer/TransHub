// frontend/app/(owner)/users/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import api from '../../../services/api';
import {
  Users,
  UserPlus,
  Truck,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  Award,
  Calendar,
  X,
  Shield,
  Eye,
  Lock,
  Download,
  Check,
  FileText,
  UploadCloud,
  Briefcase,
  Paperclip,
  ExternalLink,
  FileCheck
} from 'lucide-react';

export default function UsersAndDriversPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin, user: currentUser } = usePermissions();

  // Active Tab: 'drivers', 'staff'
  const [activeTab, setActiveTab] = useState('drivers');

  // Data states
  const [drivers, setDrivers] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals state
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', id: null, name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Driver Form State
  const initialDriverForm = {
    name: '',
    driver_code: '',
    phone: '',
    alt_phone: '',
    license_number: '',
    license_type: 'Heavy Commercial (HMV)',
    license_expiry: '',
    branch_id: '',
    address: '',
    emergency_contact: '',
    salary_type: 'MONTHLY',
    salary_amount: '',
    status: 'ACTIVE',
  };
  const [driverForm, setDriverForm] = useState(initialDriverForm);

  // Staff User Form State
  const initialUserForm = {
    first_name: '',
    last_name: '',
    staff_code: '',
    designation: '',
    joining_date: '',
    email: '',
    phone: '',
    password: '',
    role_id: '',
    branch_id: '',
    aadhaar_number: '',
    pan_number: '',
    address: '',
    emergency_contact: '',
    salary_amount: '',
    salary_type: 'MONTHLY',
    document_url: '',
    status: 'ACTIVE',
  };
  const [userForm, setUserForm] = useState(initialUserForm);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversRes, usersRes, rolesRes, branchesRes] = await Promise.allSettled([
        api.get('/fleet/drivers'),
        api.get('/users'),
        api.get('/roles'),
        api.get('/organizations/branches'),
      ]);

      if (driversRes.status === 'fulfilled' && driversRes.value?.data?.success) {
        setDrivers(Array.isArray(driversRes.value.data.data) ? driversRes.value.data.data : []);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value?.data?.success) {
        setStaffUsers(Array.isArray(usersRes.value.data.data) ? usersRes.value.data.data : []);
      }

      if (rolesRes.status === 'fulfilled' && rolesRes.value?.data?.success) {
        setRoles(Array.isArray(rolesRes.value.data.data) ? rolesRes.value.data.data : []);
      }

      if (branchesRes.status === 'fulfilled' && branchesRes.value?.data?.success) {
        setBranches(Array.isArray(branchesRes.value.data.data) ? branchesRes.value.data.data : []);
      }
    } catch (err) {
      console.error('Failed to load users & drivers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        searchQuery === '' ||
        d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.driver_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phone?.includes(searchQuery) ||
        d.license_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const matchBranch = branchFilter === 'ALL' || d.branch_id === branchFilter;

      return matchSearch && matchStatus && matchBranch;
    });
  }, [drivers, searchQuery, statusFilter, branchFilter]);

  // Filtered Users
  const filteredStaffUsers = useMemo(() => {
    return staffUsers.filter((u) => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const matchSearch =
        searchQuery === '' ||
        fullName.includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery) ||
        u.staff_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.aadhaar_number?.includes(searchQuery) ||
        u.pan_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
      const matchBranch = branchFilter === 'ALL' || u.branch_id === branchFilter;
      const matchRole =
        roleFilter === 'ALL' ||
        (u.roles && u.roles.some((r) => r.id === roleFilter || r.name === roleFilter));

      return matchSearch && matchStatus && matchBranch && matchRole;
    });
  }, [staffUsers, searchQuery, statusFilter, branchFilter, roleFilter]);

  // Stats Counters
  const driverStats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((d) => d.status === 'ACTIVE' || d.status === 'ON_TRIP').length;
    const onTrip = drivers.filter((d) => d.status === 'ON_TRIP').length;
    const available = drivers.filter((d) => d.status === 'ACTIVE').length;

    // License expiry in next 30 days
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = drivers.filter((d) => {
      if (!d.license_expiry) return false;
      const exp = new Date(d.license_expiry);
      return exp <= thirtyDays;
    }).length;

    return { total, active, onTrip, available, expiringSoon };
  }, [drivers]);

  const staffStats = useMemo(() => {
    const total = staffUsers.length;
    const active = staffUsers.filter((u) => u.status === 'ACTIVE').length;
    const admins = staffUsers.filter((u) =>
      u.roles?.some((r) => r.name === 'ADMIN' || r.name === 'SUPER_ADMIN')
    ).length;
    const managers = staffUsers.filter((u) =>
      u.roles?.some((r) => r.name === 'BRANCH_MANAGER')
    ).length;

    return { total, active, admins, managers };
  }, [staffUsers]);

  // Filter out Driver and Super Admin from Staff Roles dropdown/filter
  const staffRoles = useMemo(() => {
    return roles.filter((r) => {
      const code = (r.name || '').toUpperCase();
      const title = (r.display_name || '').toLowerCase();
      return code !== 'DRIVER' && code !== 'SUPER_ADMIN' && title !== 'driver';
    });
  }, [roles]);

  // Handlers for Driver Modal
  const openAddDriverModal = () => {
    setEditingDriver(null);
    setDriverForm({
      ...initialDriverForm,
      driver_code: `DRV-${String(drivers.length + 1).padStart(3, '0')}`,
    });
    setFormError('');
    setIsDriverModalOpen(true);
  };

  const openEditDriverModal = (driver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name || '',
      driver_code: driver.driver_code || '',
      phone: driver.phone || '',
      alt_phone: driver.alt_phone || '',
      license_number: driver.license_number || '',
      license_type: driver.license_type || 'Heavy Commercial (HMV)',
      license_expiry: driver.license_expiry || '',
      branch_id: driver.branch_id || '',
      address: driver.address || '',
      emergency_contact: driver.emergency_contact || '',
      salary_type: driver.salary_type || 'MONTHLY',
      salary_amount: driver.salary_amount || '',
      status: driver.status || 'ACTIVE',
    });
    setFormError('');
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    if (!driverForm.name.trim() || !driverForm.phone.trim() || !driverForm.license_number.trim()) {
      setFormError('Please enter driver name, phone number, and commercial license number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      if (editingDriver) {
        const res = await api.put(`/fleet/drivers/${editingDriver.id}`, driverForm);
        if (res.data?.success) {
          setDrivers((prev) =>
            prev.map((d) => (d.id === editingDriver.id ? { ...d, ...res.data.data } : d))
          );
          setIsDriverModalOpen(false);
        }
      } else {
        const res = await api.post('/fleet/drivers', driverForm);
        if (res.data?.success) {
          setDrivers((prev) => [res.data.data, ...prev]);
          setIsDriverModalOpen(false);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDriverStatus = async (driver) => {
    const newStatus = driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/fleet/drivers/${driver.id}/status`, { status: newStatus });
      if (res.data?.success) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === driver.id ? { ...d, status: newStatus } : d))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change status');
    }
  };

  // Handlers for Staff User Modal
  const openAddUserModal = () => {
    setEditingUser(null);
    const defaultRoleId = staffRoles.find((r) => r.name === 'BRANCH_MANAGER')?.id || staffRoles[0]?.id || '';
    const nextStaffCode = `STF-${String(staffUsers.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    setUserForm({
      ...initialUserForm,
      staff_code: nextStaffCode,
      joining_date: today,
      role_id: defaultRoleId,
    });
    setFormError('');
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (staff) => {
    setEditingUser(staff);
    const assignedRoleId = staff.roles?.[0]?.id || staffRoles[0]?.id || '';
    setUserForm({
      first_name: staff.first_name || '',
      last_name: staff.last_name || '',
      staff_code: staff.staff_code || '',
      designation: staff.designation || '',
      joining_date: staff.joining_date ? String(staff.joining_date).split('T')[0] : '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
      role_id: assignedRoleId,
      branch_id: staff.branch_id || '',
      aadhaar_number: staff.aadhaar_number || '',
      pan_number: staff.pan_number || '',
      address: staff.address || '',
      emergency_contact: staff.emergency_contact || '',
      salary_amount: staff.salary_amount || '',
      salary_type: staff.salary_type || 'MONTHLY',
      document_url: staff.document_url || '',
      status: staff.status || 'ACTIVE',
    });
    setFormError('');
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Document file size must be less than 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserForm((prev) => ({ ...prev, document_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.first_name.trim() || !userForm.email.trim()) {
      setFormError('Please enter first name and a valid login email address.');
      return;
    }
    if (!editingUser && (!userForm.password || userForm.password.length < 6)) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      if (editingUser) {
        const payload = { ...userForm };
        if (!payload.password) delete payload.password;
        const res = await api.put(`/users/${editingUser.id}`, payload);
        if (res.data?.success) {
          setStaffUsers((prev) =>
            prev.map((u) => (u.id === editingUser.id ? { ...u, ...res.data.data } : u))
          );
          setIsUserModalOpen(false);
        }
      } else {
        const res = await api.post('/users', userForm);
        if (res.data?.success) {
          setStaffUsers((prev) => [...prev, res.data.data]);
          setIsUserModalOpen(false);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save staff user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (staff) => {
    const newStatus = staff.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.patch(`/users/${staff.id}/status`, { status: newStatus });
      if (res.data?.success) {
        setStaffUsers((prev) =>
          prev.map((u) => (u.id === staff.id ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Delete Confirm Execution
  const executeDelete = async () => {
    try {
      setIsSubmitting(true);
      if (deleteConfirm.type === 'driver') {
        const res = await api.delete(`/fleet/drivers/${deleteConfirm.id}`);
        if (res.data?.success) {
          setDrivers((prev) => prev.filter((d) => d.id !== deleteConfirm.id));
        }
      } else if (deleteConfirm.type === 'user') {
        const res = await api.delete(`/users/${deleteConfirm.id}`);
        if (res.data?.success) {
          setStaffUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.id));
        }
      }
      setDeleteConfirm({ isOpen: false, type: '', id: null, name: '' });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Delete operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Generator
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserForm((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  // Export Table Data
  const exportData = () => {
    if (activeTab === 'drivers') {
      const headers = ['Driver Code', 'Name', 'Phone', 'License Number', 'License Expiry', 'Branch', 'Salary Type', 'Amount', 'Status'];
      const rows = drivers.map((d) => [
        d.driver_code || '',
        `"${d.name || ''}"`,
        d.phone || '',
        d.license_number || '',
        d.license_expiry || '',
        `"${d.branch?.branch_name || 'Unassigned'}"`,
        d.salary_type || '',
        d.salary_amount || 0,
        d.status || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TransHub_Commercial_Drivers_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const headers = ['Staff Code', 'First Name', 'Last Name', 'Designation', 'Joining Date', 'Email', 'Phone', 'Role', 'Branch', 'Aadhaar No', 'PAN No', 'Salary', 'Salary Model', 'Status', 'Last Login'];
      const rows = staffUsers.map((u) => [
        u.staff_code || '',
        `"${u.first_name || ''}"`,
        `"${u.last_name || ''}"`,
        `"${u.designation || ''}"`,
        u.joining_date || '',
        u.email || '',
        u.phone || '',
        `"${u.roles?.map(r => r.display_name || r.name).join('; ') || 'User'}"`,
        `"${u.branch?.branch_name || 'All Branches (Enterprise)'}"`,
        u.aadhaar_number || '',
        u.pan_number || '',
        u.salary_amount || 0,
        u.salary_type || 'MONTHLY',
        u.status || '',
        u.last_login_at || 'Never'
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TransHub_Staff_Users_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto w-full space-y-6">
          {/* Top Banner Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    Users & Fleet Drivers Directory
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Register commercial fleet drivers, transporter staff members, and configure operational roles.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={exportData}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  isDark
                    ? 'border-slate-800 bg-[#0B1020] hover:bg-slate-800 text-slate-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-cyan-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={openAddDriverModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-all active:scale-[0.98]"
              >
                <Truck className="w-4 h-4" />
                <span>+ Register Driver</span>
              </button>

              <button
                onClick={openAddUserModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Staff User</span>
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Drivers Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Fleet Drivers
                </span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{driverStats.total}</span>
                <span className="text-xs font-semibold text-emerald-500">
                  {driverStats.active} Active
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                <span>🛣️ {driverStats.onTrip} On Highway</span>
                <span>•</span>
                <span>🏡 {driverStats.available} In Yard</span>
              </div>
            </div>

            {/* DL Health Alert Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  License Health
                </span>
                <span className={`p-2 rounded-xl ${
                  driverStats.expiringSoon > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${driverStats.expiringSoon > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {driverStats.expiringSoon}
                </span>
                <span className="text-xs font-semibold text-slate-400">Expiring (&lt;30d)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                {driverStats.expiringSoon > 0 ? 'Statutory DL renewal due soon' : 'All driver licenses valid'}
              </p>
            </div>

            {/* Transporter Staff Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Transporter Staff
                </span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{staffStats.total}</span>
                <span className="text-xs font-semibold text-blue-500">
                  {staffStats.active} Active
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                <span>🏢 {staffStats.managers} Managers</span>
                <span>•</span>
                <span>👑 {staffStats.admins} Admins</span>
              </div>
            </div>

            {/* Hubs / Branch Coverage */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Branches & Hubs
                </span>
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Building className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{branches.length}</span>
                <span className="text-xs font-semibold text-purple-400">Active Stations</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                Dispatches, yard staff & local drivers
              </p>
            </div>
          </div>

          {/* Navigation Tab Pills */}
          <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-3 border-slate-800/40">
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <button
                onClick={() => { setActiveTab('drivers'); setStatusFilter('ALL'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'drivers'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Commercial Drivers</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 font-black">
                  {drivers.length}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('staff'); setStatusFilter('ALL'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'staff'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Transporter Staff</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 font-black">
                  {staffUsers.length}
                </span>
              </button>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* TAB 1: COMMERCIAL DRIVERS */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className={`p-3.5 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
              }`}>
                <div className="flex-1 w-full relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by driver name, code (DRV-001), phone, or DL number..."
                    className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active (In Yard)</option>
                    <option value="ON_TRIP">On Trip (Highway)</option>
                    <option value="LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>

                  {/* Branch Filter */}
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="ALL">All Stations / Hubs</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.branch_code} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drivers Table */}
              <div className={`rounded-2xl border overflow-hidden shadow-sm ${
                isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                        isDark ? 'border-slate-800/90 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}>
                        <th className="py-3.5 px-4">Driver Profile</th>
                        <th className="py-3.5 px-4">Contact</th>
                        <th className="py-3.5 px-4">Commercial License (DL)</th>
                        <th className="py-3.5 px-4">Assigned Hub</th>
                        <th className="py-3.5 px-4">Remuneration</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                            Loading fleet drivers...
                          </td>
                        </tr>
                      ) : filteredDrivers.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-slate-400">
                            <Truck className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                            <p className="font-semibold text-sm">No drivers registered yet</p>
                            <p className="text-[11px] mt-1">
                              Click "+ Register Driver" to add drivers for vehicle assignment.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredDrivers.map((driver) => {
                          const isExpiring = driver.license_expiry && new Date(driver.license_expiry) <= new Date(Date.now() + 30 * 86400000);
                          const isExpired = driver.license_expiry && new Date(driver.license_expiry) < new Date();

                          return (
                            <tr
                              key={driver.id}
                              className={`transition-colors ${
                                isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Driver Info */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                    {driver.name ? driver.name.charAt(0).toUpperCase() : 'D'}
                                  </div>
                                  <div>
                                    <span className="font-bold text-sm block">
                                      {driver.name}
                                    </span>
                                    <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                                      {driver.driver_code || 'DRV-NA'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{driver.phone}</span>
                                  </div>
                                  {driver.alt_phone && (
                                    <span className="text-[10px] text-slate-400 block">
                                      Alt: {driver.alt_phone}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* License Details */}
                              <td className="py-3.5 px-4">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span className="font-mono font-bold">{driver.license_number}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {driver.license_type || 'Heavy Commercial'}
                                  </div>
                                  {driver.license_expiry && (
                                    <div className="mt-1">
                                      {isExpired ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500">
                                          Expired: {driver.license_expiry}
                                        </span>
                                      ) : isExpiring ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">
                                          Expiring: {driver.license_expiry}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Exp: {driver.license_expiry}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Assigned Hub */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <Building className="w-3 h-3 text-cyan-400" />
                                  {driver.branch?.branch_name || driver.branch?.city || 'Unassigned Yard'}
                                </span>
                              </td>

                              {/* Remuneration */}
                              <td className="py-3.5 px-4">
                                <div className="text-xs">
                                  <span className="font-bold text-emerald-400">
                                    ₹{Number(driver.salary_amount || 0).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block uppercase">
                                    {driver.salary_type || 'MONTHLY'}
                                  </span>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() => handleToggleDriverStatus(driver)}
                                  title="Click to toggle driver status"
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                    driver.status === 'ON_TRIP'
                                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                      : driver.status === 'ACTIVE'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : driver.status === 'LEAVE'
                                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-700/30 text-slate-400 border border-slate-700/40'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                  {driver.status === 'ON_TRIP'
                                    ? 'On Trip'
                                    : driver.status === 'ACTIVE'
                                    ? 'Available'
                                    : driver.status === 'LEAVE'
                                    ? 'On Leave'
                                    : 'Inactive'}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditDriverModal(driver)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      isDark
                                        ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                    title="Edit Driver"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        type: 'driver',
                                        id: driver.id,
                                        name: driver.name,
                                      })
                                    }
                                    className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Delete Driver"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSPORTER STAFF & USERS */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className={`p-3.5 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
                isDark ? 'bg-[#0B1020]/90 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
              }`}>
                <div className="flex-1 w-full relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff by name, email, or phone..."
                    className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                  {/* Role Filter */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="ALL">All Staff Roles</option>
                    {staffRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name || r.name}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Staff Table */}
              <div className={`rounded-2xl border overflow-hidden shadow-sm ${
                isDark ? 'bg-[#0B1020] border-slate-800/80' : 'bg-white border-slate-200'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                        isDark ? 'border-slate-800/90 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}>
                        <th className="py-3.5 px-4">Staff Member</th>
                        <th className="py-3.5 px-4">Assigned Role</th>
                        <th className="py-3.5 px-4">Branch Hub</th>
                        <th className="py-3.5 px-4">Joining & KYC</th>
                        <th className="py-3.5 px-4">Remuneration</th>
                        <th className="py-3.5 px-4">Contact</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                            Loading team members...
                          </td>
                        </tr>
                      ) : filteredStaffUsers.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-slate-400">
                            <Users className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                            <p className="font-semibold text-sm">No staff users registered</p>
                            <p className="text-[11px] mt-1">
                              Click "+ Add Staff User" to register branch managers, yard supervisors, or clerks.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredStaffUsers.map((staff) => {
                          const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email;
                          const roleObj = staff.roles?.[0];
                          const isSelf = currentUser?.id === staff.id;

                          return (
                            <tr
                              key={staff.id}
                              className={`transition-colors ${
                                isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Member info */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                    {staff.first_name ? staff.first_name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm block">
                                        {fullName}
                                      </span>
                                      {staff.staff_code && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                          {staff.staff_code}
                                        </span>
                                      )}
                                      {isSelf && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {staff.designation && (
                                        <span className="text-[10px] font-medium text-amber-400 flex items-center gap-1">
                                          <Briefcase className="w-2.5 h-2.5" />
                                          {staff.designation}
                                        </span>
                                      )}
                                      <span className="text-[11px] text-slate-400">
                                        {staff.email}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  roleObj?.name === 'ADMIN' || roleObj?.name === 'SUPER_ADMIN'
                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                    : roleObj?.name === 'BRANCH_MANAGER'
                                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                    : roleObj?.name === 'ACCOUNTANT'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                }`}>
                                  <Shield className="w-3 h-3" />
                                  {roleObj?.display_name || roleObj?.name || 'Staff Member'}
                                </span>
                              </td>

                              {/* Branch */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <Building className="w-3 h-3 text-cyan-400" />
                                  {staff.branch?.branch_name || staff.branch?.city || 'All Branches (Enterprise)'}
                                </span>
                              </td>

                              {/* Joining & KYC */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-1">
                                  {staff.joining_date && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-300">
                                      <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
                                      <span>Joined: {new Date(staff.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {staff.aadhaar_number && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60" title="Aadhaar Number">
                                        UID: {staff.aadhaar_number}
                                      </span>
                                    )}
                                    {staff.pan_number && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60 uppercase" title="PAN Number">
                                        PAN: {staff.pan_number}
                                      </span>
                                    )}
                                  </div>
                                  {staff.document_url ? (
                                    <a
                                      href={staff.document_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span>Joining Doc</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic block">No document</span>
                                  )}
                                </div>
                              </td>

                              {/* Remuneration */}
                              <td className="py-3.5 px-4">
                                <div className="text-xs">
                                  <span className="font-bold text-emerald-400">
                                    ₹{Number(staff.salary_amount || 0).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block uppercase">
                                    {staff.salary_type || 'MONTHLY'}
                                  </span>
                                </div>
                              </td>

                              {/* Phone & Emergency */}
                              <td className="py-3.5 px-4">
                                <div>
                                  <span className="font-medium text-slate-300 block">
                                    {staff.phone || '—'}
                                  </span>
                                  {staff.emergency_contact && (
                                    <span className="text-[10px] text-slate-500 block truncate max-w-[130px]" title={staff.emergency_contact}>
                                      Emerg: {staff.emergency_contact}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() => !isSelf && handleToggleUserStatus(staff)}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot change own status' : 'Click to toggle status'}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                    staff.status === 'ACTIVE'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                  {staff.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditUserModal(staff)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      isDark
                                        ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                    title="Edit Staff Member"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {!isSelf && (
                                    <button
                                      onClick={() =>
                                        setDeleteConfirm({
                                          isOpen: true,
                                          type: 'user',
                                          id: staff.id,
                                          name: fullName,
                                        })
                                      }
                                      className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
                                      title="Delete Staff Member"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ADD / EDIT COMMERCIAL DRIVER */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`relative w-full max-w-2xl rounded-3xl border p-6 shadow-2xl max-h-[92vh] overflow-y-auto ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingDriver ? 'Edit Commercial Driver' : 'Register Commercial Driver'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Required for trip allocation and fleet vehicle assignment.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDriverModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveDriver} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Driver Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Singh"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Driver Code / Badge
                  </label>
                  <input
                    type="text"
                    value={driverForm.driver_code}
                    onChange={(e) => setDriverForm({ ...driverForm, driver_code: e.target.value })}
                    placeholder="e.g. DRV-101"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Primary Phone (WhatsApp) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Alternate / Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={driverForm.alt_phone}
                    onChange={(e) => setDriverForm({ ...driverForm, alt_phone: e.target.value })}
                    placeholder="e.g. 9123456780"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* License Section */}
              <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/40 space-y-3">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  Commercial Driving License (DL)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      DL Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.license_number}
                      onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. MH1220190012345"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono uppercase focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      License Type
                    </label>
                    <select
                      value={driverForm.license_type}
                      onChange={(e) => setDriverForm({ ...driverForm, license_type: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="Heavy Commercial (HMV)">Heavy Commercial (HMV)</option>
                      <option value="Multi-Axle Commercial">Multi-Axle Commercial</option>
                      <option value="Light Motor Vehicle (LMV)">Light Motor Vehicle (LMV)</option>
                      <option value="Hazardous / Tanker Certified">Hazardous / Tanker Certified</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      License Expiry Date
                    </label>
                    <input
                      type="date"
                      value={driverForm.license_expiry}
                      onChange={(e) => setDriverForm({ ...driverForm, license_expiry: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Station & Remuneration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Assigned Base Hub
                  </label>
                  <select
                    value={driverForm.branch_id}
                    onChange={(e) => setDriverForm({ ...driverForm, branch_id: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">{branches.length === 0 ? 'No branches configured yet' : 'Main Yard / Unassigned'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.branch_code} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Salary / Remuneration Model
                  </label>
                  <select
                    value={driverForm.salary_type}
                    onChange={(e) => setDriverForm({ ...driverForm, salary_type: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="MONTHLY">Monthly Fixed Salary</option>
                    <option value="PER_TRIP">Per Trip Bata / Allowance</option>
                    <option value="PER_KM">Per Kilometer (KM) Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={driverForm.salary_amount}
                    onChange={(e) => setDriverForm({ ...driverForm, salary_amount: e.target.value })}
                    placeholder="e.g. 24000"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Residential Address / Emergency Contact
                </label>
                <input
                  type="text"
                  value={driverForm.address}
                  onChange={(e) => setDriverForm({ ...driverForm, address: e.target.value })}
                  placeholder="e.g. Village Rampur, Dist. Indore, MP"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                    isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-all"
                >
                  {isSubmitting ? 'Saving Driver...' : editingDriver ? 'Update Driver Profile' : 'Save & Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER / EDIT STAFF USER & ROLE */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`relative w-full max-w-2xl rounded-3xl border p-6 shadow-2xl max-h-[92vh] overflow-y-auto ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingUser ? 'Edit Transporter Staff Profile' : 'Register New Transporter Staff'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Staff code, joining date, KYC documents, remuneration, and station access.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveUser} className="mt-4 space-y-5">
              {/* SECTION 1: IDENTITY & ROLE */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              } space-y-3.5`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>1. Employee Identity & Operational Role</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Staff Code / Employee ID
                    </label>
                    <input
                      type="text"
                      value={userForm.staff_code}
                      onChange={(e) => setUserForm({ ...userForm, staff_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. STF-001"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold focus:outline-none uppercase ${
                        isDark ? 'bg-slate-900 border-slate-800 text-cyan-300 focus:border-cyan-400' : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={userForm.joining_date}
                      onChange={(e) => setUserForm({ ...userForm, joining_date: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-400' : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      First Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userForm.first_name}
                      onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                      placeholder="e.g. Amit"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={userForm.last_name}
                      onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                      placeholder="e.g. Sharma"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Designation / Job Title
                    </label>
                    <input
                      type="text"
                      value={userForm.designation}
                      onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                      placeholder="e.g. Yard Incharge, Billing Clerk"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Operational Role <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={userForm.role_id}
                      onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      {!userForm.role_id && <option value="">-- Select Role --</option>}
                      {staffRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.display_name || r.name} {r.is_system ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Station / Branch Hub
                    </label>
                    <select
                      value={userForm.branch_id}
                      onChange={(e) => setUserForm({ ...userForm, branch_id: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">{branches.length === 0 ? 'No branches configured yet' : 'All Branches (Enterprise)'}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name || b.branch_code} ({b.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ACCESS CREDENTIALS & CONTACT */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              } space-y-3.5`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>2. System Login & Contact Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Login Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="staff@transporter.com"
                      disabled={Boolean(editingUser)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        editingUser ? 'opacity-60 cursor-not-allowed' : ''
                      } ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      placeholder="e.g. 9826012345"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Password & Emergency Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        {editingUser ? 'New Password' : 'Login Password'} {!editingUser && <span className="text-rose-400">*</span>}
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <Key className="w-2.5 h-2.5" />
                        Generate Strong
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                        className={`w-full pl-3 pr-10 py-2 rounded-xl border text-xs focus:outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <Lock className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Emergency Contact Person & Phone
                    </label>
                    <input
                      type="text"
                      value={userForm.emergency_contact}
                      onChange={(e) => setUserForm({ ...userForm, emergency_contact: e.target.value })}
                      placeholder="e.g. Ramesh (Brother) - 9876543210"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={userForm.address}
                    onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                    placeholder="e.g. House No. 24, Transport Nagar, Indore, MP"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* SECTION 3: KYC DOCUMENTS & REMUNERATION */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              } space-y-3.5`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>3. KYC Verification, Remuneration & Joining Documents</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Aadhaar Card Number
                    </label>
                    <input
                      type="text"
                      value={userForm.aadhaar_number}
                      onChange={(e) => setUserForm({ ...userForm, aadhaar_number: e.target.value })}
                      placeholder="e.g. 5432 1098 7654"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      value={userForm.pan_number}
                      onChange={(e) => setUserForm({ ...userForm, pan_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono uppercase focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Salary / Remuneration Model
                    </label>
                    <select
                      value={userForm.salary_type}
                      onChange={(e) => setUserForm({ ...userForm, salary_type: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    >
                      <option value="MONTHLY">Monthly Fixed Salary</option>
                      <option value="DAILY">Daily Wage / Bata</option>
                      <option value="COMMISSION">Commission / Trip Incentive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                      Salary Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={userForm.salary_amount}
                      onChange={(e) => setUserForm({ ...userForm, salary_amount: e.target.value })}
                      placeholder="e.g. 25000"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Joining Document / KYC File Upload */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-300">
                    Joining Document / KYC File Attachment (Aadhaar, Contract, Resume)
                  </label>
                  
                  {userForm.document_url ? (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-cyan-300">Document Attached</p>
                          <a
                            href={userForm.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>Preview / Download Attachment</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserForm({ ...userForm, document_url: '' })}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleDocumentChange}
                        className={`w-full px-3 py-2 rounded-xl border text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Accepted formats: PDF or Image (Aadhaar card, signed joining form, ID proof max 5MB).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                    isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
                >
                  {isSubmitting ? 'Saving User...' : editingUser ? 'Update Staff Member' : 'Register Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-3xl border p-6 text-center space-y-4 shadow-2xl ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold">Confirm Deletion</h4>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="font-bold text-white">"{deleteConfirm.name}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: null, name: '' })}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
