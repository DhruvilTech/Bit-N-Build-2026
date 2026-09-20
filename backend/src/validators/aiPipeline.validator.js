/**
 * AI Pipeline Contract & Multi-Tier Validation Engine (Phase 1 & Phase 3 & Phase 4)
 * Enforces mandatory 5-layer validation:
 * 1. Schema Validation (Zod)
 * 2. Enum / Range Validation
 * 3. Business Rule Validation
 * 4. Safety Validation & Sanitization
 * 5. Structured Output for Authoritative Database Update
 */

import { z } from 'zod';
import { env } from '../config/env.js';

export const VALID_INCIDENT_TYPES = [
  'FIRE',
  'FLOOD',
  'ROAD_ACCIDENT',
  'INDUSTRIAL_ACCIDENT',
  'MEDICAL_EMERGENCY',
  'EARTHQUAKE',
  'OTHER',
];

export const VALID_SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const VALID_PRIORITY_LEVELS = ['P1', 'P2', 'P3', 'P4'];

/**
 * Strict Zod Schema for Canonical AI Response (Phase 1 Contract)
 */
export const aiPipelineResponseSchema = z.object({
  classification: z.object({
    type: z.enum(VALID_INCIDENT_TYPES, {
      errorMap: () => ({ message: 'Invalid AI classification type' }),
    }),
    confidence: z
      .number()
      .min(0.0, 'Classification confidence must be >= 0.0')
      .max(1.0, 'Classification confidence must be <= 1.0'),
  }),
  severity: z.object({
    level: z.enum(VALID_SEVERITY_LEVELS, {
      errorMap: () => ({ message: 'Invalid AI severity level' }),
    }),
    confidence: z
      .number()
      .min(0.0, 'Severity confidence must be >= 0.0')
      .max(1.0, 'Severity confidence must be <= 1.0'),
  }),
  priority: z.object({
    level: z.enum(VALID_PRIORITY_LEVELS, {
      errorMap: () => ({ message: 'Invalid AI priority level' }),
    }),
    reason: z.string().min(1, 'Priority reason cannot be empty'),
  }),
  location: z.object({
    latitude: z.number().min(-90.0).max(90.0).nullable().optional(),
    longitude: z.number().min(-180.0).max(180.0).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
  }),
  duplicate: z.object({
    isDuplicate: z.boolean(),
    similarity: z.number().min(0.0).max(1.0),
    relatedIncidentId: z.string().nullable().optional(),
  }),
  signals: z.array(z.string()).default([]),
  requiresHumanReview: z.boolean(),
});

/**
 * Validates and sanitizes raw AI responses through the mandatory 5-layer pipeline.
 * Never directly trusts raw AI output.
 *
 * @param {any} rawAiResponse - Raw output from Python AI microservice
 * @param {string} [currentIncidentId] - Current incident ID to detect invalid self-merges
 * @returns {{ valid: boolean, data?: any, error?: string, details?: any }}
 */
export const validateAndSanitizeAiResponse = (rawAiResponse, currentIncidentId = null) => {
  if (!rawAiResponse || typeof rawAiResponse !== 'object') {
    return {
      valid: false,
      error: 'AI response is null or not a valid JSON object',
    };
  }

  // LAYER 1: Strict Zod Schema Validation
  const parseResult = aiPipelineResponseSchema.safeParse(rawAiResponse);
  if (!parseResult.success) {
    const errorIssues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return {
      valid: false,
      error: `AI Response Schema Validation Failed: ${errorIssues.join('; ')}`,
      details: parseResult.error.issues,
    };
  }

  const validated = parseResult.data;

  // LAYER 2: Enum and Value Boundary Validation
  if (!VALID_INCIDENT_TYPES.includes(validated.classification.type)) {
    return { valid: false, error: `Invalid classification type: ${validated.classification.type}` };
  }
  if (!VALID_SEVERITY_LEVELS.includes(validated.severity.level)) {
    return { valid: false, error: `Invalid severity level: ${validated.severity.level}` };
  }
  if (!VALID_PRIORITY_LEVELS.includes(validated.priority.level)) {
    return { valid: false, error: `Invalid priority level: ${validated.priority.level}` };
  }
  if (validated.classification.confidence < 0 || validated.classification.confidence > 1) {
    return { valid: false, error: `Invalid classification confidence: ${validated.classification.confidence}` };
  }
  if (validated.severity.confidence < 0 || validated.severity.confidence > 1) {
    return { valid: false, error: `Invalid severity confidence: ${validated.severity.confidence}` };
  }
  if (validated.duplicate.similarity < 0 || validated.duplicate.similarity > 1) {
    return { valid: false, error: `Invalid duplicate similarity: ${validated.duplicate.similarity}` };
  }

  // LAYER 3: Business Rule Validation
  // Rule A: Self-duplicate prevention
  if (
    currentIncidentId &&
    validated.duplicate.relatedIncidentId &&
    String(validated.duplicate.relatedIncidentId).trim() === String(currentIncidentId).trim()
  ) {
    validated.duplicate.isDuplicate = false;
    validated.duplicate.relatedIncidentId = null;
  }

  // Rule B: Enforce independent review threshold check
  const reviewThreshold = env.HUMAN_REVIEW_THRESHOLD || 0.7;
  const isClassLow = validated.classification.confidence < reviewThreshold;
  const isSevLow = validated.severity.confidence < reviewThreshold;
  if (isClassLow || isSevLow) {
    validated.requiresHumanReview = true;
  }

  // LAYER 4: Safety Validation & Field Sanitization
  const sanitizedSignals = (validated.signals || [])
    .map((s) => (typeof s === 'string' ? s.trim().replace(/<[^>]*>?/gm, '').slice(0, 80) : ''))
    .filter((s) => s.length > 0);

  const sanitizedPriorityReason = validated.priority.reason
    .replace(/<[^>]*>?/gm, '')
    .trim()
    .slice(0, 300);

  let sanitizedAddress = null;
  if (validated.location.address) {
    sanitizedAddress = validated.location.address.replace(/<[^>]*>?/gm, '').trim().slice(0, 300);
  }

  // Build sanitized, validated payload
  const sanitizedResult = {
    classification: {
      type: validated.classification.type,
      confidence: Math.round(validated.classification.confidence * 100) / 100,
    },
    severity: {
      level: validated.severity.level,
      confidence: Math.round(validated.severity.confidence * 100) / 100,
    },
    priority: {
      level: validated.priority.level,
      reason: sanitizedPriorityReason,
    },
    location: {
      latitude: validated.location.latitude ?? null,
      longitude: validated.location.longitude ?? null,
      address: sanitizedAddress,
    },
    duplicate: {
      isDuplicate: Boolean(validated.duplicate.isDuplicate),
      similarity: Math.round(validated.duplicate.similarity * 100) / 100,
      relatedIncidentId: validated.duplicate.relatedIncidentId || null,
    },
    signals: sanitizedSignals,
    requiresHumanReview: Boolean(validated.requiresHumanReview),
  };

  return {
    valid: true,
    data: sanitizedResult,
  };
};

/**
 * Human Review Schema (Phase 3)
 */
export const reviewIncidentSchema = z.object({
  body: z.object({
    decision: z.enum(['CONFIRM', 'OVERRIDE'], {
      errorMap: () => ({ message: "Decision must be either 'CONFIRM' or 'OVERRIDE'" }),
    }),
    reason: z.string().min(2, 'A review reason is required (at least 2 characters)'),
    overrides: z
      .object({
        classification: z.enum(VALID_INCIDENT_TYPES).optional(),
        severity: z.enum(VALID_SEVERITY_LEVELS).optional(),
        priority: z.enum(VALID_PRIORITY_LEVELS).optional(),
      })
      .optional(),
  }),
});

/**
 * Single/Multi-Field AI Override Schema (Phase 4)
 */
export const overrideIncidentSchema = z.object({
  body: z
    .object({
      field: z.enum(['classification', 'severity', 'priority', 'type']).optional(),
      newValue: z.string().optional(),
      reason: z.string().min(3, 'An operational reason is required for overriding AI decisions'),
      overrides: z
        .object({
          classification: z.enum(VALID_INCIDENT_TYPES).optional(),
          type: z.enum(VALID_INCIDENT_TYPES).optional(),
          severity: z.enum(VALID_SEVERITY_LEVELS).optional(),
          priority: z.enum(VALID_PRIORITY_LEVELS).optional(),
        })
        .optional(),
    })
    .refine(
      (data) => (data.field && data.newValue) || (data.overrides && Object.keys(data.overrides).length > 0),
      { message: 'Must provide either (field and newValue) or an overrides object with fields to update' }
    ),
});

/**
 * Ingest Additional Source Report Schema (Phase 5)
 */
export const addReportSchema = z.object({
  body: z.object({
    source: z
      .enum(['CITIZEN', 'SENSOR', 'EMERGENCY_CALL', 'FIELD_TEAM', 'OPERATOR', 'GOVERNMENT', 'OTHER', 'SYSTEM'])
      .default('CITIZEN'),
    text: z.string().min(3, 'Report narrative must be at least 3 characters'),
    reliability: z.number().min(0).max(100).optional(),
    reportedBy: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        badgeNumber: z.string().optional(),
      })
      .optional(),
    metadata: z.record(z.any()).optional(),
  }),
});
