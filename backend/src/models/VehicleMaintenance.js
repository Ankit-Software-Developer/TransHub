// src/models/VehicleMaintenance.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VehicleMaintenance = sequelize.define('VehicleMaintenance', {
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
    service_type: {
      type: DataTypes.ENUM('PERIODIC_SERVICE', 'ENGINE_OIL', 'TYRES', 'BATTERY', 'BRAKES', 'INSURANCE_RENEWAL', 'FITNESS', 'PUC', 'ACCIDENT_REPAIR', 'OTHER'),
      defaultValue: 'PERIODIC_SERVICE',
    },
    service_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    odometer_reading: {
      type: DataTypes.INTEGER,
    },
    vendor_name: {
      type: DataTypes.STRING(150),
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    next_service_date: {
      type: DataTypes.DATEONLY,
    },
    next_service_km: {
      type: DataTypes.INTEGER,
    },
    invoice_receipt_url: {
      type: DataTypes.STRING(500),
    },
    description: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'vehicle_maintenances',
    indexes: [
      { fields: ['vehicle_id'] },
      { fields: ['service_date'] },
      { fields: ['next_service_date'] },
    ],
  });

  return VehicleMaintenance;
};
