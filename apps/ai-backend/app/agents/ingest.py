"""Agent 1 — INGEST: Download video, extract audio, upload to R2."""

from __future__ import annotations

import tempfile
import uuid
from pathlib import Path
from typing import Any

import structlog
import yt_dlp

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.ffmpeg_service import extract_audio, generate_thumbnail, get_video_metadata
from app.services.r2_storage import upload_file

logger = structlog.get_logger(__name__)


class IngestAgent(BaseAgent):
    name = AgentName.INGESTION

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        project_id = state["project_id"]
        source_url = state.get("source_url")

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)

            # Download video
            if source_url:
                video_path = await self._download_video(source_url, tmp_path)
            elif state.get("upload_r2_key"):
                from app.services.r2_storage import download_file
                video_path = await download_file(state["upload_r2_key"], tmp_path / "input.mp4")
            else:
                raise ValueError("No source_url or upload_r2_key provided")

            # Get metadata
            metadata = await get_video_metadata(video_path)

            # Extract audio for transcription
            audio_path = await extract_audio(video_path, output_format="wav")

            # Generate thumbnail
            thumb_time = min(metadata["duration"] * 0.1, 5.0)
            thumb_path = await generate_thumbnail(video_path, time_seconds=thumb_time)

            # Upload to R2
            video_r2_key = f"projects/{project_id}/source/{uuid.uuid4()}.mp4"
            audio_r2_key = f"projects/{project_id}/audio/{uuid.uuid4()}.wav"
            thumb_r2_key = f"projects/{project_id}/thumbnails/{uuid.uuid4()}.jpg"

            await upload_file(video_path, video_r2_key, "video/mp4")
            await upload_file(audio_path, audio_r2_key, "audio/wav")
            await upload_file(thumb_path, thumb_r2_key, "image/jpeg")

            return {
                "upload_r2_key": video_r2_key,
                "audio_r2_key": audio_r2_key,
                "thumbnail_r2_key": thumb_r2_key,
                "video_duration_seconds": metadata["duration"],
                "video_resolution": f"{metadata['width']}x{metadata['height']}",
                "video_fps": metadata["fps"],
                "audio_sample_rate": metadata["audio_sample_rate"],
                "current_stage": "transcribing",
                "_confidence": 0.95,
            }

    async def _download_video(self, url: str, output_dir: Path) -> Path:
        """Download video using yt-dlp."""
        output_path = output_dir / "source.mp4"

        ydl_opts = {
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "outtmpl": str(output_path),
            "merge_output_format": "mp4",
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 30,
            "retries": 3,
        }

        logger.info("yt_dlp_download_start", url=url)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if not output_path.exists():
            # yt-dlp might add extension
            candidates = list(output_dir.glob("source.*"))
            if candidates:
                output_path = candidates[0]
            else:
                raise FileNotFoundError(f"Download failed for {url}")

        logger.info("yt_dlp_download_complete", size_mb=output_path.stat().st_size / (1024 * 1024))
        return output_path


ingest_agent = IngestAgent()
