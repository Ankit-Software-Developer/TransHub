// src/models/DriverAdvance.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DriverAdvance = sequelize.define('DriverAdvance', {
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
    driver_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    disbursed_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    disbursed_mode: {
      type: DataTypes.ENUM('CASH', 'BANK_TRANSFER', 'UPI'),
      defaultValue: 'CASH',
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    disbursed_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'driver_advances',
    indexes: [
      { fields: ['trip_id'] },
      { fields: ['driver_id'] },
    ],
  });

  return DriverAdvance;
};
