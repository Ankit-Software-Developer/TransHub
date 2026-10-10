// src/controllers/gpsController.js
const { successResponse, errorResponse } = require('../utils/apiResponse');
const defaultModels = require('../models');
const gpsService = require('../services/gpsService');
const { logAudit } = require('../middleware/auditLogger');

/**
 * List all configured GPS providers for this organization
 */
const listConfigs = async (req, res) => {
  try {
    const { GpsIntegration, Vehicle } = req.tenantDb || defaultModels;

    const configs = await GpsIntegration.findAll({
      where: {
        organization_id: req.tenant.organizationId,
      },
      order: [['created_at', 'ASC']],
    });

    const totalFleetVehicles = await Vehicle.count({
      where: {
        organization_id: req.tenant.organizationId,
        deleted_at: null,
      },
    });

    const vehiclesWithGps = await Vehicle.count({
      where: {
        organization_id: req.tenant.organizationId,
        deleted_at: null,
        last_latitude: { [require('sequelize').Op.ne]: null },
      },
    });

    return successResponse(res, 'GPS configurations retrieved successfully', {
      configs,
      stats: {
        totalFleetVehicles,
        vehiclesWithGps,
        activeProviders: configs.filter((c) => c.is_active).length,
      },
    });
  } catch (err) {
    return errorResponse(res, err.message, null, 500);
  }
};

/**
 * Save / Add a new GPS provider
 */
const createConfig = async (req, res) => {
  try {
    const { GpsIntegration } = req.tenantDb || defaultModels;
    const {
      provider_code = 'WHEELSEYE',
      provider_name,
      api_key,
      api_secret,
      client_id,
      base_url,
      sync_interval_mins = 5,
    } = req.body;

    if (!api_key || !api_key.trim()) {
      return errorResponse(res, 'API Key or Access Token is required to connect to the GPS provider', null, 400);
    }

    const defaultNames = {
      WHEELSEYE: 'WheelsEye Fleet GPS',
      LOCONAV: 'LocoNav Telematics',
      INTANGLES: 'Intangles AI Telematics',
      FLEETX: 'Fleetx Intelligent IoT',
      MAPMYINDIA: 'MapmyIndia (Mappls) IoT',
      CUSTOM_API: 'Custom GPS REST API',
    };

    const newConfig = await GpsIntegration.create({
      tenant_id: req.tenant.tenantId,
      organization_id: req.tenant.organizationId,
      provider_code,
      provider_name: provider_name?.trim() || defaultNames[provider_code] || 'External GPS Provider',
      api_key: api_key.trim(),
      api_secret: api_secret?.trim() || null,
      client_id: client_id?.trim() || null,
      base_url: base_url?.trim() || null,
      sync_interval_mins: parseInt(sync_interval_mins, 10) || 5,
      is_active: true,
      last_sync_status: 'PENDING',
    });

    // Auto-trigger immediate initial sync
    try {
      await gpsService.syncProviderVehicles(newConfig, req.tenantDb || defaultModels);
    } catch (syncErr) {
      console.warn('Initial GPS sync warning on create:', syncErr.message);
    }

    logAudit({
      req,
      action: 'CREATE',
      entityType: 'SETTINGS',
      entityId: newConfig.id,
      entityName: `GPS Integration: ${newConfig.provider_name}`,
      summary: `Configured new GPS telematics integration for ${newConfig.provider_name} (${newConfig.provider_code})`,
    });

    return successResponse(res, 'GPS provider connected and configured successfully', newConfig, 201);
  } catch (err) {
    return errorResponse(res, err.message, null, 500);
  }
};

/**
 * Update existing GPS provider configuration
 */
const updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { GpsIntegration } = req.tenantDb || defaultModels;
    const {
      provider_name,
      api_key,
      api_secret,
      client_id,
      base_url,
      is_active,
      sync_interval_mins,
    } = req.body;

    const config = await GpsIntegration.findOne({
      where: {
        id,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!config) {
      return errorResponse(res, 'GPS integration configuration not found', null, 404);
    }

    if (provider_name !== undefined) config.provider_name = provider_name.trim();
    if (api_key !== undefined && api_key.trim()) config.api_key = api_key.trim();
    if (api_secret !== undefined) config.api_secret = api_secret.trim() || null;
    if (client_id !== undefined) config.client_id = client_id.trim() || null;
    if (base_url !== undefined) config.base_url = base_url.trim() || null;
    if (is_active !== undefined) config.is_active = Boolean(is_active);
    if (sync_interval_mins !== undefined) config.sync_interval_mins = parseInt(sync_interval_mins, 10) || 5;

    await config.save();

    return successResponse(res, 'GPS provider updated successfully', config);
  } catch (err) {
    return errorResponse(res, err.message, null, 500);
  }
};

/**
 * Delete a GPS provider configuration
 */
const deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { GpsIntegration } = req.tenantDb || defaultModels;

    const config = await GpsIntegration.findOne({
      where: {
        id,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!config) {
      return errorResponse(res, 'GPS integration configuration not found', null, 404);
    }

    await config.destroy();

    return successResponse(res, 'GPS provider removed successfully');
  } catch (err) {
    return errorResponse(res, err.message, null, 500);
  }
};

/**
 * Test credentials before saving
 */
const testConnection = async (req, res) => {
  try {
    const { provider_code, api_key, api_secret, client_id, base_url } = req.body;
    if (!api_key || !api_key.trim()) {
      return errorResponse(res, 'API Key or Access Token is required to perform connection test', null, 400);
    }

    const result = await gpsService.testConnection({
      provider_code: provider_code || 'WHEELSEYE',
      api_key: api_key.trim(),
      api_secret,
      client_id,
      base_url,
    });

    return successResponse(res, 'Connection test successful', result);
  } catch (err) {
    return errorResponse(res, err.message || 'GPS provider connection test failed', null, 400);
  }
};

/**
 * Trigger immediate location synchronization
 */
const syncNow = async (req, res) => {
  try {
    const { id } = req.body;
    const { GpsIntegration } = req.tenantDb || defaultModels;

    let targetIntegrations = [];
    if (id) {
      const single = await GpsIntegration.findOne({
        where: { id, organization_id: req.tenant.organizationId },
      });
      if (single) targetIntegrations = [single];
    } else {
      targetIntegrations = await GpsIntegration.findAll({
        where: { organization_id: req.tenant.organizationId, is_active: true },
      });
    }

    if (targetIntegrations.length === 0) {
      return errorResponse(res, 'No active GPS integration found to synchronize', null, 404);
    }

    let totalSynced = 0;
    for (const integ of targetIntegrations) {
      const resSync = await gpsService.syncProviderVehicles(integ, req.tenantDb || defaultModels);
      totalSynced += (resSync.syncedCount || 0);
    }

    return successResponse(res, `Live GPS locations synchronized successfully for ${totalSynced} vehicles`, {
      syncedVehicles: totalSynced,
      timestamp: new Date(),
    });
  } catch (err) {
    return errorResponse(res, err.message || 'GPS sync failed', null, 500);
  }
};

/**
 * Get live fleet telemetry for Control Tower and GPS Diagnostic Mapping
 */
const getFleetTelemetry = async (req, res) => {
  try {
    const { Vehicle, Driver, Branch } = req.tenantDb || defaultModels;

    const vehicles = await Vehicle.findAll({
      where: {
        organization_id: req.tenant.organizationId,
        deleted_at: null,
      },
      attributes: [
        'id', 'vehicle_number', 'vehicle_type', 'status', 'gps_device_id',
        'last_latitude', 'last_longitude', 'last_location_name', 'last_speed',
        'last_ignition', 'last_gps_updated_at', 'gps_provider_name'
      ],
      include: [
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] },
        { model: Branch, as: 'branch', attributes: ['id', 'branch_name', 'city'] },
      ],
      order: [['last_gps_updated_at', 'DESC']],
    });

    return successResponse(res, 'Live fleet telemetry retrieved successfully', vehicles);
  } catch (err) {
    return errorResponse(res, err.message, null, 500);
  }
};

module.exports = {
  listConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  testConnection,
  syncNow,
  getFleetTelemetry,
};
