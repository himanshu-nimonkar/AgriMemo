"""
Unit tests for JSON store and memory store.
"""
import pytest
import pytest_asyncio
import tempfile
import os
from datetime import datetime, timezone

from app.models.voice_note import VoiceNote
from app.storage.json_store import JsonStore
from app.storage.memory_store import MemoryStore


def make_note(note_id: str = None) -> VoiceNote:
    import uuid
    return VoiceNote(
        id=note_id or str(uuid.uuid4()),
        device_id="test-device-001",
        timestamp=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        audio_filename="test.wav",
        status="stored",
        transcript="check the north field",
    )


@pytest_asyncio.fixture
async def json_store(tmp_path):
    path = str(tmp_path / "notes.json")
    store = JsonStore(path)
    await store.initialize()
    return store


@pytest_asyncio.fixture
async def memory_store():
    return MemoryStore()


# ── JSON Store Tests ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_json_store_save_and_get(json_store):
    note = make_note()
    result = await json_store.save(note)
    assert result is True

    retrieved = await json_store.get(note.id)
    assert retrieved is not None
    assert retrieved.id == note.id
    assert retrieved.device_id == "test-device-001"


@pytest.mark.asyncio
async def test_json_store_delete(json_store):
    note = make_note()
    await json_store.save(note)
    deleted = await json_store.delete(note.id)
    assert deleted is True

    retrieved = await json_store.get(note.id)
    assert retrieved is None


@pytest.mark.asyncio
async def test_json_store_list_pagination(json_store):
    import uuid
    notes = [make_note(str(uuid.uuid4())) for _ in range(5)]
    for n in notes:
        await json_store.save(n)

    page1, total = await json_store.list(page=1, page_size=3)
    assert len(page1) == 3
    assert total == 5

    page2, _ = await json_store.list(page=2, page_size=3)
    assert len(page2) == 2


@pytest.mark.asyncio
async def test_json_store_get_nonexistent(json_store):
    result = await json_store.get("00000000-0000-4000-8000-000000000000")
    assert result is None


# ── Memory Store Tests ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_memory_store_save_and_get(memory_store):
    note = make_note()
    await memory_store.save(note)
    retrieved = await memory_store.get(note.id)
    assert retrieved is not None
    assert retrieved.id == note.id


@pytest.mark.asyncio
async def test_memory_store_delete(memory_store):
    note = make_note()
    await memory_store.save(note)
    await memory_store.delete(note.id)
    assert await memory_store.get(note.id) is None


@pytest.mark.asyncio
async def test_memory_store_health_check(memory_store):
    assert await memory_store.health_check() is True
