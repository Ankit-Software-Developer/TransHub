// src/models/index.js
const { sequelize } = require('../config/database');

// Import model definitions
const defineTenant = require('./Tenant');
const defineOrganization = require('./Organization');
const defineBranch = require('./Branch');
const defineUser = require('./User');
const defineTenantStaff = require('./TenantStaff');
const defineRole = require('./Role');
const definePermission = require('./Permission');
const defineUserRole = require('./UserRole');
const defineRolePermission = require('./RolePermission');
const defineRefreshToken = require('./RefreshToken');
const defineNumberSequence = require('./NumberSequence');
const defineCustomer = require('./Customer');
const defineCustomerAddress = require('./CustomerAddress');
const defineRateContract = require('./RateContract');
const defineVehicle = require('./Vehicle');
const defineDriver = require('./Driver');
const defineVendor = require('./Vendor');
const defineBooking = require('./Booking');
const defineConsignment = require('./Consignment');
const defineConsignmentItem = require('./ConsignmentItem');
const defineConsignmentStatusHistory = require('./ConsignmentStatusHistory');
const defineTrip = require('./Trip');
const defineTripConsignment = require('./TripConsignment');
const defineDispatch = require('./Dispatch');
const defineDeliveryRecord = require('./DeliveryRecord');
const definePod = require('./Pod');
const defineWarehouse = require('./Warehouse');
const defineWarehouseMovement = require('./WarehouseMovement');
const defineInvoice = require('./Invoice');
const defineInvoiceItem = require('./InvoiceItem');
const definePayment = require('./Payment');
const defineCustomerLedger = require('./CustomerLedger');
const defineExpenseCategory = require('./ExpenseCategory');
const defineExpense = require('./Expense');
const defineDriverAdvance = require('./DriverAdvance');
const defineTripSettlement = require('./TripSettlement');
const defineFuelEntry = require('./FuelEntry');
const defineVehicleMaintenance = require('./VehicleMaintenance');
const defineClaim = require('./Claim');
const defineNotification = require('./Notification');
const defineAuditLog = require('./AuditLog');
const defineSaaSPlan = require('./SaaSPlan');
const defineSaaSSubscription = require('./SaaSSubscription');
const defineDailyBrief = require('./DailyBrief');
const defineApprovalRequest = require('./ApprovalRequest');
const defineGpsIntegration = require('./GpsIntegration');

/**
 * Initializes and associates strictly Master Database models (12 tables)
 * Master DB: transporter_master
 * Tables: tenants, organizations, users, roles, permissions, user_roles,
 *         role_permissions, refresh_tokens, saas_plans, saas_subscriptions, payments, audit_logs
 */
const initMasterModels = (targetSequelize) => {
  const m = {
    Tenant: defineTenant(targetSequelize),
    Organization: defineOrganization(targetSequelize),
    User: defineUser(targetSequelize),
    Role: defineRole(targetSequelize),
    Permission: definePermission(targetSequelize),
    UserRole: defineUserRole(targetSequelize),
    RolePermission: defineRolePermission(targetSequelize),
    RefreshToken: defineRefreshToken(targetSequelize),
    SaaSPlan: defineSaaSPlan(targetSequelize),
    SaaSSubscription: defineSaaSSubscription(targetSequelize),
    Payment: definePayment(targetSequelize),
    AuditLog: defineAuditLog(targetSequelize),
  };

  const {
    Tenant, Organization, User, Role, Permission, UserRole, RolePermission,
    RefreshToken, SaaSPlan, SaaSSubscription, Payment
  } = m;

  // Tenant & Organization
  Tenant.hasMany(Organization, { foreignKey: 'tenant_id', as: 'organizations' });
  Organization.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

  // Organization & User
  Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
  User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  // Users & Roles
  User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', as: 'roles' });
  Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', as: 'users' });

  // Roles & Permissions
  Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', as: 'permissions' });
  Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', as: 'roles' });

  // User & RefreshToken
  User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
  RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // SaaS Subscriptions & Plans
  Organization.hasOne(SaaSSubscription, { foreignKey: 'organization_id', as: 'subscription' });
  SaaSSubscription.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  SaaSSubscription.belongsTo(SaaSPlan, { foreignKey: 'plan_id', as: 'plan' });

  // Payments
  Organization.hasMany(Payment, { foreignKey: 'organization_id', as: 'payments' });
  Payment.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  // Audit Logs
  if (m.AuditLog) {
    m.AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'performer' });
    User.hasMany(m.AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
    m.AuditLog.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  }

  return m;
};

/**
 * Initializes and associates strictly Tenant Operational models (39 tables)
 * Excludes Master-only tables: Tenant, SaaSPlan, SaaSSubscription, RefreshToken
 */
const initTenantModels = (targetSequelize) => {
  const tenantStaffModel = defineTenantStaff(targetSequelize);
  const m = {
    Organization: defineOrganization(targetSequelize),
    Branch: defineBranch(targetSequelize),
    User: tenantStaffModel,
    Staff: tenantStaffModel,
    Role: defineRole(targetSequelize),
    Permission: definePermission(targetSequelize),
    UserRole: defineUserRole(targetSequelize),
    RolePermission: defineRolePermission(targetSequelize),
    NumberSequence: defineNumberSequence(targetSequelize),
    Customer: defineCustomer(targetSequelize),
    CustomerAddress: defineCustomerAddress(targetSequelize),
    RateContract: defineRateContract(targetSequelize),
    Vehicle: defineVehicle(targetSequelize),
    Driver: defineDriver(targetSequelize),
    Vendor: defineVendor(targetSequelize),
    Booking: defineBooking(targetSequelize),
    Consignment: defineConsignment(targetSequelize),
    ConsignmentItem: defineConsignmentItem(targetSequelize),
    ConsignmentStatusHistory: defineConsignmentStatusHistory(targetSequelize),
    Trip: defineTrip(targetSequelize),
    TripConsignment: defineTripConsignment(targetSequelize),
    Dispatch: defineDispatch(targetSequelize),
    DeliveryRecord: defineDeliveryRecord(targetSequelize),
    Pod: definePod(targetSequelize),
    Warehouse: defineWarehouse(targetSequelize),
    WarehouseMovement: defineWarehouseMovement(targetSequelize),
    Invoice: defineInvoice(targetSequelize),
    InvoiceItem: defineInvoiceItem(targetSequelize),
    Payment: definePayment(targetSequelize),
    CustomerLedger: defineCustomerLedger(targetSequelize),
    ExpenseCategory: defineExpenseCategory(targetSequelize),
    Expense: defineExpense(targetSequelize),
    DriverAdvance: defineDriverAdvance(targetSequelize),
    TripSettlement: defineTripSettlement(targetSequelize),
    FuelEntry: defineFuelEntry(targetSequelize),
    VehicleMaintenance: defineVehicleMaintenance(targetSequelize),
    Claim: defineClaim(targetSequelize),
    Notification: defineNotification(targetSequelize),
    AuditLog: defineAuditLog(targetSequelize),
    DailyBrief: defineDailyBrief(targetSequelize),
    ApprovalRequest: defineApprovalRequest(targetSequelize),
    GpsIntegration: defineGpsIntegration(targetSequelize),
  };

  const {
    Organization, Branch, User, Role, Permission, UserRole, RolePermission,
    Customer, CustomerAddress, RateContract, Vehicle, Driver, Vendor,
    Booking, Consignment, ConsignmentItem, ConsignmentStatusHistory, Trip, TripConsignment,
    Dispatch, DeliveryRecord, Pod, Warehouse, WarehouseMovement, Invoice, InvoiceItem,
    Payment, CustomerLedger, Expense, ExpenseCategory, DriverAdvance, TripSettlement,
    FuelEntry, VehicleMaintenance, Claim, ApprovalRequest, GpsIntegration
  } = m;

  Organization.hasMany(GpsIntegration, { foreignKey: 'organization_id', as: 'gpsIntegrations' });
  GpsIntegration.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  Organization.hasMany(Branch, { foreignKey: 'organization_id', as: 'branches' });
  Branch.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
  User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  Branch.hasMany(User, { foreignKey: 'branch_id', constraints: false, as: 'staff' });
  User.belongsTo(Branch, { foreignKey: 'branch_id', constraints: false, as: 'branch' });

  User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', as: 'roles' });
  Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', as: 'users' });

  Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', as: 'permissions' });
  Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', as: 'roles' });

  // Customers & Addresses
  Organization.hasMany(Customer, { foreignKey: 'organization_id', as: 'customers' });
  Customer.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  Customer.hasMany(CustomerAddress, { foreignKey: 'customer_id', as: 'addresses' });
  CustomerAddress.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

  Customer.hasMany(RateContract, { foreignKey: 'customer_id', as: 'rateContracts' });
  RateContract.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

  Customer.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Branch.hasMany(Customer, { foreignKey: 'branch_id', as: 'customers' });

  // Bookings & Consignments
  Organization.hasMany(Booking, { foreignKey: 'organization_id', as: 'bookings' });
  Booking.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  Booking.belongsTo(Branch, { foreignKey: 'branch_id', as: 'originBranch' });
  Booking.belongsTo(Customer, { foreignKey: 'consignor_id', as: 'consignor' });
  Booking.belongsTo(Customer, { foreignKey: 'consignee_id', as: 'consignee' });

  Booking.hasMany(Consignment, { foreignKey: 'booking_id', as: 'consignments' });
  Consignment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

  Consignment.belongsTo(Branch, { foreignKey: 'origin_branch_id', as: 'originBranch' });
  Consignment.belongsTo(Branch, { foreignKey: 'current_branch_id', as: 'currentBranch' });
  Consignment.belongsTo(Branch, { foreignKey: 'dest_branch_id', as: 'destBranch' });
  Consignment.belongsTo(Customer, { foreignKey: 'consignor_id', as: 'consignor' });
  Consignment.belongsTo(Customer, { foreignKey: 'consignee_id', as: 'consignee' });

  Consignment.hasMany(ConsignmentItem, { foreignKey: 'consignment_id', as: 'items' });
  ConsignmentItem.belongsTo(Consignment, { foreignKey: 'consignment_id', as: 'consignment' });

  Consignment.hasMany(ConsignmentStatusHistory, { foreignKey: 'consignment_id', as: 'statusHistory' });
  ConsignmentStatusHistory.belongsTo(Consignment, { foreignKey: 'consignment_id', as: 'consignment' });

  Consignment.hasOne(Pod, { foreignKey: 'consignment_id', as: 'pod' });
  Pod.belongsTo(Consignment, { foreignKey: 'consignment_id', as: 'consignment' });

  Consignment.hasOne(DeliveryRecord, { foreignKey: 'consignment_id', as: 'deliveryRecord' });
  DeliveryRecord.belongsTo(Consignment, { foreignKey: 'consignment_id', as: 'deliveryRecord' });

  // Fleet & Drivers
  Organization.hasMany(Vehicle, { foreignKey: 'organization_id', as: 'vehicles' });
  Vehicle.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  Vehicle.belongsTo(Driver, { foreignKey: 'assigned_driver_id', as: 'assignedDriver' });
  Vehicle.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Branch.hasMany(Vehicle, { foreignKey: 'branch_id', as: 'vehicles' });
  Vehicle.hasMany(Trip, { foreignKey: 'vehicle_id', as: 'trips' });

  Organization.hasMany(Driver, { foreignKey: 'organization_id', as: 'drivers' });
  Driver.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  Driver.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Branch.hasMany(Driver, { foreignKey: 'branch_id', as: 'drivers' });

  // Trips, Dispatches & Load Planning
  Organization.hasMany(Trip, { foreignKey: 'organization_id', as: 'trips' });
  Trip.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  Trip.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
  Trip.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
  Trip.belongsTo(Branch, { foreignKey: 'origin_branch_id', as: 'originBranch' });
  Trip.belongsTo(Branch, { foreignKey: 'dest_branch_id', as: 'destBranch' });

  Trip.belongsToMany(Consignment, { through: TripConsignment, foreignKey: 'trip_id', as: 'consignments' });
  Consignment.belongsToMany(Trip, { through: TripConsignment, foreignKey: 'consignment_id', as: 'trips' });

  Trip.hasMany(Dispatch, { foreignKey: 'trip_id', as: 'dispatches' });
  Dispatch.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

  Trip.hasMany(Expense, { foreignKey: 'trip_id', as: 'expenses' });
  Expense.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
  Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

  Trip.hasMany(DriverAdvance, { foreignKey: 'trip_id', as: 'advances' });
  DriverAdvance.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

  Trip.hasOne(TripSettlement, { foreignKey: 'trip_id', as: 'settlement' });
  TripSettlement.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

  // Invoicing & Ledger
  Organization.hasMany(Invoice, { foreignKey: 'organization_id', as: 'invoices' });
  Invoice.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

  Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
  InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

  Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
  Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

  Customer.hasMany(CustomerLedger, { foreignKey: 'customer_id', as: 'ledgerEntries' });
  CustomerLedger.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

  // Fleet Maintenance & Fuel
  Vehicle.hasMany(FuelEntry, { foreignKey: 'vehicle_id', as: 'fuelEntries' });
  FuelEntry.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

  Vehicle.hasMany(VehicleMaintenance, { foreignKey: 'vehicle_id', as: 'maintenances' });
  VehicleMaintenance.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

  // Approvals & Workflows
  Organization.hasMany(ApprovalRequest, { foreignKey: 'organization_id', as: 'approvalRequests' });
  ApprovalRequest.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

  Branch.hasMany(ApprovalRequest, { foreignKey: 'branch_id', as: 'approvalRequests' });
  ApprovalRequest.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

  User.hasMany(ApprovalRequest, { foreignKey: 'requester_id', as: 'submittedApprovals' });
  ApprovalRequest.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });

  User.hasMany(ApprovalRequest, { foreignKey: 'reviewer_id', as: 'reviewedApprovals' });
  ApprovalRequest.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });

  // Audit Logs
  if (m.AuditLog) {
    m.AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'performer' });
    User.hasMany(m.AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
    m.AuditLog.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
    m.AuditLog.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  }

  return m;
};

// Initialize Master Models on Default Master DB instance
const masterModels = initMasterModels(sequelize);
// Initialize Operational Tenant Models on Default Master DB instance as well
const operationalModels = initTenantModels(sequelize);

module.exports = {
  sequelize,
  initModels: initMasterModels,
  initMasterModels,
  initTenantModels,
  ...operationalModels,
  ...masterModels,
};
