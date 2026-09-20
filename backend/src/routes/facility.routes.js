import { Router } from 'express';
import {
  getAllFacilities,
  getFacility,
  createNewFacility,
  updateExistingFacility,
  updateCapacity,
  updateFacilityEmergencyStatus,
  getNearby,
  removeFacility,
  getCapacity,
} from '../controllers/facility.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createFacilitySchema,
  updateFacilitySchema,
  updateFacilityCapacitySchema,
  updateFacilityEmergencyStatusSchema,
  nearbyFacilitiesSchema,
} from '../validators/facility.validator.js';

const router = Router();

// 1. Collection & Proximity routes
router.get(
  '/capacity',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getCapacity
);

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getAllFacilities
);

router.get(
  '/nearby',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  validate(nearbyFacilitiesSchema),
  getNearby
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MEDICAL_COORDINATOR'),
  validate(createFacilitySchema),
  createNewFacility
);

// 2. Real-time Capacity & Emergency Status routes
router.patch(
  '/:id/capacity',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'MEDICAL_COORDINATOR'),
  validate(updateFacilityCapacitySchema),
  updateCapacity
);

router.patch(
  '/:id/emergency-status',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'MEDICAL_COORDINATOR'),
  validate(updateFacilityEmergencyStatusSchema),
  updateFacilityEmergencyStatus
);

// 3. Single Facility CRUD routes
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getFacility
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MEDICAL_COORDINATOR'),
  validate(updateFacilitySchema),
  updateExistingFacility
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MEDICAL_COORDINATOR'),
  validate(updateFacilitySchema),
  updateExistingFacility
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  removeFacility
);

export default router;
