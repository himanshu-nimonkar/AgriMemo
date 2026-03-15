"""
AgriMemo — Provider info router
GET /provider
"""
from fastapi import APIRouter
from app.models.responses import ProviderResponse
from app.config import settings

router = APIRouter()


@router.get("/provider", response_model=ProviderResponse)
async def get_provider():
    return ProviderResponse(
        provider="deepgram",
        model=settings.deepgram_model,
        language=settings.deepgram_language,
        smart_format=settings.deepgram_smart_format,
        confidence_threshold=settings.stt_confidence_threshold,
        max_retries=settings.stt_max_retries,
        configured=bool(settings.deepgram_api_key),
    )
