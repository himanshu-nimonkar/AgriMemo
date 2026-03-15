"""
AgriMemo — Test Fixtures
Shared pytest fixtures: real stores, mock external services, async client with dep overrides.
"""
import io
import wave
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.dependencies import (
    get_store, get_deepgram, get_structuring,
    get_dedup, get_event_logger, get_audio_processor,
)
from app.storage.composite_store import CompositeStore
from app.services.deduplication import DeduplicationEngine
from app.services.event_logger import EventLogger
from app.services.audio_processor import AudioProcessor
from app.config import settings


def make_wav_bytes(duration_ms: int = 500, sample_rate: int = 16000) -> bytes:
    """Create a minimal valid WAV file in memory."""
    num_samples = int(sample_rate * duration_ms / 1000)
    buf = io.BytesIO()
    with wave.open(buf, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * num_samples)
    return buf.getvalue()


@pytest.fixture
def sample_wav_bytes() -> bytes:
    return make_wav_bytes()


@pytest_asyncio.fixture
async def test_store(tmp_path):
    """Real composite store using a temp JSON file."""
    from app.config import Settings
    test_settings = Settings(
        _env_file=None,  # Don't load .env
        deepgram_api_key="test-key",
        cloudflare_api_token="test-token",
        cloudflare_account_id="test-account",
        json_store_path=str(tmp_path / "notes.json"),
        event_log_path=str(tmp_path / "events.jsonl"),
    )
    store = CompositeStore(test_settings)
    await store.initialize()
    return store


@pytest_asyncio.fixture
async def async_client(tmp_path):
    """Async test client with all FastAPI deps overridden.
    Avoids needing the full lifespan (Deepgram/Cloudflare calls).
    """
    from app.config import Settings

    test_settings = Settings(
        _env_file=None,
        deepgram_api_key="test-key",
        cloudflare_api_token="test-token",
        cloudflare_account_id="test-account",
        json_store_path=str(tmp_path / "notes.json"),
        event_log_path=str(tmp_path / "events.jsonl"),
    )

    # Real store with temp files
    store = CompositeStore(test_settings)
    await store.initialize()

    # Real dedup engine (no external calls)
    dedup = DeduplicationEngine(test_settings)

    # Real audio processor (needs to validate files)
    audio_proc = AudioProcessor(test_settings)

    # Event logger (uses temp path)
    event_log = EventLogger(test_settings.event_log_path)

    # Mock Deepgram (external API)
    mock_deepgram = MagicMock()
    mock_deepgram.transcribe = AsyncMock(return_value=MagicMock(
        transcript="check the north field irrigation valve",
        confidence=0.92,
        attempt_count=1,
    ))
    mock_deepgram.health_check = AsyncMock(return_value=True)

    # Mock Cloudflare AI (external API)
    mock_structuring = MagicMock()
    mock_structuring.structure_both = AsyncMock(return_value=(
        {"type": "task", "title": "Check irrigation valve", "priority": "medium", "tags": []},
        {"type": "task", "entities": {}, "intent": "inspection", "urgency": "medium", "confidence": 0.92},
    ))
    mock_structuring.health_check = AsyncMock(return_value=True)

    # Override FastAPI dependencies
    app.dependency_overrides = {
        get_store: lambda: store,
        get_deepgram: lambda: mock_deepgram,
        get_structuring: lambda: mock_structuring,
        get_dedup: lambda: dedup,
        get_event_logger: lambda: event_log,
        get_audio_processor: lambda: audio_proc,
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    # Clean up overrides
    app.dependency_overrides = {}
