"""Shared test fixtures for AgentCut AI backend tests."""

from __future__ import annotations

import os
from typing import AsyncGenerator
from unittest.mock import patch, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

# Set required env vars BEFORE any app imports trigger Settings validation
TEST_ENV = {
    "BACKEND_SECRET_KEY": "test-secret-key-that-is-at-least-32-chars-long",
    "NEXT_PUBLIC_SUPABASE_URL": "https://test.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
    "SUPABASE_JWT_SECRET": "test-jwt-secret",
    "DATABASE_URL": "postgresql://test:test@localhost:5432/test",
    "ANTHROPIC_API_KEY": "test-anthropic-key",
    "GROQ_API_KEY": "test-groq-key",
    "AWS_ACCESS_KEY_ID": "test-access-key",
    "AWS_SECRET_ACCESS_KEY": "test-secret-access-key",
    "R2_BUCKET_NAME": "test-bucket",
    "R2_ENDPOINT_URL": "https://test.r2.cloudflarestorage.com",
    "R2_PUBLIC_URL": "https://pub-test.r2.dev",
    "INNGEST_EVENT_KEY": "test-inngest-event-key",
    "INNGEST_SIGNING_KEY": "test-inngest-signing-key",
}

# Patch environment before any app code is imported
os.environ.update(TEST_ENV)

from app.main import create_app


@pytest.fixture
def app():
    """Create a fresh FastAPI app instance for testing."""
    return create_app()


@pytest.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for testing FastAPI endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
def mock_settings():
    """Override settings with test-safe values."""
    with patch.dict("os.environ", TEST_ENV):
        yield TEST_ENV
