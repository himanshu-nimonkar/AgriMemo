"""
AgriMemo — Composite Store
Fan-out writes to JSON + memory. Priority reads from memory, fallback to JSON.
"""
from typing import List, Optional, Tuple

import structlog

from app.config import Settings
from app.models.voice_note import VoiceNote
from app.storage.base import StorageBackend
from app.storage.json_store import JsonStore
from app.storage.memory_store import MemoryStore
import asyncio

log = structlog.get_logger()

STORE_NAMES = ["json", "memory"]


class CompositeStore(StorageBackend):
    def __init__(self, settings: Settings):
        self.json_store = JsonStore(settings.json_store_path)
        self.memory_store = MemoryStore()

    async def initialize(self) -> None:
        """Load JSON store and seed memory store."""
        await self.json_store.initialize()
        all_notes = self.json_store.get_all_notes()
        await self.memory_store.seed(all_notes)
        log.info("composite_store_initialized", notes_loaded=len(all_notes))

    async def save(self, note: VoiceNote) -> bool:
        """Fan-out write to both stores concurrently."""
        results = await asyncio.gather(
            self.json_store.save(note),
            self.memory_store.save(note),
            return_exceptions=True,
        )
        any_success = any(r is True for r in results)
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                log.error(
                    "store_write_failed",
                    store=STORE_NAMES[i],
                    error=str(r),
                )
        return any_success

    async def get(self, note_id: str) -> Optional[VoiceNote]:
        """Try memory first (fast). Fallback to JSON + warm cache."""
        note = await self.memory_store.get(note_id)
        if note:
            return note
        note = await self.json_store.get(note_id)
        if note:
            await self.memory_store.save(note)  # Warm cache
        return note

    async def delete(self, note_id: str) -> bool:
        """Delete from both stores. Authoritative result comes from JSON store."""
        # Run both, but we care most about JSON persistence
        json_deleted, mem_deleted = await asyncio.gather(
            self.json_store.delete(note_id),
            self.memory_store.delete(note_id),
            return_exceptions=True,
        )
        
        # If JSON deletion failed (exception or False), we should probably know
        if isinstance(json_deleted, Exception):
            log.error("composite_delete_json_failed", error=str(json_deleted))
            return False
            
        return json_deleted

    async def list(
        self,
        page: int,
        page_size: int,
        filters: Optional[dict] = None,
    ) -> Tuple[List[VoiceNote], int]:
        """Use JSON store for authoritative list (survives restarts)."""
        return await self.json_store.list(page, page_size, filters)

    async def get_recent(self, minutes: int) -> List[VoiceNote]:
        """Use memory store for recent notes (deduplication — fast)."""
        return await self.memory_store.get_recent(minutes)

    async def health_check(self) -> bool:
        json_ok = await self.json_store.health_check()
        mem_ok = await self.memory_store.health_check()
        return json_ok and mem_ok

    async def count(self) -> int:
        return await self.json_store.count()
