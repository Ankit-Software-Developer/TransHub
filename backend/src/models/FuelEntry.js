// src/models/FuelEntry.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FuelEntry = sequelize.define('FuelEntry', {
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
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    fuel_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fuel_type: {
      type: DataTypes.ENUM('DIESEL', 'CNG', 'PETROL'),
      defaultValue: 'DIESEL',
    },
    litres: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
    },
    rate_per_litre: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    odometer_reading: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fuel_station: {
      type: DataTypes.STRING(150),
    },
    payment_mode: {
      type: DataTypes.ENUM('FUEL_CARD', 'FASTAG', 'CASH', 'UPI', 'CREDIT'),
      defaultValue: 'FUEL_CARD',
    },
    receipt_url: {
      type: DataTypes.STRING(500),
    },
  }, {
    tableName: 'fuel_entries',
    indexes: [
      { fields: ['vehicle_id'] },
      { fields: ['fuel_date'] },
    ],
  });

  return FuelEntry;
};
