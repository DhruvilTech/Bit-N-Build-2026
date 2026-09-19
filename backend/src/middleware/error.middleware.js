import { errorResponse } from '../utils/response.js';
import { env } from '../config/env.js';

export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorDetails = err.details || null;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = Object.values(err.errors || {}).map((e) => e.message);
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier: ${err.value}`;
  }

  // Handle Mongo Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate field value: ${field}. Value must be unique.`;
  }

  if (env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('[Internal Server Error]', err);
  }

  return errorResponse(
    res,
    message,
    errorDetails || (env.NODE_ENV === 'development' ? err.stack : undefined),
    statusCode
  );
};
