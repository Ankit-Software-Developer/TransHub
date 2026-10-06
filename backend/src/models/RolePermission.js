// src/models/RolePermission.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
  }, {
    tableName: 'role_permissions',
    timestamps: false,
    paranoid: false,
  });

  return RolePermission;
};
