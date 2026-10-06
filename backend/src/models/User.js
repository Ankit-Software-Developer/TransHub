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
    staff_code: {
      type: DataTypes.STRING(50),
    },
    designation: {
      type: DataTypes.STRING(100),
    },
    joining_date: {
      type: DataTypes.DATEONLY,
    },
    aadhaar_number: {
      type: DataTypes.STRING(30),
    },
    pan_number: {
      type: DataTypes.STRING(30),
    },
    address: {
      type: DataTypes.TEXT,
    },
    emergency_contact: {
      type: DataTypes.STRING(100),
    },
    salary_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    salary_type: {
      type: DataTypes.STRING(30),
      defaultValue: 'MONTHLY',
    },
    document_url: {
      type: DataTypes.TEXT('long'),
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
