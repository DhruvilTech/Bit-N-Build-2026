/**
 * Phase Live GPS, Routing, and Dispatch Simulation Test Suite
 * Validates Station CRUD, Routing Engine, Location updates, Proximity Arrival (80m),
 * and Movement Simulation end-to-end.
 */

import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { StationModel } from '../models/station.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { AssignmentModel } from '../models/assignment.model.js';
import {
  createStation,
  getStations,
  getStationById,
  updateStation,
  deleteStation,
} from '../services/station.service.js';
import { getRoute } from '../services/routing.service.js';
import { updateResourceLocation } from '../services/resource.service.js';
import { assignResourcesToIncident } from '../services/assignment.service.js';
import {
  setSimulationMode,
  getSimulationStatus,
  startRouteSimulation,
  startReturnSimulation,
} from '../services/simulation.service.js';

const runTests = async () => {
  console.log('====================================================');
  console.log('🛰️  RUNNING LIVE GPS & ROUTING TEST SUITE');
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

  const testUser = {
    userId: 'TEST-ADMIN-01',
    name: 'GPS Test Admin',
    role: 'ADMIN',
    email: 'admin@gps-test.gov',
  };

  let testStationId = `STAT-TEST-${Date.now()}`;
  let testResourceId = `RES-TEST-${Date.now()}`;
  let testIncidentId = `INC-TEST-${Date.now()}`;
  let testAssignmentId = null;

  try {
    console.log('[Setup] Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('[Setup] Connected.\n');

    // ----------------------------------------------------
    // TEST 1: Station Service CRUD
    // ----------------------------------------------------
    console.log('--- 1. Emergency Station / Base Service ---');

    const createdStation = await createStation(
      {
        stationId: testStationId,
        name: 'Test Tactical Outpost Station',
        type: 'FIRE_STATION',
        address: 'Sector 9 Industrial Perimeter Gate',
        location: {
          latitude: 28.625,
          longitude: 77.202,
          address: 'Sector 9 Industrial Perimeter Gate',
        },
        capacity: 10,
        contactNumber: '+91-11-2334-9999',
      },
      testUser
    );

    assert(
      createdStation && createdStation.stationId === testStationId,
      'Station created with valid ID and GeoJSON geometry'
    );
    assert(
      createdStation.location.geometry.coordinates[0] === 77.202 &&
        createdStation.location.geometry.coordinates[1] === 28.625,
      'Station GeoJSON coordinates stored in strict [longitude, latitude] order'
    );

    const stationList = await getStations({});
    assert(
      Array.isArray(stationList) && stationList.length > 0,
      `Retrieved ${stationList.length} stations from station service`
    );

    const fetchedStation = await getStationById(testStationId);
    assert(
      fetchedStation && fetchedStation.name === 'Test Tactical Outpost Station',
      'Retrieved single station by stationId'
    );

    const updatedStation = await updateStation(
      testStationId,
      { capacity: 15, name: 'Updated Tactical Outpost' },
      testUser
    );
    assert(
      updatedStation && updatedStation.capacity === 15,
      'Station capacity updated successfully'
    );

    // ----------------------------------------------------
    // TEST 2: Routing Engine & Polyline Generation
    // ----------------------------------------------------
    console.log('\n--- 2. Routing Service (OSRM & Street-Grid Fallback) ---');

    const origin = { latitude: 28.6328, longitude: 77.2197, address: 'Central Fire HQ' };
    const destination = { latitude: 28.6289, longitude: 77.2065, address: 'Refinery Incident' };

    const route = await getRoute(origin, destination);
    console.log(`  Route generated: ${route.distanceKm.toFixed(2)} km, ~${route.durationMinutes} min, ${route.geometry.length} waypoints`);

    assert(route && route.distanceKm > 0, 'Route calculation returns positive distance in km');
    assert(route.durationMinutes > 0, 'Route calculation returns positive duration in minutes');
    assert(
      Array.isArray(route.geometry) && route.geometry.length >= 2,
      'Route geometry contains array of [lng, lat] coordinate waypoints'
    );
    assert(
      route.origin.latitude === origin.latitude &&
        route.destination.latitude === destination.latitude,
      'Route preserves origin and destination metadata'
    );

    // ----------------------------------------------------
    // TEST 3: Resource Creation & Assignment Route Generation
    // ----------------------------------------------------
    console.log('\n--- 3. Resource Assignment & Route Attachment ---');

    // Create a test incident
    const testIncident = await IncidentModel.create({
      incidentId: testIncidentId,
      title: 'GPS Test Incident',
      description: 'Emergency test incident for live GPS routing and dispatch simulation',
      type: 'FIRE',
      severity: 'HIGH',
      priority: 'P2',
      status: 'ASSIGNED',
      location: {
        latitude: 28.6289,
        longitude: 77.2065,
        address: 'Test Refinery Site',
        geometry: { type: 'Point', coordinates: [77.2065, 28.6289] },
      },
      reportedBy: { name: 'Field Sensor' },
    });

    // Create a test resource
    const testResource = await ResourceModel.create({
      resourceId: testResourceId,
      name: 'Test Quick Response Fire Engine',
      type: 'FIRE_VEHICLE',
      status: 'AVAILABLE',
      stationId: testStationId,
      homeLocation: {
        latitude: 28.6328,
        longitude: 77.2197,
        address: 'Central Fire HQ',
      },
      currentLocation: {
        latitude: 28.6328,
        longitude: 77.2197,
        address: 'Central Fire HQ',
      },
      location: {
        latitude: 28.6328,
        longitude: 77.2197,
        address: 'Central Fire HQ',
        geometry: { type: 'Point', coordinates: [77.2197, 28.6328] },
      },
      capabilities: ['WATER_CANNON', 'FOAM_SUPPRESSION'],
      capacity: 4,
    });

    assert(testResource && testResource.resourceId === testResourceId, 'Test resource created');

    // Create assignment - verifies route is automatically calculated and attached
    const assignResult = await assignResourcesToIncident(
      testIncidentId,
      {
        resourceIds: [testResourceId],
        notes: 'GPS test dispatch assignment',
      },
      testUser
    );

    const assignment = assignResult.assignments[0];
    testAssignmentId = assignment.assignmentId;
    assert(
      assignment && assignment.status === 'ASSIGNED',
      'Assignment created with status ASSIGNED'
    );
    assert(
      assignment.route && assignment.route.geometry && assignment.route.geometry.length >= 2,
      'Assignment automatically generated and stored route geometry'
    );
    assert(
      assignment.estimatedDistanceKm > 0 && assignment.estimatedArrivalMinutes > 0,
      `Estimated distance (${assignment.estimatedDistanceKm} km) and ETA (${assignment.estimatedArrivalMinutes} min) populated`
    );

    // ----------------------------------------------------
    // TEST 4: Live Location Updates & 80m Proximity Arrival
    // ----------------------------------------------------
    console.log('\n--- 4. Live GPS Updates & Proximity Arrival Detection (<=80m) ---');

    // First update: Resource moving en route (distance ~ 1.2 km away)
    const midPointLocation = {
      latitude: 28.6300,
      longitude: 77.2120,
      status: 'EN_ROUTE',
    };

    const midUpdate = await updateResourceLocation(testResourceId, midPointLocation, testUser);
    assert(
      midUpdate.status === 'EN_ROUTE',
      'Resource location updated to EN_ROUTE midpoint'
    );
    assert(
      midUpdate.distanceKm > 0.08,
      `Resource distance to destination correctly computed: ${midUpdate.distanceKm?.toFixed(3)} km`
    );
    assert(
      midUpdate.currentLocation.latitude === 28.6300,
      'currentLocation coordinates updated'
    );

    // Second update: Resource arrives within 50 meters of destination (destination: 28.6289, 77.2065)
    // Difference of 0.0002 deg lat is ~22 meters
    const nearDestinationLocation = {
      latitude: 28.62895,
      longitude: 77.20655,
      status: 'EN_ROUTE',
    };

    const arrivalUpdate = await updateResourceLocation(
      testResourceId,
      nearDestinationLocation,
      testUser
    );

    assert(
      arrivalUpdate.distanceKm <= 0.08,
      `Distance is within 80m proximity threshold (${(arrivalUpdate.distanceKm * 1000).toFixed(1)} meters)`
    );
    assert(
      arrivalUpdate.status === 'ON_SCENE',
      'Resource status automatically transitioned to ON_SCENE on proximity arrival'
    );
    assert(
      arrivalUpdate.etaMinutes === 0,
      'ETA countdown automatically set to 0 min on arrival'
    );

    // ----------------------------------------------------
    // TEST 5: Simulation Service Mode & Route Traversal
    // ----------------------------------------------------
    console.log('\n--- 5. Simulation Service ---');

    const simEnable = await setSimulationMode(true, 1, 2);
    assert(simEnable.isSimulationMode === true, 'Simulation mode enabled');

    const statusBefore = getSimulationStatus();
    assert(statusBefore.isSimulationMode === true, 'getSimulationStatus reports isSimulationMode: true');

    // Test route simulation start
    const simStart = await startRouteSimulation(
      testResourceId,
      { latitude: 28.6289, longitude: 77.2065, address: 'Test Scene' },
      testIncidentId
    );
    assert(simStart.started === true, 'startRouteSimulation successfully initialized route traversal');
    assert(
      simStart.route && simStart.route.geometry.length > 0,
      'Simulation route contains coordinate steps'
    );

    // Test return route simulation
    const returnSim = await startReturnSimulation(testResourceId);
    assert(
      returnSim.started === true,
      'startReturnSimulation successfully initiated return journey back to station'
    );
    assert(
      returnSim.route && returnSim.route.destination,
      'Return simulation targets resource homeLocation / station'
    );

    // Disable simulation mode
    const simDisable = await setSimulationMode(false);
    assert(simDisable.isSimulationMode === false, 'Simulation mode disabled');

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[Cleanup] Cleaning up test records...');
    await Promise.all([
      StationModel.deleteOne({ stationId: testStationId }),
      ResourceModel.deleteOne({ resourceId: testResourceId }),
      IncidentModel.deleteOne({ incidentId: testIncidentId }),
      AssignmentModel.deleteMany({ resourceId: testResourceId }),
    ]);
    console.log('[Cleanup] Done.');

  } catch (error) {
    console.error('Test error:', error);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();
