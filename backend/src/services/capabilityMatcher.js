/**
 * Phase 7: Capability Matching System
 * Normalizes capability taxonomies, extracts required capabilities from incident context,
 * and matches resource capabilities against operational requirements.
 */

export const CANONICAL_CAPABILITIES = {
  FIRE_SUPPRESSION: 'FIRE_SUPPRESSION',
  MEDICAL_RESPONSE: 'MEDICAL_RESPONSE',
  HAZMAT: 'HAZMAT',
  WATER_RESCUE: 'WATER_RESCUE',
  SEARCH_RESCUE: 'SEARCH_RESCUE',
  POLICE_SUPPORT: 'POLICE_SUPPORT',
  EVACUATION_SUPPORT: 'EVACUATION_SUPPORT',
  TRAFFIC_CONTROL: 'TRAFFIC_CONTROL',
  AIR_SUPPORT: 'AIR_SUPPORT',
  LOGISTICS_SUPPORT: 'LOGISTICS_SUPPORT',
};

// Aliases and synonym mapping for fuzzy/real-world capability inputs
const CAPABILITY_ALIASES = {
  // Fire
  FIRE_FIGHTING: CANONICAL_CAPABILITIES.FIRE_SUPPRESSION,
  FIREFIGHTING: CANONICAL_CAPABILITIES.FIRE_SUPPRESSION,
  FIRE_EXTINGUISHMENT: CANONICAL_CAPABILITIES.FIRE_SUPPRESSION,
  FOAM_SUPPRESSION: CANONICAL_CAPABILITIES.FIRE_SUPPRESSION,
  WILDLAND_FIRE: CANONICAL_CAPABILITIES.FIRE_SUPPRESSION,

  // Medical
  PARAMEDIC: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  EMT: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  ADVANCED_LIFE_SUPPORT: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  BASIC_LIFE_SUPPORT: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  TRIAGE: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  FIRST_AID: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  AMBULANCE_TRANSPORT: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  ICU_CARE: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,
  BURNS_TREATMENT: CANONICAL_CAPABILITIES.MEDICAL_RESPONSE,

  // Hazmat
  HAZARDOUS_MATERIALS: CANONICAL_CAPABILITIES.HAZMAT,
  CHEMICAL_CONTAINMENT: CANONICAL_CAPABILITIES.HAZMAT,
  GAS_LEAK_CONTROL: CANONICAL_CAPABILITIES.HAZMAT,
  DECONTAMINATION: CANONICAL_CAPABILITIES.HAZMAT,
  RADIATION_MONITORING: CANONICAL_CAPABILITIES.HAZMAT,
  BIOHAZARD: CANONICAL_CAPABILITIES.HAZMAT,

  // Water Rescue
  FLOOD_RESCUE: CANONICAL_CAPABILITIES.WATER_RESCUE,
  SWIFT_WATER: CANONICAL_CAPABILITIES.WATER_RESCUE,
  BOAT_RESCUE: CANONICAL_CAPABILITIES.WATER_RESCUE,
  DIVING_RESCUE: CANONICAL_CAPABILITIES.WATER_RESCUE,

  // Search and Rescue
  USAR: CANONICAL_CAPABILITIES.SEARCH_RESCUE,
  STRUCTURAL_COLLAPSE: CANONICAL_CAPABILITIES.SEARCH_RESCUE,
  HIGH_ANGLE_ROPES: CANONICAL_CAPABILITIES.SEARCH_RESCUE,
  CANINE_SEARCH: CANONICAL_CAPABILITIES.SEARCH_RESCUE,
  EXTRICATION: CANONICAL_CAPABILITIES.SEARCH_RESCUE,
  HEAVY_LIFTING: CANONICAL_CAPABILITIES.SEARCH_RESCUE,

  // Police & Security
  LAW_ENFORCEMENT: CANONICAL_CAPABILITIES.POLICE_SUPPORT,
  CROWD_CONTROL: CANONICAL_CAPABILITIES.POLICE_SUPPORT,
  PERIMETER_SECURITY: CANONICAL_CAPABILITIES.POLICE_SUPPORT,
  INVESTIGATION: CANONICAL_CAPABILITIES.POLICE_SUPPORT,

  // Evacuation & Shelter
  EVACUATION: CANONICAL_CAPABILITIES.EVACUATION_SUPPORT,
  SHELTER_COORDINATION: CANONICAL_CAPABILITIES.EVACUATION_SUPPORT,
  POPULATION_RELOCATION: CANONICAL_CAPABILITIES.EVACUATION_SUPPORT,

  // Air & Tech
  DRONE_SURVEILLANCE: CANONICAL_CAPABILITIES.AIR_SUPPORT,
  AERIAL_RECON: CANONICAL_CAPABILITIES.AIR_SUPPORT,
  HELICOPTER_AIRLIFT: CANONICAL_CAPABILITIES.AIR_SUPPORT,
  THERMAL_IMAGING: CANONICAL_CAPABILITIES.AIR_SUPPORT,
};

/**
 * Normalizes a capability string to canonical uppercase snake_case.
 * @param {string} capability
 * @returns {string} Normalized capability token
 */
export const normalizeCapability = (capability) => {
  if (!capability || typeof capability !== 'string') return '';
  const clean = capability
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (CANONICAL_CAPABILITIES[clean]) {
    return CANONICAL_CAPABILITIES[clean];
  }

  if (CAPABILITY_ALIASES[clean]) {
    return CAPABILITY_ALIASES[clean];
  }

  return clean;
};

/**
 * Normalizes an array of capabilities.
 * @param {Array<string>} capabilities
 * @returns {Array<string>}
 */
export const normalizeCapabilities = (capabilities = []) => {
  if (!Array.isArray(capabilities)) return [];
  const set = new Set();
  for (const cap of capabilities) {
    const normalized = normalizeCapability(cap);
    if (normalized) set.add(normalized);
  }
  return Array.from(set);
};

/**
 * Extracts required and preferred capabilities from an incident document or payload.
 * Leverages incident type, severity, priority, AI hazard analysis, and signals.
 * @param {Object} incident
 * @returns {{ required: string[], preferred: string[], explanation: string }}
 */
export const extractIncidentRequirements = (incident) => {
  const required = new Set();
  const preferred = new Set();
  const reasons = [];

  const type = incident.type || incident.aiAnalysis?.incidentType || 'OTHER';
  const severity = incident.severity || incident.aiAnalysis?.severity || 'MEDIUM';
  const priority = incident.priority || incident.aiAnalysis?.priority || 'P3';
  const aiAnalysis = incident.aiAnalysis || {};
  const signals = Array.isArray(aiAnalysis.signals) ? aiAnalysis.signals.map((s) => s.toLowerCase()) : [];
  const primaryHazard = (aiAnalysis.primaryHazard || '').toLowerCase();

  // 1. Base requirements by Incident Type
  switch (type) {
    case 'FIRE':
      required.add(CANONICAL_CAPABILITIES.FIRE_SUPPRESSION);
      preferred.add(CANONICAL_CAPABILITIES.SEARCH_RESCUE);
      preferred.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
      reasons.push('Fire incident mandates fire suppression capabilities');
      break;

    case 'MEDICAL_EMERGENCY':
      required.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
      reasons.push('Medical emergency mandates certified medical response capability');
      break;

    case 'ROAD_ACCIDENT':
      required.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
      preferred.add(CANONICAL_CAPABILITIES.SEARCH_RESCUE);
      preferred.add(CANONICAL_CAPABILITIES.TRAFFIC_CONTROL);
      reasons.push('Road accident mandates medical care and extrication/traffic management');
      break;

    case 'FLOOD':
      required.add(CANONICAL_CAPABILITIES.WATER_RESCUE);
      preferred.add(CANONICAL_CAPABILITIES.EVACUATION_SUPPORT);
      preferred.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
      reasons.push('Flood emergency mandates water rescue and evacuation capabilities');
      break;

    case 'EARTHQUAKE':
      required.add(CANONICAL_CAPABILITIES.SEARCH_RESCUE);
      required.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
      preferred.add(CANONICAL_CAPABILITIES.EVACUATION_SUPPORT);
      reasons.push('Earthquake mandates structural search & rescue and mass medical response');
      break;

    case 'INDUSTRIAL_ACCIDENT':
      required.add(CANONICAL_CAPABILITIES.HAZMAT);
      preferred.add(CANONICAL_CAPABILITIES.FIRE_SUPPRESSION);
      preferred.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
      reasons.push('Industrial incident requires specialized hazmat containment');
      break;

    default:
      preferred.add(CANONICAL_CAPABILITIES.LOGISTICS_SUPPORT);
      break;
  }

  // 2. Adjustments based on AI Signals and Primary Hazard
  if (primaryHazard.includes('chemical') || primaryHazard.includes('toxic') || primaryHazard.includes('gas') ||
      signals.some((s) => s.includes('chemical') || s.includes('toxic') || s.includes('gas') || s.includes('ammonia') || s.includes('hazmat'))) {
    required.add(CANONICAL_CAPABILITIES.HAZMAT);
    reasons.push('AI detected hazardous materials or chemical dispersion signals');
  }

  if (signals.some((s) => s.includes('trapped') || s.includes('collapse') || s.includes('rubble'))) {
    required.add(CANONICAL_CAPABILITIES.SEARCH_RESCUE);
    reasons.push('AI signals indicate victims trapped requiring search and rescue');
  }

  if (signals.some((s) => s.includes('fire') || s.includes('flame') || s.includes('smoke') || s.includes('explosion'))) {
    required.add(CANONICAL_CAPABILITIES.FIRE_SUPPRESSION);
  }

  // 3. Severity & Priority Escalations
  if (severity === 'CRITICAL' || priority === 'P1') {
    required.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
    preferred.add(CANONICAL_CAPABILITIES.AIR_SUPPORT);
    preferred.add(CANONICAL_CAPABILITIES.EVACUATION_SUPPORT);
    reasons.push('Critical severity / P1 priority escalates medical, air, and evacuation support');
  } else if (severity === 'HIGH' || priority === 'P2') {
    preferred.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
  }

  // 4. Incorporate AI Recommended Resource Types if present
  if (Array.isArray(aiAnalysis.recommendedResourceTypes)) {
    for (const resType of aiAnalysis.recommendedResourceTypes) {
      const upper = String(resType).toUpperCase();
      if (upper.includes('FIRE')) required.add(CANONICAL_CAPABILITIES.FIRE_SUPPRESSION);
      if (upper.includes('AMBULANCE') || upper.includes('MEDICAL')) required.add(CANONICAL_CAPABILITIES.MEDICAL_RESPONSE);
      if (upper.includes('POLICE')) preferred.add(CANONICAL_CAPABILITIES.POLICE_SUPPORT);
      if (upper.includes('HAZMAT')) required.add(CANONICAL_CAPABILITIES.HAZMAT);
    }
  }

  // Prevent overlap: remove items in required from preferred
  for (const req of required) {
    preferred.delete(req);
  }

  return {
    required: Array.from(required),
    preferred: Array.from(preferred),
    explanation: reasons.join('; '),
  };
};

/**
 * Evaluates capability compatibility of a resource against requirements.
 * @param {Array<string>} resourceCapabilities - Raw or normalized resource capabilities
 * @param {Array<string>} requiredCapabilities - Normalized required capabilities
 * @param {Array<string>} [preferredCapabilities=[]] - Normalized preferred capabilities
 * @returns {{
 *   capabilityMatch: number,
 *   isCompatible: boolean,
 *   matchedRequired: string[],
 *   missingRequired: string[],
 *   matchedPreferred: string[],
 *   allMatched: string[],
 *   reason: string
 * }}
 */
export const matchCapabilities = (
  resourceCapabilities = [],
  requiredCapabilities = [],
  preferredCapabilities = []
) => {
  const normalizedResourceCaps = new Set(normalizeCapabilities(resourceCapabilities));
  const normRequired = normalizeCapabilities(requiredCapabilities);
  const normPreferred = normalizeCapabilities(preferredCapabilities);

  const matchedRequired = [];
  const missingRequired = [];
  const matchedPreferred = [];

  for (const req of normRequired) {
    if (normalizedResourceCaps.has(req)) {
      matchedRequired.push(req);
    } else {
      missingRequired.push(req);
    }
  }

  for (const pref of normPreferred) {
    if (normalizedResourceCaps.has(pref)) {
      matchedPreferred.push(pref);
    }
  }

  // Calculate Match Score: 0.0 to 1.0
  let capabilityMatch = 0;
  if (normRequired.length === 0) {
    capabilityMatch = normPreferred.length > 0 ? matchedPreferred.length / normPreferred.length : 1.0;
  } else {
    const requiredScore = matchedRequired.length / normRequired.length;
    const preferredScore = normPreferred.length > 0 ? matchedPreferred.length / normPreferred.length : 0;
    // 85% weight to required capabilities, 15% to preferred bonus
    capabilityMatch = Math.min(1.0, requiredScore * 0.85 + preferredScore * 0.15);
  }

  // Compatibility Rule:
  // If required capabilities exist, the resource must match at least ONE required capability to be considered compatible.
  const isCompatible = normRequired.length === 0 || matchedRequired.length > 0;

  // Build human-readable explanation
  let reason = '';
  if (!isCompatible) {
    reason = `Incompatible: Missing all required capabilities (${normRequired.join(', ')})`;
  } else if (missingRequired.length === 0 && normRequired.length > 0) {
    reason = `Full match: Covers all required capabilities (${matchedRequired.join(', ')})`;
  } else if (matchedRequired.length > 0) {
    reason = `Partial match: Covers ${matchedRequired.join(', ')}. Missing: ${missingRequired.join(', ')}`;
  } else {
    reason = 'Generic support resource with complementary capabilities';
  }

  return {
    capabilityMatch: Math.round(capabilityMatch * 100) / 100,
    isCompatible,
    matchedRequired,
    missingRequired,
    matchedPreferred,
    allMatched: [...matchedRequired, ...matchedPreferred],
    reason,
  };
};

export default {
  CANONICAL_CAPABILITIES,
  normalizeCapability,
  normalizeCapabilities,
  extractIncidentRequirements,
  matchCapabilities,
};
