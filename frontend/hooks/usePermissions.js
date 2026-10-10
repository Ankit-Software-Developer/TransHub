// frontend/hooks/usePermissions.js
'use client';

import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export const ROUTE_PERMISSIONS = {
  '/dashboard': ['*'],
  '/bookings': ['booking.view', 'booking.create', 'booking.update', 'consignment.update', 'booking.export'],
  '/branches': ['branch.view', 'branch.create', 'branch.manage', 'branch.delete'],
  '/fleet': ['vehicle.view', 'vehicle.create', 'vehicle.manage', 'vehicle.delete', 'driver.manage', 'vehicle.export'],
  '/users': ['role.manage', 'settings.manage', 'driver.manage', 'vehicle.manage', 'ADMIN'],
  '/staff': ['role.manage', 'settings.manage', 'user.manage', 'ADMIN'],
  '/control-tower': ['trip.view', 'booking.view', 'dispatch.view', 'vehicle.view'],
  '/load-planning': ['dispatch.view', 'dispatch.create', 'dispatch.manage', 'booking.view'],
  '/unload-planning': ['dispatch.view', 'dispatch.manage', 'trip.view', 'trip.manage', 'booking.view'],
  '/dispatches': ['dispatch.view', 'dispatch.create', 'dispatch.manage', 'dispatch.delete', 'dispatch.approve', 'dispatch.export'],
  '/trips': ['trip.view', 'trip.create', 'trip.manage', 'trip.delete', 'trip.settle'],
  '/customers': ['customer.view', 'customer.create', 'customer.manage', 'customer.delete', 'customer.export'],
  '/billing': ['invoice.view', 'invoice.create', 'invoice.update', 'invoice.delete', 'payment.create', 'invoice.export'],
  '/billing/invoices': ['invoice.view', 'invoice.create', 'invoice.update', 'invoice.delete', 'payment.create', 'invoice.export'],
  '/expenses': ['expense.view', 'expense.create', 'expense.update', 'expense.delete', 'expense.approve', 'expense.export'],
  '/reports': ['reports.view', 'reports.create', 'data.export'],
  '/approvals': ['*'],
  '/settings': ['ADMIN'],
  '/roles': ['ADMIN'],
  '/audit-logs': ['audit.view', 'AUDITOR', 'ADMIN'],
  '/deliveries': ['delivery.view', 'delivery.create', 'delivery.manage', 'delivery.delete', 'pod.verify', 'pod.upload'],
  '/pods': ['pod.verify', 'pod.upload', 'delivery.view'],
};

export function usePermissions() {
  const user = useStore((state) => state.user);

  const roles = useMemo(() => {
    if (!user) return ['ADMIN'];
    if (Array.isArray(user.roles)) {
      return user.roles.map((r) => (typeof r === 'string' ? r : r.name || ''));
    }
    if (user.role) return [user.role];
    return ['ADMIN'];
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return true;
    return (
      roles.includes('SUPER_ADMIN') ||
      roles.includes('TRANSPORT_OWNER') ||
      roles.includes('ADMIN') ||
      (Array.isArray(user.permissions) && user.permissions.includes('*')) ||
      Boolean(user?.is_owner || user?.isAdmin)
    );
  }, [roles, user]);

  const isBranchManager = useMemo(() => {
    if (!user) return false;
    return (
      roles.includes('BRANCH_MANAGER') ||
      roles.includes('HUB_MANAGER')
    );
  }, [roles, user]);

  const isAuditor = useMemo(() => {
    if (!user) return false;
    return (
      roles.includes('AUDITOR') ||
      roles.includes('AUDIT')
    );
  }, [roles, user]);

  const hasPermission = (permissionCode) => {
    if (isAdmin) return true;
    if (!user) return true;
    const permissions = user.permissions || [];
    if (Array.isArray(permissions)) {
      if (permissions.includes('*')) return true;
      return permissions.includes(permissionCode);
    }
    return false;
  };

  const hasRole = (roleName) => roles.includes(roleName);

  const canAccessRoute = (routePath) => {
    if (isAdmin) return true;
    if (!user) return true;
    const permissions = user.permissions || [];
    if (permissions.includes('*')) return true;

    const normalized = routePath.replace(/\/+$/, '') || '/';
    if (normalized === '/dashboard') return true;

    // Check exact or prefix match in ROUTE_PERMISSIONS
    const matchedKey = Object.keys(ROUTE_PERMISSIONS).find(
      (path) => normalized === path || normalized.startsWith(path + '/')
    );
    if (!matchedKey) return true;

    const required = ROUTE_PERMISSIONS[matchedKey];
    if (required.includes('*')) return true;

    return required.some((req) => {
      if (roles.includes(req)) return true;
      if (Array.isArray(permissions)) {
        return permissions.includes(req);
      }
      return false;
    });
  };

  const can = (action, module) => {
    if (isAdmin) return true;
    if (!user) return true;
    const act = (action || '').toLowerCase();
    const mod = (module || '').toLowerCase();

    if (mod === 'branch' || mod === 'branches') {
      if (act === 'view') return hasPermission('branch.view') || hasPermission('branch.manage');
      if (act === 'create') return hasPermission('branch.create');
      if (act === 'edit' || act === 'update') return hasPermission('branch.manage') || hasPermission('branch.update') || hasPermission('branch.edit');
      if (act === 'delete') return hasPermission('branch.delete');
    }
    if (mod === 'customer' || mod === 'customers') {
      if (act === 'view') return hasPermission('customer.view') || hasPermission('customer.manage');
      if (act === 'create') return hasPermission('customer.create');
      if (act === 'edit' || act === 'update') return hasPermission('customer.manage') || hasPermission('customer.update');
      if (act === 'delete') return hasPermission('customer.delete');
      if (act === 'export') return hasPermission('customer.export') || hasPermission('data.export');
    }
    if (mod === 'vehicle' || mod === 'fleet') {
      if (act === 'view') return hasPermission('vehicle.view') || hasPermission('vehicle.manage');
      if (act === 'create') return hasPermission('vehicle.create');
      if (act === 'edit' || act === 'update') return hasPermission('vehicle.manage');
      if (act === 'delete') return hasPermission('vehicle.delete');
      if (act === 'export') return hasPermission('vehicle.export') || hasPermission('data.export');
    }
    if (mod === 'booking' || mod === 'docket') {
      if (act === 'view') return hasPermission('booking.view');
      if (act === 'create') return hasPermission('booking.create');
      if (act === 'edit' || act === 'update') return hasPermission('booking.update') || hasPermission('consignment.update');
      if (act === 'delete' || act === 'cancel') return hasPermission('booking.delete') || hasPermission('booking.cancel');
      if (act === 'export') return hasPermission('booking.export') || hasPermission('data.export');
    }
    if (mod === 'dispatch') {
      if (act === 'view') return hasPermission('dispatch.view') || hasPermission('dispatch.manage');
      if (act === 'create') return hasPermission('dispatch.create');
      if (act === 'edit' || act === 'update') return hasPermission('dispatch.manage');
      if (act === 'delete') return hasPermission('dispatch.delete');
      if (act === 'approve') return hasPermission('dispatch.approve');
    }
    if (mod === 'trip') {
      if (act === 'view') return hasPermission('trip.view') || hasPermission('trip.manage');
      if (act === 'create') return hasPermission('trip.create');
      if (act === 'edit' || act === 'update') return hasPermission('trip.manage');
      if (act === 'delete') return hasPermission('trip.delete');
      if (act === 'settle') return hasPermission('trip.settle');
    }
    if (mod === 'delivery') {
      if (act === 'view') return hasPermission('delivery.view') || hasPermission('delivery.manage');
      if (act === 'create') return hasPermission('delivery.create');
      if (act === 'edit' || act === 'update') return hasPermission('delivery.manage');
      if (act === 'delete') return hasPermission('delivery.delete');
      if (act === 'verify' || act === 'approve') return hasPermission('pod.verify');
    }
    if (mod === 'invoice') {
      if (act === 'view') return hasPermission('invoice.view');
      if (act === 'create') return hasPermission('invoice.create');
      if (act === 'edit' || act === 'update') return hasPermission('invoice.update');
      if (act === 'delete') return hasPermission('invoice.delete');
      if (act === 'export') return hasPermission('invoice.export') || hasPermission('data.export');
    }
    if (mod === 'expense') {
      if (act === 'view') return hasPermission('expense.view');
      if (act === 'create') return hasPermission('expense.create');
      if (act === 'edit' || act === 'update') return hasPermission('expense.update');
      if (act === 'delete') return hasPermission('expense.delete');
      if (act === 'approve') return hasPermission('expense.approve');
    }

    return hasPermission(`${mod}.${act}`) || hasPermission(`${mod}.manage`);
  };

  return {
    user,
    roles,
    isAdmin,
    isBranchManager,
    hasPermission,
    hasRole,
    canAccessRoute,
    can,
    // Branch permissions
    canViewBranch: isAdmin || hasPermission('branch.view') || hasPermission('branch.manage'),
    canCreateBranch: isAdmin || hasPermission('branch.create'),
    canEditBranch: isAdmin || hasPermission('branch.manage') || hasPermission('branch.update') || hasPermission('branch.edit'),
    canDeleteBranch: isAdmin || hasPermission('branch.delete'),
    // Customer permissions
    canViewCustomer: isAdmin || hasPermission('customer.view') || hasPermission('customer.manage'),
    canCreateCustomer: isAdmin || hasPermission('customer.create'),
    canEditCustomer: isAdmin || hasPermission('customer.manage') || hasPermission('customer.update'),
    canDeleteCustomer: isAdmin || hasPermission('customer.delete'),
    // Fleet & Vehicle permissions
    canViewFleet: isAdmin || hasPermission('vehicle.view') || hasPermission('vehicle.manage'),
    canCreateVehicle: isAdmin || hasPermission('vehicle.create'),
    canEditVehicle: isAdmin || hasPermission('vehicle.manage'),
    canDeleteVehicle: isAdmin || hasPermission('vehicle.delete'),
    canManageDriver: isAdmin || hasPermission('driver.manage'),
    // Booking permissions
    canViewBooking: isAdmin || hasPermission('booking.view'),
    canCreateBooking: isAdmin || hasPermission('booking.create'),
    canEditBooking: isAdmin || hasPermission('booking.update') || hasPermission('consignment.update'),
    canDeleteBooking: isAdmin || hasPermission('booking.delete') || hasPermission('booking.cancel'),
    // Dispatch permissions
    canViewDispatch: isAdmin || hasPermission('dispatch.view') || hasPermission('dispatch.manage'),
    canCreateDispatch: isAdmin || hasPermission('dispatch.create'),
    canEditDispatch: isAdmin || hasPermission('dispatch.manage'),
    canDeleteDispatch: isAdmin || hasPermission('dispatch.delete'),
    canApproveDispatch: isAdmin || hasPermission('dispatch.approve'),
    // Trip permissions
    canViewTrip: isAdmin || hasPermission('trip.view') || hasPermission('trip.manage'),
    canCreateTrip: isAdmin || hasPermission('trip.create'),
    canEditTrip: isAdmin || hasPermission('trip.manage'),
    canDeleteTrip: isAdmin || hasPermission('trip.delete'),
    canSettleTrip: isAdmin || hasPermission('trip.settle') || hasPermission('trip.manage') || isBranchManager,
    // Invoice permissions
    canViewInvoice: isAdmin || hasPermission('invoice.view'),
    canCreateInvoice: isAdmin || hasPermission('invoice.create'),
    canEditInvoice: isAdmin || hasPermission('invoice.update'),
    canDeleteInvoice: isAdmin || hasPermission('invoice.delete'),
    canCreatePayment: isAdmin || hasPermission('payment.create'),
    // Expense permissions
    canViewExpense: isAdmin || hasPermission('expense.view'),
    canCreateExpense: isAdmin || hasPermission('expense.create'),
    canEditExpense: isAdmin || hasPermission('expense.update'),
    canDeleteExpense: isAdmin || hasPermission('expense.delete'),
    canApproveExpense: isAdmin || hasPermission('expense.approve'),
    // Delivery & POD permissions
    canViewDelivery: isAdmin || hasPermission('delivery.view') || hasPermission('delivery.manage'),
    canCreateDelivery: isAdmin || hasPermission('delivery.create'),
    canEditDelivery: isAdmin || hasPermission('delivery.manage') || hasPermission('consignment.update'),
    canDeleteDelivery: isAdmin || hasPermission('delivery.delete'),
    canVerifyPod: isAdmin || hasPermission('pod.verify'),
    canUploadPod: isAdmin || hasPermission('pod.upload'),
    // Reports permissions
    canViewReport: isAdmin || hasPermission('reports.view'),
    canCreateReport: isAdmin || hasPermission('reports.create'),
    // Administration & Audit permissions
    canManageRoles: isAdmin || hasPermission('role.manage'),
    canManageUsers: isAdmin || hasPermission('role.manage') || hasPermission('settings.manage') || hasPermission('user.manage'),
    canManageSettings: isAdmin || hasPermission('settings.manage') || hasPermission('role.manage'),
    isAuditor,
    canViewAudit: isAdmin || isAuditor || hasPermission('audit.view'),
    canExportAudit: isAdmin || isAuditor || hasPermission('audit.export') || hasPermission('data.export'),
    // Generic action shortcuts
    canExport: isAdmin || hasPermission('data.export') || hasPermission('reports.export') || hasPermission('booking.export') || hasPermission('customer.export') || hasPermission('vehicle.export') || hasPermission('invoice.export') || hasPermission('expense.export'),
    canEdit: isAdmin || hasPermission('booking.update') || hasPermission('consignment.update'),
    canDelete: isAdmin || hasPermission('booking.cancel') || hasPermission('booking.delete'),
    canCreate: isAdmin || hasPermission('booking.create'),
  };
}
