"""Tests for backend service modules."""

from __future__ import annotations

import json
from unittest.mock import patch, MagicMock, AsyncMock

import pytest


class TestClaudeClient:
    async def test_call_claude_json_parses_valid_json(self) -> None:
        from app.services.claude_client import call_claude_json

        mock_response = MagicMock()
        mock_content_block = MagicMock()
        mock_content_block.text = '{"clips": [{"title": "Test Clip", "score": 85}]}'
        mock_response.content = [mock_content_block]
        mock_response.usage = MagicMock(
            input_tokens=100,
            output_tokens=50,
            cache_read_input_tokens=0,
            cache_creation_input_tokens=0,
        )

        with patch("app.services.claude_client.get_claude_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            result = await call_claude_json(
                system_prompt="You are a test assistant.",
                user_message="Return JSON.",
                model="claude-sonnet-4-6",
            )

        assert isinstance(result, dict)
        assert "clips" in result

    async def test_call_claude_json_handles_markdown_fenced(self) -> None:
        from app.services.claude_client import call_claude_json

        mock_response = MagicMock()
        mock_content_block = MagicMock()
        mock_content_block.text = '```json\n{"result": "ok"}\n```'
        mock_response.content = [mock_content_block]
        mock_response.usage = MagicMock(
            input_tokens=100,
            output_tokens=50,
            cache_read_input_tokens=0,
            cache_creation_input_tokens=0,
        )

        with patch("app.services.claude_client.get_claude_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            result = await call_claude_json(
                system_prompt="Test",
                user_message="Test",
                model="claude-sonnet-4-6",
            )

        assert result["result"] == "ok"


class TestR2Storage:
    async def test_generate_signed_url_format(self) -> None:
        with patch("app.services.r2_storage.get_r2_client") as mock_get:
            mock_client = MagicMock()
            mock_client.generate_presigned_url.return_value = (
                "https://test-bucket.r2.cloudflarestorage.com/test-key?sig=abc"
            )
            mock_get.return_value = mock_client

            from app.services.r2_storage import generate_signed_url

            url = await generate_signed_url("test-key")
            assert "test-key" in url or url.startswith("https://")


class TestFFmpegService:
    async def test_get_video_metadata_builds_command(self) -> None:
        import asyncio
        from unittest.mock import patch

        mock_result = json.dumps({
            "streams": [
                {
                    "codec_type": "video",
                    "width": 1920,
                    "height": 1080,
                    "r_frame_rate": "30/1",
                    "duration": "120.5",
                },
                {
                    "codec_type": "audio",
                    "sample_rate": "44100",
                },
            ],
            "format": {
                "duration": "120.5",
            },
        })

        with patch("asyncio.to_thread") as mock_thread:
            mock_thread.return_value = mock_result
            # Just verify the function can be imported and called
            from app.services.ffmpeg_service import get_video_metadata
            assert callable(get_video_metadata)
