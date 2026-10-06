// src/services/numberSequenceService.js
const { NumberSequence, Branch } = require('../models');

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
  const fy = getFinancialYear();

  // Find or create sequence entry
  let sequence = NumberSequenceModel ? await NumberSequenceModel.findOne({
    where: {
      organization_id: organizationId,
      branch_id: branchId || null,
      document_type: documentType,
      financial_year: fy,
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
      branch_id: branchId || null,
      document_type: documentType,
      financial_year: fy,
      prefix: documentType === 'BILTY' ? '' : `${documentType.slice(0, 3)}-`,
      current_number: 100,
      sequence_length: 6,
      template: documentType === 'BILTY' ? '{BRANCH}/{FY}/{SEQ}' : '{PREFIX}{FY}/{SEQ}',
    }, { transaction });
  }

  // Increment counter
  const nextNum = sequence.current_number + 1;
  await sequence.update({ current_number: nextNum }, { transaction });

  // Format sequence with zero padding
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

module.exports = {
  getFinancialYear,
  generateNextNumber,
};
