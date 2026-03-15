"""
AgriMemo — JSON File Store
Atomic writes via os.replace(). Corruption recovery. asyncio.Lock serializes writes.
"""
import asyncio
import json
import os
import tempfile
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple

import structlog

from app.models.voice_note import VoiceNote
from app.storage.base import StorageBackend

log = structlog.get_logger()

EMPTY_STORE = {"version": "1.0", "last_updated": None, "notes": {}}


def _load_store_sync(path: str) -> dict:
    """
    Load JSON store from disk.
    If file missing → create empty. If corrupt → rename and create empty.
    """
    if not os.path.exists(path):
        return {"version": "1.0", "last_updated": None, "notes": {}}
    try:
        with open(path, "r") as f:
            data = json.load(f)
            if "notes" not in data:
                data["notes"] = {}
            return data
    except json.JSONDecodeError:
        corrupt_path = f"{path}.corrupt.{int(time.time())}"
        os.rename(path, corrupt_path)
        log.error("json_store_corrupted", corrupt_backup=corrupt_path)
        return dict(EMPTY_STORE)


def _atomic_write_sync(data: dict, path: str) -> None:
    """
    Atomically write JSON to disk using a temp file + os.replace().
    This ensures the original is never partially overwritten.
    """
    dir_path = os.path.dirname(os.path.abspath(path))
    os.makedirs(dir_path, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=dir_path, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, default=str, indent=2)
        os.replace(tmp_path, path)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


class JsonStore(StorageBackend):
    def __init__(self, path: str):
        self.path = path
        self._lock = asyncio.Lock()
        self._data: dict = {"version": "1.0", "last_updated": None, "notes": {}}

    async def initialize(self) -> None:
        """Load existing data from disk."""
        self._data = await asyncio.to_thread(_load_store_sync, self.path)
        log.info("json_store_loaded", note_count=len(self._data.get("notes", {})))

    async def save(self, note: VoiceNote) -> bool:
        async with self._lock:
            self._data["notes"][note.id] = note.model_dump(mode="json")
            self._data["last_updated"] = datetime.now(timezone.utc).isoformat()
            try:
                await asyncio.to_thread(_atomic_write_sync, self._data, self.path)
                return True
            except Exception as e:
                log.error("json_store_write_failed", error=str(e))
                return False

    async def get(self, note_id: str) -> Optional[VoiceNote]:
        raw = self._data["notes"].get(note_id)
        if raw is None:
            return None
        try:
            return VoiceNote.model_validate(raw)
        except Exception as e:
            log.error("json_store_deserialization_error", note_id=note_id, error=str(e))
            return None

    async def delete(self, note_id: str) -> bool:
        async with self._lock:
            if note_id not in self._data["notes"]:
                return False
            del self._data["notes"][note_id]
            self._data["last_updated"] = datetime.now(timezone.utc).isoformat()
            try:
                await asyncio.to_thread(_atomic_write_sync, self._data, self.path)
            except Exception as e:
                log.error("json_store_delete_write_failed", error=str(e))
            return True

    async def list(
        self,
        page: int,
        page_size: int,
        filters: Optional[dict] = None,
    ) -> Tuple[List[VoiceNote], int]:
        all_notes: List[VoiceNote] = []
        for raw in self._data["notes"].values():
            try:
                all_notes.append(VoiceNote.model_validate(raw))
            except Exception:
                pass

        # Apply filters
        if filters:
            all_notes = _apply_filters(all_notes, filters)

        # Sort by created_at descending
        all_notes.sort(key=lambda n: n.created_at, reverse=True)
        total = len(all_notes)

        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        return all_notes[start:end], total

    async def get_recent(self, minutes: int) -> List[VoiceNote]:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        results = []
        for raw in self._data["notes"].values():
            try:
                note = VoiceNote.model_validate(raw)
                if note.created_at.replace(tzinfo=timezone.utc) >= cutoff:
                    results.append(note)
            except Exception:
                pass
        return results

    async def health_check(self) -> bool:
        return os.access(self.path, os.R_OK | os.W_OK) if os.path.exists(self.path) else True

    async def count(self) -> int:
        return len(self._data.get("notes", {}))

    def get_all_notes(self) -> List[VoiceNote]:
        """Return all notes (used to seed memory store on startup)."""
        results = []
        for raw in self._data["notes"].values():
            try:
                results.append(VoiceNote.model_validate(raw))
            except Exception:
                pass
        return results


def _apply_filters(notes: List[VoiceNote], filters: dict) -> List[VoiceNote]:
    """Apply filter dict to a list of VoiceNotes."""
    result = notes

    if note_type := filters.get("type"):
        result = [n for n in result if n.note_type == note_type]

    if device_id := filters.get("device_id"):
        result = [n for n in result if n.device_id == device_id]

    if start_date := filters.get("start_date"):
        result = [
            n for n in result
            if n.created_at.replace(tzinfo=timezone.utc) >= start_date
        ]

    if end_date := filters.get("end_date"):
        result = [
            n for n in result
            if n.created_at.replace(tzinfo=timezone.utc) <= end_date
        ]

    if filters.get("high_confidence_only"):
        result = [
            n for n in result 
            if n.transcript_confidence is not None and n.transcript_confidence >= 0.90
        ]

    if not filters.get("include_duplicates", True):
        result = [n for n in result if not n.is_duplicate]

    if search := filters.get("search"):
        search_lower = search.lower()
        result = [
            n for n in result
            if n.transcript and search_lower in n.transcript.lower()
        ]

    return result
