import { Router } from 'express';
import {
  getAllResources,
  getResource,
  createNewResource,
  updateExistingResource,
  updateStatus,
  assign,
  release,
  getNearby,
  removeResource,
  updateLocation,
} from '../controllers/resource.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createResourceSchema,
  updateResourceSchema,
  updateResourceStatusSchema,
  assignResourceSchema,
  releaseResourceSchema,
  nearbyResourcesSchema,
  updateResourceLocationSchema,
} from '../validators/resource.validator.js';

const router = Router();

// 1. Collection & Proximity routes
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getAllResources
);

router.get(
  '/nearby',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  validate(nearbyResourcesSchema),
  getNearby
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createResourceSchema),
  createNewResource
);

// 2. Resource Lifecycle & Assignment routes
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(updateResourceStatusSchema),
  updateStatus
);

router.patch(
  '/:id/location',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(updateResourceLocationSchema),
  updateLocation
);

router.post(
  '/:id/assign',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(assignResourceSchema),
  assign
);

router.post(
  '/:id/release',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(releaseResourceSchema),
  release
);

// 3. Single Resource CRUD routes
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getResource
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateResourceSchema),
  updateExistingResource
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateResourceSchema),
  updateExistingResource
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  removeResource
);

export default router;
