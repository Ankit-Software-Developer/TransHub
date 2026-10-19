// src/controllers/approvalController.js
const { Op } = require('sequelize');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');

/**
 * List Approval Requests with Tab Filtering (inbox, outbox, branch, all)
 */
exports.listApprovals = async (req, res) => {
  try {
    const { ApprovalRequest, User, Branch } = req.tenantDb;
    if (!ApprovalRequest) {
      return errorResponse(res, 'Approval model not loaded in tenant database', null, 500);
    }

    const {
      tab = 'inbox',
      page = 1,
      limit = 20,
      status,
      request_type,
      branch_id,
      priority,
      search,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const isSuperOrAdmin = req.userRoles && (
      req.userRoles.includes('ADMIN') ||
      req.userRoles.includes('SUPER_ADMIN') ||
      req.userRoles.includes('TRANSPORT_OWNER') ||
      (req.userPermissions && req.userPermissions.includes('*'))
    );

    const isBranchManager = req.userRoles && (
      req.userRoles.includes('BRANCH_MANAGER') ||
      req.userRoles.includes('HUB_MANAGER')
    );

    const userBranchId = req.user?.branch_id || req.user?.branch?.id;
    const userId = req.user?.id;

    const where = {};

    // Tab-based routing logic
    if (tab === 'inbox') {
      // Requests waiting on current user's action (Incoming Inbox)
      if (isSuperOrAdmin) {
        // Admin sees incoming requests from branches/staff awaiting Head Office action
        where[Op.and] = [
          { status: { [Op.in]: ['PENDING', 'ESCALATED'] } },
          {
            [Op.or]: [
              { approval_level: 'ADMIN' },
              { status: 'ESCALATED' },
            ],
          },
          ...(userId ? [{ requester_id: { [Op.ne]: userId } }] : []), // Incoming inbox shows requests from OTHERS
        ];
      } else if (isBranchManager) {
        // Branch Manager sees pending requests from their specific branch at BRANCH_MANAGER/HUB_MANAGER level
        where[Op.and] = [
          { status: 'PENDING' },
          { approval_level: { [Op.in]: ['BRANCH_MANAGER', 'HUB_MANAGER'] } },
          userBranchId ? { branch_id: userBranchId } : {},
          { requester_id: { [Op.ne]: userId } }, // Cannot approve own requests
        ];
      } else {
        // Regular staff: only explicitly assigned to them
        where[Op.and] = [
          { status: 'PENDING' },
          { assigned_user_id: userId },
          ...(userId ? [{ requester_id: { [Op.ne]: userId } }] : []),
        ];
      }
    } else if (tab === 'outbox') {
      // Requests created by the logged in user (My Created Requests)
      where.requester_id = userId;
    } else if (tab === 'branch') {
      // All requests originating from user's branch (or filter branch)
      if (branch_id && branch_id !== 'ALL') {
        where.branch_id = branch_id;
      } else if (!isSuperOrAdmin && userBranchId) {
        where.branch_id = userBranchId;
      }
    } else if (tab === 'history') {
      // Strictly completed/finalized decisions for audit trail
      where.status = { [Op.in]: ['APPROVED', 'REJECTED', 'CANCELLED'] };
      if (!isSuperOrAdmin && !isBranchManager) {
        where.requester_id = userId;
      } else if (isBranchManager && !isSuperOrAdmin && userBranchId) {
        where[Op.or] = [
          { branch_id: userBranchId },
          { requester_id: userId },
        ];
      }
    } else if (tab === 'all') {
      // All requests
      if (!isSuperOrAdmin && !isBranchManager) {
        where.requester_id = userId;
      } else if (isBranchManager && !isSuperOrAdmin && userBranchId) {
        where[Op.or] = [
          { branch_id: userBranchId },
          { requester_id: userId },
        ];
      }
    }

    // Additional query filters
    if (status && status !== 'ALL') {
      if (tab === 'history') {
        if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
          where.status = status;
        }
      } else {
        where.status = status;
      }
    }
    if (request_type && request_type !== 'ALL') {
      where.request_type = request_type;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }
    if (branch_id && tab !== 'branch') {
      where.branch_id = branch_id;
    }

    // Search by reference code or notes
    if (search && search.trim()) {
      where[Op.or] = [
        { reference_code: { [Op.like]: `%${search.trim()}%` } },
        { requester_notes: { [Op.like]: `%${search.trim()}%` } },
        { reviewer_comments: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows } = await ApprovalRequest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false,
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_name', 'branch_code', 'is_hub', 'city'],
          required: false,
        },
      ],
      order: [
        ['created_at', 'DESC'],
      ],
      limit: limitNum,
      offset,
    });

    return paginatedResponse(res, 'Approval requests fetched successfully', rows, {
      page: pageNum,
      limit: limitNum,
      total: count,
      pages: Math.ceil(count / limitNum),
    });
  } catch (error) {
    console.error('listApprovals error:', error);
    return errorResponse(res, 'Failed to fetch approval requests', error.message, 500);
  }
};

/**
 * Get Badge Counters (Pending Action, Approved Today, Rejected, My Submissions)
 */
exports.getBadgeCounts = async (req, res) => {
  try {
    const { ApprovalRequest } = req.tenantDb;
    if (!ApprovalRequest) {
      return successResponse(res, 'Badge counts', {
        pendingAction: 0,
        approvedCount: 0,
        rejectedCount: 0,
        escalatedCount: 0,
        myPendingCount: 0,
      });
    }

    const userId = req.user?.id;
    const userBranchId = req.user?.branch_id || req.user?.branch?.id;

    const isSuperOrAdmin = req.userRoles && (
      req.userRoles.includes('ADMIN') ||
      req.userRoles.includes('SUPER_ADMIN') ||
      req.userRoles.includes('TRANSPORT_OWNER') ||
      (req.userPermissions && req.userPermissions.includes('*'))
    );

    const isBranchManager = req.userRoles && (
      req.userRoles.includes('BRANCH_MANAGER') ||
      req.userRoles.includes('HUB_MANAGER')
    );

    // Pending for current user (Incoming to action)
    let pendingActionWhere = { status: 'PENDING' };
    if (isSuperOrAdmin) {
      pendingActionWhere = {
        status: { [Op.in]: ['PENDING', 'ESCALATED'] },
        [Op.or]: [
          { approval_level: 'ADMIN' },
          { status: 'ESCALATED' },
        ],
        ...(userId ? { requester_id: { [Op.ne]: userId } } : {}),
      };
    } else if (isBranchManager) {
      pendingActionWhere = {
        status: 'PENDING',
        approval_level: { [Op.in]: ['BRANCH_MANAGER', 'HUB_MANAGER'] },
        ...(userBranchId ? { branch_id: userBranchId } : {}),
        ...(userId ? { requester_id: { [Op.ne]: userId } } : {}),
      };
    } else {
      pendingActionWhere = {
        status: 'PENDING',
        assigned_user_id: userId,
        ...(userId ? { requester_id: { [Op.ne]: userId } } : {}),
      };
    }

    const [pendingAction, approvedCount, rejectedCount, escalatedCount, returnedCount, myPendingCount, myReturnedCount, myTotalCount] = await Promise.all([
      ApprovalRequest.count({ where: pendingActionWhere }),
      ApprovalRequest.count({ where: { status: 'APPROVED' } }),
      ApprovalRequest.count({ where: { status: 'REJECTED' } }),
      ApprovalRequest.count({ where: { status: 'ESCALATED' } }),
      ApprovalRequest.count({ where: { status: 'RETURNED' } }),
      userId ? ApprovalRequest.count({ where: { requester_id: userId, status: 'PENDING' } }) : 0,
      userId ? ApprovalRequest.count({ where: { requester_id: userId, status: 'RETURNED' } }) : 0,
      userId ? ApprovalRequest.count({ where: { requester_id: userId } }) : 0,
    ]);

    return successResponse(res, 'Approval badge counts', {
      pendingAction,
      approvedCount,
      rejectedCount,
      escalatedCount,
      returnedCount,
      myPendingCount,
      myReturnedCount,
      myTotalCount,
    });
  } catch (error) {
    console.error('getBadgeCounts error:', error);
    return errorResponse(res, 'Failed to fetch approval counters', error.message, 500);
  }
};

/**
 * Get Approval Request Details By ID
 */
exports.getApprovalById = async (req, res) => {
  try {
    const { ApprovalRequest, User, Branch } = req.tenantDb;
    const { id } = req.params;

    const request = await ApprovalRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_name', 'branch_code', 'is_hub', 'city', 'state'],
        },
      ],
    });

    if (!request) {
      return errorResponse(res, 'Approval request not found', null, 404);
    }

    return successResponse(res, 'Approval request details', request);
  } catch (error) {
    console.error('getApprovalById error:', error);
    return errorResponse(res, 'Failed to retrieve approval request', error.message, 500);
  }
};

/**
 * Create a new Approval Request (Manual or System-triggered)
 */
exports.createApproval = async (req, res) => {
  try {
    const { ApprovalRequest, Branch } = req.tenantDb;
    const userId = req.user?.id;
    const organizationId = req.tenant?.organizationId || req.user?.organization_id;
    const tenantId = req.tenant?.tenantId || req.user?.tenant_id;

    const {
      request_type = 'EXPENSE_CLAIM',
      reference_id,
      reference_code,
      amount = 0,
      branch_id,
      priority = 'NORMAL',
      requester_notes,
      supporting_document_url,
      meta_data,
    } = req.body;

    const finalBranchId = branch_id || req.user?.branch_id || req.user?.branch?.id;
    if (!finalBranchId) {
      return errorResponse(res, 'Branch context is required to route an approval request', null, 400);
    }

    // Determine initial approval level based on user role and branch type
    const isSuperOrAdmin = req.userRoles && (
      req.userRoles.includes('ADMIN') ||
      req.userRoles.includes('SUPER_ADMIN') ||
      req.userRoles.includes('TRANSPORT_OWNER')
    );

    const isBranchManager = req.userRoles && (
      req.userRoles.includes('BRANCH_MANAGER') ||
      req.userRoles.includes('HUB_MANAGER')
    );

    let approvalLevel = 'BRANCH_MANAGER';
    if (isSuperOrAdmin) {
      approvalLevel = 'ADMIN';
    } else if (isBranchManager) {
      // Branch Manager submitting request -> routes to Admin
      approvalLevel = 'ADMIN';
    } else {
      // Staff member -> check if originating branch is a hub
      const branchRec = await Branch.findByPk(finalBranchId);
      if (branchRec && branchRec.is_hub) {
        approvalLevel = 'HUB_MANAGER';
      } else {
        approvalLevel = 'BRANCH_MANAGER';
      }
    }

    // High financial threshold override: if expense/advance > 20000, route directly to Admin
    if (parseFloat(amount) > 20000) {
      approvalLevel = 'ADMIN';
    }

    const newRequest = await ApprovalRequest.create({
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: finalBranchId,
      request_type,
      reference_id,
      reference_code,
      amount: parseFloat(amount) || 0,
      requester_id: userId,
      approval_level: approvalLevel,
      status: 'PENDING',
      priority,
      requester_notes,
      supporting_document_url,
      meta_data: meta_data || {},
    });

    try {
      const { logAudit } = require('../middleware/auditLogger');
      logAudit({
        req,
        action: 'CREATE',
        entityType: 'APPROVAL_REQUEST',
        entityId: newRequest.id,
        entityName: `${request_type} Request`,
        summary: `Submitted ${request_type} approval request (${priority} priority, ₹${parseFloat(amount) || 0})`,
        newValues: newRequest.toJSON ? newRequest.toJSON() : newRequest,
      });
    } catch (e) {}

    return successResponse(res, 'Approval request submitted successfully', newRequest, 201);
  } catch (error) {
    console.error('createApproval error:', error);
    return errorResponse(res, 'Failed to submit approval request', error.message, 500);
  }
};

/**
 * Handle Approval Action: APPROVE, REJECT, ESCALATE
 */
exports.handleAction = async (req, res) => {
  try {
    const { ApprovalRequest, Expense, Consignment, DriverAdvance } = req.tenantDb;
    const { id } = req.params;
    const { action, reviewer_comments } = req.body;
    const reviewerId = req.user?.id;

    if (!['APPROVE', 'REJECT', 'ESCALATE', 'RETURN'].includes(action)) {
      return errorResponse(res, "Invalid action. Must be 'APPROVE', 'REJECT', 'ESCALATE', or 'RETURN'", null, 400);
    }

    if (action !== 'APPROVE' && (!reviewer_comments || !reviewer_comments.trim())) {
      const actionText = action === 'RETURN' ? 'returning for revision' : action === 'ESCALATE' ? 'escalating to Head Office' : 'rejecting';
      return errorResponse(res, `Reviewer comments are mandatory when ${actionText} a request`, null, 400);
    }

    const request = await ApprovalRequest.findByPk(id);
    if (!request) {
      return errorResponse(res, 'Approval request not found', null, 404);
    }

    if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status)) {
      return errorResponse(res, `Request is already in a terminal state: ${request.status}`, null, 400);
    }

    // Permission validation: requester cannot approve/reject their own request
    if (request.requester_id && reviewerId && String(request.requester_id) === String(reviewerId)) {
      return errorResponse(res, 'You cannot review or approve your own request', null, 403);
    }

    const isSuperOrAdmin = req.userRoles && (
      req.userRoles.includes('ADMIN') ||
      req.userRoles.includes('SUPER_ADMIN') ||
      req.userRoles.includes('TRANSPORT_OWNER')
    );

    const isBranchManager = req.userRoles && (
      req.userRoles.includes('BRANCH_MANAGER') ||
      req.userRoles.includes('HUB_MANAGER')
    );

    const userBranchId = req.user?.branch_id || req.user?.branch?.id;

    // Role-level validation
    if (request.approval_level === 'ADMIN' && !isSuperOrAdmin) {
      return errorResponse(res, 'Only Head Office (Admin) can authorize requests routed to ADMIN level', null, 403);
    }

    if (!isSuperOrAdmin && isBranchManager) {
      if (request.approval_level !== 'BRANCH_MANAGER' && request.approval_level !== 'HUB_MANAGER') {
        return errorResponse(res, 'Branch Managers can only authorize requests at BRANCH_MANAGER or HUB_MANAGER level', null, 403);
      }
      if (userBranchId && String(request.branch_id) !== String(userBranchId)) {
        return errorResponse(res, 'Branch Managers can only review requests originating from their assigned branch', null, 403);
      }
    }

    if (action === 'APPROVE') {
      await request.update({
        status: 'APPROVED',
        reviewer_id: reviewerId,
        reviewed_at: new Date(),
        reviewer_comments: reviewer_comments || 'Approved',
      });

      // Side-effect execution on underlying entity if available
      try {
        if (request.request_type === 'EXPENSE_CLAIM' && request.reference_id && Expense) {
          await Expense.update(
            { is_approved: true, approved_by: reviewerId },
            { where: { id: request.reference_id } }
          );
        } else if (request.request_type === 'BOOKING_CANCELLATION' && request.reference_id && Consignment) {
          await Consignment.update(
            { status: 'CANCELLED' },
            { where: { id: request.reference_id } }
          );
        } else if (request.request_type === 'DRIVER_ADVANCE' && request.reference_id && DriverAdvance) {
          await DriverAdvance.update(
            { status: 'APPROVED' },
            { where: { id: request.reference_id } }
          );
        }
      } catch (sideEffectErr) {
        console.warn('Approval side-effect notice:', sideEffectErr.message);
      }

      try {
        const { logAudit } = require('../middleware/auditLogger');
        logAudit({
          req,
          action: 'APPROVE',
          entityType: 'APPROVAL_REQUEST',
          entityId: request.id,
          entityName: `${request.request_type} (${request.reference_code || request.id})`,
          summary: `Approved ${request.request_type} request for ₹${request.amount || 0}`,
          newValues: { status: 'APPROVED', reviewer_comments: reviewer_comments || 'Approved' },
        });
      } catch (e) {}

      return successResponse(res, 'Request approved successfully', request);
    }

    if (action === 'RETURN') {
      await request.update({
        status: 'RETURNED',
        reviewer_id: reviewerId,
        reviewed_at: new Date(),
        reviewer_comments,
      });

      try {
        const { logAudit } = require('../middleware/auditLogger');
        logAudit({
          req,
          action: 'RETURN',
          entityType: 'APPROVAL_REQUEST',
          entityId: request.id,
          entityName: `${request.request_type} (${request.reference_code || request.id})`,
          summary: `Returned ${request.request_type} request to requester for revision: ${reviewer_comments}`,
          newValues: { status: 'RETURNED', reviewer_comments },
        });
      } catch (e) {}

      return successResponse(res, 'Request returned to requester for clarification and revision', request);
    }

    if (action === 'REJECT') {
      await request.update({
        status: 'REJECTED',
        reviewer_id: reviewerId,
        reviewed_at: new Date(),
        reviewer_comments,
      });

      try {
        const { logAudit } = require('../middleware/auditLogger');
        logAudit({
          req,
          action: 'REJECT',
          entityType: 'APPROVAL_REQUEST',
          entityId: request.id,
          entityName: `${request.request_type} (${request.reference_code || request.id})`,
          summary: `Rejected ${request.request_type} request: ${reviewer_comments}`,
          newValues: { status: 'REJECTED', reviewer_comments },
        });
      } catch (e) {}

      return successResponse(res, 'Request rejected', request);
    }

      if (action === 'ESCALATE') {
      await request.update({
        status: 'ESCALATED',
        approval_level: 'ADMIN',
        reviewer_comments: reviewer_comments || 'Escalated to Head Office / Admin',
      });

      return successResponse(res, 'Request escalated to Head Office / Admin', request);
    }
  } catch (error) {
    console.error('handleAction error:', error);
    return errorResponse(res, 'Failed to process approval action', error.message, 500);
  }
};

/**
 * Resubmit a Returned (or Pending) Approval Request with revisions.
 * Strict Governance: Approved and Rejected requests are IMMUTABLE and cannot be edited.
 */
exports.resubmitApproval = async (req, res) => {
  try {
    const { ApprovalRequest, Branch, Expense, Consignment, DriverAdvance } = req.tenantDb;
    const { id } = req.params;
    const userId = req.user?.id;
    const {
      amount,
      priority,
      requester_notes,
      supporting_document_url,
      meta_data,
    } = req.body;

    const request = await ApprovalRequest.findByPk(id);
    if (!request) {
      return errorResponse(res, 'Approval request not found', null, 404);
    }

    // STRICT FINALITY: Once approved or rejected, the request cannot be edited or resubmitted!
    if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status)) {
      return errorResponse(
        res,
        `This request has already been ${request.status.toLowerCase()} and is permanently locked. No further modifications are permitted.`,
        null,
        403
      );
    }

    const isSuperOrAdmin = req.userRoles && (
      req.userRoles.includes('ADMIN') ||
      req.userRoles.includes('SUPER_ADMIN') ||
      req.userRoles.includes('TRANSPORT_OWNER')
    );

    // Only original requester or Admin can edit & resubmit
    if (request.requester_id && userId && String(request.requester_id) !== String(userId) && !isSuperOrAdmin) {
      return errorResponse(res, 'Only the original requester or Admin can edit and resubmit this request', null, 403);
    }

    // Preserve revision history
    const currentMeta = request.meta_data || {};
    const revisionHistory = Array.isArray(currentMeta.revisions) ? [...currentMeta.revisions] : [];
    revisionHistory.push({
      resubmitted_at: new Date().toISOString(),
      resubmitted_by: userId,
      previous_amount: request.amount,
      previous_notes: request.requester_notes,
      previous_reviewer_comments: request.reviewer_comments,
    });

    const parsedAmount = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : request.amount;

    // Recalculate approval routing level
    let approvalLevel = request.approval_level;
    const isBranchManager = req.userRoles && (
      req.userRoles.includes('BRANCH_MANAGER') ||
      req.userRoles.includes('HUB_MANAGER')
    );

    if (isSuperOrAdmin || isBranchManager) {
      approvalLevel = 'ADMIN';
    } else {
      const branchRec = await Branch.findByPk(request.branch_id);
      if (branchRec && branchRec.is_hub) {
        approvalLevel = 'HUB_MANAGER';
      } else {
        approvalLevel = 'BRANCH_MANAGER';
      }
    }

    if (parsedAmount > 20000) {
      approvalLevel = 'ADMIN';
    }

    // Update the request: reset status to PENDING so it re-enters the reviewer's incoming inbox!
    await request.update({
      amount: parsedAmount,
      priority: priority || request.priority,
      requester_notes: requester_notes !== undefined ? requester_notes : request.requester_notes,
      supporting_document_url: supporting_document_url !== undefined ? supporting_document_url : request.supporting_document_url,
      status: 'PENDING',
      approval_level: approvalLevel,
      reviewed_at: null,
      meta_data: {
        ...currentMeta,
        ...(meta_data || {}),
        revisions: revisionHistory,
        last_resubmitted_at: new Date().toISOString(),
      },
    });

    // If linked to an Expense voucher and amount/notes changed, sync the draft expense
    if (request.request_type === 'EXPENSE_CLAIM' && request.reference_id && Expense) {
      try {
        await Expense.update(
          {
            amount: parsedAmount,
            remarks: requester_notes || undefined,
            receipt_url: supporting_document_url || undefined,
          },
          { where: { id: request.reference_id } }
        );
      } catch (e) {}
    }

    // Audit trail logging
    try {
      const { logAudit } = require('../middleware/auditLogger');
      logAudit({
        req,
        action: 'RESUBMIT',
        entityType: 'APPROVAL_REQUEST',
        entityId: request.id,
        entityName: `${request.request_type} (${request.reference_code || request.id})`,
        summary: `Resubmitted ${request.request_type} #${request.reference_code || request.id} for ₹${parsedAmount} after revisions: ${requester_notes || 'Updated details'}`,
        newValues: {
          amount: parsedAmount,
          requester_notes,
          status: 'PENDING',
          approval_level: approvalLevel,
        },
      });
    } catch (e) {}

    return successResponse(res, 'Request revised and resubmitted successfully to reviewer inbox', request);
  } catch (error) {
    console.error('resubmitApproval error:', error);
    return errorResponse(res, 'Failed to resubmit approval request', error.message, 500);
  }
};
