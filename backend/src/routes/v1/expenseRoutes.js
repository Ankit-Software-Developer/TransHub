// src/routes/v1/expenseRoutes.js
const express = require('express');
const router = express.Router();
const expenseController = require('../../controllers/expenseController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/summary', expenseController.getExpenseSummary);
router.get('/categories', expenseController.listCategories);
router.get('/fuel-logs', expenseController.listFuelLogs);
router.post('/fuel-logs', expenseController.createFuelLog);
router.get('/advances', expenseController.listDriverAdvances);
router.post('/advance', expenseController.createDriverAdvance);
router.post('/settle', expenseController.settleTrip);
router.get('/trip-wise', expenseController.listTripWiseExpenses);

router.get('/', expenseController.listExpenses);
router.post('/', expenseController.createExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
