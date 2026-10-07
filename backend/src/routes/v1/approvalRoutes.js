// src/routes/v1/approvalRoutes.js
const express = require('express');
const router = express.Router();
const approvalController = require('../../controllers/approvalController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/', approvalController.listApprovals);
router.get('/badge-counts', approvalController.getBadgeCounts);
router.get('/:id', approvalController.getApprovalById);
router.post('/', approvalController.createApproval);
router.patch('/:id/action', approvalController.handleAction);

module.exports = router;
