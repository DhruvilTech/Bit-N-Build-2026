import mongoose from 'mongoose';
import { ResponseTeamModel } from '../models/team.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { recordAuditLog } from './auditLog.service.js';
import NotificationService from './notification.service.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { emitTeamLocation, emitTeamUpdated, emitAssignmentUpdated } from '../utils/socket.js';
import { recalculateEtaForTeam, calculateHaversineDistanceKm, calculateEta, getAverageSpeedForType } from './eta.service.js';

export const getTeams = async (filters = {}, pagination = {}) => {
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
      { teamId: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
      { capabilities: { $regex: filters.search, $options: 'i' } },
      { vehicleId: { $regex: filters.search, $options: 'i' } },
      { 'location.address': { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const [teams, total] = await Promise.all([
    ResponseTeamModel.find(query).sort({ teamId: 1 }).skip(skip).limit(limit),
    ResponseTeamModel.countDocuments(query),
  ]);

  return {
    teams,
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getTeamById = async (id) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }

  if (!team) {
    throw new NotFoundError(`Response Team #${id} not found`);
  }

  // Populate assigned resources details if available
  let populatedResources = [];
  if (team.assignedResources && team.assignedResources.length > 0) {
    populatedResources = await ResourceModel.find({
      resourceId: { $in: team.assignedResources },
    });
  }

  return {
    ...team.toObject(),
    resourceDetails: populatedResources,
  };
};

export const createTeam = async (data, user = null) => {
  const typeCode = data.type ? data.type.substring(0, 2).toUpperCase() : 'RT';
  const teamId = data.teamId || `TEAM-${typeCode}${Math.floor(10 + Math.random() * 90)}`;

  const existing = await ResponseTeamModel.findOne({ teamId });
  if (existing) {
    throw new ConflictError(`Team with ID ${teamId} already exists`);
  }

  const team = await ResponseTeamModel.create({
    ...data,
    teamId,
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
    action: 'TEAM_CREATED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { name: team.name, type: team.type },
  });

  return team;
};

export const updateTeam = async (id, data, user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  if (data.name) team.name = data.name;
  if (data.type) team.type = data.type;
  if (data.members) team.members = data.members;
  if (data.vehicleId !== undefined) team.vehicleId = data.vehicleId;
  if (data.capabilities) team.capabilities = data.capabilities;
  if (data.radioChannel) team.radioChannel = data.radioChannel;
  if (data.metadata) team.metadata = { ...team.metadata, ...data.metadata };

  if (data.location) {
    team.location = {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address || team.location.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
    };
  }

  await team.save();

  await recordAuditLog({
    user,
    action: 'TEAM_UPDATED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { name: team.name, type: team.type },
  });

  return team;
};

export const updateTeamStatus = async (id, status, notes = '', user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  if (status === 'ASSIGNED' && !team.currentAssignment) {
    throw new BadRequestError(
      'Cannot set status to ASSIGNED without an active incident assignment. Use the assign endpoint.'
    );
  }

  const prevStatus = team.status;
  team.status = status;

  // Milestone tracking in active response history
  const activeRecord = team.responseHistory
    .slice()
    .reverse()
    .find((h) => !h.resolvedAt);

  if (activeRecord) {
    if (status === 'EN_ROUTE' && !activeRecord.enRouteAt) {
      activeRecord.enRouteAt = new Date();
    } else if (status === 'ON_SCENE' && !activeRecord.onSceneAt) {
      activeRecord.onSceneAt = new Date();
    } else if (status === 'AVAILABLE') {
      activeRecord.resolvedAt = new Date();
      activeRecord.status = 'RESOLVED';
      team.currentAssignment = null;
    }
  }

  if (status === 'AVAILABLE') {
    team.currentAssignment = null;
    team.availability = true;
  } else {
    team.availability = false;
  }

  await team.save();

  await recordAuditLog({
    user,
    action: 'TEAM_STATUS_CHANGED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { previousStatus: prevStatus, newStatus: status, notes },
  });

  return team;
};

export const updateTeamLocation = async (id, { latitude, longitude, address }, user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  const now = new Date();
  team.location = {
    latitude,
    longitude,
    address: address || team.location.address,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  };
  team.currentLocation = team.location;
  team.locationUpdatedAt = now;

  await team.save();

  // Phase 12: Emit team:location real-time event
  emitTeamLocation({
    teamId: team.teamId,
    latitude,
    longitude,
    timestamp: now.toISOString(),
  });
  emitTeamUpdated(team);

  // Phase 13: Recalculate ETA for all active assignments linked to this moving team
  await recalculateEtaForTeam(team.teamId, { latitude, longitude }, team.type);

  await recordAuditLog({
    user,
    action: 'TEAM_LOCATION_UPDATED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { latitude, longitude, address },
  });

  return team;
};

export const assignTeamToIncident = async (id, { incidentId, notes = '' }, user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  // Strict Conflict Prevention
  if (team.status !== 'AVAILABLE' || team.currentAssignment) {
    throw new ConflictError(
      `Response Team #${team.teamId} is currently ${team.status} and cannot be assigned.`
    );
  }

  const now = new Date();
  team.status = 'ASSIGNED';
  team.currentAssignment = incidentId;
  team.availability = false;

  const historyRecord = {
    assignmentId: `RESP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    incidentId,
    assignedAt: now,
    status: 'ASSIGNED',
    notes: notes || `Dispatched to incident #${incidentId}`,
  };
  team.responseHistory.push(historyRecord);

  await team.save();

  // Cross-module synchronization: link team to Incident
  const incident = await IncidentModel.findOneAndUpdate(
    { $or: [{ incidentId }, ...(mongoose.Types.ObjectId.isValid(incidentId) ? [{ _id: incidentId }] : [])] },
    { $addToSet: { assignedResources: team.teamId, assignedTeams: team.teamId } },
    { new: true }
  );

  // Dispatch real-time operational notification
  try {
    await NotificationService.notifyRole('FIELD_COORDINATOR', {
      type: 'RESOURCE_ASSIGNMENT',
      title: `TEAM DISPATCHED: #${team.teamId}`,
      message: `Team ${team.name} (${team.type}) dispatched to incident #${incidentId}`,
      severity: 'MEDIUM',
      entityType: 'TEAM',
      entityId: team.teamId,
      metadata: { incidentId, teamId: team.teamId },
    });
  } catch (notifErr) {
    console.warn('[TeamService] Notification dispatch error:', notifErr.message);
  }

  // Phase 11 & 13: Create synchronized Assignment document
  let etaData = { distanceKm: null, estimatedArrivalMinutes: null, expectedArrivalAt: null };
  if (incident?.location && team.location) {
    const speed = getAverageSpeedForType(team.type);
    const dist = calculateHaversineDistanceKm(
      team.location.latitude,
      team.location.longitude,
      incident.location.latitude,
      incident.location.longitude
    );
    etaData = calculateEta(dist, speed);
  }

  const assignment = await AssignmentModel.create({
    assignmentId: historyRecord.assignmentId,
    incidentId,
    teamId: team.teamId,
    status: 'ASSIGNED',
    assignedAt: now,
    distanceKm: etaData.distanceKm,
    estimatedArrivalMinutes: etaData.estimatedArrivalMinutes,
    expectedArrivalAt: etaData.expectedArrivalAt,
    notes,
    createdBy: {
      userId: user?.id || user?._id?.toString() || null,
      name: user?.name || 'SYSTEM',
      role: user?.role || 'SYSTEM',
    },
  });

  emitAssignmentUpdated(assignment);
  emitTeamUpdated(team);
  await recordAuditLog({
    user,
    action: 'TEAM_ASSIGNED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { incidentId, notes, assignmentId: assignment.assignmentId },
  });

  return team;
};

export const releaseTeamFromIncident = async (id, { notes = '' } = {}, user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  if (!team.currentAssignment && team.status === 'AVAILABLE') {
    throw new BadRequestError(`Response Team #${team.teamId} is not currently assigned.`);
  }

  const prevIncidentId = team.currentAssignment;
  team.status = 'AVAILABLE';
  team.currentAssignment = null;
  team.availability = true;

  const activeRecord = team.responseHistory
    .slice()
    .reverse()
    .find((h) => !h.resolvedAt);

  if (activeRecord) {
    activeRecord.resolvedAt = new Date();
    activeRecord.status = 'RESOLVED';
    if (notes) activeRecord.notes += ` | ${notes}`;
  }

  await team.save();

  // Cross-module synchronization: remove team from Incident
  if (prevIncidentId) {
    await IncidentModel.updateOne(
      { incidentId: prevIncidentId },
      { $pull: { assignedResources: team.teamId } }
    );
  }

  await recordAuditLog({
    user,
    action: 'TEAM_RELEASED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { releasedFrom: prevIncidentId, notes },
  });

  return team;
};

export const assignResourceToTeam = async (id, resourceId, user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  let resource = await ResourceModel.findOne({ resourceId });
  if (!resource && mongoose.Types.ObjectId.isValid(resourceId)) {
    resource = await ResourceModel.findById(resourceId);
  }
  if (!resource) throw new NotFoundError(`Resource #${resourceId} not found`);

  // Conflict check: resource must be available
  if (resource.status !== 'AVAILABLE' || resource.currentAssignment) {
    throw new ConflictError(
      `Resource #${resource.resourceId} is currently ${resource.status} and cannot be assigned to team #${team.teamId}.`
    );
  }

  // Assign resource to team
  resource.status = 'ASSIGNED';
  resource.currentAssignment = team.teamId;
  resource.availability = false;
  resource.assignmentHistory.push({
    teamId: team.teamId,
    assignedAt: new Date(),
    action: 'ASSIGN',
    notes: `Assigned to team #${team.teamId} (${team.name})`,
  });
  await resource.save();

  // Add resource to team's assignedResources
  if (!team.assignedResources.includes(resource.resourceId)) {
    team.assignedResources.push(resource.resourceId);
    await team.save();
  }

  await recordAuditLog({
    user,
    action: 'TEAM_RESOURCE_ASSIGNED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { resourceId: resource.resourceId },
  });

  return { team, resource };
};

export const releaseResourceFromTeam = async (id, resourceId, user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  team.assignedResources = team.assignedResources.filter((rid) => rid !== resourceId);
  await team.save();

  let resource = await ResourceModel.findOne({ resourceId });
  if (resource && resource.currentAssignment === team.teamId) {
    resource.status = 'AVAILABLE';
    resource.currentAssignment = null;
    resource.availability = true;
    resource.assignmentHistory.push({
      teamId: team.teamId,
      assignedAt: new Date(),
      releasedAt: new Date(),
      action: 'RELEASE',
      notes: `Released from team #${team.teamId}`,
    });
    await resource.save();
  }

  await recordAuditLog({
    user,
    action: 'TEAM_RESOURCE_RELEASED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { resourceId },
  });

  return { team, resource };
};

export const findNearbyTeams = async ({
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

  const teams = await ResponseTeamModel.find(query).limit(50);
  return teams;
};

export const deleteTeam = async (id, user = null) => {
  let team = await ResponseTeamModel.findOne({ teamId: id });
  if (!team && mongoose.Types.ObjectId.isValid(id)) {
    team = await ResponseTeamModel.findById(id);
  }
  if (!team) throw new NotFoundError(`Response Team #${id} not found`);

  if (team.status === 'ASSIGNED' || team.currentAssignment) {
    throw new BadRequestError(
      `Cannot delete team #${team.teamId} while assigned to an active incident.`
    );
  }

  await ResponseTeamModel.deleteOne({ _id: team._id });

  await recordAuditLog({
    user,
    action: 'TEAM_DELETED',
    entityType: 'RESPONSE_TEAM',
    entityId: team.teamId,
    metadata: { name: team.name },
  });

  return { deleted: true, teamId: team.teamId };
};
