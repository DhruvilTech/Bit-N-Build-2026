import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditLog.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'OPERATOR'), listAuditLogs);

export default router;
