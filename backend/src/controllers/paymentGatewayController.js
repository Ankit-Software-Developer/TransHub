// backend/src/controllers/paymentGatewayController.js
const defaultModels = require('../models');
const paymentGatewayService = require('../services/paymentGatewayService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

/**
 * 1. Generate Dynamic UPI QR Code for Consignment or Invoice
 */
const generateUpiQr = async (req, res) => {
  try {
    const {
      entity_type = 'CONSIGNMENT', // 'CONSIGNMENT' | 'INVOICE' | 'SETTINGS_PREVIEW'
      entity_id,
      amount = 0,
      reference_no,
      payer_name,
      remarks,
      vpa,
      payee_name,
    } = req.body;

    const isPreview = entity_type === 'SETTINGS_PREVIEW' || !entity_id;

    if (!isPreview && !amount) {
      return errorResponse(res, 'Amount is required to generate payment QR code', null, 400);
    }

    // Resolve organization-configured UPI ID and Payee/Merchant name
    const OrganizationModel = req.tenantDb?.Organization || defaultModels.Organization;
    let orgVpa = null;
    let orgPayeeName = null;
    if (OrganizationModel && req.tenant?.organizationId) {
      try {
        const org = await OrganizationModel.findByPk(req.tenant.organizationId);
        if (org) {
          orgVpa = org.settings?.upiId || org.settings?.upi_id || org.upi_id;
          orgPayeeName = org.settings?.accountHolderName || org.legal_name || org.business_name;
        }
      } catch (err) {
        console.warn('Could not read org UPI settings:', err.message);
      }
    }

    const effectiveVpa = (vpa || orgVpa || process.env.COMPANY_UPI_VPA || 'balajilogistics@hdfcbank').trim();
    const effectivePayee = (payee_name || orgPayeeName || process.env.COMPANY_NAME || 'Balaji Logistics').trim();

    const qrResult = await paymentGatewayService.generateDynamicUpiQr({
      amount: parseFloat(amount || 0),
      referenceId: reference_no || (entity_id ? String(entity_id) : `QR${Date.now().toString().slice(-6)}`),
      payerName: payer_name,
      remarks: remarks || `${entity_type} ${reference_no || entity_id || 'Counter'}`.trim(),
      vpa: effectiveVpa,
      payeeName: effectivePayee,
    });

    return successResponse(res, 'UPI QR Code generated successfully', qrResult);
  } catch (error) {
    console.error('generateUpiQr error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 2. Simulate Customer UPI Payment (Demo Mode) or Auto-Verify
 */
const simulateUpiPayment = async (req, res) => {
  try {
    const {
      entity_type = 'CONSIGNMENT',
      entity_id,
      amount,
      utr_number,
      bank_name = 'HDFC Bank - Main Corporate Account',
      payment_method = 'UPI',
      branch_id,
      remarks,
    } = req.body;

    const m = req.tenantDb || defaultModels;
    const tenantId = req.tenant.tenantId;
    const orgId = req.tenant.organizationId;
    const userId = req.user?.id;

    if (!entity_id) {
      return errorResponse(res, 'Entity ID is required', null, 400);
    }

    let result = null;

    if (entity_type === 'CONSIGNMENT') {
      result = await paymentGatewayService.settleConsignmentDirectToBank({
        tenantDb: m,
        tenantId,
        organizationId: orgId,
        consignmentId: entity_id,
        amount: parseFloat(amount),
        utrNumber: utr_number,
        bankName: bank_name,
        paymentMethod: payment_method,
        userId,
        branchId: branch_id || req.branchId,
        remarks,
      });

      try {
        logAudit({
          req,
          action: 'PAYMENT_SETTLED_DIRECT_BANK',
          entityType: 'CONSIGNMENT',
          entityId: result.lr_number,
          entityName: `Docket ${result.lr_number}`,
          summary: `Auto-verified direct bank payment of ₹${result.amount} via ${payment_method} (UTR: ${result.utr}). Bypasses branch cash drawer.`,
          newValues: {
            utr: result.utr,
            amount: result.amount,
            bank_name,
            payment_method,
            is_direct_bank_settled: true,
          },
        });
      } catch (auditErr) {}
    } else if (entity_type === 'INVOICE') {
      result = await paymentGatewayService.settleInvoiceDirectToBank({
        tenantDb: m,
        tenantId,
        organizationId: orgId,
        invoiceId: entity_id,
        amount: parseFloat(amount),
        utrNumber: utr_number,
        bankName: bank_name,
        paymentMethod: payment_method,
        userId,
        remarks,
      });

      try {
        logAudit({
          req,
          action: 'INVOICE_PAID_DIRECT_BANK',
          entityType: 'INVOICE',
          entityId: result.invoice_number,
          entityName: `Invoice ${result.invoice_number}`,
          summary: `Auto-verified direct bank payment of ₹${result.amount_settled} via ${payment_method} (UTR: ${result.utr}). Settled to ${result.invoice_status}.`,
          newValues: {
            utr: result.utr,
            amount_settled: result.amount_settled,
            bank_name,
            payment_method,
            invoice_status: result.invoice_status,
          },
        });
      } catch (auditErr) {}
    } else {
      return errorResponse(res, `Unsupported entity type: ${entity_type}`, null, 400);
    }

    return successResponse(res, result.message, result);
  } catch (error) {
    console.error('simulateUpiPayment error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 3. Production Bank / Gateway Webhook Listener
 * When moving to production (Razorpay / Cashfree / ICICI), the bank sends webhook callbacks here.
 */
const bankWebhook = async (req, res) => {
  try {
    const payload = req.body;
    console.log('📡 Incoming Bank Payment Webhook:', JSON.stringify(payload, null, 2));

    // Support standard webhook payloads (Razorpay, Cashfree, Setu)
    const referenceId = payload.reference_id || payload.order_id || payload.payload?.payment?.entity?.order_id;
    const amount = payload.amount || payload.order_amount || (payload.payload?.payment?.entity?.amount / 100);
    const utr = payload.utr || payload.bank_reference || payload.payload?.payment?.entity?.acquirer_data?.rrn;

    if (!referenceId) {
      return res.status(200).json({ status: 'ignored', message: 'No reference ID found' });
    }

    // In production, match referenceId to consignment or invoice and settle
    return res.status(200).json({ status: 'success', reference_id: referenceId, utr });
  } catch (error) {
    console.error('bankWebhook error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generateUpiQr,
  simulateUpiPayment,
  bankWebhook,
};
