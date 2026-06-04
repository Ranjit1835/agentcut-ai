"""Anthropic Claude client with prompt caching and retry logic."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
from typing import Any

import anthropic
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = structlog.get_logger(__name__)

_client: anthropic.AsyncAnthropic | None = None
_sync_client: anthropic.Anthropic | None = None


def get_claude_client() -> anthropic.AsyncAnthropic:
    """Returns a singleton async Anthropic client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=120.0,
        )
    return _client


def _cache_key(model: str, system: str, messages: list[dict[str, Any]]) -> str:
    """Generate a deterministic cache key for prompt caching."""
    payload = json.dumps({"model": model, "system": system, "messages": messages}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def call_claude(
    system_prompt: str,
    user_message: str,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 4096,
    temperature: float = 0.3,
    response_format: type | None = None,
) -> str:
    """
    Call Claude with prompt caching enabled (async).

    Uses cache_control on the system prompt to get 90% cost savings
    on repeated calls with the same system prompt.
    """
    client = get_claude_client()

    messages: list[dict[str, Any]] = [
        {"role": "user", "content": user_message}
    ]

    logger.info(
        "claude_call_start",
        model=model,
        system_len=len(system_prompt),
        user_len=len(user_message),
    )

    response = await asyncio.wait_for(
        client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
        ),
        timeout=120.0,
    )

    result = response.content[0].text  # type: ignore[union-attr]

    logger.info(
        "claude_call_complete",
        model=model,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        cache_read=getattr(response.usage, "cache_read_input_tokens", 0),
        cache_creation=getattr(response.usage, "cache_creation_input_tokens", 0),
    )

    return result


def _extract_json(raw: str) -> dict[str, Any]:
    """Robustly extract JSON from Claude's response, handling markdown fences and preamble."""
    cleaned = raw.strip()

    # Try to find JSON in markdown code fences first
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    else:
        # Try to find raw JSON object
        brace_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if brace_match:
            cleaned = brace_match.group(0)

    return json.loads(cleaned)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def call_claude_json(
    system_prompt: str,
    user_message: str,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 4096,
    temperature: float = 0.2,
) -> dict[str, Any]:
    """Call Claude and parse the response as JSON."""
    raw = await call_claude(
        system_prompt=system_prompt + "\n\nYou MUST respond with valid JSON only. No markdown, no explanation.",
        user_message=user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )

    try:
        return _extract_json(raw)
    except json.JSONDecodeError as e:
        logger.error("json_parse_failed", raw_preview=raw[:500], error=str(e))
        raise ValueError(f"Claude returned invalid JSON: {e}. Response preview: {raw[:200]}")
