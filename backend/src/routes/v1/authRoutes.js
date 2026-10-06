// src/routes/v1/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.post('/register', authController.register);
router.get('/plans', authController.getPlans);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, tenantResolver, authController.me);

module.exports = router;
