// src/middleware/branchAccess.js
const { errorResponse } = require('../utils/apiResponse');

/**
 * Validates branch accessibility.
 * - TRANSPORT_OWNER / ADMIN / SUPER_ADMIN can access all branches or filter by any branch.
 * - Operators (BRANCH_MANAGER, BOOKING_OPERATOR, etc.) are restricted to their assigned branch_id.
 */
const branchAccess = (req, res, next) => {
  const isGlobalUser = req.userRoles && (
    req.userRoles.includes('SUPER_ADMIN') ||
    req.userRoles.includes('TRANSPORT_OWNER') ||
    req.userRoles.includes('ADMIN')
  );

  const requestedBranchId = req.query.branch_id || req.body.branch_id || req.params.branch_id;

  if (isGlobalUser) {
    // Owner can operate on any branch or across all branches (null)
    req.branchId = requestedBranchId || null;
    return next();
  }

  // Branch-restricted user
  const userAssignedBranch = req.user.branch_id;
  if (!userAssignedBranch) {
    return errorResponse(res, 'User is not assigned to any branch', null, 403);
  }

  if (requestedBranchId && requestedBranchId !== userAssignedBranch) {
    return errorResponse(res, 'Access denied: You cannot view or modify data for another branch', null, 403);
  }

  req.branchId = userAssignedBranch;
  next();
};

module.exports = branchAccess;
