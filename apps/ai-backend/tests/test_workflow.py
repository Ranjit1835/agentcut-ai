"""Tests for the LangGraph workflow orchestration."""

from __future__ import annotations

import pytest

from app.graph.workflow import (
    build_workflow,
    build_feedback_workflow,
    quality_gate,
    check_error,
)


class TestQualityGate:
    def test_proceed_when_no_retry(self) -> None:
        state = {"should_retry": False, "agent_results": []}
        assert quality_gate(state) == "proceed"

    def test_retry_when_should_retry_and_under_limit(self) -> None:
        state = {
            "should_retry": True,
            "agent_results": [{"agent": "quality"}],  # 1 retry so far
        }
        assert quality_gate(state) == "retry"

    def test_proceed_when_retries_exhausted(self) -> None:
        state = {
            "should_retry": True,
            "agent_results": [
                {"agent": "quality"},
                {"agent": "quality"},
            ],  # 2 retries = max
        }
        assert quality_gate(state) == "proceed"

    def test_proceed_when_should_retry_false(self) -> None:
        state = {
            "should_retry": False,
            "agent_results": [{"agent": "quality"}],
        }
        assert quality_gate(state) == "proceed"


class TestCheckError:
    def test_continue_when_no_error(self) -> None:
        state = {"global_error": None}
        assert check_error(state) == "continue"

    def test_error_when_global_error_set(self) -> None:
        state = {"global_error": "Pipeline failed at ingest"}
        assert check_error(state) == "error"

    def test_continue_when_key_missing(self) -> None:
        state = {}
        assert check_error(state) == "continue"


class TestWorkflowCompilation:
    def test_main_workflow_compiles(self) -> None:
        workflow = build_workflow()
        graph = workflow.compile()
        assert graph is not None

    def test_feedback_workflow_compiles(self) -> None:
        workflow = build_feedback_workflow()
        graph = workflow.compile()
        assert graph is not None
