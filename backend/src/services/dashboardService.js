// src/services/dashboardService.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { addDecimals } = require('../utils/decimalUtils');

/**
 * Aggregates live Owner Dashboard KPIs, Action Center alerts, and Branch Comparisons.
 */
const getOwnerDashboard = async ({ tenantId, organizationId, branchId = null, dateFilter = '30d', models = null }) => {
  const m = models || defaultModels;
  const {
    Consignment,
    Booking,
    Trip,
    Vehicle,
    Expense,
    Invoice,
    Payment,
    Pod,
    Branch,
    Organization,
    DailyBrief,
    VehicleMaintenance,
    Claim
  } = m;

  const whereScope = {
    tenant_id: tenantId,
    organization_id: organizationId,
  };

  const branchScope = { ...whereScope };
  if (branchId) {
    branchScope.origin_branch_id = branchId;
  }

  // 1. Core Counts
  const totalBookings = await Consignment.count({ where: branchScope });
  const inTransitCount = await Consignment.count({
    where: { ...branchScope, status: { [Op.in]: ['LOADED', 'DISPATCHED', 'IN_TRANSIT'] } },
  });
  const deliveredCount = await Consignment.count({
    where: { ...branchScope, status: { [Op.in]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'] } },
  });
  const pendingDeliveryCount = await Consignment.count({
    where: { ...branchScope, status: { [Op.in]: ['REACHED_DESTINATION', 'OUT_FOR_DELIVERY'] } },
  });
  const pendingPodCount = await Consignment.count({
    where: { ...branchScope, status: { [Op.in]: ['DELIVERED', 'POD_PENDING'] } },
  });
  const delayedShipmentsCount = await Consignment.count({
    where: { ...branchScope, status: 'DELAYED' },
  });

  // 2. Financial Aggregations
  const totalFreight = await Consignment.sum('total_amount', { where: branchScope }) || 0;
  
  const expenseScope = { tenant_id: tenantId, organization_id: organizationId };
  if (branchId) expenseScope.branch_id = branchId;
  const totalExpenses = await Expense.sum('amount', { where: expenseScope }) || 0;

  const invoiceScope = { tenant_id: tenantId, organization_id: organizationId };
  if (branchId) invoiceScope.branch_id = branchId;
  const totalBilled = await Invoice.sum('total_amount', { where: invoiceScope }) || 0;
  const totalCollected = await Payment.sum('amount', { where: invoiceScope }) || 0;
  const outstandingAmount = Math.max(0, totalBilled - totalCollected);

  // 3. Fleet Metrics
  const vehicleScope = { tenant_id: tenantId, organization_id: organizationId };
  if (branchId) vehicleScope.branch_id = branchId;
  const vehiclesRunning = await Vehicle.count({ where: { ...vehicleScope, status: 'ON_TRIP' } });
  const vehiclesAvailable = await Vehicle.count({ where: { ...vehicleScope, status: 'AVAILABLE' } });
  const vehiclesMaintenance = await Vehicle.count({ where: { ...vehicleScope, status: 'MAINTENANCE' } });
  const totalVehicles = await Vehicle.count({ where: vehicleScope });

  // 4. 7-Day Booking Trends
  const bookingTrends = [];
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() - i);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
    const dayCount = await Consignment.count({
      where: {
        ...branchScope,
        created_at: { [Op.between]: [dayStart, dayEnd] }
      }
    });
    bookingTrends.push({
      day: dayStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: dayCount,
      highlight: i === 0,
    });
  }

  // 5. Branch Comparisons (Consolidated vs Branch-level)
  const branches = await Branch.findAll({
    where: { tenant_id: tenantId, organization_id: organizationId },
    raw: true,
  });

  const branchComparisons = [];
  for (const b of branches) {
    const bBookings = await Consignment.count({ where: { origin_branch_id: b.id } });
    const bFreight = await Consignment.sum('total_amount', { where: { origin_branch_id: b.id } }) || 0;
    const bExpense = await Expense.sum('amount', { where: { branch_id: b.id } }) || 0;
    const bPending = await Consignment.count({
      where: { origin_branch_id: b.id, status: { [Op.notIn]: ['DELIVERED', 'COMPLETED', 'POD_UPLOADED'] } },
    });
    const bDelivered = await Consignment.count({
      where: { origin_branch_id: b.id, status: { [Op.in]: ['DELIVERED', 'COMPLETED', 'POD_UPLOADED'] } },
    });
    const deliveryRate = bBookings > 0 ? Math.round((bDelivered / bBookings) * 100) : 100;

    branchComparisons.push({
      branchId: b.id,
      branchCode: b.branch_code,
      branchName: b.branch_name,
      city: b.city,
      bookings: bBookings,
      revenue: parseFloat(bFreight).toFixed(2),
      expense: parseFloat(bExpense).toFixed(2),
      pending: bPending,
      deliveryRate: `${deliveryRate}%`,
    });
  }

  // 6. Action Center: Real actionable alerts only
  const actionCenter = [];
  if (delayedShipmentsCount > 0) {
    actionCenter.push({
      id: 'delayed_shipments',
      title: `${delayedShipmentsCount} Shipments Delayed`,
      count: delayedShipmentsCount,
      type: 'danger',
      description: 'Shipments exceeding route SLA or flagged with exceptions',
      actionUrl: '/bookings?status=DELAYED',
    });
  }
  if (pendingPodCount > 0) {
    actionCenter.push({
      id: 'pending_pods',
      title: `${pendingPodCount} PODs Pending`,
      count: pendingPodCount,
      type: 'warning',
      description: 'Consignments delivered awaiting physical or digital proof of delivery',
      actionUrl: '/pods?status=POD_PENDING',
    });
  }
  if (outstandingAmount > 0) {
    actionCenter.push({
      id: 'overdue_payments',
      title: `₹${(outstandingAmount / 100000).toFixed(2)}L Payment Overdue`,
      count: 1,
      type: 'danger',
      description: 'Customer credit invoices pending clearance beyond credit period',
      actionUrl: '/billing/invoices?status=OVERDUE',
    });
  }

  // 7. Recent Consignments (Top 10)
  const recentConsignments = await Consignment.findAll({
    where: branchScope,
    limit: 10,
    order: [['created_at', 'DESC']],
    include: [
      { model: Branch, as: 'originBranch', attributes: ['branch_code', 'city'] },
      { model: Branch, as: 'destBranch', attributes: ['branch_code', 'city'] },
    ],
  });

  // 8. Latest Daily Brief
  const latestBrief = await DailyBrief.findOne({
    where: { tenant_id: tenantId, organization_id: organizationId },
    order: [['brief_date', 'DESC']],
  });

  return {
    kpis: {
      bookings: totalBookings,
      inTransit: inTransitCount,
      delivered: deliveredCount,
      pendingDelivery: pendingDeliveryCount,
      pendingPod: pendingPodCount,
      delayed: delayedShipmentsCount,
      totalFreight: parseFloat(totalFreight).toFixed(2),
      totalExpenses: parseFloat(totalExpenses).toFixed(2),
      outstanding: parseFloat(outstandingAmount).toFixed(2),
      collected: parseFloat(totalCollected).toFixed(2),
      totalVehicles,
      vehiclesRunning,
      vehiclesAvailable,
      vehiclesMaintenance,
    },
    bookingTrends,
    actionCenter,
    branchComparisons,
    recentConsignments,
    dailyBrief: latestBrief,
  };
};

/**
 * Super Admin SaaS Metrics
 */
const getSuperAdminDashboard = async () => {
  const totalOrgs = await Organization.count();
  const totalBranches = await Branch.count();
  const totalConsignments = await Consignment.count();
  const activeSubs = await SaaSSubscription.findAll({
    where: { status: 'ACTIVE' },
    include: [{ model: SaaSPlan, as: 'plan' }],
  });

  let mrr = 0;
  activeSubs.forEach((sub) => {
    if (sub.billing_cycle === 'MONTHLY') {
      mrr += parseFloat(sub.amount || 0);
    } else {
      mrr += parseFloat(sub.amount || 0) / 12;
    }
  });

  const arr = mrr * 12;

  return {
    metrics: {
      totalOrganizations: totalOrgs,
      totalBranches,
      totalConsignments,
      activeTransporters: totalOrgs,
      mrr: Math.round(mrr),
      arr: Math.round(arr),
    },
  };
};

module.exports = {
  getOwnerDashboard,
  getSuperAdminDashboard,
};
