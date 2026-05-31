"""Agent 7 — B-ROLL: Pexels API integration for contextual visual suggestions."""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.claude_client import call_claude_json

logger = structlog.get_logger(__name__)

BROLL_SYSTEM_PROMPT = """You are a B-roll suggestion engine for short-form video editing.
Given a clip's transcript and context, suggest 2-4 relevant B-roll search terms
that would enhance the visual storytelling.

Return this JSON:
{
  "suggestions": [
    {
      "search_query": "business meeting handshake",
      "timing": {"start": 5.0, "end": 8.0},
      "context": "When speaker mentions closing deals"
    }
  ]
}

Rules:
- Suggest specific, cinematic search terms (not generic)
- Each B-roll should be 2-5 seconds
- Don't cover the speaker for more than 30% of the clip
- Prefer dynamic, visually interesting footage"""


class BrollAgent(BaseAgent):
    name = AgentName.INGESTION  # B-roll uses ingestion name slot

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        selected_clips = state.get("selected_clips", [])

        if not selected_clips:
            raise ValueError("No clips for B-roll suggestions")

        updated_clips = []

        for clip in selected_clips:
            clip_copy = dict(clip)

            # Get B-roll suggestions from Claude
            suggestions = await self._get_suggestions(clip_copy)

            # Search Pexels for each suggestion
            broll_results = []
            for suggestion in suggestions:
                videos = await self._search_pexels(suggestion["search_query"])
                if videos:
                    broll_results.append({
                        **suggestion,
                        "pexels_results": videos[:3],
                    })

            clip_copy["broll_suggestions"] = broll_results
            updated_clips.append(clip_copy)

        return {
            "selected_clips": updated_clips,
            "_confidence": 0.80,
        }

    async def _get_suggestions(self, clip: dict[str, Any]) -> list[dict[str, Any]]:
        """Get B-roll search term suggestions from Claude."""
        result = await call_claude_json(
            system_prompt=BROLL_SYSTEM_PROMPT,
            user_message=f"""Clip title: {clip.get('title', '')}
Hook: {clip.get('hook_text', '')}
Narrative: {clip.get('narrative_summary', '')}
Duration: {clip.get('end_time', 0) - clip.get('start_time', 0):.1f}s""",
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
        )
        return result.get("suggestions", [])

    async def _search_pexels(self, query: str, per_page: int = 5) -> list[dict[str, str]]:
        """Search Pexels API for B-roll videos."""
        import os
        api_key = os.environ.get("PEXELS_API_KEY", "")
        if not api_key:
            logger.warning("pexels_api_key_missing")
            return []

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.pexels.com/videos/search",
                params={"query": query, "per_page": per_page, "orientation": "portrait"},
                headers={"Authorization": api_key},
                timeout=10.0,
            )

            if response.status_code != 200:
                logger.warning("pexels_search_failed", status=response.status_code)
                return []

            data = response.json()
            return [
                {
                    "id": str(v["id"]),
                    "url": v["url"],
                    "image": v.get("image", ""),
                    "duration": v.get("duration", 0),
                }
                for v in data.get("videos", [])
            ]


broll_agent = BrollAgent()
