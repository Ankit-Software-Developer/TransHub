// src/models/BranchCashClosure.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BranchCashClosure = sequelize.define('BranchCashClosure', {
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
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    closure_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    to_pay_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    tbb_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    expenses_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_collected_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    remitted_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    bank_account_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    deposit_mode: {
      type: DataTypes.ENUM('CASH_DEPOSIT', 'CDM', 'UPI', 'NEFT', 'RTGS', 'CHEQUE', 'OTHER'),
      defaultValue: 'CASH_DEPOSIT',
    },
    utr_reference_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    receipt_slip_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('OPEN', 'REMITTED', 'VERIFIED', 'REJECTED'),
      defaultValue: 'REMITTED',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verification_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'branch_cash_closures',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['tenant_id', 'branch_id'] },
      { fields: ['closure_date'] },
      { fields: ['status'] },
    ],
  });

  return BranchCashClosure;
};
