import { requirePermission, authorize, authenticate } from './auth.middleware.js';
import { hasPermission, PERMISSIONS, ROLE_PERMISSIONS } from '../config/permissions.config.js';

export {
  requirePermission,
  authorize,
  authenticate,
  hasPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
};

export default {
  requirePermission,
  authorize,
  authenticate,
  hasPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
};
