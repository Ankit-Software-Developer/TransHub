// src/controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getOwnerDashboard = async (req, res) => {
  try {
    const { branch_id, date_filter } = req.query;
    let branchId = req.branchId || null;
    if (branch_id === 'ALL') {
      branchId = null;
    } else if (branch_id) {
      branchId = branch_id;
    }

    const data = await dashboardService.getOwnerDashboard({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId,
      dateFilter: date_filter,
      models: req.tenantDb,
    });

    return successResponse(res, 'Owner dashboard metrics fetched', data);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getSuperAdminDashboard = async (req, res) => {
  try {
    const data = await dashboardService.getSuperAdminDashboard();
    return successResponse(res, 'Super Admin metrics fetched', data);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  getOwnerDashboard,
  getSuperAdminDashboard,
};
