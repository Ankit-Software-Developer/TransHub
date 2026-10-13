// src/routes/v1/branchCashClosureRoutes.js
const express = require('express');
const router = express.Router();
const branchCashClosureController = require('../../controllers/branchCashClosureController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

// 1. Current Branch Collection Balance & Remittance Status
router.get('/current-balance', branchCashClosureController.getCurrentBalance);

// 2. Remit Cash to Bank & Close Branch Daybook
router.post('/remit', branchCashClosureController.remitToBank);

// 3. List Branch Remittance & Closure History
router.get('/history', branchCashClosureController.getClosureHistory);

// 4. Verify & Approve Bank Remittance (Admin / Finance)
router.patch('/:id/verify', branchCashClosureController.verifyClosure);

module.exports = router;
