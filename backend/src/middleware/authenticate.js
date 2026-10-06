// src/middleware/authenticate.js
const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/apiResponse');
const { User, Role, Permission } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return errorResponse(res, 'Authentication token missing or invalid', null, 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'transporter_access_secret_super_secure_key_2026_xyz');

    // Fetch user with roles and permissions
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          include: [{ model: Permission, as: 'permissions' }],
        },
      ],
    });

    if (!user) {
      return errorResponse(res, 'User account no longer exists', null, 401);
    }

    if (user.status === 'SUSPENDED') {
      return errorResponse(res, 'User account is suspended. Contact administrator.', null, 403);
    }

    // Collect all permission codes
    const permissions = new Set();
    user.roles.forEach((role) => {
      role.permissions.forEach((perm) => {
        permissions.add(perm.code);
      });
    });

    req.user = user;
    req.userRoles = user.roles.map((r) => r.name);
    req.userPermissions = Array.from(permissions);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired. Please refresh your session.', null, 401);
    }
    return errorResponse(res, 'Invalid authentication token', null, 401);
  }
};

module.exports = authenticate;
