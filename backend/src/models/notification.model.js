import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    targetRole: {
      type: String,
      enum: ['OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR', 'ADMIN', 'RESPONDER', 'ALL'],
      default: 'ALL',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'INCIDENT_CREATED',
        'INCIDENT_CRITICAL',
        'INCIDENT_UPDATED',
        'INCIDENT_ASSIGNED',
        'INCIDENT_DISPATCHED',
        'INCIDENT_RESOLVED',
        'RESOURCE_ASSIGNED',
        'RESOURCE_DISPATCHED',
        'RESOURCE_ARRIVED',
        'RESOURCE_DELAYED',
        'RESOURCE_RETURNING',
        'RESOURCE_AVAILABLE',
        'TEAM_ASSIGNED',
        'TEAM_DISPATCHED',
        'TEAM_ARRIVED',
        'ALERT_CREATED',
        'ALERT_ESCALATED',
        'ALERT_ACKNOWLEDGED',
        'RESPONSE_DELAY',
        'ETA_EXCEEDED',
        'AI_ANALYSIS_COMPLETED',
        'AI_ANALYSIS_FAILED',
        'RESOURCE_SHORTAGE',
        'HOSPITAL_CAPACITY_WARNING',
        'SYSTEM_WARNING',
        'SYSTEM_ERROR',
        // Legacy types preserved for backward compatibility
        'CRITICAL_INCIDENT',
        'RESOURCE_ASSIGNMENT',
        'ESCALATION',
        'INCIDENT_UPDATE',
        'SYSTEM',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    priority: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      default: 'MEDIUM',
      index: true,
    },
    entityType: {
      type: String,
      enum: ['INCIDENT', 'RESOURCE', 'TEAM', 'ALERT', 'ESCALATION', 'FACILITY', 'SYSTEM'],
      default: 'SYSTEM',
    },
    entityId: {
      type: String,
      default: null,
      trim: true,
    },
    incidentId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    alertId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    assignmentId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    readBy: [
      {
        userId: { type: String, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for notification queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ targetRole: 1, createdAt: -1 });
notificationSchema.index({ type: 1, entityId: 1, createdAt: -1 });
notificationSchema.index({ incidentId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
