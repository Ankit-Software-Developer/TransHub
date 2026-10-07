// src/middleware/tenantResolver.js
const { errorResponse } = require('../utils/apiResponse');
const { Tenant, Organization } = require('../models');
const { getTenantConnection } = require('../services/tenantDbManager');

const tenantResolver = async (req, res, next) => {
  try {
    // If SUPER_ADMIN, tenant may be null or passed via x-tenant-id header for impersonation
    if (req.userRoles && req.userRoles.includes('SUPER_ADMIN')) {
      const headerTenantId = req.headers['x-tenant-id'];
      if (headerTenantId) {
        const tenant = await Tenant.findByPk(headerTenantId);
        const dbName = tenant?.database_name || null;
        const tenantConn = await getTenantConnection(dbName);

        req.tenant = {
          tenantId: headerTenantId,
          organizationId: req.headers['x-organization-id'] || null,
          databaseName: dbName,
          isSuperAdmin: true,
        };
        req.tenantDb = tenantConn.models;
        req.tenantSequelize = tenantConn.sequelize;
      } else {
        req.tenant = {
          isSuperAdmin: true,
        };
      }
      return next();
    }

    // Standard tenant user: must have tenant_id and organization_id on user record
    const tenantId = req.user?.tenant_id;
    const organizationId = req.user?.organization_id;

    if (!tenantId || !organizationId) {
      return errorResponse(res, 'Tenant context missing from user account', null, 403);
    }

    // Check tenant status in Master DB
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return errorResponse(res, 'Tenant organization not found', null, 404);
    }

    if (tenant.status === 'SUSPENDED') {
      return errorResponse(res, 'This transport organization account is suspended. Please contact support.', null, 403);
    }

    // Resolve isolated MySQL database connection for this tenant
    const dbName = req.user?.tenantDbName || tenant.database_name;
    const tenantConn = await getTenantConnection(dbName);

    // Fetch organization info from master or tenant DB
    const org = await Organization.findByPk(organizationId);

    req.tenant = {
      tenantId: tenant.id,
      organizationId: org ? org.id : organizationId,
      organizationName: org ? org.business_name : '',
      documentTerminology: org ? org.document_terminology : 'Bilty',
      databaseName: dbName,
      isSuperAdmin: false,
    };

    // Attach tenant's isolated database models & Sequelize instance to req
    req.tenantDb = tenantConn.models;
    req.tenantSequelize = tenantConn.sequelize;

    // Enrich roles & permissions from tenant DB if user exists in tenant DB
    try {
      if (req.tenantDb?.User && req.user?.id) {
        const tenantStaff = await req.tenantDb.User.findByPk(req.user.id, {
          include: [
            ...(req.tenantDb.Role ? [{
              model: req.tenantDb.Role,
              as: 'roles',
              include: req.tenantDb.Permission ? [{ model: req.tenantDb.Permission, as: 'permissions' }] : [],
            }] : []),
            ...(req.tenantDb.Branch ? [{
              model: req.tenantDb.Branch,
              as: 'branch',
            }] : []),
          ],
        });

        if (tenantStaff && tenantStaff.roles && tenantStaff.roles.length > 0) {
          req.userRoles = tenantStaff.roles.map((r) => r.name);
          const tPerms = new Set(req.userPermissions || []);
          tenantStaff.roles.forEach((r) => {
            (r.permissions || []).forEach((p) => tPerms.add(p.code));
          });
          if (req.userRoles.includes('ADMIN') || req.userRoles.includes('SUPER_ADMIN')) {
            tPerms.add('*');
          }
          req.userPermissions = Array.from(tPerms);
          if (tenantStaff.branch) {
            req.user.branch = tenantStaff.branch;
          }
        }
      }
    } catch (enrichErr) {}

    next();
  } catch (error) {
    return errorResponse(res, 'Error verifying tenant context', error.message, 500);
  }
};

module.exports = tenantResolver;
