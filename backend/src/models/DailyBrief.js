// src/models/DailyBrief.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DailyBrief = sequelize.define('DailyBrief', {
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
    brief_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_bookings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_deliveries: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_freight: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_collections: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_expenses: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    delayed_shipments: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    pending_pods: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    overdue_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    maintenance_due_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    metrics_json: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  }, {
    tableName: 'daily_briefs',
    indexes: [
      { fields: ['tenant_id', 'organization_id', 'brief_date'] },
    ],
  });

  return DailyBrief;
};
