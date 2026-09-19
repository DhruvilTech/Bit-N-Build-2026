import { getTeams, getTeamById } from '../services/team.service.js';
import { successResponse } from '../utils/response.js';

export const getAllTeams = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const teams = await getTeams({ type, status });
    return successResponse(res, 'Response teams retrieved successfully', { teams, total: teams.length }, 200);
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
