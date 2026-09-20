import mongoose from 'mongoose';
import { ResourceModel } from '../models/resource.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { NotFoundError, BadRequestError, ConflictError, ValidationError } from '../utils/errors.js';
import { calculateDistanceKm, calculateEtaMinutes } from './recommendation.service.js';
import {
  emitResourceLocationUpdated,
  emitResourceArrived,
  emitAssignmentUpdated,
  emitResponseStatusChanged,
} from '../utils/socket.js';

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

/**
 * Updates a resource's live GPS coordinates, recalculates distance/ETA,
 * detects arrival when near destination, and broadcasts real-time socket events.
 */
export const updateResourceLocation = async (id, { latitude, longitude, status }, user = null) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new ValidationError('Valid latitude (-90 to 90) is required.');
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new ValidationError('Valid longitude (-180 to 180) is required.');
  }

  const resource = await getResourceById(id);

  // Update live coordinates
  resource.currentLocation = {
    latitude: lat,
    longitude: lng,
    address: resource.currentLocation?.address || resource.location?.address || 'Live GPS Coordinates',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  };
  resource.locationUpdatedAt = new Date();

  if (status && status !== resource.status) {
    resource.status = status;
  }

  let remainingDistanceKm = null;
  let remainingEtaMinutes = null;
  let activeAssignment = null;

  // If resource has an active assignment and destination, compute remaining distance & ETA
  if (resource.currentAssignment) {
    activeAssignment = await AssignmentModel.findOne({
      resourceId: resource.resourceId,
      incidentId: resource.currentAssignment,
      status: { $in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'RETURNING'] },
    }).sort({ createdAt: -1 });

    const destLat = resource.destinationLocation?.latitude || activeAssignment?.route?.destination?.latitude;
    const destLng = resource.destinationLocation?.longitude || activeAssignment?.route?.destination?.longitude;

    if (destLat !== undefined && destLng !== undefined && destLat !== null && destLng !== null) {
      remainingDistanceKm = calculateDistanceKm(lat, lng, destLat, destLng);
      remainingEtaMinutes = calculateEtaMinutes(remainingDistanceKm);

      // Arrival Detection: proximity threshold <= 80 meters (0.08 km)
      if (
        (resource.status === 'EN_ROUTE' || resource.status === 'DISPATCHED') &&
        remainingDistanceKm <= 0.08
      ) {
        const arrivalTime = new Date();
        resource.status = 'ON_SCENE';
        remainingEtaMinutes = 0;

        if (activeAssignment) {
          activeAssignment.status = 'ON_SCENE';
          activeAssignment.arrivedAt = arrivalTime;

          const startTime = activeAssignment.dispatchedAt || activeAssignment.assignedAt;
          const responseDurationMs = arrivalTime.getTime() - new Date(startTime).getTime();
          const responseTimeMins = Math.max(0, Math.round((responseDurationMs / (1000 * 60)) * 10) / 10);
          activeAssignment.actualArrivalMinutes = responseTimeMins;
          activeAssignment.responseTimeMinutes = responseTimeMins;

          if (activeAssignment.estimatedArrivalMinutes) {
            activeAssignment.delayMinutes = Math.max(
              0,
              Math.round((responseTimeMins - activeAssignment.estimatedArrivalMinutes) * 10) / 10
            );
          }

          activeAssignment.timeline.push({
            status: 'ON_SCENE',
            timestamp: arrivalTime,
            changedBy: user ? { userId: user.id || user._id, name: user.name, role: user.role } : { name: 'GPS Proximity' },
            note: 'Automatic arrival detected (proximity <= 80m)',
          });

          await activeAssignment.save();

          emitAssignmentUpdated(activeAssignment);
          emitResponseStatusChanged(activeAssignment);
        }

        emitResourceArrived({
          resourceId: resource.resourceId,
          incidentId: resource.currentAssignment,
          arrivedAt: arrivalTime,
          responseTimeMinutes: activeAssignment?.responseTimeMinutes,
          delayMinutes: activeAssignment?.delayMinutes,
        });
      }
    }
  }

  await resource.save();

  // Broadcast real-time live GPS update
  emitResourceLocationUpdated({
    resourceId: resource.resourceId,
    incidentId: resource.currentAssignment,
    latitude: lat,
    longitude: lng,
    status: resource.status,
    etaMinutes: remainingEtaMinutes,
    distanceRemainingKm: remainingDistanceKm,
    timestamp: resource.locationUpdatedAt.toISOString(),
  });

  return {
    resourceId: resource.resourceId,
    currentLocation: resource.currentLocation,
    status: resource.status,
    destinationLocation: resource.destinationLocation,
    distanceKm: remainingDistanceKm,
    etaMinutes: remainingEtaMinutes,
    remainingDistanceKm,
    remainingEtaMinutes,
    locationUpdatedAt: resource.locationUpdatedAt,
  };
};

