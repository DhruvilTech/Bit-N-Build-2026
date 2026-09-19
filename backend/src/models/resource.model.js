import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    resourceId: {
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
        'FIRE_TEAM',
        'AMBULANCE',
        'POLICE_TEAM',
        'RESCUE_TEAM',
        'VEHICLE',
        'EQUIPMENT',
        'HOSPITAL',
        'SHELTER',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFFLINE'],
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
    capacity: {
      type: Number,
      default: 1,
      min: 0,
    },
    currentAssignment: {
      type: String,
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
        delete ret.__v;
        return ret;
      },
    },
  }
);

resourceSchema.index({ 'location.geometry': '2dsphere' });
resourceSchema.index({ type: 1, status: 1 });

export const ResourceModel = mongoose.model('Resource', resourceSchema);
export default ResourceModel;
