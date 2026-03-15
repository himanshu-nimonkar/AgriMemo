/**
 * AgriMemo — Voice Notes TanStack Query Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteVoiceNote, getVoiceNote, listVoiceNotes } from '../services/api'
import type { NoteFilters } from '../types'

export function useVoiceNotes(filters: Partial<NoteFilters> = {}) {
  return useQuery({
    queryKey: ['voice-notes', filters],
    queryFn: () => listVoiceNotes(filters),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && data.notes.some(n => !['stored', 'failed'].includes(n.status))) {
        return 3000
      }
      return false
    },
  })
}

export function useVoiceNote(noteId: string | null) {
  return useQuery({
    queryKey: ['voice-note', noteId],
    queryFn: () => getVoiceNote(noteId!),
    enabled: !!noteId,
    staleTime: 10_000,
  })
}

export function useDeleteVoiceNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => deleteVoiceNote(noteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voice-notes'] })
    },
  })
}
