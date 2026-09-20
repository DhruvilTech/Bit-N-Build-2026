import mongoose from 'mongoose';

const responseHistorySchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      default: () => `RESP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
    incidentId: {
      type: String,
      required: true,
      trim: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    enRouteAt: {
      type: Date,
      default: null,
    },
    onSceneAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      default: 'ASSIGNED',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['FIRE', 'MEDICAL', 'POLICE', 'RESCUE', 'DISASTER_RESPONSE', 'HAZMAT'],
      required: true,
      index: true,
    },
    members: [
      {
        type: String,
        trim: true,
      },
    ],
    vehicleId: {
      type: String,
      trim: true,
      default: '',
    },
    assignedResources: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'BUSY', 'OFFLINE'],
      default: 'AVAILABLE',
      index: true,
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
    currentLocation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    locationUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    capabilities: [
      {
        type: String,
        trim: true,
      },
    ],
    currentAssignment: {
      type: String,
      default: null,
      index: true,
    },
    radioChannel: {
      type: String,
      default: 'CH-01 TAC',
      trim: true,
    },
    availability: {
      type: Boolean,
      default: true,
      index: true,
    },
    responseHistory: [responseHistorySchema],
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

teamSchema.pre('save', function (next) {
  this.availability = this.status === 'AVAILABLE' && !this.currentAssignment;
  next();
});

teamSchema.index({ 'location.geometry': '2dsphere' });
teamSchema.index({ type: 1, status: 1 });
teamSchema.index({ availability: 1, type: 1 });
teamSchema.index({ capabilities: 1 });

export const ResponseTeamModel = mongoose.model('ResponseTeam', teamSchema);
export default ResponseTeamModel;
