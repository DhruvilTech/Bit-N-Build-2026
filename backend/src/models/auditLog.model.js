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
      enum: ['USER', 'INCIDENT', 'RESOURCE', 'RESPONSE_TEAM', 'FACILITY', 'ASSIGNMENT', 'SYSTEM', 'ALERT'],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
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

export const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
export default AuditLogModel;
