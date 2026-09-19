import mongoose from 'mongoose';
import { IncidentModel } from '../models/incident.model.js';
import { recordAuditLog } from './auditLog.service.js';
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
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getIncidentById = async (id) => {
  let incident = null;

  incident = await IncidentModel.findOne({ incidentId: id });

  if (!incident && mongoose.Types.ObjectId.isValid(id)) {
    incident = await IncidentModel.findById(id);
  }

  if (!incident) {
    throw new NotFoundError(`Incident #${id} not found`);
  }

  return incident;
};

export const createIncident = async (data, user = null) => {
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

  await recordAuditLog({
    user,
    action: 'INCIDENT_CREATED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: {
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      priority: incident.priority,
    },
  });

  return incident;
};

export const updateIncidentStatus = async (id, status, user = null) => {
  const incident = await getIncidentById(id);
  const previousStatus = incident.status;
  incident.status = status;
  await incident.save();

  await recordAuditLog({
    user,
    action: status === 'RESOLVED' ? 'INCIDENT_RESOLVED' : 'INCIDENT_UPDATED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: { previousStatus, newStatus: status },
  });

  return incident;
};
