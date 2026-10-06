// src/routes/v1/fleetRoutes.js
const express = require('express');
const router = express.Router();
const fleetController = require('../../controllers/fleetController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/vehicles', fleetController.listVehicles);
router.post('/vehicles', fleetController.createVehicle);
router.put('/vehicles/:id', fleetController.updateVehicle);
router.patch('/vehicles/:id/status', fleetController.toggleVehicleStatus);
router.delete('/vehicles/:id', fleetController.deleteVehicle);
router.get('/drivers', fleetController.listDrivers);
router.post('/drivers', fleetController.createDriver);
router.put('/drivers/:id', fleetController.updateDriver);
router.patch('/drivers/:id/status', fleetController.toggleDriverStatus);
router.delete('/drivers/:id', fleetController.deleteDriver);
router.get('/alerts', fleetController.getMaintenanceAlerts);

module.exports = router;
