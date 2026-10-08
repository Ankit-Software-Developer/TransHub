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

const { getNextNumberPreview, getFinancialYear } = require('../services/numberSequenceService');

const getDocketSeries = async (req, res) => {
  try {
    const preview = await getNextNumberPreview({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      models: req.tenantDb,
    });
    return successResponse(res, 'Docket series preview retrieved', preview);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateDocketSeries = async (req, res) => {
  try {
    const { prefix, startingNumber, sequenceLength } = req.body;
    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const NumberSequenceModel = req.tenantDb?.NumberSequence;

    const org = await OrganizationModel.findByPk(req.tenant.organizationId);
    if (!org) return errorResponse(res, 'Organization not found', null, 404);

    const cleanPrefix = (prefix || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanPrefix || cleanPrefix.length < 2 || cleanPrefix.length > 8) {
      return errorResponse(res, 'Prefix must be between 2 and 8 alphanumeric characters (e.g. BAL, DWB)', null, 400);
    }

    const seqLen = Math.max(6, parseInt(sequenceLength, 10) || 6);
    const startNum = parseInt(startingNumber, 10);

    const updatedSettings = {
      ...(org.settings || {}),
      docketSeries: {
        prefix: cleanPrefix,
        sequenceLength: seqLen,
        template: '{PREFIX}{SEQ}',
      },
    };

    await org.update({ settings: updatedSettings });

    // Update existing NumberSequence records for BILTY
    if (NumberSequenceModel) {
      const fy = getFinancialYear();
      const updateData = {
        prefix: cleanPrefix,
        sequence_length: seqLen,
        template: '{PREFIX}{SEQ}',
      };
      if (!isNaN(startNum) && startNum >= 0) {
        updateData.current_number = Math.max(0, startNum - 1);
      }

      const [seq, created] = await NumberSequenceModel.findOrCreate({
        where: {
          organization_id: req.tenant.organizationId,
          document_type: 'BILTY',
          financial_year: fy,
        },
        defaults: {
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          document_type: 'BILTY',
          financial_year: fy,
          prefix: cleanPrefix,
          current_number: !isNaN(startNum) && startNum >= 0 ? Math.max(0, startNum - 1) : 0,
          sequence_length: seqLen,
          template: '{PREFIX}{SEQ}',
        },
      });

      if (!created) {
        await seq.update(updateData);
      }
    }

    const preview = await getNextNumberPreview({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      models: req.tenantDb,
    });

    return successResponse(res, 'Docket series configuration updated successfully', preview);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getTripSeries = async (req, res) => {
  try {
    const preview = await getNextNumberPreview({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      documentType: 'TRIP',
      models: req.tenantDb,
    });
    return successResponse(res, 'Trip series preview retrieved', preview);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateTripSeries = async (req, res) => {
  try {
    const { prefix, startingNumber, sequenceLength } = req.body;
    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const NumberSequenceModel = req.tenantDb?.NumberSequence;
    const currentYear = String(new Date().getFullYear());

    const org = await OrganizationModel.findByPk(req.tenant.organizationId);
    if (!org) return errorResponse(res, 'Organization not found', null, 404);

    const cleanPrefix = (prefix || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'TRP';
    if (cleanPrefix.length < 2 || cleanPrefix.length > 8) {
      return errorResponse(res, 'Prefix must be between 2 and 8 alphanumeric characters (e.g. TRP)', null, 400);
    }

    const seqLen = Math.max(3, parseInt(sequenceLength, 10) || 3);
    const startNum = parseInt(startingNumber, 10);

    const updatedSettings = {
      ...(org.settings || {}),
      tripSeries: {
        prefix: cleanPrefix,
        sequenceLength: seqLen,
        template: '{PREFIX}-{YEAR}-{SEQ}',
      },
    };

    await org.update({ settings: updatedSettings });

    // Update existing NumberSequence records for TRIP
    if (NumberSequenceModel) {
      const updateData = {
        prefix: cleanPrefix,
        sequence_length: seqLen,
        template: '{PREFIX}-{YEAR}-{SEQ}',
        financial_year: currentYear,
      };
      if (!isNaN(startNum) && startNum >= 0) {
        updateData.current_number = Math.max(0, startNum - 1);
      }

      const seq = await NumberSequenceModel.findOne({
        where: {
          organization_id: req.tenant.organizationId,
          document_type: 'TRIP',
        },
      });

      if (seq) {
        await seq.update(updateData);
      } else {
        await NumberSequenceModel.create({
          tenant_id: req.tenant.tenantId,
          organization_id: req.tenant.organizationId,
          branch_id: null,
          document_type: 'TRIP',
          ...updateData,
          current_number: !isNaN(startNum) && startNum >= 0 ? Math.max(0, startNum - 1) : 0,
        });
      }
    }

    const preview = await getNextNumberPreview({
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      documentType: 'TRIP',
      models: req.tenantDb,
    });

    return successResponse(res, 'Trip series format updated successfully', preview);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const getBranchSeries = async (req, res) => {
  try {
    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const org = await OrganizationModel.findByPk(req.tenant.organizationId);
    const branchPrefix = org?.settings?.branchPrefix || (org?.business_name ? org.business_name.trim().charAt(0).toUpperCase() : 'B');
    return successResponse(res, 'Branch series retrieved', {
      prefix: branchPrefix,
      organizationName: org?.business_name || '',
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateBranchSeries = async (req, res) => {
  try {
    const { prefix } = req.body;
    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const org = await OrganizationModel.findByPk(req.tenant.organizationId);
    if (!org) return errorResponse(res, 'Organization not found', null, 404);

    const cleanPrefix = (prefix || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'B';
    if (cleanPrefix.length < 1 || cleanPrefix.length > 5) {
      return errorResponse(res, 'Branch Prefix must be between 1 and 5 alphanumeric characters (e.g. B or BAL)', null, 400);
    }

    const updatedSettings = {
      ...(org.settings || {}),
      branchPrefix: cleanPrefix,
    };

    await org.update({ settings: updatedSettings });

    return successResponse(res, 'Company Branch Code Prefix updated successfully', {
      prefix: cleanPrefix,
    });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  getOrganizationProfile,
  updateTerminology,
  listBranches,
  getDocketSeries,
  updateDocketSeries,
  getTripSeries,
  updateTripSeries,
  getBranchSeries,
  updateBranchSeries,
};

