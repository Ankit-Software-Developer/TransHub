// src/models/GpsIntegration.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GpsIntegration = sequelize.define('GpsIntegration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    organization_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    provider_code: {
      type: DataTypes.ENUM('WHEELSEYE', 'LOCONAV', 'INTANGLES', 'FLEETX', 'MAPMYINDIA', 'CUSTOM_API'),
      allowNull: false,
      defaultValue: 'WHEELSEYE',
    },
    provider_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'WheelsEye Fleet GPS',
    },
    api_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    api_secret: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    base_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sync_interval_mins: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },
    last_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_sync_status: {
      type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'),
      defaultValue: 'PENDING',
    },
    last_error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    vehicles_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  }, {
    tableName: 'gps_integrations',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['provider_code'] },
      { fields: ['is_active'] },
    ],
  });

  return GpsIntegration;
};
