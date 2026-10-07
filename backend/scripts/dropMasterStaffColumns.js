// scripts/dropMasterStaffColumns.js
require('dotenv').config();
const { sequelize } = require('../src/config/database');

const COLUMNS_TO_DROP = [
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

async function dropMasterStaffColumns() {
  console.log('🔄 Connecting to Master Database...');
  await sequelize.authenticate();
  const dbName = sequelize.config.database;
  console.log(`✅ Connected to database: ${dbName}`);

  // Fetch current columns in users table
  const [columns] = await sequelize.query(`SHOW COLUMNS FROM \`users\`;`);
  const existingColNames = columns.map((c) => c.Field);
  console.log('\n📋 Current columns in users table:', existingColNames.join(', '));

  console.log('\n🚀 Starting removal of operational staff/HR/KYC columns from master users table...');
  for (const col of COLUMNS_TO_DROP) {
    if (existingColNames.includes(col)) {
      try {
        await sequelize.query(`ALTER TABLE \`users\` DROP COLUMN \`${col}\`;`);
        console.log(`✅ Successfully dropped column: ${col}`);
      } catch (err) {
        console.warn(`⚠️ Could not drop column ${col}:`, err.message);
      }
    } else {
      console.log(`ℹ️ Column '${col}' already removed or does not exist.`);
    }
  }

  // Show updated columns
  const [updatedCols] = await sequelize.query(`SHOW COLUMNS FROM \`users\`;`);
  console.log('\n✨ Remaining clean columns in master users table:');
  console.log(updatedCols.map((c) => `  - ${c.Field} (${c.Type})`).join('\n'));

  console.log('\n🎉 Clean Master DB users table complete! Only login credentials and tenant routing remain.');
  process.exit(0);
}

dropMasterStaffColumns().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
