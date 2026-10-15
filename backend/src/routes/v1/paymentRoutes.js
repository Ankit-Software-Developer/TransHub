// src/routes/v1/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentGatewayController = require('../../controllers/paymentGatewayController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

// 1. Public Bank Webhook endpoint (unauthenticated for bank server-to-server callbacks)
router.post('/webhook', paymentGatewayController.bankWebhook);

// 2. Authenticated UPI Generation & Simulation endpoints
router.post('/generate-qr', authenticate, tenantResolver, paymentGatewayController.generateUpiQr);
router.post('/simulate-upi-success', authenticate, tenantResolver, paymentGatewayController.simulateUpiPayment);

module.exports = router;
