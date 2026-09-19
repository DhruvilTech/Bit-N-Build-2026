import { Router } from 'express';
import {
  getAllIncidents,
  getIncident,
  createNewIncident,
  updateIncidentDetails,
  removeIncident,
  updateStatus,
  updateLocation,
  getTimeline,
  getReports,
} from '../controllers/incident.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createIncidentSchema,
  updateIncidentSchema,
  updateStatusSchema,
  updateLocationSchema,
} from '../validators/incident.validator.js';

const router = Router();

// 1. Ingestion / Collection API
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(createIncidentSchema),
  createNewIncident
);

// 2. Incident List API (with search, filtering, pagination, geospatial lookup)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getAllIncidents
);

// 3. Incident Details API
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getIncident
);

// 4. Update Incident Parameters
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(updateIncidentSchema),
  updateIncidentDetails
);

// 5. Delete / Cancel Incident (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  removeIncident
);

// 6. Safe Status Lifecycle Transition API
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  validate(updateStatusSchema),
  updateStatus
);

// 7. Dynamic Location Relocation API
router.patch(
  '/:id/location',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(updateLocationSchema),
  updateLocation
);

// 8. Incident Activity / Timeline Ledger
router.get(
  '/:id/timeline',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getTimeline
);

// 9. Multi-Source Incident Reports Feed
router.get(
  '/:id/reports',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getReports
);

export default router;
