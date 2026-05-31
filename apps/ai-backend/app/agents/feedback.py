"""Agent 10 — FEEDBACK: Parse natural language feedback and re-run affected agents."""

from __future__ import annotations

from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.claude_client import call_claude_json

logger = structlog.get_logger(__name__)

FEEDBACK_SYSTEM_PROMPT = """You are the AgentCut AI feedback interpreter. Users give natural language feedback
about their generated video clips, and you determine which agents need to be re-run.

The 10 agents in the pipeline are:
1. ingest — Downloads and processes source video
2. transcript — Speech-to-text with word timestamps
3. story — Identifies viral moments and selects clips
4. cut — Removes silences and filler words
5. caption — Generates styled captions
6. effects — Face detection, zoom, transitions, overlays
7. broll — B-roll video suggestions from Pexels
8. quality — Quality scoring and approval gate
9. render — Final 9:16 rendering with subtitles
10. feedback — This agent (you)

For each feedback input, determine:
1. What specific changes the user wants
2. Which agents need to re-run to implement those changes
3. Any parameter modifications for those agents

Return this JSON:
{
  "parsed_actions": [
    {
      "action": "Description of what to change",
      "parameter_changes": {"key": "value"},
      "reason": "Why this addresses the feedback"
    }
  ],
  "agents_to_rerun": ["caption", "render"],
  "priority": "high",
  "response_message": "Natural language response to the user explaining what will change"
}

Common mappings:
- "faster cuts" / "more dynamic" → cut agent (reduce silence threshold)
- "bigger captions" / "larger text" → caption agent (increase font size)
- "more zooms" / "more movement" → effects agent (add zoom points)
- "different style" → caption + effects + render
- "shorter clips" → story + cut (adjust duration params)
- "remove clip X" → just filter, no agent rerun needed
- "change hook" / "different opening" → story agent
- "add b-roll" → broll agent
- "improve quality" → quality + story (re-analyze)"""


class FeedbackAgent(BaseAgent):
    name = AgentName.FEEDBACK

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        # Feedback input comes from the state or is passed directly
        feedback_input = state.get("custom_instructions", "")

        if not feedback_input:
            return {"_confidence": 1.0}

        selected_clips = state.get("selected_clips", [])
        style = state.get("style_preset", "mrbeast")

        # Build context for Claude
        clip_summaries = []
        for clip in selected_clips:
            clip_summaries.append({
                "id": clip.get("id"),
                "title": clip.get("title"),
                "duration": clip.get("end_time", 0) - clip.get("start_time", 0),
                "virality_score": clip.get("virality_score"),
                "quality_scores": clip.get("quality_scores", {}),
            })

        result = await call_claude_json(
            system_prompt=FEEDBACK_SYSTEM_PROMPT,
            user_message=f"""User feedback: "{feedback_input}"

Current style: {style}
Current clips: {clip_summaries}

Determine which agents need to re-run and what parameters to change.""",
            model="claude-sonnet-4-6",
            max_tokens=2048,
            temperature=0.3,
        )

        agents_to_rerun = result.get("agents_to_rerun", [])
        parsed_actions = result.get("parsed_actions", [])
        response_message = result.get("response_message", "Processing your feedback...")

        # Apply parameter changes to state
        updates: dict[str, Any] = {
            "_confidence": 0.90,
        }

        # Map parameter changes
        for action in parsed_actions:
            params = action.get("parameter_changes", {})

            if "silence_threshold" in params:
                # Will be used by cut agent on rerun
                pass
            if "font_size" in params:
                # Will affect caption generation
                pass
            if "style_preset" in params:
                updates["style_preset"] = params["style_preset"]
            if "max_clip_duration" in params:
                updates["max_clip_duration"] = float(params["max_clip_duration"])
            if "min_clip_duration" in params:
                updates["min_clip_duration"] = float(params["min_clip_duration"])

        # Store feedback event data (to be persisted by the API layer)
        updates["_feedback_result"] = {
            "agents_to_rerun": agents_to_rerun,
            "parsed_actions": parsed_actions,
            "response_message": response_message,
        }

        return updates


feedback_agent = FeedbackAgent()
