// src/controllers/fleetController.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

const listVehicles = async (req, res) => {
  try {
    const { Vehicle, Driver, Branch, Trip } = req.tenantDb || defaultModels;
    const { status, available_only } = req.query;
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (status) {
      where.status = status;
    } else if (available_only === 'true') {
      where.status = 'AVAILABLE';
    }

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
    if (error.message && error.message.includes('Unknown column')) {
      try {
        const { applyEssentialPatches } = require('../services/tenantDbManager');
        const dbSeq = req.tenantSequelize || defaultModels.sequelize;
        if (dbSeq) {
          await applyEssentialPatches(dbSeq);
          const { Vehicle } = req.tenantDb || defaultModels;
          const retryVehicles = await Vehicle.findAll({
            where,
            include: includeList,
            order: [['vehicle_number', 'ASC']],
          });
          return successResponse(res, 'Vehicles list fetched', retryVehicles);
        }
      } catch (retryErr) {
        console.error('Column auto-heal retry notice:', retryErr.message);
      }
    }
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
      length_ft,
      gps_device_id,
      fastag_id,
      branch_id,
      assigned_driver_id,
      rc_number,
      rc_expiry,
      insurance_expiry,
      fitness_expiry,
      permit_expiry,
      puc_expiry,
      make_model,
      manufacturing_year,
      fuel_type,
      owner_name,
      owner_phone,
      chassis_number,
      engine_number,
      current_odometer,
      status
    } = req.body;

    if (!vehicle_number || !vehicle_number.trim()) {
      return errorResponse(res, 'Vehicle registration number is required', null, 400);
    }

    const normalizedPlate = vehicle_number.toUpperCase().trim();

    // Check for duplicate vehicle number
    const existing = await Vehicle.findOne({
      where: {
        organization_id: req.tenant.organizationId,
        vehicle_number: normalizedPlate,
      },
    });

    if (existing) {
      return errorResponse(res, `Vehicle with registration number "${normalizedPlate}" already exists.`, null, 400);
    }

    const newVehicle = await Vehicle.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      vehicle_number: normalizedPlate,
      vehicle_code: `VEH-${normalizedPlate.replace(/[^A-Za-z0-9]/g, '').slice(-4)}`,
      vehicle_type: vehicle_type || 'TRUCK',
      ownership: ownership || 'OWN',
      capacity_ton: parseFloat(capacity_ton) || 10,
      length_ft: parseFloat(length_ft) || null,
      gps_device_id: (gps_device_id && gps_device_id.trim()) ? gps_device_id.trim() : null,
      fastag_id: fastag_id || null,
      branch_id: branch_id || null,
      assigned_driver_id: assigned_driver_id || null,
      rc_number: rc_number || `RC-${normalizedPlate}`,
      rc_expiry: rc_expiry || null,
      insurance_expiry: insurance_expiry || null,
      fitness_expiry: fitness_expiry || null,
      permit_expiry: permit_expiry || null,
      puc_expiry: puc_expiry || null,
      make_model: make_model || null,
      manufacturing_year: parseInt(manufacturing_year, 10) || null,
      fuel_type: fuel_type || 'DIESEL',
      owner_name: owner_name || null,
      owner_phone: owner_phone || null,
      chassis_number: chassis_number || null,
      engine_number: engine_number || null,
      current_odometer: parseInt(current_odometer, 10) || 0,
      status: status || 'AVAILABLE',
    });

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'VEHICLE',
      entityId: newVehicle.vehicle_number,
      entityName: `Vehicle ${newVehicle.vehicle_number}`,
      summary: `Registered new vehicle ${newVehicle.vehicle_number} (${newVehicle.vehicle_type}, ${newVehicle.capacity_ton}T)`,
      newValues: newVehicle.toJSON ? newVehicle.toJSON() : newVehicle,
    });

    return successResponse(res, 'Vehicle registered successfully in fleet', newVehicle, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { Vehicle } = req.tenantDb || defaultModels;
    const vehicle = await Vehicle.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
      },
    });

    if (!vehicle) {
      return errorResponse(res, 'Vehicle asset not found', null, 404);
    }

    const oldSnapshot = vehicle.toJSON ? vehicle.toJSON() : { ...vehicle.dataValues };

    const {
      vehicle_number,
      vehicle_type,
      ownership,
      capacity_ton,
      length_ft,
      gps_device_id,
      fastag_id,
      branch_id,
      assigned_driver_id,
      rc_number,
      rc_expiry,
      insurance_expiry,
      fitness_expiry,
      permit_expiry,
      puc_expiry,
      make_model,
      manufacturing_year,
      fuel_type,
      owner_name,
      owner_phone,
      chassis_number,
      engine_number,
      current_odometer,
      status,
    } = req.body;

    if (vehicle_number && vehicle_number.toUpperCase().trim() !== vehicle.vehicle_number) {
      const normalizedPlate = vehicle_number.toUpperCase().trim();
      const duplicate = await Vehicle.findOne({
        where: {
          organization_id: req.tenant.organizationId,
          vehicle_number: normalizedPlate,
          id: { [Op.ne]: id },
        },
      });
      if (duplicate) {
        return errorResponse(res, `Vehicle number "${normalizedPlate}" is already assigned to another vehicle.`, null, 400);
      }
      vehicle.vehicle_number = normalizedPlate;
    }

    if (vehicle_type !== undefined) vehicle.vehicle_type = vehicle_type;
    if (ownership !== undefined) vehicle.ownership = ownership;
    if (capacity_ton !== undefined) vehicle.capacity_ton = parseFloat(capacity_ton) || vehicle.capacity_ton;
    if (length_ft !== undefined) vehicle.length_ft = parseFloat(length_ft) || null;
    if (gps_device_id !== undefined) vehicle.gps_device_id = (gps_device_id && gps_device_id.trim()) ? gps_device_id.trim() : null;
    if (fastag_id !== undefined) vehicle.fastag_id = fastag_id;
    if (branch_id !== undefined) vehicle.branch_id = branch_id || null;
    if (assigned_driver_id !== undefined) vehicle.assigned_driver_id = assigned_driver_id || null;
    if (rc_number !== undefined) vehicle.rc_number = rc_number;
    if (rc_expiry !== undefined) vehicle.rc_expiry = rc_expiry || null;
    if (insurance_expiry !== undefined) vehicle.insurance_expiry = insurance_expiry || null;
    if (fitness_expiry !== undefined) vehicle.fitness_expiry = fitness_expiry || null;
    if (permit_expiry !== undefined) vehicle.permit_expiry = permit_expiry || null;
    if (puc_expiry !== undefined) vehicle.puc_expiry = puc_expiry || null;
    if (make_model !== undefined) vehicle.make_model = make_model;
    if (manufacturing_year !== undefined) vehicle.manufacturing_year = parseInt(manufacturing_year, 10) || null;
    if (fuel_type !== undefined) vehicle.fuel_type = fuel_type;
    if (owner_name !== undefined) vehicle.owner_name = owner_name;
    if (owner_phone !== undefined) vehicle.owner_phone = owner_phone;
    if (chassis_number !== undefined) vehicle.chassis_number = chassis_number;
    if (engine_number !== undefined) vehicle.engine_number = engine_number;
    if (current_odometer !== undefined) vehicle.current_odometer = parseInt(current_odometer, 10) || 0;
    if (status !== undefined) vehicle.status = status;

    await vehicle.save();

    logAudit({
      req,
      action: 'UPDATE',
      entityType: 'VEHICLE',
      entityId: vehicle.vehicle_number,
      entityName: `Vehicle ${vehicle.vehicle_number}`,
      summary: `Updated vehicle ${vehicle.vehicle_number} specifications`,
      oldValues: oldSnapshot,
      newValues: vehicle.toJSON ? vehicle.toJSON() : { ...vehicle.dataValues },
    });

    return successResponse(res, 'Vehicle updated successfully', vehicle);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const toggleVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { Vehicle } = req.tenantDb || defaultModels;
    const vehicle = await Vehicle.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
    });

    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', null, 404);
    }

    const nextStatus = status || (vehicle.status === 'INACTIVE' ? 'AVAILABLE' : 'INACTIVE');
    vehicle.status = nextStatus;
    await vehicle.save();

    return successResponse(res, `Vehicle status changed to ${nextStatus}`, vehicle);
  } catch (error) {
    if (error.message && error.message.includes('Unknown column')) {
      try {
        const { applyEssentialPatches } = require('../services/tenantDbManager');
        const dbSeq = req.tenantSequelize || defaultModels.sequelize;
        if (dbSeq) {
          await applyEssentialPatches(dbSeq);
          const { Vehicle } = req.tenantDb || defaultModels;
          const vehicle = await Vehicle.findOne({ where: { id: req.params.id, tenant_id: req.tenant.tenantId } });
          if (vehicle) {
            const nextStatus = req.body.status || (vehicle.status === 'INACTIVE' ? 'AVAILABLE' : 'INACTIVE');
            vehicle.status = nextStatus;
            await vehicle.save();
            return successResponse(res, `Vehicle status changed to ${nextStatus}`, vehicle);
          }
        }
      } catch (retryErr) {}
    }
    return errorResponse(res, error.message, null, 500);
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { Vehicle, Trip } = req.tenantDb || defaultModels;
    const vehicle = await Vehicle.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
    });

    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', null, 404);
    }

    if (vehicle.status === 'ON_TRIP') {
      return errorResponse(res, 'Cannot remove vehicle while it is active on a live trip.', null, 400);
    }

    if (Trip) {
      const activeTrip = await Trip.findOne({
        where: {
          vehicle_id: id,
          status: ['RUNNING', 'READY', 'PLANNED'],
        },
      });
      if (activeTrip) {
        return errorResponse(res, `Cannot remove vehicle. It is currently linked to active Trip ${activeTrip.trip_number}.`, null, 400);
      }
    }

    await vehicle.destroy();

    logAudit({
      req,
      action: 'DELETE',
      entityType: 'VEHICLE',
      entityId: vehicle.vehicle_number,
      entityName: `Vehicle ${vehicle.vehicle_number}`,
      summary: `Permanently removed vehicle ${vehicle.vehicle_number} from fleet`,
      oldValues: vehicle.toJSON ? vehicle.toJSON() : { ...vehicle.dataValues },
    });

    return successResponse(res, `Vehicle ${vehicle.vehicle_number} removed successfully`);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const listDrivers = async (req, res) => {
  try {
    const { Driver, Branch } = req.tenantDb || defaultModels;
    const include = [];
    if (Branch) {
      include.push({
        model: Branch,
        as: 'branch',
        attributes: ['id', 'branch_name', 'branch_code', 'city'],
        required: false,
      });
    }

    const drivers = await Driver.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
      include,
      order: [['name', 'ASC']],
    });
    return successResponse(res, 'Drivers list fetched', drivers);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createDriver = async (req, res) => {
  try {
    const { Driver } = req.tenantDb || defaultModels;
    const {
      name,
      phone,
      alt_phone,
      driver_code,
      license_number,
      license_type,
      license_expiry,
      branch_id,
      address,
      emergency_contact,
      salary_type,
      salary_amount,
      status,
    } = req.body;

    if (!name || !phone || !license_number) {
      return errorResponse(res, 'Driver name, phone number, and license number are required', null, 400);
    }

    const tenantId = req.tenant.tenantId;
    const organizationId = req.tenant.organizationId;

    let finalCode = driver_code?.trim();
    if (!finalCode) {
      const count = await Driver.count({ where: { organization_id: organizationId } });
      finalCode = `DRV-${String(count + 1).padStart(3, '0')}`;
    }

    const driver = await Driver.create({
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: branch_id || null,
      driver_code: finalCode,
      name: name.trim(),
      phone: phone.trim(),
      alt_phone: alt_phone?.trim() || null,
      license_number: license_number.trim(),
      license_type: license_type || 'Heavy Commercial (HMV)',
      license_expiry: license_expiry || null,
      address: address?.trim() || null,
      emergency_contact: emergency_contact?.trim() || null,
      salary_type: salary_type || 'MONTHLY',
      salary_amount: salary_amount || 0.00,
      status: status || 'ACTIVE',
    });

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'DRIVER',
      entityId: driver.id,
      entityName: `Driver ${driver.name}`,
      summary: `Registered certified driver ${driver.name} (Phone: ${driver.phone})`,
      newValues: driver.toJSON ? driver.toJSON() : { ...driver.dataValues },
    });

    return successResponse(res, 'Driver registered successfully', driver, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateDriver = async (req, res) => {
  try {
    const { Driver } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const driver = await Driver.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!driver) {
      return errorResponse(res, 'Driver not found', null, 404);
    }

    const oldSnapshot = driver.toJSON ? driver.toJSON() : { ...driver.dataValues };

    const {
      name,
      phone,
      alt_phone,
      driver_code,
      license_number,
      license_type,
      license_expiry,
      branch_id,
      address,
      emergency_contact,
      salary_type,
      salary_amount,
      status,
    } = req.body;

    await driver.update({
      name: name !== undefined ? name.trim() : driver.name,
      phone: phone !== undefined ? phone.trim() : driver.phone,
      alt_phone: alt_phone !== undefined ? (alt_phone?.trim() || null) : driver.alt_phone,
      driver_code: driver_code !== undefined ? driver_code.trim() : driver.driver_code,
      license_number: license_number !== undefined ? license_number.trim() : driver.license_number,
      license_type: license_type !== undefined ? license_type : driver.license_type,
      license_expiry: license_expiry !== undefined ? (license_expiry || null) : driver.license_expiry,
      branch_id: branch_id !== undefined ? (branch_id || null) : driver.branch_id,
      address: address !== undefined ? (address?.trim() || null) : driver.address,
      emergency_contact: emergency_contact !== undefined ? (emergency_contact?.trim() || null) : driver.emergency_contact,
      salary_type: salary_type !== undefined ? salary_type : driver.salary_type,
      salary_amount: salary_amount !== undefined ? salary_amount : driver.salary_amount,
      status: status !== undefined ? status : driver.status,
    });

    logAudit({
      req,
      action: 'UPDATE',
      entityType: 'DRIVER',
      entityId: driver.name,
      entityName: `Driver ${driver.name}`,
      summary: `Updated driver ${driver.name} (Phone: ${driver.phone}) profile`,
      oldValues: oldSnapshot,
      newValues: driver.toJSON ? driver.toJSON() : { ...driver.dataValues },
    });

    return successResponse(res, 'Driver profile updated', driver);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const toggleDriverStatus = async (req, res) => {
  try {
    const { Driver } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const { status } = req.body;

    const driver = await Driver.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!driver) {
      return errorResponse(res, 'Driver not found', null, 404);
    }

    const newStatus = status || (driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    await driver.update({ status: newStatus });

    return successResponse(res, `Driver status changed to ${newStatus}`, driver);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const deleteDriver = async (req, res) => {
  try {
    const { Driver, Vehicle } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const driver = await Driver.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!driver) {
      return errorResponse(res, 'Driver not found', null, 404);
    }

    if (Vehicle) {
      const assignedVeh = await Vehicle.findOne({ where: { assigned_driver_id: id } });
      if (assignedVeh) {
        return errorResponse(res, `Driver cannot be deleted because they are assigned to vehicle ${assignedVeh.vehicle_number}. Please unassign the vehicle first.`, null, 400);
      }
    }

    const oldSnapshot = driver.toJSON ? driver.toJSON() : { ...driver.dataValues };
    await driver.destroy();

    logAudit({
      req,
      action: 'DELETE',
      entityType: 'DRIVER',
      entityId: driver.name,
      entityName: `Driver ${driver.name}`,
      summary: `Permanently removed driver ${driver.name} (Phone: ${driver.phone}) from fleet`,
      oldValues: oldSnapshot,
    });

    return successResponse(res, 'Driver record removed successfully');
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
  updateVehicle,
  toggleVehicleStatus,
  deleteVehicle,
  listDrivers,
  createDriver,
  updateDriver,
  toggleDriverStatus,
  deleteDriver,
  getMaintenanceAlerts,
};
