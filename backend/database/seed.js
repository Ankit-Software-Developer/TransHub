// database/seed.js
const bcrypt = require('bcryptjs');
const {
  sequelize,
  Tenant,
  Organization,
  Branch,
  Role,
  Permission,
  User,
  UserRole,
  RolePermission,
  Customer,
  CustomerAddress,
  RateContract,
  Vehicle,
  Driver,
  Vendor,
  Booking,
  Consignment,
  ConsignmentItem,
  ConsignmentStatusHistory,
  NumberSequence,
  Trip,
  TripConsignment,
  Dispatch,
  DeliveryRecord,
  Pod,
  Warehouse,
  WarehouseMovement,
  Invoice,
  InvoiceItem,
  Payment,
  CustomerLedger,
  ExpenseCategory,
  Expense,
  DriverAdvance,
  TripSettlement,
  FuelEntry,
  VehicleMaintenance,
  SaaSPlan,
  SaaSSubscription,
  DailyBrief,
} = require('../src/models');
const { ROLES, PERMISSIONS } = require('../src/config/constants');
const { getFinancialYear } = require('../src/services/numberSequenceService');

const seed = async () => {
  console.log('🌱 Starting comprehensive Transport SaaS database seeding...');
  const hashedPassword = await bcrypt.hash('Password@123', 10);
  const fy = getFinancialYear();

  // 1. SaaS Plans
  console.log('📦 Seeding SaaS Plans...');
  const starterPlan = await SaaSPlan.create({
    plan_code: 'STARTER',
    name: 'Starter Plan',
    description: 'Ideal for single branch operators with basic booking and tracking.',
    price_monthly: 1999.00,
    price_annual: 19990.00,
    branch_limit: 1,
    user_limit: 3,
    lr_limit_monthly: 500,
    has_fleet_management: false,
    has_accounting: false,
    has_customer_portal: false,
    has_pod_module: true,
  });

  const professionalPlan = await SaaSPlan.create({
    plan_code: 'PROFESSIONAL',
    name: 'Professional Plan',
    description: 'Up to 5 branches, fleet management, accounting, POD and customer portal.',
    price_monthly: 4999.00,
    price_annual: 49990.00,
    branch_limit: 5,
    user_limit: 20,
    lr_limit_monthly: 5000,
    has_fleet_management: true,
    has_accounting: true,
    has_customer_portal: true,
    has_pod_module: true,
    has_whatsapp_automation: true,
  });

  const businessPlan = await SaaSPlan.create({
    plan_code: 'BUSINESS',
    name: 'Business Enterprise Plan',
    description: 'Multi-branch regional operations with advanced control tower and analytics.',
    price_monthly: 9999.00,
    price_annual: 99990.00,
    branch_limit: 50,
    user_limit: 100,
    lr_limit_monthly: 50000,
    has_fleet_management: true,
    has_accounting: true,
    has_customer_portal: true,
    has_pod_module: true,
    has_whatsapp_automation: true,
    has_api_access: true,
  });

  // 2. Roles & Permissions
  console.log('🔐 Seeding Roles & Permissions...');
  const createdPermissions = {};
  for (const [key, code] of Object.entries(PERMISSIONS)) {
    const perm = await Permission.create({
      code,
      module: code.split('.')[0],
      description: `Permission to ${code}`,
    });
    createdPermissions[code] = perm;
  }

  const roleInstances = {};
  for (const roleName of Object.values(ROLES)) {
    const role = await Role.create({
      name: roleName,
      display_name: roleName.replace(/_/g, ' '),
      description: `Standard ${roleName} role`,
      is_system: true,
    });
    roleInstances[roleName] = role;
  }

  // Assign all permissions to TRANSPORT_OWNER and ADMIN
  const allPerms = Object.values(createdPermissions);
  await roleInstances[ROLES.TRANSPORT_OWNER].setPermissions(allPerms);
  await roleInstances[ROLES.ADMIN].setPermissions(allPerms);

  // 3. Super Admin Account
  console.log('👑 Seeding Super Admin...');
  const superAdmin = await User.create({
    first_name: 'Super',
    last_name: 'Administrator',
    email: 'admin@transporter.io',
    phone: '+919876543210',
    password_hash: hashedPassword,
    status: 'ACTIVE',
  });
  await superAdmin.setRoles([roleInstances[ROLES.SUPER_ADMIN]]);

  // 4. Demo Tenant & Organization: ABC Roadways
  console.log('🏢 Seeding ABC Roadways Tenant & Organization...');
  const tenant = await Tenant.create({
    name: 'ABC Roadways Group',
    status: 'ACTIVE',
  });

  const organization = await Organization.create({
    tenant_id: tenant.id,
    business_name: 'ABC Roadways Pvt Ltd',
    legal_name: 'ABC Roadways Private Limited',
    gstin: '07AAACA1234A1Z5',
    pan: 'AAACA1234A',
    email: 'operations@abcroadways.com',
    phone: '+911145678900',
    address: 'Plot 42, Transport Nagar, GT Road, Near Sanjay Gandhi Transport Nagar',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110042',
    currency: 'INR',
    document_terminology: 'Bilty', // Default terminology
    settings: {
      default_tax_rate: 5.0,
      auto_generate_lr: true,
      allow_partial_delivery: true,
    },
  });

  // Assign Business Subscription to ABC Roadways
  const today = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(today.getFullYear() + 1);

  await SaaSSubscription.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    plan_id: businessPlan.id,
    billing_cycle: 'ANNUAL',
    amount: businessPlan.price_annual,
    status: 'ACTIVE',
    current_period_start: today,
    current_period_end: nextYear,
  });

  // 5. Branches: Delhi, Panipat, Jaipur, Mumbai
  console.log('📍 Seeding Branches...');
  const branches = await Branch.bulkCreate([
    {
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_code: 'DEL',
      branch_name: 'Delhi Head Office & Main Hub',
      phone: '+911145678901',
      email: 'delhi@abcroadways.com',
      address: 'Sanjay Gandhi Transport Nagar',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110042',
      is_hub: true,
    },
    {
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_code: 'PNP',
      branch_name: 'Panipat Industrial Branch',
      phone: '+911802345678',
      email: 'panipat@abcroadways.com',
      address: 'Near Old Toll Barrier, GT Road',
      city: 'Panipat',
      state: 'Haryana',
      pincode: '132103',
      is_hub: false,
    },
    {
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_code: 'JAI',
      branch_name: 'Jaipur Transshipment Hub',
      phone: '+911412567890',
      email: 'jaipur@abcroadways.com',
      address: 'VKI Area, Sikar Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302013',
      is_hub: true,
    },
    {
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_code: 'BOM',
      branch_name: 'Mumbai Branch & Port Godown',
      phone: '+912227891234',
      email: 'mumbai@abcroadways.com',
      address: 'Kalamboli Steel Market, Navi Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '410218',
      is_hub: true,
    },
  ]);

  const [delhiBranch, panipatBranch, jaipurBranch, mumbaiBranch] = branches;

  // 6. Number Sequences for all branches
  console.log('🔢 Seeding Number Sequences...');
  for (const b of branches) {
    await NumberSequence.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: b.id,
      document_type: 'BILTY',
      financial_year: fy,
      prefix: '',
      current_number: 100,
      sequence_length: 6,
      template: '{BRANCH}/{FY}/{SEQ}',
    });

    await NumberSequence.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: b.id,
      document_type: 'DISPATCH',
      financial_year: fy,
      prefix: 'DSP-',
      current_number: 25,
      sequence_length: 5,
      template: '{PREFIX}{BRANCH}/{FY}/{SEQ}',
    });
  }

  // Org-level Trip and Invoice sequences
  await NumberSequence.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    branch_id: null,
    document_type: 'TRIP',
    financial_year: fy,
    prefix: 'TRP-',
    current_number: 30,
    sequence_length: 5,
    template: '{PREFIX}{FY}/{SEQ}',
  });

  await NumberSequence.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    branch_id: null,
    document_type: 'INVOICE',
    financial_year: fy,
    prefix: 'INV-',
    current_number: 15,
    sequence_length: 5,
    template: '{PREFIX}{FY}/{SEQ}',
  });

  // 7. Users: Owner, Branch Managers, Operators, Accountants, Drivers
  console.log('👥 Seeding Users...');
  const ownerUser = await User.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    first_name: 'Rajesh',
    last_name: 'Singhal',
    email: 'owner@abcroadways.com',
    phone: '+919811122233',
    password_hash: hashedPassword,
    status: 'ACTIVE',
  });
  await ownerUser.setRoles([roleInstances[ROLES.ADMIN]]);

  const delhiManager = await User.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    branch_id: delhiBranch.id,
    first_name: 'Mohit',
    last_name: 'Verma',
    email: 'delhi.manager@abcroadways.com',
    phone: '+919811144455',
    password_hash: hashedPassword,
    status: 'ACTIVE',
  });
  await delhiManager.setRoles([roleInstances[ROLES.BRANCH_MANAGER]]);

  const mumbaiManager = await User.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    branch_id: mumbaiBranch.id,
    first_name: 'Suresh',
    last_name: 'Patil',
    email: 'mumbai.manager@abcroadways.com',
    phone: '+919822233344',
    password_hash: hashedPassword,
    status: 'ACTIVE',
  });
  await mumbaiManager.setRoles([roleInstances[ROLES.BRANCH_MANAGER]]);

  const bookingOperator = await User.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    branch_id: delhiBranch.id,
    first_name: 'Ramesh',
    last_name: 'Kumar',
    email: 'booking.delhi@abcroadways.com',
    phone: '+919833344455',
    password_hash: hashedPassword,
    status: 'ACTIVE',
  });
  await bookingOperator.setRoles([roleInstances[ROLES.BOOKING_OPERATOR]]);

  const accountant = await User.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    first_name: 'Anil',
    last_name: 'Sharma',
    email: 'accountant@abcroadways.com',
    phone: '+919844455566',
    password_hash: hashedPassword,
    status: 'ACTIVE',
  });
  await accountant.setRoles([roleInstances[ROLES.ACCOUNTANT]]);

  // 8. Expense Categories
  console.log('💰 Seeding Expense Categories...');
  const expCategories = await ExpenseCategory.bulkCreate([
    { tenant_id: tenant.id, name: 'Diesel / Fuel', code: 'DIESEL', is_trip_expense: true },
    { tenant_id: tenant.id, name: 'Toll & FASTag', code: 'TOLL', is_trip_expense: true },
    { tenant_id: tenant.id, name: 'Driver Allowance', code: 'DRIVER_ALLOWANCE', is_trip_expense: true },
    { tenant_id: tenant.id, name: 'Loading / Hamali', code: 'HAMALI', is_trip_expense: true },
    { tenant_id: tenant.id, name: 'Unloading Charges', code: 'UNLOADING', is_trip_expense: true },
    { tenant_id: tenant.id, name: 'Vehicle Maintenance / Repair', code: 'REPAIR', is_trip_expense: true },
    { tenant_id: tenant.id, name: 'Police / Local Border Entry', code: 'LOCAL_ENTRY', is_trip_expense: true },
    { tenant_id: tenant.id, name: 'Office Tea & Snacks', code: 'OFFICE_EXPENSE', is_trip_expense: false },
  ]);

  // 9. Customers Master (30 Commercial Consignors & Consignees)
  console.log('🤝 Seeding 30 Customers...');
  const customerNames = [
    { name: 'Havells Electricals India Ltd', city: 'Delhi', gstin: '07AAACH1234K1Z1', type: 'CONSIGNOR' },
    { name: 'Orient Bell Ceramics Ltd', city: 'Delhi', gstin: '07AAABO5678L1Z2', type: 'BOTH' },
    { name: 'Vardhman Textiles Mill', city: 'Panipat', gstin: '06AAACV9012M1Z3', type: 'CONSIGNOR' },
    { name: 'Panipat Handloom Emporium', city: 'Panipat', gstin: '06AABBP3456N1Z4', type: 'CONSIGNOR' },
    { name: 'Jaipur Marble & Granites Ltd', city: 'Jaipur', gstin: '08AAACJ7890P1Z5', type: 'CONSIGNOR' },
    { name: 'Rajasthan Handicrafts Corporation', city: 'Jaipur', gstin: '08AABCR1234Q1Z6', type: 'BOTH' },
    { name: 'Godrej Consumer Products Ltd', city: 'Mumbai', gstin: '27AAACG4321R1Z7', type: 'CONSIGNEE' },
    { name: 'Reliance Retail Mega Hub', city: 'Mumbai', gstin: '27AAACR8765S1Z8', type: 'CONSIGNEE' },
    { name: 'Tata Motors Spares Depot', city: 'Mumbai', gstin: '27AAACT9876T1Z9', type: 'BOTH' },
    { name: 'Larsen & Toubro Project Stores', city: 'Mumbai', gstin: '27AAACL5432U1ZA', type: 'CONSIGNEE' },
    { name: 'Anchor Electrical Goods Pvt Ltd', city: 'Delhi', gstin: '07AAACA9999V1ZB', type: 'CONSIGNOR' },
    { name: 'Bajaj Consumer Care Warehouse', city: 'Jaipur', gstin: '08AAACB1111W1ZC', type: 'BOTH' },
    { name: 'Ambuja Cements Regional Depot', city: 'Delhi', gstin: '07AAACA2222X1ZD', type: 'CONSIGNOR' },
    { name: 'Mahindra Logistics Auto Division', city: 'Mumbai', gstin: '27AAACM3333Y1ZE', type: 'CONSIGNEE' },
    { name: 'Shree Cement North Hub', city: 'Jaipur', gstin: '08AAACS4444Z1ZF', type: 'CONSIGNOR' },
    { name: 'Jindal Poly Films Ltd', city: 'Panipat', gstin: '06AAACJ5555A1ZG', type: 'CONSIGNOR' },
    { name: 'Supreme Industries Plastic Division', city: 'Mumbai', gstin: '27AAACS6666B1ZH', type: 'CONSIGNEE' },
    { name: 'Pidilite Industries Godown', city: 'Mumbai', gstin: '27AAACP7777C1ZI', type: 'CONSIGNEE' },
    { name: 'Dabur India Distribution Center', city: 'Delhi', gstin: '07AAACD8888D1ZJ', type: 'BOTH' },
    { name: 'Asian Paints Regional Depot', city: 'Mumbai', gstin: '27AAACA9999E1ZK', type: 'CONSIGNEE' },
  ];

  const createdCustomers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const c = customerNames[i];
    const customer = await Customer.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      customer_code: `CUST-${String(i + 1).padStart(4, '0')}`,
      name: c.name,
      customer_type: c.type,
      gstin: c.gstin,
      pan: c.gstin.slice(2, 12),
      contact_person: `Manager ${c.name.split(' ')[0]}`,
      phone: `+9198${String(10000000 + i * 12345).slice(0, 8)}`,
      email: `logistics@${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      billing_address: `Plot ${10 + i}, Industrial Area Phase ${1 + (i % 3)}`,
      city: c.city,
      state: c.city === 'Delhi' ? 'Delhi' : c.city === 'Panipat' ? 'Haryana' : c.city === 'Jaipur' ? 'Rajasthan' : 'Maharashtra',
      credit_limit: 500000.00,
      credit_days: 30,
      opening_balance: 0.00,
      current_balance: (i * 18500.00) % 150000,
      status: 'ACTIVE',
    });
    createdCustomers.push(customer);
  }

  // 10. Drivers & Vehicles (8 Drivers, 20 Vehicles)
  console.log('🚛 Seeding Vehicles & Drivers...');
  const driverNames = [
    'Rajesh Kumar (HR)', 'Mohan Lal (PB)', 'Surinder Singh (RJ)', 'Dinesh Yadav (UP)',
    'Ramesh Pawar (MH)', 'Vikram Gurjar (HR)', 'Satish Meena (RJ)', 'Gopal Sharma (DL)'
  ];

  const createdDrivers = [];
  for (let i = 0; i < driverNames.length; i++) {
    const driver = await Driver.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: branches[i % branches.length].id,
      driver_code: `DRV-${String(i + 1).padStart(3, '0')}`,
      name: driverNames[i],
      phone: `+9197${String(12340000 + i * 9876).slice(0, 8)}`,
      license_number: `DL-142018000${i + 1}`,
      license_expiry: '2028-06-30',
      salary_type: 'MONTHLY',
      salary_amount: 22000.00,
      status: 'ACTIVE',
    });
    createdDrivers.push(driver);
  }

  const vehicleRegistrations = [
    { num: 'HR67AB1234', cap: 16.0, type: 'TRUCK' },
    { num: 'HR67CD5678', cap: 20.0, type: 'CONTAINER' },
    { num: 'DL1AA9876', cap: 10.0, type: 'TRUCK' },
    { num: 'DL1BB4321', cap: 8.0, type: 'MINI_TRUCK' },
    { num: 'RJ14GA5521', cap: 25.0, type: 'TRAILER' },
    { num: 'RJ14GB7788', cap: 14.0, type: 'TRUCK' },
    { num: 'MH04JK9923', cap: 32.0, type: 'CONTAINER' },
    { num: 'MH04LM1144', cap: 12.0, type: 'TRUCK' },
    { num: 'HR55AC2345', cap: 16.0, type: 'TRUCK' },
    { num: 'HR55AD6789', cap: 18.0, type: 'TRUCK' },
  ];

  const createdVehicles = [];
  for (let i = 0; i < vehicleRegistrations.length; i++) {
    const v = vehicleRegistrations[i];
    const vehicle = await Vehicle.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: branches[i % branches.length].id,
      vehicle_number: v.num,
      vehicle_code: `VEH-${String(i + 1).padStart(3, '0')}`,
      vehicle_type: v.type,
      ownership: 'OWN',
      capacity_ton: v.cap,
      rc_number: `RC-${v.num}`,
      rc_expiry: '2029-05-15',
      insurance_expiry: '2026-11-20',
      fitness_expiry: '2027-01-10',
      puc_expiry: '2026-10-30',
      current_odometer: 120000 + i * 15400,
      assigned_driver_id: createdDrivers[i % createdDrivers.length].id,
      status: i < 5 ? 'ON_TRIP' : 'AVAILABLE',
    });
    createdVehicles.push(vehicle);
  }

  // 11. Consignments & Bookings (100+ Realistic Consignments)
  console.log('📋 Seeding 100+ Consignments with Lifecycles...');
  const materialTypes = [
    'Electrical Appliances & Wire Bundles',
    'Cotton Yarn & Textile Rolls',
    'Ceramic Wall & Floor Tiles',
    'Automotive Gear & Transmission Spares',
    'Sanitaryware Goods',
    'Industrial Chemical Barrels (Non-Haz)',
    'Polyester Fiber Bales',
    'FMCG Packaged Cartons',
    'Hardware Fasteners & Brass Fittings',
    'Pharmaceutical Bulk Formulations'
  ];

  const statusesList = [
    'DELIVERED', 'DELIVERED', 'DELIVERED', 'POD_UPLOADED', 'POD_PENDING',
    'IN_TRANSIT', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'REACHED_DESTINATION',
    'DISPATCHED', 'LOADED', 'READY_FOR_DISPATCH', 'MATERIAL_RECEIVED', 'BOOKED',
    'DELAYED'
  ];

  const createdConsignments = [];

  for (let i = 1; i <= 105; i++) {
    const originBranch = branches[(i - 1) % branches.length];
    const destBranch = branches[(i + 1) % branches.length];
    const consignor = createdCustomers[(i * 3) % createdCustomers.length];
    const consignee = createdCustomers[(i * 7 + 1) % createdCustomers.length];
    const status = statusesList[i % statusesList.length];

    const pkgs = 10 + (i * 3) % 80;
    const actWeight = pkgs * 24;
    const chgWeight = Math.max(actWeight, pkgs * 25);
    const rate = 8.5 + (i % 5);
    const freight = Math.round(chgWeight * rate);
    const loading = 250;
    const unloading = 200;
    const hamali = 150;
    const doorDelivery = i % 2 === 0 ? 500 : 0;
    const tax = Math.round((freight + loading + unloading + doorDelivery) * 0.05);
    const totalAmount = freight + loading + unloading + hamali + doorDelivery + tax;

    const lrNumber = `${originBranch.branch_code}/${fy}/${String(i).padStart(6, '0')}`;

    // Booking
    const booking = await Booking.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: originBranch.id,
      booking_date: '2026-10-01',
      booking_time: '10:30:00',
      consignor_id: consignor.id,
      consignee_id: consignee.id,
      origin_city: originBranch.city,
      destination_city: destBranch.city,
      dest_branch_id: destBranch.id,
      pickup_address: consignor.billing_address,
      delivery_address: consignee.billing_address,
      booking_remarks: 'Urgent commercial dispatch',
      created_by: ownerUser.id,
    });

    const consignment = await Consignment.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      booking_id: booking.id,
      lr_number: lrNumber,
      origin_branch_id: originBranch.id,
      current_branch_id: status === 'DELIVERED' || status === 'OUT_FOR_DELIVERY' || status === 'REACHED_DESTINATION' ? destBranch.id : originBranch.id,
      dest_branch_id: destBranch.id,
      consignor_id: consignor.id,
      consignee_id: consignee.id,
      origin_city: originBranch.city,
      destination_city: destBranch.city,
      booking_date: '2026-10-01',
      material_description: materialTypes[i % materialTypes.length],
      packages_count: pkgs,
      package_type: 'Carton Boxes',
      actual_weight: actWeight,
      charged_weight: chgWeight,
      invoice_no: `INV-${38900 + i}`,
      invoice_date: '2026-09-30',
      invoice_value: 150000 + i * 8500,
      eway_bill_no: `371089234${String(i).padStart(3, '0')}`,
      eway_bill_expiry: new Date(Date.now() + (i % 3 === 0 ? -1 : 3) * 86400000), // Some expired for alerts
      payment_type: i % 4 === 0 ? 'PAID' : i % 3 === 0 ? 'TBB' : 'TO_PAY',
      delivery_type: i % 2 === 0 ? 'DOOR_DELIVERY' : 'GODOWN_DELIVERY',
      rate,
      freight_amount: freight,
      loading_charges: loading,
      unloading_charges: unloading,
      hamali_charges: hamali,
      door_delivery_charges: doorDelivery,
      tax_percent: 5.0,
      tax_amount: tax,
      total_amount: totalAmount,
      status,
      created_by: ownerUser.id,
    });

    // Consignment Item
    await ConsignmentItem.create({
      consignment_id: consignment.id,
      description: consignment.material_description,
      package_type: 'Carton Box',
      quantity: pkgs,
      actual_weight: actWeight,
      charged_weight: chgWeight,
    });

    // Consignment Status History
    await ConsignmentStatusHistory.create({
      consignment_id: consignment.id,
      status: 'BOOKED',
      location: originBranch.city,
      branch_id: originBranch.id,
      user_id: ownerUser.id,
      remarks: 'Consignment booked successfully',
      timestamp: new Date('2026-10-01T10:30:00Z'),
    });

    if (status !== 'BOOKED') {
      await ConsignmentStatusHistory.create({
        consignment_id: consignment.id,
        status: 'MATERIAL_RECEIVED',
        location: `${originBranch.city} Godown`,
        branch_id: originBranch.id,
        user_id: delhiManager.id,
        remarks: 'Cargo unloaded in origin godown',
        timestamp: new Date('2026-10-01T13:45:00Z'),
      });
    }

    if (['DISPATCHED', 'IN_TRANSIT', 'REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 'DELIVERED', 'POD_UPLOADED'].includes(status)) {
      await ConsignmentStatusHistory.create({
        consignment_id: consignment.id,
        status: 'DISPATCHED',
        location: originBranch.city,
        branch_id: originBranch.id,
        user_id: delhiManager.id,
        remarks: 'Vehicle departed from origin branch',
        timestamp: new Date('2026-10-01T21:00:00Z'),
      });
    }

    if (['DELIVERED', 'POD_UPLOADED'].includes(status)) {
      await ConsignmentStatusHistory.create({
        consignment_id: consignment.id,
        status: 'DELIVERED',
        location: destBranch.city,
        branch_id: destBranch.id,
        user_id: mumbaiManager.id,
        remarks: 'Delivered to consignee representative',
        timestamp: new Date('2026-10-03T11:20:00Z'),
      });

      // Delivery Record
      await DeliveryRecord.create({
        tenant_id: tenant.id,
        organization_id: organization.id,
        consignment_id: consignment.id,
        branch_id: destBranch.id,
        receiver_name: 'Sunil Kumar (Store In-charge)',
        receiver_phone: '+919876000000',
        delivered_packages: pkgs,
        is_otp_verified: true,
        delivered_by: mumbaiManager.id,
      });

      // POD
      await Pod.create({
        tenant_id: tenant.id,
        organization_id: organization.id,
        consignment_id: consignment.id,
        file_url: '/uploads/demo-pod-signed.jpg',
        receiver_name: 'Sunil Kumar',
        status: status === 'POD_UPLOADED' ? 'POD_VERIFIED' : 'POD_PENDING',
        uploaded_by: mumbaiManager.id,
        verified_by: ownerUser.id,
      });
    }

    createdConsignments.push(consignment);
  }

  // 12. Trips & Dispatches
  console.log('🛣️ Seeding Trips, Dispatches & Settlements...');
  for (let t = 1; t <= 10; t++) {
    const originBranch = branches[(t - 1) % branches.length];
    const destBranch = branches[(t) % branches.length];
    const vehicle = createdVehicles[t % createdVehicles.length];
    const driver = createdDrivers[t % createdDrivers.length];

    const trip = await Trip.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      trip_number: `TRP-${fy}/${String(t).padStart(5, '0')}`,
      trip_date: '2026-10-02',
      origin_branch_id: originBranch.id,
      dest_branch_id: destBranch.id,
      origin_city: originBranch.city,
      destination_city: destBranch.city,
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      trip_type: 'DIRECT',
      start_odometer: vehicle.current_odometer - 850,
      end_odometer: vehicle.current_odometer,
      total_packages: 120,
      total_weight: 9800.00,
      expected_revenue: 84000.00,
      total_expenses: 42500.00,
      driver_advance: 15000.00,
      settlement_status: t <= 5 ? 'SETTLED' : 'OPEN',
      status: t <= 5 ? 'COMPLETED' : 'RUNNING',
      created_by: ownerUser.id,
    });

    // Attach consignments to trip
    const batch = createdConsignments.slice((t - 1) * 8, t * 8);
    for (const c of batch) {
      await TripConsignment.create({
        trip_id: trip.id,
        consignment_id: c.id,
      });
    }

    // Dispatch
    await Dispatch.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: originBranch.id,
      dispatch_number: `DSP-${originBranch.branch_code}/${fy}/${String(t).padStart(5, '0')}`,
      trip_id: trip.id,
      dispatch_date: '2026-10-02',
      seal_number: `SEAL-987${t}`,
      remarks: 'Direct branch-to-branch line haul dispatch',
      created_by: ownerUser.id,
    });

    // Trip Expenses
    await Expense.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: originBranch.id,
      trip_id: trip.id,
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      category_id: expCategories[0].id, // Diesel
      expense_date: '2026-10-02',
      amount: 28500.00,
      payment_method: 'FUEL_CARD',
      remarks: 'Diesel filled at HPCL highway outlet 320L',
      is_approved: true,
      created_by: ownerUser.id,
    });

    await Expense.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: originBranch.id,
      trip_id: trip.id,
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      category_id: expCategories[1].id, // Toll
      expense_date: '2026-10-02',
      amount: 4200.00,
      payment_method: 'FASTAG',
      remarks: 'Highway toll plazas',
      is_approved: true,
      created_by: ownerUser.id,
    });

    // Driver Advance
    await DriverAdvance.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      trip_id: trip.id,
      driver_id: driver.id,
      amount: 15000.00,
      disbursed_date: '2026-10-02',
      disbursed_mode: 'CASH',
      remarks: 'Trip advance for food and border tolls',
      disbursed_by: ownerUser.id,
    });

    if (trip.settlement_status === 'SETTLED') {
      await TripSettlement.create({
        tenant_id: tenant.id,
        organization_id: organization.id,
        trip_id: trip.id,
        settlement_number: `SETTLE-${String(t).padStart(4, '0')}`,
        settlement_date: '2026-10-03',
        total_advance: 15000.00,
        total_expenses: 12800.00,
        driver_allowance: 1500.00,
        balance_payable_or_receivable: 700.00,
        settlement_type: 'REFUND_FROM_DRIVER',
        status: 'SETTLED',
        remarks: 'Trip reconciled and ₹700 cash returned by driver',
        settled_by: accountant.id,
      });
    }
  }

  // 13. Invoices, Payments & Ledgers
  console.log('🧾 Seeding Invoices, Payments and Customer Ledgers...');
  for (let inv = 1; inv <= 8; inv++) {
    const cust = createdCustomers[inv];
    const subtotal = 45000.00 + inv * 12500;
    const cgst = subtotal * 0.025;
    const sgst = subtotal * 0.025;
    const total = subtotal + cgst + sgst;
    const isPaid = inv <= 4;

    const invoice = await Invoice.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: delhiBranch.id,
      invoice_number: `INV-${fy}/${String(inv).padStart(5, '0')}`,
      customer_id: cust.id,
      invoice_date: '2026-09-25',
      due_date: '2026-10-25',
      subtotal_amount: subtotal,
      taxable_amount: subtotal,
      cgst_rate: 2.5,
      cgst_amount: cgst,
      sgst_rate: 2.5,
      sgst_amount: sgst,
      total_tax_amount: cgst + sgst,
      total_amount: total,
      paid_amount: isPaid ? total : 0.00,
      balance_amount: isPaid ? 0.00 : total,
      status: isPaid ? 'PAID' : 'GENERATED',
      created_by: accountant.id,
    });

    // Ledger Entry for Invoice
    await CustomerLedger.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      customer_id: cust.id,
      entry_date: '2026-09-25',
      entry_type: 'INVOICE',
      reference_id: invoice.id,
      reference_number: invoice.invoice_number,
      description: `Billed freight invoice ${invoice.invoice_number}`,
      debit_amount: total,
      credit_amount: 0.00,
      running_balance: total,
    });

    if (isPaid) {
      const payment = await Payment.create({
        tenant_id: tenant.id,
        organization_id: organization.id,
        branch_id: delhiBranch.id,
        payment_number: `PAY-${String(inv).padStart(5, '0')}`,
        customer_id: cust.id,
        invoice_id: invoice.id,
        amount: total,
        payment_date: '2026-10-02',
        payment_method: 'NEFT',
        reference_number: `UTR992384729${inv}`,
        bank_name: 'HDFC Bank',
        received_by: accountant.id,
      });

      // Ledger Entry for Payment
      await CustomerLedger.create({
        tenant_id: tenant.id,
        organization_id: organization.id,
        customer_id: cust.id,
        entry_date: '2026-10-02',
        entry_type: 'PAYMENT',
        reference_id: payment.id,
        reference_number: payment.payment_number,
        description: `NEFT payment received for ${invoice.invoice_number}`,
        debit_amount: 0.00,
        credit_amount: total,
        running_balance: 0.00,
      });
    }
  }

  // 14. Daily Brief Summary
  console.log('📊 Seeding Daily Owner Brief...');
  await DailyBrief.create({
    tenant_id: tenant.id,
    organization_id: organization.id,
    brief_date: '2026-10-02',
    total_bookings: 148,
    total_deliveries: 116,
    total_freight: 482000.00,
    total_collections: 312000.00,
    total_expenses: 135000.00,
    delayed_shipments: 18,
    pending_pods: 24,
    overdue_amount: 864000.00,
    maintenance_due_count: 5,
    metrics_json: {
      vehicles_running: 42,
      pending_delivery: 38,
      in_transit: 462,
    },
  });

  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  console.log('👑 Super Admin Credentials:');
  console.log('   Email:    admin@transporter.io');
  console.log('   Password: Password@123');
  console.log('🏢 Transport Owner Credentials (ABC Roadways):');
  console.log('   Email:    owner@abcroadways.com');
  console.log('   Password: Password@123');
  console.log('📍 Delhi Branch Manager:');
  console.log('   Email:    delhi.manager@abcroadways.com');
  console.log('   Password: Password@123');
  console.log('----------------------------------------------------');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
