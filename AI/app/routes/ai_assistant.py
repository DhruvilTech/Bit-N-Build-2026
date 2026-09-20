"""FastAPI Router for AI Emergency Summary and Operational Command Assistant."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.schemas.assistant import (
    IncidentSummaryRequest,
    IncidentSummaryResponse,
    ChatCommandRequest,
    ChatCommandResponse,
)
from app.utils.logger import logger

router = APIRouter(prefix="/api/v1", tags=["AI Operational Assistant"])


@router.post(
    "/incident-summary",
    response_model=IncidentSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a structured 6-section emergency operational summary",
)
def generate_incident_summary(payload: IncidentSummaryRequest):
    """
    Generates a structured, concise tactical briefing from scoped incident context.
    Decision-support only: strictly read-only, makes no state modifications.
    """
    inc = payload.incident
    resp = payload.response
    res = payload.resources
    esc = payload.escalations

    now_iso = datetime.now(timezone.utc).isoformat()

    situation = (
        f"Incident #{inc.id} ({inc.title}) is currently in {inc.status} state, "
        f"rated {inc.severity} severity with {inc.priority} priority dispatch at {inc.address}. "
        f"Verified across {inc.reportCount} independent source report(s)."
    )

    current_response = [
        (
            f"{resp.assignedTeamsCount} field unit(s) deployed: "
            f"{', '.join([f'{t.get('name', 'Unit')} [{t.get('status', 'ACTIVE')}]' for t in resp.assignedTeams])}."
            if resp.assignedTeamsCount > 0
            else "No emergency response teams have been dispatched yet. Immediate assignment required."
        ),
        (
            f"Transit delay flagged (+{inc.delayMinutes} min exceeding benchmark)."
            if inc.delayDetected
            else "Field transit within expected SLA window."
        ),
    ]

    hospitals_str = "; ".join(
        [
            f"{h.get('name', 'Hospital')} ({h.get('availableBeds', 0)} beds available, divert: {'YES' if h.get('divertStatus') else 'NO'})"
            for h in res.hospitals
        ]
    ) or "Trauma units on standby."

    resource_status = [
        f"{res.availableAmbulancesCount} emergency ambulance/medical vehicle(s) on standby.",
        f"Trauma facility status: {hospitals_str}",
    ]

    risks = [
        (
            "High structural / casualty risk requiring rapid containment and mutual-aid coordination."
            if inc.severity == "CRITICAL"
            else "Standard hazard mitigation protocols apply."
        ),
        (
            f"Active escalation alert: Level {esc[0].get('level', 1)} ({esc[0].get('reason', 'Response overdue')})."
            if len(esc) > 0
            else "No active command escalations."
        ),
    ]

    delays = (
        [f"Unit arrival delayed by {inc.delayMinutes} minutes due to traffic/route impediment."]
        if inc.delayDetected
        else ["No operational transit delays detected."]
    )

    recommended_actions = [
        (
            "Dispatch primary response team immediately."
            if resp.assignedTeamsCount == 0
            else "Maintain continuous radio telemetry and coordinate staging."
        ),
        (
            "Reroute incoming medical transports away from saturated facilities."
            if any(h.get("divertStatus") for h in res.hospitals)
            else "Designate primary trauma center for potential casualties."
        ),
        (
            f"Acknowledge and clear active Level {esc[0].get('level', 1)} escalation."
            if len(esc) > 0
            else "Monitor perimeter and log operational updates."
        ),
    ]

    return IncidentSummaryResponse(
        situation=situation,
        currentResponse=current_response,
        resourceStatus=resource_status,
        risks=risks,
        delays=delays,
        recommendedActions=recommended_actions,
        generatedAt=now_iso,
    )


@router.post(
    "/chat",
    response_model=ChatCommandResponse,
    status_code=status.HTTP_200_OK,
    summary="Answer operational command questions using minimal scoped context",
)
def process_command_chat(payload: ChatCommandRequest):
    """
    Answers command questions using task-specific context objects without entire database access.
    """
    intent = payload.intent or "GENERAL_OPERATIONAL_QUERY"
    ctx = payload.context or []
    now_iso = datetime.now(timezone.utc).isoformat()

    if intent == "CRITICAL_INCIDENTS":
        if isinstance(ctx, list) and len(ctx) > 0:
            answer = (
                f"There are currently {len(ctx)} active CRITICAL (P1) emergencies requiring high-priority containment:\n"
                + "\n".join(
                    [
                        f"• #{item.get('id')} [{item.get('type')}]: {item.get('title')} at {item.get('location')} (Status: {item.get('status')})"
                        for item in ctx
                    ]
                )
            )
        else:
            answer = "No critical P1 incidents are currently active in the operational zone. All sectors are reporting within normal risk thresholds."

    elif intent == "AVAILABLE_AMBULANCES":
        if isinstance(ctx, list) and len(ctx) > 0:
            answer = (
                f"There are currently {len(ctx)} emergency medical ambulance(s) available for immediate dispatch:\n"
                + "\n".join(
                    [
                        f"• {item.get('name')} (#{item.get('id')}) - {item.get('status')} at {item.get('location')}"
                        for item in ctx
                    ]
                )
            )
        else:
            answer = "Warning: No medical ambulances or transport vehicles are currently flagged as AVAILABLE. Mutual aid or private ambulance staging is advised."

    elif intent == "DELAYED_INCIDENTS":
        if isinstance(ctx, list) and len(ctx) > 0:
            answer = (
                f"ALERT: {len(ctx)} incident response(s) are experiencing transit delays:\n"
                + "\n".join(
                    [
                        f"• #{item.get('id')} ({item.get('title')}): Transit delayed by +{item.get('delayMinutes', 6)} min at {item.get('location')}. Rerouting suggested."
                        for item in ctx
                    ]
                )
            )
        else:
            answer = "All dispatched emergency response units are currently operating within expected transit SLAs. Zero transit bottlenecks reported."

    elif intent == "HOSPITAL_CAPACITY":
        if isinstance(ctx, list) and len(ctx) > 0:
            total_beds = sum(h.get("availableBeds", 0) for h in ctx)
            diverting = [h for h in ctx if h.get("divertStatus")]
            answer = (
                f"TRAUMA & HOSPITAL CAPACITY:\n"
                f"• Total Available Beds: {total_beds} across {len(ctx)} monitored medical facilities.\n"
                f"• Divert Status: {f'{len(diverting)} facility/facilities on divert' if diverting else 'All trauma centers accepting casualties.'}\n"
                + "\n".join(
                    [
                        f"• {h.get('name')}: {h.get('availableBeds')}/{h.get('totalBeds')} beds available. Divert: {'YES' if h.get('divertStatus') else 'NO'}"
                        for h in ctx
                    ]
                )
            )
        else:
            answer = "Hospital capacity data is currently synchronized and awaiting local trauma updates."

    elif intent == "ESCALATION_STATUS":
        if isinstance(ctx, list) and len(ctx) > 0:
            answer = (
                f"COMMAND ESCALATIONS ACTIVE ({len(ctx)} alerts):\n"
                + "\n".join(
                    [
                        f"• Level {e.get('level')} on #{e.get('incidentId')}: {e.get('reason')} [Target: {e.get('targetRole')}, Status: {e.get('status')}]"
                        for e in ctx
                    ]
                )
            )
        else:
            answer = "No active command escalations are currently pending. All incident responses are proceeding within standard operational parameters."

    else:
        answer = (
            f"Telemetry acknowledged for query: '{payload.message}'. "
            f"Response AI operational decision-support recommends monitoring active P1 hazards and mutual-aid staging."
        )

    return ChatCommandResponse(
        answer=answer,
        intent=intent,
        generatedAt=now_iso,
    )
