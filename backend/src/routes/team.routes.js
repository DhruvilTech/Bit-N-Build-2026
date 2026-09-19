import { Router } from 'express';
import { getAllTeams, getTeam } from '../controllers/team.controller.js';

const router = Router();

router.get('/', getAllTeams);
router.get('/:id', getTeam);

export default router;
