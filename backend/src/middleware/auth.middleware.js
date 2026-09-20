import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.model.js';
import { TokenBlacklistModel } from '../models/tokenBlacklist.model.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export const authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No authentication token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Check if token was explicitly revoked via logout
    const blacklisted = await TokenBlacklistModel.findOne({ token });
    if (blacklisted) {
      return next(new UnauthorizedError('Session has ended or token has been revoked. Please log in again.'));
    }

    // 2. Verify JWT signature & expiration
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // 3. Verify user exists and is active in database
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return next(new UnauthorizedError('User account not found'));
    }
    if (!user.isActive) {
      return next(new UnauthorizedError('User account is deactivated. Contact an administrator.'));
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
    };
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Authentication token has expired. Please log in again.'));
    }
    next(new UnauthorizedError('Invalid authentication token'));
  }
};

import { hasPermission } from '../config/permissions.config.js';

export const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Role '${req.user.role}' does not have required permissions for this action`
        )
      );
    }

    next();
  };
};

export const requirePermission = (permission) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(
        new ForbiddenError(
          `Forbidden: Role '${req.user.role}' does not have required permission '${permission}'`
        )
      );
    }

    next();
  };
};

