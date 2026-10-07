// src/routes/v1/branchRoutes.js
const express = require('express');
const router = express.Router();
const branchController = require('../../controllers/branchController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');
const authorize = require('../../middleware/authorize');

router.use(authenticate, tenantResolver);

router.get('/', authorize(['branch.view', 'branch.manage']), branchController.listBranches);
router.post('/', authorize(['branch.create']), branchController.createBranch);
router.get('/:id', authorize(['branch.view', 'branch.manage']), branchController.getBranch);
router.put('/:id', authorize(['branch.manage', 'branch.update']), branchController.updateBranch);
router.delete('/:id', authorize(['branch.delete']), branchController.deleteBranch);

module.exports = router;
