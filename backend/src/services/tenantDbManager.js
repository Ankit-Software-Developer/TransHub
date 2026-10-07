// src/services/tenantDbManager.js
const { Sequelize } = require('sequelize');
const { sequelize: masterSequelize, initTenantModels } = require('../models');

// In-memory cache of active tenant database Sequelize instances & models
const tenantConnections = new Map();

/**
 * Creates an isolated MySQL database for a registered transporter
 * Naming convention: transporter_t_<sanitized_company_name>_<timestamp>
 */
const createTenantDatabase = async (companyName) => {
  const cleanName = (companyName || 'tenant')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  const timestamp = Date.now().toString(36);
  const dbName = `transporter_t_${cleanName || 'org'}_${timestamp}`;

  // 1. Create MySQL Database using Master Connection
  await masterSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

  // 2. Establish Sequelize pool for new tenant database
  const tenantSequelize = new Sequelize(
    dbName,
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'Ankit@6980',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        decimalNumbers: true,
        charset: 'utf8mb4',
      },
      define: {
        underscored: true,
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
      },
    }
  );

  // 3. Initialize strictly tenant operational models (39 tables, excluding master-only tables)
  const tenantModels = initTenantModels(tenantSequelize);

  // 4. Automatically sync all operational tables and columns into the newly created database
  try {
    await tenantSequelize.sync({ alter: true });
  } catch (syncErr) {
    await tenantSequelize.sync();
  }

  // 5. Cache the connection instance
  const connectionObj = {
    dbName,
    sequelize: tenantSequelize,
    models: tenantModels,
  };

  tenantConnections.set(dbName, connectionObj);
  console.log(`✅ [Multi-Tenant DB] Successfully provisioned isolated MySQL database: ${dbName}`);

  return connectionObj;
};

/**
 * Safely inspects MySQL tables and adds any missing columns defined in Sequelize models
 * without dropping indexes or failing on foreign keys.
 */
const ensureTableColumns = async (sequelize, models) => {
  if (!sequelize || !models) return;
  try {
    const queryInterface = sequelize.getQueryInterface();
    const modelList = Object.values(models);

    for (const model of modelList) {
      if (!model || !model.tableName || typeof model !== 'function') continue;
      try {
        const tableDescription = await queryInterface.describeTable(model.tableName).catch(() => null);
        if (!tableDescription) continue;

        const rawAttributes = model.rawAttributes || {};
        for (const [colName, colDef] of Object.entries(rawAttributes)) {
          const fieldName = colDef.field || colName;
          if (!tableDescription[fieldName] && !tableDescription[colName]) {
            try {
              await queryInterface.addColumn(model.tableName, fieldName, colDef);
              console.log(`✅ [Multi-Tenant DB Auto-Sync] Added missing column '${fieldName}' to table '${model.tableName}' in ${sequelize.config.database}`);
            } catch (colErr) {
              if (!colErr.message.includes('Duplicate column')) {
                console.warn(`⚠️ [Multi-Tenant DB Auto-Sync] Column add notice for ${model.tableName}.${fieldName}:`, colErr.message);
              }
            }
          }
        }
      } catch (tblErr) {
        // Continue
      }
    }
  } catch (err) {
    console.warn('ensureTableColumns warning:', err.message);
  }
};

/**
 * Direct alter query runner for essential columns
 */
const applyEssentialPatches = async (sequelize) => {
  if (!sequelize) return;
  const masterDbName = process.env.DB_NAME || 'transporter_master';
  const currentDbName = sequelize.config?.database || masterDbName;
  const isMaster = currentDbName === masterDbName;

  const commonQueries = [
    'ALTER TABLE organizations MODIFY COLUMN logo_url LONGTEXT;',
    "ALTER TABLE consignments ADD COLUMN transport_mode VARCHAR(30) DEFAULT 'ROAD';",
    'ALTER TABLE vehicles ADD COLUMN make_model VARCHAR(100);',
    'ALTER TABLE vehicles ADD COLUMN fastag_id VARCHAR(50);',
    'ALTER TABLE vehicles ADD COLUMN gps_device_id VARCHAR(50);',
    'ALTER TABLE vehicles ADD COLUMN current_odometer INT DEFAULT 0;',
    'ALTER TABLE vehicles ADD COLUMN manufacturing_year INT;',
    "ALTER TABLE vehicles ADD COLUMN fuel_type VARCHAR(20) DEFAULT 'DIESEL';",
    'ALTER TABLE vehicles ADD COLUMN owner_name VARCHAR(100);',
    'ALTER TABLE vehicles ADD COLUMN owner_phone VARCHAR(20);',
    'ALTER TABLE vehicles ADD COLUMN chassis_number VARCHAR(50);',
    'ALTER TABLE vehicles ADD COLUMN engine_number VARCHAR(50);',
    'ALTER TABLE vehicles ADD COLUMN assigned_driver_id CHAR(36);',
    'ALTER TABLE drivers ADD COLUMN branch_id CHAR(36);',
    `CREATE TABLE IF NOT EXISTS approval_requests (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      organization_id VARCHAR(36) NOT NULL,
      branch_id VARCHAR(36) NOT NULL,
      request_type VARCHAR(50) NOT NULL DEFAULT 'EXPENSE_CLAIM',
      reference_id VARCHAR(36) NULL,
      reference_code VARCHAR(50) NULL,
      amount DECIMAL(12, 2) DEFAULT 0.00,
      requester_id VARCHAR(36) NOT NULL,
      approval_level VARCHAR(50) NOT NULL DEFAULT 'BRANCH_MANAGER',
      assigned_user_id VARCHAR(36) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      reviewer_id VARCHAR(36) NULL,
      reviewed_at DATETIME NULL,
      requester_notes TEXT NULL,
      reviewer_comments TEXT NULL,
      supporting_document_url VARCHAR(500) NULL,
      meta_data JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  ];

  if (isMaster) {
    // 1. Run common master patches
    for (const q of commonQueries) {
      await sequelize.query(q).catch(() => {});
    }

    // 2. Clean Master DB users table: Drop operational/HR/KYC columns
    const extraStaffColumns = [
      'staff_code',
      'designation',
      'joining_date',
      'aadhaar_number',
      'pan_number',
      'address',
      'emergency_contact',
      'salary_amount',
      'salary_type',
      'document_url',
    ];
    for (const col of extraStaffColumns) {
      await sequelize.query(`ALTER TABLE \`users\` DROP COLUMN \`${col}\`;`).catch(() => {});
    }
  } else {
    // Tenant DB: Ensure operational staff & driver columns are present
    const tenantQueries = [
      ...commonQueries,
      'ALTER TABLE users ADD COLUMN staff_code VARCHAR(50);',
      'ALTER TABLE users ADD COLUMN designation VARCHAR(100);',
      'ALTER TABLE users ADD COLUMN joining_date DATE;',
      'ALTER TABLE users ADD COLUMN aadhaar_number VARCHAR(30);',
      'ALTER TABLE users ADD COLUMN pan_number VARCHAR(30);',
      'ALTER TABLE users ADD COLUMN address TEXT;',
      'ALTER TABLE users ADD COLUMN emergency_contact VARCHAR(100);',
      'ALTER TABLE users ADD COLUMN salary_amount DECIMAL(12, 2) DEFAULT 0;',
      "ALTER TABLE users ADD COLUMN salary_type VARCHAR(30) DEFAULT 'MONTHLY';",
      'ALTER TABLE users ADD COLUMN document_url LONGTEXT;',
    ];

    for (const q of tenantQueries) {
      await sequelize.query(q).catch(() => {});
    }
  }
};

/**
 * Resolves or establishes an active connection pool to a tenant's MySQL database
 */
const getTenantConnection = async (dbName) => {
  if (!dbName) {
    await applyEssentialPatches(masterSequelize);
    return {
      dbName: process.env.DB_NAME || 'transporter_master',
      sequelize: masterSequelize,
      models: require('../models'),
    };
  }

  // Return cached connection pool if available
  if (tenantConnections.has(dbName)) {
    const cached = tenantConnections.get(dbName);
    if (!cached._patched) {
      cached._patched = true;
      applyEssentialPatches(cached.sequelize).catch(() => {});
      ensureTableColumns(cached.sequelize, cached.models).catch(() => {});
    }
    return cached;
  }

  // Create new pool for tenant database
  const tenantSequelize = new Sequelize(
    dbName,
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'Ankit@6980',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 15,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        decimalNumbers: true,
        charset: 'utf8mb4',
      },
      define: {
        underscored: true,
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
      },
    }
  );

  const tenantModels = initTenantModels(tenantSequelize);

  // Apply patches and sync
  await applyEssentialPatches(tenantSequelize);
  await ensureTableColumns(tenantSequelize, tenantModels);

  try {
    await tenantSequelize.sync({ alter: true });
  } catch (syncErr) {
    try {
      await tenantSequelize.sync();
    } catch (fallbackErr) {
      console.warn(`[Multi-Tenant DB] Auto-sync notice for ${dbName}:`, fallbackErr.message);
    }
  }

  const connectionObj = {
    dbName,
    sequelize: tenantSequelize,
    models: tenantModels,
    _patched: true,
  };

  tenantConnections.set(dbName, connectionObj);
  return connectionObj;
};

module.exports = {
  createTenantDatabase,
  getTenantConnection,
  ensureTableColumns,
  applyEssentialPatches,
};
