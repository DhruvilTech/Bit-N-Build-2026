"""Mistral LLM Service for Incident Operational Summaries and Command Copilot."""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings
from app.utils.logger import logger


class MistralService:
    """Service to communicate with Mistral AI API for Emergency Decision Support."""

    MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

    @classmethod
    def get_api_key(cls) -> str:
        return settings.MISTRAL_API_KEY.strip()

    @classmethod
    async def generate_incident_summary(cls, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calls Mistral LLM to synthesize a real 6-factor emergency briefing from scoped operational data.
        Returns parsed JSON adhering to the 6 sections.
        """
        api_key = cls.get_api_key()
        if not api_key:
            logger.warning("[MistralService] No MISTRAL_API_KEY found, using local fallback generator.")
            return cls._fallback_summary(context)

        system_prompt = (
            "You are EmergenX Chief Incident Commander AI, an elite tactical emergency operations triage expert. "
            "Analyze the provided emergency incident operational telemetry and generate an authoritative, high-stakes tactical briefing. "
            "You must respond with ONLY valid JSON adhering strictly to this schema:\n"
            "{\n"
            '  "situation": "A concise operational narrative (2-3 sentences) detailing incident severity, current threat posture, geographic impact, and verified source signals.",\n'
            '  "currentResponse": ["Tactical evaluation of deployed field units vs unassigned gaps", "Transit telemetry and SLA containment status"],\n'
            '  "resourceStatus": ["Summary of available ambulances and medical staging", "Trauma center bed capacities and divert flags"],\n'
            '  "risks": ["Primary hazard escalation and casualty risks", "Secondary structural, hazardous material, or environmental threats"],\n'
            '  "delays": ["Transit SLA impediment observations or route bottlenecks"],\n'
            '  "recommendedActions": ["Immediate priority 1 action for dispatch/commander", "Immediate medical or containment directive", "Coordination or perimeter control action"]\n'
            "}\n"
            "CRITICAL RULES:\n"
            "1. Ground every single assessment strictly in the provided data. Do not invent fictitious facilities.\n"
            "2. Keep all array items concise and punchy (1-2 sentences per item, 2-4 items per array).\n"
            "3. Ensure the JSON is properly terminated and completely valid."
        )

        models_to_try = [settings.MISTRAL_MODEL, settings.MISTRAL_FALLBACK_MODEL]

        for model in models_to_try:
            try:
                async with httpx.AsyncClient(timeout=16.0) as client:
                    response = await client.post(
                        cls.MISTRAL_URL,
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {
                                    "role": "user",
                                    "content": f"Live Incident Telemetry:\n{json.dumps(context, indent=2)}",
                                },
                            ],
                            "response_format": {"type": "json_object"},
                            "temperature": 0.2,
                            "max_tokens": 1500,
                        },
                    )

                    if response.status_code == 200:
                        body = response.json()
                        raw_content = body["choices"][0]["message"]["content"]
                        parsed = json.loads(raw_content)

                        # Ensure required fields exist and are sanitized
                        sanitized = {
                            "situation": str(parsed.get("situation", "")).strip(),
                            "currentResponse": cls._ensure_str_list(parsed.get("currentResponse")),
                            "resourceStatus": cls._ensure_str_list(parsed.get("resourceStatus")),
                            "risks": cls._ensure_str_list(parsed.get("risks")),
                            "delays": cls._ensure_str_list(parsed.get("delays")),
                            "recommendedActions": cls._ensure_str_list(parsed.get("recommendedActions")),
                            "generatedAt": datetime.now(timezone.utc).isoformat(),
                        }

                        if sanitized["situation"] and len(sanitized["recommendedActions"]) > 0:
                            logger.info(f"[MistralService] Successfully synthesized real AI summary using model {model}.")
                            return sanitized
                    else:
                        logger.warning(
                            f"[MistralService] Mistral model {model} returned status {response.status_code}: {response.text[:200]}"
                        )
            except Exception as exc:
                logger.warning(f"[MistralService] Call with model {model} failed: {exc}")

        # If all models failed, use local deterministic fallback
        logger.warning("[MistralService] Falling back to deterministic summary generation.")
        return cls._fallback_summary(context)

    @classmethod
    async def chat_command(
        cls,
        message: str,
        intent: str,
        context: Any,
        history: List[Dict[str, str]],
    ) -> str:
        """
        Calls Mistral LLM to generate an intelligent, conversational, context-grounded command copilot response.
        """
        api_key = cls.get_api_key()
        if not api_key:
            return cls._fallback_chat(intent, context, message)

        system_prompt = (
            "You are EmergenX Tactical Response AI Copilot, an artificial intelligence command assistant deployed in an emergency operations center. "
            "You assist emergency operators, dispatchers, medical coordinators, and tactical commanders. "
            "You have access to live real-time operational telemetry from the city emergency mesh network:\n"
            f"--- LIVE TELEMETRY SNAPSHOT ---\n{json.dumps(context, indent=2)}\n--- END TELEMETRY ---\n\n"
            "OPERATIONAL INSTRUCTIONS:\n"
            "1. Ground your answers directly in the live telemetry provided above whenever discussing incidents, ambulances, teams, hospitals, or escalations. Use bold Markdown for incident IDs (e.g., **#ER-2849**), team names, and hospitals.\n"
            "2. If asked tactical, ICS, or emergency management questions (e.g. fire containment, chemical dispersion, triage protocols, evacuation radii), provide expert recommendations aligned with the Incident Command System.\n"
            "3. If queried telemetry indicates zero items (e.g. no delays, no open escalations), state it clearly and reassuringly.\n"
            "4. Keep answers sharp, clear, and actionable. Avoid unnecessary disclaimers. Prioritize life safety and rapid situational awareness."
        )

        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

        # Append last conversation turns
        for turn in (history or [])[-4:]:
            role = "assistant" if turn.get("sender") == "ai" else "user"
            content = turn.get("text", "")
            if content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        models_to_try = [settings.MISTRAL_MODEL, settings.MISTRAL_FALLBACK_MODEL]

        for model in models_to_try:
            try:
                async with httpx.AsyncClient(timeout=14.0) as client:
                    response = await client.post(
                        cls.MISTRAL_URL,
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": 0.3,
                            "max_tokens": 600,
                        },
                    )

                    if response.status_code == 200:
                        body = response.json()
                        answer = body["choices"][0]["message"]["content"]
                        if answer and answer.strip():
                            logger.info(f"[MistralService] Command chat answered using model {model}.")
                            return answer.strip()
                    else:
                        logger.warning(
                            f"[MistralService] Chat model {model} returned status {response.status_code}: {response.text[:200]}"
                        )
            except Exception as exc:
                logger.warning(f"[MistralService] Chat call with model {model} failed: {exc}")

        return cls._fallback_chat(intent, context, message)

    @staticmethod
    def _ensure_str_list(val: Any) -> List[str]:
        if isinstance(val, list):
            return [str(x) for x in val if x]
        if isinstance(val, str) and val.strip():
            return [val.strip()]
        return []

    @classmethod
    def _fallback_summary(cls, context: Dict[str, Any]) -> Dict[str, Any]:
        inc = context.get("incident", {})
        resp = context.get("response", {})
        res = context.get("resources", {})
        esc = context.get("escalations", [])

        situation = (
            f"Incident #{inc.get('id', 'N/A')} ({inc.get('title', 'Emergency')}) is currently in {inc.get('status', 'ACTIVE')} state, "
            f"rated {inc.get('severity', 'HIGH')} severity with {inc.get('priority', 'P2')} priority dispatch at {inc.get('address', 'Metro Area')}. "
            f"Verified across {inc.get('reportCount', 1)} independent source report(s)."
        )

        assigned_teams = resp.get("assignedTeams", [])
        current_response = [
            (
                f"{len(assigned_teams)} field unit(s) deployed: {', '.join([f'{t.get('name', 'Unit')} [{t.get('status', 'ACTIVE')}]' for t in assigned_teams])}."
                if len(assigned_teams) > 0
                else "No emergency response teams have been dispatched yet. Immediate assignment required."
            ),
            (
                f"Transit delay flagged (+{inc.get('delayMinutes', 5)} min exceeding benchmark)."
                if inc.get("delayDetected")
                else "Field transit within expected SLA window."
            ),
        ]

        hospitals = res.get("hospitals", [])
        hospitals_str = "; ".join(
            [
                f"{h.get('name', 'Hospital')} ({h.get('availableBeds', 0)} beds available, divert: {'YES' if h.get('divertStatus') else 'NO'})"
                for h in hospitals
            ]
        ) or "Trauma units on standby."

        resource_status = [
            f"{res.get('availableAmbulancesCount', 0)} emergency ambulance/medical vehicle(s) on standby.",
            f"Trauma facility status: {hospitals_str}",
        ]

        risks = [
            (
                "High structural / casualty risk requiring rapid containment and mutual-aid coordination."
                if inc.get("severity") == "CRITICAL"
                else "Standard hazard mitigation protocols apply."
            ),
            (
                f"Active escalation alert: Level {esc[0].get('level', 1)} ({esc[0].get('reason', 'Response overdue')})."
                if len(esc) > 0
                else "No active command escalations."
            ),
        ]

        delays = (
            [f"Unit arrival delayed by {inc.get('delayMinutes', 5)} minutes due to traffic/route impediment."]
            if inc.get("delayDetected")
            else ["No operational transit delays detected."]
        )

        recommended_actions = [
            (
                "Dispatch primary response team immediately."
                if len(assigned_teams) == 0
                else "Maintain continuous radio telemetry and coordinate staging."
            ),
            (
                "Reroute incoming medical transports away from saturated facilities."
                if any(h.get("divertStatus") for h in hospitals)
                else "Designate primary trauma center for potential casualties."
            ),
            (
                f"Acknowledge and clear active Level {esc[0].get('level', 1)} escalation."
                if len(esc) > 0
                else "Monitor perimeter and log operational updates."
            ),
        ]

        return {
            "situation": situation,
            "currentResponse": current_response,
            "resourceStatus": resource_status,
            "risks": risks,
            "delays": delays,
            "recommendedActions": recommended_actions,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def _fallback_chat(cls, intent: str, context: Any, message: str) -> str:
        ctx = context or []
        if intent == "CRITICAL_INCIDENTS":
            if isinstance(ctx, list) and len(ctx) > 0:
                return (
                    f"There are currently {len(ctx)} active CRITICAL (P1) emergencies requiring high-priority containment:\n"
                    + "\n".join(
                        [
                            f"• **#{item.get('id')}** [{item.get('type')}]: {item.get('title')} at {item.get('location')} (Status: {item.get('status')})"
                            for item in ctx
                        ]
                    )
                )
            return "No critical P1 incidents are currently active in the operational zone. All sectors are reporting within normal risk thresholds."

        if intent == "AVAILABLE_AMBULANCES":
            if isinstance(ctx, list) and len(ctx) > 0:
                return (
                    f"There are currently {len(ctx)} emergency medical ambulance(s) available for immediate dispatch:\n"
                    + "\n".join(
                        [
                            f"• **{item.get('name')}** (#{item.get('id')}) - {item.get('status')} at {item.get('location')}"
                            for item in ctx
                        ]
                    )
                )
            return "Warning: No medical ambulances or transport vehicles are currently flagged as AVAILABLE. Mutual aid or private ambulance staging is advised."

        if intent == "DELAYED_INCIDENTS":
            if isinstance(ctx, list) and len(ctx) > 0:
                return (
                    f"ALERT: {len(ctx)} incident response(s) are experiencing transit delays:\n"
                    + "\n".join(
                        [
                            f"• **#{item.get('id')}** ({item.get('title')}): Transit delayed by +{item.get('delayMinutes', 6)} min at {item.get('location')}."
                            for item in ctx
                        ]
                    )
                )
            return "All dispatched emergency response units are currently operating within expected transit SLAs. Zero transit bottlenecks reported."

        if intent == "HOSPITAL_CAPACITY":
            if isinstance(ctx, list) and len(ctx) > 0:
                total_beds = sum(h.get("availableBeds", 0) for h in ctx)
                diverting = [h for h in ctx if h.get("divertStatus")]
                return (
                    f"TRAUMA & HOSPITAL CAPACITY:\n"
                    f"• Total Available Beds: **{total_beds}** across {len(ctx)} monitored medical facilities.\n"
                    f"• Divert Status: {f'**{len(diverting)} facility/facilities on divert**' if diverting else 'All trauma centers accepting casualties.'}\n"
                    + "\n".join(
                        [
                            f"• **{h.get('name')}**: {h.get('availableBeds')}/{h.get('totalBeds')} beds available. Divert: {'YES' if h.get('divertStatus') else 'NO'}"
                            for h in ctx
                        ]
                    )
                )
            return "Hospital capacity data is currently synchronized and awaiting local trauma updates."

        if intent == "ESCALATION_STATUS":
            if isinstance(ctx, list) and len(ctx) > 0:
                return (
                    f"COMMAND ESCALATIONS ACTIVE ({len(ctx)} alerts):\n"
                    + "\n".join(
                        [
                            f"• **Level {e.get('level')}** on **#{e.get('incidentId')}**: {e.get('reason')} [Target: {e.get('targetRole')}, Status: {e.get('status')}]"
                            for e in ctx
                        ]
                    )
                )
            return "No active command escalations are currently pending. All incident responses are proceeding within standard operational parameters."

        return (
            f"Telemetry acknowledged for query: '{message}'. "
            f"Response AI operational copilot recommends monitoring active P1 hazards and maintaining standby mutual-aid staging."
        )
