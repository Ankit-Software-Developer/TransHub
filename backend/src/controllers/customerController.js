// src/controllers/customerController.js
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

// Helper to match nearest branch by customer PIN code or city location
const findNearestBranch = (pincode, city, branchList) => {
  if (!branchList || branchList.length === 0) return null;
  const cleanPin = (pincode || '').replace(/\D/g, '');
  const cleanCity = (city || '').trim().toLowerCase();

  if (!cleanPin && !cleanCity) {
    return branchList.find((b) => b.is_hub) || branchList[0];
  }

  let best = null;
  let maxScore = -1;

  for (const b of branchList) {
    let score = 0;
    const bCity = (b.city || '').toLowerCase();
    const bPin = (b.pincode || '').replace(/\D/g, '');

    // 1. Exact 6-digit Pincode match
    if (cleanPin && bPin && cleanPin === bPin) {
      score += 1000;
    }
    // 2. 4-digit Pincode cluster match
    else if (cleanPin.length >= 4 && bPin.length >= 4 && cleanPin.slice(0, 4) === bPin.slice(0, 4)) {
      score += 800;
    }
    // 3. 3-digit Pincode district match
    else if (cleanPin.length >= 3 && bPin.length >= 3 && cleanPin.slice(0, 3) === bPin.slice(0, 3)) {
      score += 600;
      const diff = Math.abs(parseInt(cleanPin, 10) - parseInt(bPin, 10));
      score += Math.max(0, 50 - Math.min(50, Math.floor(diff / 10)));
    }
    // 4. 2-digit Pincode state circle match
    else if (cleanPin.length >= 2 && bPin.length >= 2 && cleanPin.slice(0, 2) === bPin.slice(0, 2)) {
      score += 300;
    }
    // 5. Numerical PIN distance if both 6 digits
    else if (cleanPin.length === 6 && bPin.length === 6) {
      const diff = Math.abs(parseInt(cleanPin, 10) - parseInt(bPin, 10));
      if (diff < 500) {
        score += 350;
      } else if (diff < 2000) {
        score += 150;
      }
    }

    // Direct City match
    if (cleanCity && bCity && (cleanCity === bCity || bCity.includes(cleanCity) || cleanCity.includes(bCity))) {
      score += 500;
    }

    // Regional Aliases
    const isDelhiNCR = /delhi|gurugram|gurgaon|noida|faridabad|ghaziabad/i.test(cleanCity);
    const isBranchDelhiNCR = /delhi|gurugram|gurgaon|noida|faridabad|ghaziabad/i.test(bCity) || /delhi/i.test(b.branch_name);
    if (isDelhiNCR && isBranchDelhiNCR) score += 400;

    const isBlr = /bengaluru|bangalore/i.test(cleanCity);
    const isBranchBlr = /bengaluru|bangalore/i.test(bCity) || /bengaluru|bangalore/i.test(b.branch_name);
    if (isBlr && isBranchBlr) score += 400;

    const isMum = /mumbai|thane|bhiwandi|navi mumbai/i.test(cleanCity);
    const isBranchMum = /mumbai|thane|bhiwandi|navi mumbai/i.test(bCity) || /mumbai/i.test(b.branch_name);
    if (isMum && isBranchMum) score += 400;

    if (b.is_hub && score > 0) score += 30;

    if (score > maxScore) {
      maxScore = score;
      best = b;
    }
  }

  return best || (branchList.find((b) => b.is_hub) || branchList[0]);
};

const listCustomers = async (req, res) => {
  try {
    const { Customer, Branch, Consignment } = req.tenantDb || defaultModels;
    const {
      search,
      type,
      billing_type,
      branch_id,
      scope,
      page = 1,
      limit = 50,
      sort_by,
      sort_order,
    } = req.query;

    const userRoles = req.userRoles || [];
    const isOwnerOrAdmin =
      userRoles.includes('SUPER_ADMIN') ||
      userRoles.includes('TRANSPORT_OWNER') ||
      userRoles.includes('ADMIN') ||
      Boolean(req.user?.is_owner);
    const userBranchId = req.user?.branch_id || req.user?.branch?.id || null;

    // Retrieve all active branches for smart routing, branch summary, and proximity matching
    const allBranches = Branch
      ? await Branch.findAll({
          where: { organization_id: req.tenant.organizationId },
          attributes: ['id', 'branch_name', 'branch_code', 'city', 'pincode', 'is_hub', 'max_customer_credit_limit'],
        }).catch(() => [])
      : [];

    const userBranch = userBranchId ? allBranches.find((b) => b.id === userBranchId) : null;

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      [Op.and]: [
        {
          [Op.or]: [
            { is_walkin: false },
            { is_walkin: null },
          ],
        },
        {
          customer_code: { [Op.notLike]: 'WALKIN-%' },
        },
      ],
    };

    if (type && type !== 'ALL') {
      where.customer_type = type;
    }

    if (billing_type === 'TBB') {
      where.credit_limit = { [Op.gt]: 0 };
    } else if (billing_type === 'SPOT' || billing_type === 'NORMAL') {
      where[Op.or] = [{ credit_limit: 0 }, { credit_limit: null }];
    }

    // Role-specific filtering: Branch Managers ONLY show their branch customers related to their branch on CRM,
    // UNLESS querying with scope=all/global (e.g. for booking Consignee receiver selection across all branches).
    const isGlobalScope = scope === 'all' || scope === 'global' || req.query.all === 'true' || req.query.for_booking === 'true';
    if (!isGlobalScope && !isOwnerOrAdmin && userBranch) {
      const pinPrefix = userBranch.pincode ? String(userBranch.pincode).trim().slice(0, 3) : '';
      const branchCity = (userBranch.city || '').trim().toLowerCase();

      const territoryConditions = [{ branch_id: userBranch.id }];
      if (pinPrefix) {
        territoryConditions.push({ pincode: { [Op.like]: `${pinPrefix}%` } });
      }
      if (branchCity) {
        territoryConditions.push({ city: { [Op.like]: `%${branchCity}%` } });
      }

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({ [Op.or]: territoryConditions });
    } else if (branch_id && branch_id !== 'ALL') {
      where.branch_id = branch_id;
    }

    if (search) {
      const searchCondition = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { customer_code: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } },
          { pincode: { [Op.like]: `%${search}%` } },
        ],
      };
      if (where[Op.and]) {
        where[Op.and].push(searchCondition);
      } else {
        where[Op.and] = [searchCondition];
      }
    }

    const allowedSortCols = {
      name: 'name',
      customer_code: 'customer_code',
      city: 'city',
      pincode: 'pincode',
      phone: 'phone',
      credit_limit: 'credit_limit',
      current_balance: 'current_balance',
      customer_type: 'customer_type',
      created_at: 'created_at',
    };
    const orderCol = allowedSortCols[sort_by] || 'name';
    const orderDir = (sort_order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limit;
    const include = [];
    if (Branch && Customer.associations?.branch) {
      include.push({
        model: Branch,
        as: 'branch',
        attributes: ['id', 'branch_name', 'branch_code', 'city', 'pincode', 'is_hub', 'max_customer_credit_limit'],
        required: false,
      });
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[orderCol, orderDir]],
      include,
    });

    // Calculate unbilled TBB dockets for all customers on this page
    const customerIds = rows.map((r) => r.id);
    const unbilledTbbMap = {};

    if (Consignment && customerIds.length > 0) {
      const unbilledDockets = await Consignment.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          payment_type: { [Op.in]: ['TBB', 'CREDIT'] },
          is_billed: false,
          status: { [Op.ne]: 'CANCELLED' },
          [Op.or]: [
            { consignor_id: { [Op.in]: customerIds } },
            { consignee_id: { [Op.in]: customerIds } },
          ],
        },
        attributes: ['id', 'consignor_id', 'consignee_id', 'total_amount', 'freight_amount'],
        raw: true,
      }).catch(() => []);

      for (const d of unbilledDockets) {
        const amt = parseFloat(d.total_amount || d.freight_amount || 0);
        if (d.consignor_id && customerIds.includes(d.consignor_id)) {
          unbilledTbbMap[d.consignor_id] = (unbilledTbbMap[d.consignor_id] || 0) + amt;
        } else if (d.consignee_id && customerIds.includes(d.consignee_id)) {
          unbilledTbbMap[d.consignee_id] = (unbilledTbbMap[d.consignee_id] || 0) + amt;
        }
      }
    }

    // Automatically resolve nearest branch and proximity indicators
    for (const row of rows) {
      if (!row.branch && (row.pincode || row.city) && allBranches.length > 0) {
        const nearest = findNearestBranch(row.pincode, row.city, allBranches);
        if (nearest) {
          row.setDataValue('branch', nearest);
        }
      }

      // Check proximity to logged-in user's branch
      let isNearBranch = false;
      let proximityLabel = null;
      if (userBranch) {
        const userPin = userBranch.pincode ? String(userBranch.pincode).trim() : '';
        const rowPin = row.pincode ? String(row.pincode).trim() : '';
        const userCity = (userBranch.city || '').toLowerCase();
        const rowCity = (row.city || '').toLowerCase();

        if (row.branch_id === userBranch.id || (row.branch && row.branch.id === userBranch.id)) {
          isNearBranch = true;
          proximityLabel = `Assigned to ${userBranch.branch_name}`;
        } else if (userPin && rowPin && userPin === rowPin) {
          isNearBranch = true;
          proximityLabel = `Exact PIN Match (${rowPin})`;
        } else if (userPin && rowPin && userPin.slice(0, 3) === rowPin.slice(0, 3)) {
          isNearBranch = true;
          proximityLabel = `Nearby District PIN (${rowPin})`;
        } else if (userCity && rowCity && (userCity.includes(rowCity) || rowCity.includes(userCity))) {
          isNearBranch = true;
          proximityLabel = `Nearby City (${row.city})`;
        }
      }
      row.setDataValue('is_near_branch', isNearBranch);
      row.setDataValue('proximity_label', proximityLabel);

      // Attach revolving credit metrics (reflecting both unbilled TBB dockets and billed ledger balance)
      const limitVal = parseFloat(row.credit_limit || 0);
      const billedBalance = parseFloat(row.current_balance || 0);
      const unbilledTbb = unbilledTbbMap[row.id] || 0;
      const totalUsed = billedBalance + unbilledTbb;
      const available = Math.max(0, limitVal - totalUsed);
      const branchCap = row.branch?.max_customer_credit_limit ? parseFloat(row.branch.max_customer_credit_limit) : 1000000;
      const isHoTier = limitVal > branchCap;

      row.setDataValue('outstanding_freight', totalUsed);
      row.setDataValue('unbilled_tbb_freight', unbilledTbb);
      row.setDataValue('billed_balance', billedBalance);
      row.setDataValue('available_credit', available);
      row.setDataValue('branch_cap', branchCap);
      row.setDataValue('credit_cap_tier', limitVal > 0 ? (isHoTier ? 'HO_CAP' : 'BRANCH_CAP') : null);
    }

    // Organization-wide summary metrics for Admin and Branch Manager insight
    const allOrgCustomers = await Customer.findAll({
      where: {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        [Op.and]: [
          {
            [Op.or]: [
              { is_walkin: false },
              { is_walkin: null },
            ],
          },
          {
            customer_code: { [Op.notLike]: 'WALKIN-%' },
          },
        ],
      },
      attributes: ['id', 'customer_type', 'branch_id', 'pincode', 'city', 'credit_limit'],
      raw: true,
    }).catch(() => []);

    const scopedCustomersForStats = (!isOwnerOrAdmin && userBranch)
      ? allOrgCustomers.filter((c) => {
          if (c.branch_id === userBranch.id) return true;
          const pinPrefix = userBranch.pincode ? String(userBranch.pincode).trim().slice(0, 3) : '';
          if (pinPrefix && String(c.pincode || '').startsWith(pinPrefix)) return true;
          const branchCity = (userBranch.city || '').trim().toLowerCase();
          if (branchCity && (c.city || '').toLowerCase().includes(branchCity)) return true;
          return false;
        })
      : allOrgCustomers;

    let tbbCount = 0;
    let normalCount = 0;
    let totalCredit = 0;
    const branchBreakdown = {};

    for (const c of scopedCustomersForStats) {
      const cLimit = parseFloat(c.credit_limit || 0);
      if (cLimit > 0) {
        tbbCount++;
        totalCredit += cLimit;
      } else {
        normalCount++;
      }
    }

    for (const c of allOrgCustomers) {
      const cLimit = parseFloat(c.credit_limit || 0);
      const bKey = c.branch_id || 'UNASSIGNED';
      if (!branchBreakdown[bKey]) {
        branchBreakdown[bKey] = { count: 0, tbb_count: 0, total_credit: 0 };
      }
      branchBreakdown[bKey].count++;
      if (cLimit > 0) {
        branchBreakdown[bKey].tbb_count++;
        branchBreakdown[bKey].total_credit += cLimit;
      }
    }

    const branchStats = allBranches.map((b) => ({
      branch_id: b.id,
      branch_name: b.branch_name,
      branch_code: b.branch_code,
      city: b.city,
      pincode: b.pincode,
      is_hub: b.is_hub,
      max_customer_credit_limit: parseFloat(b.max_customer_credit_limit || 1000000),
      customer_count: branchBreakdown[b.id]?.count || 0,
      tbb_customer_count: branchBreakdown[b.id]?.tbb_count || 0,
      total_credit_limit: branchBreakdown[b.id]?.total_credit || 0,
    }));

    return paginatedResponse(res, 'Customers fetched', rows, {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / limit),
      meta: {
        total_customers: scopedCustomersForStats.length,
        tbb_customers_count: tbbCount,
        normal_customers_count: normalCount,
        spot_customers_count: normalCount,
        total_credit_assigned: totalCredit,
        branch_stats: branchStats,
        user_branch: userBranch
          ? {
              id: userBranch.id,
              branch_name: userBranch.branch_name,
              branch_code: userBranch.branch_code,
              pincode: userBranch.pincode,
              city: userBranch.city,
              max_customer_credit_limit: parseFloat(userBranch.max_customer_credit_limit || 1000000),
            }
          : null,
        is_branch_manager: !isOwnerOrAdmin && Boolean(userBranchId),
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getCustomer = async (req, res) => {
  try {
    const { Customer, CustomerAddress, RateContract, CustomerLedger, Branch, Consignment } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const includeList = [];
    if (CustomerAddress) includeList.push({ model: CustomerAddress, as: 'addresses' });
    if (RateContract) includeList.push({ model: RateContract, as: 'rateContracts' });
    if (Branch && Customer.associations?.branch) {
      includeList.push({
        model: Branch,
        as: 'branch',
        attributes: ['id', 'branch_name', 'branch_code', 'city', 'pincode', 'is_hub'],
        required: false,
      });
    }
    if (CustomerLedger) {
      includeList.push({
        model: CustomerLedger,
        as: 'ledgerEntries',
        limit: 20,
        order: [['entry_date', 'DESC']],
      });
    }

    const customer = await Customer.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include: includeList,
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', null, 404);
    }

    const limitVal = parseFloat(customer.credit_limit || 0);
    const billedBalance = parseFloat(customer.current_balance || 0);
    let unbilledTbb = 0;
    if (Consignment) {
      const dockets = await Consignment.findAll({
        where: {
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          payment_type: { [Op.in]: ['TBB', 'CREDIT'] },
          is_billed: false,
          status: { [Op.ne]: 'CANCELLED' },
          [Op.or]: [{ consignor_id: id }, { consignee_id: id }],
        },
        attributes: ['total_amount', 'freight_amount'],
        raw: true,
      }).catch(() => []);
      unbilledTbb = dockets.reduce((sum, d) => sum + parseFloat(d.total_amount || d.freight_amount || 0), 0);
    }
    const totalUsed = billedBalance + unbilledTbb;
    const available = Math.max(0, limitVal - totalUsed);

    customer.setDataValue('outstanding_freight', totalUsed);
    customer.setDataValue('unbilled_tbb_freight', unbilledTbb);
    customer.setDataValue('billed_balance', billedBalance);
    customer.setDataValue('available_credit', available);

    return successResponse(res, 'Customer details fetched', customer);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createCustomer = async (req, res) => {
  try {
    const { Customer } = req.tenantDb || defaultModels;
    const {
      name,
      phone,
      city,
      state,
      pincode,
      branch_id,
      gstin,
      customer_type,
      billing_address,
      credit_limit,
      credit_days,
    } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Company / Party name is required', null, 400);
    }

    // Strict 10-digit Indian phone validation (extract last 10 digits if country code is attached)
    const rawDigits = (phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;

    if (cleanPhone.length !== 10) {
      return errorResponse(res, 'Contact phone must be exactly 10 digits (e.g. 9811122233)', null, 400);
    }

    // Clean 6-digit Pincode
    const cleanPincode = (pincode || '').replace(/\D/g, '').slice(0, 6);

    let finalBranchId = branch_id || req.user?.branch_id || null;
    if (!finalBranchId && Branch) {
      const allBranches = await Branch.findAll({
        where: { organization_id: req.tenant.organizationId },
        attributes: ['id', 'branch_name', 'branch_code', 'city', 'pincode', 'is_hub'],
      }).catch(() => []);
      const matched = findNearestBranch(cleanPincode, city, allBranches);
      if (matched) finalBranchId = matched.id;
    }

    const count = await Customer.count({ where: { organization_id: req.tenant.organizationId } });
    const customerCode = `CUST-${String(count + 1).padStart(4, '0')}`;

    const parsedLimit = parseFloat(credit_limit || 0);
    const parsedDays = parseInt(credit_days || 30, 10);

    const userRoles = req.userRoles || [];
    const isOwnerOrAdmin = userRoles.includes('SUPER_ADMIN') ||
      userRoles.includes('TRANSPORT_OWNER') ||
      userRoles.includes('ADMIN') ||
      Boolean(req.user?.is_owner);

    // Dynamic Branch Credit Limit: Branch Managers can authorize up to their branch's configured limit (default ₹10 Lakhs). Head Office can authorize up to ₹50 Lakhs+
    if (!isOwnerOrAdmin && parsedLimit > 0) {
      const { Branch } = req.tenantDb || defaultModels;
      let branchCap = 1000000;
      let branchName = 'this branch';

      if (finalBranchId && Branch) {
        const branchRecord = await Branch.findByPk(finalBranchId);
        if (branchRecord) {
          branchName = branchRecord.branch_name;
          if (branchRecord.max_customer_credit_limit) {
            branchCap = parseFloat(branchRecord.max_customer_credit_limit);
          }
        }
      }

      if (parsedLimit > branchCap) {
        return errorResponse(
          res,
          `Branch Managers at "${branchName}" are authorized up to ₹${branchCap.toLocaleString('en-IN')}. For higher credit limits (up to ₹50 Lakhs), Head Office / Admin authorization is required. You can request Admin to increase this branch's authorization limit.`,
          null,
          403
        );
      }
    }

    const customer = await Customer.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      customer_code: customerCode,
      name: name.trim(),
      phone: cleanPhone,
      city: (city || '').trim() || null,
      state: (state || '').trim() || null,
      pincode: cleanPincode || null,
      branch_id: finalBranchId,
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      customer_type: customer_type || 'BOTH',
      billing_address: (billing_address || '').trim() || null,
      credit_limit: parsedLimit,
      credit_days: parsedDays,
    });

    try {
      const { logAudit } = require('../middleware/auditLogger');
      logAudit({
        req,
        action: 'CREATE',
        entityType: 'CUSTOMER',
        entityId: customer.customer_code,
        entityName: customer.name,
        summary: `Registered new customer ${customer.name} (City: ${customer.city || 'N/A'}, PIN: ${cleanPincode || 'N/A'}, Phone: +91 ${cleanPhone})`,
        newValues: customer.toJSON ? customer.toJSON() : customer,
      });
    } catch (e) {}

    return successResponse(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { Customer } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const {
      name,
      phone,
      city,
      state,
      pincode,
      branch_id,
      gstin,
      customer_type,
      billing_address,
      status,
      credit_limit,
      credit_days,
    } = req.body;

    const customer = await Customer.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', null, 404);
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return errorResponse(res, 'Company / Party name is required', null, 400);
      }
      customer.name = name.trim();
    }

    if (phone !== undefined) {
      const rawDigits = (phone || '').replace(/\D/g, '');
      const cleanPhone = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
      if (cleanPhone.length !== 10) {
        return errorResponse(res, 'Contact phone must be exactly 10 digits (e.g. 9811122233)', null, 400);
      }
      customer.phone = cleanPhone;
    }

    if (city !== undefined) customer.city = (city || '').trim() || null;
    if (state !== undefined) customer.state = (state || '').trim() || null;
    if (pincode !== undefined) {
      const cleanPincode = (pincode || '').replace(/\D/g, '').slice(0, 6);
      customer.pincode = cleanPincode || null;
    }
    if (branch_id !== undefined) {
      if (branch_id) {
        customer.branch_id = branch_id;
      } else {
        const { Branch } = req.tenantDb || defaultModels;
        if (Branch) {
          const allBranches = await Branch.findAll({
            where: { organization_id: req.tenant.organizationId },
            attributes: ['id', 'branch_name', 'branch_code', 'city', 'pincode', 'is_hub'],
          }).catch(() => []);
          const matched = findNearestBranch(customer.pincode, customer.city, allBranches);
          customer.branch_id = matched ? matched.id : null;
        } else {
          customer.branch_id = null;
        }
      }
    }
    if (gstin !== undefined) customer.gstin = gstin ? gstin.trim().toUpperCase() : null;
    if (customer_type !== undefined) customer.customer_type = customer_type;
    if (billing_address !== undefined) customer.billing_address = (billing_address || '').trim() || null;
    if (status !== undefined) customer.status = status;
    if (credit_limit !== undefined) {
      const parsedLimit = parseFloat(credit_limit || 0);
      const userRoles = req.userRoles || [];
      const isOwnerOrAdmin = userRoles.includes('SUPER_ADMIN') ||
        userRoles.includes('TRANSPORT_OWNER') ||
        userRoles.includes('ADMIN') ||
        Boolean(req.user?.is_owner);

      if (!isOwnerOrAdmin && parsedLimit > 0) {
        const { Branch } = req.tenantDb || defaultModels;
        let branchCap = 1000000;
        let branchName = 'this branch';
        const targetBranchId = customer.branch_id;

        if (targetBranchId && Branch) {
          const branchRecord = await Branch.findByPk(targetBranchId);
          if (branchRecord) {
            branchName = branchRecord.branch_name;
            if (branchRecord.max_customer_credit_limit) {
              branchCap = parseFloat(branchRecord.max_customer_credit_limit);
            }
          }
        }

        if (parsedLimit > branchCap) {
          return errorResponse(
            res,
            `Branch Managers at "${branchName}" are authorized up to ₹${branchCap.toLocaleString('en-IN')}. For higher credit limits (up to ₹50 Lakhs), Head Office / Admin authorization is required.`,
            null,
            403
          );
        }
      }
      customer.credit_limit = parsedLimit;
    }
    if (credit_days !== undefined) customer.credit_days = parseInt(credit_days || 0, 10);

    await customer.save();

    try {
      const { logAudit } = require('../middleware/auditLogger');
      logAudit({
        req,
        action: 'UPDATE',
        entityType: 'CUSTOMER',
        entityId: customer.customer_code,
        entityName: customer.name,
        summary: `Updated customer details for ${customer.name} (${customer.customer_code})`,
        newValues: customer.toJSON ? customer.toJSON() : customer,
      });
    } catch (e) {}

    return successResponse(res, 'Customer updated successfully', customer);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { Customer, Consignment } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const customer = await Customer.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', null, 404);
    }

    // Safety check: is customer linked to active bookings / consignments?
    if (Consignment) {
      const activeConsignments = await Consignment.count({
        where: {
          [Op.or]: [
            { consignor_id: customer.id },
            { consignee_id: customer.id },
          ],
        },
      });

      if (activeConsignments > 0) {
        return errorResponse(
          res,
          `Cannot delete customer '${customer.name}' (${customer.customer_code}). It is linked to ${activeConsignments} consignment/docket record(s). You can edit details or mark as inactive instead.`,
          null,
          400
        );
      }
    }

    const customerCode = customer.customer_code;
    const customerName = customer.name;

    await customer.destroy();

    try {
      const { logAudit } = require('../middleware/auditLogger');
      logAudit({
        req,
        action: 'DELETE',
        entityType: 'CUSTOMER',
        entityId: customerCode,
        entityName: customerName,
        summary: `Deleted customer ${customerName} (${customerCode})`,
      });
    } catch (e) {}

    return successResponse(res, 'Customer deleted successfully', {
      id,
      customer_code: customerCode,
      name: customerName,
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
