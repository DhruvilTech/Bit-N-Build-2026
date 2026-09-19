import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  updateIncidentStatus,
  updateIncidentLocation,
  getIncidentTimeline,
  getIncidentReports,
  analyzeIncident,
  getIncidentAiAnalysis,
} from '../services/incident.service.js';
import { successResponse } from '../utils/response.js';

export const getAllIncidents = async (req, res, next) => {
  try {
    const {
      type,
      severity,
      priority,
      status,
      source,
      search,
      startDate,
      endDate,
      nearLat,
      nearLng,
      radius,
      page,
      limit,
    } = req.query;

    const result = await getIncidents(
      {
        type,
        severity,
        priority,
        status,
        source,
        search,
        startDate,
        endDate,
        nearLat,
        nearLng,
        radius,
      },
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

export const updateIncidentDetails = async (req, res, next) => {
  try {
    const incident = await updateIncident(req.params.id, req.body, req.user);
    return successResponse(res, `Incident #${incident.incidentId} updated successfully`, { incident }, 200);
  } catch (error) {
    next(error);
  }
};

export const removeIncident = async (req, res, next) => {
  try {
    const result = await deleteIncident(req.params.id, req.user);
    return successResponse(res, result.message, { incident: result.incident }, 200);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const incident = await updateIncidentStatus(req.params.id, status, reason, req.user);
    return successResponse(
      res,
      `Incident #${incident.incidentId} status updated to ${status}`,
      { incident },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const incident = await updateIncidentLocation(req.params.id, req.body, req.user);
    return successResponse(
      res,
      `Incident #${incident.incidentId} location updated`,
      { incident },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getTimeline = async (req, res, next) => {
  try {
    const timeline = await getIncidentTimeline(req.params.id);
    return successResponse(res, `Incident #${req.params.id} timeline`, { timeline }, 200);
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const reports = await getIncidentReports(req.params.id);
    return successResponse(res, `Incident #${req.params.id} reports`, { reports }, 200);
  } catch (error) {
    next(error);
  }
};

export const triggerAiAnalysis = async (req, res, next) => {
  try {
    const incident = await analyzeIncident(req.params.id, req.user);
    return successResponse(
      res,
      `AI analysis completed for incident #${incident.incidentId}`,
      { incident, aiAnalysis: incident.aiAnalysis },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const fetchIncidentAiAnalysis = async (req, res, next) => {
  try {
    const aiAnalysis = await getIncidentAiAnalysis(req.params.id);
    return successResponse(
      res,
      `AI analysis retrieved for incident #${req.params.id}`,
      { aiAnalysis },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const classifyIncidentDraft = async (req, res, next) => {
  try {
    const { title, description, source, metadata, location } = req.body;
    if (!description && !title) {
      return errorResponse(res, 'Title or description is required for AI classification', null, 400);
    }
    const { classifyIncidentWithAi } = await import('../services/ai.service.js');
    const result = await classifyIncidentWithAi({
      title: title || 'Emergency Incident Report',
      description: description || title,
      source: source || 'OPERATOR',
      metadata: metadata || {},
      location: location || null,
    });

    if (result.success && result.data) {
      return successResponse(res, 'AI classification preview successful', result.data, 200);
    }
    return errorResponse(res, result.error || 'AI classification failed', null, 502);
  } catch (error) {
    next(error);
  }
};


