// src/controllers/organizationController.js
const { Organization, Branch } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getOrganizationProfile = async (req, res) => {
  try {
    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const BranchModel = req.tenantDb?.Branch;
    const org = await OrganizationModel.findByPk(req.tenant.organizationId, {
      include: BranchModel ? [{ model: BranchModel, as: 'branches' }] : [],
    });
    return successResponse(res, 'Organization profile retrieved', org);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateTerminology = async (req, res) => {
  try {
    const { terminology } = req.body;
    const valid = ['Bilty', 'LR', 'GR', 'Docket', 'Consignment Note', 'Custom'];
    if (!terminology || !valid.includes(terminology)) {
      return errorResponse(res, `Invalid terminology. Must be one of: ${valid.join(', ')}`, null, 400);
    }

    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const org = await OrganizationModel.findByPk(req.tenant.organizationId);
    if (org) {
      await org.update({ document_terminology: terminology });
    }

    return successResponse(res, `Document terminology updated to ${terminology}`, org);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const listBranches = async (req, res) => {
  try {
    const BranchModel = req.tenantDb?.Branch;
    if (!BranchModel) {
      return successResponse(res, 'Branches fetched', []);
    }
    const branches = await BranchModel.findAll({
      where: { organization_id: req.tenant.organizationId },
      order: [['branch_name', 'ASC']],
    });
    return successResponse(res, 'Branches fetched', branches);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  getOrganizationProfile,
  updateTerminology,
  listBranches,
};
