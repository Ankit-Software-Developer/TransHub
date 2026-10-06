// src/models/Organization.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    business_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    legal_name: {
      type: DataTypes.STRING(200),
    },
    gstin: {
      type: DataTypes.STRING(15),
    },
    pan: {
      type: DataTypes.STRING(10),
    },
    email: {
      type: DataTypes.STRING(150),
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    address: {
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
    country: {
      type: DataTypes.STRING(50),
      defaultValue: 'India',
    },
    logo_url: {
      type: DataTypes.STRING(500),
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'INR',
    },
    document_terminology: {
      type: DataTypes.ENUM('Bilty', 'LR', 'GR', 'Docket', 'Consignment Note', 'Custom'),
      defaultValue: 'Bilty',
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  }, {
    tableName: 'organizations',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['gstin'] },
    ],
  });

  return Organization;
};
