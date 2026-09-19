import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncidentStatus,
} from '../services/incident.service.js';
import { successResponse } from '../utils/response.js';

export const getAllIncidents = async (req, res, next) => {
  try {
    const { type, severity, priority, status, source, search, page, limit } = req.query;

    const result = await getIncidents(
      { type, severity, priority, status, source, search },
      { page, limit }
    );

    return successResponse(res, 'Incidents retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const getIncident = async (req, res, next) => {
  try {
    const incident = await getIncidentById(req.params.id);
    return successResponse(res, `Incident #${incident.incidentId} details`, { incident }, 200);
  } catch (error) {
    next(error);
  }
};

export const createNewIncident = async (req, res, next) => {
  try {
    const incident = await createIncident(req.body, req.user);
    return successResponse(res, 'Incident created successfully', { incident }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const incident = await updateIncidentStatus(req.params.id, status, req.user);
    return successResponse(res, `Incident #${incident.incidentId} status updated to ${status}`, { incident }, 200);
  } catch (error) {
    next(error);
  }
};
