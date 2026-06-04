"""Tests for the Billing API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestBillingWebhook:
    async def test_webhook_without_signature_processes(self, client: AsyncClient) -> None:
        # The webhook endpoint accepts requests without a signature
        # (signature validation is conditional)
        response = await client.post(
            "/api/v1/billing/webhooks/polar",
            json={"type": "subscription.created", "data": {}},
        )
        assert response.status_code == 200


class TestSubscription:
    async def test_get_subscription(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/billing/subscription")
        assert response.status_code == 200
        data = response.json()
        assert "plan" in data or "status" in data

    async def test_get_usage(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/billing/usage")
        assert response.status_code == 200
        data = response.json()
        assert "credits_used" in data or "videos_generated" in data
