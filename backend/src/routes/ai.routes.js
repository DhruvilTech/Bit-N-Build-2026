import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getIncidentEmergencySummary,
  processCommandChat,
} from '../controllers/ai.controller.js';

const router = Router();

// AI operational services require authentication
router.use(authenticate);

router.post('/incident-summary', getIncidentEmergencySummary);
router.post('/chat', processCommandChat);

export default router;
