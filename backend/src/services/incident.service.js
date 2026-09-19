import mongoose from 'mongoose';
import { IncidentModel } from '../models/incident.model.js';
import { NotFoundError } from '../utils/errors.js';

export const getIncidents = async (filters = {}, pagination = {}) => {
  const query = {};

  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;
  if (filters.priority) query.priority = filters.priority;
  if (filters.status) query.status = filters.status;
  if (filters.source) query.source = filters.source;

  if (filters.search) {
    query.$or = [
      { incidentId: { $regex: filters.search, $options: 'i' } },
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { 'location.address': { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const [incidents, total] = await Promise.all([
    IncidentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    IncidentModel.countDocuments(query),
  ]);

  return {
    incidents,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getIncidentById = async (id) => {
  let incident = null;

  // Check by incidentId (e.g. 'ER-2048') first
  incident = await IncidentModel.findOne({ incidentId: id });

  // If not found and valid ObjectId, check by _id
  if (!incident && mongoose.Types.ObjectId.isValid(id)) {
    incident = await IncidentModel.findById(id);
  }

  if (!incident) {
    throw new NotFoundError(`Incident #${id} not found`);
  }

  return incident;
};

export const createIncident = async (data) => {
  const incidentId = data.incidentId || `ER-${Math.floor(2050 + Math.random() * 900)}`;

  const incident = await IncidentModel.create({
    ...data,
    incidentId,
    location: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
    },
  });

  return incident;
};
