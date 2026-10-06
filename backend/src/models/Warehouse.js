// src/models/Warehouse.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Warehouse = sequelize.define('Warehouse', {
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
    warehouse_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(30),
    },
    address: {
      type: DataTypes.TEXT,
    },
    capacity_sqft: {
      type: DataTypes.INTEGER,
      defaultValue: 5000,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'warehouses',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['branch_id'] },
    ],
  });

  return Warehouse;
};
