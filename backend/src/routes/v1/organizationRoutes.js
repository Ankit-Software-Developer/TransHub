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

module.exports = router;
