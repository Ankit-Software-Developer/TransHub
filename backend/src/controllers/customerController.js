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
    const { Customer, Branch } = req.tenantDb || defaultModels;
    const { search, type, page = 1, limit = 50, sort_by, sort_order } = req.query;
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    if (type) where.customer_type = type;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { customer_code: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { pincode: { [Op.like]: `%${search}%` } },
      ];
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
        attributes: ['id', 'branch_name', 'branch_code', 'city', 'pincode', 'is_hub'],
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

    // Automatically resolve nearest branch for customers without explicit branch
    if (Branch && rows.length > 0) {
      const allBranches = await Branch.findAll({
        where: { organization_id: req.tenant.organizationId },
        attributes: ['id', 'branch_name', 'branch_code', 'city', 'pincode', 'is_hub'],
      }).catch(() => []);

      if (allBranches.length > 0) {
        for (const row of rows) {
          if (!row.branch && (row.pincode || row.city)) {
            const nearest = findNearestBranch(row.pincode, row.city, allBranches);
            if (nearest) {
              row.setDataValue('branch', nearest);
            }
          }
        }
      }
    }

    return paginatedResponse(res, 'Customers fetched', rows, {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getCustomer = async (req, res) => {
  try {
    const { Customer, CustomerAddress, RateContract, CustomerLedger, Branch } = req.tenantDb || defaultModels;
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

    let finalBranchId = branch_id || null;
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
      credit_limit: parseFloat(credit_limit || 0),
      credit_days: parseInt(credit_days || 30, 10),
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
