// src/routes/v1/customerRoutes.js
const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/customerController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', customerController.createCustomer);

module.exports = router;
