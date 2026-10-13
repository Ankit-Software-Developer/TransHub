// src/routes/v1/supportRoutes.js
const express = require('express');
const router = express.Router();
const supportController = require('../../controllers/supportController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');
const branchAccess = require('../../middleware/branchAccess');

// All support routes require authentication, tenant resolution, and branch scoping
router.use(authenticate);
router.use(tenantResolver);
router.use(branchAccess);

// Badge counts for sidebar badge
router.get('/badge-counts', supportController.getSupportBadgeCounts);

// List tickets & Create ticket
router.get('/tickets', supportController.getTickets);
router.post('/tickets', supportController.createTicket);

// Single ticket & message replies
router.get('/tickets/:id', supportController.getTicketById);
router.post('/tickets/:id/messages', supportController.addTicketMessage);

// Escalation flow: Transporter Admin -> Super Admin
router.post('/tickets/:id/escalate', supportController.escalateTicketToSuperAdmin);

// Status updates: Resolve, Close, In Progress
router.patch('/tickets/:id/status', supportController.updateTicketStatus);

module.exports = router;
