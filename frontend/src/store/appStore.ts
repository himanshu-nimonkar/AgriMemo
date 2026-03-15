/**
 * AgriMemo — Zustand App Store
 * Global UI state: current view, upload state, filters.
 */
import { create } from 'zustand'
import type { NoteFilters } from '../types'

export type AppView = 'upload' | 'history' | 'detail' | 'status'

interface UploadState {
  isUploading: boolean
  progress: number
  activeNoteId: string | null
  error: string | null
}

interface AppState {
  // Navigation
  view: AppView
  activeNoteId: string | null
  setView: (view: AppView) => void
  setActiveNoteId: (id: string | null) => void
  navigateTo: (view: AppView, noteId?: string) => void

  // Upload
  upload: UploadState
  setUploading: (uploading: boolean) => void
  setUploadProgress: (progress: number) => void
  setUploadError: (error: string | null) => void
  setUploadNoteId: (id: string | null) => void
  resetUpload: () => void

  // Filters (for history view)
  filters: Partial<NoteFilters>
  setFilters: (filters: Partial<NoteFilters>) => void
  resetFilters: () => void
}

const DEFAULT_UPLOAD: UploadState = {
  isUploading: false,
  progress: 0,
  activeNoteId: null,
  error: null,
}

export const useAppStore = create<AppState>((set) => ({
  view: 'upload',
  activeNoteId: null,
  setView: (view) => set({ view }),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  navigateTo: (view, noteId) =>
    set({ view, activeNoteId: noteId ?? null }),

  upload: { ...DEFAULT_UPLOAD },
  setUploading: (isUploading) =>
    set((s) => ({ upload: { ...s.upload, isUploading } })),
  setUploadProgress: (progress) =>
    set((s) => ({ upload: { ...s.upload, progress } })),
  setUploadError: (error) =>
    set((s) => ({ upload: { ...s.upload, error, isUploading: false } })),
  setUploadNoteId: (activeNoteId) =>
    set((s) => ({ upload: { ...s.upload, activeNoteId } })),
  resetUpload: () => set({ upload: { ...DEFAULT_UPLOAD } }),

  filters: { page: 1, page_size: 20, include_duplicates: false },
  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),
  resetFilters: () =>
    set({ filters: { page: 1, page_size: 20, include_duplicates: false } }),
}))
