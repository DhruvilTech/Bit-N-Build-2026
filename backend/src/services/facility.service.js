import mongoose from 'mongoose';
import { FacilityModel } from '../models/facility.model.js';
import { NotFoundError } from '../utils/errors.js';

export const getFacilities = async (filters = {}) => {
  const query = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;

  return FacilityModel.find(query).sort({ name: 1 });
};

export const getFacilityById = async (id) => {
  let facility = await FacilityModel.findOne({ facilityId: id });
  if (!facility && mongoose.Types.ObjectId.isValid(id)) {
    facility = await FacilityModel.findById(id);
  }

  if (!facility) {
    throw new NotFoundError(`Facility #${id} not found`);
  }

  return facility;
};
