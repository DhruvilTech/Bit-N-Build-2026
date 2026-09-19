import mongoose from 'mongoose';
import { ResponseTeamModel } from '../models/team.model.js';
import { NotFoundError } from '../utils/errors.js';

export const getTeams = async (filters = {}) => {
  const query = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;

  return ResponseTeamModel.find(query).sort({ teamId: 1 });
};

export const getTeamById = async (id) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }

  if (!team) {
    throw new NotFoundError(`Response Team #${id} not found`);
  }

  return team;
};
