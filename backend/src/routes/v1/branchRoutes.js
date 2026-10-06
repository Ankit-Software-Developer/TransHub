// src/routes/v1/branchRoutes.js
const express = require('express');
const router = express.Router();
const branchController = require('../../controllers/branchController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/', branchController.listBranches);
router.post('/', branchController.createBranch);
router.get('/:id', branchController.getBranch);
router.put('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);

module.exports = router;
