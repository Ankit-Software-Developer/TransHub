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

  const userAssignedBranch = req.user?.branch_id || req.branchId;

  // Non-admin user: strictly locked to their login branch only
  if (!isGlobalUser) {
    return userAssignedBranch || null;
  }

  // Admin user: explicitly requested 'ALL' branches or unselected
  if (!requestedBranchId || requestedBranchId === 'ALL' || requestedBranchId === 'undefined' || requestedBranchId === 'null' || String(requestedBranchId).trim() === '') {
    return null;
  }

  // Admin user: explicitly requested a specific branch
  return requestedBranchId;
};

/**
 * Helper to verify financial & tax audit authority:
 * Restricts Trip & Vehicle P&L, GST register, etc. to Admin, Auditor, and Accountant roles.
 */
const canAccessFinancialAudit = (req) => {
  return Boolean(
    req.user?.is_owner ||
    req.user?.isAdmin ||
    ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'AUDITOR', 'ACCOUNTANT', 'FINANCE'].includes(req.user?.role) ||
    (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER', 'AUDITOR', 'AUDIT', 'ACCOUNTANT', 'ACCOUNTS', 'FINANCE', 'FINANCE_MANAGER'].includes(r))) ||
    (req.userPermissions && req.userPermissions.some((p) => ['*', 'reports.audit', 'audit.view', 'finance.view', 'reports.trips_pnl.view', 'reports.trips.view', 'reports.gst.view'].includes(p)))
  );
};

/**
 * 1. Docket & Freight Sales Register
 */
const getDocketFreightReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Consignment, Branch, Customer, Booking, Pod, Trip, Vehicle, Driver, Expense, ExpenseCategory, DriverAdvance } = m;
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
      order_type = 'ALL', // 'ALL', 'DOCKET', or 'PLACEMENT'
      page = 1,
      limit = 25,
    } = req.query;

    const baseWhere = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    // Branch filter: non-admin restricted to login branch, admin can view all or specific
    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    if (effectiveBranchId) {
      baseWhere[Op.or] = [
        { origin_branch_id: effectiveBranchId },
        { dest_branch_id: effectiveBranchId },
        { current_branch_id: effectiveBranchId },
      ];
    }

    const where = { ...baseWhere };

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
      const matchedCustomers = await Customer.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          [Op.or]: [
            { name: { [Op.like]: q } },
            { phone: { [Op.like]: q } },
            { gstin: { [Op.like]: q } },
          ],
        },
        attributes: ['id'],
      });
      const customerIds = matchedCustomers.map((c) => c.id);

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { lr_number: { [Op.like]: q } },
          { docket_number: { [Op.like]: q } },
          { origin_city: { [Op.like]: q } },
          { destination_city: { [Op.like]: q } },
          { eway_bill_no: { [Op.like]: q } },
          { invoice_no: { [Op.like]: q } },
          ...(customerIds.length > 0
            ? [{ consignor_id: { [Op.in]: customerIds } }, { consignee_id: { [Op.in]: customerIds } }]
            : []),
        ],
      });
    }

    // 1. Fetch Dockets / Consignments (if order_type is 'ALL' or 'DOCKET')
    let consignmentRows = [];
    let consignmentCount = 0;
    let allConsignmentMatches = [];

    if (order_type !== 'PLACEMENT') {
      const cResult = await Consignment.findAndCountAll({
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
        limit: order_type === 'DOCKET' ? parseInt(limit, 10) : 500,
        offset: order_type === 'DOCKET' ? (parseInt(page, 10) - 1) * parseInt(limit, 10) : 0,
      });

      consignmentCount = cResult.count;
      consignmentRows = cResult.rows.map((r) => {
        const item = r.toJSON ? r.toJSON() : r;
        const isCleared =
          item.payment_type === 'PAID' ||
          (item.payment_type === 'TO_PAY' && deliveredStatuses.includes(item.status)) ||
          (['TBB', 'CREDIT'].includes(item.payment_type) && (item.is_billed || item.invoice_id));

        const loading = Number(item.loading_charges || 0);
        const unloading = Number(item.unloading_charges || 0);
        const doorDel = Number(item.door_delivery_charges || 0);
        const handling = Number(item.handling_charges || 0);
        const docketExp = loading + unloading + doorDel + handling;
        const docketBreakdown = [
          loading > 0 ? `Loading: ₹${loading.toLocaleString('en-IN')}` : null,
          unloading > 0 ? `Unloading: ₹${unloading.toLocaleString('en-IN')}` : null,
          doorDel > 0 ? `Delivery: ₹${doorDel.toLocaleString('en-IN')}` : null,
          handling > 0 ? `Handling: ₹${handling.toLocaleString('en-IN')}` : null,
        ].filter(Boolean).join('; ') || (docketExp > 0 ? `Charges: ₹${docketExp.toLocaleString('en-IN')}` : 'None');

        const totAmt = Number(item.total_amount || 0);
        const isPaid = item.payment_type === 'PAID';

        return {
          ...item,
          order_type: 'DOCKET',
          is_placement: false,
          payment_cleared: Boolean(isCleared),
          clearance_status: isCleared ? 'CLEARED' : 'PENDING',
          advance_received: isPaid ? totAmt : 0,
          balance_due: isPaid ? 0 : totAmt,
          driver_advance: 0,
          total_expenses: docketExp,
          vehicle_charge: 0,
          net_profit: totAmt - docketExp,
          expense_breakdown: docketBreakdown,
          expense_items: [],
        };
      });

      try {
        allConsignmentMatches = await Consignment.findAll({
          where: baseWhere,
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
      } catch (cSumErr) {
        console.warn('allConsignmentMatches query warning:', cSumErr.message);
        allConsignmentMatches = [];
      }
    }

    // 2. Fetch Direct Vehicle Placement Trips (if order_type is 'ALL' or 'PLACEMENT')
    let placementRows = [];
    let placementCount = 0;
    let allPlacementMatches = [];

    if (order_type !== 'DOCKET' && Trip) {
      const tripBaseWhere = {
        tenant_id: req.tenant.tenantId,
        ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
        trip_mode: 'DIRECT_VEHICLE_HIRE',
        status: { [Op.ne]: 'CANCELLED' },
        ...buildDateRange(date_from, date_to, 'trip_date'),
      };

      if (effectiveBranchId) {
        tripBaseWhere[Op.or] = [
          { origin_branch_id: effectiveBranchId },
          { dest_branch_id: effectiveBranchId },
        ];
      }

      const tripWhere = { ...tripBaseWhere };

      if (status && status !== 'ALL') {
        tripWhere.status = status;
      }

      if (customer_id && customer_id !== 'ALL') {
        tripWhere.customer_id = customer_id;
      }

      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        tripWhere[Op.and] = tripWhere[Op.and] || [];
        tripWhere[Op.and].push({
          [Op.or]: [
            { trip_number: { [Op.like]: q } },
            { party_ref_number: { [Op.like]: q } },
            { hiring_party_name: { [Op.like]: q } },
            { origin_city: { [Op.like]: q } },
            { destination_city: { [Op.like]: q } },
            { eway_bill_no: { [Op.like]: q } },
            { goods_description: { [Op.like]: q } },
          ],
        });
      }

      const tripIncludes = [
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
      ];

      if (Vehicle) {
        tripIncludes.push({
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'vehicle_number', 'ownership', 'capacity_ton'],
          required: false,
        });
      }
      if (Driver) {
        tripIncludes.push({
          model: Driver,
          as: 'driver',
          attributes: ['id', 'name', 'phone'],
          required: false,
        });
      }
      if (Customer) {
        tripIncludes.push({
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'gstin'],
          required: false,
        });
      }
      if (Expense) {
        tripIncludes.push({
          model: Expense,
          as: 'expenses',
          attributes: ['id', 'amount', 'category_id', 'payment_method', 'vendor_name', 'remarks'],
          include: ExpenseCategory ? [{ model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] }] : [],
          required: false,
        });
      }
      if (DriverAdvance) {
        tripIncludes.push({
          model: DriverAdvance,
          as: 'advances',
          attributes: ['id', 'amount', 'disbursed_mode', 'remarks'],
          required: false,
        });
      }

      let rawPlacements = [];
      try {
        rawPlacements = await Trip.findAll({
          where: tripWhere,
          include: tripIncludes,
          order: [['trip_date', 'DESC'], ['created_at', 'DESC']],
          limit: order_type === 'PLACEMENT' ? parseInt(limit, 10) : 500,
          offset: order_type === 'PLACEMENT' ? (parseInt(page, 10) - 1) * parseInt(limit, 10) : 0,
        });
      } catch (tripIncludeErr) {
        console.warn('Trip.findAll with nested expenses/advances failed, falling back to basic trip include:', tripIncludeErr.message);
        const safeTripIncludes = [
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
        ];
        if (Vehicle) {
          safeTripIncludes.push({
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'vehicle_number', 'ownership', 'capacity_ton'],
            required: false,
          });
        }
        if (Driver) {
          safeTripIncludes.push({
            model: Driver,
            as: 'driver',
            attributes: ['id', 'name', 'phone'],
            required: false,
          });
        }
        if (Customer) {
          safeTripIncludes.push({
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'phone', 'gstin'],
            required: false,
          });
        }
        rawPlacements = await Trip.findAll({
          where: tripWhere,
          include: safeTripIncludes,
          order: [['trip_date', 'DESC'], ['created_at', 'DESC']],
          limit: order_type === 'PLACEMENT' ? parseInt(limit, 10) : 500,
          offset: order_type === 'PLACEMENT' ? (parseInt(page, 10) - 1) * parseInt(limit, 10) : 0,
        });
      }

      // In-memory filter for payment type & clearance on placement trips (contract amount vs advance)
      const filteredPlacements = rawPlacements.filter((t) => {
        const contractAmt = Number(t.contract_amount || 0);
        const advReceived = Number(t.advance_received || 0);
        const isTripCleared = advReceived >= contractAmt || t.billing_status === 'SETTLED' || t.status === 'COMPLETED';

        if (payment_type && payment_type !== 'ALL') {
          if (payment_type === 'PAID' && advReceived < contractAmt) return false;
          if (payment_type === 'TO_PAY' && advReceived >= contractAmt) return false;
          if (['TBB', 'CREDIT'].includes(payment_type) && t.billing_status !== 'INVOICED') return false;
        }

        if (effectiveClearance && effectiveClearance !== 'ALL') {
          if (effectiveClearance === 'CLEARED' && !isTripCleared) return false;
          if ((effectiveClearance === 'PENDING' || effectiveClearance === 'UNCLEARED') && isTripCleared) return false;
        }

        return true;
      });

      placementCount = filteredPlacements.length;
      placementRows = filteredPlacements.map((t) => {
        const contractAmt = Number(t.contract_amount || 0);
        const advReceived = Number(t.advance_received || 0);
        const balDue = Math.max(0, contractAmt - advReceived);
        const isCleared = advReceived >= contractAmt || t.billing_status === 'SETTLED' || t.status === 'COMPLETED';

        const driverAdv = Number(t.driver_advance || 0) + (t.advances || []).reduce((acc, a) => acc + Number(a.amount || 0), 0);
        const expenseItems = (t.expenses || []).map((e) => {
          const cat = e.category?.name || 'General Expense';
          const amt = Number(e.amount || 0);
          const rem = e.remarks || e.vendor_name || '';
          return {
            category: cat,
            amount: amt,
            payment_method: e.payment_method || 'CASH',
            remarks: rem,
            text: `${cat}: ₹${amt.toLocaleString('en-IN')}${rem ? ` (${rem})` : ''}`,
          };
        });
        const calculatedExpenses = expenseItems.reduce((acc, e) => acc + e.amount, 0);
        const totalExpenses = Math.max(Number(t.total_expenses || 0), calculatedExpenses);
        const vehicleHireCharge = Number(t.vehicle_charge || 0);
        const netProfit = contractAmt - (totalExpenses + vehicleHireCharge);
        const expenseBreakdown = expenseItems.length > 0
          ? expenseItems.map((e) => e.text).join('; ')
          : (totalExpenses > 0 ? `Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}` : 'None');

        return {
          id: t.id,
          order_type: 'PLACEMENT',
          is_placement: true,
          lr_number: t.trip_number,
          docket_number: t.party_ref_number || t.trip_number,
          booking_date: t.trip_date || (t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : ''),
          created_at: t.created_at,
          origin_city: t.origin_city,
          destination_city: t.destination_city,
          originBranch: t.originBranch ? {
            id: t.originBranch.id,
            name: t.originBranch.branch_name || t.originBranch.name,
            code: t.originBranch.branch_code || t.originBranch.code,
            city: t.originBranch.city,
          } : { name: t.origin_city, code: t.origin_city, city: t.origin_city },
          destBranch: t.destBranch ? {
            id: t.destBranch.id,
            name: t.destBranch.branch_name || t.destBranch.name,
            code: t.destBranch.branch_code || t.destBranch.code,
            city: t.destBranch.city,
          } : { name: t.destination_city, code: t.destination_city, city: t.destination_city },
          consignor: {
            name: t.hiring_party_name || (t.customer ? t.customer.name : 'Direct Hiring Client'),
            phone: t.hiring_party_phone || (t.customer ? t.customer.phone : null),
            gstin: t.customer?.gstin || null,
          },
          consignee: {
            name: t.destination_city ? `${t.destination_city} Site / Unloading Point` : 'Consignee Site',
            phone: null,
            gstin: null,
          },
          packages_count: t.total_packages > 0 ? t.total_packages : 1,
          actual_weight: Number(t.total_weight || 0),
          charged_weight: Number(t.total_weight || 0),
          freight_amount: contractAmt,
          loading_charges: 0,
          unloading_charges: 0,
          door_delivery_charges: 0,
          handling_charges: 0,
          tax_amount: 0,
          total_amount: contractAmt,
          advance_received: advReceived,
          balance_due: balDue,
          driver_advance: driverAdv,
          total_expenses: totalExpenses,
          vehicle_charge: vehicleHireCharge,
          net_profit: netProfit,
          expense_breakdown: expenseBreakdown,
          expense_items: expenseItems,
          payment_type: advReceived >= contractAmt ? 'PAID' : (advReceived > 0 ? 'PARTIAL' : 'TO_PAY'),
          payment_cleared: isCleared,
          clearance_status: isCleared ? 'CLEARED' : 'PENDING',
          status: t.status,
          load_type: t.load_type || 'FTL',
          trip_mode: t.trip_mode || 'DIRECT_VEHICLE_HIRE',
          vehicle: t.vehicle ? { vehicle_number: t.vehicle.vehicle_number } : null,
          driver: t.driver ? { name: t.driver.name, phone: t.driver.phone } : null,
          eway_bill_no: t.eway_bill_no,
          goods_description: t.goods_description,
          party_ref_number: t.party_ref_number,
        };
      });

      try {
        allPlacementMatches = await Trip.findAll({
          where: tripBaseWhere,
          attributes: [
            'contract_amount',
            'advance_received',
            'driver_advance',
            'total_expenses',
            'vehicle_charge',
            'total_packages',
            'total_weight',
            'billing_status',
            'status',
          ],
        });
      } catch (pSumErr) {
        console.warn('allPlacementMatches query warning:', pSumErr.message);
        allPlacementMatches = [];
      }
    }

    // 3. Overall Summary Calculations across all records in scope
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
    let clearedRevenue = 0;
    let pendingRevenue = 0;
    let totalAdvanceReceived = 0;
    let totalDriverAdvance = 0;
    let totalTripExpenses = 0;

    // Consignment metrics
    allConsignmentMatches.forEach((c) => {
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
      const rowTotal = Number(c.total_amount || 0);
      totalRevenue += rowTotal;

      if (c.payment_type === 'PAID') {
        paidCount++;
        totalAdvanceReceived += rowTotal;
      } else if (c.payment_type === 'TO_PAY') toPayCount++;
      else if (['TBB', 'CREDIT'].includes(c.payment_type)) tbbCount++;

      const isItemCleared =
        c.payment_type === 'PAID' ||
        (c.payment_type === 'TO_PAY' && deliveredStatuses.includes(c.status)) ||
        (['TBB', 'CREDIT'].includes(c.payment_type) && (c.is_billed || c.invoice_id));

      if (isItemCleared) {
        clearedCount++;
        clearedRevenue += rowTotal;
      } else {
        pendingCount++;
        pendingRevenue += rowTotal;
      }
    });

    // Placement metrics
    allPlacementMatches.forEach((t) => {
      const contractAmt = Number(t.contract_amount || 0);
      const advReceived = Number(t.advance_received || 0);
      const balDue = Math.max(0, contractAmt - advReceived);
      const isTripCleared = advReceived >= contractAmt || t.billing_status === 'SETTLED' || t.status === 'COMPLETED';
      const drvAdv = Number(t.driver_advance || 0);
      const tripExp = Number(t.total_expenses || 0);

      totalPackages += Number(t.total_packages > 0 ? t.total_packages : 1);
      totalActualWeight += Number(t.total_weight || 0);
      totalChargedWeight += Number(t.total_weight || 0);
      totalBaseFreight += contractAmt;
      totalRevenue += contractAmt;
      totalAdvanceReceived += advReceived;
      totalDriverAdvance += drvAdv;
      totalTripExpenses += tripExp;

      if (advReceived >= contractAmt) paidCount++;
      else if (advReceived > 0) toPayCount++;
      else toPayCount++;

      if (isTripCleared) {
        clearedCount++;
        clearedRevenue += contractAmt;
      } else {
        pendingCount++;
        pendingRevenue += contractAmt;
      }
    });

    // 4. Merge Rows and Apply Unified Sorting & Pagination
    let finalRows = [];
    let totalItems = 0;

    if (order_type === 'PLACEMENT') {
      finalRows = placementRows;
      totalItems = placementCount;
    } else if (order_type === 'DOCKET') {
      finalRows = consignmentRows;
      totalItems = consignmentCount;
    } else {
      // 'ALL': Merge both consignments and placement trips
      const combined = [...consignmentRows, ...placementRows];
      combined.sort((a, b) => {
        const dateA = a.booking_date || '';
        const dateB = b.booking_date || '';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      });

      totalItems = combined.length;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      finalRows = combined.slice(offset, offset + parseInt(limit, 10));
    }

    const totalBookingsScope = allConsignmentMatches.length + allPlacementMatches.length;
    const isFiltered = totalItems !== totalBookingsScope;
    let filteredRevenue = 0;
    if (isFiltered) {
      filteredRevenue = finalRows.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
    } else {
      filteredRevenue = totalRevenue;
    }

    const summary = {
      totalBookings: totalBookingsScope,
      docketsCount: allConsignmentMatches.length,
      placementsCount: allPlacementMatches.length,
      filteredBookings: totalItems,
      filteredRevenue: parseFloat(filteredRevenue.toFixed(2)),
      isFiltered,
      totalPackages,
      totalActualWeight: parseFloat(totalActualWeight.toFixed(2)),
      totalChargedWeight: parseFloat(totalChargedWeight.toFixed(2)),
      totalBaseFreight: parseFloat(totalBaseFreight.toFixed(2)),
      totalOtherCharges: parseFloat(totalOtherCharges.toFixed(2)),
      totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalClearedRevenue: parseFloat(clearedRevenue.toFixed(2)),
      totalPendingRevenue: parseFloat(pendingRevenue.toFixed(2)),
      totalAdvanceReceived: parseFloat(totalAdvanceReceived.toFixed(2)),
      totalDriverAdvance: parseFloat(totalDriverAdvance.toFixed(2)),
      totalTripExpenses: parseFloat(totalTripExpenses.toFixed(2)),
      breakdown: {
        paid: paidCount,
        toPay: toPayCount,
        tbb: tbbCount,
        cleared: clearedCount,
        pending: pendingCount,
        clearedRevenue: parseFloat(clearedRevenue.toFixed(2)),
        pendingRevenue: parseFloat(pendingRevenue.toFixed(2)),
        advanceReceived: parseFloat(totalAdvanceReceived.toFixed(2)),
        driverAdvance: parseFloat(totalDriverAdvance.toFixed(2)),
        tripExpenses: parseFloat(totalTripExpenses.toFixed(2)),
      },
    };

    return paginatedResponse(
      res,
      'Docket and vehicle placement freight register fetched successfully',
      finalRows,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalItems,
        pages: Math.ceil(totalItems / parseInt(limit, 10)) || 1,
        summary,
      }
    );
  } catch (error) {
    console.error('getDocketFreightReport error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 2. Customer Outstanding & Ageing Report (Credit / TBB Receivables)
 */
const getCustomerAgeingReport = async (req, res) => {
  try {
    const m = req.tenantDb || defaultModels;
    const { Customer, Invoice, Branch, Consignment } = m;
    const {
      branch_id,
      payment_type = 'ALL',
      search,
      min_balance = 0,
      page = 1,
      limit = 25,
    } = req.query;

    const tenantFilter = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    let effectiveBranchObj = null;
    if (effectiveBranchId) {
      effectiveBranchObj = await Branch.findByPk(effectiveBranchId, {
        attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name']],
      });
    }

    // 1. Fetch Customers
    const customerWhere = {
      ...tenantFilter,
      status: 'ACTIVE',
    };

    if (effectiveBranchId) {
      customerWhere[Op.or] = [
        { branch_id: effectiveBranchId },
        { branch_id: null },
      ];
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const searchCond = [
        { name: { [Op.like]: q } },
        { customer_code: { [Op.like]: q } },
        { phone: { [Op.like]: q } },
        { gstin: { [Op.like]: q } },
      ];
      if (customerWhere[Op.or]) {
        customerWhere[Op.and] = [
          { [Op.or]: customerWhere[Op.or] },
          { [Op.or]: searchCond },
        ];
        delete customerWhere[Op.or];
      } else {
        customerWhere[Op.or] = searchCond;
      }
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
      ],
      order: [['name', 'ASC']],
    });

    // 2. Fetch Invoices (Billed TBB / Credit)
    const invoiceWhere = {
      ...tenantFilter,
      status: { [Op.in]: ['GENERATED', 'SENT', 'PARTIAL', 'OVERDUE'] },
    };
    if (effectiveBranchId) {
      invoiceWhere.branch_id = effectiveBranchId;
    }

    const pendingInvoices = await Invoice.findAll({
      where: invoiceWhere,
      attributes: [
        'id', 'invoice_number', 'customer_id', 'branch_id', 'total_amount',
        'paid_amount', 'balance_amount', 'status', 'invoice_date', 'due_date', 'created_at',
      ],
    });

    // 3. Fetch Consignments (Unbilled TBB booked at this branch & Pending To-Pay delivered at this branch)
    const consignmentWhere = {
      ...tenantFilter,
    };

    if (effectiveBranchId) {
      if (payment_type === 'TBB') {
        consignmentWhere.origin_branch_id = effectiveBranchId;
        consignmentWhere.payment_type = 'TBB';
        consignmentWhere[Op.and] = [
          { [Op.or]: [{ is_billed: false }, { invoice_id: null }] },
        ];
      } else if (payment_type === 'TO_PAY') {
        consignmentWhere.dest_branch_id = effectiveBranchId;
        consignmentWhere.payment_type = 'TO_PAY';
        consignmentWhere.status = { [Op.in]: ['POD_UPLOADED', 'DELIVERED', 'REACHED_DESTINATION', 'COMPLETED', 'RECEIVED_AT_HUB'] };
      } else if (payment_type === 'PAID') {
        consignmentWhere.origin_branch_id = effectiveBranchId;
        consignmentWhere.payment_type = 'PAID';
      } else {
        // ALL
        consignmentWhere[Op.or] = [
          {
            origin_branch_id: effectiveBranchId,
            payment_type: 'TBB',
            [Op.or]: [{ is_billed: false }, { invoice_id: null }],
          },
          {
            dest_branch_id: effectiveBranchId,
            payment_type: 'TO_PAY',
            status: { [Op.in]: ['POD_UPLOADED', 'DELIVERED', 'REACHED_DESTINATION', 'COMPLETED', 'RECEIVED_AT_HUB'] },
          },
        ];
      }
    } else {
      if (payment_type === 'TBB') {
        consignmentWhere.payment_type = 'TBB';
        consignmentWhere[Op.and] = [
          { [Op.or]: [{ is_billed: false }, { invoice_id: null }] },
        ];
      } else if (payment_type === 'TO_PAY') {
        consignmentWhere.payment_type = 'TO_PAY';
        consignmentWhere.status = { [Op.in]: ['POD_UPLOADED', 'DELIVERED', 'REACHED_DESTINATION', 'COMPLETED', 'RECEIVED_AT_HUB'] };
      } else if (payment_type === 'PAID') {
        consignmentWhere.payment_type = 'PAID';
      } else {
        // ALL
        consignmentWhere[Op.or] = [
          {
            payment_type: 'TBB',
            [Op.or]: [{ is_billed: false }, { invoice_id: null }],
          },
          {
            payment_type: 'TO_PAY',
            status: { [Op.in]: ['POD_UPLOADED', 'DELIVERED', 'REACHED_DESTINATION', 'COMPLETED', 'RECEIVED_AT_HUB'] },
          },
        ];
      }
    }

    const pendingConsignments = await Consignment.findAll({
      where: consignmentWhere,
      attributes: [
        'id', 'docket_number', 'lr_number', 'consignor_id', 'consignee_id',
        'origin_branch_id', 'dest_branch_id', 'payment_type', 'total_amount',
        'status', 'booking_date', 'expected_delivery_date', 'created_at',
      ],
    });

    const now = new Date();
    const ageingData = [];

    let totalReceivables = 0;
    let totalOverdue = 0;
    let totalBucket0_30 = 0;
    let totalBucket31_60 = 0;
    let totalBucket61_90 = 0;
    let totalBucket90Plus = 0;

    let totalTbbReceivables = 0;
    let totalTopayReceivables = 0;

    customers.forEach((cust) => {
      // Match invoices
      const custInvs = pendingInvoices.filter((i) => i.customer_id === cust.id);

      // Match unbilled TBB (Consignor is billed, origin branch is effectiveBranchId)
      const custTbb = (payment_type === 'TO_PAY')
        ? []
        : pendingConsignments.filter((c) =>
            c.payment_type === 'TBB' &&
            c.consignor_id === cust.id &&
            (!effectiveBranchId || c.origin_branch_id === effectiveBranchId)
          );

      // Match pending To-Pay (Consignee pays upon arrival/delivery at destination branch)
      const custToPay = (payment_type === 'TBB')
        ? []
        : pendingConsignments.filter((c) =>
            c.payment_type === 'TO_PAY' &&
            c.consignee_id === cust.id &&
            (!effectiveBranchId || c.dest_branch_id === effectiveBranchId)
          );

      // Strictly enforce branch boundaries when filtering by branch
      if (effectiveBranchId) {
        const isAssignedToThisBranch = cust.branch_id === effectiveBranchId;
        const hasBranchActivity = custInvs.length > 0 || custTbb.length > 0 || custToPay.length > 0;

        // If customer is explicitly assigned to another branch, strictly exclude
        if (cust.branch_id && !isAssignedToThisBranch) {
          return;
        }
        // If customer is unassigned (walk-in/null branch), only include if they have transactions at this branch
        if (!isAssignedToThisBranch && !hasBranchActivity) {
          return;
        }
      }

      let b0_30 = 0;
      let b31_60 = 0;
      let b61_90 = 0;
      let b90Plus = 0;

      let custInvoicedDue = 0;
      let custUnbilledTbbDue = 0;
      let custTopayDue = 0;

      const detailedInvoices = [];
      const detailedDockets = [];

      // 1. Process Billed Invoices
      if (payment_type !== 'TO_PAY') {
        custInvs.forEach((inv) => {
          const invTotal = Number(inv.total_amount || 0);
          const invPaid = Number(inv.paid_amount || 0);
          const invDue = Number(
            inv.balance_amount !== null && inv.balance_amount !== undefined
              ? inv.balance_amount
              : Math.max(0, invTotal - invPaid)
          );

          if (invDue > 0) {
            custInvoicedDue += invDue;
            const refDate = new Date(inv.due_date || inv.invoice_date || inv.created_at);
            const diffDays = Math.max(0, Math.floor((now - refDate) / (1000 * 60 * 60 * 24)));

            if (diffDays <= 30) b0_30 += invDue;
            else if (diffDays <= 60) b31_60 += invDue;
            else if (diffDays <= 90) b61_90 += invDue;
            else b90Plus += invDue;

            detailedInvoices.push({
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              invoiceDate: inv.invoice_date,
              dueDate: inv.due_date,
              totalAmount: invTotal,
              paidAmount: invPaid,
              balanceAmount: invDue,
              status: inv.status,
              overdueDays: diffDays,
            });
          }
        });
      }

      // 2. Process Unbilled TBB Dockets
      custTbb.forEach((c) => {
        const amt = Number(c.total_amount || 0);
        if (amt > 0) {
          custUnbilledTbbDue += amt;
          const refDate = new Date(c.booking_date || c.created_at);
          const diffDays = Math.max(0, Math.floor((now - refDate) / (1000 * 60 * 60 * 24)));

          if (diffDays <= 30) b0_30 += amt;
          else if (diffDays <= 60) b31_60 += amt;
          else if (diffDays <= 90) b61_90 += amt;
          else b90Plus += amt;

          detailedDockets.push({
            id: c.id,
            docketNumber: c.docket_number || c.lr_number,
            paymentType: 'TBB',
            modeDesc: 'TBB (Unbilled Accrued)',
            totalAmount: amt,
            status: c.status,
            bookingDate: c.booking_date,
            overdueDays: diffDays,
          });
        }
      });

      // 3. Process Pending To-Pay Dockets
      custToPay.forEach((c) => {
        const amt = Number(c.total_amount || 0);
        if (amt > 0) {
          custTopayDue += amt;
          const refDate = new Date(c.expected_delivery_date || c.booking_date || c.created_at);
          const diffDays = Math.max(0, Math.floor((now - refDate) / (1000 * 60 * 60 * 24)));

          if (diffDays <= 30) b0_30 += amt;
          else if (diffDays <= 60) b31_60 += amt;
          else if (diffDays <= 90) b61_90 += amt;
          else b90Plus += amt;

          detailedDockets.push({
            id: c.id,
            docketNumber: c.docket_number || c.lr_number,
            paymentType: 'TO_PAY',
            modeDesc: 'TO-PAY (Destination Collection)',
            totalAmount: amt,
            status: c.status,
            bookingDate: c.booking_date,
            overdueDays: diffDays,
          });
        }
      });

      const effectiveDue = b0_30 + b31_60 + b61_90 + b90Plus;

      // Filter by min_balance
      if (effectiveDue >= Number(min_balance)) {
        totalReceivables += effectiveDue;
        totalOverdue += (b31_60 + b61_90 + b90Plus);
        totalBucket0_30 += b0_30;
        totalBucket31_60 += b31_60;
        totalBucket61_90 += b61_90;
        totalBucket90Plus += b90Plus;

        totalTbbReceivables += (custInvoicedDue + custUnbilledTbbDue);
        totalTopayReceivables += custTopayDue;

        // Determine primary freight mode
        let primaryMode = 'TBB';
        if (custTopayDue > 0 && (custInvoicedDue > 0 || custUnbilledTbbDue > 0)) {
          primaryMode = 'MIXED';
        } else if (custTopayDue > 0) {
          primaryMode = 'TO_PAY';
        } else if (payment_type === 'PAID') {
          primaryMode = 'PAID';
        }

        // Determine alert level
        let alertLevel = 'OK';
        if (b90Plus > 0) {
          alertLevel = 'CRITICAL';
        } else if (b61_90 > 0) {
          alertLevel = 'HIGH';
        } else if (b31_60 > 0) {
          alertLevel = 'DUE';
        }

        ageingData.push({
          customerId: cust.id,
          customerName: cust.name,
          customerCode: cust.customer_code || 'NA',
          phone: cust.phone || 'NA',
          gstin: cust.gstin || 'Unregistered',
          branchId: cust.branch_id || cust.branch?.id || null,
          branchName: cust.branch
            ? (cust.branch.branch_name || cust.branch.name || 'Direct / Walk-in')
            : (effectiveBranchObj ? (effectiveBranchObj.branch_name || effectiveBranchObj.name) : 'Direct / Walk-in'),
          branchCode: cust.branch
            ? (cust.branch.branch_code || cust.branch.code || 'MAIN')
            : (effectiveBranchObj ? (effectiveBranchObj.branch_code || effectiveBranchObj.code || 'MAIN') : 'WALKIN'),
          branch: cust.branch
            ? (cust.branch.branch_name || cust.branch.name || 'Direct / Walk-in')
            : (effectiveBranchObj ? (effectiveBranchObj.branch_name || effectiveBranchObj.name) : 'Direct / Walk-in'),
          isLoginBranch: effectiveBranchId ? (cust.branch_id === effectiveBranchId) : null,
          branchRelation: !effectiveBranchId
            ? 'ALL_VIEW'
            : (cust.branch_id === effectiveBranchId ? 'LOGIN_BRANCH' : (cust.branch_id ? 'OTHER_BRANCH' : 'WALKIN_RELATION')),
          primaryMode,
          creditPeriodDays: cust.credit_days || 30,
          creditLimit: Number(cust.credit_limit || 0),
          invoicedDue: parseFloat(custInvoicedDue.toFixed(2)),
          unbilledTbbDue: parseFloat(custUnbilledTbbDue.toFixed(2)),
          topayDue: parseFloat(custTopayDue.toFixed(2)),
          totalBilled: parseFloat((custInvoicedDue + custUnbilledTbbDue + custTopayDue).toFixed(2)),
          totalOutstanding: parseFloat(effectiveDue.toFixed(2)),
          bucket0_30: parseFloat(b0_30.toFixed(2)),
          bucket31_60: parseFloat(b31_60.toFixed(2)),
          bucket61_90: parseFloat(b61_90.toFixed(2)),
          bucket90Plus: parseFloat(b90Plus.toFixed(2)),
          isOverdue: (b31_60 + b61_90 + b90Plus) > 0,
          alertLevel,
          invoiceCount: detailedInvoices.length,
          docketCount: detailedDockets.length,
          detailedInvoices,
          detailedDockets,
        });
      }
    });

    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 25;
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
      totalTbbReceivables: parseFloat(totalTbbReceivables.toFixed(2)),
      totalTopayReceivables: parseFloat(totalTopayReceivables.toFixed(2)),
    };

    return paginatedResponse(
      res,
      'Customer ageing report fetched successfully',
      paginatedRows,
      {
        page: pageInt,
        limit: limitInt,
        total: ageingData.length,
        pages: Math.ceil(ageingData.length / limitInt) || 1,
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
    if (!canAccessFinancialAudit(req)) {
      return errorResponse(res, 'Access denied. Trip & Vehicle P&L Audit is restricted to Audit & Accounting roles.', null, 403);
    }

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
      const matchedVehicles = await Vehicle.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          vehicle_number: { [Op.like]: q },
        },
        attributes: ['id'],
      });
      const vehicleIds = matchedVehicles.map((v) => v.id);

      const matchedDrivers = await Driver.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          name: { [Op.like]: q },
        },
        attributes: ['id'],
      });
      const driverIds = matchedDrivers.map((d) => d.id);

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { trip_number: { [Op.like]: q } },
          { origin_city: { [Op.like]: q } },
          { destination_city: { [Op.like]: q } },
          ...(vehicleIds.length > 0 ? [{ vehicle_id: { [Op.in]: vehicleIds } }] : []),
          ...(driverIds.length > 0 ? [{ driver_id: { [Op.in]: driverIds } }] : []),
        ],
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Trip.findAndCountAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'vehicle_type'], required: false },
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
        { model: Expense, as: 'expenses', attributes: ['id', 'amount'], required: false },
        { model: DriverAdvance, as: 'advances', attributes: ['id', 'amount'], required: false },
        { model: TripSettlement, as: 'settlement', attributes: ['id', 'status', 'total_advance', 'total_expenses', 'driver_allowance', 'balance_payable_or_receivable'], required: false },
      ],
      order: [['start_time', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const enrichedRows = rows.map((trip) => {
      // Trip revenue from loaded consignments or expected_revenue
      const consignmentRevenue = (trip.consignments || []).reduce(
        (acc, c) => acc + Number(c.total_amount || 0),
        0
      );
      const totalRevenue = Number(trip.expected_revenue) > 0 ? Number(trip.expected_revenue) : consignmentRevenue;

      // Expenses from expense vouchers and driver advances
      const fuelAndMiscExpense = (trip.expenses || []).reduce(
        (acc, e) => acc + Number(e.amount || 0),
        0
      );
      const advances = (trip.advances || []).reduce(
        (acc, a) => acc + Number(a.amount || 0),
        0
      );
      const recordedExpenses = Number(trip.total_expenses || 0) + Number(trip.driver_advance || 0);
      const totalOperatingCost = (fuelAndMiscExpense + advances) > 0 ? (fuelAndMiscExpense + advances) : recordedExpenses;

      const netProfit = totalRevenue - totalOperatingCost;
      const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

      const totalWeightKg = (trip.consignments || []).reduce(
        (acc, c) => acc + Number(c.charged_weight || 0),
        0
      );

      return {
        id: trip.id,
        tripNumber: trip.trip_number,
        startDate: trip.start_time ? trip.start_time.toISOString().split('T')[0] : (trip.trip_date || 'N/A'),
        status: trip.status,
        route: `${trip.origin_city || trip.originBranch?.city || trip.originBranch?.branch_name || 'Origin'} -> ${trip.destination_city || trip.destBranch?.city || trip.destBranch?.branch_name || 'Dest'}`,
        vehicleNumber: trip.vehicle ? (trip.vehicle.vehicle_number || trip.vehicle.registration_number) : 'Unassigned',
        driverName: trip.driver ? trip.driver.name : 'Unassigned',
        docketCount: (trip.consignments || []).length,
        totalWeightTonnes: parseFloat((totalWeightKg / 1000).toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        fuelAndExpenses: parseFloat(fuelAndMiscExpense.toFixed(2)),
        driverAdvances: parseFloat(advances.toFixed(2)),
        totalCost: parseFloat(totalOperatingCost.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        marginPct: parseFloat(marginPct),
        isSettled: trip.settlement_status === 'SETTLED' || trip.settlement?.status === 'SETTLED' || trip.status === 'SETTLED',
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
    const { Consignment, Branch, Customer, Pod, DeliveryRecord, Trip, Vehicle } = m;
    const {
      branch_id,
      date_from,
      date_to,
      pod_status,
      delivery_status,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const baseWhere = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    if (effectiveBranchId) {
      baseWhere[Op.or] = [
        { origin_branch_id: effectiveBranchId },
        { dest_branch_id: effectiveBranchId },
        { current_branch_id: effectiveBranchId },
      ];
    }

    const where = { ...baseWhere };

    // 7-day Overdue SLA threshold benchmark
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // Filter by Delivery Status or Priority Overdue
    const effectiveDelivery = delivery_status || pod_status;
    let podIncludeWhere = null;
    let podIncludeRequired = false;

    if (effectiveDelivery && effectiveDelivery !== 'ALL') {
      if (effectiveDelivery === 'DELIVERED') {
        where.status = { [Op.in]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'] };
      } else if (effectiveDelivery === 'PENDING') {
        where.status = { [Op.notIn]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'] };
      } else if (effectiveDelivery === 'OVERDUE' || effectiveDelivery === 'PRIORITY') {
        // Critical: Pending delivery > 7 days elapsed from booking
        where.status = { [Op.notIn]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'] };
        where.booking_date = { [Op.lte]: sevenDaysAgoStr };
      } else if (effectiveDelivery === 'VERIFIED') {
        podIncludeWhere = { status: { [Op.in]: ['POD_VERIFIED', 'VERIFIED'] } };
        podIncludeRequired = true;
      } else if (effectiveDelivery === 'UPLOADED') {
        podIncludeWhere = { status: { [Op.in]: ['POD_UPLOADED', 'UPLOADED'] } };
        podIncludeRequired = true;
      } else if (['RECEIVED_AT_HUB', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(effectiveDelivery)) {
        where.status = effectiveDelivery;
      }
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const matchedCustomers = await Customer.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          [Op.or]: [
            { name: { [Op.like]: q } },
            { phone: { [Op.like]: q } },
          ],
        },
        attributes: ['id'],
      });
      const customerIds = matchedCustomers.map((c) => c.id);

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { lr_number: { [Op.like]: q } },
          { docket_number: { [Op.like]: q } },
          { destination_city: { [Op.like]: q } },
          { origin_city: { [Op.like]: q } },
          ...(customerIds.length > 0
            ? [{ consignee_id: { [Op.in]: customerIds } }, { consignor_id: { [Op.in]: customerIds } }]
            : []),
        ],
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const includeList = [
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
    ];

    if (Pod) {
      includeList.push({
        model: Pod,
        as: 'pod',
        attributes: ['id', 'status', 'verified_at', 'file_url', ['file_url', 'pod_url'], 'uploaded_at'],
        ...(podIncludeWhere ? { where: podIncludeWhere } : {}),
        required: podIncludeRequired,
      });
    }

    if (DeliveryRecord) {
      includeList.push({
        model: DeliveryRecord,
        as: 'deliveryRecord',
        attributes: ['id', 'delivery_date', 'receiver_name', 'receiver_signature_url', 'is_otp_verified'],
        required: false,
      });
    }

    const { count, rows } = await Consignment.findAndCountAll({
      where,
      include: includeList,
      order: [['booking_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const enrichedRows = rows.map((c) => {
      const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(c.status);
      const deliveryDate = c.deliveryRecord?.delivery_date || (isDelivered ? c.updated_at : null);
      const bDate = new Date(c.booking_date);
      const dDate = isDelivered && deliveryDate ? new Date(deliveryDate) : null;

      let daysCount = 0;
      let isOverdue = false; // > 7 days
      let priorityLevel = 'ON_TRACK';

      if (isDelivered && dDate && !isNaN(dDate.getTime())) {
        daysCount = Math.max(0, Math.round((dDate - bDate) / (1000 * 60 * 60 * 24)));
        isOverdue = daysCount > 7;
        priorityLevel = isOverdue ? 'DELIVERED_LATE' : 'DELIVERED_ON_TIME';
      } else {
        const msDiff = Math.max(0, now.getTime() - bDate.getTime());
        daysCount = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        isOverdue = daysCount > 7;
        if (isOverdue) {
          priorityLevel = 'CRITICAL_LATE'; // Pending > 7 days! Requires immediate priority dispatch
        } else if (daysCount >= 5) {
          priorityLevel = 'ATTENTION_DUE';
        } else {
          priorityLevel = 'ON_TRACK';
        }
      }

      let podStatus = 'PENDING';
      const rawPodStatus = c.pod?.status;
      if (rawPodStatus === 'POD_VERIFIED' || rawPodStatus === 'VERIFIED') {
        podStatus = 'VERIFIED';
      } else if (rawPodStatus === 'POD_UPLOADED' || rawPodStatus === 'UPLOADED' || c.pod?.file_url) {
        podStatus = 'UPLOADED';
      } else if (isDelivered) {
        podStatus = 'PENDING_UPLOAD';
      }

      return {
        id: c.id,
        lrNumber: c.lr_number,
        docketNumber: c.docket_number || c.lr_number,
        bookingDate: c.booking_date,
        deliveryDate: isDelivered && dDate && !isNaN(dDate.getTime()) ? dDate.toISOString().split('T')[0] : (isDelivered ? 'Delivered' : 'Pending'),
        isDelivered,
        daysCount,
        isOverdue,
        priorityLevel,
        transitDays: isDelivered ? `${daysCount} Day${daysCount === 1 ? '' : 's'}` : `${daysCount} Day${daysCount === 1 ? '' : 's'} Pending`,
        originBranch: c.originBranch?.branch_name || c.originBranch?.name || c.origin_city || 'Origin',
        destBranch: c.destBranch?.branch_name || c.destBranch?.name || c.destination_city || 'Destination',
        consignorName: c.consignor?.name || 'Cash Party',
        consigneeName: c.consignee?.name || 'Direct Delivery',
        shipmentStatus: c.status,
        podStatus,
        podUrl: c.pod?.pod_url || c.pod?.file_url || null,
        receiverName: c.deliveryRecord?.receiver_name || (c.pod?.receiver_name) || 'NA',
        hasPhysicalPod: Boolean(rawPodStatus === 'POD_VERIFIED' || rawPodStatus === 'VERIFIED' || c.deliveryRecord?.receiver_signature_url),
        verifiedAt: c.pod?.verified_at ? (typeof c.pod.verified_at === 'string' ? c.pod.verified_at.split('T')[0] : new Date(c.pod.verified_at).toISOString().split('T')[0]) : null,
        load_type: c.load_type || 'PTL',
        loadType: c.load_type || 'PTL',
      };
    });

    // Fetch direct vehicle placement trips
    let placementRows = [];
    let allPlacementMatches = [];
    if (Trip) {
      const placementBaseWhere = {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        trip_mode: 'DIRECT_VEHICLE_HIRE',
        status: { [Op.ne]: 'CANCELLED' },
        ...buildDateRange(date_from, date_to, 'trip_date'),
      };
      if (effectiveBranchId) {
        placementBaseWhere[Op.or] = [
          { origin_branch_id: effectiveBranchId },
          { dest_branch_id: effectiveBranchId },
        ];
      }

      const placementWhere = { ...placementBaseWhere };

      if (effectiveDelivery && effectiveDelivery !== 'ALL') {
        if (effectiveDelivery === 'DELIVERED') {
          placementWhere.status = 'COMPLETED';
        } else if (effectiveDelivery === 'PENDING') {
          placementWhere.status = { [Op.ne]: 'COMPLETED' };
        } else if (effectiveDelivery === 'OVERDUE' || effectiveDelivery === 'PRIORITY') {
          placementWhere.status = { [Op.ne]: 'COMPLETED' };
          placementWhere.trip_date = { [Op.lte]: sevenDaysAgoStr };
        } else if (effectiveDelivery === 'UPLOADED' || effectiveDelivery === 'VERIFIED') {
          placementWhere.pod_file_url = { [Op.ne]: null };
        }
      }

      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        placementWhere[Op.and] = placementWhere[Op.and] || [];
        placementWhere[Op.and].push({
          [Op.or]: [
            { trip_number: { [Op.like]: q } },
            { party_ref_number: { [Op.like]: q } },
            { destination_city: { [Op.like]: q } },
            { origin_city: { [Op.like]: q } },
            { hiring_party_name: { [Op.like]: q } },
            { receiver_name: { [Op.like]: q } },
          ],
        });
      }

      const rawPlacementTrips = await Trip.findAll({
        where: placementWhere,
        include: [
          { model: Branch, as: 'originBranch', attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], 'city'], required: false },
          { model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], 'city'], required: false },
          ...(Customer ? [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false }] : []),
          ...(Vehicle ? [{ model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number'], required: false }] : []),
        ],
        order: [['trip_date', 'DESC'], ['created_at', 'DESC']],
        limit: 500,
      }).catch(() => []);

      placementRows = rawPlacementTrips.map((t) => {
        const isDelivered = t.status === 'COMPLETED';
        const deliveryDate = t.delivered_at || t.end_time || (isDelivered ? t.updated_at : null);
        const bDate = new Date(t.trip_date);
        const dDate = isDelivered && deliveryDate ? new Date(deliveryDate) : null;
        let daysCount = 0;
        let isOverdue = false;
        let priorityLevel = 'ON_TRACK';

        if (isDelivered && dDate && !isNaN(dDate.getTime())) {
          daysCount = Math.max(0, Math.round((dDate - bDate) / (1000 * 60 * 60 * 24)));
          isOverdue = daysCount > 7;
          priorityLevel = isOverdue ? 'DELIVERED_LATE' : 'DELIVERED_ON_TIME';
        } else {
          const msDiff = Math.max(0, now.getTime() - bDate.getTime());
          daysCount = Math.floor(msDiff / (1000 * 60 * 60 * 24));
          isOverdue = daysCount > 7;
          priorityLevel = isOverdue ? 'CRITICAL_LATE' : (daysCount >= 5 ? 'ATTENTION_DUE' : 'ON_TRACK');
        }

        let podStatus = 'PENDING';
        if (t.pod_file_url) {
          podStatus = 'UPLOADED';
        } else if (isDelivered) {
          podStatus = 'PENDING_UPLOAD';
        }

        return {
          id: t.id,
          lrNumber: t.trip_number,
          docketNumber: t.party_ref_number || t.trip_number,
          bookingDate: t.trip_date,
          deliveryDate: isDelivered && dDate && !isNaN(dDate.getTime()) ? dDate.toISOString().split('T')[0] : (isDelivered ? 'Delivered' : 'Pending'),
          isDelivered,
          daysCount,
          isOverdue,
          priorityLevel,
          transitDays: isDelivered ? `${daysCount} Day${daysCount === 1 ? '' : 's'}` : `${daysCount} Day${daysCount === 1 ? '' : 's'} Pending`,
          originBranch: t.originBranch?.branch_name || t.origin_city || 'Origin',
          destBranch: t.destBranch?.branch_name || t.destination_city || 'Destination',
          consignorName: t.hiring_party_name || t.customer?.name || 'Direct Hiring Client',
          consigneeName: t.destination_city ? `${t.destination_city} Site / Unloading Point` : 'Site Receiver',
          shipmentStatus: t.status === 'COMPLETED' ? 'DELIVERED' : (t.status === 'RUNNING' ? 'IN_TRANSIT' : t.status),
          podStatus,
          podUrl: t.pod_file_url || null,
          receiverName: t.receiver_name || 'Client Representative',
          hasPhysicalPod: Boolean(t.pod_file_url),
          verifiedAt: null,
          load_type: 'FTL',
          loadType: 'FTL Placement',
          is_placement: true,
          vehicleNumber: t.vehicle?.vehicle_number || null,
        };
      });

      allPlacementMatches = await Trip.findAll({
        where: placementBaseWhere,
        attributes: ['id', 'status', 'trip_date', 'pod_file_url'],
      }).catch(() => []);
    }

    // Global POD & Operational Delivery summary scoped to current branch/dates
    const allMatches = await Consignment.findAll({
      where: baseWhere,
      include: Pod ? [{
        model: Pod,
        as: 'pod',
        attributes: ['id', 'status'],
        required: false,
      }] : [],
      attributes: ['id', 'status', 'booking_date'],
    });

    let totalDelivered = 0;
    let totalPending = 0;
    let pendingOverdueCount = 0; // pending > 7 days!
    let podUploadedCount = 0;
    let podVerifiedCount = 0;
    let podPendingCount = 0;

    allMatches.forEach((c) => {
      const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'].includes(c.status);
      const bDate = new Date(c.booking_date);
      const daysElapsed = Math.floor(Math.max(0, now.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));

      if (isDelivered) {
        totalDelivered++;
      } else {
        totalPending++;
        if (daysElapsed > 7) {
          pendingOverdueCount++;
        }
      }

      const pStatus = c.pod?.status;
      if (pStatus === 'POD_VERIFIED' || pStatus === 'VERIFIED') podVerifiedCount++;
      else if (pStatus === 'POD_UPLOADED' || pStatus === 'UPLOADED' || c.pod?.file_url) podUploadedCount++;
      else if (isDelivered) podPendingCount++;
    });

    allPlacementMatches.forEach((t) => {
      const isDelivered = t.status === 'COMPLETED';
      const bDate = new Date(t.trip_date);
      const daysElapsed = Math.floor(Math.max(0, now.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));

      if (isDelivered) {
        totalDelivered++;
      } else {
        totalPending++;
        if (daysElapsed > 7) {
          pendingOverdueCount++;
        }
      }

      if (t.pod_file_url) podUploadedCount++;
      else if (isDelivered) podPendingCount++;
    });

    const combinedRows = [...enrichedRows, ...placementRows];
    combinedRows.sort((a, b) => {
      const dateA = a.bookingDate || '';
      const dateB = b.bookingDate || '';
      return dateB.localeCompare(dateA);
    });

    const complianceRate = totalDelivered > 0
      ? (((podUploadedCount + podVerifiedCount) / totalDelivered) * 100).toFixed(1)
      : '100.0';

    const totalRecords = count + placementRows.length;
    const summary = {
      totalConsignments: allMatches.length + allPlacementMatches.length,
      totalDelivered,
      totalPending,
      pendingOverdueCount,
      podUploadedCount,
      podVerifiedCount,
      podPendingCount,
      complianceRatePct: parseFloat(complianceRate),
      isFiltered: Boolean((effectiveDelivery && effectiveDelivery !== 'ALL') || search),
      filteredCount: totalRecords,
    };

    return paginatedResponse(
      res,
      'POD compliance report fetched successfully',
      combinedRows,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalRecords,
        pages: Math.ceil(totalRecords / parseInt(limit, 10)) || 1,
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
    const { Consignment, Branch, Payment, BranchCashClosure, Customer, Invoice, InvoiceItem, Trip, Expense, DriverAdvance } = m;
    const { branch_id, date_from, date_to, search, page = 1, limit = 25 } = req.query;

    const whereScope = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);

    // Prefetch all branch names to ensure 100% accurate branch name resolution without incorrect fallbacks
    const allBranches = await Branch.findAll({
      where: { tenant_id: req.tenant.tenantId },
      attributes: ['id', 'branch_name', 'branch_code', 'city'],
    });
    const branchMap = {};
    allBranches.forEach((br) => {
      branchMap[String(br.id)] = br.branch_name || br.branch_code || br.city || 'Branch';
    });

    const deliveredStatuses = ['DELIVERED', 'POD_UPLOADED', 'POD_PENDING', 'COMPLETED', 'POD_VERIFIED'];

    // Query all consignments scoped to the branch (origin or destination)
    const whereBranch = {};
    if (effectiveBranchId) {
      whereBranch[Op.or] = [
        { origin_branch_id: effectiveBranchId },
        { dest_branch_id: effectiveBranchId },
      ];
    }

    const consignments = await Consignment.findAll({
      where: {
        ...whereScope,
        ...whereBranch,
      },
      include: [
        { model: Branch, as: 'originBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'], required: false },
        { model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'], required: false },
        ...(Customer ? [
          { model: Customer, as: 'consignor', attributes: ['id', 'name', 'phone'], required: false },
          { model: Customer, as: 'consignee', attributes: ['id', 'name', 'phone'], required: false },
        ] : []),
      ],
      order: [['booking_date', 'DESC']],
    });

    // Query Trips (including dedicated FTL vehicle placement trips with customer advances and branch expenses)
    let placementTrips = [];
    if (Trip) {
      try {
        const tripWhere = {
          tenant_id: req.tenant.tenantId,
          ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
          ...(effectiveBranchId ? {
            [Op.or]: [
              { origin_branch_id: effectiveBranchId },
              { dest_branch_id: effectiveBranchId },
            ],
          } : {}),
        };
        placementTrips = await Trip.findAll({
          where: tripWhere,
          include: [
            ...(Branch ? [
              { model: Branch, as: 'originBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'], required: false },
              { model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'], required: false },
            ] : []),
            ...(Customer ? [
              { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false },
            ] : []),
            ...(Expense ? [
              { model: Expense, as: 'expenses', attributes: ['id', 'amount', 'payment_method', 'expense_date', 'remarks'], required: false },
            ] : []),
            ...(DriverAdvance ? [
              { model: DriverAdvance, as: 'advances', attributes: ['id', 'amount', 'disbursed_mode', 'disbursed_date', 'remarks'], required: false },
            ] : []),
          ],
          order: [['trip_date', 'DESC'], ['created_at', 'DESC']],
        });
      } catch (trErr) {
        console.warn('Trip query warning in collection report:', trErr.message);
      }
    }

    let totalTripAdvanceCash = 0;
    let totalTripExpensesCash = 0;
    let totalTripNetDrawerCash = 0;
    const tripFinancialMap = {};

    placementTrips.forEach((t) => {
      const advReceived = parseFloat(t.advance_received || 0);
      const contractAmt = parseFloat(t.contract_amount || t.expected_revenue || 0);
      const isPlacement = t.trip_mode === 'DIRECT_VEHICLE_HIRE' || advReceived > 0;

      let driverAdvCash = 0;
      if (t.advances && t.advances.length > 0) {
        driverAdvCash = t.advances
          .filter((a) => !a.disbursed_mode || a.disbursed_mode === 'CASH')
          .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
      } else {
        driverAdvCash = parseFloat(t.driver_advance || 0);
      }

      let otherCashExpenses = 0;
      if (t.expenses && t.expenses.length > 0) {
        otherCashExpenses = t.expenses
          .filter((e) => !e.payment_method || e.payment_method === 'CASH')
          .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      } else {
        otherCashExpenses = Math.max(0, parseFloat(t.total_expenses || 0) - driverAdvCash);
      }

      const totalBranchExpenses = driverAdvCash + otherCashExpenses;
      const netDrawerCash = Math.max(0, advReceived - totalBranchExpenses);

      if (advReceived > 0 || isPlacement) {
        totalTripAdvanceCash += advReceived;
        totalTripExpensesCash += totalBranchExpenses;
        totalTripNetDrawerCash += netDrawerCash;

        tripFinancialMap[t.trip_number] = {
          tripId: t.id,
          tripNumber: t.trip_number,
          contractAmount: contractAmt,
          advanceReceived: advReceived,
          driverAdvanceCash: driverAdvCash,
          otherCashExpenses: otherCashExpenses,
          totalBranchExpenses: totalBranchExpenses,
          netDrawerCash: netDrawerCash,
          payableToMainBank: netDrawerCash,
          originBranchId: t.origin_branch_id,
          originCity: t.origin_city,
          destCity: t.destination_city,
          hiringPartyName: t.hiring_party_name || t.customer?.name || 'Hiring Client',
        };
      }
    });

    // Aggregate into daily collections by Date & Branch
    const grouped = {};

    // Incorporate Trip Advances and Net Cash into Origin Branch Daybook
    placementTrips.forEach((t) => {
      const advReceived = parseFloat(t.advance_received || 0);
      if (advReceived <= 0) return;

      const fInfo = tripFinancialMap[t.trip_number];
      const netDrawerCash = fInfo ? fInfo.netDrawerCash : advReceived;
      const branchExp = fInfo ? fInfo.totalBranchExpenses : 0;

      const tDate = t.trip_date || (t.created_at ? t.created_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const originBrId = t.origin_branch_id;
      if (effectiveBranchId && String(originBrId) !== String(effectiveBranchId)) return;

      const originBrName = (originBrId && branchMap[String(originBrId)]) || t.originBranch?.branch_name || 'Origin Branch';
      const gKey = `${tDate}_${originBrId || originBrName}`;

      if (!grouped[gKey]) {
        grouped[gKey] = {
          date: tDate,
          branchId: originBrId,
          branchName: originBrName,
          paidBookingsCount: 0,
          paidCashAmount: 0,
          bookedPaidCashAmount: 0,
          toPayDeliveriesCount: 0,
          toPayCashAmount: 0,
          pendingToPayAmount: 0,
          tbbCount: 0,
          tbbAmount: 0,
          totalCollected: 0,
          deliveredAmount: 0,
          deliveredPaidAmount: 0,
          deliveredPaidCashAmount: 0,
          deliveredTbbAmount: 0,
          deliveredToPayAmount: 0,
          deliveredToPayCashAmount: 0,
          directBankAmount: 0,
          deliveredDocketsCount: 0,
          clearedAmount: 0,
          pendingAmount: 0,
          tripAdvanceCashAmount: 0,
          tripExpensesCashAmount: 0,
          tripNetDrawerCashAmount: 0,
        };
      }

      grouped[gKey].bookedPaidCashAmount += netDrawerCash;
      grouped[gKey].totalCollected += advReceived;
      grouped[gKey].clearedAmount += advReceived;
      grouped[gKey].tripAdvanceCashAmount = (grouped[gKey].tripAdvanceCashAmount || 0) + advReceived;
      grouped[gKey].tripExpensesCashAmount = (grouped[gKey].tripExpensesCashAmount || 0) + branchExp;
      grouped[gKey].tripNetDrawerCashAmount = (grouped[gKey].tripNetDrawerCashAmount || 0) + netDrawerCash;
    });

    consignments.forEach((c) => {
      const isPaid = c.payment_type === 'PAID';
      const isToPay = c.payment_type === 'TO_PAY';
      const isTbb = ['TBB', 'CREDIT'].includes(c.payment_type);
      const isDelivered = deliveredStatuses.includes(c.status);

      // Attribution logic:
      // - PAID & TBB: Origin booking branch is responsible (booked by this branch)
      // - TO_PAY: Destination delivery branch is responsible (to-pay collected at destination)
      let accountableBranchId = null;
      let effectiveDate = c.booking_date || new Date().toISOString().split('T')[0];

      if (isPaid || isTbb) {
        accountableBranchId = c.origin_branch_id;
        effectiveDate = c.booking_date || new Date().toISOString().split('T')[0];
      } else if (isToPay) {
        accountableBranchId = c.dest_branch_id || c.origin_branch_id;
        effectiveDate = c.booking_date || new Date().toISOString().split('T')[0];
      } else {
        accountableBranchId = c.origin_branch_id || c.dest_branch_id;
      }

      if (!accountableBranchId) {
        return;
      }

      // If scoped to a specific branch (branch login or branch filter),
      // only include dockets where this branch is the accountable branch:
      // 1. PAID dockets booked by this branch
      // 2. TBB dockets booked by this branch
      // 3. TO-PAY dockets delivered by this branch
      if (effectiveBranchId && String(accountableBranchId) !== String(effectiveBranchId)) {
        return;
      }

      const dt = effectiveDate;
      const bId = accountableBranchId;
      const bName = (bId && branchMap[String(bId)]) || c.originBranch?.branch_name || c.destBranch?.branch_name || 'Branch';
      const key = `${dt}_${bId || bName}`;

      if (!grouped[key]) {
        grouped[key] = {
          date: dt,
          branchId: bId,
          branchName: bName,
          paidBookingsCount: 0,
          paidCashAmount: 0,
          bookedPaidCashAmount: 0,
          toPayDeliveriesCount: 0,
          toPayCashAmount: 0,
          pendingToPayAmount: 0,
          tbbCount: 0,
          tbbAmount: 0,
          totalCollected: 0,
          deliveredAmount: 0,
          deliveredPaidAmount: 0,
          deliveredPaidCashAmount: 0,
          deliveredTbbAmount: 0,
          deliveredToPayAmount: 0,
          deliveredToPayCashAmount: 0,
          directBankAmount: 0,
          deliveredDocketsCount: 0,
          clearedAmount: 0,
          pendingAmount: 0,
        };
      }

      const amt = Number(c.total_amount || 0);
      const isDirectBank = Boolean(c.is_direct_bank_settled || ['UPI', 'NEFT', 'RTGS', 'ONLINE_TRANSFER', 'NET_BANKING'].includes(c.payment_method));

      if (isPaid) {
        grouped[key].paidBookingsCount += 1;
        grouped[key].paidCashAmount += amt;
        grouped[key].totalCollected += amt;
        // Physical cash collected at origin booking counter (enters drawer immediately upon booking)
        if (!isDirectBank) {
          grouped[key].bookedPaidCashAmount += amt;
        } else {
          grouped[key].directBankAmount += amt;
        }
        if (isDelivered) {
          grouped[key].deliveredAmount += amt;
          grouped[key].deliveredPaidAmount += amt;
          grouped[key].deliveredPaidCashAmount += (!isDirectBank ? amt : 0);
          grouped[key].deliveredDocketsCount += 1;
        }
        grouped[key].clearedAmount += amt;
      } else if (isToPay) {
        grouped[key].toPayDeliveriesCount += 1;
        grouped[key].toPayCashAmount += amt;
        grouped[key].totalCollected += amt;
        if (isDelivered) {
          grouped[key].deliveredAmount += amt;
          grouped[key].deliveredToPayAmount += amt;
          if (!isDirectBank) {
            grouped[key].deliveredToPayCashAmount += amt;
          } else {
            grouped[key].directBankAmount += amt;
          }
          grouped[key].deliveredDocketsCount += 1;
          grouped[key].clearedAmount += amt;
        } else {
          // Awaiting delivery & collection from consignee at destination
          grouped[key].pendingToPayAmount += amt;
          grouped[key].pendingAmount += amt;
        }
      } else if (isTbb) {
        grouped[key].tbbCount += 1;
        grouped[key].tbbAmount += amt;
        if (isDelivered) {
          grouped[key].deliveredAmount += amt;
          grouped[key].deliveredTbbAmount += amt;
          grouped[key].deliveredDocketsCount += 1;
          grouped[key].clearedAmount += amt;
        } else {
          grouped[key].pendingAmount += amt;
        }
      } else {
        grouped[key].totalCollected += amt;
        if (isDelivered) {
          grouped[key].deliveredAmount += amt;
          grouped[key].deliveredDocketsCount += 1;
        } else {
          grouped[key].pendingAmount += amt;
        }
      }
    });

    // Fetch Branch Remittances/Closures (Bank Deposits)
    const closuresMap = {};
    let depositTransactions = [];
    if (BranchCashClosure) {
      const closures = await BranchCashClosure.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {}),
        },
        include: [
          { model: Branch, as: 'branch', attributes: ['id', 'branch_name', 'branch_code', 'city'], required: false },
        ],
        order: [['closure_date', 'DESC'], ['created_at', 'DESC']],
      });

      // Check for duplicate UTR occurrences across deposit entries
      const utrCountMap = {};
      closures.forEach((c) => {
        if (c.utr_reference_no && c.utr_reference_no !== 'COUNTER_CASH') {
          const key = `${c.utr_reference_no.trim()}_${parseFloat(c.remitted_amount || 0)}`;
          utrCountMap[key] = (utrCountMap[key] || 0) + 1;
        }
      });

      // Helper to match closure to its originating docket
      const findLinkedDocket = (c) => {
        if (c.remarks) {
          const match = c.remarks.match(/(BAL\d+|LR[A-Z0-9_-]+)/i);
          if (match) {
            const docketNo = match[1].toUpperCase();
            const found = consignments.find((cg) =>
              (cg.docket_number && cg.docket_number.toUpperCase() === docketNo) ||
              (cg.lr_number && cg.lr_number.toUpperCase() === docketNo)
            );
            if (found) return found;
          }
        }
        if (c.utr_reference_no && c.utr_reference_no !== 'COUNTER_CASH') {
          const cleanUtr = c.utr_reference_no.trim();
          const found = consignments.find((cg) => cg.payment_ref && cg.payment_ref.trim() === cleanUtr);
          if (found) return found;
        }
        const found = consignments.find((cg) =>
          parseFloat(cg.total_amount || 0) === parseFloat(c.remitted_amount || 0) &&
          (String(cg.dest_branch_id) === String(c.branch_id) || String(cg.origin_branch_id) === String(c.branch_id))
        );
        return found || null;
      };

      let invoiceMapByCgId = {};
      if (InvoiceItem && Invoice) {
        try {
          const invItems = await InvoiceItem.findAll({
            where: { tenant_id: req.tenant.tenantId },
            include: [
              { model: Invoice, as: 'invoice', attributes: ['id', 'invoice_number', 'total_amount', 'status'] },
            ],
          });
          invItems.forEach((it) => {
            if (it.consignment_id && it.invoice) {
              invoiceMapByCgId[String(it.consignment_id)] = it.invoice;
            }
          });
        } catch (invErr) {
          console.warn('InvoiceItem mapping warning:', invErr.message);
        }
      }

      depositTransactions = closures.map((c) => {
        const linkedCg = findLinkedDocket(c);
        const linkedInv = linkedCg ? invoiceMapByCgId[String(linkedCg.id)] : null;
        const utrKey = (c.utr_reference_no && c.utr_reference_no !== 'COUNTER_CASH')
          ? `${c.utr_reference_no.trim()}_${parseFloat(c.remitted_amount || 0)}`
          : null;
        const isDuplicateUtr = Boolean(utrKey && utrCountMap[utrKey] > 1);

        let allMatches = [];
        if (c.remarks) {
          allMatches = [...c.remarks.matchAll(/(BAL\d+|LR[A-Z0-9_-]+)/gi)].map((m) => m[1].toUpperCase());
        }
        // Deduplicate matches
        allMatches = [...new Set(allMatches)];
        const docketNo = linkedCg?.docket_number || linkedCg?.lr_number || (allMatches.length > 0 ? allMatches[0] : null);

        let coveredList = [];
        if (allMatches.length > 0) {
          allMatches.forEach((dNo) => {
            const isTrip = dNo.toUpperCase().startsWith('TRP-');
            const found = consignments.find((cg) =>
              (cg.docket_number && cg.docket_number.toUpperCase() === dNo) ||
              (cg.lr_number && cg.lr_number.toUpperCase() === dNo)
            );
            if (found) {
              coveredList.push({
                id: found.id,
                docketNumber: found.docket_number || found.lr_number,
                paymentType: found.payment_type,
                paymentMethod: found.payment_method,
                totalAmount: parseFloat(found.total_amount || 0),
                originCity: found.origin_city || found.originBranch?.city || '',
                destCity: found.destination_city || found.destBranch?.city || '',
                status: found.status,
                consignorName: typeof found.consignor === 'object' ? found.consignor?.name : (found.consignor_name || 'Shipper'),
                consigneeName: typeof found.consignee === 'object' ? found.consignee?.name : (found.consignee_name || 'Consignee'),
                load_type: isTrip ? 'FTL' : (found.load_type || 'PTL'),
                loadType: isTrip ? 'FTL' : (found.load_type || 'PTL'),
              });
            } else {
              coveredList.push({
                docketNumber: dNo,
                load_type: isTrip ? 'FTL' : 'PTL',
                loadType: isTrip ? 'FTL' : 'PTL',
                totalAmount: parseFloat(c.remitted_amount || 0),
              });
            }
          });
        } else if (linkedCg) {
          coveredList.push({
            id: linkedCg.id,
            docketNumber: linkedCg.docket_number || linkedCg.lr_number,
            paymentType: linkedCg.payment_type,
            paymentMethod: linkedCg.payment_method,
            totalAmount: parseFloat(linkedCg.total_amount || 0),
            originCity: linkedCg.origin_city || linkedCg.originBranch?.city || '',
            destCity: linkedCg.destination_city || linkedCg.destBranch?.city || '',
            status: linkedCg.status,
            consignorName: typeof linkedCg.consignor === 'object' ? linkedCg.consignor?.name : (linkedCg.consignor_name || 'Shipper'),
            consigneeName: typeof linkedCg.consignee === 'object' ? linkedCg.consignee?.name : (linkedCg.consignee_name || 'Consignee'),
            load_type: linkedCg.load_type || 'PTL',
            loadType: linkedCg.load_type || 'PTL',
          });
        }

        return {
          id: c.id,
          date: c.closure_date,
          createdAt: c.created_at,
          branchId: c.branch_id,
          branchName: c.branch?.branch_name || branchMap[String(c.branch_id)] || 'Branch',
          depositMode: c.deposit_mode || 'CASH_DEPOSIT',
          bankName: c.bank_name || 'Company Bank Account',
          bankAccountNo: c.bank_account_no,
          utrNumber: c.utr_reference_no,
          remittedAmount: parseFloat(Number(c.remitted_amount || 0).toFixed(2)),
          receiptSlipUrl: c.receipt_slip_url,
          status: c.status || 'REMITTED',
          remarks: c.remarks,
          isDepositTransaction: true,
          docketNumber: docketNo || (coveredList.length === 1 ? coveredList[0].docketNumber : null),
          invoiceNumber: linkedInv ? linkedInv.invoice_number : null,
          invoiceDate: linkedInv ? linkedInv.invoice_date : null,
          invoiceId: linkedInv ? linkedInv.id : null,
          invoiceTotal: linkedInv ? parseFloat(linkedInv.total_amount || 0) : null,
          coveredDocketsCount: coveredList.length,
          coveredDockets: coveredList,
          linkedDocket: linkedCg ? {
            id: linkedCg.id,
            docketNumber: linkedCg.docket_number || linkedCg.lr_number,
            paymentType: linkedCg.payment_type,
            paymentMethod: linkedCg.payment_method,
            totalAmount: parseFloat(linkedCg.total_amount || 0),
            originCity: linkedCg.origin_city || linkedCg.originBranch?.city || '',
            destCity: linkedCg.destination_city || linkedCg.destBranch?.city || '',
            originBranchName: linkedCg.originBranch?.branch_name || linkedCg.origin_city || '',
            destBranchName: linkedCg.destBranch?.branch_name || linkedCg.destination_city || '',
            status: linkedCg.status,
            bookingDate: linkedCg.booking_date,
            consignorName: typeof linkedCg.consignor === 'object' ? linkedCg.consignor?.name : (linkedCg.consignor_name || 'Shipper'),
            consigneeName: typeof linkedCg.consignee === 'object' ? linkedCg.consignee?.name : (linkedCg.consignee_name || 'Consignee'),
          } : (coveredList.length === 1 ? coveredList[0] : null),
          sourceType: c.remarks && c.remarks.includes('To-Pay Docket')
            ? 'TO_PAY_DELIVERY'
            : c.remarks && c.remarks.includes('Direct')
            ? 'DIRECT_UPI_DELIVERY'
            : 'BRANCH_CASH_DRAWER',
          isDuplicateUtr,
          duplicateCount: utrKey ? (utrCountMap[utrKey] || 1) : 1,
          placementFinancials: (docketNo && tripFinancialMap[docketNo])
            ? tripFinancialMap[docketNo]
            : (coveredList.find(d => d.docketNumber && tripFinancialMap[d.docketNumber])
                ? tripFinancialMap[coveredList.find(d => d.docketNumber && tripFinancialMap[d.docketNumber]).docketNumber]
                : null),
        };
      });

      closures.forEach((c) => {
        const cKey = `${c.closure_date}_${c.branch_id}`;
        if (!closuresMap[cKey]) {
          closuresMap[cKey] = c;
        }
      });
    }

    // Auto-link TBB / Corporate Bank Payments into the Bank Deposits & Remittance Register
    if (Payment) {
      try {
        const bankPayments = await Payment.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
          },
          include: [
            ...(Customer ? [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'gstin'], required: false }] : []),
            ...(Invoice ? [{
              model: Invoice,
              as: 'invoice',
              required: false,
              include: [
                ...(InvoiceItem ? [{
                  model: InvoiceItem,
                  as: 'items',
                  required: false,
                  include: [
                    {
                      model: Consignment,
                      as: 'consignment',
                      required: false,
                      attributes: ['id', 'docket_number', 'lr_number', 'total_amount', 'payment_type', 'payment_method', 'origin_city', 'destination_city', 'status', 'booking_date', 'origin_branch_id', 'dest_branch_id'],
                    },
                  ],
                }] : []),
              ],
            }] : []),
          ],
          order: [['payment_date', 'DESC'], ['created_at', 'DESC']],
        });

        bankPayments.forEach((p) => {
          const inv = p.invoice;
          const cust = p.customer;
          const paymentBranchId = p.branch_id || (inv ? inv.branch_id : null);
          const invItems = inv?.items || [];

          if (effectiveBranchId) {
            // TBB is credit freight billed by the Booking Branch (origin).
            // The delivery branch only delivers goods/POD and has zero TBB collection liability.
            const isBookingBranchMatch =
              String(paymentBranchId) === String(effectiveBranchId) ||
              invItems.some((it) => {
                const cg = it.consignment;
                return cg && String(cg.origin_branch_id) === String(effectiveBranchId);
              });
            if (!isBookingBranchMatch) {
              return;
            }
          }

          const coveredDocketsList = invItems.map((it) => {
            const cg = it.consignment;
            const docNo = it.lr_number || cg?.docket_number || cg?.lr_number || 'N/A';
            const isTrip = docNo.toUpperCase().startsWith('TRP-') || (cg && cg.load_type === 'FTL');
            return {
              docketNumber: docNo,
              originCity: it.origin_city || cg?.origin_city || '',
              destCity: it.destination_city || cg?.destination_city || '',
              totalAmount: parseFloat(it.total_amount || cg?.total_amount || 0),
              chargedWeight: parseFloat(it.charged_weight || 0),
              packagesCount: it.packages_count || 1,
              consignorName: cg?.consignor_name || 'Shipper',
              consigneeName: cg?.consignee_name || cust?.name || 'Customer',
              status: cg?.status || 'DELIVERED',
              load_type: isTrip ? 'FTL' : (cg?.load_type || 'PTL'),
              loadType: isTrip ? 'FTL' : (cg?.load_type || 'PTL'),
            };
          });

          const invoiceTotal = parseFloat(inv?.total_amount || 0);
          const invoicePaid = parseFloat(inv?.paid_amount || 0);
          const invoiceBal = parseFloat(inv?.balance_amount || 0);
          const paymentAmt = parseFloat(p.amount || 0);

          depositTransactions.push({
            id: p.id,
            date: p.payment_date,
            createdAt: p.created_at,
            branchId: p.branch_id || (inv ? inv.branch_id : null),
            branchName: p.branch_id ? (branchMap[String(p.branch_id)] || 'Head Office') : (inv?.branch_id ? (branchMap[String(inv.branch_id)] || 'Head Office') : 'Head Office'),
            depositMode: p.payment_method || 'NEFT',
            bankName: p.bank_name || 'Main Corporate Bank A/C',
            bankAccountNo: 'Main Account',
            utrNumber: p.reference_number || p.payment_number,
            remittedAmount: paymentAmt,
            receiptSlipUrl: null,
            status: 'VERIFIED',
            remarks: p.remarks || `Billed TBB Payment received for Invoice ${inv?.invoice_number || 'Direct Payment'}`,
            isDepositTransaction: true,
            docketNumber: coveredDocketsList.length === 1 ? coveredDocketsList[0].docketNumber : null,
            invoiceNumber: inv?.invoice_number || null,
            invoiceDate: inv?.invoice_date || null,
            invoiceTotal,
            invoicePaid,
            invoiceBalance: invoiceBal,
            isPartialPayment: invoiceBal > 0,
            customerName: cust?.name || 'Credit Client',
            sourceType: 'TBB_INVOICE_PAYMENT',
            coveredDocketsCount: coveredDocketsList.length,
            coveredDockets: coveredDocketsList,
            linkedDocket: coveredDocketsList.length === 1 ? {
              docketNumber: coveredDocketsList[0].docketNumber,
              originCity: coveredDocketsList[0].originCity,
              destCity: coveredDocketsList[0].destCity,
              totalAmount: coveredDocketsList[0].totalAmount,
              consignorName: coveredDocketsList[0].consignorName,
              consigneeName: coveredDocketsList[0].consigneeName,
              paymentType: 'TBB',
              paymentMethod: p.payment_method || 'NEFT',
              status: coveredDocketsList[0].status,
            } : null,
            isDuplicateUtr: false,
            duplicateCount: 1,
            placementFinancials: (() => {
              const matchedTrip = coveredDocketsList.find(d => d.docketNumber && tripFinancialMap[d.docketNumber])?.docketNumber
                || (coveredDocketsList.length === 1 && tripFinancialMap[coveredDocketsList[0].docketNumber] ? coveredDocketsList[0].docketNumber : null);
              const pFin = matchedTrip ? tripFinancialMap[matchedTrip] : null;
              return pFin ? {
                ...pFin,
                bankDepositedAmount: paymentAmt,
              } : null;
            })(),
          });
        });
      } catch (payQueryErr) {
        console.warn('Bank payments query warning:', payQueryErr.message);
      }
    }

    // Filter collection rows to days with actual cash inflow, TBB revenue, or remittances
    const collectionRows = Object.values(grouped)
      .filter((r) => (r.paidCashAmount + r.toPayCashAmount + r.tbbAmount) > 0 || closuresMap[`${r.date}_${r.branchId}`])
      .sort((a, b) => b.date.localeCompare(a.date));

    let gPaidAmount = 0;
    let gToPayAmount = 0;
    let gTbbAmount = 0;
    let gTotalRevenue = 0;
    let gDeliveredAmount = 0;
    let gDeliveredPaidAmount = 0;
    let gDeliveredPaidCashAmount = 0;
    let gBookedPaidCashAmount = 0;
    let gDeliveredTbbAmount = 0;
    let gDeliveredToPayAmount = 0;
    let gDeliveredToPayCashAmount = 0;
    let gPendingToPayAmount = 0;
    let gDirectBankAmount = 0;
    let gDeliveredDocketsCount = 0;
    let gClearedRevenue = 0;
    let gPendingRevenue = 0;

    // Distinguish between physical cash remitted from drawer vs direct bank receipts (NEFT / Doorstep UPI)
    const isDrawerCashDeposit = (d) => {
      if (!d) return false;
      const mode = String(d.depositMode || d.deposit_mode || '').toUpperCase();
      const src = String(d.sourceType || '').toUpperCase();
      const rem = String(d.remarks || '').toUpperCase();
      // TBB corporate payments are direct bank transfers (NEFT/RTGS) - never in branch cash drawer
      if (src === 'TBB_INVOICE_PAYMENT') return false;
      // Direct UPI at delivery bypasses branch cash drawer
      if (src === 'DIRECT_UPI_DELIVERY' || mode === 'DIRECT_UPI' || (mode === 'UPI' && rem.includes('BYPASSES BRANCH CASH DRAWER'))) return false;
      return mode === 'CASH_DEPOSIT' || mode === 'COUNTER_CASH' || mode === 'CASH' || mode === 'BANK_DEPOSIT' || mode === 'CDM';
    };

    let gRemittedTotalBank = depositTransactions.reduce((acc, d) => acc + (d.remittedAmount || 0), 0);
    let gRemittedCashFromDrawer = depositTransactions
      .filter((d) => isDrawerCashDeposit(d))
      .reduce((acc, d) => acc + (d.remittedAmount || 0), 0);

    collectionRows.forEach((r) => {
      gPaidAmount += r.paidCashAmount;
      gToPayAmount += r.toPayCashAmount;
      gTbbAmount += r.tbbAmount;
      gTotalRevenue += (r.paidCashAmount + r.tbbAmount + r.toPayCashAmount);
      gDeliveredAmount += (r.deliveredAmount || 0);
      gDeliveredPaidAmount += (r.deliveredPaidAmount || 0);
      gDeliveredPaidCashAmount += (r.deliveredPaidCashAmount || 0);
      gBookedPaidCashAmount += (r.bookedPaidCashAmount || 0);
      gDeliveredTbbAmount += (r.deliveredTbbAmount || 0);
      gDeliveredToPayAmount += (r.deliveredToPayAmount || 0);
      gDeliveredToPayCashAmount += (r.deliveredToPayCashAmount || 0);
      gPendingToPayAmount += (r.pendingToPayAmount || 0);
      gDirectBankAmount += (r.directBankAmount || 0);
      gDeliveredDocketsCount += (r.deliveredDocketsCount || 0);
      gClearedRevenue += r.clearedAmount;
      gPendingRevenue += r.pendingAmount;

      r.paidCashAmount = parseFloat(r.paidCashAmount.toFixed(2));
      r.toPayCashAmount = parseFloat(r.toPayCashAmount.toFixed(2));
      r.tbbAmount = parseFloat(r.tbbAmount.toFixed(2));
      r.totalBranchRevenue = parseFloat(((r.deliveredPaidAmount || 0) + (r.deliveredTbbAmount || 0) + (r.deliveredToPayAmount || 0)).toFixed(2));
      r.totalBookedRevenue = parseFloat((r.paidCashAmount + r.tbbAmount + r.toPayCashAmount).toFixed(2));
      r.totalCollected = parseFloat((r.paidCashAmount + r.toPayCashAmount).toFixed(2));
      r.deliveredAmount = parseFloat((r.deliveredAmount || 0).toFixed(2));
      r.clearedAmount = parseFloat(r.clearedAmount.toFixed(2));
      r.pendingAmount = parseFloat(r.pendingAmount.toFixed(2));

      // Match closure
      const matchClosure = closuresMap[`${r.date}_${r.branchId}`];
      if (matchClosure) {
        r.isClosed = true;
        r.closureStatus = matchClosure.status;
        r.bankName = matchClosure.bank_name;
        r.depositMode = matchClosure.deposit_mode || 'CASH_DEPOSIT';
        r.utrNumber = matchClosure.utr_reference_no;
        r.receiptSlipUrl = matchClosure.receipt_slip_url;
        r.remittedAmount = parseFloat(Number(matchClosure.remitted_amount || 0).toFixed(2));
      } else {
        r.isClosed = false;
        r.closureStatus = 'OPEN';
        r.bankName = null;
        r.depositMode = null;
        r.utrNumber = null;
        r.receiptSlipUrl = null;
        r.remittedAmount = 0;
      }

      // Physical cash remitted from drawer
      const cashRemittedFromDrawer = (matchClosure && isDrawerCashDeposit(matchClosure))
        ? parseFloat(Number(matchClosure.remitted_amount || 0).toFixed(2))
        : 0;
      r.cashRemittedFromDrawer = cashRemittedFromDrawer;

      // Pending in branch drawer awaiting deposit: Physical booked cash + delivered to-pay cash minus physical cash remitted
      const physicalCashInDrawer = ((r.bookedPaidCashAmount || 0) + (r.deliveredToPayCashAmount || 0)) - cashRemittedFromDrawer;
      r.pendingCash = parseFloat(Math.max(0, physicalCashInDrawer).toFixed(2));
      r.branchDrawerCash = r.pendingCash;
    });

    // View Mode: 'DEPOSITS' (Bank Deposit Transactions list) vs 'DAILY_COLLECTIONS'
    const viewMode = req.query.view_mode || 'DEPOSITS';
    let baseRows = viewMode === 'DAILY_COLLECTIONS' ? collectionRows : depositTransactions;

    let displayedRows = baseRows;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      displayedRows = baseRows.filter((r) => {
        const dateStr = (r.date || '').toLowerCase();
        const branchStr = (typeof r.branchName === 'object' ? r.branchName?.name || r.branchName?.branch_name : r.branchName || '').toLowerCase();
        const bankStr = (r.bankName || '').toLowerCase();
        const utrStr = (r.utrNumber || '').toLowerCase();
        const modeStr = (r.depositMode || '').toLowerCase();
        return dateStr.includes(q) || branchStr.includes(q) || bankStr.includes(q) || utrStr.includes(q) || modeStr.includes(q);
      });
    }

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    const paginatedRows = displayedRows.slice(offset, offset + limitInt);

    // Compute Branch-wise aggregation for Admin visibility
    const branchBreakdownMap = {};
    collectionRows.forEach((r) => {
      const bKey = String(r.branchId || r.branchName || 'HUB');
      const bName = typeof r.branchName === 'object' ? r.branchName?.name || r.branchName?.branch_name : r.branchName || 'Branch';
      if (!branchBreakdownMap[bKey]) {
        branchBreakdownMap[bKey] = {
          branchId: r.branchId,
          branchName: bName,
          paidCashAmount: 0,
          bookedPaidCashAmount: 0,
          toPayCashAmount: 0,
          pendingToPayAmount: 0,
          tbbAmount: 0,
          deliveredAmount: 0,
          deliveredPaidAmount: 0,
          deliveredPaidCashAmount: 0,
          deliveredToPayAmount: 0,
          deliveredToPayCashAmount: 0,
          directBankAmount: 0,
          totalCollected: 0,
          clearedAmount: 0,
          pendingAmount: 0,
          remittedAmount: 0,
          remittedDrawerCash: 0,
          pendingCash: 0,
          paidBookingsCount: 0,
          toPayDeliveriesCount: 0,
          lastBankName: null,
          lastUtrNumber: null,
          lastDepositMode: null,
        };
      }
      branchBreakdownMap[bKey].paidCashAmount += r.paidCashAmount;
      branchBreakdownMap[bKey].bookedPaidCashAmount += (r.bookedPaidCashAmount || 0);
      branchBreakdownMap[bKey].toPayCashAmount += r.toPayCashAmount;
      branchBreakdownMap[bKey].pendingToPayAmount += (r.pendingToPayAmount || 0);
      branchBreakdownMap[bKey].tbbAmount += r.tbbAmount;
      branchBreakdownMap[bKey].deliveredAmount += (r.deliveredAmount || 0);
      branchBreakdownMap[bKey].deliveredPaidAmount += (r.deliveredPaidAmount || 0);
      branchBreakdownMap[bKey].deliveredPaidCashAmount = (branchBreakdownMap[bKey].deliveredPaidCashAmount || 0) + (r.deliveredPaidCashAmount || 0);
      branchBreakdownMap[bKey].deliveredToPayAmount += (r.deliveredToPayAmount || 0);
      branchBreakdownMap[bKey].deliveredToPayCashAmount = (branchBreakdownMap[bKey].deliveredToPayCashAmount || 0) + (r.deliveredToPayCashAmount || 0);
      branchBreakdownMap[bKey].directBankAmount = (branchBreakdownMap[bKey].directBankAmount || 0) + (r.directBankAmount || 0);
      branchBreakdownMap[bKey].totalCollected += (r.paidCashAmount + r.toPayCashAmount);
      branchBreakdownMap[bKey].clearedAmount += r.clearedAmount;
      branchBreakdownMap[bKey].pendingAmount += r.pendingAmount;
      branchBreakdownMap[bKey].remittedAmount += r.remittedAmount;
      branchBreakdownMap[bKey].remittedDrawerCash += (r.cashRemittedFromDrawer || 0);
      branchBreakdownMap[bKey].paidBookingsCount += r.paidBookingsCount;
      branchBreakdownMap[bKey].toPayDeliveriesCount += r.toPayDeliveriesCount;
      if (r.utrNumber) {
        branchBreakdownMap[bKey].lastUtrNumber = r.utrNumber;
        branchBreakdownMap[bKey].lastBankName = r.bankName;
        branchBreakdownMap[bKey].lastDepositMode = r.depositMode;
      }
    });

    const branchBreakdown = Object.values(branchBreakdownMap).map((b) => ({
      ...b,
      paidCashAmount: parseFloat(b.paidCashAmount.toFixed(2)),
      toPayCashAmount: parseFloat(b.toPayCashAmount.toFixed(2)),
      tbbAmount: parseFloat(b.tbbAmount.toFixed(2)),
      deliveredAmount: parseFloat(b.deliveredAmount.toFixed(2)),
      totalBranchRevenue: parseFloat((b.paidCashAmount + b.tbbAmount + b.toPayCashAmount).toFixed(2)),
      totalRevenue: parseFloat((b.paidCashAmount + b.tbbAmount + b.toPayCashAmount).toFixed(2)),
      totalBookedRevenue: parseFloat((b.paidCashAmount + b.tbbAmount + b.toPayCashAmount).toFixed(2)),
      totalCollected: parseFloat((b.paidCashAmount + b.toPayCashAmount).toFixed(2)),
      clearedAmount: parseFloat(b.clearedAmount.toFixed(2)),
      pendingAmount: parseFloat(b.pendingAmount.toFixed(2)),
      remittedAmount: parseFloat(b.remittedAmount.toFixed(2)),
      pendingCash: parseFloat(Math.max(0, ((b.bookedPaidCashAmount || 0) + (b.deliveredToPayCashAmount || 0)) - (b.remittedDrawerCash || 0)).toFixed(2)),
      drawerCash: parseFloat(Math.max(0, ((b.bookedPaidCashAmount || 0) + (b.deliveredToPayCashAmount || 0)) - (b.remittedDrawerCash || 0)).toFixed(2)),
      pendingToPayAmount: parseFloat((b.pendingToPayAmount || 0).toFixed(2)),
    }));

    // Incorporate FTL / Direct Invoices that are remitted or billed at the branch
    let extraInvoiceRevenue = 0;
    const uniqueInvoices = {};
    depositTransactions.forEach((d) => {
      const invNo = d.invoiceNumber || (d.docketNumber && d.docketNumber.startsWith('TRP-') ? d.docketNumber : null);
      const invAmt = parseFloat(d.invoiceTotal || (d.linkedDocket?.totalAmount) || d.remittedAmount || 0);
      if (invNo && invAmt > 0 && !uniqueInvoices[invNo]) {
        uniqueInvoices[invNo] = invAmt;
      }
    });
    const totalUniqueInvoiceAmount = Object.values(uniqueInvoices).reduce((acc, val) => acc + val, 0);
    const consignmentRev = gPaidAmount + gTbbAmount + gToPayAmount;
    if (totalUniqueInvoiceAmount > consignmentRev) {
      extraInvoiceRevenue = totalUniqueInvoiceAmount - consignmentRev;
    }

    const totalBranchRev = consignmentRev + extraInvoiceRevenue;
    const totalDelivRev = gDeliveredAmount + extraInvoiceRevenue;
    const totalUndelivRev = Math.max(0, totalBranchRev - totalDelivRev);
    const totalDelivTbb = gDeliveredTbbAmount;
    // Branch Drawer Cash includes Booked PAID cash + Delivered TO-PAY cash + Delivered TBB of booking branch + Net Trip Advances (Advance minus Trip Expenses) minus cash remitted
    const totalBranchDrawerCash = Math.max(0, (gBookedPaidCashAmount + gDeliveredToPayCashAmount + totalDelivTbb) - gRemittedCashFromDrawer);
    const totalPhysicalCashInDrawer = Math.max(0, (gBookedPaidCashAmount + gDeliveredToPayCashAmount) - gRemittedCashFromDrawer);
    const totalDrawerMinusDep = Math.max(0, totalBranchDrawerCash - gRemittedTotalBank);

    // Total pending revenue awaiting remittance:
    // When customer has cleared payment via direct Bank payment + Branch cash advance,
    // the unremitted amount is purely the physical cash in the branch drawer awaiting remittance to the main transporter bank.
    const totalDueOutsideDrawer = Math.max(0, totalBranchRev - gRemittedTotalBank - totalTripAdvanceCash);
    const totalPendingRev = totalDueOutsideDrawer + totalPhysicalCashInDrawer;

    const summary = {
      totalRecords: displayedRows.length,
      totalBranchRevenue: parseFloat(totalBranchRev.toFixed(2)),
      totalRevenue: parseFloat(totalBranchRev.toFixed(2)),
      totalBookedRevenue: parseFloat(totalBranchRev.toFixed(2)),
      totalDeliveredRevenue: parseFloat(totalDelivRev.toFixed(2)),
      totalUndeliveredRevenue: parseFloat(totalUndelivRev.toFixed(2)),
      totalDeliveredPaid: parseFloat(gDeliveredPaidAmount.toFixed(2)),
      totalDeliveredTbb: parseFloat(gDeliveredTbbAmount.toFixed(2)),
      totalDeliveredToPay: parseFloat(gDeliveredToPayAmount.toFixed(2)),
      totalDeliveredDocketsCount: gDeliveredDocketsCount,
      totalClearedRevenue: parseFloat(gClearedRevenue.toFixed(2)),
      totalPendingRevenue: parseFloat(totalPendingRev.toFixed(2)),
      totalPendingBranchRevenue: parseFloat(totalBranchDrawerCash.toFixed(2)),
      totalPaidCollected: parseFloat(gPaidAmount.toFixed(2)),
      totalToPayCollected: parseFloat(gToPayAmount.toFixed(2)),
      totalTbbAmount: parseFloat(gTbbAmount.toFixed(2)),
      totalCashCollected: parseFloat((gPaidAmount + gToPayAmount).toFixed(2)),
      totalBookedPaidCash: parseFloat(gBookedPaidCashAmount.toFixed(2)),
      totalDeliveredToPayCash: parseFloat(gDeliveredToPayCashAmount.toFixed(2)),
      totalPhysicalCash: parseFloat(totalPhysicalCashInDrawer.toFixed(2)),
      totalPendingToPay: parseFloat(gPendingToPayAmount.toFixed(2)),
      totalRemittedToBank: parseFloat(gRemittedTotalBank.toFixed(2)),
      totalRemittedDrawerCash: parseFloat(gRemittedCashFromDrawer.toFixed(2)),
      totalUnclosedCash: parseFloat(totalBranchDrawerCash.toFixed(2)),
      totalPendingInBranch: parseFloat(totalBranchDrawerCash.toFixed(2)),
      totalBranchDrawerCash: parseFloat(totalBranchDrawerCash.toFixed(2)),
      totalDrawerMinusDeposits: parseFloat(totalDrawerMinusDep.toFixed(2)),
      totalDueOutsideDrawer: parseFloat(totalDueOutsideDrawer.toFixed(2)),
      totalTripAdvanceCash: parseFloat(totalTripAdvanceCash.toFixed(2)),
      totalTripExpensesCash: parseFloat(totalTripExpensesCash.toFixed(2)),
      totalTripNetDrawerCash: parseFloat(totalTripNetDrawerCash.toFixed(2)),
      totalPayableToMainBank: parseFloat(totalTripNetDrawerCash.toFixed(2)),
      totalDepositsCount: depositTransactions.length,
      viewMode,
      depositTransactions,
      dailyCollections: collectionRows,
      branchBreakdown,
    };

    return paginatedResponse(
      res,
      'Daily branch collection report fetched successfully',
      paginatedRows,
      {
        page: pageInt,
        limit: limitInt,
        total: displayedRows.length,
        pages: Math.ceil(displayedRows.length / limitInt) || 1,
        summary,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * 6. GST Sales & Tax Liability Register (SAC 9965)
 * Indian GTA (Goods Transport Agency) Compliance:
 * - SAC Code 9965 / 996511 (Transport of goods by road)
 * - RCM (Reverse Charge): Recipient pays 5% GST directly if recipient/consignor is registered taxpayer.
 * - Forward Charge: Transporter pays GST when recipient is unregistered retail consumer (B2C) or opted for 12% ITC.
 * - Place of Supply (POS): Location of registered recipient or destination state under Sec 12(8) IGST Act.
 */
const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

const STATE_NAME_TO_CODE = {
  'jammu and kashmir': '01',
  'jammu & kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'up': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'wb': '19',
  'jharkhand': '20',
  'odisha': '21',
  'orissa': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'mp': '23',
  'gujarat': '24',
  'maharashtra': '27',
  'mh': '27',
  'karnataka': '29',
  'ka': '29',
  'goa': '30',
  'kerala': '32',
  'kl': '32',
  'tamil nadu': '33',
  'tn': '33',
  'puducherry': '34',
  'telangana': '36',
  'ts': '36',
  'andhra pradesh': '37',
  'ap': '37',
  'ladakh': '38',
};

const getGstTaxReport = async (req, res) => {
  try {
    if (!canAccessFinancialAudit(req)) {
      return errorResponse(res, 'Access denied. GST Tax Register is restricted to Audit & Accounting roles.', null, 403);
    }

    const m = req.tenantDb || defaultModels;
    const { Consignment, Customer, Branch, Organization } = m;
    const { branch_id, date_from, date_to, page = 1, limit = 25, search, tax_type = 'ALL' } = req.query;

    // 1. Fetch Transporter's Organization Details for GSTIN & Supplier State
    let orgGstin = '27AABCT9845P1Z2';
    let orgLegalName = 'TransHub Logistics Ltd';
    let orgState = 'Maharashtra';
    let orgStateCode = '27';

    if (Organization && req.tenant?.organizationId) {
      const org = await Organization.findByPk(req.tenant.organizationId, {
        attributes: ['id', 'business_name', 'legal_name', 'gstin', 'state', 'city'],
      });
      if (org) {
        if (org.gstin && org.gstin.trim()) {
          orgGstin = org.gstin.trim().toUpperCase();
          if (orgGstin.length >= 2 && !isNaN(orgGstin.substring(0, 2))) {
            orgStateCode = orgGstin.substring(0, 2);
          }
        }
        if (org.legal_name || org.business_name) {
          orgLegalName = org.legal_name || org.business_name;
        }
        if (org.state) {
          orgState = org.state;
          const matchedCode = STATE_NAME_TO_CODE[org.state.toLowerCase().trim()];
          if (matchedCode && (!org.gstin || org.gstin.length < 2)) {
            orgStateCode = matchedCode;
          }
        }
      }
    }

    // Helper: Determine Place of Supply State Code & Name
    const resolvePlaceOfSupply = (recipientGst, recipientState, destBranchState, destCity) => {
      let code = orgStateCode;
      let name = orgState;

      if (recipientGst && recipientGst.length >= 2 && !isNaN(recipientGst.substring(0, 2))) {
        code = recipientGst.substring(0, 2);
        name = GST_STATE_CODES[code] || recipientState || orgState;
      } else if (recipientState && recipientState.trim()) {
        const norm = recipientState.toLowerCase().trim();
        if (STATE_NAME_TO_CODE[norm]) {
          code = STATE_NAME_TO_CODE[norm];
          name = GST_STATE_CODES[code] || recipientState;
        } else {
          name = recipientState;
        }
      } else if (destBranchState && destBranchState.trim()) {
        const norm = destBranchState.toLowerCase().trim();
        if (STATE_NAME_TO_CODE[norm]) {
          code = STATE_NAME_TO_CODE[norm];
          name = GST_STATE_CODES[code] || destBranchState;
        } else {
          name = destBranchState;
        }
      } else if (destCity && destCity.trim()) {
        const norm = destCity.toLowerCase().trim();
        if (STATE_NAME_TO_CODE[norm]) {
          code = STATE_NAME_TO_CODE[norm];
          name = GST_STATE_CODES[code] || destCity;
        }
      }

      return {
        posCode: code,
        posStateName: name,
        placeOfSupply: `${code}-${name}`,
        isInterState: code !== orgStateCode,
      };
    };

    // 2. Fetch list of customers with valid GSTINs for B2B vs B2C classification
    const registeredCustomers = await Customer.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        [Op.and]: [
          { gstin: { [Op.ne]: null } },
          { gstin: { [Op.ne]: '' } },
        ],
      },
      attributes: ['id', 'gstin'],
    });
    const regCustomerIds = registeredCustomers.map((c) => c.id);

    // 3. Base Query Filter
    const where = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };

    const effectiveBranchId = getEffectiveBranch(req, branch_id);
    if (effectiveBranchId) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { origin_branch_id: effectiveBranchId },
          { dest_branch_id: effectiveBranchId },
        ],
      });
    }

    // 4. Search Filter
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const matchedCustomers = await Customer.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          [Op.or]: [
            { name: { [Op.like]: q } },
            { gstin: { [Op.like]: q } },
          ],
        },
        attributes: ['id'],
      });
      const customerIds = matchedCustomers.map((c) => c.id);

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { lr_number: { [Op.like]: q } },
          { docket_number: { [Op.like]: q } },
          ...(customerIds.length > 0
            ? [{ consignor_id: { [Op.in]: customerIds } }, { consignee_id: { [Op.in]: customerIds } }]
            : []),
        ],
      });
    }

    // 5. Tax Type Segment Filter (ALL | RCM | FORWARD | B2B | B2C)
    const upperTaxType = (tax_type || 'ALL').toUpperCase();
    if (upperTaxType === 'B2B') {
      if (regCustomerIds.length > 0) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            { consignor_id: { [Op.in]: regCustomerIds } },
            { consignee_id: { [Op.in]: regCustomerIds } },
          ],
        });
      } else {
        where.id = '00000000-0000-0000-0000-000000000000';
      }
    } else if (upperTaxType === 'B2C') {
      where[Op.and] = where[Op.and] || [];
      if (regCustomerIds.length > 0) {
        where[Op.and].push({
          [Op.and]: [
            { consignor_id: { [Op.notIn]: regCustomerIds } },
            { consignee_id: { [Op.notIn]: regCustomerIds } },
          ],
        });
      }
    } else if (upperTaxType === 'RCM') {
      // In GTA SAC 9965, RCM applies if party is registered AND tax rate is <= 5%
      if (regCustomerIds.length > 0) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            { consignor_id: { [Op.in]: regCustomerIds } },
            { consignee_id: { [Op.in]: regCustomerIds } },
          ],
          [Op.or]: [
            { tax_percent: { [Op.eq]: null } },
            { tax_percent: { [Op.lte]: 5 } },
          ],
        });
      } else {
        where.id = '00000000-0000-0000-0000-000000000000';
      }
    } else if (upperTaxType === 'FORWARD') {
      // Forward Charge: Unregistered parties OR tax_percent > 5 (e.g. 12% Forward Charge)
      where[Op.and] = where[Op.and] || [];
      if (regCustomerIds.length > 0) {
        where[Op.and].push({
          [Op.or]: [
            {
              [Op.and]: [
                { consignor_id: { [Op.notIn]: regCustomerIds } },
                { consignee_id: { [Op.notIn]: regCustomerIds } },
              ],
            },
            { tax_percent: { [Op.gt]: 5 } },
          ],
        });
      }
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Consignment.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'consignor', attributes: ['id', 'name', 'gstin', 'city', 'state'], required: false },
        { model: Customer, as: 'consignee', attributes: ['id', 'name', 'gstin', 'city', 'state'], required: false },
        {
          model: Branch,
          as: 'originBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city', 'state'],
          required: false,
        },
        {
          model: Branch,
          as: 'destBranch',
          attributes: ['id', 'branch_name', 'branch_code', ['branch_name', 'name'], ['branch_code', 'code'], 'city', 'state'],
          required: false,
        },
      ],
      order: [['booking_date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const enrichedRows = rows.map((c) => {
      const taxableValue = Number(c.freight_amount || 0);
      const taxAmount = Number(c.tax_amount || 0);
      const taxRate = Number(c.tax_percent !== null && c.tax_percent !== undefined ? c.tax_percent : 5);

      const consignorGst = (c.consignor?.gstin || '').trim().toUpperCase();
      const consigneeGst = (c.consignee?.gstin || '').trim().toUpperCase();
      const isConsignorReg = consignorGst.length >= 15;
      const isConsigneeReg = consigneeGst.length >= 15;
      const isB2B = isConsignorReg || isConsigneeReg;

      // Primary Recipient for GSTR-1 Table 4 (B2B) or Table 7 (B2C)
      let recipientName = c.consignee?.name || 'Cash Consignee';
      let recipientGst = consigneeGst || 'URP';
      let recipientState = c.consignee?.state || c.destBranch?.state || c.destination_city || '';

      if (c.payment_type === 'PAID' && isConsignorReg) {
        recipientName = c.consignor?.name || 'Cash Consignor';
        recipientGst = consignorGst;
        recipientState = c.consignor?.state || c.originBranch?.state || c.origin_city || '';
      } else if (!isConsigneeReg && isConsignorReg) {
        recipientName = c.consignor?.name || 'Cash Consignor';
        recipientGst = consignorGst;
        recipientState = c.consignor?.state || c.originBranch?.state || c.origin_city || '';
      }

      // Reverse Charge Logic (GTA SAC 9965):
      // If supply is to a registered person (B2B) and tax rate is 5%, Recipient pays under RCM.
      // If supply is to unregistered person (B2C) or taxRate === 12%, Forward Charge applies.
      const isRcm = isB2B && taxRate <= 5;
      const taxType = isRcm ? 'RCM (Reverse Charge)' : 'Forward Charge';
      const reverseChargeFlag = isRcm ? 'Y' : 'N';

      // Place of Supply Resolution
      const { posCode, posStateName, placeOfSupply, isInterState } = resolvePlaceOfSupply(
        recipientGst !== 'URP' ? recipientGst : (isConsignorReg ? consignorGst : ''),
        recipientState,
        c.destBranch?.state,
        c.destination_city
      );

      // Tax breakdown: Intra-state (CGST + SGST) vs Inter-state (IGST)
      const cgst = isInterState ? 0 : parseFloat((taxAmount / 2).toFixed(2));
      const sgst = isInterState ? 0 : parseFloat((taxAmount / 2).toFixed(2));
      const igst = isInterState ? parseFloat(taxAmount.toFixed(2)) : 0;

      return {
        id: c.id,
        lrNumber: c.lr_number,
        docketNumber: c.docket_number || c.lr_number,
        bookingDate: c.booking_date,
        branch: c.originBranch?.branch_name || c.originBranch?.name || c.origin_city || 'Head Office',
        destBranch: c.destBranch?.branch_name || c.destBranch?.name || c.destination_city || 'Destination Hub',
        originCity: c.origin_city,
        destCity: c.destination_city,
        sacCode: '9965', // GTA SAC Code
        sacDescription: 'Road freight transportation services',
        // Consignor & Consignee details
        consignorName: c.consignor?.name || 'Cash Party',
        consignorGst: consignorGst || 'URP',
        consignorState: c.consignor?.state || c.originBranch?.state || c.origin_city || '',
        consigneeName: c.consignee?.name || 'Cash Party',
        consigneeGst: consigneeGst || 'URP',
        consigneeState: c.consignee?.state || c.destBranch?.state || c.destination_city || '',
        // Primary Recipient & Classification
        recipientName,
        recipientGst,
        isB2B,
        supplyCategory: isB2B ? 'B2B (Registered)' : 'B2C (Unregistered)',
        posCode,
        posStateName,
        placeOfSupply,
        isInterState,
        // Consignment Cargo Details
        load_type: c.load_type || 'PTL',
        loadType: c.load_type || 'PTL',
        paymentType: c.payment_type || 'TO_PAY',
        chargedWeight: Number(c.charged_weight || c.actual_weight || 0),
        packagesCount: Number(c.packages_count || 1),
        materialDescription: c.material_description || 'General Goods',
        ewayBillNo: c.eway_bill_no || null,
        invoiceNo: c.invoice_no || null,
        invoiceDate: c.invoice_date || null,
        // Tax values
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        taxRatePct: taxRate,
        isRcm,
        taxType,
        reverseChargeFlag,
        cgst,
        sgst,
        igst,
        cess: 0,
        totalGst: parseFloat(taxAmount.toFixed(2)),
        totalInvoiceValue: parseFloat((taxableValue + taxAmount).toFixed(2)),
      };
    });

    // 6. Comprehensive Global GST Summary across entire filtered date range
    // (Build base query without pagination to compute statutory Table 4, 7, 12, 13 metrics)
    const baseSummaryWhere = {
      tenant_id: req.tenant.tenantId,
      ...(req.tenant.organizationId ? { organization_id: req.tenant.organizationId } : {}),
      ...buildDateRange(date_from, date_to, 'booking_date'),
    };
    if (effectiveBranchId) {
      baseSummaryWhere[Op.and] = baseSummaryWhere[Op.and] || [];
      baseSummaryWhere[Op.and].push({
        [Op.or]: [
          { origin_branch_id: effectiveBranchId },
          { dest_branch_id: effectiveBranchId },
        ],
      });
    }

    const allMatches = await Consignment.findAll({
      where: baseSummaryWhere,
      include: [
        { model: Customer, as: 'consignor', attributes: ['id', 'gstin', 'state'] },
        { model: Customer, as: 'consignee', attributes: ['id', 'gstin', 'state'] },
      ],
      attributes: [
        'id',
        'lr_number',
        'booking_date',
        'freight_amount',
        'tax_amount',
        'tax_percent',
        'payment_type',
        'charged_weight',
        'actual_weight',
        'origin_city',
        'destination_city',
      ],
      order: [['lr_number', 'ASC']],
    });

    let gTaxable = 0;
    let gTax = 0;
    let gCgst = 0;
    let gSgst = 0;
    let gIgst = 0;
    let totalWeightKg = 0;

    let rcmCount = 0;
    let rcmTaxable = 0;
    let rcmTax = 0;

    let forwardCount = 0;
    let forwardTaxable = 0;
    let forwardTax = 0;

    let b2bCount = 0;
    let b2bTaxable = 0;
    let b2bTax = 0;

    let b2cCount = 0;
    let b2cTaxable = 0;
    let b2cTax = 0;

    const lrNumbers = [];

    allMatches.forEach((c) => {
      const val = Number(c.freight_amount || 0);
      const tax = Number(c.tax_amount || 0);
      const rate = Number(c.tax_percent !== null && c.tax_percent !== undefined ? c.tax_percent : 5);
      const wt = Number(c.charged_weight || c.actual_weight || 0);

      gTaxable += val;
      gTax += tax;
      totalWeightKg += wt;

      if (c.lr_number) {
        lrNumbers.push(c.lr_number);
      }

      const cGst = (c.consignor?.gstin || '').trim();
      const eGst = (c.consignee?.gstin || '').trim();
      const isReg = cGst.length >= 15 || eGst.length >= 15;

      const posInfo = resolvePlaceOfSupply(
        eGst || cGst,
        c.consignee?.state || c.consignor?.state || '',
        null,
        c.destination_city
      );

      if (posInfo.isInterState) {
        gIgst += tax;
      } else {
        gCgst += tax / 2;
        gSgst += tax / 2;
      }

      // B2B vs B2C
      if (isReg) {
        b2bCount++;
        b2bTaxable += val;
        b2bTax += tax;
      } else {
        b2cCount++;
        b2cTaxable += val;
        b2cTax += tax;
      }

      // RCM vs Forward Charge
      if (isReg && rate <= 5) {
        rcmCount++;
        rcmTaxable += val;
        rcmTax += tax;
      } else {
        forwardCount++;
        forwardTaxable += val;
        forwardTax += tax;
      }
    });

    const docSeriesSummary = {
      docType: 'Consignment Note / Bilty (LR)',
      fromDocNo: lrNumbers.length > 0 ? lrNumbers[0] : 'N/A',
      toDocNo: lrNumbers.length > 0 ? lrNumbers[lrNumbers.length - 1] : 'N/A',
      totalIssued: allMatches.length,
      cancelled: 0,
      netIssued: allMatches.length,
    };

    const hsnSummary = {
      sacCode: '9965',
      description: 'Road Freight Transportation Services',
      uqc: 'KGS',
      totalQuantityKg: parseFloat(totalWeightKg.toFixed(2)),
      totalQuantityTonnes: parseFloat((totalWeightKg / 1000).toFixed(3)),
      taxableValue: parseFloat(gTaxable.toFixed(2)),
      taxRate: '5% (RCM) / 12%',
      cgst: parseFloat(gCgst.toFixed(2)),
      sgst: parseFloat(gSgst.toFixed(2)),
      igst: parseFloat(gIgst.toFixed(2)),
      totalTax: parseFloat(gTax.toFixed(2)),
    };

    const summary = {
      totalConsignments: count,
      filteredConsignments: count,
      totalTaxableValue: parseFloat(gTaxable.toFixed(2)),
      totalTaxLiability: parseFloat(gTax.toFixed(2)),
      totalCgst: parseFloat(gCgst.toFixed(2)),
      totalSgst: parseFloat(gSgst.toFixed(2)),
      totalIgst: parseFloat(gIgst.toFixed(2)),
      totalInvoiceValue: parseFloat((gTaxable + gTax).toFixed(2)),

      // RCM vs Forward
      rcmCount,
      rcmTaxableTurnover: parseFloat(rcmTaxable.toFixed(2)),
      rcmTaxAmount: parseFloat(rcmTax.toFixed(2)),

      forwardCount,
      forwardChargeTurnover: parseFloat(forwardTaxable.toFixed(2)),
      forwardTaxAmount: parseFloat(forwardTax.toFixed(2)),

      // B2B vs B2C
      b2bCount,
      b2bTaxableTurnover: parseFloat(b2bTaxable.toFixed(2)),
      b2bTaxAmount: parseFloat(b2bTax.toFixed(2)),

      b2cCount,
      b2cTaxableTurnover: parseFloat(b2cTaxable.toFixed(2)),
      b2cTaxAmount: parseFloat(b2cTax.toFixed(2)),

      // Organization & SAC Details
      transporterGstin: orgGstin,
      transporterLegalName: orgLegalName,
      transporterState: `${orgStateCode}-${orgState}`,
      sacCode: '9965',

      // Statutory Tables
      hsnSummary,
      docSeriesSummary,
    };

    return paginatedResponse(
      res,
      'GST tax register fetched successfully',
      enrichedRows,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        pages: Math.ceil(count / parseInt(limit, 10)) || 1,
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
