// src/controllers/userController.js
const bcrypt = require('bcryptjs');
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

const listUsers = async (req, res) => {
  try {
    const { User, Role, Branch } = defaultModels;
    const tenantId = req.tenant.tenantId;
    const organizationId = req.tenant.organizationId;

    const users = await User.findAll({
      where: {
        tenant_id: tenantId,
        organization_id: organizationId,
      },
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'display_name', 'description'],
          through: { attributes: [] },
        },
      ],
      attributes: [
        'id', 'first_name', 'last_name', 'email', 'phone', 'status', 'branch_id',
        'staff_code', 'designation', 'joining_date', 'aadhaar_number', 'pan_number',
        'address', 'emergency_contact', 'salary_amount', 'salary_type', 'document_url',
        'last_login_at', 'createdAt'
      ],
      order: [['createdAt', 'ASC']],
    });

    // Also enrich with Branch info from tenant DB or master DB
    let branchMap = {};
    try {
      const tenantBranchModel = req.tenantDb?.Branch || defaultModels.Branch;
      if (tenantBranchModel) {
        const branches = await tenantBranchModel.findAll({
          where: { organization_id: organizationId },
          attributes: ['id', 'branch_name', 'branch_code', 'city'],
        });
        branches.forEach((b) => {
          branchMap[b.id] = b;
        });
      }
    } catch (bErr) {
      console.warn('Branch mapping notice:', bErr.message);
    }

    const enrichedUsers = users.map((u) => {
      const uJson = u.toJSON();
      uJson.branch = uJson.branch_id && branchMap[uJson.branch_id] ? branchMap[uJson.branch_id] : null;
      return uJson;
    });

    return successResponse(res, 'Users fetched successfully', enrichedUsers);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const createUser = async (req, res) => {
  try {
    const { User, Role, UserRole } = defaultModels;
    const tenantId = req.tenant.tenantId;
    const organizationId = req.tenant.organizationId;

    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      role_id,
      role_name,
      branch_id,
      staff_code,
      designation,
      joining_date,
      aadhaar_number,
      pan_number,
      address,
      emergency_contact,
      salary_amount,
      salary_type,
      document_url,
      status,
    } = req.body;

    if (!first_name || !email || !password) {
      return errorResponse(res, 'First name, email, and password are required', null, 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingUser = await User.findOne({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return errorResponse(res, 'A user with this email address already exists', null, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-generate staff code if not provided
    let finalStaffCode = (staff_code || '').trim().toUpperCase();
    if (!finalStaffCode) {
      const staffCount = await User.count({ where: { organization_id: organizationId } });
      finalStaffCode = `STF-${String(staffCount + 1).padStart(3, '0')}`;
    }

    // 1. Create in Master DB
    const user = await User.create({
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: branch_id || null,
      first_name: first_name.trim(),
      last_name: last_name ? last_name.trim() : null,
      email: cleanEmail,
      phone: phone ? phone.trim() : null,
      password_hash: hashedPassword,
      staff_code: finalStaffCode,
      designation: designation ? designation.trim() : null,
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      aadhaar_number: aadhaar_number ? aadhaar_number.trim() : null,
      pan_number: pan_number ? pan_number.trim().toUpperCase() : null,
      address: address ? address.trim() : null,
      emergency_contact: emergency_contact ? emergency_contact.trim() : null,
      salary_amount: parseFloat(salary_amount || 0),
      salary_type: salary_type || 'MONTHLY',
      document_url: document_url || null,
      status: status || 'ACTIVE',
    });

    // 2. Assign Role in Master DB
    let targetRole = null;
    if (role_id) {
      targetRole = await Role.findByPk(role_id);
    } else if (role_name) {
      targetRole = await Role.findOne({ where: { name: role_name } });
    }

    if (!targetRole) {
      targetRole = await Role.findOne({ where: { name: 'BRANCH_MANAGER' } }) ||
                   await Role.findOne({ where: { name: 'ADMIN' } });
    }

    if (targetRole) {
      await user.setRoles([targetRole]);
    }

    // 3. Sync to Tenant DB if available
    try {
      if (req.tenantDb?.models?.User) {
        const tenantUser = await req.tenantDb.models.User.create({
          id: user.id,
          tenant_id: tenantId,
          organization_id: organizationId,
          branch_id: branch_id || null,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          password_hash: hashedPassword,
          staff_code: user.staff_code,
          designation: user.designation,
          joining_date: user.joining_date,
          aadhaar_number: user.aadhaar_number,
          pan_number: user.pan_number,
          address: user.address,
          emergency_contact: user.emergency_contact,
          salary_amount: user.salary_amount,
          salary_type: user.salary_type,
          document_url: user.document_url,
          status: user.status,
        });

        if (targetRole && req.tenantDb.models.Role) {
          const tenantRole = await req.tenantDb.models.Role.findOne({ where: { name: targetRole.name } });
          if (tenantRole && tenantUser.setRoles) {
            await tenantUser.setRoles([tenantRole]);
          }
        }
      }
    } catch (tSyncErr) {
      console.warn('Tenant user sync notice:', tSyncErr.message);
    }

    const result = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'roles', attributes: ['id', 'name', 'display_name'] }],
      attributes: [
        'id', 'first_name', 'last_name', 'email', 'phone', 'status', 'branch_id',
        'staff_code', 'designation', 'joining_date', 'aadhaar_number', 'pan_number',
        'address', 'emergency_contact', 'salary_amount', 'salary_type', 'document_url',
        'createdAt'
      ],
    });

    return successResponse(res, 'User registered successfully', result, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { User, Role } = defaultModels;
    const { id } = req.params;
    const tenantId = req.tenant.tenantId;
    const organizationId = req.tenant.organizationId;

    const user = await User.findOne({
      where: {
        id,
        tenant_id: tenantId,
        organization_id: organizationId,
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found in your organization', null, 404);
    }

    const {
      first_name,
      last_name,
      phone,
      password,
      role_id,
      branch_id,
      staff_code,
      designation,
      joining_date,
      aadhaar_number,
      pan_number,
      address,
      emergency_contact,
      salary_amount,
      salary_type,
      document_url,
      status,
    } = req.body;

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name.trim();
    if (last_name !== undefined) updates.last_name = last_name ? last_name.trim() : null;
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (branch_id !== undefined) updates.branch_id = branch_id || null;
    if (staff_code !== undefined) updates.staff_code = staff_code ? staff_code.trim().toUpperCase() : null;
    if (designation !== undefined) updates.designation = designation ? designation.trim() : null;
    if (joining_date !== undefined) updates.joining_date = joining_date || null;
    if (aadhaar_number !== undefined) updates.aadhaar_number = aadhaar_number ? aadhaar_number.trim() : null;
    if (pan_number !== undefined) updates.pan_number = pan_number ? pan_number.trim().toUpperCase() : null;
    if (address !== undefined) updates.address = address ? address.trim() : null;
    if (emergency_contact !== undefined) updates.emergency_contact = emergency_contact ? emergency_contact.trim() : null;
    if (salary_amount !== undefined) updates.salary_amount = parseFloat(salary_amount || 0);
    if (salary_type !== undefined) updates.salary_type = salary_type || 'MONTHLY';
    if (document_url !== undefined) updates.document_url = document_url || null;
    if (status !== undefined) updates.status = status;

    if (password && password.trim().length >= 6) {
      updates.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    await user.update(updates);

    // Update Role if provided
    if (role_id) {
      const targetRole = await Role.findByPk(role_id);
      if (targetRole) {
        await user.setRoles([targetRole]);
      }
    }

    // Sync updates to tenant DB
    try {
      if (req.tenantDb?.models?.User) {
        const tenantUser = await req.tenantDb.models.User.findByPk(id);
        if (tenantUser) {
          await tenantUser.update(updates);
          if (role_id && req.tenantDb.models.Role) {
            const masterRole = await Role.findByPk(role_id);
            if (masterRole) {
              const tenantRole = await req.tenantDb.models.Role.findOne({ where: { name: masterRole.name } });
              if (tenantRole && tenantUser.setRoles) {
                await tenantUser.setRoles([tenantRole]);
              }
            }
          }
        }
      }
    } catch (syncErr) {
      console.warn('Tenant user update sync notice:', syncErr.message);
    }

    const updated = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'roles', attributes: ['id', 'name', 'display_name'] }],
      attributes: [
        'id', 'first_name', 'last_name', 'email', 'phone', 'status', 'branch_id',
        'staff_code', 'designation', 'joining_date', 'aadhaar_number', 'pan_number',
        'address', 'emergency_contact', 'salary_amount', 'salary_type', 'document_url',
        'createdAt'
      ],
    });

    return successResponse(res, 'User updated successfully', updated);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { User } = defaultModels;
    const { id } = req.params;
    const { status } = req.body;

    // Disallow self-suspension
    if (req.user?.id === id) {
      return errorResponse(res, 'You cannot change the status of your own account', null, 400);
    }

    const user = await User.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found', null, 404);
    }

    const newStatus = status || (user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    await user.update({ status: newStatus });

    try {
      if (req.tenantDb?.models?.User) {
        await req.tenantDb.models.User.update({ status: newStatus }, { where: { id } });
      }
    } catch (e) {}

    return successResponse(res, `User status updated to ${newStatus}`, { id, status: newStatus });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { User, UserRole } = defaultModels;
    const { id } = req.params;

    // Disallow self-deletion
    if (req.user?.id === id) {
      return errorResponse(res, 'You cannot delete your own account', null, 400);
    }

    const user = await User.findOne({
      where: {
        id,
        tenant_id: req.tenant.tenantId,
        organization_id: req.tenant.organizationId,
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found', null, 404);
    }

    if (UserRole) {
      await UserRole.destroy({ where: { user_id: id } }).catch(() => {});
    }

    await user.destroy();

    try {
      if (req.tenantDb?.models?.User) {
        if (req.tenantDb.models.UserRole) {
          await req.tenantDb.models.UserRole.destroy({ where: { user_id: id } }).catch(() => {});
        }
        await req.tenantDb.models.User.destroy({ where: { id } }).catch(() => {});
      }
    } catch (e) {}

    return successResponse(res, 'User deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
};
