// src/services/numberSequenceService.js
const { NumberSequence, Branch, Organization } = require('../models');

/**
 * Calculates current Indian Financial Year (e.g., April 2026 -> "26-27")
 */
const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();
  const currentShort = String(year).slice(-2);
  
  if (month >= 4) {
    const nextShort = String(year + 1).slice(-2);
    return `${currentShort}-${nextShort}`;
  } else {
    const prevShort = String(year - 1).slice(-2);
    return `${prevShort}-${currentShort}`;
  }
};

/**
 * Derives default 3-letter uppercase prefix from business name
 * (e.g. "balajilogistic" -> "BAL", "DWB Logistics" -> "DWB")
 */
const derivePrefixFromBusinessName = (businessName) => {
  if (!businessName) return 'DWB';
  const cleaned = businessName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  if (cleaned.length > 0) return cleaned.padEnd(3, 'X');
  return 'DWB';
};

/**
 * Generates next sequential number inside a Sequelize transaction with row-level locking (FOR UPDATE)
 * to guarantee no race conditions or duplicate numbers across parallel requests.
 */
const generateNextNumber = async ({
  tenantId,
  organizationId,
  branchId,
  documentType, // 'BILTY', 'DISPATCH', 'TRIP', 'INVOICE', 'SETTLEMENT'
  transaction,
  models,
}) => {
  const NumberSequenceModel = models?.NumberSequence || NumberSequence;
  const BranchModel = models?.Branch || Branch;
  const OrganizationModel = models?.Organization || Organization;
  const fy = getFinancialYear();

  let org = null;
  if (OrganizationModel && organizationId) {
    org = await OrganizationModel.findByPk(organizationId, { transaction });
  }

  const isBilty = documentType === 'BILTY';
  const defaultPrefix = derivePrefixFromBusinessName(org?.business_name);
  const customPrefix = (org?.settings?.docketSeries?.prefix || org?.settings?.docketPrefix || defaultPrefix).toUpperCase();
  const customSeqLength = Math.max(6, parseInt(org?.settings?.docketSeries?.sequenceLength, 10) || 6);
  const customTemplate = org?.settings?.docketSeries?.template || '{PREFIX}{SEQ}';

  // Find or create sequence entry
  let sequence = NumberSequenceModel ? await NumberSequenceModel.findOne({
    where: {
      organization_id: organizationId,
      document_type: documentType,
      financial_year: fy,
      ...(isBilty ? {} : (branchId ? { branch_id: branchId } : {})),
    },
    lock: transaction.LOCK.UPDATE,
    transaction,
  }) : null;

  let branchCode = 'HO';
  if (branchId && BranchModel) {
    const branch = await BranchModel.findByPk(branchId, { transaction });
    if (branch && branch.branch_code) {
      branchCode = branch.branch_code.toUpperCase();
    }
  }

  if (!sequence && NumberSequenceModel) {
    sequence = await NumberSequenceModel.create({
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: isBilty ? null : (branchId || null),
      document_type: documentType,
      financial_year: fy,
      prefix: isBilty ? customPrefix : `${documentType.slice(0, 3)}-`,
      current_number: 0,
      sequence_length: isBilty ? customSeqLength : 6,
      template: isBilty ? customTemplate : '{PREFIX}{FY}/{SEQ}',
    }, { transaction });
  } else if (sequence && isBilty) {
    // If an existing sequence has the old {BRANCH}/{FY}/{SEQ} template or outdated prefix, update it to clean 3-char + sequence format
    if (sequence.template === '{BRANCH}/{FY}/{SEQ}' || sequence.prefix !== customPrefix) {
      await sequence.update({
        prefix: customPrefix,
        template: customTemplate,
        sequence_length: customSeqLength,
      }, { transaction });
    }
  }

  // Increment counter
  const nextNum = sequence.current_number + 1;
  await sequence.update({ current_number: nextNum }, { transaction });

  // Format sequence with zero padding (min 6 digits, e.g. 000001)
  const paddedSeq = String(nextNum).padStart(sequence.sequence_length || 6, '0');

  // Replace placeholders in template
  let generated = sequence.template
    .replace('{BRANCH}', branchCode)
    .replace('{FY}', fy)
    .replace('{SEQ}', paddedSeq)
    .replace('{PREFIX}', sequence.prefix || '');

  return {
    formattedNumber: generated,
    rawNumber: nextNum,
    financialYear: fy,
  };
};

/**
 * Preview the next docket / document number without incrementing the sequence counter
 */
const getNextNumberPreview = async ({
  tenantId,
  organizationId,
  branchId,
  documentType = 'BILTY',
  models,
}) => {
  const NumberSequenceModel = models?.NumberSequence || NumberSequence;
  const OrganizationModel = models?.Organization || Organization;
  const fy = getFinancialYear();

  let org = null;
  if (OrganizationModel && organizationId) {
    org = await OrganizationModel.findByPk(organizationId);
  }

  const isBilty = documentType === 'BILTY';
  const defaultPrefix = derivePrefixFromBusinessName(org?.business_name);
  const customPrefix = (org?.settings?.docketSeries?.prefix || org?.settings?.docketPrefix || defaultPrefix).toUpperCase();
  const customSeqLength = Math.max(6, parseInt(org?.settings?.docketSeries?.sequenceLength, 10) || 6);
  const customTemplate = org?.settings?.docketSeries?.template || '{PREFIX}{SEQ}';

  let sequence = NumberSequenceModel ? await NumberSequenceModel.findOne({
    where: {
      organization_id: organizationId,
      document_type: documentType,
      financial_year: fy,
    },
    order: [['created_at', 'DESC']],
  }) : null;

  const currentNumber = sequence ? sequence.current_number : 0;
  const nextNum = currentNumber + 1;
  const paddedSeq = String(nextNum).padStart(customSeqLength, '0');
  const preview = customTemplate
    .replace('{PREFIX}', customPrefix)
    .replace('{SEQ}', paddedSeq)
    .replace('{FY}', fy)
    .replace('{BRANCH}', 'HO');

  return {
    prefix: customPrefix,
    nextNumber: preview,
    currentNumber,
    sequenceLength: customSeqLength,
    template: customTemplate,
  };
};

module.exports = {
  getFinancialYear,
  derivePrefixFromBusinessName,
  generateNextNumber,
  getNextNumberPreview,
};

