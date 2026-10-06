// src/config/syncDb.js
const { sequelize } = require('../models');

const syncDatabase = async () => {
  try {
    console.log('🔄 Syncing all Sequelize models with MySQL transporter_saas_db...');
    await sequelize.sync({ alter: true });
    console.log('✅ All 30+ tables and foreign keys successfully synchronized with MySQL!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
};

syncDatabase();
