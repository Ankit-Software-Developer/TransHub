// src/models/ApprovalRequest.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApprovalRequest = sequelize.define('ApprovalRequest', {
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
    branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    request_type: {
      type: DataTypes.ENUM(
        'EXPENSE_CLAIM',
        'BOOKING_CANCELLATION',
        'RATE_DISCOUNT',
        'DRIVER_ADVANCE',
        'TRIP_SETTLEMENT',
        'VEHICLE_MAINTENANCE',
        'CREDIT_OVERRIDE',
        'DAMAGE_CLAIM',
        'OTHER'
      ),
      allowNull: false,
      defaultValue: 'EXPENSE_CLAIM',
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reference_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    requester_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    approval_level: {
      type: DataTypes.ENUM('BRANCH_MANAGER', 'HUB_MANAGER', 'ADMIN'),
      allowNull: false,
      defaultValue: 'BRANCH_MANAGER',
    },
    assigned_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
      allowNull: false,
      defaultValue: 'NORMAL',
    },
    reviewer_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    requester_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewer_comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    supporting_document_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    meta_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'approval_requests',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { fields: ['branch_id'] },
      { fields: ['status', 'approval_level'] },
      { fields: ['requester_id'] },
      { fields: ['reference_id'] },
      { fields: ['created_at'] },
    ],
  });

  return ApprovalRequest;
};
