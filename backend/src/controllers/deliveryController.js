// src/controllers/deliveryController.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');
const { saveMediaFile } = require('../utils/fileStorage');

// Helper to resolve all sibling branches and city variations within a metro region
const resolveCityAndSiblingBranches = async (branchId, Branch, organizationId) => {
  if (!branchId || branchId === 'ALL' || !Branch) return { matchedBranchIds: [branchId].filter(Boolean), cityKeywords: [] };
  try {
    const branch = await Branch.findByPk(branchId);
    if (!branch) return { matchedBranchIds: [branchId].filter(Boolean), cityKeywords: [] };

    const branchCity = (branch.city || '').trim();
    const branchName = (branch.branch_name || '').trim();

    const cityKeywords = [];
    if (branchCity) cityKeywords.push(branchCity);

    if (/delhi/i.test(branchCity) || /delhi/i.test(branchName)) {
      cityKeywords.push('Delhi', 'South Delhi', 'North Delhi', 'New Delhi', 'West Delhi', 'East Delhi', 'Central Delhi');
    } else if (/mumbai/i.test(branchCity) || /mumbai/i.test(branchName)) {
      cityKeywords.push('Mumbai', 'Navi Mumbai', 'Thane', 'Bhiwandi');
    } else if (/bengaluru|bangalore/i.test(branchCity) || /bengaluru|bangalore/i.test(branchName)) {
      cityKeywords.push('Bengaluru', 'Bangalore');
    } else if (/kolkata|calcutta/i.test(branchCity) || /kolkata|calcutta/i.test(branchName)) {
      cityKeywords.push('Kolkata', 'Calcutta', 'Howrah');
    } else if (/chennai|madras/i.test(branchCity) || /chennai|madras/i.test(branchName)) {
      cityKeywords.push('Chennai', 'Madras');
    } else if (/hyderabad|secunderabad/i.test(branchCity) || /hyderabad|secunderabad/i.test(branchName)) {
      cityKeywords.push('Hyderabad', 'Secunderabad');
    } else if (/ahmedabad/i.test(branchCity) || /ahmedabad/i.test(branchName)) {
      cityKeywords.push('Ahmedabad', 'Gandhinagar');
    }

    const uniqueCities = Array.from(new Set(cityKeywords));

    const siblingWhere = {
      organization_id: organizationId,
      [Op.or]: [
        { city: { [Op.in]: uniqueCities } },
      ],
    };
    if (/delhi/i.test(branchCity) || /delhi/i.test(branchName)) {
      siblingWhere[Op.or].push({ branch_name: { [Op.like]: '%Delhi%' } });
    }
    if (/bengaluru|bangalore/i.test(branchCity) || /bengaluru|bangalore/i.test(branchName)) {
      siblingWhere[Op.or].push(
        { branch_name: { [Op.like]: '%Bengaluru%' } },
        { branch_name: { [Op.like]: '%Bangalore%' } }
      );
    }

    const siblings = await Branch.findAll({
      where: siblingWhere,
      attributes: ['id'],
      raw: true,
    });

    const matchedBranchIds = Array.from(new Set([branchId, ...siblings.map((s) => s.id)]));
    return { matchedBranchIds, cityKeywords: uniqueCities };
  } catch (err) {
    return { matchedBranchIds: [branchId].filter(Boolean), cityKeywords: [] };
  }
};

/**
 * List consignments for last-mile delivery operations at destination branches
 * Filterable by branch, operational tab, delivery type, payment type, search
 */
const listDeliveryOperations = async (req, res) => {
  try {
    const {
      Consignment,
      Customer,
      Branch,
      DeliveryRecord,
      Pod,
      Trip,
      TripConsignment,
    } = req.tenantDb || defaultModels;

    const {
      branch_id,
      tab = 'READY', // 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ALL'
      delivery_type, // 'DOOR_DELIVERY', 'GODOWN_DELIVERY'
      payment_type, // 'TO_PAY', 'PAID', 'TBB'
      search = '',
      page = 1,
      limit = 20,
      sort_by = 'updated_at',
      sort_order = 'DESC'
    } = req.query;

    const where = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
    };

    // Check if requester has admin privileges
    const isUserAdmin = Boolean(
      ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN'].includes(req.user?.role) ||
      (req.userRoles && req.userRoles.some((r) => ['SUPER_ADMIN', 'TRANSPORT_OWNER', 'ADMIN'].includes(r))) ||
      (req.userPermissions && req.userPermissions.includes('*')) ||
      req.tenant?.isSuperAdmin ||
      req.user?.is_owner
    );

    // Non-admins can strictly ONLY view their login branch
    let effectiveBranchId = branch_id;
    if (!isUserAdmin && req.user?.branch_id) {
      effectiveBranchId = req.user.branch_id;
    }

    // Auto-sync: If any trip is COMPLETED, ensure its loaded consignments that reached destination
    // are transitioned to REACHED_DESTINATION or RECEIVED_AT_HUB appropriately
    try {
      if (Trip && TripConsignment && Consignment) {
        const completedTrips = await Trip.findAll({
          where: {
            tenant_id: req.tenant.tenantId,
            organization_id: req.tenant.organizationId,
            status: 'COMPLETED',
          },
          attributes: ['id', 'dest_branch_id', 'destination_city'],
        });

        for (const trip of completedTrips) {
          if (!trip.dest_branch_id) continue;
          const tcs = await TripConsignment.findAll({
            where: { trip_id: trip.id },
            attributes: ['consignment_id'],
            raw: true,
          });

          if (tcs && tcs.length > 0) {
            const cIds = tcs.map((t) => t.consignment_id);
            const tripConsignments = await Consignment.findAll({
              where: { id: { [Op.in]: cIds } },
              attributes: ['id', 'dest_branch_id', 'status', 'current_branch_id'],
            });

            for (const c of tripConsignments) {
              const isFinalDestination = Boolean(c.dest_branch_id && String(c.dest_branch_id) === String(trip.dest_branch_id));
              const inTransitStatuses = ['DISPATCHED', 'IN_TRANSIT', 'LOADED', 'BOOKED', 'READY_FOR_DISPATCH'];

              const updates = {};
              // For all consignments on a completed trip, their physical location is now trip.dest_branch_id
              if (String(c.current_branch_id) !== String(trip.dest_branch_id)) {
                updates.current_branch_id = trip.dest_branch_id;
              }
              if (!c.dest_branch_id) {
                updates.dest_branch_id = trip.dest_branch_id;
              }
              if (inTransitStatuses.includes(c.status)) {
                updates.status = isFinalDestination ? 'REACHED_DESTINATION' : 'RECEIVED_AT_HUB';
              } else if (!isFinalDestination && c.status === 'REACHED_DESTINATION') {
                // If it was unloaded at an intermediate hub but final destination is another branch, ensure status is RECEIVED_AT_HUB
                updates.status = 'RECEIVED_AT_HUB';
              }
              if (Object.keys(updates).length > 0) {
                await c.update(updates);
              }
            }
          }
        }
      }
    } catch (syncErr) {
      console.warn('Completed trip consignment auto-sync notice:', syncErr.message);
    }

    const REACHED_STATUSES = [
      'REACHED_DESTINATION',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'POD_PENDING',
      'POD_UPLOADED',
      'COMPLETED',
      'DAMAGED',
      'SHORT_MATERIAL',
      'HOLD',
    ];

    // Resolve matched branch IDs and city keywords for metro hub routing
    let matchedBranchIds = effectiveBranchId && effectiveBranchId !== 'ALL' ? [effectiveBranchId] : [];
    let cityKeywords = [];
    if (effectiveBranchId && effectiveBranchId !== 'ALL' && Branch) {
      const resolved = await resolveCityAndSiblingBranches(effectiveBranchId, Branch, req.tenant.organizationId);
      matchedBranchIds = resolved.matchedBranchIds;
      cityKeywords = resolved.cityKeywords;
    }

    // Filter by branch: A docket belongs to this branch for last-mile delivery operations ONLY IF
    // its final destination is this branch (dest_branch_id).
    // Transshipment cargo sitting at an intermediate hub (destined elsewhere) must NEVER appear on Delivery page.
    if (effectiveBranchId && effectiveBranchId !== 'ALL') {
      const destConditions = [
        { dest_branch_id: { [Op.in]: matchedBranchIds } },
      ];
      if (cityKeywords.length > 0) {
        destConditions.push({
          destination_city: { [Op.in]: cityKeywords },
        });
      }

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({ [Op.or]: destConditions });
    }

    // Filter by delivery operational status tab (ONLY cargo that has arrived / unloaded at destination)
    if (tab === 'READY') {
      where.status = {
        [Op.in]: ['REACHED_DESTINATION', 'DAMAGED', 'SHORT_MATERIAL', 'HOLD']
      };
    } else if (tab === 'OUT_FOR_DELIVERY') {
      where.status = 'OUT_FOR_DELIVERY';
    } else if (tab === 'DELIVERED') {
      where.status = {
        [Op.in]: ['DELIVERED', 'POD_PENDING', 'POD_UPLOADED', 'COMPLETED']
      };
    } else if (tab === 'ALL') {
      where.status = {
        [Op.in]: REACHED_STATUSES
      };
    } else {
      where.status = tab;
    }

    // Delivery type filter
    if (delivery_type && delivery_type !== 'ALL') {
      where.delivery_type = delivery_type;
    }

    // Payment type filter
    if (payment_type && payment_type !== 'ALL') {
      where.payment_type = payment_type;
    }

    // Search filter across docket number, LR number, customer, city
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const searchConditions = [
        { docket_number: { [Op.like]: q } },
        { lr_number: { [Op.like]: q } },
        { origin_city: { [Op.like]: q } },
        { destination_city: { [Op.like]: q } },
      ];

      if (where[Op.or]) {
        // combine with branch or-clause
        where[Op.and] = [
          { [Op.or]: where[Op.or] },
          { [Op.or]: searchConditions }
        ];
        delete where[Op.or];
      } else {
        where[Op.or] = searchConditions;
      }
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const orderCol = ['updated_at', 'booking_date', 'lr_number', 'total_amount'].includes(sort_by)
      ? sort_by
      : 'updated_at';
    const orderDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Consignment.findAndCountAll({
      where,
      distinct: true,
      col: 'id',
      limit: parseInt(limit, 10),
      offset,
      order: [[orderCol, orderDir]],
      include: [
        {
          model: Customer,
          as: 'consignee',
          attributes: ['id', 'name', 'phone', 'email', 'city', ['billing_address', 'address'], 'gstin'],
        },
        {
          model: Customer,
          as: 'consignor',
          attributes: ['id', 'name', 'phone', 'city'],
        },
        {
          model: Branch,
          as: 'originBranch',
          attributes: ['id', 'branch_name', 'branch_code', 'city'],
        },
        {
          model: Branch,
          as: 'destBranch',
          attributes: ['id', 'branch_name', 'branch_code', 'city'],
        },
        {
          model: Branch,
          as: 'currentBranch',
          attributes: ['id', 'branch_name', 'branch_code', 'city'],
        },
        {
          model: DeliveryRecord,
          as: 'deliveryRecord',
          required: false,
        },
        {
          model: Pod,
          as: 'pod',
          required: false,
        },
      ],
    });

    // Deduplicate any rows in case database has duplicate DeliveryRecord or Pod child rows
    const uniqueRows = [];
    const seenConsignmentIds = new Set();
    const duplicateConsignmentIds = [];
    for (const r of rows) {
      const cId = r.id;
      if (!seenConsignmentIds.has(cId)) {
        seenConsignmentIds.add(cId);
        uniqueRows.push(r);
      } else {
        duplicateConsignmentIds.push(cId);
      }
    }

    // Background auto-cleanup of duplicate child delivery records if any exist
    if (duplicateConsignmentIds.length > 0 && DeliveryRecord && Pod) {
      (async () => {
        try {
          for (const dupId of duplicateConsignmentIds) {
            const allDelivs = await DeliveryRecord.findAll({
              where: { consignment_id: dupId, tenant_id: req.tenant.tenantId },
              order: [['created_at', 'DESC']],
            });
            if (allDelivs.length > 1) {
              const keepId = allDelivs[0].id;
              await DeliveryRecord.destroy({
                where: {
                  consignment_id: dupId,
                  tenant_id: req.tenant.tenantId,
                  id: { [Op.ne]: keepId },
                },
              });
            }

            const allPods = await Pod.findAll({
              where: { consignment_id: dupId, tenant_id: req.tenant.tenantId },
              order: [['created_at', 'DESC']],
            });
            if (allPods.length > 1) {
              const keepPodId = allPods[0].id;
              await Pod.destroy({
                where: {
                  consignment_id: dupId,
                  tenant_id: req.tenant.tenantId,
                  id: { [Op.ne]: keepPodId },
                },
              });
            }
          }
        } catch (cleanupErr) {
          console.warn('Auto cleanup duplicate deliveries notice:', cleanupErr.message);
        }
      })();
    }

    // Compute summary metrics for the selected branch (or whole tenant)
    const statsWhere = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      status: { [Op.in]: REACHED_STATUSES },
    };
    if (effectiveBranchId && effectiveBranchId !== 'ALL') {
      const statsOr = [
        { dest_branch_id: { [Op.in]: matchedBranchIds } },
      ];
      if (cityKeywords.length > 0) {
        statsOr.push({ destination_city: { [Op.in]: cityKeywords } });
      }
      statsWhere[Op.or] = statsOr;
    }

    const allBranchConsignments = await Consignment.findAll({
      where: statsWhere,
      attributes: ['id', 'status', 'delivery_type', 'payment_type', 'total_amount', 'packages_count'],
      raw: true,
    });

    let readyCount = 0;
    let readyPkgs = 0;
    let doorPendingCount = 0;
    let godownPendingCount = 0;
    let outForDeliveryCount = 0;
    let deliveredCount = 0;
    let pendingToPayAmount = 0;

    for (const item of allBranchConsignments) {
      const isReady = ['REACHED_DESTINATION', 'DAMAGED', 'SHORT_MATERIAL', 'HOLD'].includes(item.status);
      const isOut = item.status === 'OUT_FOR_DELIVERY';
      const isDelivered = ['DELIVERED', 'POD_PENDING', 'POD_UPLOADED', 'COMPLETED'].includes(item.status);

      if (isReady) {
        readyCount++;
        readyPkgs += Number(item.packages_count) || 0;
        if (item.delivery_type === 'DOOR_DELIVERY') {
          doorPendingCount++;
        } else {
          godownPendingCount++;
        }
      }

      if (isOut) {
        outForDeliveryCount++;
      }

      if (isDelivered) {
        deliveredCount++;
      }

      // If pending delivery and payment is TO_PAY, accumulate collection liability
      if ((isReady || isOut) && item.payment_type === 'TO_PAY') {
        pendingToPayAmount += Number(item.total_amount) || 0;
      }
    }

    const totalDocketsCount = typeof count === 'number' ? count : (Array.isArray(count) ? count.length : uniqueRows.length);

    return paginatedResponse(res, 'Delivery operations retrieved successfully', uniqueRows, {
      total: totalDocketsCount,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(totalDocketsCount / parseInt(limit, 10)),
      summary: {
        ready_in_godown_count: readyCount,
        ready_in_godown_packages: readyPkgs,
        door_delivery_pending_count: doorPendingCount,
        godown_pickup_pending_count: godownPendingCount,
        out_for_delivery_count: outForDeliveryCount,
        delivered_count: deliveredCount,
        pending_to_pay_amount: Math.round(pendingToPayAmount * 100) / 100,
      },
    });
  } catch (error) {
    console.error('listDeliveryOperations error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Direct Godown / Counter Handover (Self-Pickup by Consignee)
 * Verifies receiver identity, package tally, TO-PAY payment collection, and signs POD
 */
const markGodownDelivery = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const {
    Consignment,
    DeliveryRecord,
    Pod,
    ConsignmentStatusHistory,
    Branch,
    Customer
  } = req.tenantDb || defaultModels;

  const transaction = await db.transaction();
  try {
    const {
      consignment_id,
      receiver_name,
      receiver_phone,
      receiver_id_proof,
      delivered_packages,
      short_packages = 0,
      damaged_packages = 0,
      payment_collected = true,
      payment_mode = 'CASH',
      payment_ref = '',
      pod_file_url = '',
      receiver_signature_url = '',
      remarks = ''
    } = req.body;

    if (!consignment_id) {
      await transaction.rollback();
      return errorResponse(res, 'Consignment ID is required', null, 400);
    }

    if (!receiver_name || !receiver_name.trim()) {
      await transaction.rollback();
      return errorResponse(res, 'Receiver name is required for cargo handover', null, 400);
    }

    const consignment = await Consignment.findOne({
      where: {
        id: consignment_id,
        tenant_id: req.tenant.tenantId,
      },
      include: [
        { model: Customer, as: 'consignee' },
        { model: Branch, as: 'destBranch' }
      ],
      transaction,
    });

    if (!consignment) {
      await transaction.rollback();
      return errorResponse(res, 'Consignment not found', null, 404);
    }

    const pkgsToDeliver = parseInt(delivered_packages, 10) || consignment.packages_count;
    const shortPkgs = parseInt(short_packages, 10) || 0;
    const damagedPkgs = parseInt(damaged_packages, 10) || 0;

    const rawPhoto = (pod_file_url || '').trim();
    const rawSignature = (receiver_signature_url || '').trim();

    // Max 1.5 MB Base64 payload validation (~1.1 MB binary equivalent)
    const MAX_DB_BASE64_LENGTH = Math.round(1.5 * 1024 * 1024 * 1.37);
    if (rawPhoto.startsWith('data:') && rawPhoto.length > MAX_DB_BASE64_LENGTH) {
      await transaction.rollback();
      return errorResponse(res, 'POD image exceeds the 1 MB database storage limit. Please capture or compress a smaller photo.', null, 400);
    }

    // Create or update delivery record (prevents duplicates)
    let delivery = await DeliveryRecord.findOne({
      where: { consignment_id: consignment.id, tenant_id: req.tenant.tenantId },
      order: [['created_at', 'DESC']],
      transaction,
    });

    const deliveryPayload = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      consignment_id: consignment.id,
      branch_id: consignment.current_branch_id || consignment.dest_branch_id || req.user?.branch_id,
      delivery_date: new Date(),
      receiver_name: receiver_name.trim(),
      receiver_phone: receiver_phone ? receiver_phone.trim() : (consignment.consignee?.phone || ''),
      receiver_id_proof: receiver_id_proof || 'ID Verified at Counter',
      delivered_packages: pkgsToDeliver,
      damaged_packages: damagedPkgs,
      short_packages: shortPkgs,
      is_otp_verified: true,
      receiver_signature_url: rawSignature,
      delivery_photo_url: rawPhoto,
      remarks: `[GODOWN COUNTER DELIVERY] Paid: ${consignment.payment_type} (${payment_mode}${payment_ref ? ` - Ref: ${payment_ref}` : ''}) | ${remarks || 'Goods handed over at godown counter'}`,
      delivered_by: req.user?.id || consignment.dest_branch_id,
    };

    if (delivery) {
      await delivery.update(deliveryPayload, { transaction });
      await DeliveryRecord.destroy({
        where: {
          consignment_id: consignment.id,
          tenant_id: req.tenant.tenantId,
          id: { [Op.ne]: delivery.id },
        },
        transaction,
      });
    } else {
      delivery = await DeliveryRecord.create(deliveryPayload, { transaction });
    }

    // If POD photo/document provided, create or update POD record
    let podRecord = null;
    if (rawPhoto) {
      podRecord = await Pod.findOne({
        where: { consignment_id: consignment.id, tenant_id: req.tenant.tenantId },
        order: [['created_at', 'DESC']],
        transaction,
      });

      const podPayload = {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        consignment_id: consignment.id,
        file_url: rawPhoto,
        file_type: rawPhoto.includes('application/pdf') ? 'application/pdf' : 'image/jpeg',
        receiver_name: receiver_name.trim(),
        status: 'POD_UPLOADED',
        uploaded_at: new Date(),
        uploaded_by: req.user?.id || null,
      };

      if (podRecord) {
        await podRecord.update(podPayload, { transaction });
        await Pod.destroy({
          where: {
            consignment_id: consignment.id,
            tenant_id: req.tenant.tenantId,
            id: { [Op.ne]: podRecord.id },
          },
          transaction,
        });
      } else {
        podRecord = await Pod.create(podPayload, { transaction });
      }
    }

    // Status update: DELIVERED or POD_UPLOADED
    const finalStatus = rawPhoto ? 'POD_UPLOADED' : 'DELIVERED';
    await consignment.update({ status: finalStatus }, { transaction });

    // Status Timeline Entry
    await ConsignmentStatusHistory.create({
      consignment_id: consignment.id,
      status: finalStatus,
      location: consignment.destination_city || 'Godown Counter',
      branch_id: consignment.current_branch_id || consignment.dest_branch_id,
      user_id: req.user?.id || null,
      remarks: `Godown counter delivery completed to ${receiver_name.trim()} (${receiver_phone || 'Phone N/A'}). Packages: ${pkgsToDeliver}/${consignment.packages_count}. Payment: ${consignment.payment_type} settled via ${payment_mode}.`,
      timestamp: new Date(),
    }, { transaction });

    await transaction.commit();

    try {
      logAudit({
        req,
        action: 'GODOWN_HANDOVER',
        entityType: 'CONSIGNMENT',
        entityId: consignment.docket_number || consignment.lr_number,
        entityName: `Docket ${consignment.docket_number || consignment.lr_number}`,
        summary: `Completed godown counter handover of ${consignment.docket_number || consignment.lr_number} to ${receiver_name}. Mode: ${payment_mode}, Pkgs: ${pkgsToDeliver}`,
        newValues: {
          receiver_name,
          receiver_phone,
          delivered_packages: pkgsToDeliver,
          short_packages: shortPkgs,
          damaged_packages: damagedPkgs,
          payment_mode,
          payment_ref,
          has_pod: Boolean(pod_file_url),
        },
      });
    } catch (auditErr) {
      console.warn('logAudit warning in markGodownDelivery:', auditErr.message);
    }

    return successResponse(res, 'Godown counter delivery completed successfully', {
      consignment_id: consignment.id,
      docket_number: consignment.docket_number || consignment.lr_number,
      delivery_id: delivery.id,
      status: finalStatus,
      receiver_name,
      delivered_packages: pkgsToDeliver,
      gate_pass_no: `GP-${new Date().getFullYear()}-${String(delivery.id).slice(0, 8).toUpperCase()}`,
      pod: podRecord,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('markGodownDelivery error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Create Delivery Run Sheet (DRS) for Doorstep Delivery
 * Dispatches multiple dockets with a local delivery vehicle & driver
 */
const createDrs = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const {
    Consignment,
    ConsignmentStatusHistory,
    Branch,
    Customer
  } = req.tenantDb || defaultModels;

  const transaction = await db.transaction();
  try {
    const {
      consignment_ids,
      vehicle_number,
      driver_name,
      driver_phone,
      delivery_area,
      remarks
    } = req.body;

    if (!Array.isArray(consignment_ids) || consignment_ids.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'Please select at least one consignment for the Delivery Run Sheet (DRS)', null, 400);
    }

    if (!vehicle_number || !driver_name) {
      await transaction.rollback();
      return errorResponse(res, 'Delivery vehicle number and driver name are required', null, 400);
    }

    if (driver_phone && String(driver_phone).trim()) {
      const cleanPhone = String(driver_phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        await transaction.rollback();
        return errorResponse(res, 'Driver mobile phone must be exactly 10 digits', null, 400);
      }
    }

    // Generate unique DRS Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.floor(1000 + Math.random() * 9000);
    const drsNumber = `DRS-${dateStr}-${randStr}`;

    const consignments = await Consignment.findAll({
      where: {
        id: { [Op.in]: consignment_ids },
        tenant_id: req.tenant.tenantId,
      },
      include: [
        { model: Customer, as: 'consignee' },
        { model: Branch, as: 'destBranch' }
      ],
      transaction,
    });

    if (consignments.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'No valid consignments found for dispatch', null, 404);
    }

    let totalPkgs = 0;
    let totalWeight = 0;
    let totalToPayCash = 0;

    for (const c of consignments) {
      totalPkgs += Number(c.packages_count) || 0;
      totalWeight += Number(c.charged_weight || c.actual_weight) || 0;
      if (c.payment_type === 'TO_PAY') {
        totalToPayCash += Number(c.total_amount) || 0;
      }

      // Update status to OUT_FOR_DELIVERY
      await c.update({
        status: 'OUT_FOR_DELIVERY',
      }, { transaction });

      // Add timeline history
      await ConsignmentStatusHistory.create({
        consignment_id: c.id,
        status: 'OUT_FOR_DELIVERY',
        location: c.destination_city || 'Local Delivery Area',
        branch_id: c.current_branch_id || c.dest_branch_id,
        user_id: req.user?.id || null,
        remarks: `Dispatched on DRS #${drsNumber} | Vehicle: ${vehicle_number.toUpperCase()} | Driver: ${driver_name} (${driver_phone || 'N/A'}) | Area: ${delivery_area || 'Destination Doorstep'}`,
        timestamp: new Date(),
      }, { transaction });
    }

    await transaction.commit();

    try {
      logAudit({
        req,
        action: 'CREATE_DRS',
        entityType: 'DRS',
        entityId: drsNumber,
        entityName: `DRS ${drsNumber}`,
        summary: `Created Delivery Run Sheet #${drsNumber} with ${consignments.length} dockets for Vehicle ${vehicle_number}. Driver: ${driver_name}`,
        newValues: {
          drs_number: drsNumber,
          vehicle_number,
          driver_name,
          driver_phone,
          delivery_area,
          dockets_count: consignments.length,
          total_packages: totalPkgs,
          total_weight: totalWeight,
          to_pay_cash_to_collect: totalToPayCash,
        },
      });
    } catch (auditErr) {
      console.warn('logAudit warning in createDrs:', auditErr.message);
    }

    return successResponse(res, `Delivery Run Sheet #${drsNumber} created successfully`, {
      drs_number: drsNumber,
      dispatched_at: new Date(),
      vehicle_number: vehicle_number.toUpperCase(),
      driver_name,
      driver_phone: driver_phone || '',
      delivery_area: delivery_area || '',
      total_dockets: consignments.length,
      total_packages: totalPkgs,
      total_weight: totalWeight,
      total_to_pay_to_collect: Math.round(totalToPayCash * 100) / 100,
      dockets: consignments.map((c) => ({
        id: c.id,
        docket_number: c.docket_number || c.lr_number,
        consignee_name: c.consignee?.name || 'N/A',
        consignee_phone: c.consignee?.phone || 'N/A',
        consignee_address: c.consignee?.address || c.destination_city,
        packages_count: c.packages_count,
        payment_type: c.payment_type,
        to_pay_amount: c.payment_type === 'TO_PAY' ? c.total_amount : 0,
      })),
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('createDrs error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Mark a single consignment OUT_FOR_DELIVERY (quick action)
 */
const markOutForDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { Consignment, ConsignmentStatusHistory } = req.tenantDb || defaultModels;

    const consignment = await Consignment.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
    });

    if (!consignment) {
      return errorResponse(res, 'Consignment not found', null, 404);
    }

    await consignment.update({ status: 'OUT_FOR_DELIVERY' });

    await ConsignmentStatusHistory.create({
      consignment_id: consignment.id,
      status: 'OUT_FOR_DELIVERY',
      location: consignment.destination_city,
      branch_id: consignment.current_branch_id || consignment.dest_branch_id,
      user_id: req.user?.id || null,
      remarks: 'Cargo dispatched for local doorstep delivery',
      timestamp: new Date(),
    });

    return successResponse(res, 'Consignment marked OUT FOR DELIVERY', consignment);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Mark a consignment DELIVERED (Doorstep or general)
 */
const markDelivered = async (req, res) => {
  const db = req.tenantSequelize || defaultModels.sequelize;
  const { Consignment, DeliveryRecord, Pod, ConsignmentStatusHistory } = req.tenantDb || defaultModels;
  const transaction = await db.transaction();
  try {
    const { id } = req.params;
    const {
      receiver_name,
      receiver_phone,
      receiver_id_proof,
      delivered_packages,
      damaged_packages = 0,
      short_packages = 0,
      payment_mode = 'CASH',
      payment_ref = '',
      pod_file_url = '',
      receiver_signature_url = '',
      delivery_photo_url = '',
      remarks = ''
    } = req.body;

    if (!receiver_name || !receiver_name.trim()) {
      await transaction.rollback();
      return errorResponse(res, 'Receiver name is required for delivery sign-off', null, 400);
    }

    const consignment = await Consignment.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      transaction,
    });

    if (!consignment) {
      await transaction.rollback();
      return errorResponse(res, 'Consignment not found', null, 404);
    }

    const rawPhoto = (pod_file_url || delivery_photo_url || '').trim();
    const rawSignature = (receiver_signature_url || '').trim();

    // Max 1.5 MB Base64 payload validation (~1.1 MB binary equivalent)
    const MAX_DB_BASE64_LENGTH = Math.round(1.5 * 1024 * 1024 * 1.37);
    if (rawPhoto.startsWith('data:') && rawPhoto.length > MAX_DB_BASE64_LENGTH) {
      await transaction.rollback();
      return errorResponse(res, 'POD image exceeds the 1 MB database storage limit. Please capture or compress a smaller photo.', null, 400);
    }

    const pkgsDelivered = parseInt(delivered_packages, 10) || consignment.packages_count;

    // Create or update delivery record (prevents duplicates)
    let delivery = await DeliveryRecord.findOne({
      where: { consignment_id: consignment.id, tenant_id: req.tenant.tenantId },
      order: [['created_at', 'DESC']],
      transaction,
    });

    const deliveryPayload = {
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      consignment_id: consignment.id,
      branch_id: consignment.current_branch_id || consignment.dest_branch_id || req.user?.branch_id,
      delivery_date: new Date(),
      receiver_name: receiver_name.trim(),
      receiver_phone: receiver_phone || '',
      receiver_id_proof: receiver_id_proof || 'Verified',
      delivered_packages: pkgsDelivered,
      damaged_packages: parseInt(damaged_packages, 10) || 0,
      short_packages: parseInt(short_packages, 10) || 0,
      is_otp_verified: true,
      receiver_signature_url: rawSignature,
      delivery_photo_url: rawPhoto,
      remarks: `Delivered to recipient. Payment: ${consignment.payment_type} (${payment_mode}${payment_ref ? ` - ${payment_ref}` : ''}) | ${remarks || 'Delivered successfully'}`,
      delivered_by: req.user?.id || null,
    };

    if (delivery) {
      await delivery.update(deliveryPayload, { transaction });
      // Delete any duplicate delivery records for this consignment
      await DeliveryRecord.destroy({
        where: {
          consignment_id: consignment.id,
          tenant_id: req.tenant.tenantId,
          id: { [Op.ne]: delivery.id },
        },
        transaction,
      });
    } else {
      delivery = await DeliveryRecord.create(deliveryPayload, { transaction });
    }

    // If POD photo attached, save or update POD record (prevents duplicate POD rows)
    if (rawPhoto) {
      let podRecord = await Pod.findOne({
        where: { consignment_id: consignment.id, tenant_id: req.tenant.tenantId },
        order: [['created_at', 'DESC']],
        transaction,
      });

      const podPayload = {
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
        consignment_id: consignment.id,
        file_url: rawPhoto,
        file_type: rawPhoto.includes('application/pdf') ? 'application/pdf' : 'image/jpeg',
        receiver_name: receiver_name.trim(),
        status: 'POD_UPLOADED',
        uploaded_at: new Date(),
        uploaded_by: req.user?.id || null,
      };

      if (podRecord) {
        await podRecord.update(podPayload, { transaction });
        await Pod.destroy({
          where: {
            consignment_id: consignment.id,
            tenant_id: req.tenant.tenantId,
            id: { [Op.ne]: podRecord.id },
          },
          transaction,
        });
      } else {
        await Pod.create(podPayload, { transaction });
      }
    }

    const nextStatus = rawPhoto ? 'POD_UPLOADED' : 'DELIVERED';
    await consignment.update({ status: nextStatus }, { transaction });

    // Timeline update
    await ConsignmentStatusHistory.create({
      consignment_id: consignment.id,
      status: nextStatus,
      location: consignment.destination_city,
      branch_id: consignment.current_branch_id || consignment.dest_branch_id,
      user_id: req.user?.id || null,
      remarks: `Material handed over to ${receiver_name.trim()} (${receiver_phone || 'Phone N/A'}). Packages: ${pkgsDelivered}/${consignment.packages_count}.`,
      timestamp: new Date(),
    }, { transaction });

    await transaction.commit();

    try {
      logAudit({
        req,
        action: 'DELIVERY_COMPLETED',
        entityType: 'CONSIGNMENT',
        entityId: consignment.docket_number || consignment.lr_number,
        entityName: `Docket ${consignment.docket_number || consignment.lr_number}`,
        summary: `Delivered ${consignment.docket_number || consignment.lr_number} to ${receiver_name.trim()}`,
        newValues: {
          receiver_name,
          receiver_phone,
          delivered_packages: pkgsDelivered,
          has_pod: Boolean(rawPhoto),
        },
      });
    } catch (auditErr) {
      console.warn('logAudit warning in markDelivered:', auditErr.message);
    }

    return successResponse(res, 'Consignment marked DELIVERED', delivery);
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('markDelivered error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Fetch Gate Pass / Delivery Challan Data
 */
const getGatePass = async (req, res) => {
  try {
    const { id } = req.params;
    const { Consignment, Customer, Branch, DeliveryRecord, Pod, Organization } = req.tenantDb || defaultModels;

    const consignment = await Consignment.findOne({
      where: { id, tenant_id: req.tenant.tenantId },
      include: [
        { model: Customer, as: 'consignee' },
        { model: Customer, as: 'consignor' },
        { model: Branch, as: 'destBranch' },
        { model: Branch, as: 'originBranch' },
        { model: DeliveryRecord, as: 'deliveryRecord' },
        { model: Pod, as: 'pod' },
      ],
    });

    if (!consignment) {
      return errorResponse(res, 'Consignment not found', null, 404);
    }

    const org = await Organization.findByPk(req.tenant.organizationId);

    const gatePassData = {
      gate_pass_number: `GP-${new Date().getFullYear()}-${consignment.lr_number || String(consignment.id).slice(0, 6)}`,
      generated_at: new Date(),
      transporter: {
        name: org?.name || 'TransHub Logistics',
        gstin: org?.gstin || '',
        phone: org?.phone || '',
      },
      branch: {
        name: consignment.destBranch?.branch_name || 'Destination Branch',
        code: consignment.destBranch?.branch_code || '',
        city: consignment.destBranch?.city || consignment.destination_city,
      },
      consignment: {
        id: consignment.id,
        docket_number: consignment.docket_number || consignment.lr_number,
        lr_number: consignment.lr_number,
        booking_date: consignment.booking_date,
        delivery_type: consignment.delivery_type,
        payment_type: consignment.payment_type,
        freight_amount: consignment.total_amount,
        packages_count: consignment.packages_count,
        package_type: consignment.package_type,
        material_description: consignment.material_description,
        actual_weight: consignment.actual_weight,
        charged_weight: consignment.charged_weight,
        consignor_name: consignment.consignor?.name,
        consignor_city: consignment.origin_city,
        consignee_name: consignment.consignee?.name,
        consignee_address: consignment.consignee?.billing_address || consignment.consignee?.address || '',
        consignee_phone: consignment.consignee?.phone,
      },
      delivery: consignment.deliveryRecord || null,
      pod: consignment.pod || null,
    };

    return successResponse(res, 'Gate Pass retrieved successfully', gatePassData);
  } catch (error) {
    console.error('getGatePass error:', error);
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listDeliveryOperations,
  markGodownDelivery,
  createDrs,
  markOutForDelivery,
  markDelivered,
  getGatePass,
};
