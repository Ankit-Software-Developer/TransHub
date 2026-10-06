// src/routes/v1/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboardController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');
const branchAccess = require('../../middleware/branchAccess');

router.get('/owner', authenticate, tenantResolver, branchAccess, dashboardController.getOwnerDashboard);
router.get('/super-admin', authenticate, tenantResolver, dashboardController.getSuperAdminDashboard);

module.exports = router;
