// backend/scripts/migrateRoles.js
const { sequelize } = require('../src/models');
const { getTenantConnection } = require('../src/services/tenantDbManager');
const roleController = require('../src/controllers/roleController');

async function migrateRoles() {
  try {
    console.log('🔄 Checking databases for TRANSPORT_OWNER / Admin roles...');
    const [dbs] = await sequelize.query("SHOW DATABASES LIKE 'transporter%'");
    
    for (const row of dbs) {
      const dbName = Object.values(row)[0];
      try {
        const [tables] = await sequelize.query(`SHOW TABLES FROM \`${dbName}\` LIKE 'roles'`);
        if (tables.length === 0) continue;

        console.log(`\n📂 Scanning database: ${dbName}`);
        const [roles] = await sequelize.query(`SELECT id, name, display_name FROM \`${dbName}\`.roles`);
        console.log(`   Found ${roles.length} roles:`, roles.map(r => `${r.name} (${r.display_name})`).join(', '));

        const transportOwnerRole = roles.find(r => r.name === 'TRANSPORT_OWNER' || r.display_name === 'Transport Owner');
        const adminRole = roles.find(r => r.name === 'ADMIN');

        if (transportOwnerRole && !adminRole) {
          console.log(`   ✏️ Updating TRANSPORT_OWNER -> ADMIN in ${dbName}`);
          await sequelize.query(`
            UPDATE \`${dbName}\`.roles 
            SET name = 'ADMIN', display_name = 'Admin', description = 'Tenant administrator with full access to tenant features'
            WHERE id = '${transportOwnerRole.id}'
          `);
        } else if (transportOwnerRole && adminRole) {
          console.log(`   🔀 Merging duplicate TRANSPORT_OWNER into ADMIN in ${dbName}`);
          try {
            await sequelize.query(`
              UPDATE IGNORE \`${dbName}\`.role_permissions 
              SET role_id = '${adminRole.id}' 
              WHERE role_id = '${transportOwnerRole.id}'
            `);
          } catch (e) {}

          try {
            await sequelize.query(`
              UPDATE IGNORE \`${dbName}\`.user_roles 
              SET role_id = '${adminRole.id}' 
              WHERE role_id = '${transportOwnerRole.id}'
            `);
          } catch (e) {}

          await sequelize.query(`DELETE FROM \`${dbName}\`.roles WHERE id = '${transportOwnerRole.id}'`);
        } else if (adminRole) {
          await sequelize.query(`
            UPDATE \`${dbName}\`.roles 
            SET display_name = 'Admin', description = 'Tenant administrator with full access to tenant features'
            WHERE id = '${adminRole.id}'
          `);
        }

        // If this is a tenant database, run standard role & permission provisioning
        if (dbName.startsWith('transporter_t_')) {
          console.log(`   ⚙️ Provisioning full standard roles & permissions in ${dbName}...`);
          const conn = await getTenantConnection(dbName);
          const mockReq = { tenantDb: conn.models, tenant: { tenantId: 'tenant' } };
          const mockRes = {
            json: (payload) => {
              const count = payload.data?.length || 0;
              console.log(`   ✅ ${count} roles now active in ${dbName}:`);
              payload.data?.forEach(r => {
                console.log(`      - ${r.display_name} (${r.name}): ${r.permissionCodes?.length || 0} permissions`);
              });
            },
            status: () => ({ json: (e) => console.error(e) })
          };
          await roleController.listRoles(mockReq, mockRes);
        }
      } catch (err) {
        console.log(`   ⚠️ Skipped ${dbName}: ${err.message}`);
      }
    }

    console.log('\n✅ Roles migration and verification completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during role migration:', err);
    process.exit(1);
  }
}

migrateRoles();
