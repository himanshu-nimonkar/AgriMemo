"""
AgriMemo — In-Memory Store
Fast session cache backed by a Python dict with asyncio.Lock.
LRU-style cap at 1000 notes (evicts oldest by created_at).
"""
import asyncio
from collections import OrderedDict
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple

from app.models.voice_note import VoiceNote
from app.storage.base import StorageBackend

MAX_MEMORY_NOTES = 1000


class MemoryStore(StorageBackend):
    def __init__(self):
        self._store: dict[str, VoiceNote] = {}
        self._lock = asyncio.Lock()

    async def save(self, note: VoiceNote) -> bool:
        async with self._lock:
            self._store[note.id] = note
            # LRU eviction: if over limit, remove oldest by created_at
            if len(self._store) > MAX_MEMORY_NOTES:
                oldest_id = min(self._store, key=lambda k: self._store[k].created_at)
                del self._store[oldest_id]
            return True

    async def get(self, note_id: str) -> Optional[VoiceNote]:
        async with self._lock:
            return self._store.get(note_id)

    async def delete(self, note_id: str) -> bool:
        async with self._lock:
            if note_id not in self._store:
                return False
            del self._store[note_id]
            return True

    async def list(
        self,
        page: int,
        page_size: int,
        filters: Optional[dict] = None,
    ) -> Tuple[List[VoiceNote], int]:
        async with self._lock:
            notes = list(self._store.values())

        if filters:
            from app.storage.json_store import _apply_filters
            notes = _apply_filters(notes, filters)

        notes.sort(key=lambda n: n.created_at, reverse=True)
        total = len(notes)
        start = (page - 1) * page_size
        return notes[start: start + page_size], total

    async def get_recent(self, minutes: int) -> List[VoiceNote]:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        async with self._lock:
            return [
                n for n in self._store.values()
                if n.created_at.replace(tzinfo=timezone.utc) >= cutoff
            ]

    async def health_check(self) -> bool:
        return True

    async def count(self) -> int:
        async with self._lock:
            return len(self._store)

    async def seed(self, notes: List[VoiceNote]) -> None:
        """Bulk-load notes into memory (called on startup from JSON store)."""
        async with self._lock:
            for note in notes:
                self._store[note.id] = note
