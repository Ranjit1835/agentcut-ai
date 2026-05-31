"""Inngest job handler for video processing pipeline."""

from __future__ import annotations

from typing import Any

import structlog

logger = structlog.get_logger(__name__)


async def handle_process_video(event_data: dict[str, Any]) -> dict[str, Any]:
    """
    Inngest handler: runs the full LangGraph pipeline for a project.

    Triggered when a user submits a video for processing.
    The pipeline runs asynchronously and emits WebSocket progress events.
    """
    project_id = event_data.get("project_id", "")
    user_id = event_data.get("user_id", "")
    source_url = event_data.get("source_url")
    upload_r2_key = event_data.get("upload_r2_key")
    style_preset = event_data.get("style_preset", "mrbeast")

    logger.info("inngest_process_video_start", project_id=project_id)

    from app.graph.workflow import main_graph

    initial_state = {
        "project_id": project_id,
        "user_id": user_id,
        "source_url": source_url,
        "upload_r2_key": upload_r2_key,
        "source_type": "youtube" if source_url else "upload",
        "style_preset": style_preset,
        "target_clip_count": event_data.get("target_clip_count", 5),
        "min_clip_duration": event_data.get("min_clip_duration", 15.0),
        "max_clip_duration": event_data.get("max_clip_duration", 90.0),
        "custom_instructions": event_data.get("custom_instructions"),
        "word_timestamps": [],
        "speaker_segments": [],
        "filler_words": [],
        "silences": [],
        "clip_candidates": [],
        "selected_clips": [],
        "agent_results": [],
        "current_stage": "ingesting",
        "should_retry": False,
        "credits_consumed": 0,
    }

    try:
        final_state = await main_graph.ainvoke(initial_state)

        logger.info(
            "inngest_process_video_complete",
            project_id=project_id,
            clips=len(final_state.get("selected_clips", [])),
            stage=final_state.get("current_stage"),
        )

        return {
            "status": "complete",
            "project_id": project_id,
            "clips_count": len(final_state.get("selected_clips", [])),
        }

    except Exception as e:
        logger.error("inngest_process_video_failed", project_id=project_id, error=str(e))
        raise


async def handle_process_feedback(event_data: dict[str, Any]) -> dict[str, Any]:
    """
    Inngest handler: runs the feedback sub-workflow.

    Triggered when a user submits natural language feedback.
    Only re-runs affected agents.
    """
    project_id = event_data.get("project_id", "")
    feedback_input = event_data.get("user_input", "")

    logger.info("inngest_process_feedback_start", project_id=project_id)

    from app.graph.workflow import feedback_graph

    state = {
        "project_id": project_id,
        "user_id": event_data.get("user_id", ""),
        "custom_instructions": feedback_input,
        "selected_clips": event_data.get("selected_clips", []),
        "style_preset": event_data.get("style_preset", "mrbeast"),
        "caption_segments_by_clip": event_data.get("caption_segments_by_clip", {}),
        "upload_r2_key": event_data.get("upload_r2_key"),
        "word_timestamps": [],
        "speaker_segments": [],
        "filler_words": [],
        "silences": [],
        "clip_candidates": [],
        "agent_results": [],
        "current_stage": "captioning",
        "should_retry": False,
        "credits_consumed": 0,
    }

    final_state = await feedback_graph.ainvoke(state)

    return {
        "status": "complete",
        "project_id": project_id,
    }
