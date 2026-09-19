import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  listUsers,
  changeRole,
  changeStatus,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// Public Authentication Endpoints (Rate-limited & Validated)
router.post('/register', rateLimit({ maxRequests: 20 }), validate(registerSchema), register);
router.post('/login', rateLimit({ maxRequests: 30 }), validate(loginSchema), login);

// Protected Session Endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// Admin-Only User Management Endpoints
router.get('/users', authenticate, authorize('ADMIN'), listUsers);
router.patch('/users/:id/role', authenticate, authorize('ADMIN'), changeRole);
router.patch('/users/:id/status', authenticate, authorize('ADMIN'), changeStatus);

export default router;
