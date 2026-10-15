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

  const rawBranchId = req.query.branch_id || req.body.branch_id || req.params.branch_id;
  const requestedBranchId = (rawBranchId && rawBranchId !== 'ALL' && rawBranchId !== 'undefined' && rawBranchId !== 'null' && String(rawBranchId).trim() !== '')
    ? rawBranchId
    : (rawBranchId === 'ALL' ? 'ALL' : null);

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

  const userAssignedBranch = req.user?.branch_id || req.branchId;

  // Non-admin user: strictly locked to their login branch only
  if (!isGlobalUser) {
    return userAssignedBranch || null;
  }

  // Admin user: explicitly requested 'ALL' branches or unselected
  if (!requestedBranchId || requestedBranchId === 'ALL' || requestedBranchId === 'undefined' || requestedBranchId === 'null') {
    return null;
  }

  // Admin user: explicitly requested a specific branch
  return requestedBranchId;
};

branchAccess.branchAccess = branchAccess;
branchAccess.getEffectiveBranch = getEffectiveBranch;

module.exports = branchAccess;

