import { Router } from 'express';
import {
  getSimulationStatus,
  toggleSimulationMode,
  startAssignmentSimulation,
  startReturnJourneySimulation,
  stopResourceSimulation,
  autoDispatchSimulation,
} from '../controllers/simulation.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/status', getSimulationStatus);
router.post('/toggle', authenticate, authorize('ADMIN', 'OPERATOR'), toggleSimulationMode);
router.post('/start/:assignmentId', authenticate, authorize('ADMIN', 'OPERATOR'), startAssignmentSimulation);
router.post('/return/:resourceId', authenticate, authorize('ADMIN', 'OPERATOR'), startReturnJourneySimulation);
router.post('/stop/:resourceId', authenticate, authorize('ADMIN', 'OPERATOR'), stopResourceSimulation);
router.post('/auto-dispatch/:incidentId', authenticate, authorize('ADMIN', 'OPERATOR'), autoDispatchSimulation);

export default router;
