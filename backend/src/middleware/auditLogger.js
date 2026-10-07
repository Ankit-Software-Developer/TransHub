// src/middleware/auditLogger.js
const defaultModels = require('../models');

/**
 * Helper to record audit trails
 */
const logAudit = async ({
  req,
  action,
  entityType,
  entityId,
  entityName = '',
  summary = '',
  oldValues = null,
  newValues = null,
  changes = null,
}) => {
  try {
    const AuditLogModel = req?.tenantDb?.AuditLog || defaultModels.AuditLog;
    if (!AuditLogModel) return;

    const performerName = req?.user?.name || req?.user?.full_name || 'Staff User';
    const performerEmail = req?.user?.email || '';
    const performerRole = (req?.userRoles && req.userRoles[0]) || req?.user?.role || 'Staff';

    // Enrich new_values with structured meta so audit UI can render instant summaries and diffs
    const enrichedNewValues = {
      ...(typeof newValues === 'object' && newValues !== null ? newValues : { payload: newValues }),
      _summary: summary || `${action} on ${entityType} #${entityId}`,
      _entity_name: entityName || String(entityId),
      _performer: {
        id: req?.user?.id || null,
        name: performerName,
        email: performerEmail,
        role: performerRole,
      },
      _changes: changes || null,
    };

    await AuditLogModel.create({
      tenant_id: req?.tenant?.tenantId || req?.user?.tenant_id || null,
      organization_id: req?.tenant?.organizationId || req?.user?.organization_id || null,
      branch_id: req?.branchId || req?.user?.branch_id || null,
      user_id: req?.user?.id || null,
      action: (action || 'UNKNOWN').toUpperCase(),
      entity_type: (entityType || 'GENERAL').toUpperCase(),
      entity_id: String(entityId || 'N/A'),
      old_values: oldValues,
      new_values: enrichedNewValues,
      ip_address: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || null,
      user_agent: req?.headers ? req.headers['user-agent'] : null,
    });
  } catch (error) {
    console.warn('⚠️ Audit log write warning:', error.message);
  }
};

module.exports = {
  logAudit,
};

