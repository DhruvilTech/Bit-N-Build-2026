import { Router } from 'express';
import { getAllResources, getResource } from '../controllers/resource.controller.js';

const router = Router();

router.get('/', getAllResources);
router.get('/:id', getResource);

export default router;
