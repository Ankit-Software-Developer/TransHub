// src/controllers/branchCashClosureController.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { saveMediaFile } = require('../utils/fileStorage');
const { logAudit } = require('../middleware/auditLogger');
const { getEffectiveBranch } = require('../middleware/branchAccess');

/**
 * 1. Get Current Branch Collection Balance & Remittance Status
 * Returns live cash-in-hand collected till now, broken down by:
 * - PAID bookings at origin branch
 * - TO_PAY deliveries completed at destination branch
 * - TBB invoice collections for origin branch
 * - Branch petty expenses deducted
 * - Less: previous bank remittances
 * - Net unclosed / unremitted balance
 */
const getCurrentBalance = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Consignment, Branch, Expense, Payment, BranchCashClosure } = m;
    const { branch_id } = req.query;

    const tenantId = req.tenant.tenantId;
    const orgId = req.tenant.organizationId;
    const effectiveBranchId = getEffectiveBranch(req, branch_id) || req.user?.branch_id;

    if (!effectiveBranchId) {
      return errorResponse(res, 'Branch ID is required to calculate collection balance', null, 400);
    }

    const branch = await Branch.findOne({
      where: { id: effectiveBranchId, tenant_id: tenantId },
      attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
    });

    // 1. PAID Bookings collected at origin branch
    const paidBookings = await Consignment.findAll({
      where: {
        tenant_id: tenantId,
        ...(orgId ? { organization_id: orgId } : {}),
        origin_branch_id: effectiveBranchId,
        payment_type: 'PAID',
      },
      attributes: ['id', 'total_amount', 'booking_date', 'status'],
    });

    let paidAmount = 0;
    let paidCount = 0;
    paidBookings.forEach((b) => {
      paidAmount += Number(b.total_amount || 0);
      paidCount += 1;
    });

    // 2. TO_PAY Deliveries completed at destination branch
    const toPayDeliveries = await Consignment.findAll({
      where: {
        tenant_id: tenantId,
        ...(orgId ? { organization_id: orgId } : {}),
        dest_branch_id: effectiveBranchId,
        payment_type: 'TO_PAY',
        status: { [Op.in]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'] },
      },
      attributes: ['id', 'total_amount', 'status', 'updated_at'],
    });

    let toPayAmount = 0;
    let toPayCount = 0;
    toPayDeliveries.forEach((d) => {
      toPayAmount += Number(d.total_amount || 0);
      toPayCount += 1;
    });

    // 3. TBB Invoice Payments collected for origin branch
    let tbbAmount = 0;
    let tbbCount = 0;
    if (Payment) {
      const tbbPayments = await Payment.findAll({
        where: {
          tenant_id: tenantId,
          ...(orgId ? { organization_id: orgId } : {}),
          branch_id: effectiveBranchId,
        },
        attributes: ['id', 'amount'],
      });
      tbbPayments.forEach((p) => {
        tbbAmount += Number(p.amount || 0);
        tbbCount += 1;
      });
    }

    // 4. Branch Petty Cash Expenses
    let expensesAmount = 0;
    if (Expense) {
      const branchExpenses = await Expense.findAll({
        where: {
          tenant_id: tenantId,
          ...(orgId ? { organization_id: orgId } : {}),
          branch_id: effectiveBranchId,
        },
        attributes: ['id', 'amount'],
      });
      branchExpenses.forEach((e) => {
        expensesAmount += Number(e.amount || 0);
      });
    }

    // 5. Previous Bank Remittances for this branch
    let totalRemitted = 0;
    let lastClosure = null;
    let isClosedToday = false;
    const todayStr = new Date().toISOString().slice(0, 10);

    if (BranchCashClosure) {
      const pastClosures = await BranchCashClosure.findAll({
        where: {
          tenant_id: tenantId,
          branch_id: effectiveBranchId,
          status: { [Op.in]: ['REMITTED', 'VERIFIED'] },
        },
        order: [['closure_date', 'DESC'], ['created_at', 'DESC']],
      });

      pastClosures.forEach((c) => {
        totalRemitted += Number(c.remitted_amount || 0);
        if (c.closure_date === todayStr) {
          isClosedToday = true;
        }
      });

      if (pastClosures.length > 0) {
        lastClosure = pastClosures[0];
      }
    }

    const totalGrossCollected = paidAmount + toPayAmount + tbbAmount;
    const netCashInHand = Math.max(0, totalGrossCollected - expensesAmount - totalRemitted);
    const hasUnclosedCash = netCashInHand > 0;

    return successResponse(res, 'Branch collection balance calculated successfully', {
      branchId: effectiveBranchId,
      branchName: branch?.name || branch?.branch_name || 'Branch',
      branchCode: branch?.code || branch?.branch_code || 'HUB',
      paidAmount: parseFloat(paidAmount.toFixed(2)),
      paidCount,
      toPayAmount: parseFloat(toPayAmount.toFixed(2)),
      toPayCount,
      tbbAmount: parseFloat(tbbAmount.toFixed(2)),
      tbbCount,
      expensesAmount: parseFloat(expensesAmount.toFixed(2)),
      totalGrossCollected: parseFloat(totalGrossCollected.toFixed(2)),
      totalRemittedToBank: parseFloat(totalRemitted.toFixed(2)),
      netCashInHand: parseFloat(netCashInHand.toFixed(2)),
      hasUnclosedCash,
      isClosedToday,
      lastClosure,
    });
  } catch (error) {
    console.error('Failed to get current collection balance', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 2. Remit Cash to Bank & Close Branch Daybook
 * Branch Manager submits deposit receipt, UTR reference, bank name, and remitted amount.
 */
const remitToBank = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { BranchCashClosure, Branch } = m;
    const {
      branch_id,
      remitted_amount,
      paid_amount,
      to_pay_amount,
      tbb_amount,
      expenses_amount,
      bank_name,
      bank_account_no,
      deposit_mode = 'CASH_DEPOSIT',
      utr_reference_no,
      receipt_slip, // base64 or file URL
      remarks,
      closure_date,
    } = req.body;

    const tenantId = req.tenant.tenantId;
    const orgId = req.tenant.organizationId;
    const effectiveBranchId = getEffectiveBranch(req, branch_id) || req.user?.branch_id;

    if (!effectiveBranchId) {
      return errorResponse(res, 'Branch ID is required', null, 400);
    }

    const depositAmount = parseFloat(remitted_amount);
    if (!depositAmount || depositAmount <= 0) {
      return errorResponse(res, 'Remitted amount must be greater than zero', null, 400);
    }

    // Save uploaded bank receipt slip image (base64 or file)
    let receiptUrl = null;
    if (req.file) {
      receiptUrl = `/uploads/remittances/${req.file.filename}`;
    } else if (receipt_slip) {
      receiptUrl = await saveMediaFile(receipt_slip, 'remittances', 'bank_slip');
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDate = closure_date || todayStr;

    const closure = await BranchCashClosure.create({
      tenant_id: tenantId,
      organization_id: orgId || req.user?.organization_id,
      branch_id: effectiveBranchId,
      user_id: req.user.id,
      closure_date: targetDate,
      paid_amount: parseFloat(paid_amount || 0),
      to_pay_amount: parseFloat(to_pay_amount || 0),
      tbb_amount: parseFloat(tbb_amount || 0),
      expenses_amount: parseFloat(expenses_amount || 0),
      total_collected_amount: depositAmount,
      remitted_amount: depositAmount,
      bank_name: bank_name ? bank_name.trim() : 'Company Bank Account',
      bank_account_no: bank_account_no ? bank_account_no.trim() : null,
      deposit_mode,
      utr_reference_no: utr_reference_no ? utr_reference_no.trim() : null,
      receipt_slip_url: receiptUrl,
      status: 'REMITTED',
      remarks: remarks ? remarks.trim() : null,
    });

    try {
      logAudit({
        req,
        action: 'BRANCH_CASH_REMITTED',
        targetType: 'BRANCH_CASH_CLOSURE',
        targetId: closure.id,
        details: {
          branch_id: effectiveBranchId,
          amount: depositAmount,
          bank_name,
          utr: utr_reference_no,
        },
      });
    } catch (auditErr) {
      console.warn('Audit log failed', auditErr);
    }

    return successResponse(res, 'Branch collection successfully remitted to bank', closure, 201);
  } catch (error) {
    console.error('Failed to remit cash to bank', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 3. List Branch Remittance & Closure History
 */
const getClosureHistory = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { BranchCashClosure, Branch, User } = m;
    const { branch_id, status, date_from, date_to, page = 1, limit = 20 } = req.query;

    const tenantId = req.tenant.tenantId;
    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    const where = { tenant_id: tenantId };
    if (effectiveBranchId) where.branch_id = effectiveBranchId;
    if (status && status !== 'ALL') where.status = status;

    if (date_from && date_to) {
      where.closure_date = { [Op.between]: [date_from, date_to] };
    } else if (date_from) {
      where.closure_date = { [Op.gte]: date_from };
    } else if (date_to) {
      where.closure_date = { [Op.lte]: date_to };
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await BranchCashClosure.findAndCountAll({
      where,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'phone', 'email'],
          required: false,
        },
        {
          model: User,
          as: 'verifier',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['closure_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    return paginatedResponse(res, 'Branch cash closures retrieved successfully', rows, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: count,
      pages: Math.ceil(count / parseInt(limit, 10)),
    });
  } catch (error) {
    console.error('Failed to get closure history', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 4. Verify & Approve Bank Remittance (Admin / Owner / Finance)
 */
const verifyClosure = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { BranchCashClosure } = m;
    const { id } = req.params;
    const { status, verification_notes } = req.body;

    const tenantId = req.tenant.tenantId;
    const closure = await BranchCashClosure.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!closure) {
      return errorResponse(res, 'Closure record not found', null, 404);
    }

    const newStatus = status === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
    await closure.update({
      status: newStatus,
      verified_by: req.user.id,
      verified_at: new Date(),
      verification_notes: verification_notes ? verification_notes.trim() : null,
    });

    return successResponse(res, `Remittance successfully ${newStatus.toLowerCase()}`, closure);
  } catch (error) {
    console.error('Failed to verify remittance', error);
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  getCurrentBalance,
  remitToBank,
  getClosureHistory,
  verifyClosure,
};
