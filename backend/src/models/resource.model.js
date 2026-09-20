import mongoose from 'mongoose';

const assignmentRecordSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      default: () => `ASN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
    incidentId: {
      type: String,
      default: null,
      trim: true,
    },
    teamId: {
      type: String,
      default: null,
      trim: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    action: {
      type: String,
      enum: ['ASSIGN', 'RELEASE', 'STATUS_CHANGE'],
      default: 'ASSIGN',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

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
        'AMBULANCE',
        'FIRE_VEHICLE',
        'POLICE_VEHICLE',
        'RESCUE_EQUIPMENT',
        'MEDICAL_EQUIPMENT',
        'HAZMAT_UNIT',
        'AIRCRAFT_DRONE',
        'VEHICLE',
        'EQUIPMENT',
        'FIRE_TEAM',
        'POLICE_TEAM',
        'RESCUE_TEAM',
        'HOSPITAL',
        'SHELTER',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'AVAILABLE',
        'ASSIGNED',
        'DISPATCHED',
        'EN_ROUTE',
        'ON_SCENE',
        'COMPLETED',
        'RETURNING',
        'BUSY',
        'OFFLINE',
      ],
      default: 'AVAILABLE',
      index: true,
    },
    stationId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    homeLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      geometry: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
        },
      },
    },
    currentLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      geometry: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
        },
      },
    },
    destinationLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: null },
    },
    locationUpdatedAt: {
      type: Date,
      default: Date.now,
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
      index: true,
    },
    availability: {
      type: Boolean,
      default: true,
      index: true,
    },
    assignmentHistory: [assignmentRecordSchema],
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

resourceSchema.pre('save', function (next) {
  // Sync currentLocation with legacy location
  if (this.currentLocation && this.currentLocation.latitude !== undefined) {
    this.location = {
      latitude: this.currentLocation.latitude,
      longitude: this.currentLocation.longitude,
      address: this.currentLocation.address || this.location?.address || '',
      geometry: {
        type: 'Point',
        coordinates: [this.currentLocation.longitude, this.currentLocation.latitude],
      },
    };
  } else if (this.location && this.location.latitude !== undefined) {
    this.currentLocation = {
      latitude: this.location.latitude,
      longitude: this.location.longitude,
      address: this.location.address || '',
      geometry: {
        type: 'Point',
        coordinates: [this.location.longitude, this.location.latitude],
      },
    };
  }

  // Default homeLocation to initial location if not set
  if (!this.homeLocation || !this.homeLocation.latitude) {
    this.homeLocation = {
      latitude: this.location.latitude,
      longitude: this.location.longitude,
      address: this.location.address || '',
      geometry: {
        type: 'Point',
        coordinates: [this.location.longitude, this.location.latitude],
      },
    };
  }

  this.availability = this.status === 'AVAILABLE' && !this.currentAssignment;
  next();
});

resourceSchema.index({ 'location.geometry': '2dsphere' });
resourceSchema.index({ type: 1, status: 1 });
resourceSchema.index({ availability: 1, type: 1 });
resourceSchema.index({ 'capabilities': 1 });

export const ResourceModel = mongoose.model('Resource', resourceSchema);
export default ResourceModel;
