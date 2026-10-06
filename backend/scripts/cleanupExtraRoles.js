// backend/scripts/cleanupExtraRoles.js
const { sequelize } = require('../src/models');

async function cleanupRoles() {
  try {
    const keepNames = ['ADMIN', 'BRANCH_MANAGER', 'DRIVER'];
    console.log(`🧹 Keeping ONLY system roles: ${keepNames.join(', ')}`);

    const [dbs] = await sequelize.query("SHOW DATABASES LIKE 'transporter%'");
    for (const row of dbs) {
      const dbName = Object.values(row)[0];
      try {
        const [tables] = await sequelize.query(`SHOW TABLES FROM \`${dbName}\` LIKE 'roles'`);
        if (tables.length === 0) continue;

        console.log(`\n📂 Checking database: ${dbName}`);

        // In master DB, we also keep SUPER_ADMIN
        const allowedInMaster = ['SUPER_ADMIN', ...keepNames];
        const allowed = dbName === 'transporter_master' ? allowedInMaster : keepNames;

        const [rolesToDelete] = await sequelize.query(`
          SELECT id, name, display_name FROM \`${dbName}\`.roles
          WHERE is_system = 1 AND name NOT IN (${allowed.map(n => `'${n}'`).join(', ')})
        `);

        if (rolesToDelete.length > 0) {
          console.log(`   Removing ${rolesToDelete.length} extra system roles:`, rolesToDelete.map(r => r.name).join(', '));
          for (const r of rolesToDelete) {
            try {
              await sequelize.query(`DELETE FROM \`${dbName}\`.role_permissions WHERE role_id = '${r.id}'`);
            } catch (e) {}
            try {
              await sequelize.query(`DELETE FROM \`${dbName}\`.roles WHERE id = '${r.id}'`);
            } catch (e) {}
          }
        }

        // Normalize display names
        await sequelize.query(`UPDATE \`${dbName}\`.roles SET display_name = 'Admin', description = 'Tenant administrator with full access to tenant features' WHERE name = 'ADMIN'`);
        await sequelize.query(`UPDATE \`${dbName}\`.roles SET display_name = 'Branch Manager', description = 'Manages godown inventory, bookings, dispatch manifests, local fleet, and station operations' WHERE name = 'BRANCH_MANAGER'`);
        await sequelize.query(`UPDATE \`${dbName}\`.roles SET display_name = 'Driver', description = 'Mobile driver access for route updates and delivery proof capture' WHERE name = 'DRIVER'`);

        // List final roles in this DB
        const [finalRoles] = await sequelize.query(`SELECT id, name, display_name, is_system FROM \`${dbName}\`.roles`);
        console.log(`   ✅ Remaining roles in ${dbName}:`, finalRoles.map(r => `${r.display_name} (${r.name})`).join(', '));
      } catch (err) {
        console.warn(`   ⚠️ Warning in ${dbName}:`, err.message);
      }
    }

    console.log('\n✅ Cleanup complete! Only 3 system default roles remain.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during role cleanup:', err);
    process.exit(1);
  }
}

cleanupRoles();
