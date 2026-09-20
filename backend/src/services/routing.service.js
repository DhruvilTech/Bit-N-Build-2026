/**
 * Routing Service Abstraction
 * Computes road-network routes and geometry between origin and destination coordinates.
 * Connects to OSRM (Open Source Routing Machine) with an automatic fail-safe
 * street-grid interpolation engine if external routing is offline.
 */

import { env } from '../config/env.js';
import { calculateDistanceKm } from './recommendation.service.js';

const OSRM_PUBLIC_URL = 'https://router.project-osrm.org';
const ROUTING_TIMEOUT_MS = 3500;

/**
 * Generates intermediate street-grid waypoints between two coordinates.
 * Simulates realistic road navigation through urban/suburban grid corridors.
 */
export const generateStreetGridWaypoints = (origin, destination, numSteps = 12) => {
  const waypoints = [];
  const startLng = origin.longitude;
  const startLat = origin.latitude;
  const endLng = destination.longitude;
  const endLat = destination.latitude;

  waypoints.push([startLng, startLat]);

  const latDiff = endLat - startLat;
  const lngDiff = endLng - startLng;

  // Generate a multi-segment Manhattan street grid with smooth road turns
  for (let i = 1; i < numSteps; i++) {
    const progress = i / numSteps;
    // Step along major arterial, then secondary street
    let currentLat, currentLng;

    if (progress < 0.45) {
      // First leg: primarily along latitude corridor with slight longitude adjustment
      currentLat = startLat + latDiff * (progress / 0.45);
      currentLng = startLng + lngDiff * 0.15 * Math.sin(progress * Math.PI);
    } else if (progress < 0.85) {
      // Second leg: turn onto cross-avenue towards target longitude
      const subProg = (progress - 0.45) / 0.4;
      currentLat = startLat + latDiff * 0.95;
      currentLng = startLng + lngDiff * subProg;
    } else {
      // Final leg: approach target destination
      const subProg = (progress - 0.85) / 0.15;
      currentLat = startLat + latDiff * (0.95 + 0.05 * subProg);
      currentLng = endLng;
    }

    // Round to 5 decimal places (~1 meter precision)
    waypoints.push([
      Math.round(currentLng * 100000) / 100000,
      Math.round(currentLat * 100000) / 100000,
    ]);
  }

  waypoints.push([endLng, endLat]);
  return waypoints;
};

/**
 * Requests driving route between origin and destination coordinates.
 * @param {{ latitude: number, longitude: number }} origin
 * @param {{ latitude: number, longitude: number }} destination
 * @returns {Promise<{ distanceKm: number, durationMinutes: number, geometry: Array<[number, number]>, provider: string }>}
 */
export const getRoute = async (origin, destination) => {
  if (
    !origin ||
    !destination ||
    typeof origin.latitude !== 'number' ||
    typeof origin.longitude !== 'number' ||
    typeof destination.latitude !== 'number' ||
    typeof destination.longitude !== 'number'
  ) {
    throw new Error('Valid origin and destination coordinates { latitude, longitude } are required.');
  }

  // Handle zero-distance edge case
  const straightDistance = calculateDistanceKm(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  if (straightDistance < 0.03) {
    return {
      distanceKm: 0.05,
      durationMinutes: 1,
      geometry: [
        [origin.longitude, origin.latitude],
        [destination.longitude, destination.latitude],
      ],
      origin,
      destination,
      provider: 'immediate',
    };
  }

  // 1. Try OSRM Routing Engine
  const routingUrl = env.ROUTING_API_URL || OSRM_PUBLIC_URL;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);

    // OSRM format: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
    const queryUrl = `${routingUrl}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(queryUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const bestRoute = data.routes[0];
        const distanceKm = Math.round((bestRoute.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(bestRoute.duration / 60));
        const geometry = bestRoute.geometry?.coordinates || [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ];

        return {
          distanceKm,
          durationMinutes,
          geometry,
          origin,
          destination,
          provider: 'osrm',
        };
      }
    }
  } catch (error) {
    // Graceful fallback on network timeout, rate limit, or service unavailability
    console.warn(`[RoutingService] External routing unavailable (${error.message}). Activating street-grid fallback.`);
  }

  // 2. Intelligent Street-Grid Fallback
  // Road factor: urban road networks are typically ~1.25x to 1.35x straight-line distance
  const roadDistanceKm = Math.round(straightDistance * 1.3 * 10) / 10;
  // Emergency vehicle speed average ~45 km/h + 2 min turnout
  const durationMinutes = Math.max(1, Math.round((roadDistanceKm / 45) * 60 + 2));
  const numWaypoints = Math.max(8, Math.min(30, Math.round(roadDistanceKm * 3)));
  const geometry = generateStreetGridWaypoints(origin, destination, numWaypoints);

  return {
    distanceKm: roadDistanceKm,
    durationMinutes,
    geometry,
    origin,
    destination,
    provider: 'street-grid-fallback',
  };
};

export default {
  getRoute,
  generateStreetGridWaypoints,
};
