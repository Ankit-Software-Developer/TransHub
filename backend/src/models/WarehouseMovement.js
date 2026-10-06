// src/models/WarehouseMovement.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WarehouseMovement = sequelize.define('WarehouseMovement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    consignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    warehouse_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    movement_type: {
      type: DataTypes.ENUM('INWARD_BOOKING', 'INWARD_TRANSIT', 'OUTWARD_DISPATCH', 'OUTWARD_DELIVERY', 'INTERNAL_TRANSFER'),
      allowNull: false,
    },
    zone: {
      type: DataTypes.STRING(30),
    },
    rack: {
      type: DataTypes.STRING(30),
    },
    bay: {
      type: DataTypes.STRING(30),
    },
    packages_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    scanned_by: {
      type: DataTypes.UUID,
    },
  }, {
    tableName: 'warehouse_movements',
    indexes: [
      { fields: ['consignment_id'] },
      { fields: ['warehouse_id'] },
    ],
  });

  return WarehouseMovement;
};
