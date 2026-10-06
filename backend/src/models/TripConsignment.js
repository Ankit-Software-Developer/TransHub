// src/models/TripConsignment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TripConsignment = sequelize.define('TripConsignment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    consignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    loaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    unloaded_at: {
      type: DataTypes.DATE,
    },
    sequence_order: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  }, {
    tableName: 'trip_consignments',
    indexes: [
      { fields: ['trip_id'] },
      { fields: ['consignment_id'] },
      { unique: true, fields: ['trip_id', 'consignment_id'] },
    ],
    timestamps: false,
    paranoid: false,
  });

  return TripConsignment;
};
