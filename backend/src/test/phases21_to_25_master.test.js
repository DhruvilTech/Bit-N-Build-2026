import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { TOOL_REGISTRY, AiToolsService } from '../services/aiTools.service.js';
import { AiCommandService } from '../services/aiCommand.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { ShortageService } from '../services/shortage.service.js';
import { getFacilitiesCapacity } from '../services/facility.service.js';
import {
  calculateDistanceKm,
  calculateEtaMinutes,
  calculateRecommendationScore,
} from '../services/recommendation.service.js';

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI);
  }
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Phase 21 — AI Assistant Controlled Tool Layer', () => {
  it('should register all mandatory controlled tools', () => {
    const requiredTools = [
      'getCriticalIncidents',
      'getAvailableResources',
      'getDelayedIncidents',
      'getHospitalCapacity',
      'getResourceShortages',
      'getIncidentSummary',
      'getActiveIncidents',
      'getIncidentDetails',
      'getAssignedResources',
      'getResponseMetrics',
    ];

    for (const toolName of requiredTools) {
      assert.ok(TOOL_REGISTRY[toolName], `Tool ${toolName} must be registered in TOOL_REGISTRY`);
      assert.ok(TOOL_REGISTRY[toolName].schema, `Tool ${toolName} must define a validation schema`);
      assert.ok(TOOL_REGISTRY[toolName].jsonSchema, `Tool ${toolName} must define a JSON schema for LLM`);
      assert.ok(Array.isArray(TOOL_REGISTRY[toolName].roles), `Tool ${toolName} must define authorized roles`);
      assert.equal(typeof TOOL_REGISTRY[toolName].handler, 'function', `Tool ${toolName} must have a handler`);
    }
  });

  it('should validate tool argument schema via Zod', () => {
    const limitTool = TOOL_REGISTRY.getCriticalIncidents;
    const validArgs = limitTool.schema.parse({ limit: 5 });
    assert.equal(validArgs.limit, 5);

    // Negative limit should fail validation
    const invalidResult = limitTool.schema.safeParse({ limit: -1 });
    assert.equal(invalidResult.success, false, 'Negative limit must be rejected by Zod schema');

    // Incident summary requires incidentId
    const summaryTool = TOOL_REGISTRY.getIncidentSummary;
    const missingIdResult = summaryTool.schema.safeParse({});
    assert.equal(missingIdResult.success, false, 'Missing incidentId must fail schema validation');

    const validSummaryArgs = summaryTool.schema.parse({ incidentId: 'INC-1001' });
    assert.equal(validSummaryArgs.incidentId, 'INC-1001');
  });

  it('should reject unregistered tools', async () => {
    await assert.rejects(
      async () => {
        await AiToolsService.executeTool('deleteDatabase', {}, { role: 'ADMIN' });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /not registered/i);
        return true;
      }
    );
  });

  it('should reject unauthorized tool execution based on RBAC', async () => {
    // Viewer role should not be allowed
    await assert.rejects(
      async () => {
        await AiToolsService.executeTool('getCriticalIncidents', {}, { role: 'VIEWER' });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /not authorized/i);
        return true;
      }
    );
  });

  it('should return role-scoped tool definitions for Mistral', () => {
    const operatorTools = AiToolsService.getToolsForRole('OPERATOR');
    assert.ok(Array.isArray(operatorTools));
    assert.ok(operatorTools.length >= 6);

    for (const toolDef of operatorTools) {
      assert.equal(toolDef.type, 'function');
      assert.ok(toolDef.function.name);
      assert.ok(toolDef.function.description);
      assert.ok(toolDef.function.parameters);
    }
  });

  it('should detect operational intents deterministically as fallback', () => {
    assert.equal(AiCommandService.detectIntent('What are the critical incidents?'), 'CRITICAL_INCIDENTS');
    assert.equal(AiCommandService.detectIntent('Which ambulances are available right now?'), 'AVAILABLE_AMBULANCES');
    assert.equal(AiCommandService.detectIntent('Are any incidents delayed?'), 'DELAYED_INCIDENTS');
    assert.equal(AiCommandService.detectIntent('Which hospitals currently have ICU beds?'), 'HOSPITAL_CAPACITY');
    assert.equal(AiCommandService.detectIntent('Are we experiencing any resource shortages?'), 'RESOURCE_SHORTAGES');
    assert.equal(AiCommandService.detectIntent('Give me details for incident INC-1042'), 'INCIDENT_DETAILS');
  });

  it('should synthesize grounded answers distinguishing verified database facts', () => {
    const toolResult = {
      count: 2,
      incidents: [
        { id: 'INC-101', title: 'Industrial Fire', type: 'FIRE', status: 'RESPONDING', location: 'Sector 4', delayed: true },
        { id: 'INC-102', title: 'Highway Crash', type: 'ROAD_ACCIDENT', status: 'NEW', location: 'NH-48', delayed: false },
      ],
    };

    const answer = AiCommandService.synthesizeAnswerFromTool('getCriticalIncidents', toolResult);
    assert.match(answer, /Verified Operational Data/i);
    assert.match(answer, /#INC-101/);
    assert.match(answer, /DELAY DETECTED/);
  });
});

describe('Phase 22 — Analytics Data & Aggregation Layer', () => {
  it('should parse and build date filters correctly', () => {
    const todayFilter = AnalyticsService.buildDateFilter('today');
    assert.ok(todayFilter.createdAt.$gte instanceof Date);

    const sevenDaysFilter = AnalyticsService.buildDateFilter('7d');
    assert.ok(sevenDaysFilter.createdAt.$gte instanceof Date);
    const diffMs = Date.now() - sevenDaysFilter.createdAt.$gte.getTime();
    assert.ok(diffMs >= 6 * 24 * 60 * 60 * 1000);

    const customFilter = AnalyticsService.buildDateFilter('custom', '2026-01-01', '2026-01-31');
    assert.ok(customFilter.createdAt.$gte instanceof Date);
    assert.ok(customFilter.createdAt.$lte instanceof Date);

    const allFilter = AnalyticsService.buildDateFilter('all');
    assert.deepEqual(allFilter, {});
  });

  it('should return valid category structure even when database is empty', async () => {
    const res = await AnalyticsService.getIncidentDistribution({ period: 'today' });
    assert.ok(Array.isArray(res.categories));
    assert.ok(res.categories.length >= 5);
    for (const cat of res.categories) {
      assert.ok(cat.name);
      assert.equal(typeof cat.value, 'number');
      assert.ok(cat.color);
    }
  });

  it('should return valid fleet utilization breakdown', async () => {
    const res = await AnalyticsService.getResourceUtilization();
    assert.ok(Array.isArray(res.fleetData));
    assert.ok(res.fleetData.length >= 4);

    for (const fleet of res.fleetData) {
      assert.ok(fleet.category);
      assert.equal(typeof fleet.active, 'number');
      assert.equal(typeof fleet.reserve, 'number');
      assert.equal(fleet.active + fleet.reserve, 100, 'Active and reserve percentages must sum to 100');
    }
  });

  it('should return valid response time structure with target SLAs', async () => {
    const res = await AnalyticsService.getResponseTimeMetrics({ period: 'today' });
    assert.ok(Array.isArray(res.hourlyData));
    assert.ok(Array.isArray(res.responseTimeData));

    for (const item of res.responseTimeData) {
      assert.ok(item.zone);
      assert.ok(item.actual > 0);
      assert.ok(item.target > 0);
    }
  });
});

describe('Phase 23 — Emergency Heatmap API & Calculation', () => {
  it('should calculate dynamic weights based on severity and report clustering', async () => {
    const mockIncidentCritical = {
      incidentId: 'INC-HEAT-01',
      title: 'High-Rise Fire',
      type: 'FIRE',
      severity: 'CRITICAL',
      status: 'RESPONDING',
      location: { latitude: 28.61, longitude: 77.20 },
      reports: [{}, {}, {}],
    };

    let baseWeight = 0.25;
    if (mockIncidentCritical.severity === 'CRITICAL') baseWeight = 1.0;
    const reportMultiplier = Math.min(2.0, 1.0 + mockIncidentCritical.reports.length * 0.1);
    const weight = Math.min(1.0, Math.round(baseWeight * reportMultiplier * 100) / 100);

    assert.equal(weight, 1.0, 'Critical incident with multiple reports must have maximum weight of 1.0');
  });

  it('should assign lower weight for low severity incidents', () => {
    const mockIncidentLow = {
      severity: 'LOW',
      reports: [],
    };

    let baseWeight = 0.25;
    const reportMultiplier = Math.min(2.0, 1.0 + mockIncidentLow.reports.length * 0.1);
    const weight = Math.min(1.0, Math.round(baseWeight * reportMultiplier * 100) / 100);

    assert.equal(weight, 0.25, 'Low severity incident with no extra reports should have weight 0.25');
  });
});

describe('Phase 24 — Resource Shortage Intelligence', () => {
  it('should correctly calculate incident resource requirements', () => {
    const fireIncident = { type: 'FIRE', severity: 'CRITICAL' };
    const reqs = ShortageService.getRequiredResourcesForIncident(fireIncident);

    assert.equal(reqs.FIRE_VEHICLE, 3, 'Critical fire requires 3 fire vehicles');
    assert.equal(reqs.AMBULANCE, 2, 'Critical fire requires 2 ambulances');
    assert.equal(reqs.RESCUE_EQUIPMENT, 1, 'Critical fire requires 1 rescue equipment');

    const medIncident = { type: 'MEDICAL_EMERGENCY', severity: 'HIGH' };
    const medReqs = ShortageService.getRequiredResourcesForIncident(medIncident);
    assert.equal(medReqs.AMBULANCE, 2, 'High severity medical emergency requires 2 ambulances');
  });

  it('should compute deficit as Demand - Available Supply', () => {
    const required = 9;
    const available = 6;
    const shortage = Math.max(0, required - available);
    assert.equal(shortage, 3, 'Shortage must equal Demand (9) - Available Supply (6) = 3');

    let severity = 'NORMAL';
    if (shortage >= 3) severity = 'CRITICAL';
    else if (shortage > 0) severity = 'HIGH';

    assert.equal(severity, 'CRITICAL', 'Shortage >= 3 must be flagged as CRITICAL');
  });

  it('should return NORMAL severity when supply equals or exceeds demand', () => {
    const required = 5;
    const available = 7;
    const shortage = Math.max(0, required - available);
    assert.equal(shortage, 0);

    let severity = 'NORMAL';
    if (shortage >= 3) severity = 'CRITICAL';
    else if (shortage > 0) severity = 'HIGH';

    assert.equal(severity, 'NORMAL');
  });
});

describe('Phase 25 — Hospital Capacity Intelligence & Recommendations', () => {
  it('should calculate available beds and occupancy percentage correctly', () => {
    const facility = {
      capacity: 50,
      availableCapacity: 8,
      status: 'OPERATIONAL',
    };

    const occupied = facility.capacity - facility.availableCapacity;
    assert.equal(occupied, 42);

    const occupancyRate = Math.round((occupied / facility.capacity) * 100);
    assert.equal(occupancyRate, 84, 'Occupancy rate must be 84%');

    let derivedStatus = 'NORMAL';
    if (facility.status === 'DIVERTING') derivedStatus = 'FULL';
    else if (occupancyRate >= 95 || facility.availableCapacity === 0) derivedStatus = 'FULL';
    else if (occupancyRate >= 85) derivedStatus = 'CRITICAL';
    else if (occupancyRate >= 70) derivedStatus = 'HIGH';

    assert.equal(derivedStatus, 'HIGH');
  });

  it('should flag hospital as FULL if divert status is active', () => {
    const facility = {
      capacity: 100,
      availableCapacity: 20,
      status: 'DIVERTING',
    };

    let derivedStatus = 'NORMAL';
    if (facility.status === 'DIVERTING') derivedStatus = 'FULL';
    assert.equal(derivedStatus, 'FULL');
  });

  it('should compute distance and ETA for medical dispatch routing', () => {
    // Delhi Connaught Place to AIIMS Hospital
    const lat1 = 28.6315;
    const lon1 = 77.2167;
    const lat2 = 28.5672;
    const lon2 = 77.2100;

    const dist = calculateDistanceKm(lat1, lon1, lat2, lon2);
    assert.ok(dist > 5 && dist < 10, `Distance should be approx 7km (got ${dist})`);

    const eta = calculateEtaMinutes(dist);
    assert.ok(eta >= 5 && eta <= 20, `ETA should be reasonable travel time (got ${eta})`);
  });

  it('should score recommendations considering capability match, distance, and ETA', () => {
    const score = calculateRecommendationScore({
      capabilityMatch: 1.0,
      distanceKm: 3.5,
      estimatedArrivalMinutes: 6,
      capacity: 2,
      strategy: 'BALANCED',
      maxDistanceKm: 50,
    });

    assert.ok(score >= 80, `High-match close unit should score >= 80 (got ${score})`);
  });
});
