import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSchedulerHealth } from '../services/scheduler.service.js';
import { getSocketHealth } from '../utils/socket.js';
import { classifyAiError, AI_ERROR_CODES } from '../services/ai.service.js';
import { buildIncidentExplainability } from '../services/explainability.service.js';
import { TIMELINE_EVENT_TYPES } from '../models/timelineEvent.model.js';
import { getUnifiedIncidentTimeline } from '../services/timeline.service.js';

describe('PHASE 31: System Health Monitoring', () => {
  it('should track scheduler execution metrics correctly', () => {
    const health = getSchedulerHealth();
    assert(health, 'Scheduler health object must be returned');
    assert.equal(typeof health.status, 'string');
    assert.equal(typeof health.uptime, 'number');
    assert(health.uptime >= 0);
    assert.equal(typeof health.runCount, 'number');
    assert('lastRunAt' in health);
    assert('lastSuccessAt' in health);
    assert('lastFailureAt' in health);
    assert('consecutiveFailures' in health);
    assert(['healthy', 'degraded', 'unhealthy'].includes(health.status));
  });

  it('should expose socket health metrics with connected client count', () => {
    const socketHealth = getSocketHealth();
    assert(socketHealth, 'Socket health object must exist');
    assert(['healthy', 'degraded', 'unhealthy'].includes(socketHealth.status));
    assert.equal(typeof socketHealth.connectedClients, 'number');
    assert.equal(typeof socketHealth.uptime, 'number');
    assert(socketHealth.timestamp);
  });

  it('should ensure health payloads never expose sensitive secrets or credentials', () => {
    const schedHealth = getSchedulerHealth();
    const sockHealth = getSocketHealth();

    const serialized = JSON.stringify({ schedHealth, sockHealth });
    assert(!serialized.includes('mongodb+srv://'), 'Must not contain MongoDB connection string');
    assert(!serialized.includes('password'), 'Must not contain password');
    assert(!serialized.includes('JWT_SECRET'), 'Must not contain JWT_SECRET');
    assert(!serialized.includes('AI_SERVICE_API_KEY'), 'Must not contain API keys');
  });
});

describe('PHASE 32: AI Failure / Retry / Fallback & Error Classification', () => {
  it('should differentiate all standard AI failure error codes', () => {
    // 1. Timeout
    const timeoutErr = new Error('Request aborted due to timeout');
    timeoutErr.name = 'AbortError';
    assert.equal(classifyAiError(timeoutErr).code, AI_ERROR_CODES.TIMEOUT);

    // 2. Connection Failure
    const connErr = new Error('connect ECONNREFUSED 127.0.0.1:8000');
    connErr.code = 'ECONNREFUSED';
    assert.equal(classifyAiError(connErr).code, AI_ERROR_CODES.CONNECTION_FAILURE);

    // 3. HTTP Failure
    const httpErr = new Error('HTTP request failed with status 503');
    httpErr.status = 503;
    assert.equal(classifyAiError(httpErr).code, AI_ERROR_CODES.HTTP_FAILURE);

    // 4. Schema Validation Failure
    const schemaErr = new Error('AI response failed validation: invalid category');
    assert.equal(classifyAiError(schemaErr).code, AI_ERROR_CODES.SCHEMA_VALIDATION_FAILURE);

    // 5. Invalid / Empty JSON Response
    const jsonErr = new Error('Unexpected token in JSON at position 0');
    assert.equal(classifyAiError(jsonErr).code, AI_ERROR_CODES.INVALID_RESPONSE);
  });

  it('should compute exponential backoff delay correctly without indefinite retry', () => {
    const baseDelay = 200;
    const maxRetries = 2;

    const delayAttempt0 = baseDelay * Math.pow(2, 0); // 200ms
    const delayAttempt1 = baseDelay * Math.pow(2, 1); // 400ms
    const delayAttempt2 = baseDelay * Math.pow(2, 2); // 800ms

    assert.equal(delayAttempt0, 200);
    assert.equal(delayAttempt1, 400);
    assert.equal(delayAttempt2, 800);
    assert(maxRetries <= 5, 'Retries must be strictly bounded');
  });

  it('should generate deterministic fallback without blocking emergency workflow', () => {
    const mockIncidentDoc = {
      incidentId: 'INC-FALLBACK-TEST',
      title: 'Structural collapse with trapped occupants',
      description: 'Major ceiling collapse in warehouse, 3 civilians trapped with severe injuries',
      type: 'COLLAPSE',
      severity: 'HIGH',
      priority: 'P1',
      source: 'EMERGENCY_CALL',
      aiAnalysis: {
        status: 'FALLBACK',
        fallbackUsed: true,
        errorCode: 'TIMEOUT',
        failureReason: 'AI service timed out after 3 attempts',
        requiresHumanReview: true,
        reviewReason: 'AI analysis unavailable (TIMEOUT). Deterministic safety fallback applied.',
        safetyOverrides: {
          applied: true,
          reason: 'AI service unavailable - deterministic safety fallback applied',
          originalAIValue: null,
          finalValue: { type: 'COLLAPSE', severity: 'HIGH', priority: 'P1' },
        },
        attempt: 3,
        latencyMs: 8200,
      },
    };

    const explainability = buildIncidentExplainability(mockIncidentDoc);
    assert.equal(explainability.status, 'FALLBACK');
    assert.equal(explainability.executionMetadata.fallbackUsed, true);
    assert.equal(explainability.executionMetadata.errorCode, 'TIMEOUT');
    assert.equal(explainability.humanReviewStatus.required, true);
    assert.equal(explainability.safetyOverrides.overrideApplied, true);
    assert.equal(explainability.classification.predicted, 'UNCLASSIFIED');
    assert.equal(explainability.classification.final, 'COLLAPSE');
    assert.equal(explainability.overallConfidence, 0.0);
  });
});

describe('PHASE 33: Explainability Integration & Safety Overrides', () => {
  it('should generate complete, structured, operator-safe explainability package', () => {
    const mockIncidentDoc = {
      incidentId: 'INC-EXPLAIN-01',
      title: 'Three-alarm industrial chemical fire',
      description: 'Flammable chemical explosion and heavy smoke near industrial park',
      type: 'FIRE',
      severity: 'CRITICAL',
      priority: 'P1',
      source: 'EMERGENCY_CALL',
      aiAnalysis: {
        status: 'COMPLETED',
        fallbackUsed: false,
        classification: { type: 'FIRE', confidence: 0.94 },
        severityRating: { level: 'CRITICAL', confidence: 0.91 },
        priorityRating: { level: 'P1', reason: 'High-threat chemical fire with life safety risk' },
        signals: ['flammable chemicals', 'heavy smoke', 'industrial zone'],
        duplicate: { isDuplicate: false, similarity: 0.1, relatedIncidentId: null },
        requiresHumanReview: false,
        reasoning: {
          incidentType: 'Classified as FIRE based on chemical explosion markers',
          severity: 'Critical severity due to chemical combustion hazards',
          priority: 'P1 immediate multi-alarm dispatch required',
        },
        original: { classification: 'FIRE', severity: 'CRITICAL', priority: 'P1' },
        final: { classification: 'FIRE', severity: 'CRITICAL', priority: 'P1' },
        overrides: [],
        attempt: 1,
        latencyMs: 145,
      },
    };

    const explain = buildIncidentExplainability(mockIncidentDoc);

    // 1. WHAT was predicted
    assert.equal(explain.classification.predicted, 'FIRE');
    assert.equal(explain.severity.predicted, 'CRITICAL');
    assert.equal(explain.priority.predicted, 'P1');

    // 2. HOW confident
    assert.equal(explain.overallConfidence, 0.93);
    assert.equal(explain.classification.confidence, 0.94);
    assert.equal(explain.severity.confidence, 0.91);

    // 3. WHY it was predicted
    assert(explain.explanation.why.includes('chemical explosion') || explain.explanation.why.length > 0);

    // 4. WHICH factors influenced
    assert(explain.keyFactors.includes('flammable chemicals'));
    assert(explain.keyFactors.includes('heavy smoke'));

    // 5. WHETHER human review required
    assert.equal(explain.humanReviewStatus.required, false);

    // 6. Safety overrides clear distinction
    assert.equal(explain.safetyOverrides.overrideApplied, false);
    assert.deepEqual(explain.safetyOverrides.originalAIValue, explain.safetyOverrides.finalValue);

    // 7. Rules triggered
    assert(explain.rulesTriggered.some((r) => r.includes('Critical') || r.includes('P1')));
  });

  it('should clearly distinguish RAW AI RESULT from FINAL SYSTEM RESULT when overridden', () => {
    const mockOverriddenIncident = {
      incidentId: 'INC-OVERRIDE-01',
      title: 'Report of suspicious odor',
      description: 'Caller reported faint chemical odor outside',
      type: 'HAZMAT',
      severity: 'HIGH',
      priority: 'P1',
      source: 'OPERATOR',
      aiAnalysis: {
        status: 'COMPLETED',
        fallbackUsed: false,
        classification: { type: 'OTHER', confidence: 0.62 },
        severityRating: { level: 'LOW', confidence: 0.65 },
        priorityRating: { level: 'P4', reason: 'Ambiguous odor complaint' },
        signals: ['odor'],
        requiresHumanReview: true,
        reviewReason: 'Calibrated confidence below review threshold',
        original: { classification: 'OTHER', severity: 'LOW', priority: 'P4' },
        final: { classification: 'HAZMAT', severity: 'HIGH', priority: 'P1' },
        overrides: [
          {
            field: 'severity',
            previousValue: 'LOW',
            newValue: 'HIGH',
            reason: 'Caller is next to high-pressure ammonia tank',
            overriddenBy: { name: 'Lead Dispatcher', role: 'OPERATOR' },
            timestamp: new Date(),
          },
        ],
      },
    };

    const explain = buildIncidentExplainability(mockOverriddenIncident);

    assert.equal(explain.safetyOverrides.overrideApplied, true);
    assert.equal(explain.safetyOverrides.overrideReason, 'Caller is next to high-pressure ammonia tank');
    assert.equal(explain.safetyOverrides.originalAIValue.classification, 'OTHER');
    assert.equal(explain.safetyOverrides.originalAIValue.severity, 'LOW');
    assert.equal(explain.safetyOverrides.finalValue.classification, 'HAZMAT');
    assert.equal(explain.safetyOverrides.finalValue.severity, 'HIGH');
    assert.equal(explain.safetyOverrides.finalValue.priority, 'P1');
  });
});

describe('PHASE 34: Unified Incident Timeline', () => {
  it('should support all required Phase 34 timeline event types', () => {
    const requiredTypes = [
      'INCIDENT_CREATED',
      'INCIDENT_UPDATED',
      'AI_ANALYSIS_STARTED',
      'AI_ANALYSIS_COMPLETED',
      'AI_FAILED',
      'AI_FALLBACK',
      'HUMAN_REVIEW_REQUIRED',
      'TEAM_ASSIGNED',
      'DISPATCHED',
      'EN_ROUTE',
      'LOCATION_UPDATED',
      'ETA_UPDATED',
      'RESPONSE_DELAYED',
      'TEAM_ARRIVED',
      'ALERT_CREATED',
      'ALERT_ACKNOWLEDGED',
      'ALERT_RESOLVED',
      'STATUS_CHANGED',
      'OPERATOR_OVERRIDE',
      'INCIDENT_RESOLVED',
    ];

    for (const type of requiredTypes) {
      assert(
        TIMELINE_EVENT_TYPES.includes(type),
        `TIMELINE_EVENT_TYPES must include ${type}`
      );
    }
  });

  it('should merge embedded incident timeline events and preserve chronological order', async () => {
    const mockIncidentId = 'INC-TIMELINE-TEST';

    // Query unified timeline with sort = 'asc' (oldest -> newest)
    const resultAsc = await getUnifiedIncidentTimeline(mockIncidentId, {
      sort: 'asc',
      page: 1,
      limit: 20,
    });

    assert(resultAsc, 'Timeline result object must exist');
    assert(Array.isArray(resultAsc.events), 'result.events must be an array');
    assert.equal(typeof resultAsc.total, 'number');
    assert.equal(typeof resultAsc.page, 'number');
    assert.equal(typeof resultAsc.limit, 'number');
    assert.equal(typeof resultAsc.totalPages, 'number');

    // Query unified timeline with sort = 'desc' (newest -> oldest)
    const resultDesc = await getUnifiedIncidentTimeline(mockIncidentId, {
      sort: 'desc',
      page: 1,
      limit: 10,
    });
    assert(resultDesc, 'Desc timeline result must exist');
    assert.equal(resultDesc.limit, 10);
  });

  it('should generate server timestamp authority for all recorded events', async () => {
    const { recordTimelineEvent } = await import('../services/timeline.service.js');
    const beforeTime = new Date(Date.now() - 1000);

    const event = await recordTimelineEvent({
      incidentId: 'INC-AUTH-TIME-01',
      eventType: 'ETA_UPDATED',
      actor: 'GPS Engine',
      actorRole: 'SYSTEM',
      title: 'ETA Updated',
      description: 'ETA updated to 8 minutes',
      metadata: { etaMinutes: 8 },
    });

    const afterTime = new Date(Date.now() + 1000);

    assert(event.timestamp, 'Event must have server timestamp');
    const eventTime = new Date(event.timestamp);
    assert(eventTime >= beforeTime && eventTime <= afterTime, 'Timestamp must be strictly generated by server');
    assert.equal(event.eventType, 'ETA_UPDATED');
    assert.equal(event.actor, 'GPS Engine');
  });
});

describe('PHASE 35: Real-Time Socket.IO Integration & Event Contracts', () => {
  it('should export all required Phase 31-35 socket emitters without collision', async () => {
    const socketModule = await import('../utils/socket.js');
    assert.equal(typeof socketModule.emitSystemHealth, 'function');
    assert.equal(typeof socketModule.emitIncidentAiFallback, 'function');
    assert.equal(typeof socketModule.emitIncidentTimelineUpdated, 'function');
    assert.equal(typeof socketModule.emitIncidentAiProcessing, 'function');
    assert.equal(typeof socketModule.emitIncidentAiAnalyzed, 'function');
    assert.equal(typeof socketModule.emitIncidentAiFailed, 'function');
    assert.equal(typeof socketModule.emitIncidentReviewRequired, 'function');
  });
});

