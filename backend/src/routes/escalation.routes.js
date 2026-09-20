import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getAllEscalations,
  getActiveEscalations,
  getIncidentEscalations,
  acknowledgeEscalation,
  resolveEscalation,
} from '../controllers/escalation.controller.js';

const router = Router();

// All escalation routes require authentication
router.use(authenticate);

router.get('/', getAllEscalations);
router.get('/active', getActiveEscalations);
router.get('/incident/:id', getIncidentEscalations);
router.post('/:id/acknowledge', acknowledgeEscalation);
router.post('/:id/resolve', resolveEscalation);

export default router;
