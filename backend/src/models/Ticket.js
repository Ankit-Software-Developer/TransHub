// src/models/Ticket.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
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
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    assigned_role: {
      type: DataTypes.ENUM('ADMIN', 'SUPER_ADMIN'),
      allowNull: false,
      defaultValue: 'ADMIN',
    },
    escalation_level: {
      type: DataTypes.ENUM('BRANCH_TO_ADMIN', 'ADMIN_TO_SUPERADMIN'),
      allowNull: false,
      defaultValue: 'BRANCH_TO_ADMIN',
    },
    is_escalated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    escalated_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    escalated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    escalation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        'OPERATIONS',
        'BILLING_RATES',
        'DOCKET_POD',
        'HARDWARE_PRINTER',
        'SOFTWARE_BUG',
        'FINANCE_PAYMENT',
        'OTHER'
      ),
      allowNull: false,
      defaultValue: 'OPERATIONS',
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
      allowNull: false,
      defaultValue: 'NORMAL',
    },
    status: {
      type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    reference_code: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    attachment_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    resolved_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'tickets',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['branch_id'] },
      { fields: ['status', 'assigned_role'] },
      { fields: ['is_escalated'] },
      { fields: ['created_by'] },
      { fields: ['created_at'] },
    ],
  });

  return Ticket;
};
