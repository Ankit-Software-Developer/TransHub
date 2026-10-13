// src/routes/v1/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/reportController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');
const branchAccess = require('../../middleware/branchAccess');

// All report routes require valid authentication, tenant resolution, and branch scoping
router.use(authenticate);
router.use(tenantResolver);
router.use(branchAccess);

// 1. Docket & Freight Sales Register
router.get('/dockets', reportController.getDocketFreightReport);

// 2. Customer Outstanding & Ageing Report
router.get('/customer-ageing', reportController.getCustomerAgeingReport);

// 3. Line-Haul Trip & Settlement Audit
router.get('/trip-profitability', reportController.getTripProfitabilityReport);

// 4. Proof of Delivery (POD) Compliance
router.get('/pod-compliance', reportController.getPodComplianceReport);

// 5. Daily Branch Cash & Collection Register
router.get('/daily-collections', reportController.getDailyCollectionReport);

// 6. GST Sales & Tax Liability Register
router.get('/gst-register', reportController.getGstTaxReport);

module.exports = router;
