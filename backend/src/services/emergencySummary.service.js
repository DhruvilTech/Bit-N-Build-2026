import { IncidentModel } from '../models/incident.model.js';
import { ResponseTeamModel } from '../models/team.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { FacilityModel } from '../models/facility.model.js';
import Escalation from '../models/escalation.model.js';
import { env } from '../config/env.js';
import { emitAiSummaryGenerated } from '../utils/socket.js';
import { recordAuditLog } from './auditLog.service.js';
import { MistralService } from './mistral.service.js';

export class EmergencySummaryService {
  /**
   * Scoped context aggregation: extracts minimal, sanitized operational data for an incident
   */
  static async buildAIContext(incidentId) {
    // 1. Incident details (filtered fields, no PII/secrets)
    const incident = await IncidentModel.findOne({
      $or: [{ incidentId }, { _id: incidentId.match(/^[0-9a-fA-F]{24}$/) ? incidentId : null }],
    })
      .select('incidentId title description type severity priority status location reports timeline delayDetected delayMinutes createdAt')
      .lean();

    if (!incident) return null;

    const id = incident.incidentId || String(incident._id);

    // 2. Response teams assigned
    const assignedTeams = await ResponseTeamModel.find({ currentAssignment: id })
      .select('teamId name type status capabilities location.address')
      .lean();

    // 3. District resources & medical capacity
    const [availableAmbulances, hospitalFacilities] = await Promise.all([
      ResourceModel.find({ type: { $in: ['AMBULANCE', 'VEHICLE'] }, status: 'AVAILABLE' })
        .select('resourceId name type status')
        .limit(5)
        .lean(),
      FacilityModel.find({ type: 'HOSPITAL' })
        .select('facilityId name availableBeds totalBeds divertStatus traumaLevel')
        .limit(5)
        .lean(),
    ]);

    // 4. Active escalations
    const activeEscalations = await Escalation.find({
      incidentId: id,
      status: { $in: ['PENDING', 'ACKNOWLEDGED'] },
    })
      .select('escalationId level reason status targetRole triggeredAt')
      .lean();

    // 5. Recent timeline items (last 5)
    const recentTimeline = (incident.timeline || [])
      .slice(-5)
      .map((t) => ({ event: t.event, reason: t.reason, timestamp: t.timestamp }));

    return {
      incident: {
        id,
        title: incident.title,
        type: incident.type,
        severity: incident.severity,
        priority: incident.priority,
        status: incident.status,
        address: incident.location?.address || 'Unknown zone',
        delayDetected: Boolean(incident.delayDetected),
        delayMinutes: incident.delayMinutes || 0,
        reportCount: (incident.reports || []).length,
      },
      response: {
        assignedTeamsCount: assignedTeams.length,
        assignedTeams: assignedTeams.map((t) => ({
          id: t.teamId,
          name: t.name,
          type: t.type,
          status: t.status,
        })),
      },
      resources: {
        availableAmbulancesCount: availableAmbulances.length,
        hospitals: hospitalFacilities.map((h) => ({
          name: h.name,
          availableBeds: h.availableBeds,
          divertStatus: h.divertStatus,
        })),
      },
      timeline: recentTimeline,
      escalations: activeEscalations,
    };
  }

  /**
   * Deterministic fallback summary generator when Python LLM service is offline
   */
  static generateDeterministicSummary(context) {
    const inc = context.incident;
    const resp = context.response;
    const res = context.resources;
    const esc = context.escalations || [];

    const situation = `Incident #${inc.id} (${inc.title}) is currently in ${inc.status} state, rated ${inc.severity} severity with ${inc.priority} priority dispatch at ${inc.address}. Verified across ${inc.reportCount || 1} independent source report(s).`;

    const currentResponse = [
      resp.assignedTeamsCount > 0
        ? `${resp.assignedTeamsCount} field unit(s) deployed: ${resp.assignedTeams.map((t) => `${t.name} [${t.status}]`).join(', ')}.`
        : 'No emergency response teams have been dispatched yet. Immediate assignment required.',
      inc.delayDetected
        ? `Transit delay flagged (+${inc.delayMinutes} min exceeding benchmark).`
        : 'Field transit within expected SLA window.',
    ];

    const resourceStatus = [
      `${res.availableAmbulancesCount} emergency ambulance/medical vehicle(s) on standby.`,
      `Trauma facility status: ${res.hospitals.map((h) => `${h.name} (${h.availableBeds} beds available, divert: ${h.divertStatus ? 'YES' : 'NO'})`).join('; ') || 'Trauma units on standby.'}`,
    ];

    const risks = [
      inc.severity === 'CRITICAL'
        ? 'High structural / casualty risk requiring rapid containment and mutual-aid coordination.'
        : 'Standard hazard mitigation protocols apply.',
      esc.length > 0
        ? `Active escalation alert: Level ${esc[0].level} (${esc[0].reason}).`
        : 'No active command escalations.',
    ];

    const delays = inc.delayDetected
      ? [`Unit arrival delayed by ${inc.delayMinutes} minutes due to traffic/route impediment.`]
      : ['No operational transit delays detected.'];

    const recommendedActions = [
      resp.assignedTeamsCount === 0
        ? 'Dispatch primary response team immediately.'
        : 'Maintain continuous radio telemetry and coordinate staging.',
      res.hospitals.some((h) => h.divertStatus)
        ? 'Reroute incoming medical transports away from saturated facilities.'
        : 'Designate primary trauma center for potential casualties.',
      esc.length > 0
        ? `Acknowledge and clear active Level ${esc[0].level} escalation.`
        : 'Monitor perimeter and log operational updates.',
    ];

    return {
      situation,
      currentResponse,
      resourceStatus,
      risks,
      delays,
      recommendedActions,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate an emergency summary using AI microservice with fail-safe fallback
   */
  static async generateSummary(incidentId, user = null) {
    const context = await this.buildAIContext(incidentId);

    if (!context) {
      const err = new Error(`Incident #${incidentId} not found`);
      err.statusCode = 404;
      throw err;
    }

    let summary = null;
    const aiBaseUrl = env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${aiBaseUrl}/api/v1/incident-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const result = await response.json();
        if (result && result.situation && Array.isArray(result.recommendedActions)) {
          summary = result;
        }
      }
    } catch (aiErr) {
      console.warn(`[AI Summary] Python microservice call failed (${aiErr.message}), trying direct Mistral service.`);
    }

    // Direct Mistral LLM fallback if Python microservice didn't respond
    if (!summary) {
      try {
        summary = await MistralService.generateIncidentSummary(context);
        if (summary) {
          console.info(`[AI Summary] Successfully synthesized real AI summary directly via Node MistralService.`);
        }
      } catch (directErr) {
        console.warn(`[AI Summary] Direct Mistral synthesis failed: ${directErr.message}`);
      }
    }

    // Final fail-safe deterministic fallback
    if (!summary) {
      summary = this.generateDeterministicSummary(context);
    }

    // Socket.IO real-time broadcast
    emitAiSummaryGenerated({
      incidentId: context.incident.id,
      summary,
    });

    // Audit log
    await recordAuditLog({
      user,
      action: 'AI_SUMMARY_GENERATED',
      entityType: 'INCIDENT',
      entityId: context.incident.id,
      metadata: { incidentId: context.incident.id, timestamp: summary.generatedAt },
    });

    return summary;
  }
}

export default EmergencySummaryService;
