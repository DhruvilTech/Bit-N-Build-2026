import { Router } from 'express';
import healthRoutes from './health.routes.js';
import systemRoutes from './system.routes.js';
import authRoutes from './auth.routes.js';
import incidentRoutes from './incident.routes.js';
import resourceRoutes from './resource.routes.js';
import teamRoutes from './team.routes.js';
import facilityRoutes from './facility.routes.js';
import auditLogRoutes from './auditLog.routes.js';
import escalationRoutes from './escalation.routes.js';
import notificationRoutes from './notification.routes.js';
import aiRoutes from './ai.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/system', systemRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/incidents', incidentRoutes);
apiRouter.use('/resources', resourceRoutes);
apiRouter.use('/teams', teamRoutes);
apiRouter.use('/facilities', facilityRoutes);
apiRouter.use('/audit-logs', auditLogRoutes);
apiRouter.use('/escalations', escalationRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/ai', aiRoutes);

export default apiRouter;
