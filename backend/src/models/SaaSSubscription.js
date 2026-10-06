// src/models/SaaSSubscription.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SaaSSubscription = sequelize.define('SaaSSubscription', {
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
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    billing_cycle: {
      type: DataTypes.ENUM('MONTHLY', 'ANNUAL'),
      defaultValue: 'MONTHLY',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'),
      defaultValue: 'TRIAL',
    },
    current_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    current_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    trial_end: {
      type: DataTypes.DATEONLY,
    },
  }, {
    tableName: 'saas_subscriptions',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['status'] },
    ],
  });

  return SaaSSubscription;
};
