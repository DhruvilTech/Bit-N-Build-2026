import mongoose from 'mongoose';
import { FacilityModel } from '../models/facility.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import NotificationService from './notification.service.js';

export const getFacilities = async (filters = {}, pagination = {}) => {
  const query = {};

  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.emergencyStatus) query.emergencyStatus = filters.emergencyStatus;

  if (filters.minAvailableCapacity !== undefined && filters.minAvailableCapacity !== '') {
    query.availableCapacity = { $gte: Number(filters.minAvailableCapacity) };
  }

  if (filters.specialization) {
    query.specializations = { $in: [new RegExp(filters.specialization, 'i')] };
  }

  if (filters.search) {
    query.$or = [
      { facilityId: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
      { specializations: { $regex: filters.search, $options: 'i' } },
      { 'location.address': { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const [facilities, total] = await Promise.all([
    FacilityModel.find(query).sort({ name: 1 }).skip(skip).limit(limit),
    FacilityModel.countDocuments(query),
  ]);

  return {
    facilities,
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getFacilityById = async (id) => {
  let facility = await FacilityModel.findOne({ facilityId: id });
  if (!facility && mongoose.Types.ObjectId.isValid(id)) {
    facility = await FacilityModel.findById(id);
  }

  if (!facility) {
    throw new NotFoundError(`Facility #${id} not found`);
  }

  return facility;
};

export const createFacility = async (data, user = null) => {
  let prefix = 'FAC';
  if (data.type === 'HOSPITAL') prefix = 'HOSP';
  else if (data.type === 'SHELTER') prefix = 'SHELTER';
  else if (data.type === 'EMERGENCY_CENTER') prefix = 'CENTER';

  const facilityId = data.facilityId || `${prefix}-${Math.floor(10 + Math.random() * 90)}`;

  const existing = await FacilityModel.findOne({ facilityId });
  if (existing) {
    throw new ConflictError(`Facility with ID ${facilityId} already exists`);
  }

  if (data.availableCapacity > data.capacity) {
    throw new BadRequestError(
      `Available capacity (${data.availableCapacity}) cannot exceed total capacity (${data.capacity})`
    );
  }

  const facility = await FacilityModel.create({
    ...data,
    facilityId,
    location: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
    },
  });

  await recordAuditLog({
    user,
    action: 'FACILITY_CREATED',
    entityType: 'FACILITY',
    entityId: facility.facilityId,
    metadata: { name: facility.name, type: facility.type, capacity: facility.capacity },
  });

  return facility;
};

export const updateFacility = async (id, data, user = null) => {
  let facility = await FacilityModel.findOne({ facilityId: id });
  if (!facility && mongoose.Types.ObjectId.isValid(id)) {
    facility = await FacilityModel.findById(id);
  }
  if (!facility) throw new NotFoundError(`Facility #${id} not found`);

  const targetCapacity = data.capacity !== undefined ? data.capacity : facility.capacity;
  const targetAvailable =
    data.availableCapacity !== undefined ? data.availableCapacity : facility.availableCapacity;

  if (targetAvailable > targetCapacity) {
    throw new BadRequestError(
      `Available capacity (${targetAvailable}) cannot exceed total capacity (${targetCapacity})`
    );
  }

  if (data.name) facility.name = data.name;
  if (data.type) facility.type = data.type;
  if (data.capacity !== undefined) facility.capacity = data.capacity;
  if (data.availableCapacity !== undefined) facility.availableCapacity = data.availableCapacity;
  if (data.specializations) facility.specializations = data.specializations;
  if (data.status) facility.status = data.status;
  if (data.emergencyStatus) facility.emergencyStatus = data.emergencyStatus;
  if (data.contactNumber) facility.contactNumber = data.contactNumber;
  if (data.operationalHours) facility.operationalHours = data.operationalHours;
  if (data.departments) facility.departments = data.departments;
  if (data.metadata) facility.metadata = { ...facility.metadata, ...data.metadata };

  if (data.location) {
    facility.location = {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address || facility.location.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
    };
  }

  await facility.save();

  await recordAuditLog({
    user,
    action: 'FACILITY_UPDATED',
    entityType: 'FACILITY',
    entityId: facility.facilityId,
    metadata: { name: facility.name },
  });

  return facility;
};

export const updateFacilityCapacity = async (id, { availableCapacity, delta, capacity }, user = null) => {
  let facility = await FacilityModel.findOne({ facilityId: id });
  if (!facility && mongoose.Types.ObjectId.isValid(id)) {
    facility = await FacilityModel.findById(id);
  }
  if (!facility) throw new NotFoundError(`Facility #${id} not found`);

  if (capacity !== undefined) {
    if (capacity < 0) {
      throw new BadRequestError('Total capacity cannot be negative');
    }
    facility.capacity = capacity;
  }

  let newAvailable = facility.availableCapacity;
  if (availableCapacity !== undefined) {
    newAvailable = availableCapacity;
  } else if (delta !== undefined) {
    newAvailable = facility.availableCapacity + delta;
  }

  // Strict constraint validation
  if (newAvailable < 0) {
    throw new BadRequestError(`Available capacity cannot be negative (attempted: ${newAvailable})`);
  }

  if (newAvailable > facility.capacity) {
    throw new BadRequestError(
      `Available capacity (${newAvailable}) cannot exceed total capacity (${facility.capacity})`
    );
  }

  const prevAvailable = facility.availableCapacity;
  facility.availableCapacity = newAvailable;

  // Real-time status update based on bed availability
  if (newAvailable === 0 && facility.status === 'OPERATIONAL') {
    facility.status = 'AT_CAPACITY';
  } else if (newAvailable > 0 && facility.status === 'AT_CAPACITY') {
    facility.status = 'OPERATIONAL';
  }

  await facility.save();

  if (facility.status === 'AT_CAPACITY' || newAvailable === 0) {
    NotificationService.dispatchEventNotification('HOSPITAL_CAPACITY_WARNING', {
      title: `CAPACITY WARNING: ${facility.name} at Capacity`,
      message: `${facility.name} has 0 available beds remaining (0/${facility.capacity}). Diverting non-critical admissions.`,
      entityType: 'FACILITY',
      entityId: facility.facilityId,
      metadata: { facilityId: facility.facilityId, availableCapacity: newAvailable, totalCapacity: facility.capacity },
      cooldownSeconds: 180,
    }).catch((e) => console.warn('[Notification] Facility capacity warning dispatch note:', e.message));
  }

  await recordAuditLog({
    user,
    action: 'FACILITY_CAPACITY_UPDATED',
    entityType: 'FACILITY',
    entityId: facility.facilityId,
    metadata: {
      previousAvailable: prevAvailable,
      newAvailable: newAvailable,
      capacity: facility.capacity,
      status: facility.status,
    },
  });

  return facility;
};

export const updateEmergencyStatus = async (id, { emergencyStatus, status }, user = null) => {
  let facility = await FacilityModel.findOne({ facilityId: id });
  if (!facility && mongoose.Types.ObjectId.isValid(id)) {
    facility = await FacilityModel.findById(id);
  }
  if (!facility) throw new NotFoundError(`Facility #${id} not found`);

  const prevEmergency = facility.emergencyStatus;
  const prevStatus = facility.status;

  if (emergencyStatus) facility.emergencyStatus = emergencyStatus;
  if (status) facility.status = status;

  await facility.save();

  if (facility.emergencyStatus === 'CRITICAL' || facility.status === 'DIVERT') {
    NotificationService.dispatchEventNotification('HOSPITAL_CAPACITY_WARNING', {
      title: `FACILITY ALERT: ${facility.name} status is ${facility.emergencyStatus || facility.status}`,
      message: `${facility.name} has updated operational status to ${facility.emergencyStatus || facility.status}. Diverting non-critical transport.`,
      entityType: 'FACILITY',
      entityId: facility.facilityId,
      metadata: { facilityId: facility.facilityId, emergencyStatus: facility.emergencyStatus, status: facility.status },
      cooldownSeconds: 180,
    }).catch((e) => console.warn('[Notification] Facility alert dispatch note:', e.message));
  }

  await recordAuditLog({
    user,
    action: 'FACILITY_EMERGENCY_STATUS_UPDATED',
    entityType: 'FACILITY',
    entityId: facility.facilityId,
    metadata: {
      previousEmergency: prevEmergency,
      newEmergency: facility.emergencyStatus,
      previousStatus: prevStatus,
      newStatus: facility.status,
    },
  });

  return facility;
};

export const findNearbyFacilities = async ({
  latitude,
  longitude,
  radiusMeters = 15000,
  type,
  specialization,
  minAvailableCapacity,
  emergencyStatus,
  status,
}) => {
  const maxDistance = Number(radiusMeters) || 15000;
  const query = {
    'location.geometry': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        },
        $maxDistance: maxDistance,
      },
    },
  };

  if (type) query.type = type;
  if (status) query.status = status;
  if (emergencyStatus) query.emergencyStatus = emergencyStatus;
  if (minAvailableCapacity !== undefined && minAvailableCapacity !== '') {
    query.availableCapacity = { $gte: Number(minAvailableCapacity) };
  }
  if (specialization) {
    query.specializations = { $in: [new RegExp(specialization, 'i')] };
  }

  const facilities = await FacilityModel.find(query).limit(50);
  return facilities;
};

export const deleteFacility = async (id, user = null) => {
  let facility = await FacilityModel.findOne({ facilityId: id });
  if (!facility && mongoose.Types.ObjectId.isValid(id)) {
    facility = await FacilityModel.findById(id);
  }
  if (!facility) throw new NotFoundError(`Facility #${id} not found`);

  await FacilityModel.deleteOne({ _id: facility._id });

  await recordAuditLog({
    user,
    action: 'FACILITY_DELETED',
    entityType: 'FACILITY',
    entityId: facility.facilityId,
    metadata: { name: facility.name },
  });

  return { deleted: true, facilityId: facility.facilityId };
};

export const getFacilitiesCapacity = async () => {
  const facilities = await FacilityModel.find({ type: 'HOSPITAL' })
    .select('facilityId name capacity availableCapacity status emergencyStatus departments location specializations')
    .sort({ name: 1 })
    .lean();

  return facilities.map((f) => {
    const total = f.capacity || 0;
    const available = Math.max(0, Math.min(total, f.availableCapacity || 0));
    const occupied = Math.max(0, total - available);
    const occupancyPercentage = total > 0 ? Math.round((occupied / total) * 100) : 0;

    let status = 'NORMAL';
    if (f.status === 'DIVERTING') {
      status = 'FULL';
    } else if (occupancyPercentage >= 95 || available === 0) {
      status = 'FULL';
    } else if (occupancyPercentage >= 85) {
      status = 'CRITICAL';
    } else if (occupancyPercentage >= 70) {
      status = 'HIGH';
    }

    const icuDept = (f.departments || []).find((d) => /icu|intensive/i.test(d.name));
    const burnDept = (f.departments || []).find((d) => /burn/i.test(d.name));

    return {
      id: f.facilityId,
      name: f.name,
      totalBeds: total,
      availableBeds: available,
      occupiedBeds: occupied,
      occupancyPercentage,
      divertStatus: f.status === 'DIVERTING',
      emergencyStatus: f.emergencyStatus || 'NORMAL',
      status,
      icu: icuDept
        ? {
            total: icuDept.capacity,
            available: Math.max(0, icuDept.availableCapacity),
            occupied: Math.max(0, icuDept.capacity - icuDept.availableCapacity),
          }
        : {
            total: Math.round(total * 0.2),
            available: Math.round(available * 0.2),
            occupied: Math.max(0, Math.round(total * 0.2) - Math.round(available * 0.2)),
          },
      burn: burnDept
        ? {
            total: burnDept.capacity,
            available: Math.max(0, burnDept.availableCapacity),
            occupied: Math.max(0, burnDept.capacity - burnDept.availableCapacity),
          }
        : {
            total: Math.round(total * 0.1),
            available: Math.round(available * 0.1),
            occupied: Math.max(0, Math.round(total * 0.1) - Math.round(available * 0.1)),
          },
      location: f.location?.address || 'Metro Healthcare Sector',
      coordinates: f.location?.geometry?.coordinates || [f.location?.longitude, f.location?.latitude],
    };
  });
};

