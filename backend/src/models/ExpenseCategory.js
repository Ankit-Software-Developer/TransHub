// src/models/ExpenseCategory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExpenseCategory = sequelize.define('ExpenseCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
    },
    is_trip_expense: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'expense_categories',
  });

  return ExpenseCategory;
};
