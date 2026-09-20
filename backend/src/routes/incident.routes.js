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
  getReviewRequiredQueue,
  reviewIncident,
  overrideIncident,
  addIncidentReport,
  fetchRelatedIncidents,
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
import {
  reviewIncidentSchema,
  overrideIncidentSchema,
  addReportSchema,
} from '../validators/aiPipeline.validator.js';

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

// 2.1 AI Human Review Required Queue (MUST BE BEFORE /:id)
router.get(
  '/review-required',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  getReviewRequiredQueue
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

// 9.1 Add Supporting Report / Evidence to Incident (Multi-Source Fusion)
router.post(
  '/:id/reports',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'),
  validate(addReportSchema),
  addIncidentReport
);

// 9.2 Fetch Related & Duplicate Incidents
router.get(
  '/:id/related',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  fetchRelatedIncidents
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

// 11.1 AI Human Review Decision (Confirm / Reject)
router.post(
  '/:id/review',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  validate(reviewIncidentSchema),
  reviewIncident
);

// 11.2 AI Operational Field Override (Preserves Original Evidence)
router.post(
  '/:id/override',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'),
  validate(overrideIncidentSchema),
  overrideIncident
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

