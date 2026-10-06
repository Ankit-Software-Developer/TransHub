// src/controllers/fleetController.js
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const listVehicles = async (req, res) => {
  try {
    const { Vehicle, Driver, Branch, Trip } = req.tenantDb || defaultModels;
    const { status } = req.query;
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (status) where.status = status;

    const includeList = [];
    if (Driver) includeList.push({ model: Driver, as: 'assignedDriver', attributes: ['id', 'name', 'phone'] });
    if (Branch) includeList.push({ model: Branch, as: 'branch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'state'] });
    if (Trip) {
      includeList.push({
        model: Trip,
        as: 'trips',
        where: {
          status: ['RUNNING', 'READY', 'PLANNED']
        },
        required: false,
        limit: 1,
        order: [['created_at', 'DESC']],
        include: [
          ...(Branch ? [
            { model: Branch, as: 'originBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'state'] },
            { model: Branch, as: 'destBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'state'] }
          ] : [])
        ]
      });
    }

    const vehicles = await Vehicle.findAll({
      where,
      include: includeList,
      order: [['vehicle_number', 'ASC']],
    });

    return successResponse(res, 'Vehicles list fetched', vehicles);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createVehicle = async (req, res) => {
  try {
    const { Vehicle } = req.tenantDb || defaultModels;
    const {
      vehicle_number,
      vehicle_type,
      ownership,
      capacity_ton,
      gps_device_id,
      fastag_id,
      branch_id,
      assigned_driver_id,
      rc_number,
      status
    } = req.body;

    if (!vehicle_number) {
      return errorResponse(res, 'Vehicle number is required', null, 400);
    }

    const newVehicle = await Vehicle.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      vehicle_number: vehicle_number.toUpperCase().trim(),
      vehicle_type: vehicle_type || 'TRUCK',
      ownership: ownership || 'OWN',
      capacity_ton: capacity_ton || 10,
      gps_device_id: gps_device_id || null,
      fastag_id: fastag_id || null,
      branch_id: branch_id || null,
      assigned_driver_id: assigned_driver_id || null,
      rc_number: rc_number || null,
      status: status || 'AVAILABLE',
    });

    return successResponse(res, 'Vehicle registered successfully', newVehicle, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const listDrivers = async (req, res) => {
  try {
    const { Driver } = req.tenantDb || defaultModels;
    const drivers = await Driver.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
      order: [['name', 'ASC']],
    });
    return successResponse(res, 'Drivers list fetched', drivers);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getMaintenanceAlerts = async (req, res) => {
  try {
    const { Vehicle } = req.tenantDb || defaultModels;
    const vehicles = await Vehicle.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
      attributes: ['id', 'vehicle_number', 'insurance_expiry', 'fitness_expiry', 'puc_expiry', 'status'],
    });

    const alerts = [];
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 86400000);

    vehicles.forEach((v) => {
      if (v.insurance_expiry && new Date(v.insurance_expiry) <= thirtyDaysAhead) {
        alerts.push({
          vehicleId: v.id,
          vehicleNumber: v.vehicle_number,
          type: 'INSURANCE',
          expiryDate: v.insurance_expiry,
          isExpired: new Date(v.insurance_expiry) < now,
        });
      }
      if (v.fitness_expiry && new Date(v.fitness_expiry) <= thirtyDaysAhead) {
        alerts.push({
          vehicleId: v.id,
          vehicleNumber: v.vehicle_number,
          type: 'FITNESS',
          expiryDate: v.fitness_expiry,
          isExpired: new Date(v.fitness_expiry) < now,
        });
      }
      if (v.puc_expiry && new Date(v.puc_expiry) <= thirtyDaysAhead) {
        alerts.push({
          vehicleId: v.id,
          vehicleNumber: v.vehicle_number,
          type: 'PUC',
          expiryDate: v.puc_expiry,
          isExpired: new Date(v.puc_expiry) < now,
        });
      }
    });

    return successResponse(res, 'Fleet maintenance and statutory alerts fetched', alerts);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listVehicles,
  createVehicle,
  listDrivers,
  getMaintenanceAlerts,
};
