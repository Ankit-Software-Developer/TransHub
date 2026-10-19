// src/routes/v1/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

const branchAccess = require('../../middleware/branchAccess');

router.use(authenticate, tenantResolver, branchAccess);

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.toggleUserStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
