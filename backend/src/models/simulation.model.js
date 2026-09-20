import mongoose from 'mongoose';

const simulationEventSchema = new mongoose.Schema(
  {
    step: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'PENDING', 'RUNNING', 'WARNING', 'FAILED', 'INFO'],
      default: 'SUCCESS',
    },
    entityType: {
      type: String,
      default: 'SIMULATION',
    },
    entityId: {
      type: String,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    message: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const simulationSchema = new mongoose.Schema(
  {
    simulationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    scenario: {
      type: String,
      enum: [
        'CHEMICAL_FACTORY_EXPLOSION',
        'FLASH_FLOOD',
        'HIGH_RISE_FIRE',
        'HIGHWAY_TANKER_PILEUP',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['CREATED', 'RUNNING', 'PAUSED', 'COMPLETED', 'STOPPED', 'FAILED'],
      default: 'CREATED',
      index: true,
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    totalSteps: {
      type: Number,
      default: 15,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      userId: { type: String, default: 'SYSTEM' },
      name: { type: String, default: 'SYSTEM OPERATOR' },
      role: { type: String, default: 'OPERATOR' },
    },
    incidentIds: [
      {
        type: String,
        trim: true,
      },
    ],
    eventHistory: [simulationEventSchema],
    configuration: {
      speed: { type: Number, default: 1 },
      autoRun: { type: Boolean, default: false },
      stepDelayMs: { type: Number, default: 2500 },
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

simulationSchema.index({ scenario: 1, status: 1 });
simulationSchema.index({ createdAt: -1 });

export const SimulationModel = mongoose.model('Simulation', simulationSchema);
export default SimulationModel;
