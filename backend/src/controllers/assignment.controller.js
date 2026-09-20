import {
  assignResourcesToIncident,
  updateAssignmentStatus as updateAssignmentStatusService,
  releaseAssignment as releaseAssignmentService,
  cancelAssignment as cancelAssignmentService,
  getAssignmentsForIncident,
  getAssignmentById as getAssignmentByIdService,
  getIncidentResponseMetrics as getIncidentResponseMetricsService,
} from '../services/assignment.service.js';
import { generateRecommendations } from '../services/recommendation.service.js';

export const createIncidentAssignments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resourceIds, notes } = req.body;
    const result = await assignResourcesToIncident(id, { resourceIds, notes }, req.user);

    res.status(201).json({
      success: true,
      message: `Successfully assigned ${result.totalAssigned} resource(s) to incident #${result.incidentId}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getIncidentAssignments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await getAssignmentsForIncident(id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getIncidentRecommendations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { strategy, maxDistanceKm, limit, refresh } = req.query;

    const recommendations = await generateRecommendations(id, {
      strategy,
      maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : undefined,
      limit: limit ? Number(limit) : undefined,
      refresh: refresh === 'true' || refresh === true,
    });

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

export const getIncidentResponseMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const metrics = await getIncidentResponseMetricsService(id);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await getAssignmentByIdService(id);

    res.status(200).json({
      success: true,
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, timestamp } = req.body;
    const updated = await updateAssignmentStatusService(
      id,
      { status, notes, timestamp },
      req.user
    );

    res.status(200).json({
      success: true,
      message: `Assignment #${id} transitioned to '${status}'`,
      data: { assignment: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const releaseAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notes = req.body?.notes;
    const released = await releaseAssignmentService(id, { notes }, req.user);

    res.status(200).json({
      success: true,
      message: `Resource #${released.resourceId} successfully released from assignment #${id}`,
      data: { assignment: released },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notes = req.body?.notes;
    const cancelled = await cancelAssignmentService(id, { notes }, req.user);

    res.status(200).json({
      success: true,
      message: `Assignment #${id} cancelled and resource #${cancelled.resourceId} returned to AVAILABLE`,
      data: { assignment: cancelled },
    });
  } catch (error) {
    next(error);
  }
};
