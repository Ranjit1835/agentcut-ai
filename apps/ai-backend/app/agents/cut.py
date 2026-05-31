"""Agent 4 — CUT: Remove silences, filler words, false starts. Generate clean timeline."""

from __future__ import annotations

from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName

logger = structlog.get_logger(__name__)


class CutAgent(BaseAgent):
    name = AgentName.CLIP_SELECTOR

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        selected_clips = state.get("selected_clips", [])
        silences = state.get("silences", [])
        filler_words = state.get("filler_words", [])

        if not selected_clips:
            raise ValueError("No clips selected — story agent must run first")

        updated_clips = []

        for clip in selected_clips:
            start = clip["start_time"]
            end = clip["end_time"]

            # Find silences within this clip (>0.4s)
            clip_silences = [
                s for s in silences
                if s["start"] >= start and s["end"] <= end and s["duration"] > 0.4
            ]

            # Find filler words within this clip
            clip_fillers = [
                f for f in filler_words
                if f["start"] >= start and f["end"] <= end
            ]

            # Calculate time saved by removing silences and fillers
            silence_time = sum(s["duration"] for s in clip_silences)
            filler_time = sum(f["end"] - f["start"] for f in clip_fillers)
            total_removed = silence_time + filler_time

            # Build cut timeline: segments to KEEP
            cut_timeline = self._build_cut_timeline(
                start, end, clip_silences, clip_fillers
            )

            clip_copy = dict(clip)
            clip_copy["cut_timeline"] = cut_timeline
            clip_copy["silences_removed"] = len(clip_silences)
            clip_copy["fillers_removed"] = len(clip_fillers)
            clip_copy["time_saved_seconds"] = round(total_removed, 2)
            clip_copy["effective_duration"] = round(end - start - total_removed, 2)

            updated_clips.append(clip_copy)

        return {
            "selected_clips": updated_clips,
            "current_stage": "captioning",
            "_confidence": 0.94,
        }

    def _build_cut_timeline(
        self,
        start: float,
        end: float,
        silences: list[dict[str, Any]],
        fillers: list[dict[str, Any]],
    ) -> list[dict[str, float]]:
        """Build a list of segments to KEEP, removing silences and fillers."""
        # Merge all removal segments
        removals: list[tuple[float, float]] = []

        for s in silences:
            removals.append((s["start"], s["end"]))
        for f in fillers:
            removals.append((f["start"], f["end"]))

        # Sort and merge overlapping removals
        removals.sort(key=lambda x: x[0])
        merged: list[tuple[float, float]] = []
        for r_start, r_end in removals:
            if merged and r_start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], r_end))
            else:
                merged.append((r_start, r_end))

        # Build keep segments
        keep_segments: list[dict[str, float]] = []
        current = start

        for r_start, r_end in merged:
            if current < r_start:
                keep_segments.append({"start": round(current, 3), "end": round(r_start, 3)})
            current = r_end

        if current < end:
            keep_segments.append({"start": round(current, 3), "end": round(end, 3)})

        return keep_segments


cut_agent = CutAgent()
