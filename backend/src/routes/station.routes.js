import { Router } from 'express';
import {
  getAllStations,
  getSingleStation,
  createNewStation,
  updateExistingStation,
  removeStation,
} from '../controllers/station.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getAllStations
);

router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getSingleStation
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  createNewStation
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  updateExistingStation
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  removeStation
);

export default router;
