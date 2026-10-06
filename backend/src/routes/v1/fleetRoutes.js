// src/routes/v1/fleetRoutes.js
const express = require('express');
const router = express.Router();
const fleetController = require('../../controllers/fleetController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/vehicles', fleetController.listVehicles);
router.post('/vehicles', fleetController.createVehicle);
router.get('/drivers', fleetController.listDrivers);
router.get('/alerts', fleetController.getMaintenanceAlerts);

module.exports = router;
