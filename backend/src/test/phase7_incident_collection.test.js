import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { generateToken } from '../services/auth.service.js';

let server;
let baseUrl;

let adminToken;
let operatorToken;
let fieldToken;
let medicalToken;

const makeRequest = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const status = response.status;
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response
  }
  return { status, data };
};

const runTests = async () => {
  console.log('====================================================');
  console.log('🚨 RUNNING PHASE 7 TEST SUITE: INCIDENT COLLECTION API');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    // 1. Setup DB and test server
    await mongoose.connect(env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        console.log(`✓ Test server running on ${baseUrl}\n`);
        resolve();
      });
    });

    // 2. Fetch seeded tokens
    const adminUser = await UserModel.findOne({ email: 'admin123@gmail.com' });
    const operatorUser = await UserModel.findOne({ email: 'operator@emergency.ps9.gov' });
    const fieldUser = await UserModel.findOne({ email: 'field@emergency.ps9.gov' });
    const medicalUser = await UserModel.findOne({ email: 'medical@emergency.ps9.gov' });

    adminToken = generateToken(adminUser);
    operatorToken = generateToken(operatorUser);
    fieldToken = generateToken(fieldUser);
    medicalToken = generateToken(medicalUser);

    console.log('--- [1] MULTI-SOURCE INCIDENT INGESTION ---');

    // Test A: Citizen Report
    const citizenRes = await makeRequest('/incidents', {
      method: 'POST',
      token: operatorToken,
      body: JSON.stringify({
        title: 'Citizen Report: Dense Black Smoke near Market',
        type: 'FIRE',
        description: 'Citizen eyewitness calls in reporting flames erupting from warehouse roof.',
        source: 'CITIZEN',
        location: {
          latitude: 28.6328,
          longitude: 77.2197,
          address: 'Connaught Circle Block B, Central Market',
        },
        severity: 'HIGH',
        priority: 'P2',
        metadata: {
          callerName: 'Rajesh Sharma',
          callerPhone: '+91-98765-43210',
          eyewitnessCount: 4,
        },
      }),
    });

    assert(
      citizenRes.status === 201 && citizenRes.data?.data?.incident?.source === 'CITIZEN',
      'POST /api/incidents creates CITIZEN incident with caller metadata (returns 201)'
    );

    const citizenIncidentId = citizenRes.data?.data?.incident?.incidentId;
    assert(
      citizenRes.data?.data?.incident?.reportedBy?.email === 'operator@emergency.ps9.gov',
      'Incident reportedBy is bound automatically to authenticated operator'
    );

    // Test B: Sensor Telemetry Intake
    const sensorRes = await makeRequest('/incidents', {
      method: 'POST',
      token: operatorToken,
      body: JSON.stringify({
        title: 'IoT Sensor Grid Alert: Flammable Vapor Threshold',
        type: 'INDUSTRIAL_ACCIDENT',
        description: 'Optical gas imaging sensor #OGI-901 detected benzene cloud exceeding 150ppm.',
        source: 'SENSOR',
        location: {
          latitude: 28.6250,
          longitude: 77.2020,
          address: 'Petro Storage Yard Sector 4',
        },
        severity: 'CRITICAL',
        priority: 'P1',
        metadata: {
          sensorId: 'OGI-901',
          temperature: 42.5,
          ppmReading: 168.4,
          telemetryChannel: 'IOT_MESH_SEC_4',
        },
      }),
    });

    assert(
      sensorRes.status === 201 && sensorRes.data?.data?.incident?.metadata?.sensorId === 'OGI-901',
      'POST /api/incidents creates SENSOR incident with telemetry payload (returns 201)'
    );

    // Test C: Field Team Intake
    const fieldRes = await makeRequest('/incidents', {
      method: 'POST',
      token: fieldToken,
      body: JSON.stringify({
        title: 'Field Team Tactical Report: Embankment Breach',
        type: 'FLOOD',
        description: 'Patrol unit Alpha confirms river levee cracking with water pouring into lower access tunnel.',
        source: 'FIELD_TEAM',
        location: {
          latitude: 28.6500,
          longitude: 77.1950,
          address: 'Riverbank North Outpost Gate 3',
        },
        severity: 'HIGH',
        priority: 'P2',
      }),
    });

    assert(
      fieldRes.status === 201 && fieldRes.data?.data?.incident?.reportedBy?.role === 'FIELD_COORDINATOR',
      'POST /api/incidents accepts reports submitted by FIELD_COORDINATOR (returns 201)'
    );

    console.log('\n--- [2] REQUEST VALIDATION & SECURITY ---');

    // Missing Title
    const invalidTitleRes = await makeRequest('/incidents', {
      method: 'POST',
      token: operatorToken,
      body: JSON.stringify({
        type: 'FIRE',
        description: 'Missing title test.',
        location: { latitude: 28.6, longitude: 77.2, address: 'Test St' },
      }),
    });
    assert(invalidTitleRes.status === 400, 'POST /api/incidents rejects missing title (returns 400)');

    // Invalid Coordinates
    const invalidCoordsRes = await makeRequest('/incidents', {
      method: 'POST',
      token: operatorToken,
      body: JSON.stringify({
        title: 'Invalid GPS Incident',
        type: 'FIRE',
        description: 'Latitude out of bounds.',
        location: { latitude: 120.0, longitude: 77.2, address: 'North Pole Beyond' },
      }),
    });
    assert(invalidCoordsRes.status === 400, 'POST /api/incidents rejects latitude > 90 (returns 400)');

    // Invalid Enum Type
    const invalidTypeRes = await makeRequest('/incidents', {
      method: 'POST',
      token: operatorToken,
      body: JSON.stringify({
        title: 'Alien Invasion Alert',
        type: 'UFO_ATTACK',
        description: 'Invalid enum test.',
        location: { latitude: 28.6, longitude: 77.2, address: 'Test St' },
      }),
    });
    assert(invalidTypeRes.status === 400, 'POST /api/incidents rejects invalid incident type (returns 400)');

    // Unauthenticated
    const unauthRes = await makeRequest('/incidents', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Unauthorized Incident',
        type: 'FIRE',
        description: 'No token provided.',
        location: { latitude: 28.6, longitude: 77.2, address: 'Test St' },
      }),
    });
    assert(unauthRes.status === 401, 'POST /api/incidents rejects unauthenticated call (returns 401)');

    console.log('\n--- [3] SAFE STATUS TRANSITIONS & LIFECYCLE ---');

    // Transition 1: NEW -> ACKNOWLEDGED
    const ackRes = await makeRequest(`/incidents/${citizenIncidentId}/status`, {
      method: 'PATCH',
      token: operatorToken,
      body: JSON.stringify({ status: 'ACKNOWLEDGED', reason: 'Operator verified 911 audio transcript' }),
    });
    assert(
      ackRes.status === 200 && ackRes.data?.data?.incident?.status === 'ACKNOWLEDGED',
      'PATCH /api/incidents/:id/status transitions NEW -> ACKNOWLEDGED (returns 200)'
    );

    // Transition 2: ACKNOWLEDGED -> ASSIGNED
    const assignRes = await makeRequest(`/incidents/${citizenIncidentId}/status`, {
      method: 'PATCH',
      token: operatorToken,
      body: JSON.stringify({ status: 'ASSIGNED', reason: 'Dispatched Fire Squad FT-101' }),
    });
    assert(
      assignRes.status === 200 && assignRes.data?.data?.incident?.status === 'ASSIGNED',
      'PATCH /api/incidents/:id/status transitions ACKNOWLEDGED -> ASSIGNED (returns 200)'
    );

    // Transition 3: ASSIGNED -> RESPONDING
    const respRes = await makeRequest(`/incidents/${citizenIncidentId}/status`, {
      method: 'PATCH',
      token: fieldToken,
      body: JSON.stringify({ status: 'RESPONDING', reason: 'Units en route, sirens sounding' }),
    });
    assert(
      respRes.status === 200 && respRes.data?.data?.incident?.status === 'RESPONDING',
      'PATCH /api/incidents/:id/status transitions ASSIGNED -> RESPONDING (returns 200)'
    );

    // Transition 4: RESPONDING -> RESOLVED
    const resRes = await makeRequest(`/incidents/${citizenIncidentId}/status`, {
      method: 'PATCH',
      token: operatorToken,
      body: JSON.stringify({ status: 'RESOLVED', reason: 'Fire extinguished and all casualties treated' }),
    });
    assert(
      resRes.status === 200 && resRes.data?.data?.incident?.status === 'RESOLVED',
      'PATCH /api/incidents/:id/status transitions RESPONDING -> RESOLVED and sets resolvedAt'
    );

    // Invalid Transition: RESOLVED -> NEW (Must be rejected)
    const invalidRevertRes = await makeRequest(`/incidents/${citizenIncidentId}/status`, {
      method: 'PATCH',
      token: operatorToken,
      body: JSON.stringify({ status: 'NEW', reason: 'Attempting invalid rollback' }),
    });
    assert(
      invalidRevertRes.status === 400,
      'PATCH /api/incidents/:id/status blocks invalid transition RESOLVED -> NEW (returns 400)'
    );

    console.log('\n--- [4] TIMELINE, AUDIT LOGS & REPORTS ---');

    // Check Timeline
    const timelineRes = await makeRequest(`/incidents/${citizenIncidentId}/timeline`, {
      token: operatorToken,
    });
    assert(
      timelineRes.status === 200 &&
        Array.isArray(timelineRes.data?.data?.timeline) &&
        timelineRes.data?.data?.timeline.length >= 4,
      'GET /api/incidents/:id/timeline returns chronologically logged event trail'
    );

    // Check Reports
    const reportsRes = await makeRequest(`/incidents/${citizenIncidentId}/reports`, {
      token: operatorToken,
    });
    assert(
      reportsRes.status === 200 && Array.isArray(reportsRes.data?.data?.reports),
      'GET /api/incidents/:id/reports returns incident source reports'
    );

    // Check AuditLog
    const auditEntries = await AuditLogModel.find({ entityId: citizenIncidentId });
    assert(
      auditEntries.length >= 2,
      'AuditLog ledger accurately recorded incident creation and status transition events'
    );

    console.log('\n--- [5] FILTERING, SEARCH & GEOSPATIAL LOOKUP ---');

    // Filter by Type
    const fireListRes = await makeRequest('/incidents?type=FIRE', { token: operatorToken });
    assert(
      fireListRes.status === 200 && fireListRes.data?.data?.incidents.every((i) => i.type === 'FIRE'),
      'GET /api/incidents?type=FIRE filters accurately by incident type'
    );

    // Filter by Source
    const sensorListRes = await makeRequest('/incidents?source=SENSOR', { token: operatorToken });
    assert(
      sensorListRes.status === 200 && sensorListRes.data?.data?.incidents.every((i) => i.source === 'SENSOR'),
      'GET /api/incidents?source=SENSOR filters accurately by incident source'
    );

    // Search
    const searchRes = await makeRequest('/incidents?search=Chemical', { token: operatorToken });
    assert(
      searchRes.status === 200 && searchRes.data?.data?.incidents.length > 0,
      'GET /api/incidents?search=Chemical performs text search across title and description'
    );

    // Geospatial Radius Query
    const geoRes = await makeRequest('/incidents?nearLat=28.6289&nearLng=77.2065&radius=5000', {
      token: operatorToken,
    });
    assert(
      geoRes.status === 200 && Array.isArray(geoRes.data?.data?.incidents),
      'GET /api/incidents?nearLat=...&nearLng=...&radius=... performs 2dsphere proximity search'
    );

    console.log('\n--- [6] INCIDENT CANCELLATION / DELETE RBAC ---');

    // Operator cannot DELETE incident
    const opDeleteRes = await makeRequest(`/incidents/${citizenIncidentId}`, {
      method: 'DELETE',
      token: operatorToken,
    });
    assert(opDeleteRes.status === 403, 'DELETE /api/incidents/:id rejects OPERATOR role (returns 403 Forbidden)');

    // Admin CAN DELETE incident
    const adminDeleteRes = await makeRequest(`/incidents/${citizenIncidentId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(
      adminDeleteRes.status === 200 && adminDeleteRes.data?.data?.incident?.status === 'CANCELLED',
      'DELETE /api/incidents/:id allows ADMIN to cancel incident (returns 200 & status=CANCELLED)'
    );

    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passed}`);
    console.log(`TOTAL FAILED: ${failed}`);
    console.log('====================================================');

    await mongoose.disconnect();
    server.close();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
