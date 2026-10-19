// src/config/constants.js

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TRANSPORT_OWNER: 'ADMIN', // Canonical alias: Transport Owner is Admin everywhere
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  BRANCH_ASSISTANT: 'BRANCH_ASSISTANT',
  BUSINESS_ASSOCIATE: 'BUSINESS_ASSOCIATE',
  AUDITOR: 'AUDITOR',
  BOOKING_OPERATOR: 'BOOKING_OPERATOR',
  DISPATCH_OPERATOR: 'DISPATCH_OPERATOR',
  DELIVERY_OPERATOR: 'DELIVERY_OPERATOR',
  ACCOUNTANT: 'ACCOUNTANT',
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
  CUSTOMER: 'CUSTOMER',
};

const PERMISSIONS = {
  // Booking & Consignment
  BOOKING_VIEW: 'booking.view',
  BOOKING_CREATE: 'booking.create',
  BOOKING_UPDATE: 'booking.update',
  BOOKING_CANCEL: 'booking.cancel',
  CONSIGNMENT_VIEW: 'consignment.view',
  CONSIGNMENT_UPDATE: 'consignment.update',
  
  // Dispatch & Trips
  DISPATCH_CREATE: 'dispatch.create',
  DISPATCH_MANAGE: 'dispatch.manage',
  TRIP_CREATE: 'trip.create',
  TRIP_MANAGE: 'trip.manage',
  TRIP_SETTLE: 'trip.settle',

  // Delivery & POD
  DELIVERY_MANAGE: 'delivery.manage',
  POD_UPLOAD: 'pod.upload',
  POD_VERIFY: 'pod.verify',

  // Fleet & Drivers
  VEHICLE_VIEW: 'vehicle.view',
  VEHICLE_MANAGE: 'vehicle.manage',
  DRIVER_MANAGE: 'driver.manage',
  VENDOR_MANAGE: 'vendor.manage',

  // Financials & Invoices
  EXPENSE_VIEW: 'expense.view',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_APPROVE: 'expense.approve',
  INVOICE_VIEW: 'invoice.view',
  INVOICE_CREATE: 'invoice.create',
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_CREATE: 'payment.create',

  // Reports, Branches, Org
  REPORTS_VIEW: 'reports.view',
  BRANCH_MANAGE: 'branch.manage',
  ORGANIZATION_MANAGE: 'organization.manage',
  SETTINGS_MANAGE: 'settings.manage',

  // Report Registers & Tabs
  REPORTS_DOCKETS_VIEW: 'reports.dockets.view',
  REPORTS_DOCKETS_EXPORT: 'reports.dockets.export',
  REPORTS_POD_VIEW: 'reports.pod.view',
  REPORTS_POD_EXPORT: 'reports.pod.export',
  REPORTS_COLLECTIONS_VIEW: 'reports.collections.view',
  REPORTS_COLLECTIONS_EXPORT: 'reports.collections.export',
  REPORTS_AGEING_VIEW: 'reports.ageing.view',
  REPORTS_AGEING_EXPORT: 'reports.ageing.export',
  REPORTS_TRIPS_PNL_VIEW: 'reports.trips_pnl.view',
  REPORTS_TRIPS_PNL_EXPORT: 'reports.trips_pnl.export',
  REPORTS_GST_VIEW: 'reports.gst.view',
  REPORTS_GST_EXPORT: 'reports.gst.export',

  // Audit & Security Logs
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',
};

const CONSIGNMENT_STATUSES = {
  BOOKED: 'BOOKED',
  MATERIAL_RECEIVED: 'MATERIAL_RECEIVED',
  READY_FOR_DISPATCH: 'READY_FOR_DISPATCH',
  LOADED: 'LOADED',
  DISPATCHED: 'DISPATCHED',
  IN_TRANSIT: 'IN_TRANSIT',
  REACHED_DESTINATION: 'REACHED_DESTINATION',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  POD_PENDING: 'POD_PENDING',
  POD_UPLOADED: 'POD_UPLOADED',
  COMPLETED: 'COMPLETED',
  // Exceptions
  DELAYED: 'DELAYED',
  DAMAGED: 'DAMAGED',
  SHORT_MATERIAL: 'SHORT_MATERIAL',
  HOLD: 'HOLD',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED',
};

const PAYMENT_TYPES = {
  PAID: 'PAID',
  TO_PAY: 'TO_PAY',
  TBB: 'TBB',         // To Be Billed
  CREDIT: 'CREDIT',
  FOC: 'FOC',         // Free Of Cost
};

const TERMINOLOGY_OPTIONS = {
  BILTY: 'Bilty',
  LR: 'LR',
  GR: 'GR',
  DOCKET: 'Docket',
  CONSIGNMENT_NOTE: 'Consignment Note',
  CUSTOM: 'Custom',
};

const VEHICLE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  ON_TRIP: 'ON_TRIP',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE: 'INACTIVE',
};

const TRIP_STATUS = {
  PLANNED: 'PLANNED',
  READY: 'READY',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  GENERATED: 'GENERATED',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
};

module.exports = {
  ROLES,
  PERMISSIONS,
  CONSIGNMENT_STATUSES,
  PAYMENT_TYPES,
  TERMINOLOGY_OPTIONS,
  VEHICLE_STATUS,
  TRIP_STATUS,
  INVOICE_STATUS,
};
