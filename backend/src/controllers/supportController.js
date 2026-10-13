// src/controllers/supportController.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { paginatedResponse, successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * 1. Create a new support ticket (Branch Staff / Branch Manager -> Transporter Admin)
 */
const createTicket = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Ticket, TicketMessage, Branch, User } = m;
    const { subject, description, category, priority, reference_code, attachment_url, branch_id } = req.body;

    if (!subject || !description) {
      return errorResponse(res, 'Subject and description are required', null, 400);
    }

    const tenantId = req.tenant.tenantId;
    const organizationId = req.tenant.organizationId;
    const userId = req.user.id;
    const effectiveBranchId = branch_id || req.branchId || req.user.branch_id || null;

    // Generate unique sequential ticket number
    const count = await Ticket.count({
      where: { tenant_id: tenantId, organization_id: organizationId },
    });
    const year = new Date().getFullYear();
    const ticketNumber = `TKT-${year}-${String(count + 1).padStart(4, '0')}`;

    const newTicket = await Ticket.create({
      ticket_number: ticketNumber,
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: effectiveBranchId,
      created_by: userId,
      assigned_role: 'ADMIN', // Handed to Transporter Admin
      escalation_level: 'BRANCH_TO_ADMIN',
      is_escalated: false,
      category: category || 'OPERATIONS',
      priority: priority || 'NORMAL',
      status: 'OPEN',
      subject: subject.trim(),
      description: description.trim(),
      reference_code: reference_code ? reference_code.trim() : null,
      attachment_url: attachment_url || null,
    });

    // Automatically create initial message in thread
    const senderName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Staff Member';
    const senderRole = req.user.role || (req.user.roles && req.user.roles[0]?.name) || 'BRANCH_STAFF';

    await TicketMessage.create({
      ticket_id: newTicket.id,
      sender_id: userId,
      sender_name: senderName,
      sender_role: senderRole,
      message: description.trim(),
      attachment_url: attachment_url || null,
      is_internal_note: false,
    });

    const ticketWithDetails = await Ticket.findByPk(newTicket.id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code', 'city'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
        { model: TicketMessage, as: 'messages' },
      ],
    });

    return successResponse(res, 'Support ticket generated successfully', ticketWithDetails, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 2. Get list of tickets (Branch scoped, Transporter Admin scoped, or Super Admin escalated)
 */
const getTickets = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Ticket, Branch, User, TicketMessage } = m;
    const { status, priority, category, branch_id, search, is_escalated, page = 1, limit = 20 } = req.query;

    const userRoles = (req.user.roles || []).map((r) => (typeof r === 'string' ? r : r.name || ''));
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';
    const isTransporterAdmin =
      isSuperAdmin ||
      userRoles.includes('ADMIN') ||
      userRoles.includes('OWNER') ||
      userRoles.includes('TRANSPORT_OWNER') ||
      req.user.role === 'ADMIN';

    const where = {};

    if (isSuperAdmin) {
      // Super Admin sees escalated tickets across all tenants, or tickets explicitly escalated
      where[Op.or] = [
        { is_escalated: true },
        { assigned_role: 'SUPER_ADMIN' },
      ];
    } else {
      // Tenant isolation
      where.tenant_id = req.tenant.tenantId;
      where.organization_id = req.tenant.organizationId;

      if (!isTransporterAdmin && req.branchId) {
        // Branch staff can only see their branch tickets or tickets they created
        where[Op.or] = [
          { branch_id: req.branchId },
          { created_by: req.user.id },
        ];
      } else if (branch_id && branch_id !== 'ALL') {
        where.branch_id = branch_id;
      }
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (is_escalated === 'true') {
      where.is_escalated = true;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { ticket_number: { [Op.iLike || Op.like]: q } },
          { subject: { [Op.iLike || Op.like]: q } },
          { reference_code: { [Op.iLike || Op.like]: q } },
        ],
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Ticket.findAndCountAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code', 'city'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
        { model: TicketMessage, as: 'messages', limit: 1, order: [['created_at', 'DESC']] },
      ],
      order: [
        ['status', 'ASC'], // OPEN / IN_PROGRESS first
        ['created_at', 'DESC'],
      ],
      limit: parseInt(limit, 10),
      offset,
    });

    // Summary counts
    const countScope = isSuperAdmin
      ? { [Op.or]: [{ is_escalated: true }, { assigned_role: 'SUPER_ADMIN' }] }
      : { tenant_id: req.tenant.tenantId, organization_id: req.tenant.organizationId };

    const openCount = await Ticket.count({ where: { ...countScope, status: 'OPEN' } });
    const inProgressCount = await Ticket.count({ where: { ...countScope, status: 'IN_PROGRESS' } });
    const escalatedCount = await Ticket.count({ where: { ...countScope, is_escalated: true } });
    const resolvedCount = await Ticket.count({ where: { ...countScope, status: 'RESOLVED' } });

    const summary = {
      total: count,
      openCount,
      inProgressCount,
      escalatedCount,
      resolvedCount,
    };

    return paginatedResponse(res, 'Tickets fetched successfully', rows, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: count,
      pages: Math.ceil(count / parseInt(limit, 10)),
      summary,
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 3. Get single ticket with full message thread
 */
const getTicketById = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Ticket, Branch, User, TicketMessage } = m;
    const { id } = req.params;

    const ticket = await Ticket.findByPk(id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code', 'city'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
        {
          model: TicketMessage,
          as: 'messages',
          order: [['created_at', 'ASC']],
        },
      ],
    });

    if (!ticket) {
      return errorResponse(res, 'Ticket not found', null, 404);
    }

    return successResponse(res, 'Ticket details fetched', ticket);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 4. Reply to ticket thread
 */
const addTicketMessage = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Ticket, TicketMessage } = m;
    const { id } = req.params;
    const { message, attachment_url, is_internal_note = false } = req.body;

    if (!message || !message.trim()) {
      return errorResponse(res, 'Message text is required', null, 400);
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', null, 404);
    }

    const userRoles = (req.user.roles || []).map((r) => (typeof r === 'string' ? r : r.name || ''));
    let senderRole = 'BRANCH_STAFF';
    if (userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN') {
      senderRole = 'SUPER_ADMIN';
    } else if (
      userRoles.includes('ADMIN') ||
      userRoles.includes('OWNER') ||
      userRoles.includes('TRANSPORT_OWNER') ||
      req.user.role === 'ADMIN'
    ) {
      senderRole = 'TRANSPORTER_ADMIN';
    } else if (userRoles.includes('BRANCH_MANAGER') || req.user.role === 'BRANCH_MANAGER') {
      senderRole = 'BRANCH_MANAGER';
    }

    const senderName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Staff';

    const newMessage = await TicketMessage.create({
      ticket_id: ticket.id,
      sender_id: req.user.id,
      sender_name: senderName,
      sender_role: senderRole,
      message: message.trim(),
      attachment_url: attachment_url || null,
      is_internal_note: Boolean(is_internal_note),
    });

    // If ticket was OPEN, transition to IN_PROGRESS upon response
    if (ticket.status === 'OPEN' && senderRole !== 'BRANCH_STAFF') {
      await ticket.update({ status: 'IN_PROGRESS' });
    }

    return successResponse(res, 'Reply added to ticket', newMessage, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 5. Escalate Ticket (Transporter Admin -> Super Admin)
 */
const escalateTicketToSuperAdmin = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Ticket, TicketMessage } = m;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return errorResponse(res, 'Escalation reason is required', null, 400);
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', null, 404);
    }

    const adminName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Transporter Admin';

    await ticket.update({
      is_escalated: true,
      assigned_role: 'SUPER_ADMIN',
      escalation_level: 'ADMIN_TO_SUPERADMIN',
      status: 'ESCALATED',
      escalated_by: req.user.id,
      escalated_at: new Date(),
      escalation_reason: reason.trim(),
    });

    // Log escalation entry into message thread
    await TicketMessage.create({
      ticket_id: ticket.id,
      sender_id: req.user.id,
      sender_name: adminName,
      sender_role: 'TRANSPORTER_ADMIN',
      message: `[ESCALATED TO PLATFORM SUPER ADMIN]: ${reason.trim()}`,
      is_internal_note: false,
    });

    return successResponse(res, 'Ticket escalated to Super Admin successfully', ticket);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 6. Update Ticket Status (IN_PROGRESS, RESOLVED, CLOSED)
 */
const updateTicketStatus = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Ticket, TicketMessage } = m;
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return errorResponse(res, 'Invalid ticket status', null, 400);
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', null, 404);
    }

    const updatePayload = { status };
    if (status === 'RESOLVED') {
      updatePayload.resolved_by = req.user.id;
      updatePayload.resolved_at = new Date();
      updatePayload.resolution_notes = resolution_notes || 'Resolved';
    }

    await ticket.update(updatePayload);

    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Staff';
    await TicketMessage.create({
      ticket_id: ticket.id,
      sender_id: req.user.id,
      sender_name: userName,
      sender_role: req.user.role || 'STAFF',
      message: `[STATUS CHANGED TO ${status}]${resolution_notes ? `: ${resolution_notes}` : ''}`,
      is_internal_note: false,
    });

    return successResponse(res, `Ticket status updated to ${status}`, ticket);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 7. Get Support Badge Counts (For Sidebar & Header Notifications)
 */
const getSupportBadgeCounts = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Ticket } = m;

    const userRoles = (req.user.roles || []).map((r) => (typeof r === 'string' ? r : r.name || ''));
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

    let count = 0;
    if (isSuperAdmin) {
      count = await Ticket.count({
        where: {
          [Op.or]: [{ is_escalated: true }, { assigned_role: 'SUPER_ADMIN' }],
          status: { [Op.in]: ['OPEN', 'ESCALATED', 'IN_PROGRESS'] },
        },
      });
    } else {
      const where = {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        status: { [Op.in]: ['OPEN', 'ESCALATED', 'IN_PROGRESS'] },
      };
      if (req.branchId) {
        where.branch_id = req.branchId;
      }
      count = await Ticket.count({ where });
    }

    return successResponse(res, 'Badge counts fetched', { pendingTickets: count });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  addTicketMessage,
  escalateTicketToSuperAdmin,
  updateTicketStatus,
  getSupportBadgeCounts,
};
