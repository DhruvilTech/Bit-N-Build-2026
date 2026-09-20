import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
  getIncidentEmergencySummary,
  processCommandChat,
} from '../controllers/ai.controller.js';

const router = Router();

// AI operational services require authentication and rate-limiting
router.use(authenticate);
router.use(aiRateLimiter);

router.post('/incident-summary', getIncidentEmergencySummary);
router.post('/chat', processCommandChat);

export default router;
