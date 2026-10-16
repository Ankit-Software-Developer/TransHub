// src/services/gpsSyncWorker.js
const { Op } = require('sequelize');
const defaultModels = require('../models');
const { getTenantConnection } = require('./tenantDbManager');
const gpsService = require('./gpsService');

let pollingInterval = null;
let isPolling = false;
let consecutiveErrors = 0;

/**
 * Polls active GPS telematics providers and syncs live vehicle coordinates
 */
const runPollingCycle = async (app) => {
  if (isPolling) {
    // Previous cycle still active, skip to prevent stack overlap
    return;
  }

  isPolling = true;

  try {
    const { GpsIntegration, Tenant } = defaultModels;
    if (!GpsIntegration) {
      isPolling = false;
      return;
    }

    // 1. Fetch all active GPS integrations from Master DB
    const activeIntegrations = await GpsIntegration.findAll({
      where: {
        is_active: true,
      },
    }).catch(() => []);

    if (!activeIntegrations || activeIntegrations.length === 0) {
      isPolling = false;
      return;
    }

    const io = app?.get ? app.get('io') : null;

    // 2. Process each active integration
    for (const integration of activeIntegrations) {
      try {
        // Enforce user-configured auto-sync interval (e.g. 1 min, 5 min, etc.)
        const intervalMins = parseInt(integration.sync_interval_mins, 10) || 5;
        const lastSyncTime = integration.last_sync_at ? new Date(integration.last_sync_at).getTime() : 0;
        const now = Date.now();
        const elapsedMins = (now - lastSyncTime) / (1000 * 60);

        // If the interval has not yet elapsed since the last sync, skip this cycle
        if (lastSyncTime > 0 && elapsedMins < intervalMins) {
          continue;
        }

        // Resolve tenant database instance if multi-tenant
        let targetDb = defaultModels;
        if (integration.tenant_id && Tenant) {
          const tenantRecord = await Tenant.findByPk(integration.tenant_id).catch(() => null);
          if (tenantRecord?.database_name) {
            const tenantConn = await getTenantConnection(tenantRecord.database_name).catch(() => null);
            if (tenantConn?.models) {
              targetDb = tenantConn.models;
            }
          }
        }

        // Run sync for this integration
        const result = await gpsService.syncProviderVehicles(integration, targetDb);

        // If we have updated vehicles and Socket.io is available, broadcast in real time
        if (result?.updatedVehicles && result.updatedVehicles.length > 0 && io) {
          const orgRoom = `org_${integration.organization_id}`;
          io.to(orgRoom).emit('gps_telemetry_batch', {
            provider: integration.provider_code,
            providerName: integration.provider_name,
            timestamp: result.timestamp || new Date(),
            vehicles: result.updatedVehicles,
          });
        }

        consecutiveErrors = 0;
      } catch (integErr) {
        console.warn(`[GPS Polling Worker] Integration (${integration.provider_code}) sync error:`, integErr.message);
      }
    }
  } catch (cycleErr) {
    consecutiveErrors++;
    console.error('[GPS Polling Worker Cycle Exception]:', cycleErr.message);
  } finally {
    isPolling = false;
  }
};

/**
 * Starts the automated GPS polling background worker
 * @param {object} app - Express application instance with attached Socket.io
 * @param {number} intervalMs - Polling interval in ms (default 10000ms / 10s)
 */
const startGpsPollingWorker = (app, intervalMs = 10000) => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  console.log(`📡 [GPS Worker] Live Telematics Poller started (Interval: ${intervalMs / 1000}s)`);

  // Run initial cycle after 3 seconds
  setTimeout(() => {
    runPollingCycle(app);
  }, 3000);

  // Recurring interval
  pollingInterval = setInterval(() => {
    runPollingCycle(app);
  }, intervalMs);
};

/**
 * Stops the GPS background worker
 */
const stopGpsPollingWorker = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('🛑 [GPS Worker] Live Telematics Poller stopped.');
  }
};

module.exports = {
  startGpsPollingWorker,
  stopGpsPollingWorker,
  runPollingCycle,
};
