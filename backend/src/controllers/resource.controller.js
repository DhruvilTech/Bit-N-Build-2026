import { getResources, getResourceById } from '../services/resource.service.js';
import { successResponse } from '../utils/response.js';

export const getAllResources = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const resources = await getResources({ type, status });
    return successResponse(res, 'Resources retrieved successfully', { resources, total: resources.length }, 200);
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
