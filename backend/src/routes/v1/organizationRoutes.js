// src/routes/v1/organizationRoutes.js
const express = require('express');
const router = express.Router();
const organizationController = require('../../controllers/organizationController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/profile', organizationController.getOrganizationProfile);
router.patch('/terminology', organizationController.updateTerminology);
router.get('/branches', organizationController.listBranches);
router.get('/docket-series', organizationController.getDocketSeries);
router.patch('/docket-series', organizationController.updateDocketSeries);
router.get('/trip-series', organizationController.getTripSeries);
router.patch('/trip-series', organizationController.updateTripSeries);

module.exports = router;
