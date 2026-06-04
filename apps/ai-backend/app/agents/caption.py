"""Agent 5 — CAPTION: Generate styled captions with word-by-word reveal."""

from __future__ import annotations

import json
from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.claude_client import call_claude_json

logger = structlog.get_logger(__name__)

CAPTION_SYSTEM_PROMPT = """You are a professional caption stylist for short-form viral videos.
Your job is to take transcript segments and produce engaging, styled captions.

You must:
1. Break text into 2-4 word chunks for word-by-word reveal
2. Identify words to EMPHASIZE (key emotions, numbers, important concepts)
3. Suggest emoji placement (sparingly, max 3 per clip)
4. Match the requested style preset

Style presets:
- mrbeast: Bold yellow text, black outline, ALL CAPS for emphasis, high energy
- hormozi: Clean white box highlight on key words, professional
- podcast: Minimal white text, center-bottom, clean serif feel
- storytelling: Elegant serif, subtle animations, warm tone
- educational: Highlight key terms, use brackets for definitions

Return this JSON:
{
  "segments": [
    {
      "index": 0,
      "start": 0.0,
      "end": 2.5,
      "text": "This is the caption text",
      "emphasized_words": ["caption"],
      "emotion": "excitement"
    }
  ]
}

Rules:
- Each segment should be 1-4 seconds
- Max 8-10 words per segment
- Emphasized words should be genuinely important, not random
- Emotions: excitement, surprise, humor, serious, question, revelation"""


class CaptionAgent(BaseAgent):
    name = AgentName.CAPTION

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        selected_clips = state.get("selected_clips", [])
        word_timestamps = state.get("word_timestamps", [])
        style = state.get("style_preset", "mrbeast")

        if not selected_clips:
            raise ValueError("No clips to caption")

        caption_segments_by_clip: dict[str, list[dict[str, Any]]] = {}

        for clip in selected_clips:
            clip_id = clip.get("id", f"clip_{clip.get('clip_index', 0)}")
            start = clip.get("start_time", 0)
            end = clip.get("end_time", 0)

            if end <= start:
                logger.warning("caption_skip_invalid_clip", clip_id=clip_id)
                continue

            # Get words within this clip's timeframe
            clip_words = [
                w for w in word_timestamps
                if w["start"] >= start and w["end"] <= end
            ]

            if not clip_words:
                # Fall back to generating captions from hook/title text
                logger.warning("caption_no_words_for_clip", clip_id=clip_id, start=start, end=end)
                hook = clip.get("hook_text", clip.get("title", ""))
                if hook:
                    # Create a single caption segment from the hook
                    caption_segments_by_clip[clip_id] = [{
                        "index": 0,
                        "start": 0.0,
                        "end": min(3.0, end - start),
                        "text": hook,
                        "emphasized_words": [],
                        "emotion": "neutral",
                    }]
                continue

            clip_text = " ".join(w["word"] for w in clip_words)

            # Make word timestamps relative to clip start for cleaner prompt
            relative_words = [
                {"word": w["word"], "start": round(w["start"] - start, 3), "end": round(w["end"] - start, 3)}
                for w in clip_words
            ]

            try:
                result = await call_claude_json(
                    system_prompt=CAPTION_SYSTEM_PROMPT,
                    user_message=f"""Style preset: {style}
Clip title: {clip.get('title', '')}
Hook: {clip.get('hook_text', '')}
Duration: {end - start:.1f}s

Word timestamps (relative to clip start):
{json.dumps(relative_words[:200], indent=2)}

Full clip text:
{clip_text[:3000]}""",
                    model="claude-haiku-4-5-20251001",
                    max_tokens=4096,
                    temperature=0.3,
                )

                segments = result.get("segments", [])

                # Validate and clamp segment timestamps
                clip_duration = end - start
                valid_segments = []
                for seg in segments:
                    seg_start = max(0, round(seg.get("start", 0), 3))
                    seg_end = min(clip_duration, round(seg.get("end", 0), 3))
                    if seg_end > seg_start and seg.get("text", "").strip():
                        seg["start"] = seg_start
                        seg["end"] = seg_end
                        valid_segments.append(seg)

                caption_segments_by_clip[clip_id] = valid_segments

            except Exception as e:
                logger.error("caption_failed_for_clip", clip_id=clip_id, error=str(e))
                # Don't fail the whole pipeline — skip this clip's captions
                continue

        logger.info(
            "caption_complete",
            clips_captioned=len(caption_segments_by_clip),
            total_segments=sum(len(s) for s in caption_segments_by_clip.values()),
        )

        return {
            "caption_segments_by_clip": caption_segments_by_clip,
            "current_stage": "effects",
            "_confidence": 0.90,
        }


caption_agent = CaptionAgent()
