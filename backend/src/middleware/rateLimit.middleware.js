/**
 * In-Memory Sliding Window Rate Limiting Middleware
 * Protects sensitive endpoints (auth, AI, public routes) from brute-force & denial of service.
 */

class MemoryRateLimiter {
  constructor() {
    this.hits = new Map();
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (now > record.resetTime) {
        this.hits.delete(key);
      }
    }
  }

  isRateLimited(key, maxRequests, windowMs) {
    const now = Date.now();
    const record = this.hits.get(key);

    if (!record || now > record.resetTime) {
      this.hits.set(key, { count: 1, resetTime: now + windowMs });
      return { limited: false, remaining: maxRequests - 1, resetTime: now + windowMs };
    }

    record.count += 1;
    if (record.count > maxRequests) {
      return { limited: true, remaining: 0, resetTime: record.resetTime };
    }

    return { limited: false, remaining: maxRequests - record.count, resetTime: record.resetTime };
  }
}

const limiter = new MemoryRateLimiter();

/**
 * Creates rate-limiting middleware with custom window and request limits
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 mins)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message when rate-limited
 */
export const rateLimit = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  maxRequests,
  message = 'Too many requests from this client, please try again later.',
} = {}) => {
  const limitCount = maxRequests !== undefined ? maxRequests : max;

  return (req, res, next) => {
    // Determine client identifier: IP or authorization user
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;

    const { limited, remaining, resetTime } = limiter.isRateLimited(key, limitCount, windowMs);

    res.setHeader('X-RateLimit-Limit', limitCount);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (limited) {
      res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000));
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil((resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
};

/**
 * Preset rate limiter for authentication routes (login / register)
 * 20 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

/**
 * Preset rate limiter for AI queries
 * 60 requests per 10 minutes per IP
 */
export const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: 'AI query rate limit exceeded. Please wait a moment before sending more requests.',
});

export default rateLimit;
