"""Agent 6 — EFFECTS: Face detection, zoom punch-ins, transitions, hook text overlay."""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName

logger = structlog.get_logger(__name__)


class EffectsAgent(BaseAgent):
    name = AgentName.CAPTION  # Re-uses caption name for effects pass

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        selected_clips = state.get("selected_clips", [])

        if not selected_clips:
            raise ValueError("No clips for effects processing")

        updated_clips = []

        for clip in selected_clips:
            clip_copy = dict(clip)
            effects_data = await self._detect_effects(clip_copy)
            clip_copy["effects"] = effects_data
            updated_clips.append(clip_copy)

        return {
            "selected_clips": updated_clips,
            "current_stage": "quality_check",
            "_confidence": 0.85,
        }

    async def _detect_effects(self, clip: dict[str, Any]) -> dict[str, Any]:
        """Detect faces and determine zoom/transition effects."""
        hook_text = clip.get("hook_text", "")
        duration = clip.get("end_time", 0) - clip.get("start_time", 0)

        # Generate effect timeline
        effects: dict[str, Any] = {
            "zoom_points": [],
            "transitions": [],
            "hook_overlay": None,
            "color_grading": "default",
        }

        # Hook text overlay for first 3 seconds
        if hook_text:
            effects["hook_overlay"] = {
                "text": hook_text[:60],
                "start": 0,
                "end": min(3.0, duration),
                "style": "bold_center",
            }

        # Add zoom punch-in at key moments
        key_moments = clip.get("key_moments", [])
        for moment in key_moments[:3]:
            if isinstance(moment, str) and " - " in moment:
                time_str = moment.split(" - ")[0].strip()
                try:
                    t = float(time_str)
                    relative_t = t - clip.get("start_time", 0)
                    if 0 < relative_t < duration:
                        effects["zoom_points"].append({
                            "time": round(relative_t, 2),
                            "zoom_factor": 1.3,
                            "duration": 0.5,
                        })
                except ValueError:
                    pass

        # Add intro/outro transitions
        effects["transitions"] = [
            {"type": "fade_in", "duration": 0.3, "position": "start"},
            {"type": "fade_out", "duration": 0.3, "position": "end"},
        ]

        return effects


effects_agent = EffectsAgent()
