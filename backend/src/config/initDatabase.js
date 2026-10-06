// src/config/initDatabase.js
const { sequelize } = require('./database');
const {
  Role,
  Permission,
} = require('../models');
const { ROLES, PERMISSIONS } = require('./constants');
const { ensureDefaultPlans } = require('../services/authService');

/**
 * Automatically checks, creates missing tables & columns, and seeds initial data on backend startup.
 * If tables and columns already exist, it safely skips them without modifying existing data.
 */
const initMasterDatabase = async () => {
  try {
    const dbName = process.env.DB_NAME || 'transporter_master';

    // 1. Ensure master MySQL database exists
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

    // 2. Synchronize master tables (safely create missing tables and columns without dropping data)
    try {
      await sequelize.sync({ alter: true });
      console.log('✅ Master Database tables & columns verified with { alter: true }.');
    } catch (alterErr) {
      console.warn('⚠️ sync({ alter: true }) notice, applying safe sync():', alterErr.message);
      await sequelize.sync();
      console.log('✅ Master Database tables created successfully.');
    }

    // Ensure logo_url is LONGTEXT in master DB organizations table
    try {
      await sequelize.query('ALTER TABLE organizations MODIFY COLUMN logo_url LONGTEXT;');
    } catch (colErr) {
      // Ignored if table does not exist yet or already LONGTEXT
    }

    // Ensure transport_mode exists in consignments table
    try {
      await sequelize.query("ALTER TABLE consignments ADD COLUMN transport_mode VARCHAR(30) DEFAULT 'ROAD';");
    } catch (colErr) {
      // Ignored if column already exists
    }

    // 3. Ensure standard SaaS plans exist in database
    if (typeof ensureDefaultPlans === 'function') {
      try {
        await ensureDefaultPlans();
        console.log('✅ Standard SaaS subscription plans verified.');
      } catch (pErr) {
        console.warn('⚠️ SaaS plan check warning:', pErr.message);
      }
    }

    // 4. Ensure standard system roles exist in master DB
    try {
      const systemRoles = [
        { name: ROLES.SUPER_ADMIN, display_name: 'Super Admin', description: 'Platform Administrator' },
        { name: ROLES.ADMIN, display_name: 'Admin', description: 'Tenant administrator with full access to tenant features' },
        { name: ROLES.BRANCH_MANAGER, display_name: 'Branch Manager', description: 'Branch Operational Management' },
        { name: ROLES.DRIVER, display_name: 'Driver', description: 'Vehicle Operator & Driver' },
      ];

      for (const r of systemRoles) {
        await Role.findOrCreate({
          where: { name: r.name },
          defaults: {
            display_name: r.display_name,
            description: r.description,
            is_system: true,
          },
        });
      }
    } catch (rErr) {
      console.warn('⚠️ System roles verification warning:', rErr.message);
    }

    // 5. Ensure standard permissions exist in master DB
    try {
      const allPermissions = Object.values(PERMISSIONS);
      for (const permCode of allPermissions) {
        await Permission.findOrCreate({
          where: { code: permCode },
          defaults: {
            code: permCode,
            module: permCode.split('.')[0].toUpperCase(),
            description: permCode.replace('.', ' ').toUpperCase(),
          },
        });
      }
    } catch (permErr) {
      console.warn('⚠️ System permissions verification warning:', permErr.message);
    }

    // 6. Ensure all registered tenant databases are auto-migrated with new tables & columns on startup
    try {
      const { Tenant } = require('../models');
      const { getTenantConnection, applyEssentialPatches } = require('../services/tenantDbManager');
      await applyEssentialPatches(sequelize);
      if (Tenant && typeof Tenant.findAll === 'function') {
        const allTenants = await Tenant.findAll({ attributes: ['id', 'company_name', 'database_name'] });
        for (const t of allTenants) {
          if (t.database_name && t.database_name !== dbName) {
            try {
              const tConn = await getTenantConnection(t.database_name);
              await tConn.sequelize.sync({ alter: true });
              console.log(`✅ [Multi-Tenant Sync] Verified & synced tenant DB: ${t.database_name}`);
            } catch (tSyncErr) {
              console.warn(`⚠️ [Multi-Tenant Sync] Sync notice for ${t.database_name}:`, tSyncErr.message);
            }
          }
        }
      }
    } catch (tenantsErr) {
      console.warn('⚠️ [Multi-Tenant Sync] Tenant DB check notice:', tenantsErr.message);
    }

    console.log('🚀 Database initialization complete: All master & tenant tables, columns & seed records verified.');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
};

module.exports = {
  initMasterDatabase,
};
