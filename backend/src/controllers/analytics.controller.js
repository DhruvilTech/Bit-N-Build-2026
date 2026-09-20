import { getOperationalMetrics } from '../services/analytics.service.js';

export const getMetrics = async (_req, res, next) => {
  try {
    const data = await getOperationalMetrics();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMetrics,
};
