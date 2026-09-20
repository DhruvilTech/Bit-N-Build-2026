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
  detectIncidentDuplicates,
  compareIncidentsService,
  clusterActiveIncidentsService,
  mergeDuplicateIncidentsService,
  getReviewRequiredIncidents,
  reviewIncidentService,
  overrideIncidentService,
  addReportToIncidentService,
  getRelatedIncidentsService,
} from '../services/incident.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

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
    const timeline = await getIncidentTimeline(req.params.id, req.query);
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
    return res.status(200).json({
      success: true,
      status: 'ANALYZED',
      message: `AI analysis completed for incident #${incident.incidentId}`,
      data: { incident, aiAnalysis: incident.aiAnalysis },
    });
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

export const detectDuplicatesForIncident = async (req, res, next) => {
  try {
    const result = await detectIncidentDuplicates(req.params.id, req.user);
    return successResponse(
      res,
      `Duplicate scan completed for incident #${req.params.id}`,
      result,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const compareIncidents = async (req, res, next) => {
  try {
    const { incidentA, incidentB } = req.body;
    const result = await compareIncidentsService(incidentA, incidentB);
    return successResponse(res, 'Incident similarity comparison completed', result, 200);
  } catch (error) {
    next(error);
  }
};

export const clusterIncidents = async (req, res, next) => {
  try {
    const options = req.body || {};
    const result = await clusterActiveIncidentsService(options);
    return successResponse(res, 'Incident clustering completed', result, 200);
  } catch (error) {
    next(error);
  }
};

export const mergeIncidents = async (req, res, next) => {
  try {
    const { duplicateIncidentIds, reason } = req.body;
    const result = await mergeDuplicateIncidentsService(
      req.params.id,
      duplicateIncidentIds,
      reason,
      req.user
    );
    return successResponse(
      res,
      `Successfully consolidated ${result.mergedCount} duplicate incident(s) into #${req.params.id}`,
      result,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getReviewRequiredQueue = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await getReviewRequiredIncidents({ page, limit });
    return successResponse(res, 'Review-required incidents retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const reviewIncident = async (req, res, next) => {
  try {
    const result = await reviewIncidentService(req.params.id, req.body, req.user);
    return successResponse(res, result.message, result, 200);
  } catch (error) {
    next(error);
  }
};

export const overrideIncident = async (req, res, next) => {
  try {
    const result = await overrideIncidentService(req.params.id, req.body, req.user);
    return successResponse(res, result.message, result, 200);
  } catch (error) {
    next(error);
  }
};

export const addIncidentReport = async (req, res, next) => {
  try {
    const result = await addReportToIncidentService(req.params.id, req.body, req.user);
    return successResponse(
      res,
      `Report attached to incident #${req.params.id} successfully`,
      result,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const fetchRelatedIncidents = async (req, res, next) => {
  try {
    const result = await getRelatedIncidentsService(req.params.id);
    return successResponse(
      res,
      `Related reports and incidents for #${req.params.id}`,
      result,
      200
    );
  } catch (error) {
    next(error);
  }
};




