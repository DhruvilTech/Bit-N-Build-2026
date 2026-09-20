import {
  getSimulationStatus as getSimulationStatusService,
  setSimulationMode as setSimulationModeService,
  startRouteSimulation as startRouteSimulationService,
  startReturnSimulation as startReturnSimulationService,
  stopSimulation as stopSimulationService,
  autoDispatchIncident as autoDispatchIncidentService,
  startSimulation as startSimulationService,
  advanceSimulation as advanceSimulationService,
  stopSimulationEngine as stopSimulationEngineService,
  getSimulationById as getSimulationByIdService,
} from '../services/simulation.service.js';

export const getSimulationStatus = async (_req, res) => {
  const status = getSimulationStatusService();
  res.status(200).json({
    success: true,
    data: status,
  });
};

export const toggleSimulationMode = async (req, res) => {
  const { enabled } = req.body;
  const status = setSimulationModeService(enabled !== undefined ? enabled : true);
  res.status(200).json({
    success: true,
    message: `Simulation mode ${status.isSimulationMode ? 'activated' : 'deactivated'}`,
    data: status,
  });
};

export const startAssignmentSimulation = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const intervalMs = req.body?.intervalMs ? Number(req.body.intervalMs) : 1200;
    const result = await startRouteSimulationService(assignmentId, intervalMs);

    res.status(200).json({
      success: true,
      message: `Started route simulation for assignment #${assignmentId}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const startReturnJourneySimulation = async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const intervalMs = req.body?.intervalMs ? Number(req.body.intervalMs) : 1200;
    const result = await startReturnSimulationService(resourceId, intervalMs);

    res.status(200).json({
      success: true,
      message: `Started return journey simulation for resource #${resourceId}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const stopResourceSimulation = async (req, res) => {
  const { resourceId } = req.params;
  const stopped = stopSimulationService(resourceId);
  res.status(200).json({
    success: true,
    message: stopped ? `Simulation stopped for resource #${resourceId}` : 'No active simulation was running',
    data: { stopped, resourceId },
  });
};

export const autoDispatchSimulation = async (req, res, next) => {
  try {
    const { incidentId } = req.params;
    const result = await autoDispatchIncidentService(incidentId);

    res.status(200).json({
      success: true,
      message: `Simulation: Auto-dispatched ${result.assignedCount} resource(s) to incident #${incidentId}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Master Simulation REST Controller Handlers (Phase 26)
 */

export const startSimulation = async (req, res, next) => {
  try {
    const { scenario, speed, autoRun, stepDelayMs } = req.body;
    const simulation = await startSimulationService({
      scenario,
      speed,
      autoRun,
      stepDelayMs,
      user: req.user,
    });

    res.status(201).json({
      success: true,
      message: `Emergency simulation started for scenario ${scenario}`,
      simulation: {
        id: simulation.simulationId,
        simulationId: simulation.simulationId,
        scenario: simulation.scenario,
        status: simulation.status,
        currentStep: simulation.currentStep,
        totalSteps: simulation.totalSteps,
        incidentIds: simulation.incidentIds,
        eventHistory: simulation.eventHistory,
        configuration: simulation.configuration,
        startedAt: simulation.startedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const advanceSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const simulation = await advanceSimulationService(id, req.user);

    res.status(200).json({
      success: true,
      message: `Advanced simulation #${simulation.simulationId} to step ${simulation.currentStep}`,
      simulation: {
        id: simulation.simulationId,
        simulationId: simulation.simulationId,
        scenario: simulation.scenario,
        status: simulation.status,
        currentStep: simulation.currentStep,
        totalSteps: simulation.totalSteps,
        incidentIds: simulation.incidentIds,
        eventHistory: simulation.eventHistory,
        configuration: simulation.configuration,
        startedAt: simulation.startedAt,
        completedAt: simulation.completedAt,
        stoppedAt: simulation.stoppedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const stopSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const simulation = await stopSimulationEngineService(id, req.user);

    res.status(200).json({
      success: true,
      message: `Stopped simulation #${simulation.simulationId}`,
      simulation: {
        id: simulation.simulationId,
        simulationId: simulation.simulationId,
        scenario: simulation.scenario,
        status: simulation.status,
        currentStep: simulation.currentStep,
        totalSteps: simulation.totalSteps,
        stoppedAt: simulation.stoppedAt,
        eventHistory: simulation.eventHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const simulation = await getSimulationByIdService(id);

    res.status(200).json({
      success: true,
      simulation: {
        id: simulation.simulationId,
        simulationId: simulation.simulationId,
        scenario: simulation.scenario,
        status: simulation.status,
        currentStep: simulation.currentStep,
        totalSteps: simulation.totalSteps,
        incidentIds: simulation.incidentIds,
        eventHistory: simulation.eventHistory,
        configuration: simulation.configuration,
        startedAt: simulation.startedAt,
        stoppedAt: simulation.stoppedAt,
        completedAt: simulation.completedAt,
        createdBy: simulation.createdBy,
        metadata: simulation.metadata,
      },
    });
  } catch (error) {
    next(error);
  }
};

