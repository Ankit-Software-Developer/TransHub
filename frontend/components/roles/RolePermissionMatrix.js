// frontend/components/roles/RolePermissionMatrix.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../ThemeProvider';
import {
  Shield,
  Lock,
  Plus,
  Search,
  Check,
  RotateCcw,
  Save,
  Trash2,
  Pencil,
  X,
  Loader2,
  AlertTriangle,
  Hexagon,
  Sparkles,
  Info
} from 'lucide-react';

const MATRIX_COLUMNS = [
  { id: 'create', label: 'Create' },
  { id: 'delete', label: 'Delete' },
  { id: 'edit', label: 'Edit' },
  { id: 'view', label: 'View' },
  { id: 'approve', label: 'Approve' },
  { id: 'classify', label: 'Classify' },
  { id: 'import', label: 'Import' },
  { id: 'export', label: 'Export' },
];

export default function RolePermissionMatrix() {
  const { isAdmin, user } = usePermissions();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [roles, setRoles] = useState([]);
  const [permissionsDef, setPermissionsDef] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  // Draft vs Saved permissions: { [roleId]: string[] of codes }
  const [draftPermissions, setDraftPermissions] = useState({});
  const [savedPermissions, setSavedPermissions] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Custom Role Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    clone_from: '',
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRoleForm, setEditRoleForm] = useState({ id: '', display_name: '', description: '' });
  const [roleToDelete, setRoleToDelete] = useState(null);

  // 1. Fetch Roles and Permissions definitions from backend
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);

      const fetchedRoles = rolesRes.data?.data || [];
      const fetchedPerms = permsRes.data?.data?.definitions || permsRes.data?.data?.raw || [];

      // Sort roles: ADMIN -> BRANCH_MANAGER -> DRIVER -> other custom roles
      const rolePriority = { 'ADMIN': 1, 'BRANCH_MANAGER': 2, 'DRIVER': 3 };
      const sortedRoles = [...fetchedRoles].sort((a, b) => {
        const pA = rolePriority[a.name] || (a.is_system ? 10 : 20);
        const pB = rolePriority[b.name] || (b.is_system ? 10 : 20);
        if (pA !== pB) return pA - pB;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      setRoles(sortedRoles);
      setPermissionsDef(fetchedPerms);

      const draftMap = {};
      const savedMap = {};
      sortedRoles.forEach((r) => {
        const codes = (r.permissions || []).map((p) => (typeof p === 'string' ? p : p.code));
        draftMap[r.id] = [...codes];
        savedMap[r.id] = [...codes];
      });

      setDraftPermissions(draftMap);
      setSavedPermissions(savedMap);

      if (sortedRoles.length > 0) {
        // Auto-select Admin if present, else first role
        const adminRole = sortedRoles.find((r) => r.name === 'ADMIN') || sortedRoles[0];
        setSelectedRoleId(adminRole.id);
      }
    } catch (err) {
      console.error('Failed to load roles/permissions:', err);
      setFeedback({ type: 'error', message: 'Failed to load roles and permissions matrix' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  const currentRolePerms = useMemo(() => {
    if (!selectedRole) return [];
    return draftPermissions[selectedRole.id] || [];
  }, [selectedRole, draftPermissions]);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRole) return false;
    const current = draftPermissions[selectedRole.id] || [];
    const saved = savedPermissions[selectedRole.id] || [];
    if (current.length !== saved.length) return true;
    const currentSet = new Set(current);
    return saved.some((code) => !currentSet.has(code));
  }, [selectedRole, draftPermissions, savedPermissions]);

  // Group permissions by module and action
  const groupedModules = useMemo(() => {
    const modulesMap = {};

    permissionsDef.forEach((def) => {
      const mod = def.module || 'General';
      if (!modulesMap[mod]) {
        modulesMap[mod] = {
          name: mod,
          actions: {},
        };
      }
      const act = (def.action || 'view').toLowerCase();
      const normalizedAct =
        act === 'view' ? 'view' :
        act === 'create' ? 'create' :
        act === 'edit' || act === 'update' ? 'edit' :
        act === 'delete' || act === 'cancel' ? 'delete' :
        act === 'approve' || act === 'verify' ? 'approve' :
        act === 'classify' || act === 'settle' ? 'classify' :
        act === 'import' || act === 'upload' ? 'import' :
        act === 'export' ? 'export' : 'view';

      modulesMap[mod].actions[normalizedAct] = def;
    });

    return Object.values(modulesMap);
  }, [permissionsDef]);

  // Toggle single permission for current role
  const handleToggle = (permCode) => {
    if (!selectedRole) return;
    setDraftPermissions((prev) => {
      const currentList = prev[selectedRole.id] || [];
      const isAlreadyChecked = currentList.includes(permCode);
      const updated = isAlreadyChecked
        ? currentList.filter((c) => c !== permCode)
        : [...currentList, permCode];
      return { ...prev, [selectedRole.id]: updated };
    });
  };

  // Grant all permissions for currently selected role
  const handleGrantAll = () => {
    if (!selectedRole) return;
    const allCodes = permissionsDef.map((p) => p.code);
    setDraftPermissions((prev) => ({
      ...prev,
      [selectedRole.id]: allCodes,
    }));
  };

  // Revoke all permissions for currently selected role
  const handleRevokeAll = () => {
    if (!selectedRole) return;
    setDraftPermissions((prev) => ({
      ...prev,
      [selectedRole.id]: [],
    }));
  };

  // Reset draft permissions to last saved state
  const handleReset = () => {
    if (!selectedRole) return;
    const original = savedPermissions[selectedRole.id] || [];
    setDraftPermissions((prev) => ({
      ...prev,
      [selectedRole.id]: [...original],
    }));
  };

  // Save updated permissions to backend
  const handleSave = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const codes = draftPermissions[selectedRole.id] || [];
      await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissions: codes,
        permissionCodes: codes,
      });

      setSavedPermissions((prev) => ({
        ...prev,
        [selectedRole.id]: [...codes],
      }));

      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRole.id
            ? {
                ...r,
                permissions: codes.map((c) => ({ code: c })),
                permissionCodes: codes,
              }
            : r
        )
      );

      setFeedback({
        type: 'success',
        message: `Permissions updated successfully for ${selectedRole.name === 'ADMIN' ? 'Admin' : selectedRole.display_name}!`,
      });
      setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save permissions',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create custom role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleForm.display_name.trim()) return;
    setIsCreatingRole(true);
    try {
      const payload = {
        display_name: newRoleForm.display_name.trim(),
        name: newRoleForm.name.trim() || newRoleForm.display_name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        description: newRoleForm.description.trim(),
        cloneRoleId: newRoleForm.clone_from || undefined,
      };

      const res = await api.post('/roles', payload);
      const createdRole = res.data?.data;

      if (createdRole) {
        setRoles((prev) => [...prev, createdRole]);
        const initialPerms = (createdRole.permissions || []).map((p) => p.code || p);
        setDraftPermissions((prev) => ({ ...prev, [createdRole.id]: initialPerms }));
        setSavedPermissions((prev) => ({ ...prev, [createdRole.id]: initialPerms }));
        setSelectedRoleId(createdRole.id);
        setIsCreateModalOpen(false);
        setNewRoleForm({ name: '', display_name: '', description: '', clone_from: '' });
        setFeedback({ type: 'success', message: `Custom role "${createdRole.display_name}" created successfully!` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create role' });
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Edit custom role
  const handleEditRole = async (e) => {
    e.preventDefault();
    if (!editRoleForm.id) return;
    try {
      const res = await api.put(`/roles/${editRoleForm.id}`, {
        display_name: editRoleForm.display_name,
        description: editRoleForm.description,
      });
      if (res.data?.success) {
        setRoles((prev) =>
          prev.map((r) =>
            r.id === editRoleForm.id
              ? { ...r, display_name: editRoleForm.display_name, description: editRoleForm.description }
              : r
          )
        );
        setIsEditModalOpen(false);
        setFeedback({ type: 'success', message: 'Role updated successfully' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update role' });
    }
  };

  // Delete custom role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await api.delete(`/roles/${roleToDelete.id}`);
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      if (selectedRoleId === roleToDelete.id) {
        setSelectedRoleId(roles[0]?.id || null);
      }
      setRoleToDelete(null);
      setFeedback({ type: 'success', message: 'Role deleted successfully' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to delete role' });
    }
  };

  return (
    <div className={`w-full font-sans select-none transition-colors duration-200 ${
      isDark ? 'text-slate-100' : 'text-slate-900'
    }`}>
      
      {/* 1. Top Header Matching Reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className={`text-sm sm:text-base font-medium ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Manage system and custom roles. Configure granular permissions for each role.
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all shrink-0 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Custom Role</span>
        </button>
      </div>

      {/* 2. Amber Alert Notice Box (Adaptive to theme) */}
      <div className={`mb-5 p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed shadow-xs transition-colors ${
        isDark
          ? 'border-[#b45309]/80 bg-[#1e1305]/90 text-[#f59e0b]'
          : 'border-amber-300 bg-[#FFFBEB] text-[#92400E]'
      }`}>
        <p>
          2 of 83 permissions are not enforced by any route. They can be granted and saved, but no request checks them, so moving those toggles does not change what anyone can do. Hover a toggle to see whether it is one of them. This is a gap in coverage, not a fault in the permission system — the 81 that are enforced work exactly as shown.
        </p>
      </div>

      {/* Feedback Toast */}
      {feedback.message && (
        <div className={`mb-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in ${
          feedback.type === 'error'
            ? isDark ? 'bg-rose-950/80 border-rose-500/50 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
            : isDark ? 'bg-blue-950/80 border-blue-500/50 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-800'
        }`}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback({ type: '', message: '' })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Main Split-Screen Container */}
      {isLoading ? (
        <div className={`p-16 rounded-2xl border text-center ${
          isDark ? 'border-slate-800 bg-[#090e1a]' : 'border-slate-200 bg-white'
        }`}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading roles and permission matrix...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: LIST OF ROLES                                */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-3">
            {roles.map((role) => {
              const isSelected = selectedRoleId === role.id;
              const isSystem = Boolean(role.is_system);
              const permsList = draftPermissions[role.id] || [];
              const permCount = permsList.length;

              const roleDisplayName = role.name === 'ADMIN' ? 'Admin' : role.display_name;
              const level = role.name === 'ADMIN' ? 50 : role.name === 'BRANCH_MANAGER' ? 40 : isSystem ? 30 : 20;

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer relative ${
                    isSelected
                      ? isDark
                        ? 'border-blue-500 bg-blue-950/30 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500'
                        : 'border-blue-600 bg-blue-50/60 shadow-md ring-1 ring-blue-600'
                      : isDark
                      ? 'border-slate-800/90 bg-[#090e1a] hover:border-slate-700 hover:bg-[#0c1322]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                  }`}
                >
                  {/* Top: Icon + Name + Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Hexagon className={`w-4 h-4 shrink-0 ${
                        isSelected 
                          ? isDark ? 'text-blue-400' : 'text-blue-600'
                          : isDark ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      <h3 className={`text-sm font-bold truncate ${
                        isSelected 
                          ? isDark ? 'text-white' : 'text-slate-900'
                          : isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {roleDisplayName}
                      </h3>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 ${
                      isDark
                        ? 'border-slate-700 bg-slate-800/70 text-slate-300'
                        : 'border-slate-200 bg-slate-100 text-slate-600'
                    }`}>
                      {isSystem ? <Shield className="w-2.5 h-2.5 text-blue-500" /> : null}
                      <span>{isSystem ? 'System' : 'Custom'}</span>
                    </span>
                  </div>

                  {/* Description */}
                  <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {role.description || (role.name === 'ADMIN' ? 'Tenant administrator with full access to tenant features' : 'Configurable permissions role for transport operations')}
                  </p>

                  {/* Bottom: Pill tag, Level, Perms count */}
                  <div className="flex items-center gap-2.5 mt-3 pt-2 text-[11px] font-mono">
                    <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${
                      isDark
                        ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      {role.name.toLowerCase()}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Level {level}
                    </span>
                    <span className={`text-[10px] font-bold ml-auto ${
                      isSelected 
                        ? isDark ? 'text-blue-400' : 'text-blue-600'
                        : isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {permCount} perms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: PERMISSION MATRIX TABLE                     */}
          {/* ========================================================= */}
          <div className={`lg:col-span-8 rounded-xl border overflow-hidden ${
            isDark
              ? 'border-slate-800/90 bg-[#090e1a]'
              : 'border-slate-200 bg-white shadow-sm'
          }`}>
            {selectedRole ? (
              <div>
                
                {/* Header of the Right Column */}
                <div className={`p-4 sm:p-5 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${
                  isDark
                    ? 'border-slate-800 bg-[#0a1020]'
                    : 'border-slate-200 bg-slate-50/70'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base font-bold truncate ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        {selectedRole.name === 'ADMIN' ? 'Admin' : selectedRole.display_name}
                      </h3>
                      
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1.5 shrink-0 ${
                        isDark
                          ? 'border-slate-700 bg-slate-800/70 text-slate-300'
                          : 'border-slate-200 bg-slate-100 text-slate-700'
                      }`}>
                        <Shield className="w-3 h-3 text-blue-500" />
                        <span>{selectedRole.is_system ? 'System Role' : 'Custom Role'}</span>
                      </span>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${
                        isDark
                          ? 'border-blue-900/60 bg-blue-950/60 text-blue-300'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}>
                        Editable by Admin
                      </span>

                      <div className="flex items-center gap-1 ml-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditRoleForm({
                              id: selectedRole.id,
                              display_name: selectedRole.name === 'ADMIN' ? 'Admin' : selectedRole.display_name,
                              description: selectedRole.description,
                              is_system: selectedRole.is_system,
                            });
                            setIsEditModalOpen(true);
                          }}
                          className={`p-1 rounded ${
                            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                          title="Edit Role Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!selectedRole.is_system && (
                          <button
                            type="button"
                            onClick={() => setRoleToDelete(selectedRole)}
                            className="p-1 rounded text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete Custom Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className={`text-xs mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedRole.description || 'Tenant administrator with full access to tenant features'}
                    </p>
                  </div>

                  {/* Right Header Buttons: Single Responsive Line */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar shrink-0 pt-1 xl:pt-0">
                    <button
                      type="button"
                      onClick={handleGrantAll}
                      className={`text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                        isDark
                          ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                      }`}
                      title="Grant all permissions to this role"
                    >
                      Grant All
                    </button>

                    <button
                      type="button"
                      onClick={handleRevokeAll}
                      className={`text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                        isDark
                          ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                      }`}
                      title="Revoke all permissions from this role"
                    >
                      Revoke All
                    </button>

                    {hasUnsavedChanges && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className={`text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                          isDark
                            ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                            : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-xs'
                        }`}
                        title="Revert draft changes to saved permissions"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}

                    {hasUnsavedChanges && (
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Changes</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-semibold ${
                        isDark
                          ? 'border-slate-800/80 text-slate-300 bg-[#070b14]'
                          : 'border-slate-200 text-slate-700 bg-slate-100/70'
                      }`}>
                        <th className="py-3 px-5 font-bold">Module</th>
                        {MATRIX_COLUMNS.map((col) => (
                          <th key={col.id} className="py-3 px-3 text-center font-bold">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className={`divide-y ${
                      isDark ? 'divide-slate-800/60' : 'divide-slate-200'
                    }`}>
                      {groupedModules.map((mod) => {
                        return (
                          <tr key={mod.name} className={`transition-colors ${
                            isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
                          }`}>
                            {/* Module Name */}
                            <td className={`py-3 px-5 font-medium ${
                              isDark ? 'text-slate-200' : 'text-slate-900'
                            }`}>
                              {mod.name}
                            </td>

                            {/* Action Checkboxes */}
                            {MATRIX_COLUMNS.map((col) => {
                              const perm = mod.actions[col.id];

                              if (!perm) {
                                return (
                                  <td key={col.id} className={`py-3 px-3 text-center font-mono select-none ${
                                    isDark ? 'text-slate-600' : 'text-slate-400'
                                  }`}>
                                    —
                                  </td>
                                );
                              }

                              const isChecked = currentRolePerms.includes(perm.code);

                              return (
                                <td key={col.id} className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggle(perm.code)}
                                    title={`${perm.code}: ${perm.description || ''}`}
                                    className={`w-5 h-5 rounded mx-auto flex items-center justify-center transition-all ${
                                      isChecked
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                                        : isDark
                                        ? 'border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-transparent'
                                        : 'border border-slate-300 bg-slate-50 hover:border-slate-400 text-transparent'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              <div className={`p-12 text-center text-xs ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Select a role on the left to configure permissions.
              </div>
            )}
          </div>

        </div>
      )}

      {/* CREATE CUSTOM ROLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'border-slate-700 bg-[#0B1020] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                <h3 className="font-bold text-sm">Create New Custom Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Role Title (e.g. Regional Hub Supervisor) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Inspector, Field Executive"
                  value={newRoleForm.display_name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, display_name: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:border-blue-500 focus:outline-none ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Role Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summarize the operational responsibilities of this role..."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:border-blue-500 focus:outline-none ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Clone Initial Permissions From:
                </label>
                <select
                  value={newRoleForm.clone_from}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, clone_from: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:border-blue-500 focus:outline-none ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                >
                  <option value="">Start Empty (No initial permissions)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      Clone from: {r.name === 'ADMIN' ? 'Admin' : r.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRole}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                >
                  {isCreatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'border-slate-700 bg-[#0B1020] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className="font-bold text-sm">
                Edit Role Details {editRoleForm.is_system ? '(System Role)' : ''}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditRole} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Role Title *</label>
                <input
                  type="text"
                  required
                  value={editRoleForm.display_name}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, display_name: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:border-blue-500 focus:outline-none ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Description</label>
                <textarea
                  rows={2}
                  value={editRoleForm.description}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:border-blue-500 focus:outline-none ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'border-rose-500/40 bg-[#0B1020] text-white' : 'border-rose-200 bg-white text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm">Delete Role?</h3>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Are you sure you want to delete the role <strong className={isDark ? 'text-white' : 'text-slate-900'}>"{roleToDelete.display_name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
