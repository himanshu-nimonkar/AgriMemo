/**
 * AgriMemo — Axios API Service
 * Typed API calls for all backend endpoints.
 */
import axios from 'axios'
import type {
  FullNoteResponse,
  NoteListResponse,
  HealthResponse,
  ProviderResponse,
  NoteFilters,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (window.location.protocol === 'https:' ? 'https://localhost:8000' : 'http://localhost:8000')

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

// ── Voice Notes ───────────────────────────────────────────────────────────────

export async function uploadVoiceNote(
  file: File,
  deviceId: string,
  timestamp?: string,
  lat?: number,
  lng?: number
): Promise<FullNoteResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('device_id', deviceId)
  if (timestamp) formData.append('timestamp', timestamp)
  if (lat !== undefined) formData.append('lat', lat.toString())
  if (lng !== undefined) formData.append('lng', lng.toString())

  const { data } = await api.post<FullNoteResponse>('/voice-note/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function listVoiceNotes(filters: Partial<NoteFilters> = {}): Promise<NoteListResponse> {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  }
  if (filters.type) params.type = filters.type
  if (filters.device_id) params.device_id = filters.device_id
  if (filters.start_date) params.start_date = filters.start_date
  if (filters.end_date) params.end_date = filters.end_date
  if (filters.high_confidence_only) params.high_confidence_only = true
  if (filters.include_duplicates !== undefined) params.include_duplicates = filters.include_duplicates
  if (filters.search) params.search = filters.search

  const { data } = await api.get<NoteListResponse>('/voice-notes', { params })
  return data
}

export async function getVoiceNote(noteId: string): Promise<FullNoteResponse> {
  const { data } = await api.get<FullNoteResponse>(`/voice-notes/${noteId}`)
  return data
}

export async function deleteVoiceNote(noteId: string): Promise<void> {
  await api.delete(`/voice-notes/${noteId}`)
}

// ── Health & Provider ─────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export async function getProvider(): Promise<ProviderResponse> {
  const { data } = await api.get<ProviderResponse>('/provider')
  return data
}
