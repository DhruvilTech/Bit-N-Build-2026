import mongoose from 'mongoose';

const alertActorSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },
    name: { type: String, default: null },
    role: { type: String, default: null },
  },
  { _id: false }
);

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'CRITICAL_INCIDENT',
        'RESPONSE_DELAY',
        'RESOURCE_SHORTAGE',
        'UNASSIGNED_CRITICAL',
        'ESCALATION_REQUIRED',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'WARNING'],
      default: 'HIGH',
      index: true,
    },
    incidentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    assignmentId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: null,
      trim: true,
    },
    teamId: {
      type: String,
      default: null,
      trim: true,
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
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    acknowledgedBy: {
      type: alertActorSchema,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: alertActorSchema,
      default: null,
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
        ret.id = ret.alertId;
        ret.acknowledged = ret.status === 'ACKNOWLEDGED' || ret.status === 'RESOLVED';
        ret.requiresEscalation = ret.type === 'ESCALATION_REQUIRED';
        ret.timestamp = ret.createdAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

alertSchema.index({ status: 1, type: 1 });
alertSchema.index({ incidentId: 1, type: 1, status: 1 });
alertSchema.index({ assignmentId: 1, type: 1, status: 1 });
alertSchema.index({ createdAt: -1 });

export const AlertModel = mongoose.model('Alert', alertSchema);
export default AlertModel;
