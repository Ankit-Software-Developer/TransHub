// src/controllers/billingController.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { generateNextNumber } = require('../services/numberSequenceService');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { roundToTwo } = require('../utils/decimalUtils');

/**
 * List Invoices with search, status filters, delivery branch, and pagination
 */
const listInvoices = async (req, res) => {
  try {
    const { Invoice, Customer, InvoiceItem, Consignment, Branch } = req.tenantDb || defaultModels;
    const { status, customer_id, search, uncleared_only, branch_id, delivery_branch_id, page = 1, limit = 50 } = req.query;

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    if (customer_id) where.customer_id = customer_id;

    const isUserAdmin = Boolean(
      ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(req.user?.role) ||
      (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(r))) ||
      (req.userPermissions && req.userPermissions.includes('*')) ||
      req.tenant?.isSuperAdmin ||
      req.user?.is_owner
    );

    // Filter invoices by branch:
    // Non-admin branch staff are strictly scoped to invoices belonging to their branch.
    // Admins can see all, or filter by a specific branch if passed in query params.
    const activeBranchFilter = (!isUserAdmin && req.user?.branch_id) ? req.user.branch_id : (branch_id || delivery_branch_id);
    if (activeBranchFilter && activeBranchFilter !== 'ALL') {
      where.branch_id = activeBranchFilter;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    if (status === 'PAID') {
      where.status = 'PAID';
    } else if (status === 'OVERDUE') {
      where[Op.and] = [
        { status: { [Op.ne]: 'PAID' } },
        { balance_amount: { [Op.gt]: 0 } },
        { due_date: { [Op.lt]: todayStr } },
      ];
    } else if (status === 'PENDING') {
      where[Op.and] = [
        { status: { [Op.in]: ['GENERATED', 'PARTIAL', 'DRAFT'] } },
        { balance_amount: { [Op.gt]: 0 } },
        { due_date: { [Op.gte]: todayStr } },
      ];
    } else if (status === 'UNCLEARED' || uncleared_only === 'true') {
      where.balance_amount = { [Op.gt]: 0 };
    } else if (status && status !== 'ALL') {
      where.status = status;
    }

    // Self-healing: Resolve and renumber any legacy duplicate invoice numbers under this organization
    try {
      const allInvoices = await Invoice.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
        },
        order: [['created_at', 'ASC']],
      });

      const usedNumbers = new Set(allInvoices.map((i) => i.invoice_number));
      const seenNumbers = new Set();

      for (const inv of allInvoices) {
        if (seenNumbers.has(inv.invoice_number)) {
          let candidateNum = 2;
          let candidate = inv.invoice_number.replace(/\/(\d+)$/, `/${String(candidateNum).padStart(6, '0')}`);
          while (usedNumbers.has(candidate)) {
            candidateNum++;
            candidate = inv.invoice_number.replace(/\/(\d+)$/, `/${String(candidateNum).padStart(6, '0')}`);
          }
          await inv.update({ invoice_number: candidate });
          usedNumbers.add(candidate);
          seenNumbers.add(candidate);
        } else {
          seenNumbers.add(inv.invoice_number);
        }
      }
    } catch (repairErr) {
      console.warn('Auto-repair duplicate invoices check:', repairErr.message);
    }

    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.iLike]: `%${search}%` } },
        { remarks: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const includes = [];
    if (Customer) {
      includes.push({
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'gstin', 'phone', 'city', 'state', 'credit_days', 'current_balance'],
        where: search ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { gstin: { [Op.iLike]: `%${search}%` } },
          ],
        } : undefined,
        required: false,
      });
    }

    if (Branch) {
      includes.push({
        model: Branch,
        as: 'branch',
        attributes: ['id', 'branch_name', 'branch_code', 'city'],
        required: false,
      });
    }

    if (InvoiceItem) {
      const itemInclude = [];
      if (Consignment && Branch) {
        itemInclude.push({
          model: Consignment,
          as: 'consignment',
          attributes: ['id', 'lr_number', 'docket_number', 'payment_type', 'origin_branch_id', 'dest_branch_id', 'origin_city', 'destination_city'],
          include: [
            { model: Branch, as: 'originBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] },
            { model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] },
          ],
          required: false,
        });
      }

      includes.push({
        model: InvoiceItem,
        as: 'items',
        attributes: ['id', 'consignment_id', 'lr_number', 'booking_date', 'origin_city', 'destination_city', 'charged_weight', 'freight_amount', 'total_amount'],
        include: itemInclude,
        required: false,
      });
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']],
      include: includes,
      distinct: true,
    });

    // 1. Collect all LR numbers, docket numbers, and consignment IDs from all items across all invoice rows
    const allLrNumbers = new Set();
    const allConsignmentIds = new Set();
    const allInvoiceIds = new Set();
    rows.forEach((inv) => {
      const invData = inv.toJSON ? inv.toJSON() : inv;
      if (invData.id) allInvoiceIds.add(invData.id);
      (invData.items || []).forEach((it) => {
        if (it.consignment_id) allConsignmentIds.add(it.consignment_id);
        if (it.lr_number) allLrNumbers.add(String(it.lr_number).trim());
        if (it.consignment?.lr_number) allLrNumbers.add(String(it.consignment.lr_number).trim());
        if (it.consignment?.docket_number) allLrNumbers.add(String(it.consignment.docket_number).trim());
      });
    });

    const consignmentMap = new Map();
    const invoiceConsignmentsMap = new Map();
    if (Consignment && (allLrNumbers.size > 0 || allConsignmentIds.size > 0 || allInvoiceIds.size > 0)) {
      const orClauses = [];
      if (allConsignmentIds.size > 0) {
        orClauses.push({ id: { [Op.in]: Array.from(allConsignmentIds) } });
      }
      if (allInvoiceIds.size > 0) {
        orClauses.push({ invoice_id: { [Op.in]: Array.from(allInvoiceIds) } });
      }
      if (allLrNumbers.size > 0) {
        const lrArray = Array.from(allLrNumbers);
        orClauses.push({ lr_number: { [Op.in]: lrArray } });
        orClauses.push({ docket_number: { [Op.in]: lrArray } });
      }

      try {
        const foundConsignments = await Consignment.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            [Op.or]: orClauses,
          },
          attributes: [
            'id', 'lr_number', 'docket_number', 'payment_type', 'status',
            'origin_city', 'destination_city', 'origin_branch_id', 'dest_branch_id', 'invoice_id'
          ],
          include: Branch ? [
            { model: Branch, as: 'originBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] },
            { model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] },
          ] : [],
        });

        foundConsignments.forEach((c) => {
          const cJson = c.toJSON ? c.toJSON() : c;
          if (cJson.id) consignmentMap.set(String(cJson.id), cJson);
          if (cJson.lr_number) {
            consignmentMap.set(String(cJson.lr_number).trim().toUpperCase(), cJson);
          }
          if (cJson.docket_number) {
            consignmentMap.set(String(cJson.docket_number).trim().toUpperCase(), cJson);
          }
          if (cJson.invoice_id) {
            const invKey = String(cJson.invoice_id);
            if (!invoiceConsignmentsMap.has(invKey)) {
              invoiceConsignmentsMap.set(invKey, []);
            }
            invoiceConsignmentsMap.get(invKey).push(cJson);
          }
        });
      } catch (cErr) {
        console.warn('Could not batch load consignments for invoices:', cErr.message);
      }
    }

    // Decorate invoice rows with computed flags (booking branch, delivery branch, isOverdue, lr_count, days_overdue)
    const decoratedRows = rows.map((inv) => {
      const data = inv.toJSON();
      const bal = parseFloat(data.balance_amount || 0);
      const paid = parseFloat(data.paid_amount || 0);
      const isPastDue = data.due_date && data.due_date < todayStr && bal > 0;
      
      let computedStatus = data.status;
      if (data.status === 'CANCELLED') {
        computedStatus = 'CANCELLED';
      } else if (bal === 0) {
        computedStatus = 'PAID';
      } else if (isPastDue) {
        computedStatus = 'OVERDUE';
      } else if (paid > 0) {
        computedStatus = 'PARTIAL';
      } else {
        computedStatus = 'PENDING';
      }

      // Compute days remaining or days overdue
      let daysDiff = 0;
      if (data.due_date) {
        const d1 = new Date(todayStr);
        const d2 = new Date(data.due_date);
        daysDiff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      }

      const invoiceLinkedConsignments = invoiceConsignmentsMap.get(String(data.id)) || [];
      const enrichedItems = (data.items || []).map((it, idx) => {
        const docNum = it.consignment?.docket_number || it.consignment?.lr_number || it.lr_number;
        const matched =
          (it.consignment_id && consignmentMap.get(String(it.consignment_id))) ||
          (it.lr_number && consignmentMap.get(String(it.lr_number).trim().toUpperCase())) ||
          (docNum && consignmentMap.get(String(docNum).trim().toUpperCase())) ||
          invoiceLinkedConsignments[idx] ||
          it.consignment;

        const effectivePaymentType = matched?.payment_type || it.consignment?.payment_type || invoiceLinkedConsignments[idx]?.payment_type || null;

        return {
          ...it,
          consignment: matched || it.consignment,
          payment_type: effectivePaymentType,
        };
      });

      const firstItem = enrichedItems[0];
      const bookingBranchName =
        firstItem?.consignment?.originBranch?.branch_name ||
        data.branch?.branch_name ||
        firstItem?.origin_city ||
        'Booking Branch';

      const bookingBranchCode =
        firstItem?.consignment?.originBranch?.branch_code ||
        data.branch?.branch_code ||
        '';

      const deliveryBranchName =
        firstItem?.consignment?.destBranch?.branch_name ||
        firstItem?.destination_city ||
        'Destination Delivery Hub';

      const deliveryBranchCode =
        firstItem?.consignment?.destBranch?.branch_code ||
        '';

      const itemDockets = enrichedItems
        .map((it) => it.consignment?.docket_number || it.consignment?.lr_number || it.lr_number)
        .filter(Boolean);
      if (itemDockets.length === 0 && invoiceLinkedConsignments.length > 0) {
        invoiceLinkedConsignments.forEach((c) => {
          if (c.docket_number) itemDockets.push(c.docket_number);
          else if (c.lr_number) itemDockets.push(c.lr_number);
        });
      }
      const uniqueDockets = Array.from(new Set(itemDockets));

      const itemTypes = enrichedItems
        .map((it) => it.payment_type || it.consignment?.payment_type)
        .filter(Boolean);
      if (itemTypes.length === 0 && invoiceLinkedConsignments.length > 0) {
        invoiceLinkedConsignments.forEach((c) => {
          if (c.payment_type) itemTypes.push(c.payment_type);
        });
      }
      const uniqueTypes = Array.from(new Set(itemTypes));
      const primaryDocketType = uniqueTypes[0] || data.payment_type || 'TO_PAY';

      return {
        ...data,
        is_overdue: isPastDue,
        computed_status: computedStatus,
        days_diff: daysDiff,
        booking_branch: bookingBranchName,
        booking_branch_code: bookingBranchCode,
        delivery_branch: deliveryBranchName,
        delivery_branch_code: deliveryBranchCode,
        customer_balance: data.customer?.current_balance || data.balance_amount,
        lr_count: (data.items && data.items.length) || uniqueDockets.length || 0,
        docket_numbers: uniqueDockets,
        docket_number: uniqueDockets[0] || '',
        docket_summary: uniqueDockets.join(', '),
        docket_type: primaryDocketType,
        docket_types: uniqueTypes,
        items: enrichedItems,
      };
    });

    return paginatedResponse(res, 'Invoices fetched successfully', decoratedRows, {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Get Single Invoice Details (for viewing and printable GST Tax Invoice)
 */
const getInvoiceById = async (req, res) => {
  try {
    const { Invoice, Customer, InvoiceItem, Payment, Consignment, Branch } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const includes = [
      Customer ? { model: Customer, as: 'customer' } : null,
      Branch ? { model: Branch, as: 'branch' } : null,
      Payment ? { model: Payment, as: 'payments' } : null,
    ];

    if (InvoiceItem) {
      const itemInclude = [];
      if (Consignment && Branch) {
        itemInclude.push({
          model: Consignment,
          as: 'consignment',
          include: [{ model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] }],
        });
      }
      includes.push({
        model: InvoiceItem,
        as: 'items',
        include: itemInclude,
      });
    }

    const invoice = await Invoice.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
      },
      include: includes.filter(Boolean),
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', null, 404);
    }

    const data = invoice.toJSON();

    // Batch lookup consignments for items if consignment association is incomplete
    const itemCids = (data.items || []).map((it) => it.consignment_id).filter(Boolean);
    const itemLrs = (data.items || []).map((it) => it.lr_number).filter(Boolean);
    const singleConsignmentMap = new Map();
    let singleInvoiceLinkedConsignments = [];

    if (Consignment) {
      try {
        const orClauses = [
          { invoice_id: id },
        ];
        if (itemCids.length > 0) orClauses.push({ id: { [Op.in]: itemCids } });
        if (itemLrs.length > 0) {
          orClauses.push({ lr_number: { [Op.in]: itemLrs } });
          orClauses.push({ docket_number: { [Op.in]: itemLrs } });
        }

        const found = await Consignment.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            [Op.or]: orClauses,
          },
          attributes: ['id', 'lr_number', 'docket_number', 'payment_type', 'status', 'origin_city', 'destination_city', 'invoice_id'],
          include: Branch ? [{ model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] }] : [],
        });

        singleInvoiceLinkedConsignments = found.filter((c) => String(c.invoice_id) === String(id));
        found.forEach((c) => {
          const cJson = c.toJSON ? c.toJSON() : c;
          if (cJson.id) singleConsignmentMap.set(String(cJson.id), cJson);
          if (cJson.lr_number) singleConsignmentMap.set(String(cJson.lr_number).trim().toUpperCase(), cJson);
          if (cJson.docket_number) singleConsignmentMap.set(String(cJson.docket_number).trim().toUpperCase(), cJson);
        });
      } catch (err) {
        console.warn('Could not load consignments for single invoice:', err.message);
      }
    }

    const enrichedSingleItems = (data.items || []).map((it, idx) => {
      const docNum = it.consignment?.docket_number || it.consignment?.lr_number || it.lr_number;
      const matched =
        (it.consignment_id && singleConsignmentMap.get(String(it.consignment_id))) ||
        (it.lr_number && singleConsignmentMap.get(String(it.lr_number).trim().toUpperCase())) ||
        (docNum && singleConsignmentMap.get(String(docNum).trim().toUpperCase())) ||
        singleInvoiceLinkedConsignments[idx] ||
        it.consignment;
      const effType = matched?.payment_type || it.consignment?.payment_type || singleInvoiceLinkedConsignments[idx]?.payment_type || null;
      return {
        ...it,
        consignment: matched || it.consignment,
        payment_type: effType,
      };
    });

    data.items = enrichedSingleItems;
    const itemSingleTypes = enrichedSingleItems.map((it) => it.payment_type).filter(Boolean);
    if (itemSingleTypes.length === 0 && singleInvoiceLinkedConsignments.length > 0) {
      singleInvoiceLinkedConsignments.forEach((c) => {
        if (c.payment_type) itemSingleTypes.push(c.payment_type);
      });
    }
    const uniqueSingleTypes = Array.from(new Set(itemSingleTypes));
    data.docket_type = uniqueSingleTypes[0] || 'TO_PAY';
    data.docket_types = uniqueSingleTypes;

    const firstItem = data.items && data.items[0];
    const customerObj = data.customer;
    data.customer_name = customerObj?.name || 'Customer Account';
    data.customer_gstin = customerObj?.gstin || 'URP';
    data.customer = customerObj?.name || 'Customer Account';
    data.gstin = data.gstin || customerObj?.gstin || 'URP';
    data.customer_details = customerObj;
    data.delivery_branch =
      data.branch?.branch_name ||
      firstItem?.consignment?.destBranch?.branch_name ||
      firstItem?.destination_city ||
      'Main Delivery Hub';

    return successResponse(res, 'Invoice details fetched', data);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Get Financial KPI Summary for Invoicing Dashboard
 */
const getBillingSummary = async (req, res) => {
  try {
    const { Invoice } = req.tenantDb || defaultModels;
    const todayStr = new Date().toISOString().slice(0, 10);

    const invoices = await Invoice.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
      attributes: ['total_amount', 'paid_amount', 'balance_amount', 'due_date', 'status'],
    });

    let totalInvoiced = 0;
    let totalReceived = 0;
    let outstandingBalance = 0;
    let overdueReceivables = 0;

    invoices.forEach((inv) => {
      const total = parseFloat(inv.total_amount || 0);
      const paid = parseFloat(inv.paid_amount || 0);
      const balance = parseFloat(inv.balance_amount || 0);

      totalInvoiced += total;
      totalReceived += paid;
      outstandingBalance += balance;

      if (inv.due_date && inv.due_date < todayStr && balance > 0) {
        overdueReceivables += balance;
      }
    });

    const collectionEfficiency = totalInvoiced > 0
      ? roundToTwo((totalReceived / totalInvoiced) * 100)
      : 100;

    return successResponse(res, 'Billing financial summary', {
      total_invoiced: roundToTwo(totalInvoiced),
      total_received: roundToTwo(totalReceived),
      outstanding_balance: roundToTwo(outstandingBalance),
      overdue_receivables: roundToTwo(overdueReceivables),
      collection_efficiency: collectionEfficiency,
      invoice_count: invoices.length,
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Get Unbilled Consignments (TBB or Delivered Consignments awaiting invoicing)
 * Categorizes and clarifies delivery status, payment type (TBB, TO_PAY, PAID), and billing eligibility
 */
const getUnbilledConsignments = async (req, res) => {
  try {
    const { Consignment, Customer, Branch, Pod } = req.tenantDb || defaultModels;
    const {
      customer_id,
      tbb_only,
      payment_type,
      booking_branch_id,
      branch_id,
      delivered_only,
      include_all_statuses,
    } = req.query;

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      is_billed: false,
    };

    // Check if requester has admin/owner privileges
    const isUserAdmin = Boolean(
      ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(req.user?.role) ||
      (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN', 'OWNER'].includes(r))) ||
      (req.userPermissions && req.userPermissions.includes('*')) ||
      req.tenant?.isSuperAdmin ||
      req.user?.is_owner
    );

    const userBranchId = req.user?.branch_id;
    const activeBranchFilter = (!isUserAdmin && userBranchId) ? userBranchId : (booking_branch_id || branch_id);

    if (activeBranchFilter && activeBranchFilter !== 'ALL') {
      let matchedBranchIds = [activeBranchFilter];
      let cityKeywords = [];
      if (Branch) {
        try {
          const br = await Branch.findByPk(activeBranchFilter);
          if (br) {
            const bCity = (br.city || '').trim();
            const bName = (br.branch_name || '').trim();
            if (bCity) cityKeywords.push(bCity);
            if (/delhi/i.test(bCity) || /delhi/i.test(bName)) {
              cityKeywords.push('Delhi', 'South Delhi', 'North Delhi', 'New Delhi', 'West Delhi', 'East Delhi', 'Central Delhi', 'Okhla');
            } else if (/bengaluru|bangalore/i.test(bCity) || /bengaluru|bangalore/i.test(bName)) {
              cityKeywords.push('Bengaluru', 'Bangalore');
            } else if (/mumbai/i.test(bCity) || /mumbai/i.test(bName)) {
              cityKeywords.push('Mumbai', 'Navi Mumbai', 'Thane', 'Bhiwandi');
            }
            if (cityKeywords.length > 0) {
              const siblings = await Branch.findAll({
                where: {
                  organization_id: req.tenant.organizationId,
                  city: { [Op.in]: Array.from(new Set(cityKeywords)) },
                },
                attributes: ['id'],
                raw: true,
              });
              matchedBranchIds = Array.from(new Set([activeBranchFilter, ...siblings.map((s) => s.id)]));
            }
          }
        } catch (e) {
          console.warn('Branch resolution in billing error:', e.message);
        }
      }

      const originMatch = [
        { origin_branch_id: { [Op.in]: matchedBranchIds } },
        ...(cityKeywords.length > 0 ? [{ origin_city: { [Op.in]: cityKeywords } }] : []),
      ];

      const destMatch = [
        { dest_branch_id: { [Op.in]: matchedBranchIds } },
        ...(cityKeywords.length > 0 ? [{ destination_city: { [Op.in]: cityKeywords } }] : []),
      ];

      // Transport Billing Rules:
      // - TO_PAY: Collected from Consignee at Delivery Branch (destination).
      // - PAID: Collected upfront from Shipper at Booking Branch (origin).
      // - TBB: Billed on corporate credit at Booking Branch (origin) only, NOT at Delivery Branch.
      const branchCondition = {
        [Op.or]: [
          {
            [Op.and]: [
              { payment_type: 'TO_PAY' },
              { [Op.or]: destMatch },
            ],
          },
          {
            [Op.and]: [
              { payment_type: 'PAID' },
              { [Op.or]: originMatch },
            ],
          },
          {
            [Op.and]: [
              { payment_type: 'TBB' },
              { [Op.or]: originMatch },
            ],
          },
          {
            [Op.and]: [
              { payment_type: { [Op.notIn]: ['TO_PAY', 'PAID', 'TBB'] } },
              { [Op.or]: originMatch },
            ],
          },
        ],
      };

      if (where[Op.or]) {
        where[Op.and] = [
          { [Op.or]: where[Op.or] },
          branchCondition,
        ];
        delete where[Op.or];
      } else {
        where[Op.or] = branchCondition[Op.or];
      }
    }

    // Delivery Completion Requirement: Only show consignments where delivery has completed (POD uploaded / DELIVERED / COMPLETED).
    // Consignments still booked, in hub, or in transit cannot be billed yet.
    if (include_all_statuses !== 'true') {
      where.status = { [Op.in]: ['DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'POD_VERIFIED'] };
    }

    if (payment_type && payment_type !== 'ALL') {
      where.payment_type = payment_type;
    } else if (tbb_only === 'true') {
      where.payment_type = 'TBB';
    }

    if (customer_id) {
      const custCond = {
        [Op.or]: [
          { consignor_id: customer_id },
          { consignee_id: customer_id },
        ],
      };
      if (where[Op.and]) {
        where[Op.and].push(custCond);
      } else if (where[Op.or]) {
        where[Op.and] = [{ [Op.or]: where[Op.or] }, custCond];
        delete where[Op.or];
      } else {
        where[Op.or] = custCond[Op.or];
      }
    }

    const includes = [];
    if (Customer) {
      includes.push(
        { model: Customer, as: 'consignor', attributes: ['id', 'name', 'gstin', 'credit_days', 'current_balance'] },
        { model: Customer, as: 'consignee', attributes: ['id', 'name', 'gstin', 'credit_days', 'current_balance'] }
      );
    }

    if (Branch) {
      includes.push(
        { model: Branch, as: 'destBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] },
        { model: Branch, as: 'originBranch', attributes: ['id', 'branch_name', 'branch_code', 'city'] }
      );
    }

    if (Pod) {
      includes.push({
        model: Pod,
        as: 'pod',
        attributes: ['id', 'file_url', 'file_type', 'receiver_name', 'status', 'uploaded_at'],
        required: false,
      });
    }

    const consignments = await Consignment.findAll({
      where,
      order: [['booking_date', 'DESC'], ['lr_number', 'ASC']],
      attributes: [
        'id',
        'lr_number',
        'docket_number',
        'consignor_id',
        'consignee_id',
        'origin_city',
        'destination_city',
        'origin_branch_id',
        'dest_branch_id',
        'booking_date',
        'material_description',
        'packages_count',
        'charged_weight',
        'actual_weight',
        'rate',
        'rate_type',
        'freight_amount',
        'loading_charges',
        'unloading_charges',
        'handling_charges',
        'hamali_charges',
        'door_delivery_charges',
        'fuel_surcharge',
        'insurance_charges',
        'other_charges',
        'tax_percent',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'payment_type',
        'status',
      ],
      include: includes,
      limit: 150,
    });

    const formatted = consignments.map((c) => {
      const data = c.toJSON();
      const customerName = data.consignor?.name || data.consignee?.name || 'Enterprise Customer';
      const customerGstin = data.consignor?.gstin || data.consignee?.gstin || 'URP';
      const customerBalance = data.consignor?.current_balance || data.consignee?.current_balance || 0;
      const creditDays = data.consignor?.credit_days || 30;
      const deliveryBranch = data.destBranch?.branch_name || data.destination_city || 'Destination Branch';
      const originBranch = data.originBranch?.branch_name || data.origin_city || 'Booking Branch';

      const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(data.status);
      const isPodUploaded = ['POD_UPLOADED', 'COMPLETED'].includes(data.status);
      const isPaidUpfront = data.payment_type === 'PAID';
      const isToPayCollected = data.payment_type === 'TO_PAY' && isDelivered;
      const isAlreadyPaid = isPaidUpfront || isToPayCollected;
      const isTbbReady = data.payment_type === 'TBB' && isDelivered;

      let billingCategory = 'TBB_READY';
      let billingNotice = 'Ready for Monthly Credit Billing';
      let deliveryLabel = isPodUploaded ? 'Delivered (POD Verified)' : isDelivered ? 'Delivered' : data.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : data.status === 'IN_TRANSIT' ? 'In Transit' : 'Booked';

      if (data.payment_type === 'TBB') {
        if (isDelivered) {
          billingCategory = 'TBB_READY';
          billingNotice = `POD & Delivery Completed at ${deliveryBranch} • Ready for Invoice at Booking Branch (${originBranch})`;
        } else {
          billingCategory = 'TBB_IN_TRANSIT';
          billingNotice = `In-Transit to ${deliveryBranch} • Invoicing locked until Delivery & POD completed`;
        }
      } else if (data.payment_type === 'PAID') {
        billingCategory = 'PAID_AT_BOOKING';
        billingNotice = `Paid Upfront at Booking Branch (${originBranch}) • ₹0 Due`;
      } else if (data.payment_type === 'TO_PAY') {
        if (isDelivered) {
          billingCategory = 'TO_PAY_COLLECTED';
          billingNotice = `Delivered & Freight Collected at Delivery Branch (${deliveryBranch}) • ₹0 Due`;
        } else {
          billingCategory = 'TO_PAY_PENDING';
          billingNotice = `To-Pay at Delivery Branch (${deliveryBranch}) • Collect from Consignee upon handover`;
        }
      }

      return {
        ...data,
        customer: customerName,
        customer_gstin: customerGstin,
        customer_balance: customerBalance,
        credit_days: creditDays,
        booking_branch_id: data.origin_branch_id,
        booking_branch: originBranch,
        delivery_branch_id: data.dest_branch_id,
        delivery_branch: deliveryBranch,
        origin_branch: originBranch,
        is_delivered: isDelivered,
        is_pod_completed: isPodUploaded || isDelivered,
        is_already_paid: isAlreadyPaid,
        is_billable: data.payment_type === 'TBB' ? isDelivered : true,
        billing_category: billingCategory,
        billing_notice: billingNotice,
        delivery_status_label: deliveryLabel,
        pod_url: data.pod?.file_url || null,
        pod_status: data.pod?.status || null,
        pod_receiver: data.pod?.receiver_name || null,
        pod_uploaded_at: data.pod?.uploaded_at || null,
      };
    });

    return successResponse(res, 'Unbilled consignments fetched', formatted);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Generate Freight Tax Invoice for Selected Consignments
 * Accurately recognizes prepaid amounts for PAID and delivered TO_PAY consignments
 */
const createInvoice = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Invoice, InvoiceItem, Consignment, CustomerLedger, Customer } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();

  try {
    const {
      customer_id,
      consignment_ids = [],
      invoice_date,
      due_date,
      credit_days = 30,
      tax_rate = 5.0,
      is_rcm = false,
      extra_charges = 0,
      branch_id,
      remarks,
    } = req.body;

    if (!customer_id || consignment_ids.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'Customer and at least one consignment are required to generate an invoice', null, 400);
    }

    const { formattedNumber: invoiceNumber } = await generateNextNumber({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      branchId: branch_id || req.branchId || null,
      documentType: 'INVOICE',
      transaction,
      models: req.tenantDb,
    });

    const consignments = await Consignment.findAll({
      where: {
        id: consignment_ids,
        tenant_id: req.tenant.tenantId,
      },
      transaction,
    });

    if (consignments.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'Selected consignments not found or already billed', null, 404);
    }

    let docketsTaxable = 0;
    let docketsTax = 0;
    let prepaidTotal = 0;
    const gstPct = parseFloat(tax_rate || 5.0);

    consignments.forEach((c) => {
      const totalAmt = parseFloat(c.total_amount || 0);
      const existingTax = parseFloat(c.tax_amount || 0);
      const existingTaxPercent = parseFloat(c.tax_percent || 0);

      let itemTaxable = 0;
      let itemTax = 0;

      if (existingTax > 0) {
        // Docket already has tax included in total_amount
        itemTaxable = roundToTwo(Math.max(0, totalAmt - existingTax));
        if (is_rcm || gstPct === 0) {
          itemTax = 0;
        } else if (Math.abs(gstPct - existingTaxPercent) < 0.1 || !existingTaxPercent) {
          // Same tax rate: use exact docket tax amount (prevents rounding discrepancy)
          itemTax = existingTax;
        } else {
          // Rate was explicitly modified by user: re-calculate based on taxable base
          itemTax = roundToTwo((itemTaxable * gstPct) / 100);
        }
      } else {
        // Docket was booked with 0 tax (e.g. RCM or pre-tax)
        itemTaxable = totalAmt;
        itemTax = (!is_rcm && gstPct > 0) ? roundToTwo((itemTaxable * gstPct) / 100) : 0;
      }

      docketsTaxable = roundToTwo(docketsTaxable + itemTaxable);
      docketsTax = roundToTwo(docketsTax + itemTax);

      const isDelivered = ['DELIVERED', 'POD_UPLOADED', 'COMPLETED'].includes(c.status);
      const isPaidUpfront = c.payment_type === 'PAID';
      const isToPayCollected = c.payment_type === 'TO_PAY' && isDelivered;
      if (isPaidUpfront || isToPayCollected) {
        prepaidTotal = roundToTwo(prepaidTotal + totalAmt);
      }
    });

    const extra = roundToTwo(parseFloat(extra_charges || 0));
    const extraTax = (!is_rcm && gstPct > 0 && extra > 0) ? roundToTwo((extra * gstPct) / 100) : 0;

    const totalTaxable = roundToTwo(docketsTaxable + extra);
    const totalTax = roundToTwo(docketsTax + extraTax);
    const totalInvoiceAmount = roundToTwo(totalTaxable + totalTax);

    let cgstRate = 0;
    let sgstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;

    if (!is_rcm && totalTax > 0) {
      cgstRate = gstPct / 2;
      sgstRate = gstPct / 2;
      cgstAmount = roundToTwo(totalTax / 2);
      sgstAmount = roundToTwo(totalTax - cgstAmount);
    }

    // Calculate prepaid portion (PAID at booking or collected TO_PAY)
    const prepaidAmount = Math.min(totalInvoiceAmount, prepaidTotal);
    const balanceAmount = roundToTwo(Math.max(0, totalInvoiceAmount - prepaidAmount));

    const invDateStr = invoice_date || new Date().toISOString().slice(0, 10);
    let dueDateStr = due_date;
    if (!dueDateStr) {
      const d = new Date(invDateStr);
      d.setDate(d.getDate() + parseInt(credit_days, 10));
      dueDateStr = d.toISOString().slice(0, 10);
    }

    // Determine invoicing branch:
    // - For TBB (corporate credit billed to Shipper) & PAID: Invoicing branch is the Booking Branch (origin_branch_id)
    // - For TO_PAY: Invoicing branch is the Delivery Branch (dest_branch_id)
    const isToPayInvoice = consignments.every((c) => c.payment_type === 'TO_PAY');
    const invoiceBranchId =
      branch_id ||
      (isToPayInvoice
        ? (consignments[0]?.dest_branch_id || consignments[0]?.origin_branch_id)
        : (consignments[0]?.origin_branch_id || consignments[0]?.dest_branch_id)) ||
      req.branchId ||
      null;

    let initialStatus = 'GENERATED';
    if (balanceAmount === 0) {
      initialStatus = 'PAID';
    } else if (prepaidAmount > 0) {
      initialStatus = 'PARTIAL';
    }

    const invoice = await Invoice.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_id: invoiceBranchId,
      invoice_number: invoiceNumber,
      customer_id,
      invoice_date: invDateStr,
      due_date: dueDateStr,
      subtotal_amount: totalTaxable,
      taxable_amount: totalTaxable,
      cgst_rate: cgstRate,
      cgst_amount: cgstAmount,
      sgst_rate: sgstRate,
      sgst_amount: sgstAmount,
      total_tax_amount: totalTax,
      total_amount: totalInvoiceAmount,
      balance_amount: balanceAmount,
      paid_amount: prepaidAmount,
      status: initialStatus,
      payment_terms: `${credit_days} Days Credit ${is_rcm ? '(GST RCM Applicable)' : ''}${prepaidAmount > 0 ? ` (₹${prepaidAmount.toLocaleString('en-IN')} Prepaid/Settled)` : ''}`,
      remarks: remarks || '',
      created_by: req.user.id,
    }, { transaction });

    // Mark consignments as billed and create InvoiceItem line items
    for (const c of consignments) {
      await InvoiceItem.create({
        invoice_id: invoice.id,
        consignment_id: c.id,
        lr_number: c.lr_number,
        booking_date: c.booking_date,
        description: c.material_description,
        origin_city: c.origin_city,
        destination_city: c.destination_city,
        packages_count: c.packages_count,
        charged_weight: c.charged_weight,
        freight_amount: c.freight_amount,
        other_charges: c.other_charges,
        total_amount: c.total_amount,
      }, { transaction });

      await c.update({
        is_billed: true,
        invoice_id: invoice.id,
      }, { transaction });
    }

    // Customer Ledger Entry (DEBIT only for true unpaid credit balance)
    let previousBalance = 0;
    if (CustomerLedger) {
      const lastLedger = await CustomerLedger.findOne({
        where: { customer_id },
        order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
        transaction,
      });
      previousBalance = lastLedger ? parseFloat(lastLedger.running_balance) : 0;
      const newBalance = roundToTwo(previousBalance + balanceAmount);

      await CustomerLedger.create({
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        customer_id,
        entry_date: invoice.invoice_date,
        entry_type: 'INVOICE',
        reference_id: invoice.id,
        reference_number: invoice.invoice_number,
        description: `Freight Tax Invoice for ${consignments.length} Bilty/LR(s) (Prepaid: ₹${prepaidAmount}, Credit Due: ₹${balanceAmount})`,
        debit_amount: balanceAmount,
        credit_amount: 0.00,
        running_balance: newBalance,
      }, { transaction });

      if (Customer) {
        await Customer.update(
          { current_balance: newBalance },
          { where: { id: customer_id }, transaction }
        );
      }
    }

    await transaction.commit();

    return successResponse(res, 'Freight invoice generated successfully', invoice, 201);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Record Customer Payment & Reconcile Invoice (with TDS Sec 194C support)
 */
const recordPayment = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Payment, Invoice, CustomerLedger, Customer } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();

  try {
    const {
      customer_id,
      invoice_id,
      amount,
      tds_amount = 0,
      payment_date,
      payment_method = 'NEFT',
      reference_number,
      bank_name,
      remarks,
    } = req.body;

    const payAmount = parseFloat(amount || 0);
    const tdsDeducted = parseFloat(tds_amount || 0);
    const totalCreditAgainstInvoice = roundToTwo(payAmount + tdsDeducted);

    if (!customer_id || totalCreditAgainstInvoice <= 0) {
      await transaction.rollback();
      return errorResponse(res, 'Customer and payment amount are required', null, 400);
    }

    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;

    const payment = await Payment.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_id: req.branchId || null,
      payment_number: paymentNumber,
      customer_id,
      invoice_id: invoice_id || null,
      amount: payAmount,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_method,
      reference_number: reference_number || '',
      bank_name: bank_name || '',
      remarks: remarks ? `${remarks} (TDS Deducted: ₹${tdsDeducted})` : (tdsDeducted > 0 ? `TDS Deducted under Sec 194C: ₹${tdsDeducted}` : ''),
      received_by: req.user.id,
    }, { transaction });

    // Update Invoice balance if linked
    if (invoice_id && Invoice) {
      const invoice = await Invoice.findByPk(invoice_id, { transaction });
      if (invoice) {
        const currentPaid = parseFloat(invoice.paid_amount || 0);
        const newPaid = roundToTwo(currentPaid + totalCreditAgainstInvoice);
        const newBal = Math.max(0, roundToTwo(parseFloat(invoice.total_amount) - newPaid));
        const newStatus = newBal === 0 ? 'PAID' : 'PARTIAL';

        await invoice.update({
          paid_amount: newPaid,
          balance_amount: newBal,
          status: newStatus,
        }, { transaction });
      }
    }

    // Post to Customer Ledger
    if (CustomerLedger) {
      const lastLedger = await CustomerLedger.findOne({
        where: { customer_id },
        order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
        transaction,
      });

      let currentRunning = lastLedger ? parseFloat(lastLedger.running_balance) : 0;

      // 1. Bank Payment Credit
      if (payAmount > 0) {
        currentRunning = roundToTwo(currentRunning - payAmount);
        await CustomerLedger.create({
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          customer_id,
          entry_date: payment.payment_date,
          entry_type: 'PAYMENT',
          reference_id: payment.id,
          reference_number: payment.payment_number,
          description: `Bank Remittance received via ${payment.payment_method} (Ref: ${payment.reference_number || 'N/A'})`,
          debit_amount: 0.00,
          credit_amount: payAmount,
          running_balance: currentRunning,
        }, { transaction });
      }

      // 2. TDS Credit (if corporate client deducted 1% or 2% Sec 194C TDS)
      if (tdsDeducted > 0) {
        currentRunning = roundToTwo(currentRunning - tdsDeducted);
        await CustomerLedger.create({
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          customer_id,
          entry_date: payment.payment_date,
          entry_type: 'TDS_CREDIT',
          reference_id: payment.id,
          reference_number: payment.payment_number,
          description: `TDS 194C Deducted by Party (Certificate awaited)`,
          debit_amount: 0.00,
          credit_amount: tdsDeducted,
          running_balance: currentRunning,
        }, { transaction });
      }

      if (Customer) {
        await Customer.update(
          { current_balance: currentRunning },
          { where: { id: customer_id }, transaction }
        );
      }
    }

    await transaction.commit();

    return successResponse(res, 'Payment recorded and invoice reconciled successfully', payment, 201);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Get Customer Ledger Statements
 */
const getCustomerLedger = async (req, res) => {
  try {
    const { CustomerLedger } = req.tenantDb || defaultModels;
    const { customer_id } = req.params;

    const ledger = await CustomerLedger.findAll({
      where: {
        customer_id,
        tenant_id: req.tenant.tenantId,
      },
      order: [['entry_date', 'ASC'], ['created_at', 'ASC']],
    });

    return successResponse(res, 'Customer ledger statements fetched', ledger);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Export GSTR-1 Outward B2B Supply Register
 */
const exportGSTR1 = async (req, res) => {
  try {
    const { Invoice, Customer } = req.tenantDb || defaultModels;
    const { month, year } = req.query;

    const invoices = await Invoice.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
      include: Customer ? [{ model: Customer, as: 'customer' }] : [],
      order: [['invoice_date', 'ASC']],
    });

    const gstr1Rows = invoices.map((inv) => {
      const cust = inv.customer || {};
      const stateCode = cust.gstin ? cust.gstin.slice(0, 2) : '27';
      return {
        'GSTIN/UIN of Recipient': cust.gstin || 'URP',
        'Receiver Name': cust.name || 'Walk-in Party',
        'Invoice Number': inv.invoice_number,
        'Invoice Date': inv.invoice_date,
        'Invoice Value': parseFloat(inv.total_amount),
        'Place Of Supply': `${stateCode}-${cust.state || 'Maharashtra'}`,
        'Reverse Charge': inv.payment_terms?.includes('RCM') ? 'Y' : 'N',
        'Applicable % of Tax Rate': 5,
        'Invoice Type': 'Regular B2B',
        'Taxable Value': parseFloat(inv.taxable_amount),
        'Integrated Tax (IGST)': parseFloat(inv.igst_amount || 0),
        'Central Tax (CGST)': parseFloat(inv.cgst_amount || 0),
        'State/UT Tax (SGST)': parseFloat(inv.sgst_amount || 0),
      };
    });

    return successResponse(res, 'GSTR-1 report generated', gstr1Rows);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Update Invoice Due Date, Payment Terms, or Remarks (Due Date Extension)
 */
const updateInvoice = async (req, res) => {
  try {
    const { Invoice } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const { due_date, payment_terms, remarks } = req.body;

    const invoice = await Invoice.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
      },
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', null, 404);
    }

    if (invoice.status === 'CANCELLED') {
      return errorResponse(res, 'Cannot modify a cancelled invoice', null, 400);
    }

    const updates = {};
    if (due_date) updates.due_date = due_date;
    if (payment_terms !== undefined) updates.payment_terms = payment_terms;
    if (remarks !== undefined) updates.remarks = remarks;

    // Recalculate status if due_date changed and invoice is not fully paid
    if (invoice.balance_amount > 0 && due_date) {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (due_date < todayStr) {
        updates.status = 'OVERDUE';
      } else if (parseFloat(invoice.paid_amount) > 0) {
        updates.status = 'PARTIAL';
      } else {
        updates.status = 'GENERATED';
      }
    }

    await invoice.update(updates);

    return successResponse(res, 'Invoice updated successfully', invoice);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Cancel / Void Freight Invoice
 * Reverses Customer balance and releases consignments back to unbilled queue
 */
const cancelInvoice = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Invoice, InvoiceItem, Consignment, CustomerLedger, Customer } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();

  try {
    const { id } = req.params;
    const { reason = 'Cancelled by transporter' } = req.body;

    const invoice = await Invoice.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
      },
      include: InvoiceItem ? [{ model: InvoiceItem, as: 'items' }] : [],
      transaction,
    });

    if (!invoice) {
      await transaction.rollback();
      return errorResponse(res, 'Invoice not found', null, 404);
    }

    if (invoice.status === 'CANCELLED') {
      await transaction.rollback();
      return errorResponse(res, 'Invoice is already cancelled', null, 400);
    }

    if (parseFloat(invoice.paid_amount) > 0) {
      await transaction.rollback();
      return errorResponse(res, 'Cannot cancel invoice with recorded remittances. Please delete or reverse payment transactions first.', null, 400);
    }

    // 1. Release all consignments back to unbilled pool
    if (invoice.items && invoice.items.length > 0 && Consignment) {
      const consignmentIds = invoice.items.map((i) => i.consignment_id).filter(Boolean);
      if (consignmentIds.length > 0) {
        await Consignment.update(
          { is_billed: false, invoice_id: null },
          { where: { id: consignmentIds, tenant_id: req.tenant.tenantId }, transaction }
        );
      }
    }

    // 2. Reverse customer balance & ledger entry
    const balanceToReverse = parseFloat(invoice.balance_amount || invoice.total_amount || 0);
    if (CustomerLedger && invoice.customer_id && balanceToReverse > 0) {
      const lastLedger = await CustomerLedger.findOne({
        where: { customer_id: invoice.customer_id },
        order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
        transaction,
      });
      const previousBalance = lastLedger ? parseFloat(lastLedger.running_balance) : 0;
      const newBalance = roundToTwo(Math.max(0, previousBalance - balanceToReverse));

      await CustomerLedger.create({
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        customer_id: invoice.customer_id,
        entry_date: new Date().toISOString().slice(0, 10),
        entry_type: 'CREDIT_NOTE',
        reference_id: invoice.id,
        reference_number: invoice.invoice_number,
        description: `Cancelled Invoice ${invoice.invoice_number}: ${reason}`,
        debit_amount: 0.00,
        credit_amount: balanceToReverse,
        running_balance: newBalance,
      }, { transaction });

      if (Customer) {
        await Customer.update(
          { current_balance: newBalance },
          { where: { id: invoice.customer_id }, transaction }
        );
      }
    }

    // 3. Mark invoice as CANCELLED
    await invoice.update({
      status: 'CANCELLED',
      balance_amount: 0.00,
      remarks: invoice.remarks ? `${invoice.remarks} | CANCELLED: ${reason}` : `CANCELLED: ${reason}`,
    }, { transaction });

    await transaction.commit();

    return successResponse(res, 'Invoice cancelled successfully and consignments released for re-billing', invoice);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listInvoices,
  getInvoiceById,
  getBillingSummary,
  getUnbilledConsignments,
  createInvoice,
  recordPayment,
  updateInvoice,
  cancelInvoice,
  getCustomerLedger,
  exportGSTR1,
};
