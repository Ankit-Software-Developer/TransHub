// src/models/ConsignmentStatusHistory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConsignmentStatusHistory = sequelize.define('ConsignmentStatusHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    consignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'consignment_status_history',
    indexes: [
      { fields: ['consignment_id'] },
      { fields: ['timestamp'] },
    ],
  });

  return ConsignmentStatusHistory;
};
