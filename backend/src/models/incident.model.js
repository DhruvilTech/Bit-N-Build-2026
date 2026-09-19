import mongoose from 'mongoose';

const incidentReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true },
    source: {
      type: String,
      enum: ['CITIZEN', 'SENSOR', 'EMERGENCY_CALL', 'FIELD_TEAM', 'GOVERNMENT', 'SYSTEM'],
      required: true,
    },
    text: { type: String, required: true },
    reliability: { type: Number, min: 0, max: 100, default: 85 },
    reportedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'FIRE',
        'FLOOD',
        'ROAD_ACCIDENT',
        'INDUSTRIAL_ACCIDENT',
        'MEDICAL_EMERGENCY',
        'EARTHQUAKE',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, required: true },
      geometry: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
        },
      },
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    priority: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      default: 'P3',
      index: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
    },
    status: {
      type: String,
      enum: [
        'NEW',
        'ANALYZING',
        'PRIORITIZED',
        'ASSIGNED',
        'RESPONDING',
        'ON_SCENE',
        'RESOLVED',
        'ESCALATED',
      ],
      default: 'NEW',
      index: true,
    },
    source: {
      type: String,
      enum: ['CITIZEN', 'SENSOR', 'EMERGENCY_CALL', 'FIELD_TEAM', 'GOVERNMENT', 'SYSTEM'],
      default: 'EMERGENCY_CALL',
      index: true,
    },
    reports: [incidentReportSchema],
    duplicateOf: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    assignedResources: [
      {
        type: String,
        trim: true,
      },
    ],
    aiAnalysis: {
      confidenceScore: { type: Number, min: 0, max: 100 },
      primaryHazard: { type: String },
      evacuationRadiusMeters: { type: Number },
      recommendedResourceTypes: [{ type: String }],
      summary: { type: String },
      analyzedAt: { type: Date, default: Date.now },
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

// Indexes for high-speed queries & geospatial lookups
incidentSchema.index({ 'location.geometry': '2dsphere' });
incidentSchema.index({ severity: 1, priority: 1, status: 1 });
incidentSchema.index({ createdAt: -1 });

export const IncidentModel = mongoose.model('Incident', incidentSchema);
export default IncidentModel;
