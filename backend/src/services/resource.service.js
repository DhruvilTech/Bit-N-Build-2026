import mongoose from 'mongoose';
import { ResourceModel } from '../models/resource.model.js';
import { NotFoundError } from '../utils/errors.js';

export const getResources = async (filters = {}) => {
  const query = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;

  return ResourceModel.find(query).sort({ createdAt: -1 });
};

export const getResourceById = async (id) => {
  let resource = await ResourceModel.findOne({ resourceId: id });
  if (!resource && mongoose.Types.ObjectId.isValid(id)) {
    resource = await ResourceModel.findById(id);
  }

  if (!resource) {
    throw new NotFoundError(`Resource #${id} not found`);
  }

  return resource;
};
