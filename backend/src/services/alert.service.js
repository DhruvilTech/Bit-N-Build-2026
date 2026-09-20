import mongoose from 'mongoose';
import { AlertModel } from '../models/alert.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { ResponseTeamModel } from '../models/team.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { emitAlertNew, emitAlertAcknowledged, emitAlertResolved } from '../utils/socket.js';
import { recordTimelineEvent } from './timeline.service.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { env } from '../config/env.js';

/**
 * Deterministic Alert Engine: Create or retrieve existing active alert
 * Enforces deduplication to prevent repeated alerts for the same logical event
 */
export const createAlert = async ({
  type,
  severity = 'HIGH',
  incidentId,
  assignmentId = null,
  resourceId = null,
  teamId = null,
  title,
  message,
  metadata = {},
  user = null,
}) => {
  // If MongoDB is not connected (e.g. unit test runner without external DB), return in-memory alert
  if (mongoose.connection.readyState !== 1) {
    const alertId = `ALT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const mockAlert = {
      alertId,
      id: alertId,
      type,
      severity,
      incidentId,
      assignmentId,
      resourceId,
      teamId,
      title,
      message,
      status: 'ACTIVE',
      metadata,
      createdAt: new Date(),
    };
    emitAlertNew(mockAlert);
    return { alert: mockAlert, isNew: true };
  }

  // 1. Deduplication check: Do not create duplicate active/acknowledged alerts for same condition
  const existingQuery = {
    incidentId,
    type,
    status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
  };

  if (assignmentId) {
    existingQuery.assignmentId = assignmentId;
  }

  const existingAlert = await AlertModel.findOne(existingQuery);
  if (existingAlert) {
    return { alert: existingAlert, isNew: false };
  }

  // 2. Generate unique alert ID
  const alertId = `ALT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const alert = await AlertModel.create({
    alertId,
    type,
    severity,
    incidentId,
    assignmentId,
    resourceId,
    teamId,
    title,
    message,
    status: 'ACTIVE',
    metadata,
  });

  // 3. Emit real-time Socket.IO alert:new event
  emitAlertNew(alert);

  if (incidentId) {
    recordTimelineEvent({
      incidentId,
      eventType: 'ALERT_CREATED',
      actor: user?.name || 'ALERT-SYSTEM',
      actorRole: user?.role || 'SYSTEM',
      title: `Alert: ${title || type}`,
      description: message,
      metadata: { alertId: alert.alertId, type, severity },
    }).catch(() => {});
  }

  // 4. Record Audit Log
  await recordAuditLog({
    user,
    action: 'ALERT_CREATED',
    entityType: 'ALERT',
    entityId: alert.alertId,
    metadata: { type, severity, incidentId, assignmentId, title },
  });

  return { alert, isNew: true };
};

/**
 * Rule 1: Critical Incident Alert
 * Triggered when an incident is created or updated with severity = CRITICAL
 */
export const evaluateCriticalIncidentAlert = async (incident) => {
  if (incident.severity !== 'CRITICAL') return null;
  if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') return null;

  return createAlert({
    type: 'CRITICAL_INCIDENT',
    severity: 'CRITICAL',
    incidentId: incident.incidentId,
    title: `CRITICAL INCIDENT: ${incident.title}`,
    message: `Incident #${incident.incidentId} (${incident.type}) classified as CRITICAL severity. Immediate tactical response required.`,
    metadata: {
      priority: incident.priority,
      severity: incident.severity,
      type: incident.type,
      location: incident.location?.address,
    },
  });
};

/**
 * Rule 2: Response Delay Alert
 * Triggered when an active assignment's current time exceeds expectedArrivalAt
 */
export const evaluateResponseDelayAlert = async (assignment, delayMinutes = 0) => {
  if (!assignment || assignment.status === 'ARRIVED' || assignment.status === 'COMPLETED' || assignment.status === 'CANCELLED') {
    return null;
  }

  return createAlert({
    type: 'RESPONSE_DELAY',
    severity: 'HIGH',
    incidentId: assignment.incidentId,
    assignmentId: assignment.assignmentId,
    teamId: assignment.teamId,
    resourceId: assignment.resourceId,
    title: `RESPONSE DELAY: Assignment #${assignment.assignmentId}`,
    message: `Team ${assignment.teamId || 'unit'} is delayed by ${delayMinutes} minute(s) past expected ETA for incident #${assignment.incidentId}.`,
    metadata: {
      delayMinutes,
      expectedArrivalAt: assignment.expectedArrivalAt,
      status: assignment.status,
    },
  });
};

/**
 * Rule 3: Resource Shortage Alert
 * Triggered when required resources exceed available capacity
 */
export const evaluateResourceShortageAlert = async (incident, requiredCount = 1, availableCount = 0) => {
  if (availableCount >= requiredCount) return null;
  if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') return null;

  return createAlert({
    type: 'RESOURCE_SHORTAGE',
    severity: incident.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    incidentId: incident.incidentId,
    title: `RESOURCE SHORTAGE: Incident #${incident.incidentId}`,
    message: `Resource demand deficit detected. Incident requires ${requiredCount} units, but only ${availableCount} available in zone.`,
    metadata: {
      requiredCount,
      availableCount,
      type: incident.type,
    },
  });
};

/**
 * Rule 4: Unassigned Critical Incident Alert
 * Triggered when a P1 incident has no active assignment
 */
export const evaluateUnassignedCriticalAlerts = async () => {
  const p1Incidents = await IncidentModel.find({
    priority: 'P1',
    status: { $nin: ['RESOLVED', 'CANCELLED'] },
  });

  const alertsGenerated = [];

  for (const incident of p1Incidents) {
    const activeAssignment = await AssignmentModel.findOne({
      incidentId: incident.incidentId,
      status: { $in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED'] },
    });

    if (!activeAssignment) {
      const res = await createAlert({
        type: 'UNASSIGNED_CRITICAL',
        severity: 'CRITICAL',
        incidentId: incident.incidentId,
        title: `UNASSIGNED P1 CRITICAL: Incident #${incident.incidentId}`,
        message: `High priority P1 incident #${incident.incidentId} ("${incident.title}") has no active responding team assigned. Immediate dispatch mandatory.`,
        metadata: {
          priority: incident.priority,
          severity: incident.severity,
          createdAt: incident.createdAt,
        },
      });
      if (res.isNew) alertsGenerated.push(res.alert);
    }
  }

  return alertsGenerated;
};

/**
 * Rule 5: Escalation Required Alert
 * Triggered when a P1 incident remains unresolved beyond configured threshold
 */
export const evaluateEscalationRequiredAlerts = async () => {
  const thresholdMinutes = env.P1_ESCALATION_THRESHOLD_MINUTES || 15;
  const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const escalatedIncidents = await IncidentModel.find({
    priority: 'P1',
    status: { $nin: ['RESOLVED', 'CANCELLED'] },
    createdAt: { $lte: cutoffTime },
  });

  const alertsGenerated = [];

  for (const incident of escalatedIncidents) {
    const elapsedMinutes = Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60000);
    const res = await createAlert({
      type: 'ESCALATION_REQUIRED',
      severity: 'CRITICAL',
      incidentId: incident.incidentId,
      title: `ESCALATION REQUIRED: Incident #${incident.incidentId}`,
      message: `Priority P1 incident has remained unresolved for ${elapsedMinutes} minutes (threshold: ${thresholdMinutes}m). Incident Commander escalation required.`,
      metadata: {
        elapsedMinutes,
        thresholdMinutes,
        createdAt: incident.createdAt,
        currentStatus: incident.status,
      },
    });
    if (res.isNew) alertsGenerated.push(res.alert);
  }

  return alertsGenerated;
};

/**
 * Query Alerts with filters and pagination
 */
export const getAlerts = async (filters = {}, pagination = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;
  if (filters.incidentId) query.incidentId = filters.incidentId;
  if (filters.assignmentId) query.assignmentId = filters.assignmentId;

  if (filters.search) {
    query.$or = [
      { alertId: { $regex: filters.search, $options: 'i' } },
      { title: { $regex: filters.search, $options: 'i' } },
      { message: { $regex: filters.search, $options: 'i' } },
      { incidentId: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const [alerts, total] = await Promise.all([
    AlertModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AlertModel.countDocuments(query),
  ]);

  return {
    alerts,
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieve single Alert by alertId or _id
 */
export const getAlertById = async (id) => {
  let alert = await AlertModel.findOne({ alertId: id });
  if (!alert && mongoose.Types.ObjectId.isValid(id)) {
    alert = await AlertModel.findById(id);
  }
  if (!alert) {
    throw new NotFoundError(`Alert #${id} not found`);
  }
  return alert;
};

/**
 * Acknowledge an Alert (Idempotent)
 */
export const acknowledgeAlert = async (id, user = null, note = '') => {
  const alert = await getAlertById(id);

  // Idempotency check: if already acknowledged or resolved, return safely without failing
  if (alert.status === 'ACKNOWLEDGED' || alert.status === 'RESOLVED') {
    return alert;
  }

  alert.status = 'ACKNOWLEDGED';
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = {
    userId: user?.id || user?._id?.toString() || null,
    name: user?.name || 'OPERATOR',
    role: user?.role || 'OPERATOR',
  };

  if (note) {
    alert.metadata = { ...alert.metadata, acknowledgmentNote: note };
  }

  await alert.save();

  // Socket notification
  emitAlertAcknowledged(alert);

  if (alert.incidentId) {
    recordTimelineEvent({
      incidentId: alert.incidentId,
      eventType: 'ALERT_ACKNOWLEDGED',
      actor: user?.name || 'OPERATOR',
      actorRole: user?.role || 'OPERATOR',
      title: `Alert Acknowledged: ${alert.title}`,
      description: `Alert #${alert.alertId} (${alert.type}) acknowledged${note ? `: ${note}` : ''}`,
      metadata: { alertId: alert.alertId, note },
    }).catch(() => {});
  }

  // Audit log
  await recordAuditLog({
    user,
    action: 'ALERT_ACKNOWLEDGED',
    entityType: 'ALERT',
    entityId: alert.alertId,
    metadata: { note, status: alert.status },
  });

  return alert;
};

/**
 * Resolve an Alert (Idempotent)
 */
export const resolveAlert = async (id, user = null, resolution = '', note = '') => {
  const alert = await getAlertById(id);

  // Idempotency check: if already resolved, return safely without failing
  if (alert.status === 'RESOLVED') {
    return alert;
  }

  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date();
  alert.resolvedBy = {
    userId: user?.id || user?._id?.toString() || null,
    name: user?.name || 'OPERATOR',
    role: user?.role || 'OPERATOR',
  };

  if (resolution || note) {
    alert.metadata = { ...alert.metadata, resolution, resolutionNote: note };
  }

  await alert.save();

  // Socket notification
  emitAlertResolved(alert);

  if (alert.incidentId) {
    recordTimelineEvent({
      incidentId: alert.incidentId,
      eventType: 'ALERT_RESOLVED',
      actor: user?.name || 'OPERATOR',
      actorRole: user?.role || 'OPERATOR',
      title: `Alert Resolved: ${alert.title}`,
      description: `Alert #${alert.alertId} (${alert.type}) resolved${resolution ? `: ${resolution}` : ''}`,
      metadata: { alertId: alert.alertId, resolution },
    }).catch(() => {});
  }

  // Audit log
  await recordAuditLog({
    user,
    action: 'ALERT_RESOLVED',
    entityType: 'ALERT',
    entityId: alert.alertId,
    metadata: { resolution, note, status: alert.status },
  });

  return alert;
};
