"""Projects API — CRUD + processing trigger."""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings

logger = structlog.get_logger(__name__)
router = APIRouter()


class CreateProjectRequest(BaseModel):
    title: str = Field(default="Untitled Project", max_length=200)
    source_url: str | None = None
    source_type: str = "youtube"
    style_preset: str = "mrbeast"
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
    """Create a new project and optionally start processing."""
    project_id = str(uuid.uuid4())

    project = {
        "id": project_id,
        "title": req.title,
        "status": "pending",
        "source_url": req.source_url,
        "source_type": req.source_type,
        "style_preset": req.style_preset,
        "created_at": "2024-01-01T00:00:00Z",
    }

    logger.info("project_created", project_id=project_id)
    return project


@router.get("/{project_id}")
async def get_project(project_id: str) -> dict[str, Any]:
    """Get project details with agent job status."""
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


@router.post("/{project_id}/process")
async def start_processing(project_id: str) -> dict[str, str]:
    """Trigger the LangGraph pipeline for a project."""
    logger.info("processing_started", project_id=project_id)
    return {"status": "processing", "project_id": project_id}


@router.get("/{project_id}/clips")
async def get_clips(project_id: str) -> list[dict[str, Any]]:
    """Get all clips for a project."""
    return []


@router.get("/{project_id}/agents")
async def get_agent_status(project_id: str) -> list[dict[str, Any]]:
    """Get the status of all agent jobs for a project."""
    return []
