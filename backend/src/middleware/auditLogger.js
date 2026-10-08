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

    const targetSequelize = req?.tenantSequelize || AuditLogModel.sequelize || defaultModels.sequelize;
    if (targetSequelize) {
      await targetSequelize.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          tenant_id VARCHAR(36) NULL,
          organization_id VARCHAR(36) NULL,
          branch_id VARCHAR(36) NULL,
          user_id VARCHAR(36) NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100) NOT NULL,
          old_values JSON NULL,
          new_values JSON NULL,
          ip_address VARCHAR(45) NULL,
          user_agent VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at DATETIME NULL,
          INDEX idx_audit_tenant_org (tenant_id, organization_id),
          INDEX idx_audit_entity (entity_type, entity_id),
          INDEX idx_audit_user (user_id),
          INDEX idx_audit_action (action)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `).catch(() => {});
    }

    const payload = {
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
    };

    await AuditLogModel.create(payload);

    // Also persist to master AuditLog if available and separate
    if (defaultModels.AuditLog && AuditLogModel !== defaultModels.AuditLog) {
      defaultModels.AuditLog.create(payload).catch(() => {});
    }
  } catch (error) {
    console.warn('⚠️ Audit log write warning:', error.message);
  }
};

module.exports = {
  logAudit,
};

