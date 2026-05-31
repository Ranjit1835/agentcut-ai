"""Billing API — Polar.sh webhooks and subscription management."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

import structlog
from fastapi import APIRouter, Header, HTTPException, Request

from app.config import get_settings

logger = structlog.get_logger(__name__)
router = APIRouter()

PLAN_CREDITS = {
    "free": 30,
    "starter": 150,
    "pro": 500,
    "studio": 2000,
}


@router.post("/webhooks/polar")
async def polar_webhook(
    request: Request,
    x_polar_signature: str = Header(None, alias="X-Polar-Signature"),
) -> dict[str, str]:
    """Handle Polar.sh subscription webhooks."""
    body = await request.body()

    # Verify webhook signature
    if x_polar_signature:
        settings = get_settings()
        expected = hmac.new(
            settings.secret_key.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(x_polar_signature, expected):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    import json
    payload = json.loads(body)
    event_type = payload.get("type", "")

    logger.info("polar_webhook", event_type=event_type)

    if event_type == "subscription.created":
        await _handle_subscription_created(payload.get("data", {}))
    elif event_type == "subscription.updated":
        await _handle_subscription_updated(payload.get("data", {}))
    elif event_type == "subscription.canceled":
        await _handle_subscription_canceled(payload.get("data", {}))

    return {"status": "ok"}


@router.get("/subscription")
async def get_subscription() -> dict[str, Any]:
    """Get current user subscription details."""
    return {
        "plan_tier": "free",
        "credits_remaining": 30,
        "credits_total": 30,
        "status": "active",
    }


@router.get("/usage")
async def get_usage() -> dict[str, Any]:
    """Get current billing period usage."""
    return {
        "credits_used": 0,
        "credits_remaining": 30,
        "videos_generated": 0,
        "processing_time_seconds": 0,
    }


async def _handle_subscription_created(data: dict[str, Any]) -> None:
    plan = data.get("plan", {}).get("name", "free").lower()
    credits = PLAN_CREDITS.get(plan, 30)
    logger.info("subscription_created", plan=plan, credits=credits)


async def _handle_subscription_updated(data: dict[str, Any]) -> None:
    plan = data.get("plan", {}).get("name", "free").lower()
    logger.info("subscription_updated", plan=plan)


async def _handle_subscription_canceled(data: dict[str, Any]) -> None:
    logger.info("subscription_canceled")
