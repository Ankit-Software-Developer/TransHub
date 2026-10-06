// src/config/constants.js

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TRANSPORT_OWNER: 'TRANSPORT_OWNER',
  ADMIN: 'ADMIN',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
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
