"""
AgriMemo — Event Logger
Append-only JSONL event log with file rotation at 50MB.
"""
import asyncio
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import structlog

log = structlog.get_logger()

MAX_LOG_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@dataclass
class PipelineEvent:
    note_id: str
    event_type: str  # received | transcribed | structuring_complete | stored | failed | deleted
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    provider: Optional[str] = None
    duration_ms: Optional[int] = None
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)


class EventLogger:
    def __init__(self, log_path: str):
        self.log_path = log_path
        self._lock = asyncio.Lock()

    async def log_event(self, event: PipelineEvent) -> None:
        """Append a single event to the JSONL file. Rotates if over 50MB."""
        line = json.dumps(event.__dict__) + "\n"
        await asyncio.to_thread(self._write_sync, line)

    def _write_sync(self, line: str) -> None:
        """Synchronous write — called via asyncio.to_thread."""
        # Rotate if necessary
        if os.path.exists(self.log_path):
            size = os.path.getsize(self.log_path)
            if size >= MAX_LOG_SIZE_BYTES:
                rotated = f"{self.log_path}.{int(time.time())}"
                os.rename(self.log_path, rotated)
                log.info("event_log_rotated", rotated_to=rotated)

        # Ensure directory exists
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

        with open(self.log_path, "a") as f:
            f.write(line)
            f.flush()
