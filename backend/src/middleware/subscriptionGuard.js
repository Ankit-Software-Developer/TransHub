// src/middleware/subscriptionGuard.js
const { errorResponse } = require('../utils/apiResponse');
const { SaaSSubscription, SaaSPlan } = require('../models');

/**
 * Validates organization's SaaS subscription status and feature quotas.
 */
const subscriptionGuard = (requiredFeature = null) => {
  return async (req, res, next) => {
    // Super admins bypass subscription guards
    if (req.tenant?.isSuperAdmin) {
      return next();
    }

    try {
      const sub = await SaaSSubscription.findOne({
        where: { organization_id: req.tenant.organizationId },
        include: [{ model: SaaSPlan, as: 'plan' }],
      });

      if (!sub) {
        // Allow trial if not explicitly expired
        return next();
      }

      if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
        return errorResponse(res, 'SaaS subscription has expired. Please renew your plan.', null, 402);
      }

      // Feature flag check
      if (requiredFeature && sub.plan) {
        if (!sub.plan[requiredFeature]) {
          return errorResponse(res, `Your current plan (${sub.plan.name}) does not include this feature. Please upgrade.`, null, 403);
        }
      }

      req.subscription = sub;
      next();
    } catch (error) {
      return errorResponse(res, 'Error verifying subscription status', error.message, 500);
    }
  };
};

module.exports = subscriptionGuard;
