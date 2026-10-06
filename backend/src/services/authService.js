const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  sequelize,
  User,
  Role,
  Permission,
  RefreshToken,
  Organization,
  Tenant,
  SaaSPlan,
  SaaSSubscription,
} = require('../models');
const { ROLES, PERMISSIONS } = require('../config/constants');
const { getFinancialYear } = require('./numberSequenceService');
const { createTenantDatabase, getTenantConnection } = require('./tenantDbManager');

/**
 * Ensures standard SaaS plans exist in database (Trial, Basic, Pro, Enterprise)
 */
const ensureDefaultPlans = async () => {
  const defaultPlans = [
    {
      plan_code: 'TRIAL',
      name: '30-Day Free Trial',
      description: 'Comprehensive 30-day trial with all enterprise features unlocked. Zero payment required.',
      price_monthly: 0.00,
      price_annual: 0.00,
      branch_limit: 3,
      user_limit: 10,
      lr_limit_monthly: 1000,
      has_fleet_management: true,
      has_accounting: true,
      has_customer_portal: true,
      has_pod_module: true,
      has_whatsapp_automation: true,
      has_api_access: true,
      is_active: true,
    },
    {
      plan_code: 'BASIC',
      name: 'Basic Plan',
      description: 'Ideal for small fleet owners & single-branch transporters. Includes 30-day free trial.',
      price_monthly: 500.00,
      price_annual: 4800.00,
      branch_limit: 1,
      user_limit: 5,
      lr_limit_monthly: 1000,
      has_fleet_management: false,
      has_accounting: false,
      has_customer_portal: false,
      has_pod_module: true,
      has_whatsapp_automation: false,
      has_api_access: false,
      is_active: true,
    },
    {
      plan_code: 'PRO',
      name: 'Pro Plan',
      description: 'Built for fast-growing regional logistics & multimodal carriers. Includes 30-day free trial.',
      price_monthly: 1000.00,
      price_annual: 9600.00,
      branch_limit: 5,
      user_limit: 25,
      lr_limit_monthly: 10000,
      has_fleet_management: true,
      has_accounting: true,
      has_customer_portal: true,
      has_pod_module: true,
      has_whatsapp_automation: true,
      has_api_access: false,
      is_active: true,
    },
    {
      plan_code: 'ENTERPRISE',
      name: 'Enterprise Plan',
      description: 'Enterprise power for nationwide 3PLs, freight networks & fleets. Includes 30-day free trial.',
      price_monthly: 2000.00,
      price_annual: 19200.00,
      branch_limit: 999,
      user_limit: 999,
      lr_limit_monthly: 999999,
      has_fleet_management: true,
      has_accounting: true,
      has_customer_portal: true,
      has_pod_module: true,
      has_whatsapp_automation: true,
      has_api_access: true,
      is_active: true,
    },
  ];

  for (const planDef of defaultPlans) {
    const existing = await SaaSPlan.findOne({ where: { plan_code: planDef.plan_code } });
    if (!existing) {
      await SaaSPlan.create(planDef);
    }
  }
};

const getPlans = async () => {
  await ensureDefaultPlans();
  const plans = await SaaSPlan.findAll({
    where: { is_active: true },
    order: [['price_monthly', 'ASC']],
  });
  return plans.map((p) => ({
    id: p.id,
    planCode: p.plan_code,
    name: p.name,
    description: p.description,
    priceMonthly: parseFloat(p.price_monthly),
    priceAnnual: parseFloat(p.price_annual),
    trialDays: 30,
    features: {
      branchLimit: p.branch_limit,
      userLimit: p.user_limit,
      lrLimitMonthly: p.lr_limit_monthly,
      hasFleetManagement: p.has_fleet_management,
      hasAccounting: p.has_accounting,
      hasCustomerPortal: p.has_customer_portal,
      hasPodModule: p.has_pod_module,
      hasWhatsappAutomation: p.has_whatsapp_automation,
      hasApiAccess: p.has_api_access,
    },
  }));
};

const generateTokens = async (user, ipAddress = null, deviceInfo = null, databaseName = null) => {
  let dbName = databaseName;
  if (!dbName && user.tenant_id) {
    try {
      const tenantRecord = await Tenant.findByPk(user.tenant_id);
      dbName = tenantRecord?.database_name || null;
    } catch (tErr) {
      console.warn('⚠️ Tenant database resolution warning during token generation:', tErr.message);
    }
  }

  const payload = {
    userId: user.id,
    email: user.email,
    tenantId: user.tenant_id,
    tenantDbName: dbName,
    organizationId: user.organization_id,
    branchId: user.branch_id,
    jti: crypto.randomUUID(),
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'transporter_access_secret_super_secure_key_2026_xyz',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );

  const rawRefreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'transporter_refresh_secret_super_secure_key_2026_abc',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

  // Hash refresh token for storage (SHA-256 prevents bcrypt 72-byte truncation)
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    user_id: user.id,
    token_hash: tokenHash,
    ip_address: ipAddress,
    device_info: deviceInfo,
    expires_at: expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
  };
};

const register = async ({
  fullName,
  companyName,
  email,
  phone,
  password,
  accountType = 'FLEET_OWNER',
  planCode = null,
  billingCycle = 'MONTHLY',
  city = null,
  state = null,
  pincode = null,
  address = null,
  branchName = null,
  branchCode = null,
  ipAddress = null,
  userAgent = null,
}) => {
  if (!email || !password || !fullName) {
    throw new Error('Full name, email, and password are required.');
  }

  // Check existing user
  const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existingUser) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  // Ensure default plans are ready
  await ensureDefaultPlans();

  // Normalize requested plan code:
  // If user does not choose any plan, or chooses 'trial', default to 30-day trial plan
  const normalizedPlanCode = (planCode || '').toUpperCase().trim();
  let targetCode = 'TRIAL';
  let isTrialWithoutPlan = false;

  if (!normalizedPlanCode || normalizedPlanCode === 'TRIAL' || normalizedPlanCode === 'NONE' || normalizedPlanCode === 'FREE') {
    targetCode = 'TRIAL';
    isTrialWithoutPlan = true;
  } else if (normalizedPlanCode.includes('BASIC') || normalizedPlanCode.includes('STARTER')) {
    targetCode = 'BASIC';
  } else if (normalizedPlanCode.includes('PRO')) {
    targetCode = 'PRO';
  } else if (normalizedPlanCode.includes('ENTERPRISE') || normalizedPlanCode.includes('BUSINESS')) {
    targetCode = 'ENTERPRISE';
  } else {
    // Fallback: look up directly or use TRIAL
    const testPlan = await SaaSPlan.findOne({ where: { plan_code: normalizedPlanCode } });
    targetCode = testPlan ? testPlan.plan_code : 'TRIAL';
  }

  const selectedPlan = await SaaSPlan.findOne({ where: { plan_code: targetCode } });
  if (!selectedPlan) {
    throw new Error(`Plan ${targetCode} could not be resolved.`);
  }

  // 30-Day Trial Window Calculation
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(now.getDate() + 30); // Exactly 30 days trial period!

  const hashedPassword = await bcrypt.hash(password, 10);
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || 'User';
  const lastName = nameParts.slice(1).join(' ') || '';
  const businessName = (companyName || '').trim() || `${firstName}'s Roadways & Logistics`;

  // Determine amount
  const cycle = (billingCycle || 'MONTHLY').toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const planAmount = isTrialWithoutPlan ? 0.00 : (cycle === 'ANNUAL' ? selectedPlan.price_annual : selectedPlan.price_monthly);

  const t = await sequelize.transaction();

  try {
    // 0. Dynamically provision isolated MySQL Tenant Database
    const tenantDb = await createTenantDatabase(businessName);
    const tenantDbName = tenantDb.dbName;

    // 1. Create Tenant (TRIAL status for 30 days) in Master DB
    const tenant = await Tenant.create({
      name: businessName,
      database_name: tenantDbName,
      status: 'TRIAL',
    }, { transaction: t });

    // 2. Create Organization
    const organization = await Organization.create({
      tenant_id: tenant.id,
      business_name: businessName,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      document_terminology: 'Bilty',
      settings: {
        registered_plan: selectedPlan.plan_code,
        trial_duration_days: 30,
        trial_end_date: trialEnd.toISOString(),
      },
    }, { transaction: t });

    // 3. Create SaaS Subscription (30-day free trial based on chosen plan or default)
    const subscription = await SaaSSubscription.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      plan_id: selectedPlan.id,
      billing_cycle: cycle,
      amount: planAmount,
      status: 'TRIAL', // Trial-based registration for 30 days
      current_period_start: now.toISOString().split('T')[0],
      current_period_end: trialEnd.toISOString().split('T')[0],
      trial_end: trialEnd.toISOString().split('T')[0],
    }, { transaction: t });

    // Generate branch ID & details for Default Branch (HQ) in tenant operational database
    const branchId = crypto.randomUUID();
    const finalBranchName = (branchName || '').trim() || `${businessName} - Head Office`;
    const finalBranchCode = (branchCode || '').trim().toUpperCase() || 'HQ';
    const finalBranchCity = (city || '').trim() || 'Head Office';
    const finalBranchState = (state || '').trim() || 'General';
    const finalBranchPincode = (pincode || '').trim() || '110001';
    const finalBranchAddress = (address || '').trim() || 'Head Office Terminal';

    // 4. Create Primary User in Master DB
    const user = await User.create({
      tenant_id: tenant.id,
      organization_id: organization.id,
      branch_id: branchId,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password_hash: hashedPassword,
      status: 'ACTIVE',
    }, { transaction: t });

    // 5. Find or Create Role: ADMIN in Master DB
    let adminRole = await Role.findOne({
      where: { name: ROLES.ADMIN },
      transaction: t,
    });

    if (!adminRole) {
      adminRole = await Role.create({
        name: ROLES.ADMIN,
        display_name: 'Admin',
        description: 'Complete administrative access to transport operations and settings',
        is_system: true,
      }, { transaction: t });
    }

    await user.setRoles([adminRole], { transaction: t });

    await t.commit();

    // 6. Provision initial operational records inside the tenant's isolated database
    const fy = getFinancialYear();
    const docTypes = ['BILTY', 'INVOICE', 'TRIP'];

    try {
      if (tenantDb.models.Organization) {
        await tenantDb.models.Organization.create({
          id: organization.id,
          tenant_id: tenant.id,
          business_name: businessName,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          document_terminology: 'Bilty',
          settings: organization.settings,
        });
      }

      if (tenantDb.models.Branch) {
        await tenantDb.models.Branch.create({
          id: branchId,
          tenant_id: tenant.id,
          organization_id: organization.id,
          branch_code: finalBranchCode,
          branch_name: finalBranchName,
          phone: phone || null,
          email: email.toLowerCase().trim(),
          address: finalBranchAddress,
          city: finalBranchCity,
          state: finalBranchState,
          pincode: finalBranchPincode,
          is_hub: true,
          is_active: true,
        });
      }

      if (tenantDb.models.NumberSequence) {
        for (const docType of docTypes) {
          await tenantDb.models.NumberSequence.create({
            tenant_id: tenant.id,
            organization_id: organization.id,
            branch_id: branchId,
            document_type: docType,
            financial_year: fy,
            prefix: docType === 'BILTY' ? '' : `${docType.slice(0, 3)}-`,
            current_number: 100,
            sequence_length: 6,
            template: docType === 'BILTY' ? '{BRANCH}/{FY}/{SEQ}' : '{PREFIX}{FY}/{SEQ}',
          });
        }
      }

      let tenantAdminRole = null;
      if (tenantDb.models.Role) {
        tenantAdminRole = await tenantDb.models.Role.findOne({
          where: { name: ROLES.ADMIN },
        });
        if (!tenantAdminRole) {
          tenantAdminRole = await tenantDb.models.Role.create({
            name: ROLES.ADMIN,
            display_name: 'Admin',
            description: 'Complete administrative access to transport operations and settings',
            is_system: true,
          });
        }
      }

      // Seed standard system permissions into tenant DB
      if (tenantDb.models.Permission) {
        const allPermissions = Object.values(PERMISSIONS);
        for (const permCode of allPermissions) {
          await tenantDb.models.Permission.findOrCreate({
            where: { code: permCode },
            defaults: {
              code: permCode,
              module: permCode.split('.')[0].toUpperCase(),
              description: permCode.replace('.', ' ').toUpperCase(),
            },
          });
        }
        if (tenantAdminRole && tenantAdminRole.setPermissions) {
          const allPermRecords = await tenantDb.models.Permission.findAll();
          await tenantAdminRole.setPermissions(allPermRecords);
        }
      }

      // Seed default operational Expense Categories
      if (tenantDb.models.ExpenseCategory) {
        const defaultCategories = [
          { name: 'Fuel & Diesel', description: 'Diesel and petrol fuel expenses' },
          { name: 'Toll & Fastag', description: 'Highway, expressway and bridge toll taxes' },
          { name: 'Driver Daily Allowance', description: 'Driver and helper food & daily bhatta' },
          { name: 'Loading & Hamali', description: 'Origin loading labor and handling charges' },
          { name: 'Unloading Charges', description: 'Destination unloading and godown delivery charges' },
          { name: 'Vehicle Maintenance & Spares', description: 'Repairs, servicing, spares, oil changes' },
          { name: 'Police / RTO / Challan', description: 'RTO check-posts, weighbridge and traffic challans' },
          { name: 'Tyre & Punctures', description: 'Tyre changes, retreading, and puncture repair' },
          { name: 'Godown / Warehouse Rent', description: 'Transit godown, storage, and handling rent' },
          { name: 'Office & Admin Expenses', description: 'Stationery, printouts, phone bills, utilities' },
          { name: 'Miscellaneous', description: 'Other unclassified operational expenses' },
        ];
        for (const cat of defaultCategories) {
          await tenantDb.models.ExpenseCategory.findOrCreate({
            where: { name: cat.name },
            defaults: cat,
          });
        }
      }

      if (tenantDb.models.User) {
        const tenantUser = await tenantDb.models.User.create({
          id: user.id,
          tenant_id: tenant.id,
          organization_id: organization.id,
          branch_id: branchId,
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          password_hash: hashedPassword,
          status: 'ACTIVE',
        });

        if (tenantAdminRole && tenantUser.setRoles) {
          await tenantUser.setRoles([tenantAdminRole]);
        }
      }
    } catch (seedErr) {
      console.warn('Tenant DB initial seed warning:', seedErr.message);
    }

    // 7. Generate Tokens with isolated tenantDbName in JWT
    const tokens = await generateTokens(user, ipAddress, userAgent, tenantDbName);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        tenantId: user.tenant_id,
        organizationId: user.organization_id,
        organizationName: organization.business_name,
        branchId: branchId,
        branchName: branchName,
        branchCode: branchCode,
        roles: [adminRole.name],
        permissions: ['*'],
        documentTerminology: organization.document_terminology,
        subscription: {
          id: subscription.id,
          planCode: selectedPlan.plan_code,
          planName: selectedPlan.name,
          status: 'TRIAL',
          isTrial: true,
          trialDaysRemaining: 30,
          trialEndDate: trialEnd.toISOString().split('T')[0],
          billingCycle: cycle,
          amount: planAmount,
          chosenPlan: isTrialWithoutPlan ? '30-Day Free Trial (No Plan Selected)' : selectedPlan.name,
        },
      },
      subscription: {
        id: subscription.id,
        planCode: selectedPlan.plan_code,
        planName: selectedPlan.name,
        status: 'TRIAL',
        isTrial: true,
        trialDaysRemaining: 30,
        trialEndDate: trialEnd.toISOString().split('T')[0],
        billingCycle: cycle,
        amount: planAmount,
        chosenPlan: isTrialWithoutPlan ? '30-Day Free Trial (No Plan Selected)' : selectedPlan.name,
      },
      ...tokens,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const login = async ({ email, password, ipAddress, userAgent }) => {
  const user = await User.findOne({
    where: { email },
    include: [
      {
        model: Role,
        as: 'roles',
        include: [{ model: Permission, as: 'permissions' }],
      },
      {
        model: Organization,
        as: 'organization',
      },
    ],
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.status === 'SUSPENDED') {
    throw new Error('Account has been suspended. Please contact your administrator.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  await user.update({ last_login_at: new Date() });

  // Generate tokens
  const tokens = await generateTokens(user, ipAddress, userAgent);

  // Extract roles and permissions
  const roles = (user.roles && user.roles.length > 0) ? user.roles.map((r) => r.name) : ['ADMIN'];
  const permissions = new Set();
  (user.roles || []).forEach((r) => {
    (r.permissions || []).forEach((p) => {
      if (p && p.code) permissions.add(p.code);
    });
  });

  // Resolve branch and organization details from tenant database if available
  let branchName = `${user.organization?.business_name || 'Transport'} - Head Office`;
  let branchCode = 'HQ';
  let orgData = user.organization;

  if (user.tenant_id) {
    try {
      const tenant = await Tenant.findByPk(user.tenant_id);
      if (tenant?.database_name) {
        const tenantConn = await getTenantConnection(tenant.database_name);
        if (tenantConn?.models?.Branch && user.branch_id) {
          const branch = await tenantConn.models.Branch.findByPk(user.branch_id);
          if (branch) {
            branchName = branch.branch_name;
            branchCode = branch.branch_code;
          }
        }
        if (tenantConn?.models?.Organization && user.organization_id) {
          const tOrg = await tenantConn.models.Organization.findByPk(user.organization_id);
          if (tOrg) {
            orgData = tOrg;
          }
        }
      }
    } catch (bErr) {
      // Ignore branch resolution error and fallback to defaults
    }
  }

  // Resolve active subscription
  let subscriptionData = null;
  if (user.tenant_id) {
    try {
      const sub = await SaaSSubscription.findOne({
        where: { tenant_id: user.tenant_id },
      });
      if (sub) {
        const plan = await SaaSPlan.findByPk(sub.plan_id);
        const endDate = sub.trial_end || sub.current_period_end;
        let daysRemaining = null;
        if (endDate) {
          const end = new Date(endDate);
          const today = new Date();
          end.setHours(23, 59, 59, 999);
          today.setHours(0, 0, 0, 0);
          const diffMs = end.getTime() - today.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
        subscriptionData = {
          id: sub.id,
          planCode: plan?.plan_code || 'TRIAL',
          planName: plan?.name || 'Trial Plan',
          status: sub.status,
          isTrial: sub.status === 'TRIAL',
          trialDaysRemaining: daysRemaining,
          trialEndDate: sub.trial_end,
          currentPeriodEnd: sub.current_period_end,
          billingCycle: sub.billing_cycle,
          amount: sub.amount,
        };
      }
    } catch (sErr) {
      console.warn('Subscription fetch warning on login:', sErr.message);
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      tenantId: user.tenant_id,
      organizationId: user.organization_id,
      organizationName: orgData?.business_name || user.organization?.business_name || 'Fleet Operations',
      businessName: orgData?.business_name || user.organization?.business_name || 'Fleet Operations',
      logoUrl: orgData?.logo_url || user.organization?.logo_url || null,
      tagline: orgData?.settings?.tagline || user.organization?.settings?.tagline || null,
      themeColor: orgData?.settings?.themeColor || user.organization?.settings?.themeColor || null,
      documentTerminology: orgData?.document_terminology || user.organization?.document_terminology || 'Bilty',
      branchId: user.branch_id,
      branchName,
      branchCode,
      roles,
      permissions: Array.from(permissions),
      subscription: subscriptionData,
    },
    subscription: subscriptionData,
    ...tokens,
  };
};

const refreshAccessToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    throw new Error('Refresh token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(
      rawRefreshToken,
      process.env.JWT_REFRESH_SECRET || 'transporter_refresh_secret_super_secure_key_2026_abc'
    );
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }

  const user = await User.findByPk(decoded.userId, {
    include: [
      {
        model: Role,
        as: 'roles',
        include: [{ model: Permission, as: 'permissions' }],
      },
      { model: Organization, as: 'organization' },
    ],
  });

  if (!user || user.status === 'SUSPENDED') {
    throw new Error('User not found or suspended');
  }

  // Find active refresh tokens for this user
  const activeTokens = await RefreshToken.findAll({
    where: {
      user_id: user.id,
      is_revoked: false,
    },
  });

  const incomingHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  let matchedTokenRecord = null;
  for (const record of activeTokens) {
    if (record.token_hash === incomingHash) {
      matchedTokenRecord = record;
      break;
    }
    // Fallback for bcrypt hashes if any
    if (record.token_hash.startsWith('$2')) {
      const isBcryptMatch = await bcrypt.compare(rawRefreshToken, record.token_hash);
      if (isBcryptMatch) {
        matchedTokenRecord = record;
        break;
      }
    }
  }

  if (!matchedTokenRecord) {
    // Possible token reuse attack - invalidate all user sessions
    await RefreshToken.update({ is_revoked: true }, { where: { user_id: user.id } });
    throw new Error('Refresh token reuse detected. Session terminated for security.');
  }

  // Revoke old refresh token (Single-use rotation)
  await matchedTokenRecord.update({ is_revoked: true });

  // Issue new pair
  return generateTokens(user);
};

const logout = async (userId, rawRefreshToken) => {
  if (rawRefreshToken) {
    const incomingHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const activeTokens = await RefreshToken.findAll({
      where: { user_id: userId, is_revoked: false },
    });
    for (const record of activeTokens) {
      if (record.token_hash === incomingHash) {
        await record.update({ is_revoked: true });
        break;
      }
      if (record.token_hash.startsWith('$2')) {
        const isBcryptMatch = await bcrypt.compare(rawRefreshToken, record.token_hash);
        if (isBcryptMatch) {
          await record.update({ is_revoked: true });
          break;
        }
      }
    }
  }
};

const logoutAllDevices = async (userId) => {
  await RefreshToken.update({ is_revoked: true }, { where: { user_id: userId } });
};

const updateProfile = async ({ userId, tenantId, organizationId, payload, models }) => {
  const masterUser = await User.findByPk(userId);
  if (!masterUser) {
    throw new Error('User not found');
  }

  const { firstName, lastName, phone, businessName, tagline, themeColor, logoUrl } = payload;

  if (firstName) masterUser.first_name = firstName.trim();
  if (lastName !== undefined) masterUser.last_name = (lastName || '').trim();
  if (phone) masterUser.phone = phone.trim();
  await masterUser.save();

  // If models has User in tenant DB, sync it
  if (models?.User) {
    try {
      const tenantUser = await models.User.findByPk(userId);
      if (tenantUser) {
        if (firstName) tenantUser.first_name = firstName.trim();
        if (lastName !== undefined) tenantUser.last_name = (lastName || '').trim();
        if (phone) tenantUser.phone = phone.trim();
        await tenantUser.save();
      }
    } catch (e) {
      console.warn('Could not sync user to tenant DB:', e.message);
    }
  }

  // Update Organization branding / logo / themeColor in both Master DB and Tenant DB
  let updatedOrg = null;
  if (organizationId) {
    // 1. Update in Master DB Organization
    try {
      if (masterUser.sequelize) {
        await masterUser.sequelize.query('ALTER TABLE organizations MODIFY COLUMN logo_url LONGTEXT;').catch(() => { });
      }
      const masterOrg = await Organization.findByPk(organizationId);
      if (masterOrg) {
        if (businessName) masterOrg.business_name = businessName.trim();
        if (logoUrl !== undefined) masterOrg.logo_url = logoUrl;
        const currentSettings = masterOrg.settings || {};
        if (tagline !== undefined) currentSettings.tagline = tagline;
        if (themeColor) currentSettings.themeColor = themeColor;
        masterOrg.settings = currentSettings;
        await masterOrg.save();
        updatedOrg = masterOrg;
      }
    } catch (e) {
      console.warn('Could not update master org settings:', e.message);
    }

    // 2. Also update in Tenant DB Organization if available
    if (models?.Organization) {
      try {
        if (models.Organization.sequelize) {
          await models.Organization.sequelize.query('ALTER TABLE organizations MODIFY COLUMN logo_url LONGTEXT;').catch(() => { });
        }
        const tenantOrg = await models.Organization.findByPk(organizationId);
        if (tenantOrg) {
          if (businessName) tenantOrg.business_name = businessName.trim();
          if (logoUrl !== undefined) tenantOrg.logo_url = logoUrl;
          const currentSettings = tenantOrg.settings || {};
          if (tagline !== undefined) currentSettings.tagline = tagline;
          if (themeColor) currentSettings.themeColor = themeColor;
          tenantOrg.settings = currentSettings;
          await tenantOrg.save();
          if (!updatedOrg) updatedOrg = tenantOrg;
        }
      } catch (e) {
        console.warn('Could not update tenant org settings:', e.message);
      }
    }
  }

  return {
    id: masterUser.id,
    firstName: masterUser.first_name,
    lastName: masterUser.last_name,
    email: masterUser.email,
    phone: masterUser.phone,
    businessName: updatedOrg?.business_name || businessName,
    logoUrl: updatedOrg?.logo_url !== undefined ? updatedOrg.logo_url : logoUrl,
    tagline: updatedOrg?.settings?.tagline || tagline,
    themeColor: updatedOrg?.settings?.themeColor || themeColor,
  };
};

const changePassword = async ({ userId, currentPassword, newPassword, models }) => {
  const masterUser = await User.findByPk(userId);
  if (!masterUser) {
    throw new Error('User not found');
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, masterUser.password_hash);
  if (!isCurrentValid) {
    throw new Error('Current password is incorrect');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long');
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);

  masterUser.password_hash = newHash;
  await masterUser.save();

  // Also sync to tenant DB if exists
  if (models?.User) {
    try {
      const tenantUser = await models.User.findByPk(userId);
      if (tenantUser) {
        tenantUser.password_hash = newHash;
        await tenantUser.save();
      }
    } catch (e) {
      console.warn('Could not sync password to tenant DB:', e.message);
    }
  }

  return { success: true, message: 'Password updated successfully' };
};

module.exports = {
  register,
  getPlans,
  login,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  ensureDefaultPlans,
  updateProfile,
  changePassword,
};
