const { Op } = require('sequelize');
const defaultModels = require('../models');
const { generateNextNumber } = require('../services/numberSequenceService');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

// Helper to resolve all sibling branches and city variations within a metro region
const resolveCityAndSiblingBranches = async (branchId, Branch, organizationId) => {
  if (!branchId || branchId === 'ALL' || !Branch) return { matchedBranchIds: [branchId], cityKeywords: [] };
  try {
    const branch = await Branch.findByPk(branchId);
    if (!branch) return { matchedBranchIds: [branchId], cityKeywords: [] };

    const branchCity = (branch.city || '').trim();
    const branchName = (branch.branch_name || '').trim();

    const cityKeywords = [];
    if (branchCity) cityKeywords.push(branchCity);

    if (/delhi/i.test(branchCity) || /delhi/i.test(branchName)) {
      cityKeywords.push('Delhi', 'South Delhi', 'North Delhi', 'New Delhi', 'West Delhi', 'East Delhi', 'Central Delhi');
    } else if (/mumbai/i.test(branchCity) || /mumbai/i.test(branchName)) {
      cityKeywords.push('Mumbai', 'Navi Mumbai', 'Thane', 'Bhiwandi');
    } else if (/bengaluru|bangalore/i.test(branchCity) || /bengaluru|bangalore/i.test(branchName)) {
      cityKeywords.push('Bengaluru', 'Bangalore');
    } else if (/kolkata|calcutta/i.test(branchCity) || /kolkata|calcutta/i.test(branchName)) {
      cityKeywords.push('Kolkata', 'Calcutta', 'Howrah');
    } else if (/chennai|madras/i.test(branchCity) || /chennai|madras/i.test(branchName)) {
      cityKeywords.push('Chennai', 'Madras');
    } else if (/hyderabad|secunderabad/i.test(branchCity) || /hyderabad|secunderabad/i.test(branchName)) {
      cityKeywords.push('Hyderabad', 'Secunderabad');
    } else if (/ahmedabad/i.test(branchCity) || /ahmedabad/i.test(branchName)) {
      cityKeywords.push('Ahmedabad', 'Gandhinagar');
    }

    const uniqueCities = Array.from(new Set(cityKeywords));

    const siblingWhere = {
      organization_id: organizationId,
      [Op.or]: [
        { city: { [Op.in]: uniqueCities } },
      ],
    };
    if (/delhi/i.test(branchCity) || /delhi/i.test(branchName)) {
      siblingWhere[Op.or].push({ branch_name: { [Op.like]: '%Delhi%' } });
    }

    const siblings = await Branch.findAll({
      where: siblingWhere,
      attributes: ['id'],
      raw: true,
    });

    const matchedBranchIds = Array.from(new Set([branchId, ...siblings.map((s) => s.id)]));
    return { matchedBranchIds, cityKeywords: uniqueCities };
  } catch (err) {
    return { matchedBranchIds: [branchId], cityKeywords: [] };
  }
};

const listTrips = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search, sort_by, sort_order, from_date, to_date, branch_id, origin_branch_id, dest_branch_id, load_type } = req.query;
    const { Trip, Vehicle, Driver, Branch, Dispatch, Consignment } = req.tenantDb || defaultModels;
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
    if (load_type && ['FTL', 'PTL'].includes(load_type.toUpperCase())) {
      where.load_type = load_type.toUpperCase();
    }

    if (from_date && to_date) {
      where.trip_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.trip_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.trip_date = { [Op.lte]: to_date };
    }

    const andConditions = [];

    const userRoles = req.userRoles || [];
    const isOwnerOrAdmin =
      userRoles.includes('SUPER_ADMIN') ||
      userRoles.includes('TRANSPORT_OWNER') ||
      userRoles.includes('ADMIN') ||
      Boolean(req.user?.is_owner);
    const userBranchId = req.user?.branch_id || req.user?.branch?.id || null;

    let targetBranchId = null;
    if (!isOwnerOrAdmin && userBranchId) {
      // Non-admin branch staff and managers strictly see only their assigned branch's trips
      targetBranchId = userBranchId;
    } else if (branch_id && branch_id !== 'ALL') {
      targetBranchId = branch_id;
    }

    if (targetBranchId) {
      if (origin_branch_id && origin_branch_id !== 'ALL') {
        andConditions.push({ origin_branch_id: targetBranchId });
      } else if (dest_branch_id && dest_branch_id !== 'ALL') {
        andConditions.push({ dest_branch_id: targetBranchId });
      } else {
        // Show only trips generated in this branch (outbound) OR arriving in this branch (inbound)
        andConditions.push({
          [Op.or]: [
            { origin_branch_id: targetBranchId },
            { dest_branch_id: targetBranchId },
          ],
        });
      }
    } else {
      // Admin viewing network-wide trips across all branches
      if (origin_branch_id && origin_branch_id !== 'ALL') {
        andConditions.push({ origin_branch_id });
      }
      if (dest_branch_id && dest_branch_id !== 'ALL') {
        andConditions.push({ dest_branch_id });
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        [Op.or]: [
          { trip_number: { [Op.like]: `%${q}%` } },
          { origin_city: { [Op.like]: `%${q}%` } },
          { destination_city: { [Op.like]: `%${q}%` } },
          { '$vehicle.vehicle_number$': { [Op.like]: `%${q}%` } },
          { '$driver.name$': { [Op.like]: `%${q}%` } },
          { '$driver.phone$': { [Op.like]: `%${q}%` } },
          { '$originBranch.branch_name$': { [Op.like]: `%${q}%` } },
          { '$destBranch.branch_name$': { [Op.like]: `%${q}%` } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
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
    const findOptions = {
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[orderCol, orderDir]],
      distinct: true,
      col: 'id',
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'capacity_ton', 'vehicle_type', 'ownership'], required: false },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'], required: false },
        { model: Branch, as: 'originBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'is_hub'], required: false },
        { model: Branch, as: 'destBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'is_hub'], required: false },
        { model: Dispatch, as: 'dispatches', attributes: ['id', 'dispatch_number', 'seal_number'], required: false },
        {
          model: Consignment,
          as: 'consignments',
          attributes: ['id', 'docket_number', 'load_type'],
          through: { attributes: [] },
          required: false,
        },
      ],
    };

    if (search && search.trim()) {
      findOptions.subQuery = false;
    }

    const { count, rows } = await Trip.findAndCountAll(findOptions);

    const formattedRows = rows.map((trip) => {
      const tripJson = trip.toJSON ? trip.toJSON() : { ...trip };
      const hasFtlConsignment = Array.isArray(tripJson.consignments) && tripJson.consignments.some((c) => (c.load_type || '').toUpperCase() === 'FTL');
      const tripLoadType = (tripJson.load_type || (hasFtlConsignment ? 'FTL' : 'PTL')).toUpperCase();
      return {
        ...tripJson,
        load_type: tripLoadType,
      };
    });

    return paginatedResponse(res, 'Trips fetched successfully', formattedRows, {
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
    const { Trip, Vehicle, Driver, Branch, Consignment, Dispatch, Expense, ExpenseCategory, DriverAdvance, TripSettlement } = req.tenantDb || defaultModels;
    const include = [
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
    ];
    if (Expense) {
      include.push({
        model: Expense,
        as: 'expenses',
        include: ExpenseCategory ? [{ model: ExpenseCategory, as: 'category' }] : [],
      });
    }
    if (DriverAdvance) include.push({ model: DriverAdvance, as: 'advances' });
    if (TripSettlement) include.push({ model: TripSettlement, as: 'settlement' });

    const trip = await Trip.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include,
    });

    if (!trip) {
      return errorResponse(res, 'Trip not found', null, 404);
    }

    const tripJson = trip.toJSON ? trip.toJSON() : { ...trip };
    const consignmentRevenue = (tripJson.consignments || []).reduce((acc, c) => acc + Number(c.total_amount || 0), 0);
    const grossRevenue = Number(tripJson.expected_revenue) > 0 ? Number(tripJson.expected_revenue) : consignmentRevenue;
    const totalExpenses = (tripJson.expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalAdvances = (tripJson.advances || []).reduce((acc, a) => acc + Number(a.amount || 0), 0);
    const recordedExpenses = Number(tripJson.total_expenses || 0) + Number(tripJson.driver_advance || 0);
    const totalCost = (totalExpenses + totalAdvances) > 0 ? (totalExpenses + totalAdvances) : recordedExpenses;
    const netProfit = grossRevenue - totalCost;
    const marginPct = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(1)) : 0;

    tripJson.financial_summary = {
      grossRevenue,
      totalExpenses,
      totalAdvances,
      totalCost,
      netProfit,
      marginPct,
      isProfit: netProfit >= 0,
      balancePayableOrRefund: tripJson.settlement ? tripJson.settlement.balance_payable_or_receivable : (totalAdvances - totalExpenses),
    };

    return successResponse(res, 'Trip detail retrieved', tripJson);
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
      vehicle_charge = 0,
      hire_charges = 0,
    } = req.body;

    const parsedVehicleCharge = parseFloat(vehicle_charge !== undefined ? vehicle_charge : (hire_charges || 0)) || 0;

    if (!origin_branch_id || !dest_branch_id || !vehicle_id || !driver_id) {
      return errorResponse(res, 'Origin, destination, vehicle, and driver are required', null, 400);
    }

    // Verify driver branch assignment: If driver is assigned to a specific hub/branch, they can only be assigned to trips departing from that hub
    const assignedDriverRec = await Driver.findByPk(driver_id, { transaction });
    if (assignedDriverRec && assignedDriverRec.branch_id && assignedDriverRec.branch_id !== origin_branch_id) {
      const driverBranch = await Branch.findByPk(assignedDriverRec.branch_id, { transaction });
      return errorResponse(
        res,
        `Driver "${assignedDriverRec.name}" is registered at ${driverBranch?.branch_name || 'another hub'} and cannot be assigned to trips originating from this branch.`,
        null,
        400
      );
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
      models: req.tenantDb || defaultModels,
    });

    // Generate atomic Dispatch Number
    const { formattedNumber: dispatchNumber } = await generateNextNumber({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId: origin_branch_id,
      documentType: 'DISPATCH',
      transaction,
      models: req.tenantDb || defaultModels,
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

    // Determine load type: FTL if explicitly passed or if any consignment is FTL
    const isFtl = (req.body.load_type || '').toUpperCase() === 'FTL' || consignments.some((c) => (c.load_type || '').toUpperCase() === 'FTL');
    const resolvedLoadType = isFtl ? 'FTL' : 'PTL';

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
      load_type: resolvedLoadType,
      start_odometer: parseInt(start_odometer || 0, 10),
      driver_advance: parseFloat(driver_advance) || 0,
      total_packages: totalPkgs,
      total_weight: totalWeight,
      expected_revenue: totalFreight,
      vehicle_charge: parsedVehicleCharge,
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
      trip_number: trip.trip_number,
      dispatch_number: dispatch.dispatch_number,
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

    // Verify driver branch assignment
    if (driver_id && origin_branch_id) {
      const assignedDriverRec = await Driver.findByPk(driver_id);
      if (assignedDriverRec && assignedDriverRec.branch_id && assignedDriverRec.branch_id !== origin_branch_id) {
        const driverBranch = await Branch.findByPk(assignedDriverRec.branch_id);
        return errorResponse(
          res,
          `Driver "${assignedDriverRec.name}" is registered at ${driverBranch?.branch_name || 'another hub'} and cannot be assigned to trips originating from this branch.`,
          null,
          400
        );
      }
    }

    const { formattedNumber: tripNumber } = await generateNextNumber({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId: origin_branch_id || null,
      documentType: 'TRIP',
      models: req.tenantDb || defaultModels,
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

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'TRIP',
      entityId: newTrip.trip_number,
      entityName: `Trip #${newTrip.trip_number}`,
      summary: `Created Trip #${newTrip.trip_number} (${newTrip.origin_city} ➔ ${newTrip.destination_city}) with vehicle ${fullTrip?.vehicle?.vehicle_number || vehicle_id}`,
      newValues: {
        trip_number: newTrip.trip_number,
        origin: newTrip.origin_city,
        destination: newTrip.destination_city,
        vehicle_number: fullTrip?.vehicle?.vehicle_number,
        driver_advance: newTrip.driver_advance,
      },
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
      const originBranchId = trip.origin_branch_id;
      if (originBranchId) {
        const assignedDriverRec = await Driver.findByPk(driver_id);
        if (assignedDriverRec && assignedDriverRec.branch_id && assignedDriverRec.branch_id !== originBranchId) {
          const { Branch } = req.tenantDb || defaultModels;
          const driverBranch = Branch ? await Branch.findByPk(assignedDriverRec.branch_id) : null;
          return errorResponse(
            res,
            `Driver "${assignedDriverRec.name}" is registered at ${driverBranch?.branch_name || 'another hub'} and cannot be assigned to trips departing from this branch.`,
            null,
            400
          );
        }
      }
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

    logAudit({
      req,
      action: 'UPDATE',
      entityType: 'TRIP',
      entityId: trip.trip_number,
      entityName: `Trip #${trip.trip_number}`,
      summary: `Assigned vehicle ${updatedTrip?.vehicle?.vehicle_number || vehicle_id} to Trip #${trip.trip_number}`,
      newValues: {
        vehicle_number: updatedTrip?.vehicle?.vehicle_number,
        driver_name: updatedTrip?.driver?.name,
      },
    });

    return successResponse(res, 'Vehicle assigned to trip successfully', updatedTrip);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getTripUnloadManifest = async (req, res) => {
  try {
    const { id } = req.params;
    const { Trip, Vehicle, Driver, Branch, Consignment, Dispatch } = req.tenantDb || defaultModels;

    const trip = await Trip.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'vehicle_type', 'capacity_ton', 'ownership', 'current_odometer'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone', 'license_number'] },
        { model: Branch, as: 'originBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'state', 'phone'] },
        { model: Branch, as: 'destBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'state', 'phone'] },
        {
          model: Consignment,
          as: 'consignments',
          include: ['consignor', 'consignee'],
        },
        { model: Dispatch, as: 'dispatches', attributes: ['id', 'dispatch_number', 'dispatch_date', 'dispatch_time', 'seal_number', 'remarks'] },
      ],
    });

    if (!trip) {
      return errorResponse(res, 'Trip not found', null, 404);
    }

    return successResponse(res, 'Trip unload manifest retrieved successfully', trip);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const completeTripAndUnload = async (req, res) => {
  const activeSequelize = req.tenantSequelize || defaultModels.sequelize;
  const transaction = await activeSequelize.transaction();
  try {
    const { id } = req.params;
    const {
      end_odometer,
      received_seal_number,
      seal_status = 'INTACT', // 'INTACT' | 'MISMATCH' | 'BROKEN' | 'MISSING'
      unloading_bay = '',
      unloading_remarks = '',
      supervisor_name = '',
      docket_tallies = [], // [{ consignment_id, received_packages, condition, remarks }]
    } = req.body;

    const { Trip, TripConsignment, Consignment, Vehicle, Driver, Branch, ConsignmentStatusHistory } = req.tenantDb || defaultModels;

    const trip = await Trip.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver' },
        { model: Branch, as: 'destBranch' },
        { model: Consignment, as: 'consignments' },
      ],
      transaction,
    });

    if (!trip) {
      await transaction.rollback();
      return errorResponse(res, 'Trip not found', null, 404);
    }

    if (trip.status === 'COMPLETED') {
      await transaction.rollback();
      return errorResponse(res, 'Trip is already marked as completed and unloaded', null, 400);
    }

    const endOdo = end_odometer !== undefined && end_odometer !== null && end_odometer !== ''
      ? parseInt(end_odometer, 10)
      : trip.start_odometer;

    if (endOdo < trip.start_odometer) {
      await transaction.rollback();
      return errorResponse(res, `Arrival odometer (${endOdo} KM) cannot be less than departure odometer (${trip.start_odometer} KM)`, null, 400);
    }

    // 1. Update Trip
    const arrivalTime = new Date();
    const completionNotes = [
      trip.remarks,
      `[UNLOAD & GATE-IN] Seal: ${received_seal_number || 'N/A'} (${seal_status}). Bay: ${unloading_bay || 'Standard'}. Supervisor: ${supervisor_name || req.user?.name || 'Staff'}. Notes: ${unloading_remarks || 'None'}`,
    ].filter(Boolean).join('\n');

    await trip.update({
      status: 'COMPLETED',
      end_odometer: endOdo,
      end_time: arrivalTime,
      remarks: completionNotes,
    }, { transaction });

    // 2. Update Vehicle - available in destination yard
    if (trip.vehicle_id) {
      const vehicleUpdate = {
        status: 'AVAILABLE',
        current_odometer: endOdo,
      };
      if (trip.dest_branch_id && trip.vehicle?.ownership !== 'MARKET') {
        vehicleUpdate.branch_id = trip.dest_branch_id;
      }
      await Vehicle.update(vehicleUpdate, {
        where: { id: trip.vehicle_id },
        transaction,
      });
    }

    // 3. Update Driver - active
    if (trip.driver_id) {
      await Driver.update({ status: 'ACTIVE' }, {
        where: { id: trip.driver_id },
        transaction,
      });
    }

    // 4. Update TripConsignment unload timestamp
    await TripConsignment.update({
      unloaded_at: arrivalTime,
    }, {
      where: { trip_id: trip.id },
      transaction,
    });

    // 5. Update loaded consignments & record timeline history
    const tallyMap = new Map();
    if (Array.isArray(docket_tallies)) {
      docket_tallies.forEach((t) => {
        if (t.consignment_id) tallyMap.set(t.consignment_id, t);
      });
    }

    const consignments = trip.consignments || [];
    let tallySummary = { total: consignments.length, good: 0, damaged: 0, short: 0 };

    for (const c of consignments) {
      const tally = tallyMap.get(c.id);
      const isBranchMatch = Boolean(c.dest_branch_id && String(c.dest_branch_id) === String(trip.dest_branch_id));
      const isCityMatch = Boolean(
        (c.destination_city && trip.destBranch?.city && c.destination_city.trim().toLowerCase() === trip.destBranch.city.trim().toLowerCase()) ||
        (c.destination_city && trip.destination_city && c.destination_city.trim().toLowerCase() === trip.destination_city.trim().toLowerCase())
      );
      const isFinalDestination = isBranchMatch || (!c.dest_branch_id && isCityMatch);
      let newStatus = isFinalDestination ? 'REACHED_DESTINATION' : 'RECEIVED_AT_HUB';
      let tallyRemarks = isFinalDestination
        ? `Arrived at destination branch (${trip.destBranch?.branch_name || 'Destination'}). Gate seal: ${received_seal_number || 'N/A'} [${seal_status}]. Ready for local customer delivery.`
        : `Arrived at transshipment hub (${trip.destBranch?.branch_name || 'Hub'}). Gate seal: ${received_seal_number || 'N/A'} [${seal_status}]. Staged for onward transit to final destination.`;

      if (tally) {
        if (tally.condition === 'DAMAGED') {
          newStatus = 'DAMAGED';
          tallySummary.damaged += 1;
          tallyRemarks += ` Cargo condition: DAMAGED. Remarks: ${tally.remarks || 'Package damage observed during unload.'}`;
        } else if (tally.condition === 'SHORTAGE' || (tally.received_packages !== undefined && tally.received_packages < c.packages_count)) {
          newStatus = 'SHORT_MATERIAL';
          tallySummary.short += 1;
          tallyRemarks += ` Shortage detected: Received ${tally.received_packages ?? 'less'} of ${c.packages_count} pkgs. Remarks: ${tally.remarks || 'Material short.'}`;
        } else {
          tallySummary.good += 1;
          if (tally.remarks) tallyRemarks += ` Remarks: ${tally.remarks}`;
        }
      } else {
        tallySummary.good += 1;
      }

      await c.update({
        status: newStatus,
        current_branch_id: trip.dest_branch_id,
        // Only set dest_branch_id if the consignment was missing one; NEVER overwrite existing final destination branch!
        dest_branch_id: c.dest_branch_id || trip.dest_branch_id,
      }, { transaction });

      await ConsignmentStatusHistory.create({
        consignment_id: c.id,
        status: newStatus,
        location: trip.destBranch ? trip.destBranch.city : (isFinalDestination ? 'Destination Branch' : 'Transshipment Hub'),
        branch_id: trip.dest_branch_id,
        user_id: req.user?.id || null,
        remarks: tallyRemarks,
        timestamp: arrivalTime,
      }, { transaction });
    }

    await transaction.commit();

    logAudit({
      req,
      action: 'COMPLETE_UNLOAD',
      entityType: 'TRIP',
      entityId: trip.trip_number,
      entityName: `Trip ${trip.trip_number}`,
      summary: `Completed Inbound Trip #${trip.trip_number} & unloaded at ${trip.destBranch?.branch_name || 'Destination'}. Seal: ${received_seal_number || 'N/A'} (${seal_status}), Distance: ${endOdo - trip.start_odometer} KM`,
      newValues: {
        trip_number: trip.trip_number,
        end_odometer: endOdo,
        km_run: endOdo - trip.start_odometer,
        seal_status,
        received_seal_number,
        tallySummary,
      },
    });

    return successResponse(res, 'Trip completed and consignments unloaded successfully', {
      trip_id: trip.id,
      trip_number: trip.trip_number,
      km_run: endOdo - trip.start_odometer,
      seal_status,
      tallySummary,
      completed_at: arrivalTime,
    });
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

const recordTripArrival = async (req, res) => {
  const activeSequelize = req.tenantSequelize || defaultModels.sequelize;
  const transaction = await activeSequelize.transaction();
  try {
    const { id } = req.params;
    const {
      end_odometer,
      received_seal_number,
      seal_status = 'INTACT', // 'INTACT' | 'MISMATCH' | 'BROKEN' | 'MISSING'
      dock_bay = '',
      remarks = '',
      arrival_time,
      discrepancy_reason = '',
    } = req.body;

    const { Trip, Branch, Consignment, ConsignmentStatusHistory } = req.tenantDb || defaultModels;

    const trip = await Trip.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Branch, as: 'destBranch' },
        { model: Consignment, as: 'consignments' },
      ],
      transaction,
    });

    if (!trip) {
      await transaction.rollback();
      return errorResponse(res, 'Trip not found', null, 404);
    }

    if (trip.status === 'COMPLETED') {
      await transaction.rollback();
      return errorResponse(res, 'Trip is already completed', null, 400);
    }

    const endOdo = end_odometer ? parseInt(end_odometer, 10) : trip.start_odometer;
    if (endOdo < trip.start_odometer) {
      await transaction.rollback();
      return errorResponse(res, `Arrival odometer (${endOdo} KM) cannot be less than departure odometer (${trip.start_odometer} KM)`, null, 400);
    }

    const gateInTime = arrival_time ? new Date(arrival_time) : new Date();
    const kmRun = endOdo - trip.start_odometer;
    const discText = discrepancy_reason ? ` | Discrepancy: ${discrepancy_reason}` : '';
    const gateNote = `[GATE-IN ARRIVAL] Time: ${gateInTime.toISOString()} | Seal: ${received_seal_number || 'N/A'} (${seal_status})${discText} | End Odo: ${endOdo} KM (+${kmRun} KM) | Bay: ${dock_bay || 'Bay 1'} | Notes: ${remarks || 'None'}`;

    const updatedRemarks = [trip.remarks, gateNote].filter(Boolean).join('\n');

    await trip.update({
      end_odometer: endOdo,
      remarks: updatedRemarks,
    }, { transaction });

    // Record timeline entry for loaded consignments: arrived at destination hub gate
    const consignments = trip.consignments || [];
    for (const c of consignments) {
      await ConsignmentStatusHistory.create({
        consignment_id: c.id,
        status: 'IN_TRANSIT',
        location: trip.destBranch ? trip.destBranch.city : 'Destination Hub Gate',
        branch_id: trip.dest_branch_id,
        user_id: req.user?.id || null,
        remarks: `Vehicle arrived at destination hub gate (${trip.destBranch?.branch_name || 'Hub'}). Seal verification: ${received_seal_number || 'N/A'} [${seal_status}]. Ready for dock bay unload.`,
        timestamp: gateInTime,
      }, { transaction });
    }

    await transaction.commit();

    logAudit({
      req,
      action: 'GATE_IN_ARRIVAL',
      entityType: 'TRIP',
      entityId: trip.trip_number,
      entityName: `Trip ${trip.trip_number}`,
      summary: `Recorded Gate-In Arrival for Trip #${trip.trip_number} at ${trip.destBranch?.branch_name || 'Destination'}. Seal: ${received_seal_number} (${seal_status}), Odo: ${endOdo} KM`,
      newValues: {
        trip_number: trip.trip_number,
        end_odometer: endOdo,
        km_run: kmRun,
        received_seal_number,
        seal_status,
        dock_bay,
      },
    });

    return successResponse(res, 'Gate-In arrival details recorded successfully', {
      trip_id: trip.id,
      trip_number: trip.trip_number,
      end_odometer: endOdo,
      km_run: kmRun,
      is_arrived: true,
      seal_status,
      gate_in_time: gateInTime,
    });
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

const completeFtlDelivery = async (req, res) => {
  const activeSequelize = req.tenantSequelize || defaultModels.sequelize;
  const transaction = await activeSequelize.transaction();
  try {
    const { id } = req.params;
    const {
      end_odometer,
      receiver_name,
      receiver_phone,
      delivery_date,
      pod_file_url,
      pod_number,
      pod_doc_type,
      delivery_remarks,
      received_seal_number,
      seal_status,
      discrepancy_reason,
      cargo_condition,
    } = req.body;

    const { Trip, TripConsignment, Consignment, Vehicle, Driver, Branch, ConsignmentStatusHistory, DeliveryRecord, Pod } = req.tenantDb || defaultModels;

    const trip = await Trip.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver' },
        { model: Branch, as: 'destBranch' },
        { model: Consignment, as: 'consignments' },
      ],
      transaction,
    });

    if (!trip) {
      await transaction.rollback();
      return errorResponse(res, 'Trip not found', null, 404);
    }

    if (trip.status === 'COMPLETED') {
      await transaction.rollback();
      return errorResponse(res, 'Trip is already marked as completed', null, 400);
    }

    const endOdo = end_odometer !== undefined && end_odometer !== null && end_odometer !== ''
      ? parseInt(end_odometer, 10)
      : trip.start_odometer;

    if (endOdo < trip.start_odometer) {
      await transaction.rollback();
      return errorResponse(res, `Delivery odometer (${endOdo} KM) cannot be less than departure odometer (${trip.start_odometer} KM)`, null, 400);
    }

    const deliveryTime = delivery_date ? new Date(delivery_date) : new Date();
    const kmRun = endOdo - (trip.start_odometer || 0);

    const sealFlag = seal_status === 'BROKEN' ? '(BROKEN)' : seal_status === 'MISMATCH' ? '(MISMATCH)' : '';
    const sealNote = `Seal: ${received_seal_number || 'N/A'} [${seal_status || 'INTACT'}]${sealFlag ? ` ${sealFlag}` : ''}${discrepancy_reason ? ` | Discrepancy: ${discrepancy_reason}` : ''}${cargo_condition && cargo_condition !== 'INTACT' ? ` | Cargo Condition: ${cargo_condition}` : ''}`;

    const completionNotes = [
      trip.remarks,
      `[DIRECT FTL CLIENT DELIVERY] ${sealNote}`,
      `Delivered to: ${receiver_name || 'Customer'} (${receiver_phone || 'N/A'}). End Odo: ${endOdo} KM (+${kmRun} KM). POD Ref: ${pod_number || 'Signed Copy'}${pod_doc_type ? ` [${pod_doc_type}]` : ''}. Notes: ${delivery_remarks || 'Material handed over in good condition.'}`,
    ].filter(Boolean).join('\n');

    // 1. Complete Trip
    await trip.update({
      status: 'COMPLETED',
      end_odometer: endOdo,
      end_time: deliveryTime,
      remarks: completionNotes,
    }, { transaction });

    // 2. Free up Vehicle
    if (trip.vehicle_id) {
      await Vehicle.update({
        status: 'AVAILABLE',
        current_odometer: endOdo,
      }, {
        where: { id: trip.vehicle_id },
        transaction,
      });
    }

    // 3. Free up Driver
    if (trip.driver_id) {
      await Driver.update({ status: 'ACTIVE' }, {
        where: { id: trip.driver_id },
        transaction,
      });
    }

    // 4. Update TripConsignment unload timestamp
    await TripConsignment.update({
      unloaded_at: deliveryTime,
    }, {
      where: { trip_id: trip.id },
      transaction,
    });

    // 5. Update loaded FTL consignments directly to DELIVERED or POD_UPLOADED
    const consignments = trip.consignments || [];
    const consignmentFinalStatus = pod_file_url ? 'POD_UPLOADED' : 'DELIVERED';

    for (const c of consignments) {
      await c.update({
        status: consignmentFinalStatus,
        delivered_at: deliveryTime,
      }, { transaction });

      // Create Delivery Record
      if (DeliveryRecord) {
        await DeliveryRecord.create({
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          consignment_id: c.id,
          branch_id: c.dest_branch_id || trip.dest_branch_id || trip.origin_branch_id,
          delivery_date: deliveryTime,
          receiver_name: receiver_name || 'Client Representative',
          receiver_phone: receiver_phone || '',
          delivered_packages: c.packages_count,
          damaged_packages: (cargo_condition === 'SEVERE_DAMAGE' || cargo_condition === 'MINOR_DAMAGE') ? 1 : 0,
          short_packages: 0,
          delivery_photo_url: pod_file_url || null,
          remarks: `[DIRECT FTL CLIENT DELIVERY] ${sealNote}. ${delivery_remarks || 'Delivered directly to client destination.'}`,
          delivered_by: req.user?.id,
        }, { transaction }).catch(() => {});
      }

      // Create or update POD record if file attached
      if (Pod && pod_file_url) {
        try {
          const isPdf = typeof pod_file_url === 'string' && pod_file_url.includes('application/pdf');
          await Pod.create({
            tenant_id: req.tenant.tenantId,
            organization_id: req.tenant.organizationId,
            consignment_id: c.id,
            file_url: pod_file_url,
            file_type: isPdf ? 'application/pdf' : 'image/jpeg',
            receiver_name: (receiver_name || 'Consignee').trim(),
            status: 'POD_UPLOADED',
            uploaded_at: deliveryTime,
            uploaded_by: req.user?.id || null,
            document_type: pod_doc_type || 'SIGNED_BILTY',
            remarks: `Direct FTL Delivery POD for Trip #${trip.trip_number}. Ref: ${pod_number || 'N/A'}`,
          }, { transaction }).catch((err) => console.warn('FTL Pod creation error', err));
        } catch (e) {
          console.warn('FTL Pod error', e);
        }
      }

      if (ConsignmentStatusHistory) {
        await ConsignmentStatusHistory.create({
          consignment_id: c.id,
          status: consignmentFinalStatus,
          location: trip.destination_city || (trip.destBranch ? trip.destBranch.city : 'Client Destination Site'),
          branch_id: trip.dest_branch_id || trip.origin_branch_id,
          user_id: req.user?.id || null,
          remarks: `Direct FTL delivery completed to ${receiver_name || 'Customer'}. End Odo: ${endOdo} KM (+${kmRun} KM run). ${sealNote}`,
          timestamp: deliveryTime,
        }, { transaction });
      }
    }

    await transaction.commit();

    logAudit({
      req,
      action: 'COMPLETE_FTL_DELIVERY',
      entityType: 'TRIP',
      entityId: trip.trip_number,
      entityName: `Trip ${trip.trip_number}`,
      summary: `Completed Direct FTL Delivery for Trip #${trip.trip_number} to ${receiver_name || 'Consignee'} (${consignments.length} dockets, End Odo: ${endOdo} KM)`,
      newValues: {
        trip_number: trip.trip_number,
        end_odometer: endOdo,
        km_run: kmRun,
        receiver_name,
        receiver_phone,
      },
    });

    return successResponse(res, 'Direct FTL delivery completed successfully', {
      trip_id: trip.id,
      trip_number: trip.trip_number,
      km_run: kmRun,
      completed_at: deliveryTime,
      delivered_consignments_count: consignments.length,
    });
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listTrips,
  getTripDetail,
  createTripAndDispatch,
  createTrip,
  assignVehicleToTrip,
  getTripUnloadManifest,
  completeTripAndUnload,
  recordTripArrival,
  completeFtlDelivery,
};
