// src/routes/v1/gpsRoutes.js
const express = require('express');
const router = express.Router();
const gpsController = require('../../controllers/gpsController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/configs', gpsController.listConfigs);
router.post('/configs', gpsController.createConfig);
router.put('/configs/:id', gpsController.updateConfig);
router.delete('/configs/:id', gpsController.deleteConfig);

router.post('/test-connection', gpsController.testConnection);
router.post('/sync-now', gpsController.syncNow);
router.get('/telemetry', gpsController.getFleetTelemetry);

module.exports = router;
