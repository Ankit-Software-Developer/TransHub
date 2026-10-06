// src/models/CustomerLedger.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomerLedger = sequelize.define('CustomerLedger', {
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
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    entry_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    entry_type: {
      type: DataTypes.ENUM('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OPENING_BALANCE'),
      allowNull: false,
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reference_number: {
      type: DataTypes.STRING(100),
    },
    description: {
      type: DataTypes.STRING(255),
    },
    debit_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    credit_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    running_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
  }, {
    tableName: 'customer_ledgers',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['customer_id'] },
      { fields: ['entry_date'] },
    ],
  });

  return CustomerLedger;
};
