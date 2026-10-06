// src/models/Payment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
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
    payment_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM('CASH', 'UPI', 'NEFT', 'RTGS', 'CHEQUE', 'CARD', 'OTHER'),
      defaultValue: 'NEFT',
    },
    reference_number: {
      type: DataTypes.STRING(100),
    },
    bank_name: {
      type: DataTypes.STRING(100),
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    received_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'payments',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['customer_id'] },
      { fields: ['payment_date'] },
      { fields: ['invoice_id'] },
    ],
  });

  return Payment;
};
