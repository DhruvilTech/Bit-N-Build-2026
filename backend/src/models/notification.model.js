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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    targetRole: {
      type: String,
      enum: ['OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR', 'ADMIN', 'ALL'],
      default: 'ALL',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'CRITICAL_INCIDENT',
        'RESOURCE_ASSIGNMENT',
        'RESPONSE_DELAY',
        'ESCALATION',
        'RESOURCE_SHORTAGE',
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
    entityType: {
      type: String,
      enum: ['INCIDENT', 'RESOURCE', 'TEAM', 'ESCALATION', 'SYSTEM'],
      default: 'SYSTEM',
    },
    entityId: {
      type: String,
      default: null,
      trim: true,
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
notificationSchema.index({ targetRole: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
