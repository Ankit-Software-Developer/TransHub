// src/models/SaaSPlan.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SaaSPlan = sequelize.define('SaaSPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    plan_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    price_annual: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    branch_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    user_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
    lr_limit_monthly: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
    },
    has_fleet_management: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    has_accounting: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    has_customer_portal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    has_pod_module: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    has_whatsapp_automation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    has_api_access: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'saas_plans',
  });

  return SaaSPlan;
};
