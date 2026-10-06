// src/models/Dispatch.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dispatch = sequelize.define('Dispatch', {
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
    dispatch_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    dispatch_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dispatch_time: {
      type: DataTypes.TIME,
    },
    seal_number: {
      type: DataTypes.STRING(50),
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    dispatch_challan_url: {
      type: DataTypes.STRING(500),
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'dispatches',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'dispatch_number', 'deleted_at'] },
      { fields: ['trip_id'] },
    ],
  });

  return Dispatch;
};
