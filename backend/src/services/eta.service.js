import { env } from '../config/env.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { ResponseTeamModel } from '../models/team.model.js';
import { emitAssignmentEtaUpdated } from '../utils/socket.js';

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
export const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // 2 decimal precision
};

/**
 * Return configured average speed (km/h) based on team or resource type
 */
export const getAverageSpeedForType = (type = 'GENERAL') => {
  const normalized = (type || '').toUpperCase();

  if (normalized.includes('AMBULANCE') || normalized === 'MEDICAL') {
    return env.SPEED_AMBULANCE || 45;
  }
  if (normalized.includes('FIRE')) {
    return env.SPEED_FIRE || 40;
  }
  if (normalized.includes('POLICE')) {
    return env.SPEED_POLICE || 50;
  }
  if (normalized.includes('RESCUE') || normalized === 'DISASTER_RESPONSE') {
    return env.SPEED_RESCUE || 35;
  }
  if (normalized.includes('HAZMAT')) {
    return env.SPEED_HAZMAT || 30;
  }

  return env.SPEED_GENERAL || 40;
};

/**
 * Calculate estimated arrival minutes and future arrival timestamp from distance and speed
 */
export const calculateEta = (distanceKm, speedKmH = 40) => {
  const speed = speedKmH > 0 ? speedKmH : 40;
  if (distanceKm <= 0.05) {
    const arrivalDate = new Date();
    return {
      distanceKm: 0,
      estimatedArrivalMinutes: 0,
      expectedArrivalAt: arrivalDate,
    };
  }

  const estimatedArrivalMinutes = Math.max(1, Math.round((distanceKm / speed) * 60));
  const expectedArrivalAt = new Date(Date.now() + estimatedArrivalMinutes * 60 * 1000);

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    estimatedArrivalMinutes,
    expectedArrivalAt,
  };
};

/**
 * Recalculate ETA for all active assignments linked to a team when the team's location changes
 */
export const recalculateEtaForTeam = async (teamId, teamLocation, teamType = null) => {
  try {
    // 1. Find all active assignments for this team
    const activeAssignments = await AssignmentModel.find({
      teamId,
      status: { $in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'] },
    });

    if (!activeAssignments.length) {
      return [];
    }

    // Determine speed
    let effectiveType = teamType;
    if (!effectiveType) {
      const teamDoc = await ResponseTeamModel.findOne({ teamId });
      effectiveType = teamDoc?.type || 'GENERAL';
    }
    const speed = getAverageSpeedForType(effectiveType);

    const updatedList = [];

    for (const assignment of activeAssignments) {
      // Find incident location
      const incident = await IncidentModel.findOne({
        $or: [{ incidentId: assignment.incidentId }, { _id: assignment.incidentId }],
      });

      if (!incident || !incident.location) continue;

      const incLat = incident.location.latitude;
      const incLon = incident.location.longitude;

      const teamLat = teamLocation.latitude;
      const teamLon = teamLocation.longitude;

      const distanceKm = calculateHaversineDistanceKm(teamLat, teamLon, incLat, incLon);
      const eta = calculateEta(distanceKm, speed);

      assignment.distanceKm = eta.distanceKm;
      assignment.estimatedArrivalMinutes = eta.estimatedArrivalMinutes;
      assignment.expectedArrivalAt = eta.expectedArrivalAt;

      await assignment.save();

      // Emit ETA update socket event
      emitAssignmentEtaUpdated({
        assignmentId: assignment.assignmentId,
        incidentId: assignment.incidentId,
        teamId: assignment.teamId,
        distanceKm: eta.distanceKm,
        estimatedArrivalMinutes: eta.estimatedArrivalMinutes,
        expectedArrivalAt: eta.expectedArrivalAt,
      });

      updatedList.push(assignment);
    }

    return updatedList;
  } catch (error) {
    console.error(`[ETA Engine] Error recalculating ETA for team ${teamId}:`, error.message);
    return [];
  }
};
