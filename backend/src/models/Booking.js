// src/models/Booking.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
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
    booking_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    booking_time: {
      type: DataTypes.TIME,
    },
    consignor_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    consignee_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    origin_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    destination_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    dest_branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    pickup_address: {
      type: DataTypes.TEXT,
    },
    delivery_address: {
      type: DataTypes.TEXT,
    },
    booking_remarks: {
      type: DataTypes.TEXT,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'bookings',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['branch_id'] },
      { fields: ['booking_date'] },
      { fields: ['consignor_id'] },
      { fields: ['consignee_id'] },
    ],
  });

  return Booking;
};
