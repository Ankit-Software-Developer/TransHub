const { Op } = require('sequelize');
const defaultModels = require('../models');
const { generateNextNumber } = require('../services/numberSequenceService');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

const listTrips = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search, sort_by, sort_order, from_date, to_date, branch_id, origin_branch_id, dest_branch_id } = req.query;
    const { Trip, Vehicle, Driver, Branch } = req.tenantDb || defaultModels;
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (status) {
      if (status.includes(',')) {
        where.status = { [Op.in]: status.split(',').map((s) => s.trim().toUpperCase()) };
      } else {
        where.status = status;
      }
    }
    if (branch_id && branch_id !== 'ALL') {
      where[Op.or] = [
        { origin_branch_id: branch_id },
        { dest_branch_id: branch_id },
      ];
    }
    if (origin_branch_id && origin_branch_id !== 'ALL') where.origin_branch_id = origin_branch_id;
    if (dest_branch_id && dest_branch_id !== 'ALL') where.dest_branch_id = dest_branch_id;

    if (search) {
      where.trip_number = { [Op.like]: `%${search}%` };
    }
    if (from_date && to_date) {
      where.trip_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.trip_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.trip_date = { [Op.lte]: to_date };
    }

    const allowedSort = {
      trip_number: 'trip_number',
      trip_date: 'trip_date',
      total_packages: 'total_packages',
      total_weight: 'total_weight',
      status: 'status',
      created_at: 'created_at',
    };
    const orderCol = allowedSort[sort_by] || 'created_at';
    const orderDir = (sort_order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;
    const { count, rows } = await Trip.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[orderCol, orderDir]],
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'capacity_ton', 'vehicle_type', 'ownership'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] },
        { model: Branch, as: 'originBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'is_hub'] },
        { model: Branch, as: 'destBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'is_hub'] },
      ],
    });

    return paginatedResponse(res, 'Trips fetched successfully', rows, {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getTripDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { Trip, Vehicle, Driver, Branch, Consignment, Dispatch } = req.tenantDb || defaultModels;
    const trip = await Trip.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver' },
        { model: Branch, as: 'originBranch' },
        { model: Branch, as: 'destBranch' },
        {
          model: Consignment,
          as: 'consignments',
          include: ['consignor', 'consignee'],
        },
        { model: Dispatch, as: 'dispatches' },
      ],
    });

    if (!trip) {
      return errorResponse(res, 'Trip not found', null, 404);
    }

    return successResponse(res, 'Trip detail retrieved', trip);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createTripAndDispatch = async (req, res) => {
  const activeSequelize = req.tenantSequelize || defaultModels.sequelize;
  const transaction = await activeSequelize.transaction();
  try {
    const { Trip, TripConsignment, Consignment, Vehicle, Driver, Branch, Dispatch, ConsignmentStatusHistory } = req.tenantDb || defaultModels;
    const {
      origin_branch_id,
      dest_branch_id,
      vehicle_id,
      driver_id,
      consignment_ids = [],
      start_odometer,
      seal_number,
      remarks,
      driver_advance = 0,
      advance_mode = 'CASH',
    } = req.body;

    if (!origin_branch_id || !dest_branch_id || !vehicle_id || !driver_id) {
      return errorResponse(res, 'Origin, destination, vehicle, and driver are required', null, 400);
    }

    if (consignment_ids.length === 0) {
      return errorResponse(res, 'Select at least one consignment to load and dispatch', null, 400);
    }

    // Generate atomic Trip Number
    const { formattedNumber: tripNumber } = await generateNextNumber({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId: null,
      documentType: 'TRIP',
      transaction,
    });

    // Generate atomic Dispatch Number
    const { formattedNumber: dispatchNumber } = await generateNextNumber({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId: origin_branch_id,
      documentType: 'DISPATCH',
      transaction,
    });

    // Fetch consignments to calculate totals
    const consignments = await Consignment.findAll({
      where: { id: consignment_ids },
      transaction,
    });

    let totalPkgs = 0;
    let totalWeight = 0;
    let totalFreight = 0;

    consignments.forEach((c) => {
      totalPkgs += c.packages_count;
      totalWeight += parseFloat(c.actual_weight || 0);
      totalFreight += parseFloat(c.total_amount || 0);
    });

    const originBranch = await Branch.findByPk(origin_branch_id, { transaction });
    const destBranch = await Branch.findByPk(dest_branch_id, { transaction });

    // Create Trip
    const trip = await Trip.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      trip_number: tripNumber,
      trip_date: new Date().toISOString().slice(0, 10),
      origin_branch_id,
      dest_branch_id,
      origin_city: originBranch ? originBranch.city : 'Origin',
      destination_city: destBranch ? destBranch.city : 'Destination',
      vehicle_id,
      driver_id,
      trip_type: 'DIRECT',
      start_odometer: parseInt(start_odometer || 0, 10),
      driver_advance: parseFloat(driver_advance) || 0,
      total_packages: totalPkgs,
      total_weight: totalWeight,
      expected_revenue: totalFreight,
      status: 'RUNNING',
      created_by: req.user.id,
    }, { transaction });

    // Create Driver Advance record if specified
    if (parseFloat(driver_advance) > 0) {
      const DriverAdvanceModel = req.tenantDb?.DriverAdvance || defaultModels.DriverAdvance;
      if (DriverAdvanceModel) {
        await DriverAdvanceModel.create({
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          trip_id: trip.id,
          driver_id,
          amount: parseFloat(driver_advance),
          disbursed_date: new Date().toISOString().slice(0, 10),
          disbursed_mode: advance_mode || 'CASH',
          remarks: `Dispatched Trip #${tripNumber} driver cash advance`,
          disbursed_by: req.user.id,
        }, { transaction });
      }
    }

    // Associate Consignments
    for (const c of consignments) {
      await TripConsignment.create({
        trip_id: trip.id,
        consignment_id: c.id,
      }, { transaction });

      // Update Consignment status to DISPATCHED
      await c.update({ status: 'DISPATCHED' }, { transaction });

      // Add timeline history
      await ConsignmentStatusHistory.create({
        consignment_id: c.id,
        status: 'DISPATCHED',
        location: originBranch ? originBranch.city : 'Origin',
        branch_id: origin_branch_id,
        user_id: req.user.id,
        remarks: `Dispatched on trip ${tripNumber} with seal #${seal_number || 'N/A'}`,
        timestamp: new Date(),
      }, { transaction });
    }

    // Update Vehicle & Driver Status
    await Vehicle.update({ status: 'ON_TRIP' }, { where: { id: vehicle_id }, transaction });
    await Driver.update({ status: 'ON_TRIP' }, { where: { id: driver_id }, transaction });

    // Create Dispatch Challan record
    const dispatch = await Dispatch.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_id: origin_branch_id,
      dispatch_number: dispatchNumber,
      trip_id: trip.id,
      dispatch_date: new Date().toISOString().slice(0, 10),
      dispatch_time: new Date().toTimeString().slice(0, 8),
      seal_number: seal_number || '',
      remarks: remarks || '',
      created_by: req.user.id,
    }, { transaction });

    await transaction.commit();

    logAudit({
      req,
      action: 'DISPATCH',
      entityType: 'TRIP',
      entityId: trip.trip_number,
      entityName: `Trip ${trip.trip_number}`,
      summary: `Dispatched Trip #${trip.trip_number} (Manifest: ${dispatch.dispatch_number}, ${totalPkgs} Pkgs, ${totalWeight} KG to ${destBranch?.branch_name || 'Destination'})`,
      newValues: {
        trip_number: trip.trip_number,
        dispatch_number: dispatch.dispatch_number,
        vehicle_id,
        driver_id,
        total_packages: totalPkgs,
        total_weight: totalWeight,
        seal_number: seal_number,
        consignment_ids,
      },
    });

    return successResponse(res, 'Trip & Dispatch Challan generated successfully', {
      trip,
      dispatch,
    }, 201);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

const createTrip = async (req, res) => {
  try {
    const { Trip, Vehicle, Driver, Branch } = req.tenantDb || defaultModels;
    const {
      origin_branch_id,
      dest_branch_id,
      vehicle_id,
      driver_id,
      trip_date,
      driver_advance = 0,
      advance_mode = 'CASH',
      start_odometer = 0,
      remarks = '',
      status = 'PLANNED',
    } = req.body;

    if (!vehicle_id) {
      return errorResponse(res, 'Please select a vehicle to assign to this trip', null, 400);
    }

    const { formattedNumber: tripNumber } = await generateNextNumber({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId: origin_branch_id || null,
      documentType: 'TRIP',
    });

    const originBranch = origin_branch_id ? await Branch.findByPk(origin_branch_id) : null;
    const destBranch = dest_branch_id ? await Branch.findByPk(dest_branch_id) : null;

    const newTrip = await Trip.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      trip_number: tripNumber,
      trip_date: trip_date || new Date().toISOString().slice(0, 10),
      origin_branch_id: origin_branch_id || null,
      dest_branch_id: dest_branch_id || null,
      origin_city: originBranch ? originBranch.city : 'Origin Hub',
      destination_city: destBranch ? destBranch.city : 'Destination Hub',
      vehicle_id,
      driver_id: driver_id || null,
      driver_advance: parseFloat(driver_advance) || 0,
      start_odometer: parseInt(start_odometer, 10) || 0,
      status: status || 'PLANNED',
      remarks: remarks || '',
      created_by: req.user.id,
    });

    // Record DriverAdvance if provided
    if (parseFloat(driver_advance) > 0) {
      const DriverAdvanceModel = req.tenantDb?.DriverAdvance || defaultModels.DriverAdvance;
      if (DriverAdvanceModel) {
        await DriverAdvanceModel.create({
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          trip_id: newTrip.id,
          driver_id: driver_id || null,
          amount: parseFloat(driver_advance),
          disbursed_date: trip_date || new Date().toISOString().slice(0, 10),
          disbursed_mode: advance_mode || 'CASH',
          remarks: `Trip #${tripNumber} initial driver advance`,
          disbursed_by: req.user.id,
        });
      }
    }

    // Mark vehicle as ON_TRIP if status is RUNNING
    if (status === 'RUNNING' && vehicle_id) {
      await Vehicle.update({ status: 'ON_TRIP' }, { where: { id: vehicle_id } });
    }

    const fullTrip = await Trip.findByPk(newTrip.id, {
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver' },
        { model: Branch, as: 'originBranch' },
        { model: Branch, as: 'destBranch' },
      ],
    });

    return successResponse(res, 'Trip created and vehicle assigned successfully', fullTrip, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const assignVehicleToTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, driver_id } = req.body;
    const { Trip, Vehicle, Driver } = req.tenantDb || defaultModels;

    const trip = await Trip.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
    });

    if (!trip) {
      return errorResponse(res, 'Trip not found', null, 404);
    }

    const previousVehicleId = trip.vehicle_id;

    if (vehicle_id) {
      trip.vehicle_id = vehicle_id;
    }
    if (driver_id) {
      trip.driver_id = driver_id;
    }

    await trip.save();

    // If trip was RUNNING and vehicle changed, update statuses
    if (trip.status === 'RUNNING') {
      if (previousVehicleId && previousVehicleId !== vehicle_id) {
        await Vehicle.update({ status: 'AVAILABLE' }, { where: { id: previousVehicleId } });
      }
      if (vehicle_id) {
        await Vehicle.update({ status: 'ON_TRIP' }, { where: { id: vehicle_id } });
      }
    }

    const updatedTrip = await Trip.findByPk(trip.id, {
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver' },
      ],
    });

    return successResponse(res, 'Vehicle assigned to trip successfully', updatedTrip);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listTrips,
  getTripDetail,
  createTripAndDispatch,
  createTrip,
  assignVehicleToTrip,
};
