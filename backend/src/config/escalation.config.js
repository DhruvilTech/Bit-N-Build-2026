/**
 * Configurable Escalation Engine Rules & Thresholds
 * Mapped to EmergenX RBAC roles:
 * - Level 1 (OPERATOR): Initial response timeout (3 mins)
 * - Level 2 (FIELD_COORDINATOR / MEDICAL_COORDINATOR): Overdue response or resource shortage (5 mins)
 * - Level 3 (ADMIN / Command Authority): Critical unresolved or multi-system bottleneck (10 mins)
 */

export const ESCALATION_LEVELS = {
  1: {
    level: 1,
    name: 'LEVEL 1 - Operational Triage',
    targetRole: 'OPERATOR',
    timeoutMinutes: 3,
    description: 'Initial response team assignment or prompt operator triage required',
  },
  2: {
    level: 2,
    name: 'LEVEL 2 - Field/Medical Tactical Coordination',
    targetRole: 'FIELD_COORDINATOR',
    timeoutMinutes: 5,
    description: 'Field supervisor or medical lead intervention due to transit delay or resource shortage',
  },
  3: {
    level: 3,
    name: 'LEVEL 3 - Command Authority',
    targetRole: 'ADMIN',
    timeoutMinutes: 10,
    description: 'Executive command intervention for critical unresolved emergencies',
  },
};

export const ESCALATION_RULES = [
  {
    ruleId: 'P1_UNASSIGNED',
    name: 'P1 Incident Unassigned Timeout',
    level: 1,
    targetRole: 'OPERATOR',
    timeoutMinutes: 3,
    evaluate: (incident) => {
      // P1 Priority or CRITICAL severity without assigned response units
      const isCriticalOrP1 = incident.priority === 'P1' || incident.severity === 'CRITICAL';
      const hasNoTeams = !incident.assignedTeams || incident.assignedTeams.length === 0;
      const isNotResolved = !['RESOLVED', 'CANCELLED'].includes(incident.status);
      return isCriticalOrP1 && hasNoTeams && isNotResolved;
    },
    reason: 'Critical P1 incident has no response team assigned within 3-minute SLA window',
  },
  {
    ruleId: 'RESPONSE_OVERDUE',
    name: 'Response Overdue (Transit Delay)',
    level: 2,
    targetRole: 'FIELD_COORDINATOR',
    timeoutMinutes: 5,
    evaluate: (incident) => {
      const isNotResolved = !['RESOLVED', 'CANCELLED'].includes(incident.status);
      const isDelayed = Boolean(incident.delayDetected);
      return isNotResolved && isDelayed;
    },
    reason: 'Assigned emergency unit transit delay detected exceeding SLA benchmark',
  },
  {
    ruleId: 'CRITICAL_UNRESOLVED',
    name: 'Critical Incident Unresolved',
    level: 3,
    targetRole: 'ADMIN',
    timeoutMinutes: 10,
    evaluate: (incident) => {
      const isCritical = incident.severity === 'CRITICAL';
      const isUnresolved = !['RESOLVED', 'CANCELLED'].includes(incident.status);
      const createdAt = new Date(incident.createdAt).getTime();
      const elapsedMinutes = (Date.now() - createdAt) / (1000 * 60);
      return isCritical && isUnresolved && elapsedMinutes >= 10;
    },
    reason: 'CRITICAL emergency hazard remains unresolved after extended operational window (10+ min)',
  },
  {
    ruleId: 'RESOURCE_SHORTAGE',
    name: 'Critical Resource Shortage Detected',
    level: 2,
    targetRole: 'MEDICAL_COORDINATOR',
    timeoutMinutes: 5,
    evaluate: (incident, context) => {
      const isNotResolved = !['RESOLVED', 'CANCELLED'].includes(incident.status);
      const shortageReported = context?.resourceShortage === true;
      return isNotResolved && shortageReported;
    },
    reason: 'Resource or hospital bed capacity shortfall detected for active casualty event',
  },
];
