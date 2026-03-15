"""
AgriMemo — FastAPI Application Factory
Lifespan, middleware, routers, error handling.
"""
import os
import traceback
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.routers import health, provider, voice_notes
from app.services.audio_processor import AudioProcessor
from app.services.deduplication import DeduplicationEngine
from app.services.deepgram_service import DeepgramService
from app.services.event_logger import EventLogger
from app.services.structuring_engine import StructuringEngine
from app.storage.composite_store import CompositeStore
from app.utils.audio_utils import cleanup_stale_temp_files

log = structlog.get_logger()


def configure_logging():
    """Configure structured JSON logging with secret masking."""

    def mask_secrets(logger, method, event_dict):
        for k in list(event_dict.keys()):
            if any(s in k.lower() for s in ["key", "token", "secret", "password"]):
                event_dict[k] = "***MASKED***"
        return event_dict

    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            mask_secrets,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ]
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    configure_logging()

    os.makedirs(settings.audio_temp_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(settings.json_store_path)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(settings.event_log_path)), exist_ok=True)

    await cleanup_stale_temp_files(settings.audio_temp_dir, max_age_hours=1)

    composite_store = CompositeStore(settings)
    await composite_store.initialize()

    deepgram_service = DeepgramService(settings)
    structuring_engine = StructuringEngine(settings)
    dedup_engine = DeduplicationEngine(settings)
    audio_processor = AudioProcessor(settings)
    event_logger = EventLogger(settings.event_log_path)

    app.state.store = composite_store
    app.state.deepgram = deepgram_service
    app.state.structuring = structuring_engine
    app.state.dedup = dedup_engine
    app.state.audio_processor = audio_processor
    app.state.event_logger = event_logger

    note_count = await composite_store.count()
    log.info(
        "agrimemo_started",
        environment=settings.app_env,
        notes_loaded=note_count,
        version=settings.app_version,
    )

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    await deepgram_service.close()
    await structuring_engine.close()
    log.info("agrimemo_shutdown")


def create_app() -> FastAPI:
    limiter = Limiter(key_func=get_remote_address)

    app = FastAPI(
        title="AgriMemo API",
        description="Voice-to-structured knowledge pipeline for field intelligence",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if not settings.is_production else settings.allowed_origins,
        allow_credentials=True if settings.is_production else False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(voice_notes.router, tags=["Voice Notes"])
    app.include_router(health.router, tags=["Health"])
    app.include_router(provider.router, tags=["Provider"])

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        log.error("unhandled_exception", error=str(exc), path=str(request.url))
        if settings.is_production:
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "detail": None},
            )
        return JSONResponse(
            status_code=500,
            content={"error": str(exc), "detail": traceback.format_exc()},
        )

    return app


app = create_app()
