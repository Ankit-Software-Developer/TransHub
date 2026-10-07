// src/controllers/roleController.js
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ROLES, PERMISSIONS } = require('../config/constants');
const { Op } = require('sequelize');

// Comprehensive page-to-permission mapping dictionary
const MODULE_PERMISSIONS_DEF = [
  // 1. Dockets / Bookings
  { code: 'booking.view', module: 'Bookings & Dockets', action: 'view', description: 'View dockets, LR, and booking register' },
  { code: 'booking.create', module: 'Bookings & Dockets', action: 'create', description: 'Create and issue new consignments' },
  { code: 'booking.update', module: 'Bookings & Dockets', action: 'edit', description: 'Edit freight rates, goods description, and party names' },
  { code: 'booking.delete', module: 'Bookings & Dockets', action: 'delete', description: 'Cancel and void consignment notes' },
  { code: 'consignment.update', module: 'Bookings & Dockets', action: 'approve', description: 'Update consignment milestones & delivery status' },
  { code: 'booking.export', module: 'Bookings & Dockets', action: 'export', description: 'Export consignment data to Excel / CSV' },

  // 2. Branches & Hubs
  { code: 'branch.view', module: 'Branches & Hubs', action: 'view', description: 'View branch godowns and logistics hub directory' },
  { code: 'branch.create', module: 'Branches & Hubs', action: 'create', description: 'Register new branch office or sorting hub' },
  { code: 'branch.manage', module: 'Branches & Hubs', action: 'edit', description: 'Modify hub parameters, pincodes, and contacts' },
  { code: 'branch.delete', module: 'Branches & Hubs', action: 'delete', description: 'Deactivate or remove branch station' },

  // 3. Customers (CRM)
  { code: 'customer.view', module: 'Customers (CRM)', action: 'view', description: 'View registered consignors and consignees' },
  { code: 'customer.create', module: 'Customers (CRM)', action: 'create', description: 'Add new client, consignor, or receiver account' },
  { code: 'customer.manage', module: 'Customers (CRM)', action: 'edit', description: 'Update credit terms, GSTIN, and billing address' },
  { code: 'customer.delete', module: 'Customers (CRM)', action: 'delete', description: 'Deactivate customer account' },
  { code: 'customer.export', module: 'Customers (CRM)', action: 'export', description: 'Export customer accounts to Excel' },

  // 4. Fleet & Vehicles
  { code: 'vehicle.view', module: 'Fleet & Vehicles', action: 'view', description: 'View vehicle inventory, location, and status' },
  { code: 'vehicle.create', module: 'Fleet & Vehicles', action: 'create', description: 'Register new line-haul truck or delivery van' },
  { code: 'vehicle.manage', module: 'Fleet & Vehicles', action: 'edit', description: 'Update RC documents, fitness, and insurance' },
  { code: 'vehicle.delete', module: 'Fleet & Vehicles', action: 'delete', description: 'Retire or decommission transport vehicle' },
  { code: 'driver.manage', module: 'Fleet & Vehicles', action: 'approve', description: 'Verify driver credentials and allocate trucks' },
  { code: 'vehicle.export', module: 'Fleet & Vehicles', action: 'export', description: 'Export fleet compliance records' },

  // 5. Dispatches & Manifests
  { code: 'dispatch.view', module: 'Dispatches & Manifests', action: 'view', description: 'View vehicle loading manifests and departure logs' },
  { code: 'dispatch.create', module: 'Dispatches & Manifests', action: 'create', description: 'Create vehicle loading manifests' },
  { code: 'dispatch.manage', module: 'Dispatches & Manifests', action: 'edit', description: 'Modify dispatched consignment groupings' },
  { code: 'dispatch.delete', module: 'Dispatches & Manifests', action: 'delete', description: 'Cancel and void truck loading manifest' },
  { code: 'dispatch.approve', module: 'Dispatches & Manifests', action: 'approve', description: 'Authorize gate pass and highway departure' },
  { code: 'dispatch.export', module: 'Dispatches & Manifests', action: 'export', description: 'Export manifest summary and load sheets' },

  // 6. Trips & Operations
  { code: 'trip.view', module: 'Trips & Operations', action: 'view', description: 'Monitor live trips and highway radar' },
  { code: 'trip.create', module: 'Trips & Operations', action: 'create', description: 'Generate trip sheets with driver advances' },
  { code: 'trip.manage', module: 'Trips & Operations', action: 'edit', description: 'Update route waypoints and en-route status' },
  { code: 'trip.delete', module: 'Trips & Operations', action: 'delete', description: 'Cancel trip assignment' },
  { code: 'trip.settle', module: 'Trips & Operations', action: 'approve', description: 'Authorize diesel, toll, and trip settlement' },

  // 7. Deliveries & POD
  { code: 'delivery.view', module: 'Deliveries & POD', action: 'view', description: 'View local delivery runs and destination docks' },
  { code: 'delivery.create', module: 'Deliveries & POD', action: 'create', description: 'Generate delivery run sheets and gate passes' },
  { code: 'delivery.manage', module: 'Deliveries & POD', action: 'edit', description: 'Update delivery attempts and exception remarks' },
  { code: 'delivery.delete', module: 'Deliveries & POD', action: 'delete', description: 'Cancel delivery run sheet' },
  { code: 'pod.verify', module: 'Deliveries & POD', action: 'approve', description: 'Approve and stamp verified digital PODs' },
  { code: 'pod.upload', module: 'Deliveries & POD', action: 'import', description: 'Upload signed Proof of Delivery (POD) scans' },

  // 8. Invoices & Billing
  { code: 'invoice.view', module: 'Invoices & Billing', action: 'view', description: 'View customer freight bills and GST invoices' },
  { code: 'invoice.create', module: 'Invoices & Billing', action: 'create', description: 'Generate tax invoices with freight add-ons' },
  { code: 'invoice.update', module: 'Invoices & Billing', action: 'edit', description: 'Adjust line items and billing discounts' },
  { code: 'invoice.delete', module: 'Invoices & Billing', action: 'delete', description: 'Void freight invoice or issue credit note' },
  { code: 'payment.create', module: 'Invoices & Billing', action: 'approve', description: 'Record payment collections (NEFT, Cash, Cheque)' },
  { code: 'invoice.export', module: 'Invoices & Billing', action: 'export', description: 'Export invoice register for GST / Tally' },

  // 9. Expenses & Financials
  { code: 'expense.view', module: 'Expenses & Financials', action: 'view', description: 'View trip diesel, tolls, and maintenance entries' },
  { code: 'expense.create', module: 'Expenses & Financials', action: 'create', description: 'Submit branch petty cash and en-route vouchers' },
  { code: 'expense.update', module: 'Expenses & Financials', action: 'edit', description: 'Modify expense amounts and uploaded receipts' },
  { code: 'expense.delete', module: 'Expenses & Financials', action: 'delete', description: 'Reject and void expense claim' },
  { code: 'expense.approve', module: 'Expenses & Financials', action: 'approve', description: 'Authorize and disburse expense cash vouchers' },
  { code: 'expense.export', module: 'Expenses & Financials', action: 'export', description: 'Download expense audit statements' },

  // 10. Analytics & Reports
  { code: 'reports.view', module: 'Analytics & Reports', action: 'view', description: 'View revenue charts, tonnage, and station summaries' },
  { code: 'reports.create', module: 'Analytics & Reports', action: 'create', description: 'Configure custom operational KPI views' },
  { code: 'data.export', module: 'Analytics & Reports', action: 'export', description: 'Download Excel, CSV, and audit datasets' },

  // 11. Settings & Administration
  { code: 'settings.view', module: 'Settings & Administration', action: 'view', description: 'View organization profile and terminology' },
  { code: 'settings.manage', module: 'Settings & Administration', action: 'edit', description: 'Configure branding, password, and terminology' },
  { code: 'role.manage', module: 'Settings & Administration', action: 'approve', description: 'Modify roles and page access matrix' },
];

// Helper to seed permissions in DB if missing
const ensurePermissions = async (Permission) => {
  if (!Permission) return [];
  for (const def of MODULE_PERMISSIONS_DEF) {
    await Permission.findOrCreate({
      where: { code: def.code },
      defaults: {
        code: def.code,
        module: def.module,
        description: def.description,
      },
    });
  }
  return await Permission.findAll({ order: [['module', 'ASC'], ['code', 'ASC']] });
};

// Helper to seed standard roles with sensible defaults
const ensureStandardRoles = async (Role, Permission, RolePermission, tenantId, UserRole) => {
  if (!Role || !Permission) return [];

  // 1. Auto-migrate legacy TRANSPORT_OWNER to canonical ADMIN
  try {
    const legacyRole = await Role.findOne({
      where: {
        [Op.or]: [
          { name: 'TRANSPORT_OWNER' },
          { display_name: 'Transport Owner' },
        ],
      },
    });

    if (legacyRole) {
      const existingAdmin = await Role.findOne({ where: { name: 'ADMIN' } });
      if (!existingAdmin) {
        await legacyRole.update({
          name: 'ADMIN',
          display_name: 'Admin',
          description: 'Tenant administrator with full access to tenant features',
          is_system: true,
        });
      } else if (existingAdmin.id !== legacyRole.id) {
        if (RolePermission) {
          await RolePermission.update(
            { role_id: existingAdmin.id },
            { where: { role_id: legacyRole.id } }
          ).catch(() => {});
        }
        await legacyRole.destroy().catch(() => {});
      }
    }
  } catch (mErr) {
    console.warn('Role migration check warning:', mErr.message);
  }

  // 2. Define strictly ADMIN as the only core System Role
  const allPerms = await ensurePermissions(Permission);
  const permMap = {};
  allPerms.forEach((p) => { permMap[p.code] = p; });

  const roleDefinitions = [
    {
      name: 'ADMIN',
      display_name: 'Admin',
      description: 'Tenant administrator with full access to tenant features',
      is_system: true,
      perms: Object.keys(permMap),
    },
  ];

  // 3. Demote active roles to Custom and remove unused system roles
  try {
    const extraRoles = await Role.findAll({
      where: {
        name: { [Op.ne]: 'ADMIN' },
      },
    });

    const legacyPreseededNames = [
      'BOOKING_OPERATOR',
      'DISPATCH_OPERATOR',
      'FLEET_MANAGER',
      'ACCOUNTANT',
      'DRIVER',
      'DELIVERY_OPERATOR',
    ];

    for (const extraRole of extraRoles) {
      let assignedCount = 0;
      if (UserRole) {
        assignedCount = await UserRole.count({ where: { role_id: extraRole.id } }).catch(() => 0);
      }

      const isSys = Boolean(extraRole.is_system);
      const isLegacyPreseeded = legacyPreseededNames.includes((extraRole.name || '').toUpperCase());

      if (assignedCount > 0) {
        // In use by staff: convert to Custom role so user account is preserved and can be managed
        if (isSys) {
          await extraRole.update({ is_system: false });
        }
      } else if (isSys || isLegacyPreseeded) {
        // Unused pre-seeded system role: remove from tenant DB
        if (RolePermission) {
          await RolePermission.destroy({ where: { role_id: extraRole.id } }).catch(() => {});
        }
        await extraRole.destroy().catch(() => {});
      }
    }
  } catch (cleanErr) {
    console.warn('Role cleanup notice:', cleanErr.message);
  }

  for (const rDef of roleDefinitions) {
    const [role, created] = await Role.findOrCreate({
      where: { name: rDef.name },
      defaults: {
        name: rDef.name,
        display_name: rDef.display_name,
        description: rDef.description,
        is_system: rDef.is_system,
        tenant_id: tenantId,
      },
    });

    // If existing ADMIN, ensure display_name is Admin and has all permissions
    if (!created && rDef.name === 'ADMIN') {
      if (role.display_name !== 'Admin' || !role.is_system) {
        await role.update({ display_name: 'Admin', is_system: true });
      }
      const existingPerms = await role.getPermissions?.();
      if (!existingPerms || existingPerms.length === 0) {
        const matchedPerms = rDef.perms.map((code) => permMap[code]).filter(Boolean);
        if (role.setPermissions) {
          await role.setPermissions(matchedPerms);
        } else if (RolePermission) {
          for (const p of matchedPerms) {
            await RolePermission.create({ role_id: role.id, permission_id: p.id }).catch(() => {});
          }
        }
      }
    } else if (created) {
      const matchedPerms = rDef.perms.map((code) => permMap[code]).filter(Boolean);
      if (role.setPermissions) {
        await role.setPermissions(matchedPerms);
      } else if (RolePermission) {
        for (const p of matchedPerms) {
          await RolePermission.create({ role_id: role.id, permission_id: p.id }).catch(() => {});
        }
      }
    }
  }
};

const listRoles = async (req, res) => {
  try {
    const { Role, Permission, RolePermission, UserRole } = req.tenantDb || defaultModels;
    if (!Role) return errorResponse(res, 'Role model unavailable', null, 500);

    const tenantId = req.tenant?.tenantId;
    await ensurePermissions(Permission);
    await ensureStandardRoles(Role, Permission, RolePermission, tenantId, UserRole);

    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'code', 'module', 'description'],
          through: { attributes: [] },
        },
      ],
      order: [
        ['is_system', 'DESC'],
        ['name', 'ASC'],
      ],
    });

    // Format roles with permissions list for convenient UI consumption
    const formatted = roles.map((r) => {
      const perms = r.permissions || [];
      return {
        id: r.id,
        name: r.name,
        display_name: r.display_name || r.name,
        description: r.description || '',
        is_system: Boolean(r.is_system),
        permissionCodes: perms.map((p) => p.code),
        permissions: perms,
      };
    });

    return successResponse(res, 'Roles fetched successfully', formatted);
  } catch (err) {
    console.error('Error fetching roles:', err);
    return errorResponse(res, err.message, null, 500);
  }
};

const listPermissions = async (req, res) => {
  try {
    const { Permission } = req.tenantDb || defaultModels;
    const allPerms = await ensurePermissions(Permission);

    // Group permissions by module
    const grouped = {};
    for (const p of allPerms) {
      const mod = p.module || 'General';
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push({
        id: p.id,
        code: p.code,
        module: p.module,
        description: p.description,
      });
    }

    return successResponse(res, 'Permissions fetched successfully', {
      raw: allPerms,
      grouped,
      definitions: MODULE_PERMISSIONS_DEF,
    });
  } catch (err) {
    console.error('Error fetching permissions:', err);
    return errorResponse(res, err.message, null, 500);
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { Role, Permission, RolePermission } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const requestedCodes = req.body.permissions || req.body.permissionCodes;

    if (!Array.isArray(requestedCodes)) {
      return errorResponse(res, 'Permissions must be provided as an array of codes', null, 400);
    }

    const role = await Role.findByPk(id);
    if (!role) {
      return errorResponse(res, 'Role not found', null, 404);
    }

    // Resolve permission records
    const permissionRecords = await Permission.findAll({
      where: {
        code: { [Op.in]: requestedCodes },
      },
    });

    if (role.setPermissions) {
      await role.setPermissions(permissionRecords);
    } else if (RolePermission) {
      await RolePermission.destroy({ where: { role_id: role.id } });
      for (const p of permissionRecords) {
        await RolePermission.create({ role_id: role.id, permission_id: p.id });
      }
    }

    // Fetch updated role with permissions
    const updated = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'code', 'module', 'description'],
          through: { attributes: [] },
        },
      ],
    });

    const perms = updated.permissions || [];
    return successResponse(res, `Permissions for "${role.display_name}" updated successfully`, {
      id: updated.id,
      name: updated.name,
      display_name: updated.display_name,
      permissionCodes: perms.map((p) => p.code),
      permissions: perms,
    });
  } catch (err) {
    console.error('Error updating role permissions:', err);
    return errorResponse(res, err.message, null, 500);
  }
};

const createRole = async (req, res) => {
  try {
    const { Role, Permission, RolePermission } = req.tenantDb || defaultModels;
    const { name, display_name, description, permissions: requestedCodes = [] } = req.body;

    if (!display_name || !display_name.trim()) {
      return errorResponse(res, 'Role Display Name is required', null, 400);
    }

    const normalizedName = (name || display_name)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');

    const existing = await Role.findOne({ where: { name: normalizedName } });
    if (existing) {
      return errorResponse(res, `A role named "${normalizedName}" already exists.`, null, 400);
    }

    const role = await Role.create({
      name: normalizedName,
      display_name: display_name.trim(),
      description: description || `Custom ${display_name.trim()} role`,
      is_system: false,
      tenant_id: req.tenant?.tenantId,
    });

    if (Array.isArray(requestedCodes) && requestedCodes.length > 0) {
      const permissionRecords = await Permission.findAll({
        where: { code: { [Op.in]: requestedCodes } },
      });
      if (role.setPermissions) {
        await role.setPermissions(permissionRecords);
      } else if (RolePermission) {
        for (const p of permissionRecords) {
          await RolePermission.create({ role_id: role.id, permission_id: p.id });
        }
      }
    }

    const created = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'code', 'module', 'description'],
          through: { attributes: [] },
        },
      ],
    });

    const perms = created.permissions || [];
    return successResponse(res, `Role "${role.display_name}" created successfully`, {
      id: created.id,
      name: created.name,
      display_name: created.display_name,
      description: created.description,
      is_system: false,
      permissionCodes: perms.map((p) => p.code),
      permissions: perms,
    }, 201);
  } catch (err) {
    console.error('Error creating custom role:', err);
    return errorResponse(res, err.message, null, 500);
  }
};

const updateRole = async (req, res) => {
  try {
    const { Role } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const { display_name, description } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      return errorResponse(res, 'Role not found', null, 404);
    }

    if (display_name && display_name.trim()) {
      role.display_name = display_name.trim();
    }
    if (description !== undefined) {
      role.description = description;
    }
    await role.save();

    return successResponse(res, `Role "${role.display_name}" updated successfully`, role);
  } catch (err) {
    console.error('Error updating role:', err);
    return errorResponse(res, err.message, null, 500);
  }
};

const deleteRole = async (req, res) => {
  try {
    const { Role, RolePermission, UserRole } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      return errorResponse(res, 'Role not found', null, 404);
    }

    if (role.is_system) {
      return errorResponse(res, 'System roles cannot be deleted. You can customize their permissions instead.', null, 400);
    }

    if (RolePermission) {
      await RolePermission.destroy({ where: { role_id: role.id } });
    }
    if (UserRole) {
      await UserRole.destroy({ where: { role_id: role.id } });
    }
    await role.destroy();

    return successResponse(res, `Custom role "${role.display_name}" deleted successfully`);
  } catch (err) {
    console.error('Error deleting role:', err);
    return errorResponse(res, err.message, null, 500);
  }
};

module.exports = {
  listRoles,
  listPermissions,
  updateRolePermissions,
  createRole,
  updateRole,
  deleteRole,
  MODULE_PERMISSIONS_DEF,
};

