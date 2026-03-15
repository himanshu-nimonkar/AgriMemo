"""
AgriMemo — Audio Utilities
Magic byte detection, temp file management, stale file cleanup.
"""
import os
import time
import asyncio
from typing import Optional


AUDIO_MAGIC_BYTES: dict[str, list[bytes]] = {
    "wav": [b"RIFF"],  # Check bytes 0–3
    "mp3": [b"\xff\xfb", b"\xff\xf3", b"\xff\xf2", b"ID3"],  # ID3 or sync bytes
    "flac": [b"fLaC"],
    "ogg": [b"OggS"],
    "m4a": [b"\x00\x00\x00\x18ftyp", b"\x00\x00\x00\x20ftyp"],  # MP4/M4A container
    "webm": [b"\x1a\x45\xdf\xa3"],  # EBML header
    "mp4": [b"\x00\x00\x00\x18ftyp", b"\x00\x00\x00\x1cftyp"],
}

SUPPORTED_FORMATS = set(AUDIO_MAGIC_BYTES.keys())


def detect_audio_format(data: bytes) -> Optional[str]:
    """
    Check magic bytes of file header.
    Returns format string or None if not recognized.
    Reads at least first 12 bytes.
    """
    if len(data) < 4:
        return None
    for fmt, signatures in AUDIO_MAGIC_BYTES.items():
        for sig in signatures:
            if data[: len(sig)] == sig:
                return fmt
    return None


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename:
    - Strip path components (os.path.basename)
    - Replace non-[\\w\\-\\.] characters with _
    - Truncate to 200 chars
    """
    import re

    name = os.path.basename(filename)
    name = re.sub(r"[^\w\-\.]", "_", name)
    return name[:200]


async def cleanup_stale_temp_files(temp_dir: str, max_age_hours: int = 1) -> int:
    """
    Delete temp files older than max_age_hours from temp_dir.
    Returns count of deleted files.
    Runs in asyncio.to_thread to avoid blocking.
    """

    def _cleanup() -> int:
        if not os.path.isdir(temp_dir):
            return 0
        cutoff = time.time() - max_age_hours * 3600
        deleted = 0
        for fname in os.listdir(temp_dir):
            fpath = os.path.join(temp_dir, fname)
            try:
                if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff:
                    os.unlink(fpath)
                    deleted += 1
            except OSError:
                pass
        return deleted

    return await asyncio.to_thread(_cleanup)


def get_temp_path(temp_dir: str, note_id: str, ext: str) -> str:
    """Return a deterministic temp file path for a note."""
    return os.path.join(temp_dir, f"{note_id}.{ext}")
