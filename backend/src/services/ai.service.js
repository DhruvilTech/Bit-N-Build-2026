/**
 * AI Service Integration Client for PS-9 Backend
 * Communicates with the external Python / FastAPI AI Microservice.
 * Fully fail-safe with strict timeouts, abort controllers, and error encapsulation.
 * Supports:
 * - Incident Classification & Triage
 * - Multi-Factor Semantic Duplicate Detection
 * - Candidate Matching & Deduplication
 * - Incident Graph Clustering & Consolidation
 */

import { env } from '../config/env.js';
import { validateAndSanitizeAiResponse } from '../validators/aiPipeline.validator.js';

const getAiBaseUrl = () => env.AI_SERVICE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Phase 32 AI Failure Error Codes
 */
export const AI_ERROR_CODES = {
  TIMEOUT: 'TIMEOUT',
  CONNECTION_FAILURE: 'CONNECTION_FAILURE',
  HTTP_FAILURE: 'HTTP_FAILURE',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  SCHEMA_VALIDATION_FAILURE: 'SCHEMA_VALIDATION_FAILURE',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
};

/**
 * Classifies runtime errors into standard Phase 32 AI failure codes
 */
export const classifyAiError = (error) => {
  if (!error) {
    return { code: 'UNKNOWN_ERROR', reason: 'Unknown error occurred' };
  }

  const msg = (error.message || '').toLowerCase();
  const name = error.name || '';
  const code = error.code || '';
  const status = error.status || error.statusCode || 0;

  if (name === 'AbortError' || msg.includes('timeout') || msg.includes('aborted') || code === 'ETIMEDOUT') {
    return { code: AI_ERROR_CODES.TIMEOUT, reason: 'AI microservice request timed out' };
  }

  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EHOSTUNREACH' ||
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('network error')
  ) {
    return { code: AI_ERROR_CODES.CONNECTION_FAILURE, reason: 'Unable to connect to AI microservice' };
  }

  if (status >= 400 || msg.includes('status 5') || msg.includes('status 4') || msg.includes('http request failed')) {
    return { code: AI_ERROR_CODES.HTTP_FAILURE, reason: `AI microservice returned HTTP error status ${status || 'failed'}` };
  }

  if (msg.includes('validation') || msg.includes('schema') || msg.includes('zod')) {
    return { code: AI_ERROR_CODES.SCHEMA_VALIDATION_FAILURE, reason: 'AI output failed schema or business rule validation' };
  }

  if (msg.includes('json') || msg.includes('syntaxerror') || msg.includes('unexpected token') || msg.includes('empty')) {
    return { code: AI_ERROR_CODES.INVALID_RESPONSE, reason: 'Malformed or unparseable response from AI service' };
  }

  return { code: 'AI_INTERNAL_FAILURE', reason: error.message || 'AI processing encountered an internal error' };
};

/**
 * Standardizes MongoDB incident document or payload into FastAPI IncidentInput schema.
 * @param {Object} doc - Incident document or plain object
 * @returns {Object} Normalized incident input for AI service
 */
export const formatIncidentForAi = (doc) => {
  if (!doc) return null;
  const id = doc.incidentId || doc._id?.toString() || doc.id || `INC-${Date.now()}`;
  const desc = doc.description || doc.title || 'Emergency incident reported';

  let lat = null;
  let lng = null;
  if (doc.location) {
    if (typeof doc.location.latitude === 'number') lat = doc.location.latitude;
    if (typeof doc.location.longitude === 'number') lng = doc.location.longitude;
    if (
      (lat === null || lng === null) &&
      Array.isArray(doc.location.coordinates) &&
      doc.location.coordinates.length >= 2
    ) {
      lng = lng ?? doc.location.coordinates[0];
      lat = lat ?? doc.location.coordinates[1];
    }
  }

  let timestamp = null;
  if (doc.createdAt) {
    timestamp = new Date(doc.createdAt).toISOString();
  } else if (doc.timestamp) {
    timestamp = new Date(doc.timestamp).toISOString();
  } else {
    timestamp = new Date().toISOString();
  }

  return {
    incident_id: String(id),
    description: String(desc),
    latitude: lat,
    longitude: lng,
    timestamp,
    source: doc.source || 'EMERGENCY_CALL',
  };
};

/**
 * Checks if the external Python AI service is healthy and reachable.
 * @param {string} [overrideUrl]
 * @returns {Promise<{ isHealthy: boolean, details?: any, capabilities?: string[], error?: string }>}
 */
export const checkAiHealth = async (overrideUrl = null) => {
  try {
    const baseUrl = overrideUrl || getAiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isHealthy: false,
        capabilities: [],
        embeddingModelLoaded: false,
        duplicateModelLoaded: false,
        error: `Health check failed with status ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      isHealthy: data.status === 'healthy',
      details: data,
      capabilities: data.capabilities || [],
      embeddingModelLoaded: data.embedding_model_loaded ?? null,
      duplicateModelLoaded: data.duplicate_classifier_loaded ?? null,
    };
  } catch (error) {
    return {
      isHealthy: false,
      capabilities: [],
      embeddingModelLoaded: false,
      duplicateModelLoaded: false,
      error: error.name === 'AbortError' ? 'Health check timed out' : error.message,
    };
  }
};

/**
 * Classifies an incident report by calling the Python FastAPI classification service.
 * @param {Object} incidentPayload
 * @param {string} [overrideUrl]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export const classifyIncidentWithAi = async (incidentPayload, overrideUrl = null) => {
  try {
    const baseUrl = overrideUrl || getAiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const body = {
      incidentId: incidentPayload._id?.toString() || incidentPayload.incidentId,
      title: incidentPayload.title,
      description: incidentPayload.description,
      type: incidentPayload.type || null,
      source: incidentPayload.source || 'EMERGENCY_CALL',
      location: incidentPayload.location
        ? {
            latitude: incidentPayload.location.latitude,
            longitude: incidentPayload.location.longitude,
            address: incidentPayload.location.address,
          }
        : null,
      metadata: incidentPayload.metadata || {},
    };

    const response = await fetch(`${baseUrl}/api/v1/classify-incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      return {
        success: false,
        error: `AI service returned HTTP ${response.status}: ${errBody.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    const message = isTimeout
      ? `AI classification request timed out after ${DEFAULT_TIMEOUT_MS}ms`
      : `AI service unavailable: ${error.message}`;

    console.warn(`[AI Service Client] Fail-safe intercepted error: ${message}`);
    return { success: false, error: message };
  }
};

/**
 * Performs a pairwise duplicate comparison between two incidents using multi-factor similarity.
 * @param {Object} incidentA - First incident
 * @param {Object} incidentB - Second incident
 * @param {string} [overrideUrl]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export const checkDuplicatePairWithAi = async (incidentA, incidentB, overrideUrl = null) => {
  try {
    const baseUrl = overrideUrl || getAiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const formattedA = formatIncidentForAi(incidentA);
    const formattedB = formatIncidentForAi(incidentB);

    const response = await fetch(`${baseUrl}/api/v1/incidents/duplicate-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        incident_a: formattedA,
        incident_b: formattedB,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      return {
        success: false,
        error: `AI duplicate-check returned HTTP ${response.status}: ${errBody.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    if (Array.isArray(data.reasoning)) {
      data.reasoningList = data.reasoning;
      data.reasoning = data.reasoning.join('. ');
    }
    return { success: true, data };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    const message = isTimeout
      ? `AI duplicate-check timed out after ${DEFAULT_TIMEOUT_MS}ms`
      : `AI service unavailable: ${error.message}`;

    console.warn(`[AI Service Client] Fail-safe intercepted error: ${message}`);
    return { success: false, error: message };
  }
};

/**
 * Scans a target incident against a candidate pool of incidents to find duplicates and related events.
 * @param {Object} incident - Target incident to check
 * @param {Array<Object>} candidates - Pool of candidate incidents
 * @param {string|number} [minClassification='RELATED'] - Minimum match level ('DUPLICATE' | 'RELATED')
 * @param {string} [overrideUrl]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export const findDuplicatesWithAi = async (
  incident,
  candidates = [],
  minClassification = 'RELATED',
  overrideUrl = null
) => {
  try {
    if (!candidates || candidates.length === 0) {
      return {
        success: true,
        data: {
          incident_id: incident.incidentId || incident._id?.toString() || 'INC-TARGET',
          total_candidates: 0,
          total_matches: 0,
          duplicates: [],
          related: [],
          matches: [],
          has_duplicates: false,
          top_match: null,
        },
      };
    }

    const baseUrl = overrideUrl || getAiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const formattedTarget = formatIncidentForAi(incident);
    const formattedCandidates = candidates.map(formatIncidentForAi);

    const response = await fetch(`${baseUrl}/api/v1/incidents/find-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        target: formattedTarget,
        candidates: formattedCandidates,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      return {
        success: false,
        error: `AI find-duplicates returned HTTP ${response.status}: ${errBody.slice(0, 200)}`,
      };
    }

    const rawData = await response.json();
    const rawMatches = rawData.matches || [];

    const matches = rawMatches.map((m) => ({
      ...m,
      reasoning: Array.isArray(m.reasoning) ? m.reasoning.join('. ') : m.reasoning,
    }));

    const duplicates = matches.filter((m) => m.classification === 'DUPLICATE');
    const related = matches.filter((m) => m.classification === 'RELATED');
    const topMatch = matches.length > 0 ? matches[0] : null;

    return {
      success: true,
      data: {
        incident_id: rawData.target_id,
        total_candidates: rawData.total_candidates,
        total_matches: rawData.total_matches,
        matches,
        duplicates,
        related,
        has_duplicates: duplicates.length > 0,
        top_match: topMatch,
      },
    };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    const message = isTimeout
      ? `AI find-duplicates timed out after ${DEFAULT_TIMEOUT_MS}ms`
      : `AI service unavailable: ${error.message}`;

    console.warn(`[AI Service Client] Fail-safe intercepted error: ${message}`);
    return { success: false, error: message };
  }
};

/**
 * Clusters a batch of incidents using graph-connected components and multi-factor similarity.
 * @param {Array<Object>} incidents - Array of incident objects to cluster
 * @param {number} [clusterThreshold] - Threshold for connecting components
 * @param {string} [overrideUrl]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export const clusterIncidentsWithAi = async (
  incidents = [],
  clusterThreshold = null,
  overrideUrl = null
) => {
  try {
    if (!incidents || incidents.length === 0) {
      return {
        success: true,
        data: {
          total_incidents: 0,
          total_clusters: 0,
          cluster_count: 0,
          clusters: [],
          unclustered: [],
        },
      };
    }

    const baseUrl = overrideUrl || getAiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS * 2);

    const formattedIncidents = incidents.map(formatIncidentForAi);
    const bodyPayload = { incidents: formattedIncidents };
    if (typeof clusterThreshold === 'number') {
      bodyPayload.cluster_threshold = clusterThreshold;
    }

    const response = await fetch(`${baseUrl}/api/v1/incidents/cluster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      return {
        success: false,
        error: `AI cluster returned HTTP ${response.status}: ${errBody.slice(0, 200)}`,
      };
    }

    const rawData = await response.json();
    return {
      success: true,
      data: {
        total_incidents: rawData.total_incidents,
        total_clusters: rawData.total_clusters,
        cluster_count: rawData.total_clusters,
        clusters: rawData.clusters || [],
      },
    };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    const message = isTimeout
      ? `AI incident clustering timed out after ${DEFAULT_TIMEOUT_MS * 2}ms`
      : `AI service unavailable: ${error.message}`;

    console.warn(`[AI Service Client] Fail-safe intercepted error: ${message}`);
    return { success: false, error: message };
  }
};

/**
 * Canonical AI Pipeline Orchestration Client (Phase 1 & Phase 2)
 * Sends normalized incident payload with nearby candidates context to FastAPI pipeline,
 * executes automatic retries with exponential backoff, and validates response through
 * the mandatory 5-layer validation pipeline before returning to database service.
 *
 * @param {Object} incidentPayload - Target incident document or draft
 * @param {Array<Object>} [nearbyCandidates] - Pool of nearby/recent active incidents
 * @param {string} [overrideUrl] - Optional URL override

/**
 * Canonical AI Pipeline Orchestration Client (Phases 1, 2 & Phase 32)
 * Sends normalized incident payload with nearby candidates context to FastAPI pipeline,
 * executes automatic retries with exponential backoff, and validates response through
 * the mandatory 5-layer validation pipeline before returning to database service.
 *
 * @param {Object} incidentPayload - Target incident document or draft
 * @param {Array<Object>} [nearbyCandidates] - Pool of nearby/recent active incidents
 * @param {string} [overrideUrl] - Optional URL override
 * @returns {Promise<{ success: boolean, data?: any, error?: string, errorCode?: string, metadata?: any }>}
 */
export const analyzeIncidentPipeline = async (
  incidentPayload,
  nearbyCandidates = [],
  overrideUrl = null
) => {
  const baseUrl = overrideUrl || getAiBaseUrl();
  const timeoutMs = env.AI_TIMEOUT_MS || env.AI_TIMEOUT || DEFAULT_TIMEOUT_MS;
  const maxRetries = env.AI_MAX_RETRIES ?? env.AI_RETRY_COUNT ?? 2;
  const baseDelayMs = env.AI_RETRY_DELAY_MS || 200;

  const incidentId = incidentPayload.incidentId || incidentPayload._id?.toString() || 'INC-TEMP';
  const description = incidentPayload.description || incidentPayload.title || 'Emergency reported';

  let lat = null;
  let lng = null;
  let address = null;
  if (incidentPayload.location) {
    if (typeof incidentPayload.location.latitude === 'number') lat = incidentPayload.location.latitude;
    if (typeof incidentPayload.location.longitude === 'number') lng = incidentPayload.location.longitude;
    if (
      (lat === null || lng === null) &&
      Array.isArray(incidentPayload.location.coordinates) &&
      incidentPayload.location.coordinates.length >= 2
    ) {
      lng = lng ?? incidentPayload.location.coordinates[0];
      lat = lat ?? incidentPayload.location.coordinates[1];
    }
    if (
      (lat === null || lng === null) &&
      Array.isArray(incidentPayload.location.geometry?.coordinates) &&
      incidentPayload.location.geometry.coordinates.length >= 2
    ) {
      lng = lng ?? incidentPayload.location.geometry.coordinates[0];
      lat = lat ?? incidentPayload.location.geometry.coordinates[1];
    }
    address = incidentPayload.location.address || incidentPayload.location.name || null;
  }

  const formattedNearby = (nearbyCandidates || []).map((cand) => {
    let cLat = null;
    let cLng = null;
    if (cand.location) {
      cLat = cand.location.latitude ?? cand.location.geometry?.coordinates?.[1];
      cLng = cand.location.longitude ?? cand.location.geometry?.coordinates?.[0];
    }
    return {
      incidentId: cand.incidentId || cand._id?.toString(),
      description: cand.description || cand.title || 'Nearby incident',
      latitude: cLat,
      longitude: cLng,
      timestamp: cand.createdAt ? new Date(cand.createdAt).toISOString() : null,
      source: cand.source || 'EMERGENCY_CALL',
      type: cand.type || null,
    };
  });

  const requestBody = {
    incidentId: String(incidentId),
    description: String(description),
    title: incidentPayload.title || null,
    source: incidentPayload.source || 'CITIZEN',
    location: lat !== null && lng !== null ? { latitude: lat, longitude: lng, address } : null,
    timestamp: incidentPayload.createdAt
      ? new Date(incidentPayload.createdAt).toISOString()
      : new Date().toISOString(),
    context: {
      nearbyIncidents: formattedNearby,
      affectedPeople: incidentPayload.metadata?.affectedPeople || null,
    },
  };

  let lastError = null;
  let lastErrorCode = AI_ERROR_CODES.CONNECTION_FAILURE;
  const pipelineStartedAt = new Date();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStartedAt = Date.now();
    let response = null;

    // Exponential backoff between retries: delay = AI_RETRY_DELAY_MS * (2 ^ (attempt - 1))
    if (attempt > 0) {
      const backoffDelay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((res) => setTimeout(res, backoffDelay));
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      response = await fetch(`${baseUrl}/api/v1/analyze-incident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        const httpErr = new Error(`AI service returned HTTP ${response.status}: ${errText.slice(0, 200)}`);
        httpErr.status = response.status;
        throw httpErr;
      }

      const rawData = await response.json();

      // Mandatory 5-layer validation pipeline
      const validationResult = validateAndSanitizeAiResponse(rawData, incidentId);
      if (!validationResult.valid) {
        const valErr = new Error(validationResult.error);
        valErr.code = AI_ERROR_CODES.SCHEMA_VALIDATION_FAILURE;
        throw valErr;
      }

      const latencyMs = Date.now() - attemptStartedAt;
      return {
        success: true,
        data: validationResult.data,
        metadata: {
          attempt: attempt + 1,
          totalAttempts: attempt + 1,
          latencyMs,
          model: 'emergency-pipeline-v1',
          startedAt: pipelineStartedAt,
          completedAt: new Date(),
          fallbackUsed: false,
        },
      };
    } catch (err) {
      lastError = err;
      lastErrorCode = classifyAiError(err, response);
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout
        ? `AI pipeline request timed out after ${timeoutMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`
        : `AI pipeline error (attempt ${attempt + 1}/${maxRetries + 1}) [${lastErrorCode}]: ${err.message}`;
      console.warn(`[AI Service Client] ${msg}`);
    }
  }

  const totalLatencyMs = Date.now() - pipelineStartedAt.getTime();
  return {
    success: false,
    error: lastError?.message || 'AI pipeline invocation failed after retries',
    errorCode: lastErrorCode,
    metadata: {
      attempts: maxRetries + 1,
      totalAttempts: maxRetries + 1,
      latencyMs: totalLatencyMs,
      startedAt: pipelineStartedAt,
      completedAt: new Date(),
      fallbackUsed: true,
    },
  };
};

export default {
  checkAiHealth,
  classifyIncidentWithAi,
  checkDuplicatePairWithAi,
  findDuplicatesWithAi,
  clusterIncidentsWithAi,
  formatIncidentForAi,
  analyzeIncidentPipeline,
};

