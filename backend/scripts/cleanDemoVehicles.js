const { Sequelize } = require('sequelize');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const DEMO_PLATES = [
  'DL-01-XY-5510',
  'HR-55-AB-9876',
  'RJ-14-GB-9921',
  'MH-12-RN-4402',
  'KA-01-AK-7833',
  'DL01XY5510',
  'HR55AB9876',
  'RJ14GB9921',
  'MH12RN4402',
  'KA01AK7833'
];

async function run() {
  const masterSequelize = new Sequelize(
    process.env.DB_NAME || 'transporter_master',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'Ankit@6980',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      dialect: 'mysql',
      logging: false,
    }
  );

  try {
    console.log('Connected to MySQL master. Finding tenant databases...');
    const [dbs] = await masterSequelize.query(`SHOW DATABASES LIKE 'transporter_%';`);
    const dbNames = dbs.map((row) => Object.values(row)[0]);
    console.log('Databases found:', dbNames);

    for (const dbName of dbNames) {
      console.log(`\n=== Checking Database: ${dbName} ===`);
      const tenantSeq = new Sequelize(
        dbName,
        process.env.DB_USER || 'root',
        process.env.DB_PASS || 'Ankit@6980',
        {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT, 10) || 3306,
          dialect: 'mysql',
          logging: false,
        }
      );

      try {
        const [tables] = await tenantSeq.query(`SHOW TABLES LIKE 'vehicles';`);
        if (tables.length === 0) {
          console.log(`No 'vehicles' table in ${dbName}`);
          continue;
        }

        // Fetch all vehicles (including soft deleted)
        const [vehicles] = await tenantSeq.query(`SELECT id, vehicle_number, status, deleted_at FROM vehicles;`);
        console.log(`Total vehicles in ${dbName}: ${vehicles.length}`);

        const demoVehicles = vehicles.filter((v) => {
          const num = (v.vehicle_number || '').toUpperCase().replace(/[\s-]/g, '');
          return DEMO_PLATES.some((p) => p.replace(/[\s-]/g, '') === num);
        });

        console.log(`Found ${demoVehicles.length} demo vehicles in ${dbName}:`, demoVehicles.map(v => `${v.vehicle_number} (${v.id})`));

        const realVehicles = vehicles.filter((v) => {
          const num = (v.vehicle_number || '').toUpperCase().replace(/[\s-]/g, '');
          return !DEMO_PLATES.some((p) => p.replace(/[\s-]/g, '') === num) && !v.deleted_at;
        });
        console.log(`Found ${realVehicles.length} real active vehicles in ${dbName}`);

        if (demoVehicles.length === 0) {
          console.log(`No demo vehicles found in ${dbName}.`);
          continue;
        }

        const fallbackVehicle = realVehicles[0] || null;
        console.log(`Fallback vehicle for reassignment:`, fallbackVehicle ? fallbackVehicle.vehicle_number : 'None');

        const demoIds = demoVehicles.map((v) => `'${v.id}'`).join(',');

        // 1. Reassign in trips table
        try {
          const [tripCols] = await tenantSeq.query(`SHOW COLUMNS FROM trips LIKE 'vehicle_id';`);
          if (tripCols.length > 0) {
            const [referencedTrips] = await tenantSeq.query(
              `SELECT id, trip_number, vehicle_id FROM trips WHERE vehicle_id IN (${demoIds});`
            );
            console.log(`Trips referencing demo vehicles: ${referencedTrips.length}`);
            if (referencedTrips.length > 0) {
              if (fallbackVehicle) {
                console.log(`Reassigning ${referencedTrips.length} trips to real vehicle: ${fallbackVehicle.vehicle_number} (${fallbackVehicle.id})`);
                await tenantSeq.query(
                  `UPDATE trips SET vehicle_id = '${fallbackVehicle.id}' WHERE vehicle_id IN (${demoIds});`
                );
                console.log(`✅ Trips successfully reassigned!`);
              } else {
                await tenantSeq.query(
                  `UPDATE trips SET vehicle_id = NULL WHERE vehicle_id IN (${demoIds});`
                );
              }
            }
          }
        } catch (tripErr) {
          console.error('Trips check notice:', tripErr.message);
        }

        // 2. Scan all tables in database for foreign keys or columns named vehicle_id
        const [allTableRows] = await tenantSeq.query(`SHOW TABLES;`);
        const allTableNames = allTableRows.map((r) => Object.values(r)[0]);

        for (const tbl of allTableNames) {
          if (tbl === 'vehicles') continue;
          try {
            const [cols] = await tenantSeq.query(`SHOW COLUMNS FROM \`${tbl}\` LIKE 'vehicle_id';`);
            if (cols.length > 0) {
              const [refs] = await tenantSeq.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\` WHERE vehicle_id IN (${demoIds});`);
              const cnt = refs[0]?.cnt || 0;
              if (cnt > 0) {
                console.log(`Table '${tbl}' has ${cnt} records referencing demo vehicles.`);
                if (fallbackVehicle) {
                  await tenantSeq.query(`UPDATE \`${tbl}\` SET vehicle_id = '${fallbackVehicle.id}' WHERE vehicle_id IN (${demoIds});`);
                  console.log(`✅ Updated '${tbl}' records to ${fallbackVehicle.vehicle_number}`);
                } else {
                  await tenantSeq.query(`DELETE FROM \`${tbl}\` WHERE vehicle_id IN (${demoIds});`);
                }
              }
            }
          } catch (e) {
            // Ignore table error
          }

          // Check if column is assigned_vehicle_id
          try {
            const [cols] = await tenantSeq.query(`SHOW COLUMNS FROM \`${tbl}\` LIKE 'assigned_vehicle_id';`);
            if (cols.length > 0) {
              await tenantSeq.query(`UPDATE \`${tbl}\` SET assigned_vehicle_id = NULL WHERE assigned_vehicle_id IN (${demoIds});`);
            }
          } catch (e) {}
        }

        // 3. Check for any plate number references in text fields across trips / dispatches if any
        try {
          for (const plate of DEMO_PLATES) {
            await tenantSeq.query(`UPDATE trips SET vehicle_number = '${fallbackVehicle ? fallbackVehicle.vehicle_number : ''}' WHERE vehicle_number = '${plate}';`).catch(() => {});
          }
        } catch (e) {}

        // 4. Permanently hard-delete the demo vehicles from vehicles table
        console.log(`Permanently deleting demo vehicles from ${dbName}.vehicles...`);
        await tenantSeq.query(`DELETE FROM vehicles WHERE id IN (${demoIds});`);
        console.log(`✅ Demo vehicles permanently hard-deleted from ${dbName}!`);

        // 5. Verify remaining vehicles
        const [remaining] = await tenantSeq.query(`SELECT id, vehicle_number, status, deleted_at FROM vehicles;`);
        console.log(`Remaining total vehicles in ${dbName}: ${remaining.length}`);
        remaining.forEach(r => console.log(`  - ${r.vehicle_number} (${r.status}, deleted_at: ${r.deleted_at})`));

      } catch (err) {
        console.error(`Error processing ${dbName}:`, err.message);
      } finally {
        await tenantSeq.close();
      }
    }
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await masterSequelize.close();
  }
}

run();
