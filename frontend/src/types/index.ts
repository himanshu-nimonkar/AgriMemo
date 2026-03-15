/**
 * AgriMemo — TypeScript Types
 * Mirrors all backend Pydantic response models exactly.
 */

export type NoteStatus =
  | 'received'
  | 'transcribing'
  | 'transcribed'
  | 'structuring'
  | 'structured'
  | 'stored'
  | 'failed'

export type NoteType =
  | 'task'
  | 'observation'
  | 'reminder'
  | 'scheduling'
  | 'field_observation'
  | 'note'

export interface VoiceNote {
  id: string
  device_id: string
  timestamp: string
  created_at: string
  audio_filename: string
  audio_format?: string
  audio_duration_seconds?: number
  transcript?: string
  transcript_confidence?: number
  low_confidence: boolean
  transcription_attempts: number
  transcription_error?: string
  structured_schema_a?: Record<string, unknown>
  structured_schema_b?: Record<string, unknown>
  note_type?: string
  status: NoteStatus
  is_duplicate: boolean
  duplicate_of?: string
  pipeline_duration_ms?: number
  errors: string[]
}

export interface FullNoteResponse {
  note_id: string
  device_id: string
  timestamp: string
  created_at: string
  audio_filename: string
  audio_duration_seconds?: number
  lat?: number
  lng?: number
  transcript?: string
  transcript_confidence?: number
  low_confidence: boolean
  note_type?: string
  structured_schema_a?: Record<string, unknown>
  structured_schema_b?: Record<string, unknown>
  is_duplicate: boolean
  duplicate_of?: string
  pipeline_duration_ms?: number
  status: NoteStatus
  errors: string[]
}

export interface NoteListResponse {
  notes: FullNoteResponse[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_prev: boolean
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  deepgram_available: boolean
  cloudflare_ai_available: boolean
  json_store_available: boolean
  memory_store_available: boolean
  uptime_seconds: number
  version: string
  environment: string
}

export interface ProviderResponse {
  provider: string
  model: string
  language: string
  smart_format: boolean
  confidence_threshold: number
  max_retries: number
  configured: boolean
}

export interface ErrorResponse {
  error: string
  detail?: string
  note_id?: string
}

export interface NoteFilters {
  page: number
  page_size: number
  type?: string
  device_id?: string
  start_date?: string
  end_date?: string
  high_confidence_only?: boolean
  include_duplicates?: boolean
  search?: string
}

export const NOTE_TYPE_LABELS: Record<string, string> = {
  task: 'Task',
  observation: 'Observation',
  reminder: 'Reminder',
  scheduling: 'Scheduling',
  field_observation: 'Field Observation',
  note: 'Note',
}

export const NOTE_TYPE_COLORS: Record<string, string> = {
  task: 'blue',
  observation: 'amber',
  reminder: 'emerald',
  scheduling: 'purple',
  field_observation: 'teal',
  note: 'stone',
}

export const STATUS_LABELS: Record<NoteStatus, string> = {
  received: 'Received',
  transcribing: 'Transcribing',
  transcribed: 'Transcribed',
  structuring: 'Structuring',
  structured: 'Structured',
  stored: 'Stored',
  failed: 'Failed',
}
