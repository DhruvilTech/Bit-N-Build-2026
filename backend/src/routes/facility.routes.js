import { Router } from 'express';
import { getAllFacilities, getFacility } from '../controllers/facility.controller.js';

const router = Router();

router.get('/', getAllFacilities);
router.get('/:id', getFacility);

export default router;
