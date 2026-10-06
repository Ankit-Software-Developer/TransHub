// src/models/UserRole.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
  }, {
    tableName: 'user_roles',
    timestamps: false,
    paranoid: false,
  });

  return UserRole;
};
