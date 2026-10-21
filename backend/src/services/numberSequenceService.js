// src/services/numberSequenceService.js
const { NumberSequence, Branch, Organization, Trip, Invoice, Consignment } = require('../models');

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
 * (e.g. "transportlogistic" -> "TRP", "DWB Logistics" -> "DWB")
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
  const TripModel = models?.Trip || Trip;
  const InvoiceModel = models?.Invoice || Invoice;
  const ConsignmentModel = models?.Consignment || Consignment;
  const fy = getFinancialYear();
  const currentYear = String(new Date().getFullYear());

  let org = null;
  if (OrganizationModel && organizationId) {
    org = await OrganizationModel.findByPk(organizationId, { transaction });
  }

  const isBilty = documentType === 'BILTY';
  const isTrip = documentType === 'TRIP';
  const isInvoice = documentType === 'INVOICE';
  // BILTY and INVOICE numbers follow unified organization-wide series under GST
  const isOrgWide = isBilty || isInvoice;

  // Bilty / Docket configuration
  const defaultPrefix = derivePrefixFromBusinessName(org?.business_name);
  const customPrefix = (org?.settings?.docketSeries?.prefix || org?.settings?.docketPrefix || defaultPrefix).toUpperCase();
  const customSeqLength = Math.max(6, parseInt(org?.settings?.docketSeries?.sequenceLength, 10) || 6);
  const customTemplate = org?.settings?.docketSeries?.template || '{PREFIX}{SEQ}';

  // Trip configuration (transporter specific)
  // Format: TRP-2026-001, TRP-2026-002, TRP-2026-003
  const customTripPrefix = (org?.settings?.tripSeries?.prefix || 'TRP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'TRP';
  const customTripSeqLength = Math.max(3, parseInt(org?.settings?.tripSeries?.sequenceLength, 10) || 3);
  const customTripTemplate = org?.settings?.tripSeries?.template || '{PREFIX}-{YEAR}-{SEQ}';

  // Find or create sequence entry
  let sequence = null;
  if (NumberSequenceModel) {
    if (isTrip) {
      sequence = await NumberSequenceModel.findOne({
        where: {
          organization_id: organizationId,
          document_type: 'TRIP',
        },
        order: [['created_at', 'DESC']],
        ...(transaction ? { lock: transaction.LOCK?.UPDATE, transaction } : {}),
      });
    } else {
      sequence = await NumberSequenceModel.findOne({
        where: {
          organization_id: organizationId,
          document_type: documentType,
          financial_year: fy,
          ...(isOrgWide ? {} : (branchId ? { branch_id: branchId } : {})),
        },
        ...(transaction ? { lock: transaction.LOCK?.UPDATE, transaction } : {}),
      });
    }
  }

  let branchCode = 'HO';
  if (branchId && BranchModel) {
    const branch = await BranchModel.findByPk(branchId, { transaction });
    if (branch && branch.branch_code) {
      branchCode = branch.branch_code.toUpperCase();
    }
  }

  if (!sequence && NumberSequenceModel) {
    if (isTrip) {
      let startingNum = 0;
      if (TripModel && organizationId) {
        try {
          const existingTrips = await TripModel.findAll({
            where: { organization_id: organizationId },
            attributes: ['trip_number'],
            transaction,
          });
          existingTrips.forEach((t) => {
            const match = (t.trip_number || '').match(/-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > startingNum) startingNum = num;
            }
          });
        } catch (_) {}
      }

      sequence = await NumberSequenceModel.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        branch_id: null,
        document_type: 'TRIP',
        financial_year: currentYear,
        prefix: customTripPrefix,
        current_number: startingNum,
        sequence_length: customTripSeqLength,
        template: customTripTemplate,
      }, { transaction });
    } else {
      let startingNum = 0;
      if (isBilty && ConsignmentModel && organizationId) {
        try {
          const existingConsignments = await ConsignmentModel.findAll({
            where: { organization_id: organizationId },
            attributes: ['docket_number', 'lr_number'],
            transaction,
          });
          existingConsignments.forEach((c) => {
            const docketStr = c.docket_number || c.lr_number || '';
            const match = docketStr.match(/(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > startingNum) startingNum = num;
            }
          });
        } catch (_) {}
      } else if (isInvoice && InvoiceModel && organizationId) {
        try {
          const existingInvoices = await InvoiceModel.findAll({
            where: { organization_id: organizationId },
            attributes: ['invoice_number'],
            transaction,
          });
          existingInvoices.forEach((inv) => {
            const match = (inv.invoice_number || '').match(/\/(\d+)$/) || (inv.invoice_number || '').match(/-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > startingNum) startingNum = num;
            }
          });
        } catch (_) {}
      }

      sequence = await NumberSequenceModel.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        branch_id: isOrgWide ? null : (branchId || null),
        document_type: documentType,
        financial_year: fy,
        prefix: isBilty ? customPrefix : `${documentType.slice(0, 3)}-`,
        current_number: startingNum,
        sequence_length: isBilty ? customSeqLength : 6,
        template: isBilty ? customTemplate : '{PREFIX}{FY}/{SEQ}',
      }, { transaction });
    }
  } else if (sequence && isTrip) {
    const updates = {};
    if (sequence.template !== customTripTemplate) updates.template = customTripTemplate;
    if (sequence.prefix !== customTripPrefix) updates.prefix = customTripPrefix;
    if (sequence.sequence_length !== customTripSeqLength) updates.sequence_length = customTripSeqLength;
    if (sequence.financial_year !== currentYear) updates.financial_year = currentYear;

    if (TripModel && organizationId) {
      try {
        let maxExisting = 0;
        let totalCount = 0;
        const existingTrips = await TripModel.findAll({
          where: { organization_id: organizationId },
          attributes: ['trip_number'],
          transaction,
        });
        totalCount = existingTrips.length;
        existingTrips.forEach((t) => {
          const match = (t.trip_number || '').match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxExisting) maxExisting = num;
          }
        });
        if (totalCount === 0) {
          // Fresh tenant with 0 trips: start at 0 so first trip is 001
          if (sequence.current_number !== 0) {
            updates.current_number = 0;
          }
        } else {
          if (sequence.current_number < maxExisting) {
            updates.current_number = maxExisting;
          } else if (sequence.current_number === 100 && maxExisting < 100) {
            updates.current_number = maxExisting;
          }
        }
      } catch (_) {}
    }

    if (Object.keys(updates).length > 0) {
      await sequence.update(updates, { transaction });
    }
  } else if (sequence && isBilty) {
    const updates = {};
    if (sequence.template === '{BRANCH}/{FY}/{SEQ}' || sequence.template !== customTemplate) updates.template = customTemplate;
    if (sequence.prefix !== customPrefix) updates.prefix = customPrefix;
    if (sequence.sequence_length !== customSeqLength) updates.sequence_length = customSeqLength;

    if (ConsignmentModel && organizationId) {
      try {
        let maxExisting = 0;
        let totalCount = 0;
        const existingConsignments = await ConsignmentModel.findAll({
          where: { organization_id: organizationId },
          attributes: ['docket_number', 'lr_number'],
          transaction,
        });
        totalCount = existingConsignments.length;
        existingConsignments.forEach((c) => {
          const docketStr = c.docket_number || c.lr_number || '';
          const match = docketStr.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxExisting) maxExisting = num;
          }
        });
        if (totalCount === 0) {
          // Fresh tenant / transport with 0 dockets: start at 0 so first docket is 000001
          const configuredStart = parseInt(org?.settings?.docketSeries?.startingNumber, 10);
          const initialNum = (!isNaN(configuredStart) && configuredStart >= 1) ? configuredStart - 1 : 0;
          if (sequence.current_number !== initialNum) {
            updates.current_number = initialNum;
          }
        } else {
          if (sequence.current_number < maxExisting) {
            updates.current_number = maxExisting;
          } else if (sequence.current_number === 100 && maxExisting < 100) {
            updates.current_number = maxExisting;
          }
        }
      } catch (_) {}
    }

    if (Object.keys(updates).length > 0) {
      await sequence.update(updates, { transaction });
    }
  }

  // Ensure current_number is not behind existing database invoices to prevent collisions
  if (sequence && isInvoice && InvoiceModel && organizationId) {
    try {
      let maxExistingInv = 0;
      const existingInvoices = await InvoiceModel.findAll({
        where: { organization_id: organizationId },
        attributes: ['invoice_number'],
        transaction,
      });
      existingInvoices.forEach((inv) => {
        const match = (inv.invoice_number || '').match(/\/(\d+)$/) || (inv.invoice_number || '').match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxExistingInv) maxExistingInv = num;
        }
      });
      if (sequence.current_number < maxExistingInv) {
        await sequence.update({ current_number: maxExistingInv }, { transaction });
      }
    } catch (_) {}
  }

  // Increment counter
  let nextNum = sequence.current_number + 1;

  // Format sequence with zero padding
  const seqLength = isTrip ? (sequence.sequence_length || 3) : (sequence.sequence_length || 6);
  let paddedSeq = String(nextNum).padStart(seqLength, '0');

  // Replace placeholders in template
  let generated = sequence.template
    .replace('{BRANCH}', branchCode)
    .replace('{FY}', fy)
    .replace('{YEAR}', currentYear)
    .replace('{SEQ}', paddedSeq)
    .replace('{PREFIX}', sequence.prefix || '');

  // Absolute uniqueness guarantee for TRIP: loop until no conflicting trip exists
  if (isTrip && TripModel && organizationId) {
    try {
      let collision = await TripModel.findOne({
        where: { organization_id: organizationId, trip_number: generated },
        ...(transaction ? { transaction } : {}),
      });
      while (collision) {
        nextNum += 1;
        paddedSeq = String(nextNum).padStart(seqLength, '0');
        generated = sequence.template
          .replace('{BRANCH}', branchCode)
          .replace('{FY}', fy)
          .replace('{YEAR}', currentYear)
          .replace('{SEQ}', paddedSeq)
          .replace('{PREFIX}', sequence.prefix || '');
        collision = await TripModel.findOne({
          where: { organization_id: organizationId, trip_number: generated },
          ...(transaction ? { transaction } : {}),
        });
      }
    } catch (_) {}
  }

  // Absolute uniqueness guarantee for INVOICE: loop until no conflicting invoice exists
  if (isInvoice && InvoiceModel && organizationId) {
    try {
      let collision = await InvoiceModel.findOne({
        where: { organization_id: organizationId, invoice_number: generated },
        transaction,
      });
      while (collision) {
        nextNum += 1;
        paddedSeq = String(nextNum).padStart(seqLength, '0');
        generated = sequence.template
          .replace('{BRANCH}', branchCode)
          .replace('{FY}', fy)
          .replace('{YEAR}', currentYear)
          .replace('{SEQ}', paddedSeq)
          .replace('{PREFIX}', sequence.prefix || '');
        collision = await InvoiceModel.findOne({
          where: { organization_id: organizationId, invoice_number: generated },
          transaction,
        });
      }
    } catch (_) {}
  }

  // Absolute uniqueness guarantee for BILTY (Docket): loop until no conflicting docket exists
  if (isBilty && ConsignmentModel && organizationId) {
    try {
      const Op = models?.Sequelize?.Op || require('sequelize').Op;
      let collision = await ConsignmentModel.findOne({
        where: {
          organization_id: organizationId,
          [Op.or]: [
            { docket_number: generated },
            { lr_number: generated },
          ],
        },
        transaction,
      });
      while (collision) {
        nextNum += 1;
        paddedSeq = String(nextNum).padStart(seqLength, '0');
        generated = sequence.template
          .replace('{BRANCH}', branchCode)
          .replace('{FY}', fy)
          .replace('{YEAR}', currentYear)
          .replace('{SEQ}', paddedSeq)
          .replace('{PREFIX}', sequence.prefix || '');
        collision = await ConsignmentModel.findOne({
          where: {
            organization_id: organizationId,
            [Op.or]: [
              { docket_number: generated },
              { lr_number: generated },
            ],
          },
          transaction,
        });
      }
    } catch (_) {}
  }

  await sequence.update({ current_number: nextNum }, { transaction });

  return {
    formattedNumber: generated,
    rawNumber: nextNum,
    financialYear: isTrip ? currentYear : fy,
  };
};

/**
 * Preview the next docket / trip / document number without incrementing the sequence counter
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
  const TripModel = models?.Trip || Trip;
  const ConsignmentModel = models?.Consignment || Consignment;
  const fy = getFinancialYear();
  const currentYear = String(new Date().getFullYear());

  let org = null;
  if (OrganizationModel && organizationId) {
    org = await OrganizationModel.findByPk(organizationId);
  }

  const isBilty = documentType === 'BILTY';
  const isTrip = documentType === 'TRIP';

  if (isTrip) {
    const customTripPrefix = (org?.settings?.tripSeries?.prefix || 'TRP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'TRP';
    const customTripSeqLength = Math.max(3, parseInt(org?.settings?.tripSeries?.sequenceLength, 10) || 3);
    const customTripTemplate = org?.settings?.tripSeries?.template || '{PREFIX}-{YEAR}-{SEQ}';

    let sequence = NumberSequenceModel ? await NumberSequenceModel.findOne({
      where: {
        organization_id: organizationId,
        document_type: 'TRIP',
      },
      order: [['created_at', 'DESC']],
    }) : null;

    let currentNumber = sequence ? sequence.current_number : 0;
    let maxExisting = 0;
    let totalCount = 0;
    if (TripModel && organizationId) {
      try {
        const existingTrips = await TripModel.findAll({
          where: { organization_id: organizationId },
          attributes: ['trip_number'],
        });
        totalCount = existingTrips.length;
        existingTrips.forEach((t) => {
          const match = (t.trip_number || '').match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxExisting) maxExisting = num;
          }
        });
      } catch (_) {}
    }

    if (totalCount === 0) {
      currentNumber = 0;
      if (sequence && (sequence.current_number !== 0 || sequence.prefix !== customTripPrefix || sequence.template !== customTripTemplate)) {
        try {
          await sequence.update({
            current_number: 0,
            prefix: customTripPrefix,
            template: customTripTemplate,
            sequence_length: customTripSeqLength,
          });
        } catch (_) {}
      }
    } else {
      if (currentNumber < maxExisting) {
        currentNumber = maxExisting;
      } else if (currentNumber === 100 && maxExisting < 100) {
        currentNumber = maxExisting;
      }
      if (sequence && (sequence.current_number !== currentNumber || sequence.prefix !== customTripPrefix || sequence.template !== customTripTemplate)) {
        try {
          await sequence.update({
            current_number: currentNumber,
            prefix: customTripPrefix,
            template: customTripTemplate,
            sequence_length: customTripSeqLength,
          });
        } catch (_) {}
      }
    }

    const nextNum = currentNumber + 1;
    const paddedSeq = String(nextNum).padStart(customTripSeqLength, '0');
    const preview = customTripTemplate
      .replace('{PREFIX}', customTripPrefix)
      .replace('{YEAR}', currentYear)
      .replace('{SEQ}', paddedSeq);

    return {
      prefix: customTripPrefix,
      nextNumber: preview,
      currentNumber,
      sequenceLength: customTripSeqLength,
      template: customTripTemplate,
    };
  }

  // BILTY preview
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

  let currentNumber = sequence ? sequence.current_number : 0;
  let maxExistingDocket = 0;
  let totalConsignments = 0;
  if (ConsignmentModel && organizationId) {
    try {
      const existingConsignments = await ConsignmentModel.findAll({
        where: { organization_id: organizationId },
        attributes: ['docket_number', 'lr_number'],
      });
      totalConsignments = existingConsignments.length;
      existingConsignments.forEach((c) => {
        const docketStr = c.docket_number || c.lr_number || '';
        const match = docketStr.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxExistingDocket) maxExistingDocket = num;
        }
      });
    } catch (_) {}
  }

  if (totalConsignments === 0) {
    const configuredStart = parseInt(org?.settings?.docketSeries?.startingNumber, 10);
    const initialNum = (!isNaN(configuredStart) && configuredStart >= 1) ? configuredStart - 1 : 0;
    currentNumber = initialNum;
    if (sequence && (sequence.current_number !== initialNum || sequence.prefix !== customPrefix || sequence.template !== customTemplate)) {
      try {
        await sequence.update({
          current_number: initialNum,
          prefix: customPrefix,
          template: customTemplate,
          sequence_length: customSeqLength,
        });
      } catch (_) {}
    }
  } else {
    if (currentNumber < maxExistingDocket) {
      currentNumber = maxExistingDocket;
    } else if (currentNumber === 100 && maxExistingDocket < 100) {
      currentNumber = maxExistingDocket;
    }
    if (sequence && (sequence.current_number !== currentNumber || sequence.prefix !== customPrefix || sequence.template !== customTemplate)) {
      try {
        await sequence.update({
          current_number: currentNumber,
          prefix: customPrefix,
          template: customTemplate,
          sequence_length: customSeqLength,
        });
      } catch (_) {}
    }
  }

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

