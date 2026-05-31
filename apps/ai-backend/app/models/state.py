"""
AgentCutState — The central state object that flows through the LangGraph pipeline.

This is the single source of truth for all data produced and consumed by each
agent node. LangGraph checkpoints this state at every node transition, enabling:
  - Resumability (restart from last successful node)
  - Observability (full audit trail per project)
  - Parallel branching (future: concurrent clip rendering)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, Field, field_validator


# ── Enums ─────────────────────────────────────────────────────────────────────


class ProcessingStage(StrEnum):
    """The overall stage of the pipeline for a project."""

    PENDING = "pending"
    INGESTING = "ingesting"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing"
    SELECTING_CLIPS = "selecting_clips"
    CAPTIONING = "captioning"
    RENDERING = "rendering"
    QUALITY_CHECK = "quality_check"
    COMPLETE = "complete"
    FAILED = "failed"
    PARTIALLY_COMPLETE = "partially_complete"


class AgentName(StrEnum):
    """Names of all agents in the pipeline."""

    INGESTION = "ingestion"
    TRANSCRIPTION = "transcription"
    ANALYSIS = "analysis"
    CLIP_SELECTOR = "clip_selector"
    CAPTION = "caption"
    BROLL = "broll"
    RENDER = "render"
    QUALITY = "quality"
    FEEDBACK = "feedback"


class AgentStatus(StrEnum):
    """Status of an individual agent's execution."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"


class SourceType(StrEnum):
    """Type of the source video input."""

    YOUTUBE = "youtube"
    UPLOAD = "upload"
    URL = "url"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"


class StylePreset(StrEnum):
    """Visual style presets for rendering."""

    BOLD_CAPTIONS = "bold_captions"
    MINIMAL = "minimal"
    NEON = "neon"
    CORPORATE = "corporate"
    VIRAL = "viral"


# ── Sub-models ────────────────────────────────────────────────────────────────


class WordTimestamp(BaseModel):
    """A single word with its start/end timestamps from Whisper output."""

    word: str
    start: float = Field(..., ge=0, description="Start time in seconds")
    end: float = Field(..., ge=0, description="End time in seconds")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    speaker: str | None = Field(default=None, description="Speaker label if diarized")

    @field_validator("end")
    @classmethod
    def end_after_start(cls, v: float, info: Any) -> float:
        if "start" in info.data and v < info.data["start"]:
            raise ValueError("end time must be >= start time")
        return v


class SpeakerSegment(BaseModel):
    """A contiguous segment of speech from a single speaker."""

    speaker: str = Field(..., description="Speaker label, e.g. 'SPEAKER_00'")
    start: float = Field(..., ge=0)
    end: float = Field(..., ge=0)
    text: str


class FillerWordOccurrence(BaseModel):
    """A detected filler word (um, uh, like, you know) with its timestamp."""

    word: str
    start: float
    end: float
    speaker: str | None = None


class SilenceSegment(BaseModel):
    """A segment of silence in the audio."""

    start: float
    end: float
    duration: float = Field(..., ge=0)


class ClipCandidate(BaseModel):
    """
    A candidate clip identified by the analysis agent.

    Scored and ranked by the ClipSelectorAgent before being passed
    to the CaptionAgent and RenderAgent.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    clip_index: int = Field(..., ge=0, description="Zero-based index among all candidates")
    title: str = Field(..., max_length=200)
    start_time: float = Field(..., ge=0, description="Start time in seconds")
    end_time: float = Field(..., ge=0, description="End time in seconds")

    # Scoring
    virality_score: int = Field(
        ..., ge=0, le=100, description="Virality score 0-100 from analysis agent"
    )
    hook_text: str = Field(
        ..., max_length=500, description="The hook / opening line that grabs attention"
    )
    narrative_summary: str = Field(
        ..., max_length=1000, description="Why this clip is engaging"
    )

    # Analysis metadata
    key_moments: list[str] = Field(
        default_factory=list,
        description="Timestamps of key moments within the clip",
    )
    emotional_arc: str = Field(
        default="",
        description="e.g. 'tension → revelation → payoff'",
    )
    target_audience: str = Field(default="", max_length=200)
    suggested_caption: str = Field(default="", max_length=500)
    hashtag_suggestions: list[str] = Field(default_factory=list, max_length=10)

    # Processing state
    render_status: AgentStatus = AgentStatus.PENDING
    render_r2_key: str | None = None
    render_url: str | None = None
    thumbnail_url: str | None = None

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: float, info: Any) -> float:
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be > start_time")
        return v


class CaptionSegment(BaseModel):
    """
    A single caption segment with styling information.

    Used by the CaptionAgent to produce subtitle files (ASS/SRT).
    """

    index: int
    start: float
    end: float
    text: str
    speaker: str | None = None
    emphasized_words: list[str] = Field(
        default_factory=list,
        description="Words to display with emphasis styling",
    )
    emotion: str | None = Field(
        default=None,
        description="Detected emotion for dynamic styling",
    )


class AgentResult(BaseModel):
    """The result returned by an agent node."""

    agent: AgentName
    status: AgentStatus
    started_at: datetime
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    error_message: str | None = None
    confidence_score: float | None = Field(default=None, ge=0.0, le=1.0)
    output_summary: dict[str, Any] = Field(default_factory=dict)
    retry_count: int = Field(default=0, ge=0)


# ── Main State ────────────────────────────────────────────────────────────────


class AgentCutState(BaseModel):
    """
    The complete state object for the AgentCut LangGraph pipeline.

    This state is:
    1. Created when a project is first submitted for processing
    2. Updated by each agent node as it completes its work
    3. Persisted by LangGraph at every checkpoint
    4. Used by the frontend to display real-time progress

    TypedDict version is used as the actual LangGraph state schema (below).
    This Pydantic version is used for validation and serialization.
    """

    # ----- Identity -------------------------------------------------------
    project_id: str = Field(..., description="UUID of the project in Supabase")
    user_id: str = Field(..., description="UUID of the user who owns this project")
    run_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique ID for this pipeline run (for LangSmith tracing)",
    )

    # ----- Input ----------------------------------------------------------
    source_url: str | None = Field(default=None, description="YouTube/TikTok/etc. URL")
    source_type: SourceType = SourceType.YOUTUBE
    style_preset: StylePreset = StylePreset.BOLD_CAPTIONS
    target_clip_count: int = Field(default=10, ge=1, le=30)
    min_clip_duration: float = Field(default=15.0, ge=5.0)
    max_clip_duration: float = Field(default=90.0, le=180.0)
    custom_instructions: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional user instructions for clip selection / style",
    )

    # ----- Storage --------------------------------------------------------
    upload_r2_key: str | None = None
    audio_r2_key: str | None = None
    thumbnail_r2_key: str | None = None
    video_duration_seconds: float | None = None
    video_resolution: str | None = None  # e.g. "1920x1080"
    video_fps: float | None = None
    audio_sample_rate: int | None = None

    # ----- Transcription --------------------------------------------------
    full_transcript: str | None = None
    word_timestamps: list[WordTimestamp] = Field(default_factory=list)
    speaker_segments: list[SpeakerSegment] = Field(default_factory=list)
    filler_words: list[FillerWordOccurrence] = Field(default_factory=list)
    silences: list[SilenceSegment] = Field(default_factory=list)
    detected_language: str | None = None
    transcript_confidence: float | None = None

    # ----- Analysis -------------------------------------------------------
    content_summary: str | None = None
    main_topics: list[str] = Field(default_factory=list)
    sentiment_overall: str | None = None  # "positive" | "negative" | "neutral" | "mixed"
    engagement_signals: dict[str, Any] = Field(
        default_factory=dict,
        description="Raw engagement signals identified by Claude",
    )

    # ----- Clip Selection -------------------------------------------------
    clip_candidates: list[ClipCandidate] = Field(default_factory=list)
    selected_clips: list[ClipCandidate] = Field(default_factory=list)

    # ----- Captions -------------------------------------------------------
    caption_segments_by_clip: dict[str, list[CaptionSegment]] = Field(
        default_factory=dict,
        description="Mapping of clip_id -> list of caption segments",
    )

    # ----- Pipeline Control -----------------------------------------------
    current_stage: ProcessingStage = ProcessingStage.PENDING
    agent_results: list[AgentResult] = Field(default_factory=list)
    global_error: str | None = Field(
        default=None,
        description="Set if a fatal error halts the entire pipeline",
    )
    should_retry: bool = False
    max_retries: int = Field(default=3, ge=0)

    # ----- Credits --------------------------------------------------------
    credits_consumed: int = Field(default=0, ge=0)

    # ----- Timestamps -----------------------------------------------------
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Helpers ────────────────────────────────────────────────────────────

    def get_agent_result(self, agent: AgentName) -> AgentResult | None:
        """Returns the most recent result for a given agent."""
        results = [r for r in self.agent_results if r.agent == agent]
        return results[-1] if results else None

    def is_agent_complete(self, agent: AgentName) -> bool:
        """Returns True if the given agent completed successfully."""
        result = self.get_agent_result(agent)
        return result is not None and result.status == AgentStatus.COMPLETE

    def get_top_clips(self, n: int = 10) -> list[ClipCandidate]:
        """Returns the top-n clips sorted by virality score descending."""
        return sorted(
            self.selected_clips, key=lambda c: c.virality_score, reverse=True
        )[:n]

    def mark_stage(self, stage: ProcessingStage) -> "AgentCutState":
        """Returns a copy of the state with the stage updated."""
        return self.model_copy(
            update={"current_stage": stage, "updated_at": datetime.utcnow()}
        )


# ── LangGraph TypedDict State ────────────────────────────────────────────────
# LangGraph requires TypedDict for state annotations.
# We use Annotated[list, operator.add] to allow reducers to append to lists
# rather than replace them.

from typing import TypedDict  # noqa: E402
import operator  # noqa: E402


class AgentCutGraphState(TypedDict, total=False):
    """
    TypedDict version of AgentCutState for use as the LangGraph state schema.

    Fields annotated with Annotated[list, operator.add] support appending
    (multiple agents can add to the list without race conditions).
    Fields without annotation are last-write-wins.
    """

    project_id: str
    user_id: str
    run_id: str
    source_url: str | None
    source_type: str
    style_preset: str
    target_clip_count: int
    min_clip_duration: float
    max_clip_duration: float
    custom_instructions: str | None
    upload_r2_key: str | None
    audio_r2_key: str | None
    thumbnail_r2_key: str | None
    video_duration_seconds: float | None
    video_resolution: str | None
    full_transcript: str | None
    word_timestamps: Annotated[list[dict[str, Any]], operator.add]
    speaker_segments: Annotated[list[dict[str, Any]], operator.add]
    filler_words: Annotated[list[dict[str, Any]], operator.add]
    silences: Annotated[list[dict[str, Any]], operator.add]
    detected_language: str | None
    clip_candidates: Annotated[list[dict[str, Any]], operator.add]
    selected_clips: Annotated[list[dict[str, Any]], operator.add]
    caption_segments_by_clip: dict[str, list[dict[str, Any]]]
    current_stage: str
    agent_results: Annotated[list[dict[str, Any]], operator.add]
    global_error: str | None
    should_retry: bool
    credits_consumed: int
