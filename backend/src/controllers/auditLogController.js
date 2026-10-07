// src/controllers/auditLogController.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');

/**
 * List paginated audit logs with search and filtering
 */
const listAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      action,
      entity_type,
      user_id,
      branch_id,
      from_date,
      to_date,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query;

    const AuditLog = req.tenantDb?.AuditLog || defaultModels.AuditLog;
    const User = req.tenantDb?.User || defaultModels.User;
    const Branch = req.tenantDb?.Branch || defaultModels.Branch;

    if (!AuditLog) {
      return errorResponse(res, 'Audit log system unavailable', null, 500);
    }

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    if (action && action !== 'ALL') {
      where.action = action.toUpperCase();
    }

    if (entity_type && entity_type !== 'ALL') {
      where.entity_type = entity_type.toUpperCase();
    }

    if (user_id && user_id !== 'ALL') {
      where.user_id = user_id;
    }

    if (branch_id && branch_id !== 'ALL') {
      where.branch_id = branch_id;
    }

    if (from_date && to_date) {
      where.created_at = {
        [Op.between]: [new Date(`${from_date}T00:00:00.000Z`), new Date(`${to_date}T23:59:59.999Z`)],
      };
    } else if (from_date) {
      where.created_at = {
        [Op.gte]: new Date(`${from_date}T00:00:00.000Z`),
      };
    } else if (to_date) {
      where.created_at = {
        [Op.lte]: new Date(`${to_date}T23:59:59.999Z`),
      };
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { action: { [Op.like]: q } },
        { entity_type: { [Op.like]: q } },
        { entity_id: { [Op.like]: q } },
        { ip_address: { [Op.like]: q } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = ['created_at', 'action', 'entity_type'];
    const orderCol = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const orderDir = (sort_order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const include = [];
    if (User) {
      include.push({
        model: User,
        as: 'performer',
        attributes: ['id', 'name', 'email', 'phone'],
        required: false,
      });
    }
    if (Branch) {
      include.push({
        model: Branch,
        as: 'branch',
        attributes: ['id', 'branch_name', 'branch_code', 'city'],
        required: false,
      });
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [[orderCol, orderDir]],
      include,
    });

    const mapped = rows.map((log) => {
      const newVals = log.new_values || {};
      const fallbackPerformer = newVals._performer || {};
      return {
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        entity_name: newVals._entity_name || log.entity_id,
        summary: newVals._summary || `${log.action} on ${log.entity_type} #${log.entity_id}`,
        performer: {
          id: log.performer?.id || log.user_id,
          name: log.performer?.name || fallbackPerformer.name || 'System / Staff',
          email: log.performer?.email || fallbackPerformer.email || '',
          role: fallbackPerformer.role || 'Staff',
        },
        branch: log.branch ? {
          id: log.branch.id,
          name: log.branch.branch_name,
          code: log.branch.branch_code,
          city: log.branch.city,
        } : null,
        old_values: log.old_values,
        new_values: log.new_values,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
      };
    });

    return paginatedResponse(res, 'Audit logs retrieved successfully', mapped, {
      total: count,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(count / limitNum),
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Get audit statistics for the executive dashboard
 */
const getAuditStats = async (req, res) => {
  try {
    const AuditLog = req.tenantDb?.AuditLog || defaultModels.AuditLog;
    if (!AuditLog) {
      return successResponse(res, 'Audit stats', {
        total: 0,
        today: 0,
        deletions: 0,
        updates: 0,
        creates: 0,
      });
    }

    const orgScope = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, today, deletions, updates, creates] = await Promise.all([
      AuditLog.count({ where: orgScope }),
      AuditLog.count({
        where: {
          ...orgScope,
          created_at: { [Op.gte]: startOfToday },
        },
      }),
      AuditLog.count({
        where: {
          ...orgScope,
          action: 'DELETE',
        },
      }),
      AuditLog.count({
        where: {
          ...orgScope,
          action: 'UPDATE',
        },
      }),
      AuditLog.count({
        where: {
          ...orgScope,
          action: 'CREATE',
        },
      }),
    ]);

    return successResponse(res, 'Audit metrics calculated successfully', {
      total,
      today,
      deletions,
      updates,
      creates,
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Get single audit log detail with full before vs after payload
 */
const getAuditLogDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const AuditLog = req.tenantDb?.AuditLog || defaultModels.AuditLog;
    const User = req.tenantDb?.User || defaultModels.User;
    const Branch = req.tenantDb?.Branch || defaultModels.Branch;

    const log = await AuditLog.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
      include: [
        ...(User ? [{ model: User, as: 'performer', attributes: ['id', 'name', 'email', 'phone'] }] : []),
        ...(Branch ? [{ model: Branch, as: 'branch', attributes: ['id', 'branch_name', 'branch_code', 'city'] }] : []),
      ],
    });

    if (!log) {
      return errorResponse(res, 'Audit log entry not found', null, 404);
    }

    const newVals = log.new_values || {};
    const fallbackPerformer = newVals._performer || {};

    return successResponse(res, 'Audit log detail retrieved', {
      id: log.id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      entity_name: newVals._entity_name || log.entity_id,
      summary: newVals._summary || `${log.action} on ${log.entity_type} #${log.entity_id}`,
      performer: {
        id: log.performer?.id || log.user_id,
        name: log.performer?.name || fallbackPerformer.name || 'System / Staff',
        email: log.performer?.email || fallbackPerformer.email || '',
        role: fallbackPerformer.role || 'Staff',
      },
      branch: log.branch,
      old_values: log.old_values,
      new_values: log.new_values,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listAuditLogs,
  getAuditStats,
  getAuditLogDetail,
};
