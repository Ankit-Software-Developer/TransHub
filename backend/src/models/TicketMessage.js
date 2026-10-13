// src/models/TicketMessage.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TicketMessage = sequelize.define('TicketMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    sender_role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'BRANCH_STAFF',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachment_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_internal_note: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'ticket_messages',
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['sender_id'] },
      { fields: ['created_at'] },
    ],
  });

  return TicketMessage;
};
