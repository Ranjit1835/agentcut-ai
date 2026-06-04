"""Tests for the Projects API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestCreateProject:
    async def test_create_project_success(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/projects/",
            json={"title": "Test Video", "source_url": "https://youtube.com/watch?v=abc"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Video"
        assert data["status"] == "pending"
        assert "id" in data

    async def test_create_project_defaults(self, client: AsyncClient) -> None:
        response = await client.post("/api/v1/projects/", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Untitled Project"
        assert data["source_type"] == "youtube"

    async def test_create_project_invalid_clip_count(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/projects/",
            json={"target_clip_count": 100},
        )
        assert response.status_code == 422


class TestGetProject:
    async def test_get_project(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/projects/test-id-123")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-id-123"

    async def test_get_project_clips(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/projects/test-id-123/clips")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestProcessing:
    async def test_start_processing(self, client: AsyncClient) -> None:
        response = await client.post("/api/v1/projects/test-id-123/process")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"
        assert data["project_id"] == "test-id-123"
