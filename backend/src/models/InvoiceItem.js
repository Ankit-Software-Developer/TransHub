// src/models/InvoiceItem.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvoiceItem = sequelize.define('InvoiceItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    consignment_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    lr_number: {
      type: DataTypes.STRING(50),
    },
    booking_date: {
      type: DataTypes.DATEONLY,
    },
    description: {
      type: DataTypes.STRING(255),
    },
    origin_city: {
      type: DataTypes.STRING(100),
    },
    destination_city: {
      type: DataTypes.STRING(100),
    },
    packages_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    charged_weight: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    freight_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    other_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
  }, {
    tableName: 'invoice_items',
    indexes: [
      { fields: ['invoice_id'] },
      { fields: ['consignment_id'] },
    ],
  });

  return InvoiceItem;
};
