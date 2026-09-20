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
  triggerAiAnalysis,
  fetchIncidentAiAnalysis,
  classifyIncidentDraft,
  detectDuplicatesForIncident,
  compareIncidents,
  clusterIncidents,
  mergeIncidents,
} from '../controllers/incident.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createIncidentSchema,
  updateIncidentSchema,
  updateStatusSchema,
  updateLocationSchema,
  compareIncidentsSchema,
  clusterIncidentsSchema,
  mergeIncidentsSchema,
} from '../validators/incident.validator.js';

const router = Router();

// 0. AI Live Classification Preview / Auto-Triage for drafts
router.post(
  '/classify-preview',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  classifyIncidentDraft
);

// 0.1 AI Incident Similarity & Duplicate Comparison
router.post(
  '/compare',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(compareIncidentsSchema),
  compareIncidents
);

// 0.2 AI Incident Batch Clustering & Graph Consolidation
router.post(
  '/cluster',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(clusterIncidentsSchema),
  clusterIncidents
);


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

// 10. Trigger / Re-run AI Incident Classification (On-demand)
router.post(
  '/:id/analyze',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  triggerAiAnalysis
);

// 11. Fetch Incident AI Analysis Detail
router.get(
  '/:id/ai-analysis',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  fetchIncidentAiAnalysis
);

// 12. Trigger AI Duplicate Scan on Incident (On-demand)
router.post(
  '/:id/detect-duplicates',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  detectDuplicatesForIncident
);

// 13. Consolidate / Merge Duplicate Incidents into Canonical Incident
router.post(
  '/:id/merge',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(mergeIncidentsSchema),
  mergeIncidents
);

export default router;
