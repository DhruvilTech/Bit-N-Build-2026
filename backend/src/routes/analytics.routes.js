import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';
import {
  getMetrics,
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

export default router;
