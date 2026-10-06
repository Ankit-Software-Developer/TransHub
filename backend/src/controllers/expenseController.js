// src/controllers/expenseController.js
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { roundToTwo } = require('../utils/decimalUtils');

const listExpenses = async (req, res) => {
  try {
    const { Expense, ExpenseCategory, Trip, Vehicle } = req.tenantDb || defaultModels;
    const { trip_id, vehicle_id } = req.query;
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (trip_id) where.trip_id = trip_id;
    if (vehicle_id) where.vehicle_id = vehicle_id;

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
    const { Expense } = req.tenantDb || defaultModels;
    const { category_id, amount, expense_date, trip_id, vehicle_id, driver_id, payment_method, remarks, receipt_url } = req.body;
    if (!category_id || !amount) {
      return errorResponse(res, 'Expense category and amount are required', null, 400);
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

    return successResponse(res, 'Expense recorded successfully', expense, 201);
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
  settleTrip,
  listCategories,
};
