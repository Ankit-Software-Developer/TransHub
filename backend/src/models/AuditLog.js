// src/models/AuditLog.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    organization_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    old_values: {
      type: DataTypes.JSON,
    },
    new_values: {
      type: DataTypes.JSON,
    },
    ip_address: {
      type: DataTypes.STRING(45),
    },
    user_agent: {
      type: DataTypes.STRING(255),
    },
  }, {
    tableName: 'audit_logs',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['user_id'] },
      { fields: ['action'] },
    ],
  });

  return AuditLog;
};
