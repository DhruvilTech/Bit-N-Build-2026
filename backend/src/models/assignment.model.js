import mongoose from 'mongoose';

const assignmentTimelineEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'ON_SCENE', 'COMPLETED', 'RETURNING', 'CANCELLED'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      userId: { type: String },
      name: { type: String },
      role: { type: String },
      email: { type: String },
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
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
    teamId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: function () {
        return this.teamId || '';
      },
      trim: true,
      index: true,
    },
    resourceName: {
      type: String,
      default: function () {
        return this.teamId || '';
      },
      trim: true,
    },
    resourceType: {
      type: String,
      default: 'GENERAL',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'ON_SCENE', 'COMPLETED', 'RETURNING', 'CANCELLED'],
      default: 'ASSIGNED',
      index: true,
    },
    assignedBy: {
      userId: { type: String },
      name: { type: String },
      role: { type: String },
      email: { type: String },
    },
    createdBy: {
      userId: { type: String },
      name: { type: String },
      role: { type: String },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    capabilities: [
      {
        type: String,
        trim: true,
      },
    ],
    // Timestamps for full operational timeline
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    enRouteAt: {
      type: Date,
      default: null,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    expectedArrivalAt: {
      type: Date,
      default: null,
      index: true,
    },
    isDelayed: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Metrics
    distanceKm: {
      type: Number,
      default: null,
    },
    estimatedDistanceKm: {
      type: Number,
      default: function () {
        return this.distanceKm;
      },
    },
    estimatedArrivalMinutes: {
      type: Number,
      default: null,
    },
    actualArrivalMinutes: {
      type: Number,
      default: null,
    },
    responseTimeMinutes: {
      type: Number,
      default: null,
    },
    responseDurationMinutes: {
      type: Number,
      default: null,
    },
    delayMinutes: {
      type: Number,
      default: 0,
    },
    dispatchTime: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number,
      default: null,
    },
    totalAssignmentTime: {
      type: Number,
      default: null,
    },
    arrivalDelay: {
      type: Number,
      default: null,
    },
    route: {
      distanceKm: { type: Number, default: null },
      durationMinutes: { type: Number, default: null },
      geometry: {
        type: [[Number]], // [[longitude, latitude], ...]
        default: [],
      },
      origin: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      destination: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      createdAt: { type: Date, default: Date.now },
    },
    timeline: [assignmentTimelineEventSchema],
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

assignmentSchema.index({ incidentId: 1, status: 1 });
assignmentSchema.index({ resourceId: 1, status: 1 });
assignmentSchema.index({ createdAt: -1 });

export const AssignmentModel = mongoose.model('Assignment', assignmentSchema);
export default AssignmentModel;
