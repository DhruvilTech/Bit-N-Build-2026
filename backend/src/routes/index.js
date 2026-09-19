import { Router } from 'express';
import healthRoutes from './health.routes.js';
import systemRoutes from './system.routes.js';
import authRoutes from './auth.routes.js';
import incidentRoutes from './incident.routes.js';
import resourceRoutes from './resource.routes.js';
import teamRoutes from './team.routes.js';
import facilityRoutes from './facility.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/system', systemRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/incidents', incidentRoutes);
apiRouter.use('/resources', resourceRoutes);
apiRouter.use('/teams', teamRoutes);
apiRouter.use('/facilities', facilityRoutes);

export default apiRouter;
