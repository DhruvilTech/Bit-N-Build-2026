/**
 * EmergenX Simulation Workflow Engine (Phase 26 & 27)
 * Orchestrates end-to-end multi-step emergency scenarios using REAL domain services.
 */

import SimulationModel from '../models/simulation.model.js';
import IncidentModel from '../models/incident.model.js';
import ResponseTeamModel from '../models/team.model.js';
import ResourceModel from '../models/resource.model.js';

import {
  createIncident,
  updateIncident,
  updateIncidentStatus,
  runAiAnalysisOnIncident,
} from './incident.service.js';
import { generateRecommendations } from './recommendation.service.js';
import { assignTeamToIncident, releaseTeamFromIncident } from './team.service.js';
import { assignResource, releaseResource } from './resource.service.js';
import { EscalationService } from './escalation.service.js';
import { NotificationService } from './notification.service.js';
import { AuditService } from './auditLog.service.js';

import {
  emitSimulationStep,
  emitSimulationEvent,
  emitSimulationUpdated,
  emitSimulationCompleted,
  emitSimulationStopped,
  emitSimulationError,
  emitIncidentUpdated,
  emitIncidentStatusChanged,
  emitResponseDelayed,
  emitResourceLocationUpdated,
  emitResourceArrived,
} from '../utils/socket.js';

// In-memory active timers for auto-run simulation steps
const activeAutoRunTimers = new Map();
// In-memory lock to prevent concurrent duplicate step advances
const simulationStepLocks = new Set();

/**
 * Scenario configurations with step counts and metadata
 */
export const SCENARIO_CONFIGS = {
  HIGH_RISE_FIRE: {
    title: 'Skyline Plaza Commercial Tower Fire (42 Floors)',
    totalSteps: 15,
    location: {
      address: 'Skyline Plaza, Tower B, Barakhamba Road, Connaught Place',
      latitude: 28.631,
      longitude: 77.2185,
    },
    incidentType: 'FIRE',
    severity: 'CRITICAL',
    priority: 'P1',
  },
  CHEMICAL_FACTORY_EXPLOSION: {
    title: 'Apex Petrochemical Refinery Reactor Rupture',
    totalSteps: 12,
    location: {
      address: 'Apex Petrochemical Complex, Sector 4, Okhla Industrial Area',
      latitude: 28.528,
      longitude: 77.275,
    },
    incidentType: 'INDUSTRIAL_ACCIDENT',
    severity: 'CRITICAL',
    priority: 'P1',
  },
  FLASH_FLOOD: {
    title: 'Metro Underpass Submersion & Embankment Breach',
    totalSteps: 12,
    location: {
      address: 'Yamuna Riverbank Sector 5 Subway Interchange',
      latitude: 28.653,
      longitude: 77.241,
    },
    incidentType: 'FLOOD',
    severity: 'CRITICAL',
    priority: 'P1',
  },
  HIGHWAY_TANKER_PILEUP: {
    title: 'NH-48 Hazardous Materials Freight Tanker Collision',
    totalSteps: 12,
    location: {
      address: 'NH-48 Expressway Flyover, km 18 Milestone',
      latitude: 28.567,
      longitude: 77.122,
    },
    incidentType: 'ROAD_ACCIDENT',
    severity: 'HIGH',
    priority: 'P2',
  },
};

/**
 * Clear any active auto-run timer for a simulation
 */
export const clearAutoRunTimer = (simulationId) => {
  if (activeAutoRunTimers.has(simulationId)) {
    clearTimeout(activeAutoRunTimers.get(simulationId));
    activeAutoRunTimers.delete(simulationId);
  }
};

/**
 * Record a timeline event on the simulation model and emit real-time event
 */
const appendSimulationEvent = async (sim, eventData) => {
  sim.eventHistory.push(eventData);
  await sim.save();
  emitSimulationEvent(sim, eventData);
  emitSimulationStep(sim, eventData);
  return eventData;
};

/**
 * High-Rise Fire Scenario Step Implementations (15 Steps)
 */
const executeHighRiseFireStep = async (sim, stepNumber, operatorUser) => {
  const meta = sim.metadata || {};
  let currentIncidentId = sim.incidentIds?.[0] || meta.incidentId;
  let incident = null;

  if (currentIncidentId) {
    incident = await IncidentModel.findOne({ incidentId: currentIncidentId });
  }

  switch (stepNumber) {
    case 1: {
      // Step 1: Create Incident
      const initialReports = [
        {
          reportId: `REP-SIM-1`,
          source: 'EMERGENCY_CALL',
          text: 'Flames and heavy smoke observed erupting from 18th floor windows of Skyline Commercial Plaza. At least 15 occupants trapped.',
          reliability: 95,
        },
        {
          reportId: `REP-SIM-2`,
          source: 'SENSOR',
          text: 'Building automated smoke detector loop B-18 registered high particulate density and 380°C thermal threshold.',
          reliability: 99,
        },
      ];

      const created = await createIncident(
        {
          title: 'Skyline Commercial Plaza High-Rise Inferno',
          type: 'FIRE',
          description:
            'Major fire spreading rapidly through 18th–21st floors of 42-story commercial skyscraper. Evacuation stairwells compromised.',
          location: {
            address: 'Skyline Plaza, Tower B, Barakhamba Road, Connaught Place',
            latitude: 28.631,
            longitude: 77.2185,
          },
          source: 'EMERGENCY_CALL',
          reports: initialReports,
          isSimulation: true,
          simulationId: sim.simulationId,
          metadata: {
            isSimulation: true,
            simulationId: sim.simulationId,
            scenario: sim.scenario,
          },
        },
        operatorUser
      );

      sim.incidentIds = [created.incidentId];
      sim.metadata = { ...sim.metadata, incidentId: created.incidentId };
      await sim.save();

      await appendSimulationEvent(sim, {
        step: 1,
        type: 'INCIDENT_CREATED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: created.incidentId,
        payload: { title: created.title, location: created.location },
        message: `High-rise fire incident ${created.incidentId} successfully ingested and created in real-time operational database.`,
      });
      break;
    }

    case 2: {
      // Step 2: Run AI classification
      if (!incident) throw new Error('Incident not found for AI classification step');
      incident.status = 'ANALYZING';
      await incident.save();

      const aiResult = await runAiAnalysisOnIncident(incident, operatorUser);

      await appendSimulationEvent(sim, {
        step: 2,
        type: 'AI_CLASSIFIED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: {
          classification: aiResult?.classification || 'FIRE',
          confidence: aiResult?.confidence || 0.96,
        },
        message: `Autonomous AI NLP analyzed multi-source distress signals: Class FIRE with 96% confidence score.`,
      });
      break;
    }

    case 3: {
      // Step 3: Determine Severity
      if (!incident) throw new Error('Incident not found for severity step');
      incident.severity = 'CRITICAL';
      await incident.save();

      emitIncidentUpdated(incident);

      await appendSimulationEvent(sim, {
        step: 3,
        type: 'SEVERITY_DETERMINED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: { severity: 'CRITICAL' },
        message: `Hazard matrix evaluated structural height (42 floors) and trapped occupant risk: Severity rated CRITICAL.`,
      });
      break;
    }

    case 4: {
      // Step 4: Determine Priority
      if (!incident) throw new Error('Incident not found for priority step');
      incident.priority = 'P1';
      incident.status = 'PRIORITIZED';
      await incident.save();

      emitIncidentUpdated(incident);

      await appendSimulationEvent(sim, {
        step: 4,
        type: 'PRIORITY_ASSIGNED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: { priority: 'P1' },
        message: `Life-safety deterministic override enforced: Operational Priority escalated to P1 (Immediate Threat).`,
      });
      break;
    }

    case 5: {
      // Step 5: Duplicate Detection & Sensor Corroboration
      if (!incident) throw new Error('Incident not found for duplicate detection step');
      // Ingest 2 additional citizen reports into incident
      incident.reports.push(
        {
          reportId: `REP-SIM-3`,
          source: 'CITIZEN',
          text: 'Heavy glass falling onto pedestrian footpath outside Tower B. People waving from 19th floor windows.',
          reliability: 90,
          reportedAt: new Date(),
        },
        {
          reportId: `REP-SIM-4`,
          source: 'FIELD_TEAM',
          text: 'Police traffic patrol 04 confirms heavy structural smoke billowing from east face of high-rise.',
          reliability: 98,
          reportedAt: new Date(),
        }
      );
      incident.sourceCount = incident.reports.length;
      await incident.save();

      emitIncidentUpdated(incident);

      await appendSimulationEvent(sim, {
        step: 5,
        type: 'DUPLICATES_CONSOLIDATED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: { totalCorroboratingReports: incident.reports.length },
        message: `Semantic clustering merged 4 incoming calls and telemetry reports into canonical incident cluster.`,
      });
      break;
    }

    case 6: {
      // Step 6: Resource Recommendations
      if (!incident) throw new Error('Incident not found for recommendation step');
      const recs = await generateRecommendations(
        incident.incidentId,
        { requiredSpecialization: 'FIRE_SUPPRESSION', maxResults: 5 },
        operatorUser
      );

      sim.metadata = {
        ...sim.metadata,
        recommendedTeamId: recs.teams?.[0]?.teamId || 'TEAM-FT01',
        recommendedResourceId: recs.resources?.[0]?.resourceId || 'RES-FE01',
      };
      await sim.save();

      await appendSimulationEvent(sim, {
        step: 6,
        type: 'RESOURCES_RECOMMENDED',
        status: 'SUCCESS',
        entityType: 'RECOMMENDATION',
        entityId: incident.incidentId,
        payload: {
          recommendedTeams: recs.teams?.length || 2,
          topTeam: recs.teams?.[0]?.name || 'Central High-Rise Ladder Brigade',
        },
        message: `Geospatial capability engine matched optimal units: Heavy Turntable Ladder 01 and High-Volume Foam Tender.`,
      });
      break;
    }

    case 7: {
      // Step 7: Operator Assignment
      if (!incident) throw new Error('Incident not found for assignment step');
      let teamToAssign = await ResponseTeamModel.findOne({
        $or: [{ teamId: sim.metadata?.recommendedTeamId }, { type: 'FIRE' }, { status: 'AVAILABLE' }],
      });

      if (!teamToAssign) {
        teamToAssign = await ResponseTeamModel.findOne();
      }

      const teamId = teamToAssign ? teamToAssign.teamId : 'TEAM-FT01';

      try {
        await assignTeamToIncident(teamId, { incidentId: incident.incidentId, notes: 'Dispatched for high-rise fire' }, operatorUser);
      } catch (err) {
        // Fallback: assign directly on incident doc if team assignment is occupied
        if (!incident.assignedTeams.includes(teamId)) {
          incident.assignedTeams.push(teamId);
          await incident.save();
        }
      }

      // Also assign a resource apparatus
      const resource = await ResourceModel.findOne({ type: { $in: ['FIRE_TRUCK', 'HEAVY_RESCUE', 'AMBULANCE'] } });
      if (resource) {
        try {
          await assignResource(resource.resourceId, { incidentId: incident.incidentId, teamId, notes: 'Emergency response' }, operatorUser);
        } catch (_) {}
      }

      sim.metadata = { ...sim.metadata, assignedTeamId: teamId };
      await sim.save();

      await appendSimulationEvent(sim, {
        step: 7,
        type: 'TEAM_ASSIGNED',
        status: 'SUCCESS',
        entityType: 'TEAM',
        entityId: teamId,
        payload: { assignedTeamId: teamId, incidentId: incident.incidentId },
        message: `Operator authorized dispatch command: High-Rise Urban Ladder Unit ${teamId} assigned to incident.`,
      });
      break;
    }

    case 8: {
      // Step 8: Start Response
      if (!incident) throw new Error('Incident not found for response start step');
      await updateIncidentStatus(incident.incidentId, 'RESPONDING', 'Apparatus rolling from station depot', operatorUser);

      await appendSimulationEvent(sim, {
        step: 8,
        type: 'RESPONSE_STARTED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: { status: 'RESPONDING' },
        message: `Sirens active: Response team en route with estimated arrival time of 06 minutes.`,
      });
      break;
    }

    case 9: {
      // Step 9: Live GPS Tracking & Telemetry
      if (!incident) throw new Error('Incident not found for tracking step');
      const transitCoords = {
        latitude: 28.625,
        longitude: 77.214,
        speedKmh: 58,
        heading: 32,
      };

      emitResourceLocationUpdated({
        resourceId: sim.metadata?.assignedTeamId || 'TEAM-FT01',
        incidentId: incident.incidentId,
        location: transitCoords,
        timestamp: new Date(),
      });

      await appendSimulationEvent(sim, {
        step: 9,
        type: 'GPS_TELEMETRY_UPDATED',
        status: 'SUCCESS',
        entityType: 'RESOURCE',
        entityId: sim.metadata?.assignedTeamId || 'TEAM-FT01',
        payload: transitCoords,
        message: `Live telemetry stream active: Apparatus navigating Barakhamba arterial vector at 58 km/h.`,
      });
      break;
    }

    case 10: {
      // Step 10: Simulate Response Delay
      if (!incident) throw new Error('Incident not found for delay step');
      incident.delayDetected = true;
      incident.delayMinutes = 6;
      await incident.save();

      emitResponseDelayed({
        incidentId: incident.incidentId,
        delayMinutes: 6,
        reason: 'Severe traffic gridlock and fleeing civilian private vehicles on approach corridor.',
      });

      await appendSimulationEvent(sim, {
        step: 10,
        type: 'DELAY_DETECTED',
        status: 'WARNING',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: { delayMinutes: 6, slaBreach: true },
        message: `SLA Latency Flag: Heavy arterial congestion detected; ETA exceeds safety threshold (+6 min delay).`,
      });
      break;
    }

    case 11: {
      // Step 11: Response-Delay Alert Created
      if (!incident) throw new Error('Incident not found for alert step');
      const notification = await NotificationService.createNotification({
        type: 'RESPONSE_DELAY',
        title: `CRITICAL TRANSIT DELAY: ${incident.incidentId}`,
        message: `Skyline Plaza high-rise response delayed by 6 minutes. Automatic mutual aid escalation recommended.`,
        severity: 'CRITICAL',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        metadata: {
          simulationId: sim.simulationId,
          delayMinutes: 6,
        },
      });

      await appendSimulationEvent(sim, {
        step: 11,
        type: 'ALERT_DISPATCHED',
        status: 'SUCCESS',
        entityType: 'ALERT',
        entityId: notification.notificationId,
        payload: { alertTitle: notification.title, severity: 'CRITICAL' },
        message: `Automated broadcast triggered: Critical response delay alert sent to Central Dispatch Console.`,
      });
      break;
    }

    case 12: {
      // Step 12: Trigger Escalation
      if (!incident) throw new Error('Incident not found for escalation step');
      const escalation = await EscalationService.triggerEscalation({
        incidentId: incident.incidentId,
        level: 2,
        ruleId: 'RULE-SLA-BREACH',
        reason: 'P1 High-Rise Incident response delayed exceeding 6-minute SLA. Multi-agency mutual aid activated.',
        targetRole: 'ADMIN',
        triggerSource: 'AUTOMATED_SIMULATION_ENGINE',
        metadata: {
          simulationId: sim.simulationId,
          delayMinutes: 6,
        },
      });

      incident.status = 'ESCALATED';
      await incident.save();
      emitIncidentStatusChanged(incident);

      await appendSimulationEvent(sim, {
        step: 12,
        type: 'ESCALATION_TRIGGERED',
        status: 'SUCCESS',
        entityType: 'ESCALATION',
        entityId: escalation.escalationId,
        payload: { level: 2, escalationId: escalation.escalationId },
        message: `Escalation Engine Triggered Level 2 Mutual Aid: Secondary brigades mobilized and trauma centers placed on standby.`,
      });
      break;
    }

    case 13: {
      // Step 13: Simulate Team Arrival On Scene
      if (!incident) throw new Error('Incident not found for arrival step');
      incident.status = 'ON_SCENE';
      await incident.save();

      emitResourceArrived({
        incidentId: incident.incidentId,
        teamId: sim.metadata?.assignedTeamId || 'TEAM-FT01',
        arrivedAt: new Date(),
      });
      emitIncidentStatusChanged(incident);

      await appendSimulationEvent(sim, {
        step: 13,
        type: 'TEAM_ARRIVED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: { status: 'ON_SCENE' },
        message: `Field units on scene: Aerial ladder raised to 19th floor. High-pressure deluge monitors engaged.`,
      });
      break;
    }

    case 14: {
      // Step 14: Resolve Incident
      if (!incident) throw new Error('Incident not found for resolution step');
      incident.status = 'RESOLVED';
      incident.resolvedAt = new Date();
      await incident.save();

      emitIncidentStatusChanged(incident);

      // Release team
      if (sim.metadata?.assignedTeamId) {
        try {
          await releaseTeamFromIncident(sim.metadata.assignedTeamId, { notes: 'Incident extinguished and safe' }, operatorUser);
        } catch (_) {}
      }

      await appendSimulationEvent(sim, {
        step: 14,
        type: 'INCIDENT_RESOLVED',
        status: 'SUCCESS',
        entityType: 'INCIDENT',
        entityId: incident.incidentId,
        payload: { status: 'RESOLVED', resolvedAt: incident.resolvedAt },
        message: `Containment confirmed: 15 civilians safely evacuated via aerial platform. Structural fire fully extinguished.`,
      });
      break;
    }

    case 15: {
      // Step 15: Generate Analytics & Debrief
      await AuditService.logAction({
        user: operatorUser,
        action: 'SIMULATION_COMPLETED',
        entityType: 'SIMULATION',
        entityId: sim.simulationId,
        metadata: {
          scenario: sim.scenario,
          totalSteps: 15,
          incidentId: currentIncidentId,
        },
        simulationId: sim.simulationId,
      });

      sim.status = 'COMPLETED';
      sim.completedAt = new Date();
      await sim.save();

      await appendSimulationEvent(sim, {
        step: 15,
        type: 'SIMULATION_COMPLETED',
        status: 'SUCCESS',
        entityType: 'SIMULATION',
        entityId: sim.simulationId,
        payload: { completedAt: sim.completedAt },
        message: `Simulation lifecycle completed: Cryptographic audit recorded and operational analytics ledger updated.`,
      });

      emitSimulationCompleted(sim);
      break;
    }

    default:
      throw new Error(`Invalid step number ${stepNumber} for scenario ${sim.scenario}`);
  }
};

/**
 * Generic Step Runner for the Other 3 Scenarios
 * (Chemical Explosion, Flash Flood, Highway Pileup)
 */
const executeGenericScenarioStep = async (sim, stepNumber, operatorUser) => {
  const config = SCENARIO_CONFIGS[sim.scenario] || SCENARIO_CONFIGS.HIGH_RISE_FIRE;
  const meta = sim.metadata || {};
  let currentIncidentId = sim.incidentIds?.[0] || meta.incidentId;
  let incident = null;

  if (currentIncidentId) {
    incident = await IncidentModel.findOne({ incidentId: currentIncidentId });
  }

  const totalSteps = config.totalSteps;

  if (stepNumber === 1) {
    // Step 1: Create incident
    const created = await createIncident(
      {
        title: config.title,
        type: config.incidentType,
        description: `Emergency event simulated for ${sim.scenario}: Multi-agency response coordinated in real time.`,
        location: config.location,
        severity: config.severity,
        priority: config.priority,
        source: 'SENSOR',
        isSimulation: true,
        reports: [
          {
            reportId: `REP-SIM-GEN-1`,
            source: 'SENSOR',
            text: `Critical hazard threshold triggered in ${config.location.address}.`,
            reliability: 98,
          },
          {
            reportId: `REP-SIM-GEN-2`,
            source: 'EMERGENCY_CALL',
            text: `Eyewitness emergency reports rapid hazard progression requiring specialized dispatch.`,
            reliability: 92,
          },
        ],
        isSimulation: true,
        simulationId: sim.simulationId,
        metadata: {
          isSimulation: true,
          simulationId: sim.simulationId,
          scenario: sim.scenario,
        },
      },
      operatorUser
    );

    sim.incidentIds = [created.incidentId];
    sim.metadata = { ...sim.metadata, incidentId: created.incidentId };
    await sim.save();

    await appendSimulationEvent(sim, {
      step: 1,
      type: 'INCIDENT_CREATED',
      status: 'SUCCESS',
      entityType: 'INCIDENT',
      entityId: created.incidentId,
      payload: { title: created.title, location: created.location },
      message: `${config.title} created with ID #${created.incidentId}.`,
    });
    return;
  }

  if (stepNumber === 2) {
    if (incident) {
      incident.status = 'ANALYZING';
      await incident.save();
      await runAiAnalysisOnIncident(incident, operatorUser);
    }
    await appendSimulationEvent(sim, {
      step: 2,
      type: 'AI_CLASSIFIED',
      status: 'SUCCESS',
      entityType: 'INCIDENT',
      entityId: incident?.incidentId || 'N/A',
      message: `AI NLP classification verified category ${config.incidentType} with high confidence.`,
    });
    return;
  }

  if (stepNumber === 3) {
    if (incident) {
      incident.severity = config.severity;
      await incident.save();
      emitIncidentUpdated(incident);
    }
    await appendSimulationEvent(sim, {
      step: 3,
      type: 'SEVERITY_DETERMINED',
      status: 'SUCCESS',
      entityType: 'INCIDENT',
      entityId: incident?.incidentId || 'N/A',
      message: `Operational severity confirmed at level ${config.severity}.`,
    });
    return;
  }

  if (stepNumber === 4) {
    if (incident) {
      incident.priority = config.priority;
      incident.status = 'PRIORITIZED';
      await incident.save();
      emitIncidentUpdated(incident);
    }
    await appendSimulationEvent(sim, {
      step: 4,
      type: 'PRIORITY_ASSIGNED',
      status: 'SUCCESS',
      entityType: 'INCIDENT',
      entityId: incident?.incidentId || 'N/A',
      message: `Life-safety triage mapped priority rating ${config.priority}.`,
    });
    return;
  }

  if (stepNumber === 5) {
    if (incident) {
      const recs = await generateRecommendations(incident.incidentId, {}, operatorUser);
      sim.metadata = { ...sim.metadata, recommendedTeamId: recs.teams?.[0]?.teamId || 'TEAM-01' };
      await sim.save();
    }
    await appendSimulationEvent(sim, {
      step: 5,
      type: 'RESOURCES_RECOMMENDED',
      status: 'SUCCESS',
      entityType: 'RECOMMENDATION',
      entityId: incident?.incidentId || 'N/A',
      message: `Closest capable specialized apparatus evaluated via geospatial indexing.`,
    });
    return;
  }

  if (stepNumber === 6) {
    const team = await ResponseTeamModel.findOne();
    const teamId = team ? team.teamId : 'TEAM-FT01';
    sim.metadata = { ...sim.metadata, assignedTeamId: teamId };
    await sim.save();

    if (incident) {
      try {
        await assignTeamToIncident(teamId, { incidentId: incident.incidentId }, operatorUser);
      } catch (_) {}
    }
    await appendSimulationEvent(sim, {
      step: 6,
      type: 'TEAM_ASSIGNED',
      status: 'SUCCESS',
      entityType: 'TEAM',
      entityId: teamId,
      message: `Response crew #${teamId} mobilized and dispatched to scene.`,
    });
    return;
  }

  if (stepNumber === 7) {
    if (incident) {
      await updateIncidentStatus(incident.incidentId, 'RESPONDING', 'En route', operatorUser);
    }
    await appendSimulationEvent(sim, {
      step: 7,
      type: 'RESPONSE_STARTED',
      status: 'SUCCESS',
      entityType: 'INCIDENT',
      entityId: incident?.incidentId || 'N/A',
      message: `Field unit transit initialized; real-time telemetry active.`,
    });
    return;
  }

  if (stepNumber === 8) {
    if (incident) {
      incident.delayDetected = true;
      incident.delayMinutes = 5;
      await incident.save();
      emitResponseDelayed({ incidentId: incident.incidentId, delayMinutes: 5 });
    }
    await appendSimulationEvent(sim, {
      step: 8,
      type: 'DELAY_DETECTED',
      status: 'WARNING',
      entityType: 'INCIDENT',
      entityId: incident?.incidentId || 'N/A',
      message: `Transit delay detected on primary arterial vector (+5m).`,
    });
    return;
  }

  if (stepNumber === 9) {
    const notif = await NotificationService.createNotification({
      type: 'RESPONSE_DELAY',
      title: `TRANSIT DELAY ALERT: ${incident?.incidentId}`,
      message: `Hazard response delayed. Escalation protocol requested.`,
      severity: 'CRITICAL',
      entityType: 'INCIDENT',
      entityId: incident?.incidentId,
    });
    await appendSimulationEvent(sim, {
      step: 9,
      type: 'ALERT_DISPATCHED',
      status: 'SUCCESS',
      entityType: 'ALERT',
      entityId: notif.notificationId,
      message: `Delay alert broadcast to central command monitors.`,
    });
    return;
  }

  if (stepNumber === 10) {
    if (incident) {
      await EscalationService.triggerEscalation({
        incidentId: incident.incidentId,
        level: 2,
        reason: 'Automated delay escalation protocol',
      });
      incident.status = 'ESCALATED';
      await incident.save();
      emitIncidentStatusChanged(incident);
    }
    await appendSimulationEvent(sim, {
      step: 10,
      type: 'ESCALATION_TRIGGERED',
      status: 'SUCCESS',
      entityType: 'ESCALATION',
      entityId: incident?.incidentId || 'N/A',
      message: `Level 2 Mutual Aid escalation triggered across district authorities.`,
    });
    return;
  }

  if (stepNumber === 11) {
    if (incident) {
      incident.status = 'ON_SCENE';
      await incident.save();
      emitIncidentStatusChanged(incident);
    }
    await appendSimulationEvent(sim, {
      step: 11,
      type: 'TEAM_ARRIVED',
      status: 'SUCCESS',
      entityType: 'INCIDENT',
      entityId: incident?.incidentId || 'N/A',
      message: `Tactical units arrived on scene; perimeter secured.`,
    });
    return;
  }

  if (stepNumber === totalSteps) {
    if (incident) {
      incident.status = 'RESOLVED';
      incident.resolvedAt = new Date();
      await incident.save();
      emitIncidentStatusChanged(incident);
    }

    sim.status = 'COMPLETED';
    sim.completedAt = new Date();
    await sim.save();

    await AuditService.logAction({
      user: operatorUser,
      action: 'SIMULATION_COMPLETED',
      entityType: 'SIMULATION',
      entityId: sim.simulationId,
      metadata: { scenario: sim.scenario },
      simulationId: sim.simulationId,
    });

    await appendSimulationEvent(sim, {
      step: totalSteps,
      type: 'SIMULATION_COMPLETED',
      status: 'SUCCESS',
      entityType: 'SIMULATION',
      entityId: sim.simulationId,
      message: `Simulation ${sim.simulationId} successfully resolved and audited.`,
    });

    emitSimulationCompleted(sim);
  }
};

/**
 * Advance a simulation by exactly one step (Idempotent and Thread-Safe)
 */
export const advanceSimulationStep = async (simulationId, operatorUser = null) => {
  // Concurrency guard
  if (simulationStepLocks.has(simulationId)) {
    console.warn(`[SimulationWorkflow] Simulation ${simulationId} step already in progress. Skipping duplicate advance.`);
    return await SimulationModel.findOne({ simulationId });
  }

  simulationStepLocks.add(simulationId);

  try {
    const sim = await SimulationModel.findOne({ simulationId });
    if (!sim) {
      throw new Error(`Simulation not found: ${simulationId}`);
    }

    if (sim.status === 'COMPLETED' || sim.status === 'STOPPED') {
      return sim;
    }

    const nextStep = sim.currentStep + 1;
    if (nextStep > sim.totalSteps) {
      sim.status = 'COMPLETED';
      sim.completedAt = new Date();
      await sim.save();
      emitSimulationCompleted(sim);
      return sim;
    }

    sim.status = 'RUNNING';
    sim.currentStep = nextStep;
    await sim.save();

    // Execute appropriate scenario step
    if (sim.scenario === 'HIGH_RISE_FIRE') {
      await executeHighRiseFireStep(sim, nextStep, operatorUser);
    } else {
      await executeGenericScenarioStep(sim, nextStep, operatorUser);
    }

    emitSimulationUpdated(sim);

    // If autoRun is enabled and simulation has not completed or stopped, queue next step
    if (sim.configuration?.autoRun && sim.status === 'RUNNING' && sim.currentStep < sim.totalSteps) {
      clearAutoRunTimer(sim.simulationId);
      const delay = sim.configuration?.stepDelayMs || 2500;
      const timer = setTimeout(async () => {
        try {
          await advanceSimulationStep(sim.simulationId, operatorUser);
        } catch (err) {
          console.error(`[SimulationWorkflow] Auto-run error on ${sim.simulationId}:`, err);
        }
      }, delay);
      activeAutoRunTimers.set(sim.simulationId, timer);
    }

    return sim;
  } catch (error) {
    console.error(`[SimulationWorkflow] Step failure for ${simulationId}:`, error);
    const sim = await SimulationModel.findOne({ simulationId });
    if (sim) {
      sim.status = 'FAILED';
      await sim.save();
      emitSimulationError(sim, error.message);
    }
    throw error;
  } finally {
    simulationStepLocks.delete(simulationId);
  }
};

export default {
  SCENARIO_CONFIGS,
  advanceSimulationStep,
  clearAutoRunTimer,
};
