// src/controllers/branchController.js
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

const listBranches = async (req, res) => {
  try {
    const { Branch } = req.tenantDb || defaultModels;
    if (!Branch) {
      return successResponse(res, 'Branches fetched', []);
    }

    const { search, is_hub, is_active, page = 1, limit = 50, all } = req.query;
    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    if (is_hub !== undefined && is_hub !== '') {
      where.is_hub = is_hub === 'true' || is_hub === true || is_hub === '1';
    }

    if (is_active !== undefined && is_active !== '') {
      where.is_active = is_active === 'true' || is_active === true || is_active === '1';
    }

    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { branch_name: { [Op.like]: `%${q}%` } },
        { branch_code: { [Op.like]: `%${q}%` } },
        { city: { [Op.like]: `%${q}%` } },
        { state: { [Op.like]: `%${q}%` } },
        { pincode: { [Op.like]: `%${q}%` } },
      ];
    }

    if (all === 'true' || all === true) {
      const branches = await Branch.findAll({
        where,
        order: [['is_hub', 'DESC'], ['branch_name', 'ASC']],
      });
      return successResponse(res, 'All branches fetched', branches);
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Branch.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['is_hub', 'DESC'], ['branch_name', 'ASC']],
    });

    return paginatedResponse(res, 'Branches fetched', rows, {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getBranch = async (req, res) => {
  try {
    const { Branch } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const branch = await Branch.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!branch) {
      return errorResponse(res, 'Branch not found', null, 404);
    }

    return successResponse(res, 'Branch details fetched', branch);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createBranch = async (req, res) => {
  try {
    const { Branch } = req.tenantDb || defaultModels;
    const {
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      is_hub,
      is_active,
    } = req.body;

    if (!branch_name || !city || !state) {
      return errorResponse(res, 'Branch Name, City, and State are required', null, 400);
    }

    if (!pincode || !pincode.trim()) {
      return errorResponse(res, 'Pincode is mandatory for branch and delivery routing', null, 400);
    }

    if (!branch_code || !branch_code.trim()) {
      return errorResponse(res, 'Branch Code is mandatory (e.g. BOKH for Balaji Logistic - Okhla)', null, 400);
    }

    const finalCode = branch_code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (finalCode.length < 2) {
      return errorResponse(res, 'Branch Code must be at least 2 characters (e.g. BOKH)', null, 400);
    }

    // Check code duplication in the organization
    const existing = await Branch.findOne({
      where: {
        organization_id: req.tenant.organizationId,
        branch_code: finalCode,
      },
    });
    if (existing) {
      return errorResponse(res, `Branch Code "${finalCode}" is already in use by "${existing.branch_name}". Please choose a unique code.`, null, 400);
    }

    const branch = await Branch.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      branch_code: finalCode,
      branch_name: branch_name.trim(),
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      address: address ? address.trim() : null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode ? pincode.trim() : null,
      is_hub: is_hub === true || is_hub === 'true' || is_hub === 1,
      is_active: is_active !== false && is_active !== 'false',
    });

    return successResponse(res, `${branch.is_hub ? 'Hub' : 'Branch'} created successfully`, branch, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateBranch = async (req, res) => {
  try {
    const { Branch } = req.tenantDb || defaultModels;
    const { id } = req.params;
    const {
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      is_hub,
      is_active,
    } = req.body;

    const branch = await Branch.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!branch) {
      return errorResponse(res, 'Branch not found', null, 404);
    }

    if (branch_code && branch_code.trim().toUpperCase() !== branch.branch_code) {
      const codeCheck = await Branch.findOne({
        where: {
          organization_id: req.tenant.organizationId,
          branch_code: branch_code.trim().toUpperCase(),
          id: { [Op.ne]: id },
        },
      });
      if (codeCheck) {
        return errorResponse(res, `Branch Code "${branch_code}" is already in use by another branch`, null, 400);
      }
      branch.branch_code = branch_code.trim().toUpperCase();
    }

    if (branch_name !== undefined) branch.branch_name = branch_name.trim();
    if (phone !== undefined) branch.phone = phone ? phone.trim() : null;
    if (email !== undefined) branch.email = email ? email.trim() : null;
    if (address !== undefined) branch.address = address ? address.trim() : null;
    if (city !== undefined) branch.city = city.trim();
    if (state !== undefined) branch.state = state.trim();
    if (pincode !== undefined) branch.pincode = pincode ? pincode.trim() : null;
    if (is_hub !== undefined) branch.is_hub = is_hub === true || is_hub === 'true' || is_hub === 1;
    if (is_active !== undefined) branch.is_active = is_active === true || is_active === 'true' || is_active === 1;

    await branch.save();

    return successResponse(res, `${branch.is_hub ? 'Hub' : 'Branch'} updated successfully`, branch);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const deleteBranch = async (req, res) => {
  try {
    const { Branch, Consignment, Trip } = req.tenantDb || defaultModels;
    const { id } = req.params;

    const branch = await Branch.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!branch) {
      return errorResponse(res, 'Branch not found', null, 404);
    }

    // Safety check: is it referenced in active consignments?
    if (Consignment) {
      const activeBookings = await Consignment.count({
        where: {
          [Op.or]: [{ origin_branch_id: id }, { dest_branch_id: id }, { current_branch_id: id }],
        },
      });
      if (activeBookings > 0) {
        return errorResponse(
          res,
          `Cannot delete branch "${branch.branch_name}" because it is linked to ${activeBookings} consignment(s). You can mark it Inactive instead.`,
          null,
          400
        );
      }
    }

    await branch.destroy();
    return successResponse(res, 'Branch deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
};
