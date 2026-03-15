"""
AgriMemo — Voice Notes Router
Full CRUD: upload, list, get, delete.
"""
import os
import shutil
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse, Response

from app.config import settings
from app.dependencies import (
    get_audio_processor,
    get_deepgram,
    get_dedup,
    get_event_logger,
    get_store,
    get_structuring,
)
from app.models.requests import VoiceNoteUploadRequest
from app.models.responses import ErrorResponse, FullNoteResponse, NoteListResponse
from app.models.voice_note import VoiceNote
from app.services.audio_processor import AudioConversionError, AudioTooLongError
from app.services.deepgram_service import AllRetriesExhaustedError, DeepgramAuthError
from app.services.event_logger import EventLogger, PipelineEvent
from app.storage.composite_store import CompositeStore
from app.utils.audio_utils import sanitize_filename
from app.utils.security import is_valid_uuid_v4, sanitize_search_query, safe_join

log = structlog.get_logger()

router = APIRouter()


def _note_to_response(note: VoiceNote) -> FullNoteResponse:
    return FullNoteResponse(
        note_id=note.id,
        device_id=note.device_id,
        timestamp=note.timestamp,
        created_at=note.created_at,
        audio_filename=note.audio_filename,
        lat=note.lat,
        lng=note.lng,
        audio_duration_seconds=note.audio_duration_seconds,
        transcript=note.transcript,
        transcript_confidence=note.transcript_confidence,
        low_confidence=note.low_confidence,
        note_type=note.note_type,
        structured_schema_a=note.structured_schema_a,
        structured_schema_b=note.structured_schema_b,
        is_duplicate=note.is_duplicate,
        duplicate_of=note.duplicate_of,
        pipeline_duration_ms=note.pipeline_duration_ms,
        status=note.status,
        errors=note.errors,
    )

async def _process_pipeline(
    note: VoiceNote,
    content: bytes,
    detected_format: str,
    store: CompositeStore,
    deepgram,
    structuring,
    audio_processor,
    dedup,
    event_logger: EventLogger,
    started_at: datetime,
):
    note_id = note.id
    temp_wav_path: Optional[str] = None
    try:
        # ── 10. Process audio (bypass local conversion) ───────────────────────
        try:
            _, estimated_duration = await audio_processor.process_audio(
                content, detected_format, note_id
            )
        except AudioTooLongError as e:
            note.status = "failed"
            note.errors.append(str(e))
            await store.save(note)
            return
        except AudioConversionError as e:
            note.status = "failed"
            note.errors.append(str(e))
            await store.save(note)
            return

        # ── 11. Initial duration (will be updated via Deepgram response) ──────
        note.audio_duration_seconds = estimated_duration

        # ── 12. Transcribing ──────────────────────────────────────────────────
        note.status = "transcribing"
        await store.save(note)

        # ── 13. Call Deepgram with raw bytes ──────────────────────────────────
        try:
            result = await deepgram.transcribe(content, detected_format)
        except (DeepgramAuthError, AllRetriesExhaustedError) as e:
            note.status = "failed"
            note.transcription_error = str(e)
            note.errors.append(str(e))
            await store.save(note)
            return

        # ── 14. Store transcript ──────────────────────────────────────────────
        note.transcript = result.transcript
        note.transcript_confidence = result.confidence
        note.transcription_attempts = result.attempt_count
        note.audio_duration_seconds = result.duration_seconds

        if not result.transcript:
            note.low_confidence = True
        elif result.confidence is not None:
            note.low_confidence = result.confidence < settings.stt_confidence_threshold

        # ── 15. Transcribed ───────────────────────────────────────────────────
        note.status = "transcribed"
        await store.save(note)

        # ── 16-17. Structuring ────────────────────────────────────────────────
        note.status = "structuring"
        await store.save(note)

        schema_a, schema_b = await structuring.structure_both(
            note.transcript or ""
        )

        # ── 18. Store structured results ──────────────────────────────────────
        note.structured_schema_a = schema_a
        note.structured_schema_b = schema_b

        # Extract note_type from schema A, fall back to schema B
        if schema_a and isinstance(schema_a, dict):
            note.note_type = schema_a.get("type")
        if not note.note_type and schema_b and isinstance(schema_b, dict):
            note.note_type = schema_b.get("type")

        if schema_a is None:
            note.errors.append("Schema A structuring failed")
        if schema_b is None:
            note.errors.append("Schema B structuring failed")

        # ── 19. Structured ────────────────────────────────────────────────────
        note.status = "structured"
        await store.save(note)

        # ── 20. Deduplication ─────────────────────────────────────────────────
        if note.transcript:
            is_dup, original_id = await dedup.check_duplicate(
                note.transcript, note_id, store
            )
            note.is_duplicate = is_dup
            note.duplicate_of = original_id

        # ── 21. Pipeline duration ─────────────────────────────────────────────
        note.pipeline_duration_ms = int(
            (datetime.now(timezone.utc) - started_at).total_seconds() * 1000
        )

        # ── 22. Stored ────────────────────────────────────────────────────────
        note.status = "stored"
        await store.save(note)

        # ── 23. Log stored event ──────────────────────────────────────────────
        await event_logger.log_event(
            PipelineEvent(
                note_id=note_id,
                event_type="stored",
                duration_ms=note.pipeline_duration_ms,
            )
        )

        log.info(
            "note_processed",
            note_id=note_id,
            duration_ms=note.pipeline_duration_ms,
            note_type=note.note_type,
            is_duplicate=note.is_duplicate,
        )

    except Exception as e:
        log.error("background_processing_failed", note_id=note_id, error=str(e), exc_info=True)
        note.status = "failed"
        note.errors.append(f"Unexpected processing error: {e}")
        await store.save(note)
    finally:
        # ── 24. Always clean up temp file ─────────────────────────────────────
        if temp_wav_path:
            Path(temp_wav_path).unlink(missing_ok=True)


@router.post("/voice-note/upload", response_model=FullNoteResponse, status_code=202)
async def upload_voice_note(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    device_id: str = Form(...),
    timestamp: Optional[str] = Form(default=None),
    lat: Optional[float] = Form(default=None),
    lng: Optional[float] = Form(default=None),
    store: CompositeStore = Depends(get_store),
    deepgram=Depends(get_deepgram),
    structuring=Depends(get_structuring),
    audio_processor=Depends(get_audio_processor),
    dedup=Depends(get_dedup),
    event_logger: EventLogger = Depends(get_event_logger),
):
    # ── 1. Validate request fields ──────────────────────────────────────────
    try:
        upload_req = VoiceNoteUploadRequest(
            device_id=device_id,
            timestamp=timestamp,
            lat=lat,
            lng=lng,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── 2. Read file content ─────────────────────────────────────────────────
    content = await file.read()

    # ── 3. Size check ────────────────────────────────────────────────────────
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > settings.max_file_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.max_audio_file_size_mb}MB",
        )

    # ── 4. Magic byte validation ─────────────────────────────────────────────
    detected_format = audio_processor.validate_format(content)
    if not detected_format:
        raise HTTPException(
            status_code=400,
            detail="Unrecognized audio format. Supported: WAV, MP3, FLAC, OGG, M4A, WEBM",
        )

    # ── 5. Sanitize filename ─────────────────────────────────────────────────
    safe_filename = sanitize_filename(file.filename or f"upload.{detected_format}")

    # ── 6-7. Generate note_id and start time ─────────────────────────────────
    note_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)

    # ── 8. Create initial note record ────────────────────────────────────────
    note = VoiceNote(
        id=note_id,
        device_id=upload_req.device_id,
        timestamp=upload_req.timestamp,
        lat=upload_req.lat,
        lng=upload_req.lng,
        created_at=started_at,
        audio_filename=safe_filename,
        audio_format=detected_format,
        status="received",
    )
    await store.save(note)

    # ── 9. Log received event ────────────────────────────────────────────────
    await event_logger.log_event(
        PipelineEvent(note_id=note_id, event_type="received")
    )

    # ── 9b. Persist original audio file ──────────────────────────────────────
    try:
        audio_stored_path = safe_join(settings.audio_storage_dir, f"{note_id}.{detected_format}")
        Path(audio_stored_path).write_bytes(content)
    except ValueError as e:
        log.error("secure_storage_failed", note_id=note_id, error=str(e))
        raise HTTPException(status_code=400, detail="Invalid storage path")

    # ── 10. Enqueue Background Task ──────────────────────────────────────────
    background_tasks.add_task(
        _process_pipeline,
        note,
        content,
        detected_format,
        store,
        deepgram,
        structuring,
        audio_processor,
        dedup,
        event_logger,
        started_at
    )

    return _note_to_response(note)


@router.post("/voice-note", response_model=FullNoteResponse, status_code=202)
async def post_voice_note_json(
    payload: VoiceNoteUploadRequest,
    background_tasks: BackgroundTasks,
    store: CompositeStore = Depends(get_store),
    deepgram=Depends(get_deepgram),
    structuring=Depends(get_structuring),
    audio_processor=Depends(get_audio_processor),
    dedup=Depends(get_dedup),
    event_logger: EventLogger = Depends(get_event_logger),
):
    """Task 1 compliance: Create note from an audio URL instead of direct upload."""
    if not payload.audio_url:
        raise HTTPException(status_code=400, detail="audio_url is required for this endpoint")

    # 1. Download audio content
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(payload.audio_url, timeout=30.0)
            resp.raise_for_status()
            content = resp.content
    except Exception as e:
        log.error("audio_download_failed", url=payload.audio_url, error=str(e))
        raise HTTPException(status_code=400, detail=f"Failed to download audio from URL: {e}")

    # 2. Validation
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Downloaded file is empty")
    if len(content) > settings.max_file_bytes:
        raise HTTPException(status_code=413, detail="File exceeds maximum size")

    detected_format = audio_processor.validate_format(content)
    if not detected_format:
        raise HTTPException(status_code=400, detail="Unrecognized audio format")

    # 3. Create note_id and start time
    note_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)

    # 4. Create initial note record
    note = VoiceNote(
        id=note_id,
        device_id=payload.device_id,
        timestamp=payload.timestamp or started_at,
        lat=payload.lat,
        lng=payload.lng,
        created_at=started_at,
        audio_filename=f"download_{note_id[:8]}.{detected_format}",
        audio_format=detected_format,
        status="received",
    )
    await store.save(note)

    # 5. Log and Persist
    await event_logger.log_event(PipelineEvent(note_id=note_id, event_type="received"))
    try:
        audio_stored_path = safe_join(settings.audio_storage_dir, f"{note_id}.{detected_format}")
        Path(audio_stored_path).write_bytes(content)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid storage path")

    # 6. Enqueue Background Task
    background_tasks.add_task(
        _process_pipeline,
        note,
        content,
        detected_format,
        store,
        deepgram,
        structuring,
        audio_processor,
        dedup,
        event_logger,
        started_at
    )

    return _note_to_response(note)

@router.get("/voice-notes", response_model=NoteListResponse)
async def list_voice_notes(
    page: int = 1,
    page_size: int = 20,
    type: Optional[str] = None,
    device_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    high_confidence_only: bool = False,
    include_duplicates: bool = True,
    search: Optional[str] = None,
    store: CompositeStore = Depends(get_store),
):
    # Validate pagination
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if not (1 <= page_size <= 100):
        raise HTTPException(status_code=400, detail="page_size must be 1–100")

    # Build filter dict
    filters: dict = {}
    if type:
        filters["type"] = type
    if device_id:
        filters["device_id"] = device_id
    if start_date:
        try:
            from datetime import datetime as dt, timezone
            parsed_start = dt.fromisoformat(start_date.replace("Z", "+00:00"))
            if parsed_start.tzinfo is None:
                parsed_start = parsed_start.replace(tzinfo=timezone.utc)
            filters["start_date"] = parsed_start
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    if end_date:
        try:
            from datetime import datetime as dt, timezone
            parsed_end = dt.fromisoformat(end_date.replace("Z", "+00:00"))
            if parsed_end.tzinfo is None:
                parsed_end = parsed_end.replace(tzinfo=timezone.utc)
            # if 10 chars (YYYY-MM-DD), expand to cover the whole day
            if len(end_date) == 10:
                parsed_end = parsed_end.replace(hour=23, minute=59, second=59)
            filters["end_date"] = parsed_end
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    if high_confidence_only:
        filters["high_confidence_only"] = True
    filters["include_duplicates"] = include_duplicates
    if search:
        filters["search"] = sanitize_search_query(search)

    notes, total = await store.list(page, page_size, filters)

    return NoteListResponse(
        notes=[_note_to_response(n) for n in notes],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
        has_prev=page > 1,
    )


@router.get("/voice-notes/{note_id}", response_model=FullNoteResponse)
async def get_voice_note(
    note_id: str,
    store: CompositeStore = Depends(get_store),
):
    if not is_valid_uuid_v4(note_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid note_id format (must be UUID v4)",
        )

    note = await store.get(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return _note_to_response(note)


@router.delete("/voice-notes/{note_id}", status_code=204)
async def delete_voice_note(
    note_id: str,
    store: CompositeStore = Depends(get_store),
    event_logger: EventLogger = Depends(get_event_logger),
):
    if not is_valid_uuid_v4(note_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid note_id format (must be UUID v4)",
        )

    note = await store.get(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    deleted = await store.delete(note_id)
    if deleted:
        await event_logger.log_event(
            PipelineEvent(note_id=note_id, event_type="deleted")
        )
        # Also delete persisted audio file if it exists
        audio_storage_dir = settings.audio_storage_dir
        for ext in ["wav", "mp3", "ogg", "m4a", "flac", "webm", note.audio_format or ""]:
            try:
                candidate = safe_join(audio_storage_dir, f"{note_id}.{ext}")
                if os.path.isfile(candidate):
                    os.unlink(candidate)
                    break
            except ValueError:
                continue

    return Response(status_code=204)


@router.get("/voice-notes/{note_id}/audio")
async def stream_voice_note_audio(
    note_id: str,
    store: CompositeStore = Depends(get_store),
):
    """Stream the original audio file back to the client for in-browser playback."""
    if not is_valid_uuid_v4(note_id):
        raise HTTPException(status_code=400, detail="Invalid note_id format (must be UUID v4)")

    note = await store.get(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    audio_storage_dir = Path(settings.audio_storage_dir)
    # Try native format first, then wav fallback
    formats_to_try = [note.audio_format or ""] + ["wav", "mp3", "ogg", "m4a", "flac", "webm"]
    audio_path = None
    for ext in formats_to_try:
        if not ext:
            continue
        try:
            candidate = safe_join(settings.audio_storage_dir, f"{note_id}.{ext}")
            if os.path.isfile(candidate):
                audio_path = candidate
                break
        except ValueError:
            continue

    if not audio_path:
        raise HTTPException(status_code=404, detail="Audio file not found (may have been cleaned up)")

    # Map extension to MIME type
    mime_map = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "flac": "audio/flac",
        "webm": "audio/webm",
    }
    p = Path(audio_path)
    ext = p.suffix.lstrip(".")
    media_type = mime_map.get(ext, "audio/octet-stream")

    return FileResponse(
        path=str(p),
        media_type=media_type,
        filename=note.audio_filename,
    )
