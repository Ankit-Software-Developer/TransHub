// src/models/TenantStaff.js
const { DataTypes } = require('sequelize');

/**
 * Tenant-scoped Staff / Operational User model.
 * Resides exclusively in each isolated tenant MySQL database (transporter_t_...).
 * Stores full operational, HR, compensation, and KYC information for staff.
 */
module.exports = (sequelize) => {
  const TenantStaff = sequelize.define('TenantStaff', {
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
      allowNull: true,
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
    status: {
      type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'INVITED'),
      defaultValue: 'ACTIVE',
    },
    last_login_at: {
      type: DataTypes.DATE,
    },
  }, {
    tableName: 'users',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['email'] },
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['branch_id'] },
      { fields: ['staff_code'] },
    ],
  });

  return TenantStaff;
};
