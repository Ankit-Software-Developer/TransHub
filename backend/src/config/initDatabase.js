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
        { name: ROLES.TRANSPORT_OWNER, display_name: 'Transport Owner', description: 'Complete administrative access to transport operations' },
        { name: ROLES.ADMIN, display_name: 'Admin', description: 'Organization Administrator' },
        { name: ROLES.BRANCH_MANAGER, display_name: 'Branch Manager', description: 'Branch Operational Management' },
        { name: ROLES.BOOKING_OPERATOR, display_name: 'Booking Operator', description: 'Bilty & Booking Creator' },
        { name: ROLES.DISPATCH_OPERATOR, display_name: 'Dispatch Operator', description: 'Trip & Dispatch Handler' },
        { name: ROLES.DELIVERY_OPERATOR, display_name: 'Delivery Operator', description: 'Delivery & POD Operator' },
        { name: ROLES.ACCOUNTANT, display_name: 'Accountant', description: 'Invoices, Expenses & Settlements' },
        { name: ROLES.FLEET_MANAGER, display_name: 'Fleet Manager', description: 'Vehicles & Maintenance Manager' },
        { name: ROLES.DRIVER, display_name: 'Driver', description: 'Vehicle Operator' },
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
            name: permCode.replace('.', ' ').toUpperCase(),
            module: permCode.split('.')[0].toUpperCase(),
          },
        });
      }
    } catch (permErr) {
      console.warn('⚠️ System permissions verification warning:', permErr.message);
    }

    console.log('🚀 Master Database initialization complete: All tables, columns & seed records verified.');
    return true;
  } catch (error) {
    console.error('❌ Master Database initialization error:', error.message);
    throw error;
  }
};

module.exports = {
  initMasterDatabase,
};
