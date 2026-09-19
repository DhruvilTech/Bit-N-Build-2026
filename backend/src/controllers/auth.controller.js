import {
  registerUser,
  loginUser,
  logoutUser,
  getUsers,
  updateUserRole,
  toggleUserStatus,
} from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../utils/errors.js';

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body, req.user);
    return successResponse(res, 'User registered successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    return successResponse(res, 'Login successful', result, 200);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const result = await logoutUser(req.token, req.user);
    return successResponse(res, 'Logout successful. Session terminated.', result, 200);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return successResponse(res, 'Current user profile retrieved', { user }, 200);
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { role, department, isActive, search, page, limit } = req.query;
    const result = await getUsers({ role, department, isActive, search }, { page, limit });
    return successResponse(res, 'Users retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await updateUserRole(req.params.id, role, req.user);
    return successResponse(res, `User role updated to ${role}`, { user }, 200);
  } catch (error) {
    next(error);
  }
};

export const changeStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await toggleUserStatus(req.params.id, isActive, req.user);
    return successResponse(res, `User status updated to ${isActive ? 'Active' : 'Deactivated'}`, { user }, 200);
  } catch (error) {
    next(error);
  }
};
