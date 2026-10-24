// backend/src/controllers/superAdminController.js
const {
  Tenant,
  Organization,
  User,
  Branch,
  Consignment,
  SaaSSubscription,
  SaaSPlan,
  Trip,
  Vehicle,
  Ticket,
} = require('../models');
const { getTenantConnection } = require('../services/tenantDbManager');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

/**
 * SuperAdmin: Overview Platform Metrics
 * Accurately aggregates Master DB telemetry and isolated multi-tenant databases
 */
const getOverviewMetrics = async (req, res) => {
  try {
    const totalTenants = await Tenant.count();
    const activeTenants = await Tenant.count({ where: { status: 'ACTIVE' } });
    const trialTenants = await Tenant.count({ where: { status: 'TRIAL' } });
    const suspendedTenants = await Tenant.count({ where: { status: 'SUSPENDED' } });

    const totalUsers = await User.count().catch(() => 0);
    const openTickets = Ticket
      ? await Ticket.count({
          where: { status: { [Op.in]: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
        }).catch(() => 0)
      : 0;

    // Cross-database multi-tenant operational aggregation
    const allTenants = await Tenant.findAll({
      attributes: ['id', 'name', 'database_name', 'status'],
    }).catch(() => []);

    let totalBranches = 0;
    let totalConsignments = 0;
    let totalTrips = 0;
    let totalVehicles = 0;

    await Promise.all(
      allTenants.map(async (t) => {
        if (!t.database_name) return;
        try {
          const tConn = await getTenantConnection(t.database_name).catch(() => null);
          if (tConn?.models) {
            const [bCount, cCount, trCount, vCount] = await Promise.all([
              tConn.models.Branch ? tConn.models.Branch.count().catch(() => 0) : 0,
              tConn.models.Consignment ? tConn.models.Consignment.count().catch(() => 0) : 0,
              tConn.models.Trip ? tConn.models.Trip.count().catch(() => 0) : 0,
              tConn.models.Vehicle ? tConn.models.Vehicle.count().catch(() => 0) : 0,
            ]);
            totalBranches += bCount;
            totalConsignments += cCount;
            totalTrips += trCount;
            totalVehicles += vCount;
          }
        } catch (dbErr) {
          console.warn(`[SuperAdmin Metrics] Skip aggregation for ${t.name}:`, dbErr.message);
        }
      })
    );

    // Calculate MRR / ARR from active subscriptions
    const activeSubs = await SaaSSubscription.findAll({
      where: { status: { [Op.in]: ['ACTIVE', 'TRIAL'] } },
      include: [{ model: SaaSPlan, as: 'plan' }],
    }).catch(() => []);

    let mrr = 0;
    activeSubs.forEach((sub) => {
      const amt = parseFloat(sub.amount || 0);
      if (sub.billing_cycle === 'ANNUAL') {
        mrr += amt / 12;
      } else {
        mrr += amt;
      }
    });

    // If subscriptions are on free trial with amount 0, estimate standard MRR base
    if (mrr === 0 && totalTenants > 0) {
      mrr = totalTenants * 1000;
    }

    const arr = mrr * 12;

    return successResponse(res, 'SuperAdmin platform metrics fetched', {
      metrics: {
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        totalBranches,
        totalConsignments,
        totalTrips,
        totalVehicles,
        totalUsers,
        openTickets,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
      },
    });
  } catch (error) {
    console.error('SuperAdmin getOverviewMetrics error:', error);
    return errorResponse(res, error.message || 'Failed to fetch platform metrics', null, 500);
  }
};

/**
 * SuperAdmin: List All Transporters / Tenants with details
 */
const listTenants = async (req, res) => {
  try {
    const { search, status, limit = 50, page = 1 } = req.query;

    const whereClause = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search && search.trim()) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows: tenants } = await Tenant.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    // Enhance each tenant with organization, subscription, owner, and multi-tenant metrics
    const tenantDetails = await Promise.all(
      tenants.map(async (t) => {
        let org = await Organization.findOne({
          where: { tenant_id: t.id },
        }).catch(() => null);

        // Fallback organization search if tenant_id didn't match
        if (!org) {
          org = await Organization.findOne({
            where: {
              [Op.or]: [
                { business_name: t.name },
                { legal_name: t.name },
              ],
            },
          }).catch(() => null);
        }

        const sub = await SaaSSubscription.findOne({
          where: { tenant_id: t.id },
          include: [{ model: SaaSPlan, as: 'plan' }],
          order: [['created_at', 'DESC']],
        }).catch(() => null);

        const ownerUser = await User.findOne({
          where: {
            tenant_id: t.id,
          },
          order: [['created_at', 'ASC']],
        }).catch(() => null);

        // Calculate trial days remaining
        let daysRemaining = null;
        if (sub?.trial_end) {
          const diffTime = new Date(sub.trial_end) - new Date();
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        } else if (org?.settings?.trial_end_date) {
          const diffTime = new Date(org.settings.trial_end_date) - new Date();
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        // Fetch live branch and consignment counts from isolated tenant database
        let branchCount = 0;
        let biltyCount = 0;
        if (t.database_name) {
          try {
            const tConn = await getTenantConnection(t.database_name).catch(() => null);
            if (tConn?.models?.Branch) {
              branchCount = await tConn.models.Branch.count().catch(() => 0);
            }
            if (tConn?.models?.Consignment) {
              biltyCount = await tConn.models.Consignment.count().catch(() => 0);
            }
          } catch (_) {}
        }

        return {
          id: t.id,
          name: t.name,
          database_name: t.database_name,
          status: t.status,
          createdAt: t.created_at || t.createdAt,
          organization: org
            ? {
                id: org.id,
                business_name: org.business_name || t.name,
                legal_name: org.legal_name,
                city: org.city,
                state: org.state,
                pincode: org.pincode,
                phone: org.phone,
                email: org.email,
                gstin: org.gstin,
                logo_url: org.logo_url,
                transporter_type: org.settings?.transporter_type || org.settings?.transporterType || 'BOTH',
                transporter_subtype: org.settings?.transporter_subtype || 'COMPLETE_FTL',
              }
            : {
                id: t.id,
                business_name: t.name,
                transporter_type: 'BOTH',
                transporter_subtype: 'COMPLETE_FTL',
              },
          owner: ownerUser
            ? {
                id: ownerUser.id,
                name: `${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() || ownerUser.email,
                email: ownerUser.email,
                phone: ownerUser.phone,
              }
            : null,
          subscription: sub
            ? {
                id: sub.id,
                plan_code: sub.plan?.plan_code || 'PRO',
                plan_name: sub.plan?.name || 'Pro Plan (Trial)',
                billing_cycle: sub.billing_cycle,
                amount: sub.amount,
                status: sub.status,
                trial_end: sub.trial_end,
                daysRemaining,
              }
            : {
                id: `trial-${t.id}`,
                plan_code: org?.settings?.registered_plan || 'PRO',
                plan_name: '30-Day Pro Trial',
                billing_cycle: 'MONTHLY',
                amount: 1000,
                status: t.status || 'TRIAL',
                trial_end: org?.settings?.trial_end_date,
                daysRemaining,
              },
          metrics: {
            branches: branchCount,
            bilties: biltyCount,
          },
        };
      })
    );

    return successResponse(res, 'Transporters fetched successfully', {
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      tenants: tenantDetails,
    });
  } catch (error) {
    console.error('SuperAdmin listTenants error:', error);
    return errorResponse(res, error.message || 'Failed to list transporters', null, 500);
  }
};

/**
 * SuperAdmin: Get Specific Tenant Details
 */
const getTenantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return errorResponse(res, 'Tenant not found', null, 404);
    }

    let org = await Organization.findOne({ where: { tenant_id: tenant.id } });
    if (!org) {
      org = await Organization.findOne({
        where: {
          [Op.or]: [
            { business_name: tenant.name },
            { legal_name: tenant.name },
          ],
        },
      }).catch(() => null);
    }

    const sub = await SaaSSubscription.findOne({
      where: { tenant_id: tenant.id },
      include: [{ model: SaaSPlan, as: 'plan' }],
      order: [['created_at', 'DESC']],
    });

    const users = await User.findAll({
      where: { tenant_id: tenant.id },
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'status', 'created_at'],
      order: [['created_at', 'ASC']],
    });

    // Fetch branches from tenant DB
    let branches = [];
    if (tenant.database_name) {
      try {
        const tConn = await getTenantConnection(tenant.database_name).catch(() => null);
        if (tConn?.models?.Branch) {
          branches = await tConn.models.Branch.findAll({
            order: [['created_at', 'ASC']],
          }).catch(() => []);
        }
      } catch (_) {}
    }

    return successResponse(res, 'Tenant details fetched', {
      tenant,
      organization: org,
      subscription: sub,
      users,
      branches,
    });
  } catch (error) {
    console.error('SuperAdmin getTenantDetails error:', error);
    return errorResponse(res, error.message || 'Failed to get tenant details', null, 500);
  }
};

/**
 * SuperAdmin: Update Tenant Plan & Quota / Extend Trial
 */
const updateTenantPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      plan_code,
      trial_days_add,
      billing_cycle,
      status,
      transporter_type,
      transporterType,
      transporter_subtype,
      transporterSubType,
    } = req.body;

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return errorResponse(res, 'Tenant not found', null, 404);
    }

    let sub = await SaaSSubscription.findOne({
      where: { tenant_id: tenant.id },
      order: [['created_at', 'DESC']],
    });

    if (plan_code) {
      const plan = await SaaSPlan.findOne({ where: { plan_code: plan_code.toUpperCase() } });
      if (plan) {
        if (sub) {
          sub.plan_id = plan.id;
          if (billing_cycle) sub.billing_cycle = billing_cycle;
          sub.amount = billing_cycle === 'ANNUAL' ? plan.price_annual : plan.price_monthly;
          if (status) sub.status = status;
          await sub.save();
        }
      }
    }

    if (trial_days_add && sub) {
      const currentEnd = sub.trial_end ? new Date(sub.trial_end) : new Date();
      currentEnd.setDate(currentEnd.getDate() + parseInt(trial_days_add, 10));
      sub.trial_end = currentEnd.toISOString().split('T')[0];
      sub.status = 'TRIAL';
      await sub.save();
    }

    // Resolve & Persist Transporter Operations Movement Mode (FTL / PTL / BOTH)
    const rawTType = transporter_type || transporterType;
    const rawTSubType = transporter_subtype || transporterSubType;

    let validTransporterType = null;
    if (rawTType && ['FTL', 'PTL', 'BOTH'].includes(String(rawTType).toUpperCase().trim())) {
      validTransporterType = String(rawTType).toUpperCase().trim();
    }

    let validTransporterSubType = null;
    if (rawTSubType && ['FLEET_SUPPLIER', 'DIRECT_CARRIER', 'COMPLETE_FTL'].includes(String(rawTSubType).toUpperCase().trim())) {
      validTransporterSubType = String(rawTSubType).toUpperCase().trim();
    }

    let org = await Organization.findOne({ where: { tenant_id: tenant.id } });
    if (!org) {
      org = await Organization.findOne({
        where: {
          [Op.or]: [
            { business_name: tenant.name },
            { legal_name: tenant.name },
          ],
        },
      }).catch(() => null);
    }

    if (org && validTransporterType) {
      const prevSettings = typeof org.settings === 'object' && org.settings !== null ? { ...org.settings } : {};
      prevSettings.transporter_type = validTransporterType;
      prevSettings.transporterType = validTransporterType;
      if (validTransporterType === 'FTL') {
        prevSettings.transporter_subtype = validTransporterSubType || prevSettings.transporter_subtype || 'COMPLETE_FTL';
        prevSettings.transporterSubType = prevSettings.transporter_subtype;
      } else {
        prevSettings.transporter_subtype = null;
        prevSettings.transporterSubType = null;
      }
      org.settings = prevSettings;
      await org.save();
    }

    // Also synchronize settings to the isolated tenant database if created
    if (tenant.database_name && validTransporterType) {
      try {
        const tConn = await getTenantConnection(tenant.database_name).catch(() => null);
        if (tConn?.models?.Organization) {
          const tOrgs = await tConn.models.Organization.findAll().catch(() => []);
          for (const tOrg of tOrgs) {
            const tPrev = typeof tOrg.settings === 'object' && tOrg.settings !== null ? { ...tOrg.settings } : {};
            tPrev.transporter_type = validTransporterType;
            tPrev.transporterType = validTransporterType;
            if (validTransporterType === 'FTL') {
              tPrev.transporter_subtype = validTransporterSubType || tPrev.transporter_subtype || 'COMPLETE_FTL';
              tPrev.transporterSubType = tPrev.transporter_subtype;
            } else {
              tPrev.transporter_subtype = null;
              tPrev.transporterSubType = null;
            }
            tOrg.settings = tPrev;
            await tOrg.save();
          }
        }
      } catch (syncErr) {
        console.warn('⚠️ Could not sync tenant db organization operations mode:', syncErr.message);
      }
    }

    return successResponse(res, 'Tenant subscription plan and operation mode updated successfully', {
      subscription: sub,
      transporter_type: validTransporterType || org?.settings?.transporter_type || 'BOTH',
      transporter_subtype: validTransporterSubType || org?.settings?.transporter_subtype || null,
      organization: org,
    });
  } catch (error) {
    console.error('SuperAdmin updateTenantPlan error:', error);
    return errorResponse(res, error.message || 'Failed to update tenant plan', null, 500);
  }
};

/**
 * SuperAdmin: Suspend / Activate Tenant
 */
const updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'TRIAL', 'SUSPENDED'].includes(status)) {
      return errorResponse(res, 'Invalid status value. Must be ACTIVE, TRIAL, or SUSPENDED.', null, 400);
    }

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return errorResponse(res, 'Tenant not found', null, 404);
    }

    tenant.status = status;
    await tenant.save();

    return successResponse(res, `Tenant account status updated to ${status}`, { tenant });
  } catch (error) {
    console.error('SuperAdmin updateTenantStatus error:', error);
    return errorResponse(res, error.message || 'Failed to update tenant status', null, 500);
  }
};

/**
 * SuperAdmin: Live Platform Activity Stream
 */
const getPlatformActivity = async (req, res) => {
  try {
    const recentTenants = await Tenant.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
    }).catch(() => []);

    const recentTickets = Ticket
      ? await Ticket.findAll({
          order: [['created_at', 'DESC']],
          limit: 10,
        }).catch(() => [])
      : [];

    const recentSubs = await SaaSSubscription.findAll({
      order: [['created_at', 'DESC']],
      include: [{ model: SaaSPlan, as: 'plan' }],
      limit: 5,
    }).catch(() => []);

    const activities = [
      ...recentTenants.map((t) => ({
        id: `tenant-${t.id}`,
        type: 'REGISTRATION',
        title: `Transporter Provisioned: ${t.name}`,
        subtitle: `Status: ${t.status} • Isolated DB Provisioned`,
        timestamp: t.created_at || t.createdAt,
        icon: 'Building2',
      })),
      ...recentSubs.map((s) => ({
        id: `sub-${s.id}`,
        type: 'SUBSCRIPTION',
        title: `Subscription: ${s.plan?.name || 'SaaS Plan'}`,
        subtitle: `Billing: ${s.billing_cycle || 'MONTHLY'} • Status: ${s.status}`,
        timestamp: s.created_at || s.createdAt,
        icon: 'CreditCard',
      })),
      ...recentTickets.map((tk) => ({
        id: `ticket-${tk.id}`,
        type: 'SUPPORT_TICKET',
        title: `Support Ticket #${tk.ticket_number || tk.id.slice(0, 8)}: ${tk.subject || 'Inquiry'}`,
        subtitle: `Priority: ${tk.priority || 'Normal'} • Status: ${tk.status}`,
        timestamp: tk.created_at || tk.createdAt,
        icon: 'HelpCircle',
      })),
    ]
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    return successResponse(res, 'Platform activity fetched', { activities });
  } catch (error) {
    console.error('SuperAdmin getPlatformActivity error:', error);
    return errorResponse(res, error.message || 'Failed to fetch platform activity', null, 500);
  }
};

/**
 * SuperAdmin: List support tickets and escalations across all transporters
 */
const listSupportTickets = async (req, res) => {
  try {
    const { status, priority, search, tenant_id } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (tenant_id && tenant_id !== 'ALL') {
      where.tenant_id = tenant_id;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { ticket_number: { [Op.like]: q } },
        { subject: { [Op.like]: q } },
        { description: { [Op.like]: q } },
      ];
    }

    let tickets = [];
    if (Ticket) {
      tickets = await Ticket.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 50,
      }).catch(() => []);
    }

    // Enrich tickets with Tenant/Organization info
    const enrichedTickets = await Promise.all(
      tickets.map(async (tk) => {
        const plain = tk.toJSON ? tk.toJSON() : tk;
        let tenantInfo = null;
        let orgInfo = null;

        if (plain.tenant_id) {
          tenantInfo = await Tenant.findByPk(plain.tenant_id, {
            attributes: ['id', 'name', 'status'],
          }).catch(() => null);
        }

        if (plain.organization_id) {
          orgInfo = await Organization.findByPk(plain.organization_id, {
            attributes: ['id', 'business_name', 'phone', 'email', 'city', 'state'],
          }).catch(() => null);
        }

        return {
          ...plain,
          tenant: tenantInfo,
          organization: orgInfo,
        };
      })
    );

    const totalCount = enrichedTickets.length;
    const openCount = enrichedTickets.filter((t) => t.status === 'OPEN').length;
    const inProgressCount = enrichedTickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const escalatedCount = enrichedTickets.filter((t) => t.is_escalated || t.status === 'ESCALATED').length;
    const resolvedCount = enrichedTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

    return successResponse(res, 'SuperAdmin tickets fetched', {
      tickets: enrichedTickets,
      stats: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        escalated: escalatedCount,
        resolved: resolvedCount,
      },
    });
  } catch (error) {
    console.error('SuperAdmin listSupportTickets error:', error);
    return errorResponse(res, error.message || 'Failed to list tickets', null, 500);
  }
};

/**
 * SuperAdmin: Update Ticket Resolution or Status
 */
const updateTicketResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_note } = req.body;

    if (!Ticket) {
      return errorResponse(res, 'Ticket model unavailable', null, 400);
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', null, 404);
    }

    const updates = {};
    if (status) updates.status = status;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updates.resolved_at = new Date();
      updates.resolved_by = req.user?.id;
    }
    if (resolution_note) {
      updates.resolution_note = resolution_note;
    }

    await ticket.update(updates);

    return successResponse(res, 'Ticket updated successfully', { ticket });
  } catch (error) {
    console.error('SuperAdmin updateTicketResolution error:', error);
    return errorResponse(res, error.message || 'Failed to update ticket', null, 500);
  }
};

module.exports = {
  getOverviewMetrics,
  listTenants,
  getTenantDetails,
  updateTenantPlan,
  updateTenantStatus,
  getPlatformActivity,
  listSupportTickets,
  updateTicketResolution,
};
