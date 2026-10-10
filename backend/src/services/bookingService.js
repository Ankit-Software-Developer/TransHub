// src/services/bookingService.js
const { Op, Sequelize } = require('sequelize');
const defaultModels = require('../models');
const defaultSequelize = defaultModels.sequelize;
const { generateNextNumber } = require('./numberSequenceService');
const { addDecimals, multiplyDecimals, roundToTwo } = require('../utils/decimalUtils');

const createBooking = async ({ tenantId, organizationId, branchId, userId, payload, models, sequelize: customSequelize }) => {
  const db = customSequelize || defaultSequelize;
  const Booking = models?.Booking || defaultModels.Booking;
  const Consignment = models?.Consignment || defaultModels.Consignment;
  const ConsignmentItem = models?.ConsignmentItem || defaultModels.ConsignmentItem;
  const ConsignmentStatusHistory = models?.ConsignmentStatusHistory || defaultModels.ConsignmentStatusHistory;
  const AuditLog = models?.AuditLog || defaultModels.AuditLog;

  // Ensure transport_mode column exists in the tenant's MySQL database (outside transaction to avoid MySQL implicit commit)
  try {
    await db.query("ALTER TABLE consignments ADD COLUMN transport_mode VARCHAR(30) DEFAULT 'ROAD';");
  } catch (e) {
    // Column already exists or alter ignored
  }

  const transaction = await db.transaction();

  try {
    // 1. Generate or accept custom Docket Number (LR / Bilty)
    let finalDocketNumber = (payload.docket_number || payload.lr_number || '').trim();
    if (!finalDocketNumber) {
      const { formattedNumber } = await generateNextNumber({
        tenantId,
        organizationId,
        branchId,
        documentType: 'BILTY',
        transaction,
        models,
      });
      finalDocketNumber = formattedNumber;
    } else {
      // Check for duplicate docket number in this organization
      const ConsignmentModel = models?.Consignment || Consignment;
      if (ConsignmentModel) {
        const existing = await ConsignmentModel.findOne({
          where: {
            organization_id: organizationId,
            docket_number: finalDocketNumber,
          },
          transaction,
        });
        if (existing) {
          throw new Error(`Docket / LR number "${finalDocketNumber}" already exists. Please enter a unique docket number.`);
        }
      }
    }

    // 2. Financial calculation
    const rate = parseFloat(payload.rate || 0);
    const chargedWeight = parseFloat(payload.charged_weight || payload.actual_weight || 0);
    const packagesCount = parseInt(payload.packages_count || 1, 10);

    let freightAmount = parseFloat(payload.freight_amount || 0);
    if (!freightAmount && rate > 0) {
      if (payload.rate_type === 'PER_PACKAGE') {
        freightAmount = roundToTwo(packagesCount * rate);
      } else {
        // Default PER_KG
        freightAmount = roundToTwo(chargedWeight * rate);
      }
    }

    const loading = parseFloat(payload.loading_charges || 0);
    const unloading = parseFloat(payload.unloading_charges || 0);
    const handling = parseFloat(payload.handling_charges || 0);
    const hamali = parseFloat(payload.hamali_charges || 0);
    const doorDelivery = parseFloat(payload.door_delivery_charges || 0);
    const otherCharges = parseFloat(payload.other_charges || 0);
    const discount = parseFloat(payload.discount_amount || 0);

    const subtotal = addDecimals(freightAmount, loading, unloading, handling, hamali, doorDelivery, otherCharges);
    const taxable = Math.max(0, subtotal - discount);
    const taxPercent = parseFloat(payload.tax_percent || 5.0);
    const taxAmount = roundToTwo((taxable * taxPercent) / 100);
    const totalAmount = roundToTwo(taxable + taxAmount);

    const Customer = models?.Customer || defaultModels.Customer;

    // Resolve or auto-create Consignor
    let consignorId = payload.consignor_id;
    const consignorName = (payload.consignor_name || payload.consignorName || payload.consignor?.name || 'Walk-in Shipper').trim();
    if (!consignorId && Customer) {
      let cust = await Customer.findOne({
        where: { organization_id: organizationId, name: consignorName },
        transaction
      });
      if (!cust) {
        cust = await Customer.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          customer_code: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
          name: consignorName,
          customer_type: 'CONSIGNOR',
          phone: payload.consignor_phone || payload.consignorPhone || '9876543210',
          city: payload.origin_city || payload.originCity || 'Delhi',
        }, { transaction });
      }
      consignorId = cust.id;
    }

    // Resolve or auto-create Consignee
    let consigneeId = payload.consignee_id;
    const consigneeName = (payload.consignee_name || payload.consigneeName || payload.consignee?.name || 'Walk-in Receiver').trim();
    if (!consigneeId && Customer) {
      let cust = await Customer.findOne({
        where: { organization_id: organizationId, name: consigneeName },
        transaction
      });
      if (!cust) {
        cust = await Customer.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          customer_code: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
          name: consigneeName,
          customer_type: 'CONSIGNEE',
          phone: payload.consignee_phone || payload.consigneePhone || '9876543210',
          city: payload.destination_city || payload.destinationCity || 'Mumbai',
        }, { transaction });
      }
      consigneeId = cust.id;
    }

    // 3. Create Booking Record
    const booking = await Booking.create({
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: branchId,
      booking_date: payload.booking_date || new Date().toISOString().slice(0, 10),
      booking_time: payload.booking_time || new Date().toTimeString().slice(0, 8),
      consignor_id: consignorId,
      consignee_id: consigneeId,
      origin_city: payload.origin_city || 'Delhi',
      destination_city: payload.destination_city || 'Mumbai',
      dest_branch_id: payload.dest_branch_id || null,
      pickup_address: payload.pickup_address,
      delivery_address: payload.delivery_address,
      booking_remarks: payload.booking_remarks,
      created_by: userId,
    }, { transaction });

    // 4. Create Consignment (The digital Docket / LR / Bilty record)
    let consignment;
    const consignmentData = {
      tenant_id: tenantId,
      organization_id: organizationId,
      booking_id: booking.id,
      docket_number: finalDocketNumber,
      lr_number: finalDocketNumber,
      origin_branch_id: branchId,
      current_branch_id: branchId,
      dest_branch_id: payload.dest_branch_id || null,
      consignor_id: consignorId,
      consignee_id: consigneeId,
      origin_city: payload.origin_city || 'Delhi',
      destination_city: payload.destination_city || 'Mumbai',
      booking_date: booking.booking_date,
      material_description: payload.material_description || payload.cargo_type || payload.cargoType || 'General Goods',
      packages_count: packagesCount,
      package_type: payload.package_type || 'Boxes',
      actual_weight: parseFloat(payload.actual_weight || 0),
      charged_weight: chargedWeight,
      invoice_no: payload.invoice_no,
      invoice_date: payload.invoice_date,
      invoice_value: parseFloat(payload.invoice_value || 0),
      eway_bill_no: payload.eway_bill_no,
      eway_bill_date: payload.eway_bill_date,
      eway_bill_expiry: payload.eway_bill_expiry,
      payment_type: payload.payment_type || 'TO_PAY',
      delivery_type: payload.delivery_type || 'GODOWN_DELIVERY',
      transport_mode: (payload.transport_mode || payload.transportMode || 'ROAD').toUpperCase(),
      rate_type: payload.rate_type || 'PER_KG',
      rate,
      freight_amount: freightAmount,
      loading_charges: loading,
      unloading_charges: unloading,
      handling_charges: handling,
      hamali_charges: hamali,
      door_delivery_charges: doorDelivery,
      other_charges: otherCharges,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      discount_amount: discount,
      total_amount: totalAmount,
      status: 'BOOKED',
      barcode_data: finalDocketNumber,
      qr_data: JSON.stringify({ lr: finalDocketNumber, origin: payload.origin_city, dest: payload.destination_city, pkgs: packagesCount }),
      created_by: userId,
    };

    try {
      consignment = await Consignment.create(consignmentData, { transaction });
    } catch (createErr) {
      if (createErr.message && createErr.message.includes('transport_mode')) {
        // Safe fallback if column is not yet propagated in MySQL
        delete consignmentData.transport_mode;
        consignment = await Consignment.create(consignmentData, { transaction });
      } else {
        throw createErr;
      }
    }

    // 5. Create Consignment Item
    await ConsignmentItem.create({
      consignment_id: consignment.id,
      description: consignment.material_description,
      package_type: consignment.package_type,
      quantity: packagesCount,
      actual_weight: consignment.actual_weight,
      charged_weight: chargedWeight,
    }, { transaction });

    // 6. Record Initial Timeline Entry
    await ConsignmentStatusHistory.create({
      consignment_id: consignment.id,
      status: 'BOOKED',
      location: payload.origin_city,
      branch_id: branchId,
      user_id: userId,
      remarks: payload.booking_remarks || 'Consignment registered at origin branch',
      timestamp: new Date(),
    }, { transaction });

    await transaction.commit();

    return consignment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const listConsignments = async ({
  tenantId,
  organizationId,
  branchId = null,
  originBranchId = null,
  currentBranchId = null,
  loadPlanning = false,
  status = null,
  search = null,
  paymentType = null,
  fromDate = null,
  toDate = null,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  sortOrder = 'DESC',
  models = null,
}) => {
  const Consignment = models?.Consignment || defaultModels.Consignment;
  const Branch = models?.Branch || defaultModels.Branch;
  const Customer = models?.Customer || defaultModels.Customer;
  const Pod = models?.Pod || defaultModels.Pod;
  const Trip = models?.Trip || defaultModels.Trip;
  const Vehicle = models?.Vehicle || defaultModels.Vehicle;
  const Driver = models?.Driver || defaultModels.Driver;

  const where = {
    tenant_id: tenantId,
    organization_id: organizationId,
  };

  if (loadPlanning) {
    if (branchId && branchId !== 'ALL') {
      where[Op.or] = [
        {
          origin_branch_id: branchId,
          status: { [Op.in]: ['BOOKED', 'MATERIAL_RECEIVED', 'READY_FOR_DISPATCH'] },
        },
        {
          current_branch_id: branchId,
          status: 'RECEIVED_AT_HUB',
        },
      ];
    } else {
      where.status = { [Op.in]: ['BOOKED', 'MATERIAL_RECEIVED', 'READY_FOR_DISPATCH', 'RECEIVED_AT_HUB'] };
    }
  } else {
    if (currentBranchId && currentBranchId !== 'ALL') {
      where.current_branch_id = currentBranchId;
    }
    if (originBranchId && originBranchId !== 'ALL') {
      where.origin_branch_id = originBranchId;
    } else if (branchId && branchId !== 'ALL') {
      where[Op.or] = [
        { origin_branch_id: branchId },
        { dest_branch_id: branchId },
        { current_branch_id: branchId },
      ];
    }

    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        where.status = { [Op.in]: status.split(',').map((s) => s.trim()) };
      } else if (Array.isArray(status)) {
        where.status = { [Op.in]: status };
      } else if (status === 'PENDING') {
        where.status = { [Op.in]: ['BOOKED', 'MATERIAL_RECEIVED', 'READY_FOR_DISPATCH', 'LOADED', 'RECEIVED_AT_HUB'] };
      } else if (status === 'FOR_DELIVERY' || status === 'REACHED_DESTINATION' || status === 'DELIVERY') {
        where.status = { [Op.in]: ['REACHED_DESTINATION', 'OUT_FOR_DELIVERY'] };
      } else if (status === 'IN_TRANSIT') {
        where.status = { [Op.in]: ['IN_TRANSIT', 'DISPATCHED', 'ON_TRIP'] };
      } else if (status === 'DELIVERED') {
        where.status = { [Op.in]: ['DELIVERED', 'COMPLETED', 'POD_UPLOADED'] };
      } else if (status === 'DELAYED') {
        where.status = { [Op.in]: ['DELAYED', 'DAMAGED', 'SHORT_MATERIAL', 'HOLD'] };
      } else if (status !== 'ALL') {
        where.status = status;
      }
    }
  }

  if (paymentType) {
    where.payment_type = paymentType;
  }

  if (fromDate && toDate) {
    where.booking_date = {
      [Op.between]: [fromDate, toDate],
    };
  } else if (fromDate) {
    where.booking_date = {
      [Op.gte]: fromDate,
    };
  } else if (toDate) {
    where.booking_date = {
      [Op.lte]: toDate,
    };
  }

  if (search) {
    where[Op.and] = [
      ...(where[Op.and] || []),
      {
        [Op.or]: [
          { docket_number: { [Op.like]: `%${search}%` } },
          { lr_number: { [Op.like]: `%${search}%` } },
          { material_description: { [Op.like]: `%${search}%` } },
          { invoice_no: { [Op.like]: `%${search}%` } },
          { eway_bill_no: { [Op.like]: `%${search}%` } },
          { origin_city: { [Op.like]: `%${search}%` } },
          { destination_city: { [Op.like]: `%${search}%` } },
        ],
      },
    ];
  }

  const isAll = limit === 'all' || String(limit).toLowerCase() === 'all';
  const parsedLimit = isAll ? 10000 : (parseInt(limit, 10) || 20);
  const parsedPage = isAll ? 1 : (parseInt(page, 10) || 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const includeList = [];
  if (Branch) {
    includeList.push({ model: Branch, as: 'originBranch', attributes: ['id', 'branch_code', 'branch_name', 'city'] });
    includeList.push({ model: Branch, as: 'destBranch', attributes: ['id', 'branch_code', 'branch_name', 'city'] });
  }
  if (Customer) {
    includeList.push({ model: Customer, as: 'consignor', attributes: ['id', 'customer_code', 'name', 'phone', 'city'] });
    includeList.push({ model: Customer, as: 'consignee', attributes: ['id', 'customer_code', 'name', 'phone', 'city'] });
  }
  if (Pod) {
    includeList.push({ model: Pod, as: 'pod' });
  }
  if (Trip) {
    const tripInclude = [];
    if (Vehicle) tripInclude.push({ model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'vehicle_type', 'capacity_ton'] });
    if (Driver) tripInclude.push({ model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] });
    includeList.push({
      model: Trip,
      as: 'trips',
      attributes: ['id', 'trip_number', 'status', 'created_at'],
      through: { attributes: [] },
      include: tripInclude,
      required: false,
    });
  }

  const allowedSortCols = {
    docket_number: 'docket_number',
    lr_number: 'lr_number',
    booking_date: 'booking_date',
    origin_city: 'origin_city',
    destination_city: 'destination_city',
    packages_count: 'packages_count',
    charged_weight: 'charged_weight',
    actual_weight: 'actual_weight',
    rate: 'rate',
    total_amount: 'total_amount',
    status: 'status',
    payment_type: 'payment_type',
    created_at: 'created_at',
  };
  const orderCol = allowedSortCols[sortBy] || 'created_at';
  const orderDir = (sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const orderClauses = [];
  const targetBranch = originBranchId || branchId;
  if (status === 'PENDING' && targetBranch && targetBranch !== 'ALL') {
    orderClauses.push([
      Sequelize.literal(`CASE WHEN "Consignment"."current_branch_id" = '${targetBranch}' OR "Consignment"."dest_branch_id" = '${targetBranch}' OR "Consignment"."origin_branch_id" = '${targetBranch}' THEN 0 ELSE 1 END`),
      'ASC'
    ]);
  }
  orderClauses.push([orderCol, orderDir]);

  const { count, rows } = await Consignment.findAndCountAll({
    where,
    limit: parsedLimit,
    offset: parseInt(offset, 10),
    order: orderClauses,
    include: includeList,
  });

  const formattedRows = rows.map((r) => {
    const json = r.toJSON ? r.toJSON() : r;
    const activeTrip = (json.trips && json.trips.length > 0)
      ? (json.trips.find((t) => t.status === 'RUNNING' || t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED') || json.trips[json.trips.length - 1])
      : null;
    if (activeTrip) {
      json.trip_number = activeTrip.trip_number;
      if (activeTrip.vehicle?.vehicle_number) {
        json.vehicle_number = activeTrip.vehicle.vehicle_number;
        json.vehicle_type = activeTrip.vehicle.vehicle_type || 'Commercial Fleet';
      }
      if (activeTrip.driver?.name) {
        json.driver_name = activeTrip.driver.name;
        json.driver_phone = activeTrip.driver.phone || '';
      }
      json.active_trip = activeTrip;
    }
    return json;
  });

  let summary = {
    total: count,
    pending: 0,
    forDelivery: 0,
    reachedDest: 0,
    inTransit: 0,
    delivered: 0,
    delayed: 0,
  };

  try {
    const statsWhere = { tenant_id: tenantId, organization_id: organizationId };
    if (originBranchId && originBranchId !== 'ALL') {
      statsWhere.origin_branch_id = originBranchId;
    } else if (branchId && branchId !== 'ALL') {
      statsWhere[Op.or] = [
        { origin_branch_id: branchId },
        { dest_branch_id: branchId },
        { current_branch_id: branchId },
      ];
    }
    const statusStats = await Consignment.findAll({
      where: statsWhere,
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    summary.total = 0;
    statusStats.forEach((s) => {
      const c = parseInt(s.count, 10) || 0;
      summary.total += c;
      if (['BOOKED', 'MATERIAL_RECEIVED', 'READY_FOR_DISPATCH', 'LOADED', 'RECEIVED_AT_HUB'].includes(s.status)) {
        summary.pending += c;
      } else if (['REACHED_DESTINATION', 'OUT_FOR_DELIVERY'].includes(s.status)) {
        summary.reachedDest += c;
        summary.forDelivery = (summary.forDelivery || 0) + c;
      } else if (['IN_TRANSIT', 'DISPATCHED', 'ON_TRIP'].includes(s.status)) {
        summary.inTransit += c;
      } else if (['DELIVERED', 'COMPLETED', 'POD_UPLOADED'].includes(s.status)) {
        summary.delivered += c;
      } else if (['DELAYED', 'DAMAGED', 'SHORT_MATERIAL', 'HOLD'].includes(s.status)) {
        summary.delayed += c;
      }
    });
  } catch (err) {
    // Graceful fallback to formattedRows
    summary.total = count;
  }

  return {
    consignments: formattedRows,
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(count / parsedLimit),
      summary,
    },
  };
};

/**
 * End-to-End LR Detail Page (Unified 10-Tab record)
 */
const getConsignmentDetail = async (id, tenantId, models = null) => {
  const Consignment = models?.Consignment || defaultModels.Consignment;
  const Branch = models?.Branch || defaultModels.Branch;
  const Customer = models?.Customer || defaultModels.Customer;
  const ConsignmentItem = models?.ConsignmentItem || defaultModels.ConsignmentItem;
  const ConsignmentStatusHistory = models?.ConsignmentStatusHistory || defaultModels.ConsignmentStatusHistory;
  const Pod = models?.Pod || defaultModels.Pod;
  const DeliveryRecord = models?.DeliveryRecord || defaultModels.DeliveryRecord;
  const Trip = models?.Trip || defaultModels.Trip;
  const Vehicle = models?.Vehicle || defaultModels.Vehicle;
  const Driver = models?.Driver || defaultModels.Driver;

  const includeList = [];
  if (Branch) {
    includeList.push({ model: Branch, as: 'originBranch' });
    includeList.push({ model: Branch, as: 'currentBranch' });
    includeList.push({ model: Branch, as: 'destBranch' });
  }
  if (Customer) {
    includeList.push({ model: Customer, as: 'consignor' });
    includeList.push({ model: Customer, as: 'consignee' });
  }
  if (ConsignmentItem) {
    includeList.push({ model: ConsignmentItem, as: 'items' });
  }
  if (ConsignmentStatusHistory) {
    includeList.push({
      model: ConsignmentStatusHistory,
      as: 'statusHistory',
      order: [['timestamp', 'ASC']],
    });
  }
  if (Pod) {
    includeList.push({ model: Pod, as: 'pod' });
  }
  if (DeliveryRecord) {
    includeList.push({ model: DeliveryRecord, as: 'deliveryRecord' });
  }
  if (Trip) {
    const tripInclude = [];
    if (Vehicle) tripInclude.push({ model: Vehicle, as: 'vehicle' });
    if (Driver) tripInclude.push({ model: Driver, as: 'driver' });
    includeList.push({
      model: Trip,
      as: 'trips',
      include: tripInclude,
    });
  }

  const consignment = await Consignment.findOne({
    where: { id, tenant_id: tenantId },
    include: includeList,
  });

  return consignment;
};

/**
 * Edit / Update an existing Docket (Consignment)
 */
const updateBooking = async ({ id, tenantId, organizationId, payload, models, sequelize: customSequelize }) => {
  const db = customSequelize || defaultSequelize;
  const Consignment = models?.Consignment || defaultModels.Consignment;
  const Booking = models?.Booking || defaultModels.Booking;
  const Customer = models?.Customer || defaultModels.Customer;

  const consignment = await Consignment.findOne({
    where: { id, tenant_id: tenantId },
  });

  if (!consignment) {
    throw new Error('Docket / Consignment not found');
  }

  // Ensure transport_mode column exists outside transaction
  try {
    await db.query("ALTER TABLE consignments ADD COLUMN transport_mode VARCHAR(30) DEFAULT 'ROAD';");
  } catch (e) {
    // Column already exists or alter ignored
  }

  const transaction = await db.transaction();

  try {
    let consignorId = consignment.consignor_id;
    const consignorName = (payload.consignor_name || payload.consignorName || payload.consignor?.name || '').trim();
    if (consignorName && Customer) {
      let cust = await Customer.findOne({
        where: { organization_id: organizationId, name: consignorName },
        transaction,
      });
      if (!cust) {
        cust = await Customer.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          customer_code: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
          name: consignorName,
          customer_type: 'CONSIGNOR',
          phone: payload.consignor_phone || payload.consignorPhone || '9876543210',
          city: payload.origin_city || consignment.origin_city,
        }, { transaction });
      }
      consignorId = cust.id;
    }

    let consigneeId = consignment.consignee_id;
    const consigneeName = (payload.consignee_name || payload.consigneeName || payload.consignee?.name || '').trim();
    if (consigneeName && Customer) {
      let cust = await Customer.findOne({
        where: { organization_id: organizationId, name: consigneeName },
        transaction,
      });
      if (!cust) {
        cust = await Customer.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          customer_code: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
          name: consigneeName,
          customer_type: 'CONSIGNEE',
          phone: payload.consignee_phone || payload.consigneePhone || '9876543210',
          city: payload.destination_city || consignment.destination_city,
        }, { transaction });
      }
      consigneeId = cust.id;
    }

    const packagesCount = payload.packages_count !== undefined ? parseInt(payload.packages_count, 10) : consignment.packages_count;
    const actualWeight = payload.actual_weight !== undefined ? parseFloat(payload.actual_weight) : consignment.actual_weight;
    const chargedWeight = payload.charged_weight !== undefined ? parseFloat(payload.charged_weight) : consignment.charged_weight;
    const rate = payload.rate !== undefined ? parseFloat(payload.rate) : consignment.rate;
    const freightAmount = payload.freight_amount !== undefined ? parseFloat(payload.freight_amount) : consignment.freight_amount;
    const loadingCharges = payload.loading_charges !== undefined ? parseFloat(payload.loading_charges) : consignment.loading_charges;
    const unloadingCharges = payload.unloading_charges !== undefined ? parseFloat(payload.unloading_charges) : consignment.unloading_charges;
    const handlingCharges = payload.handling_charges !== undefined ? parseFloat(payload.handling_charges) : consignment.handling_charges;
    const hamaliCharges = payload.hamali_charges !== undefined ? parseFloat(payload.hamali_charges) : consignment.hamali_charges;
    const doorDeliveryCharges = payload.door_delivery_charges !== undefined ? parseFloat(payload.door_delivery_charges) : consignment.door_delivery_charges;
    const otherCharges = payload.other_charges !== undefined ? parseFloat(payload.other_charges) : consignment.other_charges;
    const taxPercent = payload.tax_percent !== undefined ? parseFloat(payload.tax_percent) : consignment.tax_percent;
    const taxAmount = payload.tax_amount !== undefined ? parseFloat(payload.tax_amount) : consignment.tax_amount;
    const discountAmount = payload.discount_amount !== undefined ? parseFloat(payload.discount_amount) : consignment.discount_amount;

    const totalAmount = payload.total_amount !== undefined
      ? parseFloat(payload.total_amount)
      : (payload.totalAmount !== undefined
          ? parseFloat(payload.totalAmount)
          : roundToTwo(Math.max(0, freightAmount + loadingCharges + unloadingCharges + handlingCharges + hamaliCharges + doorDeliveryCharges + otherCharges + taxAmount - discountAmount)));

    // Validation: If bilty is already PAID, do not allow altering financial freight charges
    const isPaid = (consignment.payment_type || '').toUpperCase() === 'PAID' || (consignment.payment_status || '').toUpperCase() === 'PAID';
    if (isPaid) {
      const chargeFieldsChanged = (
        (payload.packages_count !== undefined && parseInt(payload.packages_count, 10) !== parseInt(consignment.packages_count || 0, 10)) ||
        (payload.charged_weight !== undefined && Math.abs(parseFloat(payload.charged_weight) - parseFloat(consignment.charged_weight || 0)) > 0.01) ||
        (payload.actual_weight !== undefined && Math.abs(parseFloat(payload.actual_weight) - parseFloat(consignment.actual_weight || 0)) > 0.01) ||
        (payload.rate !== undefined && Math.abs(parseFloat(payload.rate) - parseFloat(consignment.rate || 0)) > 0.01) ||
        (payload.freight_amount !== undefined && Math.abs(parseFloat(payload.freight_amount) - parseFloat(consignment.freight_amount || 0)) > 0.01) ||
        (payload.loading_charges !== undefined && Math.abs(parseFloat(payload.loading_charges) - parseFloat(consignment.loading_charges || 0)) > 0.01) ||
        (payload.unloading_charges !== undefined && Math.abs(parseFloat(payload.unloading_charges) - parseFloat(consignment.unloading_charges || 0)) > 0.01) ||
        (payload.handling_charges !== undefined && Math.abs(parseFloat(payload.handling_charges) - parseFloat(consignment.handling_charges || 0)) > 0.01) ||
        (payload.hamali_charges !== undefined && Math.abs(parseFloat(payload.hamali_charges) - parseFloat(consignment.hamali_charges || 0)) > 0.01) ||
        (payload.door_delivery_charges !== undefined && Math.abs(parseFloat(payload.door_delivery_charges) - parseFloat(consignment.door_delivery_charges || 0)) > 0.01) ||
        (payload.other_charges !== undefined && Math.abs(parseFloat(payload.other_charges) - parseFloat(consignment.other_charges || 0)) > 0.01) ||
        (payload.discount_amount !== undefined && Math.abs(parseFloat(payload.discount_amount) - parseFloat(consignment.discount_amount || 0)) > 0.01) ||
        (payload.tax_percent !== undefined && Math.abs(parseFloat(payload.tax_percent) - parseFloat(consignment.tax_percent || 0)) > 0.01) ||
        (payload.tax_amount !== undefined && Math.abs(parseFloat(payload.tax_amount) - parseFloat(consignment.tax_amount || 0)) > 0.01) ||
        (payload.total_amount !== undefined && Math.abs(parseFloat(payload.total_amount) - parseFloat(consignment.total_amount || 0)) > 0.01)
      );
      const deliveryTypeChanged = payload.delivery_type !== undefined && payload.delivery_type !== consignment.delivery_type;

      if (chargeFieldsChanged || deliveryTypeChanged) {
        await transaction.rollback();
        const err = new Error(
          deliveryTypeChanged
            ? 'Delivery type cannot be modified on a PAID bilty. Payment has already been settled.'
            : 'Weight, packages count, and freight charges cannot be modified on a PAID bilty. Payment has already been settled.'
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const updateFields = {
      docket_number: payload.docket_number || payload.lr_number || consignment.docket_number,
      lr_number: payload.lr_number || payload.docket_number || consignment.lr_number,
      origin_city: payload.origin_city || consignment.origin_city,
      destination_city: payload.destination_city || consignment.destination_city,
      consignor_id: consignorId,
      consignee_id: consigneeId,
      material_description: payload.material_description || payload.cargo_type || payload.cargoType || consignment.material_description,
      packages_count: packagesCount,
      package_type: payload.package_type || consignment.package_type,
      actual_weight: actualWeight,
      charged_weight: chargedWeight,
      rate,
      freight_amount: freightAmount,
      loading_charges: loadingCharges,
      unloading_charges: unloadingCharges,
      handling_charges: handlingCharges,
      hamali_charges: hamaliCharges,
      door_delivery_charges: doorDeliveryCharges,
      other_charges: otherCharges,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      delivery_type: payload.delivery_type || payload.deliveryType || consignment.delivery_type,
      payment_type: payload.payment_type || payload.payment_mode || consignment.payment_type,
      transport_mode: payload.transport_mode || payload.transportMode || consignment.transport_mode || 'ROAD',
      status: payload.status || consignment.status,
    };

    try {
      await consignment.update(updateFields, { transaction });
    } catch (updateErr) {
      if (updateErr.message && updateErr.message.includes('transport_mode')) {
        delete updateFields.transport_mode;
        await consignment.update(updateFields, { transaction });
      } else {
        throw updateErr;
      }
    }

    if (consignment.booking_id && Booking) {
      await Booking.update({
        origin_city: consignment.origin_city,
        destination_city: consignment.destination_city,
        consignor_id: consignorId,
        consignee_id: consigneeId,
      }, {
        where: { id: consignment.booking_id },
        transaction,
      });
    }

    await transaction.commit();
    return consignment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete a Docket / Consignment
 */
const deleteBooking = async ({ id, tenantId, models, sequelize: customSequelize }) => {
  const db = customSequelize || defaultSequelize;
  const Consignment = models?.Consignment || defaultModels.Consignment;
  const Booking = models?.Booking || defaultModels.Booking;
  const ConsignmentItem = models?.ConsignmentItem || defaultModels.ConsignmentItem;
  const ConsignmentStatusHistory = models?.ConsignmentStatusHistory || defaultModels.ConsignmentStatusHistory;

  const consignment = await Consignment.findOne({
    where: { id, tenant_id: tenantId },
  });

  if (!consignment) {
    throw new Error('Docket / Consignment not found');
  }

  const transaction = await db.transaction();

  try {
    if (ConsignmentItem) {
      await ConsignmentItem.destroy({ where: { consignment_id: id }, transaction });
    }
    if (ConsignmentStatusHistory) {
      await ConsignmentStatusHistory.destroy({ where: { consignment_id: id }, transaction });
    }

    const bookingId = consignment.booking_id;
    await consignment.destroy({ transaction });

    if (bookingId && Booking) {
      await Booking.destroy({ where: { id: bookingId }, transaction });
    }

    await transaction.commit();
    return { success: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  createBooking,
  listConsignments,
  getConsignmentDetail,
  updateBooking,
  deleteBooking,
};
