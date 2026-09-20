import { AnalyticsService } from '../services/analytics.service.js';
import { ShortageService } from '../services/shortage.service.js';
import { successResponse } from '../utils/response.js';

export const getOverview = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const overview = await AnalyticsService.getOverview({ period, from, to });
    return successResponse(res, 'Analytics overview retrieved successfully', overview, 200);
  } catch (error) {
    next(error);
  }
};

export const getIncidents = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const data = await AnalyticsService.getIncidentDistribution({ period, from, to });
    return successResponse(res, 'Incident distribution retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const getSeverity = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const data = await AnalyticsService.getSeverityDistribution({ period, from, to });
    return successResponse(res, 'Severity distribution retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const getResponseTime = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const data = await AnalyticsService.getResponseTimeMetrics({ period, from, to });
    return successResponse(res, 'Response time metrics retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const getResources = async (req, res, next) => {
  try {
    const data = await AnalyticsService.getResourceUtilization();
    return successResponse(res, 'Resource fleet utilization retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const getDelays = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const data = await AnalyticsService.getDelayMetrics({ period, from, to });
    return successResponse(res, 'Delay metrics retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const getAreas = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const data = await AnalyticsService.getAreaAnalytics({ period, from, to });
    return successResponse(res, 'Area analytics retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const getHeatmap = async (req, res, next) => {
  try {
    const { from, to, type, severity } = req.query;
    const points = await AnalyticsService.getHeatmapData({ from, to, type, severity });
    return successResponse(res, 'Heatmap data retrieved successfully', points, 200);
  } catch (error) {
    next(error);
  }
};

export const getResourceShortages = async (req, res, next) => {
  try {
    const shortages = await ShortageService.checkAndEmitShortageAlerts();
    return successResponse(res, 'Resource shortages analyzed successfully', shortages, 200);
  } catch (error) {
    next(error);
  }
};
