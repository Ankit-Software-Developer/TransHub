// src/models/Notification.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: true, // Null for all users in org
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('OPERATIONAL', 'ALERT', 'FINANCIAL', 'SYSTEM'),
      defaultValue: 'OPERATIONAL',
    },
    entity_type: {
      type: DataTypes.STRING(50),
    },
    entity_id: {
      type: DataTypes.UUID,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'notifications',
    indexes: [
      { fields: ['user_id', 'is_read'] },
      { fields: ['organization_id'] },
    ],
  });

  return Notification;
};
