// src/controllers/customerController.js
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

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
      branch_id: branch_id || null,
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

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
};
