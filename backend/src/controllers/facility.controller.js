import { getFacilities, getFacilityById } from '../services/facility.service.js';
import { successResponse } from '../utils/response.js';

export const getAllFacilities = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const facilities = await getFacilities({ type, status });
    return successResponse(res, 'Facilities retrieved successfully', { facilities, total: facilities.length }, 200);
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
