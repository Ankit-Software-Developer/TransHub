// src/models/Trip.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trip = sequelize.define('Trip', {
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
    trip_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    trip_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    origin_branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    dest_branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    origin_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    destination_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: true, // If market vehicle or hiring vendor transporter
    },
    trip_mode: {
      type: DataTypes.STRING(40),
      defaultValue: 'CONSIGNMENT_MANIFEST',
      comment: 'CONSIGNMENT_MANIFEST (regular builty manifest) or DIRECT_VEHICLE_HIRE (dedicated contract)',
    },
    hiring_party_type: {
      type: DataTypes.STRING(30),
      defaultValue: 'CUSTOMER',
      comment: 'CUSTOMER, VENDOR_TRANSPORTER, or DIRECT_PARTY',
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    hiring_party_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    hiring_party_phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    party_ref_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Customer's or Hirer's own Challan, Memo, or Docket number",
    },
    eway_bill_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    contract_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: 'Agreed contract freight rate payable to us by the hiring party',
    },
    advance_received: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: 'Advance received from the hiring party at placement',
    },
    billing_status: {
      type: DataTypes.STRING(30),
      defaultValue: 'UNBILLED',
      comment: 'UNBILLED, INVOICED, or SETTLED',
    },
    goods_description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Summary of goods or cargo loaded (e.g. Steel Coils, FMCG)',
    },
    trip_type: {
      type: DataTypes.ENUM('DIRECT', 'HUB', 'MULTI_STOP'),
      defaultValue: 'DIRECT',
    },
    load_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'PTL',
      comment: 'PTL (Part Truck Load) or FTL (Full Truck Load)',
    },
    start_odometer: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    end_odometer: {
      type: DataTypes.INTEGER,
    },
    start_time: {
      type: DataTypes.DATE,
    },
    end_time: {
      type: DataTypes.DATE,
    },
    total_packages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_weight: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    expected_revenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    vehicle_charge: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: 'Agreed Vehicle / Hire Charge for MARKET or ATTACHED vehicle',
    },
    hire_pricing_mode: {
      type: DataTypes.STRING(20),
      defaultValue: 'FIXED',
      comment: 'FIXED (lump sum) or PER_KM (meter/odometer rate)',
    },
    hire_rate_per_km: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Agreed hire rate per KM when hire_pricing_mode is PER_KM',
    },
    hire_estimated_km: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Estimated distance in KM for Per KM hire',
    },
    total_expenses: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    driver_advance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    settlement_status: {
      type: DataTypes.ENUM('OPEN', 'UNDER_REVIEW', 'SETTLED'),
      defaultValue: 'OPEN',
    },
    status: {
      type: DataTypes.ENUM('PLANNED', 'READY', 'RUNNING', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'PLANNED',
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    receiver_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Name of the receiver who accepted direct delivery',
    },
    receiver_phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    pod_doc_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'SIGNED_CHALLAN',
    },
    pod_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pod_file_url: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Proof of Delivery (POD) photo/document URL for direct vehicle placement',
    },
    delivery_remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'trips',
    indexes: [
      { fields: ['tenant_id', 'organization_id'] },
      { unique: true, fields: ['organization_id', 'trip_number', 'deleted_at'] },
      { fields: ['vehicle_id'] },
      { fields: ['driver_id'] },
      { fields: ['status'] },
      { fields: ['trip_date'] },
    ],
  });

  return Trip;
};
