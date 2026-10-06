// src/models/NumberSequence.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NumberSequence = sequelize.define('NumberSequence', {
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
      allowNull: true, // Nullable for org-level sequences like Invoices
    },
    document_type: {
      type: DataTypes.ENUM('BILTY', 'DISPATCH', 'TRIP', 'INVOICE', 'SETTLEMENT'),
      allowNull: false,
    },
    financial_year: {
      type: DataTypes.STRING(10), // e.g. "26-27" or "2026"
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING(20),
      defaultValue: '',
    },
    current_number: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    sequence_length: {
      type: DataTypes.INTEGER,
      defaultValue: 6,
    },
    template: {
      type: DataTypes.STRING(100),
      defaultValue: '{BRANCH}/{FY}/{SEQ}',
    },
  }, {
    tableName: 'number_sequences',
    indexes: [
      {
        unique: true,
        fields: ['organization_id', 'branch_id', 'document_type', 'financial_year', 'deleted_at'],
        name: 'unique_org_branch_doc_fy',
      },
    ],
  });

  return NumberSequence;
};
