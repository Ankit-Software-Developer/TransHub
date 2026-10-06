// src/controllers/deliveryController.js
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const markDelivered = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Consignment, DeliveryRecord, ConsignmentStatusHistory } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();
  try {
    const { id } = req.params;
    const { receiver_name, receiver_phone, receiver_signature_url, delivery_photo_url, remarks } = req.body;

    if (!receiver_name) {
      return errorResponse(res, 'Receiver name is required for delivery sign-off', null, 400);
    }

    const consignment = await Consignment.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      transaction,
    });

    if (!consignment) {
      return errorResponse(res, 'Consignment not found', null, 404);
    }

    // Create delivery record
    const delivery = await DeliveryRecord.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      consignment_id: consignment.id,
      branch_id: consignment.dest_branch_id || req.user.branch_id,
      receiver_name,
      receiver_phone,
      delivered_packages: consignment.packages_count,
      is_otp_verified: true,
      receiver_signature_url: receiver_signature_url || '',
      delivery_photo_url: delivery_photo_url || '',
      remarks: remarks || 'Delivered successfully',
      delivered_by: req.user.id,
    }, { transaction });

    // Update status to DELIVERED
    await consignment.update({ status: 'DELIVERED' }, { transaction });

    // Timeline update
    await ConsignmentStatusHistory.create({
      consignment_id: consignment.id,
      status: 'DELIVERED',
      location: consignment.destination_city,
      branch_id: consignment.dest_branch_id,
      user_id: req.user.id,
      remarks: `Material handed over to ${receiver_name} (${receiver_phone || 'N/A'})`,
      timestamp: new Date(),
    }, { transaction });

    await transaction.commit();

    return successResponse(res, 'Consignment marked DELIVERED', delivery);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

const markOutForDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const consignment = await Consignment.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
    });

    if (!consignment) {
      return errorResponse(res, 'Consignment not found', null, 404);
    }

    await consignment.update({ status: 'OUT_FOR_DELIVERY' });

    await ConsignmentStatusHistory.create({
      consignment_id: consignment.id,
      status: 'OUT_FOR_DELIVERY',
      location: consignment.destination_city,
      branch_id: consignment.dest_branch_id,
      user_id: req.user.id,
      remarks: 'Cargo dispatched for local doorstep delivery',
      timestamp: new Date(),
    });

    return successResponse(res, 'Consignment marked OUT FOR DELIVERY', consignment);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  markDelivered,
  markOutForDelivery,
};
