import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { IncidentModel } from '../models/incident.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { AlertModel } from '../models/alert.model.js';
import Escalation from '../models/escalation.model.js';
import { UserModel } from '../models/user.model.js';
import {
  runAiAnalysisOnIncident,
  appendTimelineEvent,
  getIncidentTimeline,
} from '../services/incident.service.js';
import { generateRecommendations } from '../services/recommendation.service.js';
import {
  assignResourcesToIncident,
  updateAssignmentStatus,
} from '../services/assignment.service.js';
import { createAlert } from '../services/alert.service.js';
import { EscalationService } from '../services/escalation.service.js';
import { emitIncidentTimeline, emitAlertNew } from '../utils/socket.js';

let server;
let baseUrl;
let testOperatorUser;
let testViewerUser;

const signTestToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id || testOperatorUser?._id?.toString(),
      email: payload.email || 'test@emergency.ps9.gov',
      role: payload.role || 'OPERATOR',
      name: payload.name || 'Test Operator',
    },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI);
  }

  // Create test users for authentication & RBAC
  testOperatorUser = await UserModel.create({
    name: 'Test Operator',
    email: `test.operator.${Date.now()}@emergency.ps9.gov`,
    password: 'Password@2026',
    role: 'OPERATOR',
    isActive: true,
  });

  testViewerUser = await UserModel.create({
    name: 'Test Viewer',
    email: `test.viewer.${Date.now()}@emergency.ps9.gov`,
    password: 'Password@2026',
    role: 'VIEWER',
    isActive: true,
  });

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
});

after(async () => {
  if (testOperatorUser) {
    await UserModel.deleteOne({ _id: testOperatorUser._id });
  }
  if (testViewerUser) {
    await UserModel.deleteOne({ _id: testViewerUser._id });
  }
  if (server) {
    server.close();
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Phases 36–41 Master Integration Test Suite', () => {
  let testIncidentId;
  let testIncidentDoc;
  let testResourceId;

  it('Scenario 1: Incident + AI explainability & timeline milestone events (Phase 36 & 37)', async () => {
    testIncidentId = `INC-E2E-${Date.now()}`;
    testIncidentDoc = await IncidentModel.create({
      incidentId: testIncidentId,
      title: 'Industrial Chemical Leak & Fire',
      description: 'Major fire breakout with dense toxic smoke reported near warehouse district.',
      type: 'FIRE',
      status: 'NEW',
      severity: 'CRITICAL',
      priority: 'P1',
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Sector 5, Industrial Area, Bangalore',
        geometry: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
        },
      },
      timeline: [
        {
          timelineId: `TL-${Date.now()}-INIT`,
          event: 'INCIDENT_CREATED',
          previousStatus: 'NEW',
          newStatus: 'NEW',
          changedBy: { userId: 'OPERATOR-1', name: 'Duty Officer', role: 'OPERATOR' },
          timestamp: new Date(),
          description: 'Emergency incident logged into dispatch mesh',
        },
      ],
    });

    assert.ok(testIncidentDoc._id, 'Incident document must be created');
    assert.equal(testIncidentDoc.timeline[0].event, 'INCIDENT_CREATED');

    // Run AI Analysis
    await runAiAnalysisOnIncident(testIncidentDoc);

    const updatedIncident = await IncidentModel.findOne({ incidentId: testIncidentId });
    assert.ok(updatedIncident.aiAnalysis, 'aiAnalysis object must be populated');

    // Verify Phase 36 explainability normalization
    const explainability = updatedIncident.aiAnalysis;
    assert.ok(explainability.classification?.value, 'classification.value must be normalized');
    assert.ok(explainability.severityRating?.value, 'severityRating.value must be normalized');
    assert.ok(explainability.priorityRating?.value, 'priorityRating.value must be normalized');
    assert.ok(explainability.reason, 'reason must be populated');
    assert.ok(Array.isArray(explainability.recommendations), 'recommendations must be an array');
    assert.ok(Array.isArray(explainability.riskFactors), 'riskFactors must be an array');

    // Verify confidence is a valid number and not NaN
    const conf = explainability.classification.confidence;
    assert.ok(typeof conf === 'number' && !isNaN(conf) && conf >= 0 && conf <= 1, 'Confidence must be a normalized number [0, 1]');

    // Verify Phase 37 timeline milestones
    const timelineEvents = updatedIncident.timeline.map((t) => t.event);
    assert.ok(timelineEvents.includes('AI_ANALYSIS_STARTED'), 'Timeline must include AI_ANALYSIS_STARTED');
    assert.ok(timelineEvents.includes('AI_ANALYSIS_COMPLETED'), 'Timeline must include AI_ANALYSIS_COMPLETED');
    assert.ok(timelineEvents.includes('INCIDENT_CLASSIFIED'), 'Timeline must include INCIDENT_CLASSIFIED');
  });

  it('Scenario 2: Duplicate detection & merge timeline milestone (Phase 37)', async () => {
    const dupEvent = await appendTimelineEvent(testIncidentId, {
      event: 'DUPLICATE_DETECTED',
      reason: 'Cross-channel duplicate report correlation',
      description: `Potential duplicate report identified (92% semantic similarity to #${testIncidentId})`,
    });

    assert.ok(dupEvent, 'Timeline event should be recorded');
    assert.equal(dupEvent.event, 'DUPLICATE_DETECTED');

    const timeline = await getIncidentTimeline(testIncidentId, { order: 'desc' });
    assert.ok(timeline.length >= 4, 'Timeline should contain multiple milestones');
    assert.equal(timeline[0].event, 'DUPLICATE_DETECTED', 'Latest milestone should be DUPLICATE_DETECTED when order=desc');
  });

  it('Scenario 3: Critical resource recommendation engine (Phase 36 & 38)', async () => {
    testResourceId = `RES-E2E-${Date.now()}`;
    await ResourceModel.create({
      resourceId: testResourceId,
      name: 'Hazardous Materials Engine 01',
      type: 'FIRE_VEHICLE',
      status: 'AVAILABLE',
      availability: true,
      location: {
        latitude: 12.972,
        longitude: 77.595,
        address: 'Station 14, Industrial Area',
        geometry: {
          type: 'Point',
          coordinates: [77.595, 12.972],
        },
      },
      capabilities: ['FIRE_SUPPRESSION', 'HAZMAT', 'WATER_PUMP'],
      capacity: 4,
    });

    const recommendations = await generateRecommendations(testIncidentId, { strategy: 'BALANCED', refresh: true });
    assert.ok(recommendations, 'Recommendations should be generated');
    assert.ok(Array.isArray(recommendations.recommendations), 'recommendations list must be an array');
    assert.ok(recommendations.recommendations.length > 0, 'At least one resource should be recommended');
    assert.ok(recommendations.recommendations[0].score > 0, 'Recommendation must compute non-zero score');
  });

  it('Scenario 4: Assignment lifecycle & timeline RESOURCE_ASSIGNED and RESOURCE_DISPATCHED (Phase 37 & 38)', async () => {
    const assignResult = await assignResourcesToIncident(
      testIncidentId,
      { resourceIds: [testResourceId], notes: 'Urgent deployment for hazmat containment' },
      { id: 'OPERATOR-99', name: 'Command Operator', role: 'OPERATOR' }
    );

    assert.ok(assignResult.assignments.length > 0, 'Assignment should be created');
    const assignment = assignResult.assignments[0];
    assert.equal(assignment.status, 'ASSIGNED');

    // Verify incident timeline recorded RESOURCE_ASSIGNED
    let incident = await IncidentModel.findOne({ incidentId: testIncidentId });
    let events = incident.timeline.map((t) => t.event);
    assert.ok(events.includes('RESOURCE_ASSIGNED'), 'Timeline must include RESOURCE_ASSIGNED');

    // Update assignment to DISPATCHED
    const dispatched = await updateAssignmentStatus(
      assignment.assignmentId,
      { status: 'DISPATCHED', notes: 'Vehicle rolled out of station' },
      { id: 'OPERATOR-99', name: 'Command Operator', role: 'OPERATOR' }
    );

    assert.equal(dispatched.status, 'DISPATCHED');

    incident = await IncidentModel.findOne({ incidentId: testIncidentId });
    events = incident.timeline.map((t) => t.event);
    assert.ok(events.includes('RESOURCE_DISPATCHED'), 'Timeline must include RESOURCE_DISPATCHED');
  });

  it('Scenario 5: Resolution & resource release timeline milestone (Phase 37 & 38)', async () => {
    const assignment = await AssignmentModel.findOne({ incidentId: testIncidentId, resourceId: testResourceId });
    assert.ok(assignment, 'Assignment must exist');

    // Progress through EN_ROUTE -> ON_SCENE -> COMPLETED
    await updateAssignmentStatus(assignment.assignmentId, { status: 'EN_ROUTE' });
    await updateAssignmentStatus(assignment.assignmentId, { status: 'ON_SCENE' });
    await updateAssignmentStatus(assignment.assignmentId, { status: 'COMPLETED' });

    // Resource should now be released and available
    const resource = await ResourceModel.findOne({ resourceId: testResourceId });
    assert.equal(resource.status, 'AVAILABLE', 'Resource status must return to AVAILABLE upon completion');
    assert.equal(resource.availability, true, 'Resource availability must be true');

    // Incident timeline must record RESOURCE_RELEASED
    const incident = await IncidentModel.findOne({ incidentId: testIncidentId });
    const events = incident.timeline.map((t) => t.event);
    assert.ok(events.includes('RESOURCE_RELEASED'), 'Timeline must record RESOURCE_RELEASED');
  });

  it('Scenario 6: ETA exceeded delay alert & escalation timeline (Phase 37 & 38)', async () => {
    // 1. Create delay alert
    const { alert } = await createAlert({
      type: 'RESPONSE_DELAY',
      severity: 'HIGH',
      incidentId: testIncidentId,
      title: 'Response SLA Breach',
      message: 'Vehicle ETA exceeded by 12 minutes due to traffic bottleneck',
    });

    assert.ok(alert, 'Alert must be created');
    assert.equal(alert.status, 'ACTIVE');

    // Verify RESOURCE_DELAYED milestone in timeline
    let incident = await IncidentModel.findOne({ incidentId: testIncidentId });
    let events = incident.timeline.map((t) => t.event);
    assert.ok(events.includes('RESOURCE_DELAYED'), 'Timeline must record RESOURCE_DELAYED');

    // 2. Trigger escalation
    const escalation = await EscalationService.triggerEscalation({
      incidentId: testIncidentId,
      incidentMongoId: incident._id,
      level: 1,
      ruleId: 'ETA_DELAY_SLA',
      reason: 'SLA delay exceeded threshold limit',
      targetRole: 'OPERATOR',
      triggerSource: 'AUTOMATED_ENGINE',
    });

    assert.ok(escalation, 'Escalation must be recorded');

    // Verify ESCALATION_CREATED in timeline
    incident = await IncidentModel.findOne({ incidentId: testIncidentId });
    events = incident.timeline.map((t) => t.event);
    assert.ok(events.includes('ESCALATION_CREATED'), 'Timeline must record ESCALATION_CREATED');
  });

  it('Scenario 7: Socket.IO timeline & alert emission stability (Phase 37 & 38)', () => {
    // Both emitters should execute safely without exceptions even without connected clients
    assert.doesNotThrow(() => {
      emitIncidentTimeline(testIncidentId, {
        event: 'FIELD_UPDATE',
        description: 'Unit testing timeline socket emission',
      });
    }, 'emitIncidentTimeline should not throw');

    assert.doesNotThrow(() => {
      emitAlertNew({
        alertId: 'ALT-TEST-99',
        type: 'RESPONSE_DELAY',
        severity: 'HIGH',
        incidentId: testIncidentId,
      });
    }, 'emitAlertNew should not throw');
  });

  it('Scenario 8: AI unavailable graceful fallback (Phase 36 & 39)', async () => {
    const fallbackIncident = await IncidentModel.create({
      incidentId: `INC-FALLBACK-${Date.now()}`,
      title: 'Electrical Substation Explosion',
      description: 'Transformer blew up, sparks flying',
      type: 'FIRE',
      status: 'NEW',
      severity: 'HIGH',
      priority: 'P1',
      location: {
        latitude: 12.97,
        longitude: 77.59,
        address: 'MG Road',
        geometry: { type: 'Point', coordinates: [77.59, 12.97] },
      },
    });

    // Even if AI service fails or is unreachable, the call shouldn't crash unhandled
    try {
      await runAiAnalysisOnIncident(fallbackIncident);
      assert.ok(fallbackIncident.aiAnalysis, 'AI analysis should finish with status');
    } catch (err) {
      assert.fail(`AI analysis should catch errors gracefully without throwing: ${err.message}`);
    }

    // Clean up
    await IncidentModel.deleteOne({ _id: fallbackIncident._id });
  });

  it('Scenario 9: Security hardening — Unauthorized user rejection (401/403) (Phase 40)', async () => {
    // 9.1 Missing token -> 401 Unauthorized
    const unauthRes = await fetch(`${baseUrl}/incidents`);
    assert.equal(unauthRes.status, 401, 'Unauthenticated request must return 401 Unauthorized');

    // 9.2 Forbidden role (VIEWER attempting an OPERATOR-only action) -> 403 Forbidden
    const viewerToken = signTestToken({ id: testViewerUser._id.toString(), role: 'VIEWER' });
    const forbiddenRes = await fetch(`${baseUrl}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Incident Creation Attempt',
        description: 'This should be blocked by RBAC',
        type: 'OTHER',
        location: {
          latitude: 12.9,
          longitude: 77.5,
          address: 'Test',
        },
      }),
    });
    assert.equal(forbiddenRes.status, 403, 'User with VIEWER role must receive 403 Forbidden on create');
  });

  it('Scenario 10: Invalid lifecycle transition rejection (400) (Phase 37 & 39)', async () => {
    const operatorToken = signTestToken({ id: testOperatorUser._id.toString(), role: 'OPERATOR' });

    // Transitioning with invalid status string should fail schema validation with 400
    const invalidStatusRes = await fetch(`${baseUrl}/incidents/${testIncidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        status: 'NON_EXISTENT_STATUS_XYZ',
      }),
    });
    assert.equal(invalidStatusRes.status, 400, 'Invalid status enum must return 400 Bad Request');
  });

  // Cleanup test artifacts
  after(async () => {
    if (testIncidentId) {
      await IncidentModel.deleteOne({ incidentId: testIncidentId });
      await AssignmentModel.deleteMany({ incidentId: testIncidentId });
      await AlertModel.deleteMany({ incidentId: testIncidentId });
      await Escalation.deleteMany({ incidentId: testIncidentId });
    }
    if (testResourceId) {
      await ResourceModel.deleteOne({ resourceId: testResourceId });
    }
  });
});
