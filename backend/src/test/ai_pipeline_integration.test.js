import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndSanitizeAiResponse,
  reviewIncidentSchema,
  overrideIncidentSchema,
  addReportSchema,
} from '../validators/aiPipeline.validator.js';

describe('Phase 1: Canonical AI Contract & Multi-Layer Validation', () => {
  it('should successfully validate and sanitize a compliant canonical AI response', () => {
    const validAiPayload = {
      classification: {
        type: 'FIRE',
        confidence: 0.92,
      },
      severity: {
        level: 'HIGH',
        confidence: 0.88,
      },
      priority: {
        level: 'P1',
        reason: 'Severe commercial structure fire with life threat',
      },
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Market Square Block 4',
      },
      signals: ['flammable chemicals', 'heavy smoke'],
      duplicate: {
        isDuplicate: false,
        similarity: 0.12,
        relatedIncidentId: null,
      },
      requiresHumanReview: false,
    };

    const result = validateAndSanitizeAiResponse(validAiPayload, 'INC-TEST-001');

    assert.equal(result.valid, true);
    assert.equal(result.data.classification.type, 'FIRE');
    assert.equal(result.data.severity.level, 'HIGH');
    assert.equal(result.data.priority.level, 'P1');
    assert.equal(result.data.requiresHumanReview, false);
    assert.equal(result.data.signals[0], 'flammable chemicals');
  });

  it('should flag human review when confidence is below 0.70 threshold', () => {
    const lowConfidencePayload = {
      classification: {
        type: 'OTHER',
        confidence: 0.54, // Below 0.70 threshold
      },
      severity: {
        level: 'LOW',
        confidence: 0.60, // Below 0.70 threshold
      },
      priority: {
        level: 'P4',
        reason: 'Ambiguous caller description',
      },
      location: {
        latitude: null,
        longitude: null,
        address: 'Unknown road',
      },
      duplicate: {
        isDuplicate: false,
        similarity: 0.0,
        relatedIncidentId: null,
      },
      signals: [],
      requiresHumanReview: false, // will be overridden to true by Layer 3
    };

    const result = validateAndSanitizeAiResponse(lowConfidencePayload, 'INC-TEST-002');

    assert.equal(result.valid, true);
    assert.equal(result.data.requiresHumanReview, true);
  });

  it('should reject invalid enum or malformed schema payloads', () => {
    const dirtyPayload = {
      classification: {
        type: 'UNKNOWN_CATEGORY_XYZ', // Invalid
        confidence: 0.85,
      },
      severity: {
        level: 'SUPER_EXTREME', // Invalid
        confidence: 0.85,
      },
      priority: {
        level: 'URGENT_NOW', // Invalid
        reason: 'Test',
      },
      location: {},
      duplicate: { isDuplicate: false, similarity: 0.0 },
      requiresHumanReview: false,
    };

    const result = validateAndSanitizeAiResponse(dirtyPayload);

    assert.equal(result.valid, false);
    assert.ok(result.error.includes('Schema Validation Failed'));
  });

  it('should prevent self-duplicate linking', () => {
    const selfDupPayload = {
      classification: {
        type: 'ROAD_ACCIDENT',
        confidence: 0.95,
      },
      severity: {
        level: 'MEDIUM',
        confidence: 0.90,
      },
      priority: {
        level: 'P2',
        reason: 'Collision on highway',
      },
      location: {
        latitude: 12.9,
        longitude: 77.6,
        address: 'Highway 44',
      },
      signals: ['traffic blocked'],
      duplicate: {
        isDuplicate: true,
        similarity: 0.99,
        relatedIncidentId: 'INC-CANONICAL-999', // Matches current incident ID
      },
      requiresHumanReview: false,
    };

    const result = validateAndSanitizeAiResponse(selfDupPayload, 'INC-CANONICAL-999');

    assert.equal(result.valid, true);
    assert.equal(result.data.duplicate.isDuplicate, false);
    assert.equal(result.data.duplicate.relatedIncidentId, null);
  });
});

describe('Phase 3: Human Review Validation Schemas', () => {
  it('should validate valid CONFIRM review action', () => {
    const req = {
      body: {
        decision: 'CONFIRM',
        reason: 'Verified location and fire status via live CCTV',
      },
    };

    const parsed = reviewIncidentSchema.safeParse(req);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.body.decision, 'CONFIRM');
  });

  it('should reject review action without reason', () => {
    const req = {
      body: {
        decision: 'CONFIRM',
        // Missing reason
      },
    };

    const parsed = reviewIncidentSchema.safeParse(req);
    assert.equal(parsed.success, false);
  });
});

describe('Phase 4: AI Override Schema & RBAC Rules', () => {
  it('should validate a comprehensive override payload with multiple fields', () => {
    const req = {
      body: {
        overrides: {
          classification: 'INDUSTRIAL_ACCIDENT',
          severity: 'CRITICAL',
          priority: 'P1',
        },
        reason: 'Live sensor telemetry confirmed chlorine gas leak',
      },
    };

    const parsed = overrideIncidentSchema.safeParse(req);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.body.overrides.classification, 'INDUSTRIAL_ACCIDENT');
    assert.equal(parsed.data.body.overrides.severity, 'CRITICAL');
    assert.equal(parsed.data.body.overrides.priority, 'P1');
  });

  it('should validate single field override format', () => {
    const req = {
      body: {
        field: 'severity',
        newValue: 'CRITICAL',
        reason: 'Multiple casualties reported on site',
      },
    };

    const parsed = overrideIncidentSchema.safeParse(req);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.body.field, 'severity');
    assert.equal(parsed.data.body.newValue, 'CRITICAL');
  });

  it('should reject override payload with no fields to override', () => {
    const req = {
      body: {
        reason: 'No fields provided at all',
      },
    };

    const parsed = overrideIncidentSchema.safeParse(req);
    assert.equal(parsed.success, false);
  });
});

describe('Phase 5: Multi-Source Evidence & Fusion Validation', () => {
  it('should validate incoming multi-source report', () => {
    const req = {
      body: {
        source: 'FIELD_TEAM',
        text: 'Smoke billowing from second floor window on east side',
        reliability: 88,
      },
    };

    const parsed = addReportSchema.safeParse(req);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.body.source, 'FIELD_TEAM');
    assert.equal(parsed.data.body.reliability, 88);
  });

  it('should enforce reliability bounds between 0 and 100', () => {
    const req = {
      body: {
        source: 'EMERGENCY_CALL',
        text: 'Explosion reported',
        reliability: 150, // Out of bounds
      },
    };

    const parsed = addReportSchema.safeParse(req);
    assert.equal(parsed.success, false);
  });
});
