// src/models/TripSettlement.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TripSettlement = sequelize.define('TripSettlement', {
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
    trip_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    settlement_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    settlement_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_advance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_expenses: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    driver_allowance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    balance_payable_or_receivable: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    vehicle_charge: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    vehicle_ownership: {
      type: DataTypes.STRING(20),
      defaultValue: 'OWN',
    },
    hire_pricing_mode: {
      type: DataTypes.STRING(20),
      defaultValue: 'FIXED',
    },
    hire_rate_per_km: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    start_odometer: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    end_odometer: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_run_km: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    net_payable_to_vendor: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    profit_margin: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    settlement_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'BALANCED',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SETTLED'),
      defaultValue: 'SETTLED',
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    settled_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'trip_settlements',
    indexes: [
      { fields: ['trip_id'] },
      { unique: true, fields: ['organization_id', 'settlement_number', 'deleted_at'] },
    ],
  });

  return TripSettlement;
};
