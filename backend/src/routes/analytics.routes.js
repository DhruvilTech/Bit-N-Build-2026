import { Router } from 'express';
<<<<<<< HEAD
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';
import {
  getMetrics,
=======
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
>>>>>>> c94fd4e47b765461bb407b7bce72f7b8d8d3bca8
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

<<<<<<< HEAD
// Protect all analytics endpoints with authentication
router.use(authenticate);

// Phase 26/28 Operational KPI aggregation
router.get('/metrics', requirePermission(PERMISSIONS.ANALYTICS_READ), getMetrics);

// Phase 22-25 Detailed Analytics Subroutes
router.get('/overview', requirePermission(PERMISSIONS.ANALYTICS_READ), getOverview);
router.get('/incidents', requirePermission(PERMISSIONS.ANALYTICS_READ), getIncidents);
router.get('/severity', requirePermission(PERMISSIONS.ANALYTICS_READ), getSeverity);
router.get('/response-time', requirePermission(PERMISSIONS.ANALYTICS_READ), getResponseTime);
router.get('/resources', requirePermission(PERMISSIONS.ANALYTICS_READ), getResources);
router.get('/delays', requirePermission(PERMISSIONS.ANALYTICS_READ), getDelays);
router.get('/areas', requirePermission(PERMISSIONS.ANALYTICS_READ), getAreas);
router.get('/heatmap', requirePermission(PERMISSIONS.ANALYTICS_READ), getHeatmap);
router.get('/resource-shortages', requirePermission(PERMISSIONS.ANALYTICS_READ), getResourceShortages);
=======
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
>>>>>>> c94fd4e47b765461bb407b7bce72f7b8d8d3bca8

export default router;
