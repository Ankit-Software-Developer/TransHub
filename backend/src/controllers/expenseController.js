// src/controllers/expenseController.js
const defaultModels = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { roundToTwo } = require('../utils/decimalUtils');
const { logAudit } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const DEFAULT_CATEGORIES = [
  // Bucket 1: Trip & Fleet Direct Running Costs
  { name: 'Fuel & Diesel', code: 'FUEL', is_trip_expense: true },
  { name: 'FASTag & Toll Plaza', code: 'TOLL', is_trip_expense: true },
  { name: 'Driver Bhatta & Daily Allowance', code: 'DRIVER_BHATTA', is_trip_expense: true },
  { name: 'Hamali & Loading/Unloading Labor', code: 'HAMALI', is_trip_expense: true },
  { name: 'Weighbridge (Kanta Parchi)', code: 'WEIGHBRIDGE', is_trip_expense: true },
  { name: 'Vehicle Running Repair & Puncture', code: 'REPAIR', is_trip_expense: true },
  { name: 'Green Tax & State Entry Cess', code: 'ENTRY_TAX', is_trip_expense: true },
  { name: 'Police & RTO Formalities', code: 'RTO_EXPENSE', is_trip_expense: true },

  // Bucket 2: Branch & Godown Overheads
  { name: 'Branch & Godown Rent', code: 'BRANCH_RENT', is_trip_expense: false },
  { name: 'LR Stationery & Barcode Rolls', code: 'STATIONERY', is_trip_expense: false },
  { name: 'Electricity & Water Utilities', code: 'UTILITIES', is_trip_expense: false },
  { name: 'Local Cartage & Pickup Van Hire', code: 'LOCAL_CARTAGE', is_trip_expense: false },
  { name: 'Office Tea & Miscellaneous', code: 'OFFICE_MISC', is_trip_expense: false },
  { name: 'Warehouse Maintenance & Packaging', code: 'GODOWN_MAINT', is_trip_expense: false },
];

/**
 * Helper to determine effective branch scope:
 * - Admin can view 'ALL' or filter by any branch.
 * - Non-admin is strictly restricted to login branch.
 */
const getEffectiveBranch = (req, requestedBranchId) => {
  const isGlobalUser = Boolean(
    req.user?.is_owner ||
    req.user?.isAdmin ||
    ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(req.user?.role) ||
    (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r))) ||
    (req.user?.roles && req.user?.roles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r.name || r)))
  );

  const userAssignedBranch = req.user?.branch_id || req.branchId;

  // Non-admin / Branch Manager is STRICTLY locked to their assigned login branch only!
  if (!isGlobalUser) {
    return userAssignedBranch || '00000000-0000-0000-0000-000000000000';
  }

  if (!requestedBranchId || requestedBranchId === 'ALL' || requestedBranchId === 'undefined' || requestedBranchId === 'null' || String(requestedBranchId).trim() === '') {
    return null;
  }

  return requestedBranchId;
};

/**
 * Seed default categories if table is empty
 */
const ensureDefaultCategories = async (ExpenseCategory, tenantId) => {
  if (!ExpenseCategory) return;
  try {
    const count = await ExpenseCategory.count();
    if (count === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await ExpenseCategory.create({
          ...cat,
          tenant_id: tenantId || null,
        });
      }
    }
  } catch (err) {
    console.warn('Category seed notice:', err.message);
  }
};

/**
 * List expenses with pagination, search, branch scoping and category grouping
 */
const listExpenses = async (req, res) => {
  try {
    const { Expense, ExpenseCategory, Trip, Vehicle, Driver, Branch } = req.tenantDb || defaultModels;
    const {
      trip_id,
      vehicle_id,
      driver_id,
      category_id,
      branch_id,
      expense_type, // 'TRIP_DIRECT' | 'BRANCH_OVERHEAD' | 'ALL'
      payment_method,
      search,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = req.query;

    await ensureDefaultCategories(ExpenseCategory, req.tenant?.tenantId);

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    const andConditions = [];

    if (effectiveBranchId) {
      let branchTripIds = [];
      if (Trip) {
        const branchTrips = await Trip.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            [Op.or]: [
              { origin_branch_id: effectiveBranchId },
              { dest_branch_id: effectiveBranchId },
            ],
          },
          attributes: ['id'],
        });
        branchTripIds = branchTrips.map((t) => t.id);
      }

      if (branchTripIds.length > 0) {
        andConditions.push({
          [Op.or]: [
            { branch_id: effectiveBranchId },
            { trip_id: { [Op.in]: branchTripIds } },
          ],
        });
      } else {
        where.branch_id = effectiveBranchId;
      }
    }

    if (trip_id) where.trip_id = trip_id;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (driver_id) where.driver_id = driver_id;
    if (category_id && category_id !== 'ALL') where.category_id = category_id;
    if (payment_method && payment_method !== 'ALL') where.payment_method = payment_method;

    if (from_date && to_date) {
      where.expense_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.expense_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.expense_date = { [Op.lte]: to_date };
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      andConditions.push({
        [Op.or]: [
          { remarks: { [Op.iLike]: q } },
          { vendor_name: { [Op.iLike]: q } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const categoryWhere = {};
    if (expense_type === 'TRIP_DIRECT') {
      categoryWhere.is_trip_expense = true;
    } else if (expense_type === 'BRANCH_OVERHEAD') {
      categoryWhere.is_trip_expense = false;
    }

    const includeList = [];
    if (ExpenseCategory) {
      includeList.push({
        model: ExpenseCategory,
        as: 'category',
        where: Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined,
        required: Object.keys(categoryWhere).length > 0,
      });
    }
    if (Trip) {
      includeList.push({
        model: Trip,
        as: 'trip',
        attributes: [
          'id',
          'trip_number',
          'status',
          'expected_revenue',
          'total_expenses',
          'driver_advance',
          'settlement_status',
          'origin_city',
          'destination_city',
        ],
      });
    }
    if (Vehicle) includeList.push({ model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'vehicle_type', 'ownership'] });
    if (Driver) includeList.push({ model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] });
    if (Branch) includeList.push({ model: Branch, as: 'branch', attributes: ['id', 'branch_name', 'branch_code', 'city'] });

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Expense.findAndCountAll({
      where,
      include: includeList,
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true,
    });

    const enrichedRows = rows.map((r) => {
      const rowJson = r.toJSON ? r.toJSON() : { ...r };
      const trip = rowJson.trip;
      if (trip) {
        const grossRevenue = Number(trip.expected_revenue || 0);
        const totalExpenses = Number(trip.total_expenses || 0);
        const driverAdvance = Number(trip.driver_advance || 0);
        const totalDriveSpend = totalExpenses + driverAdvance;
        const netProfitLoss = grossRevenue - totalDriveSpend;
        const marginPct = grossRevenue > 0 ? Number(((netProfitLoss / grossRevenue) * 100).toFixed(1)) : 0;

        rowJson.trip_financials = {
          grossRevenue,
          totalExpenses,
          driverAdvance,
          totalDriveSpend,
          netProfitLoss,
          marginPct,
          isProfit: netProfitLoss >= 0,
        };
      }
      return rowJson;
    });

    // Compute quick page totals
    const totalAmount = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return paginatedResponse(res, 'Expenses fetched successfully', enrichedRows, {
      page: pageNum,
      limit: limitNum,
      total: count,
      pages: Math.ceil(count / limitNum),
      summary: {
        pageTotalAmount: roundToTwo(totalAmount),
      },
    });
  } catch (error) {
    console.error('listExpenses error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Record a new operational or branch expense
 */
const createExpense = async (req, res) => {
  try {
    const { Expense, ExpenseCategory, Trip, Vehicle } = req.tenantDb || defaultModels;
    let {
      category_id,
      amount,
      expense_date,
      trip_id,
      vehicle_id,
      driver_id,
      branch_id,
      payment_method,
      vendor_name,
      remarks,
      receipt_url,
    } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return errorResponse(res, 'Valid positive expense amount is required', null, 400);
    }

    await ensureDefaultCategories(ExpenseCategory, req.tenant?.tenantId);

    // Resolve category
    if (!category_id && ExpenseCategory) {
      const defaultCat = await ExpenseCategory.findOne({ where: { name: 'Miscellaneous' } }) || await ExpenseCategory.findOne();
      if (defaultCat) category_id = defaultCat.id;
    } else if (category_id && ExpenseCategory) {
      const catByName = await ExpenseCategory.findOne({ where: { name: category_id } });
      if (catByName) category_id = catByName.id;
    }

    if (!category_id && ExpenseCategory) {
      const [newCat] = await ExpenseCategory.findOrCreate({
        where: { name: 'Trip Expense' },
        defaults: { name: 'Trip Expense', code: 'TRIP_MISC', is_trip_expense: true }
      });
      category_id = newCat.id;
    }

    // Auto-fill vehicle, driver, and branch from trip if linked
    if (trip_id && (!vehicle_id || !driver_id || !branch_id) && Trip) {
      const tripRecord = await Trip.findByPk(trip_id);
      if (tripRecord) {
        if (!vehicle_id) vehicle_id = tripRecord.vehicle_id;
        if (!driver_id) driver_id = tripRecord.driver_id;
        if (!branch_id) branch_id = tripRecord.origin_branch_id;
      }
    }

    const isGlobalUser = Boolean(
      req.user?.is_owner ||
      req.user?.isAdmin ||
      ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(req.user?.role) ||
      (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r))) ||
      (req.user?.roles && req.user?.roles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r.name || r)))
    );

    let effectiveBranch;
    if (!isGlobalUser) {
      // Branch Manager / non-admin user is strictly locked to their assigned login branch
      effectiveBranch = req.user?.branch_id || req.branchId;
      if (!effectiveBranch) {
        return errorResponse(res, 'Access denied: You do not have an assigned login branch. Please contact administrator.', null, 403);
      }
    } else {
      effectiveBranch = branch_id || req.branchId || req.user?.branch_id;
      if (!effectiveBranch && Branch) {
        const defaultBranch = await Branch.findOne({
          where: { tenant_id: req.tenant.tenantId },
          order: [['created_at', 'ASC']],
        });
        if (defaultBranch) effectiveBranch = defaultBranch.id;
      }
    }

    const expense = await Expense.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_id: effectiveBranch,
      category_id,
      amount: parseFloat(amount),
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
      trip_id: trip_id || null,
      vehicle_id: vehicle_id || null,
      driver_id: driver_id || null,
      payment_method: payment_method || 'CASH',
      vendor_name: vendor_name || '',
      remarks: remarks || '',
      receipt_url: receipt_url || '',
      created_by: req.user.id,
    });

    // Update trip total_expenses if linked
    if (trip_id && Trip) {
      await Trip.increment({ total_expenses: parseFloat(amount) }, { where: { id: trip_id } });
    }

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      entityName: `Expense ₹${expense.amount}`,
      summary: `Logged expense of ₹${expense.amount} (${expense.payment_method}) - ${expense.remarks || 'Operational expense'}`,
      newValues: expense.toJSON ? expense.toJSON() : expense,
    });

    return successResponse(res, 'Expense recorded successfully', expense, 201);
  } catch (error) {
    console.error('createExpense error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Delete / void an expense and adjust trip total_expenses
 */
const deleteExpense = async (req, res) => {
  try {
    const { Expense, Trip } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const expense = await Expense.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
      },
    });

    if (!expense) {
      return errorResponse(res, 'Expense record not found', null, 404);
    }

    const isGlobalUser = Boolean(
      req.user?.is_owner ||
      req.user?.isAdmin ||
      ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(req.user?.role) ||
      (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r))) ||
      (req.user?.roles && req.user?.roles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r.name || r)))
    );

    if (!isGlobalUser) {
      const userBranch = req.user?.branch_id || req.branchId;
      if (!userBranch || expense.branch_id !== userBranch) {
        return errorResponse(res, 'Access denied: You can only void expenses belonging to your assigned branch', null, 403);
      }
    }

    if (expense.trip_id && Trip) {
      await Trip.decrement({ total_expenses: parseFloat(expense.amount || 0) }, { where: { id: expense.trip_id } });
    }

    await expense.destroy();

    logAudit({
      req,
      action: 'DELETE',
      entityType: 'EXPENSE',
      entityId: id,
      entityName: `Expense ₹${expense.amount}`,
      summary: `Deleted expense voucher of ₹${expense.amount}`,
    });

    return successResponse(res, 'Expense deleted successfully');
  } catch (error) {
    console.error('deleteExpense error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Executive KPI summary for expenses & fuel efficiency
 */
const getExpenseSummary = async (req, res) => {
  try {
    const { Expense, ExpenseCategory, FuelEntry, DriverAdvance, Trip, Vehicle, Driver } = req.tenantDb || defaultModels;
    const { branch_id, from_date, to_date } = req.query;

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    let branchTripIds = [];
    let branchVehicleIds = [];
    let branchDriverIds = [];

    if (effectiveBranchId) {
      if (Trip) {
        const bTrips = await Trip.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            [Op.or]: [
              { origin_branch_id: effectiveBranchId },
              { dest_branch_id: effectiveBranchId },
            ],
          },
          attributes: ['id'],
        });
        branchTripIds = bTrips.map((t) => t.id);
      }

      if (Vehicle) {
        const bVehicles = await Vehicle.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            branch_id: effectiveBranchId,
          },
          attributes: ['id'],
        });
        branchVehicleIds = bVehicles.map((v) => v.id);
      }

      if (Driver) {
        const bDrivers = await Driver.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            branch_id: effectiveBranchId,
          },
          attributes: ['id'],
        });
        branchDriverIds = bDrivers.map((d) => d.id);
      }
    }

    const expenseWhere = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (effectiveBranchId) {
      if (branchTripIds.length > 0) {
        expenseWhere[Op.or] = [
          { branch_id: effectiveBranchId },
          { trip_id: { [Op.in]: branchTripIds } },
        ];
      } else {
        expenseWhere.branch_id = effectiveBranchId;
      }
    }

    if (from_date && to_date) {
      expenseWhere.expense_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      expenseWhere.expense_date = { [Op.gte]: from_date };
    } else if (to_date) {
      expenseWhere.expense_date = { [Op.lte]: to_date };
    }

    // Fetch all expenses in scope with category
    const allExpenses = await Expense.findAll({
      where: expenseWhere,
      include: ExpenseCategory ? [{ model: ExpenseCategory, as: 'category' }] : [],
    });

    let totalOutflows = 0;
    let tripDirectExpenses = 0;
    let branchOverheads = 0;
    const categoryBreakdown = {};

    allExpenses.forEach((exp) => {
      const amt = parseFloat(exp.amount || 0);
      totalOutflows += amt;

      const isTrip = exp.category ? Boolean(exp.category.is_trip_expense) : Boolean(exp.trip_id);
      if (isTrip) {
        tripDirectExpenses += amt;
      } else {
        branchOverheads += amt;
      }

      const catName = exp.category?.name || 'Uncategorized';
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { name: catName, total: 0, count: 0, is_trip: isTrip };
      }
      categoryBreakdown[catName].total += amt;
      categoryBreakdown[catName].count += 1;
    });

    // Fuel Stats
    const fuelWhere = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    if (effectiveBranchId) {
      const fuelOr = [];
      if (branchTripIds.length > 0) fuelOr.push({ trip_id: { [Op.in]: branchTripIds } });
      if (branchVehicleIds.length > 0) fuelOr.push({ vehicle_id: { [Op.in]: branchVehicleIds } });
      if (fuelOr.length > 0) {
        fuelWhere[Op.or] = fuelOr;
      } else {
        fuelWhere.id = '00000000-0000-0000-0000-000000000000';
      }
    }

    if (from_date && to_date) {
      fuelWhere.fuel_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      fuelWhere.fuel_date = { [Op.gte]: from_date };
    } else if (to_date) {
      fuelWhere.fuel_date = { [Op.lte]: to_date };
    }

    let totalFuelAmount = 0;
    let totalFuelLitres = 0;
    let fuelEntriesCount = 0;

    if (FuelEntry) {
      const fuelEntries = await FuelEntry.findAll({
        where: fuelWhere,
        order: [['odometer_reading', 'ASC']],
      });

      fuelEntriesCount = fuelEntries.length;
      fuelEntries.forEach((f) => {
        totalFuelAmount += parseFloat(f.total_amount || 0);
        totalFuelLitres += parseFloat(f.litres || 0);
      });
    }

    // Driver Advances
    let totalDriverAdvances = 0;
    if (DriverAdvance) {
      const advanceWhere = {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      };

      if (effectiveBranchId) {
        const advOr = [];
        if (branchTripIds.length > 0) advOr.push({ trip_id: { [Op.in]: branchTripIds } });
        if (branchDriverIds.length > 0) advOr.push({ driver_id: { [Op.in]: branchDriverIds } });
        if (advOr.length > 0) {
          advanceWhere[Op.or] = advOr;
        } else {
          advanceWhere.id = '00000000-0000-0000-0000-000000000000';
        }
      }

      if (from_date && to_date) {
        advanceWhere.disbursed_date = { [Op.between]: [from_date, to_date] };
      } else if (from_date) {
        advanceWhere.disbursed_date = { [Op.gte]: from_date };
      } else if (to_date) {
        advanceWhere.disbursed_date = { [Op.lte]: to_date };
      }

      const advances = await DriverAdvance.findAll({ where: advanceWhere });
      totalDriverAdvances = advances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    }

    const avgFuelRate = totalFuelLitres > 0 ? roundToTwo(totalFuelAmount / totalFuelLitres) : 0;

    return successResponse(res, 'Expense summary calculated', {
      totalOutflows: roundToTwo(totalOutflows),
      tripDirectExpenses: roundToTwo(tripDirectExpenses),
      branchOverheads: roundToTwo(branchOverheads),
      totalFuelAmount: roundToTwo(totalFuelAmount),
      totalFuelLitres: roundToTwo(totalFuelLitres),
      avgFuelRate,
      fuelEntriesCount,
      totalDriverAdvances: roundToTwo(totalDriverAdvances),
      categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.total - a.total),
    });
  } catch (error) {
    console.error('getExpenseSummary error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * List Fuel Entries with dynamic KMPL efficiency calculation
 */
const listFuelLogs = async (req, res) => {
  try {
    const { FuelEntry, Vehicle, Trip, Driver } = req.tenantDb || defaultModels;
    const { vehicle_id, trip_id, branch_id, from_date, to_date, page = 1, limit = 20 } = req.query;

    if (!FuelEntry) {
      return successResponse(res, 'Fuel logs', []);
    }

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (vehicle_id && vehicle_id !== 'ALL') where.vehicle_id = vehicle_id;
    if (trip_id) where.trip_id = trip_id;

    if (effectiveBranchId) {
      let branchTripIds = [];
      let branchVehicleIds = [];

      if (Trip) {
        const bTrips = await Trip.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            [Op.or]: [
              { origin_branch_id: effectiveBranchId },
              { dest_branch_id: effectiveBranchId },
            ],
          },
          attributes: ['id'],
        });
        branchTripIds = bTrips.map((t) => t.id);
      }

      if (Vehicle) {
        const bVehicles = await Vehicle.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            branch_id: effectiveBranchId,
          },
          attributes: ['id'],
        });
        branchVehicleIds = bVehicles.map((v) => v.id);
      }

      const fuelOr = [];
      if (branchTripIds.length > 0) fuelOr.push({ trip_id: { [Op.in]: branchTripIds } });
      if (branchVehicleIds.length > 0) fuelOr.push({ vehicle_id: { [Op.in]: branchVehicleIds } });

      if (fuelOr.length > 0) {
        where[Op.or] = fuelOr;
      } else {
        where.id = '00000000-0000-0000-0000-000000000000';
      }
    }

    if (from_date && to_date) {
      where.fuel_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.fuel_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.fuel_date = { [Op.lte]: to_date };
    }

    const includeList = [];
    if (Vehicle) includeList.push({ model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'vehicle_type', 'ownership'] });
    if (Trip) includeList.push({ model: Trip, as: 'trip', attributes: ['id', 'trip_number', 'status'] });
    if (Driver) includeList.push({ model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] });

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await FuelEntry.findAndCountAll({
      where,
      include: includeList,
      order: [['fuel_date', 'DESC'], ['odometer_reading', 'DESC']],
      limit: limitNum,
      offset,
    });

    // Compute KMPL for each log against previous odometer for that vehicle
    const vehicleOdoMap = {};
    const allVehicleFills = await FuelEntry.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
      attributes: ['id', 'vehicle_id', 'odometer_reading', 'fuel_date', 'litres'],
      order: [['vehicle_id', 'ASC'], ['odometer_reading', 'ASC']],
    });

    allVehicleFills.forEach((entry, idx) => {
      const vId = entry.vehicle_id;
      if (!vehicleOdoMap[vId]) vehicleOdoMap[vId] = [];
      vehicleOdoMap[vId].push(entry);
    });

    const enrichedRows = rows.map((r) => {
      const rowJson = r.toJSON ? r.toJSON() : r;
      const vFills = vehicleOdoMap[rowJson.vehicle_id] || [];
      const currentIdx = vFills.findIndex((f) => f.id === rowJson.id);

      let kmpl = null;
      let distanceKm = null;

      if (currentIdx > 0) {
        const prevFill = vFills[currentIdx - 1];
        const dist = rowJson.odometer_reading - prevFill.odometer_reading;
        if (dist > 0 && parseFloat(rowJson.litres) > 0) {
          distanceKm = dist;
          kmpl = roundToTwo(dist / parseFloat(rowJson.litres));
        }
      }

      return {
        ...rowJson,
        distance_covered_km: distanceKm,
        kmpl_calculated: kmpl,
      };
    });

    const totalLitres = rows.reduce((s, r) => s + parseFloat(r.litres || 0), 0);
    const totalAmount = rows.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);

    return paginatedResponse(res, 'Fuel logs fetched successfully', enrichedRows, {
      page: pageNum,
      limit: limitNum,
      total: count,
      pages: Math.ceil(count / limitNum),
      summary: {
        totalLitres: roundToTwo(totalLitres),
        totalAmount: roundToTwo(totalAmount),
        avgRate: totalLitres > 0 ? roundToTwo(totalAmount / totalLitres) : 0,
      },
    });
  } catch (error) {
    console.error('listFuelLogs error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Record a new fuel refill log
 */
const createFuelLog = async (req, res) => {
  try {
    const { FuelEntry, Expense, ExpenseCategory, Trip, Vehicle } = req.tenantDb || defaultModels;
    const {
      vehicle_id,
      trip_id,
      driver_id,
      fuel_date,
      fuel_type = 'DIESEL',
      litres,
      rate_per_litre,
      total_amount,
      odometer_reading,
      fuel_station,
      payment_mode = 'FUEL_CARD',
      receipt_url,
    } = req.body;

    if (!vehicle_id) {
      return errorResponse(res, 'Vehicle is required for fuel log', null, 400);
    }
    if (!litres || isNaN(parseFloat(litres)) || parseFloat(litres) <= 0) {
      return errorResponse(res, 'Valid litres count is required', null, 400);
    }
    if (!rate_per_litre || isNaN(parseFloat(rate_per_litre)) || parseFloat(rate_per_litre) <= 0) {
      return errorResponse(res, 'Valid rate per litre is required', null, 400);
    }

    const calculatedTotal = total_amount ? parseFloat(total_amount) : roundToTwo(parseFloat(litres) * parseFloat(rate_per_litre));

    const fuelEntry = await FuelEntry.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      vehicle_id,
      trip_id: trip_id || null,
      driver_id: driver_id || null,
      fuel_date: fuel_date || new Date().toISOString().slice(0, 10),
      fuel_type,
      litres: parseFloat(litres),
      rate_per_litre: parseFloat(rate_per_litre),
      total_amount: calculatedTotal,
      odometer_reading: parseInt(odometer_reading, 10) || 0,
      fuel_station: fuel_station || 'Highway Bunk',
      payment_mode,
      receipt_url: receipt_url || '',
    });

    // Automatically create a corresponding Expense entry under "Fuel & Diesel"
    if (Expense && ExpenseCategory) {
      let fuelCategory = await ExpenseCategory.findOne({ where: { code: 'FUEL' } });
      if (!fuelCategory) {
        fuelCategory = await ExpenseCategory.findOne({ where: { name: 'Fuel & Diesel' } });
      }
      if (!fuelCategory) {
        fuelCategory = await ExpenseCategory.create({
          tenant_id: req.tenant.tenantId,
          name: 'Fuel & Diesel',
          code: 'FUEL',
          is_trip_expense: true,
        });
      }

      // Resolve effective branch for dual Expense entry
      const isGlobalUser = Boolean(
        req.user?.is_owner ||
        req.user?.isAdmin ||
        ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(req.user?.role) ||
        (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r))) ||
        (req.user?.roles && req.user?.roles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r.name || r)))
      );

      let effectiveBranch;
      if (!isGlobalUser) {
        effectiveBranch = req.user?.branch_id || req.branchId;
        if (!effectiveBranch) {
          return errorResponse(res, 'Access denied: You do not have an assigned branch.', null, 403);
        }
      } else {
        effectiveBranch = req.body.branch_id || req.branchId || req.user?.branch_id;
        if (!effectiveBranch && trip_id && Trip) {
          const tripRec = await Trip.findByPk(trip_id);
          if (tripRec) effectiveBranch = tripRec.origin_branch_id;
        }
        if (!effectiveBranch && vehicle_id && Vehicle) {
          const vehRec = await Vehicle.findByPk(vehicle_id);
          if (vehRec) effectiveBranch = vehRec.branch_id;
        }
        if (!effectiveBranch && Branch) {
          const defaultBranch = await Branch.findOne({
            where: { tenant_id: req.tenant.tenantId },
            order: [['created_at', 'ASC']],
          });
          if (defaultBranch) effectiveBranch = defaultBranch.id;
        }
      }

      await Expense.create({
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        branch_id: effectiveBranch,
        category_id: fuelCategory.id,
        amount: calculatedTotal,
        expense_date: fuel_date || new Date().toISOString().slice(0, 10),
        trip_id: trip_id || null,
        vehicle_id,
        driver_id: driver_id || null,
        payment_method: payment_mode === 'CASH' ? 'CASH' : payment_mode === 'FASTAG' ? 'FASTAG' : 'FUEL_CARD',
        vendor_name: fuel_station || 'Highway Fuel Station',
        remarks: `Fuel Fill: ${litres} L @ ₹${rate_per_litre}/L (Odo: ${odometer_reading || 'N/A'})`,
        receipt_url: receipt_url || '',
        created_by: req.user.id,
      });

      if (trip_id && Trip) {
        await Trip.increment({ total_expenses: calculatedTotal }, { where: { id: trip_id } });
      }
    }

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'FUEL_ENTRY',
      entityId: fuelEntry.id,
      entityName: `Fuel ${litres}L (₹${calculatedTotal})`,
      summary: `Logged ${litres}L of ${fuel_type} for vehicle at ${fuel_station || 'Bunk'} (Odo: ${odometer_reading})`,
      newValues: fuelEntry.toJSON ? fuelEntry.toJSON() : fuelEntry,
    });

    return successResponse(res, 'Fuel entry logged successfully', fuelEntry, 201);
  } catch (error) {
    console.error('createFuelLog error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * List Driver Advances
 */
const listDriverAdvances = async (req, res) => {
  try {
    const { DriverAdvance, Trip, Driver, Vehicle, Consignment, Expense } = req.tenantDb || defaultModels;
    const { trip_id, driver_id, branch_id, from_date, to_date, page = 1, limit = 20 } = req.query;

    if (!DriverAdvance) {
      return successResponse(res, 'Driver advances', []);
    }

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (trip_id) where.trip_id = trip_id;
    if (driver_id) where.driver_id = driver_id;

    if (effectiveBranchId) {
      let branchTripIds = [];
      let branchDriverIds = [];

      if (Trip) {
        const bTrips = await Trip.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            [Op.or]: [
              { origin_branch_id: effectiveBranchId },
              { dest_branch_id: effectiveBranchId },
            ],
          },
          attributes: ['id'],
        });
        branchTripIds = bTrips.map((t) => t.id);
      }

      if (Driver) {
        const bDrivers = await Driver.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            branch_id: effectiveBranchId,
          },
          attributes: ['id'],
        });
        branchDriverIds = bDrivers.map((d) => d.id);
      }

      const advOr = [];
      if (branchTripIds.length > 0) advOr.push({ trip_id: { [Op.in]: branchTripIds } });
      if (branchDriverIds.length > 0) advOr.push({ driver_id: { [Op.in]: branchDriverIds } });

      if (advOr.length > 0) {
        where[Op.or] = advOr;
      } else {
        where.id = '00000000-0000-0000-0000-000000000000';
      }
    }

    if (from_date && to_date) {
      where.disbursed_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.disbursed_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.disbursed_date = { [Op.lte]: to_date };
    }

    const includeList = [];
    if (Trip) {
      const tripIncludes = [];
      if (Vehicle) {
        tripIncludes.push({
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'vehicle_number', 'vehicle_type', 'ownership'],
        });
      }
      if (Consignment) {
        tripIncludes.push({
          model: Consignment,
          as: 'consignments',
          attributes: ['id', 'docket_number', 'total_amount', 'charged_weight'],
          through: { attributes: [] },
          required: false,
        });
      }
      if (Expense) {
        tripIncludes.push({
          model: Expense,
          as: 'expenses',
          attributes: ['id', 'amount', 'category_id', 'payment_method'],
          required: false,
        });
      }

      includeList.push({
        model: Trip,
        as: 'trip',
        attributes: [
          'id',
          'trip_number',
          'status',
          'expected_revenue',
          'total_expenses',
          'driver_advance',
          'settlement_status',
          'origin_city',
          'destination_city',
          'vehicle_id',
          'driver_id',
          'created_at',
        ],
        include: tripIncludes,
        required: false,
      });
    }
    if (Driver) includeList.push({ model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] });

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await DriverAdvance.findAndCountAll({
      where,
      include: includeList,
      order: [['disbursed_date', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true,
    });

    const enrichedRows = rows.map((r) => {
      const rowJson = r.toJSON ? r.toJSON() : { ...r };
      const trip = rowJson.trip;
      if (trip) {
        const consignmentRevenue = (trip.consignments || []).reduce((acc, c) => acc + Number(c.total_amount || 0), 0);
        const grossRevenue = Number(trip.expected_revenue) > 0 ? Number(trip.expected_revenue) : consignmentRevenue;
        const expSum = (trip.expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
        const totalExpenses = expSum > 0 ? expSum : Number(trip.total_expenses || 0);
        const driverAdvance = Number(trip.driver_advance || 0);
        const totalDriveSpend = totalExpenses + driverAdvance;
        const netProfitLoss = grossRevenue - totalDriveSpend;
        const marginPct = grossRevenue > 0 ? Number(((netProfitLoss / grossRevenue) * 100).toFixed(1)) : 0;

        rowJson.trip_financials = {
          grossRevenue,
          totalExpenses,
          driverAdvance,
          totalDriveSpend,
          netProfitLoss,
          marginPct,
          isProfit: netProfitLoss >= 0,
        };
      }
      return rowJson;
    });

    const totalAdvances = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    return paginatedResponse(res, 'Driver advances fetched successfully', enrichedRows, {
      page: pageNum,
      limit: limitNum,
      total: count,
      pages: Math.ceil(count / limitNum),
      summary: {
        totalAdvances: roundToTwo(totalAdvances),
      },
    });
  } catch (error) {
    console.error('listDriverAdvances error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Record driver cash advance disbursement
 */
const createDriverAdvance = async (req, res) => {
  try {
    const { DriverAdvance, Trip } = req.tenantDb || defaultModels;
    const { trip_id, driver_id, amount, disbursed_mode = 'CASH', remarks } = req.body;
    if (!trip_id || !amount) {
      return errorResponse(res, 'Trip ID and advance amount are required', null, 400);
    }

    const trip = await Trip.findOne({
      where: { id: trip_id, tenant_id: req.tenant.tenantId },
    });
    if (!trip) {
      return errorResponse(res, 'Trip not found', null, 404);
    }

    const isGlobalUser = Boolean(
      req.user?.is_owner ||
      req.user?.isAdmin ||
      ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(req.user?.role) ||
      (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r))) ||
      (req.user?.roles && req.user?.roles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r.name || r)))
    );

    if (!isGlobalUser) {
      const userBranch = req.user?.branch_id || req.branchId;
      if (!userBranch || (trip.origin_branch_id !== userBranch && trip.dest_branch_id !== userBranch)) {
        return errorResponse(res, 'Access denied: You can only disburse advances for trips originating or terminating at your assigned branch', null, 403);
      }
    }

    const advance = await DriverAdvance.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      trip_id,
      driver_id: driver_id || trip.driver_id,
      amount: parseFloat(amount),
      disbursed_date: new Date().toISOString().slice(0, 10),
      disbursed_mode,
      remarks: remarks || 'Driver trip cash bhatta / advance',
      disbursed_by: req.user.id,
    });

    await trip.increment({ driver_advance: parseFloat(amount) });

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'DRIVER_ADVANCE',
      entityId: advance.id,
      entityName: `Driver Advance ₹${advance.amount}`,
      summary: `Disbursed driver advance of ₹${advance.amount} (${advance.disbursed_mode}) for Trip #${trip.trip_number}`,
      newValues: advance.toJSON ? advance.toJSON() : advance,
    });

    return successResponse(res, 'Driver advance recorded successfully', advance, 201);
  } catch (error) {
    console.error('createDriverAdvance error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Trip Settlement Engine
 */
const settleTrip = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Trip, Expense, DriverAdvance, TripSettlement, Vehicle } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();
  try {
    const { trip_id, driver_allowance = 0, vehicle_charge, remarks } = req.body;
    if (!trip_id) {
      return errorResponse(res, 'Trip ID is required for settlement', null, 400);
    }

    const trip = await Trip.findOne({
      where: { id: trip_id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Expense, as: 'expenses' },
        { model: DriverAdvance, as: 'advances' },
        ...(Vehicle ? [{ model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'ownership'] }] : []),
      ],
      transaction,
    });

    if (!trip) {
      return errorResponse(res, 'Trip not found', null, 404);
    }

    const isGlobalUser = Boolean(
      req.user?.is_owner ||
      req.user?.isAdmin ||
      ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(req.user?.role) ||
      (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r))) ||
      (req.user?.roles && req.user?.roles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'TENANT_ADMIN'].includes(r.name || r)))
    );

    if (!isGlobalUser) {
      const userBranch = req.user?.branch_id || req.branchId;
      if (!userBranch || (trip.origin_branch_id !== userBranch && trip.dest_branch_id !== userBranch)) {
        await transaction.rollback();
        return errorResponse(res, 'Access denied: You can only settle trips originating or terminating at your assigned branch', null, 403);
      }
    }

    let totalExpenses = 0;
    (trip.expenses || []).forEach((e) => {
      totalExpenses += parseFloat(e.amount || 0);
    });

    let totalAdvance = 0;
    (trip.advances || []).forEach((a) => {
      totalAdvance += parseFloat(a.amount || 0);
    });

    const allowance = parseFloat(driver_allowance) || 0;
    const ownership = (trip.vehicle?.ownership || 'OWN').toUpperCase();
    const isVendorOrMarket = ownership === 'MARKET' || ownership === 'ATTACHED';

    let balance = 0;
    let settlementType = 'BALANCED';
    let netPayableToVendor = 0;
    let effectiveVehicleCharge = 0;
    let profitMargin = 0;

    if (isVendorOrMarket) {
      // Agreed Vehicle Hire Charge
      effectiveVehicleCharge = parseFloat(
        vehicle_charge !== undefined && vehicle_charge !== null && vehicle_charge !== ''
          ? vehicle_charge
          : (trip.vehicle_charge || 0)
      );

      // In Market & Attached transport, Company deducts disbursed advances and company-paid fuel/expenses from the agreed vehicle charge
      const totalCompanyDeductions = totalAdvance + totalExpenses;
      netPayableToVendor = roundToTwo(effectiveVehicleCharge - totalCompanyDeductions);
      balance = Math.abs(netPayableToVendor);

      if (netPayableToVendor > 0) {
        settlementType = 'PAYABLE_TO_VENDOR';
      } else if (netPayableToVendor < 0) {
        settlementType = 'RECOVER_FROM_VENDOR';
      } else {
        settlementType = 'BALANCED';
      }

      // Company gross margin on this trip = Expected Customer Revenue - Vehicle Hire Charge
      profitMargin = roundToTwo(parseFloat(trip.expected_revenue || 0) - effectiveVehicleCharge);
    } else {
      // Company Owned: Driver reconciliation (Advance vs Highway Expenses + Daily Bhatta)
      const driverBalance = roundToTwo(totalAdvance - (totalExpenses + allowance));
      balance = Math.abs(driverBalance);
      settlementType = driverBalance > 0 ? 'REFUND_FROM_DRIVER' : driverBalance < 0 ? 'PAYABLE_TO_DRIVER' : 'BALANCED';
      netPayableToVendor = 0;
      effectiveVehicleCharge = 0;

      // Company margin on Company Owned truck = Customer Revenue - Total Direct Trip Expenses (Expenses + Bhatta)
      profitMargin = roundToTwo(parseFloat(trip.expected_revenue || 0) - (totalExpenses + allowance));
    }

    const settlementNumber = `SETTLE-${Date.now().toString().slice(-6)}`;

    const settlement = await TripSettlement.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      trip_id: trip.id,
      settlement_number: settlementNumber,
      settlement_date: new Date().toISOString().slice(0, 10),
      total_advance: totalAdvance,
      total_expenses: totalExpenses,
      driver_allowance: isVendorOrMarket ? 0 : allowance,
      vehicle_charge: isVendorOrMarket ? effectiveVehicleCharge : 0,
      vehicle_ownership: ownership,
      net_payable_to_vendor: isVendorOrMarket ? netPayableToVendor : 0,
      profit_margin: profitMargin,
      balance_payable_or_receivable: balance,
      settlement_type: settlementType,
      status: 'SETTLED',
      remarks: remarks || '',
      settled_by: req.user.id,
    }, { transaction });

    await trip.update({
      settlement_status: 'SETTLED',
      vehicle_charge: isVendorOrMarket ? effectiveVehicleCharge : (trip.vehicle_charge || 0),
      total_expenses: totalExpenses,
      driver_advance: totalAdvance,
      status: 'COMPLETED',
    }, { transaction });

    await transaction.commit();

    logAudit({
      req,
      action: 'SETTLE',
      entityType: 'TRIP',
      entityId: trip.trip_number,
      entityName: `Trip ${trip.trip_number}`,
      summary: `Settled Trip #${trip.trip_number} (${settlementNumber}: Advances ₹${totalAdvance}, Expenses ₹${totalExpenses}, Balance ₹${Math.abs(balance)})`,
      newValues: {
        trip_number: trip.trip_number,
        settlement_number: settlementNumber,
        settlement_type: settlementType,
        vehicle_ownership: ownership,
        vehicle_charge: effectiveVehicleCharge,
        net_payable_to_vendor: netPayableToVendor,
        total_advance: totalAdvance,
        total_expenses: totalExpenses,
        driver_allowance: allowance,
        profit_margin: profitMargin,
      },
    });

    return successResponse(res, 'Trip successfully settled and reconciled', settlement, 201);
  } catch (error) {
    await transaction.rollback();
    console.error('settleTrip error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * List Expense Categories with auto-seeding
 */
const listCategories = async (req, res) => {
  try {
    const { ExpenseCategory } = req.tenantDb || defaultModels;
    await ensureDefaultCategories(ExpenseCategory, req.tenant?.tenantId);
    const categories = ExpenseCategory
      ? await ExpenseCategory.findAll({ order: [['is_trip_expense', 'DESC'], ['name', 'ASC']] })
      : [];
    return successResponse(res, 'Expense categories', categories);
  } catch (error) {
    console.error('listCategories error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Unified Trip-Wise Operational Expenses Controller
 * Returns trips with aggregated Driver Advances, Diesel/Fuel Fills, and Direct En-route Costs
 */
const listTripWiseExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search,
      sort_by,
      sort_order,
      from_date,
      to_date,
      branch_id,
      settlement_status,
      ownership,
    } = req.query;

    const {
      Trip,
      Vehicle,
      Driver,
      Branch,
      Expense,
      ExpenseCategory,
      DriverAdvance,
      FuelEntry,
      Consignment,
    } = req.tenantDb || defaultModels;

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    const andConditions = [];

    const userRoles = req.userRoles || [];
    const isOwnerOrAdmin =
      userRoles.includes('SUPER_ADMIN') ||
      userRoles.includes('TRANSPORT_OWNER') ||
      userRoles.includes('ADMIN') ||
      userRoles.includes('OWNER') ||
      userRoles.includes('TENANT_ADMIN') ||
      Boolean(req.user?.is_owner) ||
      Boolean(req.user?.isAdmin);
    const userBranchId = req.user?.branch_id || req.user?.branch?.id || null;

    let targetBranchId = null;
    if (!isOwnerOrAdmin && userBranchId) {
      targetBranchId = userBranchId;
    } else if (branch_id && branch_id !== 'ALL' && branch_id !== 'undefined' && branch_id !== 'null' && String(branch_id).trim() !== '') {
      targetBranchId = branch_id;
    }

    if (targetBranchId) {
      andConditions.push({
        [Op.or]: [
          { origin_branch_id: targetBranchId },
          { dest_branch_id: targetBranchId },
        ],
      });
    }

    if (settlement_status && settlement_status !== 'ALL') {
      where.settlement_status = settlement_status;
    }

    if (from_date && to_date) {
      where.trip_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.trip_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.trip_date = { [Op.lte]: to_date };
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
        ],
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const includeList = [];
    if (Vehicle) {
      const vehInclude = {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'vehicle_number', 'vehicle_type', 'ownership', 'capacity_ton'],
        required: false,
      };
      if (ownership && ownership !== 'ALL') {
        vehInclude.where = { ownership: ownership.toUpperCase() };
        vehInclude.required = true;
      }
      includeList.push(vehInclude);
    }
    if (Driver) {
      includeList.push({
        model: Driver,
        as: 'driver',
        attributes: ['id', 'name', 'phone'],
        required: false,
      });
    }
    if (Branch) {
      includeList.push({
        model: Branch,
        as: 'originBranch',
        attributes: ['id', 'branch_name', 'branch_code', 'city'],
        required: false,
      });
      includeList.push({
        model: Branch,
        as: 'destBranch',
        attributes: ['id', 'branch_name', 'branch_code', 'city'],
        required: false,
      });
    }
    if (DriverAdvance) {
      includeList.push({
        model: DriverAdvance,
        as: 'advances',
        attributes: ['id', 'amount', 'disbursed_date', 'disbursed_mode', 'remarks'],
        required: false,
      });
    }
    if (Expense) {
      includeList.push({
        model: Expense,
        as: 'expenses',
        include: ExpenseCategory ? [{ model: ExpenseCategory, as: 'category', attributes: ['id', 'name', 'is_trip_expense'] }] : [],
        attributes: ['id', 'amount', 'expense_date', 'payment_method', 'vendor_name', 'remarks'],
        required: false,
      });
    }
    if (Consignment) {
      includeList.push({
        model: Consignment,
        as: 'consignments',
        attributes: ['id', 'docket_number', 'total_amount', 'charged_weight'],
        through: { attributes: [] },
        required: false,
      });
    }
    if (FuelEntry) {
      includeList.push({
        model: FuelEntry,
        as: 'fuelEntries',
        attributes: ['id', 'fuel_date', 'litres', 'rate_per_litre', 'total_amount', 'odometer_reading', 'fuel_station', 'payment_mode'],
        required: false,
      });
    }

    const allowedSort = {
      trip_number: 'trip_number',
      trip_date: 'trip_date',
      expected_revenue: 'expected_revenue',
      total_expenses: 'total_expenses',
      status: 'status',
      created_at: 'created_at',
    };
    const orderCol = allowedSort[sort_by] || 'created_at';
    const orderDir = (sort_order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const findOptions = {
      where,
      include: includeList,
      order: [[orderCol, orderDir]],
      limit: limitNum,
      offset,
      distinct: true,
      col: 'id',
    };

    if ((search && search.trim()) || (ownership && ownership !== 'ALL')) {
      findOptions.subQuery = false;
    }

    const { count, rows } = await Trip.findAndCountAll(findOptions);

    const enrichedTrips = rows.map((t) => {
      const tripJson = t.toJSON ? t.toJSON() : { ...t };

      // 1. Driver Bhatta & Advances Total
      let driverAdvances = (tripJson.advances || []).reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
      if (driverAdvances <= 0 && parseFloat(tripJson.driver_advance || 0) > 0) {
        driverAdvances = parseFloat(tripJson.driver_advance || 0);
      }

      // 2. Fuel Outflow: From fuelEntries + any Expense categorised as Fuel
      let fuelCost = (tripJson.fuelEntries || []).reduce((sum, f) => sum + parseFloat(f.total_amount || 0), 0);
      let fuelLitres = (tripJson.fuelEntries || []).reduce((sum, f) => sum + parseFloat(f.litres || 0), 0);

      // 3. Toll, En-route & Running Repairs
      let runningExpenses = 0;
      (tripJson.expenses || []).forEach((e) => {
        const catName = (e.category?.name || '').toLowerCase();
        const remarks = (e.remarks || '').toLowerCase();
        const amt = parseFloat(e.amount || 0);

        if (catName.includes('fuel') || catName.includes('diesel') || remarks.includes('diesel') || remarks.includes('fuel')) {
          fuelCost += amt;
        } else {
          runningExpenses += amt;
        }
      });
      if (runningExpenses <= 0 && fuelCost <= 0 && parseFloat(tripJson.total_expenses || 0) > 0) {
        runningExpenses = parseFloat(tripJson.total_expenses || 0);
      }

      // 4. Total Operational Outflows for this trip
      const totalSpend = roundToTwo(driverAdvances + fuelCost + runningExpenses);

      // 5. Expected Freight Revenue
      let grossRevenue = parseFloat(tripJson.expected_revenue || 0);
      if (grossRevenue <= 0 && Array.isArray(tripJson.consignments) && tripJson.consignments.length > 0) {
        grossRevenue = tripJson.consignments.reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0);
      }
      grossRevenue = roundToTwo(grossRevenue);

      // 6. Net Profit / Loss
      const netProfitLoss = roundToTwo(grossRevenue - totalSpend);
      const marginPct = grossRevenue > 0 ? Number(((netProfitLoss / grossRevenue) * 100).toFixed(1)) : 0;

      return {
        ...tripJson,
        vehicle_charge: roundToTwo(parseFloat(tripJson.vehicle_charge || 0)),
        driver_advance_total: roundToTwo(driverAdvances),
        fuel_cost_total: roundToTwo(fuelCost),
        fuel_litres_total: roundToTwo(fuelLitres),
        running_expense_total: roundToTwo(runningExpenses),
        total_operational_spend: totalSpend,
        gross_revenue: grossRevenue,
        net_profit_loss: netProfitLoss,
        margin_pct: marginPct,
        is_profit: netProfitLoss >= 0,
      };
    });

    return paginatedResponse(res, 'Trip-wise operational expenses fetched successfully', enrichedTrips, {
      page: pageNum,
      limit: limitNum,
      total: count,
      pages: Math.ceil(count / limitNum),
    });
  } catch (error) {
    console.error('listTripWiseExpenses error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary,
  listFuelLogs,
  createFuelLog,
  listDriverAdvances,
  createDriverAdvance,
  settleTrip,
  listCategories,
  listTripWiseExpenses,
};
