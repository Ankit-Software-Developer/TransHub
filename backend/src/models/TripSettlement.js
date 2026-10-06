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
    settlement_type: {
      type: DataTypes.ENUM('REFUND_FROM_DRIVER', 'PAYABLE_TO_DRIVER', 'BALANCED'),
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
