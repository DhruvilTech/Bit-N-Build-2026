import mongoose from 'mongoose';

const recommendedItemSchema = new mongoose.Schema(
  {
    resourceId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    capabilityMatch: { type: Number, required: true, min: 0, max: 1 },
    distanceKm: { type: Number, required: true, min: 0 },
    estimatedArrivalMinutes: { type: Number, required: true, min: 0 },
    score: { type: Number, required: true, min: 0, max: 100 },
    reason: { type: String, required: true },
    matchedCapabilities: [{ type: String }],
    missingCapabilities: [{ type: String }],
    currentLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    capacity: { type: Number, default: 1 },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    recommendationId: {
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
    strategy: {
      type: String,
      enum: ['BALANCED', 'FASTEST_ETA', 'CAPABILITY_FIRST'],
      default: 'BALANCED',
    },
    requiredCapabilities: [{ type: String }],
    recommendations: [recommendedItemSchema],
    totalAvailable: { type: Number, default: 0 },
    totalRecommended: { type: Number, default: 0 },
    explanation: { type: String },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes TTL
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

recommendationSchema.index({ incidentId: 1, createdAt: -1 });

export const RecommendationModel = mongoose.model('Recommendation', recommendationSchema);
export default RecommendationModel;
