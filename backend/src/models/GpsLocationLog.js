// src/models/GpsLocationLog.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GpsLocationLog = sequelize.define('GpsLocationLog', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
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
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    vehicle_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    device_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    speed: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    angle: {
      type: DataTypes.DECIMAL(5, 1),
      defaultValue: 0.0,
    },
    ignition: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    charge_on: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    accurate: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    vendor_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    vendor_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING(50),
      defaultValue: 'WHEELSEYE',
    },
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    raw_payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'gps_location_logs',
    paranoid: false,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['vehicle_number', 'recorded_at'] },
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['vehicle_id'] },
      { fields: ['recorded_at'] },
    ],
  });

  return GpsLocationLog;
};
