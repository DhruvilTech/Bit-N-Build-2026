/**
 * Real-Time GPS Movement Simulation Service
 * Handles stepping emergency resources along computed route coordinates,
 * updating live GPS telemetry, detecting arrival (ON_SCENE), and managing
 * the return journey back to station (RETURNING -> AVAILABLE).
 */

import { ResourceModel } from '../models/resource.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { SimulationModel } from '../models/simulation.model.js';
import { updateResourceLocation } from './resource.service.js';
import { getRoute } from './routing.service.js';
import { generateRecommendations } from './recommendation.service.js';
import { assignResourcesToIncident, updateAssignmentStatus } from './assignment.service.js';
import {
  advanceSimulationStep,
  clearAutoRunTimer,
  SCENARIO_CONFIGS,
} from './simulationWorkflow.service.js';
import { AuditService } from './auditLog.service.js';
import {
  emitRouteCreated,
  emitResourceLocationUpdated,
  emitResourceArrived,
  emitResourceReleased,
  emitSimulationStarted,
  emitSimulationStopped,
} from '../utils/socket.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

// In-memory registry of active simulation intervals
const activeSimulations = new Map();
let isGlobalSimulationMode = true;

export const getSimulationStatus = () => {
  return {
    isSimulationMode: isGlobalSimulationMode,
    activeSimulationCount: activeSimulations.size,
    simulatingResourceIds: Array.from(activeSimulations.keys()),
  };
};

export const setSimulationMode = (enabled) => {
  isGlobalSimulationMode = Boolean(enabled);
  return getSimulationStatus();
};

/**
 * Stops an active movement simulation for a resource.
 */
export const stopSimulation = (resourceId) => {
  if (activeSimulations.has(resourceId)) {
    const timer = activeSimulations.get(resourceId);
    clearInterval(timer);
    activeSimulations.delete(resourceId);
    return true;
  }
  return false;
};

/**
 * Starts a real-time GPS movement simulation along a route.
 * Steps through route coordinates every 1–2 seconds, updating live coordinates
 * and triggering arrival when reaching the destination.
 */
export const startRouteSimulation = async (idOrAssignmentId, stepIntervalMs = 1200) => {
  let assignment = await AssignmentModel.findOne({
    $or: [
      { assignmentId: idOrAssignmentId },
      { resourceId: idOrAssignmentId },
    ],
  }).sort({ createdAt: -1 });

  if (!assignment) {
    throw new NotFoundError(`Assignment or resource #${idOrAssignmentId} not found`);
  }

  const resource = await ResourceModel.findOne({ resourceId: assignment.resourceId });
  if (!resource) {
    throw new NotFoundError(`Resource #${assignment.resourceId} not found`);
  }

  const incident = await IncidentModel.findOne({ incidentId: assignment.incidentId });
  if (!incident) {
    throw new NotFoundError(`Incident #${assignment.incidentId} not found`);
  }

  // Stop any existing simulation for this resource
  stopSimulation(resource.resourceId);

  // Ensure route exists
  let geometry = assignment.route?.geometry;
  if (!geometry || geometry.length < 2) {
    const origin = {
      latitude: resource.currentLocation?.latitude || resource.location?.latitude,
      longitude: resource.currentLocation?.longitude || resource.location?.longitude,
    };
    const destination = {
      latitude: incident.location.latitude,
      longitude: incident.location.longitude,
    };

    const routeData = await getRoute(origin, destination);
    assignment.route = {
      distanceKm: routeData.distanceKm,
      durationMinutes: routeData.durationMinutes,
      geometry: routeData.geometry,
      origin,
      destination,
      createdAt: new Date(),
    };
    await assignment.save();
    geometry = routeData.geometry;

    emitRouteCreated({
      assignmentId: assignment.assignmentId,
      incidentId: assignment.incidentId,
      resourceId: resource.resourceId,
      route: assignment.route,
    });
  }

  // Set initial dispatched & en-route state
  if (assignment.status === 'ASSIGNED') {
    await updateAssignmentStatus(assignment.assignmentId, {
      status: 'DISPATCHED',
      notes: 'Simulation: vehicle dispatched from station',
    });
  }

  if (assignment.status === 'ASSIGNED' || assignment.status === 'DISPATCHED') {
    await updateAssignmentStatus(assignment.assignmentId, {
      status: 'EN_ROUTE',
      notes: 'Simulation: vehicle en route to incident scene',
    });
  }

  let stepIndex = 0;
  const totalSteps = geometry.length;

  const interval = setInterval(async () => {
    try {
      if (stepIndex >= totalSteps) {
        stopSimulation(resource.resourceId);
        return;
      }

      const coord = geometry[stepIndex]; // [longitude, latitude]
      const lng = coord[0];
      const lat = coord[1];

      const isLastStep = stepIndex === totalSteps - 1;
      const targetStatus = isLastStep ? 'ON_SCENE' : 'EN_ROUTE';

      await updateResourceLocation(resource.resourceId, {
        latitude: lat,
        longitude: lng,
        status: targetStatus,
      });

      if (isLastStep) {
        stopSimulation(resource.resourceId);
      } else {
        stepIndex++;
      }
    } catch (err) {
      console.error(`[Simulation] Error during coordinate step for ${resource.resourceId}:`, err);
      stopSimulation(resource.resourceId);
    }
  }, stepIntervalMs);

  activeSimulations.set(resource.resourceId, interval);

  return {
    started: true,
    resourceId: resource.resourceId,
    assignmentId: assignment.assignmentId,
    totalSteps,
    stepIntervalMs,
    status: 'SIMULATING',
    route: assignment.route,
  };
};

/**
 * Starts the return journey simulation: routes from incident back to station,
 * and sets resource to AVAILABLE once home.
 */
export const startReturnSimulation = async (resourceId, stepIntervalMs = 1200) => {
  const resource = await ResourceModel.findOne({ resourceId });
  if (!resource) {
    throw new NotFoundError(`Resource #${resourceId} not found`);
  }

  stopSimulation(resource.resourceId);

  const origin = {
    latitude: resource.currentLocation?.latitude || resource.location?.latitude,
    longitude: resource.currentLocation?.longitude || resource.location?.longitude,
  };

  const destination = {
    latitude: resource.homeLocation?.latitude || origin.latitude,
    longitude: resource.homeLocation?.longitude || origin.longitude,
  };

  const returnRoute = await getRoute(origin, destination);

  resource.status = 'RETURNING';
  resource.destinationLocation = {
    latitude: destination.latitude,
    longitude: destination.longitude,
    address: resource.homeLocation?.address || 'Home Station',
  };
  await resource.save();

  emitRouteCreated({
    resourceId: resource.resourceId,
    route: {
      ...returnRoute,
      origin,
      destination,
    },
    isReturnRoute: true,
  });

  const geometry = returnRoute.geometry;
  let stepIndex = 0;
  const totalSteps = geometry.length;

  const interval = setInterval(async () => {
    try {
      if (stepIndex >= totalSteps) {
        stopSimulation(resource.resourceId);

        // Reached Home Station -> Reset to AVAILABLE
        resource.status = 'AVAILABLE';
        resource.currentAssignment = null;
        resource.availability = true;
        resource.currentLocation = {
          latitude: destination.latitude,
          longitude: destination.longitude,
          address: resource.homeLocation?.address || '',
          geometry: {
            type: 'Point',
            coordinates: [destination.longitude, destination.latitude],
          },
        };
        resource.destinationLocation = null;
        await resource.save();

        emitResourceReleased(null, resource.resourceId, null);
        emitResourceLocationUpdated({
          resourceId: resource.resourceId,
          latitude: destination.latitude,
          longitude: destination.longitude,
          status: 'AVAILABLE',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const coord = geometry[stepIndex];
      const lng = coord[0];
      const lat = coord[1];

      await updateResourceLocation(resource.resourceId, {
        latitude: lat,
        longitude: lng,
        status: 'RETURNING',
      });

      stepIndex++;
    } catch (err) {
      console.error(`[Simulation] Error during return coordinate step for ${resource.resourceId}:`, err);
      stopSimulation(resource.resourceId);
    }
  }, stepIntervalMs);

  activeSimulations.set(resource.resourceId, interval);

  return {
    started: true,
    resourceId: resource.resourceId,
    totalSteps,
    status: 'RETURNING_SIMULATION_STARTED',
    route: returnRoute,
  };
};

/**
 * Simulation Mode Auto-Dispatch:
 * Automatically approves recommendations, creates assignments, and initiates live movement.
 */
export const autoDispatchIncident = async (incidentId) => {
  const recommendationsResult = await generateRecommendations(incidentId, {
    strategy: 'BALANCED',
    limit: 3,
  });

  const recs = recommendationsResult.recommendations || [];
  if (recs.length === 0) {
    throw new BadRequestError('No suitable available resources to auto-dispatch.');
  }

  const resourceIds = recs.map((r) => r.resourceId);
  const assignmentResult = await assignResourcesToIncident(
    incidentId,
    {
      resourceIds,
      notes: 'Simulation Mode: Automated dispatch approval',
    },
    { name: 'Simulation Engine', role: 'OPERATOR' }
  );

  // Start route simulation for all created assignments
  const simulationResults = [];
  for (const asg of assignmentResult.assignments) {
    const sim = await startRouteSimulation(asg.assignmentId);
    simulationResults.push(sim);
  }

  return {
    incidentId,
    assignedCount: resourceIds.length,
    assignments: assignmentResult.assignments,
    simulations: simulationResults,
  };
};

/**
 * PHASE 26 & 27: Master Simulation Engine Methods
 */

/**
 * Start a new emergency response simulation
 */
export const startSimulation = async ({
  scenario,
  speed = 1,
  autoRun = false,
  stepDelayMs = 2500,
  user = null,
}) => {
  if (!scenario || !SCENARIO_CONFIGS[scenario]) {
    throw new BadRequestError(
      `Invalid scenario '${scenario}'. Must be one of: ${Object.keys(SCENARIO_CONFIGS).join(', ')}`
    );
  }

  const config = SCENARIO_CONFIGS[scenario];
  const simulationId = `SIM-${scenario.slice(0, 4)}-${Date.now()}`;

  const createdBy = {
    userId: user ? (user.id || user._id?.toString()) : 'SYSTEM',
    name: user ? (user.name || user.email) : 'SYSTEM OPERATOR',
    role: user ? user.role : 'OPERATOR',
  };

  const simulation = await SimulationModel.create({
    simulationId,
    scenario,
    status: 'RUNNING',
    currentStep: 0,
    totalSteps: config.totalSteps,
    startedAt: new Date(),
    createdBy,
    incidentIds: [],
    eventHistory: [],
    configuration: {
      speed: Number(speed) || 1,
      autoRun: Boolean(autoRun),
      stepDelayMs: Number(stepDelayMs) || 2500,
    },
    metadata: {
      scenarioTitle: config.title,
    },
  });

  emitSimulationStarted(simulation);

  await AuditService.logAction({
    user,
    action: 'SIMULATION_STARTED',
    entityType: 'SIMULATION',
    entityId: simulation.simulationId,
    metadata: { scenario, autoRun, speed },
    simulationId: simulation.simulationId,
  });

  // Automatically execute Step 1 (Incident creation)
  const initializedSim = await advanceSimulationStep(simulation.simulationId, user);
  return initializedSim;
};

/**
 * Advance an ongoing simulation by one step
 */
export const advanceSimulation = async (simulationId, user = null) => {
  const sim = await SimulationModel.findOne({
    $or: [{ simulationId }, { _id: simulationId.match(/^[0-9a-fA-F]{24}$/) ? simulationId : null }],
  });

  if (!sim) {
    throw new NotFoundError(`Simulation not found: ${simulationId}`);
  }

  if (sim.status === 'COMPLETED' || sim.status === 'STOPPED') {
    return sim;
  }

  return await advanceSimulationStep(sim.simulationId, user);
};

/**
 * Stop an ongoing simulation safely
 */
export const stopSimulationEngine = async (simulationId, user = null) => {
  const sim = await SimulationModel.findOne({
    $or: [{ simulationId }, { _id: simulationId.match(/^[0-9a-fA-F]{24}$/) ? simulationId : null }],
  });

  if (!sim) {
    throw new NotFoundError(`Simulation not found: ${simulationId}`);
  }

  clearAutoRunTimer(sim.simulationId);

  sim.status = 'STOPPED';
  sim.stoppedAt = new Date();
  await sim.save();

  emitSimulationStopped(sim);

  await AuditService.logAction({
    user,
    action: 'SIMULATION_STOPPED',
    entityType: 'SIMULATION',
    entityId: sim.simulationId,
    metadata: { currentStep: sim.currentStep, totalSteps: sim.totalSteps },
    simulationId: sim.simulationId,
  });

  return sim;
};

/**
 * Retrieve simulation state and event timeline
 */
export const getSimulationById = async (simulationId) => {
  const sim = await SimulationModel.findOne({
    $or: [{ simulationId }, { _id: simulationId.match(/^[0-9a-fA-F]{24}$/) ? simulationId : null }],
  });

  if (!sim) {
    throw new NotFoundError(`Simulation not found: ${simulationId}`);
  }

  return sim;
};

export default {
  getSimulationStatus,
  setSimulationMode,
  stopSimulation,
  startRouteSimulation,
  startReturnSimulation,
  autoDispatchIncident,
  startSimulation,
  advanceSimulation,
  stopSimulationEngine,
  getSimulationById,
};
