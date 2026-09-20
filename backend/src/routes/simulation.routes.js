import { Router } from 'express';
import {
  getSimulationStatus,
  toggleSimulationMode,
  startAssignmentSimulation,
  startReturnJourneySimulation,
  stopResourceSimulation,
  autoDispatchSimulation,
  startSimulation,
  advanceSimulation,
  stopSimulation,
  getSimulation,
} from '../controllers/simulation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';

const router = Router();

// Phase 26 & 27: Master Emergency Simulation Engine Endpoints
router.post(
  '/start',
  authenticate,
  requirePermission(PERMISSIONS.SIMULATION_START),
  startSimulation
);

router.post(
  '/:id/advance',
  authenticate,
  requirePermission(PERMISSIONS.SIMULATION_ADVANCE),
  advanceSimulation
);

router.post(
  '/:id/stop',
  authenticate,
  requirePermission(PERMISSIONS.SIMULATION_STOP),
  stopSimulation
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.SIMULATION_READ),
  getSimulation
);

// Retain existing GPS Route & Apparatus Simulation Endpoints
router.get('/status', getSimulationStatus);
router.post('/toggle', authenticate, requirePermission(PERMISSIONS.SIMULATION_START), toggleSimulationMode);
router.post('/start/:assignmentId', authenticate, requirePermission(PERMISSIONS.SIMULATION_START), startAssignmentSimulation);
router.post('/return/:resourceId', authenticate, requirePermission(PERMISSIONS.SIMULATION_START), startReturnJourneySimulation);
router.post('/stop/:resourceId', authenticate, requirePermission(PERMISSIONS.SIMULATION_STOP), stopResourceSimulation);
router.post('/auto-dispatch/:incidentId', authenticate, requirePermission(PERMISSIONS.SIMULATION_START), autoDispatchSimulation);

export default router;
