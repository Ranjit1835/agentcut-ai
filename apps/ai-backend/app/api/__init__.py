"""AgentCut AI API routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.projects import router as projects_router
from app.api.uploads import router as uploads_router
from app.api.feedback import router as feedback_router
from app.api.billing import router as billing_router
from app.api.websocket import router as websocket_router

router = APIRouter()

router.include_router(projects_router, prefix="/projects", tags=["Projects"])
router.include_router(uploads_router, prefix="/uploads", tags=["Uploads"])
router.include_router(feedback_router, prefix="/feedback", tags=["Feedback"])
router.include_router(billing_router, prefix="/billing", tags=["Billing"])
router.include_router(websocket_router, tags=["WebSocket"])
