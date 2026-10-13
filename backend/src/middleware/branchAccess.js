// src/middleware/branchAccess.js
const { errorResponse } = require('../utils/apiResponse');

/**
 * Validates branch accessibility.
 * - TRANSPORT_OWNER / ADMIN / SUPER_ADMIN can access all branches or filter by any branch.
 * - Operators (BRANCH_MANAGER, BOOKING_OPERATOR, etc.) are restricted to their assigned branch_id.
 */
const branchAccess = (req, res, next) => {
  const isGlobalUser = Boolean(
    req.user?.is_owner ||
    req.user?.isAdmin ||
    ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(req.user?.role) ||
    (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(r)))
  );

  const requestedBranchId = req.query.branch_id || req.body.branch_id || req.params.branch_id;

  if (isGlobalUser) {
    // Owner / Admin can operate on any branch or across all network branches (null)
    req.branchId = (requestedBranchId && requestedBranchId !== 'ALL') ? requestedBranchId : null;
    return next();
  }

  // Branch-restricted user (non-admin)
  const userAssignedBranch = req.user?.branch_id;
  if (!userAssignedBranch) {
    req.branchId = (requestedBranchId && requestedBranchId !== 'ALL') ? requestedBranchId : null;
    return next();
  }

  if (requestedBranchId && requestedBranchId !== 'ALL' && requestedBranchId !== userAssignedBranch) {
    return errorResponse(res, 'Access denied: You cannot view or modify data for another branch', null, 403);
  }

  // Non-admin is strictly bound to their assigned login branch
  req.branchId = userAssignedBranch;
  next();
};

/**
 * Returns the effective branch ID respecting tenant role boundaries.
 */
const getEffectiveBranch = (req, requestedBranchId) => {
  const isGlobalUser = Boolean(
    req.user?.is_owner ||
    req.user?.isAdmin ||
    ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(req.user?.role) ||
    (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(r)))
  );

  if (!isGlobalUser && req.user?.branch_id) {
    return req.user.branch_id;
  }

  if (requestedBranchId && requestedBranchId !== 'ALL') {
    return requestedBranchId;
  }

  if (!isGlobalUser && req.branchId && req.branchId !== 'ALL') {
    return req.branchId;
  }

  return null;
};

branchAccess.branchAccess = branchAccess;
branchAccess.getEffectiveBranch = getEffectiveBranch;

module.exports = branchAccess;

