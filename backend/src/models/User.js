// src/models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true, // Null for SUPER_ADMIN
    },
    organization_id: {
      type: DataTypes.UUID,
      allowNull: true, // Null for SUPER_ADMIN
    },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true, // Null for Org Owner or Super Admin
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'INVITED'),
      defaultValue: 'ACTIVE',
    },
    last_login_at: {
      type: DataTypes.DATE,
    },
  }, {
    tableName: 'users',
    indexes: [
      { unique: true, fields: ['email', 'deleted_at'] },
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['branch_id'] },
    ],
  });

  return User;
};
