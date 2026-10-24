// src/controllers/organizationController.js
const { Organization, Branch, SaaSSubscription, SaaSPlan, Tenant } = require('../models');
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

    // Also update in master DB Organization to keep master & auth token in sync
    const { Organization: MasterOrg } = require('../models');
    if (MasterOrg && OrganizationModel !== MasterOrg) {
      try {
        await MasterOrg.update(
          { document_terminology: terminology },
          { where: { id: req.tenant.organizationId } }
        );
      } catch (_) {}
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

const updateOrganizationProfile = async (req, res) => {
  try {
    const {
      businessName,
      legalName,
      tagline,
      gstin,
      pan,
      sacCode,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      logoUrl,
      bankName,
      accountNumber,
      ifscCode,
      bankBranch,
      accountHolderName,
      upiId,
      themeColor,
      transporterType,
      transporterSubType,
      settings: customSettings,
    } = req.body;

    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const org = await OrganizationModel.findByPk(req.tenant.organizationId);
    if (!org) {
      return errorResponse(res, 'Organization not found', null, 404);
    }

    const currentSettings = org.settings || {};
    // Verify Plan Tier Permission for Operation Mode Changes
    if (transporterType !== undefined || transporterSubType !== undefined) {
      const targetType = transporterType
        ? String(transporterType).toUpperCase().trim()
        : (currentSettings.transporterType || currentSettings.transporter_type || 'BOTH');
      const targetSubType = transporterSubType
        ? String(transporterSubType).toUpperCase().trim()
        : (currentSettings.transporterSubType || currentSettings.transporter_subtype || 'FLEET_SUPPLIER');

      let requiredPlan = 'BASIC';
      let requiredRank = 1;
      let requiredPrice = '₹500/mo';
      let targetLabel = 'Basic FTL';

      if (targetType === 'BOTH') {
        requiredPlan = 'ENTERPRISE';
        requiredRank = 3;
        requiredPrice = '₹2,000/mo';
        targetLabel = 'Both (FTL + PTL) Complete Suite';
      } else if (targetType === 'PTL') {
        requiredPlan = 'PRO';
        requiredRank = 2;
        requiredPrice = '₹1,000/mo';
        targetLabel = 'Part Truckload (PTL / Sundry)';
      } else if (targetType === 'FTL') {
        if (targetSubType === 'COMPLETE_FTL') {
          requiredPlan = 'PRO';
          requiredRank = 2;
          requiredPrice = '₹1,000/mo';
          targetLabel = 'Full-Service Enterprise FTL';
        } else {
          requiredPlan = 'BASIC';
          requiredRank = 1;
          requiredPrice = '₹500/mo';
          targetLabel = targetSubType === 'DIRECT_CARRIER' ? 'Direct Shipper Carrier' : 'Fleet Supplier / Vendor';
        }
      }

      let currentPlanCode = 'BASIC';
      try {
        const sub = await SaaSSubscription.findOne({
          where: { tenant_id: req.tenant.tenantId },
          order: [['created_at', 'DESC']],
        });
        if (sub) {
          const plan = await SaaSPlan.findByPk(sub.plan_id);
          if (plan?.plan_code) {
            currentPlanCode = plan.plan_code.toUpperCase();
          }
        }
      } catch (_) {}

      if (currentPlanCode === 'TRIAL') {
        currentPlanCode = (currentSettings.registered_plan || 'BASIC').toUpperCase();
      }

      const PLAN_RANKS = { BASIC: 1, PRO: 2, ENTERPRISE: 3 };
      const currentRank = PLAN_RANKS[currentPlanCode] || 1;

      const isSuperAdmin =
        req.userRoles?.includes('SUPER_ADMIN') ||
        req.user?.email?.toLowerCase() === 'admin@transporter.io';

      if (!isSuperAdmin && requiredRank > currentRank) {
        return errorResponse(
          res,
          `Plan upgrade required: Switching to ${targetLabel} requires the ${requiredPlan} plan (${requiredPrice}). Your workspace is currently on the ${currentPlanCode} tier. Please upgrade your subscription to switch operations mode.`,
          {
            upgradeRequired: true,
            requiredPlan,
            requiredRank,
            requiredPrice,
            currentPlan: currentPlanCode,
            currentRank,
            targetMode: targetLabel,
          },
          403
        );
      }
    }

    const updatedSettings = {
      ...currentSettings,
      ...(customSettings || {}),
      ...(tagline !== undefined ? { tagline: (tagline || '').trim() } : {}),
      ...(sacCode !== undefined ? { sacCode: (sacCode || '').trim() } : {}),
      ...(bankName !== undefined ? { bankName: (bankName || '').trim() } : {}),
      ...(accountNumber !== undefined ? { accountNumber: (accountNumber || '').trim() } : {}),
      ...(ifscCode !== undefined ? { ifscCode: (ifscCode || '').trim().toUpperCase() } : {}),
      ...(bankBranch !== undefined ? { bankBranch: (bankBranch || '').trim() } : {}),
      ...(accountHolderName !== undefined ? { accountHolderName: (accountHolderName || '').trim() } : {}),
      ...(upiId !== undefined ? { upiId: (upiId || '').trim() } : {}),
      ...(gstin !== undefined ? { gstin: (gstin || '').trim().toUpperCase() } : {}),
      ...(pan !== undefined ? { pan: (pan || '').trim().toUpperCase() } : {}),
      ...(themeColor !== undefined ? { themeColor } : {}),
      ...(transporterType !== undefined && ['FTL', 'PTL', 'BOTH'].includes(String(transporterType).toUpperCase().trim())
        ? {
            transporterType: String(transporterType).toUpperCase().trim(),
            transporter_type: String(transporterType).toUpperCase().trim(),
            ...(String(transporterType).toUpperCase().trim() !== 'FTL' ? {
              transporterSubType: null,
              transporter_subtype: null,
            } : {}),
          }
        : {}),
      ...(String(transporterType || currentSettings.transporterType || 'FTL').toUpperCase().trim() === 'FTL' && transporterSubType !== undefined && ['FLEET_SUPPLIER', 'DIRECT_CARRIER', 'COMPLETE_FTL'].includes(String(transporterSubType).toUpperCase().trim())
        ? {
            transporterSubType: String(transporterSubType).toUpperCase().trim(),
            transporter_subtype: String(transporterSubType).toUpperCase().trim(),
          }
        : {}),
    };

    const updateFields = {
      settings: updatedSettings,
    };
    if (businessName !== undefined) updateFields.business_name = (businessName || '').trim();
    if (legalName !== undefined) updateFields.legal_name = (legalName || '').trim();
    if (gstin !== undefined) updateFields.gstin = (gstin || '').trim().toUpperCase();
    if (pan !== undefined) updateFields.pan = (pan || '').trim().toUpperCase();
    if (email !== undefined) updateFields.email = (email || '').trim();
    if (phone !== undefined) updateFields.phone = (phone || '').trim();
    if (address !== undefined) updateFields.address = (address || '').trim();
    if (city !== undefined) updateFields.city = (city || '').trim();
    if (state !== undefined) updateFields.state = (state || '').trim();
    if (pincode !== undefined) updateFields.pincode = (pincode || '').trim();
    if (logoUrl !== undefined) updateFields.logo_url = logoUrl;

    await org.update(updateFields);

    // Also sync to Master DB Organization if distinct
    if (Organization && Organization !== OrganizationModel) {
      try {
        const masterOrg = await Organization.findByPk(req.tenant.organizationId);
        if (masterOrg) {
          await masterOrg.update(updateFields);
        }
      } catch (mErr) {
        console.warn('Could not sync to master organization:', mErr.message);
      }
    }

    return successResponse(res, 'Organization profile and tax/bank details updated successfully', org);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Transporter Admin: Upgrade Subscription Plan & Activate Operations Mode
 */
const upgradePlan = async (req, res) => {
  try {
    const { plan_code, billing_cycle = 'MONTHLY', transporterType, transporterSubType } = req.body;

    if (!plan_code) {
      return errorResponse(res, 'Target plan_code is required (e.g. PRO or ENTERPRISE)', null, 400);
    }

    const plan = await SaaSPlan.findOne({
      where: { plan_code: String(plan_code).toUpperCase().trim() },
    });
    if (!plan) {
      return errorResponse(res, `Plan '${plan_code}' not found`, null, 404);
    }

    const tenantId = req.tenant.tenantId;
    const organizationId = req.tenant.organizationId;

    let sub = await SaaSSubscription.findOne({
      where: { tenant_id: tenantId },
      order: [['created_at', 'DESC']],
    });

    const cycle = String(billing_cycle).toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    const amount = cycle === 'ANNUAL' ? plan.price_annual : plan.price_monthly;

    if (sub) {
      sub.plan_id = plan.id;
      sub.billing_cycle = cycle;
      sub.amount = amount;
      sub.status = 'ACTIVE';
      await sub.save();
    } else {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + (cycle === 'ANNUAL' ? 365 : 30));

      sub = await SaaSSubscription.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        plan_id: plan.id,
        billing_cycle: cycle,
        amount,
        status: 'ACTIVE',
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: periodEnd.toISOString().split('T')[0],
      });
    }

    // Update Organization settings in master and tenant DBs
    const targetType = transporterType ? String(transporterType).toUpperCase().trim() : undefined;
    const targetSubType = transporterSubType ? String(transporterSubType).toUpperCase().trim() : undefined;

    const OrganizationModel = req.tenantDb?.Organization || Organization;
    const org = await OrganizationModel.findByPk(organizationId);

    if (org) {
      const prevSettings = typeof org.settings === 'object' && org.settings !== null ? { ...org.settings } : {};
      prevSettings.registered_plan = plan.plan_code;
      if (targetType) {
        prevSettings.transporterType = targetType;
        prevSettings.transporter_type = targetType;
      }
      if (targetSubType) {
        prevSettings.transporterSubType = targetType === 'FTL' ? targetSubType : null;
        prevSettings.transporter_subtype = targetType === 'FTL' ? targetSubType : null;
      } else if (targetType && targetType !== 'FTL') {
        prevSettings.transporterSubType = null;
        prevSettings.transporter_subtype = null;
      }
      org.settings = prevSettings;
      await org.save();
    }

    // Also update in master DB Organization if distinct
    if (Organization && Organization !== OrganizationModel) {
      try {
        const masterOrg = await Organization.findByPk(organizationId);
        if (masterOrg) {
          const mPrev = typeof masterOrg.settings === 'object' && masterOrg.settings !== null ? { ...masterOrg.settings } : {};
          mPrev.registered_plan = plan.plan_code;
          if (targetType) {
            mPrev.transporterType = targetType;
            mPrev.transporter_type = targetType;
          }
          if (targetSubType) {
            mPrev.transporterSubType = targetType === 'FTL' ? targetSubType : null;
            mPrev.transporter_subtype = targetType === 'FTL' ? targetSubType : null;
          } else if (targetType && targetType !== 'FTL') {
            mPrev.transporterSubType = null;
            mPrev.transporter_subtype = null;
          }
          masterOrg.settings = mPrev;
          await masterOrg.save();
        }
      } catch (_) {}
    }

    return successResponse(res, `Successfully upgraded to ${plan.name}! Operations mode updated.`, {
      subscription: {
        id: sub.id,
        planCode: plan.plan_code,
        planName: plan.name,
        amount: sub.amount,
        billingCycle: sub.billing_cycle,
        status: sub.status,
      },
      transporterType: targetType || org?.settings?.transporterType || 'BOTH',
      transporterSubType: targetSubType || org?.settings?.transporterSubType || null,
    });
  } catch (error) {
    console.error('upgradePlan error:', error);
    return errorResponse(res, error.message || 'Failed to upgrade plan', null, 500);
  }
};

module.exports = {
  getOrganizationProfile,
  updateOrganizationProfile,
  upgradePlan,
  updateTerminology,
  listBranches,
  getDocketSeries,
  updateDocketSeries,
  getTripSeries,
  updateTripSeries,
  getBranchSeries,
  updateBranchSeries,
};

