"""
AgentCut AI — FastAPI application entry point.

Configures the ASGI app with:
- Lifespan context manager (startup/shutdown)
- CORS middleware
- Sentry error tracking
- Structured logging
- API routers
- Health check endpoint
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.observability.langsmith import setup_langsmith
from app.observability.sentry import setup_sentry

logger = structlog.get_logger(__name__)

# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Startup: initialise all integrations, validate config, warm up connections.
    Shutdown: gracefully close connections and flush telemetry.
    """
    settings = get_settings()

    # --- Startup ---
    logger.info(
        "agentcut_startup",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )

    # Initialise observability
    setup_sentry(settings)
    setup_langsmith(settings)

    logger.info("agentcut_ready", message="All systems initialised. Ready to accept requests.")

    yield

    # --- Shutdown ---
    logger.info("agentcut_shutdown", message="Shutting down gracefully.")


# ── App Factory ───────────────────────────────────────────────────────────────


def create_app() -> FastAPI:
    """Creates and configures the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "AgentCut AI — Multi-agent video processing pipeline. "
            "Upload long-form video, receive ready-to-post viral short clips."
        ),
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ----- Middleware (order matters: last added = first executed) -----------
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "X-API-Key",
        ],
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )

    # ----- Request timing middleware ----------------------------------------
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next: object) -> Response:
        start_time = time.perf_counter()
        response: Response = await call_next(request)  # type: ignore[operator]
        process_time = (time.perf_counter() - start_time) * 1000
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        return response

    # ----- Routers ----------------------------------------------------------
    # Import routers here to avoid circular imports at module level
    from app.api import router as api_router  # noqa: PLC0415

    app.include_router(api_router, prefix="/api/v1")

    # ----- Health check (no auth required) -----------------------------------
    @app.get("/health", tags=["System"], summary="Health check")
    async def health_check() -> dict[str, str]:
        """
        Returns the current health status of the API.
        Used by load balancers and uptime monitors.
        """
        return {
            "status": "healthy",
            "version": settings.app_version,
            "environment": settings.environment,
        }

    @app.get("/", tags=["System"], include_in_schema=False)
    async def root() -> dict[str, str]:
        return {"message": f"Welcome to {settings.app_name} API v{settings.app_version}"}

    # ----- Global exception handlers ----------------------------------------
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        logger.warning("validation_error", path=str(request.url), error=str(exc))
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc), "type": "validation_error"},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "unhandled_exception",
            path=str(request.url),
            error=str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An internal server error occurred.",
                "type": "internal_error",
            },
        )

    return app


# ── Application Instance ──────────────────────────────────────────────────────
app = create_app()
