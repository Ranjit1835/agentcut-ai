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

        # Build timestamped transcript so Claude can set accurate start/end times
        word_ts = state.get("word_timestamps", [])
        timestamped_lines: list[str] = []
        if word_ts:
            # Group words into ~10-second blocks with timestamps
            block_start = 0.0
            block_words: list[str] = []
            for w in word_ts:
                if w["start"] - block_start > 10.0 and block_words:
                    timestamped_lines.append(
                        f"[{block_start:.1f}s] {' '.join(block_words)}"
                    )
                    block_start = w["start"]
                    block_words = []
                block_words.append(w["word"])
            if block_words:
                timestamped_lines.append(
                    f"[{block_start:.1f}s] {' '.join(block_words)}"
                )
            transcript_text = "\n".join(timestamped_lines)
        else:
            transcript_text = transcript

        # Use up to 60k chars to avoid cutting off important content
        transcript_text = transcript_text[:60000]

        detected_lang = state.get("detected_language", "en")
        user_message = f"""Analyze this transcript and find the top {target_count} viral clip candidates.

Video duration: {duration:.1f} seconds
Clip length: {min_dur}-{max_dur} seconds
Detected language: {detected_lang}
{f'Creator instructions: {custom}' if custom else ''}

IMPORTANT: Use the [Xs] timestamps in the transcript to set accurate start_time and end_time for each clip. Each clip MUST have a strong opening hook — if you can't identify a clear hook, skip that clip.

TIMESTAMPED TRANSCRIPT:
{transcript_text}"""

        result = await call_claude_json(
            system_prompt=STORY_SYSTEM_PROMPT,
            user_message=user_message,
            model="claude-sonnet-4-6",
            max_tokens=8192,
            temperature=0.4,
        )

        clips = result.get("clips", [])

        if not clips:
            logger.warning("story_no_clips_found", project_id=state.get("project_id"))
            raise ValueError(
                "Story agent found 0 clips. The transcript may be too short, "
                "lack compelling content, or the model failed to identify hooks. "
                f"Transcript length: {len(transcript)} chars, duration: {duration:.0f}s"
            )

        # Validate and fix clip timestamps
        valid_clips: list[dict[str, Any]] = []
        for i, clip in enumerate(clips):
            start = clip.get("start_time", 0)
            end = clip.get("end_time", 0)
            hook = clip.get("hook_text", "").strip()

            # Skip clips with missing/invalid data
            if end <= start:
                logger.warning("story_skip_invalid_clip", clip_index=i, start=start, end=end)
                continue
            if not hook:
                logger.warning("story_skip_no_hook", clip_index=i, title=clip.get("title"))
                continue
            # Clamp to video duration
            if duration and end > duration:
                clip["end_time"] = duration
            if duration and start > duration:
                continue

            clip["clip_index"] = len(valid_clips)
            clip["id"] = f"clip_{len(valid_clips)}"
            clip.setdefault("render_status", "pending")
            valid_clips.append(clip)

        if not valid_clips:
            raise ValueError("Story agent found clips but all had invalid timestamps or missing hooks")

        # Sort by virality score
        valid_clips.sort(key=lambda c: c.get("virality_score", 0), reverse=True)

        logger.info(
            "story_clips_found",
            total_candidates=len(clips),
            valid_clips=len(valid_clips),
            top_score=valid_clips[0].get("virality_score", 0) if valid_clips else 0,
        )

        return {
            "clip_candidates": valid_clips,
            "selected_clips": valid_clips[:target_count],
            "content_summary": result.get("content_summary", ""),
            "main_topics": result.get("main_topics", []),
            "sentiment_overall": result.get("sentiment_overall", "neutral"),
            "current_stage": "selecting_clips",
            "_confidence": 0.88,
        }


story_agent = StoryAgent()
