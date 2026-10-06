// src/models/Claim.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Claim = sequelize.define('Claim', {
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
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    claim_type: {
      type: DataTypes.ENUM('DAMAGED_CARGO', 'SHORT_MATERIAL', 'MISSING_PACKAGE', 'LATE_DELIVERY', 'WRONG_DELIVERY'),
      defaultValue: 'DAMAGED_CARGO',
    },
    claim_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    settled_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM('REPORTED', 'INVESTIGATING', 'ACCEPTED', 'REJECTED', 'SETTLED', 'CLOSED'),
      defaultValue: 'REPORTED',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    photos_url: {
      type: DataTypes.JSON, // array of photo urls
      defaultValue: [],
    },
    settlement_remarks: {
      type: DataTypes.TEXT,
    },
    reported_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'claims',
    indexes: [
      { fields: ['consignment_id'] },
      { fields: ['customer_id'] },
      { fields: ['status'] },
    ],
  });

  return Claim;
};
