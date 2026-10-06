// src/middleware/auditLogger.js
const { AuditLog } = require('../models');

/**
 * Helper to record audit trails
 */
const logAudit = async ({
  req,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
}) => {
  try {
    await AuditLog.create({
      tenant_id: req?.tenant?.tenantId || req?.user?.tenant_id || null,
      organization_id: req?.tenant?.organizationId || req?.user?.organization_id || null,
      branch_id: req?.branchId || req?.user?.branch_id || null,
      user_id: req?.user?.id || null,
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      old_values: oldValues,
      new_values: newValues,
      ip_address: req?.ip || req?.connection?.remoteAddress || null,
      user_agent: req?.headers ? req.headers['user-agent'] : null,
    });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
};

module.exports = {
  logAudit,
};
