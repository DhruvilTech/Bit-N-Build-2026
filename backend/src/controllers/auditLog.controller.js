import { getAuditLogs } from '../services/auditLog.service.js';
import { successResponse } from '../utils/response.js';

export const listAuditLogs = async (req, res, next) => {
  try {
    const { action, entityType, entityId, userId, userRole, search, simulationId, page, limit } = req.query;

    const result = await getAuditLogs(
      { action, entityType, entityId, userId, userRole, search, simulationId },
      { page, limit }
    );

    return successResponse(
      res,
      'Audit logs retrieved successfully',
      {
        logs: result.logs,
        auditLogs: result.logs,
        total: result.total,
        pagination: result.pagination,
      },
      200
    );
  } catch (error) {
    next(error);
  }
};
