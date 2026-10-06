// src/models/Tenant.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    database_name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'TRIAL', 'SUSPENDED'),
      defaultValue: 'TRIAL',
    },
  }, {
    tableName: 'tenants',
  });

  return Tenant;
};
