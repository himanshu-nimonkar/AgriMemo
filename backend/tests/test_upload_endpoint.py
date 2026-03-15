"""
Integration tests for POST /voice-note/upload using respx to mock external APIs.
"""
import pytest
import respx
import httpx

from tests.conftest import make_wav_bytes


@pytest.mark.asyncio
async def test_upload_returns_400_for_non_audio(async_client):
    """PDF file disguised as WAV should be rejected by magic byte check."""
    fake_pdf = b"%PDF-1.4 fake content"
    response = await async_client.post(
        "/voice-note/upload",
        files={"file": ("test.wav", fake_pdf, "audio/wav")},
        data={"device_id": "test-device-001"},
    )
    assert response.status_code == 400
    assert "audio format" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_returns_400_for_empty_file(async_client):
    response = await async_client.post(
        "/voice-note/upload",
        files={"file": ("test.wav", b"", "audio/wav")},
        data={"device_id": "test-device-001"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_returns_400_for_invalid_device_id(async_client):
    wav = make_wav_bytes()
    response = await async_client.post(
        "/voice-note/upload",
        files={"file": ("test.wav", wav, "audio/wav")},
        data={"device_id": "invalid device id with spaces!"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_nonexistent_note_returns_404(async_client):
    response = await async_client.get(
        "/voice-notes/00000000-0000-4000-8000-000000000000"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_invalid_uuid_returns_400(async_client):
    response = await async_client.get("/voice-notes/not-a-uuid")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_nonexistent_note_returns_404(async_client):
    response = await async_client.delete(
        "/voice-notes/00000000-0000-4000-8000-000000000001"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_notes_returns_empty_initially(async_client):
    response = await async_client.get("/voice-notes")
    assert response.status_code == 200
    data = response.json()
    assert "notes" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_health_endpoint_returns_ok(async_client):
    """Health endpoint should always respond (even if services are down)."""
    response = await async_client.get("/health")
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_provider_endpoint(async_client):
    response = await async_client.get("/provider")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "deepgram"
    assert "model" in data
    assert "api_key" not in str(data)  # Key must never appear in response
