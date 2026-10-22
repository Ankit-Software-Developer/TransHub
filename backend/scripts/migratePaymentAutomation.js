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

      // 4. trips table: Ensure dest_branch_id is nullable for direct contract delivery sites
      try {
        await sequelize.query(`ALTER TABLE \`${dbName}\`.trips MODIFY COLUMN \`dest_branch_id\` CHAR(36) NULL`);
        console.log(`   ✔️ Allowed NULL for \`trips\`.\`dest_branch_id\` in ${dbName}.`);
      } catch (tripErr) {
        console.warn(`   ⚠️ trips dest_branch_id notice in ${dbName}: ${tripErr.message}`);
      }

      // 5. Clean up redundant duplicate indexes created by Sequelize sync({ alter: true })
      try {
        const [indexes] = await sequelize.query(`
          SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = '${dbName}'
            AND INDEX_NAME != 'PRIMARY'
          ORDER BY TABLE_NAME, COLUMN_NAME, INDEX_NAME
        `);

        const colIndexGroups = {};
        for (const idx of indexes) {
          if (idx.SEQ_IN_INDEX === 1) {
            const key = `${idx.TABLE_NAME}###${idx.COLUMN_NAME}`;
            if (!colIndexGroups[key]) {
              colIndexGroups[key] = [];
            }
            if (!colIndexGroups[key].includes(idx.INDEX_NAME)) {
              colIndexGroups[key].push(idx.INDEX_NAME);
            }
          }
        }

        for (const [key, idxList] of Object.entries(colIndexGroups)) {
          if (idxList.length > 1) {
            const [tableName, colName] = key.split('###');
            for (let i = 1; i < idxList.length; i++) {
              const dropIdx = idxList[i];
              try {
                await sequelize.query(`ALTER TABLE \`${dbName}\`.\`${tableName}\` DROP INDEX \`${dropIdx}\``);
                console.log(`   🧹 Pruned duplicate index \`${dropIdx}\` on \`${tableName}\`.\`${colName}\` in ${dbName}`);
              } catch (dropErr) {
                // If needed by FK constraint, safely continue
              }
            }
          }
        }
      } catch (idxErr) {
        console.warn(`   ⚠️ Index pruning notice in ${dbName}:`, idxErr.message);
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
