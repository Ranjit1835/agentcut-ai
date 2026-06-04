"""Groq SDK client for Whisper Large v3 speech-to-text."""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import structlog
from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = structlog.get_logger(__name__)

_client: Groq | None = None

# Max chunk duration in seconds (10 minutes) — keeps each Groq call fast
CHUNK_DURATION = 600


def get_groq_client() -> Groq:
    """Returns a singleton Groq client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def _get_audio_duration(audio_path: Path) -> float:
    """Get audio duration via ffprobe."""
    from app.services.ffmpeg_service import _get_ffmpeg_env

    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json", "-show_format",
        str(audio_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=_get_ffmpeg_env())
    if result.returncode != 0:
        return 0.0
    import json
    data = json.loads(result.stdout)
    return float(data.get("format", {}).get("duration", 0))


def _split_audio(audio_path: Path, chunk_seconds: int, output_dir: Path) -> list[Path]:
    """Split audio into chunks using FFmpeg."""
    from app.services.ffmpeg_service import _get_ffmpeg_env

    duration = _get_audio_duration(audio_path)
    if duration <= 0:
        return [audio_path]

    ext = audio_path.suffix  # .mp3 or .wav
    chunks: list[Path] = []
    start = 0.0

    while start < duration:
        chunk_path = output_dir / f"chunk_{len(chunks):03d}{ext}"
        cmd = [
            "ffmpeg", "-i", str(audio_path),
            "-ss", str(start),
            "-t", str(chunk_seconds),
            "-c", "copy",
            "-y", str(chunk_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=_get_ffmpeg_env())
        if result.returncode == 0 and chunk_path.exists() and chunk_path.stat().st_size > 0:
            chunks.append(chunk_path)
        start += chunk_seconds

    return chunks if chunks else [audio_path]


def _extract_field(obj: Any, field: str) -> Any:
    """Extract a field from either a dict or an object."""
    if isinstance(obj, dict):
        return obj[field]
    return getattr(obj, field)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
def _transcribe_single(client: Groq, audio_path: Path, language: str | None, prompt: str | None) -> dict[str, Any]:
    """Transcribe a single audio file (no chunking)."""
    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=(audio_path.name, audio_file),
            model="whisper-large-v3",
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
            language=language,
            prompt=prompt,
        )

    result: dict[str, Any] = {
        "text": transcription.text,
        "language": getattr(transcription, "language", language or "en"),
        "duration": getattr(transcription, "duration", 0),
        "words": [],
        "segments": [],
    }

    if hasattr(transcription, "words") and transcription.words:
        result["words"] = [
            {
                "word": _extract_field(w, "word"),
                "start": _extract_field(w, "start"),
                "end": _extract_field(w, "end"),
            }
            for w in transcription.words
        ]

    if hasattr(transcription, "segments") and transcription.segments:
        result["segments"] = [
            {
                "id": _extract_field(s, "id"),
                "start": _extract_field(s, "start"),
                "end": _extract_field(s, "end"),
                "text": _extract_field(s, "text"),
            }
            for s in transcription.segments
        ]

    return result


async def transcribe_audio(
    audio_path: str | Path,
    language: str | None = None,
    prompt: str | None = None,
) -> dict[str, Any]:
    """
    Transcribe audio using Groq Whisper Large v3.

    For long audio (>10 min), splits into chunks and merges results.
    Returns word-level timestamps, segments, and full text.
    """
    client = get_groq_client()
    audio_path = Path(audio_path)
    size_mb = audio_path.stat().st_size / (1024 * 1024)

    logger.info("whisper_transcribe_start", file=str(audio_path), size_mb=round(size_mb, 1))

    duration = _get_audio_duration(audio_path)

    # Short audio — transcribe directly
    if duration <= CHUNK_DURATION:
        result = _transcribe_single(client, audio_path, language, prompt)
        logger.info(
            "whisper_transcribe_complete",
            words=len(result["words"]),
            segments=len(result["segments"]),
            duration=result["duration"],
        )
        return result

    # Long audio — split into chunks and merge
    logger.info("whisper_chunked_start", duration=round(duration, 1), chunk_seconds=CHUNK_DURATION)

    with tempfile.TemporaryDirectory() as tmpdir:
        chunks = _split_audio(audio_path, CHUNK_DURATION, Path(tmpdir))
        logger.info("whisper_chunks_created", count=len(chunks))

        all_text: list[str] = []
        all_words: list[dict[str, Any]] = []
        all_segments: list[dict[str, Any]] = []
        detected_language = language or "en"
        time_offset = 0.0

        for i, chunk_path in enumerate(chunks):
            logger.info("whisper_chunk_transcribe", chunk=i, total=len(chunks))
            try:
                chunk_result = _transcribe_single(client, chunk_path, language, prompt)
            except Exception as e:
                logger.error("whisper_chunk_failed", chunk=i, error=str(e))
                # Skip failed chunk but continue with rest
                time_offset += CHUNK_DURATION
                continue

            all_text.append(chunk_result["text"])

            if chunk_result.get("language"):
                detected_language = chunk_result["language"]

            # Offset timestamps by chunk start time
            for w in chunk_result.get("words", []):
                all_words.append({
                    "word": w["word"],
                    "start": round(w["start"] + time_offset, 3),
                    "end": round(w["end"] + time_offset, 3),
                })

            for s in chunk_result.get("segments", []):
                all_segments.append({
                    "id": len(all_segments),
                    "start": round(s["start"] + time_offset, 3),
                    "end": round(s["end"] + time_offset, 3),
                    "text": s["text"],
                })

            # Use actual chunk duration for offset (more accurate than CHUNK_DURATION)
            chunk_dur = chunk_result.get("duration", CHUNK_DURATION)
            time_offset += chunk_dur

    result = {
        "text": " ".join(all_text),
        "language": detected_language,
        "duration": duration,
        "words": all_words,
        "segments": all_segments,
    }

    logger.info(
        "whisper_transcribe_complete",
        words=len(result["words"]),
        segments=len(result["segments"]),
        duration=result["duration"],
        chunks=len(chunks),
    )

    return result
