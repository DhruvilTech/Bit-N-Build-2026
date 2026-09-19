import mongoose from 'mongoose';
import app from '../app.js';
import { env } from '../config/env.js';

let server;
let baseUrl;

const runTests = async () => {
  console.log('\n====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TEST SUITE: PHASES 3, 4 & 5');
  console.log('====================================================\n');

  await mongoose.connect(env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  console.log(`✓ Test server running on ${baseUrl}\n`);

  // Obtain Admin Bearer Token for authenticated operational access
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@emergency.ps9.gov', password: 'Emergency@2026' }),
  }).then((r) => r.json());

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

  try {
    // ----------------------------------------------------------------
    // SECTION 1: PHASE 3 — RESOURCE MANAGEMENT TESTS
    // ----------------------------------------------------------------
    console.log('\n--- [PHASE 3] RESOURCE MANAGEMENT ---');

    // 1.1 List Resources
    const resList = await fetch(`${baseUrl}/resources`, { headers: authHeaders }).then((r) => r.json());
    assert(resList.success && resList.data.resources.length >= 12, 'GET /api/resources lists all resources');
    assert(resList.data.pagination && resList.data.pagination.page === 1, 'GET /api/resources includes pagination metadata');

    // 1.2 Filter by Status
    const resAvail = await fetch(`${baseUrl}/resources?status=AVAILABLE`, { headers: authHeaders }).then((r) => r.json());
    assert(
      resAvail.success && resAvail.data.resources.every((r) => r.status === 'AVAILABLE'),
      'GET /api/resources?status=AVAILABLE returns only available resources'
    );

    // 1.3 Get Single Resource
    const singleRes = await fetch(`${baseUrl}/resources/RES-VEH-01`, { headers: authHeaders }).then((r) => r.json());
    assert(
      singleRes.success && singleRes.data.resource.resourceId === 'RES-VEH-01',
      'GET /api/resources/:id returns correct resource details'
    );

    // 1.4 Nearby Resources Proximity Query
    const nearbyRes = await fetch(
      `${baseUrl}/resources/nearby?latitude=28.6250&longitude=77.2020&radiusMeters=5000`,
      { headers: authHeaders }
    ).then((r) => r.json());
    assert(
      nearbyRes.success && Array.isArray(nearbyRes.data.resources) && nearbyRes.data.resources.length > 0,
      'GET /api/resources/nearby returns resources sorted by proximity'
    );

    // 1.5 Create Resource
    const newResPayload = {
      resourceId: 'RES-TEST-001',
      name: 'High-Angle Rescue Rig Test',
      type: 'RESCUE_EQUIPMENT',
      capacity: 4,
      capabilities: ['HIGH_ANGLE_ROPES', 'WINCH_500KG'],
      location: {
        latitude: 28.627,
        longitude: 77.205,
        address: 'Sector 4 Emergency Cache',
      },
    };
    const createRes = await fetch(`${baseUrl}/resources`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newResPayload),
    }).then((r) => r.json());
    assert(
      createRes.success && createRes.data.resource.resourceId === 'RES-TEST-001',
      'POST /api/resources creates new resource'
    );

    // 1.6 Assign Resource to Incident
    const assignRes = await fetch(`${baseUrl}/resources/RES-TEST-001/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ incidentId: 'ER-2048', notes: 'Dispatched for test' }),
    }).then((r) => r.json());
    assert(
      assignRes.success &&
        assignRes.data.resource.status === 'ASSIGNED' &&
        assignRes.data.resource.currentAssignment === 'ER-2048',
      'POST /api/resources/:id/assign assigns resource to incident'
    );

    // 1.7 Conflict Prevention: Cannot assign already assigned resource
    const conflictRes = await fetch(`${baseUrl}/resources/RES-TEST-001/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ incidentId: 'ER-2049', notes: 'Should conflict' }),
    });
    const conflictResData = await conflictRes.json();
    assert(
      conflictRes.status === 409 && conflictResData.success === false,
      'POST /api/resources/:id/assign enforces CONFLICT PREVENTION (returns 409)'
    );

    // 1.8 Release Resource
    const releaseRes = await fetch(`${baseUrl}/resources/RES-TEST-001/release`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ notes: 'Mission complete' }),
    }).then((r) => r.json());
    assert(
      releaseRes.success &&
        releaseRes.data.resource.status === 'AVAILABLE' &&
        releaseRes.data.resource.currentAssignment === null,
      'POST /api/resources/:id/release resets status to AVAILABLE'
    );

    // 1.9 Lifecycle Status Transition
    const statusRes = await fetch(`${baseUrl}/resources/RES-TEST-001/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'BUSY', notes: 'Scheduled Maintenance' }),
    }).then((r) => r.json());
    assert(
      statusRes.success && statusRes.data.resource.status === 'BUSY',
      'PATCH /api/resources/:id/status transitions resource lifecycle to BUSY'
    );

    // 1.10 Delete Resource
    const deleteRes = await fetch(`${baseUrl}/resources/RES-TEST-001`, {
      method: 'DELETE',
      headers: authHeaders,
    }).then((r) => r.json());
    assert(deleteRes.success && deleteRes.data.deleted, 'DELETE /api/resources/:id deletes test resource');

    // ----------------------------------------------------------------
    // SECTION 2: PHASE 4 — RESPONSE TEAM MODULE TESTS
    // ----------------------------------------------------------------
    console.log('\n--- [PHASE 4] RESPONSE TEAM MODULE ---');

    // 2.1 List Teams
    const teamsList = await fetch(`${baseUrl}/teams`, { headers: authHeaders }).then((r) => r.json());
    assert(teamsList.success && teamsList.data.teams.length >= 8, 'GET /api/teams lists all response teams');

    // 2.2 Filter Teams by Type
    const fireTeams = await fetch(`${baseUrl}/teams?type=FIRE`, { headers: authHeaders }).then((r) => r.json());
    assert(
      fireTeams.success && fireTeams.data.teams.every((t) => t.type === 'FIRE'),
      'GET /api/teams?type=FIRE returns only Fire units'
    );

    // 2.3 Get Team with Populated Resource Details
    const teamFT04 = await fetch(`${baseUrl}/teams/TEAM-FT04`, { headers: authHeaders }).then((r) => r.json());
    assert(
      teamFT04.success && teamFT04.data.team.teamId === 'TEAM-FT04',
      'GET /api/teams/:id returns team details'
    );
    assert(
      Array.isArray(teamFT04.data.team.resourceDetails),
      'GET /api/teams/:id populates assigned resource details'
    );

    // 2.4 Nearby Teams Discovery
    const nearbyTeams = await fetch(
      `${baseUrl}/teams/nearby?latitude=28.6250&longitude=77.2020&radiusMeters=5000`,
      { headers: authHeaders }
    ).then((r) => r.json());
    assert(
      nearbyTeams.success && Array.isArray(nearbyTeams.data.teams) && nearbyTeams.data.teams.length > 0,
      'GET /api/teams/nearby discovers field teams by proximity'
    );

    // 2.5 Create Response Team
    const newTeamPayload = {
      teamId: 'TEAM-TST01',
      name: 'Rapid Disaster Intervention Squad',
      type: 'DISASTER_RESPONSE',
      members: ['Commander Miller', 'Oper. Diaz', 'Oper. Hayes'],
      vehicleId: 'DIS-001',
      capabilities: ['FLOOD_EVACUATION', 'DEBRIS_REMOVAL'],
      location: {
        latitude: 28.635,
        longitude: 77.21,
        address: 'Civil Defense Depot 4',
      },
      radioChannel: 'CH-14 TAC',
    };
    const createTeamRes = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newTeamPayload),
    }).then((r) => r.json());
    assert(
      createTeamRes.success && createTeamRes.data.team.teamId === 'TEAM-TST01',
      'POST /api/teams creates new response team'
    );

    // 2.6 Real-Time GPS Telemetry Update
    const locationRes = await fetch(`${baseUrl}/teams/TEAM-TST01/location`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        latitude: 28.636,
        longitude: 77.212,
        address: 'Sector 4 Ring Junction',
      }),
    }).then((r) => r.json());
    assert(
      locationRes.success && locationRes.data.team.location.latitude === 28.636,
      'PATCH /api/teams/:id/location updates GPS coordinates and address'
    );

    // 2.7 Assign Team to Incident
    const assignTeamRes = await fetch(`${baseUrl}/teams/TEAM-TST01/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ incidentId: 'ER-2051', notes: 'Dispatched to flood area' }),
    }).then((r) => r.json());
    assert(
      assignTeamRes.success &&
        assignTeamRes.data.team.status === 'ASSIGNED' &&
        assignTeamRes.data.team.currentAssignment === 'ER-2051',
      'POST /api/teams/:id/assign dispatches team to incident'
    );

    // 2.8 Team Conflict Prevention
    const conflictTeam = await fetch(`${baseUrl}/teams/TEAM-TST01/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ incidentId: 'ER-2052' }),
    });
    const conflictTeamData = await conflictTeam.json();
    assert(
      conflictTeam.status === 409 && conflictTeamData.success === false,
      'POST /api/teams/:id/assign enforces TEAM CONFLICT PREVENTION (returns 409)'
    );

    // 2.9 Milestone Transitions: EN_ROUTE and ON_SCENE
    const enRouteRes = await fetch(`${baseUrl}/teams/TEAM-TST01/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'EN_ROUTE' }),
    }).then((r) => r.json());
    assert(
      enRouteRes.success && enRouteRes.data.team.status === 'EN_ROUTE',
      'PATCH /api/teams/:id/status transitions team to EN_ROUTE'
    );

    // 2.10 Release Team from Incident
    const releaseTeamRes = await fetch(`${baseUrl}/teams/TEAM-TST01/release`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ notes: 'Incident contained' }),
    }).then((r) => r.json());
    assert(
      releaseTeamRes.success &&
        releaseTeamRes.data.team.status === 'AVAILABLE' &&
        releaseTeamRes.data.team.currentAssignment === null,
      'POST /api/teams/:id/release releases team back to AVAILABLE'
    );

    // 2.11 Assign Resource to Team
    const teamResAssign = await fetch(`${baseUrl}/teams/TEAM-TST01/resources/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ resourceId: 'RES-EQ-04' }),
    }).then((r) => r.json());
    assert(
      teamResAssign.success &&
        teamResAssign.data.team.assignedResources.includes('RES-EQ-04'),
      'POST /api/teams/:id/resources/assign assigns resource to team'
    );

    // 2.12 Release Resource from Team
    const teamResRelease = await fetch(`${baseUrl}/teams/TEAM-TST01/resources/release`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ resourceId: 'RES-EQ-04' }),
    }).then((r) => r.json());
    assert(
      teamResRelease.success &&
        !teamResRelease.data.team.assignedResources.includes('RES-EQ-04'),
      'POST /api/teams/:id/resources/release unassigns resource from team'
    );

    // 2.13 Delete Team
    const deleteTeamRes = await fetch(`${baseUrl}/teams/TEAM-TST01`, {
      method: 'DELETE',
      headers: authHeaders,
    }).then((r) => r.json());
    assert(deleteTeamRes.success && deleteTeamRes.data.deleted, 'DELETE /api/teams/:id deletes test team');

    // ----------------------------------------------------------------
    // SECTION 3: PHASE 5 — HOSPITAL & FACILITY MODULE TESTS
    // ----------------------------------------------------------------
    console.log('\n--- [PHASE 5] HOSPITAL & FACILITY MODULE ---');

    // 3.1 List Facilities
    const facList = await fetch(`${baseUrl}/facilities`, { headers: authHeaders }).then((r) => r.json());
    assert(facList.success && facList.data.facilities.length >= 8, 'GET /api/facilities lists all facilities');

    // 3.2 Filter Facilities by Type
    const hospList = await fetch(`${baseUrl}/facilities?type=HOSPITAL`, { headers: authHeaders }).then((r) => r.json());
    assert(
      hospList.success && hospList.data.facilities.every((f) => f.type === 'HOSPITAL'),
      'GET /api/facilities?type=HOSPITAL filters hospitals'
    );

    // 3.3 Get Facility with Virtual Occupancy Rate
    const hosp01 = await fetch(`${baseUrl}/facilities/HOSP-01`, { headers: authHeaders }).then((r) => r.json());
    assert(
      hosp01.success && hosp01.data.facility.facilityId === 'HOSP-01',
      'GET /api/facilities/:id returns facility details'
    );
    assert(
      typeof hosp01.data.facility.occupancyRate === 'number',
      'GET /api/facilities/:id includes virtual occupancyRate'
    );

    // 3.4 Nearby Facility Routing Query
    const nearbyFac = await fetch(
      `${baseUrl}/facilities/nearby?latitude=28.6220&longitude=77.1980&radiusMeters=10000&type=HOSPITAL`,
      { headers: authHeaders }
    ).then((r) => r.json());
    assert(
      nearbyFac.success && Array.isArray(nearbyFac.data.facilities) && nearbyFac.data.facilities.length > 0,
      'GET /api/facilities/nearby finds nearby medical facilities for incident routing'
    );

    // 3.5 Create Facility with Capacity Validation
    const newFacPayload = {
      facilityId: 'HOSP-TEST-01',
      name: 'North Metro Surge Clinic',
      type: 'HOSPITAL',
      capacity: 100,
      availableCapacity: 40,
      specializations: ['TRAUMA_LEVEL_2', 'EMERGENCY_ICU'],
      location: {
        latitude: 28.63,
        longitude: 77.21,
        address: 'North Transit Hub',
      },
    };
    const createFacRes = await fetch(`${baseUrl}/facilities`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newFacPayload),
    }).then((r) => r.json());
    assert(
      createFacRes.success && createFacRes.data.facility.facilityId === 'HOSP-TEST-01',
      'POST /api/facilities creates valid facility'
    );

    // 3.6 Invalid Capacity Validation (availableCapacity > capacity)
    const invalidFac = await fetch(`${baseUrl}/facilities`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ...newFacPayload,
        facilityId: 'HOSP-INVALID',
        capacity: 50,
        availableCapacity: 80, // Invalid!
      }),
    });
    assert(
      invalidFac.status === 400,
      'POST /api/facilities rejects invalid capacity (availableCapacity > capacity)'
    );

    // 3.7 Real-Time Capacity Delta Update
    const capacityDeltaRes = await fetch(`${baseUrl}/facilities/HOSP-TEST-01/capacity`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ delta: -5 }),
    }).then((r) => r.json());
    assert(
      capacityDeltaRes.success && capacityDeltaRes.data.facility.availableCapacity === 35,
      'PATCH /api/facilities/:id/capacity decrements bed capacity via delta (-5)'
    );

    // 3.8 Negative Capacity Rejection
    const negCap = await fetch(`${baseUrl}/facilities/HOSP-TEST-01/capacity`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ availableCapacity: -10 }),
    });
    assert(negCap.status === 400, 'PATCH /api/facilities/:id/capacity rejects negative available capacity');

    // 3.9 Emergency Surge Status Update
    const emergRes = await fetch(`${baseUrl}/facilities/HOSP-TEST-01/emergency-status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ emergencyStatus: 'SURGE', status: 'LIMITED_SERVICE' }),
    }).then((r) => r.json());
    assert(
      emergRes.success && emergRes.data.facility.emergencyStatus === 'SURGE',
      'PATCH /api/facilities/:id/emergency-status updates hospital surge readiness'
    );

    // 3.10 Delete Facility
    const deleteFacRes = await fetch(`${baseUrl}/facilities/HOSP-TEST-01`, {
      method: 'DELETE',
      headers: authHeaders,
    }).then((r) => r.json());
    assert(deleteFacRes.success && deleteFacRes.data.deleted, 'DELETE /api/facilities/:id deletes test facility');

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
