import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  updateTeamStatus,
  updateTeamLocation,
  assignTeamToIncident,
  releaseTeamFromIncident,
  assignResourceToTeam,
  releaseResourceFromTeam,
  findNearbyTeams,
  deleteTeam,
} from '../services/team.service.js';
import { successResponse } from '../utils/response.js';

export const getAllTeams = async (req, res, next) => {
  try {
    const { type, status, availableOnly, search, capability, page, limit } = req.query;

    const result = await getTeams(
      { type, status, availableOnly, search, capability },
      { page, limit }
    );

    return successResponse(
      res,
      'Response teams retrieved successfully',
      {
        teams: result.teams,
        total: result.total,
        pagination: result.pagination,
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getTeam = async (req, res, next) => {
  try {
    const team = await getTeamById(req.params.id);
    return successResponse(res, `Response Team #${team.teamId} details`, { team }, 200);
  } catch (error) {
    next(error);
  }
};

export const createNewTeam = async (req, res, next) => {
  try {
    const team = await createTeam(req.body, req.user);
    return successResponse(res, 'Response team created successfully', { team }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateExistingTeam = async (req, res, next) => {
  try {
    const team = await updateTeam(req.params.id, req.body, req.user);
    return successResponse(res, 'Response team updated successfully', { team }, 200);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const team = await updateTeamStatus(req.params.id, status, notes, req.user);
    return successResponse(res, `Team status updated to ${status}`, { team }, 200);
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, address } = req.body;
    const team = await updateTeamLocation(req.params.id, { latitude, longitude, address }, req.user);
    return successResponse(res, 'Team location updated successfully', { team }, 200);
  } catch (error) {
    next(error);
  }
};

export const assignIncident = async (req, res, next) => {
  try {
    const { incidentId, notes } = req.body;
    const team = await assignTeamToIncident(req.params.id, { incidentId, notes }, req.user);
    return successResponse(
      res,
      `Team #${team.teamId} dispatched to incident #${incidentId}`,
      { team },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const releaseIncident = async (req, res, next) => {
  try {
    const { notes } = req.body || {};
    const team = await releaseTeamFromIncident(req.params.id, { notes }, req.user);
    return successResponse(
      res,
      `Team #${team.teamId} released from incident`,
      { team },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const assignResource = async (req, res, next) => {
  try {
    const { resourceId } = req.body;
    const result = await assignResourceToTeam(req.params.id, resourceId, req.user);
    return successResponse(
      res,
      `Resource #${resourceId} assigned to team #${req.params.id}`,
      result,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const releaseResource = async (req, res, next) => {
  try {
    const { resourceId } = req.body;
    const result = await releaseResourceFromTeam(req.params.id, resourceId, req.user);
    return successResponse(
      res,
      `Resource #${resourceId} released from team #${req.params.id}`,
      result,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getNearby = async (req, res, next) => {
  try {
    const { latitude, longitude, radiusMeters, type, status, capability } = req.query;
    const teams = await findNearbyTeams({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: radiusMeters ? Number(radiusMeters) : undefined,
      type,
      status,
      capability,
    });

    return successResponse(
      res,
      'Nearby teams retrieved successfully',
      { teams, count: teams.length },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const removeTeam = async (req, res, next) => {
  try {
    const result = await deleteTeam(req.params.id, req.user);
    return successResponse(res, 'Response team deleted successfully', result, 200);
  } catch (error) {
    next(error);
  }
};
