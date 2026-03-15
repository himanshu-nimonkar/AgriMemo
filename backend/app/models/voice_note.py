"""
AgriMemo — Core VoiceNote Domain Model
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
import uuid

from pydantic import BaseModel, Field


class VoiceNote(BaseModel):
    # ── Identity ──────────────────────────────────────────────────────────────
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    timestamp: datetime  # Provided by client in upload request
    created_at: datetime  # Server time when processing began

    # ── Audio metadata ─────────────────────────────────────────────────────────
    audio_filename: str  # Sanitized filename of the uploaded file
    audio_format: Optional[str] = None  # "wav", "mp3", "webm", etc.
    audio_duration_seconds: Optional[float] = None

    # ── Transcription ──────────────────────────────────────────────────────────
    transcript: Optional[str] = None
    transcript_confidence: Optional[float] = None  # 0.0 to 1.0
    low_confidence: bool = False
    transcription_attempts: int = 0
    transcription_error: Optional[str] = None

    # ── Structuring ────────────────────────────────────────────────────────────
    structured_schema_a: Optional[Dict[str, Any]] = None  # Predefined schema result
    structured_schema_b: Optional[Dict[str, Any]] = None  # Dynamic AI result
    note_type: Optional[str] = None  # Detected type string (open, not enum)

    # ── Pipeline status ────────────────────────────────────────────────────────
    status: Literal[
        "received",
        "transcribing",
        "transcribed",
        "structuring",
        "structured",
        "stored",
        "failed",
    ] = "received"

    # ── Reliability ────────────────────────────────────────────────────────────
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None  # note_id of original if this is a duplicate
    pipeline_duration_ms: Optional[int] = None

    # ── Error tracking ─────────────────────────────────────────────────────────
    errors: List[str] = Field(default_factory=list)
