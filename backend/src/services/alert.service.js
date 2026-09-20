import mongoose from 'mongoose';
import { AlertModel } from '../models/alert.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { ResponseTeamModel } from '../models/team.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { emitAlertNew, emitAlertAcknowledged, emitAlertResolved, emitIncidentTimeline } from '../utils/socket.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { env } from '../config/env.js';
import NotificationService from './notification.service.js';

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

  // Cross-alert deduplication:
  // If incident already has an active ESCALATION_REQUIRED alert, do not generate a lower-priority UNASSIGNED_CRITICAL alert
  if (type === 'UNASSIGNED_CRITICAL' && incidentId) {
    const activeEscalation = await AlertModel.findOne({
      incidentId,
      type: 'ESCALATION_REQUIRED',
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
    });
    if (activeEscalation) {
      return { alert: activeEscalation, isNew: false };
    }
  }

  // If generating an ESCALATION_REQUIRED alert, supersede/auto-resolve any existing UNASSIGNED_CRITICAL alerts for this incident
  if (type === 'ESCALATION_REQUIRED' && incidentId) {
    await AlertModel.updateMany(
      { incidentId, type: 'UNASSIGNED_CRITICAL', status: 'ACTIVE' },
      {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        'metadata.resolutionNote': 'Superseded by Escalation Required alert',
      }
    );
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

  // 3.1 Append timeline event to incident if incidentId is present
  if (incidentId && mongoose.connection.readyState === 1) {
    try {
      const eventType = (type === 'DELAY' || type === 'RESPONSE_DELAY' || type === 'SLA_BREACH') ? 'RESOURCE_DELAYED' : 'ALERT_CREATED';
      const tlEvent = {
        timelineId: `TL-${Date.now()}-ALT`,
        event: eventType,
        description: `Alert [${severity}]: ${title} - ${message}`,
        changedBy: { userId: 'SYSTEM', name: 'Alert Engine', role: 'SYSTEM' },
        timestamp: new Date(),
        reason: `${type} detected: ${message}`,
      };
      await IncidentModel.updateOne(
        { $or: [{ incidentId }, { _id: mongoose.isValidObjectId(incidentId) ? incidentId : null }].filter(Boolean) },
        { $push: { timeline: tlEvent } }
      );
      emitIncidentTimeline(incidentId, tlEvent);
    } catch (tlErr) {
      console.warn('[AlertService] Failed to append timeline event:', tlErr.message);
    }
  }

  // 4. Record Audit Log
  await recordAuditLog({
    user,
    action: 'ALERT_CREATED',
    entityType: 'ALERT',
    entityId: alert.alertId,
    metadata: { type, severity, incidentId, assignmentId, title },
  });

  // 5. Operational Event Notification
  NotificationService.dispatchEventNotification('ALERT_CREATED', {
    title: `Alert [${severity}]: ${title}`,
    message,
    entityType: 'ALERT',
    entityId: alert.alertId,
    incidentId: alert.incidentId,
    alertId: alert.alertId,
    assignmentId: alert.assignmentId,
    metadata: { alertId: alert.alertId, severity, type },
    cooldownSeconds: 60,
  }).catch((e) => console.warn('[Notification] Alert created dispatch note:', e.message));

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
  // Exclude incidents that are resolved, cancelled, already escalated, or already actively responding
  const p1Incidents = await IncidentModel.find({
    priority: 'P1',
    status: { $nin: ['RESOLVED', 'CANCELLED', 'ESCALATED', 'RESPONDING', 'ON_SCENE'] },
  });

  const alertsGenerated = [];

  for (const incident of p1Incidents) {
    // Check if incident already has an active escalation alert
    const activeEscalation = await AlertModel.findOne({
      incidentId: incident.incidentId,
      type: 'ESCALATION_REQUIRED',
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
    });
    if (activeEscalation) continue;

    const activeAssignment = await AssignmentModel.findOne({
      incidentId: incident.incidentId,
      status: { $in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'ON_SCENE'] },
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

  // Exclude incidents that are already resolved, cancelled, or escalated
  const escalatedIncidents = await IncidentModel.find({
    priority: 'P1',
    status: { $nin: ['RESOLVED', 'CANCELLED', 'ESCALATED'] },
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
 * Background Maintenance: Cleanup stale alerts for resolved, cancelled, or already escalated/responding incidents
 */
export const cleanupStaleAlerts = async () => {
  if (mongoose.connection.readyState !== 1) return { resolvedCount: 0 };
  try {
    let resolvedCount = 0;

    // 1. Auto-resolve any active/acknowledged alerts for RESOLVED or CANCELLED incidents
    const closedIncidents = await IncidentModel.find({
      status: { $in: ['RESOLVED', 'CANCELLED'] },
    }).select('incidentId status').lean();
    const closedIds = closedIncidents.map((i) => i.incidentId).filter(Boolean);

    if (closedIds.length > 0) {
      const staleAlerts = await AlertModel.find({
        incidentId: { $in: closedIds },
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
      });

      if (staleAlerts.length > 0) {
        await AlertModel.updateMany(
          { incidentId: { $in: closedIds }, status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } },
          {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            'metadata.autoResolvedReason': 'Incident resolved/cancelled',
          }
        );
        staleAlerts.forEach((alt) => emitAlertResolved(alt));
        resolvedCount += staleAlerts.length;
      }
    }

    // 2. Auto-resolve UNASSIGNED_CRITICAL alerts for incidents with active assignments or responding/escalated status
    const assignedOrActiveIncidents = await IncidentModel.find({
      status: { $in: ['RESPONDING', 'ASSIGNED', 'ON_SCENE', 'ESCALATED'] },
    }).select('incidentId status').lean();
    const activeAssignedIds = assignedOrActiveIncidents.map((i) => i.incidentId).filter(Boolean);

    if (activeAssignedIds.length > 0) {
      const supersededUnassigned = await AlertModel.find({
        incidentId: { $in: activeAssignedIds },
        type: 'UNASSIGNED_CRITICAL',
        status: 'ACTIVE',
      });

      if (supersededUnassigned.length > 0) {
        await AlertModel.updateMany(
          { incidentId: { $in: activeAssignedIds }, type: 'UNASSIGNED_CRITICAL', status: 'ACTIVE' },
          {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            'metadata.autoResolvedReason': 'Units assigned / incident in progress',
          }
        );
        supersededUnassigned.forEach((alt) => emitAlertResolved(alt));
        resolvedCount += supersededUnassigned.length;
      }
    }

    // 3. Auto-acknowledge/resolve ESCALATION_REQUIRED alerts for incidents whose status is already ESCALATED
    const escalatedIncidents = await IncidentModel.find({
      status: 'ESCALATED',
    }).select('incidentId status').lean();
    const escalatedIds = escalatedIncidents.map((i) => i.incidentId).filter(Boolean);

    if (escalatedIds.length > 0) {
      const alreadyEscalatedAlerts = await AlertModel.find({
        incidentId: { $in: escalatedIds },
        type: 'ESCALATION_REQUIRED',
        status: 'ACTIVE',
      });

      if (alreadyEscalatedAlerts.length > 0) {
        await AlertModel.updateMany(
          { incidentId: { $in: escalatedIds }, type: 'ESCALATION_REQUIRED', status: 'ACTIVE' },
          {
            status: 'ACKNOWLEDGED',
            acknowledgedAt: new Date(),
            'metadata.autoAcknowledgedReason': 'Incident escalation already authorized',
          }
        );
        alreadyEscalatedAlerts.forEach((alt) => {
          alt.status = 'ACKNOWLEDGED';
          emitAlertAcknowledged(alt);
        });
        resolvedCount += alreadyEscalatedAlerts.length;
      }
    }

    return { resolvedCount };
  } catch (err) {
    console.warn('[AlertService] Stale alerts cleanup note:', err.message);
    return { resolvedCount: 0 };
  }
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

  // Operational notification
  NotificationService.dispatchEventNotification('ALERT_ACKNOWLEDGED', {
    title: `Alert Acknowledged: ${alert.title}`,
    message: `Alert #${alert.alertId} acknowledged by ${user?.name || 'Operator'}.`,
    entityType: 'ALERT',
    entityId: alert.alertId,
    incidentId: alert.incidentId,
    alertId: alert.alertId,
    assignmentId: alert.assignmentId,
    metadata: { alertId: alert.alertId, status: alert.status },
    cooldownSeconds: 60,
  }).catch((e) => console.warn('[Notification] Alert acknowledged dispatch note:', e.message));

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
