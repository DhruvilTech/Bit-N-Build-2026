import { Router } from 'express';
import {
  getAllIncidents,
  getIncident,
  createNewIncident,
} from '../controllers/incident.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createIncidentSchema } from '../validators/incident.validator.js';

const router = Router();

router.get('/', getAllIncidents);
router.get('/:id', getIncident);
router.post('/', validate(createIncidentSchema), createNewIncident);

export default router;
