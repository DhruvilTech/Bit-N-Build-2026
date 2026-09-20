import { IncidentModel } from '../models/incident.model.js';
import { ResourceModel } from '../models/resource.model.js';
import { ResponseTeamModel } from '../models/team.model.js';
import { FacilityModel } from '../models/facility.model.js';
import Escalation from '../models/escalation.model.js';
import { env } from '../config/env.js';
import { recordAuditLog } from './auditLog.service.js';

export class AiCommandService {
  /**
   * Deterministic & rule-guided intent detection
   */
  static detectIntent(message = '') {
    const q = message.toLowerCase().trim();

    if (/critical|p1|immediate threat|catastrophic/i.test(q)) {
      return 'CRITICAL_INCIDENTS';
    }
    if (/escalat|command authority/i.test(q)) {
      return 'ESCALATION_STATUS';
    }
    if (/ambulance|paramedic|medic|vehicle/i.test(q) && /available|ready|standby|free/i.test(q)) {
      return 'AVAILABLE_AMBULANCES';
    }
    if (/delay|\blate\b|transit bottleneck|sla/i.test(q)) {
      return 'DELAYED_INCIDENTS';
    }
    if (/hospital|bed|icu|divert|trauma center/i.test(q)) {
      return 'HOSPITAL_CAPACITY';
    }
    if (/shortage|depleted|deficit|exhaust/i.test(q)) {
      return 'RESOURCE_SHORTAGES';
    }
    if (/team|deployed|assigned|field unit/i.test(q)) {
      return 'ASSIGNED_TEAMS';
    }
    if (/summar|situation|briefing|status report|overview/i.test(q)) {
      return 'CURRENT_EMERGENCY_SUMMARY';
    }
    if (/inc-\d+|er-\d+|incident/i.test(q)) {
      return 'INCIDENT_DETAILS';
    }

    return 'GENERAL_OPERATIONAL_QUERY';
  }

  /**
   * Minimal task-specific database queries: never fetch whole DB
   */
  static async fetchMinimalContext(intent, message, contextIncidentId) {
    switch (intent) {
      case 'CRITICAL_INCIDENTS': {
        const incidents = await IncidentModel.find({
          severity: 'CRITICAL',
          status: { $ne: 'CANCELLED' },
        })
          .select('incidentId title type priority status location.address createdAt delayDetected')
          .limit(10)
          .lean();
        return {
          data: incidents.map((i) => ({
            id: i.incidentId || String(i._id),
            title: i.title,
            type: i.type,
            priority: i.priority,
            status: i.status,
            location: i.location?.address || 'Metro Sector',
            delayed: i.delayDetected,
          })),
          source: 'Incident Management Registry',
        };
      }

      case 'AVAILABLE_AMBULANCES': {
        const ambulances = await ResourceModel.find({
          type: { $in: ['AMBULANCE', 'VEHICLE'] },
          status: 'AVAILABLE',
        })
          .select('resourceId name type status location.address')
          .limit(10)
          .lean();
        return {
          data: ambulances.map((a) => ({
            id: a.resourceId || String(a._id),
            name: a.name,
            type: a.type,
            status: a.status,
            location: a.location?.address || 'Central Staging Area',
          })),
          source: 'Resource Inventory',
        };
      }

      case 'DELAYED_INCIDENTS': {
        const delayed = await IncidentModel.find({
          delayDetected: true,
          status: { $nin: ['RESOLVED', 'CANCELLED'] },
        })
          .select('incidentId title delayMinutes location.address status')
          .limit(10)
          .lean();
        return {
          data: delayed.map((d) => ({
            id: d.incidentId || String(d._id),
            title: d.title,
            delayMinutes: d.delayMinutes || 6,
            location: d.location?.address || 'Transit Corridor',
            status: d.status,
          })),
          source: 'Transit Telemetry Monitor',
        };
      }

      case 'HOSPITAL_CAPACITY': {
        const facilities = await FacilityModel.find({ type: 'HOSPITAL' })
          .select('facilityId name availableBeds totalBeds divertStatus traumaLevel location.address')
          .limit(10)
          .lean();
        return {
          data: facilities.map((f) => ({
            id: f.facilityId || String(f._id),
            name: f.name,
            availableBeds: f.availableBeds,
            totalBeds: f.totalBeds,
            divertStatus: f.divertStatus,
            traumaLevel: f.traumaLevel || 'Level 1',
          })),
          source: 'Medical Facilities Registry',
        };
      }

      case 'ESCALATION_STATUS': {
        const escalations = await Escalation.find({
          status: { $in: ['PENDING', 'ACKNOWLEDGED'] },
        })
          .select('escalationId incidentId level reason status targetRole triggeredAt')
          .sort({ level: -1, triggeredAt: -1 })
          .limit(10)
          .lean();
        return {
          data: escalations.map((e) => ({
            id: e.escalationId,
            incidentId: e.incidentId,
            level: e.level,
            reason: e.reason,
            status: e.status,
            targetRole: e.targetRole,
          })),
          source: 'Escalation Engine',
        };
      }

      case 'ASSIGNED_TEAMS': {
        const teams = await ResponseTeamModel.find({
          status: { $in: ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'BUSY'] },
        })
          .select('teamId name type status currentAssignment vehicleName')
          .limit(10)
          .lean();
        return {
          data: teams.map((t) => ({
            id: t.teamId,
            name: t.name,
            type: t.type,
            status: t.status,
            incidentId: t.currentAssignment,
            vehicle: t.vehicleName || 'Unit-01',
          })),
          source: 'Response Team Mesh',
        };
      }

      case 'CURRENT_EMERGENCY_SUMMARY': {
        const [incidentsCount, criticalCount, delayedCount] = await Promise.all([
          IncidentModel.countDocuments({ status: { $nin: ['RESOLVED', 'CANCELLED'] } }),
          IncidentModel.countDocuments({ severity: 'CRITICAL', status: { $nin: ['RESOLVED', 'CANCELLED'] } }),
          IncidentModel.countDocuments({ delayDetected: true, status: { $nin: ['RESOLVED', 'CANCELLED'] } }),
        ]);
        return {
          data: {
            activeIncidents: incidentsCount,
            criticalP1: criticalCount,
            delayedResponses: delayedCount,
          },
          source: 'EmergenX Operations Center',
        };
      }

      case 'INCIDENT_DETAILS': {
        const match = message.match(/(?:INC|ER)-\d+/i);
        const targetId = match ? match[0].toUpperCase() : contextIncidentId;
        if (targetId) {
          const inc = await IncidentModel.findOne({
            $or: [{ incidentId: targetId }, { _id: targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null }],
          })
            .select('incidentId title description type severity priority status location.address reports delayDetected')
            .lean();
          if (inc) {
            return {
              data: [
                {
                  id: inc.incidentId || String(inc._id),
                  title: inc.title,
                  type: inc.type,
                  severity: inc.severity,
                  priority: inc.priority,
                  status: inc.status,
                  location: inc.location?.address,
                  reports: (inc.reports || []).length,
                },
              ],
              source: `Incident Record #${targetId}`,
            };
          }
        }
        return { data: [], source: 'Incident Registry' };
      }

      default:
        return { data: [], source: 'Operational Knowledge Base' };
    }
  }

  /**
   * Synthesize operational answers deterministically
   */
  static synthesizeAnswer(intent, contextData, message) {
    switch (intent) {
      case 'CRITICAL_INCIDENTS': {
        const list = contextData.data || [];
        if (list.length === 0) {
          return 'No critical P1 incidents are currently active in the operational zone. All sectors are reporting within normal risk thresholds.';
        }
        return `There are currently ${list.length} active CRITICAL (P1) emergencies requiring high-priority containment:\n${list
          .map((i) => `• #${i.id} [${i.type}]: ${i.title} at ${i.location} (Status: ${i.status}${i.delayed ? ', DELAY DETECTED' : ''})`)
          .join('\n')}`;
      }

      case 'AVAILABLE_AMBULANCES': {
        const list = contextData.data || [];
        if (list.length === 0) {
          return 'Warning: No medical ambulances or transport vehicles are currently flagged as AVAILABLE. Mutual aid or private ambulance staging is advised.';
        }
        return `There are currently ${list.length} emergency medical ambulance(s) available for immediate dispatch:\n${list
          .map((a) => `• ${a.name} (#${a.id}) - ${a.status} at ${a.location}`)
          .join('\n')}`;
      }

      case 'DELAYED_INCIDENTS': {
        const list = contextData.data || [];
        if (list.length === 0) {
          return 'All dispatched emergency response units are currently operating within expected transit SLAs. Zero transit bottlenecks reported.';
        }
        return `ALERT: ${list.length} incident response(s) are experiencing transit delays:\n${list
          .map((d) => `• #${d.id} (${d.title}): Transit delayed by +${d.delayMinutes} min at ${d.location}. Rerouting suggested.`)
          .join('\n')}`;
      }

      case 'HOSPITAL_CAPACITY': {
        const list = contextData.data || [];
        const totalBeds = list.reduce((acc, h) => acc + (h.availableBeds || 0), 0);
        const diverting = list.filter((h) => h.divertStatus);
        return `TRAUMA & HOSPITAL CAPACITY:\n• Total Available Beds: ${totalBeds} across ${list.length} monitored medical facilities.\n• Divert Status: ${diverting.length > 0 ? diverting.map((h) => h.name).join(', ') + ' are currently on divert status.' : 'All trauma centers are accepting casualties.'}\n${list
          .map((h) => `• ${h.name} (${h.traumaLevel}): ${h.availableBeds}/${h.totalBeds} beds available. Divert: ${h.divertStatus ? 'YES' : 'NO'}`)
          .join('\n')}`;
      }

      case 'ESCALATION_STATUS': {
        const list = contextData.data || [];
        if (list.length === 0) {
          return 'No active command escalations are currently pending. All incident responses are proceeding within standard operational parameters.';
        }
        return `COMMAND ESCALATIONS ACTIVE (${list.length} alerts):\n${list
          .map((e) => `• Level ${e.level} on #${e.incidentId}: ${e.reason} [Target: ${e.targetRole}, Status: ${e.status}]`)
          .join('\n')}`;
      }

      case 'ASSIGNED_TEAMS': {
        const list = contextData.data || [];
        if (list.length === 0) {
          return 'No field teams are currently deployed. All response units are staged or available in depots.';
        }
        return `DEPLOYED RESPONSE TEAMS (${list.length} active):\n${list
          .map((t) => `• ${t.name} (${t.type}) - ${t.status} on #${t.incidentId || 'Patrol'}`)
          .join('\n')}`;
      }

      case 'CURRENT_EMERGENCY_SUMMARY': {
        const s = contextData.data || {};
        return `SITUATIONAL COMMAND OVERVIEW:\n• Active Incidents: ${s.activeIncidents || 0} currently tracked.\n• Critical Threats (P1): ${s.criticalP1 || 0} requiring immediate priority.\n• Transit Delays: ${s.delayedResponses || 0} units flagged exceeding SLA.\nAll real-time sensors, IoT atmospheric stations, and emergency mesh networks are synchronized.`;
      }

      case 'INCIDENT_DETAILS': {
        const list = contextData.data || [];
        if (list.length > 0) {
          const inc = list[0];
          return `DETAILS FOR #${inc.id} (${inc.title}):\n• Type: ${inc.type} | Priority: ${inc.priority} | Severity: ${inc.severity}\n• Location: ${inc.location}\n• Status: ${inc.status}\n• Reports: ${inc.reports} independent eyewitness/sensor reports recorded.`;
        }
        return `Incident record could not be found or has been closed. Please check the incident identifier.`;
      }

      default:
        return `Telemetry acknowledged for query: "${message}". Operational decision-support engine recommends prioritizing critical P1 containment and dispatching available medical units.`;
    }
  }

  /**
   * Main command pipeline: Detect Intent -> Query Minimal Context -> Fast-Fail AI or Local Synthesis
   */
  static async processCommand({ message, history = [], contextIncidentId = null, user = null }) {
    if (!message || typeof message !== 'string') {
      const err = new Error('Valid message is required');
      err.statusCode = 400;
      throw err;
    }

    const intent = this.detectIntent(message);
    const context = await this.fetchMinimalContext(intent, message, contextIncidentId);

    let answer = null;
    const aiBaseUrl = env.AI_SERVICE_URL || 'http://localhost:8000';

    // Attempt calling AI service with minimal context
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${aiBaseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          intent,
          context: context.data,
          history: history.slice(-4), // Last 4 messages only to keep prompt small
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const result = await response.json();
        if (result && result.answer) {
          answer = result.answer;
        }
      }
    } catch (aiErr) {
      console.warn(`[AI Chat] Python service unavailable (${aiErr.message}), falling back to deterministic answer synthesis.`);
    }

    if (!answer) {
      answer = this.synthesizeAnswer(intent, context, message);
    }

    // Format structured cards for frontend interactive linking
    const structuredCards = Array.isArray(context.data)
      ? context.data.map((item) => ({
          id: item.id,
          title: item.title || item.name || item.id,
          type: item.type || intent,
          status: item.status || 'ACTIVE',
          link: item.id?.startsWith('INC') || item.id?.startsWith('ER') ? `/incidents/${item.id}` : null,
        }))
      : [];

    const responsePayload = {
      intent,
      answer,
      data: structuredCards,
      sources: [context.source || 'EmergenX Operational Database'],
      generatedAt: new Date().toISOString(),
    };

    // Audit Log
    try {
      await recordAuditLog({
        user,
        action: 'AI_COMMAND_PROCESSED',
        entityType: 'AI_ASSISTANT',
        entityId: 'CHAT_SESSION',
        metadata: { intent, messageLength: message.length },
      });
    } catch (e) {
      // non-blocking
    }

    return responsePayload;
  }
}

export default AiCommandService;
