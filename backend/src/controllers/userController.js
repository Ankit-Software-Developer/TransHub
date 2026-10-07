// src/controllers/userController.js
const bcrypt = require('bcryptjs');
const defaultModels = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getTenantModels = (req) => {
  return req.tenantDb?.models || req.tenantDb || null;
};

/**
 * List all staff members for the current tenant.
 * Queries Tenant DB staff records first to include operational HR & KYC data.
 */
const listUsers = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    const organizationId = req.tenant?.organizationId;
    const tModels = getTenantModels(req);

    // 1. Try fetching from Tenant DB (TenantStaff)
    if (tModels?.User) {
      try {
        const whereClause = {};
        if (organizationId) {
          whereClause.organization_id = organizationId;
        } else if (tenantId) {
          whereClause.tenant_id = tenantId;
        }

        const staffList = await tModels.User.findAll({
          where: whereClause,
          include: [
            ...(tModels.Role ? [{
              model: tModels.Role,
              as: 'roles',
              attributes: ['id', 'name', 'display_name', 'description'],
              through: { attributes: [] },
            }] : []),
            ...(tModels.Branch ? [{
              model: tModels.Branch,
              as: 'branch',
              attributes: ['id', 'branch_name', 'branch_code', 'city'],
            }] : []),
          ],
          order: [['created_at', 'ASC']],
        });

        if (staffList && staffList.length > 0) {
          const formatted = staffList.map((s) => {
            const json = s.toJSON();
            // Default role if not assigned
            if (!json.roles || json.roles.length === 0) {
              json.roles = [{ id: 'admin', name: 'ADMIN', display_name: 'Admin' }];
            }
            return json;
          });
          return successResponse(res, 'Users fetched successfully', formatted);
        }
      } catch (tErr) {
        console.warn('⚠️ Tenant DB staff list query notice, falling back:', tErr.message);
      }
    }

    // 2. Fallback to Master DB User table if Tenant DB returned no records yet
    const { User, Role, Branch } = defaultModels;
    const masterWhere = {};
    if (organizationId) {
      masterWhere.organization_id = organizationId;
    } else if (tenantId) {
      masterWhere.tenant_id = tenantId;
    }

    const masterUsers = await User.findAll({
      where: masterWhere,
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
        'last_login_at', 'created_at'
      ],
      order: [['created_at', 'ASC']],
    });

    let branchMap = {};
    if (tModels?.Branch || Branch) {
      try {
        const branchModel = tModels?.Branch || Branch;
        const branchWhere = {};
        if (organizationId) branchWhere.organization_id = organizationId;
        else if (tenantId) branchWhere.tenant_id = tenantId;
        const branches = await branchModel.findAll({
          where: branchWhere,
          attributes: ['id', 'branch_name', 'branch_code', 'city'],
        });
        branches.forEach((b) => {
          branchMap[b.id] = b;
        });
      } catch (bErr) {}
    }

    const enriched = masterUsers.map((u) => {
      const uJson = u.toJSON();
      uJson.branch = uJson.branch_id && branchMap[uJson.branch_id] ? branchMap[uJson.branch_id] : null;
      if (!uJson.roles || uJson.roles.length === 0) {
        uJson.roles = [{ id: 'admin', name: 'ADMIN', display_name: 'Admin' }];
      }
      return uJson;
    });

    return successResponse(res, 'Users fetched successfully', enriched);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Register a new staff member.
 * Master DB: stores strictly login credentials & tenant routing.
 * Tenant DB: stores complete operational staff profile, salary, KYC, and role mapping.
 */
const createUser = async (req, res) => {
  try {
    const { User: MasterUser, Role: MasterRole } = defaultModels;
    const tenantId = req.tenant?.tenantId;
    const organizationId = req.tenant?.organizationId;
    const tModels = getTenantModels(req);

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
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return errorResponse(res, 'Please provide a valid email address (e.g. name@company.com)', null, 400);
    }

    if (phone) {
      const digitsOnly = String(phone).replace(/[^0-9]/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        return errorResponse(res, 'Please provide a valid mobile/phone number (7-15 digits)', null, 400);
      }
    }

    // Check if email already registered in Master DB
    const existingMasterUser = await MasterUser.findOne({
      where: { email: cleanEmail },
    });

    if (existingMasterUser) {
      return errorResponse(res, 'A user with this email address already exists', null, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-generate staff code if not provided
    let finalStaffCode = (staff_code || '').trim().toUpperCase();
    if (!finalStaffCode) {
      let count = 0;
      if (tModels?.User) {
        count = await tModels.User.count({ where: { organization_id: organizationId } }).catch(() => 0);
      } else {
        count = await MasterUser.count({ where: { organization_id: organizationId } }).catch(() => 0);
      }
      finalStaffCode = `STF-${String(count + 1).padStart(3, '0')}`;
    }

    // 1. Create Credential Entry in Master DB (transporter_master.users)
    const masterUser = await MasterUser.create({
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: branch_id || null,
      first_name: first_name.trim(),
      last_name: last_name ? last_name.trim() : null,
      email: cleanEmail,
      phone: phone ? phone.trim() : null,
      password_hash: hashedPassword,
      status: status || 'ACTIVE',
    });

    // 2. Resolve Role in Master & Tenant DB
    let targetRoleName = role_name || null;
    if (role_id) {
      const foundRole = (MasterRole ? await MasterRole.findByPk(role_id) : null) ||
                        (tModels?.Role ? await tModels.Role.findByPk(role_id) : null);
      if (foundRole) targetRoleName = foundRole.name;
    }
    if (!targetRoleName) {
      targetRoleName = 'BRANCH_MANAGER';
    }

    if (MasterRole) {
      const masterRole = await MasterRole.findOne({ where: { name: targetRoleName } });
      if (masterRole) {
        await masterUser.setRoles([masterRole]).catch(() => {});
      }
    }

    // 3. Create Full Operational Staff Profile in Tenant DB (TenantStaff)
    let createdStaff = null;
    if (tModels?.User) {
      try {
        createdStaff = await tModels.User.create({
          id: masterUser.id,
          tenant_id: tenantId,
          organization_id: organizationId,
          branch_id: branch_id || null,
          first_name: masterUser.first_name,
          last_name: masterUser.last_name,
          email: masterUser.email,
          phone: masterUser.phone,
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
          status: masterUser.status,
        });

        // Assign Tenant Role in Tenant DB
        if (tModels.Role) {
          const tenantRole = await tModels.Role.findOne({ where: { name: targetRoleName } });
          if (tenantRole && createdStaff.setRoles) {
            await createdStaff.setRoles([tenantRole]);
          }
        }
      } catch (tStaffErr) {
        console.warn('⚠️ Tenant DB staff profile creation notice:', tStaffErr.message);
      }
    }

    // 4. Return formatted staff object
    const responsePayload = createdStaff ? createdStaff.toJSON() : masterUser.toJSON();
    responsePayload.staff_code = finalStaffCode;
    responsePayload.designation = designation || null;
    responsePayload.roles = [{ name: targetRoleName, display_name: targetRoleName.replace('_', ' ') }];

    return successResponse(res, 'Staff member registered successfully', responsePayload, 201);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Update staff details.
 * Master DB: updates name, phone, password, status.
 * Tenant DB: updates full operational profile (salary, designation, KYC, branch, role).
 */
const updateUser = async (req, res) => {
  try {
    const { User: MasterUser, Role: MasterRole } = defaultModels;
    const { id } = req.params;
    const tenantId = req.tenant?.tenantId;
    const organizationId = req.tenant?.organizationId;
    const tModels = getTenantModels(req);

    const masterUser = await MasterUser.findOne({
      where: {
        id,
        tenant_id: tenantId,
        organization_id: organizationId,
      },
    });

    if (!masterUser) {
      return errorResponse(res, 'User not found in your organization', null, 404);
    }

    const {
      first_name,
      last_name,
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

    // 1. Update Master DB credentials & basics
    if (phone !== undefined && phone) {
      const digitsOnly = String(phone).replace(/[^0-9]/g, '');
      if (digitsOnly.length > 0 && (digitsOnly.length < 7 || digitsOnly.length > 15)) {
        return errorResponse(res, 'Please provide a valid mobile/phone number (7-15 digits)', null, 400);
      }
    }

    const masterUpdates = {};
    if (first_name !== undefined) masterUpdates.first_name = first_name.trim();
    if (last_name !== undefined) masterUpdates.last_name = last_name ? last_name.trim() : null;
    if (phone !== undefined) masterUpdates.phone = phone ? phone.trim() : null;
    if (branch_id !== undefined) masterUpdates.branch_id = branch_id || null;
    if (status !== undefined) masterUpdates.status = status;
    if (password && password.trim().length >= 6) {
      masterUpdates.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    await masterUser.update(masterUpdates);

    // 2. Resolve Role Name
    let targetRoleName = role_name || null;
    if (role_id) {
      const foundRole = (MasterRole ? await MasterRole.findByPk(role_id) : null) ||
                        (tModels?.Role ? await tModels.Role.findByPk(role_id) : null);
      if (foundRole) targetRoleName = foundRole.name;
    }

    if (targetRoleName && MasterRole) {
      const masterRole = await MasterRole.findOne({ where: { name: targetRoleName } });
      if (masterRole) {
        await masterUser.setRoles([masterRole]).catch(() => {});
      }
    }

    // 3. Update Tenant DB Staff Operational Profile
    let updatedStaff = null;
    if (tModels?.User) {
      try {
        let tenantStaff = await tModels.User.findByPk(id);
        const tenantUpdates = {
          ...masterUpdates,
          ...(staff_code !== undefined && { staff_code: staff_code ? staff_code.trim().toUpperCase() : null }),
          ...(designation !== undefined && { designation: designation ? designation.trim() : null }),
          ...(joining_date !== undefined && { joining_date: joining_date || null }),
          ...(aadhaar_number !== undefined && { aadhaar_number: aadhaar_number ? aadhaar_number.trim() : null }),
          ...(pan_number !== undefined && { pan_number: pan_number ? pan_number.trim().toUpperCase() : null }),
          ...(address !== undefined && { address: address ? address.trim() : null }),
          ...(emergency_contact !== undefined && { emergency_contact: emergency_contact ? emergency_contact.trim() : null }),
          ...(salary_amount !== undefined && { salary_amount: parseFloat(salary_amount || 0) }),
          ...(salary_type !== undefined && { salary_type: salary_type || 'MONTHLY' }),
          ...(document_url !== undefined && { document_url: document_url || null }),
        };

        if (tenantStaff) {
          await tenantStaff.update(tenantUpdates);
        } else {
          // Auto-provision in tenant DB if missing
          tenantStaff = await tModels.User.create({
            id: masterUser.id,
            tenant_id: tenantId,
            organization_id: organizationId,
            branch_id: branch_id || masterUser.branch_id,
            first_name: masterUser.first_name,
            last_name: masterUser.last_name,
            email: masterUser.email,
            phone: masterUser.phone,
            ...tenantUpdates,
          });
        }

        if (targetRoleName && tModels.Role) {
          const tenantRole = await tModels.Role.findOne({ where: { name: targetRoleName } });
          if (tenantRole && tenantStaff.setRoles) {
            await tenantStaff.setRoles([tenantRole]);
          }
        }

        updatedStaff = tenantStaff;
      } catch (tErr) {
        console.warn('⚠️ Tenant DB staff update notice:', tErr.message);
      }
    }

    const result = updatedStaff ? updatedStaff.toJSON() : masterUser.toJSON();
    if (targetRoleName) {
      result.roles = [{ name: targetRoleName, display_name: targetRoleName.replace('_', ' ') }];
    }

    return successResponse(res, 'User updated successfully', result);
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Toggle user active/suspended status.
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { User: MasterUser } = defaultModels;
    const { id } = req.params;
    const { status } = req.body;
    const tModels = getTenantModels(req);

    if (req.user?.id === id) {
      return errorResponse(res, 'You cannot change the status of your own account', null, 400);
    }

    const masterUser = await MasterUser.findOne({
      where: {
        id,
        tenant_id: req.tenant?.tenantId,
        organization_id: req.tenant?.organizationId,
      },
    });

    if (!masterUser) {
      return errorResponse(res, 'User not found', null, 404);
    }

    const newStatus = status || (masterUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    await masterUser.update({ status: newStatus });

    if (tModels?.User) {
      try {
        await tModels.User.update({ status: newStatus }, { where: { id } });
      } catch (e) {}
    }

    return successResponse(res, `User status updated to ${newStatus}`, { id, status: newStatus });
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
};

/**
 * Delete a user account from both Master and Tenant DBs.
 */
const deleteUser = async (req, res) => {
  try {
    const { User: MasterUser, UserRole } = defaultModels;
    const { id } = req.params;
    const tModels = getTenantModels(req);

    if (req.user?.id === id) {
      return errorResponse(res, 'You cannot delete your own account', null, 400);
    }

    const masterUser = await MasterUser.findOne({
      where: {
        id,
        tenant_id: req.tenant?.tenantId,
        organization_id: req.tenant?.organizationId,
      },
    });

    if (!masterUser) {
      return errorResponse(res, 'User not found', null, 404);
    }

    if (UserRole) {
      await UserRole.destroy({ where: { user_id: id } }).catch(() => {});
    }

    await masterUser.destroy();

    if (tModels?.User) {
      try {
        if (tModels.UserRole) {
          await tModels.UserRole.destroy({ where: { user_id: id } }).catch(() => {});
        }
        await tModels.User.destroy({ where: { id } }).catch(() => {});
      } catch (e) {}
    }

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
