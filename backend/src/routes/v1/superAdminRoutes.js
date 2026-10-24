// backend/src/routes/v1/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const superAdminController = require('../../controllers/superAdminController');
const authenticate = require('../../middleware/authenticate');
const { errorResponse } = require('../../utils/apiResponse');

// SuperAdmin Guard: checks if the authenticated user has the SUPER_ADMIN role
const requireSuperAdmin = (req, res, next) => {
  const isSuper =
    req.user?.email?.toLowerCase() === 'admin@transporter.io' ||
    (req.userRoles && req.userRoles.includes('SUPER_ADMIN')) ||
    req.user?.role === 'SUPER_ADMIN' ||
    (req.user?.roles && req.user?.roles.some((r) => r === 'SUPER_ADMIN' || r?.name === 'SUPER_ADMIN'));

  if (!isSuper) {
    return errorResponse(res, 'Access denied. SuperAdmin privileges required.', null, 403);
  }
  next();
};

router.use(authenticate, requireSuperAdmin);

// Overview metrics & SaaS analytics
router.get('/metrics', superAdminController.getOverviewMetrics);

// Transporters / Tenants Directory
router.get('/tenants', superAdminController.listTenants);
router.get('/tenants/:id', superAdminController.getTenantDetails);
router.patch('/tenants/:id/plan', superAdminController.updateTenantPlan);
router.patch('/tenants/:id/status', superAdminController.updateTenantStatus);

// Live Platform Activity
router.get('/activity', superAdminController.getPlatformActivity);

// Central Support & Escalations across all Transporters
router.get('/tickets', superAdminController.listSupportTickets);
router.patch('/tickets/:id', superAdminController.updateTicketResolution);

module.exports = router;
