"""
AgriMemo — Health check router
GET /health
"""
import time
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.dependencies import get_store, get_deepgram, get_structuring
from app.models.responses import HealthResponse
from app.config import settings

router = APIRouter()

_START_TIME = time.monotonic()


@router.get("/health", response_model=HealthResponse)
async def health_check(
    store=Depends(get_store),
    deepgram=Depends(get_deepgram),
    structuring=Depends(get_structuring),
):
    import asyncio

    deepgram_ok, cf_ok, json_ok = await asyncio.gather(
        deepgram.health_check(),
        structuring.health_check(),
        store.json_store.health_check(),
    )

    all_ok = deepgram_ok and cf_ok and json_ok
    status = "healthy" if all_ok else ("degraded" if json_ok else "unhealthy")

    response = HealthResponse(
        status=status,
        deepgram_available=deepgram_ok,
        cloudflare_ai_available=cf_ok,
        json_store_available=json_ok,
        memory_store_available=True,
        uptime_seconds=round(time.monotonic() - _START_TIME, 2),
        version=settings.app_version,
        environment=settings.app_env,
    )

    http_status = 200 if status != "unhealthy" else 503
    return JSONResponse(content=response.model_dump(), status_code=http_status)
