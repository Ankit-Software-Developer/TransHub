// src/models/Pod.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Pod = sequelize.define('Pod', {
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
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'image/jpeg',
    },
    receiver_name: {
      type: DataTypes.STRING(150),
    },
    status: {
      type: DataTypes.ENUM('POD_PENDING', 'POD_UPLOADED', 'POD_VERIFIED', 'POD_REJECTED', 'POD_SENT_TO_CUSTOMER'),
      defaultValue: 'POD_UPLOADED',
    },
    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    uploaded_by: {
      type: DataTypes.UUID,
    },
    verified_at: {
      type: DataTypes.DATE,
    },
    verified_by: {
      type: DataTypes.UUID,
    },
    rejection_reason: {
      type: DataTypes.STRING(255),
    },
  }, {
    tableName: 'pods',
    indexes: [
      { fields: ['consignment_id'] },
      { fields: ['status'] },
      { fields: ['tenant_id', 'organization_id'] },
    ],
  });

  return Pod;
};
