// src/models/Customer.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Customer = sequelize.define('Customer', {
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
    customer_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    customer_type: {
      type: DataTypes.ENUM('CONSIGNOR', 'CONSIGNEE', 'BOTH'),
      defaultValue: 'BOTH',
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
    billing_address: {
      type: DataTypes.TEXT,
    },
    city: {
      type: DataTypes.STRING(100),
    },
    state: {
      type: DataTypes.STRING(100),
    },
    pincode: {
      type: DataTypes.STRING(10),
    },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    credit_limit: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    credit_days: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
    },
    opening_balance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    current_balance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'BLOCKED'),
      defaultValue: 'ACTIVE',
    },
  }, {
    tableName: 'customers',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'customer_code', 'deleted_at'] },
      { fields: ['phone'] },
      { fields: ['gstin'] },
    ],
  });

  return Customer;
};
