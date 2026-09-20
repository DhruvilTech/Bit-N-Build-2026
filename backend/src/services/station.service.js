import mongoose from 'mongoose';
import { StationModel } from '../models/station.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { recordAuditLog } from './auditLog.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';

export const getStations = async (filters = {}) => {
  const query = {};

  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { stationId: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
      { address: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const stations = await StationModel.find(query).sort({ name: 1 });
  return stations;
};

export const getStationById = async (id) => {
  let station = await StationModel.findOne({ stationId: id });
  if (!station && mongoose.Types.ObjectId.isValid(id)) {
    station = await StationModel.findById(id);
  }

  if (!station) {
    throw new NotFoundError(`Station #${id} not found`);
  }

  // Populate actual resources stationed here
  const resources = await ResourceModel.find({ stationId: station.stationId });
  const stationObj = station.toJSON();
  stationObj.resources = resources;
  stationObj.availableResourcesCount = resources.filter(
    (r) => r.status === 'AVAILABLE' && r.availability
  ).length;

  return stationObj;
};

export const createStation = async (data, user = null) => {
  const stationId =
    data.stationId ||
    `STN-${(data.type || 'BASE').substring(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const existing = await StationModel.findOne({ stationId });
  if (existing) {
    throw new ConflictError(`Station with ID ${stationId} already exists`);
  }

  const station = await StationModel.create({
    ...data,
    stationId,
    location: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address || data.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude], // GeoJSON [lng, lat]
      },
    },
  });

  await recordAuditLog({
    user,
    action: 'STATION_CREATED',
    entityType: 'SYSTEM',
    entityId: station.stationId,
    metadata: { name: station.name, type: station.type },
  });

  return station;
};

export const updateStation = async (id, data, user = null) => {
  let station = await StationModel.findOne({ stationId: id });
  if (!station && mongoose.Types.ObjectId.isValid(id)) {
    station = await StationModel.findById(id);
  }

  if (!station) {
    throw new NotFoundError(`Station #${id} not found`);
  }

  if (data.name) station.name = data.name;
  if (data.type) station.type = data.type;
  if (data.status) station.status = data.status;
  if (data.address) station.address = data.address;
  if (data.capacity !== undefined) station.capacity = data.capacity;
  if (data.contactNumber) station.contactNumber = data.contactNumber;

  if (data.location) {
    station.location = {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      address: data.location.address || station.location.address,
      geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude],
      },
    };
  }

  await station.save();

  await recordAuditLog({
    user,
    action: 'STATION_UPDATED',
    entityType: 'SYSTEM',
    entityId: station.stationId,
    metadata: { name: station.name, status: station.status },
  });

  return station;
};

export const deleteStation = async (id, user = null) => {
  let station = await StationModel.findOne({ stationId: id });
  if (!station && mongoose.Types.ObjectId.isValid(id)) {
    station = await StationModel.findById(id);
  }

  if (!station) {
    throw new NotFoundError(`Station #${id} not found`);
  }

  // Check if active resources are assigned to this station
  const assignedCount = await ResourceModel.countDocuments({
    stationId: station.stationId,
  });

  if (assignedCount > 0) {
    throw new BadRequestError(
      `Cannot delete station #${station.stationId} because ${assignedCount} resource(s) are assigned to it.`
    );
  }

  await StationModel.deleteOne({ _id: station._id });

  await recordAuditLog({
    user,
    action: 'STATION_DELETED',
    entityType: 'SYSTEM',
    entityId: station.stationId,
    metadata: { name: station.name },
  });

  return { deleted: true, stationId: station.stationId };
};

export default {
  getStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
};
