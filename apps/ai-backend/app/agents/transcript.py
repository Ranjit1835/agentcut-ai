"""Agent 2 — TRANSCRIPT: Groq Whisper transcription with word timestamps."""

from __future__ import annotations

import re
import tempfile
from pathlib import Path
from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.groq_client import transcribe_audio
from app.services.r2_storage import download_file

logger = structlog.get_logger(__name__)

FILLER_WORDS = {"um", "uh", "like", "you know", "so", "basically", "actually", "literally", "right"}


class TranscriptAgent(BaseAgent):
    name = AgentName.TRANSCRIPTION

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        audio_r2_key = state.get("audio_r2_key")
        if not audio_r2_key:
            raise ValueError("No audio_r2_key in state — ingest must run first")

        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = await download_file(audio_r2_key, Path(tmpdir) / "audio.wav")
            result = await transcribe_audio(audio_path)

        words = result.get("words", [])
        full_text = result.get("text", "")

        # Detect filler words
        filler_occurrences = []
        for w in words:
            word_lower = w["word"].strip().lower().strip(".,!?")
            if word_lower in FILLER_WORDS:
                filler_occurrences.append({
                    "word": word_lower,
                    "start": w["start"],
                    "end": w["end"],
                })

        # Detect silences (gaps > 0.4s between words)
        silences = []
        for i in range(len(words) - 1):
            gap = words[i + 1]["start"] - words[i]["end"]
            if gap > 0.4:
                silences.append({
                    "start": words[i]["end"],
                    "end": words[i + 1]["start"],
                    "duration": round(gap, 3),
                })

        # Simple speaker heuristics based on segment pauses
        speaker_segments = []
        if result.get("segments"):
            current_speaker = "SPEAKER_00"
            pause_threshold = 2.0
            for i, seg in enumerate(result["segments"]):
                if i > 0:
                    gap = seg["start"] - result["segments"][i - 1]["end"]
                    if gap > pause_threshold:
                        current_speaker = "SPEAKER_01" if current_speaker == "SPEAKER_00" else "SPEAKER_00"
                speaker_segments.append({
                    "speaker": current_speaker,
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"],
                })

        word_timestamps = [
            {"word": w["word"], "start": w["start"], "end": w["end"], "confidence": 1.0}
            for w in words
        ]

        return {
            "full_transcript": full_text,
            "word_timestamps": word_timestamps,
            "filler_words": filler_occurrences,
            "silences": silences,
            "speaker_segments": speaker_segments,
            "detected_language": result.get("language", "en"),
            "current_stage": "analyzing",
            "_confidence": 0.92,
        }


transcript_agent = TranscriptAgent()
