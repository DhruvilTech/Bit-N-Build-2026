import { Router } from 'express';
import { getMetrics } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';

const router = Router();

router.get(
  '/metrics',
  authenticate,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  getMetrics
);

export default router;
