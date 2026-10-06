// src/models/Invoice.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
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
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    subtotal_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    taxable_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    cgst_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    cgst_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    sgst_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    sgst_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    igst_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    igst_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_tax_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    balance_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'GENERATED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'),
      defaultValue: 'GENERATED',
    },
    payment_terms: {
      type: DataTypes.STRING(255),
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'invoices',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'invoice_number', 'deleted_at'] },
      { fields: ['customer_id'] },
      { fields: ['status'] },
      { fields: ['due_date'] },
    ],
  });

  return Invoice;
};
