import mongoose from 'mongoose';
import app from '../app.js';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.model.js';
import { SimulationModel } from '../models/simulation.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { PERMISSIONS, ROLE_PERMISSIONS, hasPermission } from '../config/permissions.config.js';

let server;
let baseUrl;

const runTests = async () => {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING PHASES 26–30 TEST SUITE: SIMULATION, AUDIT & RBAC');
  console.log('===============================================================\n');

  await mongoose.connect(env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  console.log(`✓ Test server running on ${baseUrl}\n`);

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

  try {
    // ----------------------------------------------------------------
    // SECTION 1: ROLE-BASED OPERATIONAL PERMISSIONS (PHASE 30)
    // ----------------------------------------------------------------
    console.log('\n--- [1] ROLE-BASED OPERATIONAL PERMISSIONS (PHASE 30) ---');

    // 1.1 In-memory permission matrix validation
    assert(
      hasPermission('ADMIN', PERMISSIONS.SIMULATION_START) &&
      hasPermission('ADMIN', PERMISSIONS.AUDIT_READ) &&
      hasPermission('ADMIN', PERMISSIONS.USER_MANAGE),
      'ADMIN has root-level operational, simulation, audit, and user management permissions'
    );

    assert(
      hasPermission('OPERATOR', PERMISSIONS.SIMULATION_START) &&
      hasPermission('OPERATOR', PERMISSIONS.SIMULATION_ADVANCE) &&
      hasPermission('OPERATOR', PERMISSIONS.INCIDENT_CREATE) &&
      !hasPermission('OPERATOR', PERMISSIONS.USER_MANAGE),
      'OPERATOR has simulation and dispatch execution permissions, but cannot manage users'
    );

    assert(
      hasPermission('RESPONDER', PERMISSIONS.INCIDENT_READ) &&
      !hasPermission('RESPONDER', PERMISSIONS.SIMULATION_START) &&
      !hasPermission('RESPONDER', PERMISSIONS.INCIDENT_CREATE),
      'RESPONDER has read access to field incidents but cannot start simulations or create raw incidents'
    );

    assert(
      hasPermission('VIEWER', PERMISSIONS.INCIDENT_READ) &&
      hasPermission('VIEWER', PERMISSIONS.ANALYTICS_READ) &&
      !hasPermission('VIEWER', PERMISSIONS.SIMULATION_START) &&
      !hasPermission('VIEWER', PERMISSIONS.SIMULATION_ADVANCE),
      'VIEWER has strictly read-only access and cannot mutate simulations'
    );

    // 1.2 Create accounts with distinct roles
    const timestamp = Date.now();
    const adminUser = await UserModel.create({
      name: `Admin Test ${timestamp}`,
      email: `admin.${timestamp}@emergency.ps9.gov`,
      password: 'Password@2026',
      role: 'ADMIN',
      department: 'System Command',
    });

    const operatorUser = await UserModel.create({
      name: `Operator Test ${timestamp}`,
      email: `operator.${timestamp}@emergency.ps9.gov`,
      password: 'Password@2026',
      role: 'OPERATOR',
      department: 'City Operations',
    });

    const responderUser = await UserModel.create({
      name: `Responder Test ${timestamp}`,
      email: `responder.${timestamp}@emergency.ps9.gov`,
      password: 'Password@2026',
      role: 'RESPONDER',
      department: 'Tactical Fire Unit',
    });

    const viewerUser = await UserModel.create({
      name: `Viewer Test ${timestamp}`,
      email: `viewer.${timestamp}@emergency.ps9.gov`,
      password: 'Password@2026',
      role: 'VIEWER',
      department: 'City Oversight',
    });

    // Login each to obtain JWT tokens
    const getAuthToken = async (email) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password@2026' }),
      });
      const data = await res.json();
      return data.data.token;
    };

    const adminToken = await getAuthToken(adminUser.email);
    const operatorToken = await getAuthToken(operatorUser.email);
    const responderToken = await getAuthToken(responderUser.email);
    const viewerToken = await getAuthToken(viewerUser.email);

    // 1.3 Assert RBAC enforcement on simulation start endpoint
    // VIEWER attempt to start simulation -> Expected 403 Forbidden
    const viewerStartRes = await fetch(`${baseUrl}/simulation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ scenario: 'HIGH_RISE_FIRE', autoRun: false }),
    });
    assert(viewerStartRes.status === 403, 'VIEWER is blocked with HTTP 403 when attempting POST /simulation/start');

    // RESPONDER attempt to start simulation -> Expected 403 Forbidden
    const responderStartRes = await fetch(`${baseUrl}/simulation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${responderToken}`,
      },
      body: JSON.stringify({ scenario: 'HIGH_RISE_FIRE', autoRun: false }),
    });
    assert(responderStartRes.status === 403, 'RESPONDER is blocked with HTTP 403 when attempting POST /simulation/start');

    // ----------------------------------------------------------------
    // SECTION 2: SIMULATION ENGINE & 15-STEP HIGH-RISE FIRE WORKFLOW (PHASES 26 & 27)
    // ----------------------------------------------------------------
    console.log('\n--- [2] SIMULATION ENGINE & HIGH-RISE FIRE WORKFLOW (PHASES 26 & 27) ---');

    // 2.1 Operator starts High-Rise Fire simulation
    const simStartRes = await fetch(`${baseUrl}/simulation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        scenario: 'HIGH_RISE_FIRE',
        speed: 1,
        autoRun: false,
      }),
    });
    const simStartData = await simStartRes.json();
    assert(
      simStartRes.status === 201 && simStartData.success && simStartData.simulation,
      'OPERATOR successfully launches HIGH_RISE_FIRE simulation (HTTP 201)'
    );

    const simulation = simStartData.simulation;
    const simId = simulation.simulationId;
    assert(simId && simId.startsWith('SIM-'), `Simulation generated unique ID: ${simId}`);
    assert(simulation.status === 'RUNNING', 'Simulation status initialized to RUNNING');
    assert(simulation.currentStep === 1, 'Simulation starts at Step 1');
    assert(simulation.totalSteps === 15, 'High-Rise Fire scenario configured with 15 steps');
    assert(simulation.incidentIds && simulation.incidentIds.length > 0, 'Step 1 automatically created initial simulation incident');

    // Verify created incident in Database
    const initialIncidentId = simulation.incidentIds[0];
    const createdIncident = await IncidentModel.findOne({ incidentId: initialIncidentId });
    assert(createdIncident !== null, `Incident ${initialIncidentId} exists in MongoDB`);
    assert(createdIncident.isSimulation === true, 'Incident is strictly flagged with isSimulation: true');
    assert(createdIncident.simulationId === simId, `Incident links back to simulationId: ${simId}`);

    // 2.2 Advance to Step 2: AI Multi-Modal Analysis
    console.log('\n  Advancing simulation step 2 (AI Multi-Modal Analysis)...');
    const step2Res = await fetch(`${baseUrl}/simulation/${simId}/advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    const step2Data = await step2Res.json();
    assert(step2Res.status === 200 && step2Data.simulation.currentStep === 2, 'Successfully advanced to Step 2 (AI Analysis)');

    // 2.3 Advance to Step 3: Severity Determination (CRITICAL)
    console.log('  Advancing simulation step 3 (Severity Determination)...');
    const step3Res = await fetch(`${baseUrl}/simulation/${simId}/advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    const step3Data = await step3Res.json();
    assert(step3Res.status === 200 && step3Data.simulation.currentStep === 3, 'Successfully advanced to Step 3 (Severity)');
    const incidentAfterStep3 = await IncidentModel.findOne({ incidentId: initialIncidentId });
    assert(incidentAfterStep3.severity === 'CRITICAL', 'Incident severity set to CRITICAL by hazard matrix');

    // 2.4 Advance to Step 4: Priority Rating (P1)
    console.log('  Advancing simulation step 4 (Priority Calculation)...');
    const step4Res = await fetch(`${baseUrl}/simulation/${simId}/advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    const step4Data = await step4Res.json();
    assert(step4Res.status === 200 && step4Data.simulation.currentStep === 4, 'Successfully advanced to Step 4 (Priority)');
    const incidentAfterStep4 = await IncidentModel.findOne({ incidentId: initialIncidentId });
    assert(incidentAfterStep4.priority === 'P1' && incidentAfterStep4.status === 'PRIORITIZED', 'Incident priority rated P1 and status PRIORITIZED');

    // 2.5 Advance to Step 5: Multi-Source Sensor & CCTV Corroboration
    console.log('  Advancing simulation step 5 (Sensor & Telemetry Corroboration)...');
    const step5Res = await fetch(`${baseUrl}/simulation/${simId}/advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    const step5Data = await step5Res.json();
    assert(step5Res.status === 200 && step5Data.simulation.currentStep === 5, 'Successfully advanced to Step 5');
    const incidentAfterStep5 = await IncidentModel.findOne({ incidentId: initialIncidentId });
    assert(incidentAfterStep5.reports.length >= 4, 'Telemetry and citizen reports corroborated (4+ distress reports)');

    // 2.6 Advance to Step 6: AI Automated Resource Recommendations
    console.log('  Advancing simulation step 6 (AI Resource Recommendations)...');
    const step6Res = await fetch(`${baseUrl}/simulation/${simId}/advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    const step6Data = await step6Res.json();
    assert(step6Res.status === 200 && step6Data.simulation.currentStep === 6, 'Successfully advanced to Step 6');

    // 2.7 Advance to Step 7: Operator Dispatches Response Team
    console.log('  Advancing simulation step 7 (Team Dispatch & Assignment)...');
    const step7Res = await fetch(`${baseUrl}/simulation/${simId}/advance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    const step7Data = await step7Res.json();
    assert(step7Res.status === 200 && step7Data.simulation.currentStep === 7, 'Successfully advanced to Step 7');
    const incidentAfterStep7 = await IncidentModel.findOne({ incidentId: initialIncidentId });
    assert(
      incidentAfterStep7.status === 'ASSIGNED' || incidentAfterStep7.assignedTeams.length > 0,
      `Incident status transitioned to ASSIGNED with response units dispatched`
    );

    // 2.8 Fetch Simulation Details by ID
    const getSimRes = await fetch(`${baseUrl}/simulation/${simId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const getSimData = await getSimRes.json();
    assert(getSimRes.status === 200 && getSimData.simulation.simulationId === simId, 'GET /simulation/:id retrieves current simulation state');
    assert(getSimData.simulation.eventHistory.length >= 7, `Simulation recorded ${getSimData.simulation.eventHistory.length} timeline events`);

    // 2.9 Stop Simulation
    const stopRes = await fetch(`${baseUrl}/simulation/${simId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    const stopData = await stopRes.json();
    assert(stopRes.status === 200 && stopData.simulation.status === 'STOPPED', 'POST /simulation/:id/stop successfully halted simulation');

    // ----------------------------------------------------------------
    // SECTION 3: CRYPTOGRAPHIC AUDIT TRAIL (PHASE 29)
    // ----------------------------------------------------------------
    console.log('\n--- [3] CRYPTOGRAPHIC AUDIT TRAIL & AUDIT QUERIES (PHASE 29) ---');

    // 3.1 Check audit logs generated during the simulation
    const simAuditLogs = await AuditLogModel.find({ simulationId: simId });
    assert(simAuditLogs.length > 0, `Cryptographic Audit Trail recorded ${simAuditLogs.length} entries for simulation ${simId}`);

    const hasDiff = simAuditLogs.some((l) => l.previousValue !== undefined || l.newValue !== undefined);
    assert(hasDiff, 'Audit log entries capture differential state change (previousValue and/or newValue)');

    // 3.2 Audit Log API Query with simulationId filter
    const auditQueryRes = await fetch(`${baseUrl}/audit-logs?simulationId=${simId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditQueryData = await auditQueryRes.json();
    assert(
      auditQueryRes.status === 200 && auditQueryData.data.auditLogs.length > 0,
      'GET /api/audit-logs?simulationId=:id accurately filters by simulation scope'
    );

    // 3.3 Ensure VIEWER cannot access audit logs if unauthorized
    const viewerAuditRes = await fetch(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert(viewerAuditRes.status === 403, 'VIEWER is prohibited from accessing audit logs (HTTP 403)');

    // ----------------------------------------------------------------
    // SECTION 4: OPERATIONAL ANALYTICS METRICS (PHASES 26 & 28)
    // ----------------------------------------------------------------
    console.log('\n--- [4] OPERATIONAL ANALYTICS METRICS (PHASES 26 & 28) ---');

    const analyticsRes = await fetch(`${baseUrl}/analytics/metrics`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    const analyticsData = await analyticsRes.json();
    assert(analyticsRes.status === 200 && analyticsData.success, 'GET /api/analytics/metrics returns operational KPI payload');
    assert(typeof analyticsData.data.totalIncidents === 'number', 'Analytics includes totalIncidents counter');
    assert(typeof analyticsData.data.resourceUtilizationPercent === 'number', 'Analytics calculates resourceUtilizationPercent');
    assert(Array.isArray(analyticsData.data.hourlyIncidentVolume), 'Analytics returns hourly incident volume series');
    assert(Array.isArray(analyticsData.data.hazardDistribution), 'Analytics returns hazard type distribution breakdown');

    // Summary
    console.log('\n===============================================================');
    console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal error executing test suite:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log('✓ Teardown complete. Exiting.\n');
  }
};

runTests();
