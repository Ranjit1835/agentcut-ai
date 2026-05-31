"""LangSmith observability setup for tracing all LLM calls."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from app.config import Settings

logger = structlog.get_logger(__name__)


def setup_langsmith(settings: Settings) -> None:
    """Configure LangSmith tracing for all LangChain/LangGraph calls."""
    if not settings.langchain_api_key:
        logger.warning("langsmith_disabled", reason="LANGCHAIN_API_KEY not set")
        return

    os.environ["LANGCHAIN_TRACING_V2"] = str(settings.langchain_tracing_v2).lower()
    os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project

    logger.info(
        "langsmith_configured",
        project=settings.langchain_project,
        tracing_enabled=settings.langchain_tracing_v2,
    )
