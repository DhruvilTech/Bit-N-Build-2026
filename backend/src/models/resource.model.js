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
      index: true,
    },
    availability: {
      type: Boolean,
      default: true,
      index: true,
    },
    assignmentHistory: [assignmentRecordSchema],
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
  this.availability = this.status === 'AVAILABLE' && !this.currentAssignment;
  next();
});

resourceSchema.index({ 'location.geometry': '2dsphere' });
resourceSchema.index({ type: 1, status: 1 });
resourceSchema.index({ availability: 1, type: 1 });
resourceSchema.index({ 'capabilities': 1 });

export const ResourceModel = mongoose.model('Resource', resourceSchema);
export default ResourceModel;
