// src/controllers/reportController.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { paginatedResponse, successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Helper to build date range filters
 */
const buildDateRange = (dateFrom, dateTo, fieldName = 'booking_date') => {
  if (dateFrom && dateTo) {
    return { [fieldName]: { [Op.between]: [dateFrom, dateTo] } };
  }
  if (dateFrom) {
    return { [fieldName]: { [Op.gte]: dateFrom } };
  }
  if (dateTo) {
    return { [fieldName]: { [Op.lte]: dateTo } };
  }
  return {};
};

/**
 * Helper to determine effective branch scope:
 * - Admin (SUPER_ADMIN, TRANSPORT_OWNER, ADMIN, OWNER) can view 'ALL' or filter by any branch.
 * - Non-admin users are strictly restricted to their assigned login branch (req.user.branch_id).
 */
const getEffectiveBranch = (req, requestedBranchId) => {
  const isGlobalUser = Boolean(
    req.user?.is_owner ||
    req.user?.isAdmin ||
    ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(req.user?.role) ||
    (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(r)))
  );

  if (!isGlobalUser && req.user?.branch_id) {
    // Non-admin user: strictly locked to their login branch
    return req.user.branch_id;
  }

  if (requestedBranchId && requestedBranchId !== 'ALL') {
    return requestedBranchId;
  }

  if (!isGlobalUser && req.branchId && req.branchId !== 'ALL') {
    return req.branchId;
  }

  // Admin user requesting 'ALL' or no specific branch
  return null;
};

/**
 * 1. Docket & Freight Sales Register
 */
const getDocketFreightReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Consignment, Branch, Customer, Booking, Pod } = m;
    const {
      branch_id,
      date_from,
      date_to,
      payment_type,
      payment_clearance,
      clearance_status,
      status,
      customer_id,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const where = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    // Branch filter: non-admin restricted to login branch, admin can view all or specific
    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    if (effectiveBranchId) {
      where[Op.or] = [
        { origin_branch_id: effectiveBranchId },
        { dest_branch_id: effectiveBranchId },
      ];
    }

    if (payment_type && payment_type !== 'ALL') {
      where.payment_type = payment_type;
    }

    // Payment clearance filter (CLEARED vs PENDING/UNCLEARED)
    const effectiveClearance = payment_clearance || clearance_status;
    const deliveredStatuses = ['DELIVERED', 'POD_UPLOADED', 'POD_PENDING', 'COMPLETED', 'POD_VERIFIED'];
    if (effectiveClearance && effectiveClearance !== 'ALL') {
      if (effectiveClearance === 'CLEARED') {
        const clearedCond = {
          [Op.or]: [
            { payment_type: 'PAID' },
            {
              payment_type: 'TO_PAY',
              status: { [Op.in]: deliveredStatuses },
            },
            {
              payment_type: { [Op.in]: ['TBB', 'CREDIT'] },
              [Op.or]: [
                { is_billed: true },
                { invoice_id: { [Op.ne]: null } },
              ],
            },
          ],
        };
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(clearedCond);
      } else if (effectiveClearance === 'PENDING' || effectiveClearance === 'UNCLEARED') {
        const pendingCond = {
          [Op.or]: [
            {
              payment_type: 'TO_PAY',
              status: { [Op.notIn]: deliveredStatuses },
            },
            {
              payment_type: { [Op.in]: ['TBB', 'CREDIT'] },
              is_billed: false,
              invoice_id: null,
            },
          ],
        };
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(pendingCond);
      }
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (customer_id && customer_id !== 'ALL') {
      where[Op.or] = [
        { consignor_id: customer_id },
        { consignee_id: customer_id },
      ];
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { lr_number: { [Op.iLike || Op.like]: q } },
          { docket_number: { [Op.iLike || Op.like]: q } },
          { origin_city: { [Op.iLike || Op.like]: q } },
          { destination_city: { [Op.iLike || Op.like]: q } },
          { eway_bill_no: { [Op.iLike || Op.like]: q } },
          { invoice_no: { [Op.iLike || Op.like]: q } },
        ],
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Consignment.findAndCountAll({
      where,
      include: [
        {
          model: Branch,
          as: 'originBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        {
          model: Branch,
          as: 'destBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        {
          model: Customer,
          as: 'consignor',
          attributes: ['id', 'name', 'phone', 'gstin'],
          required: false,
        },
        {
          model: Customer,
          as: 'consignee',
          attributes: ['id', 'name', 'phone', 'gstin'],
          required: false,
        },
        {
          model: Pod,
          as: 'pod',
          attributes: ['id', 'status', 'verified_at', 'file_url', ['file_url', 'pod_url']],
          required: false,
        },
      ],
      order: [['booking_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    // Summary calculations across matching records
    const allMatches = await Consignment.findAll({
      where,
      attributes: [
        'packages_count',
        'actual_weight',
        'charged_weight',
        'freight_amount',
        'loading_charges',
        'unloading_charges',
        'door_delivery_charges',
        'handling_charges',
        'tax_amount',
        'total_amount',
        'payment_type',
        'status',
        'is_billed',
        'invoice_id',
      ],
    });

    let totalPackages = 0;
    let totalActualWeight = 0;
    let totalChargedWeight = 0;
    let totalBaseFreight = 0;
    let totalOtherCharges = 0;
    let totalTaxAmount = 0;
    let totalRevenue = 0;
    let paidCount = 0;
    let toPayCount = 0;
    let tbbCount = 0;
    let clearedCount = 0;
    let pendingCount = 0;

    allMatches.forEach((c) => {
      totalPackages += Number(c.packages_count || 0);
      totalActualWeight += Number(c.actual_weight || 0);
      totalChargedWeight += Number(c.charged_weight || 0);
      totalBaseFreight += Number(c.freight_amount || 0);
      totalOtherCharges +=
        Number(c.loading_charges || 0) +
        Number(c.unloading_charges || 0) +
        Number(c.door_delivery_charges || 0) +
        Number(c.handling_charges || 0);
      totalTaxAmount += Number(c.tax_amount || 0);
      totalRevenue += Number(c.total_amount || 0);

      if (c.payment_type === 'PAID') paidCount++;
      else if (c.payment_type === 'TO_PAY') toPayCount++;
      else if (['TBB', 'CREDIT'].includes(c.payment_type)) tbbCount++;

      const isItemCleared =
        c.payment_type === 'PAID' ||
        (c.payment_type === 'TO_PAY' && deliveredStatuses.includes(c.status)) ||
        (['TBB', 'CREDIT'].includes(c.payment_type) && (c.is_billed || c.invoice_id));

      if (isItemCleared) clearedCount++;
      else pendingCount++;
    });

    const summary = {
      totalBookings: count,
      totalPackages,
      totalActualWeight: parseFloat(totalActualWeight.toFixed(2)),
      totalChargedWeight: parseFloat(totalChargedWeight.toFixed(2)),
      totalBaseFreight: parseFloat(totalBaseFreight.toFixed(2)),
      totalOtherCharges: parseFloat(totalOtherCharges.toFixed(2)),
      totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      breakdown: {
        paid: paidCount,
        toPay: toPayCount,
        tbb: tbbCount,
        cleared: clearedCount,
        pending: pendingCount,
      },
    };

    const enrichedRows = rows.map((r) => {
      const item = r.toJSON ? r.toJSON() : r;
      const isCleared =
        item.payment_type === 'PAID' ||
        (item.payment_type === 'TO_PAY' && deliveredStatuses.includes(item.status)) ||
        (['TBB', 'CREDIT'].includes(item.payment_type) && (item.is_billed || item.invoice_id));

      return {
        ...item,
        payment_cleared: Boolean(isCleared),
        clearance_status: isCleared ? 'CLEARED' : 'PENDING',
      };
    });

    return paginatedResponse(
      res,
      'Docket freight register fetched successfully',
      enrichedRows,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        pages: Math.ceil(count / parseInt(limit, 10)),
        summary,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 2. Customer Outstanding & Ageing Report (Credit / TBB Receivables)
 */
const getCustomerAgeingReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Customer, Invoice, Payment, Branch } = m;
    const { branch_id, search, min_balance = 0, page = 1, limit = 25 } = req.query;

    const customerWhere = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      status: 'ACTIVE',
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);
    if (effectiveBranchId) {
      customerWhere.branch_id = effectiveBranchId;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      customerWhere[Op.or] = [
        { name: { [Op.iLike || Op.like]: q } },
        { customer_code: { [Op.iLike || Op.like]: q } },
        { phone: { [Op.iLike || Op.like]: q } },
        { gstin: { [Op.iLike || Op.like]: q } },
      ];
    }

    const customers = await Customer.findAll({
      where: customerWhere,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        {
          model: Invoice,
          as: 'invoices',
          where: {
            status: { [Op.in]: ['GENERATED', 'SENT', 'PARTIAL', 'OVERDUE'] },
          },
          required: false,
          include: [
            {
              model: Payment,
              as: 'payments',
              required: false,
              where: { status: 'COMPLETED' },
            },
          ],
        },
      ],
      order: [['name', 'ASC']],
    });

    const now = new Date();
    const ageingData = [];

    let totalReceivables = 0;
    let totalOverdue = 0;
    let totalBucket0_30 = 0;
    let totalBucket31_60 = 0;
    let totalBucket61_90 = 0;
    let totalBucket90Plus = 0;

    customers.forEach((cust) => {
      let custTotalInvoiced = 0;
      let custTotalPaid = 0;
      let custBalance = Number(cust.current_balance || 0);

      let b0_30 = 0;
      let b31_60 = 0;
      let b61_90 = 0;
      let b90Plus = 0;

      const invoices = cust.invoices || [];
      invoices.forEach((inv) => {
        const invTotal = Number(inv.total_amount || 0);
        const invPaid = (inv.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const invDue = Math.max(0, invTotal - invPaid);

        custTotalInvoiced += invTotal;
        custTotalPaid += invPaid;

        if (invDue > 0) {
          const invDate = new Date(inv.invoice_date || inv.created_at);
          const diffDays = Math.floor((now - invDate) / (1000 * 60 * 60 * 24));

          if (diffDays <= 30) b0_30 += invDue;
          else if (diffDays <= 60) b31_60 += invDue;
          else if (diffDays <= 90) b61_90 += invDue;
          else b90Plus += invDue;
        }
      });

      // If customer has an active ledger balance or calculated invoice due
      const effectiveDue = Math.max(custBalance, b0_30 + b31_60 + b61_90 + b90Plus);

      if (effectiveDue >= Number(min_balance)) {
        totalReceivables += effectiveDue;
        totalOverdue += b31_60 + b61_90 + b90Plus;
        totalBucket0_30 += b0_30;
        totalBucket31_60 += b31_60;
        totalBucket61_90 += b61_90;
        totalBucket90Plus += b90Plus;

        ageingData.push({
          customerId: cust.id,
          customerName: cust.name,
          customerCode: cust.code || 'NA',
          phone: cust.phone || 'NA',
          gstin: cust.gstin || 'Unregistered',
          branch: cust.branch ? cust.branch.name : 'Head Office',
          creditPeriodDays: cust.credit_period_days || 30,
          creditLimit: Number(cust.credit_limit || 0),
          totalInvoiced: parseFloat(custTotalInvoiced.toFixed(2)),
          totalPaid: parseFloat(custTotalPaid.toFixed(2)),
          totalOutstanding: parseFloat(effectiveDue.toFixed(2)),
          bucket0_30: parseFloat(b0_30.toFixed(2)),
          bucket31_60: parseFloat(b31_60.toFixed(2)),
          bucket61_90: parseFloat(b61_90.toFixed(2)),
          bucket90Plus: parseFloat(b90Plus.toFixed(2)),
          isOverdue: b31_60 + b61_90 + b90Plus > 0,
        });
      }
    });

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    const paginatedRows = ageingData.slice(offset, offset + limitInt);

    const summary = {
      totalCustomers: ageingData.length,
      totalReceivables: parseFloat(totalReceivables.toFixed(2)),
      totalOverdue: parseFloat(totalOverdue.toFixed(2)),
      bucket0_30: parseFloat(totalBucket0_30.toFixed(2)),
      bucket31_60: parseFloat(totalBucket31_60.toFixed(2)),
      bucket61_90: parseFloat(totalBucket61_90.toFixed(2)),
      bucket90Plus: parseFloat(totalBucket90Plus.toFixed(2)),
    };

    return paginatedResponse(
      res,
      'Customer ageing report fetched successfully',
      paginatedRows,
      {
        page: pageInt,
        limit: limitInt,
        total: ageingData.length,
        pages: Math.ceil(ageingData.length / limitInt),
        summary,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 3. Line-Haul Trip & Settlement Audit (Trip P&L)
 */
const getTripProfitabilityReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Trip, Vehicle, Driver, Branch, Consignment, Expense, DriverAdvance, TripSettlement } = m;
    const { branch_id, date_from, date_to, vehicle_id, search, page = 1, limit = 25 } = req.query;

    const where = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'start_time'),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    if (effectiveBranchId) {
      where[Op.or] = [
        { origin_branch_id: effectiveBranchId },
        { dest_branch_id: effectiveBranchId },
      ];
    }

    if (vehicle_id && vehicle_id !== 'ALL') {
      where.vehicle_id = vehicle_id;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { trip_number: { [Op.iLike || Op.like]: q } },
          { origin_city: { [Op.iLike || Op.like]: q } },
          { destination_city: { [Op.iLike || Op.like]: q } },
        ],
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Trip.findAndCountAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registration_number', 'truck_type'], required: false },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'], required: false },
        {
          model: Branch,
          as: 'originBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        {
          model: Branch,
          as: 'destBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        { model: Consignment, as: 'consignments', attributes: ['id', 'total_amount', 'charged_weight'], required: false },
        { model: Expense, as: 'expenses', attributes: ['id', 'amount', 'title'], required: false },
        { model: DriverAdvance, as: 'advances', attributes: ['id', 'amount', 'status'], required: false },
        { model: TripSettlement, as: 'settlement', attributes: ['id', 'settlement_status', 'net_profit', 'total_revenue', 'total_expense'], required: false },
      ],
      order: [['start_time', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const enrichedRows = rows.map((trip) => {
      // Trip revenue from loaded consignments or settlement
      const consignmentRevenue = (trip.consignments || []).reduce(
        (acc, c) => acc + Number(c.total_amount || 0),
        0
      );
      const totalRevenue = Number(trip.settlement?.total_revenue || consignmentRevenue);

      // Expenses
      const fuelAndMiscExpense = (trip.expenses || []).reduce(
        (acc, e) => acc + Number(e.amount || 0),
        0
      );
      const advances = (trip.advances || []).reduce(
        (acc, a) => acc + Number(a.amount || 0),
        0
      );
      const totalOperatingCost = Number(trip.settlement?.total_expense || (fuelAndMiscExpense + advances));

      const netProfit = Number(trip.settlement?.net_profit || (totalRevenue - totalOperatingCost));
      const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

      const totalWeightKg = (trip.consignments || []).reduce(
        (acc, c) => acc + Number(c.charged_weight || 0),
        0
      );

      return {
        id: trip.id,
        tripNumber: trip.trip_number,
        startDate: trip.start_time ? trip.start_time.toISOString().split('T')[0] : 'N/A',
        status: trip.status,
        route: `${trip.origin_city || trip.originBranch?.city || 'Origin'} -> ${trip.destination_city || trip.destBranch?.city || 'Dest'}`,
        vehicleNumber: trip.vehicle ? trip.vehicle.registration_number : 'Unassigned',
        driverName: trip.driver ? trip.driver.name : 'Unassigned',
        docketCount: (trip.consignments || []).length,
        totalWeightTonnes: parseFloat((totalWeightKg / 1000).toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        fuelAndExpenses: parseFloat(fuelAndMiscExpense.toFixed(2)),
        driverAdvances: parseFloat(advances.toFixed(2)),
        totalCost: parseFloat(totalOperatingCost.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        marginPct: parseFloat(marginPct),
        isSettled: trip.settlement?.settlement_status === 'SETTLED',
      };
    });

    // Global summary
    const allTrips = await Trip.findAll({
      where,
      include: [
        { model: Consignment, as: 'consignments', attributes: ['total_amount'] },
        { model: Expense, as: 'expenses', attributes: ['amount'] },
        { model: DriverAdvance, as: 'advances', attributes: ['amount'] },
      ],
    });

    let gRevenue = 0;
    let gExpenses = 0;
    allTrips.forEach((t) => {
      const rev = (t.consignments || []).reduce((acc, c) => acc + Number(c.total_amount || 0), 0);
      const exp = (t.expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0) +
                  (t.advances || []).reduce((acc, a) => acc + Number(a.amount || 0), 0);
      gRevenue += rev;
      gExpenses += exp;
    });

    const gProfit = gRevenue - gExpenses;
    const gMargin = gRevenue > 0 ? ((gProfit / gRevenue) * 100).toFixed(1) : '0.0';

    const summary = {
      totalTrips: count,
      totalRevenue: parseFloat(gRevenue.toFixed(2)),
      totalOperatingCost: parseFloat(gExpenses.toFixed(2)),
      netProfit: parseFloat(gProfit.toFixed(2)),
      averageMarginPct: parseFloat(gMargin),
    };

    return paginatedResponse(
      res,
      'Trip profitability report fetched successfully',
      enrichedRows,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        pages: Math.ceil(count / parseInt(limit, 10)),
        summary,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 4. Proof of Delivery (POD) Compliance & TAT Register
 */
const getPodComplianceReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Consignment, Branch, Customer, Pod, DeliveryRecord } = m;
    const { branch_id, date_from, date_to, pod_status, search, page = 1, limit = 25 } = req.query;

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    if (effectiveBranchId) {
      where[Op.or] = [
        { dest_branch_id: effectiveBranchId },
        { origin_branch_id: effectiveBranchId },
      ];
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { lr_number: { [Op.iLike || Op.like]: q } },
          { docket_number: { [Op.iLike || Op.like]: q } },
          { destination_city: { [Op.iLike || Op.like]: q } },
        ],
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Consignment.findAndCountAll({
      where,
      include: [
        {
          model: Branch,
          as: 'originBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        {
          model: Branch,
          as: 'destBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
        { model: Customer, as: 'consignor', attributes: ['id', 'name'], required: false },
        { model: Customer, as: 'consignee', attributes: ['id', 'name', 'phone'], required: false },
        { model: Pod, as: 'pod', attributes: ['id', 'status', 'verified_at', 'file_url', ['file_url', 'pod_url']], required: false },
        { model: DeliveryRecord, as: 'deliveryRecord', required: false },
      ],
      order: [['booking_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const now = new Date();
    const enrichedRows = rows.map((c) => {
      const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status);
      const deliveryDate = c.deliveryRecord?.delivered_at || c.updated_at;
      const bDate = new Date(c.booking_date);
      const dDate = isDelivered ? new Date(deliveryDate) : null;

      let transitDays = 'In Transit';
      if (dDate) {
        transitDays = Math.max(1, Math.round((dDate - bDate) / (1000 * 60 * 60 * 24)));
      }

      let podStatus = 'PENDING';
      if (c.pod) {
        podStatus = c.pod.status || 'UPLOADED';
      } else if (isDelivered) {
        podStatus = 'PENDING_UPLOAD';
      }

      return {
        id: c.id,
        lrNumber: c.lr_number,
        docketNumber: c.docket_number || c.lr_number,
        bookingDate: c.booking_date,
        deliveryDate: isDelivered && dDate ? dDate.toISOString().split('T')[0] : 'Pending',
        transitDays,
        originBranch: c.originBranch?.name || c.origin_city,
        destBranch: c.destBranch?.name || c.destination_city,
        consignorName: c.consignor?.name || 'NA',
        consigneeName: c.consignee?.name || 'NA',
        shipmentStatus: c.status,
        podStatus,
        podUrl: c.pod?.pod_url || null,
        receiverName: c.deliveryRecord?.receiver_name || 'NA',
        hasPhysicalPod: Boolean(c.pod?.physical_received),
        verifiedAt: c.pod?.verified_at ? c.pod.verified_at.toISOString().split('T')[0] : null,
      };
    });

    // Global POD summary
    const allMatches = await Consignment.findAll({
      where,
      include: [{ model: Pod, as: 'pod' }],
    });

    let totalDelivered = 0;
    let podUploadedCount = 0;
    let podVerifiedCount = 0;
    let podPendingCount = 0;

    allMatches.forEach((c) => {
      const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status);
      if (isDelivered) totalDelivered++;

      if (c.pod?.status === 'VERIFIED') podVerifiedCount++;
      else if (c.pod?.pod_url || c.pod?.status === 'UPLOADED') podUploadedCount++;
      else if (isDelivered) podPendingCount++;
    });

    const complianceRate = totalDelivered > 0
      ? (((podUploadedCount + podVerifiedCount) / totalDelivered) * 100).toFixed(1)
      : '100.0';

    const summary = {
      totalConsignments: count,
      totalDelivered,
      podUploadedCount,
      podVerifiedCount,
      podPendingCount,
      complianceRatePct: parseFloat(complianceRate),
    };

    return paginatedResponse(
      res,
      'POD compliance report fetched successfully',
      enrichedRows,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        pages: Math.ceil(count / parseInt(limit, 10)),
        summary,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 5. Daily Branch Cash & Collection Register
 */
const getDailyCollectionReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Consignment, Branch, Payment, BranchCashClosure } = m;
    const { branch_id, date_from, date_to, page = 1, limit = 25 } = req.query;

    const whereScope = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    // 1. Origin branch bookings with PAID mode (Cash collected upfront)
    const paidBookingsWhere = {
      ...whereScope,
      payment_type: 'PAID',
    };
    if (effectiveBranchId) paidBookingsWhere.origin_branch_id = effectiveBranchId;

    const paidBookings = await Consignment.findAll({
      where: paidBookingsWhere,
      include: [{ model: Branch, as: 'originBranch', attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'], required: false }],
    });

    // 2. Destination branch delivered with TO_PAY mode (Cash collected upon delivery)
    const toPayWhere = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      payment_type: 'TO_PAY',
      status: { [Op.in]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'] },
      ...(date_from && date_to ? { updated_at: { [Op.between]: [date_from, date_to] } } : {}),
    };
    if (effectiveBranchId) toPayWhere.dest_branch_id = effectiveBranchId;

    const toPayDeliveries = await Consignment.findAll({
      where: toPayWhere,
      include: [{ model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'], required: false }],
    });

    // Aggregate into daily collections by Date & Branch
    const grouped = {};

    paidBookings.forEach((b) => {
      const dt = b.booking_date;
      const bId = b.origin_branch_id || b.originBranch?.id;
      const bName = b.originBranch?.name || 'Head Office';
      const key = `${dt}_${bId || bName}`;

      if (!grouped[key]) {
        grouped[key] = {
          date: dt,
          branchId: bId,
          branchName: bName,
          paidBookingsCount: 0,
          paidCashAmount: 0,
          toPayDeliveriesCount: 0,
          toPayCashAmount: 0,
          totalCollected: 0,
        };
      }

      grouped[key].paidBookingsCount += 1;
      grouped[key].paidCashAmount += Number(b.total_amount || 0);
      grouped[key].totalCollected += Number(b.total_amount || 0);
    });

    toPayDeliveries.forEach((d) => {
      const dt = d.updated_at ? d.updated_at.toISOString().split('T')[0] : d.booking_date;
      const bId = d.dest_branch_id || d.destBranch?.id;
      const bName = d.destBranch?.name || 'Destination Hub';
      const key = `${dt}_${bId || bName}`;

      if (!grouped[key]) {
        grouped[key] = {
          date: dt,
          branchId: bId,
          branchName: bName,
          paidBookingsCount: 0,
          paidCashAmount: 0,
          toPayDeliveriesCount: 0,
          toPayCashAmount: 0,
          totalCollected: 0,
        };
      }

      grouped[key].toPayDeliveriesCount += 1;
      grouped[key].toPayCashAmount += Number(d.total_amount || 0);
      grouped[key].totalCollected += Number(d.total_amount || 0);
    });

    // Fetch Branch Remittances/Closures
    const closuresMap = {};
    if (BranchCashClosure) {
      const closures = await BranchCashClosure.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {}),
        },
      });
      closures.forEach((c) => {
        const cKey = `${c.closure_date}_${c.branch_id}`;
        closuresMap[cKey] = c;
      });
    }

    const collectionRows = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));

    let gPaidAmount = 0;
    let gToPayAmount = 0;
    let gTotalCash = 0;
    let gRemittedCash = 0;

    collectionRows.forEach((r) => {
      gPaidAmount += r.paidCashAmount;
      gToPayAmount += r.toPayCashAmount;
      gTotalCash += r.totalCollected;
      r.paidCashAmount = parseFloat(r.paidCashAmount.toFixed(2));
      r.toPayCashAmount = parseFloat(r.toPayCashAmount.toFixed(2));
      r.totalCollected = parseFloat(r.totalCollected.toFixed(2));

      // Match closure
      const matchClosure = closuresMap[`${r.date}_${r.branchId}`];
      if (matchClosure) {
        r.isClosed = true;
        r.closureStatus = matchClosure.status;
        r.bankName = matchClosure.bank_name;
        r.utrNumber = matchClosure.utr_reference_no;
        r.receiptSlipUrl = matchClosure.receipt_slip_url;
        r.remittedAmount = parseFloat(Number(matchClosure.remitted_amount || 0).toFixed(2));
        gRemittedCash += r.remittedAmount;
      } else {
        r.isClosed = false;
        r.closureStatus = 'OPEN';
        r.bankName = null;
        r.utrNumber = null;
        r.receiptSlipUrl = null;
        r.remittedAmount = 0;
      }
    });

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    const paginatedRows = collectionRows.slice(offset, offset + limitInt);

    const summary = {
      totalRecords: collectionRows.length,
      totalPaidCollected: parseFloat(gPaidAmount.toFixed(2)),
      totalToPayCollected: parseFloat(gToPayAmount.toFixed(2)),
      totalCashCollected: parseFloat(gTotalCash.toFixed(2)),
      totalRemittedToBank: parseFloat(gRemittedCash.toFixed(2)),
      totalUnclosedCash: parseFloat(Math.max(0, gTotalCash - gRemittedCash).toFixed(2)),
    };

    return paginatedResponse(
      res,
      'Daily branch collection report fetched successfully',
      paginatedRows,
      {
        page: pageInt,
        limit: limitInt,
        total: collectionRows.length,
        pages: Math.ceil(collectionRows.length / limitInt),
        summary,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 6. GST Sales & Tax Liability Register (SAC 9965)
 */
const getGstTaxReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Consignment, Customer, Branch } = m;
    const { branch_id, date_from, date_to, page = 1, limit = 25, search } = req.query;

    const where = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    if (effectiveBranchId) {
      where.origin_branch_id = effectiveBranchId;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { lr_number: { [Op.iLike || Op.like]: q } },
          { docket_number: { [Op.iLike || Op.like]: q } },
        ],
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Consignment.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'consignor', attributes: ['id', 'name', 'gstin'], required: false },
        { model: Customer, as: 'consignee', attributes: ['id', 'name', 'gstin'], required: false },
        {
          model: Branch,
          as: 'originBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city'],
          required: false,
        },
      ],
      order: [['booking_date', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const enrichedRows = rows.map((c) => {
      const taxableValue = Number(c.freight_amount || 0);
      const taxAmount = Number(c.tax_amount || 0);
      const taxRate = Number(c.tax_percent || 5);

      // Check RCM eligibility: In India GTA, if consignor/consignee has GSTIN, RCM applies
      const isRegisteredParty = Boolean(c.consignor?.gstin || c.consignee?.gstin);
      const isRcm = isRegisteredParty && (c.payment_type === 'TBB' || taxRate === 5);

      // Determine CGST + SGST vs IGST (intra-state vs inter-state)
      const isInterState = c.origin_city !== c.destination_city;
      const cgst = isInterState ? 0 : parseFloat((taxAmount / 2).toFixed(2));
      const sgst = isInterState ? 0 : parseFloat((taxAmount / 2).toFixed(2));
      const igst = isInterState ? parseFloat(taxAmount.toFixed(2)) : 0;

      return {
        id: c.id,
        lrNumber: c.lr_number,
        bookingDate: c.booking_date,
        branch: c.originBranch?.name || c.origin_city,
        sacCode: '9965', // GTA SAC Code
        consignorName: c.consignor?.name || 'Cash Party',
        consignorGst: c.consignor?.gstin || 'URP',
        consigneeName: c.consignee?.name || 'Cash Party',
        consigneeGst: c.consignee?.gstin || 'URP',
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        taxRatePct: taxRate,
        taxType: isRcm ? 'RCM (Reverse Charge)' : 'Forward Charge',
        cgst,
        sgst,
        igst,
        totalGst: parseFloat(taxAmount.toFixed(2)),
        totalInvoiceValue: parseFloat((taxableValue + taxAmount).toFixed(2)),
      };
    });

    // Global GST summary
    const allMatches = await Consignment.findAll({
      where,
      include: [
        { model: Customer, as: 'consignor', attributes: ['gstin'] },
        { model: Customer, as: 'consignee', attributes: ['gstin'] },
      ],
      attributes: ['freight_amount', 'tax_amount', 'tax_percent', 'payment_type'],
    });

    let gTaxable = 0;
    let gTax = 0;
    let rcmTaxable = 0;
    let forwardTaxable = 0;

    allMatches.forEach((c) => {
      const val = Number(c.freight_amount || 0);
      const tax = Number(c.tax_amount || 0);
      gTaxable += val;
      gTax += tax;

      const isReg = Boolean(c.consignor?.gstin || c.consignee?.gstin);
      if (isReg && (c.payment_type === 'TBB' || Number(c.tax_percent) === 5)) {
        rcmTaxable += val;
      } else {
        forwardTaxable += val;
      }
    });

    const summary = {
      totalConsignments: count,
      totalTaxableValue: parseFloat(gTaxable.toFixed(2)),
      totalTaxLiability: parseFloat(gTax.toFixed(2)),
      rcmTaxableTurnover: parseFloat(rcmTaxable.toFixed(2)),
      forwardChargeTurnover: parseFloat(forwardTaxable.toFixed(2)),
    };

    return paginatedResponse(
      res,
      'GST tax register fetched successfully',
      enrichedRows,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        pages: Math.ceil(count / parseInt(limit, 10)),
        summary,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  getDocketFreightReport,
  getCustomerAgeingReport,
  getTripProfitabilityReport,
  getPodComplianceReport,
  getDailyCollectionReport,
  getGstTaxReport,
};
