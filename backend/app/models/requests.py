"""
AgriMemo — API Request Models
"""
import re
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, field_validator


class VoiceNoteUploadRequest(BaseModel):
    device_id: str
    timestamp: Optional[datetime] = None  # If omitted, server uses utcnow()
    lat: Optional[float] = None
    lng: Optional[float] = None

    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, v: str) -> str:
        if not re.match(r"^[\w\-]{1,100}$", v):
            raise ValueError(
                "device_id must be 1-100 characters: letters, digits, hyphens, underscores only"
            )
        return v

    @field_validator("timestamp", mode="before")
    @classmethod
    def default_timestamp(cls, v: Optional[datetime]) -> datetime:
        return v or datetime.now(timezone.utc)
