// src/controllers/billingController.js
const defaultModels = require('../models');
const { generateNextNumber } = require('../services/numberSequenceService');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { roundToTwo, addDecimals } = require('../utils/decimalUtils');

const listInvoices = async (req, res) => {
  try {
    const { Invoice, Customer } = req.tenantDb || defaultModels;
    const { status, customer_id, page = 1, limit = 20 } = req.query;
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;

    const offset = (page - 1) * limit;
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['invoice_date', 'DESC']],
      include: Customer ? [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'gstin', 'phone'] }] : [],
    });

    return paginatedResponse(res, 'Invoices fetched', rows, {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createInvoice = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Invoice, InvoiceItem, Consignment, CustomerLedger, Customer } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();
  try {
    const { customer_id, consignment_ids = [], invoice_date, due_date, remarks } = req.body;
    if (!customer_id || consignment_ids.length === 0) {
      return errorResponse(res, 'Customer and at least one consignment are required to generate an invoice', null, 400);
    }

    const { formattedNumber: invoiceNumber } = await generateNextNumber({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId: null,
      documentType: 'INVOICE',
      transaction,
      models: req.tenantDb,
    });

    const consignments = await Consignment.findAll({
      where: { id: consignment_ids },
      transaction,
    });

    let subtotal = 0;
    consignments.forEach((c) => {
      subtotal += parseFloat(c.total_amount || 0);
    });

    const cgst = roundToTwo(subtotal * 0.025);
    const sgst = roundToTwo(subtotal * 0.025);
    const totalAmount = roundToTwo(subtotal + cgst + sgst);

    const invoice = await Invoice.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_id: req.branchId || null,
      invoice_number: invoiceNumber,
      customer_id,
      invoice_date: invoice_date || new Date().toISOString().slice(0, 10),
      due_date: due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subtotal_amount: subtotal,
      taxable_amount: subtotal,
      cgst_rate: 2.5,
      cgst_amount: cgst,
      sgst_rate: 2.5,
      sgst_amount: sgst,
      total_tax_amount: roundToTwo(cgst + sgst),
      total_amount: totalAmount,
      balance_amount: totalAmount,
      status: 'GENERATED',
      remarks: remarks || '',
      created_by: req.user.id,
    }, { transaction });

    // Mark consignments as billed
    for (const c of consignments) {
      await InvoiceItem.create({
        invoice_id: invoice.id,
        consignment_id: c.id,
        lr_number: c.lr_number,
        booking_date: c.booking_date,
        description: c.material_description,
        origin_city: c.origin_city,
        destination_city: c.destination_city,
        packages_count: c.packages_count,
        charged_weight: c.charged_weight,
        freight_amount: c.freight_amount,
        other_charges: c.other_charges,
        total_amount: c.total_amount,
      }, { transaction });

      await c.update({ is_billed: true, invoice_id: invoice.id }, { transaction });
    }

    // Customer Ledger Entry
    const lastLedger = await CustomerLedger.findOne({
      where: { customer_id },
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      transaction,
    });

    const previousBalance = lastLedger ? parseFloat(lastLedger.running_balance) : 0;
    const newBalance = roundToTwo(previousBalance + totalAmount);

    await CustomerLedger.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      customer_id,
      entry_date: invoice.invoice_date,
      entry_type: 'INVOICE',
      reference_id: invoice.id,
      reference_number: invoice.invoice_number,
      description: `Freight invoice generated for ${consignments.length} Biltys`,
      debit_amount: totalAmount,
      credit_amount: 0.00,
      running_balance: newBalance,
    }, { transaction });

    await Customer.update({ current_balance: newBalance }, { where: { id: customer_id }, transaction });

    await transaction.commit();

    return successResponse(res, 'Invoice generated successfully', invoice, 201);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

const recordPayment = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Payment, Invoice, CustomerLedger, Customer } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();
  try {
    const { customer_id, invoice_id, amount, payment_date, payment_method, reference_number, bank_name, remarks } = req.body;
    if (!customer_id || !amount) {
      return errorResponse(res, 'Customer and payment amount are required', null, 400);
    }

    const payAmount = parseFloat(amount);
    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;

    const payment = await Payment.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_id: req.branchId || null,
      payment_number: paymentNumber,
      customer_id,
      invoice_id: invoice_id || null,
      amount: payAmount,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_method: payment_method || 'NEFT',
      reference_number: reference_number || '',
      bank_name: bank_name || '',
      remarks: remarks || '',
      received_by: req.user.id,
    }, { transaction });

    // Update Invoice if linked
    if (invoice_id) {
      const invoice = await Invoice.findByPk(invoice_id, { transaction });
      if (invoice) {
        const newPaid = roundToTwo(parseFloat(invoice.paid_amount) + payAmount);
        const newBal = Math.max(0, roundToTwo(parseFloat(invoice.total_amount) - newPaid));
        const newStatus = newBal === 0 ? 'PAID' : 'PARTIAL';
        await invoice.update({
          paid_amount: newPaid,
          balance_amount: newBal,
          status: newStatus,
        }, { transaction });
      }
    }

    // Customer Ledger Entry
    const lastLedger = await CustomerLedger.findOne({
      where: { customer_id },
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      transaction,
    });

    const previousBalance = lastLedger ? parseFloat(lastLedger.running_balance) : 0;
    const newBalance = roundToTwo(previousBalance - payAmount);

    await CustomerLedger.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      customer_id,
      entry_date: payment.payment_date,
      entry_type: 'PAYMENT',
      reference_id: payment.id,
      reference_number: payment.payment_number,
      description: `Payment received via ${payment.payment_method} (${payment.reference_number || 'N/A'})`,
      debit_amount: 0.00,
      credit_amount: payAmount,
      running_balance: newBalance,
    }, { transaction });

    await Customer.update({ current_balance: newBalance }, { where: { id: customer_id }, transaction });

    await transaction.commit();

    return successResponse(res, 'Payment recorded and ledger updated', payment, 201);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

const getCustomerLedger = async (req, res) => {
  try {
    const { CustomerLedger } = req.tenantDb || defaultModels;
    const { customer_id } = req.params;
    const ledger = await CustomerLedger.findAll({
      where: { customer_id, tenant_id: req.tenant.tenantId },
      order: [['entry_date', 'ASC'], ['created_at', 'ASC']],
    });
    return successResponse(res, 'Customer ledger statements', ledger);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listInvoices,
  createInvoice,
  recordPayment,
  getCustomerLedger,
};
