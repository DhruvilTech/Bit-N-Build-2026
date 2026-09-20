import mongoose from 'mongoose';
import TimelineEventModel, { TIMELINE_EVENT_TYPES } from '../models/timelineEvent.model.js';
import IncidentModel from '../models/incident.model.js';
import { emitIncidentTimelineUpdated } from '../utils/socket.js';

// In-memory fallback store for unit tests or when MongoDB is offline
const memoryEvents = [];

/**
 * Records a new timeline event with server timestamp authority.
 */
export const recordTimelineEvent = async ({
  incidentId,
  eventType,
  actor = 'SYSTEM',
  actorRole = 'SYSTEM',
  title = '',
  description,
  metadata = {},
  source = 'SYSTEM',
}) => {
  if (!incidentId) {
    throw new Error('incidentId is required to record a timeline event');
  }
  if (!eventType || !TIMELINE_EVENT_TYPES.includes(eventType)) {
    console.warn(`[Timeline] Unsupported or missing eventType '${eventType}', defaulting to 'STATUS_CHANGED'`);
    eventType = 'STATUS_CHANGED';
  }
  if (!description) {
    description = title || `Event ${eventType} recorded`;
  }

  // Server generates timestamp - client timestamps are NEVER trusted
  const serverTimestamp = new Date();
  const eventId = `TLE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const plainEvent = {
    eventId,
    incidentId: String(incidentId).trim(),
    eventType,
    timestamp: serverTimestamp,
    actor: typeof actor === 'object' ? (actor.name || actor.userId || 'SYSTEM') : String(actor || 'SYSTEM'),
    actorRole: typeof actorRole === 'string' ? actorRole : (actor?.role || 'SYSTEM'),
    title: title || eventType.replace(/_/g, ' '),
    description,
    metadata,
    source,
  };

  if (mongoose.connection.readyState !== 1) {
    memoryEvents.push(plainEvent);
    try {
      emitIncidentTimelineUpdated(incidentId, plainEvent);
    } catch (_err) {}
    return plainEvent;
  }

  const eventDoc = await TimelineEventModel.create(plainEvent);

  // Backward compatibility: Synchronize into incident.timeline array if incident exists
  try {
    const strId = String(incidentId).trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(strId);
    const incident = await IncidentModel.findOne(
      isObjectId ? { $or: [{ incidentId: strId }, { _id: strId }] } : { incidentId: strId }
    );

    if (incident) {
      // Map eventType to closest legacy timeline enum
      let legacyEvent = 'FIELD_UPDATE';
      if (['INCIDENT_CREATED', 'INCIDENT_UPDATED', 'INCIDENT_RESOLVED', 'INCIDENT_CANCELLED'].includes(eventType)) {
        legacyEvent = eventType;
      } else if (['STATUS_CHANGED'].includes(eventType)) {
        legacyEvent = 'STATUS_CHANGE';
      } else if (['OPERATOR_OVERRIDE'].includes(eventType)) {
        legacyEvent = 'AI_OVERRIDE';
      } else if (['HUMAN_REVIEW_REQUIRED'].includes(eventType)) {
        legacyEvent = 'AI_REVIEW';
      }

      incident.timeline.push({
        timelineId: eventId,
        event: legacyEvent,
        previousStatus: incident.status,
        newStatus: incident.status,
        changedBy: {
          userId: typeof actor === 'object' ? (actor.userId || actor.id) : String(actor),
          name: typeof actor === 'object' ? actor.name : String(actor),
          role: typeof actorRole === 'string' ? actorRole : (actor?.role || 'SYSTEM'),
        },
        timestamp: serverTimestamp,
        reason: title || eventType,
        description,
      });

      await incident.save().catch((saveErr) => {
        console.warn(`[Timeline] Note: failed to update embedded incident.timeline:`, saveErr.message);
      });
    }
  } catch (syncErr) {
    console.warn(`[Timeline] Non-fatal error updating legacy incident timeline:`, syncErr.message);
  }

  const resultEvent = eventDoc.toObject ? eventDoc.toObject() : eventDoc;

  // Real-time broadcast: emit incident:timelineUpdated
  try {
    emitIncidentTimelineUpdated(incidentId, resultEvent);
  } catch (socketErr) {
    console.warn(`[Timeline] Non-fatal socket broadcast error:`, socketErr.message);
  }

  return resultEvent;
};

/**
 * Retrieves the unified incident timeline, combining historical embedded timeline events
 * with new standalone timeline events, deduplicated and chronologically ordered.
 */
export const getUnifiedIncidentTimeline = async (incidentId, options = {}) => {
  const { sort = 'asc', page = 1, limit = 50 } = options;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
  const isDesc = sort === 'desc' || sort === 'newest';

  // 1. Fetch standalone TimelineEventModel records (or memoryEvents if DB offline)
  let standaloneEvents = [];
  if (mongoose.connection.readyState !== 1) {
    standaloneEvents = memoryEvents.filter((e) => e.incidentId === String(incidentId).trim());
  } else {
    standaloneEvents = await TimelineEventModel.find({
      incidentId: String(incidentId).trim(),
    }).lean();
  }

  // 2. Fetch legacy embedded incident.timeline records
  let embeddedEvents = [];
  if (mongoose.connection.readyState === 1) {
    try {
      const strId = String(incidentId).trim();
      const isObjectId = mongoose.Types.ObjectId.isValid(strId);
      const incident = await IncidentModel.findOne(
        isObjectId ? { $or: [{ incidentId: strId }, { _id: strId }] } : { incidentId: strId }
      )
        .select('incidentId timeline')
        .lean();

      if (incident && Array.isArray(incident.timeline)) {
        embeddedEvents = incident.timeline;
      }
    } catch (err) {
      console.warn(`[Timeline] Warning reading embedded timeline for #${incidentId}:`, err.message);
    }
  }

  // 3. Merge & Deduplicate
  const seenIds = new Set();
  const unified = [];

  // Standalone events take precedence
  for (const ev of standaloneEvents) {
    seenIds.add(ev.eventId);
    unified.push({
      eventId: ev.eventId,
      incidentId: ev.incidentId,
      eventType: ev.eventType,
      timestamp: new Date(ev.timestamp),
      actor: ev.actor || 'SYSTEM',
      actorRole: ev.actorRole || 'SYSTEM',
      title: ev.title || ev.eventType.replace(/_/g, ' '),
      description: ev.description,
      metadata: ev.metadata || {},
      source: ev.source || 'SYSTEM',
    });
  }

  // Add embedded events not already covered
  for (const legacy of embeddedEvents) {
    const idKey = legacy.timelineId;
    if (idKey && seenIds.has(idKey)) {
      continue;
    }
    if (idKey) {
      seenIds.add(idKey);
    }

    // Map legacy event name to standard Phase 34 eventType if possible
    let eventType = legacy.event || 'STATUS_CHANGED';
    if (legacy.event === 'STATUS_CHANGE') eventType = 'STATUS_CHANGED';
    else if (legacy.event === 'AI_OVERRIDE') eventType = 'OPERATOR_OVERRIDE';
    else if (legacy.event === 'AI_REVIEW') eventType = 'HUMAN_REVIEW_REQUIRED';

    unified.push({
      eventId: idKey || `LEGACY-${Date.parse(legacy.timestamp) || Date.now()}`,
      incidentId: String(incidentId).trim(),
      eventType,
      timestamp: new Date(legacy.timestamp || Date.now()),
      actor: legacy.changedBy?.name || legacy.changedBy?.userId || 'SYSTEM',
      actorRole: legacy.changedBy?.role || 'SYSTEM',
      title: legacy.reason || legacy.event || 'Incident Update',
      description: legacy.description || '',
      metadata: {
        previousStatus: legacy.previousStatus,
        newStatus: legacy.newStatus,
      },
      source: 'LEGACY_LEDGER',
    });
  }

  // 4. Chronological sort (default: oldest -> newest)
  unified.sort((a, b) => {
    const timeA = a.timestamp.getTime();
    const timeB = b.timestamp.getTime();
    return isDesc ? timeB - timeA : timeA - timeB;
  });

  // 5. Pagination
  const total = unified.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedEvents = unified.slice(startIndex, startIndex + limitNum);
  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    events: paginatedEvents,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  };
};
