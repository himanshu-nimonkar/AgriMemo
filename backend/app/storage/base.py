"""
AgriMemo — Abstract Storage Backend
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.models.voice_note import VoiceNote


class StorageBackend(ABC):

    @abstractmethod
    async def save(self, note: VoiceNote) -> bool:
        """Upsert a VoiceNote. Returns True on success, False on failure."""
        ...

    @abstractmethod
    async def get(self, note_id: str) -> Optional[VoiceNote]:
        """Return a VoiceNote by ID, or None if not found."""
        ...

    @abstractmethod
    async def delete(self, note_id: str) -> bool:
        """Delete a VoiceNote. Returns True if it existed."""
        ...

    @abstractmethod
    async def list(
        self,
        page: int,
        page_size: int,
        filters: Optional[dict] = None,
    ) -> Tuple[List[VoiceNote], int]:
        """Return (notes_page, total_count). Filters applied in-memory."""
        ...

    @abstractmethod
    async def get_recent(self, minutes: int) -> List[VoiceNote]:
        """Return all notes created in the last N minutes."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if this store is readable and writable."""
        ...
