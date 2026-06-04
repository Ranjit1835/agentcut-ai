"""FFmpeg service for video/audio processing."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def _get_ffmpeg_env() -> dict[str, str]:
    """Return env dict with FFmpeg bin dir added to PATH if not already present."""
    env = os.environ.copy()
    # Check FFMPEG_BIN_DIR env var first, then common install locations
    extra_dir = os.environ.get("FFMPEG_BIN_DIR", "")
    search_dirs = [extra_dir] if extra_dir else []
    # Windows local dev fallback (ignored on Linux/Docker where ffmpeg is in PATH)
    if os.name == "nt":
        home = os.path.expanduser("~")
        search_dirs.append(os.path.join(home, "ffmpeg-master-latest-win64-gpl", "ffmpeg-master-latest-win64-gpl", "bin"))
    for d in search_dirs:
        if d and os.path.isdir(d) and d not in env.get("PATH", ""):
            env["PATH"] = d + os.pathsep + env.get("PATH", "")
    return env


async def extract_audio(video_path: str | Path, output_format: str = "wav") -> Path:
    """Extract audio track from video file."""
    video_path = Path(video_path)
    audio_path = video_path.with_suffix(f".{output_format}")

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vn", "-acodec", "pcm_s16le" if output_format == "wav" else "libmp3lame",
        "-ar", "16000", "-ac", "1",
        "-y", str(audio_path),
    ]

    logger.info("ffmpeg_extract_audio", input=str(video_path))
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600, env=_get_ffmpeg_env())

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")

    logger.info("ffmpeg_extract_audio_complete", output=str(audio_path))
    return audio_path


async def get_video_metadata(video_path: str | Path) -> dict[str, Any]:
    """Get video metadata using ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        str(video_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=_get_ffmpeg_env())
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")

    data = json.loads(result.stdout)
    video_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "video"), None)
    audio_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "audio"), None)

    return {
        "duration": float(data["format"].get("duration", 0)),
        "file_size": int(data["format"].get("size", 0)),
        "format": data["format"].get("format_name", ""),
        "width": int(video_stream["width"]) if video_stream else 0,
        "height": int(video_stream["height"]) if video_stream else 0,
        "fps": eval(video_stream.get("r_frame_rate", "30/1")) if video_stream else 30.0,
        "audio_sample_rate": int(audio_stream.get("sample_rate", 44100)) if audio_stream else 44100,
    }


async def cut_clip(
    video_path: str | Path,
    start_time: float,
    end_time: float,
    output_path: str | Path,
) -> Path:
    """Cut a segment from the video without re-encoding."""
    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-ss", str(start_time),
        "-to", str(end_time),
        "-c", "copy",
        "-y", str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=_get_ffmpeg_env())
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg cut failed: {result.stderr}")

    return Path(output_path)


async def render_vertical(
    video_path: str | Path,
    output_path: str | Path,
    ass_subtitle_path: str | Path | None = None,
    resolution: str = "1080p",
    face_x: float | None = None,
    face_y: float | None = None,
) -> Path:
    """
    Render a video in 9:16 vertical format with smart cropping.

    If face coordinates are provided, crop is centered on the face.
    """
    res_map = {"720p": (720, 1280), "1080p": (1080, 1920), "4k": (2160, 3840)}
    width, height = res_map.get(resolution, (1080, 1920))

    video_path = Path(video_path)
    output_path = Path(output_path)

    # Build filter chain
    filters = []

    # Smart crop: center on face if available, else center of frame
    if face_x is not None and face_y is not None:
        filters.append(
            f"crop=ih*9/16:ih:{face_x}*iw-ih*9/32:{face_y}*ih-ih/2"
        )
    else:
        filters.append("crop=ih*9/16:ih:(iw-ih*9/16)/2:0")

    filters.append(f"scale={width}:{height}")

    # Add subtitles if ASS file provided
    if ass_subtitle_path:
        # FFmpeg on Windows needs forward slashes and escaped colons in filter paths
        ass_str = str(ass_subtitle_path).replace("\\", "/").replace(":", "\\:")
        filters.append(f"ass='{ass_str}'")

    filter_str = ",".join(filters)

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", filter_str,
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", str(output_path),
    ]

    logger.info("ffmpeg_render_vertical", resolution=resolution, output=str(output_path))
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=1200, env=_get_ffmpeg_env())

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg render failed: {result.stderr}")

    return output_path


async def generate_thumbnail(video_path: str | Path, time_seconds: float = 1.0) -> Path:
    """Extract a single frame as a thumbnail."""
    video_path = Path(video_path)
    thumb_path = video_path.with_suffix(".jpg")

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-ss", str(time_seconds),
        "-vframes", "1",
        "-q:v", "2",
        "-y", str(thumb_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=_get_ffmpeg_env())
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg thumbnail failed: {result.stderr}")

    return thumb_path


async def remove_silences(
    video_path: str | Path,
    output_path: str | Path,
    silence_threshold: float = 0.4,
    silence_segments: list[dict[str, float]] | None = None,
) -> Path:
    """Remove silence segments from video using a concat filter."""
    if not silence_segments:
        return Path(video_path)

    video_path = Path(video_path)
    output_path = Path(output_path)

    # Build concat file from non-silence segments
    metadata = await get_video_metadata(video_path)
    duration = metadata["duration"]

    # Create list of segments to keep
    keep_segments: list[tuple[float, float]] = []
    current = 0.0

    for silence in sorted(silence_segments, key=lambda s: s["start"]):
        if silence["duration"] < silence_threshold:
            continue
        if current < silence["start"]:
            keep_segments.append((current, silence["start"]))
        current = silence["end"]

    if current < duration:
        keep_segments.append((current, duration))

    if not keep_segments:
        return Path(video_path)

    # Use complex filter to concat segments
    filter_parts = []
    for i, (start, end) in enumerate(keep_segments):
        filter_parts.append(
            f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}];"
            f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}];"
        )

    concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(len(keep_segments)))
    filter_str = "".join(filter_parts) + f"{concat_inputs}concat=n={len(keep_segments)}:v=1:a=1[outv][outa]"

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-filter_complex", filter_str,
        "-map", "[outv]", "-map", "[outa]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac",
        "-y", str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=1200, env=_get_ffmpeg_env())
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg silence removal failed: {result.stderr}")

    return output_path
