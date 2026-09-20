/**
 * Phase 10 Integration Test Suite
 * Validates AI Duplicate Detection & Clustering integration, fail-safe mechanism,
 * system health reporting, and backend duplicate routes.
 */

import http from 'http';
import app from '../app.js';
import {
  checkAiHealth,
  checkDuplicatePairWithAi,
  findDuplicatesWithAi,
  clusterIncidentsWithAi,
  formatIncidentForAi,
} from '../services/ai.service.js';

let server;
let baseUrl;

const runTests = async () => {
  console.log('====================================================');
  console.log('🤖 RUNNING PHASE 10 TEST SUITE: AI DUPLICATE DETECTION & BACKEND INTEGRATION');
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
    // 1. Start ephemeral HTTP server for backend route inspection
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`✓ Test server running on port ${port}`);
        resolve();
      });
    });

    // 2. Test Incident Formatting for AI Microservice
    console.log('\n--- 1. Incident Formatting for AI Engine ---');
    const rawDoc = {
      incidentId: 'INC-TEST-001',
      title: 'Chemical leak at factory',
      description: 'Dangerous ammonia gas leaking from valve in industrial area.',
      location: {
        latitude: 22.3072,
        longitude: 73.1812,
        address: 'GIDC Industrial Estate, Vadodara',
      },
      createdAt: '2026-09-20T05:00:00.000Z',
      source: 'SENSOR',
    };

    const formatted = formatIncidentForAi(rawDoc);
    assert(formatted.incident_id === 'INC-TEST-001', 'Formatted incident retains incident_id');
    assert(formatted.latitude === 22.3072, 'Formatted incident maps latitude correctly');
    assert(formatted.longitude === 73.1812, 'Formatted incident maps longitude correctly');
    assert(formatted.timestamp === '2026-09-20T05:00:00.000Z', 'Formatted incident formats ISO timestamp');
    assert(formatted.source === 'SENSOR', 'Formatted incident preserves incident source');

    // Test empty candidates handling
    const emptyCandidatesRes = await findDuplicatesWithAi(rawDoc, []);
    assert(emptyCandidatesRes.success === true, 'findDuplicatesWithAi handles empty candidate list gracefully');
    assert(emptyCandidatesRes.data.total_candidates === 0, 'Empty candidate response reports 0 candidates');
    assert(emptyCandidatesRes.data.has_duplicates === false, 'Empty candidate response reports no duplicates');

    // Test empty clustering handling
    const emptyClusterRes = await clusterIncidentsWithAi([]);
    assert(emptyClusterRes.success === true, 'clusterIncidentsWithAi handles empty list gracefully');
    assert(emptyClusterRes.data.cluster_count === 0, 'Empty clustering reports 0 clusters');

    // 3. Test AI Service Health & Capabilities
    console.log('\n--- 2. AI Service Health & Duplicate Capabilities ---');
    const health = await checkAiHealth();
    console.log('  Health check result:', {
      isHealthy: health.isHealthy,
      capabilities: health.capabilities,
      embeddingModelLoaded: health.embeddingModelLoaded,
      duplicateModelLoaded: health.duplicateModelLoaded,
    });
    assert(typeof health.isHealthy === 'boolean', 'Health check returns valid boolean status');
    assert(Array.isArray(health.capabilities), 'Health check returns capabilities array');

    // 4. Test Live or Mock Duplicate Pair Inference
    console.log('\n--- 3. Pairwise Duplicate Inference ---');
    const incidentA = {
      incidentId: 'INC-FIRE-A',
      title: 'Residential apartment fire',
      description: 'Flames and heavy black smoke coming from 4th floor balcony on Alkapuri main road.',
      location: { latitude: 22.3100, longitude: 73.1800, address: 'Alkapuri, Vadodara' },
      createdAt: new Date().toISOString(),
      source: 'CITIZEN',
    };

    const incidentB = {
      incidentId: 'INC-FIRE-B',
      title: 'Building fire in Alkapuri',
      description: 'Massive fire broke out on 4th floor flat in Alkapuri, smoke billowing, fire trucks needed.',
      location: { latitude: 22.3105, longitude: 73.1805, address: 'Near Alkapuri circle' },
      createdAt: new Date().toISOString(),
      source: 'EMERGENCY_CALL',
    };

    if (health.isHealthy) {
      console.log('  Testing live FastAPI duplicate detection endpoints...');
      const pairRes = await checkDuplicatePairWithAi(incidentA, incidentB);
      assert(pairRes.success === true, 'Live duplicate-check returns success');
      assert(
        pairRes.data.classification === 'DUPLICATE' || pairRes.data.classification === 'RELATED',
        `Correctly classified similar incident reports as ${pairRes.data?.classification}`
      );
      assert(pairRes.data.combined_score > 0.6, `High combined similarity score (${pairRes.data.combined_score})`);
      assert(typeof pairRes.data.reasoning === 'string', 'Generated explainable natural language reasoning');

      // Test Candidate Finder
      const findRes = await findDuplicatesWithAi(incidentA, [incidentB]);
      assert(findRes.success === true, 'Live find-duplicates returns success');
      assert(findRes.data.total_candidates === 1, 'Scanned 1 candidate');

      // Test Clustering
      const clusterRes = await clusterIncidentsWithAi([incidentA, incidentB]);
      assert(clusterRes.success === true, 'Live cluster returns success');
      assert(clusterRes.data.total_incidents === 2, 'Clustered 2 incidents');
    } else {
      console.log('  (AI service offline — skipping live inference assertions)');
    }

    // 5. Fail-Safe Client Testing
    console.log('\n--- 4. Fail-Safe Client Resilience ---');
    const unreachableUrl = 'http://127.0.0.1:59998';

    const failPair = await checkDuplicatePairWithAi(incidentA, incidentB, unreachableUrl);
    assert(failPair.success === false, 'checkDuplicatePairWithAi fails safely without crashing process');
    assert(typeof failPair.error === 'string', 'checkDuplicatePairWithAi provides descriptive error');

    const failFind = await findDuplicatesWithAi(incidentA, [incidentB], 'RELATED', unreachableUrl);
    assert(failFind.success === false, 'findDuplicatesWithAi fails safely without crashing process');

    const failCluster = await clusterIncidentsWithAi([incidentA, incidentB], 'RELATED', unreachableUrl);
    assert(failCluster.success === false, 'clusterIncidentsWithAi fails safely without crashing process');

    // 6. Backend Route Surface Verification
    console.log('\n--- 5. Backend Route Surface & Auth Enforcement ---');

    // POST /api/incidents/compare requires auth
    const unauthCompare = await fetch(`${baseUrl}/api/incidents/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentA: 'ID-1', incidentB: 'ID-2' }),
    });
    assert(unauthCompare.status === 401, 'POST /api/incidents/compare requires authentication (401)');

    // POST /api/incidents/cluster requires auth
    const unauthCluster = await fetch(`${baseUrl}/api/incidents/cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(unauthCluster.status === 401, 'POST /api/incidents/cluster requires authentication (401)');

    // POST /api/incidents/:id/detect-duplicates requires auth
    const unauthDetect = await fetch(`${baseUrl}/api/incidents/fake-id/detect-duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(unauthDetect.status === 401, 'POST /api/incidents/:id/detect-duplicates requires authentication (401)');

    // POST /api/incidents/:id/merge requires auth
    const unauthMerge = await fetch(`${baseUrl}/api/incidents/fake-id/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duplicateIncidentIds: ['fake-dup-id'] }),
    });
    assert(unauthMerge.status === 401, 'POST /api/incidents/:id/merge requires authentication (401)');

    // 7. System Health & Status Enriched with AI Service
    console.log('\n--- 6. System Health & Monitoring Integration ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthJson.success === true, 'GET /api/health responds with success');
    assert('aiService' in healthJson, 'GET /api/health includes aiService status object');

    const statusRes = await fetch(`${baseUrl}/api/system/status`);
    const statusJson = await statusRes.json();
    assert(statusJson.success === true, 'GET /api/system/status responds with success');
    assert('aiService' in statusJson.data, 'GET /api/system/status includes aiService in data payload');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
};

runTests();
