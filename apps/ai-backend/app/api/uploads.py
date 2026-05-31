"""Upload API — File upload to R2."""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.config import get_settings

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/")
async def upload_video(
    project_id: str,
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """Upload a video file for processing."""
    settings = get_settings()

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Validate file type
    allowed_types = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"}
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    # Check file size
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.max_file_size_bytes / (1024*1024*1024):.1f}GB",
        )

    r2_key = f"projects/{project_id}/uploads/{uuid.uuid4()}/{file.filename}"

    # Upload to R2
    from io import BytesIO
    from app.services.r2_storage import upload_fileobj
    await upload_fileobj(BytesIO(content), r2_key, file.content_type or "video/mp4")

    logger.info("upload_complete", project_id=project_id, r2_key=r2_key, size_mb=len(content) / (1024 * 1024))

    return {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "r2_key": r2_key,
        "file_size_bytes": len(content),
        "filename": file.filename,
    }
