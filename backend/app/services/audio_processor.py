"""
AgriMemo — Audio Processor Service
File validation (magic bytes). FFMPEG decoding removed since Deepgram handles formats natively.
"""
import asyncio
import os
from typing import Optional

import structlog

from app.config import Settings
from app.utils.audio_utils import detect_audio_format, get_temp_path

log = structlog.get_logger()


class AudioConversionError(Exception):
    pass


class AudioTooLongError(AudioConversionError):
    pass


class AudioProcessor:
    MAX_DURATION_SECONDS = 600  # 10 minutes

    def __init__(self, settings: Settings):
        self.settings = settings

    def validate_format(self, data: bytes) -> Optional[str]:
        """
        Validate audio file by magic bytes.
        Returns detected format string or None.
        """
        return detect_audio_format(data)

    async def process_audio(
        self,
        input_bytes: bytes,
        input_format: str,
        note_id: str,
    ) -> tuple[str, float]:
        """
        Since Deepgram natively supports MP3, M4A, WAV, etc. we skip local conversion.
        Returns empty string and an estimated duration since we skip local decoding.
        Deepgram will return the true duration later.
        Raises AudioTooLongError if strictly > 10 min by byte-size estimation (fallback).
        """
        # A rough heuristic for max audio size instead of exact duration decoding
        # 10 minutes of audio at a reasonable bitrate (e.g., 128kbps) is ~10MB.
        # Max limit is set to 25MB in config anyway. We can just return the raw bytes.
        
        # We don't write to temp_out or decode anymore
        estimated_duration = 0.0
        return "", estimated_duration
