import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getOverview,
  getIncidents,
  getSeverity,
  getResponseTime,
  getResources,
  getDelays,
  getAreas,
  getHeatmap,
  getResourceShortages,
} from '../controllers/analytics.controller.js';

const router = Router();

// Protect all analytics endpoints
router.use(authenticate);
router.use(authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'));

router.get('/overview', getOverview);
router.get('/incidents', getIncidents);
router.get('/severity', getSeverity);
router.get('/response-time', getResponseTime);
router.get('/resources', getResources);
router.get('/delays', getDelays);
router.get('/areas', getAreas);
router.get('/heatmap', getHeatmap);
router.get('/resource-shortages', getResourceShortages);

export default router;
