// src/controllers/customerController.js
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

const listCustomers = async (req, res) => {
  try {
    const { Customer } = req.tenantDb || defaultModels;
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
      ];
    }

    const allowedSortCols = {
      name: 'name',
      customer_code: 'customer_code',
      city: 'city',
      phone: 'phone',
      credit_limit: 'credit_limit',
      current_balance: 'current_balance',
      customer_type: 'customer_type',
      created_at: 'created_at',
    };
    const orderCol = allowedSortCols[sort_by] || 'name';
    const orderDir = (sort_order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limit;
    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[orderCol, orderDir]],
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
    const { Customer, CustomerAddress, RateContract, CustomerLedger } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const includeList = [];
    if (CustomerAddress) includeList.push({ model: CustomerAddress, as: 'addresses' });
    if (RateContract) includeList.push({ model: RateContract, as: 'rateContracts' });
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
    const { name, phone, city, gstin, customer_type, billing_address, credit_limit, credit_days } = req.body;
    if (!name || !phone) {
      return errorResponse(res, 'Customer name and phone are required', null, 400);
    }

    const count = await Customer.count({ where: { organization_id: req.tenant.organizationId } });
    const customerCode = `CUST-${String(count + 1).padStart(4, '0')}`;

    const customer = await Customer.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      customer_code: customerCode,
      name,
      phone,
      city,
      gstin,
      customer_type: customer_type || 'BOTH',
      billing_address,
      credit_limit: parseFloat(credit_limit || 0),
      credit_days: parseInt(credit_days || 30, 10),
    });

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
