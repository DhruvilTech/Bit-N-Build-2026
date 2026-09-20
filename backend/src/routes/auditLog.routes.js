import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditLog.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.AUDIT_READ),
  listAuditLogs
);

export default router;
