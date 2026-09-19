import { AppError } from '../utils/errors.js';

// In-memory sliding window rate limiter
const rateLimitMap = new Map();

export const rateLimit = ({ windowMs = 60 * 1000, maxRequests = 20, message = 'Too many requests, please try again later' } = {}) => {
  return (req, _res, next) => {
    // Determine client identifier: IP or forward header
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(key, record);

    if (record.count > maxRequests) {
      return next(new AppError(message, 429));
    }

    next();
  };
};

// Periodic garbage collection for rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();
