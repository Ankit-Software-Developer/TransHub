// src/routes/v1/billingRoutes.js
const express = require('express');
const router = express.Router();
const billingController = require('../../controllers/billingController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

// Invoices & Billing Summary
router.get('/summary', billingController.getBillingSummary);
router.get('/unbilled-consignments', billingController.getUnbilledConsignments);
router.get('/invoices', billingController.listInvoices);
router.get('/invoices/:id', billingController.getInvoiceById);
router.post('/invoices', billingController.createInvoice);
router.patch('/invoices/:id', billingController.updateInvoice);
router.post('/invoices/:id/cancel', billingController.cancelInvoice);

// Payments & Remittances
router.post('/payments', billingController.recordPayment);

// Ledger & Compliance
router.get('/ledger/:customer_id', billingController.getCustomerLedger);
router.get('/export-gstr1', billingController.exportGSTR1);

module.exports = router;
