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

  // 4. Automatically sync all 39 operational tables into the newly created database
  await tenantSequelize.sync({ alter: false });

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
 * Resolves or establishes an active connection pool to a tenant's MySQL database
 */
const getTenantConnection = async (dbName) => {
  if (!dbName) {
    return {
      dbName: process.env.DB_NAME || 'transporter_master',
      sequelize: masterSequelize,
      models: require('../models'),
    };
  }

  // Return cached connection pool if available
  if (tenantConnections.has(dbName)) {
    return tenantConnections.get(dbName);
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

  const connectionObj = {
    dbName,
    sequelize: tenantSequelize,
    models: tenantModels,
  };

  tenantConnections.set(dbName, connectionObj);
  return connectionObj;
};

module.exports = {
  createTenantDatabase,
  getTenantConnection,
};
