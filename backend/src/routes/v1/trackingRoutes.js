// src/routes/v1/trackingRoutes.js
const express = require('express');
const router = express.Router();
const trackingController = require('../../controllers/trackingController');

// Support both /track?lr=XYZ and /track/* (slashes in LR)
router.get('/', trackingController.trackShipment);
router.get('/*', trackingController.trackShipment);

module.exports = router;
