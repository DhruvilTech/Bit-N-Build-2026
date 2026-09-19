import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 0, min: 0 },
    availableCapacity: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['OPERATIONAL', 'FULL', 'DIVERTING', 'CLOSED'],
      default: 'OPERATIONAL',
    },
  },
  { _id: false }
);

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
      min: [0, 'Capacity cannot be negative'],
    },
    availableCapacity: {
      type: Number,
      required: true,
      min: [0, 'Available capacity cannot be negative'],
    },
    specializations: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['OPERATIONAL', 'DIVERTING', 'AT_CAPACITY', 'LIMITED_SERVICE', 'OFFLINE'],
      default: 'OPERATIONAL',
      index: true,
    },
    emergencyStatus: {
      type: String,
      enum: ['NORMAL', 'BUSY', 'SURGE', 'CRITICAL', 'EVACUATING'],
      default: 'NORMAL',
      index: true,
    },
    contactNumber: {
      type: String,
      default: '112-EMERGENCY',
      trim: true,
    },
    operationalHours: {
      type: String,
      default: '24/7',
      trim: true,
    },
    departments: [departmentSchema],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Calculate real-time occupancy rate percentage
facilitySchema.virtual('occupancyRate').get(function () {
  if (!this.capacity || this.capacity === 0) return 0;
  const occupied = this.capacity - this.availableCapacity;
  return Math.max(0, Math.min(100, Math.round((occupied / this.capacity) * 100)));
});

// Capacity constraints and auto status management
facilitySchema.pre('validate', function (next) {
  if (this.availableCapacity > this.capacity) {
    this.invalidate('availableCapacity', 'Available capacity cannot exceed total capacity');
  }
  next();
});

facilitySchema.pre('save', function (next) {
  if (this.availableCapacity === 0 && this.status === 'OPERATIONAL') {
    this.status = 'AT_CAPACITY';
  } else if (this.availableCapacity > 0 && this.status === 'AT_CAPACITY') {
    this.status = 'OPERATIONAL';
  }
  next();
});

facilitySchema.index({ 'location.geometry': '2dsphere' });
facilitySchema.index({ type: 1, status: 1 });
facilitySchema.index({ availableCapacity: 1 });
facilitySchema.index({ specializations: 1 });

export const FacilityModel = mongoose.model('Facility', facilitySchema);
export default FacilityModel;
