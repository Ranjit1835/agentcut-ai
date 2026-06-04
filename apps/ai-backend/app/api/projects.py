"""Projects API — CRUD + processing trigger."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.api.websocket import emit_agent_progress

logger = structlog.get_logger(__name__)
router = APIRouter()

# In-memory stores (for dev — production should use Supabase)
_projects: dict[str, dict[str, Any]] = {}
_pipeline_results: dict[str, dict[str, Any]] = {}


class CreateProjectRequest(BaseModel):
    title: str = Field(default="Untitled Project", max_length=200)
    source_url: str | None = None
    source_type: str = "youtube"
    style_preset: str = "mrbeast"
    caption_style: str | None = None
    target_clip_count: int = Field(default=5, ge=1, le=30)
    min_clip_duration: float = Field(default=15.0, ge=5.0)
    max_clip_duration: float = Field(default=90.0, le=180.0)
    custom_instructions: str | None = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    status: str
    source_url: str | None
    source_type: str
    style_preset: str
    created_at: str


@router.post("/", response_model=ProjectResponse)
async def create_project(req: CreateProjectRequest) -> dict[str, Any]:
    """Create a new project."""
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    style = req.caption_style or req.style_preset

    project = {
        "id": project_id,
        "title": req.title,
        "status": "pending",
        "source_url": req.source_url,
        "source_type": req.source_type,
        "style_preset": style,
        "target_clip_count": req.target_clip_count,
        "min_clip_duration": req.min_clip_duration,
        "max_clip_duration": req.max_clip_duration,
        "custom_instructions": req.custom_instructions,
        "created_at": now,
    }

    _projects[project_id] = project
    logger.info("project_created", project_id=project_id, source_url=req.source_url)
    return project


@router.get("/{project_id}")
async def get_project(project_id: str) -> dict[str, Any]:
    """Get project details with agent job status."""
    project = _projects.get(project_id)
    if not project:
        return {
            "id": project_id,
            "title": "Project",
            "status": "pending",
            "source_url": None,
            "source_type": "youtube",
            "style_preset": "mrbeast",
            "clips": [],
            "agent_jobs": [],
        }
    return {**project, "clips": [], "agent_jobs": []}


@router.post("/{project_id}/process")
async def start_processing(project_id: str) -> dict[str, str]:
    """Trigger the LangGraph pipeline for a project."""
    project = _projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["status"] == "processing":
        raise HTTPException(status_code=409, detail="Project is already processing")

    project["status"] = "processing"
    logger.info("processing_started", project_id=project_id)

    # Launch pipeline in background so the API returns immediately
    asyncio.create_task(_run_pipeline(project_id, project))

    return {"status": "processing", "project_id": project_id}


async def _run_pipeline(project_id: str, project: dict[str, Any]) -> None:
    """Run the LangGraph workflow in the background, emitting WebSocket progress."""
    try:
        from app.graph.workflow import main_graph

        # Build initial state for the graph
        initial_state = {
            "project_id": project_id,
            "source_url": project.get("source_url"),
            "source_type": project.get("source_type", "youtube"),
            "style_preset": project.get("style_preset", "mrbeast"),
            "target_clip_count": project.get("target_clip_count", 5),
            "min_clip_duration": project.get("min_clip_duration", 15.0),
            "max_clip_duration": project.get("max_clip_duration", 90.0),
            "custom_instructions": project.get("custom_instructions"),
            "agent_results": [],
            "global_error": None,
            "should_retry": False,
        }

        # Emit pipeline_status to connected WebSocket clients
        from app.api.websocket import manager
        await manager.broadcast(project_id, {
            "type": "pipeline_status",
            "status": "running",
        })

        logger.info("pipeline_invoking", project_id=project_id)
        result = await main_graph.ainvoke(initial_state)
        logger.info("pipeline_completed", project_id=project_id, result_keys=list(result.keys()) if result else [])

        # Store pipeline results for the clips API
        _pipeline_results[project_id] = result or {}
        project["status"] = "complete"

        await manager.broadcast(project_id, {
            "type": "pipeline_status",
            "status": "completed",
        })

    except Exception as e:
        logger.error("pipeline_failed", project_id=project_id, error=str(e), exc_info=True)
        project["status"] = "failed"

        from app.api.websocket import manager
        await manager.broadcast(project_id, {
            "type": "pipeline_status",
            "status": "failed",
        })

        # Also emit agent failure for whatever agent was running
        await emit_agent_progress(
            project_id=project_id,
            agent_name="ingest",
            status="failed",
            progress_percent=0,
            message=f"Pipeline error: {str(e)[:300]}",
        )


@router.get("/{project_id}/clips")
async def get_clips(project_id: str) -> list[dict[str, Any]]:
    """Get all clips for a project."""
    result = _pipeline_results.get(project_id, {})

    # Try selected_clips first, then clip_candidates
    clips = result.get("selected_clips") or result.get("clip_candidates") or []

    formatted = []
    for i, clip in enumerate(clips):
        if isinstance(clip, dict):
            formatted.append({
                "id": clip.get("id", str(i)),
                "title": clip.get("title", f"Clip {i + 1}"),
                "start_time": clip.get("start_time", 0),
                "end_time": clip.get("end_time", 0),
                "duration": clip.get("end_time", 0) - clip.get("start_time", 0),
                "virality_score": clip.get("virality_score", 0),
                "hook_text": clip.get("hook_text", ""),
                "narrative_summary": clip.get("narrative_summary", ""),
                "render_url": clip.get("render_url"),
                "thumbnail_url": clip.get("thumbnail_url"),
                "status": clip.get("render_status", "complete"),
            })
    return formatted


@router.get("/{project_id}/agents")
async def get_agent_status(project_id: str) -> list[dict[str, Any]]:
    """Get the status of all agent jobs for a project."""
    result = _pipeline_results.get(project_id, {})
    return result.get("agent_results", [])


@router.get("/{project_id}/debug")
async def debug_pipeline(project_id: str) -> dict[str, Any]:
    """Debug endpoint: return full pipeline state (dev only)."""
    result = _pipeline_results.get(project_id, {})
    # Truncate large fields for readability
    debug = {}
    for k, v in result.items():
        if k == "full_transcript" and isinstance(v, str) and len(v) > 500:
            debug[k] = v[:500] + f"... ({len(v)} chars)"
        elif k == "word_timestamps" and isinstance(v, list) and len(v) > 10:
            debug[k] = f"[{len(v)} words]"
        else:
            debug[k] = v
    return debug
