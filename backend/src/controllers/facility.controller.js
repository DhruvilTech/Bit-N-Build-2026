import {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  updateFacilityCapacity,
  updateEmergencyStatus,
  findNearbyFacilities,
  deleteFacility,
} from '../services/facility.service.js';
import { successResponse } from '../utils/response.js';

export const getAllFacilities = async (req, res, next) => {
  try {
    const {
      type,
      status,
      emergencyStatus,
      minAvailableCapacity,
      specialization,
      search,
      page,
      limit,
    } = req.query;

    const result = await getFacilities(
      {
        type,
        status,
        emergencyStatus,
        minAvailableCapacity,
        specialization,
        search,
      },
      { page, limit }
    );

    return successResponse(
      res,
      'Facilities retrieved successfully',
      {
        facilities: result.facilities,
        total: result.total,
        pagination: result.pagination,
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getFacility = async (req, res, next) => {
  try {
    const facility = await getFacilityById(req.params.id);
    return successResponse(res, `Facility #${facility.facilityId} details`, { facility }, 200);
  } catch (error) {
    next(error);
  }
};

export const createNewFacility = async (req, res, next) => {
  try {
    const facility = await createFacility(req.body, req.user);
    return successResponse(res, 'Facility created successfully', { facility }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateExistingFacility = async (req, res, next) => {
  try {
    const facility = await updateFacility(req.params.id, req.body, req.user);
    return successResponse(res, 'Facility updated successfully', { facility }, 200);
  } catch (error) {
    next(error);
  }
};

export const updateCapacity = async (req, res, next) => {
  try {
    const { availableCapacity, delta, capacity } = req.body;
    const facility = await updateFacilityCapacity(
      req.params.id,
      {
        availableCapacity,
        delta,
        capacity,
      },
      req.user
    );
    return successResponse(
      res,
      `Facility #${facility.facilityId} capacity updated successfully`,
      { facility },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const updateFacilityEmergencyStatus = async (req, res, next) => {
  try {
    const { emergencyStatus, status } = req.body;
    const facility = await updateEmergencyStatus(req.params.id, { emergencyStatus, status }, req.user);
    return successResponse(
      res,
      `Facility #${facility.facilityId} emergency status updated to ${emergencyStatus}`,
      { facility },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getNearby = async (req, res, next) => {
  try {
    const {
      latitude,
      longitude,
      radiusMeters,
      type,
      specialization,
      minAvailableCapacity,
      emergencyStatus,
      status,
    } = req.query;

    const facilities = await findNearbyFacilities({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: radiusMeters ? Number(radiusMeters) : undefined,
      type,
      specialization,
      minAvailableCapacity,
      emergencyStatus,
      status,
    });

    return successResponse(
      res,
      'Nearby facilities retrieved successfully',
      { facilities, count: facilities.length },
      200
    );
  } catch (error) {
    next(error);
  }
};

export const removeFacility = async (req, res, next) => {
  try {
    const result = await deleteFacility(req.params.id, req.user);
    return successResponse(res, 'Facility deleted successfully', result, 200);
  } catch (error) {
    next(error);
  }
};
