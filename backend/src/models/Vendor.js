// src/models/Vendor.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vendor = sequelize.define('Vendor', {
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
    vendor_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    vendor_type: {
      type: DataTypes.ENUM('MARKET_VEHICLE_SUPPLIER', 'FUEL_STATION', 'MAINTENANCE_WORKSHOP', 'TYRE_VENDOR', 'OTHER'),
      defaultValue: 'MARKET_VEHICLE_SUPPLIER',
    },
    gstin: {
      type: DataTypes.STRING(15),
    },
    pan: {
      type: DataTypes.STRING(10),
    },
    contact_person: {
      type: DataTypes.STRING(100),
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
    },
    bank_account_no: {
      type: DataTypes.STRING(50),
    },
    bank_ifsc: {
      type: DataTypes.STRING(20),
    },
    bank_name: {
      type: DataTypes.STRING(100),
    },
    current_payable: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE',
    },
  }, {
    tableName: 'vendors',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'vendor_code', 'deleted_at'] },
    ],
  });

  return Vendor;
};
