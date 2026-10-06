// src/models/ConsignmentItem.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConsignmentItem = sequelize.define('ConsignmentItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    consignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    package_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'Box',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    actual_weight: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    charged_weight: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    length_cm: {
      type: DataTypes.DECIMAL(8, 2),
    },
    width_cm: {
      type: DataTypes.DECIMAL(8, 2),
    },
    height_cm: {
      type: DataTypes.DECIMAL(8, 2),
    },
  }, {
    tableName: 'consignment_items',
    indexes: [
      { fields: ['consignment_id'] },
    ],
  });

  return ConsignmentItem;
};
