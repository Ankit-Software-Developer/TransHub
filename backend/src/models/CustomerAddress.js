// src/models/CustomerAddress.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomerAddress = sequelize.define('CustomerAddress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    address_type: {
      type: DataTypes.ENUM('PICKUP', 'DELIVERY', 'BILLING'),
      defaultValue: 'DELIVERY',
    },
    title: {
      type: DataTypes.STRING(100), // e.g. "Main Factory", "Warehouse 2"
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    pincode: {
      type: DataTypes.STRING(10),
    },
    contact_person: {
      type: DataTypes.STRING(100),
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'customer_addresses',
    indexes: [
      { fields: ['customer_id'] },
    ],
  });

  return CustomerAddress;
};
