import { Router } from 'express';
import { computeRoute } from '../controllers/route.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, computeRoute);
router.get('/', authenticate, computeRoute);

export default router;
