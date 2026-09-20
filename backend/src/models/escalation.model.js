import mongoose from 'mongoose';

const escalationSchema = new mongoose.Schema(
  {
    escalationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    incidentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },
    level: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      index: true,
    },
    ruleId: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    targetRole: {
      type: String,
      enum: ['OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR', 'ADMIN'],
      required: true,
      index: true,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    acknowledgedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
    },
    triggerSource: {
      type: String,
      enum: ['AUTOMATED_ENGINE', 'MANUAL_DISPATCH', 'AI_MONITOR', 'FIELD_REPORT'],
      default: 'AUTOMATED_ENGINE',
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

// Compound indexes for high-frequency queries and duplicate prevention
escalationSchema.index({ incidentId: 1, status: 1 });
escalationSchema.index({ incidentId: 1, ruleId: 1, status: 1 });
escalationSchema.index({ status: 1, level: 1 });
escalationSchema.index({ triggeredAt: -1 });

const Escalation = mongoose.model('Escalation', escalationSchema);

export default Escalation;
