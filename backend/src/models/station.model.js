import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema(
  {
    stationId: {
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
      enum: [
        'FIRE_STATION',
        'AMBULANCE_BASE',
        'POLICE_STATION',
        'RESCUE_BASE',
        'DISASTER_RESPONSE_CENTER',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
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
          type: [Number], // [longitude, latitude] - strict GeoJSON standard
          required: true,
        },
      },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE', 'OFFLINE'],
      default: 'ACTIVE',
      index: true,
    },
    capacity: {
      type: Number,
      default: 10,
      min: 0,
    },
    assignedResources: [
      {
        type: String,
        trim: true,
      },
    ],
    contactNumber: {
      type: String,
      default: '112-STATION',
      trim: true,
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

stationSchema.index({ 'location.geometry': '2dsphere' });
stationSchema.index({ type: 1, status: 1 });

export const StationModel = mongoose.model('Station', stationSchema);
export default StationModel;
