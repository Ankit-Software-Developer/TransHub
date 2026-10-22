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

  // 1. Core Counts
  // Total Bookings: ONLY bookings created/originated at this branch (or all for admin)
  const bookingScope = { ...whereScope };
  if (branchId) {
    bookingScope.origin_branch_id = branchId;
  }
  const consignmentBookingsCount = await Consignment.count({ where: bookingScope });

  // Direct Vehicle Placement Trips (dedicated direct vehicle hire bookings)
  const placementBookingScope = {
    ...whereScope,
    trip_mode: 'DIRECT_VEHICLE_HIRE',
    status: { [Op.ne]: 'CANCELLED' },
  };
  if (branchId) {
    placementBookingScope.origin_branch_id = branchId;
  }
  const placementBookingsCount = Trip ? (await Trip.count({ where: placementBookingScope })) : 0;
  const totalBookings = consignmentBookingsCount + placementBookingsCount;

  // In-Transit Shipments: Outward departing or inward arriving at this branch
  const inTransitScope = {
    ...whereScope,
    status: { [Op.in]: ['LOADED', 'DISPATCHED', 'IN_TRANSIT'] },
  };
  if (branchId) {
    inTransitScope[Op.or] = [
      { origin_branch_id: branchId },
      { dest_branch_id: branchId },
    ];
  }
  const inTransitCount = await Consignment.count({ where: inTransitScope });

  // Deliveries Completed: strictly scoped to the receiving DESTINATION delivery branch (dest_branch_id)
  const deliveredScope = {
    ...whereScope,
    status: { [Op.in]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'] },
  };
  if (branchId) {
    deliveredScope.dest_branch_id = branchId;
  }
  const consignmentDeliveredCount = await Consignment.count({ where: deliveredScope });

  // Direct Vehicle Placement Deliveries (completed placement trips)
  const placementDeliveredScope = {
    ...whereScope,
    trip_mode: 'DIRECT_VEHICLE_HIRE',
    status: 'COMPLETED',
  };
  if (branchId) {
    placementDeliveredScope[Op.or] = [
      { dest_branch_id: branchId },
      { origin_branch_id: branchId },
    ];
  }
  const placementDeliveredCount = Trip ? (await Trip.count({ where: placementDeliveredScope })) : 0;
  const deliveredCount = consignmentDeliveredCount + placementDeliveredCount;

  // Pending Delivery: Cargo arrived at destination godown awaiting handover/DRS
  const pendingDeliveryScope = {
    ...whereScope,
    status: { [Op.in]: ['REACHED_DESTINATION', 'OUT_FOR_DELIVERY'] },
  };
  if (branchId) {
    pendingDeliveryScope.dest_branch_id = branchId;
  }
  const pendingDeliveryCount = await Consignment.count({ where: pendingDeliveryScope });

  // Pending POD: Delivered at destination but physical/digital POD sign-off pending
  const pendingPodScope = {
    ...whereScope,
    status: { [Op.in]: ['DELIVERED', 'POD_PENDING'] },
  };
  if (branchId) {
    pendingPodScope.dest_branch_id = branchId;
  }
  const consignmentPendingPodCount = await Consignment.count({ where: pendingPodScope });

  const placementPendingPodScope = {
    ...whereScope,
    trip_mode: 'DIRECT_VEHICLE_HIRE',
    status: 'COMPLETED',
    pod_file_url: null,
  };
  if (branchId) {
    placementPendingPodScope[Op.or] = [
      { dest_branch_id: branchId },
      { origin_branch_id: branchId },
    ];
  }
  const placementPendingPodCount = Trip ? (await Trip.count({ where: placementPendingPodScope }).catch(() => 0)) : 0;
  const pendingPodCount = consignmentPendingPodCount + placementPendingPodCount;

  // Delayed Shipments
  const delayedScope = { ...whereScope, status: 'DELAYED' };
  if (branchId) {
    delayedScope[Op.or] = [
      { origin_branch_id: branchId },
      { dest_branch_id: branchId },
    ];
  }
  const delayedShipmentsCount = await Consignment.count({ where: delayedScope });

  // 2. Financial Aggregations
  // Origin Booked Freight from Consignments / Bilties (created at this branch)
  const originBookedFreight = await Consignment.sum('total_amount', {
    where: branchId ? { ...whereScope, origin_branch_id: branchId } : whereScope,
  }) || 0;

  // Destination TO-PAY Freight Collected at Handover (collected at this delivery branch)
  let destToPayCollected = 0;
  if (branchId) {
    destToPayCollected = await Consignment.sum('total_amount', {
      where: {
        ...whereScope,
        dest_branch_id: branchId,
        payment_type: 'TO_PAY',
        status: { [Op.in]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'] },
      },
    }) || 0;
  }

  // Direct Vehicle Placement Trips (dedicated direct vehicle hire trips without dockets)
  const placementScope = {
    ...whereScope,
    trip_mode: 'DIRECT_VEHICLE_HIRE',
    status: { [Op.ne]: 'CANCELLED' },
  };
  if (branchId) {
    placementScope.origin_branch_id = branchId;
  }
  const placementFreight = await Trip.sum('contract_amount', {
    where: placementScope,
  }) || 0;

  // Combined Branch Operational Revenue (Consignment freight + Direct Vehicle Placement contract freight)
  const totalFreight = (branchId
    ? Number(originBookedFreight) + Number(destToPayCollected)
    : Number(originBookedFreight)) + Number(placementFreight);

  const expenseScope = { tenant_id: tenantId, organization_id: organizationId };
  if (branchId) expenseScope.branch_id = branchId;
  const totalExpenses = await Expense.sum('amount', { where: expenseScope }) || 0;

  const invoiceScope = { tenant_id: tenantId, organization_id: organizationId };
  if (branchId) invoiceScope.branch_id = branchId;
  const totalBilled = await Invoice.sum('total_amount', { where: invoiceScope }) || 0;
  const totalCollected = await Payment.sum('amount', { where: invoiceScope }) || 0;
  const outstandingAmount = Math.max(0, totalBilled - totalCollected);

  // 3. Active Trips & Fleet Metrics
  const tripScope = {
    ...whereScope,
    status: { [Op.in]: ['RUNNING', 'READY', 'IN_TRANSIT', 'LOADED'] },
  };
  if (branchId) {
    tripScope[Op.or] = [
      { origin_branch_id: branchId },
      { dest_branch_id: branchId },
    ];
  }
  const activeTripsCount = await Trip.count({ where: tripScope });

  const vehicleScope = { tenant_id: tenantId, organization_id: organizationId };
  if (branchId) vehicleScope.branch_id = branchId;
  const vehiclesRunning = await Vehicle.count({ where: { ...vehicleScope, status: 'ON_TRIP' } });
  const vehiclesAvailable = await Vehicle.count({ where: { ...vehicleScope, status: 'AVAILABLE' } });
  const vehiclesMaintenance = await Vehicle.count({ where: { ...vehicleScope, status: 'MAINTENANCE' } });
  const totalVehicles = await Vehicle.count({ where: vehicleScope });

  // 4. 7-Day Booking Trends (Scoped to origin bookings of the branch or company total)
  const bookingTrends = [];
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() - i);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
    const dayDateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

    const consignmentDayCount = await Consignment.count({
      where: {
        ...bookingScope,
        [Op.or]: [
          { booking_date: dayDateStr },
          { created_at: { [Op.between]: [dayStart, dayEnd] } },
        ],
      },
    }).catch(() => 0);

    const placementDayCount = Trip ? (await Trip.count({
      where: {
        ...placementBookingScope,
        [Op.or]: [
          { trip_date: dayDateStr },
          { created_at: { [Op.between]: [dayStart, dayEnd] } },
        ],
      },
    }).catch(() => 0)) : 0;

    const totalDayCount = consignmentDayCount + placementDayCount;

    bookingTrends.push({
      day: dayStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      date: dayDateStr,
      value: totalDayCount,
      dockets: consignmentDayCount,
      placements: placementDayCount,
      highlight: i === 0,
    });
  }

  // 5. Branch Comparisons (Consolidated breakdown)
  const branches = await Branch.findAll({
    where: { tenant_id: tenantId, organization_id: organizationId },
    raw: true,
  });

  const branchComparisons = [];
  for (const b of branches) {
    const bPlacementBookings = Trip ? (await Trip.count({
      where: {
        tenant_id: tenantId,
        organization_id: organizationId,
        origin_branch_id: b.id,
        trip_mode: 'DIRECT_VEHICLE_HIRE',
        status: { [Op.ne]: 'CANCELLED' },
      },
    }).catch(() => 0)) : 0;
    const bBookings = (await Consignment.count({ where: { origin_branch_id: b.id } })) + bPlacementBookings;
    const bFreight = await Consignment.sum('total_amount', { where: { origin_branch_id: b.id } }) || 0;
    const bPlacementFreight = await Trip.sum('contract_amount', {
      where: {
        tenant_id: tenantId,
        organization_id: organizationId,
        origin_branch_id: b.id,
        trip_mode: 'DIRECT_VEHICLE_HIRE',
        status: { [Op.ne]: 'CANCELLED' },
      },
    }) || 0;
    const bExpense = await Expense.sum('amount', { where: { branch_id: b.id } }) || 0;
    const bPending = await Consignment.count({
      where: { dest_branch_id: b.id, status: { [Op.in]: ['REACHED_DESTINATION', 'OUT_FOR_DELIVERY'] } },
    });
    const bPlacementDelivered = Trip ? (await Trip.count({
      where: {
        tenant_id: tenantId,
        organization_id: organizationId,
        trip_mode: 'DIRECT_VEHICLE_HIRE',
        status: 'COMPLETED',
        [Op.or]: [{ dest_branch_id: b.id }, { origin_branch_id: b.id }],
      },
    }).catch(() => 0)) : 0;
    const bDelivered = (await Consignment.count({
      where: { dest_branch_id: b.id, status: { [Op.in]: ['DELIVERED', 'COMPLETED', 'POD_UPLOADED'] } },
    })) + bPlacementDelivered;
    const deliveryRate = (bDelivered + bPending) > 0 ? Math.round((bDelivered / (bDelivered + bPending)) * 100) : 100;

    branchComparisons.push({
      branchId: b.id,
      branchCode: b.branch_code,
      branchName: b.branch_name,
      city: b.city,
      bookings: bBookings,
      revenue: parseFloat(Number(bFreight) + Number(bPlacementFreight)).toFixed(2),
      expense: parseFloat(bExpense).toFixed(2),
      pending: bPending,
      delivered: bDelivered,
      deliveryRate: `${deliveryRate}%`,
    });
  }

  // 6. Action Center: Real actionable alerts
  const actionCenter = [];
  if (delayedShipmentsCount > 0) {
    actionCenter.push({
      id: 'delayed_shipments',
      title: `${delayedShipmentsCount} Shipments Delayed`,
      count: delayedShipmentsCount,
      type: 'danger',
      description: 'Shipments exceeding route SLA or flagged with transit delays',
      actionUrl: '/bookings?status=DELAYED',
    });
  }
  if (pendingPodCount > 0) {
    actionCenter.push({
      id: 'pending_pods',
      title: `${pendingPodCount} PODs Pending`,
      count: pendingPodCount,
      type: 'warning',
      description: 'Shipments delivered awaiting physical or digital proof of delivery',
      actionUrl: '/deliveries?tab=DELIVERED',
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

  // 7. Recent Consignments & Placements (Top 10)
  const recentScope = { ...whereScope };
  if (branchId) {
    recentScope[Op.or] = [
      { origin_branch_id: branchId },
      { dest_branch_id: branchId },
    ];
  }
  let recentConsignments = await Consignment.findAll({
    where: recentScope,
    limit: 10,
    order: [['created_at', 'DESC']],
    include: [
      { model: Branch, as: 'originBranch', attributes: ['branch_code', 'city'] },
      { model: Branch, as: 'destBranch', attributes: ['branch_code', 'city'] },
    ],
  });

  if (recentConsignments.length === 0 && Trip) {
    const tripRecentScope = {
      ...whereScope,
      trip_mode: 'DIRECT_VEHICLE_HIRE',
      status: { [Op.ne]: 'CANCELLED' },
    };
    if (branchId) {
      tripRecentScope[Op.or] = [
        { origin_branch_id: branchId },
        { dest_branch_id: branchId },
      ];
    }
    const recentTrips = await Trip.findAll({
      where: tripRecentScope,
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [
        { model: Branch, as: 'originBranch', attributes: ['branch_code', 'city'] },
        { model: Branch, as: 'destBranch', attributes: ['branch_code', 'city'] },
      ],
    }).catch(() => []);

    recentConsignments = recentTrips.map((t) => ({
      id: t.id,
      lr_number: t.trip_number,
      docket_number: t.party_ref_number || t.trip_number,
      booking_date: t.trip_date,
      status: t.status === 'COMPLETED' ? 'DELIVERED' : (t.status === 'RUNNING' ? 'IN_TRANSIT' : t.status),
      total_amount: t.contract_amount,
      origin_city: t.origin_city,
      destination_city: t.destination_city,
      originBranch: t.originBranch,
      destBranch: t.destBranch,
      is_placement: true,
    }));
  }

  // 8. Latest Daily Brief
  const latestBrief = await DailyBrief.findOne({
    where: { tenant_id: tenantId, organization_id: organizationId },
    order: [['brief_date', 'DESC']],
  });

  // On-time delivery rate
  const onTimePercentage = deliveredCount > 0
    ? Math.max(0, Math.min(100, Math.round((deliveredCount / (deliveredCount + delayedShipmentsCount || 1)) * 100)))
    : 100;

  return {
    kpis: {
      bookings: totalBookings,
      consignmentBookings: consignmentBookingsCount,
      placementBookings: placementBookingsCount,
      inTransit: inTransitCount,
      activeTrips: activeTripsCount,
      delivered: deliveredCount,
      consignmentDelivered: consignmentDeliveredCount,
      placementDelivered: placementDeliveredCount,
      pendingDelivery: pendingDeliveryCount,
      pendingPod: pendingPodCount,
      delayed: delayedShipmentsCount,
      totalFreight: parseFloat(totalFreight).toFixed(2),
      originBookedFreight: parseFloat(originBookedFreight).toFixed(2),
      destToPayCollected: parseFloat(destToPayCollected).toFixed(2),
      placementFreight: parseFloat(placementFreight).toFixed(2),
      totalExpenses: parseFloat(totalExpenses).toFixed(2),
      outstanding: parseFloat(outstandingAmount).toFixed(2),
      collected: parseFloat(totalCollected).toFixed(2),
      totalVehicles,
      vehiclesRunning,
      vehiclesAvailable,
      vehiclesMaintenance,
      onTimeDeliveryRate: onTimePercentage,
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
