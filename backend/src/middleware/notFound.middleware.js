import { errorResponse } from '../utils/response.js';

export const notFoundHandler = (req, res, _next) => {
  errorResponse(res, `Route not found: ${req.method} ${req.originalUrl}`, 'RESOURCE_NOT_FOUND', 404);
};
