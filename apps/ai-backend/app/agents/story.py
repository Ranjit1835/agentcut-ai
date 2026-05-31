"""Agent 3 — STORY: Identify hooks, emotional peaks, and viral clip candidates."""

from __future__ import annotations

import json
from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.claude_client import call_claude_json

logger = structlog.get_logger(__name__)

STORY_SYSTEM_PROMPT = """You are an expert viral content analyst specializing in short-form video.
Your job is to analyze a video transcript and identify the best 30-90 second clips that would go viral on TikTok, YouTube Shorts, and Instagram Reels.

For each clip, you must identify:
1. A strong HOOK — the opening line/moment that stops the scroll
2. EMOTIONAL PEAKS — moments of surprise, humor, insight, or tension
3. PATTERN INTERRUPTS — unexpected turns that keep viewers watching
4. QUOTABLE MOMENTS — lines people would share or screenshot
5. NARRATIVE ARC — a clear beginning, middle, and payoff within the clip

Score each clip 0-100 on VIRALITY based on:
- Hook strength (0-25): How scroll-stopping is the opening?
- Emotional resonance (0-25): Does it make people feel something?
- Shareability (0-25): Would people tag a friend or share this?
- Completion rate prediction (0-25): Will viewers watch to the end?

Return EXACTLY this JSON structure:
{
  "clips": [
    {
      "clip_index": 0,
      "title": "Short catchy title for the clip",
      "start_time": 120.5,
      "end_time": 175.0,
      "virality_score": 85,
      "hook_text": "The exact opening line that hooks viewers",
      "narrative_summary": "Why this clip works — the story arc",
      "emotional_arc": "curiosity → tension → revelation → payoff",
      "target_audience": "entrepreneurs, self-improvement",
      "key_moments": ["125.0 - surprising reveal", "150.0 - emotional peak"],
      "hashtag_suggestions": ["#mindset", "#entrepreneur"]
    }
  ],
  "content_summary": "Overall summary of the video content",
  "main_topics": ["topic1", "topic2"],
  "sentiment_overall": "positive"
}

Rules:
- Return 3-10 clips, sorted by virality_score descending
- Each clip must be 15-90 seconds
- Clips should not overlap by more than 5 seconds
- Every clip needs a genuine hook, not filler
- Be ruthless — only include clips that would actually perform"""


class StoryAgent(BaseAgent):
    name = AgentName.ANALYSIS

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        transcript = state.get("full_transcript", "")
        if not transcript:
            raise ValueError("No transcript available — transcription must run first")

        duration = state.get("video_duration_seconds", 0)
        target_count = state.get("target_clip_count", 5)
        min_dur = state.get("min_clip_duration", 15.0)
        max_dur = state.get("max_clip_duration", 90.0)
        custom = state.get("custom_instructions", "")

        user_message = f"""Analyze this transcript and find the top {target_count} viral clip candidates.

Video duration: {duration:.1f} seconds
Clip length: {min_dur}-{max_dur} seconds
{f'Creator instructions: {custom}' if custom else ''}

TRANSCRIPT:
{transcript[:30000]}"""

        result = await call_claude_json(
            system_prompt=STORY_SYSTEM_PROMPT,
            user_message=user_message,
            model="claude-sonnet-4-6",
            max_tokens=8192,
            temperature=0.4,
        )

        clips = result.get("clips", [])

        # Ensure proper clip_index
        for i, clip in enumerate(clips):
            clip["clip_index"] = i
            clip["id"] = f"clip_{i}"
            clip.setdefault("render_status", "pending")

        # Sort by virality score
        clips.sort(key=lambda c: c.get("virality_score", 0), reverse=True)

        return {
            "clip_candidates": clips,
            "selected_clips": clips[:target_count],
            "content_summary": result.get("content_summary", ""),
            "main_topics": result.get("main_topics", []),
            "sentiment_overall": result.get("sentiment_overall", "neutral"),
            "current_stage": "selecting_clips",
            "_confidence": 0.88,
        }


story_agent = StoryAgent()
