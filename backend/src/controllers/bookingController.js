// src/controllers/bookingController.js
const bookingService = require('../services/bookingService');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

const createBooking = async (req, res) => {
  try {
    const isGlobalUser = req.userRoles && (
      req.userRoles.includes('SUPER_ADMIN') ||
      req.userRoles.includes('TRANSPORT_OWNER') ||
      req.userRoles.includes('ADMIN')
    );

    let branchId;
    if (!isGlobalUser && req.user?.branch_id) {
      // Branch staff & branch managers are locked to their own assigned branch
      branchId = req.user.branch_id;
      req.body.origin_branch_id = req.user.branch_id;
    } else {
      branchId = req.body.origin_branch_id || req.body.branch_id || req.branchId;
    }

    if (!branchId && req.tenantDb?.Branch) {
      const defaultBranch = await req.tenantDb.Branch.findOne({
        where: { organization_id: req.tenant.organizationId, is_active: true },
        order: [['created_at', 'ASC']],
      });
      if (defaultBranch) {
        branchId = defaultBranch.id;
      }
    }
    if (!branchId) {
      return errorResponse(res, 'Origin branch is required. Please add your first branch/hub in Branches settings before creating bookings.', null, 400);
    }

    const consignment = await bookingService.createBooking({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId,
      userId: req.user.id,
      payload: req.body,
      models: req.tenantDb,
      sequelize: req.tenantSequelize,
    });

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'BOOKING',
      entityId: consignment.docket_number || consignment.id,
      entityName: `Bilty #${consignment.docket_number || consignment.lr_number}`,
      summary: `Created ${req.tenant?.documentTerminology || 'Bilty'} #${consignment.docket_number || consignment.lr_number} (${consignment.origin_city} ➔ ${consignment.destination_city}, ₹${consignment.total_amount || 0})`,
      newValues: {
        docket_number: consignment.docket_number,
        origin_city: consignment.origin_city,
        destination_city: consignment.destination_city,
        consignor_name: consignment.consignor?.name || req.body.consignor_name,
        consignee_name: consignment.consignee?.name || req.body.consignee_name,
        charged_weight: consignment.charged_weight,
        total_amount: consignment.total_amount,
        payment_type: consignment.payment_type,
        status: consignment.status,
      },
    });

    return successResponse(res, `${req.tenant.documentTerminology || 'Bilty'} created successfully`, consignment, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const listBookings = async (req, res) => {
  try {
    const {
      status,
      search,
      payment_type,
      page = 1,
      limit = 20,
      branch_id,
      sort_by,
      sort_order,
      from_date,
      to_date,
      start_date,
      end_date,
    } = req.query;
    const branchId = (branch_id && branch_id !== 'ALL') ? branch_id : (branch_id === 'ALL' ? null : (req.branchId && req.branchId !== 'ALL' ? req.branchId : null));
    const fromDate = from_date || start_date || null;
    const toDate = to_date || end_date || null;

    const result = await bookingService.listConsignments({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId,
      originBranchId: (req.query.origin_branch_id && req.query.origin_branch_id !== 'ALL') ? req.query.origin_branch_id : null,
      currentBranchId: (req.query.current_branch_id && req.query.current_branch_id !== 'ALL') ? req.query.current_branch_id : null,
      loadPlanning: req.query.load_planning === 'true' || req.query.load_planning === true,
      status: (status && status !== 'ALL') ? status : null,
      search,
      paymentType: payment_type,
      fromDate,
      toDate,
      page,
      limit,
      sortBy: sort_by || 'created_at',
      sortOrder: sort_order || 'DESC',
      models: req.tenantDb,
    });

    return paginatedResponse(res, 'Consignments fetched successfully', result.consignments, result.pagination);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const consignment = await bookingService.getConsignmentDetail(id, req.tenant.tenantId, req.tenantDb);
    if (!consignment) {
      return errorResponse(res, 'Consignment not found', null, 404);
    }
    return successResponse(res, 'Consignment details retrieved', consignment);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const ConsignmentModel = req.tenantDb?.Consignment;
    const existing = ConsignmentModel ? await ConsignmentModel.findByPk(id) : null;
    const oldSnapshot = existing ? existing.toJSON() : null;

    const updated = await bookingService.updateBooking({
      id,
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      payload: req.body,
      models: req.tenantDb,
      sequelize: req.tenantSequelize,
    });

    logAudit({
      req,
      action: 'UPDATE',
      entityType: 'BOOKING',
      entityId: updated.docket_number || id,
      entityName: `Bilty #${updated.docket_number || id}`,
      summary: `Modified Bilty #${updated.docket_number || id} details`,
      oldValues: oldSnapshot ? {
        docket_number: oldSnapshot.docket_number,
        charged_weight: oldSnapshot.charged_weight,
        freight_amount: oldSnapshot.freight_amount,
        total_amount: oldSnapshot.total_amount,
        payment_type: oldSnapshot.payment_type,
        status: oldSnapshot.status,
      } : null,
      newValues: {
        docket_number: updated.docket_number,
        charged_weight: updated.charged_weight,
        freight_amount: updated.freight_amount,
        total_amount: updated.total_amount,
        payment_type: updated.payment_type,
        status: updated.status,
      },
    });

    return successResponse(res, 'Docket updated successfully', updated);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const ConsignmentModel = req.tenantDb?.Consignment;
    const existing = ConsignmentModel ? await ConsignmentModel.findByPk(id) : null;
    const oldSnapshot = existing ? existing.toJSON() : null;

    const result = await bookingService.deleteBooking({
      id,
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      models: req.tenantDb,
      sequelize: req.tenantSequelize,
    });

    logAudit({
      req,
      action: 'DELETE',
      entityType: 'BOOKING',
      entityId: oldSnapshot?.docket_number || id,
      entityName: `Bilty #${oldSnapshot?.docket_number || id}`,
      summary: `Permanently deleted Bilty #${oldSnapshot?.docket_number || id} (${oldSnapshot?.origin_city || ''} ➔ ${oldSnapshot?.destination_city || ''}, ₹${oldSnapshot?.total_amount || 0})`,
      oldValues: oldSnapshot,
    });

    return successResponse(res, 'Docket deleted successfully', result);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  createBooking,
  listBookings,
  getBookingDetail,
  updateBooking,
  deleteBooking,
};
