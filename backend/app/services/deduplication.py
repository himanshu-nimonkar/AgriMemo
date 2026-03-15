"""
AgriMemo — Deduplication Engine
Jaccard trigram similarity check against recent notes.
"""
from typing import Optional, TYPE_CHECKING

import structlog

from app.config import Settings
from app.utils.text_utils import jaccard_similarity

if TYPE_CHECKING:
    from app.storage.composite_store import CompositeStore

log = structlog.get_logger()


class DeduplicationEngine:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def check_duplicate(
        self,
        new_transcript: str,
        note_id: str,
        store: "CompositeStore",
    ) -> tuple[bool, Optional[str]]:
        """
        Check if a transcript is a near-duplicate of a recently stored note.
        Returns (is_duplicate, original_note_id).
        Never silently drops the incoming note — just flags it.
        """
        if not self.settings.dedup_enabled:
            return False, None

        if not new_transcript.strip():
            return False, None

        recent_notes = await store.get_recent(self.settings.dedup_window_minutes)

        for candidate in recent_notes:
            if candidate.id == note_id:
                continue
            if not candidate.transcript:
                continue

            sim = jaccard_similarity(new_transcript, candidate.transcript)
            if sim >= self.settings.dedup_similarity_threshold:
                log.info(
                    "duplicate_detected",
                    note_id=note_id,
                    original_id=candidate.id,
                    similarity=round(sim, 4),
                )
                return True, candidate.id

        return False, None
