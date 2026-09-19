import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model.js';
import { TokenBlacklistModel } from '../models/tokenBlacklist.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const registerUser = async (data, creatorUser = null) => {
  const existing = await UserModel.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new BadRequestError('A user with this email already exists');
  }

  const user = await UserModel.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password,
    role: data.role || 'OPERATOR',
    department: data.department || 'General Emergency Services',
    badgeNumber: data.badgeNumber || null,
    phone: data.phone || null,
  });

  const token = generateToken(user);

  await recordAuditLog({
    user: creatorUser || { id: user._id, name: user.name, role: user.role },
    action: 'USER_REGISTERED',
    entityType: 'USER',
    entityId: user._id.toString(),
    metadata: { email: user.email, role: user.role, department: user.department },
  });

  return {
    user: user.toJSON(),
    token,
  };
};

export const loginUser = async (email, password) => {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account has been deactivated. Please contact an administrator.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user);

  await recordAuditLog({
    user: { id: user._id, name: user.name, role: user.role },
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user._id.toString(),
    metadata: { email: user.email, role: user.role },
  });

  return {
    user: user.toJSON(),
    token,
  };
};

export const logoutUser = async (token, user) => {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await TokenBlacklistModel.create({
      token,
      expiresAt,
      userId: user?.id || null,
    });

    if (user) {
      await recordAuditLog({
        user,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: user.id,
        metadata: { email: user.email },
      });
    }

    return { loggedOut: true };
  } catch (error) {
    console.error('[AuthService] Logout revocation error:', error.message);
    return { loggedOut: true };
  }
};

export const getUsers = async (filters = {}, pagination = {}) => {
  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.department) query.department = filters.department;
  if (filters.isActive !== undefined) query.isActive = filters.isActive === 'true' || filters.isActive === true;

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { department: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    UserModel.countDocuments(query),
  ]);

  return {
    users,
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

export const updateUserRole = async (userId, role, adminUser) => {
  const validRoles = ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'];
  if (!validRoles.includes(role)) {
    throw new BadRequestError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`);
  }

  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError(`User #${userId} not found`);

  const prevRole = user.role;
  user.role = role;
  await user.save();

  await recordAuditLog({
    user: adminUser,
    action: 'USER_ROLE_CHANGED',
    entityType: 'USER',
    entityId: user._id.toString(),
    metadata: { previousRole: prevRole, newRole: role, userEmail: user.email },
  });

  return user;
};

export const toggleUserStatus = async (userId, isActive, adminUser) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError(`User #${userId} not found`);

  user.isActive = isActive;
  await user.save();

  await recordAuditLog({
    user: adminUser,
    action: 'USER_STATUS_TOGGLED',
    entityType: 'USER',
    entityId: user._id.toString(),
    metadata: { isActive, userEmail: user.email },
  });

  return user;
};
