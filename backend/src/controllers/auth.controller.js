import { registerUser, loginUser } from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../utils/errors.js';

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
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
