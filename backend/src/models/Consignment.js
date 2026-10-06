// src/models/Consignment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Consignment = sequelize.define('Consignment', {
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
    booking_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    docket_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Docket Number (LR / Bilty)',
    },
    lr_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    origin_branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    current_branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    dest_branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    consignor_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    consignee_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    origin_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    destination_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    booking_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    material_description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    packages_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    package_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'Boxes',
    },
    actual_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    charged_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    invoice_no: {
      type: DataTypes.STRING(50),
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
    },
    invoice_value: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    eway_bill_no: {
      type: DataTypes.STRING(50),
    },
    eway_bill_date: {
      type: DataTypes.DATEONLY,
    },
    eway_bill_expiry: {
      type: DataTypes.DATE,
    },
    payment_type: {
      type: DataTypes.ENUM('PAID', 'TO_PAY', 'TBB', 'CREDIT', 'FOC'),
      defaultValue: 'TO_PAY',
    },
    delivery_type: {
      type: DataTypes.ENUM('DOOR_DELIVERY', 'GODOWN_DELIVERY'),
      defaultValue: 'GODOWN_DELIVERY',
    },
    transport_mode: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: 'ROAD',
      comment: 'Mode of transport: ROAD, RAIL, AIR',
    },
    rate_type: {
      type: DataTypes.STRING(30),
      defaultValue: 'PER_KG',
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    freight_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    loading_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    unloading_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    handling_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    hamali_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    door_delivery_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    fuel_surcharge: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    insurance_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    other_charges: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    tax_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    tax_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM(
        'BOOKED',
        'MATERIAL_RECEIVED',
        'READY_FOR_DISPATCH',
        'LOADED',
        'DISPATCHED',
        'IN_TRANSIT',
        'REACHED_DESTINATION',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'POD_PENDING',
        'POD_UPLOADED',
        'COMPLETED',
        'DELAYED',
        'DAMAGED',
        'SHORT_MATERIAL',
        'HOLD',
        'REJECTED',
        'RETURNED'
      ),
      defaultValue: 'BOOKED',
    },
    is_billed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    barcode_data: {
      type: DataTypes.STRING(255),
    },
    qr_data: {
      type: DataTypes.TEXT,
    },
    expected_delivery_date: {
      type: DataTypes.DATEONLY,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'consignments',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'lr_number', 'deleted_at'] },
      { fields: ['status'] },
      { fields: ['booking_date'] },
      { fields: ['origin_branch_id'] },
      { fields: ['dest_branch_id'] },
      { fields: ['consignor_id'] },
      { fields: ['consignee_id'] },
      { fields: ['eway_bill_expiry'] },
    ],
  });

  return Consignment;
};
