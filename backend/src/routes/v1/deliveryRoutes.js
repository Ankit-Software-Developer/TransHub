// src/routes/v1/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const deliveryController = require('../../controllers/deliveryController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.post('/:id/delivered', deliveryController.markDelivered);
router.post('/:id/out-for-delivery', deliveryController.markOutForDelivery);

module.exports = router;
