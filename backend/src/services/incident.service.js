import mongoose from 'mongoose';
import { IncidentModel } from '../models/incident.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  emitIncidentNew,
  emitIncidentUpdated,
  emitIncidentStatusChanged,
} from '../utils/socket.js';

// Safe Status Lifecycle Transition Rules
export const VALID_STATUS_TRANSITIONS = {
  NEW: ['ACKNOWLEDGED', 'ASSIGNED', 'CANCELLED', 'ANALYZING'],
  ANALYZING: ['PRIORITIZED', 'ASSIGNED', 'CANCELLED'],
  PRIORITIZED: ['ASSIGNED', 'RESPONDING', 'CANCELLED'],
  ACKNOWLEDGED: ['ASSIGNED', 'RESPONDING', 'CANCELLED'],
  ASSIGNED: ['RESPONDING', 'ON_SCENE', 'CANCELLED'],
  RESPONDING: ['ON_SCENE', 'RESOLVED', 'CANCELLED'],
  ON_SCENE: ['RESOLVED', 'CANCELLED'],
  ESCALATED: ['ASSIGNED', 'RESPONDING', 'ON_SCENE', 'RESOLVED', 'CANCELLED'],
  RESOLVED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

export const getIncidents = async (filters = {}, pagination = {}) => {
  const query = {};

  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;
  if (filters.priority) query.priority = filters.priority;
  if (filters.status) query.status = filters.status;
  if (filters.source) query.source = filters.source;

  // Search by text
  if (filters.search) {
    query.$or = [
      { incidentId: { $regex: filters.search, $options: 'i' } },
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { 'location.address': { $regex: filters.search, $options: 'i' } },
    ];
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  // Geospatial radius lookup using $geoWithin $centerSphere (Earth radius ~ 6,378,137m)
  if (filters.nearLat !== undefined && filters.nearLng !== undefined) {
    const lat = parseFloat(filters.nearLat);
    const lng = parseFloat(filters.nearLng);
    const radiusMeters = parseFloat(filters.radius || '10000'); // default 10km

    if (!isNaN(lat) && !isNaN(lng)) {
      const radiusRadians = radiusMeters / 6378137;
      query['location.geometry'] = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusRadians],
        },
      };
    }
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
  let incident = await IncidentModel.findOne({ incidentId: id });

  if (!incident && mongoose.Types.ObjectId.isValid(id)) {
    incident = await IncidentModel.findById(id);
  }

  if (!incident) {
    throw new NotFoundError(`Incident #${id} not found`);
  }

  return incident;
};

export const createIncident = async (data, user = null) => {
  // Generate distinct ID if not supplied
  const incidentId = data.incidentId || `ER-${Math.floor(2050 + Math.random() * 950)}`;

  // Bind verified user as reportedBy (prevents spoofing)
  const reportedBy = user
    ? {
        userId: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        badgeNumber: user.badgeNumber || null,
      }
    : null;

  const initialStatus = data.status || 'NEW';

  // Initial timeline event
  const initialTimeline = [
    {
      timelineId: `TL-${Date.now()}-01`,
      event: 'INCIDENT_CREATED',
      previousStatus: null,
      newStatus: initialStatus,
      changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
      timestamp: new Date(),
      reason: 'Incident logged in emergency operations mesh',
      description: `Incident reported via ${data.source || 'EMERGENCY_CALL'}: ${data.title}`,
    },
  ];

  // Initial report
  const initialReports =
    Array.isArray(data.reports) && data.reports.length > 0
      ? data.reports
      : [
          {
            reportId: `REP-${Date.now()}`,
            source: data.source || 'EMERGENCY_CALL',
            text: data.description,
            reliability: data.source === 'SENSOR' ? 98 : data.source === 'FIELD_TEAM' ? 99 : 90,
            reportedAt: new Date(),
          },
        ];

  const incident = await IncidentModel.create({
    ...data,
    incidentId,
    status: initialStatus,
    source: data.source || 'EMERGENCY_CALL',
    reportedBy,
    location: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
    },
    metadata: data.metadata || {},
    reports: initialReports,
    timeline: initialTimeline,
  });

  await recordAuditLog({
    user,
    action: 'INCIDENT_CREATED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: {
      title: incident.title,
      type: incident.type,
      source: incident.source,
      severity: incident.severity,
      priority: incident.priority,
    },
  });

  // Broadcast real-time WebSocket event
  emitIncidentNew(incident);

  return incident;
};

export const updateIncident = async (id, data, user = null) => {
  const incident = await getIncidentById(id);

  if (data.title) incident.title = data.title;
  if (data.description) incident.description = data.description;
  if (data.type) incident.type = data.type;
  if (data.severity) incident.severity = data.severity;
  if (data.priority) incident.priority = data.priority;
  if (data.metadata) {
    incident.metadata = { ...incident.metadata, ...data.metadata };
  }

  incident.timeline.push({
    timelineId: `TL-${Date.now()}`,
    event: 'INCIDENT_UPDATED',
    previousStatus: incident.status,
    newStatus: incident.status,
    changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
    timestamp: new Date(),
    reason: 'Operational parameters updated',
    description: `Incident details updated by ${user?.name || 'Operator'}`,
  });

  await incident.save();

  await recordAuditLog({
    user,
    action: 'INCIDENT_UPDATED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: { updatedFields: Object.keys(data) },
  });

  emitIncidentUpdated(incident);

  return incident;
};

export const updateIncidentStatus = async (id, newStatus, reason = null, user = null) => {
  const incident = await getIncidentById(id);
  const currentStatus = incident.status;

  if (currentStatus === newStatus) {
    return incident;
  }

  // Enforce safe status lifecycle transitions
  const allowedNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  const isTransitionAllowed = allowedNextStatuses.includes(newStatus);

  // Terminal state protection: RESOLVED and CANCELLED cannot transition to NEW
  if ((currentStatus === 'RESOLVED' || currentStatus === 'CANCELLED') && newStatus === 'NEW') {
    throw new ValidationError(`Cannot revert terminal incident status from ${currentStatus} to ${newStatus}`);
  }

  if (!isTransitionAllowed && user?.role !== 'ADMIN') {
    throw new ValidationError(
      `Invalid operational transition from ${currentStatus} to ${newStatus}. Allowed next states: [${allowedNextStatuses.join(
        ', '
      )}]`
    );
  }

  incident.status = newStatus;

  if (newStatus === 'RESOLVED') {
    incident.resolvedAt = new Date();
  }

  const eventName =
    newStatus === 'RESOLVED'
      ? 'INCIDENT_RESOLVED'
      : newStatus === 'CANCELLED'
      ? 'INCIDENT_CANCELLED'
      : 'STATUS_CHANGED';

  incident.timeline.push({
    timelineId: `TL-${Date.now()}`,
    event: eventName,
    previousStatus: currentStatus,
    newStatus,
    changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
    timestamp: new Date(),
    reason: reason || null,
    description: `Status transitioned from ${currentStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
  });

  await incident.save();

  await recordAuditLog({
    user,
    action: eventName,
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: { previousStatus: currentStatus, newStatus, reason },
  });

  emitIncidentStatusChanged(incident);

  return incident;
};

export const updateIncidentLocation = async (id, locationData, user = null) => {
  const incident = await getIncidentById(id);

  incident.location = {
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    address: locationData.address,
    geometry: {
      type: 'Point',
      coordinates: [locationData.longitude, locationData.latitude],
    },
  };

  incident.timeline.push({
    timelineId: `TL-${Date.now()}`,
    event: 'LOCATION_UPDATED',
    previousStatus: incident.status,
    newStatus: incident.status,
    changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
    timestamp: new Date(),
    reason: 'GPS coordinates relocated',
    description: `Coordinates adjusted to ${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)} (${locationData.address})`,
  });

  await incident.save();

  await recordAuditLog({
    user,
    action: 'INCIDENT_LOCATION_UPDATED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: { newLocation: locationData.address },
  });

  emitIncidentUpdated(incident);

  return incident;
};

export const deleteIncident = async (id, user = null) => {
  const incident = await getIncidentById(id);

  incident.status = 'CANCELLED';
  incident.timeline.push({
    timelineId: `TL-${Date.now()}`,
    event: 'INCIDENT_CANCELLED',
    previousStatus: incident.status,
    newStatus: 'CANCELLED',
    changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
    timestamp: new Date(),
    reason: 'Incident cancelled by executive authority',
    description: `Incident cancelled by ${user?.name || 'Administrator'}`,
  });

  await incident.save();

  await recordAuditLog({
    user,
    action: 'INCIDENT_CANCELLED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: { deletedBy: user?.name },
  });

  emitIncidentStatusChanged(incident);

  return { message: `Incident #${incident.incidentId} cancelled successfully`, incident };
};

export const getIncidentTimeline = async (id) => {
  const incident = await getIncidentById(id);
  return incident.timeline || [];
};

export const getIncidentReports = async (id) => {
  const incident = await getIncidentById(id);
  return incident.reports || [];
};
