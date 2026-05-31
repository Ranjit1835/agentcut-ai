"""LangGraph stateful workflow orchestrating all 10 agents."""

from __future__ import annotations

from typing import Any

import structlog
from langgraph.graph import END, StateGraph

from app.agents.broll import broll_agent
from app.agents.caption import caption_agent
from app.agents.cut import cut_agent
from app.agents.effects import effects_agent
from app.agents.feedback import feedback_agent
from app.agents.ingest import ingest_agent
from app.agents.quality import quality_agent
from app.agents.render import render_agent
from app.agents.story import story_agent
from app.agents.transcript import transcript_agent
from app.models.state import AgentCutGraphState

logger = structlog.get_logger(__name__)

MAX_QUALITY_RETRIES = 2


# ── Node Functions ─────────────────────────────────────────────────────────────

async def ingest_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await ingest_agent.run(state)


async def transcript_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await transcript_agent.run(state)


async def story_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await story_agent.run(state)


async def cut_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await cut_agent.run(state)


async def broll_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await broll_agent.run(state)


async def caption_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await caption_agent.run(state)


async def effects_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await effects_agent.run(state)


async def quality_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await quality_agent.run(state)


async def render_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await render_agent.run(state)


async def feedback_node(state: AgentCutGraphState) -> dict[str, Any]:
    return await feedback_agent.run(state)


# ── Conditional Edges ──────────────────────────────────────────────────────────

def quality_gate(state: AgentCutGraphState) -> str:
    """Route based on quality check results."""
    should_retry = state.get("should_retry", False)
    retry_count = sum(
        1 for r in state.get("agent_results", [])
        if r.get("agent") == "quality"
    )

    if should_retry and retry_count < MAX_QUALITY_RETRIES:
        logger.info("quality_gate_retry", retry_count=retry_count)
        return "retry"
    return "proceed"


def check_error(state: AgentCutGraphState) -> str:
    """Check if there's a global error."""
    if state.get("global_error"):
        return "error"
    return "continue"


# ── Build Graph ────────────────────────────────────────────────────────────────

def build_workflow() -> StateGraph:
    """Build the AgentCut LangGraph workflow."""
    workflow = StateGraph(AgentCutGraphState)

    # Add all nodes
    workflow.add_node("ingest", ingest_node)
    workflow.add_node("transcript", transcript_node)
    workflow.add_node("story", story_node)
    workflow.add_node("cut", cut_node)
    workflow.add_node("broll", broll_node)
    workflow.add_node("caption", caption_node)
    workflow.add_node("effects", effects_node)
    workflow.add_node("quality", quality_node)
    workflow.add_node("render", render_node)
    workflow.add_node("feedback", feedback_node)

    # Define edges — sequential pipeline with parallel cut+broll
    workflow.set_entry_point("ingest")
    workflow.add_edge("ingest", "transcript")
    workflow.add_edge("transcript", "story")

    # After story: cut and broll run (sequentially here, could be parallel)
    workflow.add_edge("story", "cut")
    workflow.add_edge("cut", "broll")
    workflow.add_edge("broll", "caption")
    workflow.add_edge("caption", "effects")
    workflow.add_edge("effects", "quality")

    # Quality gate: retry or proceed to render
    workflow.add_conditional_edges(
        "quality",
        quality_gate,
        {
            "retry": "story",
            "proceed": "render",
        },
    )

    workflow.add_edge("render", END)

    return workflow


def build_feedback_workflow() -> StateGraph:
    """Build a sub-workflow for processing user feedback."""
    workflow = StateGraph(AgentCutGraphState)

    workflow.add_node("feedback", feedback_node)
    workflow.add_node("caption", caption_node)
    workflow.add_node("effects", effects_node)
    workflow.add_node("render", render_node)

    workflow.set_entry_point("feedback")

    # After feedback, re-run caption → effects → render
    workflow.add_edge("feedback", "caption")
    workflow.add_edge("caption", "effects")
    workflow.add_edge("effects", "render")
    workflow.add_edge("render", END)

    return workflow


# Compiled graphs
main_graph = build_workflow().compile()
feedback_graph = build_feedback_workflow().compile()
