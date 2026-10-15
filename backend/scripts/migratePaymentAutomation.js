// backend/scripts/migratePaymentAutomation.js
const { sequelize } = require('../src/config/database');

async function migrate() {
  console.log('🚀 Starting Payment Automation database migration across all tenants...');

  try {
    const [dbs] = await sequelize.query("SHOW DATABASES LIKE 'transporter_t_%'");
    const tenantDbs = dbs.map((d) => Object.values(d)[0]);

    console.log(`Found ${tenantDbs.length} tenant database(s):`, tenantDbs);

    for (const dbName of tenantDbs) {
      console.log(`\n📦 Upgrading schema for: \`${dbName}\`...`);

      // 1. consignments table
      const [consignmentCols] = await sequelize.query(`SHOW COLUMNS FROM \`${dbName}\`.consignments`);
      const existingConsignmentCols = consignmentCols.map((c) => c.Field);

      const consignmentFields = [
        { name: 'payment_method', query: "ADD COLUMN `payment_method` VARCHAR(50) DEFAULT 'CASH' AFTER `payment_type`" },
        { name: 'payment_status', query: "ADD COLUMN `payment_status` VARCHAR(50) DEFAULT 'PENDING' AFTER `payment_method`" },
        { name: 'is_direct_bank_settled', query: "ADD COLUMN `is_direct_bank_settled` TINYINT(1) DEFAULT 0 AFTER `payment_status`" },
        { name: 'payment_ref', query: "ADD COLUMN `payment_ref` VARCHAR(100) NULL AFTER `is_direct_bank_settled`" },
        { name: 'payment_bank_name', query: "ADD COLUMN `payment_bank_name` VARCHAR(100) NULL AFTER `payment_ref`" },
        { name: 'payment_date', query: "ADD COLUMN `payment_date` DATETIME NULL AFTER `payment_bank_name`" },
      ];

      for (const field of consignmentFields) {
        if (!existingConsignmentCols.includes(field.name)) {
          console.log(`   ➕ Adding column \`consignments\`.\`${field.name}\` in ${dbName}...`);
          await sequelize.query(`ALTER TABLE \`${dbName}\`.consignments ${field.query}`);
        } else {
          console.log(`   ✔️ Column \`consignments\`.\`${field.name}\` already exists.`);
        }
      }

      // 2. delivery_records table
      try {
        const [delCols] = await sequelize.query(`SHOW COLUMNS FROM \`${dbName}\`.delivery_records`);
        const existingDelCols = delCols.map((c) => c.Field);

        const delFields = [
          { name: 'payment_method', query: "ADD COLUMN `payment_method` VARCHAR(50) DEFAULT 'CASH'" },
          { name: 'payment_ref', query: "ADD COLUMN `payment_ref` VARCHAR(100) NULL" },
          { name: 'is_direct_bank_settled', query: "ADD COLUMN `is_direct_bank_settled` TINYINT(1) DEFAULT 0" },
        ];

        for (const field of delFields) {
          if (!existingDelCols.includes(field.name)) {
            console.log(`   ➕ Adding column \`delivery_records\`.\`${field.name}\` in ${dbName}...`);
            await sequelize.query(`ALTER TABLE \`${dbName}\`.delivery_records ${field.query}`);
          } else {
            console.log(`   ✔️ Column \`delivery_records\`.\`${field.name}\` already exists.`);
          }
        }
      } catch (delErr) {
        console.warn(`   ⚠️ delivery_records notice in ${dbName}: ${delErr.message}`);
      }

      // 3. payments table (Cheque lifecycle)
      try {
        const [payCols] = await sequelize.query(`SHOW COLUMNS FROM \`${dbName}\`.payments`);
        const existingPayCols = payCols.map((c) => c.Field);

        const payFields = [
          { name: 'cheque_status', query: "ADD COLUMN `cheque_status` VARCHAR(50) NULL" },
          { name: 'cheque_date', query: "ADD COLUMN `cheque_date` DATE NULL" },
          { name: 'cheque_cleared_at', query: "ADD COLUMN `cheque_cleared_at` DATETIME NULL" },
        ];

        for (const field of payFields) {
          if (!existingPayCols.includes(field.name)) {
            console.log(`   ➕ Adding column \`payments\`.\`${field.name}\` in ${dbName}...`);
            await sequelize.query(`ALTER TABLE \`${dbName}\`.payments ${field.query}`);
          } else {
            console.log(`   ✔️ Column \`payments\`.\`${field.name}\` already exists.`);
          }
        }
      } catch (payErr) {
        console.warn(`   ⚠️ payments notice in ${dbName}: ${payErr.message}`);
      }
    }

    console.log('\n🎉 Payment Automation database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

module.exports = migrate;

if (require.main === module) {
  migrate();
}
