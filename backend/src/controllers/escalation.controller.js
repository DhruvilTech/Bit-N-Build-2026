import EscalationService from '../services/escalation.service.js';
import { successResponse } from '../utils/response.js';

export const getAllEscalations = async (req, res, next) => {
  try {
    const { status, level, targetRole, incidentId, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (level) query.level = Number(level);
    if (targetRole) query.targetRole = targetRole;
    if (incidentId) query.incidentId = incidentId;

    const result = await EscalationService.getAllEscalations(query, { page, limit });
    return successResponse(res, 'Escalations retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const getActiveEscalations = async (req, res, next) => {
  try {
    const { targetRole } = req.query;
    const filters = {};
    if (targetRole) filters.targetRole = targetRole;

    const escalations = await EscalationService.getActiveEscalations(filters);
    return successResponse(res, 'Active escalations retrieved successfully', { escalations }, 200);
  } catch (error) {
    next(error);
  }
};

export const getIncidentEscalations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const escalations = await EscalationService.getIncidentEscalations(id);
    return successResponse(res, `Escalations for incident ${id} retrieved`, { escalations }, 200);
  } catch (error) {
    next(error);
  }
};

export const acknowledgeEscalation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const escalation = await EscalationService.acknowledgeEscalation(id, req.user);
    return successResponse(res, 'Escalation acknowledged successfully', { escalation }, 200);
  } catch (error) {
    next(error);
  }
};

export const resolveEscalation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const escalation = await EscalationService.resolveEscalation(id, req.user, resolutionNotes);
    return successResponse(res, 'Escalation resolved successfully', { escalation }, 200);
  } catch (error) {
    next(error);
  }
};
