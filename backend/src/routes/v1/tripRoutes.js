// src/routes/v1/tripRoutes.js
const express = require('express');
const router = express.Router();
const tripController = require('../../controllers/tripController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/', tripController.listTrips);
router.post('/', tripController.createTrip);
router.get('/:id', tripController.getTripDetail);
router.get('/:id/manifest', tripController.getTripUnloadManifest);
router.patch('/:id/assign-vehicle', tripController.assignVehicleToTrip);
router.post('/dispatch', tripController.createTripAndDispatch);
router.post('/:id/record-arrival', tripController.recordTripArrival);
router.post('/:id/complete-unload', tripController.completeTripAndUnload);

module.exports = router;
