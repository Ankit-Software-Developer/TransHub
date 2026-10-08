// src/controllers/authController.js
const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', null, 400);
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login({ email, password, ipAddress, userAgent });

    // Record login in audit trail
    try {
      const { logAudit } = require('../middleware/auditLogger');
      const roleName = (result.user?.roles && result.user.roles[0]?.name) || (result.user?.roles && result.user.roles[0]) || 'Staff';
      logAudit({
        req: {
          ...req,
          tenant: {
            tenantId: result.user?.tenant_id,
            organizationId: result.user?.organization_id,
          },
          user: result.user,
        },
        action: 'LOGIN',
        entityType: 'SESSION',
        entityId: result.user?.id || 'AUTH',
        entityName: `${result.user?.name || 'User'} (${roleName})`,
        summary: `User ${result.user?.name || email} (${roleName}) signed in successfully`,
        newValues: {
          user_id: result.user?.id,
          email: result.user?.email,
          role: roleName,
          ip_address: ipAddress,
        },
      });
    } catch (auditErr) {
      // Continue without breaking login
    }

    // Set secure HTTP-only cookies
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return successResponse(res, 'Login successful', result);
  } catch (error) {
    console.error('❌ Login error:', error.message);
    const isAuthError =
      error.message.includes('Invalid email or password') ||
      error.message.includes('suspended') ||
      error.message.includes('required');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(res, error.message || 'Login failed', null, statusCode);
  }
};

const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      return errorResponse(res, 'Refresh token required', null, 400);
    }

    const tokens = await authService.refreshAccessToken(rawRefreshToken);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, 'Token refreshed successfully', tokens);
  } catch (error) {
    return errorResponse(res, error.message, null, 401);
  }
};

const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (req.user?.id) {
      await authService.logout(req.user.id, rawRefreshToken);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return successResponse(res, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const me = async (req, res) => {
  const user = req.user;
  let subscriptionData = null;
  if (user.tenant_id) {
    try {
      const { SaaSSubscription, SaaSPlan } = require('../models');
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
    } catch (sErr) {}
  }

  let orgData = null;
  if (user.organization_id) {
    try {
      const OrgModel = req.tenantDb?.Organization;
      if (OrgModel) {
        orgData = await OrgModel.findByPk(user.organization_id);
      }
      if (!orgData) {
        const { Organization } = require('../models');
        orgData = await Organization.findByPk(user.organization_id);
      }
    } catch (oErr) {}
  }

  return successResponse(res, 'User session active', {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    tenantId: user.tenant_id,
    organizationId: user.organization_id,
    organizationName: orgData?.business_name || 'Fleet Operations',
    businessName: orgData?.business_name || 'Fleet Operations',
    logoUrl: orgData?.logo_url || null,
    tagline: orgData?.settings?.tagline || null,
    themeColor: orgData?.settings?.themeColor || null,
    branchId: user.branch_id,
    branchCode: user.branch?.branch_code,
    branchName: user.branch?.branch_name,
    roles: req.userRoles,
    permissions: req.userPermissions,
    documentTerminology: orgData?.document_terminology || req.tenant?.documentTerminology || 'Bilty',
    subscription: subscriptionData,
  });
};

const register = async (req, res, next) => {
  try {
    const {
      fullName,
      companyName,
      email,
      phone,
      password,
      accountType,
      planCode,
      billingCycle,
      city,
      state,
      pincode,
      address,
      branchName,
      branchCode,
    } = req.body;

    if (!fullName || !email || !password) {
      return errorResponse(res, 'Full name, email, and password are required', null, 400);
    }

    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.register({
      fullName,
      companyName,
      email,
      phone,
      password,
      accountType,
      planCode,
      billingCycle,
      city,
      state,
      pincode,
      address,
      branchName,
      branchCode,
      ipAddress,
      userAgent,
    });

    // Set secure HTTP-only cookies
    if (result.accessToken) {
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
      });
    }

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    return successResponse(res, 'Account created successfully with 30-day free trial', result, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 400);
  }
};

const getPlans = async (req, res, next) => {
  try {
    const plans = await authService.getPlans();
    return successResponse(res, 'Plans retrieved successfully', plans);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const result = await authService.updateProfile({
      userId: req.user.id,
      tenantId: req.tenant.tenantId,
      organizationId: req.tenant.organizationId,
      payload: req.body,
      models: req.tenantDb,
    });
    return successResponse(res, 'Profile and branding updated successfully', result);
  } catch (error) {
    return errorResponse(res, error.message, null, 400);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current password and new password are required', null, 400);
    }
    const result = await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
      models: req.tenantDb,
    });
    return successResponse(res, result.message, null);
  } catch (error) {
    return errorResponse(res, error.message, null, 400);
  }
};

module.exports = {
  register,
  getPlans,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  changePassword,
};
