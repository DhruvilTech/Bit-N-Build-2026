import { Router } from 'express';
import { getHealth, getDetailedHealth, getSystemStatus } from '../controllers/health.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Public / Minimal Health Check (Phase 31)
router.get('/', getHealth);

// Privileged Detailed System Health Check (Phase 31)
router.get(
  '/detailed',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  getDetailedHealth
);

// Backward Compatibility System Status
router.get(
  '/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  getSystemStatus
);

export default router;
