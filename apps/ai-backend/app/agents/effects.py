"""Agent 6 — EFFECTS: MediaPipe face detection, librosa beat-sync, zoom punch-ins,
transitions, hook text overlay, and color grading LUT presets."""

from __future__ import annotations

import asyncio
import io
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
import structlog

from app.agents.base import BaseAgent
from app.models.effects import (
    BeatMarker,
    ClipEffects,
    ColorGradingLUT,
    FaceBBox,
    HookOverlay,
    Transition,
    ZoomEffect,
)
from app.models.state import AgentCutGraphState, AgentName

logger = structlog.get_logger(__name__)

# ── Color grading presets ────────────────────────────────────────────────────

LUT_PRESETS: dict[str, ColorGradingLUT] = {
    "warm": ColorGradingLUT(
        name="warm",
        brightness=0.05,
        contrast=1.05,
        saturation=1.15,
        gamma_r=1.08,
        gamma_g=1.0,
        gamma_b=0.92,
    ),
    "cool": ColorGradingLUT(
        name="cool",
        brightness=0.0,
        contrast=1.05,
        saturation=1.05,
        gamma_r=0.92,
        gamma_g=1.0,
        gamma_b=1.10,
    ),
    "cinematic": ColorGradingLUT(
        name="cinematic",
        brightness=-0.03,
        contrast=1.15,
        saturation=0.90,
        gamma_r=1.02,
        gamma_g=0.98,
        gamma_b=0.95,
    ),
    "vibrant": ColorGradingLUT(
        name="vibrant",
        brightness=0.02,
        contrast=1.10,
        saturation=1.35,
        gamma_r=1.0,
        gamma_g=1.0,
        gamma_b=1.0,
    ),
    "neutral": ColorGradingLUT(
        name="neutral",
        brightness=0.0,
        contrast=1.0,
        saturation=1.0,
        gamma_r=1.0,
        gamma_g=1.0,
        gamma_b=1.0,
    ),
}

# Map style_preset to color grading
STYLE_TO_LUT: dict[str, str] = {
    "bold_captions": "vibrant",
    "minimal": "neutral",
    "neon": "cool",
    "corporate": "neutral",
    "viral": "cinematic",
}


# ── Face detection helpers (CPU-bound, run in thread) ────────────────────────


def _extract_frame_at_time(
    video_path: str, time_seconds: float
) -> np.ndarray | None:
    """Extract a single frame from a video at a given timestamp using OpenCV."""
    cap = cv2.VideoCapture(video_path)
    try:
        cap.set(cv2.CAP_PROP_POS_MSEC, time_seconds * 1000.0)
        success, frame = cap.read()
        if success:
            return frame
        return None
    finally:
        cap.release()


def _detect_face_in_frame(frame: np.ndarray) -> FaceBBox | None:
    """Run MediaPipe face detection on a single frame and return the largest face bbox.

    Coordinates are normalized to [0, 1] relative to frame dimensions.
    """
    with mp.solutions.face_detection.FaceDetection(
        model_selection=1, min_detection_confidence=0.5
    ) as face_detection:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_detection.process(rgb_frame)

        if not results.detections:
            return None

        # Pick the largest detected face by bounding box area
        best_detection = max(
            results.detections,
            key=lambda d: (
                d.location_data.relative_bounding_box.width
                * d.location_data.relative_bounding_box.height
            ),
        )

        bbox = best_detection.location_data.relative_bounding_box
        center_x = bbox.xmin + bbox.width / 2.0
        center_y = bbox.ymin + bbox.height / 2.0

        return FaceBBox(
            x=round(float(bbox.xmin), 4),
            y=round(float(bbox.ymin), 4),
            width=round(float(bbox.width), 4),
            height=round(float(bbox.height), 4),
            center_x=round(float(center_x), 4),
            center_y=round(float(center_y), 4),
            confidence=round(float(best_detection.score[0]), 4),
        )


def _detect_faces_at_timestamps(
    video_path: str,
    timestamps: list[float],
) -> dict[float, FaceBBox | None]:
    """Detect faces at multiple timestamps. Returns a mapping of timestamp -> FaceBBox."""
    results: dict[float, FaceBBox | None] = {}
    for ts in timestamps:
        frame = _extract_frame_at_time(video_path, ts)
        if frame is not None:
            results[ts] = _detect_face_in_frame(frame)
        else:
            results[ts] = None
    return results


def _compute_average_face_position(
    face_map: dict[float, FaceBBox | None],
) -> tuple[float, float] | None:
    """Compute average face center from multiple detections. Returns (center_x, center_y) or None."""
    valid = [fb for fb in face_map.values() if fb is not None]
    if not valid:
        return None
    avg_cx = sum(fb.center_x for fb in valid) / len(valid)
    avg_cy = sum(fb.center_y for fb in valid) / len(valid)
    return (round(avg_cx, 4), round(avg_cy, 4))


# ── Beat detection helper (CPU-bound, run in thread) ─────────────────────────


def _extract_audio_to_buffer(video_path: str) -> bytes | None:
    """Extract audio from video to WAV bytes in memory using FFmpeg subprocess."""
    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "22050",
        "-ac", "1",
        "-f", "wav",
        "pipe:1",
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, timeout=120
        )
        if result.returncode != 0:
            return None
        return result.stdout
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def _detect_beats(video_path: str) -> list[BeatMarker]:
    """Detect beats in the audio track using librosa.

    Returns empty list if no clear rhythm is detected or audio extraction fails.
    """
    import librosa

    audio_bytes = _extract_audio_to_buffer(video_path)
    if not audio_bytes:
        return []

    try:
        audio_buffer = io.BytesIO(audio_bytes)
        y, sr = librosa.load(audio_buffer, sr=22050, mono=True)

        # Skip very short audio
        if len(y) < sr * 2:
            return []

        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")

        # If tempo is an array, take the first element
        tempo_val = float(tempo) if np.isscalar(tempo) else float(tempo[0])

        # If tempo is too low or too high, there is no clear rhythm
        if tempo_val < 40.0 or tempo_val > 240.0:
            return []

        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        # Compute beat strengths from onset envelope
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        beat_strengths = []
        for bf in beat_frames:
            if bf < len(onset_env):
                beat_strengths.append(float(onset_env[bf]))
            else:
                beat_strengths.append(0.0)

        # Normalize strengths to [0, 1]
        max_strength = max(beat_strengths) if beat_strengths else 1.0
        if max_strength > 0:
            beat_strengths = [s / max_strength for s in beat_strengths]

        markers = []
        for bt, bs in zip(beat_times, beat_strengths):
            markers.append(
                BeatMarker(
                    time=round(float(bt), 3),
                    strength=round(bs, 3),
                )
            )

        return markers

    except Exception as exc:
        logger.warning("beat_detection_failed", error=str(exc))
        return []


# ── Main Agent ───────────────────────────────────────────────────────────────


class EffectsAgent(BaseAgent):
    name = AgentName.EFFECTS

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        selected_clips = state.get("selected_clips", [])

        if not selected_clips:
            raise ValueError("No clips for effects processing")

        # Resolve video path for face detection and beat analysis.
        # The video is identified by its R2 key; for local processing we need
        # either a cached local path or to download it.  The render agent
        # downloads the source later, so here we check for a local temp path
        # that the ingest agent may have left, or fall back to the R2 key so
        # downstream helpers can decide whether to run detection.
        video_path = state.get("local_video_path") or state.get("upload_r2_key")
        style_preset = state.get("style_preset", "bold_captions")

        # Determine color grading preset from style
        lut_name = STYLE_TO_LUT.get(style_preset, "neutral")
        color_lut = LUT_PRESETS[lut_name]

        # Attempt beat detection once for the whole source video (if local path available)
        beat_markers: list[BeatMarker] = []
        if video_path and Path(video_path).is_file():
            try:
                beat_markers = await asyncio.to_thread(
                    _detect_beats, str(video_path)
                )
                logger.info(
                    "beat_detection_complete",
                    beat_count=len(beat_markers),
                )
            except Exception as exc:
                logger.warning("beat_detection_skipped", error=str(exc))

        updated_clips = []

        for clip in selected_clips:
            clip_copy = dict(clip)
            try:
                effects_data = await self._build_clip_effects(
                    clip_copy,
                    video_path=video_path,
                    beat_markers=beat_markers,
                    color_lut=color_lut,
                )
                clip_copy["effects"] = effects_data
            except Exception as e:
                logger.error(
                    "effects_failed_for_clip",
                    clip_id=clip.get("id"),
                    error=str(e),
                )
                clip_copy["effects"] = ClipEffects(
                    color_grading=color_lut,
                ).model_dump()
            updated_clips.append(clip_copy)

        logger.info("effects_complete", clips_processed=len(updated_clips))

        return {
            "selected_clips": updated_clips,
            "current_stage": "quality_check",
            "_confidence": 0.85,
        }

    async def _build_clip_effects(
        self,
        clip: dict[str, Any],
        video_path: str | None,
        beat_markers: list[BeatMarker],
        color_lut: ColorGradingLUT,
    ) -> dict[str, Any]:
        """Build a full effects dict for a single clip, including face-aware
        zoom, beat-synced effects, transitions, hook overlay, and color grading."""
        hook_text = clip.get("hook_text", "")
        start_time: float = clip.get("start_time", 0)
        end_time: float = clip.get("end_time", 0)
        duration = end_time - start_time

        if duration <= 0:
            return ClipEffects(color_grading=color_lut).model_dump()

        # ── Collect key moment timestamps ────────────────────────────────
        key_moment_times: list[float] = []
        key_moments = clip.get("key_moments", [])
        for moment in key_moments[:5]:
            if isinstance(moment, str) and " - " in moment:
                time_str = moment.split(" - ")[0].strip()
                try:
                    t = float(time_str)
                    if start_time <= t < end_time:
                        key_moment_times.append(t)
                except (ValueError, TypeError):
                    pass

        # Add start of clip as a sample point for face detection
        sample_times = [start_time + 0.5] + key_moment_times
        # Deduplicate and sort
        sample_times = sorted(set(sample_times))

        # ── Face detection at sample points ──────────────────────────────
        face_map: dict[float, FaceBBox | None] = {}
        has_local_video = video_path is not None and Path(video_path).is_file()

        if has_local_video and sample_times:
            try:
                face_map = await asyncio.to_thread(
                    _detect_faces_at_timestamps,
                    str(video_path),
                    sample_times,
                )
            except Exception as exc:
                logger.warning("face_detection_failed", error=str(exc))

        avg_face = _compute_average_face_position(face_map)

        # ── Filter beat markers to this clip's time range ────────────────
        clip_beats = [
            bm for bm in beat_markers
            if start_time <= bm.time < end_time
        ]
        # Only use strong beats (top 40% strength) for zoom alignment
        strong_beats = sorted(clip_beats, key=lambda b: b.strength, reverse=True)
        strong_beat_times = {
            round(b.time, 2) for b in strong_beats[: max(1, len(strong_beats) * 2 // 5)]
        }

        # ── Build zoom effects ───────────────────────────────────────────
        zoom_points: list[ZoomEffect] = []

        for abs_t in key_moment_times[:3]:
            relative_t = abs_t - start_time
            if relative_t <= 0 or relative_t >= duration:
                continue

            # Get face position at this moment, or fall back to average, or center
            face_at_moment = face_map.get(abs_t)
            if face_at_moment is not None:
                cx = face_at_moment.center_x
                cy = face_at_moment.center_y
            elif avg_face is not None:
                cx, cy = avg_face
            else:
                cx, cy = 0.5, 0.5  # center-crop fallback

            # Snap zoom timing to nearest strong beat if within 0.3s
            snap_t = relative_t
            if strong_beat_times:
                closest_beat = min(
                    strong_beat_times,
                    key=lambda bt: abs((bt - start_time) - relative_t),
                )
                beat_relative = closest_beat - start_time
                if abs(beat_relative - relative_t) < 0.3 and 0 < beat_relative < duration:
                    snap_t = round(beat_relative, 3)

            zoom_points.append(
                ZoomEffect(
                    time=round(snap_t, 2),
                    center_x=round(cx, 4),
                    center_y=round(cy, 4),
                    scale=1.3,
                    duration=0.5,
                )
            )

        # If we have strong beats but no key moments, add beat-synced zooms
        # for the first few strong beats (subtle zoom pulses)
        if not zoom_points and clip_beats:
            for beat in strong_beats[:3]:
                rel_t = beat.time - start_time
                if rel_t <= 0 or rel_t >= duration:
                    continue
                if avg_face is not None:
                    cx, cy = avg_face
                else:
                    cx, cy = 0.5, 0.5
                zoom_points.append(
                    ZoomEffect(
                        time=round(rel_t, 2),
                        center_x=round(cx, 4),
                        center_y=round(cy, 4),
                        scale=1.15,
                        duration=0.35,
                    )
                )

        # ── Hook overlay ─────────────────────────────────────────────────
        hook_overlay: HookOverlay | None = None
        if hook_text:
            hook_overlay = HookOverlay(
                text=hook_text[:60],
                start=0.0,
                end=min(3.0, duration),
                style="bold_center",
            )

        # ── Transitions ──────────────────────────────────────────────────
        transitions = [
            Transition(type="fade_in", duration=0.3, position="start"),
            Transition(type="fade_out", duration=0.3, position="end"),
        ]

        # ── Face bounding boxes for downstream render ────────────────────
        face_detections: list[dict[str, Any]] = []
        for ts, fb in face_map.items():
            if fb is not None:
                face_detections.append({
                    "timestamp": ts,
                    "bbox": fb.model_dump(),
                })

        # ── Assemble final effects ───────────────────────────────────────
        clip_effects = ClipEffects(
            zoom_points=zoom_points,
            transitions=transitions,
            hook_overlay=hook_overlay,
            color_grading=color_lut,
            face_detections=face_detections,
            beat_markers=[bm for bm in clip_beats],
            average_face_center=(
                {"x": avg_face[0], "y": avg_face[1]} if avg_face else None
            ),
        )

        return clip_effects.model_dump()


effects_agent = EffectsAgent()
