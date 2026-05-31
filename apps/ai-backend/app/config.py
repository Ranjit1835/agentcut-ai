"""
Application configuration using pydantic-settings.

All values are read from environment variables (or .env file).
Settings are validated at startup — missing required values raise immediately.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for AgentCut AI backend.

    Loaded from environment variables with optional .env file support.
    All secrets must be set via env vars — never hardcoded.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ----- Application -------------------------------------------------------
    app_name: str = "AgentCut AI"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    secret_key: str = Field(
        ...,
        alias="BACKEND_SECRET_KEY",
        min_length=32,
        description="Secret key for signing JWT tokens and internal auth",
    )
    allowed_origins: list[str] = Field(
        default=["http://localhost:3000"],
        description="CORS allowed origins",
    )

    # ----- Supabase ----------------------------------------------------------
    supabase_url: AnyHttpUrl = Field(..., alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_anon_key: str = Field(..., alias="NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str = Field(..., alias="SUPABASE_JWT_SECRET")
    database_url: str = Field(..., alias="DATABASE_URL")

    # ----- AI Providers ------------------------------------------------------
    anthropic_api_key: str = Field(..., alias="ANTHROPIC_API_KEY")
    groq_api_key: str = Field(..., alias="GROQ_API_KEY")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")

    # ----- LangSmith ---------------------------------------------------------
    langchain_tracing_v2: bool = Field(default=True, alias="LANGCHAIN_TRACING_V2")
    langchain_endpoint: str = Field(
        default="https://api.smith.langchain.com",
        alias="LANGCHAIN_ENDPOINT",
    )
    langchain_api_key: str = Field(default="", alias="LANGCHAIN_API_KEY")
    langchain_project: str = Field(
        default="agentcut-ai-development",
        alias="LANGCHAIN_PROJECT",
    )

    # ----- AWS / Cloudflare R2 -----------------------------------------------
    aws_access_key_id: str = Field(..., alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(..., alias="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="auto", alias="AWS_REGION")
    r2_bucket_name: str = Field(..., alias="R2_BUCKET_NAME")
    r2_endpoint_url: str = Field(..., alias="R2_ENDPOINT_URL")
    r2_public_url: str = Field(..., alias="R2_PUBLIC_URL")

    # ----- Inngest -----------------------------------------------------------
    inngest_event_key: str = Field(..., alias="INNGEST_EVENT_KEY")
    inngest_signing_key: str = Field(..., alias="INNGEST_SIGNING_KEY")

    # ----- Sentry ------------------------------------------------------------
    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")
    sentry_traces_sample_rate: float = Field(default=0.1)
    sentry_profiles_sample_rate: float = Field(default=0.1)

    # ----- PostHog -----------------------------------------------------------
    posthog_api_key: str = Field(default="", alias="POSTHOG_API_KEY")
    posthog_host: str = Field(
        default="https://us.i.posthog.com",
        alias="NEXT_PUBLIC_POSTHOG_HOST",
    )

    # ----- Processing --------------------------------------------------------
    max_video_duration_seconds: int = Field(
        default=10800,  # 3 hours
        description="Maximum allowed video duration for processing",
    )
    max_file_size_bytes: int = Field(
        default=5 * 1024 * 1024 * 1024,  # 5 GB
        description="Maximum allowed file size for uploads",
    )
    max_clips_per_project: int = Field(
        default=30,
        description="Maximum number of clips to generate per project",
    )
    default_clip_min_duration: float = Field(
        default=15.0,
        description="Minimum clip duration in seconds",
    )
    default_clip_max_duration: float = Field(
        default=90.0,
        description="Maximum clip duration in seconds",
    )
    processing_concurrency: int = Field(
        default=3,
        description="Number of concurrent agent tasks",
    )

    # ----- Redis (optional) --------------------------------------------------
    redis_url: str = Field(default="", alias="REDIS_URL")

    # ----- Validators --------------------------------------------------------
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str | list[str]) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS env var."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_production(self) -> bool:
        """Returns True if running in production environment."""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """Returns True if running in development environment."""
        return self.environment == "development"

    @property
    def supabase_url_str(self) -> str:
        """Returns the Supabase URL as a plain string."""
        return str(self.supabase_url)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns the cached application settings singleton.

    Use this function (not Settings() directly) to get settings,
    so the config is only loaded and validated once per process.

    Example:
        from app.config import get_settings
        settings = get_settings()
    """
    return Settings()  # type: ignore[call-arg]
