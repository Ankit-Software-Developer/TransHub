// src/controllers/podController.js
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { saveMediaFile } = require('../utils/fileStorage');

const listPods = async (req, res) => {
  try {
    const { Pod, Consignment, Customer } = req.tenantDb || defaultModels;
    const { status, search, sort_by = 'uploaded_at', sort_order = 'DESC', page = 1, limit = 20, from_date, to_date } = req.query;
    const { Op } = require('sequelize');

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (status) where.status = status;

    if (search && search.trim()) {
      where[Op.or] = [
        { receiver_name: { [Op.iLike || Op.like]: `%${search.trim()}%` } },
      ];
    }

    if (from_date && to_date) {
      where.uploaded_at = { [Op.between]: [new Date(`${from_date}T00:00:00.000Z`), new Date(`${to_date}T23:59:59.999Z`)] };
    } else if (from_date) {
      where.uploaded_at = { [Op.gte]: new Date(`${from_date}T00:00:00.000Z`) };
    } else if (to_date) {
      where.uploaded_at = { [Op.lte]: new Date(`${to_date}T23:59:59.999Z`) };
    }

    const allowedSortFields = ['uploaded_at', 'status', 'receiver_name', 'created_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'uploaded_at';
    const safeSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;
    const { count, rows } = await Pod.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[safeSortBy, safeSortOrder]],
      include: [
        {
          model: Consignment,
          as: 'consignment',
          attributes: ['id', 'lr_number', 'booking_date', 'origin_city', 'destination_city', 'packages_count', 'total_amount'],
          include: [
            ...(Customer ? [
              { model: Customer, as: 'consignor', attributes: ['name'] },
              { model: Customer, as: 'consignee', attributes: ['name'] },
            ] : []),
          ],
        },
      ],
    });

    return paginatedResponse(res, 'PODs fetched successfully', rows, {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const uploadPod = async (req, res) => {
  try {
    const { Pod, Consignment } = req.tenantDb || defaultModels;
    const { consignment_id, file_url, receiver_name } = req.body;
    if (!consignment_id || !file_url) {
      return errorResponse(res, 'Consignment ID and POD file URL are required', null, 400);
    }

    const consignment = await Consignment.findOne({
      where: { id: consignment_id, tenant_id: req.tenant.tenantId },
    });

    if (!consignment) {
      return errorResponse(res, 'Consignment not found', null, 404);
    }

    const rawUrl = (file_url || '').trim();
    // Max 1.5 MB Base64 payload validation (~1.1 MB binary equivalent)
    const MAX_DB_BASE64_LENGTH = Math.round(1.5 * 1024 * 1024 * 1.37);
    if (rawUrl.startsWith('data:') && rawUrl.length > MAX_DB_BASE64_LENGTH) {
      return errorResponse(res, 'POD image exceeds the 1 MB database storage limit. Please capture or compress a smaller photo.', null, 400);
    }

    let pod = await Pod.findOne({ where: { consignment_id } });
    if (pod) {
      await pod.update({
        file_url: rawUrl,
        receiver_name: receiver_name || pod.receiver_name,
        status: 'POD_UPLOADED',
        uploaded_at: new Date(),
        uploaded_by: req.user.id,
      });
    } else {
      pod = await Pod.create({
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        consignment_id,
        file_url: rawUrl,
        receiver_name: receiver_name || '',
        status: 'POD_UPLOADED',
        uploaded_by: req.user.id,
      });
    }

    await consignment.update({ status: 'POD_UPLOADED' });

    return successResponse(res, 'Proof of Delivery (POD) uploaded successfully', pod);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const verifyPod = async (req, res) => {
  try {
    const { Pod } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const { status, rejection_reason } = req.body; // 'POD_VERIFIED' or 'POD_REJECTED'

    const pod = await Pod.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
    });

    if (!pod) {
      return errorResponse(res, 'POD record not found', null, 404);
    }

    await pod.update({
      status: status || 'POD_VERIFIED',
      verified_at: new Date(),
      verified_by: req.user.id,
      rejection_reason: rejection_reason || null,
    });

    return successResponse(res, `POD marked as ${status || 'VERIFIED'}`, pod);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listPods,
  uploadPod,
  verifyPod,
};
