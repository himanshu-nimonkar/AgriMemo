# ARCHITECTURE.md

## High-Level Pipeline

AgriMemo uses an **asynchronous-by-design** pipeline to handle the inherent latencies of STT and LLM services.

1. **Intake**: Browser sends multipart audio + GPS metadata.
2. **Acceptance**: Backend returns `202 Accepted` immediately, providing a `note_id`.
3. **Background Processing**:
    - **Step 1 (Conversion)**: Normalize audio to WAV via `pydub`.
    - **Step 2 (STT)**: Deepgram Nova-2 with exponential backoff on transient failure.
    - **Step 3 (Extraction)**: Two parallel calls to Cloudflare Workers AI (Llama 3.1).
    - **Step 4 (Validation)**: Jaccard similarity check to flag duplicates.
4. **Persistence**: Atomic write to `notes.json` and sync to in-memory Cache.

## Frontend Resilience (Offline Mode)

Starting in v3.0, AgriMemo functions as a **Progressive Web App (PWA)**:

- **UI Caching**: All static assets are cached via Service Worker.
- **Upload Queue**: If `navigator.onLine` is false, recordings are stored in IndexedDB.
- **Auto-Sync**: A background sync process attempts to clear the queue as soon as a network connection is detected.

## Data Model

The primary record is a `VoiceNote` object:
- `id`: UUID v4
- `transcript`: Raw text
- `structured_schema_a`: Predefined agricultural fields
- `structured_schema_b`: Dynamic/AI-discovered fields
- `status`: [received, transcribing, structuring, stored, failed]
- `geo`: { lat, lng } metadata

## Scaling Considerations

- **Current**: Single-node JSON file store (Atomic file writes with `asyncio.Lock`).
- **Target**: Replace JSON store with Cloudflare D1 (SQLite) and S3/R2 for large audio file storage.
