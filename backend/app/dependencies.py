"""
AgriMemo — FastAPI Dependency Injection
"""
from fastapi import Request

from app.storage.composite_store import CompositeStore
from app.services.deepgram_service import DeepgramService
from app.services.structuring_engine import StructuringEngine
from app.services.deduplication import DeduplicationEngine
from app.services.event_logger import EventLogger
from app.services.audio_processor import AudioProcessor


def get_store(request: Request) -> CompositeStore:
    return request.app.state.store


def get_deepgram(request: Request) -> DeepgramService:
    return request.app.state.deepgram


def get_structuring(request: Request) -> StructuringEngine:
    return request.app.state.structuring


def get_dedup(request: Request) -> DeduplicationEngine:
    return request.app.state.dedup


def get_event_logger(request: Request) -> EventLogger:
    return request.app.state.event_logger


def get_audio_processor(request: Request) -> AudioProcessor:
    return request.app.state.audio_processor
