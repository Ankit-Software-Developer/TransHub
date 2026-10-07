// src/routes/v1/auditLogRoutes.js
const express = require('express');
const router = express.Router();
const auditLogController = require('../../controllers/auditLogController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');
const authorize = require('../../middleware/authorize');

router.use(authenticate, tenantResolver);

// Strictly restricted to Admin / Super Admin / Transport Owner
router.get('/', authorize(['audit.view']), auditLogController.listAuditLogs);
router.get('/stats', authorize(['audit.view']), auditLogController.getAuditStats);
router.get('/:id', authorize(['audit.view']), auditLogController.getAuditLogDetail);

module.exports = router;
