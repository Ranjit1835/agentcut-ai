"""Groq SDK client for Whisper Large v3 speech-to-text."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import structlog
from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = structlog.get_logger(__name__)

_client: Groq | None = None


def get_groq_client() -> Groq:
    """Returns a singleton Groq client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = Groq(api_key=settings.groq_api_key)
    return _client


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def transcribe_audio(
    audio_path: str | Path,
    language: str | None = None,
    prompt: str | None = None,
) -> dict[str, Any]:
    """
    Transcribe audio using Groq Whisper Large v3.

    Returns word-level timestamps, segments, and full text.
    """
    client = get_groq_client()
    audio_path = Path(audio_path)

    logger.info("whisper_transcribe_start", file=str(audio_path), size_mb=audio_path.stat().st_size / (1024 * 1024))

    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=(audio_path.name, audio_file),
            model="whisper-large-v3",
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
            language=language,
            prompt=prompt,
        )

    result = {
        "text": transcription.text,
        "language": getattr(transcription, "language", language or "en"),
        "duration": getattr(transcription, "duration", 0),
        "words": [],
        "segments": [],
    }

    if hasattr(transcription, "words") and transcription.words:
        result["words"] = [
            {
                "word": w.word,
                "start": w.start,
                "end": w.end,
            }
            for w in transcription.words
        ]

    if hasattr(transcription, "segments") and transcription.segments:
        result["segments"] = [
            {
                "id": s.id,
                "start": s.start,
                "end": s.end,
                "text": s.text,
            }
            for s in transcription.segments
        ]

    logger.info(
        "whisper_transcribe_complete",
        words=len(result["words"]),
        segments=len(result["segments"]),
        duration=result["duration"],
    )

    return result
