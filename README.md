# AgriMemo — Voice-to-Structured Knowledge Pipeline

> **Field Intelligence for the Modern Grower.** Upload field voice notes → get structured, queryable data instantly.

---

## Overview

AgriMemo converts field worker audio recordings into structured JSON data using a two-step AI pipeline:

1. **Deepgram Nova-2** transcribes your voice note to text
2. **Cloudflare Workers AI (Llama 3.1)** structures the transcript using **two concurrent approaches**:
   - **Schema A** — Maps to a predefined agricultural note type (task, field observation, reminder, etc.)
   - **Schema B** — Dynamic free-form AI extraction capturing everything Schema A might miss

## Architecture

```
Audio File (upload)
     │
     ▼
[FastAPI Backend]
 │ 1. Magic byte validation
 │ 2. Convert to WAV 16kHz mono (pydub/ffmpeg)
 │ 3. Deepgram Nova-2 transcription (with retry)
 │ 4. Cloudflare Workers AI structuring (Schema A + B concurrently)
 │ 5. Deduplication check (Jaccard trigram similarity)
 │ 6. Composite store (JSON file + in-memory cache)
     │
     ▼
[Vite/React Frontend]
  Upload → Pipeline Progress → Transcript + JSON output → History view
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.11, uvicorn |
| STT | Deepgram Nova-2 |
| NLP | Cloudflare Workers AI (Llama 3.1 8B) |
| Storage | JSON file (atomic writes) + in-memory LRU cache |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v3, Zustand, TanStack Query |
| Deployment | Docker Compose, Nginx |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 22+
- ffmpeg installed (`brew install ffmpeg` on macOS)

### 1. Backend

```bash
cd backend
cp .env.example .env     # already pre-filled with your keys
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

### 3. Docker (full stack)

```bash
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:80
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/voice-note/upload` | Upload audio → full pipeline |
| `GET` | `/voice-notes` | List all notes (paginated, filterable) |
| `GET` | `/voice-notes/{id}` | Get a single note |
| `DELETE` | `/voice-notes/{id}` | Delete a note |
| `GET` | `/health` | Backend health check |
| `GET` | `/provider` | STT provider config info |

### Upload Request
```bash
curl -X POST http://localhost:8000/voice-note/upload \
  -F "file=@recording.wav" \
  -F "device_id=my-device" \
  -F "timestamp=2024-01-15T09:30:00Z"
```

### List with Filters
```
GET /voice-notes?type=task&page=1&page_size=20&search=irrigation
GET /voice-notes?low_confidence_only=true&include_duplicates=false
```

## Supported Audio Formats

WAV · MP3 · FLAC · OGG · M4A · WEBM (up to 25MB, max 10 min)

## Running Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v --cov=app
```

## Environment Variables

See [`backend/.env.example`](./backend/.env.example) for the full list.

Key variables:
- `DEEPGRAM_API_KEY` — Deepgram account key
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID
- `CLOUDFLARE_AI_GATEWAY_NAME` — (optional) AI Gateway name for rate analytics

## Project Structure

```
AgriMemo/
├── backend/
│   ├── app/
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── main.py              # FastAPI app factory
│   │   ├── dependencies.py      # DI helpers
│   │   ├── models/              # Pydantic models
│   │   ├── routers/             # API routes
│   │   ├── services/            # Deepgram, CF AI, dedup, events
│   │   ├── storage/             # JSON + memory + composite stores
│   │   └── utils/               # Audio, text, security utilities
│   ├── data/                    # JSON store + event log (gitignored)
│   ├── tests/                   # pytest tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── hooks/               # useUpload, useVoiceNotes
│   │   ├── store/               # Zustand app store
│   │   ├── services/            # Axios API client
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Formatters
│   ├── Dockerfile
│   └── nginx.conf
├── .github/workflows/ci.yml
└── docker-compose.yml
```

## License

MIT
