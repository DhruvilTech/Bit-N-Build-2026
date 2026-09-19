/**
 * AI Service Integration Client for PS-9 Backend
 * Communicates with the external Python / FastAPI AI Microservice.
 * Fully fail-safe with strict timeouts and error encapsulation.
 */

import { env } from '../config/env.js';

const getAiBaseUrl = () => env.AI_SERVICE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Checks if the external Python AI service is healthy and reachable.
 * @param {string} [overrideUrl]
 * @returns {Promise<{ isHealthy: boolean, details?: any, error?: string }>}
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
      return { isHealthy: false, error: `Health check failed with status ${response.status}` };
    }

    const data = await response.json();
    return { isHealthy: data.status === 'healthy', details: data };
  } catch (error) {
    return {
      isHealthy: false,
      error: error.name === 'AbortError' ? 'Health check timed out' : error.message,
    };
  }
};

/**
 * Classifies an incident report by calling the Python FastAPI classification service.
 * @param {Object} incidentPayload
 * @param {string} incidentPayload.title
 * @param {string} incidentPayload.description
 * @param {string} [incidentPayload.type]
 * @param {string} [incidentPayload.source]
 * @param {Object} [incidentPayload.location]
 * @param {Object} [incidentPayload.metadata]
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

export default {
  checkAiHealth,
  classifyIncidentWithAi,
};
