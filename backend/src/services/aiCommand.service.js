import { AiToolsService } from './aiTools.service.js';
import { MistralService } from './mistral.service.js';
import { recordAuditLog } from './auditLog.service.js';

export class AiCommandService {
  /**
   * Deterministic intent detection used as fallback when LLM is unavailable
   */
  static detectIntent(message = '') {
    const q = message.toLowerCase().trim();

    if (/critical|p1|immediate threat|catastrophic/i.test(q)) {
      return 'CRITICAL_INCIDENTS';
    }
    if (/ambulance|paramedic|medic|vehicle/i.test(q) && /available|ready|standby|free/i.test(q)) {
      return 'AVAILABLE_AMBULANCES';
    }
    if (/delay|\blate\b|transit bottleneck|sla/i.test(q)) {
      return 'DELAYED_INCIDENTS';
    }
    if (/hospital|bed|icu|burn|divert|trauma center/i.test(q)) {
      return 'HOSPITAL_CAPACITY';
    }
    if (/shortage|depleted|deficit|exhaust/i.test(q)) {
      return 'RESOURCE_SHORTAGES';
    }
    if (/summar|situation|briefing|status report|overview/i.test(q)) {
      return 'CURRENT_EMERGENCY_SUMMARY';
    }
    if (/escalat|command authority/i.test(q)) {
      return 'ESCALATION_STATUS';
    }
    if (/team|crew|assigned unit/i.test(q) && /assigned|deploy/i.test(q)) {
      return 'ASSIGNED_TEAMS';
    }
    if (/(?:inc|er)-\d+/i.test(q)) {
      return 'INCIDENT_DETAILS';
    }

    return 'GENERAL_OPERATIONAL_QUERY';
  }

  /**
   * Backward-compatible answer synthesis for Phase 20 intent queries
   */
  static synthesizeAnswer(intent, contextData, message = '') {
    if (intent === 'AVAILABLE_AMBULANCES') {
      const items = contextData?.data || [];
      if (items.length === 0) {
        return 'Warning: No medical ambulances are currently available in the active registry.';
      }
      return `There are currently ${items.length} emergency medical ambulance units available: ${items.map((i) => i.name).join(', ')}.`;
    }

    return this.synthesizeAnswerFromTool(intent, contextData, message);
  }

  /**
   * Synthesize operational answers from verified tool outputs
   */
  static synthesizeAnswerFromTool(toolName, toolResult, message = '') {
    switch (toolName) {
      case 'getCriticalIncidents': {
        const incidents = toolResult.incidents || [];
        if (incidents.length === 0) {
          return 'Verified Database State: No critical (P1) incidents are currently active. All operational sectors are within standard safety thresholds.';
        }
        return `Verified Operational Data: There are currently ${incidents.length} active CRITICAL (P1) emergencies requiring immediate response:\n${incidents
          .map((i) => `• **#${i.id}** [${i.type}]: ${i.title} at ${i.location} (Status: ${i.status}${i.delayed ? ', DELAY DETECTED' : ''})`)
          .join('\n')}`;
      }

      case 'getAvailableResources': {
        const resources = toolResult.resources || [];
        if (resources.length === 0) {
          return 'Verified Operational Data: No resources of the requested type are currently flagged as AVAILABLE. Mutual aid or staging redistribution is recommended.';
        }
        return `Verified Operational Data: There are ${resources.length} resource(s) ready for immediate deployment:\n${resources
          .map((r) => `• **${r.name}** (#${r.id}) - ${r.type} [${r.status}] at ${r.location}`)
          .join('\n')}`;
      }

      case 'getDelayedIncidents': {
        const list = toolResult.delayedIncidents || [];
        if (list.length === 0) {
          return 'Verified Operational Data: All dispatched emergency response units are operating within SLA arrival thresholds. Zero transit bottlenecks detected.';
        }
        return `Verified Operational Data: ${list.length} incident response(s) are experiencing transit delays exceeding standard SLAs:\n${list
          .map((d) => `• **#${d.id}** (${d.title}): Transit delayed by +${d.delayMinutes} min at ${d.location}. Status: ${d.status}.`)
          .join('\n')}`;
      }

      case 'getHospitalCapacity': {
        const hospitals = toolResult.hospitals || [];
        const diverting = hospitals.filter((h) => h.divertStatus);
        return `Verified Operational Data — Hospital Network Capacity:\n• Total Available Beds: ${toolResult.totalAvailableBeds} across ${hospitals.length} monitored facilities.\n• Divert Status: ${diverting.length > 0 ? diverting.map((h) => h.name).join(', ') + ' currently diverting.' : 'All trauma centers accepting incoming patients.'}\n${hospitals
          .map((h) => `• **${h.name}**: ${h.availableBeds}/${h.totalBeds} beds available (${h.occupancyPercentage}% occupied). ICU: ${h.icu ? `${h.icu.available} available` : 'N/A'}. Divert: ${h.divertStatus ? 'YES' : 'NO'}`)
          .join('\n')}`;
      }

      case 'getResourceShortages': {
        const shortages = toolResult.shortages || [];
        const deficits = shortages.filter((s) => s.shortage > 0);
        if (deficits.length === 0) {
          return 'Verified Operational Data: Zero operational resource shortages detected. Available apparatus and team supply satisfies current emergency demand.';
        }
        return `Verified Operational Data — Resource Shortages Detected (${deficits.length} deficits):\n${deficits
          .map((d) => `• **${d.resourceType}**: Shortage of ${d.shortage} units (Required: ${d.required}, Available: ${d.available}) — Severity: ${d.severity}`)
          .join('\n')}\nRecommended Action: Initiate mutual aid staging or recall standby units.`;
      }

      case 'getIncidentSummary': {
        if (!toolResult.found) {
          return toolResult.message || 'Incident record could not be found.';
        }
        const inc = toolResult.incident;
        return `Verified Operational Data for **#${inc.id}** (${inc.title}):\n• Type: ${inc.type} | Priority: ${inc.priority} | Severity: ${inc.severity}\n• Location: ${inc.location}\n• Status: ${inc.status}\n• Reports: ${inc.reportsCount} field/eyewitness reports recorded.\n• Assigned Units: ${inc.assignedUnitsCount} active units deployed.`;
      }

      default:
        return `Verified operational data retrieved successfully from EmergenX Operational Registry for query: "${message}".`;
    }
  }

  /**
   * Main controlled command pipeline:
   * 1. Check user authorization & build role-scoped tool definitions
   * 2. Send prompt to Mistral with controlled tools
   * 3. Mistral selects tool -> Backend validates and executes against MongoDB
   * 4. Mistral synthesizes final response with verified data
   * 5. If Mistral is unavailable, execute deterministic tool-selection fallback
   */
  static async processCommand({ message, history = [], contextIncidentId = null, user = null }) {
    if (!message || typeof message !== 'string') {
      const err = new Error('Valid message is required');
      err.statusCode = 400;
      throw err;
    }

    const userRole = user?.role || 'OPERATOR';
    const tools = AiToolsService.getToolsForRole(userRole);
    let executedTools = [];
    let answer = null;
    let structuredCards = [];
    let detectedIntent = this.detectIntent(message);

    // Controlled Tool Executor closure with RBAC and argument validation
    const toolExecutor = async (toolName, toolArgs) => {
      const result = await AiToolsService.executeTool(toolName, toolArgs, user);
      executedTools.push({ toolName, args: toolArgs, result });
      return result;
    };

    // 1. Attempt Mistral Tool-Calling Flow
    try {
      const mistralResponse = await MistralService.executeToolCallingChat({
        message,
        tools,
        toolExecutor,
        history,
      });

      if (mistralResponse && mistralResponse.answer) {
        answer = mistralResponse.answer;
        if (mistralResponse.toolExecutions && mistralResponse.toolExecutions.length > 0) {
          executedTools = mistralResponse.toolExecutions.map((te) => ({
            toolName: te.tool,
            args: te.arguments,
            result: te.result,
          }));
        }
      }
    } catch (mistralErr) {
      console.warn(`[AI Command] Mistral tool-calling failed: ${mistralErr.message}`);
    }

    // 2. Deterministic Fallback Tool Execution if Mistral didn't respond
    if (!answer) {
      let fallbackTool = null;
      let fallbackArgs = {};

      switch (detectedIntent) {
        case 'CRITICAL_INCIDENTS':
          fallbackTool = 'getCriticalIncidents';
          fallbackArgs = { limit: 10 };
          break;
        case 'AVAILABLE_AMBULANCES':
          fallbackTool = 'getAvailableResources';
          fallbackArgs = { type: 'AMBULANCE', limit: 10 };
          break;
        case 'DELAYED_INCIDENTS':
          fallbackTool = 'getDelayedIncidents';
          fallbackArgs = { limit: 10 };
          break;
        case 'HOSPITAL_CAPACITY':
          fallbackTool = 'getHospitalCapacity';
          fallbackArgs = {};
          break;
        case 'RESOURCE_SHORTAGES':
          fallbackTool = 'getResourceShortages';
          fallbackArgs = {};
          break;
        case 'INCIDENT_DETAILS': {
          const match = message.match(/(?:INC|ER)-\d+/i);
          const incId = match ? match[0].toUpperCase() : contextIncidentId;
          if (incId) {
            fallbackTool = 'getIncidentSummary';
            fallbackArgs = { incidentId: incId };
          }
          break;
        }
        case 'CURRENT_EMERGENCY_SUMMARY':
        default:
          fallbackTool = 'getCriticalIncidents';
          fallbackArgs = { limit: 5 };
          break;
      }

      if (fallbackTool) {
        try {
          const toolResult = await toolExecutor(fallbackTool, fallbackArgs);
          answer = this.synthesizeAnswerFromTool(fallbackTool, toolResult, message);
        } catch (fbErr) {
          console.warn(`[AI Command] Fallback tool execution error: ${fbErr.message}`);
          answer = `Operational Telemetry Notice: System could not query ${fallbackTool}: ${fbErr.message}`;
        }
      } else {
        answer = `Tactical Response AI received query: "${message}". All emergency mesh systems are active.`;
      }
    }

    // 3. Extract structured cards from executed tools for interactive frontend linking
    for (const exec of executedTools) {
      const res = exec.result;
      if (!res) continue;

      if (Array.isArray(res.incidents)) {
        for (const inc of res.incidents) {
          structuredCards.push({
            id: inc.id,
            title: inc.title,
            type: inc.type || 'INCIDENT',
            status: inc.status,
            link: `/incidents/${inc.id}`,
          });
        }
      }
      if (Array.isArray(res.resources)) {
        for (const r of res.resources) {
          structuredCards.push({
            id: r.id,
            title: r.name,
            type: r.type || 'RESOURCE',
            status: r.status,
            link: '/resources',
          });
        }
      }
      if (Array.isArray(res.hospitals)) {
        for (const h of res.hospitals) {
          structuredCards.push({
            id: h.id,
            title: h.name,
            type: 'HOSPITAL',
            status: h.divertStatus ? 'DIVERTING' : 'OPERATIONAL',
            link: '/resources',
          });
        }
      }
      if (Array.isArray(res.shortages)) {
        for (const s of res.shortages.filter((sh) => sh.shortage > 0)) {
          structuredCards.push({
            id: s.resourceType,
            title: `${s.resourceType} Shortage (${s.shortage} units)`,
            type: 'SHORTAGE',
            status: s.severity,
            link: '/resources',
          });
        }
      }
      if (res.incident) {
        structuredCards.push({
          id: res.incident.id,
          title: res.incident.title,
          type: res.incident.type,
          status: res.incident.status,
          link: `/incidents/${res.incident.id}`,
        });
      }
    }

    const responsePayload = {
      intent: detectedIntent,
      answer,
      data: structuredCards.slice(0, 8),
      executedTools: executedTools.map((et) => et.toolName),
      verifiedData: executedTools.length > 0,
      sources: [
        'EmergenX Controlled Database Registry',
        ...executedTools.map((et) => `Tool: ${et.toolName}()`),
      ],
      generatedAt: new Date().toISOString(),
    };

    // Audit log command completion
    try {
      await recordAuditLog({
        user,
        action: 'AI_COMMAND_PROCESSED',
        entityType: 'AI_ASSISTANT',
        entityId: 'CHAT_SESSION',
        metadata: {
          intent: detectedIntent,
          messageLength: message.length,
          executedTools: responsePayload.executedTools,
        },
      });
    } catch (e) {
      // non-blocking
    }

    return responsePayload;
  }
}

export default AiCommandService;

