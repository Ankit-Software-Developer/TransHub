// src/routes/v1/billingRoutes.js
const express = require('express');
const router = express.Router();
const billingController = require('../../controllers/billingController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/invoices', billingController.listInvoices);
router.post('/invoices', billingController.createInvoice);
router.post('/payments', billingController.recordPayment);
router.get('/ledger/:customer_id', billingController.getCustomerLedger);

module.exports = router;
