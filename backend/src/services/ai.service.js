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

const getAiBaseUrl = () => env.AI_SERVICE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 8000;

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
 * @param {string} [minClassification='RELATED'] - Minimum match level ('DUPLICATE' | 'RELATED')
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
          duplicates: [],
          related: [],
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
        incident: formattedTarget,
        candidates: formattedCandidates,
        min_classification: minClassification,
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

    const data = await response.json();
    return { success: true, data };
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
 * @param {string} [clusterThreshold='RELATED'] - Threshold for connecting components ('DUPLICATE' | 'RELATED')
 * @param {string} [overrideUrl]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export const clusterIncidentsWithAi = async (
  incidents = [],
  clusterThreshold = 'RELATED',
  overrideUrl = null
) => {
  try {
    if (!incidents || incidents.length === 0) {
      return {
        success: true,
        data: {
          total_incidents: 0,
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

    const response = await fetch(`${baseUrl}/api/v1/incidents/cluster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        incidents: formattedIncidents,
        cluster_threshold: clusterThreshold,
      }),
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

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    const message = isTimeout
      ? `AI incident clustering timed out after ${DEFAULT_TIMEOUT_MS * 2}ms`
      : `AI service unavailable: ${error.message}`;

    console.warn(`[AI Service Client] Fail-safe intercepted error: ${message}`);
    return { success: false, error: message };
  }
};

export default {
  checkAiHealth,
  classifyIncidentWithAi,
  checkDuplicatePairWithAi,
  findDuplicatesWithAi,
  clusterIncidentsWithAi,
  formatIncidentForAi,
};
