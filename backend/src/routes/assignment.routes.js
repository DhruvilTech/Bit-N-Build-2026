import { Router } from 'express';
import {
  getAssignmentById,
  updateAssignmentStatus,
  releaseAssignment,
  cancelAssignment,
} from '../controllers/assignment.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  updateAssignmentStatusSchema,
  releaseAssignmentSchema,
} from '../validators/assignment.validator.js';

const router = Router();

// 1. Get Single Assignment Detail
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getAssignmentById
);

// 2. Update Assignment Lifecycle Status (Phase 10)
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(updateAssignmentStatusSchema),
  updateAssignmentStatus
);

// 3. Release Resource from Assignment (Phase 9)
router.post(
  '/:id/release',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(releaseAssignmentSchema),
  releaseAssignment
);

// 4. Cancel Assignment (Phase 8/9)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  cancelAssignment
);

export default router;
