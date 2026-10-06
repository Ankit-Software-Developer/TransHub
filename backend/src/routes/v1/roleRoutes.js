// src/routes/v1/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../../controllers/roleController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

router.get('/', roleController.listRoles);
router.get('/permissions', roleController.listPermissions);
router.put('/:id/permissions', roleController.updateRolePermissions);
router.put('/:id', roleController.updateRole);
router.delete('/:id', roleController.deleteRole);
router.post('/', roleController.createRole);

module.exports = router;
