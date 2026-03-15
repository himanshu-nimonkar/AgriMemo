# AgriMemo — Voice-to-Structured Knowledge Pipeline

> **Field Intelligence for the Modern Grower.** Upload field voice notes → get structured, queryable data instantly.

---

## Overview

AgriMemo converts field worker audio recordings into structured JSON data using a two-step AI pipeline:

1. **Deepgram Nova-2** transcribes your voice note to text.
2. **Cloudflare Workers AI (Llama 3.1)** structures the transcript using **two concurrent approaches**:
   - **Schema A** — Maps to a predefined agricultural note type (task, field observation, reminder, etc.).
   - **Schema B** — Dynamic free-form AI extraction capturing everything Schema A might miss.

## Key Features

- **PWA / Offline Support (v3.0)**: Use the app in the middle of a field without signal; recordings are queued locally and uploaded automatically once you're back in range.
- **Smart Filtering**: Filter by note type, date ranges, and AI confidence scores.
- **Batch Actions**: Multi-select notes to delete or export as JSON in bulk.
- **GPS Integration**: Automatically captures field coordinates during recording for spatial record keeping.
- **Security-First**: Automatic history scrubbing for leaks and standardized environment configuration.

## Architecture

```
Audio File (upload)
     │
     ▼
[FastAPI Backend]
  │ 1. Magic byte validation
  │ 2. Background Processing (FastAPI BackgroundTasks)
  │ 3. Deepgram Nova-2 transcription (with retry)
  │ 4. Cloudflare Workers AI structuring (Schema A + B concurrently)
  │ 5. Deduplication check (Jaccard trigram similarity)
  │ 6. Composite store (JSON file + in-memory cache)
      │
      ▼
[React PWA Frontend]
  Upload Queue → Async Processing Update → Structured Output → JSON Export
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.11, uvicorn |
| STT | Deepgram Nova-2 |
| NLP | Cloudflare Workers AI (Llama 3.1 8B) |
| Storage | JSON file (atomic writes) + in-memory LRU cache |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Zustand, PWA |
| Deployment | Docker Compose, Nginx |

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Supported Audio Formats

WAV · MP3 · FLAC · OGG · M4A · WEBM (up to 25MB, max 10 min)

## License

MIT
