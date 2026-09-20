import {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
} from '../services/alert.service.js';
import { successResponse } from '../utils/response.js';

export const getAllAlerts = async (req, res, next) => {
  try {
    const { status, type, severity, incidentId, assignmentId, search, page, limit } = req.query;
    const result = await getAlerts(
      { status, type, severity, incidentId, assignmentId, search },
      { page, limit }
    );
    return successResponse(res, 'Alerts retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const getAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await getAlertById(id);
    return successResponse(res, 'Alert retrieved successfully', { alert }, 200);
  } catch (error) {
    next(error);
  }
};

export const postAcknowledgeAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    const alert = await acknowledgeAlert(id, req.user, note);
    return successResponse(res, `Alert #${alert.alertId} acknowledged`, { alert }, 200);
  } catch (error) {
    next(error);
  }
};

export const postResolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution, note } = req.body || {};
    const alert = await resolveAlert(id, req.user, resolution, note);
    return successResponse(res, `Alert #${alert.alertId} resolved`, { alert }, 200);
  } catch (error) {
    next(error);
  }
};
