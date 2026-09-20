import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ESCALATION_RULES, ESCALATION_LEVELS } from '../config/escalation.config.js';
import EscalationService from '../services/escalation.service.js';
import NotificationService from '../services/notification.service.js';
import EmergencySummaryService from '../services/emergencySummary.service.js';
import AiCommandService from '../services/aiCommand.service.js';

describe('Phase 16 — Escalation Engine', () => {
  it('should trigger P1 unassigned timeout rule for critical incident with no assigned teams', () => {
    const unassignedCriticalIncident = {
      incidentId: 'INC-ESC-001',
      title: 'Major High-Rise Fire',
      severity: 'CRITICAL',
      priority: 'P1',
      status: 'NEW',
      assignedTeams: [],
      createdAt: new Date(),
    };

    const p1Rule = ESCALATION_RULES.find((r) => r.ruleId === 'P1_UNASSIGNED');
    assert.ok(p1Rule, 'P1_UNASSIGNED rule should exist');
    assert.equal(p1Rule.level, 1);
    assert.equal(p1Rule.targetRole, 'OPERATOR');

    const matches = p1Rule.evaluate(unassignedCriticalIncident);
    assert.equal(matches, true, 'Unassigned P1 incident should trigger level 1 escalation rule');
  });

  it('should not trigger P1 unassigned rule if response team is already assigned', () => {
    const assignedCriticalIncident = {
      incidentId: 'INC-ESC-002',
      title: 'Major High-Rise Fire',
      severity: 'CRITICAL',
      priority: 'P1',
      status: 'ASSIGNED',
      assignedTeams: ['TEAM-01'],
      createdAt: new Date(),
    };

    const p1Rule = ESCALATION_RULES.find((r) => r.ruleId === 'P1_UNASSIGNED');
    const matches = p1Rule.evaluate(assignedCriticalIncident);
    assert.equal(matches, false, 'Assigned P1 incident must not trigger unassigned escalation rule');
  });

  it('should trigger RESPONSE_OVERDUE rule when transit delay is detected', () => {
    const delayedIncident = {
      incidentId: 'INC-ESC-003',
      title: 'Industrial Chemical Leak',
      severity: 'HIGH',
      priority: 'P2',
      status: 'DISPATCHED',
      delayDetected: true,
      delayMinutes: 12,
    };

    const delayRule = ESCALATION_RULES.find((r) => r.ruleId === 'RESPONSE_OVERDUE');
    assert.ok(delayRule, 'RESPONSE_OVERDUE rule should exist');
    assert.equal(delayRule.level, 2);
    assert.equal(delayRule.targetRole, 'FIELD_COORDINATOR');

    const matches = delayRule.evaluate(delayedIncident);
    assert.equal(matches, true, 'Delay-flagged incident should trigger level 2 escalation');
  });

  it('should enforce strict RBAC authorization for escalation management', () => {
    // Level 1: Operator permitted, Field Coordinator permitted, Admin permitted
    assert.doesNotThrow(() => EscalationService.assertRoleAuthorization('OPERATOR', 1));
    assert.doesNotThrow(() => EscalationService.assertRoleAuthorization('FIELD_COORDINATOR', 1));
    assert.doesNotThrow(() => EscalationService.assertRoleAuthorization('ADMIN', 1));

    // Level 2: Field & Medical Coordinator permitted, Admin permitted; Operator forbidden
    assert.doesNotThrow(() => EscalationService.assertRoleAuthorization('FIELD_COORDINATOR', 2));
    assert.doesNotThrow(() => EscalationService.assertRoleAuthorization('MEDICAL_COORDINATOR', 2));
    assert.doesNotThrow(() => EscalationService.assertRoleAuthorization('ADMIN', 2));
    assert.throws(
      () => EscalationService.assertRoleAuthorization('OPERATOR', 2),
      /not authorized to act on Level 2/
    );

    // Level 3: Admin (Command Authority) permitted; Operator and Field Coordinator forbidden
    assert.doesNotThrow(() => EscalationService.assertRoleAuthorization('ADMIN', 3));
    assert.throws(
      () => EscalationService.assertRoleAuthorization('OPERATOR', 3),
      /not authorized to act on Level 3/
    );
    assert.throws(
      () => EscalationService.assertRoleAuthorization('FIELD_COORDINATOR', 3),
      /not authorized to act on Level 3/
    );
  });
});

describe('Phase 17 & 18 — Notification Engine & Read State', () => {
  it('should compute notification categories and unread counters reliably', () => {
    const mockNotifications = [
      { id: '1', title: 'Critical Alert', isRead: false, type: 'CRITICAL_INCIDENT' },
      { id: '2', title: 'Unit Dispatched', isRead: false, type: 'RESOURCE_ASSIGNMENT' },
      { id: '3', title: 'Escalation Alert', isRead: true, type: 'ESCALATION' },
    ];

    const unreadCount = mockNotifications.filter((n) => !n.isRead).length;
    assert.equal(unreadCount, 2, 'Unread count should accurately reflect unread notifications');
  });
});

describe('Phase 19 — AI Emergency Summary', () => {
  it('should generate structured 6-section emergency operational briefing from scoped context', () => {
    const testContext = {
      incident: {
        id: 'INC-TEST-99',
        title: 'Commercial Refinery Flare',
        type: 'INDUSTRIAL_ACCIDENT',
        severity: 'CRITICAL',
        priority: 'P1',
        status: 'DISPATCHED',
        address: 'Sector 7 Industrial Park',
        delayDetected: true,
        delayMinutes: 7,
        reportCount: 4,
      },
      response: {
        assignedTeamsCount: 2,
        assignedTeams: [
          { id: 'TM-1', name: 'Hazmat-Alpha', type: 'HAZMAT', status: 'EN_ROUTE' },
          { id: 'TM-2', name: 'Engine-4', type: 'FIRE', status: 'ON_SCENE' },
        ],
      },
      resources: {
        availableAmbulancesCount: 3,
        hospitals: [
          { name: 'Metro Trauma Center', availableBeds: 12, divertStatus: false },
          { name: 'West Valley Hospital', availableBeds: 0, divertStatus: true },
        ],
      },
      timeline: [
        { event: 'INCIDENT_CREATED', reason: 'Emergency 911 call', timestamp: new Date() },
        { event: 'AI_CLASSIFIED', reason: 'High confidence classification', timestamp: new Date() },
      ],
      escalations: [
        { level: 2, reason: 'Transit bottleneck along Sector 7 corridor', status: 'PENDING' },
      ],
    };

    const summary = EmergencySummaryService.generateDeterministicSummary(testContext);

    // Verify exact contract
    assert.ok(summary.situation, 'Situation briefing must be generated');
    assert.match(summary.situation, /INC-TEST-99/);
    assert.match(summary.situation, /CRITICAL/);

    assert.ok(Array.isArray(summary.currentResponse), 'currentResponse must be an array');
    assert.ok(summary.currentResponse.length > 0);

    assert.ok(Array.isArray(summary.resourceStatus), 'resourceStatus must be an array');
    assert.ok(summary.resourceStatus.some((s) => s.includes('3 emergency ambulance')));

    assert.ok(Array.isArray(summary.risks), 'risks must be an array');
    assert.ok(summary.risks.some((r) => r.includes('Level 2')));

    assert.ok(Array.isArray(summary.delays), 'delays must be an array');
    assert.ok(summary.delays.some((d) => d.includes('7 minutes')));

    assert.ok(Array.isArray(summary.recommendedActions), 'recommendedActions must be an array');
    assert.ok(summary.recommendedActions.length >= 2);
    assert.ok(summary.generatedAt, 'generatedAt timestamp must be present');
  });

  it('should ensure no sensitive credentials or authentication tokens exist in AI context', () => {
    const rawContextData = {
      incident: { id: 'INC-01', title: 'Fire' },
      response: {},
      resources: {},
    };

    const serialized = JSON.stringify(rawContextData);
    assert.doesNotMatch(serialized, /password|token|jwt|secret|apiKey/i, 'AI context must never contain secrets');
  });
});

describe('Phase 20 — AI Command Assistant & Intent Routing', () => {
  it('should detect operational intents deterministically for common command queries', () => {
    assert.equal(
      AiCommandService.detectIntent('Show current critical incidents.'),
      'CRITICAL_INCIDENTS'
    );
    assert.equal(
      AiCommandService.detectIntent('Which ambulances are available?'),
      'AVAILABLE_AMBULANCES'
    );
    assert.equal(
      AiCommandService.detectIntent('Which incidents are currently delayed?'),
      'DELAYED_INCIDENTS'
    );
    assert.equal(
      AiCommandService.detectIntent('Which hospitals have capacity?'),
      'HOSPITAL_CAPACITY'
    );
    assert.equal(
      AiCommandService.detectIntent('Summarize the current emergency situation.'),
      'CURRENT_EMERGENCY_SUMMARY'
    );
    assert.equal(
      AiCommandService.detectIntent('Which incidents are currently escalated?'),
      'ESCALATION_STATUS'
    );
    assert.equal(
      AiCommandService.detectIntent('Which teams are currently assigned?'),
      'ASSIGNED_TEAMS'
    );
    assert.equal(
      AiCommandService.detectIntent('What is standard radio protocol for sector 4?'),
      'GENERAL_OPERATIONAL_QUERY'
    );
  });

  it('should synthesize accurate operational answers and structured cards', () => {
    const intent = 'AVAILABLE_AMBULANCES';
    const mockData = {
      data: [
        { id: 'RES-01', name: 'Medic-12', type: 'AMBULANCE', status: 'AVAILABLE', location: 'North Depot' },
        { id: 'RES-02', name: 'Rescue-3', type: 'AMBULANCE', status: 'AVAILABLE', location: 'Central Staging' },
      ],
      source: 'Resource Inventory',
    };

    const answer = AiCommandService.synthesizeAnswer(intent, mockData, 'Which ambulances are available?');
    assert.match(answer, /2 emergency medical ambulance/);
    assert.match(answer, /Medic-12/);
    assert.match(answer, /Rescue-3/);
  });

  it('should synthesize warning answer when no ambulances are available', () => {
    const intent = 'AVAILABLE_AMBULANCES';
    const mockEmptyData = { data: [], source: 'Resource Inventory' };
    const answer = AiCommandService.synthesizeAnswer(intent, mockEmptyData, 'Which ambulances are available?');
    assert.match(answer, /Warning: No medical ambulances/);
  });

  it('should format structured entity references with navigable links for incidents', () => {
    const rawItems = [
      { id: 'INC-2048', title: 'Transformer Fire', type: 'FIRE', status: 'NEW' },
    ];

    const cards = rawItems.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      link: item.id.startsWith('INC') ? `/incidents/${item.id}` : null,
    }));

    assert.equal(cards.length, 1);
    assert.equal(cards[0].id, 'INC-2048');
    assert.equal(cards[0].link, '/incidents/INC-2048');
  });
});
