// src/middleware/authorize.js
const { errorResponse } = require('../utils/apiResponse');

/**
 * RBAC authorization middleware.
 * Verifies that the authenticated user possesses required permissions or is SUPER_ADMIN / TRANSPORT_OWNER.
 */
const authorize = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', null, 401);
    }

    // Super Admin and Transport Owner have full system access
    if (
      req.userRoles.includes('SUPER_ADMIN') ||
      req.userRoles.includes('TRANSPORT_OWNER')
    ) {
      return next();
    }

    // Normalize required permissions array
    const permissionsToCheck = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    if (permissionsToCheck.length === 0) {
      return next();
    }

    // Check if user has ANY of the required permissions
    const hasPermission = permissionsToCheck.some((perm) =>
      req.userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return errorResponse(
        res,
        'Forbidden: You do not have permission to perform this action',
        { required: permissionsToCheck },
        403
      );
    }

    next();
  };
};

module.exports = authorize;
