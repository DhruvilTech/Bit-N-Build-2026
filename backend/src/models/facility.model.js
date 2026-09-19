import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema(
  {
    facilityId: {
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
      enum: ['HOSPITAL', 'SHELTER', 'EMERGENCY_CENTER'],
      required: true,
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
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    availableCapacity: {
      type: Number,
      required: true,
      min: 0,
    },
    specializations: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      default: 'OPERATIONAL',
      index: true,
    },
    contactNumber: {
      type: String,
      default: '112-EMERGENCY',
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

facilitySchema.index({ 'location.geometry': '2dsphere' });
facilitySchema.index({ type: 1, status: 1 });

export const FacilityModel = mongoose.model('Facility', facilitySchema);
export default FacilityModel;
