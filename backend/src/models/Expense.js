// src/models/Expense.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Expense = sequelize.define('Expense', {
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
    trip_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expense_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM('CASH', 'FASTAG', 'FUEL_CARD', 'UPI', 'BANK_TRANSFER'),
      defaultValue: 'CASH',
    },
    vendor_name: {
      type: DataTypes.STRING(150),
    },
    receipt_url: {
      type: DataTypes.STRING(500),
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    approved_by: {
      type: DataTypes.UUID,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'expenses',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['trip_id'] },
      { fields: ['vehicle_id'] },
      { fields: ['expense_date'] },
    ],
  });

  return Expense;
};
