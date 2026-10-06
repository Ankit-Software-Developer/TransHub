// src/models/Branch.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Branch = sequelize.define('Branch', {
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
    branch_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    branch_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    email: {
      type: DataTypes.STRING(150),
    },
    address: {
      type: DataTypes.TEXT,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    pincode: {
      type: DataTypes.STRING(10),
    },
    is_hub: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'branches',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'branch_code', 'deleted_at'] },
    ],
  });

  return Branch;
};
