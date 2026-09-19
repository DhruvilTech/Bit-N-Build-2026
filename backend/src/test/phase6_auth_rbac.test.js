import mongoose from 'mongoose';
import app from '../app.js';
import { env } from '../config/env.js';
import { AuditLogModel } from '../models/auditLog.model.js';

let server;
let baseUrl;

const runTests = async () => {
  console.log('\n====================================================');
  console.log('🛡️  RUNNING PHASE 6 TEST SUITE: AUTH, RBAC & AUDIT LOGS');
  console.log('====================================================\n');

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
    // SECTION 1: AUTHENTICATION LIFECYCLE
    // ----------------------------------------------------------------
    console.log('\n--- [1] AUTHENTICATION LIFECYCLE ---');

    const testEmail = `alex.hayes.${Date.now()}@emergency.ps9.gov`;

    // 1.1 Register New User
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Officer Alex Hayes',
        email: testEmail,
        password: 'Password@2026',
        role: 'FIELD_COORDINATOR',
        department: 'Rapid Urban Response',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success && regData.data.token, 'POST /api/auth/register creates new user & token');

    // 1.2 Duplicate Email Rejection
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Officer',
        email: testEmail,
        password: 'Password@2026',
      }),
    });
    assert(dupRes.status === 400, 'POST /api/auth/register rejects duplicate email (returns 400)');

    // 1.3 Invalid Password Login Rejection
    const badLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    assert(badLogin.status === 401, 'POST /api/auth/login rejects invalid password (returns 401)');

    // 1.4 Successful Login for all 4 roles
    const loginRole = async (email, password = 'Emergency@2026') => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return { status: res.status, data };
    };

    const adminAuth = await loginRole('admin@emergency.ps9.gov');
    const operatorAuth = await loginRole('operator@emergency.ps9.gov');
    const fieldAuth = await loginRole('field@emergency.ps9.gov');
    const medicalAuth = await loginRole('medical@emergency.ps9.gov');

    assert(adminAuth.status === 200 && adminAuth.data.data.user.role === 'ADMIN', 'Login as ADMIN successful');
    assert(operatorAuth.status === 200 && operatorAuth.data.data.user.role === 'OPERATOR', 'Login as OPERATOR successful');
    assert(fieldAuth.status === 200 && fieldAuth.data.data.user.role === 'FIELD_COORDINATOR', 'Login as FIELD_COORDINATOR successful');
    assert(medicalAuth.status === 200 && medicalAuth.data.data.user.role === 'MEDICAL_COORDINATOR', 'Login as MEDICAL_COORDINATOR successful');

    const adminToken = adminAuth.data.data.token;
    const operatorToken = operatorAuth.data.data.token;
    const fieldToken = fieldAuth.data.data.token;
    const medicalToken = medicalAuth.data.data.token;

    // 1.5 Get Me (Profile)
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.data.user.email === 'admin@emergency.ps9.gov', 'GET /api/auth/me returns authenticated profile');

    // 1.6 Missing Token Rejection
    const noToken = await fetch(`${baseUrl}/auth/me`);
    assert(noToken.status === 401, 'GET /api/auth/me rejects missing token (returns 401)');

    // 1.7 Logout & Token Revocation
    const tempUserLogin = await loginRole(testEmail, 'Password@2026');
    const tempToken = tempUserLogin.data.data.token;

    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout terminates session (returns 200)');

    // 1.8 Verify Revoked Token Cannot Be Reused
    const reuseRevoked = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert(reuseRevoked.status === 401, 'Subsequent request with revoked token is rejected (returns 401)');

    // ----------------------------------------------------------------
    // SECTION 2: RBAC ENFORCEMENT & PERMISSION BOUNDARIES
    // ----------------------------------------------------------------
    console.log('\n--- [2] RBAC ENFORCEMENT & PERMISSIONS ---');

    // 2.1 Operator Can Dispatch Teams & Assign Resources
    const opAssignTeam = await fetch(`${baseUrl}/teams/TEAM-FT01/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ incidentId: 'ER-2048', notes: 'Operator dispatch test' }),
    });
    assert(opAssignTeam.status === 200, 'OPERATOR is authorized to dispatch teams (returns 200)');

    // Release back for clean state
    await fetch(`${baseUrl}/teams/TEAM-FT01/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
    });

    // 2.2 Operator CANNOT access Admin User Management (403 Forbidden)
    const opUserMgmt = await fetch(`${baseUrl}/auth/users`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert(opUserMgmt.status === 403, 'OPERATOR is rejected from User Management (returns 403 Forbidden)');

    // 2.3 Field Coordinator Can Update Team GPS Location & Status
    const fieldLocation = await fetch(`${baseUrl}/teams/TEAM-FT01/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fieldToken}`,
      },
      body: JSON.stringify({ latitude: 28.633, longitude: 77.22, address: 'Central Fire HQ Patrol' }),
    });
    assert(fieldLocation.status === 200, 'FIELD_COORDINATOR is authorized to update GPS telemetry (returns 200)');

    // 2.4 Field Coordinator CANNOT dispatch incidents or manage facilities (403 Forbidden)
    const fieldAssignTeam = await fetch(`${baseUrl}/teams/TEAM-FT01/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fieldToken}`,
      },
      body: JSON.stringify({ incidentId: 'ER-2048' }),
    });
    assert(fieldAssignTeam.status === 403, 'FIELD_COORDINATOR cannot assign incident (returns 403 Forbidden)');

    // 2.5 Medical Coordinator Can Update Hospital Capacity
    const medCapacity = await fetch(`${baseUrl}/facilities/HOSP-01/capacity`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${medicalToken}`,
      },
      body: JSON.stringify({ delta: -1 }),
    });
    assert(medCapacity.status === 200, 'MEDICAL_COORDINATOR is authorized to update bed capacity (returns 200)');

    // 2.6 Medical Coordinator CANNOT dispatch Police teams (403 Forbidden)
    const medDispatchPolice = await fetch(`${baseUrl}/teams/TEAM-PD05/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${medicalToken}`,
      },
      body: JSON.stringify({ incidentId: 'ER-2050' }),
    });
    assert(medDispatchPolice.status === 403, 'MEDICAL_COORDINATOR cannot dispatch Police tactical teams (returns 403 Forbidden)');

    // 2.7 Admin Has Master Clearance Across All Modules
    const adminUserList = await fetch(`${baseUrl}/auth/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminUserList.status === 200, 'ADMIN is authorized to access User Management (returns 200)');

    // ----------------------------------------------------------------
    // SECTION 3: AUDIT TRAIL VERIFICATION
    // ----------------------------------------------------------------
    console.log('\n--- [3] AUDIT TRAIL VERIFICATION ---');

    // 3.1 Query Audit Logs via API
    const auditLogsRes = await fetch(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditLogsData = await auditLogsRes.json();
    assert(
      auditLogsRes.status === 200 &&
        Array.isArray(auditLogsData.data.logs) &&
        auditLogsData.data.logs.length > 0,
      'GET /api/audit-logs retrieves cryptographic event ledger'
    );

    // 3.2 Verify Specific Logged Events in Database
    const loginLogs = await AuditLogModel.find({ action: 'USER_LOGIN' });
    assert(loginLogs.length >= 4, 'AuditLog records all authentication events (USER_LOGIN)');

    const dispatchLogs = await AuditLogModel.find({ action: 'TEAM_ASSIGNED' });
    assert(dispatchLogs.length >= 1, 'AuditLog records operational dispatch events (TEAM_ASSIGNED)');

    const capacityLogs = await AuditLogModel.find({ action: 'FACILITY_CAPACITY_UPDATED' });
    assert(capacityLogs.length >= 1, 'AuditLog records critical medical capacity updates (FACILITY_CAPACITY_UPDATED)');

    // ----------------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passed}`);
    console.log(`TOTAL FAILED: ${failed}`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log('✓ Disconnected test server & database.');
  }
};

runTests();
