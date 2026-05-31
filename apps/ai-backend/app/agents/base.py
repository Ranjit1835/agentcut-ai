"""Base agent with shared retry, logging, and LangSmith tracing."""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

import structlog
from langsmith import traceable

from app.models.state import AgentCutGraphState, AgentName, AgentStatus

logger = structlog.get_logger(__name__)


class BaseAgent(ABC):
    """Base class for all AgentCut pipeline agents."""

    name: AgentName

    @abstractmethod
    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        """Core agent logic. Must return a dict of state updates."""
        ...

    @traceable(run_type="chain")
    async def run(self, state: AgentCutGraphState) -> dict[str, Any]:
        """Execute the agent with timing, error handling, and result tracking."""
        started_at = datetime.now(timezone.utc)
        start_time = time.perf_counter()

        logger.info("agent_start", agent=self.name, project_id=state.get("project_id"))

        try:
            updates = await self._execute(state)

            elapsed = time.perf_counter() - start_time
            result = {
                "agent": self.name,
                "status": AgentStatus.COMPLETE,
                "started_at": started_at.isoformat(),
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "duration_seconds": round(elapsed, 2),
                "confidence_score": updates.pop("_confidence", None),
                "retry_count": 0,
            }

            updates["agent_results"] = [result]
            logger.info("agent_complete", agent=self.name, duration=elapsed)
            return updates

        except Exception as e:
            elapsed = time.perf_counter() - start_time
            logger.error("agent_failed", agent=self.name, error=str(e), duration=elapsed)

            return {
                "agent_results": [{
                    "agent": self.name,
                    "status": AgentStatus.FAILED,
                    "started_at": started_at.isoformat(),
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "duration_seconds": round(elapsed, 2),
                    "error_message": str(e),
                    "retry_count": 0,
                }],
                "global_error": f"Agent {self.name} failed: {str(e)}",
            }
