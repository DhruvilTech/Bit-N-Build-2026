import mongoose from 'mongoose';

export const TIMELINE_EVENT_TYPES = [
  'INCIDENT_CREATED',
  'INCIDENT_UPDATED',
  'AI_ANALYSIS_STARTED',
  'AI_ANALYSIS_COMPLETED',
  'AI_FAILED',
  'AI_FALLBACK',
  'HUMAN_REVIEW_REQUIRED',
  'TEAM_ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'LOCATION_UPDATED',
  'ETA_UPDATED',
  'RESPONSE_DELAYED',
  'TEAM_ARRIVED',
  'ALERT_CREATED',
  'ALERT_ACKNOWLEDGED',
  'ALERT_RESOLVED',
  'STATUS_CHANGED',
  'OPERATOR_OVERRIDE',
  'INCIDENT_RESOLVED',
];

const timelineEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    incidentId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: TIMELINE_EVENT_TYPES,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    actor: {
      type: String,
      default: 'SYSTEM',
    },
    actorRole: {
      type: String,
      default: 'SYSTEM',
    },
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    source: {
      type: String,
      default: 'SYSTEM',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for chronological querying as specified in Phase 34
timelineEventSchema.index({ incidentId: 1, timestamp: 1 });

const TimelineEventModel = mongoose.model('TimelineEvent', timelineEventSchema);

export default TimelineEventModel;
