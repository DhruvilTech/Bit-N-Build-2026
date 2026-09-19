import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const registerUser = async (data) => {
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
  });

  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
};

export const loginUser = async (email, password) => {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
};
