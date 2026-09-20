import mongoose from 'mongoose';

const incidentReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true },
    source: {
      type: String,
      enum: ['CITIZEN', 'SENSOR', 'EMERGENCY_CALL', 'FIELD_TEAM', 'OPERATOR', 'GOVERNMENT', 'OTHER', 'SYSTEM'],
      required: true,
    },
    text: { type: String, required: true },
    reliability: { type: Number, min: 0, max: 100, default: 85 },
    reportedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    timelineId: { type: String, required: true },
    event: {
      type: String,
      enum: [
        'INCIDENT_CREATED',
        'STATUS_CHANGED',
        'LOCATION_UPDATED',
        'RESOURCE_ASSIGNED',
        'TEAM_ASSIGNED',
        'FIELD_UPDATE',
        'INCIDENT_RESOLVED',
        'INCIDENT_UPDATED',
        'INCIDENT_CANCELLED',
        'AI_OVERRIDE',
        'AI_REVIEW',
        'INCIDENTS_MERGED',
        'AI_ANALYSIS_STARTED',
        'AI_ANALYSIS_COMPLETED',
        'INCIDENT_CLASSIFIED',
        'SEVERITY_UPDATED',
        'PRIORITY_UPDATED',
        'DUPLICATE_DETECTED',
        'INCIDENT_MERGED',
        'RESOURCE_RECOMMENDED',
        'RESOURCE_DISPATCHED',
        'RESOURCE_EN_ROUTE',
        'RESOURCE_DELAYED',
        'ALERT_CREATED',
        'ESCALATION_CREATED',
        'RESOURCE_ARRIVED',
        'RESOURCE_RELEASED',
      ],
      required: true,
    },
    previousStatus: { type: String },
    newStatus: { type: String },
    changedBy: {
      userId: { type: String },
      name: { type: String },
      role: { type: String },
    },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String, default: null },
    description: { type: String, required: true },
  },
  { _id: false }
);

const reportedBySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String },
    role: { type: String },
    badgeNumber: { type: String },
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
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 },
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
        'ACKNOWLEDGED',
        'ASSIGNED',
        'RESPONDING',
        'ON_SCENE',
        'RESOLVED',
        'CANCELLED',
        'ANALYZING',
        'PRIORITIZED',
        'ESCALATED',
      ],
      default: 'NEW',
      index: true,
    },
    source: {
      type: String,
      enum: ['CITIZEN', 'EMERGENCY_CALL', 'SENSOR', 'FIELD_TEAM', 'OPERATOR', 'GOVERNMENT', 'OTHER', 'SYSTEM'],
      default: 'EMERGENCY_CALL',
      index: true,
    },
    reportedBy: reportedBySchema,
    assignedTeams: [
      {
        type: String,
        trim: true,
      },
    ],
    assignedResources: [
      {
        type: String,
        trim: true,
      },
    ],
    reports: [incidentReportSchema],
    sourceCount: {
      type: Number,
      default: 1,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timeline: [timelineEventSchema],
    delayDetected: {
      type: Boolean,
      default: false,
      index: true,
    },
    delayMinutes: {
      type: Number,
      default: 0,
    },
    isSimulation: {
      type: Boolean,
      default: false,
      index: true,
    },
    simulationId: {
      type: String,
      default: null,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    aiAnalysis: {
      // Phase 1 Canonical Contract Fields
      classification: {
        type: {
          type: String,
          enum: ['FIRE', 'FLOOD', 'ROAD_ACCIDENT', 'INDUSTRIAL_ACCIDENT', 'MEDICAL_EMERGENCY', 'EARTHQUAKE', 'OTHER'],
          default: null,
        },
        value: { type: String, default: null },
        confidence: { type: Number, min: 0, max: 1, default: null },
      },
      severityRating: {
        level: {
          type: String,
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          default: null,
        },
        value: { type: String, default: null },
        confidence: { type: Number, min: 0, max: 1, default: null },
      },
      priorityRating: {
        level: {
          type: String,
          enum: ['P1', 'P2', 'P3', 'P4'],
          default: null,
        },
        value: { type: String, default: null },
        reason: { type: String, default: null },
      },
      priorityReason: { type: String, default: null },
      reason: { type: String, default: null },
      recommendations: [{ type: String }],
      riskFactors: [{ type: String }],
      location: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        address: { type: String, default: null },
      },
      duplicate: {
        isDuplicate: { type: Boolean, default: false },
        similarity: { type: Number, min: 0, max: 1, default: 0 },
        relatedIncidentId: { type: String, default: null },
      },
      signals: [{ type: String }],

      // Backward compatibility top-level fields
      incidentType: {
        type: String,
        enum: ['FIRE', 'FLOOD', 'ROAD_ACCIDENT', 'INDUSTRIAL_ACCIDENT', 'MEDICAL_EMERGENCY', 'EARTHQUAKE', 'OTHER'],
        default: null,
      },
      severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: null,
      },
      priority: {
        type: String,
        enum: ['P1', 'P2', 'P3', 'P4'],
        default: null,
      },
      confidence: { type: Number, min: 0, max: 1, default: null },
      reasoning: {
        incidentType: { type: String, default: null },
        severity: { type: String, default: null },
        priority: { type: String, default: null },
      },
      suggestedCorrection: { type: Boolean, default: false },
      originalType: { type: String, default: null },
      isLowConfidence: { type: Boolean, default: false },
      detectedLocation: {
        found: { type: Boolean, default: false },
        address: { type: String, default: null },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        rawMention: { type: String, default: null },
        confidence: { type: Number, default: null },
      },
      model: { type: String, default: 'emergency-classifier-v1' },
      version: { type: String, default: '1.0' },
      status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'PENDING',
        index: true,
      },
      error: { type: String, default: null },
      analyzedAt: { type: Date, default: null },

      // Phase 3: Human Review Tracking
      requiresHumanReview: { type: Boolean, default: false, index: true },
      reviewReason: { type: String, default: null },
      reviewedBy: {
        userId: { type: String, default: null },
        name: { type: String, default: null },
        role: { type: String, default: null },
      },
      reviewedAt: { type: Date, default: null },

      // Phase 4: Original, HumanReview, Final & Overrides Ledger
      original: {
        classification: { type: String, default: null },
        severity: { type: String, default: null },
        priority: { type: String, default: null },
      },
      humanReview: {
        status: {
          type: String,
          enum: ['PENDING', 'CONFIRMED', 'OVERRIDDEN'],
          default: 'PENDING',
          index: true,
        },
        reviewedBy: {
          userId: { type: String, default: null },
          name: { type: String, default: null },
          role: { type: String, default: null },
        },
        reviewedAt: { type: Date, default: null },
        reason: { type: String, default: null },
      },
      final: {
        classification: { type: String, default: null },
        severity: { type: String, default: null },
        priority: { type: String, default: null },
      },
      overrides: [
        {
          field: { type: String, required: true },
          originalValue: { type: String, required: true },
          newValue: { type: String, required: true },
          reason: { type: String, required: true },
          overriddenBy: {
            userId: { type: String, required: true },
            name: { type: String, default: null },
            role: { type: String, default: null },
          },
          timestamp: { type: Date, default: Date.now },
        },
      ],

      // Backward compatibility fields
      confidenceScore: { type: Number, min: 0, max: 100 },
      primaryHazard: { type: String },
      evacuationRadiusMeters: { type: Number },
      recommendedResourceTypes: [{ type: String }],
      summary: { type: String },
    },
    duplicateAnalysis: {
      status: {
        type: String,
        enum: ['PENDING', 'NOT_CHECKED', 'CHECKED', 'DUPLICATE_FOUND', 'RELATED_FOUND', 'UNIQUE', 'FAILED', 'SKIPPED'],
        default: 'NOT_CHECKED',
        index: true,
      },
      hasDuplicates: { type: Boolean, default: false },
      hasRelated: { type: Boolean, default: false },
      topMatch: {
        incidentId: { type: String, default: null },
        classification: { type: String, default: null },
        combinedScore: { type: Number, default: null },
        semanticSimilarity: { type: Number, default: null },
        geographicSimilarity: { type: Number, default: null },
        temporalSimilarity: { type: Number, default: null },
        distanceKm: { type: Number, default: null },
        timeDiffHours: { type: Number, default: null },
        reasoning: { type: String, default: null },
        method: { type: String, default: null },
      },
      matchesCount: { type: Number, default: 0 },
      clusterId: { type: String, default: null },
      isCanonical: { type: Boolean, default: true },
      analyzedAt: { type: Date, default: null },
      error: { type: String, default: null },
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
incidentSchema.index({ severity: 1, priority: 1, status: 1, type: 1, source: 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ duplicateOf: 1 });
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ status: 1, severity: 1, createdAt: -1 });

export const IncidentModel = mongoose.model('Incident', incidentSchema);
export default IncidentModel;
