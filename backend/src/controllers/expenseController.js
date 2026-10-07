// src/controllers/expenseController.js
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { roundToTwo } = require('../utils/decimalUtils');
const { logAudit } = require('../middleware/auditLogger');

const listExpenses = async (req, res) => {
  try {
    const { Expense, ExpenseCategory, Trip, Vehicle } = req.tenantDb || defaultModels;
    const { trip_id, vehicle_id, from_date, to_date } = req.query;
    const { Op } = require('sequelize');
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (trip_id) where.trip_id = trip_id;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (from_date && to_date) {
      where.expense_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      where.expense_date = { [Op.gte]: from_date };
    } else if (to_date) {
      where.expense_date = { [Op.lte]: to_date };
    }

    const includeList = [];
    if (ExpenseCategory) includeList.push({ model: ExpenseCategory, as: 'category' });
    if (Trip) includeList.push({ model: Trip, as: 'trip', attributes: ['trip_number'] });
    if (Vehicle) includeList.push({ model: Vehicle, as: 'vehicle', attributes: ['vehicle_number'] });

    const expenses = await Expense.findAll({
      where,
      include: includeList,
      order: [['expense_date', 'DESC']],
    });

    return successResponse(res, 'Expenses fetched', expenses);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createExpense = async (req, res) => {
  try {
    const { Expense, ExpenseCategory, Trip } = req.tenantDb || defaultModels;
    let { category_id, amount, expense_date, trip_id, vehicle_id, driver_id, payment_method, remarks, receipt_url } = req.body;
    if (!amount || isNaN(parseFloat(amount))) {
      return errorResponse(res, 'Valid expense amount is required', null, 400);
    }

    // Resolve category if needed
    if (!category_id && ExpenseCategory) {
      const defaultCat = await ExpenseCategory.findOne({ where: { name: 'Miscellaneous' } }) || await ExpenseCategory.findOne();
      if (defaultCat) category_id = defaultCat.id;
    } else if (category_id && ExpenseCategory) {
      // Check if category_id was passed as a name string instead of UUID
      const catByName = await ExpenseCategory.findOne({ where: { name: category_id } });
      if (catByName) category_id = catByName.id;
    }

    if (!category_id && ExpenseCategory) {
      // Create a default category if table was empty
      const [newCat] = await ExpenseCategory.findOrCreate({
        where: { name: 'Trip Expense' },
        defaults: { name: 'Trip Expense', description: 'General operational trip expense' }
      });
      category_id = newCat.id;
    }

    // Auto-fill vehicle and driver from trip if linked
    if (trip_id && (!vehicle_id || !driver_id) && Trip) {
      const tripRecord = await Trip.findByPk(trip_id);
      if (tripRecord) {
        if (!vehicle_id) vehicle_id = tripRecord.vehicle_id;
        if (!driver_id) driver_id = tripRecord.driver_id;
      }
    }

    const expense = await Expense.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_id: req.branchId || req.user.branch_id || null,
      category_id,
      amount: parseFloat(amount),
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
      trip_id: trip_id || null,
      vehicle_id: vehicle_id || null,
      driver_id: driver_id || null,
      payment_method: payment_method || 'CASH',
      remarks: remarks || '',
      receipt_url: receipt_url || '',
      created_by: req.user.id,
    });

    // Update trip total_expenses if linked to a trip
    if (trip_id) {
      const { Trip } = req.tenantDb || defaultModels;
      if (Trip) {
        await Trip.increment({ total_expenses: parseFloat(amount) }, { where: { id: trip_id } });
      }
    }

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      entityName: `Expense ₹${expense.amount}`,
      summary: `Logged expense of ₹${expense.amount} (${expense.payment_method}) - ${expense.remarks || 'General expense'}`,
      newValues: expense.toJSON ? expense.toJSON() : expense,
    });

    return successResponse(res, 'Expense recorded successfully', expense, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

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

    const advance = await DriverAdvance.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      trip_id,
      driver_id: driver_id || trip.driver_id,
      amount: parseFloat(amount),
      disbursed_date: new Date().toISOString().slice(0, 10),
      disbursed_mode,
      remarks: remarks || 'Additional driver cash advance',
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
    return errorResponse(res, error.message, null, 500);
  }
};

const settleTrip = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Trip, Expense, DriverAdvance, TripSettlement } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();
  try {
    const { trip_id, driver_allowance = 0, remarks } = req.body;
    if (!trip_id) {
      return errorResponse(res, 'Trip ID is required for settlement', null, 400);
    }

    const trip = await Trip.findOne({
      where: { id: trip_id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Expense, as: 'expenses' },
        { model: DriverAdvance, as: 'advances' },
      ],
      transaction,
    });

    if (!trip) {
      return errorResponse(res, 'Trip not found', null, 404);
    }

    let totalExpenses = 0;
    trip.expenses.forEach((e) => {
      totalExpenses += parseFloat(e.amount || 0);
    });

    let totalAdvance = 0;
    trip.advances.forEach((a) => {
      totalAdvance += parseFloat(a.amount || 0);
    });

    const allowance = parseFloat(driver_allowance);
    const balance = roundToTwo(totalAdvance - (totalExpenses + allowance));
    const settlementType = balance > 0 ? 'REFUND_FROM_DRIVER' : balance < 0 ? 'PAYABLE_TO_DRIVER' : 'BALANCED';

    const settlementNumber = `SETTLE-${Date.now().toString().slice(-6)}`;

    const settlement = await TripSettlement.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      trip_id: trip.id,
      settlement_number: settlementNumber,
      settlement_date: new Date().toISOString().slice(0, 10),
      total_advance: totalAdvance,
      total_expenses: totalExpenses,
      driver_allowance: allowance,
      balance_payable_or_receivable: Math.abs(balance),
      settlement_type: settlementType,
      status: 'SETTLED',
      remarks: remarks || '',
      settled_by: req.user.id,
    }, { transaction });

    await trip.update({
      settlement_status: 'SETTLED',
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
        total_advance: totalAdvance,
        total_expenses: totalExpenses,
        driver_allowance: allowance,
      },
    });

    return successResponse(res, 'Trip successfully settled and reconciled', settlement, 201);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

const listCategories = async (req, res) => {
  try {
    const { ExpenseCategory } = req.tenantDb || defaultModels;
    const categories = ExpenseCategory ? await ExpenseCategory.findAll({ order: [['name', 'ASC']] }) : [];
    return successResponse(res, 'Expense categories', categories);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listExpenses,
  createExpense,
  createDriverAdvance,
  settleTrip,
  listCategories,
};

