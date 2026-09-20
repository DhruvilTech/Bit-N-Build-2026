"""FastAPI Router for AI Emergency Summary and Operational Command Assistant."""

from fastapi import APIRouter, status
from app.schemas.assistant import (
    IncidentSummaryRequest,
    IncidentSummaryResponse,
    ChatCommandRequest,
    ChatCommandResponse,
)
from app.services.mistral_service import MistralService
from app.utils.logger import logger

router = APIRouter(prefix="/api/v1", tags=["AI Operational Assistant"])


@router.post(
    "/incident-summary",
    response_model=IncidentSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a structured 6-section emergency operational summary via Mistral LLM",
)
async def generate_incident_summary(payload: IncidentSummaryRequest):
    """
    Synthesizes a rich, tactical 6-section briefing using Mistral LLM grounded in scoped telemetry.
    Decision-support only: strictly read-only, makes no state modifications.
    """
    logger.info(f"[FastAPI] Generating AI incident summary for #{payload.incident.id} via MistralService...")
    summary_data = await MistralService.generate_incident_summary(payload.model_dump())
    return IncidentSummaryResponse(**summary_data)


@router.post(
    "/chat",
    response_model=ChatCommandResponse,
    status_code=status.HTTP_200_OK,
    summary="Answer operational command questions using Mistral LLM and minimal scoped context",
)
async def process_command_chat(payload: ChatCommandRequest):
    """
    Answers command questions conversationally using Mistral LLM grounded in real-time operational context.
    """
    intent = payload.intent or "GENERAL_OPERATIONAL_QUERY"
    logger.info(f"[FastAPI] Processing command chat (intent: {intent}) via MistralService...")
    
    answer = await MistralService.chat_command(
        message=payload.message,
        intent=intent,
        context=payload.context,
        history=payload.history or [],
    )

    from datetime import datetime, timezone
    return ChatCommandResponse(
        answer=answer,
        intent=intent,
        generatedAt=datetime.now(timezone.utc).isoformat(),
    )
