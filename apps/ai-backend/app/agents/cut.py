"""Agent 4 — CUT: Remove silences, filler words, false starts. Generate clean timeline."""

from __future__ import annotations

from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName

logger = structlog.get_logger(__name__)

# Minimum effective clip duration after cuts (seconds)
MIN_EFFECTIVE_DURATION = 5.0


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
            start = clip.get("start_time", 0)
            end = clip.get("end_time", 0)

            if end <= start:
                logger.warning("cut_skip_invalid_clip", clip_id=clip.get("id"), start=start, end=end)
                continue

            # Find silences within this clip (>0.4s)
            clip_silences = [
                s for s in silences
                if s["start"] >= start and s["end"] <= end and s.get("duration", 0) > 0.4
            ]

            # Find filler words within this clip
            clip_fillers = [
                f for f in filler_words
                if f["start"] >= start and f["end"] <= end
            ]

            # Calculate time saved by removing silences and fillers
            silence_time = sum(s.get("duration", s["end"] - s["start"]) for s in clip_silences)
            filler_time = sum(f["end"] - f["start"] for f in clip_fillers)
            total_removed = silence_time + filler_time

            # Don't over-cut — if we'd remove >60% of the clip, reduce aggressiveness
            raw_duration = end - start
            if total_removed > raw_duration * 0.6:
                logger.warning(
                    "cut_too_aggressive",
                    clip_id=clip.get("id"),
                    would_remove_pct=round(total_removed / raw_duration * 100),
                )
                # Only remove long silences (>1s) to preserve flow
                clip_silences = [s for s in clip_silences if s.get("duration", 0) > 1.0]
                clip_fillers = []
                silence_time = sum(s.get("duration", s["end"] - s["start"]) for s in clip_silences)
                filler_time = 0
                total_removed = silence_time

            effective_duration = round(raw_duration - total_removed, 2)
            if effective_duration < MIN_EFFECTIVE_DURATION:
                logger.warning("cut_clip_too_short_after_cuts", clip_id=clip.get("id"), effective=effective_duration)
                # Skip cuts, keep original
                clip_silences = []
                clip_fillers = []
                total_removed = 0
                effective_duration = round(raw_duration, 2)

            # Build cut timeline: segments to KEEP
            cut_timeline = self._build_cut_timeline(
                start, end, clip_silences, clip_fillers
            )

            clip_copy = dict(clip)
            clip_copy["cut_timeline"] = cut_timeline
            clip_copy["silences_removed"] = len(clip_silences)
            clip_copy["fillers_removed"] = len(clip_fillers)
            clip_copy["time_saved_seconds"] = round(total_removed, 2)
            clip_copy["effective_duration"] = effective_duration

            updated_clips.append(clip_copy)

        if not updated_clips:
            raise ValueError("All clips were invalid after cut processing")

        logger.info(
            "cut_complete",
            clips_processed=len(updated_clips),
            total_time_saved=round(sum(c["time_saved_seconds"] for c in updated_clips), 1),
        )

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
