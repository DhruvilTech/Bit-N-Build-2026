import mongoose from 'mongoose';
import { IncidentModel } from '../models/incident.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { AlertModel } from '../models/alert.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import {
  emitIncidentNew,
  emitIncidentUpdated,
  emitIncidentStatusChanged,
  emitAlertResolved,
  emitAlertAcknowledged,
  emitIncidentAiProcessing,
  emitIncidentAiAnalyzed,
  emitIncidentAiFailed,
  emitIncidentDuplicateDetected,
  emitIncidentsClustered,
  emitIncidentMerged,
  emitIncidentReviewRequired,
  emitIncidentReviewed,
  emitIncidentOverridden,
  emitIncidentTimeline,
  emitIncidentAutoDispatched,
  emitIncidentDispatchCancelled,
} from '../utils/socket.js';
import {
  classifyIncidentWithAi,
  findDuplicatesWithAi,
  checkDuplicatePairWithAi,
  clusterIncidentsWithAi,
  analyzeIncidentPipeline,
} from './ai.service.js';
import { generateRecommendations } from './recommendation.service.js';
import { assignResourcesToIncident } from './assignment.service.js';
import NotificationService from './notification.service.js';
import EscalationService from './escalation.service.js';
import { evaluateCriticalIncidentAlert } from './alert.service.js';

/**
 * Appends a verified milestone event to an incident's progressive timeline
 * and broadcasts it in real-time over Socket.IO.
 */
export const appendTimelineEvent = async (incidentId, eventData) => {
  try {
    const incident = await IncidentModel.findOne({
      $or: [
        { incidentId },
        { _id: mongoose.isValidObjectId(incidentId) ? incidentId : null },
      ].filter(Boolean),
    });
    if (!incident) return null;

    const timelineEntry = {
      timelineId: `TL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      event: eventData.event || 'FIELD_UPDATE',
      previousStatus: eventData.previousStatus || incident.status,
      newStatus: eventData.newStatus || incident.status,
      changedBy: eventData.changedBy || { userId: 'SYSTEM', name: 'System Operator', role: 'SYSTEM' },
      timestamp: eventData.timestamp || new Date(),
      reason: eventData.reason || null,
      description: eventData.description || eventData.title || 'Timeline milestone recorded',
    };

    incident.timeline.push(timelineEntry);
    await incident.save();

    emitIncidentTimeline(incident.incidentId, timelineEntry);
    return timelineEntry;
  } catch (err) {
    console.error(`[Timeline Error] Failed to append event to #${incidentId}:`, err.message);
    return null;
  }
};

/**
 * Autonomously selects optimal city-scoped emergency resources and dispatches them to an incident.
 * Emits real-time notification with instant operator override/cancel capability.
 */
export const autoDispatchIncidentResources = async (incidentId, operator = null) => {
  const incident = await getIncidentById(incidentId);

  // If already assigned/responding or in terminal status, skip
  if (['ASSIGNED', 'RESPONDING', 'ON_SCENE', 'RESOLVED', 'CANCELLED'].includes(incident.status)) {
    return {
      success: false,
      message: `Incident #${incident.incidentId} is already in status '${incident.status}'.`,
      incident,
    };
  }

  // Generate recommendations scoped by city and requirements
  const recommendationResult = await generateRecommendations(incident.incidentId, {
    strategy: 'BALANCED',
    limit: 2,
    refresh: true,
  });

  const topRecs = recommendationResult.recommendations || [];
  if (topRecs.length === 0) {
    return {
      success: false,
      message: `No available resources found in ${incident.city || 'area'} matching operational requirements.`,
      incident,
      recommendations: [],
    };
  }

  // Pick the top 1 or 2 resources
  const resourceIdsToAssign = topRecs.slice(0, 2).map((r) => r.resourceId);

  const assignResult = await assignResourcesToIncident(
    incident.incidentId,
    {
      resourceIds: resourceIdsToAssign,
      notes: `AI Autonomous Rapid Dispatch (${incident.city || 'City Metro'} Fleet)`,
    },
    operator || { id: 'AI-SYSTEM', name: 'AI Autonomous Dispatcher', role: 'SYSTEM' }
  );

  const autoDispatchPayload = {
    incidentId: incident.incidentId,
    title: incident.title,
    city: incident.city || 'Bangalore',
    severity: incident.severity,
    priority: incident.priority,
    type: incident.type,
    assignedResources: resourceIdsToAssign,
    recommendations: topRecs,
    assignments: assignResult.assignments,
    canCancel: true,
    autoDispatchedAt: new Date().toISOString(),
  };

  emitIncidentAutoDispatched(autoDispatchPayload);

  return {
    success: true,
    message: `AI successfully auto-dispatched ${resourceIdsToAssign.length} resource(s) from ${incident.city || 'Metro'} fleet.`,
    ...autoDispatchPayload,
  };
};

/**
 * Cancels active resource dispatch on an incident, revoking assignments and returning
 * units to AVAILABLE status with full timeline recording.
 */
export const cancelIncidentDispatch = async (incidentId, operator = null, reason = 'Auto-dispatch cancelled by operator') => {
  const incident = await getIncidentById(incidentId);

  // Find active assignments for this incident
  const activeAssignments = await AssignmentModel.find({
    incidentId: incident.incidentId,
    status: { $in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'] },
  });

  const recalledResourceIds = [];

  for (const asn of activeAssignments) {
    recalledResourceIds.push(asn.resourceId);
    await ResourceModel.updateOne(
      { resourceId: asn.resourceId },
      {
        $set: {
          status: 'AVAILABLE',
          availability: true,
          currentAssignment: null,
          destinationLocation: null,
        },
      }
    );

    asn.status = 'CANCELLED';
    asn.cancelledAt = new Date();
    asn.notes = `${asn.notes} | ${reason}`;
    await asn.save();
  }

  // Revert incident assignedResources
  const prevStatus = incident.status;
  incident.assignedResources = [];
  if (['ASSIGNED', 'RESPONDING'].includes(incident.status)) {
    incident.status = 'ACKNOWLEDGED';
  }

  const timelineEntry = {
    timelineId: `TL-${Date.now()}-DISPCANCEL`,
    event: 'FIELD_UPDATE',
    previousStatus: prevStatus,
    newStatus: incident.status,
    changedBy: operator
      ? { userId: String(operator.id || operator._id), name: operator.name, role: operator.role }
      : { userId: 'OPERATOR-MANUAL', name: 'Duty Operator', role: 'OPERATOR' },
    timestamp: new Date(),
    reason,
    description: `Resource dispatch cancelled by operator. Recalled units: ${recalledResourceIds.join(', ') || 'none'}.`,
  };

  incident.timeline.push(timelineEntry);
  await incident.save();

  emitIncidentDispatchCancelled({
    incidentId: incident.incidentId,
    recalledResources: recalledResourceIds,
    reason,
  });
  emitIncidentTimeline(incident.incidentId, timelineEntry);
  emitIncidentStatusChanged(incident);

  return {
    success: true,
    incidentId: incident.incidentId,
    recalledResources: recalledResourceIds,
    message: `Dispatch cancelled successfully. ${recalledResourceIds.length} unit(s) recalled and returned to available staging.`,
    status: incident.status,
  };
};

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
    isSimulation: Boolean(data.isSimulation),
    simulationId: data.simulationId || null,
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
    aiAnalysis: {
      status: 'PENDING',
      model: 'emergency-classifier-v1',
      version: '1.0',
      analyzedAt: null,
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
      source: incident.source,
      severity: incident.severity,
      priority: incident.priority,
    },
  });

  // Broadcast real-time WebSocket event
  emitIncidentNew(incident);

  // Dispatch operational notification if Critical or P1
  if (incident.severity === 'CRITICAL' || incident.priority === 'P1') {
    NotificationService.notifyRole('OPERATOR', {
      type: 'CRITICAL_INCIDENT',
      title: `CRITICAL INCIDENT: #${incident.incidentId}`,
      message: `${incident.title} at ${incident.location?.address || 'Incident location'}. Immediate response required.`,
      severity: 'CRITICAL',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      metadata: { incidentId: incident.incidentId, priority: incident.priority, severity: incident.severity },
    }).catch((e) => console.warn('[Notification] Critical incident dispatch note:', e.message));
  }

  // Initial escalation evaluation (e.g. unassigned P1)
  EscalationService.evaluateIncident(incident).catch((e) =>
    console.warn('[Escalation] Initial evaluation note:', e.message)
  );

  // Phase 15: Check Critical Incident Alert rule
  if (incident.severity === 'CRITICAL') {
    evaluateCriticalIncidentAlert(incident).catch((err) => {
      console.error(`[Alert Engine] Failed to evaluate critical alert for #${incident.incidentId}:`, err.message);
    });
  }
  // Asynchronously trigger AI incident classification without blocking response
  runAiAnalysisOnIncident(incident, user).catch((err) => {
    console.error(`[AI Trigger Error] Background classification failed for #${incident.incidentId}:`, err);
  });

  return incident;
};

export const updateIncident = async (id, data, user = null) => {
  const incident = await getIncidentById(id);

  if (data.title) incident.title = data.title;
  if (data.description) incident.description = data.description;
  if (data.type) incident.type = data.type;
  if (data.severity) incident.severity = data.severity;
  if (data.priority) incident.priority = data.priority;
  if (data.delayDetected !== undefined) {
    incident.delayDetected = Boolean(data.delayDetected);
    if (data.delayMinutes !== undefined) {
      incident.delayMinutes = Number(data.delayMinutes);
    }
    if (incident.delayDetected) {
      NotificationService.notifyRole('OPERATOR', {
        type: 'RESPONSE_DELAY',
        title: `RESPONSE DELAY: #${incident.incidentId}`,
        message: `Transit delay detected for ${incident.title}. Exceeding SLA benchmark by +${incident.delayMinutes || 6} min.`,
        severity: 'HIGH',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        metadata: { incidentId: incident.incidentId, delayMinutes: incident.delayMinutes },
      }).catch((e) => console.warn('[Notification] Delay alert note:', e.message));
    }
  }
  if (data.isSimulation !== undefined) incident.isSimulation = Boolean(data.isSimulation);
  if (data.simulationId !== undefined) incident.simulationId = data.simulationId;
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

  // Evaluate escalation rules on updated incident
  EscalationService.evaluateIncident(incident).catch((e) =>
    console.warn('[Escalation] Update evaluation note:', e.message)
  );

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

  // Alert Lifecycle Synchronization:
  // When incident is resolved or cancelled, resolve all active and acknowledged alerts
  if (newStatus === 'RESOLVED' || newStatus === 'CANCELLED') {
    try {
      const activeAlerts = await AlertModel.find({
        incidentId: incident.incidentId,
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
      });
      if (activeAlerts.length > 0) {
        await AlertModel.updateMany(
          { incidentId: incident.incidentId, status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } },
          {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            'metadata.autoResolvedReason': `Incident transitioned to ${newStatus}`,
          }
        );
        activeAlerts.forEach((alt) => {
          alt.status = 'RESOLVED';
          emitAlertResolved(alt);
        });
      }
    } catch (alertErr) {
      console.warn('[IncidentService] Alert auto-resolve on incident close note:', alertErr.message);
    }
  } else if (newStatus === 'ESCALATED') {
    // When incident is escalated, acknowledge/resolve any pending escalation required alerts
    try {
      const pendingAlerts = await AlertModel.find({
        incidentId: incident.incidentId,
        type: { $in: ['ESCALATION_REQUIRED', 'UNASSIGNED_CRITICAL'] },
        status: 'ACTIVE',
      });
      if (pendingAlerts.length > 0) {
        await AlertModel.updateMany(
          { incidentId: incident.incidentId, type: { $in: ['ESCALATION_REQUIRED', 'UNASSIGNED_CRITICAL'] }, status: 'ACTIVE' },
          {
            status: 'ACKNOWLEDGED',
            acknowledgedAt: new Date(),
            'metadata.autoAcknowledgedReason': 'Incident escalated by command',
          }
        );
        pendingAlerts.forEach((alt) => {
          alt.status = 'ACKNOWLEDGED';
          emitAlertAcknowledged(alt);
        });
      }
    } catch (alertErr) {
      console.warn('[IncidentService] Alert auto-acknowledge on escalation note:', alertErr.message);
    }
  }

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

export const getIncidentTimeline = async (id, query = {}) => {
  const incident = await getIncidentById(id);
  const timeline = [...(incident.timeline || [])];
  const order = query.order?.toLowerCase() === 'desc' ? 'desc' : 'asc';
  timeline.sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return order === 'desc' ? timeB - timeA : timeA - timeB;
  });
  return timeline;
};

export const getIncidentReports = async (id) => {
  const incident = await getIncidentById(id);
  return incident.reports || [];
};

/**
 * Runs the unified AI incident processing pipeline on an incident document.
 * Fail-safe: Handles network errors, timeouts, retries, validation, and updates MongoDB & WebSockets gracefully.
 */
export const runAiAnalysisOnIncident = async (incidentDoc, user = null) => {
  try {
    // 1. Mark status as PROCESSING
    incidentDoc.aiAnalysis = {
      ...(incidentDoc.aiAnalysis?.toObject ? incidentDoc.aiAnalysis.toObject() : incidentDoc.aiAnalysis),
      status: 'PROCESSING',
      error: null,
    };
    const startEvent = {
      timelineId: `TL-${Date.now()}-AISTART`,
      event: 'AI_ANALYSIS_STARTED',
      previousStatus: incidentDoc.status,
      newStatus: incidentDoc.status,
      changedBy: { userId: 'AI-SYSTEM', name: 'PS-9 AI Engine', role: 'SYSTEM' },
      timestamp: new Date(),
      reason: 'AI classification and triage pipeline started',
      description: 'AI model commenced semantic and severity analysis',
    };
    incidentDoc.timeline.push(startEvent);
    await incidentDoc.save();
    emitIncidentAiProcessing(incidentDoc);
    emitIncidentTimeline(incidentDoc.incidentId, startEvent);

    // 2. Query nearby recent active incidents (past 72 hours) as context for duplicate detection
    let candidates = [];
    try {
      const candidateWindowHours = 72;
      const sinceDate = new Date(Date.now() - candidateWindowHours * 60 * 60 * 1000);
      candidates = await IncidentModel.find({
        _id: { $ne: incidentDoc._id },
        incidentId: { $ne: incidentDoc.incidentId },
        status: { $nin: ['RESOLVED', 'CANCELLED'] },
        createdAt: { $gte: sinceDate },
      })
        .select('incidentId title description location createdAt source type')
        .limit(50)
        .lean();
    } catch (candErr) {
      console.warn(`[AI Context Query] Warning fetching candidates for #${incidentDoc.incidentId}:`, candErr.message);
    }

    // 3. Call Unified AI Pipeline Orchestrator with retries and 5-layer validation
    const result = await analyzeIncidentPipeline(incidentDoc, candidates);

    if (result.success && result.data) {
      const aiData = result.data;

      // Ensure original is preserved or initialized
      const origClass = incidentDoc.aiAnalysis?.original?.classification || aiData.classification.type;
      const origSev = incidentDoc.aiAnalysis?.original?.severity || aiData.severity.level;
      const origPri = incidentDoc.aiAnalysis?.original?.priority || aiData.priority.level;

      const reviewReason = aiData.requiresHumanReview
        ? `Calibrated confidence below review threshold (Class: ${Math.round(aiData.classification.confidence * 100)}%, Sev: ${Math.round(aiData.severity.confidence * 100)}%)`
        : null;

      incidentDoc.aiAnalysis = {
        // Phase 1 Canonical Contract Fields
        classification: {
          ...aiData.classification,
          value: aiData.classification.type,
        },
        severityRating: {
          ...aiData.severity,
          value: aiData.severity.level,
        },
        priorityRating: {
          ...aiData.priority,
          value: aiData.priority.level,
        },
        priorityReason: aiData.priority.reason,
        reason: aiData.priority.reason || `AI classified as ${aiData.classification.type}`,
        recommendations: aiData.tactical?.recommendedUnits || [],
        riskFactors: aiData.tactical?.hazards || [],
        location: aiData.location,
        duplicate: aiData.duplicate,
        signals: aiData.signals || [],

        // Backward compatibility fields
        incidentType: aiData.classification.type,
        severity: aiData.severity.level,
        priority: aiData.priority.level,
        confidence: aiData.classification.confidence,
        reasoning: {
          incidentType: `AI classified as ${aiData.classification.type}`,
          severity: `Severity level ${aiData.severity.level}`,
          priority: aiData.priority.reason,
        },
        suggestedCorrection: aiData.classification.type !== incidentDoc.type,
        originalType: incidentDoc.type,
        isLowConfidence: Boolean(aiData.requiresHumanReview),
        detectedLocation: aiData.location?.address
          ? {
              found: true,
              address: aiData.location.address,
              latitude: aiData.location.latitude,
              longitude: aiData.location.longitude,
            }
          : null,
        model: 'emergency-pipeline-v1',
        version: '1.0',
        status: 'COMPLETED',
        error: null,
        analyzedAt: new Date(),

        // Phase 3 & 4: Review, Overrides & Ledger
        requiresHumanReview: Boolean(aiData.requiresHumanReview),
        reviewReason,
        reviewedBy: null,
        reviewedAt: null,
        original: {
          classification: origClass,
          severity: origSev,
          priority: origPri,
        },
        humanReview: {
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          reason: null,
        },
        final: {
          classification: origClass,
          severity: origSev,
          priority: origPri,
        },
        overrides: incidentDoc.aiAnalysis?.overrides || [],
      };

      // Synchronize operational fields
      if (incidentDoc.type === 'OTHER' && aiData.classification.type !== 'OTHER') {
        incidentDoc.type = aiData.classification.type;
      }
      incidentDoc.severity = aiData.severity.level;
      incidentDoc.priority = aiData.priority.level;

      // Add timeline entries for AI pipeline analysis
      const aiCompletedEvent = {
        timelineId: `TL-${Date.now()}-AICOMP`,
        event: 'AI_ANALYSIS_COMPLETED',
        previousStatus: incidentDoc.status,
        newStatus: incidentDoc.status,
        changedBy: { userId: 'AI-SYSTEM', name: 'PS-9 AI Engine', role: 'SYSTEM' },
        timestamp: new Date(),
        reason: 'Unified AI incident pipeline analysis completed',
        description: `AI classified incident as ${aiData.classification.type} (${aiData.severity.level}, ${aiData.priority.level}) with ${Math.round(aiData.classification.confidence * 100)}% confidence`,
      };
      incidentDoc.timeline.push(aiCompletedEvent);

      const classifiedEvent = {
        timelineId: `TL-${Date.now()}-AICLASS`,
        event: 'INCIDENT_CLASSIFIED',
        previousStatus: incidentDoc.status,
        newStatus: incidentDoc.status,
        changedBy: { userId: 'AI-SYSTEM', name: 'PS-9 AI Engine', role: 'SYSTEM' },
        timestamp: new Date(),
        reason: `Classified as ${aiData.classification.type}`,
        description: `Incident classified as ${aiData.classification.type} with ${Math.round(aiData.classification.confidence * 100)}% confidence`,
      };
      incidentDoc.timeline.push(classifiedEvent);

      // Handle duplicate detection results
      if (aiData.duplicate && aiData.duplicate.isDuplicate && aiData.duplicate.relatedIncidentId) {
        incidentDoc.duplicateOf = aiData.duplicate.relatedIncidentId;
        incidentDoc.duplicateAnalysis = {
          status: 'DUPLICATE_FOUND',
          hasDuplicates: true,
          hasRelated: true,
          topMatch: {
            incidentId: aiData.duplicate.relatedIncidentId,
            combinedScore: aiData.duplicate.similarity,
            classification: 'DUPLICATE',
          },
          matchesCount: 1,
          isCanonical: false,
          analyzedAt: new Date(),
          error: null,
        };

        const dupEvent = {
          timelineId: `TL-${Date.now()}-DUP`,
          event: 'DUPLICATE_DETECTED',
          previousStatus: incidentDoc.status,
          newStatus: incidentDoc.status,
          changedBy: { userId: 'AI-SYSTEM', name: 'PS-9 AI Engine', role: 'SYSTEM' },
          timestamp: new Date(),
          reason: 'Duplicate incident report detected by AI pipeline',
          description: `Potential duplicate of #${aiData.duplicate.relatedIncidentId} (${Math.round(aiData.duplicate.similarity * 100)}% match)`,
        };
        incidentDoc.timeline.push(dupEvent);
      }

      await incidentDoc.save();

      // Emit specific events
      emitIncidentAiAnalyzed(incidentDoc);
      emitIncidentTimeline(incidentDoc.incidentId, aiCompletedEvent);
      if (aiData.requiresHumanReview) {
        emitIncidentReviewRequired(incidentDoc);
      }
      if (aiData.duplicate && (aiData.duplicate.isDuplicate || aiData.duplicate.similarity >= 0.55)) {
        emitIncidentDuplicateDetected(incidentDoc, aiData.duplicate);
      }
      emitIncidentUpdated(incidentDoc);
    } else {
      // AI Service call returned error or timed out
      const errorMsg = result.error || 'AI classification failed';
      incidentDoc.aiAnalysis = {
        ...(incidentDoc.aiAnalysis?.toObject ? incidentDoc.aiAnalysis.toObject() : incidentDoc.aiAnalysis),
        status: 'FAILED',
        error: errorMsg,
      };
      await incidentDoc.save();

      emitIncidentAiFailed(incidentDoc, errorMsg);
      emitIncidentUpdated(incidentDoc);
    }

    return incidentDoc;
  } catch (err) {
    console.error(`[AI Execution] Unexpected error analyzing incident #${incidentDoc.incidentId}:`, err);
    incidentDoc.aiAnalysis = {
      ...(incidentDoc.aiAnalysis?.toObject ? incidentDoc.aiAnalysis.toObject() : incidentDoc.aiAnalysis),
      status: 'FAILED',
      error: err.message,
    };
    await incidentDoc.save().catch(() => {});
    emitIncidentAiFailed(incidentDoc, err.message);
    return incidentDoc;
  }
};

/**
 * On-demand AI analysis trigger for an incident (e.g. manual operator re-analysis).
 */
export const analyzeIncident = async (id, user = null) => {
  const incident = await getIncidentById(id);
  const updatedIncident = await runAiAnalysisOnIncident(incident, user);

  await recordAuditLog({
    user,
    action: 'AI_ANALYSIS_TRIGGERED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: {
      status: updatedIncident.aiAnalysis?.status,
      confidence: updatedIncident.aiAnalysis?.confidence,
    },
  });

  return updatedIncident;
};

/**
 * Retrieves AI analysis results for an incident.
 */
export const getIncidentAiAnalysis = async (id) => {
  const incident = await getIncidentById(id);
  return incident.aiAnalysis || { status: 'PENDING' };
};

/**
 * On-demand scan to detect duplicates and related incidents for an existing incident.
 */
export const detectIncidentDuplicates = async (id, user = null) => {
  const incident = await getIncidentById(id);
  const candidateWindowHours = 72;
  const sinceDate = new Date(Date.now() - candidateWindowHours * 60 * 60 * 1000);

  const candidates = await IncidentModel.find({
    _id: { $ne: incident._id },
    incidentId: { $ne: incident.incidentId },
    status: { $nin: ['RESOLVED', 'CANCELLED'] },
    createdAt: { $gte: sinceDate },
  })
    .select('incidentId title description location createdAt source type')
    .limit(50)
    .lean();

  const dupResult = await findDuplicatesWithAi(incident, candidates, 'RELATED');
  if (!dupResult.success) {
    throw new ValidationError(dupResult.error || 'Duplicate scan failed');
  }

  const dupData = dupResult.data;
  const topMatch = dupData.top_match;
  const hasDuplicates = Boolean(dupData.has_duplicates);
  const hasRelated = Boolean(dupData.related && dupData.related.length > 0);

  let dupStatus = 'UNIQUE';
  if (hasDuplicates) {
    dupStatus = 'DUPLICATE_FOUND';
  } else if (hasRelated) {
    dupStatus = 'RELATED_FOUND';
  }

  incident.duplicateAnalysis = {
    status: dupStatus,
    hasDuplicates,
    hasRelated,
    topMatch: topMatch
      ? {
          incidentId: topMatch.incident_b_id,
          classification: topMatch.classification,
          combinedScore: topMatch.combined_score,
          semanticSimilarity: topMatch.semantic_similarity,
          geographicSimilarity: topMatch.geographic_similarity,
          temporalSimilarity: topMatch.temporal_similarity,
          distanceKm: topMatch.distance_km,
          timeDiffHours: topMatch.time_diff_hours,
          reasoning: topMatch.reasoning,
          method: topMatch.method,
        }
      : null,
    matchesCount: (dupData.duplicates?.length || 0) + (dupData.related?.length || 0),
    clusterId: incident.duplicateAnalysis?.clusterId || null,
    isCanonical: !hasDuplicates,
    analyzedAt: new Date(),
    error: null,
  };

  if (hasDuplicates && topMatch) {
    incident.duplicateOf = topMatch.incident_b_id;
  }

  await incident.save();

  if (hasDuplicates || hasRelated) {
    emitIncidentDuplicateDetected(incident, dupData);
  }

  await recordAuditLog({
    user,
    action: 'DUPLICATE_SCAN_TRIGGERED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: {
      duplicateStatus: dupStatus,
      matchesCount: incident.duplicateAnalysis.matchesCount,
    },
  });

  return {
    incident,
    duplicateAnalysis: incident.duplicateAnalysis,
    results: dupData,
  };
};

/**
 * Direct comparison between two incidents using AI multi-factor similarity.
 */
export const compareIncidentsService = async (incidentAInput, incidentBInput) => {
  let incidentA = incidentAInput;
  let incidentB = incidentBInput;

  if (typeof incidentAInput === 'string') {
    incidentA = await getIncidentById(incidentAInput);
  }
  if (typeof incidentBInput === 'string') {
    incidentB = await getIncidentById(incidentBInput);
  }

  const result = await checkDuplicatePairWithAi(incidentA, incidentB);
  if (!result.success) {
    throw new ValidationError(result.error || 'AI duplicate comparison failed');
  }

  return result.data;
};

/**
 * Clusters active incidents into connected component groups using the AI engine.
 */
export const clusterActiveIncidentsService = async (options = {}) => {
  const { timeWindowHours = 72, threshold = 'RELATED', status, incidentIds } = options;
  let query = {};

  if (incidentIds && Array.isArray(incidentIds) && incidentIds.length > 0) {
    query = {
      $or: [
        { incidentId: { $in: incidentIds } },
        { _id: { $in: incidentIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) } },
      ],
    };
  } else {
    const sinceDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    query = { createdAt: { $gte: sinceDate } };
    if (status && Array.isArray(status) && status.length > 0) {
      query.status = { $in: status };
    } else {
      query.status = { $nin: ['RESOLVED', 'CANCELLED'] };
    }
  }

  const activeIncidents = await IncidentModel.find(query)
    .select('incidentId title description location createdAt source type status')
    .lean();

  if (activeIncidents.length === 0) {
    return {
      total_incidents: 0,
      cluster_count: 0,
      clusters: [],
      unclustered: [],
    };
  }

  const clusterResult = await clusterIncidentsWithAi(activeIncidents, threshold);
  if (!clusterResult.success) {
    throw new ValidationError(clusterResult.error || 'AI incident clustering failed');
  }

  // Persist cluster IDs to incidents in MongoDB
  if (clusterResult.data?.clusters) {
    for (const cluster of clusterResult.data.clusters) {
      const canonicalId = cluster.canonical_incident_id;
      for (const incId of cluster.incident_ids) {
        const isCanonical = incId === canonicalId;
        await IncidentModel.updateOne(
          { incidentId: incId },
          {
            $set: {
              'duplicateAnalysis.clusterId': cluster.cluster_id,
              'duplicateAnalysis.isCanonical': isCanonical,
              ...(isCanonical ? {} : { duplicateOf: canonicalId }),
            },
          }
        ).catch(() => {});
      }
    }
  }

  emitIncidentsClustered(clusterResult.data);
  return clusterResult.data;
};

/**
 * Merges duplicate incidents into a primary canonical incident.
 */
export const mergeDuplicateIncidentsService = async (
  canonicalId,
  duplicateIds,
  reason = 'Operator consolidated duplicate incidents',
  user = null
) => {
  const canonical = await getIncidentById(canonicalId);
  if (!canonical) {
    throw new NotFoundError(`Canonical incident #${canonicalId} not found`);
  }

  const duplicates = await IncidentModel.find({
    $or: [
      { incidentId: { $in: duplicateIds } },
      { _id: { $in: duplicateIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) } },
    ],
  });

  if (duplicates.length === 0) {
    throw new ValidationError('No matching duplicate incidents found to merge');
  }

  const mergedIds = [];

  for (const dup of duplicates) {
    if (dup.incidentId === canonical.incidentId || String(dup._id) === String(canonical._id)) {
      continue; // Skip self
    }

    // Move reports from duplicate into canonical
    if (Array.isArray(dup.reports) && dup.reports.length > 0) {
      for (const rep of dup.reports) {
        canonical.reports.push({
          reportId: rep.reportId || `REP-MERGED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          source: rep.source || dup.source || 'EMERGENCY_CALL',
          text: `[Merged from #${dup.incidentId}]: ${rep.text || dup.description}`,
          reliability: rep.reliability || 90,
          reportedAt: rep.reportedAt || dup.createdAt || new Date(),
        });
      }
    } else {
      canonical.reports.push({
        reportId: `REP-MERGED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source: dup.source || 'EMERGENCY_CALL',
        text: `[Merged from #${dup.incidentId}]: ${dup.description}`,
        reliability: 90,
        reportedAt: dup.createdAt || new Date(),
      });
    }

    // Mark duplicate incident as cancelled & linked to canonical
    const prevStatus = dup.status;
    dup.duplicateOf = canonical.incidentId;
    dup.status = 'CANCELLED';
    dup.duplicateAnalysis = {
      ...(dup.duplicateAnalysis?.toObject ? dup.duplicateAnalysis.toObject() : dup.duplicateAnalysis),
      status: 'DUPLICATE_FOUND',
      isCanonical: false,
    };
    dup.timeline.push({
      timelineId: `TL-${Date.now()}-MERGE`,
      event: 'STATUS_CHANGED',
      previousStatus: prevStatus,
      newStatus: 'CANCELLED',
      changedBy: user
        ? { userId: String(user.id || user._id), name: user.name, role: user.role }
        : { userId: 'SYSTEM', name: 'System', role: 'SYSTEM' },
      timestamp: new Date(),
      reason: reason || `Merged into canonical incident #${canonical.incidentId}`,
      description: `Incident merged into #${canonical.incidentId}`,
    });
    await dup.save();
    mergedIds.push(dup.incidentId);
  }

  if (mergedIds.length === 0) {
    throw new ValidationError('No valid duplicate incident IDs provided for consolidation');
  }

  // Update canonical source count
  canonical.sourceCount = canonical.reports.length;

  // Update timeline on canonical incident
  canonical.timeline.push({
    timelineId: `TL-${Date.now()}-MERGED`,
    event: 'INCIDENTS_MERGED',
    previousStatus: canonical.status,
    newStatus: canonical.status,
    changedBy: user
      ? { userId: String(user.id || user._id), name: user.name, role: user.role }
      : { userId: 'SYSTEM', name: 'System', role: 'SYSTEM' },
    timestamp: new Date(),
    reason: reason || 'Consolidated duplicate incident reports',
    description: `Merged duplicate reports from: ${mergedIds.join(', ')}`,
  });

  await canonical.save();

  await recordAuditLog({
    user,
    action: 'INCIDENTS_MERGED',
    entityType: 'INCIDENT',
    entityId: canonical.incidentId,
    metadata: {
      canonicalId: canonical.incidentId,
      mergedIncidentIds: mergedIds,
      reason,
      totalSources: canonical.sourceCount,
    },
  });

  emitIncidentMerged(canonical, mergedIds);
  emitIncidentUpdated(canonical);

  return {
    canonicalIncident: canonical,
    mergedIncidentIds: mergedIds,
    mergedCount: mergedIds.length,
    totalSources: canonical.sourceCount,
  };
};

/**
 * Retrieves all incidents currently requiring human operator review (Phase 3)
 */
export const getReviewRequiredIncidents = async (pagination = {}) => {
  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const query = {
    'aiAnalysis.requiresHumanReview': true,
    'aiAnalysis.humanReview.status': 'PENDING',
    status: { $nin: ['CANCELLED', 'RESOLVED'] },
  };

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

/**
 * Processes human operator review on an incident (Confirm or Override) (Phase 3 & Phase 4)
 */
export const reviewIncidentService = async (id, reviewPayload, user = null) => {
  const incident = await getIncidentById(id);
  const { decision, reason, overrides } = reviewPayload;

  if (decision === 'CONFIRM') {
    const origClass = incident.aiAnalysis?.original?.classification || incident.type;
    const origSev = incident.aiAnalysis?.original?.severity || incident.severity;
    const origPri = incident.aiAnalysis?.original?.priority || incident.priority;

    incident.aiAnalysis.humanReview = {
      status: 'CONFIRMED',
      reviewedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
      reviewedAt: new Date(),
      reason: reason || 'AI triage assessment confirmed by emergency operator',
    };
    incident.aiAnalysis.requiresHumanReview = false;
    incident.aiAnalysis.final = {
      classification: origClass,
      severity: origSev,
      priority: origPri,
    };

    incident.timeline.push({
      timelineId: `TL-${Date.now()}-CONFIRM`,
      event: 'AI_REVIEW',
      previousStatus: incident.status,
      newStatus: incident.status,
      changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
      timestamp: new Date(),
      reason: reason || 'AI assessment confirmed',
      description: `AI triage assessment confirmed by ${user?.name || 'Operator'} (${user?.role || 'OPERATOR'})`,
    });

    await incident.save();

    await recordAuditLog({
      user,
      action: 'AI_REVIEW_CONFIRMED',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      metadata: {
        reason,
        confirmedClassification: origClass,
        confirmedSeverity: origSev,
        confirmedPriority: origPri,
      },
    });

    emitIncidentReviewed(incident);
    emitIncidentUpdated(incident);

    return {
      incident,
      decision: 'CONFIRM',
      message: `Incident #${incident.incidentId} AI assessment confirmed successfully`,
    };
  }

  if (decision === 'OVERRIDE') {
    return await overrideIncidentService(id, { overrides, reason }, user);
  }

  throw new ValidationError(`Unknown review decision: '${decision}'. Must be CONFIRM or OVERRIDE.`);
};

/**
 * Handles authorized operator override of AI classification, severity, or priority (Phase 4)
 * Strict backend authorization check enforced.
 */
export const overrideIncidentService = async (id, overridePayload, user = null) => {
  const incident = await getIncidentById(id);
  const { overrides = {}, field, newValue, reason } = overridePayload;

  const changes = { ...overrides };
  if (field && newValue) {
    changes[field] = newValue;
  }

  const allowedFields = ['classification', 'severity', 'priority', 'type'];
  const overrideKeys = Object.keys(changes).filter((k) => allowedFields.includes(k) && changes[k]);

  if (overrideKeys.length === 0) {
    throw new ValidationError('At least one operational parameter must be overridden (classification, severity, or priority)');
  }

  // RBAC Permission Enforcement
  // ADMIN: Full override
  // OPERATOR: Full operational incident override
  // FIELD_COORDINATOR: Tactical/field updates (classification, priority)
  // MEDICAL_COORDINATOR: Medical/triage updates (severity, priority)
  const userRole = user?.role || 'OPERATOR';

  for (const k of overrideKeys) {
    if (userRole === 'ADMIN' || userRole === 'OPERATOR') {
      continue;
    }
    if (userRole === 'FIELD_COORDINATOR') {
      if (k === 'severity') {
        throw new ForbiddenError("Field Coordinators are not authorized to override incident severity rating.");
      }
    } else if (userRole === 'MEDICAL_COORDINATOR') {
      if (k === 'classification' || k === 'type') {
        throw new ForbiddenError("Medical Coordinators can only adjust severity and triage priority parameters.");
      }
    } else {
      throw new ForbiddenError(`Role '${userRole}' is not authorized to override AI parameters.`);
    }
  }

  // Preserve original values
  if (!incident.aiAnalysis) {
    incident.aiAnalysis = { status: 'PENDING' };
  }
  if (!incident.aiAnalysis.original || !incident.aiAnalysis.original.classification) {
    incident.aiAnalysis.original = {
      classification: incident.type,
      severity: incident.severity,
      priority: incident.priority,
    };
  }
  if (!incident.aiAnalysis.final) {
    incident.aiAnalysis.final = { ...incident.aiAnalysis.original };
  }
  if (!Array.isArray(incident.aiAnalysis.overrides)) {
    incident.aiAnalysis.overrides = [];
  }

  const recordedOverrides = [];

  for (const k of overrideKeys) {
    const rawNewVal = changes[k];
    const normalizedField = k === 'type' ? 'classification' : k;
    const originalVal =
      incident.aiAnalysis.original[normalizedField] ||
      incident[normalizedField === 'classification' ? 'type' : normalizedField];

    // Update final
    incident.aiAnalysis.final[normalizedField] = rawNewVal;

    // Update top level operational fields on incident
    if (normalizedField === 'classification') {
      incident.type = rawNewVal;
      incident.aiAnalysis.incidentType = rawNewVal;
    } else if (normalizedField === 'severity') {
      incident.severity = rawNewVal;
      incident.aiAnalysis.severity = rawNewVal;
    } else if (normalizedField === 'priority') {
      incident.priority = rawNewVal;
      incident.aiAnalysis.priority = rawNewVal;
    }

    const overrideEntry = {
      field: normalizedField,
      originalValue: String(originalVal || 'UNKNOWN'),
      newValue: String(rawNewVal),
      reason: reason || 'Operator manual override',
      overriddenBy: user
        ? { userId: String(user.id || user._id), name: user.name, role: user.role }
        : { userId: 'OPERATOR', name: 'Emergency Operator', role: 'OPERATOR' },
      timestamp: new Date(),
    };

    incident.aiAnalysis.overrides.push(overrideEntry);
    recordedOverrides.push(overrideEntry);

    // Audit log per overridden field for complete traceability
    await recordAuditLog({
      user,
      action: 'AI_OVERRIDE',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      metadata: {
        field: normalizedField,
        originalValue: String(originalVal || 'UNKNOWN'),
        newValue: String(rawNewVal),
        reason: reason || 'Operator manual override',
        timestamp: new Date(),
      },
    });

    incident.timeline.push({
      timelineId: `TL-${Date.now()}-OVR-${normalizedField}`,
      event: 'AI_OVERRIDE',
      previousStatus: incident.status,
      newStatus: incident.status,
      changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
      timestamp: new Date(),
      reason: reason || 'Operational AI parameter override',
      description: `AI ${normalizedField} overridden: ${originalVal} → ${rawNewVal} (${reason || 'Operator override'})`,
    });
  }

  incident.aiAnalysis.humanReview = {
    status: 'OVERRIDDEN',
    reviewedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
    reviewedAt: new Date(),
    reason: reason || 'Operator manual override',
  };
  incident.aiAnalysis.requiresHumanReview = false;

  await incident.save();

  emitIncidentOverridden(incident, recordedOverrides[0]);
  emitIncidentUpdated(incident);

  return {
    incident,
    overrides: recordedOverrides,
    final: incident.aiAnalysis.final,
    message: `Successfully overridden ${recordedOverrides.length} field(s) on #${incident.incidentId}`,
  };
};

/**
 * Attaches an incoming report/evidence to an existing incident (Phase 5)
 */
export const addReportToIncidentService = async (id, reportData, user = null) => {
  const incident = await getIncidentById(id);

  const reportId = `REP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const source = reportData.source || 'CITIZEN';
  const text = reportData.text;
  const reliability = typeof reportData.reliability === 'number' ? reportData.reliability : 90;

  const newReport = {
    reportId,
    source,
    text,
    reliability,
    reportedAt: new Date(),
  };

  incident.reports.push(newReport);
  incident.sourceCount = incident.reports.length;

  incident.timeline.push({
    timelineId: `TL-${Date.now()}-REP`,
    event: 'FIELD_UPDATE',
    previousStatus: incident.status,
    newStatus: incident.status,
    changedBy: user ? { userId: String(user.id || user._id), name: user.name, role: user.role } : null,
    timestamp: new Date(),
    reason: 'Additional intelligence report attached',
    description: `Report #${reportId} added via ${source}: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
  });

  await incident.save();

  await recordAuditLog({
    user,
    action: 'REPORT_ATTACHED',
    entityType: 'INCIDENT',
    entityId: incident.incidentId,
    metadata: {
      reportId,
      source,
      reliability,
      totalSources: incident.sourceCount,
    },
  });

  emitIncidentUpdated(incident);

  return {
    incident,
    report: newReport,
    totalSources: incident.sourceCount,
  };
};

/**
 * Retrieves related incidents, consolidated reports, and duplicate candidates (Phase 5)
 */
export const getRelatedIncidentsService = async (id) => {
  const incident = await getIncidentById(id);

  const relatedIncidents = await IncidentModel.find({
    $or: [
      { duplicateOf: incident.incidentId },
      { incidentId: incident.duplicateOf },
    ],
  }).select('incidentId title description status severity priority createdAt source reports duplicateOf');

  return {
    incident,
    primaryIncidentId: incident.duplicateOf || incident.incidentId,
    isCanonical: !incident.duplicateOf,
    sourceCount: incident.reports?.length || incident.sourceCount || 1,
    reports: incident.reports || [],
    relatedIncidents,
    duplicateAnalysis: incident.duplicateAnalysis || null,
  };
};



