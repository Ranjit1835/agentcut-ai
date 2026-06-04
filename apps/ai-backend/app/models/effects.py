"""Pydantic models for the Effects agent output.

These models define the structure of the effects data attached to each clip
by the EffectsAgent. Downstream consumers (RenderAgent, FFmpeg service) use
these to apply zoom, color grading, transitions, and overlays.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FaceBBox(BaseModel):
    """A face bounding box detected by MediaPipe, with coordinates normalized
    to [0, 1] relative to frame width/height."""

    x: float = Field(..., ge=0.0, le=1.0, description="Left edge (normalized)")
    y: float = Field(..., ge=0.0, le=1.0, description="Top edge (normalized)")
    width: float = Field(..., ge=0.0, le=1.0, description="Box width (normalized)")
    height: float = Field(..., ge=0.0, le=1.0, description="Box height (normalized)")
    center_x: float = Field(..., ge=0.0, le=1.0, description="Horizontal center of face")
    center_y: float = Field(..., ge=0.0, le=1.0, description="Vertical center of face")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Detection confidence")


class ZoomEffect(BaseModel):
    """A zoom punch-in effect at a specific moment in the clip.

    center_x / center_y indicate where the zoom should focus, derived from
    face detection when available, or defaulting to frame center (0.5, 0.5).
    """

    time: float = Field(..., ge=0.0, description="Time offset within clip (seconds)")
    center_x: float = Field(
        default=0.5, ge=0.0, le=1.0,
        description="Horizontal zoom center (0=left, 1=right)",
    )
    center_y: float = Field(
        default=0.5, ge=0.0, le=1.0,
        description="Vertical zoom center (0=top, 1=bottom)",
    )
    scale: float = Field(
        default=1.3, gt=1.0, le=3.0,
        description="Zoom scale factor (1.3 = 30% zoom in)",
    )
    duration: float = Field(
        default=0.5, gt=0.0, le=5.0,
        description="Duration of the zoom effect in seconds",
    )


class HookOverlay(BaseModel):
    """Text overlay shown at the beginning of a clip to hook the viewer."""

    text: str = Field(..., max_length=60)
    start: float = Field(default=0.0, ge=0.0)
    end: float = Field(default=3.0, ge=0.0)
    style: str = Field(default="bold_center")


class Transition(BaseModel):
    """A transition effect applied at the start or end of a clip."""

    type: str = Field(..., description="Transition type: fade_in, fade_out, swipe, cut")
    duration: float = Field(default=0.3, ge=0.0, le=3.0)
    position: str = Field(..., description="Where to apply: start or end")


class BeatMarker(BaseModel):
    """A detected musical beat timestamp from librosa beat tracking."""

    time: float = Field(..., ge=0.0, description="Absolute timestamp in seconds")
    strength: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Normalized beat strength (0=weak, 1=strongest)",
    )


class ColorGradingLUT(BaseModel):
    """Color grading parameters that map to FFmpeg eq/colorbalance filters.

    These values are applied via FFmpeg's eq and colorbalance filters:
      - eq=brightness={brightness}:contrast={contrast}:saturation={saturation}
      - colorbalance=rs={gamma_r-1}:bs={gamma_b-1}  (approximate)
    """

    name: str = Field(default="neutral", description="Preset name for reference")
    brightness: float = Field(
        default=0.0, ge=-1.0, le=1.0,
        description="Brightness adjustment (-1 to 1, 0=no change)",
    )
    contrast: float = Field(
        default=1.0, ge=0.0, le=3.0,
        description="Contrast multiplier (1.0=no change)",
    )
    saturation: float = Field(
        default=1.0, ge=0.0, le=3.0,
        description="Saturation multiplier (1.0=no change)",
    )
    gamma_r: float = Field(
        default=1.0, ge=0.5, le=2.0,
        description="Red channel gamma (1.0=no change)",
    )
    gamma_g: float = Field(
        default=1.0, ge=0.5, le=2.0,
        description="Green channel gamma (1.0=no change)",
    )
    gamma_b: float = Field(
        default=1.0, ge=0.5, le=2.0,
        description="Blue channel gamma (1.0=no change)",
    )

    def to_ffmpeg_eq_filter(self) -> str:
        """Generate the FFmpeg eq filter string for this LUT."""
        return (
            f"eq=brightness={self.brightness}:"
            f"contrast={self.contrast}:"
            f"saturation={self.saturation}:"
            f"gamma_r={self.gamma_r}:"
            f"gamma_g={self.gamma_g}:"
            f"gamma_b={self.gamma_b}"
        )


class ClipEffects(BaseModel):
    """Complete effects bundle for a single clip.

    This is the dict structure stored under clip['effects'] by the EffectsAgent.
    It extends the original contract (zoom_points, transitions, hook_overlay,
    color_grading) with face detection data, beat markers, and structured
    color grading parameters.
    """

    zoom_points: list[ZoomEffect] = Field(default_factory=list)
    transitions: list[Transition] = Field(default_factory=list)
    hook_overlay: HookOverlay | None = None
    color_grading: ColorGradingLUT = Field(default_factory=ColorGradingLUT)
    face_detections: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Per-timestamp face detection results",
    )
    beat_markers: list[BeatMarker] = Field(
        default_factory=list,
        description="Beat timestamps within this clip range",
    )
    average_face_center: dict[str, float] | None = Field(
        default=None,
        description="Average face center {x, y} across all detections",
    )
