// frontend/app/(owner)/staff/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Navbar from '../../../components/layout/Navbar';
import { useTheme } from '../../../components/ThemeProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import api from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import LoadingState from '../../../components/ui/LoadingState';
import DataTable from '../../../components/ui/DataTable';
import {
  Users,
  UserPlus,
  ShieldCheck,
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
  Calendar,
  X,
  Shield,
  Eye,
  Lock,
  Download,
  Briefcase,
  Paperclip,
  FileCheck,
  Building2,
  ChevronDown
} from 'lucide-react';
import BranchFilterDropdown from '../../../components/ui/BranchFilterDropdown';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', short: 'IN' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', short: 'AE' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', short: 'SA' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸', short: 'US' },
  { code: '+44', country: 'UK', flag: '🇬🇧', short: 'GB' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', short: 'SG' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦', short: 'QA' },
  { code: '+968', country: 'Oman', flag: '🇴🇲', short: 'OM' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼', short: 'KW' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭', short: 'BH' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', short: 'AU' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', short: 'DE' },
];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function StaffManagementPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAdmin, canManageUsers, canExport } = usePermissions();

  // Data states
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
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  // Country code & Phone states
  const [userCountryCode, setUserCountryCode] = useState('+91');
  const [userPhone, setUserPhone] = useState('');
  const [userEmailError, setUserEmailError] = useState('');
  const [userPhoneError, setUserPhoneError] = useState('');

  const parsePhoneAndCountry = (rawPhone) => {
    if (!rawPhone) return { countryCode: '+91', digits: '' };
    const str = String(rawPhone).trim();
    const matched = COUNTRY_CODES.find((c) => str.startsWith(c.code));
    if (matched) {
      const digits = str.slice(matched.code.length).replace(/[^0-9]/g, '');
      return { countryCode: matched.code, digits };
    }
    if (str.startsWith('0') && str.length === 11) {
      return { countryCode: '+91', digits: str.slice(1) };
    }
    const digits = str.replace(/[^0-9]/g, '');
    return { countryCode: '+91', digits };
  };

  const handleUserPhoneChange = (val) => {
    let digits = val.replace(/[^0-9]/g, '');
    if (userCountryCode === '+91') {
      if (digits.startsWith('91') && digits.length === 12) {
        digits = digits.slice(2);
      } else if (digits.startsWith('0') && digits.length === 11) {
        digits = digits.slice(1);
      }
      digits = digits.slice(0, 10);
    } else {
      digits = digits.slice(0, 15);
    }
    setUserPhone(digits);
    if (userPhoneError) setUserPhoneError('');
  };

  const validateEmailFormat = (email) => {
    if (!email || !email.trim()) {
      return 'Login email address is required';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Please enter a valid email address (e.g. name@company.com)';
    }
    return '';
  };

  const validatePhoneNumber = (phoneDigits, code, required = false) => {
    if (!phoneDigits || !phoneDigits.trim()) {
      if (required) return 'Mobile phone number is required';
      return '';
    }
    if (code === '+91' && phoneDigits.trim().length !== 10) {
      return 'Please enter a valid 10-digit mobile number';
    }
    if (phoneDigits.trim().length < 7 || phoneDigits.trim().length > 15) {
      return 'Phone number must be between 7 and 15 digits';
    }
    return '';
  };

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, branchesRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/roles'),
        api.get('/organizations/branches'),
      ]);

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
      console.error('Failed to load staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Users
  const filteredStaffUsers = useMemo(() => {
    return staffUsers
      .map((u) => ({
        ...u,
        full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        role_names: (u.roles || []).map((r) => r.display_name || r.name).join(', '),
      }))
      .filter((u) => {
        const fullName = u.full_name.toLowerCase();
        const matchSearch =
          searchQuery === '' ||
          fullName.includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.phone?.includes(searchQuery) ||
          u.staff_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.aadhaar_number?.includes(searchQuery) ||
          u.pan_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.role_names.toLowerCase().includes(searchQuery.toLowerCase());

        const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
        const matchBranch = branchFilter === 'ALL' || u.branch_id === branchFilter;
        const matchRole =
          roleFilter === 'ALL' ||
          (u.roles && u.roles.some((r) => r.id === roleFilter || r.name === roleFilter));

        return matchSearch && matchStatus && matchBranch && matchRole;
      });
  }, [staffUsers, searchQuery, statusFilter, branchFilter, roleFilter]);

  // Stats Counters
  const staffStats = useMemo(() => {
    const total = staffUsers.length;
    const active = staffUsers.filter((u) => u.status === 'ACTIVE').length;
    const admins = staffUsers.filter((u) =>
      u.roles?.some((r) => (r.name || '').toUpperCase().includes('ADMIN'))
    ).length;
    const managers = staffUsers.filter((u) =>
      u.roles?.some((r) => (r.name || '').toUpperCase().includes('MANAGER')) ||
      (u.designation || '').toLowerCase().includes('manager')
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

  // Handlers for Staff Modal
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserForm({
      ...initialUserForm,
      staff_code: `STF-${String(staffUsers.length + 1).padStart(3, '0')}`,
    });
    setUserCountryCode('+91');
    setUserPhone('');
    setUserEmailError('');
    setUserPhoneError('');
    setFormError('');
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user) => {
    setEditingUser(user);
    const parsed = parsePhoneAndCountry(user.phone);
    setUserCountryCode(parsed.countryCode);
    setUserPhone(parsed.digits);
    setUserEmailError('');
    setUserPhoneError('');
    setUserForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      staff_code: user.staff_code || '',
      designation: user.designation || '',
      joining_date: user.joining_date || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role_id: user.roles && user.roles.length > 0 ? user.roles[0].id : '',
      branch_id: user.branch_id || '',
      aadhaar_number: user.aadhaar_number || '',
      pan_number: user.pan_number || '',
      address: user.address || '',
      emergency_contact: user.emergency_contact || '',
      salary_amount: user.salary_amount || '',
      salary_type: user.salary_type || 'MONTHLY',
      document_url: user.document_url || '',
      status: user.status || 'ACTIVE',
    });
    setFormError('');
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Document file size must be less than 5MB');
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
    const emailErr = validateEmailFormat(userForm.email);
    if (emailErr) {
      setUserEmailError(emailErr);
      setFormError(emailErr);
      return;
    }

    const phoneErr = validatePhoneNumber(userPhone, userCountryCode, false);
    if (phoneErr) {
      setUserPhoneError(phoneErr);
      setFormError(phoneErr);
      return;
    }

    if (!userForm.first_name.trim()) {
      setFormError('Please enter first name.');
      return;
    }
    if (!editingUser && (!userForm.password || userForm.password.length < 6)) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const finalPhone = userPhone.trim() ? `${userCountryCode} ${userPhone.trim()}` : '';
      const payload = {
        ...userForm,
        email: userForm.email.toLowerCase().trim(),
        phone: finalPhone,
      };

      if (editingUser) {
        if (!payload.password) delete payload.password;
        const res = await api.put(`/users/${editingUser.id}`, payload);
        if (res.data?.success) {
          setStaffUsers((prev) =>
            prev.map((u) => (u.id === editingUser.id ? { ...u, ...res.data.data } : u))
          );
          setIsUserModalOpen(false);
        }
      } else {
        const res = await api.post('/users', payload);
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
      const res = await api.delete(`/users/${deleteConfirm.id}`);
      if (res.data?.success) {
        setStaffUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.id));
      }
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
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
    const headers = ['Staff Code', 'First Name', 'Last Name', 'Designation', 'Joining Date', 'Email', 'Phone', 'Role', 'Branch', 'Aadhaar No', 'PAN No', 'Salary', 'Salary Model', 'Status'];
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
      u.status || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TransHub_Staff_Directory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Staff Table Column Definitions for DataTable
  const columns = useMemo(
    () => [
      {
        key: 'staff_member',
        header: 'Staff Member',
        sortable: true,
        exportValue: (staff) => `${staff?.first_name || ''} ${staff?.last_name || ''} (${staff?.staff_code || 'STF-NA'})`,
        render: (_val, staff = {}) => {
          const isUserAdmin = (staff.roles || []).some(
            (r) => (r.name || '').toUpperCase().includes('ADMIN')
          );
          return (
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 shadow-sm ${
                isUserAdmin
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
              }`}>
                {staff.first_name ? staff.first_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <span className={`font-bold text-sm block truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {staff.first_name} {staff.last_name || ''}
                </span>
                <span className={`text-[11px] font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {staff.staff_code || 'STF-NA'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'contact_info',
        header: 'Contact Info',
        exportValue: (staff) => `${staff?.email || ''}${staff?.phone ? ' | ' + staff.phone : ''}`,
        render: (_val, staff = {}) => (
          <div className="space-y-0.5">
            <div className={`flex items-center gap-1.5 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[170px]">{staff.email || '-'}</span>
            </div>
            {staff.phone && (
              <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{staff.phone}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'designation',
        header: 'Designation & Code',
        sortable: true,
        exportValue: (staff) => staff?.designation || 'Operational Staff',
        render: (_val, staff = {}) => (
          <div>
            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {staff.designation || 'Operational Staff'}
            </span>
            {staff.joining_date && (
              <span className={`block text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Joined: {staff.joining_date}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role / Access',
        sortable: true,
        exportValue: (staff) =>
          staff?.roles && staff.roles.length > 0
            ? (staff.roles[0].display_name || staff.roles[0].name)
            : 'Staff',
        render: (_val, staff = {}) => {
          const roleName = staff.roles && staff.roles.length > 0
            ? (staff.roles[0].display_name || staff.roles[0].name)
            : 'Staff';

          const isUserAdmin = (staff.roles || []).some(
            (r) => (r.name || '').toUpperCase().includes('ADMIN')
          );

          return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
              isUserAdmin
                ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30'
                : roleName.toLowerCase().includes('manager')
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{roleName}</span>
            </span>
          );
        },
      },
      {
        key: 'branch',
        header: 'Station / Branch',
        sortable: true,
        exportValue: (staff) => staff?.branch?.branch_name || staff?.branch?.city || 'All Branches (Enterprise)',
        render: (_val, staff = {}) => (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
          }`}>
            <Building className="w-3 h-3 text-cyan-500 dark:text-cyan-400 shrink-0" />
            <span className="truncate max-w-[150px]">
              {staff.branch?.branch_name || staff.branch?.city || 'All Branches (Enterprise)'}
            </span>
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        sortable: true,
        exportValue: (staff) => staff?.status || 'ACTIVE',
        render: (_val, staff = {}) => (
          <button
            onClick={() => canManageUsers && handleToggleUserStatus(staff)}
            disabled={!canManageUsers}
            title={canManageUsers ? 'Click to toggle active status' : 'Staff status'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              !canManageUsers ? 'cursor-default' : 'cursor-pointer hover:opacity-85'
            } ${
              staff.status === 'ACTIVE'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : staff.status === 'SUSPENDED'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              staff.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />
            <span>{staff.status === 'ACTIVE' ? 'Active' : staff.status || 'Active'}</span>
          </button>
        ),
      },
      ...(canManageUsers
        ? [
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              excludeFromExport: true,
              render: (_val, staff = {}) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openEditUserModal(staff)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isDark
                        ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-xs'
                    }`}
                    title="Edit Staff Member"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      setDeleteConfirm({
                        isOpen: true,
                        id: staff.id,
                        name: `${staff.first_name} ${staff.last_name || ''}`,
                      })
                    }
                    className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer"
                    title="Delete Staff Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [isDark, canManageUsers]
  );

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06080F] text-slate-100' : 'bg-[#F4F6FB] text-slate-900'
    } font-sans`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 w-full max-w-full">
          
          {/* Header Action Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-black tracking-tight text-balance sm:whitespace-nowrap ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    Transporter Staff & Roles Directory
                  </h1>
                  <p className={`text-xs sm:text-[13px] xl:text-sm mt-0.5 sm:mt-1 truncate sm:whitespace-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Configure operational roles, branch managers, dispatchers, and permission assignments.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              {isAdmin && (
                <BranchFilterDropdown
                  selectedBranchId={branchFilter}
                  onChange={(newBranchId) => setBranchFilter(newBranchId)}
                  branches={branches}
                  allLabel="All Branches"
                  allSubtitle="All Operating Hubs"
                  label="Branch:"
                  showLabel={true}
                  align="right"
                />
              )}

              {canExport && (
                <button
                  onClick={exportData}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shadow-xs transition-all whitespace-nowrap cursor-pointer ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Export Staff CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              )}

              {canManageUsers && (
                <button
                  onClick={openAddUserModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Staff User</span>
                </button>
              )}
            </div>
          </div>

          {/* Operational KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Transporter Staff
                </span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {staffStats.total}
                </span>
                <span className="text-[11px] font-bold text-emerald-500">
                  {staffStats.active} Active
                </span>
              </div>
              <div className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {staffStats.managers} Managers • 👑 {staffStats.admins} Admins
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Active Station Staff
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-emerald-400">
                  {staffStats.active}
                </span>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  / {staffStats.total} Users
                </span>
              </div>
              <div className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Accessing branches & dispatches
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Assigned Branches
                </span>
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <Building className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {branches.length}
                </span>
                <span className="text-[11px] font-bold text-purple-400">
                  Active Stations
                </span>
              </div>
              <div className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Hub managers & booking clerks
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0B1020]/90 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  System Roles
                </span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {staffRoles.length}
                </span>
                <span className="text-[11px] font-bold text-amber-400">
                  Role Templates
                </span>
              </div>
              <div className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Granular permission controls
              </div>
            </div>
          </div>

          {/* Staff Directory DataTable with Full Footer, Pagination & Export */}
          <DataTable
            columns={columns}
            data={filteredStaffUsers}
            isLoading={loading}
            searchQuery={searchQuery}
            onSearchChange={(val) => setSearchQuery(val)}
            searchPlaceholder="Search staff by name, code (STF-001), email, phone, or designation..."
            headerFiltersSlot={
              <div className="flex items-center gap-2">
                {/* Role Filter */}
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`pl-3 pr-8 py-1.5 rounded-xl text-xs border font-semibold focus:outline-none appearance-none cursor-pointer transition-all ${
                      roleFilter !== 'ALL'
                        ? isDark
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                          : 'bg-blue-50 border-blue-300 text-blue-800'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <option value="ALL">All Roles</option>
                    {staffRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name || r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`pl-3 pr-8 py-1.5 rounded-xl text-xs border font-semibold focus:outline-none appearance-none cursor-pointer transition-all ${
                      statusFilter !== 'ALL'
                        ? isDark
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Users</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            }
            exportFilename="TransHub_Staff_Directory"
            emptyTitle="No Staff Users Found"
            emptySubtitle="No operational team members match your search or filter parameters."
            branchFilterable={false}
            dateFilterable={false}
            pageSizeOptions={[10, 15, 25, 50, 100]}
          />

        </main>
      </div>

      {/* MODAL: ADD / EDIT STAFF USER */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)}>
        {isUserModalOpen && (
          <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/15 text-blue-500 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    {editingUser ? 'Edit Transporter Staff Member' : 'Register New Transporter Staff'}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Configure login credentials, role access, and assigned station.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDark ? 'border-slate-800 hover:bg-slate-900 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Basic Profile */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  1. Staff Identity & Roles
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={userForm.first_name}
                      onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                      placeholder="e.g. Ramesh"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={userForm.last_name}
                      onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                      placeholder="e.g. Verma"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Staff Code
                    </label>
                    <input
                      type="text"
                      value={userForm.staff_code}
                      onChange={(e) => setUserForm({ ...userForm, staff_code: e.target.value.toUpperCase() })}
                      placeholder="STF-001"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Designation / Job Title
                    </label>
                    <input
                      type="text"
                      value={userForm.designation}
                      onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                      placeholder="e.g. Branch Operations Manager"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Assigned Role & Permissions *
                    </label>
                    <select
                      required
                      value={userForm.role_id}
                      onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Select Role</option>
                      {staffRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.display_name || r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Assigned Station / Hub
                    </label>
                    <select
                      value={userForm.branch_id}
                      onChange={(e) => setUserForm({ ...userForm, branch_id: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    >
                      <option value="">All Branches (Enterprise Head Office)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          [{b.branch_code || 'CODE'}] {b.branch_name} • {b.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Login Credentials */}
              <div className="pt-2 border-t border-slate-800/60">
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  2. Login Credentials & Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Login Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => {
                        setUserForm({ ...userForm, email: e.target.value });
                        if (userEmailError) setUserEmailError('');
                      }}
                      placeholder="user@transport.com"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                        userEmailError
                          ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                          : isDark
                          ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                    {userEmailError && (
                      <p className="text-[10px] text-rose-400 mt-1">{userEmailError}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Mobile Phone Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={userCountryCode}
                        onChange={(e) => setUserCountryCode(e.target.value)}
                        className={`w-28 px-2 py-2 rounded-xl text-xs border focus:outline-none shrink-0 ${
                          isDark ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={userPhone}
                        onChange={(e) => handleUserPhoneChange(e.target.value)}
                        placeholder="9876543210"
                        className={`flex-1 px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                          userPhoneError
                            ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                            : isDark
                            ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {userPhoneError && (
                      <p className="text-[10px] text-rose-400 mt-1">{userPhoneError}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {editingUser ? 'Reset Password (Leave blank to keep existing)' : 'Account Password *'}
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] font-semibold text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Generate Secure Password</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                        className={`w-full pl-3.5 pr-10 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                          isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Remuneration & Identity */}
              <div className="pt-2 border-t border-slate-800/60">
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  3. Remuneration & Identity (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Monthly Remuneration (₹)
                    </label>
                    <input
                      type="number"
                      value={userForm.salary_amount}
                      onChange={(e) => setUserForm({ ...userForm, salary_amount: e.target.value })}
                      placeholder="e.g. 35000"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Aadhaar Card Number
                    </label>
                    <input
                      type="text"
                      value={userForm.aadhaar_number}
                      onChange={(e) => setUserForm({ ...userForm, aadhaar_number: e.target.value.replace(/[^0-9]/g, '').slice(0, 12) })}
                      placeholder="12-digit Aadhaar"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                    isDark ? 'border-slate-800 hover:bg-slate-900 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update Staff Member' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, user: null })}>
        {deleteConfirm.isOpen && (
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-[#0B1020] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold">Remove Staff Member?</h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Are you sure you want to delete <span className="font-bold text-white">{deleteConfirm.name}</span>? This user will no longer be able to log in.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
                className={`px-4 py-2 rounded-xl border text-xs font-bold ${
                  isDark ? 'border-slate-800 hover:bg-slate-900 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Staff'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
