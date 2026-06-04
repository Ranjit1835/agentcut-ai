"""Tests for the Feedback API endpoint."""

from __future__ import annotations

from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from httpx import AsyncClient


class TestFeedbackEndpoint:
    async def test_submit_feedback(self, client: AsyncClient) -> None:
        mock_result = {
            "agents_to_rerun": ["caption", "render"],
            "parameter_changes": {},
            "message": "I'll update the captions and re-render.",
            "parsed_actions": [{"action": "restyle_captions"}],
        }

        with patch("app.agents.feedback.feedback_agent") as mock_agent:
            mock_agent.run = AsyncMock(return_value=mock_result)
            response = await client.post(
                "/api/v1/feedback/",
                json={
                    "project_id": "test-project-123",
                    "clip_id": "test-clip-456",
                    "user_input": "Make the captions bigger",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "agents_to_rerun" in data
