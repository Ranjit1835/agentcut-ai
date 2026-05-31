"""Feedback API — Conversational re-editing (Agent 10)."""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)
router = APIRouter()


class FeedbackRequest(BaseModel):
    project_id: str
    clip_id: str | None = None
    user_input: str = Field(..., min_length=1, max_length=2000)


class FeedbackResponse(BaseModel):
    id: str
    status: str
    response_message: str
    agents_to_rerun: list[str]
    parsed_actions: list[dict[str, Any]]


@router.post("/", response_model=FeedbackResponse)
async def submit_feedback(req: FeedbackRequest) -> dict[str, Any]:
    """Submit natural language feedback to re-edit clips."""
    from app.agents.feedback import feedback_agent

    logger.info("feedback_received", project_id=req.project_id, input=req.user_input[:100])

    # The feedback agent will parse the input and determine which agents to rerun
    state = {
        "project_id": req.project_id,
        "custom_instructions": req.user_input,
        "selected_clips": [],
        "style_preset": "mrbeast",
    }

    result = await feedback_agent.run(state)
    feedback_result = result.get("_feedback_result", {})

    return {
        "id": "fb_" + req.project_id[:8],
        "status": "processing",
        "response_message": feedback_result.get("response_message", "Processing your feedback..."),
        "agents_to_rerun": feedback_result.get("agents_to_rerun", []),
        "parsed_actions": feedback_result.get("parsed_actions", []),
    }
