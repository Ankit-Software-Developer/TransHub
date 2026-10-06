// src/models/Driver.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Driver = sequelize.define('Driver', {
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
    driver_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    alt_phone: {
      type: DataTypes.STRING(20),
    },
    license_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    license_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'Heavy Commercial (HMV)',
    },
    license_expiry: {
      type: DataTypes.DATEONLY,
    },
    address: {
      type: DataTypes.TEXT,
    },
    emergency_contact: {
      type: DataTypes.STRING(100),
    },
    salary_type: {
      type: DataTypes.ENUM('MONTHLY', 'PER_TRIP', 'PER_KM'),
      defaultValue: 'MONTHLY',
    },
    salary_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'ON_TRIP', 'LEAVE', 'INACTIVE'),
      defaultValue: 'ACTIVE',
    },
  }, {
    tableName: 'drivers',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'driver_code', 'deleted_at'] },
      { fields: ['phone'] },
    ],
  });

  return Driver;
};
