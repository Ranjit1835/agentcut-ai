"""Agent 8 — QUALITY: Retention prediction, hook scoring, pacing analysis, approval gate."""

from __future__ import annotations

from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.claude_client import call_claude_json

logger = structlog.get_logger(__name__)

QUALITY_SYSTEM_PROMPT = """You are a senior viral content quality analyst. You evaluate short-form video clips
for their likelihood of going viral and retaining viewers.

For each clip, assess:
1. HOOK SCORE (0-100): How strong is the opening 3 seconds?
2. PACING SCORE (0-100): Is the rhythm engaging? Too slow? Too fast?
3. CAPTION READABILITY (0-100): Are captions clear and well-timed?
4. RETENTION PREDICTION (0-100): What % of viewers would watch to the end?
5. OVERALL QUALITY (0-100): Weighted average — this determines if clip passes QA

Approval threshold: clips scoring >= 70 overall proceed to render.
Clips scoring < 70 get flagged with specific improvement recommendations.

Return this JSON:
{
  "evaluations": [
    {
      "clip_id": "clip_0",
      "hook_score": 85,
      "pacing_score": 78,
      "caption_readability": 90,
      "retention_prediction": 82,
      "overall_quality": 84,
      "approved": true,
      "recommendations": [],
      "retention_curve": [100, 95, 88, 82, 80, 78, 76, 75, 74, 73]
    }
  ]
}

The retention_curve is a 10-point array showing predicted % of viewers remaining at each 10% interval of the clip.
Recommendations should be specific and actionable."""


class QualityAgent(BaseAgent):
    name = AgentName.QUALITY

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        selected_clips = state.get("selected_clips", [])
        caption_data = state.get("caption_segments_by_clip", {})

        if not selected_clips:
            raise ValueError("No clips to evaluate")

        # Build evaluation request
        clips_info = []
        for clip in selected_clips:
            clip_id = clip.get("id", f"clip_{clip['clip_index']}")
            captions = caption_data.get(clip_id, [])
            clips_info.append({
                "clip_id": clip_id,
                "title": clip.get("title", ""),
                "hook_text": clip.get("hook_text", ""),
                "narrative_summary": clip.get("narrative_summary", ""),
                "duration": clip.get("end_time", 0) - clip.get("start_time", 0),
                "virality_score": clip.get("virality_score", 0),
                "emotional_arc": clip.get("emotional_arc", ""),
                "caption_count": len(captions),
                "has_effects": bool(clip.get("effects")),
                "has_broll": bool(clip.get("broll_suggestions")),
            })

        result = await call_claude_json(
            system_prompt=QUALITY_SYSTEM_PROMPT,
            user_message=f"Evaluate these {len(clips_info)} clips:\n\n{clips_info}",
            model="claude-sonnet-4-6",
            max_tokens=4096,
            temperature=0.2,
        )

        evaluations = {e["clip_id"]: e for e in result.get("evaluations", [])}

        # Update clips with quality scores and filter approved ones
        updated_clips = []
        for clip in selected_clips:
            clip_id = clip.get("id", f"clip_{clip['clip_index']}")
            clip_copy = dict(clip)

            if clip_id in evaluations:
                eval_data = evaluations[clip_id]
                clip_copy["quality_scores"] = {
                    "hook_score": eval_data.get("hook_score", 0),
                    "pacing_score": eval_data.get("pacing_score", 0),
                    "caption_readability": eval_data.get("caption_readability", 0),
                    "retention_prediction": eval_data.get("retention_prediction", 0),
                    "overall_quality": eval_data.get("overall_quality", 0),
                }
                clip_copy["approved"] = eval_data.get("approved", False)
                clip_copy["quality_recommendations"] = eval_data.get("recommendations", [])
                clip_copy["retention_curve"] = eval_data.get("retention_curve", [])

            updated_clips.append(clip_copy)

        approved_count = sum(1 for c in updated_clips if c.get("approved", False))
        avg_quality = sum(
            c.get("quality_scores", {}).get("overall_quality", 0) for c in updated_clips
        ) / max(len(updated_clips), 1)

        should_retry = approved_count == 0 and len(updated_clips) > 0

        return {
            "selected_clips": updated_clips,
            "current_stage": "rendering" if not should_retry else "analyzing",
            "should_retry": should_retry,
            "_confidence": round(avg_quality / 100, 2),
        }


quality_agent = QualityAgent()
