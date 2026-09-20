import { Server as SocketIOServer } from 'socket.io';

let ioInstance = null;

/**
 * Initialize Socket.IO with the HTTP server instance
 */
export const initSocketServer = (httpServer, clientOrigin = '*') => {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room based on user role or id
    socket.on('join', ({ userId, role } = {}) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
      if (role) {
        socket.join(`role:${role}`);
      }
      socket.join('operations');
    });

    socket.on('join:incident', (incidentId) => {
      if (incidentId) {
        socket.join(`incident:${incidentId}`);
      }
    });

    socket.on('join:simulation', (simulationId) => {
      if (simulationId) {
        socket.join(`simulation:${simulationId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected (${socket.id}): ${reason}`);
    });
  });

  console.log('[Socket.IO] Real-time engine initialized.');
  return ioInstance;
};

/**
 * Retrieve the active Socket.IO server instance
 */
export const getSocketServer = () => {
  return ioInstance;
};

/**
 * Broadcast when a new incident is created
 */
export const emitIncidentNew = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:new', incident);
  }
};

/**
 * Broadcast when an existing incident is updated
 */
export const emitIncidentUpdated = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:updated', incident);
  }
};

/**
 * Broadcast when an incident's operational status changes
 */
export const emitIncidentStatusChanged = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:statusChanged', incident);
  }
};

/**
 * Broadcast when an incident enters AI classification / processing
 */
export const emitIncidentAiProcessing = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:aiProcessing', {
      incidentId: incident._id?.toString() || incident.id,
      aiAnalysis: incident.aiAnalysis,
    });
  }
};

/**
 * Broadcast when an incident completes AI classification
 */
export const emitIncidentAiAnalyzed = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:aiAnalyzed', {
      incidentId: incident._id?.toString() || incident.id,
      incident,
      aiAnalysis: incident.aiAnalysis,
    });
  }
};

/**
 * Broadcast when an incident timeline event occurs
 */
export const emitIncidentTimeline = (incidentId, timelineEvent) => {
  if (ioInstance) {
    ioInstance.to(`incident:${incidentId}`).emit('incident:timeline', { incidentId, event: timelineEvent });
    ioInstance.emit('incident:timelineUpdated', { incidentId, event: timelineEvent });
  }
};

/**
 * Broadcast when an incident's AI classification fails
 */
export const emitIncidentAiFailed = (incident, error) => {
  if (ioInstance) {
    ioInstance.emit('incident:aiFailed', {
      incidentId: incident._id?.toString() || incident.id,
      aiAnalysis: incident.aiAnalysis,
      error: error || incident.aiAnalysis?.error,
    });
  }
};

/**
 * Broadcast when an incident is analyzed and duplicate/related incidents are detected
 */
export const emitIncidentDuplicateDetected = (incident, duplicateData) => {
  if (ioInstance) {
    ioInstance.emit('incident:duplicateDetected', {
      incidentId: incident.incidentId || incident._id?.toString(),
      duplicateAnalysis: incident.duplicateAnalysis || duplicateData,
      duplicateOf: incident.duplicateOf,
      topMatch: duplicateData?.top_match || incident.duplicateAnalysis?.topMatch,
    });
  }
};

/**
 * Broadcast when a batch clustering operation consolidates incident groups
 */
export const emitIncidentsClustered = (clusterData) => {
  if (ioInstance) {
    ioInstance.emit('incident:clustered', clusterData);
  }
};

/**
 * Broadcast when duplicate incidents are merged into a canonical incident
 */
export const emitIncidentMerged = (canonicalIncident, mergedIncidentIds) => {
  if (ioInstance) {
    ioInstance.emit('incident:merged', {
      canonicalIncidentId: canonicalIncident.incidentId || canonicalIncident._id?.toString(),
      mergedIncidentIds,
      reportCount: canonicalIncident.reports?.length || 0,
      updatedStatus: canonicalIncident.status,
    });
  }
};

/**
 * Broadcast when an incident requires human operator review (confidence < 0.70)
 */
export const emitIncidentReviewRequired = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:reviewRequired', {
      incidentId: incident.incidentId || incident._id?.toString(),
      incident,
      aiAnalysis: incident.aiAnalysis,
      reason: incident.aiAnalysis?.reviewReason || 'Low AI confidence triage required',
    });
  }
};

/**
 * Broadcast when resource recommendations are generated for an incident (Phase 6)
 */
export const emitResourceRecommended = (incidentId, recommendationData) => {
  if (ioInstance) {
    ioInstance.emit('resource:recommended', {
      incidentId,
      ...recommendationData,
    });
  }
};

/**
 * Broadcast when a human operator confirms an AI incident assessment
 */
export const emitIncidentReviewed = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:reviewed', {
      incidentId: incident.incidentId || incident._id?.toString(),
      incident,
      humanReview: incident.aiAnalysis?.humanReview,
      reviewedBy: incident.aiAnalysis?.reviewedBy,
    });
  }
};

/**
 * Broadcast when resources are assigned/dispatched to an incident (Phase 8)
 */
export const emitResourceAssigned = (incidentId, assignment) => {
  if (ioInstance) {
    ioInstance.emit('resource:assigned', {
      incidentId,
      assignment,
    });
  }
};

/**
 * Broadcast when an authorized operator overrides AI classifications or ratings
 */
export const emitIncidentOverridden = (incident, overrideEntry = null) => {
  if (ioInstance) {
    ioInstance.emit('incident:aiOverridden', {
      incidentId: incident.incidentId || incident._id?.toString(),
      incident,
      overrideEntry,
      aiAnalysis: incident.aiAnalysis,
    });
  }
};

/**
/**
 * Broadcast when a resource is released from an assignment (Phase 9)
 */
export const emitResourceReleased = (incidentId, resourceId, assignmentId) => {
  if (ioInstance) {
    ioInstance.emit('resource:released', {
      incidentId,
      resourceId,
      assignmentId,
      releasedAt: new Date(),
    });
  }
};

/**
 * PHASE 11: Broadcast when an assignment status or lifecycle metrics change
 */
export const emitAssignmentUpdated = (assignment) => {
  if (ioInstance) {
    ioInstance.emit('assignment:updated', assignment);
  }
};

/**
 * PHASE 11: Broadcast when a response team is updated
 */
export const emitTeamUpdated = (team) => {
  if (ioInstance) {
    ioInstance.emit('team:updated', team);
  }
};

/**
 * PHASE 11: Broadcast when a resource is updated
 */
export const emitResourceUpdated = (resource) => {
  if (ioInstance) {
    ioInstance.emit('resource:updated', resource);
  }
};

/**
 * PHASE 12: Broadcast when a team's real-time GPS location updates
 */
export const emitTeamLocation = ({ teamId, latitude, longitude, timestamp }) => {
  if (ioInstance) {
    ioInstance.emit('team:location', {
      teamId,
      latitude,
      longitude,
      timestamp: timestamp || new Date().toISOString(),
    });
  }
};

/**
 * PHASE 13: Broadcast when an assignment's ETA is updated
 */
export const emitAssignmentEtaUpdated = ({
  assignmentId,
  incidentId,
  teamId,
  distanceKm,
  estimatedArrivalMinutes,
  expectedArrivalAt,
}) => {
  if (ioInstance) {
    ioInstance.emit('assignment:etaUpdated', {
      assignmentId,
      incidentId,
      teamId,
      distanceKm,
      estimatedArrivalMinutes,
      expectedArrivalAt,
    });
  }
};

/**
 * PHASE 14 & Upstream: Broadcast when an assignment becomes delayed past its SLA
 */
export const emitResponseDelayed = (data) => {
  if (ioInstance) {
    const payload = {
      assignmentId: data.assignmentId,
      incidentId: data.incidentId,
      teamId: data.teamId,
      delayMinutes: data.delayMinutes,
      detectedAt: data.detectedAt || new Date().toISOString(),
      ...data,
    };
    ioInstance.emit('response:delayed', payload);
    ioInstance.to('operations').emit('incident:responseDelayed', payload);
    ioInstance.emit('incident:responseDelayed', payload);
  }
};

/**
 * PHASE 15: Broadcast when a new emergency alert is generated
 */
export const emitAlertNew = (alert) => {
  if (ioInstance) {
    ioInstance.emit('alert:new', alert);
  }
};

/**
 * PHASE 15: Broadcast when an emergency alert is acknowledged
 */
export const emitAlertAcknowledged = (alert) => {
  if (ioInstance) {
    ioInstance.emit('alert:acknowledged', alert);
  }
};

/**
 * PHASE 15: Broadcast when an emergency alert is resolved
 */
export const emitAlertResolved = (alert) => {
  if (ioInstance) {
    ioInstance.emit('alert:resolved', alert);
  }
};

/**
 * Broadcast when an escalation is triggered
 */
export const emitEscalationCreated = (escalation, incident = null) => {
  if (ioInstance) {
    // Broadcast to targeted role room and operations console
    if (escalation.targetRole) {
      ioInstance.to(`role:${escalation.targetRole}`).emit('escalation:created', { escalation, incident });
    }
    ioInstance.to('operations').emit('escalation:created', { escalation, incident });
    ioInstance.emit('escalation:created', { escalation, incident }); // Global fallback
  }
};


/**
 * Broadcast when an escalation is acknowledged
 */
export const emitEscalationAcknowledged = (escalation) => {
  if (ioInstance) {
    ioInstance.to('operations').emit('escalation:acknowledged', { escalation });
    ioInstance.emit('escalation:acknowledged', { escalation });
  }
};

/**
 * Broadcast when response operational status changes (Phase 10)
 */
export const emitResponseStatusChanged = (assignment) => {
  if (ioInstance) {
    ioInstance.emit('response:statusChanged', {
      assignmentId: assignment.assignmentId,
      incidentId: assignment.incidentId,
      resourceId: assignment.resourceId,
      status: assignment.status,
      responseTimeMinutes: assignment.responseTimeMinutes,
      delayMinutes: assignment.delayMinutes,
      timestamp: new Date(),
    });
  }
};

/**
 * Broadcast when an escalation is resolved
 */
export const emitEscalationResolved = (escalation) => {
  if (ioInstance) {
    ioInstance.to('operations').emit('escalation:resolved', { escalation });
    ioInstance.emit('escalation:resolved', { escalation });
  }
};

/**
 * Broadcast when a resource's live GPS location updates (Phase 14 & 15)
 */
export const emitResourceLocationUpdated = (locationData) => {
  if (ioInstance) {
    ioInstance.emit('resource:locationUpdated', locationData);
  }
};

/**
 * Broadcast a new notification to a specific user or role
 */
export const emitNotificationNew = (notification) => {
  if (ioInstance) {
    if (notification.userId) {
      ioInstance.to(`user:${notification.userId}`).emit('notification:new', notification);
    }
    if (notification.targetRole && notification.targetRole !== 'ALL') {
      ioInstance.to(`role:${notification.targetRole}`).emit('notification:new', notification);
    }
    ioInstance.to('operations').emit('notification:new', notification);
    ioInstance.emit('notification:new', notification); // Global fallback
  }
};

/**
 * Broadcast when a resource arrives on scene at an incident (Phase 20)
 */
export const emitResourceArrived = (arrivalData) => {
  if (ioInstance) {
    ioInstance.emit('resource:arrived', arrivalData);
  }
};

/**
 * Broadcast when notifications are marked read
 */
export const emitNotificationRead = (data) => {
  if (ioInstance) {
    if (data.userId) {
      ioInstance.to(`user:${data.userId}`).emit('notification:read', data);
    }
    ioInstance.emit('notification:read', data);
  }
};


/**
 * Broadcast resource shortage alert
 */
export const emitResourceShortage = (data) => {
  if (ioInstance) {
    ioInstance.to('operations').emit('resource:shortage', data);
    ioInstance.emit('resource:shortage', data);
  }
};

/**
 * Broadcast AI summary generated
 */
export const emitAiSummaryGenerated = (summaryData) => {
  if (ioInstance) {
    ioInstance.to('operations').emit('ai:summaryGenerated', summaryData);
  }
};

/**
 * Broadcast when a navigation route is computed and created (Phase 13)
 */
export const emitRouteCreated = (routeData) => {
  if (ioInstance) {
    ioInstance.emit('route:created', routeData);
  }
};

/**
 * Broadcast when an emergency simulation starts (Phase 26)
 */
export const emitSimulationStarted = (simulation) => {
  if (ioInstance) {
    const simId = simulation.simulationId;
    ioInstance.to(`simulation:${simId}`).emit('simulation:started', simulation);
    ioInstance.to('operations').emit('simulation:started', simulation);
    ioInstance.emit('simulation:started', simulation);
  }
};

/**
 * Broadcast when a simulation advances by a step
 */
export const emitSimulationStep = (simulation, event) => {
  if (ioInstance) {
    const simId = simulation.simulationId;
    ioInstance.to(`simulation:${simId}`).emit('simulation:step', { simulation, event });
    ioInstance.to('operations').emit('simulation:step', { simulation, event });
    ioInstance.emit('simulation:step', { simulation, event });
  }
};

/**
 * Broadcast an individual simulation event in the timeline
 */
export const emitSimulationEvent = (simulation, event) => {
  if (ioInstance) {
    const simId = simulation.simulationId;
    ioInstance.to(`simulation:${simId}`).emit('simulation:event', { simulation, event });
    ioInstance.to('operations').emit('simulation:event', { simulation, event });
    ioInstance.emit('simulation:event', { simulation, event });
  }
};

/**
 * Broadcast when simulation state updates
 */
export const emitSimulationUpdated = (simulation) => {
  if (ioInstance) {
    const simId = simulation.simulationId;
    ioInstance.to(`simulation:${simId}`).emit('simulation:updated', simulation);
    ioInstance.to('operations').emit('simulation:updated', simulation);
    ioInstance.emit('simulation:updated', simulation);
  }
};

/**
 * Broadcast when a simulation completes
 */
export const emitSimulationCompleted = (simulation) => {
  if (ioInstance) {
    const simId = simulation.simulationId;
    ioInstance.to(`simulation:${simId}`).emit('simulation:completed', simulation);
    ioInstance.to('operations').emit('simulation:completed', simulation);
    ioInstance.emit('simulation:completed', simulation);
  }
};

/**
 * Broadcast when a simulation is stopped
 */
export const emitSimulationStopped = (simulation) => {
  if (ioInstance) {
    const simId = simulation.simulationId;
    ioInstance.to(`simulation:${simId}`).emit('simulation:stopped', simulation);
    ioInstance.to('operations').emit('simulation:stopped', simulation);
    ioInstance.emit('simulation:stopped', simulation);
  }
};

/**
 * Broadcast when a simulation encounters an error
 */
export const emitSimulationError = (simulationId, error) => {
  if (ioInstance) {
    ioInstance.to(`simulation:${simulationId}`).emit('simulation:error', { simulationId, error: error?.message || error });
    ioInstance.to('operations').emit('simulation:error', { simulationId, error: error?.message || error });
    ioInstance.emit('simulation:error', { simulationId, error: error?.message || error });
  }
};

/**
 * Broadcast when resources are autonomously dispatched to an incident by AI
 */
export const emitIncidentAutoDispatched = (data) => {
  if (ioInstance) {
    ioInstance.to('operations').emit('incident:autoDispatched', data);
    ioInstance.emit('incident:autoDispatched', data);
  }
};

/**
 * Broadcast when an autonomous dispatch is cancelled/revoked by an operator
 */
export const emitIncidentDispatchCancelled = (data) => {
  if (ioInstance) {
    ioInstance.to('operations').emit('incident:dispatchCancelled', data);
    ioInstance.emit('incident:dispatchCancelled', data);
  }
};


