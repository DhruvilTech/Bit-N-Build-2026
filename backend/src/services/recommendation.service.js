/**
 * Phase 6: Resource Recommendation Engine
 * Evaluates available emergency resources against incident operational requirements,
 * calculates geospatial distances and ETAs, performs capability matching,
 * and produces scored, explainable recommendations.
 */

import { ResourceModel } from '../models/resource.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { RecommendationModel } from '../models/recommendation.model.js';
import {
  extractIncidentRequirements,
  matchCapabilities,
} from './capabilityMatcher.js';
import { NotFoundError } from '../utils/errors.js';
import { emitResourceRecommended } from '../utils/socket.js';

// Haversine formula to compute distance between two lat/lng coordinates in kilometers
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null
  ) {
    return 10.0; // Default fallback distance if coordinates are missing
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Calculate Estimated Arrival Time in minutes based on distance and average emergency speed
export const calculateEtaMinutes = (distanceKm, averageSpeedKmh = 45) => {
  // 2 minutes dispatch and rollout buffer
  const travelMinutes = (distanceKm / averageSpeedKmh) * 60;
  return Math.max(1, Math.round(travelMinutes + 2));
};

/**
 * Computes recommendation score (0-100) using configurable strategy.
 */
export const calculateRecommendationScore = ({
  capabilityMatch,
  distanceKm,
  estimatedArrivalMinutes,
  capacity = 1,
  strategy = 'BALANCED',
  maxDistanceKm = 50,
}) => {
  const normDistance = Math.max(0, 1 - distanceKm / Math.max(1, maxDistanceKm));
  const normEta = Math.max(0, 1 - estimatedArrivalMinutes / 60);
  const normCapacity = Math.min(1.0, (capacity || 1) / 4);

  let score = 0;
  switch (strategy) {
    case 'FASTEST_ETA':
      score = normEta * 40 + normDistance * 20 + capabilityMatch * 30 + normCapacity * 10;
      break;

    case 'CAPABILITY_FIRST':
      score = capabilityMatch * 70 + normDistance * 15 + normEta * 10 + normCapacity * 5;
      break;

    case 'BALANCED':
    default:
      score = capabilityMatch * 45 + normDistance * 30 + normEta * 15 + normCapacity * 10;
      break;
  }

  return Math.round(Math.min(100, Math.max(0, score * 100)));
};

/**
 * Generates explainable reason for a resource recommendation.
 */
const buildRecommendationReason = (resource, matchResult, distanceKm, etaMinutes) => {
  const parts = [];

  if (matchResult.matchedRequired.length > 0) {
    parts.push(
      `Available ${resource.type} with ${Math.round(matchResult.capabilityMatch * 100)}% capability match (${matchResult.matchedRequired.join(', ')})`
    );
  } else {
    parts.push(`Available ${resource.type}`);
  }

  parts.push(`located ${distanceKm} km away (ETA ~${etaMinutes} mins)`);

  if (matchResult.missingRequired.length > 0) {
    parts.push(`(Note: missing ${matchResult.missingRequired.join(', ')})`);
  }

  return parts.join(' ');
};

/**
 * Generates resource recommendations for an incident.
 * @param {string|Object} incidentOrId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export const generateRecommendations = async (
  incidentOrId,
  {
    strategy = 'BALANCED',
    maxDistanceKm = 50,
    limit = 10,
    refresh = false,
  } = {}
) => {
  // 1. Fetch Incident
  let incident = incidentOrId;
  if (typeof incidentOrId === 'string') {
    incident = await IncidentModel.findOne({
      $or: [
        { incidentId: incidentOrId },
        ...(incidentOrId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: incidentOrId }] : []),
      ],
    });
    if (!incident) {
      throw new NotFoundError(`Incident #${incidentOrId} not found`);
    }
  }

  const incidentId = incident.incidentId;

  // 2. Check cached/persisted recommendation if not forcing refresh
  if (!refresh) {
    const existingRec = await RecommendationModel.findOne({
      incidentId,
      strategy,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existingRec && existingRec.recommendations.length > 0) {
      return {
        incidentId,
        strategy: existingRec.strategy,
        requiredCapabilities: existingRec.requiredCapabilities,
        recommendations: existingRec.recommendations,
        totalAvailable: existingRec.totalAvailable,
        totalRecommended: existingRec.totalRecommended,
        explanation: existingRec.explanation,
        cached: true,
        generatedAt: existingRec.generatedAt,
      };
    }
  }

  // 3. Extract Incident Requirements
  const requirements = extractIncidentRequirements(incident);
  const incLat = incident.location?.latitude;
  const incLng = incident.location?.longitude;

  // 4. Fetch available resources (exclude assigned/busy/offline and already assigned to this incident)
  const query = {
    status: 'AVAILABLE',
    currentAssignment: null,
  };

  const availableResources = await ResourceModel.find(query);

  if (availableResources.length === 0) {
    const emptyResult = {
      incidentId,
      strategy,
      requiredCapabilities: requirements.required,
      recommendations: [],
      totalAvailable: 0,
      totalRecommended: 0,
      explanation: `No available emergency resources found in the platform. All resources are currently deployed, offline, or busy.`,
      generatedAt: new Date(),
    };

    await RecommendationModel.create({
      recommendationId: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId,
      strategy,
      requiredCapabilities: requirements.required,
      recommendations: [],
      totalAvailable: 0,
      totalRecommended: 0,
      explanation: emptyResult.explanation,
    });

    return emptyResult;
  }

  // 5. Evaluate each resource against requirements & location
  const scoredRecommendations = [];

  for (const res of availableResources) {
    const resLat = res.location?.latitude;
    const resLng = res.location?.longitude;

    const distanceKm = calculateDistanceKm(incLat, incLng, resLat, resLng);
    if (distanceKm > maxDistanceKm) {
      continue; // Exceeds operational radius
    }

    const etaMinutes = calculateEtaMinutes(distanceKm);
    const matchResult = matchCapabilities(
      res.capabilities || [],
      requirements.required,
      requirements.preferred
    );

    // Filter out incompatible resources
    if (!matchResult.isCompatible) {
      continue;
    }

    const score = calculateRecommendationScore({
      capabilityMatch: matchResult.capabilityMatch,
      distanceKm,
      estimatedArrivalMinutes: etaMinutes,
      capacity: res.capacity || 1,
      strategy,
      maxDistanceKm,
    });

    const reason = buildRecommendationReason(res, matchResult, distanceKm, etaMinutes);

    scoredRecommendations.push({
      resourceId: res.resourceId,
      name: res.name,
      type: res.type,
      capabilityMatch: matchResult.capabilityMatch,
      distanceKm,
      estimatedArrivalMinutes: etaMinutes,
      score,
      reason,
      matchedCapabilities: matchResult.matchedRequired,
      missingCapabilities: matchResult.missingRequired,
      currentLocation: {
        latitude: resLat,
        longitude: resLng,
        address: res.location?.address || '',
      },
      capacity: res.capacity || 1,
    });
  }

  // 6. Sort by score descending, distance ascending
  scoredRecommendations.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.distanceKm - b.distanceKm;
  });

  const topRecommendations = scoredRecommendations.slice(0, limit);

  const explanation =
    topRecommendations.length > 0
      ? `Successfully recommended ${topRecommendations.length} resource(s) based on ${requirements.explanation || 'incident profile'}`
      : `No available resources matched the required capabilities (${requirements.required.join(', ')}) within ${maxDistanceKm}km.`;

  // 7. Persist recommendation
  const recDoc = await RecommendationModel.create({
    recommendationId: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    incidentId,
    strategy,
    requiredCapabilities: requirements.required,
    recommendations: topRecommendations,
    totalAvailable: availableResources.length,
    totalRecommended: topRecommendations.length,
    explanation,
    generatedAt: new Date(),
  });

  // 8. Emit real-time socket event
  emitResourceRecommended(incidentId, {
    recommendationId: recDoc.recommendationId,
    incidentId,
    recommendations: topRecommendations,
    strategy,
  });

  return {
    incidentId,
    strategy,
    requiredCapabilities: requirements.required,
    recommendations: topRecommendations,
    totalAvailable: availableResources.length,
    totalRecommended: topRecommendations.length,
    explanation,
    generatedAt: recDoc.generatedAt,
  };
};

export default {
  calculateDistanceKm,
  calculateEtaMinutes,
  calculateRecommendationScore,
  generateRecommendations,
};
