// src/routes/v1/podRoutes.js
const express = require('express');
const router = express.Router();
const podController = require('../../controllers/podController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/', podController.listPods);
router.post('/upload', podController.uploadPod);
router.patch('/:id/verify', podController.verifyPod);

module.exports = router;
