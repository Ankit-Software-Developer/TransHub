// src/models/Vehicle.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vehicle = sequelize.define('Vehicle', {
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
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    vehicle_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    vehicle_code: {
      type: DataTypes.STRING(30),
    },
    vehicle_type: {
      type: DataTypes.ENUM('TRUCK', 'MINI_TRUCK', 'TRAILER', 'CONTAINER', 'PICKUP', 'TEMPO', 'OTHER'),
      defaultValue: 'TRUCK',
    },
    ownership: {
      type: DataTypes.ENUM('OWN', 'ATTACHED', 'MARKET'),
      defaultValue: 'OWN',
    },
    capacity_ton: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 10.00,
    },
    length_ft: {
      type: DataTypes.DECIMAL(6, 2),
    },
    width_ft: {
      type: DataTypes.DECIMAL(6, 2),
    },
    height_ft: {
      type: DataTypes.DECIMAL(6, 2),
    },
    rc_number: {
      type: DataTypes.STRING(50),
    },
    rc_expiry: {
      type: DataTypes.DATEONLY,
    },
    insurance_expiry: {
      type: DataTypes.DATEONLY,
    },
    fitness_expiry: {
      type: DataTypes.DATEONLY,
    },
    permit_expiry: {
      type: DataTypes.DATEONLY,
    },
    puc_expiry: {
      type: DataTypes.DATEONLY,
    },
    fastag_id: {
      type: DataTypes.STRING(50),
    },
    gps_device_id: {
      type: DataTypes.STRING(50),
    },
    last_latitude: {
      type: DataTypes.DECIMAL(10, 7),
    },
    last_longitude: {
      type: DataTypes.DECIMAL(10, 7),
    },
    last_location_name: {
      type: DataTypes.TEXT,
    },
    last_speed: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    last_ignition: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    last_gps_updated_at: {
      type: DataTypes.DATE,
    },
    gps_provider_name: {
      type: DataTypes.STRING(50),
    },
    current_odometer: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    make_model: {
      type: DataTypes.STRING(100),
    },
    manufacturing_year: {
      type: DataTypes.INTEGER,
    },
    fuel_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'DIESEL',
    },
    owner_name: {
      type: DataTypes.STRING(100),
    },
    owner_phone: {
      type: DataTypes.STRING(20),
    },
    chassis_number: {
      type: DataTypes.STRING(50),
    },
    engine_number: {
      type: DataTypes.STRING(50),
    },
    assigned_driver_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE'),
      defaultValue: 'AVAILABLE',
    },
  }, {
    tableName: 'vehicles',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'vehicle_number', 'deleted_at'] },
      { fields: ['status'] },
    ],
  });

  return Vehicle;
};
