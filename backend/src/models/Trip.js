// src/models/Trip.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trip = sequelize.define('Trip', {
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
    trip_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    trip_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    origin_branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    dest_branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    origin_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    destination_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: true, // If market vehicle
    },
    trip_type: {
      type: DataTypes.ENUM('DIRECT', 'HUB', 'MULTI_STOP'),
      defaultValue: 'DIRECT',
    },
    start_odometer: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    end_odometer: {
      type: DataTypes.INTEGER,
    },
    start_time: {
      type: DataTypes.DATE,
    },
    end_time: {
      type: DataTypes.DATE,
    },
    total_packages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_weight: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    expected_revenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_expenses: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    driver_advance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    settlement_status: {
      type: DataTypes.ENUM('OPEN', 'UNDER_REVIEW', 'SETTLED'),
      defaultValue: 'OPEN',
    },
    status: {
      type: DataTypes.ENUM('PLANNED', 'READY', 'RUNNING', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'PLANNED',
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'trips',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'trip_number', 'deleted_at'] },
      { fields: ['vehicle_id'] },
      { fields: ['driver_id'] },
      { fields: ['status'] },
      { fields: ['trip_date'] },
    ],
  });

  return Trip;
};
