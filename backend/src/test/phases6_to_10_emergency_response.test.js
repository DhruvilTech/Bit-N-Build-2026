/**
 * EmergenX Phases 6–10 Comprehensive Automated Test Suite
 * Validates all 16 required test scenarios:
 * 1. Resource recommendation with matching capabilities
 * 2. No suitable resource available
 * 3. Capability mismatch filtering
 * 4. Distance-based recommendation
 * 5. Multiple resource assignment
 * 6. Duplicate assignment prevention
 * 7. Unavailable resource rejection
 * 8. Unauthorized assignment
 * 9. Resource release
 * 10. Duplicate release prevention
 * 11. Valid response status transitions
 * 12. Invalid status transition rejection
 * 13. Response time calculation
 * 14. Database consistency
 * 15. Socket event emission after successful operations
 * 16. AI service unavailable behavior
 */

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { env } from '../config/env.js';
import { initSocketServer, getSocketServer } from '../utils/socket.js';
import { IncidentModel } from '../models/incident.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import { RecommendationModel } from '../models/recommendation.model.js';

let server;
let baseUrl;

const runTests = async () => {
  console.log('\n====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TEST SUITE: PHASES 6 TO 10');
  console.log('   Resource Recommendation, Assignment, Release & Tracking');
  console.log('====================================================\n');

  await mongoose.connect(env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  // Initialize HTTP and Socket Server
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);
  server = httpServer.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  console.log(`✓ Test server running on ${baseUrl}`);

  // Obtain Admin Bearer Token
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@emergency.ps9.gov', password: 'Emergency@2026' }),
  }).then((r) => r.json());

  if (!loginRes?.data?.token) {
    throw new Error(`Failed to log in as admin: ${JSON.stringify(loginRes)}`);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loginRes.data.token}`,
  };

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  // Socket event spy
  const socketEventsEmitted = [];
  const io = getSocketServer();
  const originalEmit = io.emit.bind(io);
  io.emit = (event, ...args) => {
    socketEventsEmitted.push({ event, payload: args[0] });
    return originalEmit(event, ...args);
  };

  // Setup Test Data
  const TEST_INCIDENT_ID = `INC-TEST-P610-${Date.now()}`;
  const TEST_RES_FIRE_NEAR = `RES-FIRE-NEAR-${Date.now()}`;
  const TEST_RES_FIRE_FAR = `RES-FIRE-FAR-${Date.now()}`;
  const TEST_RES_MED = `RES-MED-TEST-${Date.now()}`;
  const TEST_RES_POLICE = `RES-POL-TEST-${Date.now()}`;
  const TEST_RES_BUSY = `RES-BUSY-TEST-${Date.now()}`;

  try {
    // 0. Seed Test Incident & Resources
    console.log('\n--- 0. Setting Up Test Fixtures ---');
    await IncidentModel.create({
      incidentId: TEST_INCIDENT_ID,
      title: 'Commercial Building Fire with Trapped Occupants',
      type: 'FIRE',
      description: 'Massive blaze on 3rd floor. Thick black smoke, 2 civilians reported trapped.',
      severity: 'HIGH',
      priority: 'P2',
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        address: 'Connaught Place Central, New Delhi',
        geometry: { type: 'Point', coordinates: [77.209, 28.6139] },
      },
      status: 'NEW',
      source: 'EMERGENCY_CALL',
      aiAnalysis: {
        status: 'COMPLETED',
        incidentType: 'FIRE',
        severity: 'HIGH',
        priority: 'P2',
        signals: ['fire', 'trapped_occupants', 'smoke'],
        primaryHazard: 'structure fire',
        recommendedResourceTypes: ['FIRE_VEHICLE', 'AMBULANCE'],
      },
    });

    await ResourceModel.create([
      {
        resourceId: TEST_RES_FIRE_NEAR,
        name: 'Engine Company 1 (Near)',
        type: 'FIRE_VEHICLE',
        status: 'AVAILABLE',
        availability: true,
        capabilities: ['FIRE_SUPPRESSION', 'SEARCH_RESCUE'],
        capacity: 4,
        location: {
          latitude: 28.62,
          longitude: 77.21,
          address: 'Station 1 (~0.7km away)',
          geometry: { type: 'Point', coordinates: [77.21, 28.62] },
        },
      },
      {
        resourceId: TEST_RES_FIRE_FAR,
        name: 'Engine Company 9 (Far)',
        type: 'FIRE_VEHICLE',
        status: 'AVAILABLE',
        availability: true,
        capabilities: ['FIRE_SUPPRESSION'],
        capacity: 4,
        location: {
          latitude: 28.72,
          longitude: 77.32,
          address: 'Station 9 (~16km away)',
          geometry: { type: 'Point', coordinates: [77.32, 28.72] },
        },
      },
      {
        resourceId: TEST_RES_MED,
        name: 'Paramedic Ambulance Unit 3',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        availability: true,
        capabilities: ['MEDICAL_RESPONSE'],
        capacity: 2,
        location: {
          latitude: 28.615,
          longitude: 77.208,
          address: 'General Hospital (~0.2km away)',
          geometry: { type: 'Point', coordinates: [77.208, 28.615] },
        },
      },
      {
        resourceId: TEST_RES_POLICE,
        name: 'Police Patrol Unit 12',
        type: 'POLICE_VEHICLE',
        status: 'AVAILABLE',
        availability: true,
        capabilities: ['POLICE_SUPPORT', 'TRAFFIC_CONTROL'],
        capacity: 2,
        location: {
          latitude: 28.614,
          longitude: 77.2095,
          address: 'Sector Police Beat',
          geometry: { type: 'Point', coordinates: [77.2095, 28.614] },
        },
      },
      {
        resourceId: TEST_RES_BUSY,
        name: 'Busy Fire Unit 8',
        type: 'FIRE_VEHICLE',
        status: 'BUSY',
        availability: false,
        currentAssignment: 'ER-OTHER-999',
        capabilities: ['FIRE_SUPPRESSION'],
        capacity: 4,
        location: {
          latitude: 28.614,
          longitude: 77.2095,
          address: 'Deployed elsewhere',
          geometry: { type: 'Point', coordinates: [77.2095, 28.614] },
        },
      },
    ]);
    console.log('✓ Test fixtures successfully created');

    // ----------------------------------------------------------------
    // TEST 1: Resource Recommendation with Matching Capabilities
    // ----------------------------------------------------------------
    console.log('\n--- Test 1: Resource recommendation with matching capabilities ---');
    const recRes = await fetch(
      `${baseUrl}/incidents/${TEST_INCIDENT_ID}/recommendations?strategy=BALANCED&refresh=true`,
      { headers: authHeaders }
    ).then((r) => r.json());

    assert(
      recRes.success &&
        Array.isArray(recRes.data.recommendations) &&
        recRes.data.recommendations.length >= 2,
      'GET /api/incidents/:id/recommendations returns recommended resources',
      JSON.stringify(recRes)
    );

    const nearFireRec = recRes.data.recommendations.find(
      (r) => r.resourceId === TEST_RES_FIRE_NEAR
    );
    assert(
      nearFireRec &&
        nearFireRec.capabilityMatch >= 0.5 &&
        nearFireRec.score > 70 &&
        typeof nearFireRec.reason === 'string',
      'Recommendation includes capability match, score, and explainable reason',
      JSON.stringify(nearFireRec)
    );

    // ----------------------------------------------------------------
    // TEST 2: No Suitable Resource Available Handling
    // ----------------------------------------------------------------
    console.log('\n--- Test 2: No suitable resource available handling ---');
    // Create an incident requiring water rescue where no available resource exists
    const WATER_INCIDENT_ID = `INC-FLOOD-${Date.now()}`;
    await IncidentModel.create({
      incidentId: WATER_INCIDENT_ID,
      title: 'Flash Flood in River Basin',
      type: 'FLOOD',
      description: 'River overflow, requires water rescue boats and swift water divers.',
      severity: 'LOW',
      priority: 'P4',
      location: {
        latitude: 28.6,
        longitude: 77.2,
        address: 'Yamuna River Bank',
        geometry: { type: 'Point', coordinates: [77.2, 28.6] },
      },
      status: 'NEW',
    });

    const noResRec = await fetch(
      `${baseUrl}/incidents/${WATER_INCIDENT_ID}/recommendations?refresh=true`,
      { headers: authHeaders }
    ).then((r) => r.json());

    assert(
      noResRec.success &&
        noResRec.data.recommendations.length === 0 &&
        typeof noResRec.data.explanation === 'string' &&
        noResRec.data.explanation.includes('No available resources'),
      'Handles no suitable resources gracefully with diagnostic explanation',
      JSON.stringify(noResRec)
    );

    // ----------------------------------------------------------------
    // TEST 3: Capability Mismatch Filtering
    // ----------------------------------------------------------------
    console.log('\n--- Test 3: Capability mismatch filtering ---');
    // In the fire incident, police unit should NOT be recommended because it has 0 fire capabilities
    const policeRec = recRes.data.recommendations.find(
      (r) => r.resourceId === TEST_RES_POLICE
    );
    assert(
      !policeRec,
      'Incompatible resources with 0% capability match are excluded from recommendations'
    );

    // ----------------------------------------------------------------
    // TEST 4: Distance-Based Recommendation Ranking
    // ----------------------------------------------------------------
    console.log('\n--- Test 4: Distance-based recommendation ranking ---');
    const nearIndex = recRes.data.recommendations.findIndex(
      (r) => r.resourceId === TEST_RES_FIRE_NEAR
    );
    const farIndex = recRes.data.recommendations.findIndex(
      (r) => r.resourceId === TEST_RES_FIRE_FAR
    );

    assert(
      nearIndex !== -1 && farIndex !== -1 && nearIndex < farIndex,
      'Closer resource ranks higher than distant resource with identical capability',
      `nearIndex: ${nearIndex}, farIndex: ${farIndex}`
    );

    // ----------------------------------------------------------------
    // TEST 5: Multiple Resource Assignment
    // ----------------------------------------------------------------
    console.log('\n--- Test 5: Multiple resource assignment ---');
    const assignPayload = {
      resourceIds: [TEST_RES_FIRE_NEAR, TEST_RES_MED],
      notes: 'Initial response dispatch for building fire',
    };

    const assignRes = await fetch(
      `${baseUrl}/incidents/${TEST_INCIDENT_ID}/assignments`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(assignPayload),
      }
    ).then((r) => r.json());

    assert(
      assignRes.success &&
        assignRes.data.totalAssigned === 2 &&
        assignRes.data.assignments.length === 2,
      'POST /api/incidents/:id/assignments assigns multiple resources',
      JSON.stringify(assignRes)
    );

    // Verify resources transitioned to ASSIGNED
    const checkResNear = await ResourceModel.findOne({ resourceId: TEST_RES_FIRE_NEAR });
    assert(
      checkResNear.status === 'ASSIGNED' &&
        checkResNear.currentAssignment === TEST_INCIDENT_ID &&
        checkResNear.availability === false,
      'Assigned resource status is ASSIGNED and availability is false'
    );

    // Verify incident updated
    const checkIncident = await IncidentModel.findOne({ incidentId: TEST_INCIDENT_ID });
    assert(
      checkIncident.assignedResources.includes(TEST_RES_FIRE_NEAR) &&
        checkIncident.assignedResources.includes(TEST_RES_MED) &&
        checkIncident.status === 'ASSIGNED',
      'Incident assignedResources and status transitioned to ASSIGNED'
    );

    // ----------------------------------------------------------------
    // TEST 6: Duplicate Assignment Prevention
    // ----------------------------------------------------------------
    console.log('\n--- Test 6: Duplicate assignment prevention ---');
    const dupRes = await fetch(
      `${baseUrl}/incidents/${TEST_INCIDENT_ID}/assignments`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ resourceIds: [TEST_RES_FIRE_NEAR] }),
      }
    );

    assert(
      dupRes.status === 409,
      'Duplicate assignment rejected with 409 Conflict'
    );

    // ----------------------------------------------------------------
    // TEST 7: Unavailable Resource Assignment Rejection
    // ----------------------------------------------------------------
    console.log('\n--- Test 7: Unavailable resource rejection ---');
    const unavailRes = await fetch(
      `${baseUrl}/incidents/${TEST_INCIDENT_ID}/assignments`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ resourceIds: [TEST_RES_BUSY] }),
      }
    );

    assert(
      unavailRes.status === 409,
      'Unavailable/Busy resource assignment rejected with 409 Conflict'
    );

    // ----------------------------------------------------------------
    // TEST 8: Unauthorized Assignment Check (RBAC)
    // ----------------------------------------------------------------
    console.log('\n--- Test 8: Unauthorized assignment check (RBAC) ---');
    const unauthRes = await fetch(
      `${baseUrl}/incidents/${TEST_INCIDENT_ID}/assignments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // No auth header
        body: JSON.stringify({ resourceIds: [TEST_RES_FIRE_FAR] }),
      }
    );

    assert(
      unauthRes.status === 401,
      'Unauthenticated assignment rejected with 401 Unauthorized'
    );

    // ----------------------------------------------------------------
    // TEST 9: Resource Release
    // ----------------------------------------------------------------
    console.log('\n--- Test 9: Resource release ---');
    const createdFireAssignment = assignRes.data.assignments.find(
      (a) => a.resourceId === TEST_RES_FIRE_NEAR
    );

    const releaseRes = await fetch(
      `${baseUrl}/assignments/${createdFireAssignment.assignmentId}/release`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ notes: 'Fire suppressed and cleared' }),
      }
    ).then((r) => r.json());

    assert(
      releaseRes.success &&
        releaseRes.data.assignment.status === 'COMPLETED' &&
        releaseRes.data.assignment.releasedAt !== null,
      'POST /api/assignments/:id/release releases resource and sets status to COMPLETED'
    );

    const releasedResource = await ResourceModel.findOne({ resourceId: TEST_RES_FIRE_NEAR });
    assert(
      releasedResource.status === 'AVAILABLE' &&
        releasedResource.currentAssignment === null &&
        releasedResource.availability === true,
      'Released resource status reset to AVAILABLE with availability true'
    );

    // ----------------------------------------------------------------
    // TEST 10: Duplicate Release Prevention
    // ----------------------------------------------------------------
    console.log('\n--- Test 10: Duplicate release prevention ---');
    const dupReleaseRes = await fetch(
      `${baseUrl}/assignments/${createdFireAssignment.assignmentId}/release`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ notes: 'Attempt double release' }),
      }
    );

    assert(
      dupReleaseRes.status === 400,
      'Duplicate release of already completed assignment rejected with 400 Bad Request'
    );

    // ----------------------------------------------------------------
    // TEST 11: Valid Response Status Transitions (Lifecycle Tracking)
    // ----------------------------------------------------------------
    console.log('\n--- Test 11: Valid response status transitions ---');
    const medAssignment = assignRes.data.assignments.find(
      (a) => a.resourceId === TEST_RES_MED
    );

    // ASSIGNED -> DISPATCHED
    const dispatchRes = await fetch(
      `${baseUrl}/assignments/${medAssignment.assignmentId}/status`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'DISPATCHED', notes: 'Sirens on, leaving bay' }),
      }
    ).then((r) => r.json());

    assert(
      dispatchRes.success &&
        dispatchRes.data.assignment.status === 'DISPATCHED' &&
        dispatchRes.data.assignment.dispatchedAt !== null,
      'Transition ASSIGNED -> DISPATCHED succeeds and records dispatchedAt'
    );

    // DISPATCHED -> EN_ROUTE
    const enRouteRes = await fetch(
      `${baseUrl}/assignments/${medAssignment.assignmentId}/status`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'EN_ROUTE', notes: 'Navigating through traffic' }),
      }
    ).then((r) => r.json());

    assert(
      enRouteRes.success &&
        enRouteRes.data.assignment.status === 'EN_ROUTE' &&
        enRouteRes.data.assignment.enRouteAt !== null,
      'Transition DISPATCHED -> EN_ROUTE succeeds and records enRouteAt'
    );

    // EN_ROUTE -> ON_SCENE
    const onSceneRes = await fetch(
      `${baseUrl}/assignments/${medAssignment.assignmentId}/status`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'ON_SCENE', notes: 'Arrived at scene, triage underway' }),
      }
    ).then((r) => r.json());

    assert(
      onSceneRes.success &&
        onSceneRes.data.assignment.status === 'ON_SCENE' &&
        onSceneRes.data.assignment.arrivedAt !== null,
      'Transition EN_ROUTE -> ON_SCENE succeeds and records arrivedAt'
    );

    // ON_SCENE -> COMPLETED
    const completeRes = await fetch(
      `${baseUrl}/assignments/${medAssignment.assignmentId}/status`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'COMPLETED', notes: 'Patient treated and transported' }),
      }
    ).then((r) => r.json());

    assert(
      completeRes.success &&
        completeRes.data.assignment.status === 'COMPLETED' &&
        completeRes.data.assignment.completedAt !== null,
      'Transition ON_SCENE -> COMPLETED succeeds and records completedAt'
    );

    // ----------------------------------------------------------------
    // TEST 12: Invalid Status Transition Rejection
    // ----------------------------------------------------------------
    console.log('\n--- Test 12: Invalid status transition rejection ---');
    // Cannot transition terminal COMPLETED assignment back to DISPATCHED
    const invalidTransRes = await fetch(
      `${baseUrl}/assignments/${medAssignment.assignmentId}/status`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'DISPATCHED' }),
      }
    );

    assert(
      invalidTransRes.status === 400,
      'Invalid status transition from COMPLETED rejected with 400 Bad Request'
    );

    // ----------------------------------------------------------------
    // TEST 13: Response Time & Delay Duration Calculation
    // ----------------------------------------------------------------
    console.log('\n--- Test 13: Response time & delay duration calculation ---');
    assert(
      typeof onSceneRes.data.assignment.responseTimeMinutes === 'number' &&
        typeof onSceneRes.data.assignment.delayMinutes === 'number',
      'Calculates responseTimeMinutes and delayMinutes on arrival',
      `responseTime: ${onSceneRes.data.assignment.responseTimeMinutes}, delay: ${onSceneRes.data.assignment.delayMinutes}`
    );

    // Test Response Metrics Endpoint
    const metricsRes = await fetch(
      `${baseUrl}/incidents/${TEST_INCIDENT_ID}/response-metrics`,
      { headers: authHeaders }
    ).then((r) => r.json());

    assert(
      metricsRes.success &&
        metricsRes.data.totalAssignments === 2 &&
        typeof metricsRes.data.typeBreakdown === 'object',
      'GET /api/incidents/:id/response-metrics returns aggregated response metrics'
    );

    // ----------------------------------------------------------------
    // TEST 14: Database Consistency
    // ----------------------------------------------------------------
    console.log('\n--- Test 14: Database consistency ---');
    const finalMedRes = await ResourceModel.findOne({ resourceId: TEST_RES_MED });
    const finalAsg = await AssignmentModel.findOne({ assignmentId: medAssignment.assignmentId });

    assert(
      finalMedRes.status === 'AVAILABLE' &&
        finalMedRes.currentAssignment === null &&
        finalAsg.status === 'COMPLETED' &&
        finalAsg.timeline.length >= 5,
      'Resource, Assignment, and Incident states are consistently synchronized across models'
    );

    // ----------------------------------------------------------------
    // TEST 15: Socket Event Emission
    // ----------------------------------------------------------------
    console.log('\n--- Test 15: Socket event emission after successful operations ---');
    const emittedEventNames = socketEventsEmitted.map((e) => e.event);
    const hasRecommended = emittedEventNames.includes('resource:recommended');
    const hasAssigned = emittedEventNames.includes('resource:assigned');
    const hasReleased = emittedEventNames.includes('resource:released');
    const hasStatusChanged = emittedEventNames.includes('response:statusChanged');

    assert(
      hasRecommended && hasAssigned && hasReleased && hasStatusChanged,
      'Socket events emitted for recommended, assigned, released, and statusChanged',
      `Emitted events: ${Array.from(new Set(emittedEventNames)).join(', ')}`
    );

    // ----------------------------------------------------------------
    // TEST 16: AI Service Unavailable Behavior (Fail-Safe Fallback)
    // ----------------------------------------------------------------
    console.log('\n--- Test 16: AI service unavailable fallback behavior ---');
    // Create an incident without any AI analysis (e.g. AI was down when created)
    const NO_AI_INCIDENT_ID = `INC-NO-AI-${Date.now()}`;
    await IncidentModel.create({
      incidentId: NO_AI_INCIDENT_ID,
      title: 'Structural Fire in Residential Apartment',
      type: 'FIRE',
      description: 'Kitchen fire spread to curtains and living room.',
      severity: 'MEDIUM',
      priority: 'P3',
      location: {
        latitude: 28.618,
        longitude: 77.209,
        address: 'Sector 2 Apartments',
        geometry: { type: 'Point', coordinates: [77.209, 28.618] },
      },
      status: 'NEW',
      aiAnalysis: {
        status: 'FAILED',
        error: 'AI service unavailable: Connection refused',
      },
    });

    const noAiRecRes = await fetch(
      `${baseUrl}/incidents/${NO_AI_INCIDENT_ID}/recommendations?refresh=true`,
      { headers: authHeaders }
    ).then((r) => r.json());

    assert(
      noAiRecRes.success &&
        Array.isArray(noAiRecRes.data.recommendations) &&
        noAiRecRes.data.recommendations.length > 0,
      'Recommendation engine falls back cleanly to incident metadata when AI is unavailable'
    );
  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  } finally {
    // Cleanup Test Data
    console.log('\n--- Cleaning up test fixtures ---');
    await IncidentModel.deleteMany({
      incidentId: {
        $in: [TEST_INCIDENT_ID, 'INC-FLOOD', TEST_RES_FIRE_NEAR, TEST_RES_MED],
        $regex: /INC-TEST|INC-FLOOD|INC-NO-AI/,
      },
    }).catch(() => {});

    await ResourceModel.deleteMany({
      resourceId: {
        $in: [
          TEST_RES_FIRE_NEAR,
          TEST_RES_FIRE_FAR,
          TEST_RES_MED,
          TEST_RES_POLICE,
          TEST_RES_BUSY,
        ],
      },
    }).catch(() => {});

    await AssignmentModel.deleteMany({
      incidentId: { $regex: /INC-TEST|INC-FLOOD|INC-NO-AI/ },
    }).catch(() => {});

    await RecommendationModel.deleteMany({
      incidentId: { $regex: /INC-TEST|INC-FLOOD|INC-NO-AI/ },
    }).catch(() => {});

    if (server) {
      server.close();
      console.log('✓ Test server closed');
    }
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();
