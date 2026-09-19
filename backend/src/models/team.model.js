import mongoose from 'mongoose';

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
      enum: ['FIRE', 'MEDICAL', 'POLICE', 'RESCUE'],
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
      required: true,
      trim: true,
    },
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
    capabilities: [
      {
        type: String,
        trim: true,
      },
    ],
    currentAssignment: {
      type: String,
      default: null,
    },
    radioChannel: {
      type: String,
      default: 'CH-01 TAC',
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

teamSchema.index({ 'location.geometry': '2dsphere' });
teamSchema.index({ type: 1, status: 1 });

export const ResponseTeamModel = mongoose.model('ResponseTeam', teamSchema);
export default ResponseTeamModel;
