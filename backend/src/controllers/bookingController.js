// src/controllers/bookingController.js
const bookingService = require('../services/bookingService');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');

const createBooking = async (req, res) => {
  try {
    let branchId = req.body.branch_id || req.branchId;
    if (!branchId && req.tenantDb?.Branch) {
      let defaultBranch = await req.tenantDb.Branch.findOne({
        where: { organization_id: req.tenant.organizationId },
        order: [['created_at', 'ASC']],
      });
      if (!defaultBranch) {
        defaultBranch = await req.tenantDb.Branch.create({
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          branch_code: 'HQ-DEL',
          branch_name: 'Head Office (Delhi Hub)',
          city: req.body.origin_city || 'Delhi',
          state: 'Delhi',
          is_hub: true,
          is_active: true,
        });
      }
      if (defaultBranch) {
        branchId = defaultBranch.id;
      }
    }
    if (!branchId) {
      return errorResponse(res, 'Origin branch is required for booking', null, 400);
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

    return successResponse(res, `${req.tenant.documentTerminology || 'Bilty'} created successfully`, consignment, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const listBookings = async (req, res) => {
  try {
    const { status, search, payment_type, page = 1, limit = 20, branch_id, sort_by, sort_order } = req.query;
    const branchId = branch_id || req.branchId || null;

    const result = await bookingService.listConsignments({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId,
      status,
      search,
      paymentType: payment_type,
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
    const updated = await bookingService.updateBooking({
      id,
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      payload: req.body,
      models: req.tenantDb,
      sequelize: req.tenantSequelize,
    });
    return successResponse(res, 'Docket updated successfully', updated);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bookingService.deleteBooking({
      id,
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      models: req.tenantDb,
      sequelize: req.tenantSequelize,
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
