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


