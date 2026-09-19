import { Router } from 'express';
import {
  getAllTeams,
  getTeam,
  createNewTeam,
  updateExistingTeam,
  updateStatus,
  updateLocation,
  assignIncident,
  releaseIncident,
  assignResource,
  releaseResource,
  getNearby,
  removeTeam,
} from '../controllers/team.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createTeamSchema,
  updateTeamSchema,
  updateTeamStatusSchema,
  updateTeamLocationSchema,
  assignTeamSchema,
  releaseTeamSchema,
  teamResourceSchema,
  nearbyTeamsSchema,
} from '../validators/team.validator.js';

const router = Router();

// 1. Collection & Proximity routes
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getAllTeams
);

router.get(
  '/nearby',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  validate(nearbyTeamsSchema),
  getNearby
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createTeamSchema),
  createNewTeam
);

// 2. Team State, GPS Location & Dispatch routes
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(updateTeamStatusSchema),
  updateStatus
);

router.patch(
  '/:id/location',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(updateTeamLocationSchema),
  updateLocation
);

router.post(
  '/:id/assign',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(assignTeamSchema),
  assignIncident
);

router.post(
  '/:id/release',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(releaseTeamSchema),
  releaseIncident
);

// 3. Team-Resource Assignment routes
router.post(
  '/:id/resources/assign',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(teamResourceSchema),
  assignResource
);

router.post(
  '/:id/resources/release',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(teamResourceSchema),
  releaseResource
);

// 4. Single Team CRUD routes
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getTeam
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateTeamSchema),
  updateExistingTeam
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateTeamSchema),
  updateExistingTeam
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  removeTeam
);

export default router;
