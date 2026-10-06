// src/controllers/trackingController.js
const defaultModels = require('../models');
const { Tenant } = require('../models');
const { getTenantConnection } = require('../services/tenantDbManager');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const trackShipment = async (req, res) => {
  try {
    const rawQuery = req.params[0] || req.params.query || req.query.lr || req.query.q;
    if (!rawQuery) {
      return errorResponse(res, 'Tracking number (LR/Bilty/GR) is required', null, 400);
    }

    const cleanQuery = decodeURIComponent(rawQuery).trim().toUpperCase();

    let consignment = null;
    if (req.tenantDb?.Consignment) {
      consignment = await req.tenantDb.Consignment.findOne({
        where: { lr_number: cleanQuery },
        attributes: [
          'id',
          'lr_number',
          'booking_date',
          'origin_city',
          'destination_city',
          'packages_count',
          'package_type',
          'status',
          'expected_delivery_date',
        ],
        include: [
          ...(req.tenantDb.ConsignmentStatusHistory ? [{
            model: req.tenantDb.ConsignmentStatusHistory,
            as: 'statusHistory',
            attributes: ['status', 'location', 'timestamp'],
            order: [['timestamp', 'ASC']],
          }] : []),
          ...(req.tenantDb.Pod ? [{
            model: req.tenantDb.Pod,
            as: 'pod',
            attributes: ['status', 'uploaded_at'],
          }] : []),
        ],
      });
    } else {
      // Search across active tenant databases
      const activeTenants = await Tenant.findAll({ where: { status: ['ACTIVE', 'TRIAL'] } });
      for (const t of activeTenants) {
        if (!t.database_name) continue;
        try {
          const tenantConn = await getTenantConnection(t.database_name);
          if (tenantConn?.models?.Consignment) {
            const found = await tenantConn.models.Consignment.findOne({
              where: { lr_number: cleanQuery },
              attributes: [
                'id',
                'lr_number',
                'booking_date',
                'origin_city',
                'destination_city',
                'packages_count',
                'package_type',
                'status',
                'expected_delivery_date',
              ],
              include: [
                ...(tenantConn.models.ConsignmentStatusHistory ? [{
                  model: tenantConn.models.ConsignmentStatusHistory,
                  as: 'statusHistory',
                  attributes: ['status', 'location', 'timestamp'],
                  order: [['timestamp', 'ASC']],
                }] : []),
                ...(tenantConn.models.Pod ? [{
                  model: tenantConn.models.Pod,
                  as: 'pod',
                  attributes: ['status', 'uploaded_at'],
                }] : []),
              ],
            });
            if (found) {
              consignment = found;
              break;
            }
          }
        } catch (dbErr) {
          // Continue searching other tenant databases
        }
      }
    }

    if (!consignment) {
      return errorResponse(res, `Shipment "${cleanQuery}" not found. Please verify the LR / Bilty number.`, null, 404);
    }

    const responseData = {
      lrNumber: consignment.lr_number,
      bookingDate: consignment.booking_date,
      origin: consignment.origin_city,
      destination: consignment.destination_city,
      packages: `${consignment.packages_count} ${consignment.package_type}`,
      currentStatus: consignment.status,
      expectedDelivery: consignment.expected_delivery_date,
      hasPod: !!consignment.pod,
      podStatus: consignment.pod ? consignment.pod.status : 'NOT_AVAILABLE',
      timeline: consignment.statusHistory.map((h) => ({
        status: h.status,
        location: h.location,
        timestamp: h.timestamp,
      })),
    };

    return successResponse(res, 'Shipment tracking data retrieved', responseData);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  trackShipment,
};
