"""Agent 1 — INGEST: Download video, extract audio, upload to R2."""

from __future__ import annotations

import asyncio
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

# Maximum video duration we'll process (2 hours)
MAX_VIDEO_DURATION = 7200


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

            if not video_path.exists() or video_path.stat().st_size == 0:
                raise ValueError(f"Video file is empty or missing: {video_path}")

            # Get metadata
            metadata = await get_video_metadata(video_path)

            duration = metadata["duration"]
            if duration <= 0:
                raise ValueError("Could not determine video duration — file may be corrupt")
            if duration > MAX_VIDEO_DURATION:
                raise ValueError(
                    f"Video is {duration/60:.0f} minutes — max supported is {MAX_VIDEO_DURATION/60:.0f} minutes"
                )

            # Extract audio for transcription (MP3 to stay under Groq's 25MB limit)
            audio_path = await extract_audio(video_path, output_format="mp3")
            if not audio_path.exists() or audio_path.stat().st_size == 0:
                raise ValueError("Audio extraction produced empty file — video may have no audio track")

            # Generate thumbnail
            thumb_time = min(duration * 0.1, 5.0)
            thumb_path = await generate_thumbnail(video_path, time_seconds=thumb_time)

            # Upload to R2
            video_r2_key = f"projects/{project_id}/source/{uuid.uuid4()}.mp4"
            audio_r2_key = f"projects/{project_id}/audio/{uuid.uuid4()}.mp3"
            thumb_r2_key = f"projects/{project_id}/thumbnails/{uuid.uuid4()}.jpg"

            await upload_file(video_path, video_r2_key, "video/mp4")
            await upload_file(audio_path, audio_r2_key, "audio/mpeg")
            await upload_file(thumb_path, thumb_r2_key, "image/jpeg")

            logger.info(
                "ingest_complete",
                project_id=project_id,
                duration=duration,
                resolution=f"{metadata['width']}x{metadata['height']}",
            )

            return {
                "upload_r2_key": video_r2_key,
                "audio_r2_key": audio_r2_key,
                "thumbnail_r2_key": thumb_r2_key,
                "video_duration_seconds": duration,
                "video_resolution": f"{metadata['width']}x{metadata['height']}",
                "video_fps": metadata["fps"],
                "audio_sample_rate": metadata["audio_sample_rate"],
                "current_stage": "transcribing",
                "_confidence": 0.95,
            }

    async def _download_video(self, url: str, output_dir: Path) -> Path:
        """Download video using yt-dlp in a thread pool to avoid blocking."""
        output_path = output_dir / "source.mp4"

        ydl_opts: dict[str, Any] = {
            "format": "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best",
            "outtmpl": str(output_path),
            "merge_output_format": "mp4",
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 30,
            "retries": 3,
            "max_filesize": 5 * 1024 * 1024 * 1024,  # 5GB limit
        }

        # Optional: pass cookies to bypass YouTube bot detection on datacenter IPs.
        # Set YT_DLP_COOKIES_FILE to a Netscape-format cookies.txt path, or
        # YT_DLP_COOKIES_FROM_BROWSER to a browser name (e.g. "chrome").
        import os
        cookies_file = os.environ.get("YT_DLP_COOKIES_FILE", "")
        cookies_browser = os.environ.get("YT_DLP_COOKIES_FROM_BROWSER", "")
        if cookies_file and Path(cookies_file).exists():
            ydl_opts["cookiefile"] = cookies_file
            logger.info("yt_dlp_using_cookies_file", path=cookies_file)
        elif cookies_browser:
            ydl_opts["cookiesfrombrowser"] = (cookies_browser,)
            logger.info("yt_dlp_using_browser_cookies", browser=cookies_browser)

        logger.info("yt_dlp_download_start", url=url)

        def _download() -> None:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

        await asyncio.to_thread(_download)

        if not output_path.exists():
            # yt-dlp might add extension
            candidates = list(output_dir.glob("source.*"))
            if candidates:
                output_path = candidates[0]
            else:
                raise FileNotFoundError(f"Download failed for {url}")

        size_mb = output_path.stat().st_size / (1024 * 1024)
        logger.info("yt_dlp_download_complete", size_mb=round(size_mb, 1))
        return output_path


ingest_agent = IngestAgent()
