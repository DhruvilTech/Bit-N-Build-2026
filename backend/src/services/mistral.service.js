import { env } from '../config/env.js';

export class MistralService {
  static MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

  /**
   * Generates a 6-factor emergency incident tactical summary via Mistral LLM
   */
  static async generateIncidentSummary(context) {
    const apiKey = (env.MISTRAL_API_KEY || '').trim();
    if (!apiKey) return null;

    const systemPrompt = `You are EmergenX Chief Incident Commander AI, an elite tactical emergency operations triage expert.
Analyze the provided emergency incident operational telemetry and generate an authoritative, high-stakes tactical briefing.
You must respond with ONLY valid JSON adhering strictly to this schema:
{
  "situation": "A comprehensive operational narrative detailing incident severity, current threat posture, geographic impact, and verified source signals.",
  "currentResponse": ["Tactical evaluation of deployed field units vs unassigned gaps", "Transit telemetry and SLA containment status"],
  "resourceStatus": ["Summary of available ambulances and medical staging", "Trauma center bed capacities and divert flags"],
  "risks": ["Primary hazard escalation and casualty risks", "Secondary structural, hazardous material, or environmental threats"],
  "delays": ["Transit SLA impediment observations or route bottlenecks"],
  "recommendedActions": ["Immediate priority 1 action for dispatch/commander", "Immediate medical or containment directive", "Coordination or perimeter control action"]
}
Ground every single assessment strictly in the provided data. Do not invent fictitious facilities. Maintain an urgent, tactical, professional tone.`;

    const models = [env.MISTRAL_MODEL || 'ministral-8b-latest', env.MISTRAL_FALLBACK_MODEL || 'ministral-3b-latest'];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(this.MISTRAL_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Live Incident Telemetry:\n${JSON.stringify(context, null, 2)}` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 800,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const body = await res.json();
          const raw = body?.choices?.[0]?.message?.content;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.situation && Array.isArray(parsed.recommendedActions)) {
              return {
                situation: String(parsed.situation).trim(),
                currentResponse: Array.isArray(parsed.currentResponse) ? parsed.currentResponse.map(String) : [String(parsed.currentResponse || '')],
                resourceStatus: Array.isArray(parsed.resourceStatus) ? parsed.resourceStatus.map(String) : [String(parsed.resourceStatus || '')],
                risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [String(parsed.risks || '')],
                delays: Array.isArray(parsed.delays) ? parsed.delays.map(String) : [String(parsed.delays || '')],
                recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.map(String) : [String(parsed.recommendedActions || '')],
                generatedAt: new Date().toISOString(),
              };
            }
          }
        }
      } catch (err) {
        console.warn(`[Node Mistral] Call with model ${model} failed: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Generates a conversational command copilot response via Mistral LLM
   */
  static async generateChatResponse(message, context, history = []) {
    const apiKey = (env.MISTRAL_API_KEY || '').trim();
    if (!apiKey) return null;

    const systemPrompt = `You are EmergenX Tactical Response AI Copilot, an artificial intelligence command assistant deployed in an emergency operations center.
You assist emergency operators, dispatchers, medical coordinators, and tactical commanders.
You have access to live real-time operational telemetry from the city emergency mesh network:
--- LIVE TELEMETRY SNAPSHOT ---
${JSON.stringify(context, null, 2)}
--- END TELEMETRY ---

OPERATIONAL INSTRUCTIONS:
1. Ground your answers directly in the live telemetry provided above whenever discussing incidents, ambulances, teams, hospitals, or escalations. Use bold Markdown for incident IDs (e.g., **#ER-2849**), team names, and hospitals.
2. If asked tactical, ICS, or emergency management questions (e.g. fire containment, chemical dispersion, triage protocols, evacuation radii), provide expert recommendations aligned with the Incident Command System.
3. If queried telemetry indicates zero items (e.g. no delays, no open escalations), state it clearly and reassuringly.
4. Keep answers sharp, clear, and actionable. Avoid unnecessary disclaimers. Prioritize life safety and rapid situational awareness.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    for (const turn of (history || []).slice(-4)) {
      const role = turn.sender === 'ai' ? 'assistant' : 'user';
      if (turn.text) {
        messages.push({ role, content: turn.text });
      }
    }

    messages.push({ role: 'user', content: message });

    const models = [env.MISTRAL_MODEL || 'ministral-8b-latest', env.MISTRAL_FALLBACK_MODEL || 'ministral-3b-latest'];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(this.MISTRAL_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 600,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const body = await res.json();
          const answer = body?.choices?.[0]?.message?.content;
          if (answer && answer.trim()) {
            return answer.trim();
          }
        }
      } catch (err) {
        console.warn(`[Node Mistral] Chat call with model ${model} failed: ${err.message}`);
      }
    }

    return null;
  }
  /**
   * Executes a controlled tool-calling chat loop via Mistral API
   */
  static async executeToolCallingChat({ message, tools = [], toolExecutor, history = [] }) {
    const apiKey = (env.MISTRAL_API_KEY || '').trim();
    if (!apiKey) return null;

    const systemPrompt = `You are EmergenX Chief Incident Commander AI, an elite tactical emergency operations assistant.
You have access to controlled backend tools that retrieve verified real-time database state from the operations center.
RULES:
1. When asked about critical incidents, available resources, delays, hospital capacities, or shortages, you MUST call the appropriate controlled tool(s) to obtain verified data.
2. NEVER invent incident IDs, resource IDs, hospital capacities, or arrival times. If a tool returns zero items or empty lists, state that clearly.
3. Ground your final response strictly in the verified tool output. Distinguish verified database facts from tactical operational advice.
4. Format incident IDs, resource numbers, and hospital names in bold markdown (e.g. **#INC-1042**, **Medic-1**, **City Hospital**).
5. Maintain a professional, crisp, tactical tone suitable for an Emergency Operations Center.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    for (const turn of (history || []).slice(-4)) {
      const role = turn.sender === 'ai' ? 'assistant' : 'user';
      if (turn.text) {
        messages.push({ role, content: turn.text });
      }
    }

    messages.push({ role: 'user', content: message });

    const models = [env.MISTRAL_MODEL || 'ministral-8b-latest', env.MISTRAL_FALLBACK_MODEL || 'ministral-3b-latest'];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        // Step 1: Initial call with tools
        const payload = {
          model,
          messages,
          temperature: 0.2,
          max_tokens: 800,
        };

        if (tools && tools.length > 0) {
          payload.tools = tools;
          payload.tool_choice = 'auto';
        }

        const res = await fetch(this.MISTRAL_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          console.warn(`[Mistral Tool Call] Model ${model} returned status ${res.status}`);
          continue;
        }

        const body = await res.json();
        const choice = body?.choices?.[0];
        const assistantMessage = choice?.message;

        if (!assistantMessage) continue;

        // If Mistral requested tool calls
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && typeof toolExecutor === 'function') {
          const toolExecutions = [];
          const toolMessages = [...messages, assistantMessage];

          for (const call of assistantMessage.tool_calls) {
            const toolName = call.function?.name;
            let toolArgs = {};
            try {
              toolArgs = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
            } catch (pErr) {
              toolArgs = {};
            }

            try {
              const toolResult = await toolExecutor(toolName, toolArgs);
              toolExecutions.push({
                tool: toolName,
                arguments: toolArgs,
                result: toolResult,
                success: true,
              });

              toolMessages.push({
                role: 'tool',
                name: toolName,
                tool_call_id: call.id,
                content: JSON.stringify(toolResult),
              });
            } catch (execErr) {
              toolExecutions.push({
                tool: toolName,
                arguments: toolArgs,
                error: execErr.message,
                success: false,
              });

              toolMessages.push({
                role: 'tool',
                name: toolName,
                tool_call_id: call.id,
                content: JSON.stringify({ error: execErr.message }),
              });
            }
          }

          // Step 2: Second call to Mistral with tool results for grounded synthesis
          const secondController = new AbortController();
          const secondTimeout = setTimeout(() => secondController.abort(), 15000);

          const secondRes = await fetch(this.MISTRAL_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: toolMessages,
              temperature: 0.2,
              max_tokens: 800,
            }),
            signal: secondController.signal,
          });

          clearTimeout(secondTimeout);

          if (secondRes.ok) {
            const secondBody = await secondRes.json();
            const finalAnswer = secondBody?.choices?.[0]?.message?.content;
            if (finalAnswer) {
              return {
                answer: finalAnswer.trim(),
                toolExecutions,
              };
            }
          }
        }

        // Direct answer without tool calls
        if (assistantMessage.content) {
          return {
            answer: assistantMessage.content.trim(),
            toolExecutions: [],
          };
        }
      } catch (err) {
        console.warn(`[Mistral Tool Call] Failed with model ${model}: ${err.message}`);
      }
    }

    return null;
  }
}

export default MistralService;
