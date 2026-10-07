// src/routes/v1/expenseRoutes.js
const express = require('express');
const router = express.Router();
const expenseController = require('../../controllers/expenseController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/', expenseController.listExpenses);
router.post('/', expenseController.createExpense);
router.post('/advance', expenseController.createDriverAdvance);
router.get('/categories', expenseController.listCategories);
router.post('/settle', expenseController.settleTrip);

module.exports = router;
