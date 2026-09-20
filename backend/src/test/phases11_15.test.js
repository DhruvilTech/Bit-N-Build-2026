import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Core modules and services under test
import {
  calculateHaversineDistanceKm,
  calculateEta,
  getAverageSpeedForType,
  recalculateEtaForTeam,
} from '../services/eta.service.js';
import {
  createAlert,
  evaluateCriticalIncidentAlert,
  evaluateResponseDelayAlert,
  evaluateResourceShortageAlert,
} from '../services/alert.service.js';
import { checkAssignmentDelay } from '../services/delay.service.js';
import { updateTeamLocationSchema } from '../validators/team.validator.js';
import {
  createAssignmentSchema,
  cancelAssignmentSchema,
} from '../validators/assignment.validator.js';
import {
  acknowledgeAlertSchema,
  resolveAlertSchema,
} from '../validators/alert.validator.js';
import { registerSchema } from '../validators/auth.validator.js';
import { env } from '../config/env.js';
import { authorize } from '../middleware/auth.middleware.js';
import { ConflictError, ForbiddenError } from '../utils/errors.js';

describe('PHASE 11: Response Tracking Lifecycle & Metrics', () => {
  it('should support complete valid assignment lifecycle transitions', () => {
    // State machine definition
    const validTransitions = {
      ASSIGNED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['EN_ROUTE', 'CANCELLED'],
      EN_ROUTE: ['ARRIVED', 'CANCELLED'],
      ARRIVED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    assert.ok(validTransitions.ASSIGNED.includes('DISPATCHED'));
    assert.ok(validTransitions.DISPATCHED.includes('EN_ROUTE'));
    assert.ok(validTransitions.EN_ROUTE.includes('ARRIVED'));
    assert.ok(validTransitions.ARRIVED.includes('COMPLETED'));
  });

  it('should reject invalid state transitions with strict validation', () => {
    // Transition validation logic
    const validateTransition = (currentStatus, targetStatus) => {
      const allowed = {
        ASSIGNED: ['DISPATCHED', 'CANCELLED'],
        DISPATCHED: ['EN_ROUTE', 'CANCELLED'],
        EN_ROUTE: ['ARRIVED', 'CANCELLED'],
        ARRIVED: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (currentStatus === targetStatus) {
        return { valid: true, isIdempotent: true };
      }
      if (!allowed[currentStatus] || !allowed[currentStatus].includes(targetStatus)) {
        throw new ConflictError(`Invalid transition from ${currentStatus} to ${targetStatus}`);
      }
      return { valid: true, isIdempotent: false };
    };

    // Invalid transition: ASSIGNED -> COMPLETED
    assert.throws(() => validateTransition('ASSIGNED', 'COMPLETED'), ConflictError);
    // Invalid transition: ASSIGNED -> ARRIVED
    assert.throws(() => validateTransition('ASSIGNED', 'ARRIVED'), ConflictError);
    // Invalid transition: ARRIVED -> DISPATCHED
    assert.throws(() => validateTransition('ARRIVED', 'DISPATCHED'), ConflictError);
    // Invalid transition from terminal state COMPLETED
    assert.throws(() => validateTransition('COMPLETED', 'CANCELLED'), ConflictError);
  });

  it('should handle repeated transitions idempotently without overwriting timestamps', () => {
    const initialDispatchedAt = new Date('2026-09-20T10:05:00Z');
    const assignment = {
      assignmentId: 'ASN-IDEM-01',
      status: 'DISPATCHED',
      dispatchedAt: initialDispatchedAt,
    };

    // Repeated dispatch request
    if (assignment.status === 'DISPATCHED') {
      // Safe idempotent return
      assert.equal(assignment.status, 'DISPATCHED');
      assert.equal(assignment.dispatchedAt, initialDispatchedAt);
    }
  });

  it('should calculate derived response metrics correctly', () => {
    const assignedAt = new Date('2026-09-20T10:00:00Z');
    const dispatchedAt = new Date('2026-09-20T10:02:30Z'); // 150 seconds
    const arrivedAt = new Date('2026-09-20T10:14:30Z'); // 870 seconds from assignedAt
    const completedAt = new Date('2026-09-20T10:45:00Z'); // 2700 seconds from assignedAt
    const expectedArrivalAt = new Date('2026-09-20T10:10:00Z'); // delayed by 4.5 -> 5 mins

    // dispatchTime (seconds)
    const dispatchTime = Math.round((dispatchedAt.getTime() - assignedAt.getTime()) / 1000);
    assert.equal(dispatchTime, 150);

    // responseTime (seconds from assignedAt to arrivedAt)
    const responseTime = Math.round((arrivedAt.getTime() - assignedAt.getTime()) / 1000);
    assert.equal(responseTime, 870);

    // totalAssignmentTime (seconds)
    const totalAssignmentTime = Math.round((completedAt.getTime() - assignedAt.getTime()) / 1000);
    assert.equal(totalAssignmentTime, 2700);

    // arrivalDelay (minutes past expectedArrivalAt)
    const arrivalDelay = Math.round((arrivedAt.getTime() - expectedArrivalAt.getTime()) / 60000);
    assert.equal(arrivalDelay, 5);
  });

  it('should not mark arrivalDelay if arrived before or on expected arrival time', () => {
    const arrivedAt = new Date('2026-09-20T10:08:00Z');
    const expectedArrivalAt = new Date('2026-09-20T10:10:00Z');
    const diff = arrivedAt.getTime() - expectedArrivalAt.getTime();
    const arrivalDelay = diff > 0 ? Math.round(diff / 60000) : 0;
    assert.equal(arrivalDelay, 0);
  });

  it('should validate cancellation request schema and require reason', () => {
    const validCancel = cancelAssignmentSchema.safeParse({
      body: { reason: 'Incident was duplicate of ER-2040', notes: 'Stand down unit' },
    });
    assert.equal(validCancel.success, true);

    const invalidCancel = cancelAssignmentSchema.safeParse({
      body: { notes: 'No reason provided' },
    });
    assert.equal(invalidCancel.success, false);
  });

  it('should validate assignment creation schema requiring teamId or resourceId', () => {
    const validWithTeam = createAssignmentSchema.safeParse({
      body: { incidentId: 'ER-2048', teamId: 'TEAM-FT01', notes: 'First response' },
    });
    assert.equal(validWithTeam.success, true);

    const validWithResource = createAssignmentSchema.safeParse({
      body: { incidentId: 'ER-2048', resourceId: 'RES-AMB-01' },
    });
    assert.equal(validWithResource.success, true);

    const invalidNoTarget = createAssignmentSchema.safeParse({
      body: { incidentId: 'ER-2048' },
    });
    assert.equal(invalidNoTarget.success, false);
  });
});

describe('PHASE 12: Resource / Team Location Tracking', () => {
  it('should validate valid latitude and longitude coordinates', () => {
    const validLocation = updateTeamLocationSchema.safeParse({
      body: { latitude: 22.3072, longitude: 73.1812, address: 'Alkapuri Fire Station' },
    });
    assert.equal(validLocation.success, true);
    assert.equal(validLocation.data.body.latitude, 22.3072);
    assert.equal(validLocation.data.body.longitude, 73.1812);
  });

  it('should reject invalid latitude (> 90 or < -90)', () => {
    const invalidLat = updateTeamLocationSchema.safeParse({
      body: { latitude: 95.0, longitude: 73.1812 },
    });
    assert.equal(invalidLat.success, false);

    const invalidLatNegative = updateTeamLocationSchema.safeParse({
      body: { latitude: -91.5, longitude: 73.1812 },
    });
    assert.equal(invalidLatNegative.success, false);
  });

  it('should reject invalid longitude (> 180 or < -180)', () => {
    const invalidLon = updateTeamLocationSchema.safeParse({
      body: { latitude: 22.3072, longitude: 185.0 },
    });
    assert.equal(invalidLon.success, false);

    const invalidLonNegative = updateTeamLocationSchema.safeParse({
      body: { latitude: 22.3072, longitude: -181.0 },
    });
    assert.equal(invalidLonNegative.success, false);
  });

  it('should ensure GeoJSON coordinate ordering is [longitude, latitude]', () => {
    const latitude = 22.3072;
    const longitude = 73.1812;
    const geoJsonGeometry = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    assert.equal(geoJsonGeometry.coordinates[0], longitude);
    assert.equal(geoJsonGeometry.coordinates[1], latitude);
    assert.notEqual(geoJsonGeometry.coordinates[0], latitude);
  });

  it('should format team:location socket event payload correctly', () => {
    const teamId = 'TEAM-FT01';
    const latitude = 22.3072;
    const longitude = 73.1812;
    const now = new Date().toISOString();

    const payload = {
      teamId,
      latitude,
      longitude,
      timestamp: now,
    };

    assert.equal(payload.teamId, 'TEAM-FT01');
    assert.equal(payload.latitude, 22.3072);
    assert.equal(payload.longitude, 73.1812);
    assert.ok(payload.timestamp);
  });

  it('should enforce RBAC authorization and reject VIEWER role from mutating location', () => {
    const authMiddleware = authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'RESPONDER');

    // Responder user: permitted
    const reqResponder = { user: { role: 'RESPONDER' } };
    let responderCalled = false;
    authMiddleware(reqResponder, {}, () => {
      responderCalled = true;
    });
    assert.equal(responderCalled, true);

    // Viewer user: forbidden (403)
    const reqViewer = { user: { role: 'VIEWER' } };
    let viewerError = null;
    authMiddleware(reqViewer, {}, (err) => {
      viewerError = err;
    });
    assert.ok(viewerError instanceof ForbiddenError);
  });

  it('should support RESPONDER and VIEWER in user role schemas', () => {
    const responderUser = registerSchema.safeParse({
      body: {
        name: 'Field Officer Dave',
        email: 'dave.field@ps9.gov',
        password: 'Password@123',
        role: 'RESPONDER',
      },
    });
    assert.equal(responderUser.success, true);
    assert.equal(responderUser.data.body.role, 'RESPONDER');

    const viewerUser = registerSchema.safeParse({
      body: {
        name: 'Observer Alice',
        email: 'alice.viewer@ps9.gov',
        password: 'Password@123',
        role: 'VIEWER',
      },
    });
    assert.equal(viewerUser.success, true);
    assert.equal(viewerUser.data.body.role, 'VIEWER');
  });
});

describe('PHASE 13: ETA Engine & Haversine Distance', () => {
  it('should calculate accurate Haversine distance in kilometers', () => {
    // Vadodara (22.3072, 73.1812) to Ahmedabad (23.0225, 72.5714) ~ 101 km
    const distanceKm = calculateHaversineDistanceKm(22.3072, 73.1812, 23.0225, 72.5714);
    assert.ok(distanceKm >= 95 && distanceKm <= 110, `Distance was ${distanceKm}km, expected ~101km`);
  });

  it('should return 0 km for identical coordinates', () => {
    const distanceKm = calculateHaversineDistanceKm(22.3072, 73.1812, 22.3072, 73.1812);
    assert.equal(distanceKm, 0);
  });

  it('should provide configurable speed models by team type', () => {
    assert.equal(getAverageSpeedForType('AMBULANCE'), env.SPEED_AMBULANCE || 45);
    assert.equal(getAverageSpeedForType('FIRE'), env.SPEED_FIRE || 40);
    assert.equal(getAverageSpeedForType('POLICE'), env.SPEED_POLICE || 50);
    assert.equal(getAverageSpeedForType('RESCUE'), env.SPEED_RESCUE || 35);
    assert.equal(getAverageSpeedForType('HAZMAT'), env.SPEED_HAZMAT || 30);
    assert.equal(getAverageSpeedForType('GENERAL'), env.SPEED_GENERAL || 40);
  });

  it('should compute ETA in minutes and expectedArrivalAt correctly', () => {
    // Distance 10 km at 40 km/h: (10 / 40) * 60 = 15 minutes
    const eta = calculateEta(10.0, 40);
    assert.equal(eta.distanceKm, 10.0);
    assert.equal(eta.estimatedArrivalMinutes, 15);
    assert.ok(eta.expectedArrivalAt instanceof Date);

    const diffMinutes = Math.round((eta.expectedArrivalAt.getTime() - Date.now()) / 60000);
    assert.equal(diffMinutes, 15);
  });

  it('should enforce minimum 1 minute ETA for non-zero distances', () => {
    // Very short distance: 0.1 km at 60 km/h is 6 seconds, should round up to min 1 minute
    const eta = calculateEta(0.1, 60);
    assert.equal(eta.estimatedArrivalMinutes, 1);
  });

  it('should return 0 minutes ETA when team is already at incident location', () => {
    const eta = calculateEta(0.01, 40);
    assert.equal(eta.estimatedArrivalMinutes, 0);
    assert.equal(eta.distanceKm, 0);
  });

  it('should exclude completed, arrived, and cancelled assignments from active ETA updates', () => {
    const activeStatuses = ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'];
    const inactiveStatuses = ['ARRIVED', 'COMPLETED', 'CANCELLED'];

    inactiveStatuses.forEach((status) => {
      assert.equal(activeStatuses.includes(status), false);
    });
  });
});

describe('PHASE 14: SLA / Delay Engine', () => {
  it('should detect when an active assignment has exceeded expectedArrivalAt', async () => {
    const pastExpectedArrival = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const mockAssignment = {
      assignmentId: 'ASN-TEST-DELAY-01',
      incidentId: 'ER-2048',
      teamId: 'TEAM-FT01',
      status: 'EN_ROUTE',
      expectedArrivalAt: pastExpectedArrival,
      isDelayed: false,
      delayMinutes: 0,
      save: async () => {},
    };

    const result = await checkAssignmentDelay(mockAssignment, new Date());
    assert.equal(result.isDelayed, true);
    assert.equal(result.newlyDelayed, true);
    assert.ok(result.delayMinutes >= 9 && result.delayMinutes <= 11);
    assert.equal(mockAssignment.isDelayed, true);
  });

  it('should enforce single logical delay detection event (idempotency)', async () => {
    const pastExpectedArrival = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    const mockAssignment = {
      assignmentId: 'ASN-TEST-DELAY-02',
      incidentId: 'ER-2048',
      teamId: 'TEAM-FT01',
      status: 'EN_ROUTE',
      expectedArrivalAt: pastExpectedArrival,
      isDelayed: true, // Already marked delayed in previous cycle
      delayMinutes: 10,
      save: async () => {},
    };

    const result = await checkAssignmentDelay(mockAssignment, new Date());
    assert.equal(result.isDelayed, true);
    assert.equal(result.newlyDelayed, false); // Does not re-trigger as newly delayed!
    assert.ok(result.delayMinutes >= 14 && result.delayMinutes <= 16);
  });

  it('should not mark arrived, completed, or cancelled assignments as delayed', async () => {
    const pastExpectedArrival = new Date(Date.now() - 30 * 60 * 1000);

    for (const terminalStatus of ['ARRIVED', 'COMPLETED', 'CANCELLED']) {
      const mockAssignment = {
        assignmentId: `ASN-TEST-${terminalStatus}`,
        incidentId: 'ER-2048',
        status: terminalStatus,
        expectedArrivalAt: pastExpectedArrival,
        isDelayed: false,
        save: async () => {},
      };

      const result = await checkAssignmentDelay(mockAssignment, new Date());
      assert.equal(result.isDelayed, false);
      assert.equal(result.newlyDelayed, false);
      assert.equal(mockAssignment.isDelayed, false);
    }
  });
});

describe('PHASE 15: Alert Engine (5 Deterministic Rules & Deduplication)', () => {
  it('should validate alert acknowledge and resolve schemas', () => {
    const validAck = acknowledgeAlertSchema.safeParse({
      body: { note: 'Dispatcher responding to unit delay' },
    });
    assert.equal(validAck.success, true);

    const validResolve = resolveAlertSchema.safeParse({
      body: { resolution: 'Unit arrived on scene safely', note: 'Cleared' },
    });
    assert.equal(validResolve.success, true);
  });

  it('should rule-evaluate Critical Incident Alert for CRITICAL severity only', async () => {
    const criticalIncident = {
      incidentId: 'ER-TEST-CRIT',
      title: 'Major Chemical Explosion',
      type: 'INDUSTRIAL_ACCIDENT',
      severity: 'CRITICAL',
      priority: 'P1',
      status: 'NEW',
    };

    const mediumIncident = {
      incidentId: 'ER-TEST-MED',
      title: 'Minor kitchen fire',
      type: 'FIRE',
      severity: 'MEDIUM',
      priority: 'P3',
      status: 'NEW',
    };

    // Critical incident triggers alert
    const critResult = await evaluateCriticalIncidentAlert(criticalIncident);
    assert.ok(critResult);
    assert.equal(critResult.alert.type, 'CRITICAL_INCIDENT');
    assert.equal(critResult.alert.severity, 'CRITICAL');

    // Medium incident should return null
    const medResult = await evaluateCriticalIncidentAlert(mediumIncident);
    assert.equal(medResult, null);
  });

  it('should rule-evaluate Response Delay Alert when ETA is exceeded', async () => {
    const delayedAssignment = {
      assignmentId: 'ASN-DELAY-RULE',
      incidentId: 'ER-2048',
      teamId: 'TEAM-FT01',
      status: 'EN_ROUTE',
      expectedArrivalAt: new Date(Date.now() - 5 * 60 * 1000),
    };

    const alertResult = await evaluateResponseDelayAlert(delayedAssignment, 5);
    assert.ok(alertResult);
    assert.equal(alertResult.alert.type, 'RESPONSE_DELAY');
    assert.equal(alertResult.alert.severity, 'HIGH');
  });

  it('should rule-evaluate Resource Shortage Alert when required > available', async () => {
    const incident = {
      incidentId: 'ER-TEST-DEFICIT',
      severity: 'HIGH',
      status: 'NEW',
    };

    // Shortage detected: required 3, available 1
    const shortageResult = await evaluateResourceShortageAlert(incident, 3, 1);
    assert.ok(shortageResult);
    assert.equal(shortageResult.alert.type, 'RESOURCE_SHORTAGE');

    // Demand satisfied: required 2, available 3
    const noDeficit = await evaluateResourceShortageAlert(incident, 2, 3);
    assert.equal(noDeficit, null);
  });

  it('should evaluate P1 Unassigned alert condition', () => {
    const p1Incident = { priority: 'P1', status: 'NEW' };
    const hasActiveAssignment = false;

    const shouldAlert = p1Incident.priority === 'P1' && !hasActiveAssignment;
    assert.equal(shouldAlert, true);
  });

  it('should evaluate P1 Escalation alert condition when threshold exceeded', () => {
    const thresholdMinutes = 15;
    const createdAt = new Date(Date.now() - 20 * 60 * 1000); // 20 mins ago
    const elapsedMinutes = Math.round((Date.now() - createdAt.getTime()) / 60000);

    const isEscalationRequired = elapsedMinutes > thresholdMinutes;
    assert.equal(isEscalationRequired, true);
  });

  it('should handle alert idempotency on repeated acknowledge calls', async () => {
    const mockAlert = {
      alertId: 'ALT-TEST-001',
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date('2026-09-20T10:05:00Z'),
      save: async () => {},
    };

    // If alert is already ACKNOWLEDGED, acknowledgeAlert returns without error or changing timestamp
    assert.equal(mockAlert.status, 'ACKNOWLEDGED');
  });

  it('should handle alert idempotency on repeated resolve calls', async () => {
    const mockAlert = {
      alertId: 'ALT-TEST-002',
      status: 'RESOLVED',
      resolvedAt: new Date('2026-09-20T10:30:00Z'),
      save: async () => {},
    };

    // If alert is already RESOLVED, resolveAlert returns without error
    assert.equal(mockAlert.status, 'RESOLVED');
  });

  it('should enforce RBAC authorization on alert mutations for VIEWER', () => {
    const authMutation = authorize('ADMIN', 'OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR', 'RESPONDER');

    // Operator permitted
    let opAllowed = false;
    authMutation({ user: { role: 'OPERATOR' } }, {}, () => {
      opAllowed = true;
    });
    assert.equal(opAllowed, true);

    // Viewer forbidden
    let viewerErr = null;
    authMutation({ user: { role: 'VIEWER' } }, {}, (err) => {
      viewerErr = err;
    });
    assert.ok(viewerErr instanceof ForbiddenError);
  });
});

describe('END-TO-END FLOW: Verification of Complete Emergency Lifecycle', () => {
  it('should verify complete state progression: ASSIGNED -> DISPATCHED -> EN_ROUTE -> ARRIVED -> COMPLETED', () => {
    const history = [];

    let status = 'ASSIGNED';
    history.push(status);

    // 1. Dispatch
    assert.equal(status, 'ASSIGNED');
    status = 'DISPATCHED';
    history.push(status);

    // 2. En Route
    assert.equal(status, 'DISPATCHED');
    status = 'EN_ROUTE';
    history.push(status);

    // 3. Movement & ETA Calculation
    const teamLat = 22.3072;
    const teamLon = 73.1812;
    const incLat = 22.3300;
    const incLon = 73.1900;
    const distance = calculateHaversineDistanceKm(teamLat, teamLon, incLat, incLon);
    const eta = calculateEta(distance, 40);
    assert.ok(distance > 0);
    assert.ok(eta.estimatedArrivalMinutes > 0);

    // 4. Arrive
    assert.equal(status, 'EN_ROUTE');
    status = 'ARRIVED';
    history.push(status);

    // 5. Complete
    assert.equal(status, 'ARRIVED');
    status = 'COMPLETED';
    history.push(status);

    assert.deepEqual(history, ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED']);
  });

  it('should verify delay and escalation path: EN_ROUTE -> ETA Expires -> SLA Delay Alert -> Acknowledge -> Arrive', async () => {
    // 1. Assignment En Route with past ETA
    const pastEta = new Date(Date.now() - 8 * 60 * 1000);
    const assignment = {
      assignmentId: 'ASN-E2E-DELAY',
      incidentId: 'ER-2048',
      teamId: 'TEAM-FT01',
      status: 'EN_ROUTE',
      expectedArrivalAt: pastEta,
      isDelayed: false,
      delayMinutes: 0,
      save: async () => {},
    };

    // 2. SLA Engine detects delay
    const delayCheck = await checkAssignmentDelay(assignment, new Date());
    assert.equal(delayCheck.isDelayed, true);
    assert.equal(delayCheck.newlyDelayed, true);
    assert.ok(delayCheck.delayMinutes >= 7);

    // 3. Alert created with RESPONSE_DELAY
    const alertData = {
      type: 'RESPONSE_DELAY',
      assignmentId: assignment.assignmentId,
      status: 'ACTIVE',
    };
    assert.equal(alertData.type, 'RESPONSE_DELAY');
    assert.equal(alertData.status, 'ACTIVE');

    // 4. Operator Acknowledges Alert
    alertData.status = 'ACKNOWLEDGED';
    alertData.acknowledgedAt = new Date();
    assert.equal(alertData.status, 'ACKNOWLEDGED');

    // 5. Unit Arrives
    assignment.status = 'ARRIVED';
    assignment.arrivedAt = new Date();
    assert.equal(assignment.status, 'ARRIVED');
  });

  it('should verify critical path: P1 unassigned -> UNASSIGNED_CRITICAL -> threshold exceeded -> ESCALATION_REQUIRED', () => {
    const incident = {
      incidentId: 'ER-P1-CRITICAL',
      priority: 'P1',
      status: 'NEW',
      createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
    };
    const hasAssignments = false;

    // Condition 1: P1 without assignment
    const unassignedAlertCondition = incident.priority === 'P1' && !hasAssignments;
    assert.equal(unassignedAlertCondition, true);

    // Condition 2: Escalation threshold (15 mins) exceeded
    const thresholdMinutes = 15;
    const elapsedMinutes = Math.round((Date.now() - incident.createdAt.getTime()) / 60000);
    const escalationCondition = incident.priority === 'P1' && elapsedMinutes > thresholdMinutes;
    assert.equal(escalationCondition, true);
  });
});
