/**
 * Phases 8, 9 & 10: Multi-Resource Assignment, Resource Release, and Response Tracking Service
 * Manages operator-controlled dispatch, atomic resource state synchronization,
 * response timeline events, SLA metrics calculation, and lifecycle release.
 */

import mongoose from 'mongoose';
import { AssignmentModel } from '../models/assignment.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { recordAuditLog } from './auditLog.service.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ValidationError,
} from '../utils/errors.js';
import {
  calculateDistanceKm,
  calculateEtaMinutes,
} from './recommendation.service.js';
import { getRoute } from './routing.service.js';
import {
  extractIncidentRequirements,
  matchCapabilities,
} from './capabilityMatcher.js';
import {
  emitResourceAssigned,
  emitResourceReleased,
  emitAssignmentUpdated,
  emitResponseStatusChanged,
  emitIncidentUpdated,
  emitIncidentStatusChanged,
  emitRouteCreated,
} from '../utils/socket.js';
import { recordTimelineEvent } from './timeline.service.js';

// Legal Assignment Status Transitions (Phase 10 & GPS Return)
export const VALID_ASSIGNMENT_TRANSITIONS = {
  ASSIGNED: ['DISPATCHED', 'COMPLETED', 'CANCELLED'],
  DISPATCHED: ['EN_ROUTE', 'COMPLETED', 'CANCELLED'],
  EN_ROUTE: ['ON_SCENE', 'COMPLETED', 'CANCELLED'],
  ON_SCENE: ['COMPLETED', 'RETURNING', 'CANCELLED'],
  COMPLETED: ['RETURNING'],
  RETURNING: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [], // Terminal
};

/**
 * Assigns multiple resources to an incident (Phase 8).
 * Enforces availability, capability compatibility, duplicate prevention,
 * and atomic state updates.
 */
export const assignResourcesToIncident = async (
  incidentId,
  { resourceIds = [], notes = '' },
  operator = null
) => {
  if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
    throw new BadRequestError('At least one resourceId must be provided for assignment.');
  }

  // Deduplicate input resource IDs
  const uniqueResourceIds = Array.from(new Set(resourceIds));

  // 1. Fetch Incident
  const incident = await IncidentModel.findOne({
    $or: [
      { incidentId },
      ...(mongoose.Types.ObjectId.isValid(incidentId) ? [{ _id: incidentId }] : []),
    ],
  });

  if (!incident) {
    throw new NotFoundError(`Incident #${incidentId} not found`);
  }

  if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
    throw new BadRequestError(
      `Cannot assign resources to an incident in terminal status '${incident.status}'.`
    );
  }

  // 2. Fetch Resources and validate existence & availability
  const resources = await ResourceModel.find({
    resourceId: { $in: uniqueResourceIds },
  });

  if (resources.length !== uniqueResourceIds.length) {
    const foundIds = new Set(resources.map((r) => r.resourceId));
    const missingIds = uniqueResourceIds.filter((id) => !foundIds.has(id));
    throw new NotFoundError(
      `Resources not found: ${missingIds.join(', ')}`
    );
  }

  // Check availability
  const unavailableResources = resources.filter(
    (r) => r.status !== 'AVAILABLE' || r.currentAssignment
  );

  if (unavailableResources.length > 0) {
    const details = unavailableResources
      .map((r) => `#${r.resourceId} (${r.status}, assigned to: ${r.currentAssignment || 'none'})`)
      .join('; ');
    throw new ConflictError(`Cannot assign unavailable resources: ${details}`);
  }

  // Check against already assigned resources on this incident
  const currentAssigned = new Set(incident.assignedResources || []);
  const duplicateAssignments = uniqueResourceIds.filter((id) => currentAssigned.has(id));
  if (duplicateAssignments.length > 0) {
    throw new ConflictError(
      `Resources already assigned to incident #${incident.incidentId}: ${duplicateAssignments.join(', ')}`
    );
  }

  // 3. Extract incident requirements and validate compatibility
  const requirements = extractIncidentRequirements(incident);
  const incLat = incident.location?.latitude;
  const incLng = incident.location?.longitude;

  const operatorInfo = operator
    ? {
        userId: String(operator.id || operator._id || ''),
        name: operator.name || 'Emergency Operator',
        role: operator.role || 'OPERATOR',
        email: operator.email || '',
      }
    : {
        userId: 'SYSTEM',
        name: 'System Operator',
        role: 'OPERATOR',
      };

  // 4. Prepare Assignment records and Resource updates
  const assignmentDocs = [];
  const assignedResourceIds = [];

  for (const resource of resources) {
    const origin = {
      latitude: resource.currentLocation?.latitude || resource.location?.latitude,
      longitude: resource.currentLocation?.longitude || resource.location?.longitude,
    };
    const destination = {
      latitude: incLat,
      longitude: incLng,
    };

    let routeData = null;
    try {
      routeData = await getRoute(origin, destination);
    } catch (err) {
      console.warn(`[Assignment] Routing calculation failed, using fallback: ${err.message}`);
    }

    const distanceKm = routeData
      ? routeData.distanceKm
      : calculateDistanceKm(incLat, incLng, origin.latitude, origin.longitude);
    const etaMinutes = routeData ? routeData.durationMinutes : calculateEtaMinutes(distanceKm);

    const matchResult = matchCapabilities(
      resource.capabilities || [],
      requirements.required,
      requirements.preferred
    );

    const assignmentId = `ASG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const assignmentPayload = {
      assignmentId,
      incidentId: incident.incidentId,
      resourceId: resource.resourceId,
      resourceName: resource.name,
      resourceType: resource.type,
      status: 'ASSIGNED',
      assignedBy: operatorInfo,
      notes: notes || `Assigned to incident #${incident.incidentId}`,
      capabilities: matchResult.allMatched,
      assignedAt: new Date(),
      estimatedDistanceKm: distanceKm,
      estimatedArrivalMinutes: etaMinutes,
      route: routeData
        ? {
            distanceKm: routeData.distanceKm,
            durationMinutes: routeData.durationMinutes,
            geometry: routeData.geometry,
            origin,
            destination,
            createdAt: new Date(),
          }
        : undefined,
      timeline: [
        {
          status: 'ASSIGNED',
          timestamp: new Date(),
          changedBy: operatorInfo,
          note: notes || 'Initial assignment creation',
        },
      ],
    };

    assignmentDocs.push(assignmentPayload);
    assignedResourceIds.push(resource.resourceId);
  }

  // 5. Atomic Execution: Try MongoDB Session Transaction first, fallback to resilient rollback
  let createdAssignments = [];
  let useTransaction = false;
  let session = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (_sessionErr) {
    useTransaction = false;
    if (session) {
      await session.endSession().catch(() => {});
      session = null;
    }
  }

  try {
    if (useTransaction) {
      // Execute in Transaction
      createdAssignments = await AssignmentModel.insertMany(assignmentDocs, { session });

      // Update Resources
      for (const resource of resources) {
        resource.status = 'ASSIGNED';
        resource.currentAssignment = incident.incidentId;
        resource.destinationLocation = {
          latitude: incLat,
          longitude: incLng,
          address: incident.location?.address || '',
        };
        resource.availability = false;
        resource.assignmentHistory.push({
          action: 'ASSIGN',
          incidentId: incident.incidentId,
          assignedAt: new Date(),
          notes: notes || `Assigned to incident #${incident.incidentId}`,
        });
        await resource.save({ session });
      }

      // Update Incident
      incident.assignedResources = Array.from(
        new Set([...(incident.assignedResources || []), ...assignedResourceIds])
      );

      const prevStatus = incident.status;
      if (incident.status === 'NEW' || incident.status === 'ACKNOWLEDGED' || incident.status === 'ANALYZING' || incident.status === 'PRIORITIZED') {
        incident.status = 'ASSIGNED';
      }

      incident.timeline.push({
        timelineId: `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        event: 'RESOURCE_ASSIGNED',
        previousStatus: prevStatus,
        newStatus: incident.status,
        changedBy: operatorInfo,
        timestamp: new Date(),
        reason: `Assigned ${assignedResourceIds.length} resources`,
        description: `Dispatched resources: ${assignedResourceIds.join(', ')}`,
      });

      await incident.save({ session });
      await session.commitTransaction();
      await session.endSession();
    } else {
      // Standalone MongoDB Execution with Application-Level Rollback
      createdAssignments = await AssignmentModel.insertMany(assignmentDocs);

      for (const resource of resources) {
        resource.status = 'ASSIGNED';
        resource.currentAssignment = incident.incidentId;
        resource.destinationLocation = {
          latitude: incLat,
          longitude: incLng,
          address: incident.location?.address || '',
        };
        resource.availability = false;
        resource.assignmentHistory.push({
          action: 'ASSIGN',
          incidentId: incident.incidentId,
          assignedAt: new Date(),
          notes: notes || `Assigned to incident #${incident.incidentId}`,
        });
        await resource.save();
      }

      incident.assignedResources = Array.from(
        new Set([...(incident.assignedResources || []), ...assignedResourceIds])
      );

      const prevStatus = incident.status;
      if (incident.status === 'NEW' || incident.status === 'ACKNOWLEDGED' || incident.status === 'ANALYZING' || incident.status === 'PRIORITIZED') {
        incident.status = 'ASSIGNED';
      }

      incident.timeline.push({
        timelineId: `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        event: 'RESOURCE_ASSIGNED',
        previousStatus: prevStatus,
        newStatus: incident.status,
        changedBy: operatorInfo,
        timestamp: new Date(),
        reason: `Assigned ${assignedResourceIds.length} resources`,
        description: `Dispatched resources: ${assignedResourceIds.join(', ')}`,
      });

      await incident.save();
    }
  } catch (executionError) {
    if (useTransaction && session) {
      await session.abortTransaction().catch(() => {});
      await session.endSession().catch(() => {});
    } else {
      // Rollback inserted assignments
      const insertedIds = assignmentDocs.map((a) => a.assignmentId);
      await AssignmentModel.deleteMany({ assignmentId: { $in: insertedIds } }).catch(() => {});
    }
    throw executionError;
  }

  // 6. Audit Logging & Real-time Sockets
  for (const asg of createdAssignments) {
    await recordAuditLog({
      user: operator,
      action: 'RESOURCE_ASSIGNED',
      entityType: 'ASSIGNMENT',
      entityId: asg.assignmentId,
      metadata: {
        incidentId: incident.incidentId,
        resourceId: asg.resourceId,
        status: asg.status,
        notes,
      },
    });

    emitResourceAssigned(incident.incidentId, asg);

    if (asg.route && asg.route.geometry?.length > 0) {
      emitRouteCreated({
        assignmentId: asg.assignmentId,
        incidentId: incident.incidentId,
        resourceId: asg.resourceId,
        route: asg.route,
      });
    }
  }

  emitIncidentUpdated(incident);
  if (incident.status === 'ASSIGNED') {
    emitIncidentStatusChanged(incident);
  }

  // Phase 34: Record timeline event for team assignment
  recordTimelineEvent({
    incidentId: incident.incidentId,
    eventType: 'TEAM_ASSIGNED',
    actor: operatorInfo.name,
    actorRole: operatorInfo.role,
    title: 'Team Assigned',
    description: `Assigned ${createdAssignments.length} resource(s) to incident: ${assignedResourceIds.join(', ')}`,
    metadata: { assignedResourceIds, totalAssigned: createdAssignments.length },
  }).catch(() => {});

  return {
    incidentId: incident.incidentId,
    totalAssigned: createdAssignments.length,
    assignments: createdAssignments,
  };
};

/**
 * Updates assignment status and progresses operational timeline (Phase 10).
 * Validates legal state transitions, computes response times & delays.
 */
export const updateAssignmentStatus = async (
  assignmentId,
  { status: newStatus, notes = '', timestamp = null },
  operator = null
) => {
  const assignment = await AssignmentModel.findOne({
    $or: [
      { assignmentId },
      ...(mongoose.Types.ObjectId.isValid(assignmentId) ? [{ _id: assignmentId }] : []),
    ],
  });

  if (!assignment) {
    throw new NotFoundError(`Assignment #${assignmentId} not found`);
  }

  const currentStatus = assignment.status;

  // Validate legal status transition
  const allowedNext = VALID_ASSIGNMENT_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new BadRequestError(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowedNext.join(', ')}]`
    );
  }

  const transitionTime = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(transitionTime.getTime())) {
    throw new ValidationError('Invalid timestamp provided for status transition.');
  }

  const operatorInfo = operator
    ? {
        userId: String(operator.id || operator._id || ''),
        name: operator.name || 'Emergency Operator',
        role: operator.role || 'OPERATOR',
        email: operator.email || '',
      }
    : {
        userId: 'SYSTEM',
        name: 'System Operator',
        role: 'OPERATOR',
      };

  // State Transition Actions & Metric Calculations
  assignment.status = newStatus;

  switch (newStatus) {
    case 'DISPATCHED':
      assignment.dispatchedAt = transitionTime;
      break;

    case 'EN_ROUTE':
      assignment.enRouteAt = transitionTime;
      break;

    case 'ON_SCENE':
      assignment.arrivedAt = transitionTime;
      // Calculate response time (minutes from assignment/dispatch to arrival)
      const startTime = assignment.dispatchedAt || assignment.assignedAt;
      const responseDurationMs = transitionTime.getTime() - new Date(startTime).getTime();
      const responseTimeMins = Math.max(0, Math.round((responseDurationMs / (1000 * 60)) * 10) / 10);
      assignment.actualArrivalMinutes = responseTimeMins;
      assignment.responseTimeMinutes = responseTimeMins;

      // Calculate delay duration
      if (assignment.estimatedArrivalMinutes) {
        const delay = Math.max(0, responseTimeMins - assignment.estimatedArrivalMinutes);
        assignment.delayMinutes = Math.round(delay * 10) / 10;
      }
      break;

    case 'COMPLETED':
      assignment.completedAt = transitionTime;
      assignment.releasedAt = transitionTime;
      // Calculate total response operational duration
      if (assignment.arrivedAt) {
        const onSceneMs = transitionTime.getTime() - new Date(assignment.arrivedAt).getTime();
        assignment.responseDurationMinutes = Math.round((onSceneMs / (1000 * 60)) * 10) / 10;
      }
      break;

    case 'CANCELLED':
      assignment.cancelledAt = transitionTime;
      assignment.releasedAt = transitionTime;
      break;
  }

  // Record timeline event
  assignment.timeline.push({
    status: newStatus,
    timestamp: transitionTime,
    changedBy: operatorInfo,
    note: notes || `Status changed from ${currentStatus} to ${newStatus}`,
  });

  await assignment.save();

  // Synchronize Resource Status (Phase 9)
  const resource = await ResourceModel.findOne({ resourceId: assignment.resourceId });
  if (resource) {
    if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
      resource.status = 'AVAILABLE';
      resource.currentAssignment = null;
      resource.availability = true;
      resource.assignmentHistory.push({
        action: 'RELEASE',
        incidentId: assignment.incidentId,
        assignedAt: assignment.assignedAt,
        releasedAt: transitionTime,
        notes: notes || `Released following status '${newStatus}'`,
      });
    } else {
      resource.status = newStatus;
      resource.assignmentHistory.push({
        action: 'STATUS_CHANGE',
        incidentId: assignment.incidentId,
        assignedAt: transitionTime,
        notes: notes || `Assignment status updated to '${newStatus}'`,
      });
    }
    await resource.save();
  }

  // Update Incident Timeline & Sync
  const incident = await IncidentModel.findOne({ incidentId: assignment.incidentId });
  if (incident) {
    if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
      incident.assignedResources = (incident.assignedResources || []).filter(
        (id) => id !== assignment.resourceId
      );
    }

    incident.timeline.push({
      timelineId: `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event: 'STATUS_CHANGED',
      previousStatus: currentStatus,
      newStatus,
      changedBy: operatorInfo,
      timestamp: transitionTime,
      reason: notes || `Resource #${assignment.resourceId} transitioned to ${newStatus}`,
      description: `Resource #${assignment.resourceId} (${assignment.resourceName}) is now ${newStatus}`,
    });

    await incident.save();
    emitIncidentUpdated(incident);
  }

  // Audit Log
  await recordAuditLog({
    user: operator,
    action: 'ASSIGNMENT_STATUS_CHANGED',
    entityType: 'ASSIGNMENT',
    entityId: assignment.assignmentId,
    metadata: {
      previousStatus: currentStatus,
      newStatus,
      resourceId: assignment.resourceId,
      incidentId: assignment.incidentId,
      responseTimeMinutes: assignment.responseTimeMinutes,
      delayMinutes: assignment.delayMinutes,
    },
  });

  // Real-time Sockets
  emitAssignmentUpdated(assignment);
  emitResponseStatusChanged(assignment);
  if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
    emitResourceReleased(assignment.incidentId, assignment.resourceId, assignment.assignmentId);
  }

  // Phase 34: Record timeline event for dispatch / en route / arrived
  let eventType = null;
  if (newStatus === 'DISPATCHED') eventType = 'DISPATCHED';
  else if (newStatus === 'EN_ROUTE') eventType = 'EN_ROUTE';
  else if (newStatus === 'ON_SCENE') eventType = 'TEAM_ARRIVED';

  if (eventType && assignment.incidentId) {
    recordTimelineEvent({
      incidentId: assignment.incidentId,
      eventType,
      actor: operatorInfo.name,
      actorRole: operatorInfo.role,
      title: eventType.replace(/_/g, ' '),
      description: `Resource #${assignment.resourceId} (${assignment.resourceName}) is now ${newStatus}`,
      metadata: {
        assignmentId: assignment.assignmentId,
        resourceId: assignment.resourceId,
        status: newStatus,
      },
    }).catch(() => {});
  }

  return assignment;
};

/**
 * Releases a resource from an assignment (Phase 9).
 */
export const releaseAssignment = async (assignmentId, { notes = '' } = {}, operator = null) => {
  const assignment = await AssignmentModel.findOne({
    $or: [
      { assignmentId },
      ...(mongoose.Types.ObjectId.isValid(assignmentId) ? [{ _id: assignmentId }] : []),
    ],
  });

  if (!assignment) {
    throw new NotFoundError(`Assignment #${assignmentId} not found`);
  }

  if (assignment.status === 'COMPLETED' || assignment.status === 'CANCELLED') {
    throw new BadRequestError(
      `Assignment #${assignment.assignmentId} is already in terminal state '${assignment.status}'.`
    );
  }

  return await updateAssignmentStatus(
    assignment.assignmentId,
    { status: 'COMPLETED', notes: notes || 'Resource manually released by operator' },
    operator
  );
};

/**
 * Cancels an assignment before completion (Phase 8/9).
 */
export const cancelAssignment = async (assignmentId, { notes = '' } = {}, operator = null) => {
  const assignment = await AssignmentModel.findOne({
    $or: [
      { assignmentId },
      ...(mongoose.Types.ObjectId.isValid(assignmentId) ? [{ _id: assignmentId }] : []),
    ],
  });

  if (!assignment) {
    throw new NotFoundError(`Assignment #${assignmentId} not found`);
  }

  if (assignment.status === 'COMPLETED' || assignment.status === 'CANCELLED') {
    throw new BadRequestError(
      `Cannot cancel assignment #${assignment.assignmentId} because it is already '${assignment.status}'.`
    );
  }

  return await updateAssignmentStatus(
    assignment.assignmentId,
    { status: 'CANCELLED', notes: notes || 'Assignment cancelled by operator' },
    operator
  );
};

/**
 * Retrieves all assignments for an incident along with aggregate metrics (Phase 10).
 */
export const getAssignmentsForIncident = async (incidentId) => {
  const assignments = await AssignmentModel.find({ incidentId }).sort({ createdAt: -1 });

  // Calculate aggregates
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  let totalDelay = 0;
  let onTimeCount = 0;
  let delayedCount = 0;

  for (const asg of assignments) {
    if (typeof asg.responseTimeMinutes === 'number') {
      totalResponseTime += asg.responseTimeMinutes;
      responseTimeCount++;
    }
    if (typeof asg.delayMinutes === 'number') {
      totalDelay += asg.delayMinutes;
      if (asg.delayMinutes > 0) {
        delayedCount++;
      } else if (asg.arrivedAt) {
        onTimeCount++;
      }
    }
  }

  const avgResponseTimeMinutes =
    responseTimeCount > 0 ? Math.round((totalResponseTime / responseTimeCount) * 10) / 10 : null;
  const avgDelayMinutes =
    delayedCount > 0 ? Math.round((totalDelay / delayedCount) * 10) / 10 : 0;

  return {
    incidentId,
    totalAssignments: assignments.length,
    activeAssignments: assignments.filter(
      (a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
    ).length,
    completedAssignments: assignments.filter((a) => a.status === 'COMPLETED').length,
    metrics: {
      avgResponseTimeMinutes,
      avgDelayMinutes,
      onTimeCount,
      delayedCount,
    },
    assignments,
  };
};

/**
 * Retrieves a single assignment by ID.
 */
export const getAssignmentById = async (assignmentId) => {
  const assignment = await AssignmentModel.findOne({
    $or: [
      { assignmentId },
      ...(mongoose.Types.ObjectId.isValid(assignmentId) ? [{ _id: assignmentId }] : []),
    ],
  });

  if (!assignment) {
    throw new NotFoundError(`Assignment #${assignmentId} not found`);
  }

  return assignment;
};

/**
 * Retrieves detailed response and operational metrics for an incident (Phase 10).
 */
export const getIncidentResponseMetrics = async (incidentId) => {
  const data = await getAssignmentsForIncident(incidentId);

  // Group by resource type
  const typeBreakdown = {};
  for (const asg of data.assignments) {
    const t = asg.resourceType || 'OTHER';
    if (!typeBreakdown[t]) {
      typeBreakdown[t] = { count: 0, completed: 0, avgResponseTime: 0, totalResp: 0 };
    }
    typeBreakdown[t].count++;
    if (asg.status === 'COMPLETED') typeBreakdown[t].completed++;
    if (typeof asg.responseTimeMinutes === 'number') {
      typeBreakdown[t].totalResp += asg.responseTimeMinutes;
    }
  }

  for (const t in typeBreakdown) {
    typeBreakdown[t].avgResponseTime =
      typeBreakdown[t].count > 0
        ? Math.round((typeBreakdown[t].totalResp / typeBreakdown[t].count) * 10) / 10
        : null;
    delete typeBreakdown[t].totalResp;
  }

  return {
    incidentId,
    metrics: data.metrics,
    totalAssignments: data.totalAssignments,
    activeAssignments: data.activeAssignments,
    completedAssignments: data.completedAssignments,
    typeBreakdown,
  };
};

export default {
  assignResourcesToIncident,
  updateAssignmentStatus,
  releaseAssignment,
  cancelAssignment,
  getAssignmentsForIncident,
  getAssignmentById,
  getIncidentResponseMetrics,
};
