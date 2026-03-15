# ARCHITECTURE.md

## High-Level Architecture
```
Browser (React + Vite + TypeScript)
    │
    │  REST over HTTP
    ▼
FastAPI Application (Python 3.11+)
    │
    ├── POST /voice-note/upload     ← File upload endpoint
    ├── GET  /voice-notes           ← List stored notes
    ├── GET  /voice-notes/{id}      ← Get single note
    ├── DELETE /voice-notes/{id}    ← Delete a note
    ├── GET  /health                ← System health
    └── GET  /provider              ← Deepgram config info
         │
         ├── Audio Processor
         │     └── pydub + ffmpeg (format conversion)
         │
         ├── Deepgram STT Service
         │     └── Nova-2 model, with retry + confidence check
         │
         ├── Cloudflare Workers AI Structuring Engine
         │     ├── Approach A: Schema-matched classification
         │     └── Approach B: Dynamic free-form extraction
         │     (Both via Cloudflare AI Gateway for observability)
         │
         ├── Deduplication Engine
         ├── Event Logger (JSONL append-only log)
         └── Retry + Error Handling Layer
              │
              ├── JSON File Store  (primary persistent store — notes.json)
              └── In-Memory Store  (session cache — Python dict)
```

## Request Lifecycle

1. Multipart form POST arrives at `/voice-note/upload`.
2. Pydantic validates `device_id` and `timestamp` form fields.
3. File magic bytes are checked (not just extension).
4. File size is checked against the configured maximum.
5. A `note_id` (UUID v4) is generated and an initial `VoiceNote` record with `status="received"` is written to both stores immediately.
6. Audio is converted to WAV 16kHz mono PCM via pydub/ffmpeg if needed.
7. Converted audio bytes are sent to Deepgram Nova-2 with retry logic (max 3 attempts, exponential backoff).
8. Confidence score is evaluated. If below threshold, `low_confidence=True` is set.
9. Transcript is sent to Cloudflare Workers AI (both Approach A and B run as parallel async calls via `asyncio.gather`).
10. LLM JSON responses are parsed and validated.
11. Deduplication engine checks transcript similarity against recent notes.
12. Final `VoiceNote` is written to JSON store and memory store.
13. Event is appended to the `.jsonl` event log.
14. Temp audio file is deleted.
15. `FullNoteResponse` is returned to the client.

## Architectural Tradeoffs

**Storage: JSON file + in-memory only (no database)**
- Advantage: Zero external dependencies, runs on any machine with a filesystem. Notes survive restarts (JSON file). Memory store gives instant reads within a session.
- Disadvantage: Not scalable past thousands of notes (filtering is O(n) in-memory). No concurrent write safety across multiple server processes (the asyncio.Lock only works within one process). For production at scale, replace JSON store with SQLite (same zero-external-dependency benefit but proper indexed queries).

**STT: Single provider (Deepgram only)**
- Advantage: Simpler code, no fallback chain complexity, predictable behavior.
- Disadvantage: If Deepgram is down, the system returns 503. The retry logic mitigates transient failures but not extended outages.

**LLM: Cloudflare Workers AI**
- Advantage: Integrated with Cloudflare Tunnel deployment — both the tunnel and the AI use the same Cloudflare account. AI Gateway provides free logging, caching (identical prompts return cached responses and save API calls), and rate limit management. No separate OpenAI billing.
- Disadvantage: Workers AI models (Llama 3.1 8B) are less capable than GPT-4o for complex structuring. JSON output quality may require more prompt engineering.

**Deduplication: Jaccard trigram similarity**
- Advantage: Fast, no API calls, deterministic.
- Disadvantage: Semantic duplicates ("call the farmer" vs "phone the agricultural worker") are not caught. The 5-minute window limits memory overhead.

**Dual schema output (A + B)**
- Advantage: Predefined schema (A) is queryable and consistent. Dynamic schema (B) captures information that doesn't fit. Both run in parallel — total latency is `max(A_time, B_time)` not `A_time + B_time`.
- Disadvantage: Two LLM calls per note doubles AI API cost.
