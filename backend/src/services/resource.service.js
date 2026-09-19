import mongoose from 'mongoose';
import { ResourceModel } from '../models/resource.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';

export const getResources = async (filters = {}, pagination = {}) => {
  const query = {};

  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.availableOnly === 'true' || filters.availableOnly === true) {
    query.status = 'AVAILABLE';
    query.currentAssignment = null;
  }
  if (filters.capability) {
    query.capabilities = { $in: [new RegExp(filters.capability, 'i')] };
  }

  if (filters.search) {
    query.$or = [
      { resourceId: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
      { capabilities: { $regex: filters.search, $options: 'i' } },
      { 'location.address': { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const [resources, total] = await Promise.all([
    ResourceModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ResourceModel.countDocuments(query),
  ]);

  return {
    resources,
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
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

export const createResource = async (data, user = null) => {
  const prefix = data.type ? data.type.substring(0, 3).toUpperCase() : 'RES';
  const resourceId = data.resourceId || `RES-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existing = await ResourceModel.findOne({ resourceId });
  if (existing) {
    throw new ConflictError(`Resource with ID ${resourceId} already exists`);
  }

  const resource = await ResourceModel.create({
    ...data,
    resourceId,
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
    action: 'RESOURCE_CREATED',
    entityType: 'RESOURCE',
    entityId: resource.resourceId,
    metadata: { name: resource.name, type: resource.type, capacity: resource.capacity },
  });

  return resource;
};

export const updateResource = async (id, data, user = null) => {
  const resource = await getResourceById(id);

  if (data.name) resource.name = data.name;
  if (data.type) resource.type = data.type;
  if (data.capacity !== undefined) resource.capacity = data.capacity;
  if (data.capabilities) resource.capabilities = data.capabilities;
  if (data.metadata) resource.metadata = { ...resource.metadata, ...data.metadata };

  if (data.location) {
    resource.location = {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address || resource.location.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
    };
  }

  await resource.save();

  await recordAuditLog({
    user,
    action: 'RESOURCE_UPDATED',
    entityType: 'RESOURCE',
    entityId: resource.resourceId,
    metadata: { name: resource.name, type: resource.type },
  });

  return resource;
};

export const updateResourceStatus = async (id, status, notes = '', user = null) => {
  const resource = await getResourceById(id);

  if (status === 'ASSIGNED' && !resource.currentAssignment) {
    throw new BadRequestError(
      'Cannot directly set status to ASSIGNED without an active assignment. Use the assign endpoint.'
    );
  }

  const prevStatus = resource.status;
  resource.status = status;

  if (status === 'AVAILABLE') {
    resource.currentAssignment = null;
    resource.availability = true;
  } else {
    resource.availability = false;
  }

  resource.assignmentHistory.push({
    action: 'STATUS_CHANGE',
    notes: notes || `Status changed from ${prevStatus} to ${status}`,
    assignedAt: new Date(),
  });

  await resource.save();

  await recordAuditLog({
    user,
    action: 'RESOURCE_STATUS_CHANGED',
    entityType: 'RESOURCE',
    entityId: resource.resourceId,
    metadata: { previousStatus: prevStatus, newStatus: status, notes },
  });

  return resource;
};

export const assignResource = async (id, { incidentId, teamId, notes = '' }, user = null) => {
  const resource = await getResourceById(id);

  // Strict Conflict Prevention
  if (resource.status !== 'AVAILABLE' || resource.currentAssignment) {
    throw new ConflictError(
      `Resource #${resource.resourceId} is currently ${resource.status} and cannot be assigned.`
    );
  }

  const targetAssignment = incidentId || teamId;
  resource.status = 'ASSIGNED';
  resource.currentAssignment = targetAssignment;
  resource.availability = false;

  resource.assignmentHistory.push({
    incidentId: incidentId || null,
    teamId: teamId || null,
    assignedAt: new Date(),
    action: 'ASSIGN',
    notes: notes || `Assigned to ${targetAssignment}`,
  });

  await resource.save();

  // Cross-module synchronization: track on Incident
  if (incidentId) {
    await IncidentModel.updateOne(
      { $or: [{ incidentId }, ...(mongoose.Types.ObjectId.isValid(incidentId) ? [{ _id: incidentId }] : [])] },
      { $addToSet: { assignedResources: resource.resourceId } }
    );
  }

  await recordAuditLog({
    user,
    action: 'RESOURCE_ASSIGNED',
    entityType: 'RESOURCE',
    entityId: resource.resourceId,
    metadata: { targetAssignment, incidentId, teamId, notes },
  });

  return resource;
};

export const releaseResource = async (id, { notes = '' } = {}, user = null) => {
  const resource = await getResourceById(id);

  if (!resource.currentAssignment && resource.status === 'AVAILABLE') {
    throw new BadRequestError(`Resource #${resource.resourceId} is not currently assigned.`);
  }

  const prevAssignment = resource.currentAssignment;
  resource.status = 'AVAILABLE';
  resource.currentAssignment = null;
  resource.availability = true;

  // Mark latest unreleased assignment in history
  const activeRecord = resource.assignmentHistory
    .slice()
    .reverse()
    .find((h) => h.action === 'ASSIGN' && !h.releasedAt);

  if (activeRecord) {
    activeRecord.releasedAt = new Date();
  }

  resource.assignmentHistory.push({
    incidentId: prevAssignment,
    assignedAt: new Date(),
    releasedAt: new Date(),
    action: 'RELEASE',
    notes: notes || `Released from ${prevAssignment}`,
  });

  await resource.save();

  // Cross-module synchronization: remove from Incident
  if (prevAssignment) {
    await IncidentModel.updateOne(
      { incidentId: prevAssignment },
      { $pull: { assignedResources: resource.resourceId } }
    );
  }

  await recordAuditLog({
    user,
    action: 'RESOURCE_RELEASED',
    entityType: 'RESOURCE',
    entityId: resource.resourceId,
    metadata: { releasedFrom: prevAssignment, notes },
  });

  return resource;
};

export const findNearbyResources = async ({
  latitude,
  longitude,
  radiusMeters = 10000,
  type,
  status,
  capability,
}) => {
  const maxDistance = Number(radiusMeters) || 10000;
  const query = {
    'location.geometry': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        },
        $maxDistance: maxDistance,
      },
    },
  };

  if (type) query.type = type;
  if (status) query.status = status;
  if (capability) {
    query.capabilities = { $in: [new RegExp(capability, 'i')] };
  }

  const resources = await ResourceModel.find(query).limit(50);
  return resources;
};

export const deleteResource = async (id, user = null) => {
  const resource = await getResourceById(id);

  if (resource.status === 'ASSIGNED' || resource.currentAssignment) {
    throw new BadRequestError(
      `Cannot delete resource #${resource.resourceId} because it is currently assigned.`
    );
  }

  await ResourceModel.deleteOne({ _id: resource._id });

  await recordAuditLog({
    user,
    action: 'RESOURCE_DELETED',
    entityType: 'RESOURCE',
    entityId: resource.resourceId,
    metadata: { name: resource.name },
  });

  return { deleted: true, resourceId: resource.resourceId };
};
