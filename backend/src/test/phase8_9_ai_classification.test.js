/**
 * Phase 8 & 9 Integration Test Suite
 * Validates AI Service integration, fail-safe mechanism, and incident AI routes.
 */

import http from 'http';
import app from '../app.js';
import { env } from '../config/env.js';
import { checkAiHealth, classifyIncidentWithAi } from '../services/ai.service.js';

let server;
let baseUrl;

const runTests = async () => {
  console.log('====================================================');
  console.log('🤖 RUNNING PHASE 8 & 9 TEST SUITE: AI SERVICE & CLASSIFICATION');
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

    // 2. Test AI Service Health & Direct Classification
    console.log('\n--- 1. AI Service Connectivity & Inference ---');
    const health = await checkAiHealth();
    console.log('  Health check result:', health);
    assert(typeof health.isHealthy === 'boolean', 'Health check returns valid boolean status');

    const highRiskIncident = {
      title: 'Boiler blast at chemical plant',
      description: 'Major boiler explosion at chemical facility. Ammonia gas leak, 3 workers trapped in production unit.',
      type: 'OTHER',
      source: 'EMERGENCY_CALL',
      location: { latitude: 19.076, longitude: 72.877, address: 'MIDC Zone' },
    };

    if (health.isHealthy) {
      console.log('\n--- Live Inference Call to FastAPI ---');
      const liveRes = await classifyIncidentWithAi(highRiskIncident);
      assert(liveRes.success === true, 'Live AI inference returns success');
      assert(liveRes.data.incidentType === 'INDUSTRIAL_ACCIDENT', 'Correctly classified as INDUSTRIAL_ACCIDENT');
      assert(liveRes.data.severity === 'CRITICAL', 'Assigned CRITICAL severity for chemical blast + trapped workers');
      assert(liveRes.data.priority === 'P1', 'Escalated to P1 operational priority');
      assert(liveRes.data.suggestedCorrection === true, 'Flagged suggestedCorrection from OTHER to INDUSTRIAL_ACCIDENT');
      assert(liveRes.data.signals.includes('people_trapped'), 'Extracted people_trapped tactical signal');
      console.log('  Live AI Result Summary:', {
        type: liveRes.data.incidentType,
        severity: liveRes.data.severity,
        priority: liveRes.data.priority,
        confidence: liveRes.data.confidence,
        signals: liveRes.data.signals,
      });
    }

    console.log('\n--- 2. Fail-Safe Client Testing ---');
    // Test fail-safe with non-existent host override
    const failSafeResult = await classifyIncidentWithAi(highRiskIncident, 'http://127.0.0.1:59999');
    assert(failSafeResult.success === false, 'Fail-safe intercepts connection error without throwing');
    assert(typeof failSafeResult.error === 'string', 'Fail-safe provides structured error description');

    // 3. Backend Route Verification
    console.log('\n--- 3. Backend Route Surface Verification ---');
    // Calling analyze on fake ID without auth should return 401 Unauthorized
    const unauthAnalyzeRes = await fetch(`${baseUrl}/api/incidents/fake-id/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(unauthAnalyzeRes.status === 401, 'POST /api/incidents/:id/analyze requires authentication (401)');

    const unauthAiAnalysisRes = await fetch(`${baseUrl}/api/incidents/fake-id/ai-analysis`, {
      method: 'GET',
    });
    assert(unauthAiAnalysisRes.status === 401, 'GET /api/incidents/:id/ai-analysis requires authentication (401)');

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
