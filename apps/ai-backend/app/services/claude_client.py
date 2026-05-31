"""Anthropic Claude client with prompt caching and retry logic."""

from __future__ import annotations

import hashlib
import json
from typing import Any

import anthropic
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = structlog.get_logger(__name__)

_client: anthropic.Anthropic | None = None


def get_claude_client() -> anthropic.Anthropic:
    """Returns a singleton Anthropic client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
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
    Call Claude with prompt caching enabled.

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

    response = client.messages.create(
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

    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return json.loads(cleaned.strip())
