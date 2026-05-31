"""Unit tests for AgentCut agents."""

import pytest
from app.agents.cut import CutAgent
from app.models.state import AgentName


class TestCutAgent:
    """Tests for the CutAgent timeline builder."""

    def setup_method(self) -> None:
        self.agent = CutAgent()

    def test_agent_name(self) -> None:
        assert self.agent.name == AgentName.CLIP_SELECTOR

    def test_build_cut_timeline_no_removals(self) -> None:
        result = self.agent._build_cut_timeline(0.0, 10.0, [], [])
        assert len(result) == 1
        assert result[0]["start"] == 0.0
        assert result[0]["end"] == 10.0

    def test_build_cut_timeline_with_silence(self) -> None:
        silences = [{"start": 3.0, "end": 5.0, "duration": 2.0}]
        result = self.agent._build_cut_timeline(0.0, 10.0, silences, [])
        assert len(result) == 2
        assert result[0]["start"] == 0.0
        assert result[0]["end"] == 3.0
        assert result[1]["start"] == 5.0
        assert result[1]["end"] == 10.0

    def test_build_cut_timeline_with_fillers(self) -> None:
        fillers = [{"start": 2.0, "end": 2.5, "word": "um"}]
        result = self.agent._build_cut_timeline(0.0, 10.0, [], fillers)
        assert len(result) == 2
        assert result[0]["end"] == 2.0
        assert result[1]["start"] == 2.5

    def test_build_cut_timeline_overlapping(self) -> None:
        silences = [{"start": 3.0, "end": 5.0, "duration": 2.0}]
        fillers = [{"start": 4.0, "end": 6.0, "word": "like"}]
        result = self.agent._build_cut_timeline(0.0, 10.0, silences, fillers)
        # Should merge overlapping removals: 3.0-6.0
        assert len(result) == 2
        assert result[0]["end"] == 3.0
        assert result[1]["start"] == 6.0


class TestRenderAgent:
    """Tests for the RenderAgent ASS generation."""

    def test_seconds_to_ass_time(self) -> None:
        from app.agents.render import RenderAgent
        agent = RenderAgent()
        assert agent._seconds_to_ass_time(0.0) == "0:00:00.00"
        assert agent._seconds_to_ass_time(65.5) == "0:01:05.50"
        assert agent._seconds_to_ass_time(3661.25) == "1:01:01.25"
