import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
      index: true,
    },
    userName: {
      type: String,
      default: 'SYSTEM',
    },
    userRole: {
      type: String,
      default: 'SYSTEM',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'USER',
        'INCIDENT',
        'RESOURCE',
        'RESPONSE_TEAM',
        'FACILITY',
        'ASSIGNMENT',
        'SYSTEM',
        'SIMULATION',
        'ALERT',
        'ESCALATION',
        'NOTIFICATION',
      ],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    simulationId: {
      type: String,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      default: 'SYSTEM',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
export default AuditLogModel;
