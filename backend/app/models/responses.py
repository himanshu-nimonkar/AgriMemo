"""
AgriMemo — API Response Models
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


class FullNoteResponse(BaseModel):
    note_id: str
    device_id: str
    timestamp: datetime
    created_at: datetime
    audio_filename: str
    audio_duration_seconds: Optional[float] = None
    transcript: Optional[str] = None
    transcript_confidence: Optional[float] = None
    low_confidence: bool
    note_type: Optional[str] = None
    structured_schema_a: Optional[Dict[str, Any]] = None
    structured_schema_b: Optional[Dict[str, Any]] = None
    is_duplicate: bool
    duplicate_of: Optional[str] = None
    pipeline_duration_ms: Optional[int] = None
    status: str
    errors: List[str]


class NoteListResponse(BaseModel):
    notes: List[FullNoteResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    deepgram_available: bool
    cloudflare_ai_available: bool
    json_store_available: bool
    memory_store_available: bool
    uptime_seconds: float
    version: str
    environment: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    note_id: Optional[str] = None


class ProviderResponse(BaseModel):
    provider: str
    model: str
    language: str
    smart_format: bool
    confidence_threshold: float
    max_retries: int
    configured: bool
