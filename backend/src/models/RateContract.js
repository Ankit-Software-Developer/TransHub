// src/models/RateContract.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RateContract = sequelize.define('RateContract', {
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
    customer_id: {
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
    rate_type: {
      type: DataTypes.ENUM('PER_KG', 'PER_TON', 'PER_PACKAGE', 'PER_VEHICLE', 'FIXED'),
      defaultValue: 'PER_KG',
    },
    rate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    min_freight: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    loading_charge: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    unloading_charge: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    door_delivery_charge: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    valid_from: {
      type: DataTypes.DATEONLY,
    },
    valid_to: {
      type: DataTypes.DATEONLY,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'rate_contracts',
    indexes: [
      { fields: ['tenant_id', 'organization_id', 'customer_id'] },
      { fields: ['origin_city', 'destination_city'] },
    ],
  });

  return RateContract;
};
