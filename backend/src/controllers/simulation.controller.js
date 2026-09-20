import {
  getSimulationStatus as getSimulationStatusService,
  setSimulationMode as setSimulationModeService,
  startRouteSimulation as startRouteSimulationService,
  startReturnSimulation as startReturnSimulationService,
  stopSimulation as stopSimulationService,
  autoDispatchIncident as autoDispatchIncidentService,
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
