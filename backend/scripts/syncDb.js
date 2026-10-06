// scripts/syncDb.js
const { initMasterDatabase } = require('../src/config/initDatabase');
const { testDbConnection, sequelize } = require('../src/config/database');

const run = async () => {
  console.log('🔄 Checking database connection...');
  const connected = await testDbConnection();
  if (!connected) {
    console.error('❌ Database connection failed. Aborting.');
    process.exit(1);
  }

  console.log('🔄 Checking and synchronizing all tables and columns...');
  await initMasterDatabase();
  console.log('🎉 Done! All database tables & columns are ready.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
