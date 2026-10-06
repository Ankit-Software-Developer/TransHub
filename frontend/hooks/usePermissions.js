// frontend/hooks/usePermissions.js
'use client';

import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export function usePermissions() {
  const user = useStore((state) => state.user);

  const roles = useMemo(() => {
    if (!user) return ['ADMIN']; // Default fallback for owner portal
    if (Array.isArray(user.roles)) {
      return user.roles.map((r) => (typeof r === 'string' ? r : r.name || ''));
    }
    if (user.role) return [user.role];
    return ['ADMIN'];
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return true; // Default admin mode for transporter tenant
    return (
      roles.includes('SUPER_ADMIN') ||
      roles.includes('TRANSPORT_OWNER') ||
      roles.includes('ADMIN') ||
      Boolean(user?.is_owner || user?.isAdmin)
    );
  }, [roles, user]);

  const hasPermission = (permissionCode) => {
    if (isAdmin) return true;
    if (!user) return true;
    const permissions = user.permissions || [];
    if (Array.isArray(permissions)) {
      return permissions.includes(permissionCode);
    }
    return false;
  };

  const hasRole = (roleName) => roles.includes(roleName);

  return {
    user,
    roles,
    isAdmin,
    hasPermission,
    hasRole,
    canExport: isAdmin || hasPermission('data.export') || hasPermission('report.export'),
    canEdit: isAdmin || hasPermission('booking.update') || hasPermission('consignment.update'),
    canDelete: isAdmin || hasPermission('booking.cancel') || hasPermission('booking.delete'),
    canCreate: isAdmin || hasPermission('booking.create'),
  };
}
