// src/models/RefreshToken.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    device_info: {
      type: DataTypes.STRING(255),
    },
    ip_address: {
      type: DataTypes.STRING(45),
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'refresh_tokens',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token_hash'] },
    ],
  });

  return RefreshToken;
};
