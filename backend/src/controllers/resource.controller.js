import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  updateResourceStatus,
  assignResource,
  releaseResource,
  findNearbyResources,
  deleteResource,
  updateResourceLocation,
} from '../services/resource.service.js';
import { successResponse } from '../utils/response.js';

export const getAllResources = async (req, res, next) => {
  try {
    const { type, status, availableOnly, search, capability, page, limit } = req.query;

    const result = await getResources(
      { type, status, availableOnly, search, capability },
      { page, limit }
    );

    return successResponse(
      res,
      'Resources retrieved successfully',
      {
        resources: result.resources,
        total: result.total,
        pagination: result.pagination,
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getResource = async (req, res, next) => {
  try {
    const resource = await getResourceById(req.params.id);
    return successResponse(res, `Resource #${resource.resourceId} details`, { resource }, 200);
  } catch (error) {
    next(error);
  }
};

export const createNewResource = async (req, res, next) => {
  try {
    const resource = await createResource(req.body, req.user);
    return successResponse(res, 'Resource created successfully', { resource }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateExistingResource = async (req, res, next) => {
  try {
    const resource = await updateResource(req.params.id, req.body, req.user);
    return successResponse(res, 'Resource updated successfully', { resource }, 200);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const resource = await updateResourceStatus(req.params.id, status, notes, req.user);
    return successResponse(res, `Resource status updated to ${status}`, { resource }, 200);
  } catch (error) {
    next(error);
  }
};

export const assign = async (req, res, next) => {
  try {
    const { incidentId, teamId, notes } = req.body;
    const resource = await assignResource(req.params.id, { incidentId, teamId, notes }, req.user);
    return successResponse(
      res,
      `Resource #${resource.resourceId} assigned successfully`,
      { resource },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const release = async (req, res, next) => {
  try {
    const { notes } = req.body || {};
    const resource = await releaseResource(req.params.id, { notes }, req.user);
    return successResponse(
      res,
      `Resource #${resource.resourceId} released successfully`,
      { resource },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getNearby = async (req, res, next) => {
  try {
    const { latitude, longitude, radiusMeters, type, status, capability } = req.query;
    const resources = await findNearbyResources({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: radiusMeters ? Number(radiusMeters) : undefined,
      type,
      status,
      capability,
    });

    return successResponse(
      res,
      'Nearby resources retrieved successfully',
      { resources, count: resources.length },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const removeResource = async (req, res, next) => {
  try {
    const result = await deleteResource(req.params.id, req.user);
    return successResponse(res, 'Resource deleted successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, status } = req.body;
    const result = await updateResourceLocation(
      req.params.id,
      { latitude, longitude, status },
      req.user
    );
    return successResponse(res, `Resource #${req.params.id} GPS location updated`, result, 200);
  } catch (error) {
    next(error);
  }
};
