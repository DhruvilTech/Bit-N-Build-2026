import { Router } from 'express';
import {
  getAllAlerts,
  getAlert,
  postAcknowledgeAlert,
  postResolveAlert,
} from '../controllers/alert.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  acknowledgeAlertSchema,
  resolveAlertSchema,
  queryAlertSchema,
} from '../validators/alert.validator.js';

const router = Router();

// 1. List Alerts (read-only allows VIEWER)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR', 'RESPONDER', 'VIEWER'),
  validate(queryAlertSchema),
  getAllAlerts
);

// 2. Get Single Alert
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR', 'RESPONDER', 'VIEWER'),
  getAlert
);

// 3. Acknowledge Alert (Mutations block VIEWER)
router.post(
  '/:id/acknowledge',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR', 'RESPONDER'),
  validate(acknowledgeAlertSchema),
  postAcknowledgeAlert
);

// 4. Resolve Alert (Mutations block VIEWER)
router.post(
  '/:id/resolve',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(resolveAlertSchema),
  postResolveAlert
);

export default router;
