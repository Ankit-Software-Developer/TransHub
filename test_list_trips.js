const { getTenantConnection } = require('./backend/src/services/tenantDbManager');
const defaultModels = require('./backend/src/models');
const { Op } = require('sequelize');

async function testListTrips() {
  const tenantConn = await getTenantConnection('transporter_t_test_mvgmyy59');
  const { Trip, Vehicle, Driver, Branch, Dispatch, Consignment, Customer, Vendor } = tenantConn.models;

  const req = {
    query: {
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'DESC',
      // Let's test with no branch_id (All branches)
    },
    tenant: {
      tenantId: 'd12ed5dc-b8e8-42ad-8478-173a5549e0b6',
      organizationId: '5e916218-4a36-45c5-a489-f100cc1a832c',
    },
    user: {
      id: 'd0e1183a-159a-4692-9171-50d20c663ea0',
      branch_id: '0707d5d9-fbbb-49ee-b4d6-60a02eac1f34',
      is_owner: true,
    },
    userRoles: ['TRANSPORT_OWNER'],
    tenantDb: tenantConn.models,
  };

  const where = {
    tenant_id: req.tenant.tenantId,
    organization_id: req.tenant.organizationId,
  };

  const findOptions = {
    where,
    limit: 20,
    offset: 0,
    order: [['created_at', 'DESC']],
    distinct: true,
    col: 'id',
    include: [
      { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicle_number', 'capacity_ton', 'vehicle_type', 'ownership'], required: false },
      { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'], required: false },
      { model: Branch, as: 'originBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'is_hub'], required: false },
      { model: Branch, as: 'destBranch', attributes: ['id', 'branch_code', 'branch_name', 'city', 'is_hub'], required: false },
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'company_name'], required: false },
      { model: Vendor, as: 'vendor', attributes: ['id', 'name', 'phone', 'company_name'], required: false },
      { model: Dispatch, as: 'dispatches', attributes: ['id', 'dispatch_number', 'seal_number'], required: false },
      {
        model: Consignment,
        as: 'consignments',
        attributes: ['id', 'docket_number', 'load_type'],
        through: { attributes: [] },
        required: false,
      },
    ],
  };

  try {
    const { count, rows } = await Trip.findAndCountAll(findOptions);
    console.log('Result count:', count);
    console.log('Rows found:', rows.length);
    if (rows.length > 0) {
      console.log('Sample trip:', rows[0].trip_number, rows[0].status, rows[0].origin_city, rows[0].destination_city);
    }
  } catch (err) {
    console.error('Error executing findAndCountAll:', err);
  }

  process.exit(0);
}

testListTrips().catch(console.error);
