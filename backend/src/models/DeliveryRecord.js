// src/models/DeliveryRecord.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeliveryRecord = sequelize.define('DeliveryRecord', {
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
    consignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    delivery_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    receiver_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    receiver_phone: {
      type: DataTypes.STRING(20),
    },
    receiver_id_proof: {
      type: DataTypes.STRING(100),
    },
    delivered_packages: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    damaged_packages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    short_packages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    otp_code: {
      type: DataTypes.STRING(10),
    },
    is_otp_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    receiver_signature_url: {
      type: DataTypes.TEXT('long'),
    },
    delivery_photo_url: {
      type: DataTypes.TEXT('long'),
    },
    delivered_latitude: {
      type: DataTypes.DECIMAL(10, 8),
    },
    delivered_longitude: {
      type: DataTypes.DECIMAL(11, 8),
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    delivered_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'delivery_records',
    indexes: [
      { fields: ['consignment_id'] },
      { fields: ['branch_id'] },
      { fields: ['delivery_date'] },
    ],
  });

  return DeliveryRecord;
};
